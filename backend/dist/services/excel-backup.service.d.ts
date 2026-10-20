import ExcelJS from 'exceljs';
export declare const getLocalBackupDirs: () => string[];
/**
 * Generate workbook Excel lengkap yang menghimpun seluruh data keuangan yayasan
 */
export declare function buildFullDatabaseWorkbook(): Promise<ExcelJS.Workbook>;
/**
 * Simpan backup Excel otomatis ke penyimpanan lokal komputer
 */
export declare function saveLocalExcelBackup(): Promise<{
    savedFiles: string[];
    filename: string;
    sizeBytes: number;
    sizeFormatted: string;
    timestamp: string;
}>;
/**
 * Panggil fungsi ini setiap kali ada perubahan data di aplikasi.
 * Fungsi ini menggunakan debounce 3 detik agar hemat resource dan tidak menumpuk write file.
 */
export declare function triggerAutoBackupExcel(sourceAction?: string): void;
//# sourceMappingURL=excel-backup.service.d.ts.map