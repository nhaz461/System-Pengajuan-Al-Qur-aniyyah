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
  ws.mergeCells('B2:I2');
  ws.getCell('B2').value = "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH";
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1B4332' } };
  ws.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('B3:I3');
  ws.getCell('B3').value = "FORMAT STANDAR PENGAJUAN ANGGARAN BELANJA UNIT (TA 2026)";
  ws.getCell('B3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF2D6A4F' } };
  ws.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Info header
  ws.getCell('B5').value = "Unit Pemohon:";
  ws.getCell('B5').font = { bold: true };
  ws.getCell('C5').value = "SMP IT Al-Qur'aniyyah";

  ws.getCell('B6').value = "Nama Kegiatan:";
  ws.getCell('B6').font = { bold: true };
  ws.getCell('C6').value = "Ujian Semester / Kegiatan Tahunan";

  ws.getCell('B7').value = "Tahun Anggaran:";
  ws.getCell('B7').font = { bold: true };
  ws.getCell('C7').value = "2026";

  // Table Headers (Row 9)
  const headers = [
    'No',
    'Kategori',
    'Uraian Barang / Belanja Kegiatan',
    'Harga Satuan',
    'Volume',
    'Satuan',
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
      horizontal: idx === 2 ? 'left' : idx === 3 || idx === 6 ? 'right' : 'center',
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

  // Data rows sesuai Section E
  const sampleData = [
    [1, 'ATK', 'Kertas HVS A4 75 gram', 75000, 10, 'Rim', 750000, 'Administrasi sekolah'],
    [2, 'ATK', 'Tinta Printer Epson Original', 100000, 4, 'Botol', 400000, 'Printer kantor'],
    [3, 'Konsumsi', 'Snack Rapat Koordinasi Panitia', 18000, 50, 'Kotak', 900000, 'Persiapan ujian'],
    [4, 'Honorarium', 'Honor Pengawas Ujian per Sesi', 35000, 20, 'Orang/Sesi', 700000, 'Pengawas ujian'],
  ];

  sampleData.forEach((rowVals, rIdx) => {
    const row = ws.getRow(10 + rIdx);
    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 2);
      cell.value = val;
      cell.font = { name: 'Arial', size: 10 };
      if (cIdx === 3 || cIdx === 6) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (cIdx === 0 || cIdx === 4 || cIdx === 5) {
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
  ws.mergeCells('B14:G14');
  totalRow.getCell(2).value = 'TOTAL USULAN ANGGARAN';
  totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.getCell(8).value = { formula: 'SUM(H10:H13)', result: 2750000 };
  totalRow.getCell(8).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
  totalRow.getCell(8).numFmt = '#,##0';
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

  ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
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
  ws.getColumn(4).width = 40; // D (Uraian)
  ws.getColumn(5).width = 15; // E (Harga Satuan)
  ws.getColumn(6).width = 10; // F (Volume)
  ws.getColumn(7).width = 14; // G (Satuan)
  ws.getColumn(8).width = 18; // H (Jumlah)
  ws.getColumn(9).width = 30; // I (Keterangan)

  const outPath1 = path.resolve(__dirname, '../../../samples/Template_Pengajuan_Resmi_Yayasan.xlsx');
  const outPath2 = path.resolve(__dirname, '../../../Template_Pengajuan_Resmi_Yayasan.xlsx');

  await wb.xlsx.writeFile(outPath1);
  await wb.xlsx.writeFile(outPath2);
  console.log('Template created at:', outPath1);
}

createOfficialTemplate().catch(console.error);
