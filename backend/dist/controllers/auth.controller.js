"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
// POST /api/auth/login
exports.login = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw (0, error_middleware_1.createError)('Email dan password wajib diisi.', 400);
    }
    const user = await prisma_1.default.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { role: true, unit: true },
    });
    if (!user || !user.isActive) {
        throw (0, error_middleware_1.createError)('Email atau password tidak valid.', 401);
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isMatch) {
        throw (0, error_middleware_1.createError)('Email atau password tidak valid.', 401);
    }
    const secret = process.env.JWT_SECRET || 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        unitId: user.unitId,
    }, secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') });
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
exports.getMe = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: req.user.id },
        include: { role: true, unit: true },
    });
    if (!user)
        throw (0, error_middleware_1.createError)('Pengguna tidak ditemukan.', 404);
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
exports.changePassword = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw (0, error_middleware_1.createError)('Password lama dan password baru wajib diisi.', 400);
    }
    if (newPassword.length < 8) {
        throw (0, error_middleware_1.createError)('Password baru minimal 8 karakter.', 400);
    }
    const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
    if (!user)
        throw (0, error_middleware_1.createError)('Pengguna tidak ditemukan.', 404);
    const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        throw (0, error_middleware_1.createError)('Password lama tidak sesuai.', 400);
    }
    const hash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
    });
    res.json({
        success: true,
        message: 'Password berhasil diubah.',
    });
});
//# sourceMappingURL=auth.controller.js.map