import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { parseSubmissionExcel } from '../services/submission-parser.service';
import { triggerAutoBackupExcel } from '../services/excel-backup.service';

// POST /api/submissions/preview
export const previewSubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw createError('Silakan pilih file Excel pengajuan anggaran untuk diupload.', 400);
  }

  const filePath = req.file.path;
  const originalFilename = req.file.originalname;

  try {
    const parseResult = await parseSubmissionExcel(filePath);

    res.json({
      success: true,
      message: 'File Excel pengajuan berhasil dibaca dan divalidasi.',
      data: {
        tempFilePath: filePath,
        filename: originalFilename,
        sheetName: parseResult.sheetName,
        totalItems: parseResult.totalItems,
        totalExcel: parseResult.totalExcel,
        totalParsing: parseResult.totalParsing,
        selisih: parseResult.selisih,
        hasMismatch: parseResult.hasMismatch,
        mismatchWarning: parseResult.mismatchWarning,
        detectedUnit: parseResult.unitInfo,
        detectedActivity: parseResult.activityInfo,
        items: parseResult.items,
      },
    });
  } catch (err: any) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }
    throw err;
  }
});

// POST /api/submissions
export const createSubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    unitId: rawUnitId,
    activityId,
    fiscalYearId,
    title,
    activityDate,
    picName,
    notes,
    tempFilePath,
    filename,
    items,
    totalExcel,
    totalParsing,
  } = req.body;

  // Verifikasi role unit
  let targetUnitId = parseInt(rawUnitId);
  if (req.user?.role === 'UNIT') {
    if (!req.user.unitId) {
      throw createError('Akun Anda belum terhubung dengan data Unit mana pun. Hubungi Admin.', 403);
    }
    targetUnitId = req.user.unitId;
  }

  if (!targetUnitId) throw createError('Unit pengaju wajib dipilih.', 400);
  if (!activityId) throw createError('Master Kegiatan wajib dipilih.', 400);
  if (!fiscalYearId) throw createError('Tahun Anggaran wajib dipilih.', 400);
  if (!title || !title.trim()) throw createError('Judul / Perihal pengajuan wajib diisi.', 400);

  // Ambil data unit & tahun untuk penomoran
  const [unit, fiscalYear] = await Promise.all([
    prisma.unit.findUnique({ where: { id: targetUnitId } }),
    prisma.fiscalYear.findUnique({ where: { id: parseInt(fiscalYearId) } }),
  ]);

  if (!unit) throw createError('Unit tidak ditemukan.', 404);
  if (!fiscalYear) throw createError('Tahun anggaran tidak ditemukan.', 404);

  // Parse items jika belum ada
  let parsedItems = items;
  let finalTotalExcel = Number(totalExcel) || 0;
  let finalTotalParsing = Number(totalParsing) || 0;

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      const parsed = await parseSubmissionExcel(tempFilePath);
      parsedItems = parsed.items;
      finalTotalExcel = parsed.totalExcel;
      finalTotalParsing = parsed.totalParsing;
    } else {
      throw createError('Data item belanja pengajuan tidak ditemukan.', 400);
    }
  }

  if (parsedItems.length === 0) {
    throw createError('Tidak ada item belanja yang dapat disimpan.', 400);
  }

  // Hitung selisih
  const selisih = finalTotalExcel - finalTotalParsing;

  // Generate nomor pengajuan unik yang aman dari benturan/penghapusan:
  // Format: PENG/[KODE_UNIT]/[TAHUN]/[NO_URUT]
  const prefix = `PENG/${unit.code}/${fiscalYear.year}/`;
  
  // Ambil semua pengajuan dengan prefix tersebut untuk mencari angka urut tertinggi
  const existingWithPrefix = await prisma.submission.findMany({
    where: {
      submissionNumber: { startsWith: prefix },
    },
    select: { submissionNumber: true },
  });

  let maxSeq = 0;
  for (const s of existingWithPrefix) {
    const parts = s.submissionNumber.split('/');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  let nextSeq = maxSeq + 1;
  let submissionNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

  // Double check ke database untuk memastikan 100% unik
  while (await prisma.submission.findUnique({ where: { submissionNumber } })) {
    nextSeq++;
    submissionNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // Pindahkan file permanent ke folder uploads/pengajuan/
  let permanentFilePath: string | null = null;
  if (tempFilePath && fs.existsSync(tempFilePath)) {
    const permDir = path.resolve(__dirname, '../../../uploads/pengajuan');
    if (!fs.existsSync(permDir)) {
      fs.mkdirSync(permDir, { recursive: true });
    }
    const safeExt = path.extname(tempFilePath) || '.xlsx';
    const targetFile = path.join(
      permDir,
      `${submissionNumber.replace(/[\/\\]/g, '_')}_${Date.now()}${safeExt}`
    );
    try {
      fs.copyFileSync(tempFilePath, targetFile);
      fs.unlinkSync(tempFilePath);
      permanentFilePath = targetFile;
    } catch (_) {
      permanentFilePath = tempFilePath;
    }
  }

  // Simpan data pengajuan utama (Submissions)
  const submission = await prisma.submission.create({
    data: {
      submissionNumber,
      unitId: unit.id,
      activityId: parseInt(activityId),
      fiscalYearId: fiscalYear.id,
      title: title.trim(),
      activityDate: activityDate ? new Date(activityDate) : new Date(),
      picName: picName?.trim() || req.user?.name || null,
      originalFilename: filename || 'Pengajuan_Anggaran.xlsx',
      filePath: permanentFilePath,
      totalExcel: finalTotalExcel,
      totalParsing: finalTotalParsing,
      selisih,
      status: 'MENUNGGU_REVIEW', // Sesuai workflow Section Q
      submittedById: req.user!.id,
      notes: notes?.trim() || null,
    },
  });

  // Simpan item transaksi belanja (SubmissionItems)
  const dbItems = parsedItems.map((it: any, idx: number) => ({
    submissionId: submission.id,
    itemNumber: it.no || idx + 1,
    kategori: it.kategori?.trim() || 'Umum',
    uraian: it.uraian.trim(),
    hargaSatuan: Number(it.hargaSatuan) || 0,
    volume: Number(it.volume) || 1,
    satuan: it.satuan?.trim() || 'Item',
    jumlah: Number(it.jumlah) || 0,
    keterangan: it.keterangan?.trim() || null,
    // Integritas Harga Asli (Section M & Z)
    originalPrice: Number(it.hargaSatuan) || 0,
    sshStatus: 'BELUM_REVIEW',
  }));

  await prisma.submissionItem.createMany({
    data: dbItems,
  });

  // Audit trail
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'CREATE_SUBMISSION',
      entity: 'Submission',
      entityId: submission.id,
      newValue: JSON.stringify({
        submissionNumber: submission.submissionNumber,
        unit: unit.name,
        total: submission.totalParsing,
        itemsCount: dbItems.length,
      }),
      note: `Pengajuan nomor ${submission.submissionNumber} (${unit.name}) berhasil disubmit. Total: Rp${submission.totalParsing.toLocaleString('id-ID')}`,
    },
  });

  // Auto-backup ke file Excel lokal
  triggerAutoBackupExcel('CREATE_SUBMISSION');

  res.status(201).json({
    success: true,
    message: `Pengajuan ${submission.submissionNumber} berhasil disimpan dengan ${dbItems.length} item.`,
    data: {
      id: submission.id,
      submissionNumber: submission.submissionNumber,
      title: submission.title,
      totalAnggaran: submission.totalParsing,
      status: submission.status,
    },
  });
});

// GET /api/submissions (Halaman Utama Pengajuan Unit - Section R)
export const getSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { unitId, activityId, fiscalYearId, status, search, page = '1', limit = '50' } = req.query;

  const whereClause: any = {};

  // Role UNIT hanya bisa melihat pengajuan miliknya sendiri
  if (req.user?.role === 'UNIT') {
    whereClause.unitId = req.user.unitId || -1;
  } else if (unitId) {
    whereClause.unitId = parseInt(unitId as string);
  }

  if (activityId) whereClause.activityId = parseInt(activityId as string);
  if (fiscalYearId) whereClause.fiscalYearId = parseInt(fiscalYearId as string);
  if (status && status !== 'SEMUA') whereClause.status = status as string;

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim();
    whereClause.OR = [
      { submissionNumber: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
      { picName: { contains: s, mode: 'insensitive' } },
      { unit: { name: { contains: s, mode: 'insensitive' } } },
      { activity: { name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const p = Math.max(1, parseInt(page as string));
  const l = Math.min(200, Math.max(1, parseInt(limit as string)));
  const skip = (p - 1) * l;

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: whereClause,
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
      include: {
        unit: { select: { id: true, name: true, code: true } },
        activity: { select: { id: true, name: true } },
        fiscalYear: { select: { id: true, year: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.submission.count({ where: whereClause }),
  ]);

  // Format respons sesuai Section R:
  // No Pengajuan | Unit | Kegiatan | Total Anggaran | Realisasi | Status
  const data = submissions.map((sub) => ({
    id: sub.id,
    submissionNumber: sub.submissionNumber,
    unit: sub.unit.name,
    unitCode: sub.unit.code,
    activity: sub.activity.name,
    fiscalYear: sub.fiscalYear.year,
    title: sub.title,
    activityDate: sub.activityDate,
    picName: sub.picName || sub.submittedBy.name,
    totalAnggaran: sub.totalParsing,
    totalExcel: sub.totalExcel,
    selisih: sub.selisih,
    realisasi: sub.totalRealized || 0,
    status: sub.status,
    submittedBy: sub.submittedBy.name,
    submittedAt: sub.submittedAt,
    itemsCount: sub._count.items,
  }));

  res.json({
    success: true,
    data: {
      items: data,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    },
  });
});

// GET /api/submissions/:id (Detail Pengajuan)
export const getSubmissionDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, name: true, code: true } },
      activity: { select: { id: true, name: true } },
      fiscalYear: { select: { id: true, year: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { itemNumber: 'asc' },
        include: {
          sshItem: {
            select: {
              id: true,
              kode: true,
              uraian: true,
              hargaSsh: true,
              satuan: true,
            },
          },
        },
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  // Jika role UNIT, cegah akses pengajuan unit lain
  if (req.user?.role === 'UNIT' && req.user.unitId !== sub.unitId) {
    throw createError('Anda tidak memiliki akses ke pengajuan unit lain.', 403);
  }

  res.json({
    success: true,
    data: sub,
  });
});

// GET /api/submissions/template/download
export const downloadSubmissionTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const candidates = [
    path.resolve(__dirname, '../../../Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(__dirname, '../../../samples/Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(__dirname, '../../templates/Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(process.cwd(), 'Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(process.cwd(), 'samples/Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(process.cwd(), '../Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(process.cwd(), '../../Template_Pengajuan_Resmi_Yayasan.xlsx'),
    'D:/Sistem_Keuangan_Portable/Template_Pengajuan_Resmi_Yayasan.xlsx',
    'D:/PENGAJUAN & PENCAIRAN/Template_Pengajuan_Resmi_Yayasan.xlsx',
    'D:/PENGAJUAN & PENCAIRAN/samples/Template_Pengajuan_Resmi_Yayasan.xlsx',
  ];

  let templatePath: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      templatePath = c;
      break;
    }
  }

  if (!templatePath) {
    throw createError('File template resmi belum tersedia.', 404);
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.download(templatePath, 'Template_Pengajuan_Resmi_Yayasan_2026.xlsx');
});

// DELETE /api/submissions/:id
export const deleteSubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: true,
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  // Validasi Hak Akses:
  if (req.user?.role === 'UNIT') {
    if (req.user.unitId !== sub.unitId) {
      throw createError('Anda tidak memiliki akses untuk menghapus pengajuan unit lain.', 403);
    }
    if (['DISETUJUI', 'DICAIRKAN', 'SELESAI'].includes(sub.status)) {
      throw createError(
        `Pengajuan dengan status ${sub.status} tidak dapat dihapus oleh Unit. Hubungi Bendahara/Admin.`,
        400
      );
    }
  }

  // Jika sudah DICAIRKAN / SELESAI, hanya Admin atau Bendahara Keuangan yang boleh hapus
  if (['DICAIRKAN', 'SELESAI'].includes(sub.status) && req.user?.role !== 'ADMIN' && req.user?.role !== 'KEUANGAN' && req.user?.role !== 'BENDAHARA') {
    throw createError(
      'Pengajuan yang dananya sudah dicairkan hanya dapat dihapus oleh Bendahara atau Administrator.',
      400
    );
  }

  // Jalankan transaksi penghapusan bertingkat
  await prisma.$transaction(async (tx) => {
    // 1. Hapus LpjItems jika ada
    await tx.lpjItem.deleteMany({ where: { submissionId: id } });

    // 2. Hapus Disbursements jika ada
    await tx.disbursement.deleteMany({ where: { submissionId: id } });

    // 3. Hapus Reviews
    await tx.submissionReview.deleteMany({ where: { submissionId: id } });

    // 4. Hapus Items
    await tx.submissionItem.deleteMany({ where: { submissionId: id } });

    // 5. Hapus Submission utama
    await tx.submission.delete({ where: { id } });

    // 6. Audit Trail
    await tx.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE_SUBMISSION',
        entity: 'Submission',
        entityId: id,
        oldValue: JSON.stringify({
          submissionNumber: sub.submissionNumber,
          title: sub.title,
          unit: sub.unit.name,
          total: sub.totalParsing,
          status: sub.status,
        }),
        note: `Pengajuan nomor ${sub.submissionNumber} ("${sub.title}") berhasil dihapus oleh ${req.user?.name}.`,
      },
    });
  });

  // Hapus file fisik jika ada
  if (sub.filePath && fs.existsSync(sub.filePath)) {
    try {
      fs.unlinkSync(sub.filePath);
    } catch (_) {}
  }

  // Auto-backup ke file Excel lokal
  triggerAutoBackupExcel('DELETE_SUBMISSION');

  res.json({
    success: true,
    message: `Pengajuan ${sub.submissionNumber} ("${sub.title}") berhasil dihapus.`,
  });
});
