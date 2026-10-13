const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE submissions ADD COLUMN activity_date DATETIME');
    console.log('SUCCESS: Column activity_date added to submissions');
  } catch (e) {
    console.log('NOTICE:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
