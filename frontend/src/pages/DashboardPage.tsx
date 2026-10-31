import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Users,
  CalendarDays,
  FileText,
  TrendingUp,
  Banknote,
  ClipboardList,
  AlertCircle,
  Loader2,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatRupiah } from '../utils/format';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, bgColor, sub }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0 shadow-inner`}>
      <Icon size={22} className={color} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/dashboard/summary');
        setSummary(data.data);
      } catch {
        setError('Gagal memuat data dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Tahun Anggaran {summary?.activeFiscalYear || 2026} Aktif • SSH v1.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting()}, {user?.name}
          </h1>
          <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
            Sistem Administrasi Keuangan Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah — Pengawasan Terpadu Siklus Pengajuan, Telaah SSH, Persetujuan, Pencairan, dan Realisasi LPJ.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg font-semibold">
              Peran: {user?.role}
            </span>
            {user?.unit && (
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                Unit: {user.unit.name}
              </span>
            )}
            <span className="text-emerald-200">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#1B4332]" />
          <span className="ml-3 text-slate-600 font-medium">Memuat ringkasan eksekutif...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={20} />
          {error}
        </div>
      ) : summary ? (
        <>
          {/* Main Financial KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Usulan Anggaran"
              value={formatRupiah(summary.totalAnggaran)}
              icon={TrendingUp}
              color="text-amber-700"
              bgColor="bg-amber-100"
              sub={`${summary.totalPengajuan} Berkas Pengajuan`}
            />
            <StatCard
              label="Disetujui Pimpinan"
              value={formatRupiah(summary.totalApproved)}
              icon={CheckCircle2}
              color="text-emerald-700"
              bgColor="bg-emerald-100"
              sub="Anggaran Resmi Disahkan"
            />
            <StatCard
              label="Total Telah Dicairkan"
              value={formatRupiah(summary.totalPencairan)}
              icon={Banknote}
              color="text-blue-700"
              bgColor="bg-blue-100"
              sub="Telah Dibayarkan ke Unit"
            />
            <StatCard
              label="Realisasi Belanja Riil"
              value={formatRupiah(summary.totalRealisasi)}
              icon={Receipt}
              color="text-purple-700"
              bgColor="bg-purple-100"
              sub={summary.totalSisa > 0 ? `Sisa Kas: ${formatRupiah(summary.totalSisa)}` : 'Saldo Nihil'}
            />
          </div>

          {/* Workflow Status Funnel Sistem Baru */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#14532D]" />
              Status Alur Pengajuan Anggaran
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-semibold">1. Draft & Menunggu</p>
                <p className="text-xl font-black text-slate-800 mt-1">
                  {(summary.statusBreakdown?.menungguReview || 0) + (summary.statusBreakdown?.draft || 0)}
                </p>
                <span className="text-[10px] text-slate-400">Usulan Masuk</span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <p className="text-xs text-purple-800 font-semibold">2. Sedang Dievaluasi</p>
                <p className="text-xl font-black text-purple-900 mt-1">
                  {summary.statusBreakdown?.dalamReview || 0}
                </p>
                <span className="text-[10px] text-purple-700">Bendahara Umum</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-xs text-amber-800 font-semibold">3. Draft Pencairan (SPPD)</p>
                <p className="text-xl font-black text-amber-900 mt-1">
                  {(summary.statusBreakdown?.menungguApproval || 0) + (summary.statusBreakdown?.disetujui || 0)}
                </p>
                <span className="text-[10px] text-amber-700">Siap Dicairkan</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-xs text-emerald-800 font-semibold">4. Selesai Dicairkan</p>
                <p className="text-xl font-black text-[#14532D] mt-1">
                  {(summary.statusBreakdown?.dicairkan || 0) + (summary.statusBreakdown?.selesai || 0)}
                </p>
                <span className="text-[10px] text-emerald-700">Kasir / Pengeluaran</span>
              </div>
            </div>
          </div>

          {/* Unit Absorption Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1B4332]" />
                  Penyerapan Anggaran per Unit Lembaga
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi plafon anggaran, persetujuan pimpinan, pencairan, dan realisasi belanja per unit.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Unit</th>
                    <th className="px-5 py-3 text-center">Jumlah Berkas</th>
                    <th className="px-5 py-3 text-right">Usulan Awal</th>
                    <th className="px-5 py-3 text-right">Disetujui Pimpinan</th>
                    <th className="px-5 py-3 text-right">Dicairkan</th>
                    <th className="px-5 py-3 text-right">Realisasi Belanja</th>
                    <th className="px-5 py-3 text-center">Penyerapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.unitBreakdown?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {u.name} <span className="font-mono text-slate-400 font-normal">[{u.code}]</span>
                      </td>
                      <td className="px-5 py-3 text-center font-medium">{u.submissionCount}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{formatRupiah(u.totalAnggaran)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#1B4332]">
                        {formatRupiah(u.totalApproved)}
                      </td>
                      <td className="px-5 py-3 text-right text-blue-700">{formatRupiah(u.totalDisbursed)}</td>
                      <td className="px-5 py-3 text-right font-bold text-purple-700">
                        {formatRupiah(u.totalRealized)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#1B4332] h-full rounded-full"
                              style={{ width: `${Math.min(100, u.persentasePenyerapan)}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-[11px]">{u.persentasePenyerapan}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Action Navigation Cards Sistem Baru */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/pengajuan-unit"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#14532D] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#14532D] group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Pengajuan Unit</h4>
              <p className="text-xs text-slate-500 mt-1">Buat usulan anggaran baru fleksibel 1-3 faktor volume.</p>
            </Link>

            <Link
              to="/draft-pengajuan"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Draft Pengajuan</h4>
              <p className="text-xs text-slate-500 mt-1">Antrean pengajuan masuk unit sebelum dievaluasi.</p>
            </Link>

            <Link
              to="/evaluasi"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Evaluasi Keuangan</h4>
              <p className="text-xs text-slate-500 mt-1">Koreksi rincian anggaran & validasi standar SSH 2026.</p>
            </Link>

            <Link
              to="/draft-pencairan"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Draft Pencairan (SPPD)</h4>
              <p className="text-xs text-slate-500 mt-1">Dokumen resmi SPPD & konfirmasi pencairan kas.</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardPage;
