import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

// GET /api/units
export const getUnits = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.query;

  const units = await prisma.unit.findMany({
    where: isActive !== undefined ? { isActive: isActive === 'true' } : {},
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true } },
    },
  });

  res.json({ success: true, data: units });
});

// GET /api/units/:id
export const getUnit = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const unit = await prisma.unit.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!unit) throw createError('Unit tidak ditemukan.', 404);
  res.json({ success: true, data: unit });
});

// POST /api/units
export const createUnit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, description } = req.body;

  if (!name || !code) {
    throw createError('Nama unit dan kode unit wajib diisi.', 400);
  }

  const existing = await prisma.unit.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) {
    throw createError(`Kode unit "${code.toUpperCase()}" sudah digunakan.`, 409);
  }

  const unit = await prisma.unit.create({
    data: {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
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
export const updateUnit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, code, description } = req.body;

  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) throw createError('Unit tidak ditemukan.', 404);

  if (code && code.toUpperCase() !== existing.code) {
    const codeConflict = await prisma.unit.findUnique({ where: { code: code.toUpperCase() } });
    if (codeConflict) throw createError(`Kode unit "${code.toUpperCase()}" sudah digunakan.`, 409);
  }

  const updated = await prisma.unit.update({
    where: { id },
    data: {
      name: name?.trim() || existing.name,
      code: code?.toUpperCase().trim() || existing.code,
      description: description !== undefined ? description?.trim() || null : existing.description,
    },
  });

  await prisma.auditLog.create({
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
export const toggleUnitActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) throw createError('Unit tidak ditemukan.', 404);

  const updated = await prisma.unit.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await prisma.auditLog.create({
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
export const deleteUnit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.unit.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) throw createError('Unit tidak ditemukan.', 404);

  if (existing._count.users > 0) {
    throw createError('Unit tidak dapat dihapus karena masih memiliki pengguna terdaftar.', 409);
  }

  await prisma.unit.delete({ where: { id } });

  res.json({ success: true, message: 'Unit berhasil dihapus.' });
});
