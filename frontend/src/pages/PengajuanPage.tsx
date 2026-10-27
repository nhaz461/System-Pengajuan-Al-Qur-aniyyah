import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
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
  Check,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Trash2,
} from 'lucide-react';
import {
  SubmissionListItem,
  SubmissionDetail,
  SubmissionPreviewResponse,
  SubmissionStatus,
  Unit,
  Activity,
  FiscalYear,
} from '../types';
import { submissionsService } from '../services/submissions.service';
import { unitsService } from '../services/units.service';
import { activitiesService } from '../services/activities.service';
import { fiscalYearsService } from '../services/fiscal-years.service';
import { formatRupiah, formatDate, formatDateTime, getErrorMessage } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Status Badge Helper ───────────────────────────────────────
const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  switch (status) {
    case 'DRAFT':
      return <span className="badge-gray">Draft</span>;
    case 'MENUNGGU_REVIEW':
      return <span className="badge-yellow">● Menunggu Review</span>;
    case 'DALAM_REVIEW':
      return <span className="badge bg-blue-100 text-blue-800">● Dalam Review</span>;
    case 'PERLU_REVISI':
      return <span className="badge-red">● Perlu Revisi</span>;
    case 'REVIEW_SELESAI':
      return <span className="badge bg-purple-100 text-purple-800">● Review Selesai</span>;
    case 'MENUNGGU_APPROVAL':
      return <span className="badge bg-indigo-100 text-indigo-800">● Menunggu Approval</span>;
    case 'DISETUJUI':
      return <span className="badge-green">✓ Disetujui</span>;
    case 'DITOLAK':
      return <span className="badge-red">✗ Ditolak</span>;
    case 'MENUNGGU_PENCAIRAN':
      return <span className="badge bg-amber-100 text-amber-800">● Menunggu Pencairan</span>;
    case 'DICAIRKAN':
      return <span className="badge bg-teal-100 text-teal-800">✓ Dicairkan</span>;
    case 'SELESAI':
      return <span className="badge bg-gray-100 text-gray-800">✓ Selesai</span>;
    default:
      return <span className="badge-gray">{status}</span>;
  }
};

// ─── Modal Upload & Preview Pengajuan (Section F & G) ───────────
interface UploadModalProps {
  units: Unit[];
  activities: Activity[];
  fiscalYears: FiscalYear[];
  onClose: () => void;
  onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  units,
  activities,
  fiscalYears,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedUnitId, setSelectedUnitId] = useState<number>(
    user?.role === 'UNIT' && user.unit ? user.unit.id : units[0]?.id || 0
  );
  const [selectedActivityId, setSelectedActivityId] = useState<number>(
    activities[0]?.id || 0
  );
  const [selectedFyId, setSelectedFyId] = useState<number>(
    fiscalYears.find((f) => f.isActive)?.id || fiscalYears[0]?.id || 0
  );
  const [title, setTitle] = useState('');
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [picName, setPicName] = useState(user?.name || '');
  const [notes, setNotes] = useState('');

  // File & preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReadingExcel, setIsReadingExcel] = useState(false);
  const [previewData, setPreviewData] = useState<SubmissionPreviewResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (file: File) => {
    setError('');
    setSelectedFile(file);
    setIsReadingExcel(true);

    try {
      const res = await submissionsService.preview(file);
      if (res.success && res.data) {
        setPreviewData(res.data);
        if (!title.trim() && res.data.detectedActivity) {
          setTitle(`Pengajuan Anggaran ${res.data.detectedActivity}`);
        } else if (!title.trim()) {
          setTitle(`Pengajuan Anggaran ${file.name.replace(/\.[^/.]+$/, '')}`);
        }
        toast.success(
          `Sheet "${res.data.sheetName}" terbaca: ${res.data.totalItems} baris transaksi belanja.`
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setSelectedFile(null);
      setPreviewData(null);
    } finally {
      setIsReadingExcel(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData) {
      setError('Silakan pilih dan validasi file Excel pengajuan terlebih dahulu.');
      return;
    }
    if (!selectedUnitId) {
      setError('Unit pengusul wajib dipilih.');
      return;
    }
    if (!selectedActivityId) {
      setError('Master Kegiatan wajib dipilih.');
      return;
    }
    if (!activityDate) {
      setError('Tanggal pelaksanaan kegiatan wajib diisi.');
      return;
    }
    if (!picName.trim()) {
      setError('Nama PIC / Yang mengajukan kegiatan wajib diisi.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await submissionsService.create({
        unitId: selectedUnitId,
        activityId: selectedActivityId,
        fiscalYearId: selectedFyId,
        title: title.trim(),
        activityDate,
        picName: picName.trim(),
        notes: notes.trim() || undefined,
        tempFilePath: previewData.tempFilePath,
        filename: previewData.filename,
        items: previewData.items,
        totalExcel: previewData.totalExcel,
        totalParsing: previewData.totalParsing,
      });

      if (res.success) {
        toast.success(res.message || 'Pengajuan anggaran berhasil disimpan.');
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto border border-gray-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Upload Pengajuan Anggaran Unit</h2>
              <p className="text-xs text-gray-500">
                Pilih file Excel usulan anggaran kegiatan untuk divalidasi dan dipratinjau
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Perhatian</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form Meta Pengajuan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">
                Unit Pemohon <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(parseInt(e.target.value))}
                disabled={user?.role === 'UNIT' && !!user.unit}
                className="form-input text-xs"
                required
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Master Kegiatan <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(parseInt(e.target.value))}
                className="form-input text-xs"
                required
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Tahun Anggaran <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFyId}
                onChange={(e) => setSelectedFyId(parseInt(e.target.value))}
                className="form-input text-xs"
                required
              >
                {fiscalYears.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.year} {f.isActive ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Judul / Perihal Pengajuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pengajuan Anggaran Ujian Semester Ganjil 2026"
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="form-label">
                Nama PIC / Yang Mengajukan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Contoh: Ust. Ahmad Fauzi / Panitia Pelaksana"
                className="form-input text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Tanggal Pelaksanaan Kegiatan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="form-input text-xs w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Catatan Tambahan (Opsional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan untuk bagian keuangan..."
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* Upload Area */}
          {!previewData && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary-600 hover:bg-primary-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-800 flex items-center justify-center mx-auto mb-3">
                  {isReadingExcel ? (
                    <Loader2 size={24} className="animate-spin text-primary-700" />
                  ) : (
                    <FileSpreadsheet size={24} />
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {isReadingExcel ? 'Sedang membaca file Excel pengajuan...' : 'Klik untuk memilih file Excel Pengajuan Unit'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format Excel wajib memuat: <strong>No | Kategori | Uraian Barang | Harga Satuan | Volume | Satuan | Jumlah | Keterangan</strong>
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                <span className="text-gray-600">
                  Belum memiliki format resmi? Unduh template Excel pengajuan di sini:
                </span>
                <a
                  href="/api/submissions/template/download"
                  download="Template_Pengajuan_Resmi_Yayasan_2026.xlsx"
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-primary-800 font-semibold"
                >
                  <Download size={13} />
                  Download Format Excel
                </a>
              </div>
            </div>
          )}

          {/* Section G: PREVIEW IMPORT & TOTAL MATCHING */}
          {previewData && (
            <div className="space-y-5">
              {/* Warning jika ada selisih total */}
              {previewData.hasMismatch ? (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900">
                  <AlertTriangle size={20} className="flex-shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">Total Excel dan Hasil Parsing Berbeda!</p>
                    <p className="text-xs text-amber-800 mt-1">
                      {previewData.mismatchWarning || 'Silakan periksa data sebelum menyimpan.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>
                    Validasi Berhasil: <strong>Total Excel dan Hasil Parsing Sesuai (Selisih Rp0).</strong>
                  </span>
                </div>
              )}

              {/* Total Matching Card (Section G) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div>
                  <p className="text-gray-500">File & Sheet</p>
                  <p className="font-semibold text-gray-900 truncate" title={previewData.filename}>
                    {previewData.filename}
                  </p>
                  <p className="text-[11px] text-gray-400">Sheet: {previewData.sheetName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total dari Excel</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    {formatRupiah(previewData.totalExcel)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Hasil Parsing</p>
                  <p className="font-bold text-primary-800 text-sm mt-0.5">
                    {formatRupiah(previewData.totalParsing)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Selisih</p>
                  <p
                    className={`font-bold text-sm mt-0.5 ${
                      previewData.hasMismatch ? 'text-red-600' : 'text-green-700'
                    }`}
                  >
                    {formatRupiah(previewData.selisih)}
                  </p>
                </div>
              </div>

              {/* Pratinjau Item Belanja */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Preview {previewData.totalItems} Item Belanja Usulan
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 underline font-medium"
                  >
                    Ganti File
                  </button>
                </div>

                <div className="table-container border border-gray-200 rounded-xl" style={{ maxHeight: '280px' }}>
                  <table className="w-full table-sticky min-w-[700px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-10">No</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-24">Kategori</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Uraian Barang / Belanja</th>
                        <th className="px-3 py-2 text-right text-gray-600 font-semibold w-28">Harga Satuan</th>
                        <th className="px-3 py-2 text-center text-gray-600 font-semibold w-16">Vol</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-20">Satuan</th>
                        <th className="px-3 py-2 text-right text-gray-600 font-semibold w-28">Jumlah</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-36">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.items.map((it) => (
                        <tr key={it.no} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{it.no}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                              {it.kategori}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            <div>{it.uraian}</div>
                            {it.rincianVolume && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Perkalian: {it.rincianVolume}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatRupiah(it.hargaSatuan)}</td>
                          <td className="px-3 py-2 text-center text-gray-800 font-bold">{it.volume.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2 text-gray-600">{it.satuan}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary-800">
                            {formatRupiah(it.jumlah)}
                          </td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{it.keterangan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs"
            >
              Batal
            </button>
            {previewData && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary text-xs flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Menyimpan Pengajuan...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Konfirmasi & Simpan Pengajuan
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Detail Pengajuan ────────────────────────────────────
interface DetailModalProps {
  submissionId: number;
  onClose: () => void;
  onDelete?: (submission: SubmissionListItem) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ submissionId, onClose, onDelete }) => {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await submissionsService.getById(submissionId);
        if (res.success && res.data) {
          setDetail(res.data);
        }
      } catch (err) {
        toast.error('Gagal memuat detail pengajuan.');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [submissionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 font-mono">
                  {detail?.submissionNumber || 'Detail Pengajuan'}
                </h2>
                {detail && <StatusBadge status={detail.status} />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{detail?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary-800 mx-auto mb-2" />
              <p className="text-xs text-gray-500 ml-2">Memuat rincian pengajuan...</p>
            </div>
          ) : detail ? (
            <>
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <p className="text-gray-400">Unit Pemohon</p>
                  <p className="font-bold text-gray-900 mt-0.5">{detail.unit.name}</p>
                  <span className="font-mono text-[11px] text-gray-500">[{detail.unit.code}]</span>
                </div>
                <div>
                  <p className="text-gray-400">Master Kegiatan</p>
                  <p className="font-bold text-gray-900 mt-0.5">{detail.activity.name}</p>
                  <p className="text-[11px] text-gray-500">TA {detail.fiscalYear.year}</p>
                </div>
                <div>
                  <p className="text-gray-400">Tgl Pelaksanaan</p>
                  <p className="font-bold text-emerald-800 mt-0.5">
                    {detail.activityDate ? formatDate(detail.activityDate) : '-'}
                  </p>
                  <p className="text-[11px] text-gray-600 font-medium">
                    PIC: {detail.picName || detail.submittedBy.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Tanggal Pengajuan</p>
                  <p className="font-bold text-gray-900 mt-0.5">{formatDate(detail.submittedAt)}</p>
                  <p className="text-[11px] text-gray-500">Akun: {detail.submittedBy.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Usulan Anggaran</p>
                  <p className="font-bold text-primary-800 text-sm mt-0.5">
                    {formatRupiah(detail.totalParsing)}
                  </p>
                  <p className="text-[11px] text-gray-400">Excel: {formatRupiah(detail.totalExcel)}</p>
                </div>
              </div>

              {/* Rincian Belanja */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Daftar Rincian Item Belanja ({detail.items.length} Item)
                  </h4>
                </div>
                <div className="table-container border border-gray-200 rounded-xl" style={{ maxHeight: '350px' }}>
                  <table className="w-full table-sticky min-w-[700px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-10">No</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-24">Kategori</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Uraian Belanja</th>
                        <th className="px-3 py-2 text-right text-gray-600 font-semibold w-28">Harga Satuan</th>
                        <th className="px-3 py-2 text-center text-gray-600 font-semibold w-16">Vol</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-20">Satuan</th>
                        <th className="px-3 py-2 text-right text-gray-600 font-semibold w-28">Jumlah</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold w-36">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.items.map((it) => (
                        <tr key={it.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{it.itemNumber}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                              {it.kategori}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{it.uraian}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatRupiah(it.originalPrice)}</td>
                          <td className="px-3 py-2 text-center text-gray-700">{it.volume}</td>
                          <td className="px-3 py-2 text-gray-600">{it.satuan}</td>
                          <td className="px-3 py-2 text-right font-bold text-primary-800">
                            {formatRupiah(it.jumlah)}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{it.keterangan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-3">
            {onDelete && detail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete({
                    id: detail.id,
                    submissionNumber: detail.submissionNumber,
                    title: detail.title,
                    unit: detail.unit.name,
                    unitCode: detail.unit.code,
                    activity: detail.activity.name,
                    fiscalYear: detail.fiscalYear.year,
                    totalAnggaran: detail.totalParsing,
                    totalExcel: detail.totalExcel,
                    selisih: detail.totalParsing - detail.totalExcel,
                    realisasi: 0,
                    status: detail.status,
                    submittedAt: detail.submittedAt,
                    submittedBy: detail.submittedBy.name,
                    picName: detail.picName,
                    activityDate: detail.activityDate,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-semibold text-xs border border-red-200 transition-all shadow-sm"
              >
                <Trash2 size={14} />
                Hapus Pengajuan Ini
              </button>
            )}
            <p className="text-xs text-gray-500 font-mono">
              {detail?.originalFilename ? `File: ${detail.originalFilename}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Pengajuan Page (Section R: Daftar Pengajuan Ringkas) ──
const PengajuanPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('SEMUA');
  const [selectedStatus, setSelectedStatus] = useState<string>('SEMUA');

  // Loading & Modals
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewDetailId, setViewDetailId] = useState<number | null>(null);
  const [deleteSub, setDeleteSub] = useState<SubmissionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Handle Delete Submission
  const handleDelete = async () => {
    if (!deleteSub) return;
    setIsDeleting(true);
    try {
      const res = await submissionsService.delete(deleteSub.id);
      if (res.success) {
        toast.success(res.message || 'Pengajuan berhasil dihapus.');
        setDeleteSub(null);
        loadSubmissions(page, selectedUnitId, selectedStatus, search);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Load Submissions
  const loadSubmissions = async (p = 1, u = selectedUnitId, s = selectedStatus, q = search) => {
    setIsLoading(true);
    try {
      const res = await submissionsService.getAll({
        page: p,
        limit: 50,
        unitId: u !== 'SEMUA' ? parseInt(u) : undefined,
        status: s !== 'SEMUA' ? s : undefined,
        search: q.trim() || undefined,
      });

      if (res.success && res.data) {
        setSubmissions(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar pengajuan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Meta Data (Units, Activities, FiscalYears)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [uRes, aRes, fRes] = await Promise.all([
          unitsService.getAll(),
          activitiesService.getAll(),
          fiscalYearsService.getAll(),
        ]);
        if (uRes.data) setUnits(uRes.data);
        if (aRes.data) setActivities(aRes.data);
        if (fRes.data) setFiscalYears(fRes.data);
      } catch (_) {}
    };
    fetchMeta();
    loadSubmissions(1, 'SEMUA', 'SEMUA', '');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSubmissions(1, selectedUnitId, selectedStatus, search);
  };

  const handleUnitFilterChange = (uVal: string) => {
    setSelectedUnitId(uVal);
    setPage(1);
    loadSubmissions(1, uVal, selectedStatus, search);
  };

  const handleStatusFilterChange = (sVal: string) => {
    setSelectedStatus(sVal);
    setPage(1);
    loadSubmissions(1, selectedUnitId, sVal, search);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="text-primary-800" size={24} />
            Pengajuan Anggaran Unit
          </h1>
          <p className="page-subtitle">
            Upload dan pantau usulan rencana anggaran kegiatan unit yayasan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/submissions/template/download"
            download="Template_Pengajuan_Resmi_Yayasan_2026.xlsx"
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Download Format Standar Excel Pengajuan"
          >
            <Download size={14} />
            Download Format Excel
          </a>

          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Upload size={14} />
            + Upload Pengajuan Excel
          </button>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no pengajuan, perihal, unit..."
            className="form-input pl-9 text-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Unit Filter (Untuk Admin / Keuangan / Pimpinan) */}
          {user?.role !== 'UNIT' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Building2 size={14} className="text-gray-400" />
              <select
                value={selectedUnitId}
                onChange={(e) => handleUnitFilterChange(e.target.value)}
                className="form-input text-xs py-1.5"
              >
                <option value="SEMUA">Semua Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="form-input text-xs py-1.5"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="MENUNGGU_REVIEW">Menunggu Review</option>
              <option value="DALAM_REVIEW">Dalam Review</option>
              <option value="PERLU_REVISI">Perlu Revisi</option>
              <option value="REVIEW_SELESAI">Review Selesai</option>
              <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="DITOLAK">Ditolak</option>
              <option value="DICAIRKAN">Dicairkan</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Sesuai Spesifikasi Section R: No Pengajuan | Unit | Kegiatan | Total Anggaran | Realisasi | Status ── */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="table-container" style={{ maxHeight: '600px' }}>
          <table className="w-full table-sticky min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-48">No Pengajuan</th>
                <th className="px-4 py-3 text-left w-44">Unit</th>
                <th className="px-4 py-3 text-left">Kegiatan</th>
                <th className="px-4 py-3 text-right w-36">Total Anggaran</th>
                <th className="px-4 py-3 text-right w-32">Realisasi</th>
                <th className="px-4 py-3 text-left w-40">Status</th>
                <th className="px-4 py-3 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 size={24} className="animate-spin text-primary-800 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Memuat data pengajuan unit...</p>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <FileText size={36} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Belum ada pengajuan anggaran.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Klik <strong>"+ Upload Pengajuan Excel"</strong> untuk mengunggah pengajuan anggaran baru.
                    </p>
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => setViewDetailId(sub.id)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-primary-900 group-hover:text-primary-700">
                        {sub.submissionNumber}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatDate(sub.submittedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{sub.unit}</p>
                      <span className="text-[11px] text-gray-400 font-mono">[{sub.unitCode}]</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{sub.activity}</p>
                      <p className="text-[11px] text-gray-500 truncate max-w-xs">{sub.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        {sub.activityDate && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            <Calendar size={11} /> {formatDate(sub.activityDate)}
                          </span>
                        )}
                        {sub.picName && (
                          <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            PIC: {sub.picName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs">
                      {formatRupiah(sub.totalAnggaran)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500 text-xs">
                      {formatRupiah(sub.realisasi)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewDetailId(sub.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                          title="Lihat Detail Rincian"
                        >
                          <Eye size={13} />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => setDeleteSub(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-all shadow-sm"
                          title="Hapus Dokumen Pengajuan"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <p>
            Total <strong>{total}</strong> dokumen pengajuan anggaran
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  loadSubmissions(p, selectedUnitId, selectedStatus, search);
                }}
                className="btn btn-secondary btn-sm"
              >
                Sebelumnya
              </button>
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  loadSubmissions(p, selectedUnitId, selectedStatus, search);
                }}
                className="btn btn-secondary btn-sm"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Upload Pengajuan ── */}
      {showUploadModal && (
        <UploadModal
          units={units}
          activities={activities}
          fiscalYears={fiscalYears}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => loadSubmissions(1, selectedUnitId, selectedStatus, search)}
        />
      )}

      {/* ── Modal Detail Pengajuan ── */}
      {viewDetailId && (
        <DetailModal
          submissionId={viewDetailId}
          onClose={() => setViewDetailId(null)}
          onDelete={(subToDelete) => setDeleteSub(subToDelete)}
        />
      )}

      {/* ── Modal Konfirmasi Hapus Pengajuan ── */}
      {deleteSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-gray-900">Hapus Pengajuan Anggaran?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus berkas pengajuan ini?
              </p>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-left text-xs space-y-1 mt-2">
                <p className="font-mono font-bold text-gray-900">{deleteSub.submissionNumber}</p>
                <p className="text-gray-700 font-medium truncate">{deleteSub.title}</p>
                <p className="text-gray-500">{deleteSub.unit} • TA {deleteSub.fiscalYear}</p>
                <p className="text-primary-800 font-bold">{formatRupiah(deleteSub.totalAnggaran)}</p>
              </div>
              <p className="text-[11px] text-red-600 font-medium pt-1">
                Perhatian: Seluruh rincian item belanja dan riwayat dokumen ini akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteSub(null)}
                className="flex-1 btn-secondary text-xs py-2"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengajuanPage;
