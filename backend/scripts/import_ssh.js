const { parseSshExcel } = require('../dist/services/ssh-parser.service.js');
const prisma = require('../dist/lib/prisma.js').default;
const path = require('path');

async function importMasterSsh() {
  console.log('📦 Mengimpor Master SSH ke Supabase PostgreSQL...');
  
  const admin = await prisma.user.findFirst({ where: { email: 'admin@alquraniyyah.sch.id' } });
  if (!admin) {
    console.error('❌ Akun admin belum ditemukan di database.');
    return;
  }

  const filePath = path.resolve(__dirname, '../../Master_SSH_Yayasan_2026_FINAL.xlsx');
  const result = await parseSshExcel(filePath);

  console.log(`✓ Terbaca sheet "${result.sheetName}" dengan ${result.totalItems} item.`);

  // Set existing version to inactive
  await prisma.sshVersion.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Create new active version
  const version = await prisma.sshVersion.create({
    data: {
      version: 'v1.0-FINAL',
      filename: 'Master_SSH_Yayasan_2026_FINAL.xlsx',
      totalItems: result.totalItems,
      isActive: true,
      importedById: admin.id,
      notes: `Master SSH 2026 Resmi Yayasan Al-Qur'aniyyah (Sheet: ${result.sheetName})`,
    },
  });

  // Insert items
  const itemsData = result.items.map((item, idx) => ({
    sshVersionId: version.id,
    kategori: item.kategori,
    kode: item.kode || `SSH-${String(idx + 1).padStart(3, '0')}`,
    uraian: item.uraian,
    satuan: item.satuan,
    hargaSsh: item.hargaSsh,
    keterangan: item.keterangan || null,
  }));

  await prisma.sshItem.createMany({
    data: itemsData,
  });

  console.log(`✅ Berhasil menyimpan ${itemsData.length} item Master SSH ke Supabase!`);
}

importMasterSsh()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
