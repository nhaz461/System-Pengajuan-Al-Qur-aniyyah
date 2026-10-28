import ExcelJS from 'exceljs';
import fs from 'fs';
import { createError } from '../middleware/error.middleware';

export interface ParsedSubmissionItem {
  no: number;
  kategori: string;
  uraian: string;
  hargaSatuan: number;
  volume: number;
  satuan: string;
  jumlah: number;
  keterangan: string | null;
  rincianVolume?: string | null;
}

export interface SubmissionParseResult {
  sheetName: string;
  headerRow: number;
  unitInfo?: string;
  activityInfo?: string;
  totalExcel: number;
  totalParsing: number;
  selisih: number;
  hasMismatch: boolean;
  mismatchWarning?: string;
  items: ParsedSubmissionItem[];
  totalItems: number;
}

function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'object') {
    if (val.result !== undefined && typeof val.result === 'number') {
      return val.result;
    }
    if (val.text) {
      val = val.text;
    }
  }
  const clean = String(val)
    .replace(/[^0-9.,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(clean) || 0;
}

function parseVolAndUnit(rawVolCell: any, rawSatCell?: any): { volume: number; satuan: string } {
  const volVal = rawVolCell ? (rawVolCell.value !== undefined ? rawVolCell.value : rawVolCell) : null;
  const satVal = rawSatCell ? (rawSatCell.value !== undefined ? rawSatCell.value : rawSatCell) : null;

  let volNum = parseNumber(volVal);
  let satStr = satVal ? String(rawSatCell.text || satVal).trim() : '';

  // Jika satuan belum terisi di kolom satuan, cek apakah di kolom volume ada teks satuan (e.g. "16 MP", "237 Siswa")
  if (!satStr && volVal !== null && volVal !== undefined) {
    const rawText = String(rawVolCell.text || volVal).trim();
    const extracted = rawText.replace(/^[0-9.,\s]+/, '').trim();
    if (extracted && isNaN(Number(extracted))) {
      satStr = extracted;
    }
  }

  return { volume: volNum, satuan: satStr };
}

function sanitizeXlsxBuffer(buffer: Buffer): Buffer {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    let modified = false;
    for (const entry of zip.getEntries()) {
      if (entry.entryName.endsWith('.xml') || entry.entryName.endsWith('.rels')) {
        const text = zip.readAsText(entry);
        if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(text)) {
          const sanitized = text.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
          zip.updateFile(entry.entryName, Buffer.from(sanitized, 'utf8'));
          modified = true;
        }
      }
    }
    return modified ? zip.toBuffer() : buffer;
  } catch (_) {
    return buffer;
  }
}

/**
 * Parser Excel Pengajuan Unit (Sesuai Aturan E, F, G)
 */
export async function parseSubmissionExcel(
  filePathOrBuffer: string | Buffer
): Promise<SubmissionParseResult> {
  const workbook = new ExcelJS.Workbook();

  let buf: Buffer;
  if (typeof filePathOrBuffer === 'string') {
    buf = sanitizeXlsxBuffer(fs.readFileSync(filePathOrBuffer));
  } else {
    buf = sanitizeXlsxBuffer(filePathOrBuffer);
  }

  await workbook.xlsx.load(buf as any);

  // 1. Identifikasi sheet: cari sheet yang memuat rencana anggaran atau sheet pertama
  let activeSheet: ExcelJS.Worksheet | undefined;
  workbook.eachSheet((sheet) => {
    const name = sheet.name.toLowerCase();
    if (
      !activeSheet &&
      (name.includes('anggaran') ||
        name.includes('pengajuan') ||
        name.includes('usulan') ||
        name.includes('rencana') ||
        name.includes('biaya'))
    ) {
      activeSheet = sheet;
    }
  });

  if (!activeSheet) {
    activeSheet = workbook.worksheets[0];
  }

  if (!activeSheet) {
    throw createError('Sheet data pengajuan tidak ditemukan di dalam file Excel.', 400);
  }

  const sheet = activeSheet;

  // Ekstrak info judul atau unit jika ada di baris atas
  let detectedUnit: string | undefined;
  let detectedActivity: string | undefined;

  for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
    const row = sheet.getRow(r);
    const rowText = row.values
      ? (Array.isArray(row.values) ? row.values.join(' ') : String(row.values)).trim()
      : '';

    if (rowText.toLowerCase().includes('unit')) {
      row.eachCell((cell) => {
        const txt = cell.text || String(cell.value || '');
        if (txt.toLowerCase().includes('unit') && txt.length > 5) {
          detectedUnit = txt.replace(/^.*unit\s*[:\-]*/i, '').trim();
        }
      });
    }
    if (rowText.toLowerCase().includes('kegiatan') || rowText.toLowerCase().includes('rencana')) {
      row.eachCell((cell) => {
        const txt = cell.text || String(cell.value || '');
        if (
          (txt.toLowerCase().includes('kegiatan') || txt.toLowerCase().includes('rencana')) &&
          txt.length > 10
        ) {
          detectedActivity = txt.replace(/^.*(kegiatan|rencana)\s*[:\-]*/i, '').trim();
        }
      });
    }
  }

  // 2. Cari baris header secara dinamis (tanpa nomor baris tetap!)
  let headerRowIndex = -1;
  let colIndex = {
    no: -1,
    kategori: -1,
    uraian: -1,
    hargaSatuan: -1,
    volume: -1,
    satuan: -1,
    vol1: -1,
    sat1: -1,
    vol2: -1,
    sat2: -1,
    vol3: -1,
    sat3: -1,
    jumlah: -1,
    keterangan: -1,
    rincian: -1,
    total: -1,
  };

  const maxScanRow = Math.min(sheet.rowCount || 50, 50);

  for (let r = 1; r <= maxScanRow; r++) {
    const row = sheet.getRow(r);
    const cellValues: { col: number; text: string }[] = [];

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = normalizeHeader(cell.text || String(cell.value || ''));
      cellValues.push({ col: colNumber, text });
    });

    let fNo = -1;
    let fKat = -1;
    let fUraian = -1;
    let fHarga = -1;
    let fVol = -1;
    let fSatuan = -1;
    let fVol1 = -1;
    let fSat1 = -1;
    let fVol2 = -1;
    let fSat2 = -1;
    let fVol3 = -1;
    let fSat3 = -1;
    let fJumlah = -1;
    let fKet = -1;
    let fRincian = -1;
    let fTotal = -1;

    for (const { col, text } of cellValues) {
      if (text === 'no' || text === 'nomor') {
        fNo = col;
      } else if (text.includes('kategori') || text.includes('jenis belanja') || text === 'kat') {
        fKat = col;
      } else if (
        text.includes('uraian') ||
        text.includes('nama barang') ||
        text.includes('kebutuhan') ||
        text.includes('belanja kegiatan') ||
        text.includes('kegiatan') ||
        text.includes('barang') ||
        text.includes('deskripsi')
      ) {
        fUraian = col;
      } else if (
        text.includes('harga satuan') ||
        text.includes('harga') ||
        text.includes('tarif') ||
        text.includes('biaya satuan') ||
        text.includes('biaya')
      ) {
        fHarga = col;
      } else if (text.includes('rincian')) {
        fRincian = col;
      } else if (text.startsWith('volume 1') || text.startsWith('vol 1') || text === 'volume1' || text === 'vol1') {
        fVol1 = col;
      } else if (text.startsWith('satuan 1') || text.startsWith('sat 1') || text === 'satuan1' || text === 'sat1') {
        fSat1 = col;
      } else if (text.startsWith('volume 2') || text.startsWith('vol 2') || text === 'volume2' || text === 'vol2') {
        fVol2 = col;
      } else if (text.startsWith('satuan 2') || text.startsWith('sat 2') || text === 'satuan2' || text === 'sat2') {
        fSat2 = col;
      } else if (text.startsWith('volume 3') || text.startsWith('vol 3') || text === 'volume3' || text === 'vol3') {
        fVol3 = col;
      } else if (text.startsWith('satuan 3') || text.startsWith('sat 3') || text === 'satuan3' || text === 'sat3') {
        fSat3 = col;
      } else if (
        text.includes('volume') ||
        text === 'vol' ||
        text === 'qty' ||
        text.includes('kuantitas') ||
        text.includes('jumlah barang')
      ) {
        if (fVol === -1) fVol = col;
      } else if (text === 'satuan' || text.includes('satuan') || text === 'unit') {
        if (fSatuan === -1) fSatuan = col;
      } else if (
        text === 'jumlah' ||
        text.startsWith('jumlah') ||
        text.includes('total harga') ||
        text.includes('subtotal')
      ) {
        fJumlah = col;
      } else if (text === 'total' || text.includes('total')) {
        fTotal = col;
      } else if (text.includes('keterangan') || text === 'ket' || text.includes('catatan')) {
        fKet = col;
      }
    }

    if (fJumlah === -1 && fTotal !== -1) {
      fJumlah = fTotal;
    }

    // Validasi baris header: minimal harus ada uraian dan salah satu dari harga / jumlah / rincian
    if (fUraian !== -1 && (fHarga !== -1 || fJumlah !== -1 || fRincian !== -1)) {
      headerRowIndex = r;

      // Cek apakah ada baris sub-header tepat di bawahnya (misal Row 10 ada Vol 1, Satuan 1, dll)
      if (r < maxScanRow) {
        const nextRow = sheet.getRow(r + 1);
        nextRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const nText = normalizeHeader(cell.text || String(cell.value || ''));
          if (nText.startsWith('volume 1') || nText.startsWith('vol 1') || nText === 'volume1' || nText === 'vol1') fVol1 = colNumber;
          else if (nText.startsWith('satuan 1') || nText.startsWith('sat 1') || nText === 'satuan1' || nText === 'sat1') fSat1 = colNumber;
          else if (nText.startsWith('volume 2') || nText.startsWith('vol 2') || nText === 'volume2' || nText === 'vol2') fVol2 = colNumber;
          else if (nText.startsWith('satuan 2') || nText.startsWith('sat 2') || nText === 'satuan2' || nText === 'sat2') fSat2 = colNumber;
          else if (nText.startsWith('volume 3') || nText.startsWith('vol 3') || nText === 'volume3' || nText === 'vol3') fVol3 = colNumber;
          else if (nText.startsWith('satuan 3') || nText.startsWith('sat 3') || nText === 'satuan3' || nText === 'sat3') fSat3 = colNumber;
        });
        if (fVol1 !== -1) {
          headerRowIndex = r + 1;
        }
      }

      colIndex = {
        no: fNo,
        kategori: fKat,
        uraian: fUraian,
        hargaSatuan: fHarga,
        volume: fVol,
        satuan: fSatuan,
        vol1: fVol1,
        sat1: fSat1,
        vol2: fVol2,
        sat2: fSat2,
        vol3: fVol3,
        sat3: fSat3,
        jumlah: fJumlah,
        keterangan: fKet,
        rincian: fRincian,
        total: fTotal,
      };
      break;
    }
  }

  if (headerRowIndex === -1 || colIndex.uraian === -1) {
    throw createError(
      'Format tabel pengajuan tidak sesuai. Kolom "Uraian Barang / Belanja Kegiatan" tidak ditemukan.',
      400
    );
  }

  // 3. Ekstrak data transaksi belanja
  const items: ParsedSubmissionItem[] = [];
  let detectedTotalExcel = 0;
  let foundTotalRowInExcel = false;
  let currentCategory = 'Umum';

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    // Cek seluruh teks pada baris untuk mendeteksi apakah baris ini Total / Subtotal
    let fullRowText = '';
    row.eachCell((c) => {
      fullRowText += ' ' + (c.text || String(c.value || ''));
    });
    fullRowText = fullRowText.toLowerCase().trim();

    // Deteksi baris TOTAL KESELURUHAN Excel
    const isGrandTotalRow =
      fullRowText.includes('total usulan') ||
      fullRowText.includes('total keseluruhan') ||
      fullRowText.includes('grand total') ||
      fullRowText.includes('jumlah total') ||
      fullRowText.includes('rekapitulasi') ||
      fullRowText.includes('jumlah keseluruhan');

    if (isGrandTotalRow) {
      // Cari nilai nominal total pada baris ini
      row.eachCell((c) => {
        const val = parseNumber(c.value);
        if (val > detectedTotalExcel) {
          detectedTotalExcel = val;
          foundTotalRowInExcel = true;
        }
      });
      return; // SUB-TOTAL DAN TOTAL TIDAK BOLEH DIANGGAP SEBAGAI ITEM TRANSAKSI
    }

    // Ambil nomor baris jika ada
    const noCell = colIndex.no !== -1 ? row.getCell(colIndex.no) : null;
    const noText = (noCell?.text || String(noCell?.value || '')).trim();

    // Ambil teks uraian
    const uraianCell = colIndex.uraian !== -1 ? row.getCell(colIndex.uraian) : null;
    let uraianText = (uraianCell?.text || String(uraianCell?.value || '')).trim();

    if (!uraianText) return;

    // Filter jika diawali kata subtotal / total
    if (uraianText.toLowerCase().startsWith('subtotal') || uraianText.toLowerCase().startsWith('sub total')) {
      return;
    }

    // Ambil harga satuan
    let hargaSatuan = 0;
    if (colIndex.hargaSatuan !== -1) {
      hargaSatuan = parseNumber(row.getCell(colIndex.hargaSatuan).value);
    }

    // Tentukan rentang kolom RINCIAN
    const startRincianCol = colIndex.hargaSatuan !== -1 ? colIndex.hargaSatuan + 1 : colIndex.uraian + 1;
    const endRincianCol = colIndex.jumlah !== -1 ? colIndex.jumlah - 1 : (sheet.columnCount || 13);

    // Cek apakah ada angka volume di kolom rincian
    let hasRincianNumbers = false;
    for (let c = startRincianCol; c <= endRincianCol; c++) {
      const cellVal = row.getCell(c).value;
      if (parseNumber(cellVal) > 0) {
        hasRincianNumbers = true;
        break;
      }
    }

    // Deteksi Header Kategori (misal: "I  ANGGARAN DANA TKA", "II  PELAKSANAAN UJIAN", atau baris romawi tanpa harga/rincian)
    const isRomanNo = /^[IVXLCDM]+\.?$/i.test(noText);
    const romanMatch = uraianText.match(/^([IVXLCDM]+|[A-Z])[\.\)\s\-]+(.*)/i);

    if (isRomanNo || (hargaSatuan === 0 && !hasRincianNumbers && (romanMatch || noText.length === 0 || isNaN(Number(noText))))) {
      let catName = uraianText;
      if (romanMatch && romanMatch[2] && /^[IVXLCDM]+$/i.test(romanMatch[1])) {
        catName = romanMatch[2].trim();
      } else if (romanMatch && romanMatch[2] && /^[A-Z]$/i.test(romanMatch[1]) && uraianText.charAt(1) === '.') {
        catName = romanMatch[2].trim();
      }
      catName = catName.replace(/^[:\-\.]+\s*/, '').trim();
      if (catName && !catName.toLowerCase().startsWith('subtotal') && !catName.toLowerCase().startsWith('total')) {
        currentCategory = catName;
      }
      return; // Baris kategori bukan item transaksi belanja
    }

    // Ambil jumlah dari Excel jika ada
    let jumlah = 0;
    if (colIndex.jumlah !== -1) {
      jumlah = parseNumber(row.getCell(colIndex.jumlah).value);
    }

    // Ekstrak Keterangan Asli dari Excel jika ada kolom keterangan
    let keterangan: string | null = null;
    if (colIndex.keterangan !== -1) {
      const ketText = (row.getCell(colIndex.keterangan).text || String(row.getCell(colIndex.keterangan).value || '')).trim();
      if (ketText) {
        keterangan = ketText.replace(/&#215;/g, '×').replace(/&times;/g, '×');
      }
    }

    // Ekstrak data volume & satuan (Mendukung 1, 2, hingga 3 Perkalian Faktor Sesuai Kebutuhan Unit)
    let finalVolume = 1;
    let finalSatuan = 'Item';
    let rincianVolume: string | null = null;
    const factorList: string[] = [];
    const factorVols: number[] = [];

    if (colIndex.vol1 !== -1) {
      // Menggunakan kolom teridentifikasi vol1, sat1, vol2, sat2, vol3, sat3
      const p1 = parseVolAndUnit(row.getCell(colIndex.vol1), colIndex.sat1 !== -1 ? row.getCell(colIndex.sat1) : null);
      const p2 = colIndex.vol2 !== -1 ? parseVolAndUnit(row.getCell(colIndex.vol2), colIndex.sat2 !== -1 ? row.getCell(colIndex.sat2) : null) : { volume: 0, satuan: '' };
      const p3 = colIndex.vol3 !== -1 ? parseVolAndUnit(row.getCell(colIndex.vol3), colIndex.sat3 !== -1 ? row.getCell(colIndex.sat3) : null) : { volume: 0, satuan: '' };

      if (p1.volume > 0) { factorList.push(`${p1.volume} ${p1.satuan}`.trim()); factorVols.push(p1.volume); }
      if (p2.volume > 0) { factorList.push(`${p2.volume} ${p2.satuan}`.trim()); factorVols.push(p2.volume); }
      if (p3.volume > 0) { factorList.push(`${p3.volume} ${p3.satuan}`.trim()); factorVols.push(p3.volume); }

      finalSatuan = p3.satuan || p2.satuan || p1.satuan || 'Item';
    } else {
      // Pindai semua sel dalam rentang RINCIAN (mendukung pola "102 buah x 5 paket", "9 mapel x 8 pertemuan x 1 bulan", "3 Org")
      const rawCells: { val: any; text: string }[] = [];
      for (let c = startRincianCol; c <= endRincianCol; c++) {
        const cell = row.getCell(c);
        const val = cell.value !== undefined ? cell.value : null;
        const txt = String(cell.text || val || '').trim();
        if (txt && !['x', 'X', '×', '*', '-'].includes(txt)) {
          rawCells.push({ val, text: txt });
        }
      }

      let i = 0;
      while (i < rawCells.length && factorList.length < 3) {
        const item = rawCells[i];
        const num = parseNumber(item.val);
        const cleanDigits = item.text.replace(/[^0-9.,]/g, '').replace(',', '.');

        if (num > 0 && (String(num) === cleanDigits || String(Math.floor(num)) === cleanDigits)) {
          let unit = '';
          if (i + 1 < rawCells.length) {
            const nextItem = rawCells[i + 1];
            const nextNum = parseNumber(nextItem.val);
            if (nextNum === 0 || isNaN(Number(nextItem.text))) {
              unit = nextItem.text;
              i++;
            }
          }
          factorList.push(`${num} ${unit}`.trim());
          factorVols.push(num);
          if (unit) finalSatuan = unit;
        } else {
          const match = item.text.match(/^([0-9.,]+)\s*(.*)$/);
          if (match) {
            const n = parseNumber(match[1]);
            const u = match[2]?.trim() || '';
            if (n > 0) {
              factorList.push(`${n} ${u}`.trim());
              factorVols.push(n);
              if (u) finalSatuan = u;
            }
          }
        }
        i++;
      }
    }

    if (factorVols.length > 0) {
      rincianVolume = factorList.join(' × ');
      const totalMultiplied = factorVols.reduce((acc, v) => acc * (v > 0 ? v : 1), 1);
      finalVolume = totalMultiplied;
    } else if (colIndex.volume !== -1) {
      // Format volume tunggal lama
      finalVolume = parseNumber(row.getCell(colIndex.volume).value) || 1;
      if (colIndex.satuan !== -1) {
        finalSatuan = String(row.getCell(colIndex.satuan).text || row.getCell(colIndex.satuan).value || '').trim() || 'Item';
      }
    }

    // Jika jumlah di Excel kosong atau formula belum dievaluasi, hitung dari hargaSatuan * finalVolume
    if (jumlah === 0 && hargaSatuan > 0 && finalVolume > 0) {
      jumlah = hargaSatuan * finalVolume;
    } else if (hargaSatuan === 0 && finalVolume > 0 && jumlah > 0) {
      hargaSatuan = Math.round(jumlah / finalVolume);
    }

    // Abaikan baris jika tidak ada nominal biaya
    if (jumlah <= 0 && hargaSatuan <= 0) {
      return;
    }

    // Kategori
    let kategori = currentCategory;
    if (colIndex.kategori !== -1) {
      const katText = (row.getCell(colIndex.kategori).text || String(row.getCell(colIndex.kategori).value || '')).trim();
      if (katText) kategori = katText;
    }

    // Bersihkan penomoran awal dari uraian jika ada (misal "1. Pengadaan..." -> "Pengadaan...")
    let cleanUraian = uraianText.replace(/^([0-9]+|[a-z])[\.\)\-]+\s*/i, '').trim();
    if (!cleanUraian) cleanUraian = uraianText;

    // Keterangan gabungan yang bersih
    let finalKeterangan = keterangan;
    if (rincianVolume && !keterangan) {
      finalKeterangan = rincianVolume;
    } else if (rincianVolume && keterangan && !keterangan.includes(rincianVolume)) {
      finalKeterangan = `${rincianVolume} • ${keterangan}`;
    }

    items.push({
      no: items.length + 1,
      kategori,
      uraian: cleanUraian,
      hargaSatuan,
      volume: finalVolume,
      satuan: finalSatuan,
      jumlah,
      keterangan: finalKeterangan,
      rincianVolume,
    });
  });

  if (items.length === 0) {
    throw createError('Tidak ada baris transaksi belanja yang dapat dibaca dari file Excel tersebut.', 400);
  }

  // Hitung total hasil kalkulasi parsing
  const totalParsing = items.reduce((acc, item) => acc + item.jumlah, 0);

  // Jika di baris Excel tidak ditemukan baris Total eksplisit, gunakan totalParsing
  if (!foundTotalRowInExcel || detectedTotalExcel === 0) {
    detectedTotalExcel = totalParsing;
  }

  const selisih = detectedTotalExcel - totalParsing;
  const hasMismatch = Math.abs(selisih) > 0.01;

  let mismatchWarning: string | undefined;
  if (hasMismatch) {
    mismatchWarning = 'Total Excel dan hasil parsing berbeda. Silakan periksa data sebelum menyimpan.';
  }

  return {
    sheetName: sheet.name,
    headerRow: headerRowIndex,
    unitInfo: detectedUnit,
    activityInfo: detectedActivity,
    totalExcel: detectedTotalExcel,
    totalParsing,
    selisih,
    hasMismatch,
    mismatchWarning,
    items,
    totalItems: items.length,
  };
}
