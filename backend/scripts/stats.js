const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function countAll() {
  const users = await prisma.user.count();
  const units = await prisma.unit.count();
  const activities = await prisma.activity.count();
  const fiscalYears = await prisma.fiscalYear.count();
  const sshVersions = await prisma.sshVersion.count();
  const sshItems = await prisma.sshItem.count();
  const submissions = await prisma.submission.count();
  const subItems = await prisma.submissionItem.count();
  const disbursements = await prisma.disbursement.count();
  const lpjItems = await prisma.lpjItem.count();

  console.log(JSON.stringify({ users, units, activities, fiscalYears, sshVersions, sshItems, submissions, subItems, disbursements, lpjItems }, null, 2));
}
countAll().catch(console.error).finally(() => prisma.$disconnect());
