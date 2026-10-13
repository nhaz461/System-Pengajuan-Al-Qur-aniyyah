import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

// GET /api/activities
export const getActivities = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.query;

  const activities = await prisma.activity.findMany({
    where: isActive !== undefined ? { isActive: isActive === 'true' } : {},
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: activities });
});

// GET /api/activities/:id
export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) throw createError('Kegiatan tidak ditemukan.', 404);
  res.json({ success: true, data: activity });
});

// POST /api/activities
export const createActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name) throw createError('Nama kegiatan wajib diisi.', 400);

  const existing = await prisma.activity.findFirst({
    where: { name: { equals: name.trim() } },
  });
  if (existing) throw createError(`Kegiatan "${name}" sudah ada.`, 409);

  const activity = await prisma.activity.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  await prisma.auditLog.create({
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
export const updateActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;

  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw createError('Kegiatan tidak ditemukan.', 404);

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      name: name?.trim() || existing.name,
      description: description !== undefined ? description?.trim() || null : existing.description,
    },
  });

  await prisma.auditLog.create({
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
export const toggleActivityActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw createError('Kegiatan tidak ditemukan.', 404);

  const updated = await prisma.activity.update({
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
export const deleteActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw createError('Kegiatan tidak ditemukan.', 404);

  await prisma.activity.delete({ where: { id } });
  res.json({ success: true, message: 'Kegiatan berhasil dihapus.' });
});
