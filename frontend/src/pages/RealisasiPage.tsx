import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Layers,
  X,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  lpjService,
  LpjDetailResponse,
  LpjItemPayload,
  LembarLpjData,
} from '../services/lpj.service';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/format';

export const RealisasiPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Input LPJ Modal State
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<LpjDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dynamic LPJ Form Items
  const [lpjItems, setLpjItems] = useState<LpjItemPayload[]>([]);
  const [lpjNotes, setLpjNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verifikasi LPJ Modal State (Finance)
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Dokumen Cetak LPJ State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<LembarLpjData | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await lpjService.getSubmissions({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setSubmissions(res.data?.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar LPJ.');
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
      const res = await lpjService.getDetail(id);
      if (res.data) {
        setDetailData(res.data);
        const sub = res.data.submission;
        setLpjNotes(sub.notes || '');

        // Inisialisasi items: jika sudah ada lpjItems, gunakan itu. Jika belum, clone dari submission.items
        if (sub.lpjItems && sub.lpjItems.length > 0) {
          setLpjItems(
            sub.lpjItems.map((it) => ({
              uraian: it.uraian,
              volume: it.volume,
              satuan: it.satuan,
              hargaSatuan: it.hargaSatuan,
              total: it.total,
              notaNumber: it.notaNumber || '',
              keterangan: it.keterangan || '',
            }))
          );
        } else if (sub.items && sub.items.length > 0) {
          setLpjItems(
            sub.items.map((it) => ({
              submissionItemId: it.id,
              uraian: it.uraian,
              volume: it.volume,
              satuan: it.satuan,
              hargaSatuan: it.reviewPrice ?? it.originalPrice,
              total: it.volume * (it.reviewPrice ?? it.originalPrice),
              notaNumber: '',
              keterangan: '',
            }))
          );
        } else {
          setLpjItems([
            {
              uraian: '',
              volume: 1,
              satuan: 'Paket',
              hargaSatuan: 0,
              total: 0,
              notaNumber: '',
              keterangan: '',
            },
          ]);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail LPJ.');
      setSelectedSubId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof LpjItemPayload, value: any) => {
    const updated = [...lpjItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'volume' || field === 'hargaSatuan') {
      const vol = field === 'volume' ? Number(value) : updated[index].volume;
      const price = field === 'hargaSatuan' ? Number(value) : updated[index].hargaSatuan;
      updated[index].total = (vol || 0) * (price || 0);
    }
    setLpjItems(updated);
  };

  const handleAddItem = () => {
    setLpjItems([
      ...lpjItems,
      {
        uraian: '',
        volume: 1,
        satuan: 'Buah',
        hargaSatuan: 0,
        total: 0,
        notaNumber: '',
        keterangan: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lpjItems.length <= 1) {
      toast.error('Minimal harus ada 1 item belanja realisasi.');
      return;
    }
    setLpjItems(lpjItems.filter((_, idx) => idx !== index));
  };

  const calculatedTotalRealized = lpjItems.reduce((acc, it) => acc + (it.total || 0), 0);
  const currentTotalDisbursed = detailData?.stats.totalDisbursed || 0;
  const calculatedSisa = currentTotalDisbursed - calculatedTotalRealized;

  const handleSubmitLpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;

    if (calculatedTotalRealized <= 0) {
      toast.error('Total realisasi harus lebih dari Rp 0.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await lpjService.submitLpj(selectedSubId, {
        items: lpjItems,
        notes: lpjNotes,
      });
      toast.success(res.message || 'LPJ Realisasi berhasil diajukan!');
      setSelectedSubId(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan LPJ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyLpj = async (action: 'ACCEPT' | 'REVISION') => {
    if (!selectedSubId) return;

    try {
      setVerifying(true);
      const res = await lpjService.verifyLpj(selectedSubId, {
        action,
        notes: verifyNotes,
      });
      toast.success(res.message || 'Verifikasi LPJ selesai.');
      setShowVerifyModal(false);
      setSelectedSubId(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memverifikasi LPJ.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenPrint = async (id: number) => {
    setPrintLoading(true);
    setShowPrintModal(true);
    try {
      const res = await lpjService.getLembarLpj(id);
      if (res.data) {
        setPrintData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat dokumen cetak LPJ.');
      setShowPrintModal(false);
    } finally {
      setPrintLoading(false);
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

  const isFinanceOrAdmin = user?.role === 'ADMIN' || user?.role === 'KEUANGAN';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Receipt className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm mb-3">
            <Receipt className="w-4 h-4 text-emerald-300" />
            Laporan Pertanggungjawaban (LPJ) Akhir
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Realisasi & LPJ Keuangan
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-2xl">
            Pencatatan realisasi belanja riil unit, input nomor kuitansi/nota toko, perhitungan sisa lebih/kurang kas yayasan, dan verifikasi akhir.
          </p>
        </div>
      </div>

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
              onClick={() => setStatusFilter('DICAIRKAN')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'DICAIRKAN'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Belum LPJ
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('MENUNGGU_VERIFIKASI_LPJ')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'MENUNGGU_VERIFIKASI_LPJ'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Menunggu Verifikasi
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SELESAI')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'SELESAI'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              LPJ Selesai
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Cari no pengajuan, unit, kegiatan..."
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
                <th className="px-5 py-3.5">No Pengajuan & Judul</th>
                <th className="px-5 py-3.5">Unit Pemohon</th>
                <th className="px-5 py-3.5 text-right">Pencairan Dana</th>
                <th className="px-5 py-3.5 text-right">Realisasi Belanja</th>
                <th className="px-5 py-3.5 text-right">Sisa Kas</th>
                <th className="px-5 py-3.5 text-center">Status LPJ</th>
                <th className="px-5 py-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                    <p className="mt-2 text-xs">Memuat data realisasi...</p>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    Tidak ada berkas LPJ dalam kriteria ini.
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
                    <td className="px-5 py-4 text-right font-bold text-blue-700">
                      {formatRupiah(item.totalDisbursed)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {item.totalRealized ? formatRupiah(item.totalRealized) : '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {item.sisaLebihKurang !== undefined ? (
                        item.sisaLebihKurang > 0 ? (
                          <span className="text-emerald-700 flex items-center justify-end gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> +{formatRupiah(item.sisaLebihKurang)}
                          </span>
                        ) : item.sisaLebihKurang < 0 ? (
                          <span className="text-rose-700 flex items-center justify-end gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> {formatRupiah(item.sisaLebihKurang)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Nihil (Rp 0)</span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {item.status === 'SELESAI' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" /> LPJ Disahkan (Selesai)
                        </span>
                      ) : item.status === 'MENUNGGU_VERIFIKASI_LPJ' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                          <Receipt className="w-3.5 h-3.5" /> Siap Buat LPJ
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] flex items-center gap-1 shadow-sm"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Buka LPJ
                        </button>
                        {item.status === 'SELESAI' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(item.id)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            title="Cetak Lembar LPJ"
                          >
                            <Printer className="w-4 h-4" />
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

      {/* Modal Input & Workspace LPJ */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                  Laporan Pertanggungjawaban (LPJ) Belanja
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
                <p className="mt-3 text-sm">Menyiapkan workspace LPJ...</p>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 3 Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs text-blue-700 font-semibold">Dana Telah Dicairkan</div>
                    <div className="text-xl font-black text-blue-900 mt-1">
                      {formatRupiah(currentTotalDisbursed)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Penerima: {detailData.submission.submittedBy?.name || 'Unit'}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-4">
                    <div className="text-xs text-slate-600 font-semibold">Total Realisasi Belanja</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {formatRupiah(calculatedTotalRealized)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {lpjItems.length} baris transaksi riil
                    </div>
                  </div>

                  <div
                    className={`border rounded-xl p-4 ${
                      calculatedSisa > 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : calculatedSisa < 0
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {calculatedSisa > 0
                        ? 'Sisa Lebih (Kembali ke Kas)'
                        : calculatedSisa < 0
                        ? 'Sisa Kurang (Nombo Unit)'
                        : 'Saldo Nihil / Pas'}
                    </div>
                    <div className="text-xl font-black mt-1">
                      {formatRupiah(Math.abs(calculatedSisa))}
                    </div>
                    <div className="text-xs mt-1">
                      {calculatedSisa > 0
                        ? 'Wajib disetor ke bendahara'
                        : calculatedSisa < 0
                        ? 'Pengeluaran melebihi pencairan'
                        : 'Realisasi 100% tepat anggaran'}
                    </div>
                  </div>
                </div>

                {/* Dynamic LPJ Lines Form */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#1B4332]" />
                      Rincian Transaksi Belanja Riil & Nomor Nota
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-[#1B4332] border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris Belanja
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-10 text-center">No</th>
                          <th className="p-2.5 min-w-[200px]">Uraian Belanja Riil</th>
                          <th className="p-2.5 w-20 text-center">Vol</th>
                          <th className="p-2.5 w-24 text-center">Satuan</th>
                          <th className="p-2.5 w-32 text-right">Harga Satuan (Rp)</th>
                          <th className="p-2.5 w-32 text-right">Subtotal</th>
                          <th className="p-2.5 min-w-[140px]">No. Nota / Toko</th>
                          <th className="p-2.5 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lpjItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.uraian}
                                onChange={(e) => handleItemChange(idx, 'uraian', e.target.value)}
                                placeholder="Uraian barang / jasa..."
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-[#1B4332]"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                value={item.volume}
                                onChange={(e) => handleItemChange(idx, 'volume', Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-[#1B4332]"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.satuan}
                                onChange={(e) => handleItemChange(idx, 'satuan', e.target.value)}
                                className="w-full px-2 py-1 text-xs text-center border border-slate-300 rounded focus:ring-1 focus:ring-[#1B4332]"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                value={item.hargaSatuan}
                                onChange={(e) => handleItemChange(idx, 'hargaSatuan', Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-[#1B4332] font-semibold"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {formatRupiah(item.total)}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.notaNumber || ''}
                                onChange={(e) => handleItemChange(idx, 'notaNumber', e.target.value)}
                                placeholder="No. Nota / Bon..."
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-[#1B4332]"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t border-slate-300 text-xs">
                          <td colSpan={5} className="p-2.5 text-right">TOTAL REALISASI BELANJA:</td>
                          <td className="p-2.5 text-right text-[#1B4332]">{formatRupiah(calculatedTotalRealized)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Pelaksanaan LPJ Unit
                  </label>
                  <textarea
                    rows={2}
                    value={lpjNotes}
                    onChange={(e) => setLpjNotes(e.target.value)}
                    placeholder="Keterangan tambahan pertanggungjawaban kegiatan..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {isFinanceOrAdmin && detailData?.submission.status === 'MENUNGGU_VERIFIKASI_LPJ' && (
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-200" />
                    Verifikasi Keuangan
                  </button>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitLpj}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-lg hover:opacity-95 shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  {submitting ? 'Menyimpan...' : 'Simpan & Ajukan LPJ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Verifikasi LPJ (Finance) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1B4332]" />
              Verifikasi Keuangan Dokumen LPJ
            </h3>
            <p className="text-xs text-slate-600">
              Apakah seluruh bukti fisik nota toko, kuitansi, dan kesesuaian belanja telah diverifikasi oleh Bendahara Yayasan?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Verifikator
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Catatan verifikasi bendahara..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyLpj('REVISION')}
                className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100"
              >
                Minta Revisi
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyLpj('ACCEPT')}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
              >
                Setujui & Sahkan (Selesai)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Dokumen LPJ Resmi */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Laporan Pertanggungjawaban (LPJ) Resmi Yayasan
              </h3>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {printLoading || !printData ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                <p className="mt-2 text-xs">Menyiapkan dokumen LPJ...</p>
              </div>
            ) : (
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto text-slate-900" id="lpj-print-area">
                {/* Kop */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                    {printData.institution}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">{printData.address} • {printData.city}</p>
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-bold underline uppercase tracking-wide">
                    {printData.documentTitle}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Nomor: {printData.documentNumber}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs border p-3 rounded-lg bg-slate-50">
                  <div>
                    <span className="text-slate-500">Unit:</span>{' '}
                    <span className="font-semibold">{printData.submission.unit.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Kegiatan:</span>{' '}
                    <span className="font-semibold">{printData.submission.activity.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Dana Dicairkan:</span>{' '}
                    <span className="font-bold text-blue-700">
                      {formatRupiah(printData.summary.totalDisbursed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Realisasi:</span>{' '}
                    <span className="font-bold text-[#1B4332]">
                      {formatRupiah(printData.summary.totalRealized)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t text-[11px]">
                    <span className="text-slate-500">Status Saldo Akhir:</span>{' '}
                    <span className="font-extrabold text-slate-900">
                      {printData.summary.sisaStatus} — ({formatRupiah(Math.abs(printData.summary.sisa))})
                    </span>
                  </div>
                </div>

                {/* Table Items */}
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r text-center w-8">No</th>
                      <th className="p-2 border-r">Uraian Realisasi Belanja</th>
                      <th className="p-2 border-r text-center">Vol</th>
                      <th className="p-2 border-r text-right">Harga Riil</th>
                      <th className="p-2 border-r text-right">Jumlah (Rp)</th>
                      <th className="p-2 text-center">No. Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printData.submission.lpjItems?.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="p-2 border-r text-center">{idx + 1}</td>
                        <td className="p-2 border-r">{it.uraian}</td>
                        <td className="p-2 border-r text-center">{it.volume} {it.satuan}</td>
                        <td className="p-2 border-r text-right">{formatRupiah(it.hargaSatuan)}</td>
                        <td className="p-2 border-r text-right font-semibold">{formatRupiah(it.total)}</td>
                        <td className="p-2 text-center text-slate-500 font-mono text-[10px]">{it.notaNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={4} className="p-2 text-right border-r">TOTAL PENGELUARAN REALISASI:</td>
                      <td className="p-2 text-right text-[#1B4332]">{formatRupiah(printData.summary.totalRealized)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Tanda Tangan 3 Pihak */}
                <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Pelaksana Kegiatan,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.pelaksana.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printData.signatories.pelaksana.nama}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Diverifikasi Oleh,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.verifikator.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printData.signatories.verifikator.nama}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Mengetahui & Menyetujui,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.mengetahui.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline text-[#1B4332]">{printData.signatories.mengetahui.nama}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1B4332] rounded-lg hover:bg-[#2D6A4F] flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Lembar LPJ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealisasiPage;
