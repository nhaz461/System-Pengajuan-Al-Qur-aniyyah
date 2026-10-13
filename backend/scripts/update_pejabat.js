const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePejabat() {
  const pimpinan = await prisma.user.update({
    where: { email: 'pimpinan@alquraniyyah.sch.id' },
    data: { name: 'Dr. KH. Muhammad Sobron Zayya, SQ., MA' }
  });
  console.log('✅ Pimpinan diupdate:', pimpinan.name);

  const keuangan = await prisma.user.update({
    where: { email: 'keuangan@alquraniyyah.sch.id' },
    data: { name: 'Nasrullah, S.Pd' }
  });
  console.log('✅ Bendahara diupdate:', keuangan.name);
}

updatePejabat()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
