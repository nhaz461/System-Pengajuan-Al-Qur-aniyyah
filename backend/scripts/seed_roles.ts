import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addTestUsers() {
  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  const smpit = await prisma.unit.findUnique({ where: { code: 'SMPIT' } });

  const pimpinanPass = await bcrypt.hash('Pimpinan@2026', 12);
  const keuanganPass = await bcrypt.hash('Keuangan@2026', 12);
  const unitPass = await bcrypt.hash('Unit@2026', 12);

  await prisma.user.upsert({
    where: { email: 'pimpinan@alquraniyyah.sch.id' },
    update: {
      name: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
    },
    create: {
      name: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA',
      email: 'pimpinan@alquraniyyah.sch.id',
      passwordHash: pimpinanPass,
      roleId: roleMap['PIMPINAN'],
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { email: 'keuangan@alquraniyyah.sch.id' },
    update: {
      name: 'Nasrullah, S.Pd',
    },
    create: {
      name: 'Nasrullah, S.Pd',
      email: 'keuangan@alquraniyyah.sch.id',
      passwordHash: keuanganPass,
      roleId: roleMap['KEUANGAN'],
      isActive: true
    }
  });

  if (smpit) {
    await prisma.user.upsert({
      where: { email: 'smpit@alquraniyyah.sch.id' },
      update: {},
      create: {
        name: 'Ustadz Ridwan (Tata Usaha SMP IT)',
        email: 'smpit@alquraniyyah.sch.id',
        passwordHash: unitPass,
        roleId: roleMap['UNIT'],
        unitId: smpit.id,
        isActive: true
      }
    });
  }

  console.log('✅ Akun Pimpinan, Keuangan, dan Unit berhasil ditambahkan/diverifikasi.');
}

addTestUsers().finally(() => prisma.$disconnect());
