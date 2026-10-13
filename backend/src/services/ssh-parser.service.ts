import ExcelJS from 'exceljs';
import { createError } from '../middleware/error.middleware';

export interface ParsedSshItem {
  no?: number;
  kode: string | null;
  kategori: string;
  uraian: string;
  satuan: string;
  hargaSsh: number;
  keterangan: string | null;
}

export interface SshParseResult {
  sheetName: string;
  headerRow: number;
  totalItems: number;
  items: ParsedSshItem[];
  sampleItems: ParsedSshItem[];
}

/**
 * Normalisasi string untuk pencarian header (lowercase, buang spasi lebih, buang karakter khusus)
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Parsing file Master SSH Yayasan 2026
 * Sesuai Aturan:
 * 1. Sheet resmi: "SSH 2026" (cari sheet dengan nama ini, case-insensitive)
 * 2. Deteksi header secara dinamis, tanpa baris fixed
 * 3. Jika kode tidak tersedia di file, JANGAN buat kode palsu (tetap null)
 * 4. Filter subtotal / total agar tidak masuk sebagai item
 */
export async function parseSshExcel(filePathOrBuffer: string | Buffer): Promise<SshParseResult> {
  const workbook = new ExcelJS.Workbook();

  let buf: Buffer;
  if (typeof filePathOrBuffer === 'string') {
    const rawBuf = require('fs').readFileSync(filePathOrBuffer);
    buf = sanitizeXlsxBuffer(rawBuf);
  } else {
    buf = sanitizeXlsxBuffer(filePathOrBuffer);
  }

  await workbook.xlsx.load(buf);

  // 1. Cari sheet "SSH 2026"
  let targetSheet: ExcelJS.Worksheet | undefined;
  workbook.eachSheet((sheet) => {
    const sName = sheet.name.trim().toLowerCase();
    if (sName === 'ssh 2026' || sName === 'ssh_2026' || sName === 'ssh2026') {
      targetSheet = sheet;
    }
  });

  if (!targetSheet) {
    // Coba periksa apakah hanya ada satu sheet dan namanya mirip SSH
    workbook.eachSheet((sheet) => {
      if (!targetSheet && sheet.name.toLowerCase().includes('ssh')) {
        targetSheet = sheet;
      }
    });
  }

  if (!targetSheet) {
    throw createError('Sheet SSH 2026 tidak ditemukan di dalam file Excel.', 400);
  }

  const sheet = targetSheet;

  // 2. Cari header row secara dinamis
  let headerRowIndex = -1;
  let colIndex = {
    kode: -1,
    kategori: -1,
    uraian: -1,
    satuan: -1,
    harga: -1,
    keterangan: -1,
  };

  const rowCount = Math.min(sheet.rowCount || 50, 50); // Cari dalam 50 baris pertama

  for (let r = 1; r <= rowCount; r++) {
    const row = sheet.getRow(r);
    const cellValues: { col: number; text: string }[] = [];

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = normalizeHeader(cell.text || String(cell.value || ''));
      cellValues.push({ col: colNumber, text });
    });

    // Cek apakah baris ini memuat kata kunci penting: 'uraian' atau 'barang' dan 'harga' atau 'satuan'
    let foundUraian = -1;
    let foundHarga = -1;
    let foundSatuan = -1;
    let foundKategori = -1;
    let foundKode = -1;
    let foundKet = -1;

    for (const { col, text } of cellValues) {
      if (text.includes('kode') || text === 'kd') {
        foundKode = col;
      } else if (text.includes('kategori') || text.includes('kelompok') || text === 'kat') {
        foundKategori = col;
      } else if (
        text.includes('uraian') ||
        text.includes('nama barang') ||
        text.includes('belanja') ||
        text.includes('item')
      ) {
        foundUraian = col;
      } else if (text === 'satuan' || text.includes('satuan') || text === 'unit') {
        foundSatuan = col;
      } else if (
        text.includes('harga') ||
        text.includes('ssh') ||
        text.includes('tarif') ||
        text.includes('standar')
      ) {
        foundHarga = col;
      } else if (text.includes('keterangan') || text === 'ket' || text.includes('catatan')) {
        foundKet = col;
      }
    }

    // Jika menemukan minimal uraian dan harga (atau satuan)
    if (foundUraian !== -1 && (foundHarga !== -1 || foundSatuan !== -1)) {
      headerRowIndex = r;
      colIndex = {
        kode: foundKode,
        kategori: foundKategori,
        uraian: foundUraian,
        satuan: foundSatuan,
        harga: foundHarga,
        keterangan: foundKet,
      };
      break;
    }
  }

  if (headerRowIndex === -1 || colIndex.uraian === -1 || colIndex.harga === -1) {
    throw createError(
      'Format tabel SSH tidak valid. Kolom "Uraian" dan "Harga Standar SSH" tidak ditemukan.',
      400
    );
  }

  // 3. Baca data transaksi setelah header
  const items: ParsedSshItem[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    const uraianCell = colIndex.uraian !== -1 ? row.getCell(colIndex.uraian) : null;
    const uraianText = (uraianCell?.text || String(uraianCell?.value || '')).trim();

    // Abaikan baris kosong
    if (!uraianText) return;

    // Filter subtotal / total / judul tabel
    const lowerUraian = uraianText.toLowerCase();
    if (
      lowerUraian.startsWith('total') ||
      lowerUraian.startsWith('subtotal') ||
      lowerUraian.startsWith('sub total') ||
      lowerUraian.startsWith('jumlah') ||
      lowerUraian.startsWith('rekapitulasi')
    ) {
      return;
    }

    // Ambil harga
    const hargaCell = colIndex.harga !== -1 ? row.getCell(colIndex.harga) : null;
    let hargaValue = 0;

    if (typeof hargaCell?.value === 'number') {
      hargaValue = hargaCell.value;
    } else {
      const rawHarga = (hargaCell?.text || String(hargaCell?.value || ''))
        .replace(/[^0-9.,]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      hargaValue = parseFloat(rawHarga) || 0;
    }

    // Jika harga 0 atau tidak valid, periksa apakah baris ini catatan / header kategori
    if (hargaValue <= 0) {
      return;
    }

    // Ambil kode jika ada
    let kode: string | null = null;
    if (colIndex.kode !== -1) {
      const kCell = row.getCell(colIndex.kode);
      const kText = (kCell.text || String(kCell.value || '')).trim();
      if (kText && kText.length > 1) {
        kode = kText;
      }
    }

    // Ambil kategori
    let kategori = 'Umum';
    if (colIndex.kategori !== -1) {
      const katCell = row.getCell(colIndex.kategori);
      const katText = (katCell.text || String(katCell.value || '')).trim();
      if (katText) kategori = katText;
    }

    // Ambil satuan
    let satuan = 'Item';
    if (colIndex.satuan !== -1) {
      const satCell = row.getCell(colIndex.satuan);
      const satText = (satCell.text || String(satCell.value || '')).trim();
      if (satText) satuan = satText;
    }

    // Ambil keterangan
    let keterangan: string | null = null;
    if (colIndex.keterangan !== -1) {
      const ketCell = row.getCell(colIndex.keterangan);
      const ketText = (ketCell.text || String(ketCell.value || '')).trim();
      if (ketText) keterangan = ketText;
    }

    items.push({
      no: items.length + 1,
      kode,
      kategori,
      uraian: uraianText,
      satuan,
      hargaSsh: hargaValue,
      keterangan,
    });
  });

  if (items.length === 0) {
    throw createError('Tidak ada data item SSH yang dapat dibaca dari file Excel tersebut.', 400);
  }

  return {
    sheetName: sheet.name,
    headerRow: headerRowIndex,
    totalItems: items.length,
    items,
    sampleItems: items.slice(0, 10), // 10 baris pertama untuk preview cepat
  };
}
