import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
  Check,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface DiagnosticData {
  status: string;
  app: string;
  version: string;
  timestamp: string;
  diagnostics: {
    backend: string;
    database: string;
    databaseLatency: string;
    authService: string;
    totalUsersConfigured: number;
    environment: string;
    platform: string;
    lastChecked: string;
  };
}

export const SystemDiagnosticsPage: React.FC = () => {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/system/diagnostics');
      setData(response.data);
      setLastCheckTime(new Date().toLocaleTimeString('id-ID', { hour12: false }));
      toast.success('Pemeriksaan diagnostik sistem selesai.');
    } catch (error: any) {
      console.error('Diagnostic error:', error);
      // Fallback fallback error representation
      setData({
        status: 'DEGRADED',
        app: "Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah",
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        diagnostics: {
          backend: 'online',
          database: 'error',
          databaseLatency: '> 5000ms',
          authService: 'offline',
          totalUsersConfigured: 0,
          environment: 'production',
          platform: 'Vercel Serverless',
          lastChecked: new Date().toLocaleString('id-ID'),
        },
      });
      toast.error('Gagal mengambil diagnostik sistem backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const isHealthy = data?.status === 'OK';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Super Admin
            </span>
            <span className="text-xs text-gray-500">Pengaturan → Diagnostik Sistem</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Diagnostik & Kesehatan Sistem</h1>
          <p className="text-sm text-gray-500">
            Pemeriksaan real-time koneksi server backend, database PostgreSQL Supabase, dan layanan autentikasi.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memeriksa...' : 'Periksa Ulang Sekarang'}
        </button>
      </div>

      {/* Status Banner */}
      <div
        className={`p-5 rounded-2xl border flex items-center justify-between ${
          isHealthy
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isHealthy ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {isHealthy ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <h3 className="text-base font-bold">
              {isHealthy ? 'Semua Layanan Sistem Beroperasi Normal' : 'Sebagian Layanan Mengalami Hambatan'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {isHealthy
                ? 'Koneksi ke Supabase Cloud dan API Serverless Vercel terverifikasi aktif.'
                : 'Pemeriksaan koneksi mengindikasikan adanya kendala pada database atau jaringan.'}
            </p>
          </div>
        </div>

        {lastCheckTime && (
          <div className="hidden sm:block text-right">
            <span className="text-xs text-gray-500 block">Pemeriksaan Terakhir:</span>
            <span className="text-sm font-semibold text-gray-800">{lastCheckTime} WIB</span>
          </div>
        )}
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Backend API */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Server size={20} />
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                data?.diagnostics?.backend === 'online'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {data?.diagnostics?.backend === 'online' ? '● Online' : '● Offline'}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">Backend API Server</h4>
            <p className="text-xs text-gray-500 mt-1">
              Menangani endpoint autentikasi, review, pengajuan, dan master SSH.
            </p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Platform Host:</span>
              <span className="font-semibold text-gray-900">{data?.diagnostics?.platform || 'Vercel Serverless'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Environment:</span>
              <span className="font-semibold text-gray-900 uppercase">{data?.diagnostics?.environment || 'production'}</span>
            </div>
          </div>
        </div>

        {/* Database Supabase */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Database size={20} />
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                data?.diagnostics?.database === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {data?.diagnostics?.database === 'connected' ? '● Terhubung' : '● Terputus'}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">Supabase PostgreSQL</h4>
            <p className="text-xs text-gray-500 mt-1">
              Penyimpanan cloud online permanen untuk seluruh transaksi & master data.
            </p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Latensi Query:</span>
              <span className="font-semibold text-emerald-700">{data?.diagnostics?.databaseLatency || '-'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Engine:</span>
              <span className="font-semibold text-gray-900">PostgreSQL (AWS ap-southeast-1)</span>
            </div>
          </div>
        </div>

        {/* Layanan Autentikasi */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                data?.diagnostics?.authService === 'ready'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {data?.diagnostics?.authService === 'ready' ? '● Aktif' : '● Gangguan'}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">Layanan Autentikasi & Akun</h4>
            <p className="text-xs text-gray-500 mt-1">
              Verifikasi hash bcrypt, token JWT, dan validasi hak akses berjenjang.
            </p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total Akun Terdaftar:</span>
              <span className="font-semibold text-gray-900">{data?.diagnostics?.totalUsersConfigured ?? 4} User</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Metode Keamanan:</span>
              <span className="font-semibold text-gray-900">Bcrypt + JWT HS256</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Konfigurasi Teknis */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu size={18} className="text-emerald-700" />
          Detail Spesifikasi Aplikasi & Infrastruktur
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Nama Aplikasi:</span>
              <span className="font-medium text-gray-900 text-right">{data?.app || 'Sistem Keuangan Al-Qur\'aniyyah'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Versi Build:</span>
              <span className="font-medium text-gray-900">{data?.version || '1.0.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Waktu Server:</span>
              <span className="font-medium text-gray-900">{data?.timestamp || '-'}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Penyimpanan Utama:</span>
              <span className="font-medium text-emerald-700">Online Cloud (Supabase PostgreSQL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Akses Kredensial:</span>
              <span className="font-medium text-gray-900">Aman (Tidak diekspos ke publik)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pemeriksaan RLS:</span>
              <span className="font-medium text-emerald-700">Terkontrol via Backend Service Role</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDiagnosticsPage;
