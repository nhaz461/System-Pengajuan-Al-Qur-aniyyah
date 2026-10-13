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
    jumlah: -1,
    keterangan: -1,
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
    let fJumlah = -1;
    let fKet = -1;

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
        text.includes('barang') ||
        text.includes('deskripsi')
      ) {
        fUraian = col;
      } else if (
        text.includes('harga satuan') ||
        text.includes('harga') ||
        text.includes('tarif') ||
        text.includes('biaya satuan')
      ) {
        fHarga = col;
      } else if (
        text.includes('volume') ||
        text === 'vol' ||
        text === 'qty' ||
        text.includes('kuantitas') ||
        text.includes('jumlah barang')
      ) {
        fVol = col;
      } else if (text === 'satuan' || text.includes('satuan') || text === 'unit') {
        fSatuan = col;
      } else if (
        text.includes('jumlah') ||
        text === 'total' ||
        text.includes('total harga') ||
        text.includes('subtotal')
      ) {
        fJumlah = col;
      } else if (text.includes('keterangan') || text === 'ket' || text.includes('catatan')) {
        fKet = col;
      }
    }

    // Validasi baris header: minimal harus ada uraian dan salah satu dari harga / jumlah
    if (fUraian !== -1 && (fHarga !== -1 || fJumlah !== -1)) {
      headerRowIndex = r;
      colIndex = {
        no: fNo,
        kategori: fKat,
        uraian: fUraian,
        hargaSatuan: fHarga,
        volume: fVol,
        satuan: fSatuan,
        jumlah: fJumlah,
        keterangan: fKet,
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

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    // Cek seluruh teks pada baris untuk mendeteksi apakah baris ini Total / Subtotal
    let fullRowText = '';
    row.eachCell((c) => {
      fullRowText += ' ' + (c.text || String(c.value || ''));
    });
    fullRowText = fullRowText.toLowerCase().trim();

    // Deteksi baris TOTAL Excel
    const isTotalRow =
      fullRowText.includes('total') ||
      fullRowText.includes('jumlah total') ||
      fullRowText.includes('grand total') ||
      fullRowText.includes('rekapitulasi') ||
      fullRowText.includes('jumlah keseluruhan');

    if (isTotalRow) {
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

    // Ambil teks uraian
    const uraianCell = colIndex.uraian !== -1 ? row.getCell(colIndex.uraian) : null;
    const uraianText = (uraianCell?.text || String(uraianCell?.value || '')).trim();

    if (!uraianText) return;

    // Filter jika diawali kata subtotal
    if (uraianText.toLowerCase().startsWith('subtotal') || uraianText.toLowerCase().startsWith('sub total')) {
      return;
    }

    // Ambil harga satuan
    let hargaSatuan = 0;
    if (colIndex.hargaSatuan !== -1) {
      hargaSatuan = parseNumber(row.getCell(colIndex.hargaSatuan).value);
    }

    // Ambil volume
    let volume = 1;
    if (colIndex.volume !== -1) {
      const volVal = parseNumber(row.getCell(colIndex.volume).value);
      if (volVal > 0) volume = volVal;
    }

    // Ambil jumlah
    let jumlah = 0;
    if (colIndex.jumlah !== -1) {
      jumlah = parseNumber(row.getCell(colIndex.jumlah).value);
    }

    // Jika jumlah belum ada atau 0, hitung dari volume * hargaSatuan
    if (jumlah === 0 && hargaSatuan > 0 && volume > 0) {
      jumlah = volume * hargaSatuan;
    } else if (hargaSatuan === 0 && volume > 0 && jumlah > 0) {
      hargaSatuan = Math.round(jumlah / volume);
    }

    // Abaikan jika tidak ada nominal biaya
    if (jumlah <= 0 && hargaSatuan <= 0) {
      return;
    }

    // Kategori
    let kategori = 'Umum';
    if (colIndex.kategori !== -1) {
      const katText = (row.getCell(colIndex.kategori).text || String(row.getCell(colIndex.kategori).value || '')).trim();
      if (katText) kategori = katText;
    }

    // Satuan
    let satuan = 'Item';
    if (colIndex.satuan !== -1) {
      const satText = (row.getCell(colIndex.satuan).text || String(row.getCell(colIndex.satuan).value || '')).trim();
      if (satText) satuan = satText;
    }

    // Keterangan
    let keterangan: string | null = null;
    if (colIndex.keterangan !== -1) {
      const ketText = (row.getCell(colIndex.keterangan).text || String(row.getCell(colIndex.keterangan).value || '')).trim();
      if (ketText) keterangan = ketText;
    }

    items.push({
      no: items.length + 1,
      kategori,
      uraian: uraianText,
      hargaSatuan,
      volume,
      satuan,
      jumlah,
      keterangan,
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
