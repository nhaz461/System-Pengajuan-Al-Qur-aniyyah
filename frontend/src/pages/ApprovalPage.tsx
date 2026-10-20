import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approvalService,
  ApprovalDetailResponse,
  LembarPengesahanData,
} from '../services/approval.service';
import { SubmissionListItem } from '../types';
import { formatDate } from '../utils/format';

export const ApprovalPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ApprovalDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Decision Form State
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Lembar Pengesahan Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<LembarPengesahanData | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await approvalService.getSubmissions({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setSubmissions(res.data?.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar pengajuan.');
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

  const getUnitName = (u: any) => (typeof u === 'string' ? u : u?.name || '-');
  const getActivityName = (a: any) => (typeof a === 'string' ? a : a?.name || '-');
  const getFiscalYear = (f: any) => (typeof f === 'number' ? f : f?.year || 2026);

  const handleOpenDetail = async (id: number) => {
    setSelectedSubId(id);
    setDetailLoading(true);
    try {
      const res = await approvalService.getDetail(id);
      if (res.data) {
        setDetailData(res.data);
        const sub = res.data.submission;
        const defaultAmount = sub.totalApproved ?? (sub.totalReviewed ?? sub.totalParsing);
        setApprovedAmount(defaultAmount);
        setDecisionNotes(sub.approvalNotes || '');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat detail pengajuan.');
      setSelectedSubId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecision = async (action: 'APPROVE' | 'REJECT' | 'REVISION') => {
    if (!selectedSubId) return;

    if (action === 'REJECT' && !decisionNotes.trim()) {
      toast.error('Mohon isi alasan penolakan pada kolom catatan.');
      return;
    }

    if (action === 'REVISION' && !decisionNotes.trim()) {
      toast.error('Mohon isi instruksi koreksi pada kolom Catatan / Instruksi Pimpinan agar bendahara memahami bagian yang perlu diperbaiki.');
      return;
    }

    if (action === 'APPROVE' && approvedAmount <= 0) {
      toast.error('Nominal disetujui harus lebih dari Rp 0.');
      return;
    }

    try {
      setActionProcessing(true);
      const res = await approvalService.decide(selectedSubId, {
        action,
        approvedAmount: action === 'APPROVE' ? approvedAmount : undefined,
        notes: decisionNotes,
      });
      toast.success(res.message || 'Keputusan berhasil disimpan!');
      setSelectedSubId(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan keputusan.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenPrint = async (id: number) => {
    setPrintLoading(true);
    setShowPrintModal(true);
    try {
      const res = await approvalService.getLembarPengesahan(id);
      if (res.data) {
        setPrintData(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat lembar pengesahan.');
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Menunggu Persetujuan
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Disetujui Pimpinan
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      case 'PERLU_REVISI':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Perlu Revisi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Hak Otoritas Khusus Pimpinan Yayasan
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Persetujuan Pimpinan (Approval Workflow)
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-2xl">
            Telaah final rencana anggaran belanja unit, analisis kepatuhan Standar Satuan Harga (SSH), dan berikan penetapan disposisi persetujuan anggaran.
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
              onClick={() => setStatusFilter('MENUNGGU_APPROVAL')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'MENUNGGU_APPROVAL'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Menunggu Persetujuan
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
              Telah Disetujui
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DITOLAK')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'DITOLAK'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Ditolak
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PERLU_REVISI')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                statusFilter === 'PERLU_REVISI'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
              }`}
            >
              Perlu Revisi
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

      {/* Submissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">No Pengajuan & Judul</th>
                <th className="px-5 py-3.5">Unit & Kegiatan</th>
                <th className="px-5 py-3.5 text-right">Usulan Unit</th>
                <th className="px-5 py-3.5 text-right">Hasil Review</th>
                <th className="px-5 py-3.5 text-right">Disetujui Pimpinan</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                    <p className="mt-2 text-xs">Memuat daftar pengajuan...</p>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileCheck2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    Tidak ada berkas pengajuan dalam kriteria ini.
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
                      <div className="font-medium text-slate-800">{getUnitName(item.unit)}</div>
                      <div className="text-xs text-slate-500">{getActivityName(item.activity)} • TA {getFiscalYear(item.fiscalYear)}</div>
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
                    <td className="px-5 py-4 text-right font-medium text-slate-600">
                      {formatRupiah(item.totalExcel || (item as any).totalAnggaran)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                      {formatRupiah(item.totalReviewed || item.totalExcel || (item as any).totalAnggaran)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-[#1B4332]">
                      {item.totalApproved ? formatRupiah(item.totalApproved) : '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Telaah <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {item.status === 'DISETUJUI' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(item.id)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            title="Cetak Lembar Pengesahan"
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

      {/* Modal Workspace Persetujuan Pimpinan */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                  Workspace Persetujuan Pimpinan
                </div>
                <h3 className="text-lg font-bold">
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

            {/* Modal Body */}
            {detailLoading || !detailData ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1B4332] border-t-transparent"></div>
                <p className="mt-3 text-sm">Menyiapkan berkas telaah pimpinan...</p>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Info Card & Executive Comparison Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Usulan Awal Unit</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">
                      {formatRupiah(detailData.stats.totalOriginal)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Diajukan oleh: {detailData.submission.submittedBy?.name || 'Unit'}
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <div className="text-xs text-emerald-700 font-medium">Rekomendasi Keuangan</div>
                    <div className="text-lg font-bold text-emerald-800 mt-1">
                      {formatRupiah(detailData.stats.totalReviewed)}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Efisiensi SSH: {formatRupiah(detailData.stats.selisihReview)}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="text-xs text-amber-700 font-medium">Kepatuhan Terhadap SSH</div>
                    <div className="text-sm font-semibold text-amber-900 mt-1">
                      {detailData.stats.countSesuai} Sesuai • {detailData.stats.countMelebihi} Melebihi • {detailData.stats.countTidakAda} Non-SSH
                    </div>
                    <div className="text-xs text-amber-700 mt-1">
                      Total {detailData.stats.itemCount} rincian item belanja
                    </div>
                  </div>
                </div>

                {/* Subtitle / Catatan Keuangan */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                  <div className="font-semibold mb-1">Catatan Telaah Bagian Keuangan:</div>
                  <p className="italic">
                    "{detailData.submission.reviews?.[0]?.notes || 'Seluruh rincian telah disesuaikan dengan plafon SSH Yayasan 2026.'}"
                  </p>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1B4332]" />
                    Rincian Belanja Yang Diajukan
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 font-semibold text-slate-700 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Uraian Barang / Kegiatan</th>
                          <th className="p-2.5 text-center">Vol & Satuan</th>
                          <th className="p-2.5 text-right">Harga Unit</th>
                          <th className="p-2.5 text-right">Harga SSH</th>
                          <th className="p-2.5 text-right">Harga Review</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.submission.items?.map((it, idx) => {
                          const effPrice = it.reviewPrice ?? it.originalPrice;
                          const subtotal = it.volume * effPrice;
                          return (
                            <tr key={it.id} className="hover:bg-slate-50">
                              <td className="p-2.5 text-slate-500">{idx + 1}</td>
                              <td className="p-2.5">
                                <div className="font-medium text-slate-900">{it.uraian}</div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {it.keterangan && (
                                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                      {it.keterangan}
                                    </span>
                                  )}
                                  {it.reviewNote && (
                                    <span className="text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                      {it.reviewNote}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-center">{it.volume} {it.satuan}</td>
                              <td className="p-2.5 text-right text-slate-600">{formatRupiah(it.originalPrice)}</td>
                              <td className="p-2.5 text-right text-indigo-700 font-medium">
                                {it.sshPrice ? formatRupiah(it.sshPrice) : '-'}
                              </td>
                              <td className="p-2.5 text-right text-emerald-700 font-bold">
                                {formatRupiah(effPrice)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-slate-900">
                                {formatRupiah(subtotal)}
                              </td>
                              <td className="p-2.5 text-center">
                                {it.sshStatus === 'SESUAI_SSH' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    Sesuai SSH
                                  </span>
                                )}
                                {it.sshStatus === 'MELEBIHI_SSH' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                                    Melebihi SSH
                                  </span>
                                )}
                                {it.sshStatus === 'TIDAK_DITEMUKAN_DI_SSH' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    Non-SSH
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Form Disposisi Pimpinan */}
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
                    Formulir Penetapan Disposisi Pimpinan
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nominal Anggaran Disetujui (Rp)
                      </label>
                      <input
                        type="number"
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] font-semibold text-[#1B4332]"
                      />
                      <div className="text-[11px] text-slate-500 mt-1">
                        Terbilang: {formatRupiah(approvedAmount)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Catatan / Instruksi Pimpinan
                      </label>
                      <textarea
                        rows={2}
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Tuliskan arahan atau disposisi resmi pimpinan..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B4332]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={() => handleDecision('REJECT')}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Tolak Pengajuan
                </button>
                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={() => handleDecision('REVISION')}
                  className="px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" /> Minta Revisi
                </button>
                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={() => handleDecision('APPROVE')}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-lg hover:opacity-95 shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  Setujui & Sahkan Anggaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Lembar Pengesahan */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Lembar Pengesahan Resmi Yayasan
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
                <p className="mt-2 text-xs">Menyiapkan lembar cetak...</p>
              </div>
            ) : (
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto text-slate-900" id="print-area">
                {/* Kop Surat */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                    {printData.header.institution}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">{printData.header.address}</p>
                  <p className="text-xs text-slate-600">{printData.header.city}</p>
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-bold underline uppercase tracking-wide">
                    {printData.header.documentTitle}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Nomor: {printData.submission.submissionNumber}
                  </p>
                </div>

                {/* Metadata Belanja */}
                <div className="grid grid-cols-2 gap-2 text-xs border p-3 rounded-lg bg-slate-50">
                  <div>
                    <span className="text-slate-500">Unit Pemohon:</span>{' '}
                    <span className="font-semibold">{printData.submission.unit.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Kegiatan:</span>{' '}
                    <span className="font-semibold">{printData.submission.activity.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Perihal:</span>{' '}
                    <span className="font-semibold">{printData.submission.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Disetujui:</span>{' '}
                    <span className="font-bold text-[#1B4332]">
                      {formatRupiah(printData.submission.totalApproved)}
                    </span>
                  </div>
                  {printData.submission.activityDate && (
                    <div>
                      <span className="text-slate-500">Tgl Pelaksanaan:</span>{' '}
                      <span className="font-semibold text-emerald-800">
                        {formatDate(printData.submission.activityDate)}
                      </span>
                    </div>
                  )}
                  {printData.submission.picName && (
                    <div>
                      <span className="text-slate-500">Nama PIC:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {printData.submission.picName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ringkasan Item */}
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r">No</th>
                      <th className="p-2 border-r">Uraian Kebutuhan Belanja</th>
                      <th className="p-2 border-r text-center">Vol</th>
                      <th className="p-2 border-r text-right">Harga Satuan Disetujui</th>
                      <th className="p-2 text-right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printData.submission.items?.map((it, idx) => {
                      const effPrice = it.reviewPrice ?? it.originalPrice;
                      return (
                        <tr key={it.id}>
                          <td className="p-2 border-r text-center">{idx + 1}</td>
                          <td className="p-2 border-r">{it.uraian}</td>
                          <td className="p-2 border-r text-center">{it.volume} {it.satuan}</td>
                          <td className="p-2 border-r text-right">{formatRupiah(effPrice)}</td>
                          <td className="p-2 text-right font-semibold">{formatRupiah(it.volume * effPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={4} className="p-2 text-right border-r">TOTAL ANGGARAN DISETUJUI:</td>
                      <td className="p-2 text-right text-[#1B4332]">{formatRupiah(printData.submission.totalApproved)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Tanda Tangan 3 Pihak */}
                <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Pemohon,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.pemohon.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printData.signatories.pemohon.nama}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Diverifikasi Oleh,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.keuangan.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{printData.signatories.keuangan.nama}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Mengesahkan,</p>
                    <p className="font-semibold text-slate-800">{printData.signatories.pimpinan.jabatan}</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline text-[#1B4332]">{printData.signatories.pimpinan.nama}</p>
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
                <Printer className="w-4 h-4" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApprovalPage;
