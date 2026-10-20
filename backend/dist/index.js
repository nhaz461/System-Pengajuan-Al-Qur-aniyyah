"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = require("dotenv");
const envPath = path_1.default.resolve(__dirname, '../.env');
if (fs_1.default.existsSync(envPath)) {
    (0, dotenv_1.config)({ path: envPath });
}
else {
    (0, dotenv_1.config)();
}
const defaultDbPath = path_1.default.resolve(__dirname, '../prisma/alquraniyyah.db').replace(/\\/g, '/');
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `file:${defaultDbPath}`;
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
}
const prisma_1 = __importDefault(require("./lib/prisma"));
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const units_routes_1 = __importDefault(require("./routes/units.routes"));
const activities_routes_1 = __importDefault(require("./routes/activities.routes"));
const fiscal_years_routes_1 = __importDefault(require("./routes/fiscal-years.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const ssh_routes_1 = __importDefault(require("./routes/ssh.routes"));
const submissions_routes_1 = __importDefault(require("./routes/submissions.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '5000', 10);
// ─── Security Middleware ──────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// ─── CORS - Izinkan akses dari LAN ────────────────────────────
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Izinkan semua origin (localhost dan LAN)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ─── Body Parser ──────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ─── Logger ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// ─── Static Files ─────────────────────────────────────────────
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../../uploads')));
// ─── Health Check & Live Diagnostics ────────────────────────
app.get(['/health', '/api/health', '/api/system/diagnostics'], async (_req, res) => {
    let dbStatus = 'disconnected';
    let userCount = 0;
    let dbLatencyMs = 0;
    const startTime = Date.now();
    try {
        userCount = await prisma_1.default.user.count();
        dbStatus = 'connected';
        dbLatencyMs = Date.now() - startTime;
    }
    catch (error) {
        dbStatus = 'error: ' + (error.message ? error.message.slice(0, 80) : 'connection failed');
    }
    const isHealthy = dbStatus === 'connected';
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'OK' : 'DEGRADED',
        app: 'Sistem Administrasi Keuangan Yayasan Al-Qur\'aniyyah',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        phase: 'PHASE 4',
        diagnostics: {
            backend: 'online',
            database: dbStatus === 'connected' ? 'connected' : 'error',
            databaseLatency: `${dbLatencyMs}ms`,
            authService: dbStatus === 'connected' ? 'ready' : 'unavailable',
            totalUsersConfigured: userCount,
            environment: process.env.NODE_ENV || 'production',
            platform: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Standalone',
            lastChecked: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        },
    });
});
const approval_routes_1 = __importDefault(require("./routes/approval.routes"));
const disbursement_routes_1 = __importDefault(require("./routes/disbursement.routes"));
const lpj_routes_1 = __importDefault(require("./routes/lpj.routes"));
const backup_routes_1 = __importDefault(require("./routes/backup.routes"));
// ─── Routes (Dukung akses dengan atau tanpa prefix /api) ───────────
app.use(['/api/auth', '/auth'], auth_routes_1.default);
app.use(['/api/units', '/units'], units_routes_1.default);
app.use(['/api/activities', '/activities'], activities_routes_1.default);
app.use(['/api/fiscal-years', '/fiscal-years'], fiscal_years_routes_1.default);
app.use(['/api/users', '/users'], users_routes_1.default);
app.use(['/api/dashboard', '/dashboard'], dashboard_routes_1.default);
app.use(['/api/ssh', '/ssh'], ssh_routes_1.default);
app.use(['/api/submissions', '/submissions'], submissions_routes_1.default);
app.use(['/api/reviews', '/reviews'], review_routes_1.default);
app.use(['/api/approvals', '/approvals'], approval_routes_1.default);
app.use(['/api/disbursements', '/disbursements'], disbursement_routes_1.default);
app.use(['/api/lpj', '/lpj'], lpj_routes_1.default);
app.use(['/api/backups', '/backups'], backup_routes_1.default);
// ─── Frontend Static SPA ──────────────────────────────────────
const frontendCandidates = [
    path_1.default.resolve(__dirname, '../../frontend/dist'),
    path_1.default.resolve(__dirname, '../frontend/dist'),
    path_1.default.resolve(process.cwd(), 'frontend/dist'),
    path_1.default.resolve(process.cwd(), '../frontend/dist'),
];
let frontendDistPath = null;
for (const p of frontendCandidates) {
    if (fs_1.default.existsSync(p) && fs_1.default.existsSync(path_1.default.join(p, 'index.html'))) {
        frontendDistPath = p;
        break;
    }
}
if (frontendDistPath) {
    app.use(express_1.default.static(frontendDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/auth')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
    });
}
// ─── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan.',
    });
});
// ─── Error Handler ────────────────────────────────────────────
app.use(error_middleware_1.errorHandler);
// ─── Start Server (hanya saat standalone, bukan saat di Vercel serverless) ──────────
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║   Sistem Administrasi Keuangan                     ║');
        console.log('║   Yayasan Pendidikan Islam Al-Qur\'aniyyah          ║');
        console.log('║   Version 1.0.0 - Phase 4                          ║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log(`\n🚀 Server berjalan:`);
        console.log(`   Local:    http://localhost:${PORT}`);
        console.log(`   LAN:      http://<IP-SERVER>:${PORT}`);
        console.log(`   API:      http://localhost:${PORT}/api`);
        console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
    });
}
exports.default = app;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
    module.exports.default = app;
}
//# sourceMappingURL=index.js.map