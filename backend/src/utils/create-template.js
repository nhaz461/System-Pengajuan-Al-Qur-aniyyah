const ExcelJS = require('exceljs');
const path = require('path');

async function createOfficialTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah";
  wb.created = new Date();

  const ws = wb.addWorksheet('Pengajuan Anggaran', {
    properties: { defaultRowHeight: 22 },
  });

  // Title rows
  ws.mergeCells('B2:M2');
  ws.getCell('B2').value = "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH";
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1B4332' } };
  ws.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('B3:M3');
  ws.getCell('B3').value = "FORMAT STANDAR PENGAJUAN ANGGARAN BELANJA UNIT (TA 2026)";
  ws.getCell('B3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF2D6A4F' } };
  ws.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Info header
  ws.getCell('B5').value = "Unit Pemohon:";
  ws.getCell('B5').font = { bold: true };
  ws.getCell('C5').value = "SMP IT Al-Qur'aniyyah";

  ws.getCell('B6').value = "Nama Kegiatan:";
  ws.getCell('B6').font = { bold: true };
  ws.getCell('C6').value = "STS Semester Ganjil / Kegiatan Tahunan";

  ws.getCell('B7').value = "Tahun Anggaran:";
  ws.getCell('B7').font = { bold: true };
  ws.getCell('C7').value = "2026";

  // Table Headers (Row 9)
  const headers = [
    'No',
    'Kategori',
    'Uraian Barang / Belanja Kegiatan',
    'Harga Satuan',
    'Volume 1',
    'Satuan 1',
    'Volume 2',
    'Satuan 2',
    'Volume 3',
    'Satuan 3',
    'Jumlah',
    'Keterangan',
  ];

  const headerRow = ws.getRow(9);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 2); // Start at col B
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B4332' },
    };
    cell.alignment = {
      horizontal: idx === 2 ? 'left' : idx === 3 || idx === 10 ? 'right' : 'center',
      vertical: 'middle',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
  });
  headerRow.height = 26;

  // Data rows contoh (1x, 2x, dan 3x perkalian)
  const sampleData = [
    [1, 'ATK', 'Penggandaan LJK (Lembar Jawaban Komputer)', 150, 16, 'MP', 237, 'Siswa', 2, 'Lembar', { formula: 'E10*IF(F10>0,F10,1)*IF(H10>0,H10,1)*IF(J10>0,J10,1)', result: 1137600 }, '16 MP × 237 Siswa × 2 Lembar'],
    [2, 'Upah', 'Pembuatan Soal Ujian', 35000, 16, 'MP', 3, 'Kelas', null, null, { formula: 'E11*IF(F11>0,F11,1)*IF(H11>0,H11,1)*IF(J11>0,J11,1)', result: 1680000 }, '16 MP × 3 Kelas'],
    [3, 'ATK', 'Kertas HVS F4 70 gram', 57000, 3, 'Rim', null, null, null, null, { formula: 'E12*IF(F12>0,F12,1)*IF(H12>0,H12,1)*IF(J12>0,J12,1)', result: 171000 }, 'Kebutuhan cetak ujian'],
    [4, 'Konsumsi', 'Snack Rapat Koordinasi Panitia', 18000, 24, 'Kotak', null, null, null, null, { formula: 'E13*IF(F13>0,F13,1)*IF(H13>0,H13,1)*IF(J13>0,J13,1)', result: 432000 }, 'Persiapan panitia'],
  ];

  sampleData.forEach((rowVals, rIdx) => {
    const row = ws.getRow(10 + rIdx);
    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 2);
      cell.value = val;
      cell.font = { name: 'Arial', size: 10 };
      if (cIdx === 3 || cIdx === 10) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (cIdx === 0 || cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 7 || cIdx === 8 || cIdx === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
    row.height = 22;
  });

  // Total row (Row 14)
  const totalRow = ws.getRow(14);
  ws.mergeCells('B14:K14');
  totalRow.getCell(2).value = 'TOTAL USULAN ANGGARAN';
  totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.getCell(12).value = { formula: 'SUM(L10:L13)', result: 3420600 };
  totalRow.getCell(12).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
  totalRow.getCell(12).numFmt = '#,##0';
  totalRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

  ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
    const c = totalRow.getCell(col);
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F4F0' },
    };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1B4332' } },
      bottom: { style: 'double', color: { argb: 'FF1B4332' } },
    };
  });
  totalRow.height = 24;

  // Set column widths
  ws.getColumn(1).width = 3;  // A
  ws.getColumn(2).width = 6;  // B (No)
  ws.getColumn(3).width = 16; // C (Kategori)
  ws.getColumn(4).width = 38; // D (Uraian)
  ws.getColumn(5).width = 15; // E (Harga Satuan)
  ws.getColumn(6).width = 11; // F (Volume 1)
  ws.getColumn(7).width = 12; // G (Satuan 1)
  ws.getColumn(8).width = 11; // H (Volume 2)
  ws.getColumn(9).width = 12; // I (Satuan 2)
  ws.getColumn(10).width = 11; // J (Volume 3)
  ws.getColumn(11).width = 12; // K (Satuan 3)
  ws.getColumn(12).width = 18; // L (Jumlah)
  ws.getColumn(13).width = 30; // M (Keterangan)

  const outPath1 = path.resolve(__dirname, '../../../samples/Template_Pengajuan_Resmi_Yayasan.xlsx');
  const outPath2 = path.resolve(__dirname, '../../../Template_Pengajuan_Resmi_Yayasan.xlsx');

  await wb.xlsx.writeFile(outPath1);
  await wb.xlsx.writeFile(outPath2);

  await wb.xlsx.writeFile(outPath1);
  await wb.xlsx.writeFile(outPath2);
  console.log('Template created at:', outPath1);
}

createOfficialTemplate().catch(console.error);
