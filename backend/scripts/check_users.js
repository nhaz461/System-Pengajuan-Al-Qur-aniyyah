const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ include: { role: true } });
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(u.id, u.email, '=>', u.name, `(${u.role ? u.role.name : 'NO_ROLE'})`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
