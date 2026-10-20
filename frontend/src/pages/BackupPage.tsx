import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Activity,
  HardDrive,
  FileCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  backupService,
  ExcelBackupItem,
  AuditLogItem,
} from '../services/backup.service';

export const BackupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXCEL' | 'AUDIT'>('EXCEL');

  // Excel Backups State
  const [excelBackups, setExcelBackups] = useState<ExcelBackupItem[]>([]);
  const [loadingExcelBackups, setLoadingExcelBackups] = useState(true);
  const [creatingExcel, setCreatingExcel] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchExcelBackups = async () => {
    try {
      setLoadingExcelBackups(true);
      const res = await backupService.getExcelBackups();
      setExcelBackups(res.data || []);
    } catch {
      toast.error('Gagal memuat daftar backup Excel lokal.');
    } finally {
      setLoadingExcelBackups(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await backupService.getAuditLogs({ limit: 100 });
      setLogs(res.data?.items || []);
    } catch {
      toast.error('Gagal memuat log audit.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'EXCEL') {
      fetchExcelBackups();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleCreateExcelBackup = async () => {
    try {
      setCreatingExcel(true);
      const res = await backupService.createExcelBackup();
      toast.success(
        res.message || 'Backup Excel lokal berhasil diperbarui & disimpan!',
        { duration: 4000 }
      );
      fetchExcelBackups();
    } catch {
      toast.error('Gagal membuat file backup Excel.');
    } finally {
      setCreatingExcel(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      await backupService.downloadExcelBackup();
      toast.success('File database Excel berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh file Excel.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      setOpeningFolder(true);
      const res = await backupService.openBackupFolder();
      toast.success(res.message || 'Folder backup dibuka di Windows Explorer');
    } catch {
      toast.error('Gagal membuka folder di Windows Explorer.');
    } finally {
      setOpeningFolder(false);
    }
  };

  const renderActionBadge = (action: string) => {
    if (action.includes('APPROVE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {action}
        </span>
      );
    }
    if (action.includes('DISBURSE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
          {action}
        </span>
      );
    }
    if (action.includes('REVIEW')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
          {action}
        </span>
      );
    }
    if (action.includes('BACKUP')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
          {action}
        </span>
      );
    }
    if (action.includes('REJECT') || action.includes('DELETE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] via-[#24563E] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <FileSpreadsheet className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-sm mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Keamanan Data Lokal & Auto-Backup Otomatis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Backup Data & Ekspor Excel Lokal
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            Semua data transaksi pengajuan, review anggaran, pencairan, SSH 2026, dan katalog kegiatan
            otomatis dihimpun dan disinkronkan ke file <strong>Microsoft Excel (.xlsx)</strong> lokal di komputer Anda setiap ada perubahan data.
          </p>
        </div>
      </div>

      {/* Auto-Backup Status & Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Auto-Sync Status */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Penyimpanan Otomatis
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                AKTIF (Auto-Sync)
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Tersimpan Otomatis ke Excel
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap kali Anda membuat pengajuan, mengubah item review/SSH, menyetujui, atau mencairkan dana,
              sistem otomatis memperbarui file Excel lokal tanpa perlu export manual.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
            Lokasi master: <br />
            <span className="text-slate-800 font-semibold break-all">
              D:\Sistem_Keuangan_Portable\backups\DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx
            </span>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Aksi Cepat Pencadangan Data
              </h3>
              <span className="text-xs text-slate-400">Format Microsoft Excel .xlsx</span>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              File Excel berisi <strong>6 Sheet Komprehensif</strong>: Rekap Pengajuan, Rincian Volume & Belanja (lengkap faktor perkalian e.g. 6 MP × 237 Siswa × 1 Lembar), Realisasi Pencairan, Master SSH 2026, Master Unit/Kegiatan, dan Log Aktivitas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={downloadingExcel}
              onClick={handleDownloadExcel}
              className="flex-1 min-w-[200px] px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Download className={`w-4 h-4 ${downloadingExcel ? 'animate-bounce' : ''}`} />
              {downloadingExcel ? 'Memproses Unduhan...' : 'Unduh Master Excel Terbaru'}
            </button>

            <button
              type="button"
              disabled={creatingExcel}
              onClick={handleCreateExcelBackup}
              className="flex-1 min-w-[200px] px-4 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-700 ${creatingExcel ? 'animate-spin' : ''}`} />
              {creatingExcel ? 'Menyimpan ke Lokal...' : 'Perbarui & Simpan ke Lokal Sekarang'}
            </button>

            <button
              type="button"
              disabled={openingFolder}
              onClick={handleOpenFolder}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              title="Buka folder backup di komputer Anda"
            >
              <FolderOpen className="w-4 h-4 text-slate-600" />
              Buka Folder di Windows
            </button>
          </div>
        </div>
      </div>

      {/* Sheets Preview Info Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          Struktur Sheet di Dalam File Excel Backup:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">1. Rekap Pengajuan & Review</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Nomor pengajuan, tanggal, unit, pemohon, total awal vs review, selisih efisiensi.</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">2. Rincian Item Belanja & Volume</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Detail barang/jasa, perkalian faktor bertingkat, harga satuan, dan status SSH.</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">3. Pencairan Anggaran & SPPD</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Nomor kuitansi/SPPD, penerima, bank & rekening, tanggal transfer, status bayar.</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">4. Master Standar Biaya (SSH 2026)</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Katalog standar harga tertinggi yayasan lengkap kode item & batas harga.</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">5. Master Unit & Kegiatan</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Katalog unit sekolah/yayasan dan kegiatan anggaran resmi 2026/2027.</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-800">6. Log Riwayat Aktivitas</strong>
            <p className="text-slate-500 text-[11px] mt-0.5">Rekam jejak pembuatan, review, approval, dan pencairan dana bendahara.</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('EXCEL')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'EXCEL'
              ? 'border-[#1B4332] text-[#1B4332]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Daftar Arsip File Excel Lokal ({excelBackups.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'AUDIT'
              ? 'border-[#1B4332] text-[#1B4332]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Riwayat Audit Trail (Jejak Aktivitas)
        </button>
      </div>

      {/* Tab Content: Excel Files */}
      {activeTab === 'EXCEL' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              File Excel Tersimpan di PC Lokal ({excelBackups.length} File)
            </h4>
            <button
              type="button"
              onClick={fetchExcelBackups}
              className="text-xs text-[#1B4332] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan Daftar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Nama Berkas Excel</th>
                  <th className="px-5 py-3">Tipe Arsip</th>
                  <th className="px-5 py-3">Ukuran File</th>
                  <th className="px-5 py-3">Waktu Diperbarui</th>
                  <th className="px-5 py-3 text-center">Aksi Unduh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingExcelBackups ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                      <p className="mt-2 text-xs">Memeriksa folder backup lokal...</p>
                    </td>
                  </tr>
                ) : excelBackups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      Belum ada berkas Excel di folder backup. Klik tombol di atas untuk membuat sekarang.
                    </td>
                  </tr>
                ) : (
                  excelBackups.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${item.isLatest ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${item.isLatest ? 'text-emerald-700 font-bold' : 'text-slate-500'}`} />
                          <span className="font-mono text-xs">{item.filename}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.isLatest ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ★ MASTER TERBARU
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Riwayat / Snapshot
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        {item.sizeFormatted}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(item.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={handleDownloadExcel}
                          className="px-3 py-1.5 text-xs font-bold text-[#1B4332] bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 flex items-center gap-1 mx-auto shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh .xlsx
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab Content: Audit Trail */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Rekaman Jejak Aktivitas Terakhir
            </h4>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="text-xs text-[#1B4332] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Entitas</th>
                  <th className="px-4 py-3">Keterangan / Rincian Jejak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                      <p className="mt-2 text-xs">Memuat jejak audit...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      Belum ada riwayat aktivitas tercatat.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{log.user?.name || 'Sistem'}</div>
                        <div className="text-[10px] text-slate-400">{log.user?.role?.name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.note || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPage;
