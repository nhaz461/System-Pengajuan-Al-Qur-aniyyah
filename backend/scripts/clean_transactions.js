/**
 * Script Pembersih Data Transaksi (Clean Transactions)
 * 
 * Menghapus:
 * - Seluruh Pengajuan Anggaran (Submissions)
 * - Seluruh Item Belanja (SubmissionItems)
 * - Seluruh Catatan Review Keuangan (SubmissionReviews)
 * - Seluruh Disposisi & Approval
 * - Seluruh Pencairan Kas/Bank (Disbursements)
 * - Seluruh Realisasi & Bukti LPJ (LpjItems)
 * - File lampiran Excel di folder uploads/
 * 
 * TETAP MEMPERTAHANKAN:
 * - Master Unit (TKIT, SDIT, SMPIT, SMAIT, dll.)
 * - Master Kegiatan (Ujian, PPDB, Operasional, dll.)
 * - Tahun Anggaran (2026)
 * - Master SSH 2026 (SshVersions & SshItems)
 * - Akun Pengguna & Pejabat (Admin, Ketua Umum, Bendahara Umum, Unit)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanTransactions() {
  console.log('🧹 Memulai pembersihan data transaksi...\n');

  // 1. Hapus transaksi dari tabel child ke parent
  const deletedLpj = await prisma.lpjItem.deleteMany({});
  console.log(`   ✓ Menghapus ${deletedLpj.count} item LPJ/Realisasi`);

  const deletedDisb = await prisma.disbursement.deleteMany({});
  console.log(`   ✓ Menghapus ${deletedDisb.count} riwayat Pencairan Dana`);

  const deletedRev = await prisma.submissionReview.deleteMany({});
  console.log(`   ✓ Menghapus ${deletedRev.count} riwayat Review Keuangan & Disposisi`);

  const deletedItems = await prisma.submissionItem.deleteMany({});
  console.log(`   ✓ Menghapus ${deletedItems.count} rincian item Belanja Pengajuan`);

  const deletedSubs = await prisma.submission.deleteMany({});
  console.log(`   ✓ Menghapus ${deletedSubs.count} berkas Pengajuan Unit`);

  // 2. Bersihkan file di folder uploads (jika ada)
  const uploadDirs = [
    path.resolve(__dirname, '../../uploads/pengajuan'),
    path.resolve(__dirname, '../../uploads/kuitansi'),
    path.resolve(__dirname, '../../uploads/lpj_nota'),
    path.resolve(__dirname, '../../uploads/temp'),
  ];

  let cleanedFilesCount = 0;
  for (const dir of uploadDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(dir, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            cleanedFilesCount++;
          }
        } catch (_) {}
      }
    }
  }
  console.log(`   ✓ Membersihkan ${cleanedFilesCount} file lampiran di folder uploads/`);

  // 3. Catat ke AuditLog
  await prisma.auditLog.create({
    data: {
      action: 'CLEAN_TRANSACTIONS',
      entity: 'System',
      note: 'Seluruh data transaksi pengujian berhasil dikosongkan. Master data & akun pengguna tetap aman.',
    },
  });

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   ✅ DATABASE BERHASIL DIKOSONGKAN (BERSIH)        ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║   • Master Unit, Kegiatan, & SSH 2026: AMAN        ║');
  console.log('║   • Akun Pejabat (Ketua Umum, Bendahara): AMAN     ║');
  console.log('║   • Seluruh Data Transaksi: 0 (Siap Pakai Riil)    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

cleanTransactions()
  .catch((err) => {
    console.error('❌ Gagal membersihkan transaksi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
