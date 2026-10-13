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
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Token autentikasi tidak ditemukan. Silakan login kembali.', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw createError('Konfigurasi server tidak lengkap.', 500);
    }

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      name: string;
      role: string;
      unitId?: number;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Token tidak valid. Silakan login kembali.', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Sesi Anda telah berakhir. Silakan login kembali.', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Autentikasi diperlukan.', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(createError('Anda tidak memiliki hak akses untuk melakukan tindakan ini.', 403));
      return;
    }
    next();
  };
};
