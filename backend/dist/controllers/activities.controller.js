"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteActivity = exports.toggleActivityActive = exports.updateActivity = exports.createActivity = exports.getActivity = exports.getActivities = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/activities
exports.getActivities = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { isActive } = req.query;
    const activities = await prisma_1.default.activity.findMany({
        where: isActive !== undefined ? { isActive: isActive === 'true' } : {},
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: activities });
});
// GET /api/activities/:id
exports.getActivity = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const activity = await prisma_1.default.activity.findUnique({ where: { id } });
    if (!activity)
        throw (0, error_middleware_1.createError)('Kegiatan tidak ditemukan.', 404);
    res.json({ success: true, data: activity });
});
// POST /api/activities
exports.createActivity = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { name, description } = req.body;
    if (!name)
        throw (0, error_middleware_1.createError)('Nama kegiatan wajib diisi.', 400);
    const existing = await prisma_1.default.activity.findFirst({
        where: { name: { equals: name.trim() } },
    });
    if (existing)
        throw (0, error_middleware_1.createError)(`Kegiatan "${name}" sudah ada.`, 409);
    const activity = await prisma_1.default.activity.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
        },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'CREATE',
            entity: 'Activity',
            entityId: activity.id,
            newValue: JSON.stringify({ name: activity.name }),
            note: 'Kegiatan baru dibuat',
        },
    });
    res.status(201).json({ success: true, message: 'Kegiatan berhasil dibuat.', data: activity });
});
// PUT /api/activities/:id
exports.updateActivity = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const existing = await prisma_1.default.activity.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Kegiatan tidak ditemukan.', 404);
    const updated = await prisma_1.default.activity.update({
        where: { id },
        data: {
            name: name?.trim() || existing.name,
            description: description !== undefined ? description?.trim() || null : existing.description,
        },
    });
    await prisma_1.default.auditLog.create({
        data: {
            userId: req.user?.id,
            action: 'UPDATE',
            entity: 'Activity',
            entityId: id,
            oldValue: JSON.stringify({ name: existing.name }),
            newValue: JSON.stringify({ name: updated.name }),
            note: 'Kegiatan diperbarui',
        },
    });
    res.json({ success: true, message: 'Kegiatan berhasil diperbarui.', data: updated });
});
// PATCH /api/activities/:id/toggle-active
exports.toggleActivityActive = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.activity.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Kegiatan tidak ditemukan.', 404);
    const updated = await prisma_1.default.activity.update({
        where: { id },
        data: { isActive: !existing.isActive },
    });
    res.json({
        success: true,
        message: `Kegiatan berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updated,
    });
});
// DELETE /api/activities/:id
exports.deleteActivity = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma_1.default.activity.findUnique({ where: { id } });
    if (!existing)
        throw (0, error_middleware_1.createError)('Kegiatan tidak ditemukan.', 404);
    await prisma_1.default.activity.delete({ where: { id } });
    res.json({ success: true, message: 'Kegiatan berhasil dihapus.' });
});
//# sourceMappingURL=activities.controller.js.map