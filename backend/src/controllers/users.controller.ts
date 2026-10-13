import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

// GET /api/users
export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { role: true, unit: true },
    orderBy: { name: 'asc' },
  });

  const data = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
    unit: u.unit ? { id: u.unit.id, name: u.unit.name } : null,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));

  res.json({ success: true, data });
});

// POST /api/users
export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, roleName, unitId } = req.body;

  if (!name || !email || !password || !roleName) {
    throw createError('Nama, email, password, dan role wajib diisi.', 400);
  }

  if (password.length < 8) {
    throw createError('Password minimal 8 karakter.', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw createError('Email sudah terdaftar.', 409);

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw createError(`Role "${roleName}" tidak ditemukan.`, 400);

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      roleId: role.id,
      unitId: unitId ? parseInt(unitId) : null,
    },
    include: { role: true, unit: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      note: `Pengguna baru dibuat: ${user.email} (${role.name})`,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Pengguna berhasil dibuat.',
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      unit: user.unit ? { id: user.unit.id, name: user.unit.name } : null,
    },
  });
});

// PUT /api/users/:id
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, email, roleName, unitId } = req.body;

  const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!existing) throw createError('Pengguna tidak ditemukan.', 404);

  const roleId = roleName
    ? (await prisma.role.findUnique({ where: { name: roleName } }))?.id
    : existing.roleId;

  if (roleName && !roleId) throw createError(`Role "${roleName}" tidak ditemukan.`, 400);

  if (email && email.toLowerCase() !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (conflict) throw createError('Email sudah digunakan.', 409);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: name?.trim() || existing.name,
      email: email?.toLowerCase().trim() || existing.email,
      roleId: roleId || existing.roleId,
      unitId: unitId !== undefined ? (unitId ? parseInt(unitId) : null) : existing.unitId,
    },
    include: { role: true, unit: true },
  });

  res.json({
    success: true,
    message: 'Pengguna berhasil diperbarui.',
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role.name,
      unit: updated.unit ? { id: updated.unit.id, name: updated.unit.name } : null,
    },
  });
});

// PATCH /api/users/:id/toggle-active
export const toggleUserActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  if (req.user?.id === id) {
    throw createError('Anda tidak dapat menonaktifkan akun sendiri.', 400);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw createError('Pengguna tidak ditemukan.', 404);

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  res.json({
    success: true,
    message: `Pengguna berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
    data: { id: updated.id, isActive: updated.isActive },
  });
});

// PATCH /api/users/:id/reset-password
export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    throw createError('Password baru minimal 8 karakter.', 400);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw createError('Pengguna tidak ditemukan.', 404);

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hash },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: id,
      note: `Password pengguna ${existing.email} direset`,
    },
  });

  res.json({ success: true, message: 'Password berhasil direset.' });
});
