"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllSsh = exports.downloadSshTemplate = exports.deleteSshVersion = exports.setActiveSshVersion = exports.getSshVersions = exports.deleteSshItem = exports.updateSshItem = exports.createSshItem = exports.getSshItems = exports.getActiveSshStatus = exports.confirmImportSsh = exports.previewSsh = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
const ssh_parser_service_1 = require("../services/ssh-parser.service");
// POST /api/ssh/preview
exports.previewSsh = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, error_middleware_1.createError)('Silakan pilih file Excel Master SSH untuk diupload.', 400);
    }
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    try {
        const parseResult = await (0, ssh_parser_service_1.parseSshExcel)(filePath);
        // Cek apakah Master SSH sudah ada di database
        const activeVersion = await prisma_1.default.sshVersion.findFirst({
            where: { isActive: true },
            include: {
                importedBy: { select: { id: true, name: true, email: true } },
            },
        });
        const totalVersionsCount = await prisma_1.default.sshVersion.count();
        const suggestedVersion = `v1.${totalVersionsCount}`;
        res.json({
            success: true,
            message: 'File Excel SSH berhasil diproses dan divalidasi.',
            data: {
                tempFilePath: filePath,
                filename: originalFilename,
                sheetName: parseResult.sheetName,
                totalItems: parseResult.totalItems,
                sampleItems: parseResult.sampleItems,
                allItems: parseResult.items,
                alreadyExists: !!activeVersion,
                currentActiveVersion: activeVersion
                    ? {
                        id: activeVersion.id,
                        version: activeVersion.version,
                        filename: activeVersion.filename,
                        importedAt: activeVersion.importedAt,
                        totalItems: activeVersion.totalItems,
                        importedBy: activeVersion.importedBy?.name || 'Administrator',
                    }
                    : null,
                suggestedVersion,
            },
        });
    }
    catch (err) {
        // Hapus file sementara jika parsing gagal
        if (fs_1.default.existsSync(filePath)) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (_) { }
        }
        throw err;
    }
});
// POST /api/ssh/import
exports.confirmImportSsh = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { tempFilePath, filename, version, notes, items } = req.body;
    let itemsToSave = items;
    // Jika items tidak disertakan secara utuh, coba parse ulang dari tempFilePath
    if (!itemsToSave || !Array.isArray(itemsToSave) || itemsToSave.length === 0) {
        if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
            const parsed = await (0, ssh_parser_service_1.parseSshExcel)(tempFilePath);
            itemsToSave = parsed.items;
        }
        else {
            throw (0, error_middleware_1.createError)('Data item SSH tidak ditemukan untuk disimpan.', 400);
        }
    }
    const finalFilename = filename || 'Master_SSH_Yayasan_2026_FINAL.xlsx';
    const finalVersion = version?.trim() || `v1.${(await prisma_1.default.sshVersion.count())}`;
    // Jika ada versi aktif sebelumnya, nonaktifkan (versi lama tetap disimpan sebagai histori)
    await prisma_1.default.sshVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
    });
    // Buat versi SSH baru di database
    const newVersion = await prisma_1.default.sshVersion.create({
        data: {
            version: finalVersion,
            filename: finalFilename,
            totalItems: itemsToSave.length,
            isActive: true,
            importedById: req.user.id,
            notes: notes?.trim() || null,
        },
    });
    // Simpan seluruh item SSH ke database
    const dbItems = itemsToSave.map((item) => ({
        sshVersionId: newVersion.id,
        kode: item.kode?.trim() || null,
        kategori: item.kategori?.trim() || 'Umum',
        uraian: item.uraian.trim(),
        satuan: item.satuan.trim(),
        hargaSsh: Number(item.hargaSsh) || 0,
        status: 'AKTIF',
        keterangan: item.keterangan?.trim() || null,
    }));
    // Batch insert
    await prisma_1.default.sshItem.createMany({
        data: dbItems,
    });
    // Hapus file temporary
    if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
        try {
            fs_1.default.unlinkSync(tempFilePath);
        }
        catch (_) { }
    }
    // Catat Audit Trail
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'IMPORT_SSH',
            entity: 'SshVersion',
            entityId: newVersion.id,
            newValue: JSON.stringify({
                version: newVersion.version,
                filename: newVersion.filename,
                totalItems: newVersion.totalItems,
            }),
            note: `Import Master SSH 2026 versi ${newVersion.version} (${newVersion.totalItems} item)`,
        },
    });
    res.status(201).json({
        success: true,
        message: `Master SSH 2026 versi ${newVersion.version} berhasil disimpan ke database (${newVersion.totalItems} item).`,
        data: {
            id: newVersion.id,
            version: newVersion.version,
            filename: newVersion.filename,
            totalItems: newVersion.totalItems,
            importedAt: newVersion.importedAt,
        },
    });
});
// GET /api/ssh/status
exports.getActiveSshStatus = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const activeVersion = await prisma_1.default.sshVersion.findFirst({
        where: { isActive: true },
        include: {
            importedBy: { select: { id: true, name: true, email: true } },
        },
    });
    if (!activeVersion) {
        res.json({
            success: true,
            data: {
                hasMaster: false,
                version: null,
                filename: null,
                importedAt: null,
                totalItems: 0,
                importedBy: null,
                notes: null,
                id: null,
            },
        });
        return;
    }
    res.json({
        success: true,
        data: {
            hasMaster: true,
            id: activeVersion.id,
            version: activeVersion.version,
            filename: activeVersion.filename,
            importedAt: activeVersion.importedAt,
            totalItems: activeVersion.totalItems,
            importedBy: activeVersion.importedBy,
            notes: activeVersion.notes,
        },
    });
});
// GET /api/ssh/items
exports.getSshItems = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { versionId, search, kategori, page = '1', limit = '100' } = req.query;
    let targetVersionId;
    if (versionId) {
        targetVersionId = parseInt(versionId);
    }
    else {
        const active = await prisma_1.default.sshVersion.findFirst({ where: { isActive: true } });
        if (!active) {
            res.json({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    page: 1,
                    limit: parseInt(limit),
                    categories: [],
                    version: null,
                },
            });
            return;
        }
        targetVersionId = active.id;
    }
    const p = Math.max(1, parseInt(page));
    const l = Math.min(500, Math.max(1, parseInt(limit)));
    const skip = (p - 1) * l;
    const whereClause = {
        sshVersionId: targetVersionId,
    };
    if (kategori && kategori !== 'SEMUA') {
        whereClause.kategori = kategori;
    }
    if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        whereClause.OR = [
            { uraian: { contains: s } },
            { kode: { contains: s } },
            { kategori: { contains: s } },
        ];
    }
    const [items, total, categoriesRaw, version] = await Promise.all([
        prisma_1.default.sshItem.findMany({
            where: whereClause,
            skip,
            take: l,
            orderBy: [{ kategori: 'asc' }, { uraian: 'asc' }],
        }),
        prisma_1.default.sshItem.count({ where: whereClause }),
        prisma_1.default.sshItem.findMany({
            where: { sshVersionId: targetVersionId },
            select: { kategori: true },
            distinct: ['kategori'],
        }),
        prisma_1.default.sshVersion.findUnique({
            where: { id: targetVersionId },
            include: {
                importedBy: { select: { id: true, name: true, email: true } },
            },
        }),
    ]);
    const categories = categoriesRaw.map((c) => c.kategori).sort();
    res.json({
        success: true,
        data: {
            items,
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
            categories,
            version: version
                ? {
                    id: version.id,
                    version: version.version,
                    filename: version.filename,
                    importedAt: version.importedAt,
                    totalItems: version.totalItems,
                    importedBy: version.importedBy?.name,
                }
                : null,
        },
    });
});
// POST /api/ssh/items (Tambah Item Master SSH Baru)
exports.createSshItem = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { versionId, kode, kategori, uraian, satuan, hargaSsh, keterangan, status = 'AKTIF' } = req.body;
    if (!uraian || !uraian.trim()) {
        throw (0, error_middleware_1.createError)('Uraian barang / jasa wajib diisi.', 400);
    }
    if (!kategori || !kategori.trim()) {
        throw (0, error_middleware_1.createError)('Kategori wajib diisi.', 400);
    }
    if (!satuan || !satuan.trim()) {
        throw (0, error_middleware_1.createError)('Satuan wajib diisi.', 400);
    }
    const numericHarga = Number(hargaSsh);
    if (isNaN(numericHarga) || numericHarga <= 0) {
        throw (0, error_middleware_1.createError)('Harga Standar SSH harus berupa angka valid lebih dari 0.', 400);
    }
    let targetVersionId;
    if (versionId) {
        targetVersionId = parseInt(versionId);
    }
    else {
        let activeVersion = await prisma_1.default.sshVersion.findFirst({ where: { isActive: true } });
        if (!activeVersion) {
            activeVersion = await prisma_1.default.sshVersion.create({
                data: {
                    version: 'v1.0',
                    filename: 'Input Manual Sistem',
                    totalItems: 0,
                    isActive: true,
                    importedById: req.user?.id || 1,
                    notes: 'Versi Master SSH dibuat secara manual melalui aplikasi',
                },
            });
        }
        targetVersionId = activeVersion.id;
    }
    const newItem = await prisma_1.default.sshItem.create({
        data: {
            sshVersionId: targetVersionId,
            kode: kode?.trim() || null,
            kategori: kategori.trim(),
            uraian: uraian.trim(),
            satuan: satuan.trim(),
            hargaSsh: numericHarga,
            status: status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
            keterangan: keterangan?.trim() || null,
        },
    });
    // Update total items count pada SshVersion
    const count = await prisma_1.default.sshItem.count({ where: { sshVersionId: targetVersionId } });
    await prisma_1.default.sshVersion.update({
        where: { id: targetVersionId },
        data: { totalItems: count },
    });
    // Audit trail
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'CREATE_SSH_ITEM',
            entity: 'SshItem',
            entityId: newItem.id,
            newValue: JSON.stringify(newItem),
            note: `Item SSH "${newItem.uraian}" (${newItem.kategori} - Rp${numericHarga.toLocaleString('id-ID')}) berhasil ditambahkan.`,
        },
    });
    res.status(201).json({
        success: true,
        message: `Item SSH "${newItem.uraian}" berhasil ditambahkan.`,
        data: newItem,
    });
});
// PUT / PATCH /api/ssh/items/:id (Edit Item Master SSH)
exports.updateSshItem = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { kode, kategori, uraian, satuan, hargaSsh, keterangan, status } = req.body;
    const existing = await prisma_1.default.sshItem.findUnique({ where: { id } });
    if (!existing) {
        throw (0, error_middleware_1.createError)('Item Master SSH tidak ditemukan.', 404);
    }
    const updateData = {};
    if (kode !== undefined)
        updateData.kode = kode ? kode.trim() : null;
    if (kategori !== undefined) {
        if (!kategori.trim())
            throw (0, error_middleware_1.createError)('Kategori tidak boleh kosong.', 400);
        updateData.kategori = kategori.trim();
    }
    if (uraian !== undefined) {
        if (!uraian.trim())
            throw (0, error_middleware_1.createError)('Uraian tidak boleh kosong.', 400);
        updateData.uraian = uraian.trim();
    }
    if (satuan !== undefined) {
        if (!satuan.trim())
            throw (0, error_middleware_1.createError)('Satuan tidak boleh kosong.', 400);
        updateData.satuan = satuan.trim();
    }
    if (hargaSsh !== undefined) {
        const numericHarga = Number(hargaSsh);
        if (isNaN(numericHarga) || numericHarga <= 0) {
            throw (0, error_middleware_1.createError)('Harga Standar SSH harus lebih dari 0.', 400);
        }
        updateData.hargaSsh = numericHarga;
    }
    if (status !== undefined) {
        updateData.status = status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';
    }
    if (keterangan !== undefined) {
        updateData.keterangan = keterangan ? keterangan.trim() : null;
    }
    const updatedItem = await prisma_1.default.sshItem.update({
        where: { id },
        data: updateData,
    });
    // Audit log
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'UPDATE_SSH_ITEM',
            entity: 'SshItem',
            entityId: id,
            oldValue: JSON.stringify(existing),
            newValue: JSON.stringify(updatedItem),
            note: `Item SSH "${updatedItem.uraian}" berhasil diubah oleh ${req.user?.name || 'Administrator'}.`,
        },
    });
    res.json({
        success: true,
        message: `Item SSH "${updatedItem.uraian}" berhasil diperbarui.`,
        data: updatedItem,
    });
});
// DELETE /api/ssh/items/:id (Hapus Item Master SSH)
exports.deleteSshItem = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.sshItem.findUnique({ where: { id } });
    if (!existing) {
        throw (0, error_middleware_1.createError)('Item Master SSH tidak ditemukan.', 404);
    }
    // Unlink foreign key in submissionItem if any
    await prisma_1.default.submissionItem.updateMany({
        where: { sshItemId: id },
        data: { sshItemId: null },
    });
    await prisma_1.default.sshItem.delete({ where: { id } });
    // Update total items count pada SshVersion
    const count = await prisma_1.default.sshItem.count({ where: { sshVersionId: existing.sshVersionId } });
    await prisma_1.default.sshVersion.update({
        where: { id: existing.sshVersionId },
        data: { totalItems: count },
    });
    // Audit log
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'DELETE_SSH_ITEM',
            entity: 'SshItem',
            entityId: id,
            oldValue: JSON.stringify(existing),
            note: `Item SSH "${existing.uraian}" (${existing.kategori}) dihapus oleh ${req.user?.name || 'Administrator'}.`,
        },
    });
    res.json({
        success: true,
        message: `Item SSH "${existing.uraian}" berhasil dihapus.`,
    });
});
// GET /api/ssh/versions
exports.getSshVersions = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const versions = await prisma_1.default.sshVersion.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            importedBy: { select: { id: true, name: true, email: true } },
            _count: { select: { items: true } },
        },
    });
    res.json({ success: true, data: versions });
});
// PATCH /api/ssh/versions/:id/set-active
exports.setActiveSshVersion = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const version = await prisma_1.default.sshVersion.findUnique({ where: { id } });
    if (!version)
        throw (0, error_middleware_1.createError)('Versi SSH tidak ditemukan.', 404);
    await prisma_1.default.sshVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
    });
    const updated = await prisma_1.default.sshVersion.update({
        where: { id },
        data: { isActive: true },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'SET_ACTIVE_SSH',
            entity: 'SshVersion',
            entityId: id,
            note: `Versi SSH ${updated.version} diaktifkan sebagai acuan resmi.`,
        },
    });
    res.json({
        success: true,
        message: `Master SSH versi ${updated.version} berhasil diaktifkan.`,
        data: updated,
    });
});
// DELETE /api/ssh/versions/:id
exports.deleteSshVersion = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const version = await prisma_1.default.sshVersion.findUnique({ where: { id } });
    if (!version)
        throw (0, error_middleware_1.createError)('Versi SSH tidak ditemukan.', 404);
    if (version.isActive) {
        throw (0, error_middleware_1.createError)('Versi SSH yang sedang aktif tidak dapat dihapus. Aktifkan versi lain terlebih dahulu.', 400);
    }
    await prisma_1.default.sshItem.deleteMany({ where: { sshVersionId: id } });
    await prisma_1.default.sshVersion.delete({ where: { id } });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'DELETE_SSH_VERSION',
            entity: 'SshVersion',
            entityId: id,
            note: `Versi SSH ${version.version} dihapus.`,
        },
    });
    res.json({ success: true, message: `Versi SSH ${version.version} berhasil dihapus.` });
});
// GET /api/ssh/template/download
exports.downloadSshTemplate = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const candidates = [
        path_1.default.resolve(__dirname, '../../templates/TEMPLATE_MASTER_SSH_2026.xlsx'),
        path_1.default.resolve(__dirname, '../../../TEMPLATE_MASTER_SSH_2026.xlsx'),
        path_1.default.resolve(__dirname, '../../../samples/TEMPLATE_MASTER_SSH_2026.xlsx'),
    ];
    let templatePath = null;
    for (const c of candidates) {
        if (fs_1.default.existsSync(c)) {
            templatePath = c;
            break;
        }
    }
    if (!templatePath) {
        throw (0, error_middleware_1.createError)('File template Master SSH 2026 belum tersedia.', 404);
    }
    res.download(templatePath, 'TEMPLATE_MASTER_SSH_2026.xlsx');
});
// DELETE /api/ssh/clear-all (Kosongkan seluruh data Master SSH di database)
exports.clearAllSsh = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // 1. Unlink item pengajuan yang terikat ke SSH
    await prisma_1.default.submissionItem.updateMany({
        where: {
            OR: [
                { sshItemId: { not: null } },
                { sshPrice: { not: null } },
            ],
        },
        data: {
            sshItemId: null,
            sshPrice: null,
            sshStatus: 'BELUM_REVIEW',
        },
    });
    // 2. Hapus semua item SSH
    const deletedItems = await prisma_1.default.sshItem.deleteMany({});
    // 3. Hapus semua versi SSH
    const deletedVersions = await prisma_1.default.sshVersion.deleteMany({});
    // 4. Audit trail
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'CLEAR_SSH_DATABASE',
            entity: 'SshVersion',
            note: `Seluruh database Master SSH berhasil dikosongkan oleh ${req.user?.name || 'Administrator'} (${deletedItems.count} item, ${deletedVersions.count} versi dihapus).`,
        },
    });
    res.json({
        success: true,
        message: `Database Master SSH berhasil dikosongkan (${deletedItems.count} item terhapus). Anda dapat mengunggah file Master SSH baru.`,
        data: {
            deletedItems: deletedItems.count,
            deletedVersions: deletedVersions.count,
        },
    });
});
//# sourceMappingURL=ssh.controller.js.map