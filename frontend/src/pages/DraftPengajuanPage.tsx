import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Building2,
  Calendar,
  X,
  Loader2,
  Trash2,
  RotateCcw,
  ArrowRight,
  Plus,
  Upload,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { SubmissionListItem, Unit, FiscalYear } from '../types';
import { submissionsService } from '../services/submissions.service';
import { unitsService } from '../services/units.service';
import { fiscalYearsService } from '../services/fiscal-years.service';
import { formatRupiah, formatDate, getErrorMessage } from '../utils/format';
import toast from 'react-hot-toast';

export const DraftPengajuanPage: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [revisionModalSub, setRevisionModalSub] = useState<SubmissionListItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const [deleteConfirmSub, setDeleteConfirmSub] = useState<SubmissionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [detailModalSub, setDetailModalSub] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch Submissions
  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const res = await submissionsService.getAll({
        unitId: selectedUnitId ? Number(selectedUnitId) : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      if (res.data?.items) {
        setSubmissions(res.data.items);
      }
    } catch (err: any) {
      toast.error('Gagal memuat draft pengajuan: ' + getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const u = await unitsService.getAll(true);
        if (u.data) setUnits(u.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedUnitId, selectedStatus]);

  // Handle Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions();
  };

  // Status Badge Mapper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT_UNIT':
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft Unit
          </span>
        );
      case 'MENUNGGU_EVALUASI':
      case 'MENUNGGU_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 animate-pulse">
            <Clock className="w-3 h-3 text-blue-600" /> Menunggu Evaluasi
          </span>
        );
      case 'SEDANG_DIEVALUASI':
      case 'DALAM_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" /> Sedang Dievaluasi
          </span>
        );
      case 'PERLU_REVISI':
      case 'PERLU_REVISI_UNIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Perlu Revisi Unit
          </span>
        );
      case 'SELESAI_EVALUASI':
      case 'REVIEW_SELESAI':
      case 'MENUNGGU_PENCAIRAN':
      case 'SIAP_DICAIRKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai Evaluasi
          </span>
        );
      case 'SUDAH_DICAIRKAN':
      case 'DICAIRKAN':
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Sudah Dicairkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  // Mulai Evaluasi
  const handleStartReview = async (sub: SubmissionListItem) => {
    try {
      if (sub.status === 'MENUNGGU_REVIEW' || (sub.status as any) === 'MENUNGGU_EVALUASI') {
        await submissionsService.updateWorkflowStatus(sub.id, {
          status: 'SEDANG_DIEVALUASI',
        });
      }
      navigate(`/evaluasi?id=${sub.id}`);
    } catch (err: any) {
      console.error(err);
      navigate(`/evaluasi?id=${sub.id}`);
    }
  };

  // Kembalikan untuk Revisi
  const handleConfirmRevision = async () => {
    if (!revisionModalSub) return;
    if (!revisionNotes.trim()) {
      toast.error('Silakan isi catatan evaluasi / alasan pengembalian.');
      return;
    }
    try {
      setIsSubmittingRevision(true);
      await submissionsService.updateWorkflowStatus(revisionModalSub.id, {
        status: 'PERLU_REVISI',
        notes: revisionNotes.trim(),
      });
      toast.success(`Pengajuan ${revisionModalSub.submissionNumber} dikembalikan ke unit untuk revisi.`);
      setRevisionModalSub(null);
      setRevisionNotes('');
      fetchSubmissions();
    } catch (err: any) {
      toast.error('Gagal mengembalikan pengajuan: ' + getErrorMessage(err));
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Hapus Pengajuan
  const handleConfirmDelete = async () => {
    if (!deleteConfirmSub) return;
    try {
      setIsDeleting(true);
      await submissionsService.delete(deleteConfirmSub.id);
      toast.success(`Pengajuan ${deleteConfirmSub.submissionNumber} berhasil dihapus.`);
      setDeleteConfirmSub(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error('Gagal menghapus pengajuan: ' + getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Lihat Detail Modal
  const handleOpenDetail = async (sub: SubmissionListItem) => {
    try {
      setIsLoadingDetail(true);
      const res = await submissionsService.getById(sub.id);
      if (res.data) {
        setDetailModalSub(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat rincian pengajuan');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            Kotak Masuk Bendahara Umum
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Draft Pengajuan Anggaran Unit
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Daftar seluruh usulan kegiatan yang diajukan oleh unit sekolah sebelum dievaluasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pengajuan-unit')}
            className="px-4 py-2.5 bg-gradient-to-r from-[#14532D] to-[#166534] hover:from-[#166534] hover:to-[#15803D] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-200" /> Input Pengajuan Unit
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nomor pengajuan atau nama kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value ? Number(e.target.value) : '')}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Unit Sekolah</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Status Alur</option>
            <option value="MENUNGGU_REVIEW">Menunggu Evaluasi</option>
            <option value="DALAM_REVIEW">Sedang Dievaluasi</option>
            <option value="PERLU_REVISI">Perlu Revisi Unit</option>
            <option value="SELESAI_EVALUASI">Selesai Evaluasi</option>
            <option value="DICAIRKAN">Sudah Dicairkan</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
            <p className="text-xs font-medium">Memuat data pengajuan unit...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada pengajuan ditemukan.</p>
            <p className="text-xs text-slate-400">
              Unit dapat membuat pengajuan baru melalui menu Pengajuan Unit.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-800">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. Pengajuan</th>
                  <th className="py-3 px-4">Unit Sekolah</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Tanggal Diajukan</th>
                  <th className="py-3 px-4 text-right">Total Usulan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Bendahara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const isDone = ['REVIEW_SELESAI', 'SELESAI_EVALUASI', 'MENUNGGU_PENCAIRAN', 'DICAIRKAN', 'SELESAI'].includes(sub.status);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {sub.submissionNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-950">
                        {typeof sub.unit === 'string' ? sub.unit : ((sub.unit as any)?.name || 'Unit Yayasan')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {sub.title}
                        {sub.picName && (
                          <span className="block text-[11px] text-slate-500 font-normal">
                            PIC: {sub.picName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(sub.activityDate || sub.submittedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatRupiah(sub.totalAnggaran || sub.totalExcel || (sub as any).totalAmount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(sub.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Mulai Evaluasi */}
                          <button
                            type="button"
                            onClick={() => handleStartReview(sub)}
                            className="px-3 py-1.5 bg-[#14532D] hover:bg-[#166534] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                            title="Buka Evaluasi & Koreksi"
                          >
                            <Layers className="w-3.5 h-3.5 text-emerald-300" />
                            {isDone ? 'Buka Evaluasi' : 'Mulai Evaluasi'}
                          </button>

                          {/* Lihat Detail */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(sub)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Lihat Detail Item"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Kembalikan untuk Revisi */}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevisionModalSub(sub);
                                setRevisionNotes('');
                              }}
                              className="p-1.5 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                              title="Kembalikan ke Unit untuk Revisi"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Hapus jika belum selesai */}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmSub(sub)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Pengajuan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL KEMBALIKAN UNTUK REVISI ── */}
      {revisionModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Kembalikan Pengajuan untuk Revisi Unit
              </h3>
              <button
                type="button"
                onClick={() => setRevisionModalSub(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
              <p>
                <strong>Nomor:</strong> {revisionModalSub.submissionNumber}
              </p>
              <p>
                <strong>Kegiatan:</strong> {revisionModalSub.title}
              </p>
              <p>
                <strong>Unit:</strong> {typeof revisionModalSub.unit === 'string' ? revisionModalSub.unit : ((revisionModalSub.unit as any)?.name || 'Unit')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Koreksi & Alasan Pengembalian <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Tuliskan dengan jelas poin-poin yang harus diperbaiki oleh unit (misal: sesuaikan harga modul, kurangi hari konsumsi, dll)..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModalSub(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                disabled={isSubmittingRevision}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSubmittingRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Kirim Catatan Revisi ke Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ── */}
      {deleteConfirmSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Hapus Draft Pengajuan?
            </h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus pengajuan{' '}
              <strong className="text-slate-800">{deleteConfirmSub.submissionNumber}</strong> ({deleteConfirmSub.title})?
              Data yang dihapus tidak dapat dipulihkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSub(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Ya, Hapus Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL PENGAJUAN ── */}
      {detailModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {detailModalSub.title}
                </h3>
                <p className="text-xs text-emerald-800 font-mono">
                  {detailModalSub.submissionNumber} • {detailModalSub.unit?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalSub(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left text-slate-800">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="py-2 px-3 text-center">No</th>
                      <th className="py-2 px-3">Uraian Barang / Kebutuhan</th>
                      <th className="py-2 px-3 text-right">Harga Satuan</th>
                      <th className="py-2 px-3 text-center">Rincian Volume</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailModalSub.items?.map((it: any, idx: number) => (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{it.uraian}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatRupiah(it.unitPrice)}</td>
                        <td className="py-2 px-3 text-center font-mono text-emerald-800 bg-emerald-50/50">
                          {it.rincianVolume || it.keterangan || `${it.volume} ${it.satuan}`}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(it.totalPrice || it.total || it.unitPrice * it.volume)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs">
                <span className="text-slate-500">Total Pengajuan: </span>
                <strong className="text-emerald-800 font-mono text-sm">
                  {formatRupiah(detailModalSub.totalAmount || 0)}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  const s = detailModalSub;
                  setDetailModalSub(null);
                  handleStartReview(s);
                }}
                className="px-4 py-2 bg-[#14532D] text-white rounded-xl text-xs font-bold hover:bg-[#166534]"
              >
                Mulai Evaluasi Keuangan →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPengajuanPage;
