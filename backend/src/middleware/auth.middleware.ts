import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './error.middleware';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    unitId?: number;
  };
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const defaultBendahara = {
    id: 2,
    email: 'keuangan@alquraniyyah.sch.id',
    name: 'Nasrullah, S.Pd',
    role: 'KEUANGAN',
  };

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Mode Akses Bebas Tanpa Login: Otomatis masuk sebagai Bendahara Keuangan
    req.user = defaultBendahara;
    return next();
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';

  try {
    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      name: string;
      role: string;
      unitId?: number;
    };
    req.user = decoded;
    next();
  } catch (_error) {
    // Fallback otomatis ke Bendahara Keuangan
    req.user = defaultBendahara;
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Autentikasi diperlukan.', 401));
      return;
    }
    // Mode Akses Tunggal Bendahara Keuangan:
    // User KEUANGAN, ADMIN, atau BENDAHARA memiliki hak akses 100% ke seluruh fitur sistem
    const isMasterUser = ['KEUANGAN', 'ADMIN', 'BENDAHARA', 'PIMPINAN'].includes(req.user.role);
    if (isMasterUser || roles.length === 0 || roles.includes(req.user.role)) {
      return next();
    }
    next(createError('Anda tidak memiliki hak akses untuk melakukan tindakan ini.', 403));
  };
};
