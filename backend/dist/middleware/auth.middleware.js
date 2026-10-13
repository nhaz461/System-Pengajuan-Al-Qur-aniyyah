"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_middleware_1 = require("./error.middleware");
const authenticate = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw (0, error_middleware_1.createError)('Token autentikasi tidak ditemukan. Silakan login kembali.', 401);
        }
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next((0, error_middleware_1.createError)('Token tidak valid. Silakan login kembali.', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next((0, error_middleware_1.createError)('Sesi Anda telah berakhir. Silakan login kembali.', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next((0, error_middleware_1.createError)('Autentikasi diperlukan.', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next((0, error_middleware_1.createError)('Anda tidak memiliki hak akses untuk melakukan tindakan ini.', 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map