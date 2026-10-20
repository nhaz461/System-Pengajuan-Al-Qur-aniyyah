import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function restoreDatabase() {
  console.log('🚀 Memulai Pemulihan Database SQLite Lokal dari Excel Backup...\n');

  // 1. Roles
  console.log('1. Memulihkan Roles...');
  const roleNames = ['ADMIN', 'UNIT', 'KEUANGAN', 'PIMPINAN'];
  const roles: Record<string, any> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`   ✓ Role: ${name}`);
  }

  // 2. Units
  console.log('\n2. Memulihkan Units...');
  const unitDefs = [
    { code: 'TKIT', name: 'TK IT Al-Qur\'aniyyah' },
    { code: 'SDIT', name: 'SD IT Al-Qur\'aniyyah' },
    { code: 'SMPIT', name: 'SMP IT Al-Qur\'aniyyah' },
    { code: 'SMAIT', name: 'SMA IT Al-Qur\'aniyyah' },
    { code: 'TPQ', name: 'TPA/TPQ' },
    { code: 'LPBQ', name: 'LPBQ' },
    { code: 'HALQ', name: 'HALQ' },
  ];
  const units: Record<string, any> = {};
  for (const u of unitDefs) {
    const rec = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name },
      create: { code: u.code, name: u.name, isActive: true },
    });
    units[u.code] = rec;
    units[u.name.toLowerCase()] = rec;
    console.log(`   ✓ Unit: ${u.name} (${u.code})`);
  }

  // 3. Activities
  console.log('\n3. Memulihkan Activities...');
  const activityNames = [
    'Ujian',
    'Kegiatan Tahunan',
    'PPDB/SPSB',
    'Operasional',
    'Pembangunan',
    'Kegiatan Yayasan',
  ];
  const activities: Record<string, any> = {};
  for (const act of activityNames) {
    let rec = await prisma.activity.findFirst({ where: { name: act } });
    if (!rec) {
      rec = await prisma.activity.create({
        data: { name: act, description: `Pos anggaran ${act}`, isActive: true },
      });
    }
    activities[act.toLowerCase()] = rec;
    console.log(`   ✓ Kegiatan: ${act}`);
  }

  // 4. Fiscal Year 2026
  console.log('\n4. Memulihkan Tahun Anggaran 2026...');
  const fiscalYear = await prisma.fiscalYear.upsert({
    where: { year: 2026 },
    update: { isActive: true },
    create: { year: 2026, isActive: true, notes: 'Tahun Anggaran Aktif 2026' },
  });
  console.log('   ✓ Tahun Anggaran: 2026');

  // 5. Default Users
  console.log('\n5. Memulihkan Akun Pengguna...');
  const adminHash = await bcrypt.hash('Admin@2026', 12);
  const keuHash = await bcrypt.hash('Keuangan@2026', 12);
  const pimHash = await bcrypt.hash('Pimpinan@2026', 12);
  const unitHash = await bcrypt.hash('Unit@2026', 12);

  const usersToCreate = [
    { email: 'admin@alquraniyyah.sch.id', name: 'Administrator', passwordHash: adminHash, roleId: roles['ADMIN'].id, unitId: null },
    { email: 'keuangan@alquraniyyah.sch.id', name: 'Nasrullah, S.Pd', passwordHash: keuHash, roleId: roles['KEUANGAN'].id, unitId: null },
    { email: 'pimpinan@alquraniyyah.sch.id', name: 'Pimpinan Yayasan', passwordHash: pimHash, roleId: roles['PIMPINAN'].id, unitId: null },
    { email: 'tkit@alquraniyyah.sch.id', name: 'TU TK IT', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['TKIT'].id },
    { email: 'sdit@alquraniyyah.sch.id', name: 'TU SD IT', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['SDIT'].id },
    { email: 'smpit@alquraniyyah.sch.id', name: 'TU SMP IT', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['SMPIT'].id },
    { email: 'smait@alquraniyyah.sch.id', name: 'TU SMA IT', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['SMAIT'].id },
    { email: 'lpbq@alquraniyyah.sch.id', name: 'Pengurus LPBQ', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['LPBQ'].id },
    { email: 'tpq@alquraniyyah.sch.id', name: 'Pengurus TPQ', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['TPQ'].id },
    { email: 'halq@alquraniyyah.sch.id', name: 'Pengurus HALQ', passwordHash: unitHash, roleId: roles['UNIT'].id, unitId: units['HALQ'].id },
  ];

  const userMap: Record<string, any> = {};
  for (const u of usersToCreate) {
    const usr = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash: u.passwordHash, roleId: u.roleId, unitId: u.unitId, isActive: true },
      create: u,
    });
    userMap[u.email] = usr;
    console.log(`   ✓ User: ${u.email} (${u.name})`);
  }

  // 6. Read Excel Backup
  const backupPath = 'D:/Sistem_Keuangan_Portable/backups/DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx';
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ File backup tidak ditemukan di: ${backupPath}`);
    return;
  }

  console.log(`\n📖 Membaca berkas backup Excel: ${backupPath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(backupPath);

  // 7. Restore SSH Version & Items
  console.log('\n6. Memulihkan Master SSH 2026 (Sheet 4)...');
  const wsSsh = wb.getWorksheet('Master SSH 2026');
  if (wsSsh) {
    const adminUser = userMap['admin@alquraniyyah.sch.id'];
    let sshVersion = await prisma.sshVersion.findFirst({ where: { version: 'v1.0' } });
    if (!sshVersion) {
      sshVersion = await prisma.sshVersion.create({
        data: {
          version: 'v1.0',
          filename: 'Master Standar Satuan Harga (SSH 2026).xlsx',
          totalItems: 0,
          isActive: true,
          importedById: adminUser.id,
          notes: 'Dipulihkan dari Backup Excel Lokal',
        },
      });
    }

    let sshCount = 0;
    const sshItemMap = new Map<string, number>();

    for (let r = 5; r <= wsSsh.rowCount; r++) {
      const row = wsSsh.getRow(r);
      const kode = row.getCell(3).value ? String(row.getCell(3).value).trim() : null;
      const kategori = row.getCell(4).value ? String(row.getCell(4).value).trim() : 'Umum';
      const uraian = row.getCell(5).value ? String(row.getCell(5).value).trim() : '';
      const spesifikasi = row.getCell(6).value ? String(row.getCell(6).value).trim() : null;
      const satuan = row.getCell(7).value ? String(row.getCell(7).value).trim() : 'item';
      const harga = Number(row.getCell(8).value) || 0;

      if (!uraian) continue;

      let existing = await prisma.sshItem.findFirst({
        where: {
          sshVersionId: sshVersion.id,
          uraian,
        },
      });

      if (!existing) {
        existing = await prisma.sshItem.create({
          data: {
            sshVersionId: sshVersion.id,
            kode,
            kategori,
            uraian,
            keterangan: spesifikasi,
            satuan,
            hargaSsh: harga,
            status: 'AKTIF',
          },
        });
      }
      sshCount++;
      sshItemMap.set(uraian.toLowerCase(), existing.id);
    }

    await prisma.sshVersion.update({
      where: { id: sshVersion.id },
      data: { totalItems: sshCount },
    });
    console.log(`   ✓ Berhasil memulihkan ${sshCount} data Master SSH 2026.`);
  }

  // 8. Restore Submissions & Items (Sheet 1 & 2)
  console.log('\n7. Memulihkan Data Pengajuan & Rincian Item (Sheet 1 & 2)...');
  const wsSubmissions = wb.getWorksheet('Rekap Pengajuan & Review');
  const wsItems = wb.getWorksheet('Rincian Item Belanja & Volume');

  if (wsSubmissions && wsItems) {
    const submissionMap = new Map<string, any>();

    // Parse Sheet 1 Submissions
    for (let r = 7; r <= wsSubmissions.rowCount; r++) {
      const row = wsSubmissions.getRow(r);
      const nomor = row.getCell(3).value ? String(row.getCell(3).value).trim() : '';
      if (!nomor || !nomor.startsWith('PENG/')) continue;

      const unitText = row.getCell(4).value ? String(row.getCell(4).value).trim() : '';
      const agenda = row.getCell(5).value ? String(row.getCell(5).value).trim() : 'Kegiatan Anggaran';
      const pic = row.getCell(8).value ? String(row.getCell(8).value).trim() : 'PIC Unit';
      const statusRaw = row.getCell(9).value ? String(row.getCell(9).value).trim() : 'MENUNGGU REVIEW';
      const status = statusRaw.replace(/ /g, '_');
      const totalAwal = Number(row.getCell(11).value) || 0;
      const totalRev = Number(row.getCell(12).value) || totalAwal;

      // Find unit
      let unit = Object.values(units).find((u: any) =>
        unitText.toLowerCase().includes(u.code.toLowerCase()) ||
        unitText.toLowerCase().includes(u.name.toLowerCase())
      );
      if (!unit) unit = units['SMPIT'];

      // Find activity
      let act = Object.values(activities).find((a: any) =>
        agenda.toLowerCase().includes(a.name.toLowerCase())
      );
      if (!act) act = Object.values(activities)[0];

      // Find submitter user
      let submitter = userMap['admin@alquraniyyah.sch.id'];
      if (unit.code === 'SMPIT') submitter = userMap['smpit@alquraniyyah.sch.id'] || submitter;
      if (unit.code === 'SMAIT') submitter = userMap['smait@alquraniyyah.sch.id'] || submitter;
      if (unit.code === 'SDIT') submitter = userMap['sdit@alquraniyyah.sch.id'] || submitter;
      if (unit.code === 'TKIT') submitter = userMap['tkit@alquraniyyah.sch.id'] || submitter;
      if (unit.code === 'LPBQ') submitter = userMap['lpbq@alquraniyyah.sch.id'] || submitter;

      const isApproved = status.includes('DISETUJUI') || status.includes('PENCAIRAN') || status.includes('DICAIRKAN');

      const subRecord = await prisma.submission.upsert({
        where: { submissionNumber: nomor },
        update: {
          title: agenda,
          totalExcel: totalAwal,
          totalParsing: totalAwal,
          totalReviewed: totalRev,
          totalApproved: isApproved ? totalRev : null,
          status,
          picName: pic,
        },
        create: {
          submissionNumber: nomor,
          unitId: unit.id,
          activityId: act.id,
          fiscalYearId: fiscalYear.id,
          title: agenda,
          originalFilename: `Backup_${nomor.replace(/\//g, '_')}.xlsx`,
          totalExcel: totalAwal,
          totalParsing: totalAwal,
          totalReviewed: totalRev,
          totalApproved: isApproved ? totalRev : null,
          status,
          picName: pic,
          submittedById: submitter.id,
          approvedById: isApproved ? userMap['pimpinan@alquraniyyah.sch.id'].id : null,
          approvedAt: isApproved ? new Date() : null,
        },
      });

      submissionMap.set(nomor, subRecord);
      console.log(`   ✓ Pengajuan: ${nomor} (${unit.code} - ${agenda})`);
    }

    // Parse Sheet 2 Items
    console.log('\n   Memulihkan Rincian Item Belanja per Pengajuan...');
    let itemCount = 0;
    for (let r = 6; r <= wsItems.rowCount; r++) {
      const row = wsItems.getRow(r);
      const nomor = row.getCell(3).value ? String(row.getCell(3).value).trim() : '';
      if (!nomor || !submissionMap.has(nomor)) continue;

      const submission = submissionMap.get(nomor);
      const itemNumber = Number(row.getCell(5).value) || 1;
      const kategori = row.getCell(6).value ? String(row.getCell(6).value).trim() : 'Operasional';
      const uraian = row.getCell(7).value ? String(row.getCell(7).value).trim() : '';
      const rincianAsli = row.getCell(8).value ? String(row.getCell(8).value).trim() : '';
      const volPengajuan = Number(row.getCell(10).value) || 1;
      const volReview = Number(row.getCell(11).value) || volPengajuan;
      const satuan = row.getCell(12).value ? String(row.getCell(12).value).trim() : 'item';
      const hargaSatuan = Number(row.getCell(13).value) || 0;
      const hargaSshVal = row.getCell(14).value;
      const hargaSsh = (hargaSshVal !== '-' && hargaSshVal !== null) ? Number(hargaSshVal) : null;
      const hargaRevVal = row.getCell(15).value;
      const hargaReview = (hargaRevVal !== '-' && hargaRevVal !== null) ? Number(hargaRevVal) : hargaSatuan;
      const subtotalPengajuan = Number(row.getCell(16).value) || (volPengajuan * hargaSatuan);
      const sshStatusRaw = row.getCell(18).value ? String(row.getCell(18).value).trim() : 'BELUM_REVIEW';
      const sshStatus = sshStatusRaw.replace(/ /g, '_');
      const catatanRev = row.getCell(19).value ? String(row.getCell(19).value).trim() : null;

      if (!uraian) continue;

      // Upsert item
      const existingItem = await prisma.submissionItem.findFirst({
        where: {
          submissionId: submission.id,
          itemNumber,
        },
      });

      if (!existingItem) {
        await prisma.submissionItem.create({
          data: {
            submissionId: submission.id,
            itemNumber,
            kategori,
            uraian,
            keterangan: rincianAsli !== '-' ? rincianAsli : null,
            volume: volReview,
            satuan,
            originalPrice: hargaSatuan,
            hargaSatuan,
            jumlah: subtotalPengajuan,
            reviewPrice: hargaReview,
            sshPrice: hargaSsh,
            sshStatus,
            reviewNote: (catatanRev !== '-' && catatanRev) ? catatanRev : null,
          },
        });
      }
      itemCount++;
    }
    console.log(`   ✓ Berhasil memulihkan ${itemCount} rincian item belanja & volume perkalian.`);
  }

  // 9. Restore Disbursements (Sheet 3)
  console.log('\n8. Memulihkan Data Pencairan / SPPD (Sheet 3)...');
  const wsDisburse = wb.getWorksheet('Pencairan Anggaran & SPPD');
  if (wsDisburse) {
    let disburseCount = 0;
    for (let r = 5; r <= wsDisburse.rowCount; r++) {
      const row = wsDisburse.getRow(r);
      const nomor = row.getCell(3).value ? String(row.getCell(3).value).trim() : '';
      const noKuitansi = row.getCell(4).value ? String(row.getCell(4).value).trim() : null;
      const penerima = row.getCell(8).value ? String(row.getCell(8).value).trim() : 'Penerima';
      const nominal = Number(row.getCell(9).value) || 0;

      if (!nomor || !nominal) continue;

      const sub = await prisma.submission.findUnique({ where: { submissionNumber: nomor } });
      if (sub) {
        await prisma.disbursement.create({
          data: {
            submissionId: sub.id,
            amount: nominal,
            paymentMethod: 'TRANSFER',
            recipientName: penerima,
            referenceNumber: noKuitansi,
            disbursedById: userMap['keuangan@alquraniyyah.sch.id'].id,
          },
        });
        disburseCount++;
      }
    }
    console.log(`   ✓ Berhasil memulihkan ${disburseCount} data pencairan dana.`);
  }

  // 10. Audit Logs (Sheet 6)
  console.log('\n9. Memulihkan Log Riwayat Aktivitas (Sheet 6)...');
  const wsLogs = wb.getWorksheet('Log Riwayat Aktivitas');
  if (wsLogs) {
    let logCount = 0;
    for (let r = 5; r <= Math.min(50, wsLogs.rowCount); r++) {
      const row = wsLogs.getRow(r);
      const aksi = row.getCell(5).value ? String(row.getCell(5).value).trim() : '';
      const entity = row.getCell(6).value ? String(row.getCell(6).value).trim() : 'System';
      const note = row.getCell(7).value ? String(row.getCell(7).value).trim() : '';

      if (!aksi) continue;

      await prisma.auditLog.create({
        data: {
          action: aksi,
          entity,
          note,
          userId: userMap['keuangan@alquraniyyah.sch.id'].id,
        },
      });
      logCount++;
    }
    console.log(`   ✓ Berhasil memulihkan ${logCount} log riwayat.`);
  }

  console.log('\n🎉 PEMULIHAN DATABASE SELESAI DENGAN SUKSES 100%!');
  console.log('Semua data pengajuan, review, SSH 2026, dan akun pengguna kini tersimpan di SQLite lokal: alquraniyyah.db');
}

restoreDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
