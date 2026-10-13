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
 * Parsing file Master SSH Yayasan 2026
 * Sesuai Aturan:
 * 1. Sheet resmi: "SSH 2026" (cari sheet dengan nama ini, case-insensitive)
 * 2. Deteksi header secara dinamis, tanpa baris fixed
 * 3. Jika kode tidak tersedia di file, JANGAN buat kode palsu (tetap null)
 * 4. Filter subtotal / total agar tidak masuk sebagai item
 */
export declare function parseSshExcel(filePathOrBuffer: string | Buffer): Promise<SshParseResult>;
//# sourceMappingURL=ssh-parser.service.d.ts.map