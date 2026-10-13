const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking current SSH status ---');
  const vCount = await prisma.sshVersion.count();
  const iCount = await prisma.sshItem.count();
  const subItemsWithSsh = await prisma.submissionItem.count({
    where: { sshItemId: { not: null } }
  });
  console.log(`Current: ${vCount} SSH versions, ${iCount} SSH items, ${subItemsWithSsh} linked submission items.`);

  console.log('\n--- Unlinking submission items from SSH items ---');
  const unlinked = await prisma.submissionItem.updateMany({
    where: {
      OR: [
        { sshItemId: { not: null } },
        { sshPrice: { not: null } }
      ]
    },
    data: {
      sshItemId: null,
      sshPrice: null,
      sshStatus: 'BELUM_REVIEW'
    }
  });
  console.log(`Unlinked ${unlinked.count} submission items.`);

  console.log('\n--- Deleting all SSH items ---');
  const deletedItems = await prisma.sshItem.deleteMany({});
  console.log(`Deleted ${deletedItems.count} SSH items.`);

  console.log('\n--- Deleting all SSH versions ---');
  const deletedVersions = await prisma.sshVersion.deleteMany({});
  console.log(`Deleted ${deletedVersions.count} SSH versions.`);

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'CLEAR_SSH_DATABASE',
      entity: 'SshVersion',
      note: 'Database Master SSH berhasil dikosongkan untuk input ulang data resmi.'
    }
  });

  console.log('\n[SUCCESS] Database SSH berhasil dikosongkan!');
}

main()
  .catch((err) => {
    console.error('[ERROR] Gagal mengosongkan database SSH:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
