import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { syncSubmissionWithSsh, findTopSshMatches } from '../services/ssh-matcher.service';
import { triggerAutoBackupExcel } from '../services/excel-backup.service';

// GET /api/reviews (Daftar Pengajuan untuk Review Keuangan)
export const getReviewSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { unitId, status, search, page = '1', limit = '50' } = req.query;

  const whereClause: any = {};

  if (unitId && unitId !== 'SEMUA') {
    whereClause.unitId = parseInt(unitId as string);
  }

  if (status && status !== 'SEMUA') {
    whereClause.status = status as string;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim();
    whereClause.OR = [
      { submissionNumber: { contains: s } },
      { title: { contains: s } },
      { unit: { name: { contains: s } } },
      { activity: { name: { contains: s } } },
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
      items: formattedItems,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    },
  });
});

// GET /api/reviews/:submissionId (Detail Workspace Review Keuangan)
export const getReviewDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const submissionId = parseInt(req.params.submissionId);

  // 1. Jalankan pencocokan SSH otomatis dengan database Master SSH
  await syncSubmissionWithSsh(submissionId);

  // 2. Ambil data submission beserta items yang sudah diupdate
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
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
              kategori: true,
              uraian: true,
              satuan: true,
              hargaSsh: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  // 3. Hitung ringkasan kalkulasi review
  let totalOriginal = 0;
  let totalReviewed = 0;
  let countSesuaiSsh = 0;
  let countMelebihiSsh = 0;
  let countPerluCek = 0;
  let countTidakAdaSsh = 0;

  sub.items.forEach((it) => {
    const origSubtotal = it.volume * it.originalPrice;
    totalOriginal += origSubtotal;

    const effectivePrice =
      it.reviewPrice !== null && it.reviewPrice !== undefined
        ? it.reviewPrice
        : it.originalPrice;
    const reviewedSubtotal = it.volume * effectivePrice;
    totalReviewed += reviewedSubtotal;

    if (it.sshStatus === 'SESUAI_SSH') countSesuaiSsh++;
    else if (it.sshStatus === 'MELEBIHI_SSH') countMelebihiSsh++;
    else if (it.sshStatus === 'PERLU_CEK') countPerluCek++;
    else countTidakAdaSsh++;
  });

  const displayOriginal = sub.totalParsing || totalOriginal;
  const selisihEfisiensi = displayOriginal - totalReviewed;

  // 4. Ambil list master SSH aktif untuk dropdown selector jika diperlukan
  const activeSshVersion = await prisma.sshVersion.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      version: true,
      items: {
        select: {
          id: true,
          kode: true,
          kategori: true,
          uraian: true,
          satuan: true,
          hargaSsh: true,
        },
        orderBy: [{ kategori: 'asc' }, { uraian: 'asc' }],
      },
    },
  });

  res.json({
    success: true,
    data: {
      submission: sub,
      stats: {
        totalOriginal: displayOriginal,
        totalReviewed,
        selisihEfisiensi,
        countSesuaiSsh,
        countMelebihiSsh,
        countPerluCek,
        countTidakAdaSsh,
        totalItems: sub.items.length,
      },
      sshMasterItems: activeSshVersion?.items || [],
      activeSshVersion: activeSshVersion?.version || null,
    },
  });
});

// POST /api/reviews/:submissionId/start (Mulai Review -> ubah status ke DALAM_REVIEW)
export const startReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const submissionId = parseInt(req.params.submissionId);

  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  if (sub.status === 'MENUNGGU_REVIEW') {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'DALAM_REVIEW' },
    });

    await prisma.submissionReview.create({
      data: {
        submissionId,
        reviewerId: req.user!.id,
        action: 'REVIEW_START',
        notes: `Review dimulai oleh ${req.user!.name}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'START_REVIEW',
        entity: 'Submission',
        entityId: submissionId,
        note: `Review dimulai untuk pengajuan ${sub.submissionNumber}`,
      },
    });
  }

  res.json({
    success: true,
    message: 'Status pengajuan diperbarui menjadi DALAM REVIEW.',
  });
});

// PATCH /api/reviews/items/:itemId (INLINE EDITING HARGA REVIEW - Section L & M)
export const updateReviewItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const itemId = parseInt(req.params.itemId);
  const { reviewPrice, reviewNote, sshItemId, volume, keterangan } = req.body;

  const item = await prisma.submissionItem.findUnique({
    where: { id: itemId },
    include: { submission: true, sshItem: true },
  });

  if (!item) throw createError('Item pengajuan tidak ditemukan.', 404);

  // Ambil volume baru jika disediakan
  let newVolume = item.volume;
  if (volume !== null && volume !== undefined && volume !== '') {
    const parsedVol = Number(volume);
    if (!isNaN(parsedVol) && parsedVol > 0) {
      newVolume = parsedVol;
    }
  }

  // Ambil harga SSH acuan
  let currentSshPrice = item.sshPrice;
  let targetSshItemId = item.sshItemId;

  if (sshItemId !== undefined) {
    if (sshItemId === null || sshItemId === 0) {
      targetSshItemId = null;
      currentSshPrice = null;
    } else {
      const ssh = await prisma.sshItem.findUnique({ where: { id: parseInt(sshItemId) } });
      if (ssh) {
        targetSshItemId = ssh.id;
        currentSshPrice = ssh.hargaSsh;
      }
    }
  }

  // Tentukan harga review yang baru
  let newReviewPrice: number | null = null;
  if (reviewPrice !== null && reviewPrice !== undefined && reviewPrice !== '') {
    newReviewPrice = Number(reviewPrice);
  }

  // Hitung status SSH baru (Section K: JANGAN menandai MELEBIHI jika sama/kurang dari SSH)
  const priceToEvaluate = newReviewPrice !== null ? newReviewPrice : item.originalPrice;
  let newSshStatus = item.sshStatus;

  if (currentSshPrice !== null && currentSshPrice !== undefined) {
    if (priceToEvaluate > currentSshPrice) {
      newSshStatus = 'MELEBIHI_SSH';
    } else {
      newSshStatus = 'SESUAI_SSH';
    }
  } else {
    newSshStatus = 'TIDAK_DITEMUKAN_DI_SSH';
  }

  // Update item di database.
  // PENTING: originalPrice TIDAK PERNAH DIUBAH! (Section M)
  const updatedItem = await prisma.submissionItem.update({
    where: { id: itemId },
    data: {
      volume: newVolume,
      jumlah: newVolume * (item.originalPrice || item.hargaSatuan),
      reviewPrice: newReviewPrice,
      reviewNote: reviewNote !== undefined ? reviewNote : item.reviewNote,
      keterangan: keterangan !== undefined ? keterangan : item.keterangan,
      sshItemId: targetSshItemId,
      sshPrice: currentSshPrice,
      sshStatus: newSshStatus,
    },
    include: {
      sshItem: {
        select: {
          id: true,
          kode: true,
          kategori: true,
          uraian: true,
          satuan: true,
          hargaSsh: true,
        },
      },
    },
  });

  // Hitung ulang totalReviewed pengajuan
  const allItems = await prisma.submissionItem.findMany({
    where: { submissionId: item.submissionId },
  });

  const totalReviewed = allItems.reduce((acc, it) => {
    const p = it.reviewPrice !== null && it.reviewPrice !== undefined ? it.reviewPrice : it.originalPrice;
    return acc + it.volume * p;
  }, 0);

  await prisma.submission.update({
    where: { id: item.submissionId },
    data: { totalReviewed },
  });

  // Auto-backup ke file Excel lokal
  triggerAutoBackupExcel('REVIEW_ITEM_UPDATED');

  res.json({
    success: true,
    message: 'Harga review berhasil diperbarui.',
    data: {
      item: updatedItem,
      totalReviewed,
    },
  });
});

// POST /api/reviews/:submissionId/apply-all-ssh (Helper: Samakan semua harga yang melebihi ke harga SSH)
export const applyAllSsh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const submissionId = parseInt(req.params.submissionId);

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { items: true },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  let updatedCount = 0;

  for (const it of sub.items) {
    if (it.sshPrice !== null && it.sshPrice !== undefined) {
      const effPrice = it.reviewPrice !== null ? it.reviewPrice : it.originalPrice;
      if (effPrice > it.sshPrice) {
        await prisma.submissionItem.update({
          where: { id: it.id },
          data: {
            reviewPrice: it.sshPrice,
            sshStatus: 'SESUAI_SSH',
            reviewNote: 'Disesuaikan otomatis dengan standar harga SSH 2026.',
          },
        });
        updatedCount++;
      }
    }
  }

  // Recalculate totalReviewed
  const allItems = await prisma.submissionItem.findMany({
    where: { submissionId },
  });

  const totalReviewed = allItems.reduce((acc, it) => {
    const p = it.reviewPrice !== null ? it.reviewPrice : it.originalPrice;
    return acc + it.volume * p;
  }, 0);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalReviewed },
  });

  res.json({
    success: true,
    message: `${updatedCount} item belanja berhasil disesuaikan dengan harga SSH.`,
    data: { totalReviewed, updatedCount },
  });
});

// POST /api/reviews/:submissionId/finish (Selesaikan Review atau Minta Revisi)
export const finishReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const submissionId = parseInt(req.params.submissionId);
  const { action, notes } = req.body;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { items: true },
  });

  if (!sub) throw createError('Pengajuan tidak ditemukan.', 404);

  if (action === 'APPROVE_TO_LEADERSHIP' || action === 'FINISH_AND_CREATE_DRAFT' || action === 'SELESAI_EVALUASI') {
    // Pastikan totalReviewed sudah terhitung
    const totalReviewed = sub.items.reduce((acc, it) => {
      const p = it.reviewPrice !== null ? it.reviewPrice : it.originalPrice;
      return acc + it.volume * p;
    }, 0);

    // Status berubah menjadi SELESAI_EVALUASI (Otomatis menghasilkan Draft Pencairan)
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'SELESAI_EVALUASI',
        totalReviewed,
        totalApproved: totalReviewed,
        approvedAt: new Date(),
        approvedById: req.user?.id,
      },
    });

    await prisma.submissionReview.create({
      data: {
        submissionId,
        reviewerId: req.user!.id,
        action: 'SELESAI_EVALUASI',
        notes: notes?.trim() || 'Evaluasi keuangan selesai oleh Bendahara Umum. Draft pencairan / SPPD diterbitkan.',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'FINISH_EVALUATION',
        entity: 'Submission',
        entityId: submissionId,
        note: `Evaluasi keuangan selesai untuk ${sub.submissionNumber}. Total disetujui: Rp${totalReviewed.toLocaleString('id-ID')}. Draft pencairan siap diproses.`,
      },
    });

    res.json({
      success: true,
      message: 'Evaluasi keuangan selesai. Draft Pencairan (SPPD) berhasil dibuat.',
      data: { status: 'SELESAI_EVALUASI', totalReviewed, totalApproved: totalReviewed },
    });
  } else if (action === 'REQUEST_REVISION') {
    if (!notes || !notes.trim()) {
      throw createError('Catatan revisi wajib diisi jika meminta revisi dari unit.', 400);
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'PERLU_REVISI',
        notes: notes.trim(),
      },
    });

    await prisma.submissionReview.create({
      data: {
        submissionId,
        reviewerId: req.user!.id,
        action: 'REQUEST_REVISION',
        notes: notes.trim(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'REQUEST_REVISION',
        entity: 'Submission',
        entityId: submissionId,
        note: `Pengajuan ${sub.submissionNumber} dikembalikan untuk revisi: ${notes.trim()}`,
      },
    });

    res.json({
      success: true,
      message: 'Pengajuan dikembalikan ke unit dengan status PERLU REVISI.',
      data: { status: 'PERLU_REVISI' },
    });
  } else {
    throw createError('Aksi review tidak valid.', 400);
  }
});

// GET /api/reviews/items/:itemId/ssh-candidates (Cari SSH paling mirip atau live search)
export const getSshCandidates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const itemId = parseInt(req.params.itemId);
  const { search } = req.query;

  const item = await prisma.submissionItem.findUnique({
    where: { id: itemId },
    include: { sshItem: true },
  });
  if (!item) throw createError('Item pengajuan tidak ditemukan.', 404);

  const activeSsh = await prisma.sshVersion.findFirst({
    where: { isActive: true },
    include: {
      items: {
        orderBy: [{ kategori: 'asc' }, { uraian: 'asc' }],
      },
    },
  });

  const sshItems = activeSsh?.items || [];
  const priceToCheck =
    item.reviewPrice !== null && item.reviewPrice !== undefined
      ? item.reviewPrice
      : item.originalPrice;

  // Jika reviewer memberikan query pencarian manual
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    const filtered = sshItems
      .filter(
        (s) =>
          s.uraian.toLowerCase().includes(q) ||
          s.kategori.toLowerCase().includes(q) ||
          (s.kode && s.kode.toLowerCase().includes(q))
      )
      .map((s) => {
        const isExceeding = priceToCheck > s.hargaSsh;
        return {
          item: s,
          score: 1.0,
          status: isExceeding ? 'MELEBIHI_SSH' : 'SESUAI_SSH',
        };
      })
      .slice(0, 20);

    return res.json({
      success: true,
      data: {
        item,
        candidates: filtered,
        activeVersion: activeSsh?.version || null,
      },
    });
  }

  // Jika tanpa query, cari rekomendasi paling mirip menggunakan AI fuzzy matcher
  const candidates = findTopSshMatches(item.uraian, item.kategori, priceToCheck, sshItems, 10);

  res.json({
    success: true,
    data: {
      item,
      candidates,
      activeVersion: activeSsh?.version || null,
    },
  });
});

