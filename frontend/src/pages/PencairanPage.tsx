import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Search,
  CheckCircle,
  Clock,
  Printer,
  ChevronRight,
  Building2,
  Calendar,
  Layers,
  X,
  CreditCard,
  Upload,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  disbursementService,
  DisbursementDetailResponse,
  KuitansiData,
  SppdData,
} from '../services/disbursement.service';
import { SubmissionListItem } from '../types';
import { formatDate } from '../utils/format';

export const PencairanPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DisbursementDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form Pencairan State
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'TUNAI'>('TRANSFER');
  const [bankName, setBankName] = useState('BSI (Bank Syariah Indonesia)');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  // Kuitansi Modal State
  const [showKuitansiModal, setShowKuitansiModal] = useState(false);
  const [kuitansiData, setKuitansiData] = useState<KuitansiData | null>(null);
  const [kuitansiLoading, setKuitansiLoading] = useState(false);

  // SPPD Modal State
  const [showSppdModal, setShowSppdModal] = useState(false);
  const [sppdData, setSppdData] = useState<SppdData | null>(null);
  const [sppdLoading, setSppdLoading] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await disbursementService.getSubmissions({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setSubmissions(res.data?.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar pencairan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions();
  };

  const handleOpenDetail = async (id: number) => {
    setSelectedSubId(id);
    setDetailLoading(true);
    try {
      const res = await disbursementService.getDetail(id);
      if (res.data) {
        setDetailData(res.data);
        const sub = res.data.submission;
        setPayoutAmount(sub.totalApproved || sub.totalReviewed || sub.totalParsing);
        setRecipientName(sub.picName?.trim() || sub.submittedBy?.name || '');
        setReferenceNumber(`TRF/BSI/${sub.submissionNumber.replace(/[\/\\]/g, '-')}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail pengajuan.');
      setSelectedSubId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExecuteDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;

    if (!recipientName.trim()) {
      toast.error('Nama penerima dana wajib diisi.');
      return;
    }

    if (payoutAmount <= 0) {
      toast.error('Jumlah pencairan harus lebih dari Rp 0.');
      return;
    }

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('amount', String(payoutAmount));
      formData.append('paymentMethod', paymentMethod);
      formData.append('bankName', paymentMethod === 'TRANSFER' ? bankName : '');
      formData.append('accountNumber', paymentMethod === 'TRANSFER' ? accountNumber : '');
      formData.append('recipientName', recipientName);
      formData.append('referenceNumber', referenceNumber);
      formData.append('notes', notes);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await disbursementService.disburse(selectedSubId, formData);
      toast.success(res.message || 'Pencairan dana berhasil dicatat!');
      setSelectedSubId(null);
      setReceiptFile(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memproses pencairan dana.');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenKuitansi = async (id: number) => {
    setKuitansiLoading(true);
    setShowKuitansiModal(true);
    try {
      const res = await disbursementService.getKuitansi(id);
      if (res.data) {
        setKuitansiData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat kuitansi pencairan.');
      setShowKuitansiModal(false);
    } finally {
      setKuitansiLoading(false);
    }
  };

  const handleOpenSppd = async (id: number, autoPrint = false) => {
    setSppdLoading(true);
    setShowSppdModal(true);
    try {
      const res = await disbursementService.getSppd(id);
      if (res.data) {
        setSppdData(res.data);
        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 400);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat Surat Perintah Pencairan Dana (SPPD).');
      setShowSppdModal(false);
    } finally {
      setSppdLoading(false);
    }
  };

  const formatRupiah = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatNumberOnly = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0';
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Banknote className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm mb-3">
            <Banknote className="w-4 h-4 text-emerald-300" />
            Modul Bendahara & Kasir Yayasan
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pencairan Anggaran (Disbursement)
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-2xl">
            Proses pencairan dana bagi pengajuan belanja yang telah disetujui pimpinan, catat bukti transfer/kuitansi kas, dan cetak tanda terima resmi.
          </p>
        </div>
      </div>

      {/* KPI Ringkasan & Persentase Pencairan */}
      {(() => {
        const totalApprovedSum = submissions.reduce((acc, it) => acc + (it.totalApproved || it.totalAnggaran || 0), 0);
        const totalDisbursedSum = submissions.reduce((acc, it) => acc + (it.totalDisbursed || 0), 0);
        const overallPct = totalApprovedSum > 0 ? ((totalDisbursedSum / totalApprovedSum) * 100).toFixed(1) : '0';
        const sisaBelumCair = Math.max(0, totalApprovedSum - totalDisbursedSum);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disetujui Pimpinan</p>
                <p className="text-xl font-extrabold text-[#1B4332] mt-1">{formatRupiah(totalApprovedSum)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{submissions.length} berkas pengajuan</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <CheckCircle className="w-6 h-6 text-[#1B4332]" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Realisasi Pencairan Dana</p>
                <p className="text-xl font-extrabold text-blue-700 mt-1">{formatRupiah(totalDisbursedSum)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sisa Belum Cair: {formatRupiah(sisaBelumCair)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Banknote className="w-6 h-6 text-blue-700" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Persentase Pencairan</p>
                <span className="text-base font-extrabold text-[#1B4332] font-mono">{overallPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, parseFloat(overallPct))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
                <span>Progres Realisasi</span>
                <span>Target: 100% Lunas</span>
              </p>
            </div>
          </div>
        );
      })()}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISETUJUI')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'DISETUJUI'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Siap Dicairkan
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DICAIRKAN')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'DICAIRKAN'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Sudah Dicairkan
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Cari no pengajuan, penerima, unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">No Pengajuan & Perihal</th>
                <th className="px-5 py-3.5">Unit Pemohon</th>
                <th className="px-5 py-3.5 text-right">Disetujui Pimpinan</th>
                <th className="px-5 py-3.5 text-right">Jumlah Dicairkan</th>
                <th className="px-5 py-3.5 text-center">Persentase</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                    <p className="mt-2 text-xs">Memuat data pencairan...</p>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Banknote className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    Tidak ada berkas pencairan dalam kriteria ini.
                  </td>
                </tr>
              ) : (
                submissions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{item.submissionNumber}</div>
                      <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{item.title}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{item.unit}</div>
                      <div className="text-xs text-slate-500">{item.activity} • TA {item.fiscalYear}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        {item.activityDate && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            <Calendar className="w-3 h-3" /> {formatDate(item.activityDate)}
                          </span>
                        )}
                        {item.picName && (
                          <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                            PIC: {item.picName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-[#1B4332]">
                      {formatRupiah(item.totalApproved || item.totalAnggaran)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-blue-700 font-mono">
                      {item.totalDisbursed ? formatRupiah(item.totalDisbursed) : '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const approved = item.totalApproved || item.totalAnggaran || 0;
                        const disbursed = item.totalDisbursed || 0;
                        const pct = approved > 0 ? Math.min(100, Math.round((disbursed / approved) * 100)) : 0;
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              pct >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : pct > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {pct}%
                            </span>
                            <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-600' : 'bg-blue-600'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {item.status === 'DISETUJUI' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" /> Siap Dicairkan
                        </span>
                      ) : item.status === 'DICAIRKAN' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                          <Banknote className="w-3.5 h-3.5" /> Telah Dicairkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {/* Review SPPD (Semua Pengajuan) */}
                        <button
                          type="button"
                          onClick={() => handleOpenSppd(item.id, false)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center gap-1 shadow-xs transition-colors"
                          title="Review Surat Perintah Pencairan Dana (SPPD)"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          <span>Review SPPD</span>
                        </button>

                        {/* Cetak SPPD (Semua Pengajuan) */}
                        <button
                          type="button"
                          onClick={() => handleOpenSppd(item.id, true)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 shadow-xs transition-colors"
                          title="Cetak Surat Perintah Pencairan Dana (SPPD)"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-700" />
                          <span>Cetak SPPD</span>
                        </button>

                        {/* Cairkan Dana (Jika Disetujui) */}
                        {item.status === 'DISETUJUI' && (
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <Banknote className="w-3.5 h-3.5 text-emerald-300" /> Cairkan Dana
                          </button>
                        )}

                        {/* Kuitansi (Jika Telah Dicairkan) */}
                        {item.status === 'DICAIRKAN' && (
                          <button
                            type="button"
                            onClick={() => handleOpenKuitansi(item.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" /> Kuitansi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Eksekusi Pencairan */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 flex flex-col border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                  Formulir Pencairan Dana Anggaran
                </div>
                <h3 className="text-base font-bold">
                  {detailData?.submission.submissionNumber || 'Memuat...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                <p className="mt-3 text-sm">Menyiapkan data pencairan...</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteDisburse} className="p-6 space-y-4">
                {/* Ringkasan Disetujui */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-700 font-semibold">Total Anggaran Disetujui Pimpinan:</div>
                    <div className="text-xl font-extrabold text-[#1B4332]">
                      {formatRupiah(detailData.stats.totalApproved)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Unit: <span className="font-semibold text-slate-800">{detailData.submission.unit.name}</span></div>
                    <div>Perihal: <span className="font-semibold text-slate-800">{detailData.submission.title}</span></div>
                  </div>
                </div>

                {/* Nominal & Persentase Pencairan Interaktif */}
                {(() => {
                  const approvedTotal = detailData.stats.totalApproved || 1;
                  const disbursePct = approvedTotal > 0 ? Number(((payoutAmount / approvedTotal) * 100).toFixed(1)) : 100;
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Jumlah Yang Dicairkan (Rp) *
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Persentase Pencairan:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                            disbursePct >= 100
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : disbursePct >= 50
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {disbursePct}% {disbursePct >= 100 ? '(Pencairan Penuh)' : '(Pencairan Bertahap)'}
                          </span>
                        </div>
                      </div>

                      <input
                        type="number"
                        required
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] font-bold text-[#1B4332] font-mono bg-white"
                      />

                      {/* Progress Bar Visual Persentase */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#1B4332] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, disbursePct))}%` }}
                        />
                      </div>

                      {/* Quick Buttons Persentase */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat Persentase:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(Math.round(detailData.stats.totalApproved * 0.25))}
                            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(Math.round(detailData.stats.totalApproved * 0.50))}
                            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium"
                          >
                            50% (Tahap 1)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(Math.round(detailData.stats.totalApproved * 0.75))}
                            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium"
                          >
                            75%
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(detailData.stats.totalApproved)}
                            className="px-2.5 py-1 rounded bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold"
                          >
                            100% (Penuh/Lunas)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Metode Pembayaran *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                    >
                      <option value="TRANSFER">Transfer Bank</option>
                      <option value="TUNAI">Kas Tunai (Cash)</option>
                    </select>
                  </div>

                  {paymentMethod === 'TRANSFER' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Bank
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nomor Rekening Tujuan
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 7142026001"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Penerima Dana *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Bukti Transaksi / Ref
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                {/* Upload Bukti */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Bukti Transfer / Slip Pembayaran (Opsional)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#1B4332] hover:file:bg-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Kasir / Bendahara
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan tambahan pencairan..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSubId(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-lg hover:opacity-95 shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    {processing ? 'Menyimpan...' : 'Konfirmasi & Cairkan Dana'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Kuitansi Resmi */}
      {showKuitansiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 flex flex-col border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Kuitansi Resmi Pencairan Dana
              </h3>
              <button
                type="button"
                onClick={() => setShowKuitansiModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {kuitansiLoading || !kuitansiData ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                <p className="mt-2 text-xs">Memuat kuitansi...</p>
              </div>
            ) : (
              <div className="p-8 space-y-6 text-slate-900" id="kuitansi-print-area">
                {/* Kop */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                    {kuitansiData.institution}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">{kuitansiData.address} • {kuitansiData.city}</p>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500">No. Kuitansi:</span>{' '}
                    <span className="font-mono font-bold">{kuitansiData.receiptNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">No. Pengajuan:</span>{' '}
                    <span className="font-mono font-semibold">{kuitansiData.submissionNumber}</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-5 space-y-3 bg-slate-50 text-xs">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-slate-500">Telah Diterima Dari:</div>
                    <div className="col-span-3 font-bold text-slate-900">Bendahara Yayasan Al-Qur'aniyyah</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-slate-500">Uang Sejumlah:</div>
                    <div className="col-span-3 font-bold text-lg text-[#1B4332]">
                      {formatRupiah(kuitansiData.amount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-slate-500">Untuk Pembayaran:</div>
                    <div className="col-span-3 font-medium text-slate-800">
                      Pencairan dana kegiatan "{kuitansiData.activity}" perihal: {kuitansiData.title} ({kuitansiData.unit})
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-slate-500">Metode Bayar:</div>
                    <div className="col-span-3 font-medium">
                      {kuitansiData.paymentMethod} {kuitansiData.bankName ? `• Bank: ${kuitansiData.bankName}` : ''}
                      {kuitansiData.accountNumber ? ` (${kuitansiData.accountNumber})` : ''}
                    </div>
                  </div>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Penerima Dana,</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline text-slate-900">{kuitansiData.recipientName}</p>
                    <p className="text-[11px] text-slate-500">{kuitansiData.unit}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Diserahkan Oleh (Bendahara),</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline text-[#1B4332]">{kuitansiData.disbursedBy}</p>
                    <p className="text-[11px] text-slate-500">Yayasan Al-Qur'aniyyah</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowKuitansiModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1B4332] rounded-lg hover:bg-[#2D6A4F] flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Kuitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Review & Cetak SPPD (Surat Perintah Pencairan Dana) ── */}
      {showSppdModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-4 flex flex-col border border-slate-200 overflow-hidden print:border-0 print:shadow-none print:my-0 print:max-w-none">
            {/* Modal Top Bar (Hidden on Print) */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between print:hidden shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15">
                  <FileText className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                    Pratinjau Dokumen Resmi
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Surat Perintah Pencairan Dana (SPPD)
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 text-xs font-bold text-[#1B4332] bg-white hover:bg-emerald-50 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-[#1B4332]" /> Cetak / Print SPPD
                </button>
                <button
                  type="button"
                  onClick={() => setShowSppdModal(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {sppdLoading || !sppdData ? (
              <div className="p-16 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                <p className="mt-2 text-xs font-medium">Memuat dokumen SPPD...</p>
              </div>
            ) : (
              <div className="p-6 sm:p-8 overflow-y-auto max-h-[80vh] print:max-h-none print:p-0 print:overflow-visible bg-slate-50/30" id="sppd-print-area">
                <style dangerouslySetInnerHTML={{
                  __html: `
                    @media print {
                      @page {
                        size: A4 landscape;
                        margin: 8mm;
                      }
                      body * {
                        visibility: hidden !important;
                      }
                      #sppd-print-area, #sppd-print-area * {
                        visibility: visible !important;
                      }
                      #sppd-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      #sppd-print-area .shadow-xs,
                      #sppd-print-area .shadow-sm {
                        box-shadow: none !important;
                      }
                    }
                  `
                }} />

                {/* 1. Header Banner / Kop Lembaga */}
                <div className="bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-200/80 rounded-2xl p-5 text-center shadow-xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tahun Ajaran {sppdData.academicYear?.replace(/^Tahun Ajaran\s*/i, '') || '2026-2027'}</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-[#1B4332] uppercase">
                    SURAT PERINTAH PENCAIRAN DANA (SPPD)
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide mt-0.5">
                    {sppdData.institution}
                  </h2>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {sppdData.subInstitution}
                  </h3>
                </div>

                {/* 2. Metadata & Ringkasan Biaya Kegiatan */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                  {/* Left Column: Info Pengajuan */}
                  <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" /> Informasi Pengajuan & Unit
                    </div>
                    <div className="grid grid-cols-12 items-center">
                      <span className="col-span-4 text-slate-500 font-medium">Tanggal Pelaksanaan</span>
                      <span className="col-span-1 text-center text-slate-300">:</span>
                      <span className="col-span-7 font-bold text-slate-900 inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        {formatDate(sppdData.activityDate)}
                      </span>
                    </div>
                    <div className="grid grid-cols-12 items-center">
                      <span className="col-span-4 text-slate-500 font-medium">Nomor Surat SPPD</span>
                      <span className="col-span-1 text-center text-slate-300">:</span>
                      <span className="col-span-7 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md inline-block w-fit">
                        {sppdData.letterNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-12 items-center">
                      <span className="col-span-4 text-slate-500 font-medium">Unit / Lembaga</span>
                      <span className="col-span-1 text-center text-slate-300">:</span>
                      <span className="col-span-7 font-bold text-slate-900">{sppdData.unit}</span>
                    </div>
                    <div className="grid grid-cols-12 items-center">
                      <span className="col-span-4 text-slate-500 font-medium">Agenda Kegiatan</span>
                      <span className="col-span-1 text-center text-slate-300">:</span>
                      <span className="col-span-7 font-semibold text-slate-800">{sppdData.activity || sppdData.title}</span>
                    </div>
                  </div>

                  {/* Right Column: Ringkasan Biaya Kegiatan */}
                  <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-emerald-700" /> Ringkasan Anggaran
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Disetujui
                      </span>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Usulan Pengajuan</p>
                          <p className="text-sm font-bold text-slate-800 font-mono">
                            Rp {formatNumberOnly(sppdData.summary.totalPengajuan)}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
                          Usulan Unit
                        </span>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Realisasi Pencairan</p>
                          <p className="text-base font-extrabold text-[#1B4332] font-mono">
                            Rp {formatNumberOnly(sppdData.summary.totalPencairan)}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-xs">
                          Kasir Yayasan
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Side-by-Side Comparison Table (Pengajuan Dana vs Pencairan Dana) */}
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
                  <table className="w-full text-xs border-collapse text-slate-900">
                    <thead>
                      {/* Top Header Split Row */}
                      <tr className="border-b border-slate-200">
                        <th colSpan={5} className="bg-slate-100/90 text-center font-bold uppercase py-2.5 px-3 border-r border-slate-200 tracking-wider text-slate-700">
                          PENGAJUAN DANA (USULAN UNIT)
                        </th>
                        <th colSpan={3} className="bg-emerald-100/70 text-center font-bold uppercase py-2.5 px-3 tracking-wider text-[#1B4332]">
                          PENCAIRAN DANA (DISETUJUI YAYASAN)
                        </th>
                      </tr>
                      {/* Sub Header Column Names */}
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                        <th className="py-2 px-2.5 border-r border-slate-200 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-left">Kebutuhan</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 text-right w-28">Harga Satuan</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 text-center w-24">Rincian</th>
                        <th className="py-2 px-2.5 border-r-2 border-slate-200 text-right w-32 font-bold text-slate-800">Total Usulan</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 text-right w-28">Harga Satuan</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 text-center w-24">Rincian</th>
                        <th className="py-2 px-2.5 text-right w-32 font-bold text-[#1B4332]">Total Cair</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sppdData.items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                            Tidak ada rincian item anggaran.
                          </td>
                        </tr>
                      ) : (
                        sppdData.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                            {/* Pengajuan Dana Data */}
                            <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] text-slate-500">
                              {it.itemNumber || idx + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                              {it.kebutuhan}
                            </td>
                            <td className="py-2 px-2.5 text-right border-r border-slate-200 font-mono text-slate-600">
                              <span className="float-left text-slate-400">Rp</span> {formatNumberOnly(it.pengajuanHarga)}
                            </td>
                            <td className="py-2 px-2.5 text-center border-r border-slate-200 text-slate-600 font-medium">
                              {it.pengajuanRincian}
                            </td>
                            <td className="py-2 px-2.5 text-right border-r-2 border-slate-200 font-mono font-semibold text-slate-800">
                              <span className="float-left text-slate-400">Rp</span> {formatNumberOnly(it.pengajuanTotal)}
                            </td>

                            {/* Pencairan Dana Data */}
                            <td className="py-2 px-2.5 text-right border-r border-slate-200 font-mono text-emerald-950">
                              <span className="float-left text-emerald-600/50">Rp</span> {formatNumberOnly(it.pencairanHarga)}
                            </td>
                            <td className="py-2 px-2.5 text-center border-r border-slate-200 text-emerald-950 font-medium">
                              {it.pencairanRincian}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-[#1B4332]">
                              <span className="float-left text-emerald-600/60">Rp</span> {formatNumberOnly(it.pencairanTotal)}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Total Row Bawah */}
                      <tr className="border-t-2 border-slate-200 font-extrabold text-slate-900 bg-slate-50/80">
                        <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider border-r border-slate-200 text-slate-600 text-[11px]">
                          TOTAL PENGAJUAN DANA
                        </td>
                        <td className="py-3 px-2.5 text-right border-r-2 border-slate-200 font-mono text-xs font-bold text-slate-800 bg-slate-100">
                          <span className="float-left text-slate-500">Rp</span> {formatNumberOnly(sppdData.summary.totalPengajuan)}
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-right uppercase tracking-wider border-r border-slate-200 text-emerald-800 text-[11px]">
                          TOTAL PENCAIRAN DANA
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-xs font-extrabold text-[#1B4332] bg-emerald-50">
                          <span className="float-left text-emerald-700">Rp</span> {formatNumberOnly(sppdData.summary.totalPencairan)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Tanggal Pencairan Banner Bawah */}
                <div className="flex justify-end items-center mt-3 text-xs">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-950 font-semibold shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-slate-600 font-normal">Tanggal Pencairan:</span>
                    <span className="font-bold font-mono">
                      {formatDate(sppdData.disbursementDate || sppdData.activityDate)}
                    </span>
                  </div>
                </div>

                {/* 5. Tanda Tangan Resmi (3 Pihak) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-200">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-xs">
                    <p className="text-xs font-semibold text-slate-700">Pemohon / Pengaju</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{sppdData.unit}</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 italic font-mono">(Tanda Tangan)</span>
                    </div>
                    <p className="font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">{sppdData.signatories.pemohon.nama}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sppdData.signatories.pemohon.jabatan}</p>
                  </div>

                  <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/80 text-center shadow-xs">
                    <p className="text-xs font-semibold text-emerald-900">Bendahara Umum Yayasan</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Yayasan Al-Qur'aniyyah</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-600/40 italic font-mono">(Tanda Tangan & Cap)</span>
                    </div>
                    <p className="font-bold text-[#1B4332] text-xs pt-1 border-t border-emerald-200">{sppdData.signatories.keuangan.nama}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sppdData.signatories.keuangan.jabatan}</p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-xs">
                    <p className="text-xs font-semibold text-slate-700">Mengetahui / Menyetujui</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Ketua Umum Yayasan</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 italic font-mono">(Tanda Tangan)</span>
                    </div>
                    <p className="font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">{sppdData.signatories.pimpinan.nama}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sppdData.signatories.pimpinan.jabatan}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Footer (Hidden on Print) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Dokumen SPPD sah jika ditandatangani oleh pemohon, bendahara, dan ketua umum yayasan.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSppdModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:opacity-95 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-4 h-4 text-emerald-300" /> Cetak SPPD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PencairanPage;
