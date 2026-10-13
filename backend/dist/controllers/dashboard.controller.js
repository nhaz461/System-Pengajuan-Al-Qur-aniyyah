"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/dashboard/summary
exports.getDashboardSummary = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const [units, activities, fiscalYears, users, activeSsh, submissionAgg, totalPengajuan, statusGroup, allUnits, recentSubmissions,] = await Promise.all([
        prisma_1.default.unit.count({ where: { isActive: true } }),
        prisma_1.default.activity.count({ where: { isActive: true } }),
        prisma_1.default.fiscalYear.count(),
        prisma_1.default.user.count({ where: { isActive: true } }),
        prisma_1.default.sshVersion.findFirst({ where: { isActive: true } }),
        prisma_1.default.submission.aggregate({
            _sum: {
                totalParsing: true,
                totalReviewed: true,
                totalApproved: true,
                totalDisbursed: true,
                totalRealized: true,
            },
        }),
        prisma_1.default.submission.count(),
        prisma_1.default.submission.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { totalParsing: true, totalApproved: true, totalRealized: true },
        }),
        prisma_1.default.unit.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                code: true,
                submissions: {
                    select: {
                        id: true,
                        totalParsing: true,
                        totalApproved: true,
                        totalDisbursed: true,
                        totalRealized: true,
                        status: true,
                    },
                },
            },
        }),
        prisma_1.default.submission.findMany({
            take: 6,
            orderBy: { submittedAt: 'desc' },
            include: {
                unit: { select: { id: true, name: true, code: true } },
                activity: { select: { id: true, name: true } },
                fiscalYear: { select: { id: true, year: true } },
            },
        }),
    ]);
    const activeFiscalYear = await prisma_1.default.fiscalYear.findFirst({
        where: { isActive: true },
    });
    const totalAnggaran = submissionAgg._sum.totalParsing || 0;
    const totalApproved = submissionAgg._sum.totalApproved || 0;
    const totalPencairan = submissionAgg._sum.totalDisbursed || 0;
    const totalRealisasi = submissionAgg._sum.totalRealized || 0;
    const totalSisa = Math.max(0, totalPencairan - totalRealisasi);
    // Status map
    const statusMap = {};
    statusGroup.forEach((g) => {
        statusMap[g.status] = g._count.id;
    });
    // Unit breakdown
    const unitBreakdown = allUnits.map((u) => {
        const subCount = u.submissions.length;
        const ang = u.submissions.reduce((acc, s) => acc + s.totalParsing, 0);
        const app = u.submissions.reduce((acc, s) => acc + (s.totalApproved || 0), 0);
        const dis = u.submissions.reduce((acc, s) => acc + (s.totalDisbursed || 0), 0);
        const rea = u.submissions.reduce((acc, s) => acc + (s.totalRealized || 0), 0);
        return {
            id: u.id,
            name: u.name,
            code: u.code,
            submissionCount: subCount,
            totalAnggaran: ang,
            totalApproved: app,
            totalDisbursed: dis,
            totalRealized: rea,
            sisaKas: Math.max(0, dis - rea),
            persentasePenyerapan: app > 0 ? Math.round((rea / app) * 100) : 0,
        };
    });
    res.json({
        success: true,
        data: {
            units,
            activities,
            fiscalYears,
            users,
            activeFiscalYear: activeFiscalYear?.year || 2026,
            sshVersion: activeSsh?.version || null,
            sshItemsCount: activeSsh?.totalItems || 0,
            totalPengajuan,
            totalAnggaran,
            totalApproved,
            totalPencairan,
            totalRealisasi,
            totalSisa,
            statusBreakdown: {
                menungguReview: statusMap['MENUNGGU_REVIEW'] || 0,
                dalamReview: statusMap['DALAM_REVIEW'] || 0,
                menungguApproval: statusMap['MENUNGGU_APPROVAL'] || 0,
                disetujui: statusMap['DISETUJUI'] || 0,
                dicairkan: statusMap['DICAIRKAN'] || 0,
                menungguLpj: statusMap['MENUNGGU_VERIFIKASI_LPJ'] || 0,
                selesai: statusMap['SELESAI'] || 0,
                ditolak: statusMap['DITOLAK'] || 0,
                perluRevisi: statusMap['PERLU_REVISI'] || 0,
            },
            unitBreakdown,
            recentSubmissions: recentSubmissions.map((s) => ({
                id: s.id,
                submissionNumber: s.submissionNumber,
                unit: s.unit.name,
                activity: s.activity.name,
                title: s.title,
                total: s.totalApproved || s.totalParsing,
                status: s.status,
                submittedAt: s.submittedAt,
            })),
        },
    });
});
//# sourceMappingURL=dashboard.controller.js.map