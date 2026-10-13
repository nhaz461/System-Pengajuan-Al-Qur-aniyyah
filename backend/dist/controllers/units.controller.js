"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnit = exports.toggleUnitActive = exports.updateUnit = exports.createUnit = exports.getUnit = exports.getUnits = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/units
exports.getUnits = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { isActive } = req.query;
    const units = await prisma_1.default.unit.findMany({
        where: isActive !== undefined ? { isActive: isActive === 'true' } : {},
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { users: true } },
        },
    });
    res.json({ success: true, data: units });
});
// GET /api/units/:id
exports.getUnit = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const unit = await prisma_1.default.unit.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
    });
    if (!unit)
        throw (0, error_middleware_1.createError)('Unit tidak ditemukan.', 404);
    res.json({ success: true, data: unit });
});
// POST /api/units
exports.createUnit = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { name, code, description } = req.body;
    if (!name || !code) {
        throw (0, error_middleware_1.createError)('Nama unit dan kode unit wajib diisi.', 400);
    }
    const existing = await prisma_1.default.unit.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
        throw (0, error_middleware_1.createError)(`Kode unit "${code.toUpperCase()}" sudah digunakan.`, 409);
    }
    const unit = await prisma_1.default.unit.create({
        data: {
            name: name.trim(),
            code: code.toUpperCase().trim(),
            description: description?.trim() || null,
        },
    });
    // Audit log
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'CREATE',
            entity: 'Unit',
            entityId: unit.id,
            newValue: JSON.stringify({ name: unit.name, code: unit.code }),
            note: 'Unit baru dibuat',
        },
    });
    res.status(201).json({ success: true, message: 'Unit berhasil dibuat.', data: unit });
});
// PUT /api/units/:id
exports.updateUnit = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, code, description } = req.body;
    const existing = await prisma_1.default.unit.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Unit tidak ditemukan.', 404);
    if (code && code.toUpperCase() !== existing.code) {
        const codeConflict = await prisma_1.default.unit.findUnique({ where: { code: code.toUpperCase() } });
        if (codeConflict)
            throw (0, error_middleware_1.createError)(`Kode unit "${code.toUpperCase()}" sudah digunakan.`, 409);
    }
    const updated = await prisma_1.default.unit.update({
        where: { id },
        data: {
            name: name?.trim() || existing.name,
            code: code?.toUpperCase().trim() || existing.code,
            description: description !== undefined ? description?.trim() || null : existing.description,
        },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'UPDATE',
            entity: 'Unit',
            entityId: id,
            oldValue: JSON.stringify({ name: existing.name, code: existing.code }),
            newValue: JSON.stringify({ name: updated.name, code: updated.code }),
            note: 'Unit diperbarui',
        },
    });
    res.json({ success: true, message: 'Unit berhasil diperbarui.', data: updated });
});
// PATCH /api/units/:id/toggle-active
exports.toggleUnitActive = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.unit.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Unit tidak ditemukan.', 404);
    const updated = await prisma_1.default.unit.update({
        where: { id },
        data: { isActive: !existing.isActive },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: existing.isActive ? 'DEACTIVATE' : 'ACTIVATE',
            entity: 'Unit',
            entityId: id,
            note: `Unit ${existing.isActive ? 'dinonaktifkan' : 'diaktifkan'}`,
        },
    });
    res.json({
        success: true,
        message: `Unit berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updated,
    });
});
// DELETE /api/units/:id
exports.deleteUnit = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.unit.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
    });
    if (!existing)
        throw (0, error_middleware_1.createError)('Unit tidak ditemukan.', 404);
    if (existing._count.users > 0) {
        throw (0, error_middleware_1.createError)('Unit tidak dapat dihapus karena masih memiliki pengguna terdaftar.', 409);
    }
    await prisma_1.default.unit.delete({ where: { id } });
    res.json({ success: true, message: 'Unit berhasil dihapus.' });
});
//# sourceMappingURL=units.controller.js.map