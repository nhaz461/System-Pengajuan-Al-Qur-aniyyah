"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLembarLpj = exports.verifyLpj = exports.submitLpj = exports.getLpjDetail = exports.getLpjSubmissions = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const error_middleware_1 = require("../middleware/error.middleware");
// GET /api/lpj (Daftar Pengajuan untuk Realisasi / LPJ)
exports.getLpjSubmissions = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { status, unitId, search, page = '1', limit = '50' } = req.query;
    const whereClause = {};
    // Role UNIT hanya melihat miliknya sendiri
    if (req.user?.role === 'UNIT') {
        whereClause.unitId = req.user.unitId || -1;
    }
    else if (unitId) {
        whereClause.unitId = parseInt(String(unitId));
    }
    if (status && status !== 'ALL') {
        whereClause.status = String(status);
    }
    else if (!status) {
        // Default: yang telah dicairkan atau sedang proses LPJ / selesai
        whereClause.status = {
            in: ['DICAIRKAN', 'MENUNGGU_VERIFIKASI_LPJ', 'PERLU_REVISI_LPJ', 'SELESAI'],
        };
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
        prisma_1.default.submission.findMany({
            where: whereClause,
            include: {
                unit: { select: { id: true, name: true, code: true } },
                activity: { select: { id: true, name: true } },
                fiscalYear: { select: { id: true, year: true } },
                submittedBy: { select: { id: true, name: true, email: true } },
                disbursedBy: { select: { id: true, name: true } },
                _count: { select: { items: true, lpjItems: true } },
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limitNum,
        }),
        prisma_1.default.submission.count({ where: whereClause }),
    ]);
    const formattedItems = submissions.map((sub) => {
        const totalDisbursed = sub.totalDisbursed || 0;
        const totalRealized = sub.totalRealized || 0;
        const sisa = totalDisbursed - totalRealized;
        return {
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
            totalDisbursed,
            totalRealized,
            sisaLebihKurang: sisa,
            status: sub.status,
            lpjStatus: sub.lpjStatus || (sub.status === 'SELESAI' ? 'DITERIMA' : 'BELUM_SUBMIT'),
            submittedBy: sub.submittedBy.name,
            submittedAt: sub.submittedAt.toISOString(),
            disbursedAt: sub.disbursedAt?.toISOString() || null,
            lpjSubmittedAt: sub.lpjSubmittedAt?.toISOString() || null,
            itemsCount: sub._count.items,
            lpjItemsCount: sub._count.lpjItems,
        };
    });
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
// GET /api/lpj/:id (Detail Workspace Realisasi & LPJ)
exports.getLpjDetail = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await prisma_1.default.submission.findUnique({
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
                include: { sshItem: true, lpjItems: true },
            },
            lpjItems: {
                orderBy: { id: 'asc' },
            },
            disbursements: {
                orderBy: { disbursedAt: 'desc' },
                take: 1,
            },
        },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    const totalDisbursed = sub.totalDisbursed || 0;
    const totalRealized = sub.lpjItems.reduce((acc, it) => acc + it.total, 0);
    const sisa = totalDisbursed - totalRealized;
    res.json({
        success: true,
        data: {
            submission: sub,
            stats: {
                totalDisbursed,
                totalRealized,
                sisa,
                isSisaLebih: sisa > 0,
                isSisaKurang: sisa < 0,
                isNihil: sisa === 0,
            },
        },
    });
});
// POST /api/lpj/:id/submit (Unit Mengajukan LPJ Realisasi)
exports.submitLpj = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { items, notes } = req.body;
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    const allowedStatuses = ['DICAIRKAN', 'MENUNGGU_VERIFIKASI_LPJ', 'PERLU_REVISI_LPJ', 'SELESAI'];
    if (!allowedStatuses.includes(sub.status)) {
        throw (0, error_middleware_1.createError)(`Pengajuan belum dapat dibuatkan LPJ karena status saat ini adalah: ${sub.status}. Status harus 'DICAIRKAN'.`, 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw (0, error_middleware_1.createError)('Rincian realisasi belanja (items) wajib disertakan.', 400);
    }
    // Hapus LPJ items lama jika pengajuan ulang (revisi)
    await prisma_1.default.lpjItem.deleteMany({
        where: { submissionId: id },
    });
    let totalRealized = 0;
    for (const it of items) {
        const vol = Number(it.volume) || 1;
        const price = Number(it.hargaSatuan) || 0;
        const itemTotal = it.total !== undefined ? Number(it.total) : vol * price;
        totalRealized += itemTotal;
        await prisma_1.default.lpjItem.create({
            data: {
                submissionId: id,
                submissionItemId: it.submissionItemId ? parseInt(it.submissionItemId) : null,
                uraian: it.uraian?.trim() || 'Belanja Realisasi',
                volume: vol,
                satuan: it.satuan?.trim() || 'Paket',
                hargaSatuan: price,
                total: itemTotal,
                notaNumber: it.notaNumber?.trim() || null,
                notaFile: it.notaFile || null,
                keterangan: it.keterangan?.trim() || null,
            },
        });
    }
    // Update Submission status menjadi MENUNGGU_VERIFIKASI_LPJ
    const updatedSub = await prisma_1.default.submission.update({
        where: { id },
        data: {
            status: 'MENUNGGU_VERIFIKASI_LPJ',
            lpjStatus: 'MENUNGGU_VERIFIKASI',
            totalRealized,
            lpjSubmittedAt: new Date(),
            lpjNotes: notes?.trim() || null,
        },
        include: {
            unit: true,
            activity: true,
            lpjItems: true,
        },
    });
    // Catat AuditLog
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'SUBMIT_LPJ',
            entity: 'Submission',
            entityId: id,
            oldValue: sub.status,
            newValue: 'MENUNGGU_VERIFIKASI_LPJ',
            note: `Unit mengajukan LPJ realisasi sebesar Rp${totalRealized.toLocaleString('id-ID')} untuk pengajuan ${sub.submissionNumber}. Sisa dana: Rp${((sub.totalDisbursed || 0) - totalRealized).toLocaleString('id-ID')}`,
        },
    });
    res.json({
        success: true,
        message: `Laporan Pertanggungjawaban (LPJ) ${sub.submissionNumber} berhasil diserahkan ke bagian keuangan untuk diverifikasi.`,
        data: updatedSub,
    });
});
// POST /api/lpj/:id/verify (Keuangan Memverifikasi LPJ: DITERIMA / SELESAI atau REVISI)
exports.verifyLpj = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { action, notes } = req.body; // action: 'ACCEPT' | 'REVISION'
    if (!['ACCEPT', 'REVISION'].includes(action)) {
        throw (0, error_middleware_1.createError)('Aksi verifikasi tidak valid. Pilihan: ACCEPT, REVISION.', 400);
    }
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: { lpjItems: true },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    const newStatus = action === 'ACCEPT' ? 'SELESAI' : 'PERLU_REVISI_LPJ';
    const newLpjStatus = action === 'ACCEPT' ? 'DITERIMA' : 'PERLU_REVISI';
    const updatedSub = await prisma_1.default.submission.update({
        where: { id },
        data: {
            status: newStatus,
            lpjStatus: newLpjStatus,
            notes: notes?.trim() ? `${sub.notes || ''}\n[Verifikasi Keuangan]: ${notes.trim()}` : sub.notes,
        },
        include: {
            unit: true,
            activity: true,
        },
    });
    // Catat AuditLog
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: action === 'ACCEPT' ? 'ACCEPT_LPJ_FINAL' : 'REVISION_LPJ',
            entity: 'Submission',
            entityId: id,
            oldValue: sub.status,
            newValue: newStatus,
            note: `Bagian Keuangan menetapkan LPJ ${sub.submissionNumber} sebagai '${newStatus}'.${notes ? ` Catatan: ${notes}` : ''}`,
        },
    });
    res.json({
        success: true,
        message: `Verifikasi LPJ selesai. Status pengajuan kini: ${newStatus}.`,
        data: updatedSub,
    });
});
// GET /api/lpj/:id/lembar-lpj (Data Lembar LPJ Resmi Yayasan)
exports.getLembarLpj = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: {
            unit: true,
            activity: true,
            fiscalYear: true,
            submittedBy: true,
            approvedBy: true,
            disbursedBy: true,
            lpjItems: { orderBy: { id: 'asc' } },
            disbursements: { orderBy: { disbursedAt: 'desc' }, take: 1 },
        },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    const totalDisbursed = sub.totalDisbursed || 0;
    const totalRealized = sub.lpjItems.reduce((acc, it) => acc + it.total, 0);
    const sisa = totalDisbursed - totalRealized;
    const doc = {
        institution: "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH",
        address: 'Jl. Pesantren Al-Qur\'aniyyah, Komplek Pendidikan Islam',
        city: 'Kuningan / Cirebon, Jawa Barat',
        documentTitle: 'LAPORAN PERTANGGUNGJAWABAN (LPJ) KEUANGAN KEGIATAN',
        documentNumber: `LPJ/${sub.submissionNumber}`,
        printDate: new Date().toISOString(),
        submission: sub,
        summary: {
            totalDisbursed,
            totalRealized,
            sisa,
            sisaStatus: sisa > 0 ? 'SISA LEBIH (DIKEMBALIKAN KE KAS)' : sisa < 0 ? 'SISA KURANG (NOMBO)' : 'NIHIL / PAS',
        },
        signatories: {
            pelaksana: {
                jabatan: `Penanggung Jawab Kegiatan (${sub.unit.name})`,
                nama: sub.picName?.trim() || sub.submittedBy.name,
            },
            verifikator: {
                jabatan: 'Bendahara Umum Yayasan',
                nama: sub.disbursedBy?.name || 'Nasrullah, S.Pd',
            },
            mengetahui: {
                jabatan: 'Ketua Umum Yayasan',
                nama: sub.approvedBy?.name || 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
            },
        },
    };
    res.json({
        success: true,
        data: doc,
    });
});
//# sourceMappingURL=lpj.controller.js.map