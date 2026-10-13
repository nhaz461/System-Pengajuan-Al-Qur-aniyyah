import { Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

// GET /api/fiscal-years
export const getFiscalYears = asyncHandler(async (_req: Request, res: Response) => {
  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { year: 'desc' },
  });
  res.json({ success: true, data: fiscalYears });
});

// GET /api/fiscal-years/active
export const getActiveFiscalYear = asyncHandler(async (_req: Request, res: Response) => {
  const fiscalYear = await prisma.fiscalYear.findFirst({
    where: { isActive: true },
  });
  if (!fiscalYear) {
    res.json({ success: true, data: null, message: 'Tidak ada tahun anggaran aktif.' });
    return;
  }
  res.json({ success: true, data: fiscalYear });
});

// POST /api/fiscal-years
export const createFiscalYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year, notes } = req.body;
  const yearNum = parseInt(year);

  if (!year || isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
    throw createError('Tahun tidak valid. Masukkan tahun antara 2020 dan 2100.', 400);
  }

  const existing = await prisma.fiscalYear.findUnique({ where: { year: yearNum } });
  if (existing) throw createError(`Tahun anggaran ${yearNum} sudah ada.`, 409);

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      year: yearNum,
      notes: notes?.trim() || null,
      isActive: false,
    },
  });

  res.status(201).json({ success: true, message: 'Tahun anggaran berhasil dibuat.', data: fiscalYear });
});

// PATCH /api/fiscal-years/:id/set-active
export const setActiveFiscalYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { id } });
  if (!fiscalYear) throw createError('Tahun anggaran tidak ditemukan.', 404);

  // Nonaktifkan semua tahun anggaran lain
  await prisma.fiscalYear.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const updated = await prisma.fiscalYear.update({
    where: { id },
    data: { isActive: true },
  });

  await prisma.auditLog.create({
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
export const updateFiscalYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { notes } = req.body;

  const existing = await prisma.fiscalYear.findUnique({ where: { id } });
  if (!existing) throw createError('Tahun anggaran tidak ditemukan.', 404);

  const updated = await prisma.fiscalYear.update({
    where: { id },
    data: { notes: notes !== undefined ? notes?.trim() || null : existing.notes },
  });

  res.json({ success: true, message: 'Tahun anggaran berhasil diperbarui.', data: updated });
});

// DELETE /api/fiscal-years/:id
export const deleteFiscalYear = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.fiscalYear.findUnique({ where: { id } });
  if (!existing) throw createError('Tahun anggaran tidak ditemukan.', 404);

  if (existing.isActive) {
    throw createError('Tahun anggaran aktif tidak dapat dihapus. Nonaktifkan terlebih dahulu.', 409);
  }

  await prisma.fiscalYear.delete({ where: { id } });
  res.json({ success: true, message: 'Tahun anggaran berhasil dihapus.' });
});
