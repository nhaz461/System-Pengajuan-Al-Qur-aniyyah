"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubmission = exports.updateSubmissionWorkflowStatus = exports.deleteSubmission = exports.downloadSubmissionTemplate = exports.getSubmissionDetail = exports.getSubmissions = exports.createSubmission = exports.previewSubmission = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
const submission_parser_service_1 = require("../services/submission-parser.service");
const excel_backup_service_1 = require("../services/excel-backup.service");
// POST /api/submissions/preview
exports.previewSubmission = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, error_middleware_1.createError)('Silakan pilih file Excel pengajuan anggaran untuk diupload.', 400);
    }
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    try {
        const parseResult = await (0, submission_parser_service_1.parseSubmissionExcel)(filePath);
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
    }
    catch (err) {
        if (fs_1.default.existsSync(filePath)) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (_) { }
        }
        throw err;
    }
});
// POST /api/submissions
exports.createSubmission = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { unitId: rawUnitId, activityId, fiscalYearId, title, activityDate, picName, notes, tempFilePath, filename, items, totalExcel, totalParsing, } = req.body;
    // Verifikasi role unit
    let targetUnitId = parseInt(rawUnitId);
    if (req.user?.role === 'UNIT') {
        if (!req.user.unitId) {
            throw (0, error_middleware_1.createError)('Akun Anda belum terhubung dengan data Unit mana pun. Hubungi Admin.', 403);
        }
        targetUnitId = req.user.unitId;
    }
    if (!targetUnitId)
        throw (0, error_middleware_1.createError)('Unit pengaju wajib dipilih.', 400);
    if (!activityId)
        throw (0, error_middleware_1.createError)('Master Kegiatan wajib dipilih.', 400);
    if (!fiscalYearId)
        throw (0, error_middleware_1.createError)('Tahun Anggaran wajib dipilih.', 400);
    if (!title || !title.trim())
        throw (0, error_middleware_1.createError)('Judul / Perihal pengajuan wajib diisi.', 400);
    // Ambil data unit & tahun untuk penomoran
    const [unit, fiscalYear] = await Promise.all([
        prisma_1.default.unit.findUnique({ where: { id: targetUnitId } }),
        prisma_1.default.fiscalYear.findUnique({ where: { id: parseInt(fiscalYearId) } }),
    ]);
    if (!unit)
        throw (0, error_middleware_1.createError)('Unit tidak ditemukan.', 404);
    if (!fiscalYear)
        throw (0, error_middleware_1.createError)('Tahun anggaran tidak ditemukan.', 404);
    // Parse items jika belum ada
    let parsedItems = items;
    let finalTotalExcel = Number(totalExcel) || 0;
    let finalTotalParsing = Number(totalParsing) || 0;
    if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
        if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
            const parsed = await (0, submission_parser_service_1.parseSubmissionExcel)(tempFilePath);
            parsedItems = parsed.items;
            finalTotalExcel = parsed.totalExcel;
            finalTotalParsing = parsed.totalParsing;
        }
        else {
            throw (0, error_middleware_1.createError)('Data item belanja pengajuan tidak ditemukan.', 400);
        }
    }
    if (parsedItems.length === 0) {
        throw (0, error_middleware_1.createError)('Tidak ada item belanja yang dapat disimpan.', 400);
    }
    // Hitung selisih
    const selisih = finalTotalExcel - finalTotalParsing;
    // Generate nomor pengajuan unik yang aman dari benturan/penghapusan:
    // Format: PENG/[KODE_UNIT]/[TAHUN]/[NO_URUT]
    const prefix = `PENG/${unit.code}/${fiscalYear.year}/`;
    // Ambil semua pengajuan dengan prefix tersebut untuk mencari angka urut tertinggi
    const existingWithPrefix = await prisma_1.default.submission.findMany({
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
    while (await prisma_1.default.submission.findUnique({ where: { submissionNumber } })) {
        nextSeq++;
        submissionNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }
    // Pindahkan file permanent ke folder uploads/pengajuan/ (Safe untuk Vercel / Cloud)
    let permanentFilePath = null;
    if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
        try {
            const isVercel = !!process.env.VERCEL;
            const permDir = isVercel
                ? path_1.default.join('/tmp', 'uploads', 'pengajuan')
                : path_1.default.resolve(__dirname, '../../../uploads/pengajuan');
            if (!fs_1.default.existsSync(permDir)) {
                fs_1.default.mkdirSync(permDir, { recursive: true });
            }
            const safeExt = path_1.default.extname(tempFilePath) || '.xlsx';
            const targetFile = path_1.default.join(permDir, `${submissionNumber.replace(/[\/\\]/g, '_')}_${Date.now()}${safeExt}`);
            fs_1.default.copyFileSync(tempFilePath, targetFile);
            try {
                fs_1.default.unlinkSync(tempFilePath);
            }
            catch (_) { }
            permanentFilePath = targetFile;
        }
        catch (fileErr) {
            console.warn('Gagal memindahkan file upload pengajuan:', fileErr);
            permanentFilePath = tempFilePath;
        }
    }
    // Simpan data pengajuan utama (Submissions)
    const submission = await prisma_1.default.submission.create({
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
            submittedById: req.user.id,
            notes: notes?.trim() || null,
        },
    });
    // Simpan item transaksi belanja (SubmissionItems)
    const dbItems = parsedItems.map((it, idx) => ({
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
    await prisma_1.default.submissionItem.createMany({
        data: dbItems,
    });
    // Audit trail
    await prisma_1.default.auditLog.create({
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
    (0, excel_backup_service_1.triggerAutoBackupExcel)('CREATE_SUBMISSION');
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
exports.getSubmissions = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { unitId, activityId, fiscalYearId, status, search, page = '1', limit = '50' } = req.query;
    const whereClause = {};
    // Role UNIT hanya bisa melihat pengajuan miliknya sendiri
    if (req.user?.role === 'UNIT') {
        whereClause.unitId = req.user.unitId || -1;
    }
    else if (unitId) {
        whereClause.unitId = parseInt(unitId);
    }
    if (activityId)
        whereClause.activityId = parseInt(activityId);
    if (fiscalYearId)
        whereClause.fiscalYearId = parseInt(fiscalYearId);
    if (status && status !== 'SEMUA')
        whereClause.status = status;
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
    const p = Math.max(1, parseInt(page));
    const l = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (p - 1) * l;
    const [submissions, total] = await Promise.all([
        prisma_1.default.submission.findMany({
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
        prisma_1.default.submission.count({ where: whereClause }),
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
exports.getSubmissionDetail = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await prisma_1.default.submission.findUnique({
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
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    // Jika role UNIT, cegah akses pengajuan unit lain
    if (req.user?.role === 'UNIT' && req.user.unitId !== sub.unitId) {
        throw (0, error_middleware_1.createError)('Anda tidak memiliki akses ke pengajuan unit lain.', 403);
    }
    res.json({
        success: true,
        data: sub,
    });
});
// GET /api/submissions/template/download
exports.downloadSubmissionTemplate = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const candidates = [
        path_1.default.resolve(__dirname, '../../../Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(__dirname, '../../../samples/Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(__dirname, '../../templates/Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(process.cwd(), 'Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(process.cwd(), 'samples/Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(process.cwd(), '../Template_Pengajuan_Resmi_Yayasan.xlsx'),
        path_1.default.resolve(process.cwd(), '../../Template_Pengajuan_Resmi_Yayasan.xlsx'),
        'D:/Sistem_Keuangan_Portable/Template_Pengajuan_Resmi_Yayasan.xlsx',
        'D:/PENGAJUAN & PENCAIRAN/Template_Pengajuan_Resmi_Yayasan.xlsx',
        'D:/PENGAJUAN & PENCAIRAN/samples/Template_Pengajuan_Resmi_Yayasan.xlsx',
    ];
    let templatePath = null;
    for (const c of candidates) {
        if (fs_1.default.existsSync(c)) {
            templatePath = c;
            break;
        }
    }
    if (!templatePath) {
        throw (0, error_middleware_1.createError)('File template resmi belum tersedia.', 404);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.download(templatePath, 'Template_Pengajuan_Resmi_Yayasan_2026.xlsx');
});
// DELETE /api/submissions/:id
exports.deleteSubmission = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: {
            unit: true,
        },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    // Validasi Hak Akses:
    if (req.user?.role === 'UNIT') {
        if (req.user.unitId !== sub.unitId) {
            throw (0, error_middleware_1.createError)('Anda tidak memiliki akses untuk menghapus pengajuan unit lain.', 403);
        }
        if (['DISETUJUI', 'DICAIRKAN', 'SELESAI'].includes(sub.status)) {
            throw (0, error_middleware_1.createError)(`Pengajuan dengan status ${sub.status} tidak dapat dihapus oleh Unit. Hubungi Bendahara/Admin.`, 400);
        }
    }
    // Jika sudah DICAIRKAN / SELESAI, hanya Admin atau Bendahara Keuangan yang boleh hapus
    if (['DICAIRKAN', 'SELESAI'].includes(sub.status) && req.user?.role !== 'ADMIN' && req.user?.role !== 'KEUANGAN' && req.user?.role !== 'BENDAHARA') {
        throw (0, error_middleware_1.createError)('Pengajuan yang dananya sudah dicairkan hanya dapat dihapus oleh Bendahara atau Administrator.', 400);
    }
    // Jalankan transaksi penghapusan bertingkat
    await prisma_1.default.$transaction(async (tx) => {
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
    if (sub.filePath && fs_1.default.existsSync(sub.filePath)) {
        try {
            fs_1.default.unlinkSync(sub.filePath);
        }
        catch (_) { }
    }
    // Auto-backup ke file Excel lokal
    (0, excel_backup_service_1.triggerAutoBackupExcel)('DELETE_SUBMISSION');
    res.json({
        success: true,
        message: `Pengajuan ${sub.submissionNumber} ("${sub.title}") berhasil dihapus.`,
    });
});
// PATCH /api/submissions/:id/workflow-status
exports.updateSubmissionWorkflowStatus = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, notes, disbursementAmount, disbursementDate, paymentMethod, bankName, accountNumber, recipientName } = req.body;
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: { unit: true },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    const validStatuses = [
        'DRAFT_UNIT',
        'MENUNGGU_EVALUASI',
        'SEDANG_DIEVALUASI',
        'PERLU_REVISI',
        'SELESAI_EVALUASI',
        'SIAP_DICAIRKAN',
        'SUDAH_DIKIRIM',
        'SUDAH_DICAIRKAN',
        'DIBATALKAN',
        'DISETUJUI',
        'DICAIRKAN',
    ];
    if (status && !validStatuses.includes(status)) {
        throw (0, error_middleware_1.createError)(`Status "${status}" tidak valid.`, 400);
    }
    const updateData = {};
    if (status)
        updateData.status = status;
    if (notes !== undefined)
        updateData.notes = notes;
    if (status === 'SELESAI_EVALUASI' || status === 'SIAP_DICAIRKAN') {
        if (!sub.totalApproved) {
            updateData.totalApproved = sub.totalReviewed || sub.totalParsing;
        }
    }
    if (status === 'SUDAH_DICAIRKAN' || status === 'DICAIRKAN') {
        const amount = Number(disbursementAmount) || sub.totalApproved || sub.totalReviewed || sub.totalParsing;
        const disburseDate = disbursementDate ? new Date(disbursementDate) : new Date();
        updateData.totalDisbursed = (sub.totalDisbursed || 0) + amount;
        updateData.totalRealized = (sub.totalRealized || 0) + amount;
        updateData.disbursedAt = disburseDate;
        updateData.disbursedById = req.user?.id;
        // Catat record disbursement jika belum ada
        await prisma_1.default.disbursement.create({
            data: {
                submissionId: id,
                amount,
                paymentMethod: paymentMethod || 'TRANSFER',
                bankName: bankName || 'BSI (Bank Syariah Indonesia)',
                accountNumber: accountNumber || null,
                recipientName: recipientName || sub.picName || sub.unit.name,
                notes: notes || 'Pencairan dikonfirmasi oleh Bendahara Pengeluaran',
                disbursedById: req.user?.id || sub.submittedById,
                disbursedAt: disburseDate,
            },
        });
    }
    const updatedSub = await prisma_1.default.submission.update({
        where: { id },
        data: updateData,
    });
    // Audit Log
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'UPDATE_STATUS',
            entity: 'Submission',
            entityId: id,
            oldValue: sub.status,
            newValue: status || sub.status,
            note: `Status pengajuan ${sub.submissionNumber} diubah menjadi ${status || sub.status}.${notes ? ` Catatan: ${notes}` : ''}`,
        },
    });
    res.json({
        success: true,
        message: `Status pengajuan berhasil diperbarui menjadi ${status || sub.status}.`,
        data: updatedSub,
    });
});
// PUT /api/submissions/:id (Edit/Revisi Pengajuan Unit & Items)
exports.updateSubmission = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, activityDate, picName, notes, items, status } = req.body;
    const sub = await prisma_1.default.submission.findUnique({
        where: { id },
        include: { unit: true },
    });
    if (!sub)
        throw (0, error_middleware_1.createError)('Pengajuan tidak ditemukan.', 404);
    // Jika ada items baru, hitung total baru
    let totalParsing = sub.totalParsing;
    if (items && Array.isArray(items) && items.length > 0) {
        totalParsing = items.reduce((acc, it) => acc + (Number(it.jumlah) || (Number(it.hargaSatuan) * Number(it.volume))), 0);
    }
    const updatedSub = await prisma_1.default.submission.update({
        where: { id },
        data: {
            title: title ? title.trim() : sub.title,
            activityDate: activityDate ? new Date(activityDate) : sub.activityDate,
            picName: picName ? picName.trim() : sub.picName,
            notes: notes !== undefined ? notes : sub.notes,
            totalParsing,
            totalExcel: totalParsing,
            status: status || 'MENUNGGU_EVALUASI',
        },
    });
    // Jika items disertakan, perbarui item belanja
    if (items && Array.isArray(items) && items.length > 0) {
        await prisma_1.default.submissionItem.deleteMany({ where: { submissionId: id } });
        const dbItems = items.map((it, idx) => ({
            submissionId: id,
            itemNumber: it.no || idx + 1,
            kategori: it.kategori?.trim() || 'Umum',
            uraian: it.uraian?.trim() || 'Belanja',
            hargaSatuan: Number(it.hargaSatuan) || 0,
            volume: Number(it.volume) || 1,
            satuan: it.satuan?.trim() || 'Item',
            jumlah: Number(it.jumlah) || 0,
            keterangan: it.keterangan?.trim() || null,
            originalPrice: Number(it.hargaSatuan) || 0,
            reviewPrice: Number(it.hargaSatuan) || 0,
            sshStatus: 'BELUM_REVIEW',
        }));
        await prisma_1.default.submissionItem.createMany({ data: dbItems });
    }
    res.json({
        success: true,
        message: 'Pengajuan berhasil diperbarui.',
        data: updatedSub,
    });
});
//# sourceMappingURL=submissions.controller.js.map