import { Response } from 'express';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { triggerAutoBackupExcel } from '../services/excel-backup.service';

// GET /api/disbursements (Daftar Pengajuan untuk Pencairan)
export const getDisbursementSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, unitId, search, page = '1', limit = '50' } = req.query;

  const whereClause: any = {};

  if (status && status !== 'ALL') {
    whereClause.status = String(status);
  } else if (!status) {
    // Default: siap dicairkan atau yang sudah dicairkan
    whereClause.status = {
      in: ['DISETUJUI', 'DICAIRKAN', 'MENUNGGU_PENCAIRAN'],
    };
  }

  if (unitId) {
    whereClause.unitId = parseInt(String(unitId));
  }

  if (search) {
    const q = String(search).toLowerCase();
    whereClause.OR = [
      { submissionNumber: { contains: q } },
      { title: { contains: q } },
      { unit: { name: { contains: q } } },
    ];
  }

  const pageNum = Math.max(1, parseInt(String(page)));
  const limitNum = Math.max(1, parseInt(String(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: whereClause,
      include: {
        unit: { select: { id: true, name: true, code: true } },
        activity: { select: { id: true, name: true } },
        fiscalYear: { select: { id: true, year: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        disbursedBy: { select: { id: true, name: true, email: true } },
        disbursements: {
          orderBy: { disbursedAt: 'desc' },
          take: 1,
        },
        _count: { select: { items: true } },
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.submission.count({ where: whereClause }),
  ]);

  const formattedItems = submissions.map((sub) => ({
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
    totalReviewed: sub.totalReviewed,
    totalApproved: sub.totalApproved,
    totalDisbursed: sub.totalDisbursed,
    selisih: sub.selisih,
    realisasi: sub.totalRealized || 0,
    status: sub.status,
    submittedBy: sub.submittedBy.name,
    submittedAt: sub.submittedAt.toISOString(),
    approvedBy: sub.approvedBy?.name || null,
    approvedAt: sub.approvedAt?.toISOString() || null,
    disbursedBy: sub.disbursedBy?.name || null,
    disbursedAt: sub.disbursedAt?.toISOString() || null,
    itemsCount: sub._count.items,
    latestDisbursement: sub.disbursements[0] || null,
  }));

  res.json({
    success: true,
    data: {
      items: formattedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/disbursements/:id (Detail Workspace Pencairan)
export const getDisbursementDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: true,
      activity: true,
      fiscalYear: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      disbursedBy: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { itemNumber: 'asc' },
        include: { sshItem: true },
      },
      disbursements: {
        orderBy: { disbursedAt: 'desc' },
        include: { disbursedBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  res.json({
    success: true,
    data: {
      submission: sub,
      stats: {
        totalApproved: sub.totalApproved || sub.totalReviewed || sub.totalParsing,
        totalDisbursed: sub.totalDisbursed || 0,
        sisaBelumCair: Math.max(0, (sub.totalApproved || 0) - (sub.totalDisbursed || 0)),
      },
    },
  });
});

// POST /api/disbursements/:id/disburse (Eksekusi Pencairan Dana)
export const executeDisbursement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    amount,
    paymentMethod,
    bankName,
    accountNumber,
    recipientName,
    referenceNumber,
    disbursementDate,
    notes,
  } = req.body;

  const sub = await prisma.submission.findUnique({
    where: { id },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  if (sub.status !== 'DISETUJUI' && sub.status !== 'MENUNGGU_PENCAIRAN') {
    throw createError(
      `Pengajuan belum dapat dicairkan karena status saat ini adalah: ${sub.status}. Status harus 'DISETUJUI'.`,
      400
    );
  }

  const disburseAmount = Number(amount);
  if (!disburseAmount || disburseAmount <= 0) {
    throw createError('Jumlah pencairan harus lebih dari Rp 0.', 400);
  }

  if (!recipientName || recipientName.trim() === '') {
    throw createError('Nama penerima dana wajib diisi.', 400);
  }

  const pMethod = (paymentMethod || 'TRANSFER').toUpperCase();
  if (!['TRANSFER', 'TUNAI'].includes(pMethod)) {
    throw createError('Metode pencairan harus TRANSFER atau TUNAI.', 400);
  }

  const disburseDate = disbursementDate ? new Date(disbursementDate) : new Date();

  let receiptFilePath: string | null = null;
  if (req.file) {
    const uploadDir = path.resolve(__dirname, '../../../uploads/pencairan');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeExt = path.extname(req.file.originalname) || '.pdf';
    const filename = `BUKTI_CAIR_${sub.submissionNumber.replace(/[\/\\]/g, '_')}_${Date.now()}${safeExt}`;
    const targetPath = path.join(uploadDir, filename);
    fs.copyFileSync(req.file.path, targetPath);
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}
    receiptFilePath = `/uploads/pencairan/${filename}`;
  }

  // Generate nomor referensi otomatis jika belum diisi
  const refNo = referenceNumber?.trim() || `KWT/CAIR/${sub.submissionNumber}/${Date.now().toString().slice(-4)}`;

  // Simpan record pencairan
  const disbursement = await prisma.disbursement.create({
    data: {
      submissionId: id,
      amount: disburseAmount,
      paymentMethod: pMethod,
      bankName: bankName?.trim() || null,
      accountNumber: accountNumber?.trim() || null,
      recipientName: recipientName.trim(),
      referenceNumber: refNo,
      receiptFile: receiptFilePath,
      notes: notes?.trim() || null,
      disbursedAt: disburseDate,
      disbursedById: req.user!.id,
    },
  });

  // Update status Submission menjadi DICAIRKAN
  const updatedSub = await prisma.submission.update({
    where: { id },
    data: {
      status: 'DICAIRKAN',
      totalDisbursed: disburseAmount,
      disbursedById: req.user!.id,
      disbursedAt: disburseDate,
      disbursementNotes: notes?.trim() || null,
    },
    include: {
      unit: true,
      activity: true,
      disbursedBy: { select: { id: true, name: true } },
    },
  });

  // Catat AuditLog
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'DISBURSE_PAYMENT',
      entity: 'Submission',
      entityId: id,
      oldValue: sub.status,
      newValue: 'DICAIRKAN',
      note: `Pencairan dana sebesar Rp${disburseAmount.toLocaleString('id-ID')} (${pMethod}) untuk pengajuan ${sub.submissionNumber} kepada ${recipientName}. Ref: ${refNo}`,
    },
  });

  // Auto-backup ke file Excel lokal
  triggerAutoBackupExcel('DISBURSEMENT_PAYMENT');

  res.json({
    success: true,
    message: `Pencairan dana ${sub.submissionNumber} sebesar Rp${disburseAmount.toLocaleString('id-ID')} berhasil dicatat. Status: DICAIRKAN.`,
    data: {
      submission: updatedSub,
      disbursement,
    },
  });
});

// GET /api/disbursements/:id/kuitansi (Data Kuitansi Resmi Pencairan Kas/Bank Yayasan)
export const getKuitansiPencairan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: true,
      activity: true,
      fiscalYear: true,
      submittedBy: true,
      approvedBy: true,
      disbursedBy: true,
      disbursements: {
        orderBy: { disbursedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  const disburse = sub.disbursements[0];
  if (!disburse && sub.status !== 'DICAIRKAN') {
    throw createError('Pengajuan ini belum memiliki riwayat pencairan dana.', 400);
  }

  const kuitansiData = {
    institution: "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH",
    address: 'Jl. Pesantren Al-Qur\'aniyyah, Komplek Pendidikan Islam',
    city: 'Kuningan / Cirebon, Jawa Barat',
    receiptNumber: disburse?.referenceNumber || `KWT/CAIR/${sub.submissionNumber}`,
    submissionNumber: sub.submissionNumber,
    date: disburse?.disbursedAt || sub.disbursedAt || new Date().toISOString(),
    unit: sub.unit.name,
    activity: sub.activity.name,
    title: sub.title,
    amount: disburse?.amount || sub.totalDisbursed || 0,
    paymentMethod: disburse?.paymentMethod || 'TRANSFER',
    bankName: disburse?.bankName || null,
    accountNumber: disburse?.accountNumber || null,
    recipientName: disburse?.recipientName || sub.picName?.trim() || sub.submittedBy.name,
    notes: disburse?.notes || sub.disbursementNotes,
    disbursedBy: sub.disbursedBy?.name || 'Nasrullah, S.Pd (Bendahara Umum)',
    approvedBy: sub.approvedBy?.name || 'Dr. KH. Muhammad Sobron Zayya, SQ., MA (Ketua Umum)',
  };

  res.json({
    success: true,
    data: kuitansiData,
  });
});

// GET /api/disbursements/:id/sppd (Data Surat Perintah Pencairan Dana - SPPD)
export const getSppdData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: true,
      activity: true,
      fiscalYear: true,
      submittedBy: true,
      approvedBy: true,
      disbursedBy: true,
      items: {
        orderBy: { itemNumber: 'asc' },
        include: { sshItem: true },
      },
      disbursements: {
        orderBy: { disbursedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  const disburse = sub.disbursements[0];

  // Hitung total pengajuan vs total pencairan
  let totalPengajuan = 0;
  let totalPencairan = 0;

  const items = sub.items.map((it, idx) => {
    const origSubtotal = it.volume * it.originalPrice;
    totalPengajuan += origSubtotal;

    const effPrice =
      it.reviewPrice !== null && it.reviewPrice !== undefined
        ? it.reviewPrice
        : it.originalPrice;
    const cairSubtotal = it.volume * effPrice;
    totalPencairan += cairSubtotal;

    return {
      no: idx + 1,
      itemNumber: it.itemNumber || idx + 1,
      kategori: it.kategori,
      kebutuhan: it.uraian,
      satuan: it.satuan,
      volume: it.volume,
      // Bagian Pengajuan Dana
      pengajuanHarga: it.originalPrice,
      pengajuanRincian: it.keterangan || `${it.volume} ${it.satuan}`,
      pengajuanTotal: origSubtotal,
      // Bagian Pencairan Dana
      pencairanHarga: effPrice,
      pencairanRincian: it.reviewNote?.startsWith('Disetujui:')
        ? it.reviewNote.replace(/^Disetujui:\s*/i, '')
        : (it.keterangan || `${it.volume} ${it.satuan}`),
      pencairanTotal: cairSubtotal,
      keterangan: it.reviewNote || it.keterangan || null,
      sshStatus: it.sshStatus,
    };
  });

  const sppdNumber =
    sub.submissionNumber.replace(/^PENG/i, 'SPPD') ||
    `SPPD/${sub.unit.code}/${sub.fiscalYear.year}/${String(sub.id).padStart(4, '0')}`;

  // Tanggal Pelaksanaan dari pengajuan
  const execDate = sub.activityDate || sub.submittedAt;

  // Nama agenda / kegiatan spesifik
  const specificAgenda =
    sub.title?.replace(/^Pengajuan\s+(Anggaran\s+)?/i, '').trim() ||
    sub.title ||
    sub.activity.name;

  // Tanggal Pencairan: Ditentukan setelah pimpinan menyetujui / bendahara mencairkan
  let disburseDateStr: string | null = null;
  if (disburse?.disbursedAt) {
    disburseDateStr = disburse.disbursedAt.toISOString();
  } else if (sub.disbursedAt) {
    disburseDateStr = sub.disbursedAt.toISOString();
  } else if (sub.approvedAt) {
    disburseDateStr = sub.approvedAt.toISOString();
  }

  const sppdData = {
    institution: 'YAYASAN PENDIDIKAN ISLAM',
    subInstitution: "PONDOK PESANTREN AL-QUR'ANIYYAH",
    academicYear: `${sub.fiscalYear.year}-${sub.fiscalYear.year + 1}`,
    submissionNumber: sub.submissionNumber,
    letterNumber: sppdNumber,
    activityDate: execDate.toISOString(),
    disbursementDate: disburseDateStr,
    unit: sub.unit.name,
    unitCode: sub.unit.code,
    activity: specificAgenda,
    title: sub.title,
    status: sub.status,
    // Biaya Kegiatan
    summary: {
      totalPengajuan: sub.totalParsing || totalPengajuan,
      totalPencairan: sub.totalApproved || sub.totalReviewed || totalPencairan,
      totalDisbursed: sub.totalDisbursed || 0,
      selisihEfisiensi:
        (sub.totalParsing || totalPengajuan) -
        (sub.totalApproved || sub.totalReviewed || totalPencairan),
    },
    items,
    signatories: {
      pemohon: {
        nama: sub.picName?.trim() || sub.submittedBy?.name || 'Kepala Unit Pemohon',
        jabatan: `Pemohon (${sub.unit.name})`,
      },
      keuangan: {
        nama: 'Nasrullah, S.Pd',
        jabatan: 'Bendahara Umum Yayasan',
      },
      pimpinan: {
        nama: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
        jabatan: 'Ketua Umum Yayasan',
      },
    },
  };

  res.json({
    success: true,
    data: sppdData,
  });
});

