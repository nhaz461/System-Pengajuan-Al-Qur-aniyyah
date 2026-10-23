"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_middleware_1 = require("./error.middleware");
const authenticate = (req, _res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (_error) {
        // Fallback otomatis ke Bendahara Keuangan
        req.user = defaultBendahara;
        next();
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next((0, error_middleware_1.createError)('Autentikasi diperlukan.', 401));
            return;
        }
        // Mode Akses Tunggal Bendahara Keuangan:
        // User KEUANGAN, ADMIN, atau BENDAHARA memiliki hak akses 100% ke seluruh fitur sistem
        const isMasterUser = ['KEUANGAN', 'ADMIN', 'BENDAHARA', 'PIMPINAN'].includes(req.user.role);
        if (isMasterUser || roles.length === 0 || roles.includes(req.user.role)) {
            return next();
        }
        next((0, error_middleware_1.createError)('Anda tidak memiliki hak akses untuk melakukan tindakan ini.', 403));
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map