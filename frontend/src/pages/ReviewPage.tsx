import React, { useEffect, useState, useRef } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  RotateCcw,
  Check,
  ChevronRight,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  FileText,
  Loader2,
  Save,
  Info,
  X,
} from 'lucide-react';
import {
  SubmissionListItem,
  SubmissionItem,
  SubmissionStatus,
  ReviewDetailResponse,
  Unit,
} from '../types';
import { reviewService } from '../services/review.service';
import { unitsService } from '../services/units.service';
import { formatRupiah, formatDate, formatDateTime, getErrorMessage } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Status Badge ──────────────────────────────────────────────
const ReviewStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'SESUAI_SSH':
      return <span className="badge-green font-semibold">✓ SESUAI SSH</span>;
    case 'MELEBIHI_SSH':
      return <span className="badge-red font-semibold">▲ MELEBIHI SSH</span>;
    case 'PERLU_CEK':
      return <span className="badge-yellow font-semibold">? PERLU CEK</span>;
    case 'TIDAK_DITEMUKAN_DI_SSH':
      return <span className="badge-gray">○ TIDAK ADA DI SSH</span>;
    default:
      return <span className="badge-gray">{status}</span>;
  }
};

const SubmissionWorkflowBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  switch (status) {
    case 'MENUNGGU_REVIEW':
      return <span className="badge-yellow font-semibold">● Menunggu Review</span>;
    case 'DALAM_REVIEW':
      return <span className="badge bg-blue-100 text-blue-800 font-semibold">● Dalam Review</span>;
    case 'PERLU_REVISI':
      return <span className="badge-red font-semibold">● Perlu Revisi</span>;
    case 'REVIEW_SELESAI':
    case 'MENUNGGU_APPROVAL':
      return <span className="badge bg-purple-100 text-purple-800 font-semibold">✓ Menunggu Approval</span>;
    case 'DISETUJUI':
      return <span className="badge-green font-semibold">✓ Disetujui</span>;
    case 'DITOLAK':
      return <span className="badge-red font-semibold">✗ Ditolak</span>;
    default:
      return <span className="badge-gray">{status}</span>;
  }
};

// ─── Inline Editable Item Row (Section L) ──────────────────────
interface ItemRowProps {
  item: SubmissionItem;
  idx: number;
  onItemUpdated: (updatedItem: SubmissionItem, newTotalReviewed: number) => void;
  onOpenSshMatcher: (item: SubmissionItem) => void;
}

const InlineItemRow: React.FC<ItemRowProps> = ({ item, idx, onItemUpdated, onOpenSshMatcher }) => {
  const [reviewPrice, setReviewPrice] = useState<string>(
    item.reviewPrice !== null && item.reviewPrice !== undefined
      ? String(item.reviewPrice)
      : ''
  );
  const [volume, setVolume] = useState<string>(String(item.volume));
  const [reviewNote, setReviewNote] = useState<string>(item.reviewNote || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state if prop updates
  useEffect(() => {
    setReviewPrice(
      item.reviewPrice !== null && item.reviewPrice !== undefined
        ? String(item.reviewPrice)
        : ''
    );
    setVolume(String(item.volume));
    setReviewNote(item.reviewNote || '');
  }, [item]);

  const saveChanges = async (newPriceVal?: string, newNoteVal?: string, newVolumeVal?: string) => {
    const pVal = newPriceVal !== undefined ? newPriceVal : reviewPrice;
    const nVal = newNoteVal !== undefined ? newNoteVal : reviewNote;
    const vVal = newVolumeVal !== undefined ? newVolumeVal : volume;

    const numPrice = pVal.trim() === '' ? null : parseFloat(pVal.replace(/[^0-9.]/g, ''));
    if (numPrice !== null && isNaN(numPrice)) return;

    const numVolume = vVal.trim() === '' ? item.volume : parseFloat(vVal);
    if (isNaN(numVolume) || numVolume <= 0) return;

    setIsSaving(true);
    try {
      const res = await reviewService.updateItem(item.id, {
        reviewPrice: numPrice,
        reviewNote: nVal.trim() || undefined,
        volume: numVolume,
      });

      if (res.success && res.data) {
        onItemUpdated(res.data.item, res.data.totalReviewed);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleApplySshPrice = () => {
    if (item.sshPrice !== null && item.sshPrice !== undefined) {
      const sshStr = String(item.sshPrice);
      setReviewPrice(sshStr);
      saveChanges(sshStr, reviewNote || 'Disesuaikan dengan standar harga SSH 2026', volume);
      toast.success(`Harga disesuaikan ke SSH: ${formatRupiah(item.sshPrice)}`);
    }
  };

  const handleResetToOriginal = () => {
    setReviewPrice('');
    setVolume(String(item.volume));
    saveChanges('', '', String(item.volume));
    toast.success('Harga review dikembalikan ke harga pengajuan asli.');
  };

  // Kalkulasi total review real-time
  const currentEffPrice =
    reviewPrice.trim() !== ''
      ? parseFloat(reviewPrice.replace(/[^0-9.]/g, '')) || 0
      : item.originalPrice;
  const currentVol =
    volume.trim() !== '' && !isNaN(parseFloat(volume))
      ? parseFloat(volume)
      : item.volume;
  const currentTotalReview = currentVol * currentEffPrice;

  // Status visual real-time
  let currentStatus = item.sshStatus;
  if (item.sshPrice !== null && item.sshPrice !== undefined) {
    if (currentEffPrice > item.sshPrice) {
      currentStatus = 'MELEBIHI_SSH';
    } else {
      currentStatus = 'SESUAI_SSH';
    }
  }

  const isExceeding = currentStatus === 'MELEBIHI_SSH';
  const hasPriceChanged = reviewPrice.trim() !== '' && parseFloat(reviewPrice) !== item.originalPrice;
  const hasVolumeChanged = volume.trim() !== '' && parseFloat(volume) !== item.volume;
  const hasChanged = hasPriceChanged || hasVolumeChanged;

  return (
    <tr
      className={`transition-colors border-b border-gray-100 ${
        isExceeding
          ? 'bg-red-50/30 hover:bg-red-50/50'
          : hasChanged
          ? 'bg-blue-50/30 hover:bg-blue-50/50'
          : 'hover:bg-gray-50/70'
      }`}
    >
      {/* No */}
      <td className="px-3 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>

      {/* Uraian & Kategori */}
      <td className="px-3 py-3">
        <p className="font-semibold text-gray-900 text-xs">{item.uraian}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
            {item.kategori}
          </span>
          {item.keterangan && (
            <span className="text-[11px] text-gray-400 truncate max-w-xs" title={item.keterangan}>
              • {item.keterangan}
            </span>
          )}
        </div>
      </td>

      {/* Harga Pengajuan (Original Price - Section M: JANGAN DIUBAH) */}
      <td className="px-3 py-3 text-right">
        <p className="font-mono text-xs font-semibold text-gray-700">
          {formatRupiah(item.originalPrice)}
        </p>
        <span className="text-[10px] text-gray-400">Harga Asli</span>
      </td>

      {/* Harga Acuan SSH 2026 */}
      <td className="px-3 py-3 text-right">
        {item.sshPrice !== null && item.sshPrice !== undefined ? (
          <div>
            <p className="font-mono text-xs font-bold text-primary-900">
              {formatRupiah(item.sshPrice)}
            </p>
            {item.sshItem?.kode && (
              <span className="text-[10px] text-primary-700 font-mono block">
                {item.sshItem.kode}
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenSshMatcher(item)}
              className="text-[10px] text-primary-700 hover:text-primary-900 hover:underline inline-flex items-center gap-0.5 mt-0.5"
              title="Ganti atau cari item SSH yang sesuai"
            >
              <Search size={10} /> Ubah SSH
            </button>
          </div>
        ) : (
          <div>
            <span className="text-gray-400 italic text-[11px] block">Tidak ada</span>
            <button
              type="button"
              onClick={() => onOpenSshMatcher(item)}
              className="text-[10px] text-primary-800 hover:text-primary-950 font-semibold hover:underline inline-flex items-center gap-0.5 mt-0.5"
              title="Cari item SSH yang mirip karena perbedaan kata"
            >
              <Search size={10} /> Cari SSH Mirip
            </button>
          </div>
        )}
      </td>

      {/* ── HARGA REVIEW (INLINE EDITABLE - Section L) ── */}
      <td className="px-3 py-3 w-48">
        <div className="space-y-1">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs text-gray-400 font-mono">Rp</span>
            <input
              type="text"
              value={reviewPrice}
              onChange={(e) => setReviewPrice(e.target.value)}
              onBlur={() => saveChanges()}
              onKeyDown={handlePriceKeyDown}
              placeholder={String(item.originalPrice)}
              className={`w-full pl-8 pr-7 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                isExceeding
                  ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-red-400'
                  : hasChanged
                  ? 'border-blue-400 bg-blue-50/50 text-blue-900 focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
              }`}
            />
            {isSaving && (
              <Loader2 size={13} className="animate-spin text-primary-700 absolute right-2" />
            )}
          </div>

          {/* Quick Buttons: Set ke SSH / Reset */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {item.sshPrice !== null && item.sshPrice !== undefined && isExceeding && (
              <button
                type="button"
                onClick={handleApplySshPrice}
                className="text-primary-800 hover:text-primary-950 font-semibold underline flex items-center gap-0.5"
                title="Sesuaikan ke harga SSH"
              >
                <Sparkles size={11} /> Samakan SSH
              </button>
            )}
            {hasChanged && (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="text-gray-400 hover:text-gray-600 underline"
                title="Kembalikan ke harga asli"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Volume (Inline Editable) */}
      <td className="px-2 py-3 text-center">
        <input
          type="number"
          min="0.01"
          step="any"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          onBlur={() => saveChanges()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={`w-16 text-center py-1 px-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
            hasVolumeChanged
              ? 'border-blue-400 bg-blue-50/50 text-blue-900 focus:ring-blue-400'
              : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
          }`}
          title="Ubah volume yang disetujui jika disesuaikan"
        />
      </td>

      {/* Satuan */}
      <td className="px-3 py-3 text-xs text-gray-600">{item.satuan}</td>

      {/* Total Review (Volume * Effective Price) */}
      <td className="px-3 py-3 text-right">
        <p className="font-mono text-xs font-bold text-gray-900">
          {formatRupiah(currentTotalReview)}
        </p>
        {hasChanged && (
          <p className="text-[10px] text-green-700 font-medium">
            {currentTotalReview < (item.volume * item.originalPrice)
              ? `Hemat ${formatRupiah((item.volume * item.originalPrice) - currentTotalReview)}`
              : null}
          </p>
        )}
      </td>

      {/* Status SSH */}
      <td className="px-3 py-3">
        <ReviewStatusBadge status={currentStatus || 'TIDAK_DITEMUKAN_DI_SSH'} />
      </td>

      {/* Catatan Reviewer (Inline Editable) */}
      <td className="px-3 py-3 min-w-[180px]">
        <input
          type="text"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          onBlur={() => saveChanges()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="Catatan reviewer..."
          className="form-input text-xs py-1 px-2 border-gray-200 focus:border-primary-500"
        />
      </td>
    </tr>
  );
};

// ─── Modal Selesai Review & Teruskan ke Pimpinan ───────────────
interface FinishModalProps {
  submissionNumber: string;
  totalOriginal: number;
  totalReviewed: number;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

const FinishReviewModal: React.FC<FinishModalProps> = ({
  submissionNumber,
  totalOriginal,
  totalReviewed,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState('Review keuangan selesai dan sesuai standar anggaran.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(notes);
      onClose();
    } catch (_) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const selisihHemat = totalOriginal - totalReviewed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Selesaikan Review Keuangan</h3>
            <p className="text-xs text-gray-500 font-mono">{submissionNumber}</p>
          </div>
        </div>

        {(() => {
          const pctApproved = totalOriginal > 0 ? ((totalReviewed / totalOriginal) * 100).toFixed(1) : '100';
          const pctHemat = totalOriginal > 0 ? ((selisihHemat / totalOriginal) * 100).toFixed(1) : '0';
          return (
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs border border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>Total Pengajuan Awal:</span>
                <span className="font-mono font-semibold">{formatRupiah(totalOriginal)}</span>
              </div>
              <div className="flex justify-between text-primary-900 font-bold text-sm">
                <span>Total Disetujui Reviewer:</span>
                <span className="font-mono">
                  {formatRupiah(totalReviewed)}{' '}
                  <span className="text-xs text-primary-700 font-normal">({pctApproved}%)</span>
                </span>
              </div>
              {selisihHemat > 0 && (
                <div className="flex justify-between text-green-700 font-semibold pt-1 border-t border-gray-200">
                  <span>Efisiensi / Penghematan:</span>
                  <span className="font-mono">
                    -{formatRupiah(selisihHemat)}{' '}
                    <span className="text-xs font-normal">({pctHemat}%)</span>
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        <div>
          <label className="form-label text-xs">Catatan untuk Pimpinan Yayasan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="form-input text-xs"
            placeholder="Tuliskan catatan rekomendasi persetujuan..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary text-xs">
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn-primary text-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Teruskan ke Pimpinan Yayasan
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Minta Revisi ke Unit ────────────────────────────────
interface RevisionModalProps {
  submissionNumber: string;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

const RequestRevisionModal: React.FC<RevisionModalProps> = ({
  submissionNumber,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!notes.trim()) {
      toast.error('Catatan revisi wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(notes);
      onClose();
    } catch (_) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Minta Revisi ke Unit</h3>
            <p className="text-xs text-gray-500 font-mono">{submissionNumber}</p>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Status pengajuan akan diubah menjadi <strong>PERLU REVISI</strong>. Unit pemohon dapat melihat catatan ini dan memperbaiki rincian anggaran.
        </p>

        <div>
          <label className="form-label text-xs">
            Catatan Revisi <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="form-input text-xs"
            placeholder="Tuliskan alasan pengembalian atau item yang perlu disesuaikan oleh unit..."
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary text-xs">
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn-danger text-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            Kirim Permintaan Revisi
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Pencocokan Master SSH Manual / Rekomendasi ─────────
interface SshMatcherModalProps {
  item: SubmissionItem;
  onClose: () => void;
  onSelectSsh: (
    item: SubmissionItem,
    chosenSshId: number | null,
    chosenSshPrice: number | null,
    applyPriceToReview: boolean
  ) => Promise<void>;
}

const SshMatcherModal: React.FC<SshMatcherModalProps> = ({
  item,
  onClose,
  onSelectSsh,
}) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [applyPriceToReview, setApplyPriceToReview] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const fetchCandidates = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await reviewService.getSshCandidates(item.id, query);
      if (res.success && res.data) {
        setCandidates(res.data.candidates || []);
      }
    } catch (err) {
      toast.error('Gagal mengambil daftar rekomendasi SSH.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates('');
  }, [item.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCandidates(val);
    }, 300);
  };

  const handleChoose = async (chosenSsh: any | null) => {
    setIsProcessing(true);
    try {
      if (chosenSsh) {
        await onSelectSsh(
          item,
          chosenSsh.id,
          chosenSsh.hargaSsh,
          applyPriceToReview
        );
      } else {
        await onSelectSsh(item, null, null, false);
      }
      onClose();
    } catch (_) {
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Pencocokan Acuan Master SSH 2026
              </h2>
              <p className="text-xs text-gray-500">
                Cari & pilih item acuan standar harga resmi yang sesuai (toleransi perbedaan kata)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Item Pengajuan */}
        <div className="p-5 border-b border-gray-100 bg-emerald-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-800">
              Item Pengajuan Unit (Yang Sedang Direview):
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-primary-900">
              {item.kategori}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gray-900">{item.uraian}</p>
              {item.keterangan && (
                <p className="text-xs text-gray-500 italic mt-0.5">{item.keterangan}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-gray-500 block">Harga Pengajuan Asli:</span>
              <span className="font-mono text-sm font-bold text-gray-900">
                {formatRupiah(item.originalPrice)} <span className="text-xs font-normal text-gray-500">/{item.satuan}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar & Options */}
        <div className="p-5 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Ketik kata kunci untuk mencari di seluruh Master SSH (contoh: kertas, spidol, bus, bbm)..."
              className="form-input pl-10 text-xs py-2 w-full"
              autoFocus
            />
            {isLoading && (
              <Loader2 size={16} className="animate-spin text-primary-800 absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              {searchQuery.trim()
                ? `Hasil Pencarian SSH untuk "${searchQuery}":`
                : 'Rekomendasi SSH Paling Mirip (Berdasarkan Kemiripan Kata):'}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 select-none">
              <input
                type="checkbox"
                checked={applyPriceToReview}
                onChange={(e) => setApplyPriceToReview(e.target.checked)}
                className="rounded text-primary-700 focus:ring-primary-500"
              />
              <span>Samakan juga ke kolom Harga Review</span>
            </label>
          </div>
        </div>

        {/* Candidate List */}
        <div className="px-5 pb-5 overflow-y-auto flex-1 space-y-2.5 max-h-[360px]">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Loader2 size={24} className="animate-spin mx-auto text-primary-700" />
              <p className="text-xs">Mencari item Master SSH yang cocok...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-xs font-medium text-gray-600">Tidak ada item Master SSH yang cocok.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Coba gunakan kata kunci lain pada kotak pencarian di atas.
              </p>
            </div>
          ) : (
            candidates.map((c: any) => {
              const ssh = c.item;
              const isCurrent = item.sshItemId === ssh.id;
              const isExceeding = item.originalPrice > ssh.hargaSsh;
              const matchPct = c.score ? Math.round(c.score * 100) : null;

              return (
                <div
                  key={ssh.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-primary-500 bg-primary-50/40 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ssh.kode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {ssh.kode}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {ssh.kategori}
                      </span>
                      {matchPct !== null && matchPct > 0 && !searchQuery.trim() && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            matchPct >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {matchPct}% Mirip
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-100 text-primary-900">
                          ✓ Sedang Terpasang
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-900">{ssh.uraian}</p>
                    {ssh.keterangan && (
                      <p className="text-[11px] text-gray-400 italic">{ssh.keterangan}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 block">Harga Standar SSH</span>
                      <span className="font-mono text-xs font-bold text-primary-950">
                        {formatRupiah(ssh.hargaSsh)}{' '}
                        <span className="text-[10px] font-normal text-gray-500">/{ssh.satuan}</span>
                      </span>
                      <span
                        className={`block text-[10px] font-semibold mt-0.5 ${
                          isExceeding ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {isExceeding ? '▲ Usulan Melebihi SSH' : '✓ Usulan Sesuai SSH'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChoose(ssh)}
                      disabled={isProcessing}
                      className={`btn text-xs px-3 py-1.5 flex items-center gap-1 ${
                        isCurrent
                          ? 'btn-secondary text-primary-800 font-bold border-primary-300'
                          : 'btn-primary shadow-xs'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      {isCurrent ? 'Pasang Ulang' : 'Pilih Item Ini'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex items-center justify-between text-xs">
          {item.sshItemId ? (
            <button
              type="button"
              onClick={() => handleChoose(null)}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700 underline flex items-center gap-1"
            >
              Lepas Ikatan SSH (Jadikan Tanpa Acuan SSH)
            </button>
          ) : (
            <span className="text-gray-400 italic">Pilih salah satu item Master SSH di atas</span>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="btn-secondary text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Review Page Component ────────────────────────────────
const ReviewPage: React.FC = () => {
  const { user } = useAuth();
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);

  // List view states
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('SEMUA');
  const [selectedStatus, setSelectedStatus] = useState<string>('SEMUA');
  const [search, setSearch] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Detail workspace states
  const [reviewDetail, setReviewDetail] = useState<ReviewDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [matcherItem, setMatcherItem] = useState<SubmissionItem | null>(null);

  const handleSelectSshForItem = async (
    targetItem: SubmissionItem,
    chosenSshId: number | null,
    chosenSshPrice: number | null,
    applyPriceToReview: boolean
  ) => {
    try {
      const payload: any = {
        sshItemId: chosenSshId,
      };

      if (chosenSshId && chosenSshPrice !== null && applyPriceToReview) {
        payload.reviewPrice = chosenSshPrice;
        payload.reviewNote = 'Disesuaikan dengan standar acuan harga SSH 2026.';
      } else if (!chosenSshId) {
        payload.sshItemId = null;
      }

      const res = await reviewService.updateItem(targetItem.id, payload);
      if (res.success && res.data) {
        handleItemUpdated(res.data.item, res.data.totalReviewed);
        toast.success(
          chosenSshId
            ? 'Item pengajuan berhasil dipasangkan dengan Master SSH.'
            : 'Ikatan acuan Master SSH berhasil dilepas.'
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Load Submissions List
  const loadSubmissions = async (u = selectedUnitId, s = selectedStatus, q = search) => {
    setIsLoadingList(true);
    try {
      const res = await reviewService.getSubmissions({
        unitId: u !== 'SEMUA' ? parseInt(u) : undefined,
        status: s !== 'SEMUA' ? s : undefined,
        search: q.trim() || undefined,
      });
      if (res.success && res.data) {
        setSubmissions(res.data.items || []);
      }
    } catch (err) {
      toast.error('Gagal memuat data pengajuan untuk direview.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    unitsService.getAll().then((res) => {
      if (res.data) setUnits(res.data);
    });
    loadSubmissions('SEMUA', 'SEMUA', '');
  }, []);

  // Open Review Workspace
  const handleOpenWorkspace = async (subId: number) => {
    setActiveSubmissionId(subId);
    setIsLoadingDetail(true);
    try {
      // Start review status automatically if MENUNGGU_REVIEW
      await reviewService.startReview(subId);

      const res = await reviewService.getDetail(subId);
      if (res.success && res.data) {
        setReviewDetail(res.data);
      }
    } catch (err) {
      toast.error('Gagal membuka workspace review.');
      setActiveSubmissionId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Callback when an item's review price or note is updated inline
  const handleItemUpdated = (updatedItem: SubmissionItem, newTotalReviewed: number) => {
    if (!reviewDetail) return;

    const newItems = reviewDetail.submission.items.map((it) =>
      it.id === updatedItem.id ? updatedItem : it
    );

    // Recalculate stats
    let totalOrig = 0;
    let totalRev = 0;
    let cntSesuai = 0;
    let cntMelebihi = 0;
    let cntPerlu = 0;
    let cntTidakAda = 0;

    newItems.forEach((it) => {
      totalOrig += it.volume * it.originalPrice;
      const eff = it.reviewPrice !== null && it.reviewPrice !== undefined ? it.reviewPrice : it.originalPrice;
      totalRev += it.volume * eff;

      if (it.sshStatus === 'SESUAI_SSH') cntSesuai++;
      else if (it.sshStatus === 'MELEBIHI_SSH') cntMelebihi++;
      else if (it.sshStatus === 'PERLU_CEK') cntPerlu++;
      else cntTidakAda++;
    });

    const initialBase =
      reviewDetail.submission.totalParsing ||
      reviewDetail.submission.totalExcel ||
      reviewDetail.stats.totalOriginal ||
      totalOrig;

    setReviewDetail({
      ...reviewDetail,
      submission: {
        ...reviewDetail.submission,
        totalReviewed: newTotalReviewed,
        items: newItems,
      },
      stats: {
        ...reviewDetail.stats,
        totalOriginal: initialBase,
        totalReviewed: totalRev,
        selisihEfisiensi: initialBase - totalRev,
        countSesuaiSsh: cntSesuai,
        countMelebihiSsh: cntMelebihi,
        countPerluCek: cntPerlu,
        countTidakAdaSsh: cntTidakAda,
      },
    });
  };

  // Helper: Apply all SSH prices
  const handleApplyAllSsh = async () => {
    if (!activeSubmissionId) return;
    if (!confirm('Apakah Anda yakin ingin menyamakan seluruh harga yang melebihi batas ke harga Master SSH 2026?')) {
      return;
    }

    try {
      const res = await reviewService.applyAllSsh(activeSubmissionId);
      if (res.success) {
        toast.success(res.message || 'Harga berhasil disesuaikan dengan SSH.');
        // Refresh detail
        const ref = await reviewService.getDetail(activeSubmissionId);
        if (ref.data) setReviewDetail(ref.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Finish review action
  const handleConfirmFinish = async (notes: string) => {
    if (!activeSubmissionId) return;
    const res = await reviewService.finishReview(activeSubmissionId, {
      action: 'APPROVE_TO_LEADERSHIP',
      notes,
    });
    if (res.success) {
      toast.success(res.message || 'Review selesai.');
      setActiveSubmissionId(null);
      loadSubmissions(selectedUnitId, selectedStatus, search);
    }
  };

  // Revision request action
  const handleConfirmRevision = async (notes: string) => {
    if (!activeSubmissionId) return;
    const res = await reviewService.finishReview(activeSubmissionId, {
      action: 'REQUEST_REVISION',
      notes,
    });
    if (res.success) {
      toast.success(res.message || 'Permintaan revisi dikirim.');
      setActiveSubmissionId(null);
      loadSubmissions(selectedUnitId, selectedStatus, search);
    }
  };

  // ─── RENDER WORKSPACE REVIEW (SECTION L) ──────────────────────
  if (activeSubmissionId && reviewDetail) {
    const { submission, stats } = reviewDetail;
    const isCompleted = submission.status === 'DISETUJUI' || submission.status === 'MENUNGGU_APPROVAL';

    return (
      <div className="space-y-6">
        {/* Workspace Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveSubmissionId(null);
                loadSubmissions(selectedUnitId, selectedStatus, search);
              }}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
              title="Kembali ke Daftar"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 font-mono">
                  {submission.submissionNumber}
                </h1>
                <SubmissionWorkflowBadge status={submission.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {submission.unit.name} • {submission.activity.name} • TA {submission.fiscalYear.year}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {stats.countMelebihiSsh > 0 && !isCompleted && (
              <button
                type="button"
                onClick={handleApplyAllSsh}
                className="btn btn-secondary text-xs flex items-center gap-1.5 text-primary-800 font-semibold"
                title="Sesuaikan otomatis semua harga yang melebihi SSH"
              >
                <Sparkles size={14} />
                Samakan Semua ke SSH
              </button>
            )}

            {!isCompleted && (
              <button
                type="button"
                onClick={() => setShowRevisionModal(true)}
                className="btn-secondary text-xs flex items-center gap-1.5 text-red-600 hover:text-red-700"
              >
                <RotateCcw size={14} />
                Minta Revisi
              </button>
            )}

            {!isCompleted && (
              <button
                type="button"
                onClick={() => setShowFinishModal(true)}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Send size={14} />
                Selesai & Teruskan ke Pimpinan
              </button>
            )}
          </div>
        </div>

        {/* ── Summary Cards (Real-time Calculation) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="card p-4 border-l-4 border-l-gray-400 bg-white">
            <p className="text-gray-400 text-xs font-medium">Total Pengajuan Awal</p>
            <p className="font-mono font-bold text-gray-800 text-base mt-1">
              {formatRupiah(stats.totalOriginal)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stats.totalItems} item belanja</p>
          </div>

          <div className="card p-4 border-l-4 border-l-primary-800 bg-white">
            <p className="text-primary-800 text-xs font-semibold">Total Hasil Review</p>
            <p className="font-mono font-bold text-primary-950 text-base mt-1">
              {formatRupiah(stats.totalReviewed)}
            </p>
            <p className="text-[11px] text-primary-700 mt-0.5">Terkalkulasi otomatis</p>
          </div>

          <div className="card p-4 border-l-4 border-l-green-600 bg-white">
            <p className="text-green-700 text-xs font-medium">Efisiensi Anggaran</p>
            <p className="font-mono font-bold text-green-700 text-base mt-1">
              {stats.selisihEfisiensi > 0 ? `-${formatRupiah(stats.selisihEfisiensi)}` : 'Rp0'}
            </p>
            <p className="text-[11px] text-green-600 mt-0.5">Penghematan yayasan</p>
          </div>

          <div className="card p-4 border-l-4 border-l-emerald-500 bg-white">
            <p className="text-gray-500 text-xs font-medium">Sesuai SSH</p>
            <p className="font-bold text-emerald-700 text-base mt-1">
              {stats.countSesuaiSsh} Item
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Harga aman acuan</p>
          </div>

          <div className="card p-4 border-l-4 border-l-red-500 bg-white">
            <p className="text-gray-500 text-xs font-medium">Melebihi SSH</p>
            <p className="font-bold text-red-600 text-base mt-1">
              {stats.countMelebihiSsh} Item
            </p>
            <p className="text-[11px] text-red-500 mt-0.5">Perlu penyesuaian</p>
          </div>
        </div>

        {/* ── Table Section L: INLINE EDITING HARGA REVIEW ── */}
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Tabel Rincian Item Belanja & Penyesuaian Harga/Volume Review
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Ketik langsung harga dan volume yang disetujui pada kolom <strong>Harga Review</strong> atau <strong>Vol</strong>. Perubahan tersimpan secara otomatis.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="badge-green text-[10px]">Acuan: Master SSH 2026 ({reviewDetail.activeSshVersion || 'Aktif'})</span>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '650px' }}>
            <table className="w-full table-sticky min-w-[950px] text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/80 text-gray-700 font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3 text-left w-10">No</th>
                  <th className="px-3 py-3 text-left">Uraian Barang / Belanja Kegiatan</th>
                  <th className="px-3 py-3 text-right w-28">Harga Pengajuan</th>
                  <th className="px-3 py-3 text-right w-28">Harga SSH</th>
                  <th className="px-3 py-3 text-left w-48 bg-primary-50/50 text-primary-900 border-x border-primary-100">
                    Harga Review (Inline)
                  </th>
                  <th className="px-3 py-3 text-center w-24 bg-primary-50/50 text-primary-900 border-r border-primary-100">
                    Vol (Review)
                  </th>
                  <th className="px-3 py-3 text-left w-16">Satuan</th>
                  <th className="px-3 py-3 text-right w-32">Total Review</th>
                  <th className="px-3 py-3 text-left w-36">Status SSH</th>
                  <th className="px-3 py-3 text-left w-44">Catatan Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submission.items.map((it, idx) => (
                  <InlineItemRow
                    key={it.id}
                    item={it}
                    idx={idx}
                    onItemUpdated={handleItemUpdated}
                    onOpenSshMatcher={(itToMatch) => setMatcherItem(itToMatch)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Total <strong>{submission.items.length}</strong> item belanja diproses.
            </span>
            <span className="italic text-gray-400">
              * original_price tetap utuh dan tersimpan di database sebagai histori pengajuan awal.
            </span>
          </div>
        </div>

        {/* Finish Review Modal */}
        {showFinishModal && (
          <FinishReviewModal
            submissionNumber={submission.submissionNumber}
            totalOriginal={stats.totalOriginal}
            totalReviewed={stats.totalReviewed}
            onClose={() => setShowFinishModal(false)}
            onConfirm={handleConfirmFinish}
          />
        )}

        {/* Revision Request Modal */}
        {showRevisionModal && (
          <RequestRevisionModal
            submissionNumber={submission.submissionNumber}
            onClose={() => setShowRevisionModal(false)}
            onConfirm={handleConfirmRevision}
          />
        )}

        {/* SSH Matcher Modal (Interactive Matching for Wording Differences) */}
        {matcherItem && (
          <SshMatcherModal
            item={matcherItem}
            onClose={() => setMatcherItem(null)}
            onSelectSsh={handleSelectSshForItem}
          />
        )}
      </div>
    );
  }

  // ─── RENDER DAFTAR PENGAJUAN (LIST VIEW) ─────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="text-primary-800" size={24} />
            Review Keuangan & Pencocokan SSH
          </h1>
          <p className="page-subtitle">
            Verifikasi usulan anggaran belanja unit dengan standar satuan harga resmi yayasan (TA 2026)
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadSubmissions(selectedUnitId, selectedStatus, e.target.value);
            }}
            placeholder="Cari no pengajuan, perihal, unit..."
            className="form-input pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Unit Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Building2 size={14} className="text-gray-400" />
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                loadSubmissions(e.target.value, selectedStatus, search);
              }}
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                loadSubmissions(selectedUnitId, e.target.value, search);
              }}
              className="form-input text-xs py-1.5"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="MENUNGGU_REVIEW">Menunggu Review</option>
              <option value="DALAM_REVIEW">Dalam Review</option>
              <option value="PERLU_REVISI">Perlu Revisi</option>
              <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
              <option value="DISETUJUI">Disetujui</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="table-container" style={{ maxHeight: '600px' }}>
          <table className="w-full table-sticky min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-48">No Pengajuan</th>
                <th className="px-4 py-3 text-left w-44">Unit</th>
                <th className="px-4 py-3 text-left">Kegiatan</th>
                <th className="px-4 py-3 text-right w-36">Total Usulan</th>
                <th className="px-4 py-3 text-left w-36">Status</th>
                <th className="px-4 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoadingList ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Loader2 size={24} className="animate-spin text-primary-800 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Memuat daftar pengajuan...</p>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <ClipboardCheck size={36} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Tidak ada pengajuan untuk direview.</p>
                    <p className="text-xs text-gray-400 mt-1">Semua pengajuan telah diproses atau filter tidak cocok.</p>
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => handleOpenWorkspace(sub.id)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-primary-900 group-hover:text-primary-700">
                        {sub.submissionNumber}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatDate(sub.submittedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">
                        {typeof sub.unit === 'string' ? sub.unit : (sub.unit as any)?.name || '-'}
                      </p>
                      <span className="text-[11px] text-gray-400 font-mono">
                        [{sub.unitCode || (typeof sub.unit === 'object' ? (sub.unit as any)?.code : '') || '-'}]
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">
                        {typeof sub.activity === 'string' ? sub.activity : (sub.activity as any)?.name || '-'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate max-w-xs">{sub.title}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 text-xs">
                      {formatRupiah(sub.totalAnggaran ?? (sub as any).totalParsing ?? sub.totalExcel ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionWorkflowBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWorkspace(sub.id);
                        }}
                        className="btn-primary text-xs py-1 px-3 flex items-center gap-1 ml-auto"
                      >
                        Buka Review
                        <ChevronRight size={14} />
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
  );
};

export default ReviewPage;
