import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Shield,
  Clock,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  backupService,
  BackupItem,
  AuditLogItem,
} from '../services/backup.service';

export const BackupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'AUDIT'>('BACKUP');

  // Backups State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await backupService.getBackups();
      setBackups(res.data || []);
    } catch {
      toast.error('Gagal memuat daftar backup.');
    } finally {
      setLoadingBackups(false);
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
    if (activeTab === 'BACKUP') {
      fetchBackups();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await backupService.createBackup();
      toast.success(res.message || 'Backup database berhasil dibuat!');
      fetchBackups();
    } catch {
      toast.error('Gagal membuat backup database.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownload = (filename: string) => {
    const downloadUrl = `http://${window.location.hostname}:5000/api/backups/download/${filename}`;
    window.open(downloadUrl, '_blank');
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
    if (action.includes('LPJ')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
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
    if (action.includes('REJECT')) {
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
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Database className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm mb-3">
            <Shield className="w-4 h-4 text-emerald-300" />
            Keamanan Data & Pemeliharaan Sistem
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Backup Database & Audit Trail
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-2xl">
            Buat cadangan database SQLite secara instan, unduh arsip data lokal, dan pantau seluruh jejak aktivitas pengguna yayasan secara transparan.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('BACKUP')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'BACKUP'
              ? 'border-[#1B4332] text-[#1B4332]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Cadangan Database (SQLite Backups)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'AUDIT'
              ? 'border-[#1B4332] text-[#1B4332]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Riwayat Audit Trail (Jejak Aktivitas)
        </button>
      </div>

      {activeTab === 'BACKUP' ? (
        <div className="space-y-6">
          {/* Action Box */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#1B4332]" />
                Pencadangan Database Instan
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Database tersimpan di file SQLite lokal: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">alquraniyyah.db</code>. Klik tombol di kanan untuk menyalin database ke folder arsip <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">/backups</code>.
              </p>
            </div>
            <button
              type="button"
              disabled={creatingBackup}
              onClick={handleCreateBackup}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-lg hover:opacity-95 shadow-md flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${creatingBackup ? 'animate-spin' : ''}`} />
              {creatingBackup ? 'Mencadangkan...' : 'Buat Backup Database Sekarang'}
            </button>
          </div>

          {/* Backup List Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Daftar File Cadangan Tersimpan ({backups.length} Arsip)
              </h4>
              <button
                type="button"
                onClick={fetchBackups}
                className="text-xs text-[#1B4332] font-semibold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Segarkan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3">Nama Berkas Cadangan</th>
                    <th className="px-5 py-3">Ukuran File</th>
                    <th className="px-5 py-3">Waktu Pencadangan</th>
                    <th className="px-5 py-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBackups ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                        <p className="mt-2 text-xs">Memeriksa folder backup...</p>
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        <HardDrive className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        Belum ada file backup yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    backups.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900 flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          {item.filename}
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
                            onClick={() => handleDownload(item.filename)}
                            className="px-3 py-1.5 text-xs font-bold text-[#1B4332] bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 flex items-center gap-1 mx-auto shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh .db
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Audit Logs */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Rekaman Jejak Aktivitas Terakhir
            </h4>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="text-xs text-[#1B4332] font-semibold hover:underline flex items-center gap-1"
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
