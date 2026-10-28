const ExcelJS = require('exceljs');
const path = require('path');

async function createTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah";
  wb.created = new Date();

  const ws = wb.addWorksheet('Pengajuan Anggaran', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  // Setup Column Widths
  ws.columns = [
    { key: 'no', width: 6 },            // A
    { key: 'uraian', width: 44 },        // B
    { key: 'biaya', width: 16 },         // C
    { key: 'vol1', width: 8 },           // D
    { key: 'sat1', width: 12 },          // E
    { key: 'x1', width: 4 },             // F
    { key: 'vol2', width: 8 },           // G
    { key: 'sat2', width: 14 },          // H
    { key: 'x2', width: 4 },             // I
    { key: 'vol3', width: 8 },           // J
    { key: 'sat3', width: 12 },          // K
    { key: 'jumlah', width: 18 },        // L
    { key: 'total', width: 18 },         // M
  ];

  // Header Lembaga
  ws.mergeCells('A2:M2');
  const title1 = ws.getCell('A2');
  title1.value = "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH";
  title1.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:M3');
  const title2 = ws.getCell('A3');
  title2.value = "FORMAT USULAN RENCANA ANGGARAN BELANJA (RAB) UNIT";
  title2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF374151' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Meta Info
  ws.getCell('B5').value = 'Unit Pemohon:';
  ws.getCell('B5').font = { bold: true, size: 10 };
  ws.getCell('C5').value = 'SMA IT Al-Qur\'aniyyah';
  ws.getCell('C5').font = { size: 10 };

  ws.getCell('B6').value = 'Nama Kegiatan:';
  ws.getCell('B6').font = { bold: true, size: 10 };
  ws.getCell('C6').value = 'Ujian Satuan Pendidikan & TKA';
  ws.getCell('C6').font = { size: 10 };

  ws.getCell('B7').value = 'Tahun Anggaran:';
  ws.getCell('B7').font = { bold: true, size: 10 };
  ws.getCell('C7').value = 2026;
  ws.getCell('C7').font = { size: 10 };

  // Table Headers
  // Row 9: Main Header
  const headerRow = ws.getRow(9);
  headerRow.height = 24;

  ws.mergeCells('A9:A10');
  ws.getCell('A9').value = 'NO';

  ws.mergeCells('B9:B10');
  ws.getCell('B9').value = 'URAIAN KEGIATAN';

  ws.mergeCells('C9:C10');
  ws.getCell('C9').value = 'BIAYA';

  ws.mergeCells('D9:K9');
  ws.getCell('D9').value = 'RINCIAN';

  // Sub headers for Rincian in Row 10
  ws.getCell('D10').value = 'Vol 1';
  ws.getCell('E10').value = 'Satuan 1';
  ws.getCell('F10').value = 'x';
  ws.getCell('G10').value = 'Vol 2';
  ws.getCell('H10').value = 'Satuan 2';
  ws.getCell('I10').value = 'x';
  ws.getCell('J10').value = 'Vol 3';
  ws.getCell('K10').value = 'Satuan 3';

  ws.mergeCells('L9:L10');
  ws.getCell('L9').value = 'JUMLAH';

  ws.mergeCells('M9:M10');
  ws.getCell('M9').value = 'TOTAL';

  // Style Header Cells (Rows 9 & 10)
  for (let r = 9; r <= 10; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF111827' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      };
    });
  }

  // Data rows to add
  const sections = [
    {
      roman: 'I',
      category: 'ANGGARAN DANA TKA',
      items: [
        { no: '1.', uraian: 'Pengadaan modul/panduan/foto copy (102 siswa + 9 guru + arsip 1)', biaya: 25000, v1: 102, s1: 'buah', v2: 5, s2: 'paket' },
        { no: '2.', uraian: 'Insentif & transport guru pembina PM', biaya: 150000, v1: 9, s1: 'mapel', v2: 8, s2: 'pertemuan', v3: 1, s3: 'bulan' },
        { no: '3.', uraian: 'Insentif panitia (Kepsek, Wakil, TU, Proktor, Operator, 3 Walas, OB)', biaya: 75000, v1: 10, s1: 'orang', v2: 1, s2: 'kegiatan', v3: 13, s3: 'hari' },
        { no: '4.', uraian: 'Konsumsi Pelaksanaan TKA', biaya: 50000, v1: 4, s1: 'hari', v2: 12, s2: 'org' },
        { no: '5.', uraian: 'Honor Pengawas Silang', biaya: 50000, v1: 4, s1: 'hari', v2: 2, s2: 'org', v3: 3, s3: 'sesi' },
        { no: '6.', uraian: 'Transport Pengawas Silang', biaya: 50000, v1: 4, s1: 'hari', v2: 2, s2: 'org' },
        { no: '7.', uraian: 'Transport Monitoring Dinas', biaya: 500000, v1: 3, s1: 'Org', v2: 1, s2: 'pertemuan' },
        { no: '8.', uraian: 'Konsumsi Monitoring Dinas', biaya: 100000, v1: 3, s1: 'Org' },
      ]
    },
    {
      roman: 'II',
      category: 'PELAKSANAAN UJIAN SATUAN PENDIDIKAN',
      items: [
        { no: '1.', uraian: 'Insentif ujian praktik', biaya: 10000, v1: 13, s1: 'mapel', v2: 102, s2: 'siswa' },
        { no: '2.', uraian: 'penyusunan kartu soal ujian dan kisi-kisi', biaya: 75000, v1: 17, s1: 'mapel', v2: 2, s2: 'paket' },
        { no: '3.', uraian: 'Penyusunan naskah dan pengetikan soal (Ujian Tulis)', biaya: 35000, v1: 17, s1: 'mapel', v2: 2, s2: 'paket' },
        { no: '4.', uraian: 'Penggandaan soal', biaya: 200, v1: 17, s1: 'mapel', v2: 10, s2: 'lembar', v3: 102, s3: 'siswa' },
        { no: '5.', uraian: 'Insentif pengawas ruang USP', biaya: 30000, v1: 17, s1: 'mapel', v2: 4, s2: 'ruang', v3: 2, s3: 'orang' },
        { no: '6.', uraian: 'Insentif korektor soal USP', biaya: 5000, v1: 17, s1: 'mapel', v2: 102, s2: 'siswa', v3: 2, s3: 'korektor' },
        { no: '7.', uraian: 'Transport korektor soal USP', biaya: 50000, v1: 17, s1: 'mapel', v2: 2, s2: 'korektor' },
        { no: '8.', uraian: 'Transport monitoring Dinas', biaya: 500000, v1: 3, s1: 'orang', v2: 1, s2: 'kegiatan' },
        { no: '9.', uraian: 'Transport rapat panitia, pengawas, dan guru', biaya: 50000, v1: 27, s1: 'orang', v2: 1, s2: 'pertemuan' },
        { no: '10.', uraian: 'Insentif panitia US (Ketua, 3 walas, 2 wakasek, Sekretaris, Bendahara, TU, OB)', biaya: 75000, v1: 9, s1: 'orang', v2: 1, s2: 'kegiatan', v3: 8, s3: 'hari' },
        { no: '11. a).', uraian: 'Konsumsi: Saat ujian (Pengawas 8 orang dan panitia 6 orang)', biaya: 10000, v1: 14, s1: 'orang', v2: 12, s2: 'hari' },
        { no: '11. b).', uraian: 'Konsumsi: Koreksi ujian', biaya: 30000, v1: 27, s1: 'orang', v2: 1, s2: 'kegiatan' },
        { no: '11. c).', uraian: 'Konsumsi: Konsumsi rapat', biaya: 30000, v1: 27, s1: 'orang', v2: 1, s2: 'pertemuan' },
        { no: '11. d).', uraian: 'Konsumsi: konsumsi rapat kelulusan', biaya: 30000, v1: 27, s1: 'guru', v2: 1, s2: 'kegiatan' },
      ]
    },
    {
      roman: 'III',
      category: 'KESEKRETARIATAN',
      items: [
        { no: '1.', uraian: 'Pembuatan lebel/kartu (siswa 102)', biaya: 2000, v1: 102, s1: 'orang', v2: 1, s2: 'kegiatan' },
        { no: '2.', uraian: 'Pembelian plastik lebel', biaya: 2000, v1: 102, s1: 'orang', v2: 1, s2: 'kegiatan' },
        { no: '3.', uraian: 'Penyusunan program dan laporan', biaya: 75000, v1: 2, s1: 'bundel', v2: 1, s2: 'kegiatan' },
        { no: '4.', uraian: 'Pembuatan spanduk', biaya: 150000, v1: 1, s1: 'buah', v2: 1, s2: 'kegiatan' },
        { no: '5.', uraian: 'Cetak blanko Ijazah', biaya: 10000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
        { no: '6.', uraian: 'Tanda tangan Ijazah', biaya: 25000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
        { no: '7.', uraian: 'Pas Foto', biaya: 30000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
        { no: '8.', uraian: 'Pembelian 1 set perlengkapan USP', biaya: 25000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
        { no: '9.', uraian: 'sampul/map transparan untuk ijazah', biaya: 3000, v1: 102, s1: 'buah' },
        { no: '10.', uraian: 'Penandatanganan USP 1 ( Pengawas )', biaya: 500000, v1: 1, s1: 'orang', v2: 1, s2: 'kegiatan' },
        { no: '11.', uraian: 'Amplop Soal, lem, steples, map, lebel dll (ATK)', biaya: 60000, v1: 1, s1: 'kegiatan' },
      ]
    },
    {
      roman: 'IV',
      category: 'PENGELOLAAN DATA, NILAI RAPORT KE PERGURUAN TINGGI',
      items: [
        { no: '1.', uraian: 'Pengumpulan berkas dan data siswa (print out, foto copy & jilid)', biaya: 5000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
        { no: '2.', uraian: 'pengolahan dan penginputan data & nilai ke PDSS (oleh Walas & Ops)', biaya: 30000, v1: 102, s1: 'siswa', v2: 1, s2: 'kegiatan' },
      ]
    }
  ];

  let currentRowIdx = 11;
  const categoryTotalRowIndices = [];

  for (const sec of sections) {
    const catRowIdx = currentRowIdx;
    const catRow = ws.getRow(catRowIdx);
    catRow.getCell(1).value = sec.roman;
    catRow.getCell(2).value = sec.category;
    
    // Style Category Header
    catRow.getCell(1).font = { name: 'Arial', size: 9, bold: true };
    catRow.getCell(1).alignment = { horizontal: 'center' };
    catRow.getCell(2).font = { name: 'Arial', size: 9, bold: true };
    
    currentRowIdx++;
    const startItemIdx = currentRowIdx;

    for (const it of sec.items) {
      const itemRow = ws.getRow(currentRowIdx);
      itemRow.getCell(1).value = it.no;
      itemRow.getCell(2).value = it.uraian;
      itemRow.getCell(3).value = it.biaya;
      itemRow.getCell(3).numFmt = '"Rp "#,##0';

      itemRow.getCell(4).value = it.v1;
      itemRow.getCell(5).value = it.s1;

      if (it.v2) {
        itemRow.getCell(6).value = 'x';
        itemRow.getCell(7).value = it.v2;
        itemRow.getCell(8).value = it.s2;
      }
      if (it.v3) {
        itemRow.getCell(9).value = 'x';
        itemRow.getCell(10).value = it.v3;
        itemRow.getCell(11).value = it.s3;
      }

      // Formula Jumlah: Biaya * V1 * (V2 || 1) * (V3 || 1)
      const r = currentRowIdx;
      itemRow.getCell(12).value = {
        formula: `=C${r}*D${r}*IF(G${r}>0,G${r},1)*IF(J${r}>0,J${r},1)`
      };
      itemRow.getCell(12).numFmt = '"Rp "#,##0';

      // Alignment and borders
      itemRow.getCell(1).alignment = { horizontal: 'center' };
      itemRow.getCell(3).alignment = { horizontal: 'right' };
      itemRow.getCell(4).alignment = { horizontal: 'center' };
      itemRow.getCell(6).alignment = { horizontal: 'center' };
      itemRow.getCell(7).alignment = { horizontal: 'center' };
      itemRow.getCell(9).alignment = { horizontal: 'center' };
      itemRow.getCell(10).alignment = { horizontal: 'center' };
      itemRow.getCell(12).alignment = { horizontal: 'right' };

      for (let c = 1; c <= 13; c++) {
        itemRow.getCell(c).border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
        itemRow.getCell(c).font = { name: 'Arial', size: 9 };
      }

      currentRowIdx++;
    }

    const endItemIdx = currentRowIdx - 1;
    // Put subtotal formula in category row column M
    catRow.getCell(13).value = {
      formula: `=SUM(L${startItemIdx}:L${endItemIdx})`
    };
    catRow.getCell(13).numFmt = '"Rp "#,##0';
    catRow.getCell(13).font = { name: 'Arial', size: 9, bold: true };
    catRow.getCell(13).alignment = { horizontal: 'right' };

    for (let c = 1; c <= 13; c++) {
      catRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    }
    categoryTotalRowIndices.push(catRowIdx);
  }

  // Grand Total Row
  const grandTotalRow = ws.getRow(currentRowIdx);
  ws.mergeCells(`A${currentRowIdx}:K${currentRowIdx}`);
  grandTotalRow.getCell(1).value = 'TOTAL USULAN KESELURUHAN';
  grandTotalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  grandTotalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  const sumTotalFormula = categoryTotalRowIndices.map(idx => `M${idx}`).join('+');
  grandTotalRow.getCell(12).value = {
    formula: `=${sumTotalFormula}`
  };
  grandTotalRow.getCell(12).numFmt = '"Rp "#,##0';
  grandTotalRow.getCell(12).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  grandTotalRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= 13; c++) {
    grandTotalRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: 'FF1F2937' } },
      bottom: { style: 'double', color: { argb: 'FF1F2937' } },
      left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    };
    grandTotalRow.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
  }

  // Save to target locations
  const targetPaths = [
    path.resolve(__dirname, '../Template_Pengajuan_Resmi_Yayasan.xlsx'),
    path.resolve(__dirname, '../samples/Template_Pengajuan_Resmi_Yayasan.xlsx'),
    'D:/Sistem_Keuangan_Portable/Template_Pengajuan_Resmi_Yayasan.xlsx',
    'D:/Sistem_Keuangan_Portable/samples/Template_Pengajuan_Resmi_Yayasan.xlsx'
  ];

  for (const p of targetPaths) {
    try {
      await wb.xlsx.writeFile(p);
      console.log('Saved template to:', p);
    } catch (e) {
      console.error('Failed saving to', p, e.message);
    }
  }
}

createTemplate().then(() => console.log('Done creating template!'));
