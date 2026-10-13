/**
 * Seed Database - Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah
 * 
 * Data awal yang diperlukan:
 * - Roles: ADMIN, UNIT, KEUANGAN, PIMPINAN
 * - Units: TK IT, SD IT, SMP IT, SMA IT, TPA/TPQ, LPBQ, HALQ
 * - Activities: Ujian, Kegiatan Tahunan, PPDB/SPSB, Operasional, Pembangunan, Kegiatan Yayasan
 * - Fiscal Year: 2026 (aktif)
 * - Admin user default
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seed database...\n');

  // ─── Roles ────────────────────────────────────────────────
  console.log('📋 Membuat roles...');
  const roleNames = ['ADMIN', 'UNIT', 'KEUANGAN', 'PIMPINAN'];
  const roles: Record<string, any> = {};

  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles[name] = role;
    console.log(`   ✓ Role: ${name}`);
  }

  // ─── Units ────────────────────────────────────────────────
  console.log('\n🏫 Membuat master unit...');
  const unitData = [
    { name: 'TK IT Al-Qur\'aniyyah', code: 'TKIT' },
    { name: 'SD IT Al-Qur\'aniyyah', code: 'SDIT' },
    { name: 'SMP IT Al-Qur\'aniyyah', code: 'SMPIT' },
    { name: 'SMA IT Al-Qur\'aniyyah', code: 'SMAIT' },
    { name: 'TPA/TPQ', code: 'TPQ' },
    { name: 'LPBQ', code: 'LPBQ' },
    { name: 'HALQ', code: 'HALQ' },
  ];

  const units: Record<string, any> = {};
  for (const u of unitData) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name },
      create: { name: u.name, code: u.code, isActive: true },
    });
    units[u.code] = unit;
    console.log(`   ✓ Unit: ${u.name} (${u.code})`);
  }

  // ─── Activities ───────────────────────────────────────────
  console.log('\n📅 Membuat master kegiatan...');
  const activityData = [
    { name: 'Ujian', description: 'Kegiatan ujian semester, mid, dan ujian lainnya' },
    { name: 'Kegiatan Tahunan', description: 'Kegiatan rutin tahunan unit' },
    { name: 'PPDB/SPSB', description: 'Penerimaan Peserta Didik Baru / Seleksi Penerimaan Santri Baru' },
    { name: 'Operasional', description: 'Kebutuhan operasional rutin unit' },
    { name: 'Pembangunan', description: 'Kegiatan pembangunan dan renovasi' },
    { name: 'Kegiatan Yayasan', description: 'Kegiatan yang diselenggarakan oleh yayasan' },
  ];

  for (const a of activityData) {
    const existing = await prisma.activity.findFirst({ where: { name: a.name } });
    if (!existing) {
      await prisma.activity.create({
        data: { name: a.name, description: a.description, isActive: true },
      });
    }
    console.log(`   ✓ Kegiatan: ${a.name}`);
  }

  // ─── Fiscal Year ─────────────────────────────────────────
  console.log('\n📆 Membuat tahun anggaran 2026...');
  await prisma.fiscalYear.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      isActive: true,
      notes: 'Tahun Anggaran Aktif - Yayasan Al-Qur\'aniyyah',
    },
  });
  console.log('   ✓ Tahun Anggaran: 2026 (aktif)');

  // ─── Admin User ───────────────────────────────────────────
  console.log('\n👤 Membuat akun admin default...');
  const adminPassword = 'Admin@2026';
  const hash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@alquraniyyah.sch.id' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@alquraniyyah.sch.id',
      passwordHash: hash,
      roleId: roles['ADMIN'].id,
      isActive: true,
    },
  });
  console.log(`   ✓ Admin: ${admin.email}`);
  console.log(`   🔑 Password: ${adminPassword}`);

  const pimpinanPass = await bcrypt.hash('Pimpinan@2026', 12);
  const pimpinan = await prisma.user.upsert({
    where: { email: 'pimpinan@alquraniyyah.sch.id' },
    update: { name: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA' },
    create: {
      name: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
      email: 'pimpinan@alquraniyyah.sch.id',
      passwordHash: pimpinanPass,
      roleId: roles['PIMPINAN'].id,
      isActive: true,
    },
  });
  console.log(`   ✓ Ketua Umum: ${pimpinan.name} (${pimpinan.email})`);

  const keuanganPass = await bcrypt.hash('Keuangan@2026', 12);
  const keuangan = await prisma.user.upsert({
    where: { email: 'keuangan@alquraniyyah.sch.id' },
    update: { name: 'Nasrullah, S.Pd' },
    create: {
      name: 'Nasrullah, S.Pd',
      email: 'keuangan@alquraniyyah.sch.id',
      passwordHash: keuanganPass,
      roleId: roles['KEUANGAN'].id,
      isActive: true,
    },
  });
  console.log(`   ✓ Bendahara Umum: ${keuangan.name} (${keuangan.email})`);

  const smpitUnit = units['SMPIT'];
  if (smpitUnit) {
    const unitPass = await bcrypt.hash('Unit@2026', 12);
    const unitUser = await prisma.user.upsert({
      where: { email: 'smpit@alquraniyyah.sch.id' },
      update: {},
      create: {
        name: 'Ustadz Ridwan (Tata Usaha SMP IT)',
        email: 'smpit@alquraniyyah.sch.id',
        passwordHash: unitPass,
        roleId: roles['UNIT'].id,
        unitId: smpitUnit.id,
        isActive: true,
      },
    });
    console.log(`   ✓ Unit TU: ${unitUser.name} (${unitUser.email})`);
  }

  // ─── Audit Log ────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED',
      entity: 'System',
      note: 'Database di-seed dengan akun pejabat resmi dan master data',
    },
  });

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   ✅ Seed database berhasil!                        ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║   Akun Terdaftar:                                  ║');
  console.log('║   • Admin:      admin@alquraniyyah.sch.id          ║');
  console.log('║   • Ketua Umum: pimpinan@alquraniyyah.sch.id       ║');
  console.log('║   • Bendahara:  keuangan@alquraniyyah.sch.id       ║');
  console.log('║   • Unit:       smpit@alquraniyyah.sch.id          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
