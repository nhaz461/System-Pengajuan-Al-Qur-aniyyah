"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
}
if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
}
// Singleton instance untuk mencegah multiple connections
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
globalForPrisma.prisma = prisma;
exports.default = prisma;
//# sourceMappingURL=prisma.js.map