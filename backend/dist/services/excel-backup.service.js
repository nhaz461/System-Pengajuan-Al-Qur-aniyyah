"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalBackupDirs = void 0;
exports.buildFullDatabaseWorkbook = buildFullDatabaseWorkbook;
exports.saveLocalExcelBackup = saveLocalExcelBackup;
exports.triggerAutoBackupExcel = triggerAutoBackupExcel;
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
// Direktori penyimpanan backup Excel lokal
const getLocalBackupDirs = () => {
    const dirs = [];
    // 1. Portable backups directory
    const portableDir = path_1.default.resolve('D:/Sistem_Keuangan_Portable/backups');
    dirs.push(portableDir);
    // 2. Project backups directory
    const projectDir = path_1.default.resolve(__dirname, '../../../backups');
    if (projectDir !== portableDir && !dirs.includes(projectDir)) {
        dirs.push(projectDir);
    }
    // 3. Folder Data Base Keuangan (jika ada di drive D:)
    const dbKeuanganDir = 'D:/Data Base Keuangan';
    if (fs_1.default.existsSync(dbKeuanganDir) && !dirs.includes(dbKeuanganDir)) {
        dirs.push(dbKeuanganDir);
    }
    // Pastikan semua direktori ada
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            try {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            catch (_) { }
        }
        const historyDir = path_1.default.join(dir, 'riwayat');
        if (!fs_1.default.existsSync(historyDir)) {
            try {
                fs_1.default.mkdirSync(historyDir, { recursive: true });
            }
            catch (_) { }
        }
    }
    return dirs;
};
exports.getLocalBackupDirs = getLocalBackupDirs;
/**
 * Generate workbook Excel lengkap yang menghimpun seluruh data keuangan yayasan
 */
async function buildFullDatabaseWorkbook() {
    const wb = new exceljs_1.default.Workbook();
    wb.creator = "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah";
    wb.lastModifiedBy = "Sistem Keuangan Al-Qur'aniyyah";
    wb.created = new Date();
    wb.modified = new Date();
    // Ambil seluruh data dari database
    const submissions = await prisma_1.default.submission.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            unit: true,
            activity: true,
            fiscalYear: true,
            submittedBy: true,
            approvedBy: true,
            disbursedBy: true,
            items: {
                orderBy: { itemNumber: 'asc' },
                include: { sshItem: true },
            },
            disbursements: {
                orderBy: { disbursedAt: 'desc' },
            },
        },
    });
    const sshItems = await prisma_1.default.sshItem.findMany({
        orderBy: [{ kategori: 'asc' }, { uraian: 'asc' }],
        include: { sshVersion: true },
    });
    const units = await prisma_1.default.unit.findMany({ orderBy: { name: 'asc' } });
    const activities = await prisma_1.default.activity.findMany({ orderBy: { name: 'asc' } });
    const auditLogs = await prisma_1.default.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { user: true },
    });
    // Helper Styling
    const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const borderThin = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    // ══════════════════════════════════════════════════════════════════
    // SHEET 1: REKAP PENGAJUAN & REVIEW
    // ══════════════════════════════════════════════════════════════════
    const wsRekap = wb.addWorksheet('Rekap Pengajuan & Review', {
        views: [{ showGridLines: true }],
    });
    // Title Banner
    wsRekap.mergeCells('B2:N2');
    wsRekap.getCell('B2').value = "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH";
    wsRekap.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1B4332' } };
    wsRekap.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.mergeCells('B3:N3');
    wsRekap.getCell('B3').value = "DATABASE REKAPITULASI PENGAJUAN, REVIEW KEUSAHAAN & PENCAIRAN ANGGARAN (TA 2026)";
    wsRekap.getCell('B3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF2D6A4F' } };
    wsRekap.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.mergeCells('B4:N4');
    wsRekap.getCell('B4').value = `Data Otomatis Terhimpun per: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}`;
    wsRekap.getCell('B4').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
    wsRekap.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };
    // Headers
    const rekapHeaders = [
        'No',
        'Nomor Pengajuan',
        'Unit Pemohon',
        'Agenda Kegiatan',
        'Tahun',
        'Tanggal Pelaksanaan',
        'Nama PIC',
        'Status Pengajuan',
        'Jml Item',
        'Total Pengajuan Awal (Rp)',
        'Total Hasil Review (Rp)',
        'Efisiensi Penghematan (Rp)',
        'Tanggal Upload',
    ];
    const rRow = wsRekap.getRow(6);
    rekapHeaders.forEach((h, idx) => {
        const c = rRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
        c.alignment = {
            horizontal: idx === 1 || idx === 2 || idx === 3 ? 'left' : idx >= 9 ? 'right' : 'center',
            vertical: 'middle',
        };
        c.border = borderThin;
    });
    rRow.height = 26;
    let rRowIdx = 7;
    submissions.forEach((sub, sIdx) => {
        let totOrig = 0;
        let totRev = 0;
        sub.items.forEach((it) => {
            totOrig += it.volume * it.originalPrice;
            const eff = it.reviewPrice !== null && it.reviewPrice !== undefined ? it.reviewPrice : it.originalPrice;
            totRev += it.volume * eff;
        });
        const hemat = Math.max(0, totOrig - totRev);
        const row = wsRekap.getRow(rRowIdx);
        row.getCell(2).value = sIdx + 1;
        row.getCell(3).value = sub.submissionNumber;
        row.getCell(4).value = sub.unit.name;
        row.getCell(5).value = sub.activity.name;
        row.getCell(6).value = sub.fiscalYear.year;
        row.getCell(7).value = sub.activityDate ? new Date(sub.activityDate).toLocaleDateString('id-ID') : '-';
        row.getCell(8).value = sub.picName || '-';
        row.getCell(9).value = sub.status.replace(/_/g, ' ');
        row.getCell(10).value = sub.items.length;
        row.getCell(11).value = totOrig;
        row.getCell(12).value = totRev;
        row.getCell(13).value = hemat;
        row.getCell(14).value = new Date(sub.createdAt).toLocaleDateString('id-ID');
        for (let c = 2; c <= 14; c++) {
            const cell = row.getCell(c);
            cell.font = { name: 'Arial', size: 9 };
            cell.border = borderThin;
            if (c === 2 || c === 6 || c === 7 || c === 9 || c === 10 || c === 14) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            else if (c >= 11 && c <= 13) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
                cell.font = { name: 'Arial', size: 9, bold: c === 12 };
            }
            else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        }
        rRowIdx++;
    });
    // Total Baris Rekap
    const totalRekapRow = wsRekap.getRow(rRowIdx);
    totalRekapRow.getCell(2).value = '';
    wsRekap.mergeCells(`B${rRowIdx}:J${rRowIdx}`);
    totalRekapRow.getCell(2).value = 'TOTAL KESELURUHAN PENGAJUAN';
    totalRekapRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    totalRekapRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRekapRow.getCell(11).value = { formula: `SUM(K7:K${rRowIdx - 1})`, result: 0 };
    totalRekapRow.getCell(11).numFmt = '#,##0';
    totalRekapRow.getCell(11).font = { name: 'Arial', size: 10, bold: true };
    totalRekapRow.getCell(12).value = { formula: `SUM(L7:L${rRowIdx - 1})`, result: 0 };
    totalRekapRow.getCell(12).numFmt = '#,##0';
    totalRekapRow.getCell(12).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    totalRekapRow.getCell(13).value = { formula: `SUM(M7:M${rRowIdx - 1})`, result: 0 };
    totalRekapRow.getCell(13).numFmt = '#,##0';
    totalRekapRow.getCell(13).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2D6A4F' } };
    for (let c = 2; c <= 14; c++) {
        const cell = totalRekapRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF1B4332' } },
            bottom: { style: 'double', color: { argb: 'FF1B4332' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
    }
    // Atur lebar kolom Sheet 1
    wsRekap.getColumn(1).width = 3;
    wsRekap.getColumn(2).width = 6;
    wsRekap.getColumn(3).width = 24;
    wsRekap.getColumn(4).width = 26;
    wsRekap.getColumn(5).width = 30;
    wsRekap.getColumn(6).width = 8;
    wsRekap.getColumn(7).width = 18;
    wsRekap.getColumn(8).width = 22;
    wsRekap.getColumn(9).width = 18;
    wsRekap.getColumn(10).width = 10;
    wsRekap.getColumn(11).width = 22;
    wsRekap.getColumn(12).width = 22;
    wsRekap.getColumn(13).width = 22;
    wsRekap.getColumn(14).width = 15;
    // ══════════════════════════════════════════════════════════════════
    // SHEET 2: RINCIAN ITEM BELANJA & VOLUME BERTINGKAT
    // ══════════════════════════════════════════════════════════════════
    const wsItems = wb.addWorksheet('Rincian Item Belanja & Volume', {
        views: [{ showGridLines: true }],
    });
    // Title Banner
    wsItems.mergeCells('B2:S2');
    wsItems.getCell('B2').value = "RINCIAN ITEM BELANJA, PERKALIAN VOLUME & HASIL REVIEW KEUSAHAAN";
    wsItems.getCell('B2').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1B4332' } };
    wsItems.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    wsItems.mergeCells('B3:S3');
    wsItems.getCell('B3').value = "Menghimpun seluruh faktor perkalian 1x, 2x, 3x, penyesuaian kuantitas, harga pengajuan, SSH, dan harga review disetujui.";
    wsItems.getCell('B3').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
    wsItems.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
    const itemHeaders = [
        'No',
        'Nomor Pengajuan',
        'Unit',
        'No Item',
        'Kategori Belanja',
        'Uraian Barang / Kegiatan',
        'Rincian Faktor Pengajuan Asli',
        'Rincian Faktor Disetujui (Review)',
        'Vol Pengajuan',
        'Vol Review',
        'Satuan',
        'Harga Pengajuan (Rp)',
        'Harga SSH (Rp)',
        'Harga Review (Rp)',
        'Subtotal Pengajuan (Rp)',
        'Subtotal Review (Rp)',
        'Status SSH',
        'Catatan Reviewer',
    ];
    const itRow = wsItems.getRow(5);
    itemHeaders.forEach((h, idx) => {
        const c = itRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
        c.alignment = {
            horizontal: idx === 1 || idx === 2 || idx === 4 || idx === 5 || idx === 6 || idx === 7 ? 'left' : idx >= 11 && idx <= 15 ? 'right' : 'center',
            vertical: 'middle',
        };
        c.border = borderThin;
    });
    itRow.height = 26;
    let itRowIdx = 6;
    let runningNo = 1;
    submissions.forEach((sub) => {
        sub.items.forEach((it) => {
            const effPrice = it.reviewPrice !== null && it.reviewPrice !== undefined ? it.reviewPrice : it.originalPrice;
            const subtotalAwal = it.volume * it.originalPrice;
            const subtotalRev = it.volume * effPrice;
            const row = wsItems.getRow(itRowIdx);
            row.getCell(2).value = runningNo++;
            row.getCell(3).value = sub.submissionNumber;
            row.getCell(4).value = sub.unit.code || sub.unit.name;
            row.getCell(5).value = it.itemNumber;
            row.getCell(6).value = it.kategori;
            row.getCell(7).value = it.uraian;
            row.getCell(8).value = it.keterangan || '-';
            row.getCell(9).value = it.reviewNote || (it.keterangan ? `Disetujui: ${it.keterangan}` : '-');
            row.getCell(10).value = it.volume;
            row.getCell(11).value = it.volume;
            row.getCell(12).value = it.satuan;
            row.getCell(13).value = it.originalPrice;
            row.getCell(14).value = it.sshPrice || '-';
            row.getCell(15).value = effPrice;
            row.getCell(16).value = subtotalAwal;
            row.getCell(17).value = subtotalRev;
            row.getCell(18).value = it.sshStatus?.replace(/_/g, ' ') || 'NON-SSH';
            row.getCell(19).value = it.reviewNote || '-';
            for (let c = 2; c <= 19; c++) {
                const cell = row.getCell(c);
                cell.font = { name: 'Arial', size: 9 };
                cell.border = borderThin;
                if (c === 2 || c === 5 || c === 10 || c === 11 || c === 12 || c === 18) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
                else if (c >= 13 && c <= 17) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                    if (c === 17) {
                        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1B4332' } };
                    }
                }
                else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            }
            itRowIdx++;
        });
    });
    // Total Baris Items
    const totalItemRow = wsItems.getRow(itRowIdx);
    wsItems.mergeCells(`B${itRowIdx}:O${itRowIdx}`);
    totalItemRow.getCell(2).value = 'TOTAL KESELURUHAN ITEM BELANJA';
    totalItemRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    totalItemRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    totalItemRow.getCell(16).value = { formula: `SUM(P6:P${itRowIdx - 1})`, result: 0 };
    totalItemRow.getCell(16).numFmt = '#,##0';
    totalItemRow.getCell(16).font = { name: 'Arial', size: 10, bold: true };
    totalItemRow.getCell(17).value = { formula: `SUM(Q6:Q${itRowIdx - 1})`, result: 0 };
    totalItemRow.getCell(17).numFmt = '#,##0';
    totalItemRow.getCell(17).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    for (let c = 2; c <= 19; c++) {
        const cell = totalItemRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF1B4332' } },
            bottom: { style: 'double', color: { argb: 'FF1B4332' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
    }
    // Lebar kolom Sheet 2
    wsItems.getColumn(1).width = 3;
    wsItems.getColumn(2).width = 6;
    wsItems.getColumn(3).width = 22;
    wsItems.getColumn(4).width = 12;
    wsItems.getColumn(5).width = 8;
    wsItems.getColumn(6).width = 16;
    wsItems.getColumn(7).width = 36;
    wsItems.getColumn(8).width = 28;
    wsItems.getColumn(9).width = 28;
    wsItems.getColumn(10).width = 14;
    wsItems.getColumn(11).width = 14;
    wsItems.getColumn(12).width = 12;
    wsItems.getColumn(13).width = 16;
    wsItems.getColumn(14).width = 16;
    wsItems.getColumn(15).width = 16;
    wsItems.getColumn(16).width = 18;
    wsItems.getColumn(17).width = 18;
    wsItems.getColumn(18).width = 18;
    wsItems.getColumn(19).width = 28;
    // ══════════════════════════════════════════════════════════════════
    // SHEET 3: PENCAIRAN ANGGARAN & SPPD
    // ══════════════════════════════════════════════════════════════════
    const wsDisb = wb.addWorksheet('Pencairan Anggaran & SPPD', {
        views: [{ showGridLines: true }],
    });
    wsDisb.mergeCells('B2:M2');
    wsDisb.getCell('B2').value = "REKAPITULASI PENCAIRAN ANGGARAN (SPPD & KUITANSI BENDAHARA)";
    wsDisb.getCell('B2').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1B4332' } };
    wsDisb.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    const disbHeaders = [
        'No',
        'No. Pengajuan',
        'No. Kuitansi / Ref',
        'Tanggal Pencairan',
        'Unit Pemohon',
        'Agenda Kegiatan',
        'Penerima Dana',
        'Nominal Pencairan (Rp)',
        'Metode Bayar',
        'Bank / Rekening',
        'Diserahkan Oleh',
        'Disetujui Oleh',
    ];
    const dRow = wsDisb.getRow(4);
    disbHeaders.forEach((h, idx) => {
        const c = dRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF144E36' } };
        c.alignment = {
            horizontal: idx === 1 || idx === 2 || idx === 4 || idx === 5 || idx === 6 ? 'left' : idx === 7 ? 'right' : 'center',
            vertical: 'middle',
        };
        c.border = borderThin;
    });
    dRow.height = 26;
    let dRowIdx = 5;
    let disbNo = 1;
    submissions.forEach((sub) => {
        sub.disbursements.forEach((d) => {
            const row = wsDisb.getRow(dRowIdx);
            row.getCell(2).value = disbNo++;
            row.getCell(3).value = sub.submissionNumber;
            row.getCell(4).value = d.referenceNumber || '-';
            row.getCell(5).value = new Date(d.disbursedAt).toLocaleDateString('id-ID');
            row.getCell(6).value = sub.unit.name;
            row.getCell(7).value = sub.activity.name;
            row.getCell(8).value = d.recipientName;
            row.getCell(9).value = d.amount;
            row.getCell(10).value = d.paymentMethod;
            row.getCell(11).value = d.bankName ? `${d.bankName} - ${d.accountNumber || ''}` : '-';
            row.getCell(12).value = sub.disbursedBy?.name || 'Bendahara Umum';
            row.getCell(13).value = sub.approvedBy?.name || 'Ketua Umum';
            for (let c = 2; c <= 13; c++) {
                const cell = row.getCell(c);
                cell.font = { name: 'Arial', size: 9 };
                cell.border = borderThin;
                if (c === 2 || c === 5 || c === 10) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
                else if (c === 9) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    cell.numFmt = '#,##0';
                    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1B4332' } };
                }
                else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            }
            dRowIdx++;
        });
    });
    // Lebar kolom Sheet 3
    wsDisb.getColumn(1).width = 3;
    wsDisb.getColumn(2).width = 6;
    wsDisb.getColumn(3).width = 22;
    wsDisb.getColumn(4).width = 22;
    wsDisb.getColumn(5).width = 16;
    wsDisb.getColumn(6).width = 24;
    wsDisb.getColumn(7).width = 28;
    wsDisb.getColumn(8).width = 24;
    wsDisb.getColumn(9).width = 22;
    wsDisb.getColumn(10).width = 14;
    wsDisb.getColumn(11).width = 22;
    wsDisb.getColumn(12).width = 24;
    wsDisb.getColumn(13).width = 24;
    // ══════════════════════════════════════════════════════════════════
    // SHEET 4: MASTER STANDAR SATUAN HARGA (SSH 2026)
    // ══════════════════════════════════════════════════════════════════
    const wsSsh = wb.addWorksheet('Master SSH 2026', {
        views: [{ showGridLines: true }],
    });
    wsSsh.mergeCells('B2:H2');
    wsSsh.getCell('B2').value = "MASTER STANDAR SATUAN HARGA (SSH 2026) YAYASAN AL-QUR'ANIYYAH";
    wsSsh.getCell('B2').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1B4332' } };
    wsSsh.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    const sshHeaders = [
        'No',
        'Kode SSH',
        'Kategori',
        'Uraian Barang / Belanja',
        'Spesifikasi',
        'Satuan',
        'Harga Standar SSH (Rp)',
    ];
    const sRow = wsSsh.getRow(4);
    sshHeaders.forEach((h, idx) => {
        const c = sRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
        c.alignment = {
            horizontal: idx === 1 || idx === 2 || idx === 3 || idx === 4 ? 'left' : idx === 6 ? 'right' : 'center',
            vertical: 'middle',
        };
        c.border = borderThin;
    });
    sRow.height = 26;
    let sRowIdx = 5;
    sshItems.forEach((it, idx) => {
        const row = wsSsh.getRow(sRowIdx);
        row.getCell(2).value = idx + 1;
        row.getCell(3).value = it.kode;
        row.getCell(4).value = it.kategori;
        row.getCell(5).value = it.uraian;
        row.getCell(6).value = it.keterangan || '-';
        row.getCell(7).value = it.satuan;
        row.getCell(8).value = it.hargaSsh;
        for (let c = 2; c <= 8; c++) {
            const cell = row.getCell(c);
            cell.font = { name: 'Arial', size: 9 };
            cell.border = borderThin;
            if (c === 2 || c === 3 || c === 7) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            else if (c === 8) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
                cell.font = { name: 'Arial', size: 9, bold: true };
            }
            else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        }
        sRowIdx++;
    });
    // Lebar kolom Sheet 4
    wsSsh.getColumn(1).width = 3;
    wsSsh.getColumn(2).width = 6;
    wsSsh.getColumn(3).width = 16;
    wsSsh.getColumn(4).width = 18;
    wsSsh.getColumn(5).width = 36;
    wsSsh.getColumn(6).width = 30;
    wsSsh.getColumn(7).width = 12;
    wsSsh.getColumn(8).width = 22;
    // ══════════════════════════════════════════════════════════════════
    // SHEET 5: MASTER UNIT & KEGIATAN
    // ══════════════════════════════════════════════════════════════════
    const wsMaster = wb.addWorksheet('Master Unit & Kegiatan', {
        views: [{ showGridLines: true }],
    });
    wsMaster.mergeCells('B2:E2');
    wsMaster.getCell('B2').value = "MASTER UNIT & AGENDA KEGIATAN YAYASAN";
    wsMaster.getCell('B2').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1B4332' } };
    wsMaster.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    // Sub-header Unit
    wsMaster.getCell('B4').value = "1. DAFTAR UNIT PEMOHON";
    wsMaster.getCell('B4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    const uRow = wsMaster.getRow(5);
    ['No', 'Kode Unit', 'Nama Unit Pemohon', 'Status'].forEach((h, idx) => {
        const c = uRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
        c.border = borderThin;
        c.alignment = { horizontal: idx === 2 ? 'left' : 'center', vertical: 'middle' };
    });
    let uRowIdx = 6;
    units.forEach((u, idx) => {
        const row = wsMaster.getRow(uRowIdx);
        row.getCell(2).value = idx + 1;
        row.getCell(3).value = u.code;
        row.getCell(4).value = u.name;
        row.getCell(5).value = u.isActive ? 'Aktif' : 'Non-Aktif';
        for (let c = 2; c <= 5; c++) {
            const cell = row.getCell(c);
            cell.font = { name: 'Arial', size: 9 };
            cell.border = borderThin;
            cell.alignment = { horizontal: c === 4 ? 'left' : 'center', vertical: 'middle' };
        }
        uRowIdx++;
    });
    // Sub-header Kegiatan
    const actStart = uRowIdx + 2;
    wsMaster.getCell(`B${actStart}`).value = "2. DAFTAR MASTER KEGIATAN ANGGARAN";
    wsMaster.getCell(`B${actStart}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B4332' } };
    const aRow = wsMaster.getRow(actStart + 1);
    ['No', 'Nama Kegiatan Anggaran', 'Keterangan', 'Status'].forEach((h, idx) => {
        const c = aRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF144E36' } };
        c.border = borderThin;
        c.alignment = { horizontal: idx === 1 || idx === 2 ? 'left' : 'center', vertical: 'middle' };
    });
    let aRowIdx = actStart + 2;
    activities.forEach((a, idx) => {
        const row = wsMaster.getRow(aRowIdx);
        row.getCell(2).value = idx + 1;
        row.getCell(3).value = a.name;
        row.getCell(4).value = a.description || '-';
        row.getCell(5).value = a.isActive ? 'Aktif' : 'Non-Aktif';
        for (let c = 2; c <= 5; c++) {
            const cell = row.getCell(c);
            cell.font = { name: 'Arial', size: 9 };
            cell.border = borderThin;
            cell.alignment = { horizontal: c === 3 || c === 4 ? 'left' : 'center', vertical: 'middle' };
        }
        aRowIdx++;
    });
    wsMaster.getColumn(1).width = 3;
    wsMaster.getColumn(2).width = 6;
    wsMaster.getColumn(3).width = 16;
    wsMaster.getColumn(4).width = 32;
    wsMaster.getColumn(5).width = 14;
    // ══════════════════════════════════════════════════════════════════
    // SHEET 6: LOG RIWAYAT PERUBAHAN (AUDIT TRAIL)
    // ══════════════════════════════════════════════════════════════════
    const wsLogs = wb.addWorksheet('Log Riwayat Aktivitas', {
        views: [{ showGridLines: true }],
    });
    wsLogs.mergeCells('B2:G2');
    wsLogs.getCell('B2').value = "LOG RIWAYAT PERUBAHAN & AKTIVITAS SISTEM (AUDIT TRAIL)";
    wsLogs.getCell('B2').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1B4332' } };
    wsLogs.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    const logHeaders = ['No', 'Waktu Kejadian', 'Nama User', 'Aksi / Modul', 'Entity / Objek', 'Catatan Perubahan'];
    const lRow = wsLogs.getRow(4);
    logHeaders.forEach((h, idx) => {
        const c = lRow.getCell(idx + 2);
        c.value = h;
        c.font = headerFont;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
        c.border = borderThin;
        c.alignment = { horizontal: idx === 1 || idx === 5 ? 'left' : 'center', vertical: 'middle' };
    });
    let lRowIdx = 5;
    auditLogs.forEach((log, idx) => {
        const row = wsLogs.getRow(lRowIdx);
        row.getCell(2).value = idx + 1;
        row.getCell(3).value = new Date(log.createdAt).toLocaleString('id-ID');
        row.getCell(4).value = log.user?.name || 'Sistem';
        row.getCell(5).value = log.action;
        row.getCell(6).value = log.entity || '-';
        row.getCell(7).value = log.note || '-';
        for (let c = 2; c <= 7; c++) {
            const cell = row.getCell(c);
            cell.font = { name: 'Arial', size: 9 };
            cell.border = borderThin;
            cell.alignment = { horizontal: c === 4 || c === 7 ? 'left' : 'center', vertical: 'middle' };
        }
        lRowIdx++;
    });
    wsLogs.getColumn(1).width = 3;
    wsLogs.getColumn(2).width = 6;
    wsLogs.getColumn(3).width = 20;
    wsLogs.getColumn(4).width = 22;
    wsLogs.getColumn(5).width = 20;
    wsLogs.getColumn(6).width = 16;
    wsLogs.getColumn(7).width = 50;
    return wb;
}
/**
 * Simpan backup Excel otomatis ke penyimpanan lokal komputer
 */
async function saveLocalExcelBackup() {
    const wb = await buildFullDatabaseWorkbook();
    const dirs = (0, exports.getLocalBackupDirs)();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const masterFilename = 'DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx';
    const historyFilename = `DATABASE_KEUANGAN_LOKAL_${dateStr}.xlsx`;
    const savedFiles = [];
    let finalSize = 0;
    for (const baseDir of dirs) {
        try {
            // 1. Simpan file MASTER TERBARU (selalu terupdate dan menimpa yang lama)
            const masterPath = path_1.default.join(baseDir, masterFilename);
            await wb.xlsx.writeFile(masterPath);
            savedFiles.push(masterPath);
            // Ambil ukuran file
            const stat = fs_1.default.statSync(masterPath);
            finalSize = stat.size;
            // 2. Simpan juga salinan riwayat (timestamped)
            const histDir = path_1.default.join(baseDir, 'riwayat');
            if (!fs_1.default.existsSync(histDir)) {
                fs_1.default.mkdirSync(histDir, { recursive: true });
            }
            const histPath = path_1.default.join(histDir, historyFilename);
            await wb.xlsx.writeFile(histPath);
            savedFiles.push(histPath);
            // Bersihkan salinan riwayat yang lebih dari 30 file agar tidak boros ruang
            const existingHist = fs_1.default.readdirSync(histDir).filter(f => f.endsWith('.xlsx'));
            if (existingHist.length > 30) {
                existingHist.sort();
                for (let i = 0; i < existingHist.length - 30; i++) {
                    try {
                        fs_1.default.unlinkSync(path_1.default.join(histDir, existingHist[i]));
                    }
                    catch (_) { }
                }
            }
        }
        catch (err) {
            console.error(`Gagal menyimpan backup Excel di ${baseDir}:`, err);
        }
    }
    return {
        savedFiles,
        filename: masterFilename,
        sizeBytes: finalSize,
        sizeFormatted: `${(finalSize / 1024).toFixed(1)} KB`,
        timestamp: now.toISOString(),
    };
}
// ─── Debounced Auto-Backup Trigger ─────────────────────────────
let autoBackupTimer = null;
/**
 * Panggil fungsi ini setiap kali ada perubahan data di aplikasi.
 * Fungsi ini menggunakan debounce 3 detik agar hemat resource dan tidak menumpuk write file.
 */
function triggerAutoBackupExcel(sourceAction = 'DATA_UPDATE') {
    if (autoBackupTimer) {
        clearTimeout(autoBackupTimer);
    }
    autoBackupTimer = setTimeout(async () => {
        try {
            const res = await saveLocalExcelBackup();
            console.log(`[AUTO-BACKUP EXCEL] ✓ Data berhasil disimpan otomatis ke lokal (${res.savedFiles[0]}) karena: ${sourceAction}`);
        }
        catch (err) {
            console.error('[AUTO-BACKUP EXCEL] Gagal melakukan auto backup:', err);
        }
    }, 3000);
}
//# sourceMappingURL=excel-backup.service.js.map