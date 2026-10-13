const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('SSH 2026', {
    views: [{ showGridLines: true }]
  });

  // ── 1. Title Block ──
  worksheet.mergeCells('A1:G1');
  const title1 = worksheet.getCell('A1');
  title1.value = "STANDAR SATUAN HARGA (SSH) TAHUN ANGGARAN 2026";
  title1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1B4332' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells('A2:G2');
  const title2 = worksheet.getCell('A2');
  title2.value = "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH";
  title2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF2D6A4F' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:G3');
  const title3 = worksheet.getCell('A3');
  title3.value = "Dokumen Acuan Standar Biaya Tertinggi Pengajuan Anggaran Unit / Lembaga";
  title3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  worksheet.getRow(4).height = 10; // Empty spacer row

  // ── 2. Table Headers ──
  const headers = [
    'No',
    'Kode SSH',
    'Kategori',
    'Uraian Barang / Jasa',
    'Satuan',
    'Harga Standar SSH',
    'Keterangan'
  ];

  const headerRow = worksheet.getRow(5);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B4332' } // Yayasan dark green
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0D2319' } },
      left: { style: 'thin', color: { argb: 'FF0D2319' } },
      bottom: { style: 'medium', color: { argb: 'FF0D2319' } },
      right: { style: 'thin', color: { argb: 'FF0D2319' } }
    };
  });

  // ── 3. Sample SSH Data ──
  const sampleData = [
    // ATK & Bahan Cetak
    { kode: 'SSH-ATK-001', kategori: 'ATK', uraian: 'Kertas HVS A4 75 Gram Sinar Dunia / PaperOne', satuan: 'Rim', harga: 55000, ket: 'Warna putih, 500 lembar' },
    { kode: 'SSH-ATK-002', kategori: 'ATK', uraian: 'Kertas HVS F4/Folio 75 Gram Sinar Dunia', satuan: 'Rim', harga: 60000, ket: 'Warna putih, 500 lembar' },
    { kode: 'SSH-ATK-003', kategori: 'ATK', uraian: 'Tinta Printer Epson Original Seri 003 / 664', satuan: 'Botol', harga: 95000, ket: 'Original 65ml per botol warna/hitam' },
    { kode: 'SSH-ATK-004', kategori: 'ATK', uraian: 'Spidol Whiteboard Snowman Boardmarker', satuan: 'Lusin', harga: 90000, ket: '12 pcs per box, hitam/biru' },
    { kode: 'SSH-ATK-005', kategori: 'ATK', uraian: 'Tinta Isi Ulang Spidol Snowman 20cc', satuan: 'Botol', harga: 18000, ket: 'Refill whiteboard' },
    { kode: 'SSH-ATK-006', kategori: 'ATK', uraian: 'Buku Agenda Surat Masuk / Keluar Folio', satuan: 'Buku', harga: 35000, ket: 'Hardcover isi 100 lembar' },
    { kode: 'SSH-ATK-007', kategori: 'ATK', uraian: 'Map Snellhecter Plastik Transparan', satuan: 'Pak', harga: 45000, ket: 'Isi 12 pcs / pak' },
    { kode: 'SSH-ATK-008', kategori: 'ATK', uraian: 'Map Stopmap Batik Kertas Folio', satuan: 'Pak', harga: 50000, ket: 'Isi 50 pcs / pak' },
    { kode: 'SSH-ATK-009', kategori: 'ATK', uraian: 'Stapler Besar HD-50 Max + Isi Staples No. 3', satuan: 'Set', harga: 45000, ket: 'Bahan logam awet' },
    { kode: 'SSH-ATK-010', kategori: 'ATK', uraian: 'Klip Kertas Paper Clip No. 3 Joyko', satuan: 'Kotak', harga: 7500, ket: 'Ukuran kecil isi 100' },

    // Konsumsi & Akomodasi
    { kode: 'SSH-KNS-001', kategori: 'Konsumsi', uraian: 'Snack Box Rapat Formal (3 Macam Kue + Air Mineral)', satuan: 'Kotak', harga: 15000, ket: 'Menu kue asin, manis, & buah kecil' },
    { kode: 'SSH-KNS-002', kategori: 'Konsumsi', uraian: 'Nasi Kotak Standar Kegiatan Santri / Panitia', satuan: 'Kotak', harga: 25000, ket: 'Nasi, ayam goreng/bakar, sayur, sambal, kerupuk' },
    { kode: 'SSH-KNS-003', kategori: 'Konsumsi', uraian: 'Nasi Kotak VIP / Tamu Yayasan', satuan: 'Kotak', harga: 40000, ket: 'Nasi, daging rendang/ikan, pelengkap, buah potong, jus' },
    { kode: 'SSH-KNS-004', kategori: 'Konsumsi', uraian: 'Air Mineral Gelas 220ml (Merk Club / Aqua)', satuan: 'Dus', harga: 32000, ket: 'Isi 48 cup per karton' },
    { kode: 'SSH-KNS-005', kategori: 'Konsumsi', uraian: 'Air Mineral Botol Sedang 600ml Aqua', satuan: 'Dus', harga: 52000, ket: 'Isi 24 botol per karton' },
    { kode: 'SSH-KNS-006', kategori: 'Konsumsi', uraian: 'Air Mineral Galon Aqua 19 Liter (Isi Ulang Resmi)', satuan: 'Galon', harga: 22000, ket: 'Refill galon resmi distributor' },
    { kode: 'SSH-KNS-007', kategori: 'Konsumsi', uraian: 'Prasmanan Acara Yayasan / Haflah Akhirussanah', satuan: 'Porsi', harga: 45000, ket: 'Lengkap meja display & alat saji' },

    // Transportasi & Dinas
    { kode: 'SSH-TRN-001', kategori: 'Transportasi', uraian: 'Sewa Bus Pariwisata Besar 59 Seat (Ziarah/Rihlah)', satuan: 'Unit/Hari', harga: 3500000, ket: 'Termasuk sopir & BBM Jabodetabek' },
    { kode: 'SSH-TRN-002', kategori: 'Transportasi', uraian: 'Sewa Elf Long / HiAce 15 Seat', satuan: 'Unit/Hari', harga: 1300000, ket: 'Termasuk sopir & BBM' },
    { kode: 'SSH-TRN-003', kategori: 'Transportasi', uraian: 'BBM Operasional Kendaraan Yayasan (Pertalite)', satuan: 'Liter', harga: 10000, ket: 'Struk resmi SPBU' },
    { kode: 'SSH-TRN-004', kategori: 'Transportasi', uraian: 'BBM Operasional Kendaraan Yayasan (Pertamax)', satuan: 'Liter', harga: 13500, ket: 'Struk resmi SPBU' },
    { kode: 'SSH-TRN-005', kategori: 'Transportasi', uraian: 'Uang Tol & Parkir Dinas Luar Kota', satuan: 'Paket', harga: 250000, ket: 'Reimburse sesuai struk e-toll' },

    // Honorarium & Jasa Profesi
    { kode: 'SSH-HNR-001', kategori: 'Honorarium', uraian: 'Honorarium Narasumber Seminar / Kajian Ilmiah Tamu', satuan: 'Org/Jam', harga: 500000, ket: 'Kualifikasi Magister/Doktor/Kyai' },
    { kode: 'SSH-HNR-002', kategori: 'Honorarium', uraian: 'Honorarium Dewan Juri Musabaqah / Lomba Santri', satuan: 'Org/Kegiatan', harga: 300000, ket: 'Lomba tingkat pesantren/sekolah' },
    { kode: 'SSH-HNR-003', kategori: 'Honorarium', uraian: 'Honorarium Penguji Ujian Tahfidz Al-Qur\'an', satuan: 'Org/Hari', harga: 250000, ket: 'Sertifikasi huffadz internal/eksternal' },
    { kode: 'SSH-HNR-004', kategori: 'Honorarium', uraian: 'Jasa Dokumentasi Foto & Video Acara Besar', satuan: 'Kegiatan', harga: 750000, ket: 'Termasuk editing highlight video' },
    { kode: 'SSH-HNR-005', kategori: 'Honorarium', uraian: 'Jasa Desain Grafis Spanduk & Publikasi Media', satuan: 'Desain', harga: 100000, ket: 'Master file format cetak & medsos' },

    // Kebersihan & Rumah Tangga
    { kode: 'SSH-KBR-001', kategori: 'Kebersihan', uraian: 'Sapu Ijuk Standar Dragon / Nagoya', satuan: 'Buah', harga: 25000, ket: 'Gagang kayu tebal' },
    { kode: 'SSH-KBR-002', kategori: 'Kebersihan', uraian: 'Alat Pel Lantai Komplit Gagang Alumunium', satuan: 'Set', harga: 45000, ket: 'Sumbu kain katun daya serap tinggi' },
    { kode: 'SSH-KBR-003', kategori: 'Kebersihan', uraian: 'Cairan Pembersih Lantai Wipol / SOS 4 Liter', satuan: 'Jerigen', harga: 48000, ket: 'Aroma cemara / sereh' },
    { kode: 'SSH-KBR-004', kategori: 'Kebersihan', uraian: 'Cairan Pembersih Kloset Porstex 1000ml', satuan: 'Botol', harga: 22000, ket: 'Pembersih porselen toilet' },
    { kode: 'SSH-KBR-005', kategori: 'Kebersihan', uraian: 'Sabun Cuci Piring Sunlight 750ml Pouch', satuan: 'Pouch', harga: 17000, ket: 'Ekstrak jeruk nipis' },
    { kode: 'SSH-KBR-006', kategori: 'Kebersihan', uraian: 'Kantong Sampah Plastik Hitam Jumbo 90x120cm', satuan: 'Pak', harga: 35000, ket: 'Isi 10 lembar tebal tidak mudah sobek' },

    // Sarana & Elektronik
    { kode: 'SSH-ELK-001', kategori: 'Elektronik & Sarpras', uraian: 'Lampu LED Philips 18 Watt Putih (Cool Daylight)', satuan: 'Pcs', harga: 55000, ket: 'Garansi resmi 1 tahun' },
    { kode: 'SSH-ELK-002', kategori: 'Elektronik & Sarpras', uraian: 'Kabel Roll 10 Meter Uticon 4 Lubang + Saklar', satuan: 'Unit', harga: 95000, ket: 'Standar SNI steker tembaga' },
    { kode: 'SSH-ELK-003', kategori: 'Elektronik & Sarpras', uraian: 'Whiteboard Magnetik Gantung 120 x 240 cm', satuan: 'Unit', harga: 650000, ket: 'Lis alumunium sudut siku' },
    { kode: 'SSH-ELK-004', kategori: 'Elektronik & Sarpras', uraian: 'Kipas Angin Dinding Tornado Regency 18 Inch', satuan: 'Unit', harga: 420000, ket: 'Baling-baling besi daya angin kuat' },
    { kode: 'SSH-ELK-005', kategori: 'Elektronik & Sarpras', uraian: 'Router Wi-Fi TP-Link Archer C50 Dual Band', satuan: 'Unit', harga: 330000, ket: 'Kecepatan 1200 Mbps untuk lab/kelas' },
    { kode: 'SSH-ELK-006', kategori: 'Elektronik & Sarpras', uraian: 'Flashdisk Sandisk Cruzer Blade 32GB USB 2.0', satuan: 'Pcs', harga: 55000, ket: 'Original berstiker garansi' }
  ];

  sampleData.forEach((item, index) => {
    const rowNum = 6 + index;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    const isEven = index % 2 === 1;
    const bgFill = isEven ? 'FFF9FBFA' : 'FFFFFFFF';

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.kode;
    row.getCell(3).value = item.kategori;
    row.getCell(4).value = item.uraian;
    row.getCell(5).value = item.satuan;
    row.getCell(6).value = item.harga;
    row.getCell(7).value = item.ket;

    // Formatting per cell
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF1F2937' } };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    // Format mata uang standar Excel
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).numFmt = '#,##0';
    row.getCell(6).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1B4332' } };

    row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: 'FF4B5563' } };

    // Borders & Fill
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgFill }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  // Set column widths
  worksheet.getColumn(1).width = 7;   // No
  worksheet.getColumn(2).width = 17;  // Kode SSH
  worksheet.getColumn(3).width = 22;  // Kategori
  worksheet.getColumn(4).width = 46;  // Uraian Barang / Jasa
  worksheet.getColumn(5).width = 14;  // Satuan
  worksheet.getColumn(6).width = 22;  // Harga Standar SSH
  worksheet.getColumn(7).width = 38;  // Keterangan

  // Output paths:
  // 1. Root project directory: d:\PENGAJUAN & PENCAIRAN\TEMPLATE_MASTER_SSH_2026.xlsx
  const rootPath = path.resolve(__dirname, '../../TEMPLATE_MASTER_SSH_2026.xlsx');
  
  // 2. Backend templates directory: d:\PENGAJUAN & PENCAIRAN\backend\templates\TEMPLATE_MASTER_SSH_2026.xlsx
  const templatesDir = path.resolve(__dirname, '../templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }
  const backendPath = path.join(templatesDir, 'TEMPLATE_MASTER_SSH_2026.xlsx');

  // 3. Samples directory (sama seperti template pengajuan)
  const samplesDir = path.resolve(__dirname, '../../samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }
  const samplePath = path.join(samplesDir, 'TEMPLATE_MASTER_SSH_2026.xlsx');

  await workbook.xlsx.writeFile(rootPath);
  console.log(`[SUCCESS] File template berhasil ditulis ke: ${rootPath}`);

  await workbook.xlsx.writeFile(backendPath);
  console.log(`[SUCCESS] File template berhasil ditulis ke: ${backendPath}`);

  await workbook.xlsx.writeFile(samplePath);
  console.log(`[SUCCESS] File template berhasil ditulis ke: ${samplePath}`);
}

generateTemplate().catch((err) => {
  console.error('[ERROR] Gagal generate template SSH:', err);
  process.exit(1);
});
