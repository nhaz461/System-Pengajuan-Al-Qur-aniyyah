import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, createError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// GET /api/approvals (Daftar Pengajuan untuk Persetujuan Pimpinan)
export const getApprovalSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, unitId, search, page = '1', limit = '50' } = req.query;

  const whereClause: any = {};

  if (status && status !== 'ALL') {
    whereClause.status = String(status);
  } else if (!status) {
    // Default: tampilkan yang menunggu persetujuan pimpinan atau yang baru diproses
    whereClause.status = {
      in: ['MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'PERLU_REVISI'],
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
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { reviewer: { select: { id: true, name: true } } },
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
    totalAnggaran: sub.totalParsing,
    totalExcel: sub.totalExcel,
    totalReviewed: sub.totalReviewed,
    totalApproved: sub.totalApproved,
    selisih: sub.selisih,
    realisasi: sub.totalRealized || 0,
    status: sub.status,
    submittedBy: sub.submittedBy.name,
    submittedAt: sub.submittedAt.toISOString(),
    approvedBy: sub.approvedBy?.name || null,
    approvedAt: sub.approvedAt?.toISOString() || null,
    itemsCount: sub._count.items,
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

// GET /api/approvals/:id (Detail Workspace Persetujuan Pimpinan)
export const getApprovalDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
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
        include: {
          sshItem: {
            select: {
              id: true,
              kode: true,
              uraian: true,
              satuan: true,
              hargaSsh: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { reviewer: { select: { id: true, name: true, role: { select: { name: true } } } } },
      },
      disbursements: true,
      lpjItems: true,
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  // Hitung statistik perbandingan eksekutif
  const totalOriginal = sub.totalExcel || sub.totalParsing;
  const totalReviewed = sub.totalReviewed ?? sub.totalParsing;
  const totalApproved = sub.totalApproved ?? totalReviewed;
  const selisihReview = totalOriginal - totalReviewed;
  const selisihApproved = totalOriginal - totalApproved;

  const countMelebihi = sub.items.filter((i) => i.sshStatus === 'MELEBIHI_SSH').length;
  const countSesuai = sub.items.filter((i) => i.sshStatus === 'SESUAI_SSH').length;
  const countTidakAda = sub.items.filter((i) => i.sshStatus === 'TIDAK_DITEMUKAN_DI_SSH').length;

  res.json({
    success: true,
    data: {
      submission: sub,
      stats: {
        totalOriginal,
        totalReviewed,
        totalApproved,
        selisihReview,
        selisihApproved,
        itemCount: sub.items.length,
        countSesuai,
        countMelebihi,
        countTidakAda,
      },
    },
  });
});

// POST /api/approvals/:id/decide (Keputusan Pimpinan: SETUJU, TOLAK, atau REVISI)
export const decideApproval = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { action, approvedAmount, notes } = req.body;

  if (!['APPROVE', 'REJECT', 'REVISION'].includes(action)) {
    throw createError('Aksi keputusan tidak valid. Pilihan: APPROVE, REJECT, REVISION.', 400);
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  if (action === 'REJECT' && (!notes || notes.trim() === '')) {
    throw createError('Alasan penolakan wajib diisi oleh pimpinan.', 400);
  }

  let newStatus: string;
  let finalApprovedAmount: number | null = null;
  let actionLog: string;

  if (action === 'APPROVE') {
    newStatus = 'DISETUJUI';
    finalApprovedAmount = approvedAmount !== undefined && approvedAmount !== null
      ? Number(approvedAmount)
      : (sub.totalReviewed ?? sub.totalParsing);
    actionLog = 'APPROVE_BY_LEADERSHIP';
  } else if (action === 'REJECT') {
    newStatus = 'DITOLAK';
    actionLog = 'REJECT_BY_LEADERSHIP';
  } else {
    newStatus = 'PERLU_REVISI';
    actionLog = 'REVISION_BY_LEADERSHIP';
  }

  // Update submission
  const updatedSub = await prisma.submission.update({
    where: { id },
    data: {
      status: newStatus,
      totalApproved: finalApprovedAmount,
      approvedById: action === 'APPROVE' ? req.user!.id : undefined,
      approvedAt: action === 'APPROVE' ? new Date() : undefined,
      approvalNotes: notes?.trim() || null,
    },
    include: {
      unit: true,
      activity: true,
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Catat ke riwayat telaah / review
  await prisma.submissionReview.create({
    data: {
      submissionId: id,
      reviewerId: req.user!.id,
      action: actionLog,
      notes: notes?.trim() || `Keputusan Pimpinan: ${newStatus}`,
    },
  });

  // Catat ke AuditLog
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: actionLog,
      entity: 'Submission',
      entityId: id,
      oldValue: sub.status,
      newValue: newStatus,
      note: `Pimpinan ${req.user?.name} mengambil keputusan '${newStatus}' untuk pengajuan ${sub.submissionNumber}.${
        finalApprovedAmount ? ` Nominal Disetujui: Rp${finalApprovedAmount.toLocaleString('id-ID')}` : ''
      }${notes ? ` Catatan: ${notes}` : ''}`,
    },
  });

  res.json({
    success: true,
    message: `Pengajuan ${sub.submissionNumber} berhasil diproses dengan status: ${newStatus}.`,
    data: updatedSub,
  });
});

// GET /api/approvals/:id/lembar-pengesahan (Data Lembar Pengesahan Resmi Yayasan)
export const getLembarPengesahan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      unit: true,
      activity: true,
      fiscalYear: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { reviewer: { select: { id: true, name: true } } },
      },
      items: {
        orderBy: { itemNumber: 'asc' },
        include: { sshItem: true },
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  const yayasanHeader = {
    institution: "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH",
    address: 'Jl. Pesantren Al-Qur\'aniyyah, Komplek Pendidikan Islam',
    city: 'Kuningan / Cirebon, Jawa Barat',
    documentTitle: 'LEMBAR PENGESAHAN PENGAJUAN ANGGARAN BELANJA KEGIATAN',
    documentNumber: `PENGESAHAN/${sub.submissionNumber}`,
    printDate: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: {
      header: yayasanHeader,
      submission: sub,
      signatories: {
        pemohon: {
          jabatan: `Penanggung Jawab ${sub.unit.name}`,
          nama: sub.submittedBy.name,
          tanggal: sub.submittedAt,
        },
        keuangan: {
          jabatan: 'Bendahara Umum Yayasan',
          nama: sub.reviews.find((r) => r.action === 'APPROVE_TO_LEADERSHIP')?.reviewer.name || 'Nasrullah, S.Pd',
        },
        pimpinan: {
          jabatan: 'Ketua Umum Yayasan',
          nama: sub.approvedBy?.name || 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
          tanggal: sub.approvedAt,
          status: sub.status,
          notes: sub.approvalNotes,
        },
      },
    },
  });
});
