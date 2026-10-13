import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

// POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email dan password wajib diisi.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true, unit: true },
  });

  if (!user || !user.isActive) {
    throw createError('Email atau password tidak valid.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createError('Email atau password tidak valid.', 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw createError('Konfigurasi server tidak lengkap.', 500);

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      unitId: user.unitId,
    },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any }
  );

  res.json({
    success: true,
    message: 'Login berhasil.',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        unit: user.unit ? { id: user.unit.id, name: user.unit.name, code: user.unit.code } : null,
      },
    },
  });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { role: true, unit: true },
  });

  if (!user) throw createError('Pengguna tidak ditemukan.', 404);

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      unit: user.unit ? { id: user.unit.id, name: user.unit.name, code: user.unit.code } : null,
      isActive: user.isActive,
    },
  });
});

// POST /api/auth/change-password
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError('Password lama dan password baru wajib diisi.', 400);
  }

  if (newPassword.length < 8) {
    throw createError('Password baru minimal 8 karakter.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw createError('Pengguna tidak ditemukan.', 404);

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw createError('Password lama tidak sesuai.', 400);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  });

  res.json({
    success: true,
    message: 'Password berhasil diubah.',
  });
});
