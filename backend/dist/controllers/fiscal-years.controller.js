"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFiscalYear = exports.updateFiscalYear = exports.setActiveFiscalYear = exports.createFiscalYear = exports.getActiveFiscalYear = exports.getFiscalYears = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/fiscal-years
exports.getFiscalYears = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const fiscalYears = await prisma_1.default.fiscalYear.findMany({
        orderBy: { year: 'desc' },
    });
    res.json({ success: true, data: fiscalYears });
});
// GET /api/fiscal-years/active
exports.getActiveFiscalYear = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const fiscalYear = await prisma_1.default.fiscalYear.findFirst({
        where: { isActive: true },
    });
    if (!fiscalYear) {
        res.json({ success: true, data: null, message: 'Tidak ada tahun anggaran aktif.' });
        return;
    }
    res.json({ success: true, data: fiscalYear });
});
// POST /api/fiscal-years
exports.createFiscalYear = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { year, notes } = req.body;
    const yearNum = parseInt(year);
    if (!year || isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
        throw (0, error_middleware_1.createError)('Tahun tidak valid. Masukkan tahun antara 2020 dan 2100.', 400);
    }
    const existing = await prisma_1.default.fiscalYear.findUnique({ where: { year: yearNum } });
    if (existing)
        throw (0, error_middleware_1.createError)(`Tahun anggaran ${yearNum} sudah ada.`, 409);
    const fiscalYear = await prisma_1.default.fiscalYear.create({
        data: {
            year: yearNum,
            notes: notes?.trim() || null,
            isActive: false,
        },
    });
    res.status(201).json({ success: true, message: 'Tahun anggaran berhasil dibuat.', data: fiscalYear });
});
// PATCH /api/fiscal-years/:id/set-active
exports.setActiveFiscalYear = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const fiscalYear = await prisma_1.default.fiscalYear.findUnique({ where: { id } });
    if (!fiscalYear)
        throw (0, error_middleware_1.createError)('Tahun anggaran tidak ditemukan.', 404);
    // Nonaktifkan semua tahun anggaran lain
    await prisma_1.default.fiscalYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
    });
    const updated = await prisma_1.default.fiscalYear.update({
        where: { id },
        data: { isActive: true },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'SET_ACTIVE',
            entity: 'FiscalYear',
            entityId: id,
            note: `Tahun anggaran ${updated.year} diaktifkan`,
        },
    });
    res.json({
        success: true,
        message: `Tahun anggaran ${updated.year} berhasil diaktifkan.`,
        data: updated,
    });
});
// PUT /api/fiscal-years/:id
exports.updateFiscalYear = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    const existing = await prisma_1.default.fiscalYear.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Tahun anggaran tidak ditemukan.', 404);
    const updated = await prisma_1.default.fiscalYear.update({
        where: { id },
        data: { notes: notes !== undefined ? notes?.trim() || null : existing.notes },
    });
    res.json({ success: true, message: 'Tahun anggaran berhasil diperbarui.', data: updated });
});
// DELETE /api/fiscal-years/:id
exports.deleteFiscalYear = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.fiscalYear.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Tahun anggaran tidak ditemukan.', 404);
    if (existing.isActive) {
        throw (0, error_middleware_1.createError)('Tahun anggaran aktif tidak dapat dihapus. Nonaktifkan terlebih dahulu.', 409);
    }
    await prisma_1.default.fiscalYear.delete({ where: { id } });
    res.json({ success: true, message: 'Tahun anggaran berhasil dihapus.' });
});
//# sourceMappingURL=fiscal-years.controller.js.map