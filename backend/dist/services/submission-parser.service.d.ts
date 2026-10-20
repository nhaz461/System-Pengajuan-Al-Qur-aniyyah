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
/**
 * Parser Excel Pengajuan Unit (Sesuai Aturan E, F, G)
 */
export declare function parseSubmissionExcel(filePathOrBuffer: string | Buffer): Promise<SubmissionParseResult>;
//# sourceMappingURL=submission-parser.service.d.ts.map