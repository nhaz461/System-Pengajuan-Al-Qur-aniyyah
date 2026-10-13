import React, { useEffect, useState, useRef } from 'react';
import {
  BookOpen,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  History,
  Layers,
  ArrowRight,
  Loader2,
  X,
  Calendar,
  User,
  Clock,
  Check,
  Trash2,
  FileText,
  AlertCircle,
  Eye,
  Plus,
  Pencil,
} from 'lucide-react';
import {
  SshMasterStatus,
  SshItem,
  SshVersion,
  SshPreviewResponse,
  SshPreviewItem,
} from '../types';
import { sshService } from '../services/ssh.service';
import { formatRupiah, formatDateTime, formatDate, getErrorMessage } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Modal Upload & Preview SSH ────────────────────────────────
interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<SshPreviewResponse | null>(null);
  const [versionName, setVersionName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setError('');
    setSelectedFile(file);
    setIsUploading(true);

    try {
      const res = await sshService.preview(file);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setVersionName(res.data.suggestedVersion || 'v1.0');
        toast.success(`Sheet "${res.data.sheetName}" valid. ${res.data.totalItems} item ditemukan.`);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
      setSelectedFile(null);
      setPreviewData(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!previewData) return;
    setError('');
    setIsSaving(true);

    try {
      const res = await sshService.confirmImport({
        tempFilePath: previewData.tempFilePath,
        filename: previewData.filename,
        version: versionName.trim() || previewData.suggestedVersion,
        notes: notes.trim() || undefined,
        items: previewData.allItems,
      });

      if (res.success) {
        toast.success(res.message || 'Master SSH 2026 berhasil disimpan ke database!');
        onImportSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto border border-gray-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Upload & Import Master SSH 2026</h2>
              <p className="text-xs text-gray-500">
                Pilih file resmi <span className="font-semibold text-gray-700">Master_SSH_Yayasan_2026_FINAL.xlsx</span> (Sheet: SSH 2026)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-medium">Gagal memproses file</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!previewData && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary-600 hover:bg-primary-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-800 flex items-center justify-center mx-auto mb-3">
                  {isUploading ? (
                    <Loader2 size={28} className="animate-spin text-primary-700" />
                  ) : (
                    <Upload size={28} />
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {isUploading ? 'Sedang membaca dan memvalidasi struktur Excel...' : 'Klik untuk memilih file Excel Master SSH'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format didukung: <strong>.xlsx</strong> | Sheet wajib: <strong>SSH 2026</strong>
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-amber-900">Ketentuan File Resmi Master SSH:</p>
                  <a
                    href="/api/ssh/template/download"
                    download="TEMPLATE_MASTER_SSH_2026.xlsx"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-900 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors shadow-xs"
                  >
                    <Download size={13} />
                    Download Template SSH (.xlsx)
                  </a>
                </div>
                <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                  <li>Nama sheet harus bernama <strong>"SSH 2026"</strong>.</li>
                  <li>Header kolom otomatis terdeteksi: <strong>No</strong>, <strong>Kode SSH</strong>, <strong>Kategori</strong>, <strong>Uraian Barang / Jasa</strong>, <strong>Satuan</strong>, <strong>Harga Standar SSH</strong>, <strong>Keterangan</strong>.</li>
                  <li>Format angka harga tidak menggunakan teks/simbol mata uang manual di dalam cell (gunakan format currency Excel).</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview & Confirmation State */}
          {previewData && (
            <div className="space-y-5">
              {/* Alert jika Master SSH sudah ada di database */}
              {previewData.alreadyExists && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <AlertTriangle size={20} className="flex-shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">Master SSH 2026 sudah tersedia di database!</p>
                    <p className="text-xs text-amber-800 mt-1">
                      Versi aktif saat ini: <strong>{previewData.currentActiveVersion?.version}</strong> ({previewData.currentActiveVersion?.totalItems} item, diimpor oleh {previewData.currentActiveVersion?.importedBy}).
                      Apakah Anda ingin mengimpor versi baru? <strong>Versi lama tetap disimpan sebagai histori.</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* File & Validation Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">File Sumber</p>
                  <p className="text-xs font-semibold text-gray-900 truncate" title={previewData.filename}>
                    {previewData.filename}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sheet Terbaca</p>
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {previewData.sheetName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Jumlah Item Valid</p>
                  <p className="text-xs font-bold text-primary-800">
                    {previewData.totalItems} Item
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ganti File</p>
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 underline font-medium"
                  >
                    Pilih File Lain
                  </button>
                </div>
              </div>

              {/* Version & Notes Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Nomor / Label Versi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="form-input"
                    placeholder="Contoh: v1.0 atau 2026-FINAL"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Disarankan: {previewData.suggestedVersion}
                  </p>
                </div>
                <div>
                  <label className="form-label">Catatan / Keterangan Versi</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    placeholder="Contoh: SK Standar Satuan Harga Yayasan 2026"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Preview Data Item SSH (Menampilkan {previewData.allItems.length} Item)
                  </h4>
                  <span className="badge-green">Valid & Siap Disimpan</span>
                </div>
                <div className="table-container border border-gray-200 rounded-xl" style={{ maxHeight: '280px' }}>
                  <table className="w-full table-sticky min-w-[700px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">No</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Kode SSH</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Kategori</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Uraian Standar Barang / Jasa</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Satuan</th>
                        <th className="px-3 py-2 text-right text-gray-600 font-semibold">Harga Standar SSH (2026)</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.allItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">
                            {item.kode || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.uraian}</td>
                          <td className="px-3 py-2 text-gray-600">{item.satuan}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary-800">
                            {formatRupiah(item.hargaSsh)}
                          </td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-xs" title={item.keterangan || ''}>
                            {item.keterangan || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            {previewData
              ? `Total ${previewData.totalItems} item akan disimpan ke database SQLite.`
              : 'Pilih file Excel untuk memulai preview.'}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary">
              Batal
            </button>
            {previewData && (
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Konfirmasi Simpan ke Database
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Tambah & Edit Item SSH ─────────────────────────────
interface SshItemModalProps {
  item: SshItem | null;
  categories: string[];
  activeVersionId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const SshItemModal: React.FC<SshItemModalProps> = ({
  item,
  categories,
  activeVersionId,
  onClose,
  onSuccess,
}) => {
  const [kode, setKode] = useState(item?.kode || '');
  const [kategori, setKategori] = useState(item?.kategori || categories[0] || 'ATK & Administrasi');
  const [customKategori, setCustomKategori] = useState('');
  const [isCustomKat, setIsCustomKat] = useState(false);
  const [uraian, setUraian] = useState(item?.uraian || '');
  const [satuan, setSatuan] = useState(item?.satuan || 'Pcs');
  const [hargaSsh, setHargaSsh] = useState<number | ''>(item?.hargaSsh ?? '');
  const [status, setStatus] = useState(item?.status || 'AKTIF');
  const [keterangan, setKeterangan] = useState(item?.keterangan || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!item;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalKategori = isCustomKat ? customKategori.trim() : kategori;
    if (!finalKategori) {
      setError('Kategori wajib dipilih atau diisi.');
      return;
    }

    if (!uraian.trim()) {
      setError('Uraian standar barang/kegiatan wajib diisi.');
      return;
    }

    if (!satuan.trim()) {
      setError('Satuan wajib diisi.');
      return;
    }

    if (hargaSsh === '' || Number(hargaSsh) < 0) {
      setError('Harga standar SSH harus berupa angka positif.');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && item) {
        const res = await sshService.updateItem(item.id, {
          kode: kode.trim() || undefined,
          kategori: finalKategori,
          uraian: uraian.trim(),
          satuan: satuan.trim(),
          hargaSsh: Number(hargaSsh),
          status,
          keterangan: keterangan.trim() || undefined,
        });
        toast.success(res.message || 'Item SSH berhasil diperbarui!');
      } else {
        const res = await sshService.createItem({
          versionId: activeVersionId,
          kode: kode.trim() || undefined,
          kategori: finalKategori,
          uraian: uraian.trim(),
          satuan: satuan.trim(),
          hargaSsh: Number(hargaSsh),
          status,
          keterangan: keterangan.trim() || undefined,
        });
        toast.success(res.message || 'Item SSH baru berhasil ditambahkan!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800">
              {isEdit ? <Pencil size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Item Standar SSH' : 'Tambah Item SSH Baru'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEdit
                  ? `Mengubah data acuan standar harga SSH #${item?.id}`
                  : 'Tambahkan data acuan standar harga baru ke database'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Kode SSH</label>
              <input
                type="text"
                placeholder="e.g. SSH-ATK-0001"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Status Standar *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                <option value="AKTIF">AKTIF (Dapat Dipilih)</option>
                <option value="NONAKTIF">NONAKTIF (Diarsipkan)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700">Kategori Belanja *</label>
              <button
                type="button"
                onClick={() => setIsCustomKat(!isCustomKat)}
                className="text-primary-700 hover:underline text-[11px]"
              >
                {isCustomKat ? 'Pilih dari List' : '+ Kategori Baru'}
              </button>
            </div>
            {isCustomKat ? (
              <input
                type="text"
                placeholder="Ketik nama kategori baru..."
                value={customKategori}
                onChange={(e) => setCustomKategori(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
                required
              />
            ) : (
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="ATK & Administrasi">ATK & Administrasi</option>
                    <option value="Konsumsi">Konsumsi</option>
                    <option value="Honor & Jasa">Honor & Jasa</option>
                    <option value="Dokumentasi & Publikasi">Dokumentasi & Publikasi</option>
                    <option value="Kebersihan">Kebersihan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Perlengkapan">Perlengkapan</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </>
                )}
              </select>
            )}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Uraian Standar Barang / Belanja Kegiatan *
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Amplop Coklat / Snack Siswa / Jasa Desain Banner..."
              value={uraian}
              onChange={(e) => setUraian(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Satuan Standar *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pcs, Pack, Rim, Orang, Kotak, Bulan"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Harga Standar SSH (Rp) *
              </label>
              <input
                type="number"
                min={0}
                required
                placeholder="e.g. 50000"
                value={hargaSsh}
                onChange={(e) => setHargaSsh(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 font-bold text-primary-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Keterangan / Spesifikasi (Opsional)
            </label>
            <input
              type="text"
              placeholder="e.g. Ukuran Folio / Kualitas Super / Khusus Event"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check size={14} />
                  {isEdit ? 'Simpan Perubahan' : 'Tambahkan Item'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Master SSH Page ──────────────────────────────────────
const MasterSshPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [status, setStatus] = useState<SshMasterStatus | null>(null);
  const [items, setItems] = useState<SshItem[]>([]);
  const [versions, setVersions] = useState<SshVersion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [search, setSearch] = useState<string>('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<SshItem | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Load Status Master SSH
  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await sshService.getStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat status Master SSH.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Load Items dari Database (WAJIB: Query langsung dari DATABASE, bukan baca Excel ulang)
  const loadItems = async (targetPage = 1, cat = selectedCategory, q = search) => {
    setIsLoadingItems(true);
    try {
      const res = await sshService.getItems({
        page: targetPage,
        limit,
        kategori: cat !== 'SEMUA' ? cat : undefined,
        search: q.trim() || undefined,
      });

      if (res.success && res.data) {
        setItems(res.data.items || []);
        setTotalItems(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
        if (res.data.categories && res.data.categories.length > 0) {
          setCategories(res.data.categories);
        }
      }
    } catch (err) {
      toast.error('Gagal memuat data item SSH dari database.');
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Load Histori Versi
  const loadVersions = async () => {
    try {
      const res = await sshService.getVersions();
      if (res.success && res.data) {
        setVersions(res.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadStatus();
    loadItems(1, 'SEMUA', '');
    loadVersions();
  }, []);

  // Filter change handlers
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
    loadItems(1, cat, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadItems(1, selectedCategory, search);
  };

  const handleSetActiveVersion = async (v: SshVersion) => {
    if (v.isActive) return;
    if (!confirm(`Aktifkan Master SSH versi ${v.version}? Versi ini akan menjadi acuan harga resmi.`)) return;

    try {
      await sshService.setActiveVersion(v.id);
      toast.success(`Master SSH versi ${v.version} berhasil diaktifkan.`);
      loadStatus();
      loadItems(1, selectedCategory, search);
      loadVersions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteVersion = async (v: SshVersion) => {
    if (v.isActive) {
      toast.error('Versi aktif tidak dapat dihapus.');
      return;
    }
    if (!confirm(`Hapus versi SSH ${v.version}? Data item di versi ini akan terhapus.`)) return;

    try {
      await sshService.deleteVersion(v.id);
      toast.success(`Versi SSH ${v.version} berhasil dihapus.`);
      loadVersions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleClearDatabase = async () => {
    if (
      !confirm(
        'PERINGATAN: Apakah Anda yakin ingin MENGOSONGKAN seluruh database Master SSH?\n\nSemua data item acuan SSH dan versinya akan dihapus agar Anda dapat memasukkan ulang dari file baru.\n\nKlik OK untuk melanjutkan.'
      )
    ) {
      return;
    }

    try {
      const res = await sshService.clearAll();
      toast.success(res.message || 'Database SSH berhasil dikosongkan.');
      loadStatus();
      loadItems(1, selectedCategory, search);
      loadVersions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenAddItem = () => {
    setSelectedItemForEdit(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: SshItem) => {
    setSelectedItemForEdit(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item: SshItem) => {
    if (
      !confirm(
        `Hapus item acuan SSH:\n"${item.uraian}" (${item.kode || 'Tanpa Kode'})\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const res = await sshService.deleteItem(item.id);
      toast.success(res.message || 'Item SSH berhasil dihapus.');
      loadStatus();
      loadItems(page, selectedCategory, search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const isKeuanganOrAdmin = user?.role === 'ADMIN' || user?.role === 'KEUANGAN';

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="text-primary-800" size={24} />
            Master SSH 2026
          </h1>
          <p className="page-subtitle">
            Standar Satuan Harga Resmi Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isKeuanganOrAdmin && (
            <button
              onClick={handleOpenAddItem}
              className="btn btn-primary bg-emerald-700 hover:bg-emerald-800 text-white text-sm flex items-center gap-1.5 shadow-sm"
              title="Tambah item standar SSH baru ke database"
            >
              <Plus size={16} />
              Tambah Item SSH
            </button>
          )}
          <a
            href="/api/ssh/template/download"
            download="TEMPLATE_MASTER_SSH_2026.xlsx"
            className="btn-secondary text-sm flex items-center gap-2 shadow-xs hover:shadow-sm"
            title="Download Template Resmi Master SSH 2026"
          >
            <Download size={15} />
            Download Template SSH
          </a>
          {isKeuanganOrAdmin && status?.hasMaster && (
            <button
              onClick={handleClearDatabase}
              className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              title="Kosongkan seluruh data Master SSH di database untuk input ulang"
            >
              <Trash2 size={15} />
              Kosongkan Database SSH
            </button>
          )}
          {isKeuanganOrAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-primary shadow-sm hover:shadow"
            >
              <Upload size={16} />
              Upload / Import SSH Excel
            </button>
          )}
        </div>
      </div>

      {/* ── Status Master SSH Card (Section I Sesuai Spesifikasi) ── */}
      <div className="card p-6 border-l-4 border-l-primary-800 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Status Master SSH
              </span>
              {status?.hasMaster ? (
                <span className="badge-green text-xs px-3 py-1 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Aktif (Siap Digunakan)
                </span>
              ) : (
                <span className="badge-yellow text-xs px-3 py-1 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Belum Diimpor
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              {status?.hasMaster
                ? `Standar Satuan Harga Tahun 2026 — Versi ${status.version}`
                : 'Belum Ada Master SSH 2026 Aktif'}
            </h3>

            {status?.notes && (
              <p className="text-xs text-gray-600 italic">"{status.notes}"</p>
            )}
          </div>

          {/* Details Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
            <div>
              <p className="text-gray-400 font-medium">Versi</p>
              <p className="font-semibold text-gray-900 mt-0.5">{status?.version || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Sumber File</p>
              <p className="font-semibold text-gray-900 mt-0.5 truncate max-w-[140px]" title={status?.filename || '-'}>
                {status?.filename || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Tanggal Import</p>
              <p className="font-semibold text-gray-900 mt-0.5">
                {status?.importedAt ? formatDate(status.importedAt) : '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Jumlah Item</p>
              <p className="font-bold text-primary-800 mt-0.5">
                {status?.totalItems ? `${status.totalItems} Item` : '0 Item'}
              </p>
            </div>
          </div>
        </div>

        {status?.importedBy && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-gray-400" />
              Diimpor oleh: <strong className="text-gray-700">{status.importedBy.name}</strong> ({status.importedBy.email})
            </span>
            <span className="text-gray-400">
              Acuan resmi penganggaran TA 2026
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'items'
              ? 'border-primary-800 text-primary-900 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers size={16} />
          Daftar Item Standar SSH ({totalItems})
        </button>

        {isKeuanganOrAdmin && (
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary-800 text-primary-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History size={16} />
            Histori Versi SSH ({versions.length})
          </button>
        )}
      </div>

      {/* ── TAB 1: Daftar Item SSH ── */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari uraian barang, kode SSH, atau kategori..."
                className="form-input pl-9 text-xs"
              />
            </form>

            {/* Category Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Filter size={13} /> Kategori:
              </span>
              <button
                onClick={() => handleCategoryChange('SEMUA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                  selectedCategory === 'SEMUA'
                    ? 'bg-primary-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-primary-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container - Vertical and Horizontal Scrollable with Sticky Header */}
          <div className="card p-0 overflow-hidden shadow-sm">
            <div className="table-container" style={{ maxHeight: '600px' }}>
              <table className="w-full table-sticky min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                      Kode SSH
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Uraian Standar Barang / Belanja Kegiatan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                      Satuan
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                      Harga Standar SSH
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                      Status
                    </th>
                    {isKeuanganOrAdmin && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {isLoadingItems ? (
                    <tr>
                      <td colSpan={isKeuanganOrAdmin ? 8 : 7} className="text-center py-16">
                        <Loader2 size={24} className="animate-spin text-primary-800 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Memuat data item SSH dari database...</p>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={isKeuanganOrAdmin ? 8 : 7} className="text-center py-16">
                        <BookOpen size={36} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Belum ada item SSH yang cocok.</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {search
                            ? 'Coba gunakan kata kunci pencarian yang lain.'
                            : 'Silakan upload file Master_SSH_Yayasan_2026_FINAL.xlsx atau klik Tambah Item SSH.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                          {item.kode || <span className="text-gray-300 italic font-normal">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {item.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <p>{item.uraian}</p>
                          {item.keterangan && (
                            <p className="text-xs text-gray-400 mt-0.5 font-normal">{item.keterangan}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                          {item.satuan}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-900">
                          {formatRupiah(item.hargaSsh)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={item.status === 'NONAKTIF' ? 'badge-gray text-[11px]' : 'badge-green text-[11px]'}>
                            ● {item.status || 'AKTIF'}
                          </span>
                        </td>
                        {isKeuanganOrAdmin && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditItem(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-primary-800 hover:bg-primary-50 transition-colors"
                                title="Edit Item SSH"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus Item SSH"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with Item count */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <p>
                Menampilkan <strong>{items.length}</strong> dari <strong>{totalItems}</strong> item standar SSH
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => {
                      const nextP = page - 1;
                      setPage(nextP);
                      loadItems(nextP, selectedCategory, search);
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
                      const nextP = page + 1;
                      setPage(nextP);
                      loadItems(nextP, selectedCategory, search);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Histori Versi SSH ── */}
      {activeTab === 'history' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="table-container">
            <table className="w-full table-sticky min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">No</th>
                  <th className="px-4 py-3 text-left">Versi</th>
                  <th className="px-4 py-3 text-left">Sumber File</th>
                  <th className="px-4 py-3 text-left">Jumlah Item</th>
                  <th className="px-4 py-3 text-left">Tanggal Import</th>
                  <th className="px-4 py-3 text-left">User Pengimport</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {versions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 text-xs">
                      Belum ada histori versi SSH.
                    </td>
                  </tr>
                ) : (
                  versions.map((v, idx) => (
                    <tr key={v.id} className={`hover:bg-gray-50 ${v.isActive ? 'bg-green-50/40' : ''}`}>
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{v.version}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{v.filename}</td>
                      <td className="px-4 py-3 font-semibold text-primary-800">{v.totalItems} Item</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(v.importedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                        {v.importedBy?.name || 'Administrator'}
                      </td>
                      <td className="px-4 py-3">
                        {v.isActive ? (
                          <span className="badge-green font-semibold">✓ AKTIF</span>
                        ) : (
                          <span className="badge-gray">Arsip</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!v.isActive && user?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleSetActiveVersion(v)}
                              className="btn btn-secondary btn-sm text-xs"
                              title="Aktifkan versi ini"
                            >
                              Aktifkan
                            </button>
                          )}
                          {!v.isActive && user?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteVersion(v)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                              title="Hapus versi ini"
                            >
                              <Trash2 size={15} />
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
      )}

      {/* ── Modal Upload / Import SSH ── */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            loadStatus();
            loadItems(1, selectedCategory, search);
            loadVersions();
          }}
        />
      )}

      {/* ── Modal Tambah / Edit Item SSH ── */}
      {showItemModal && (
        <SshItemModal
          item={selectedItemForEdit}
          categories={categories}
          activeVersionId={status?.version ? versions.find((v) => v.isActive)?.id : undefined}
          onClose={() => setShowItemModal(false)}
          onSuccess={() => {
            loadStatus();
            loadItems(page, selectedCategory, search);
          }}
        />
      )}
    </div>
  );
};

export default MasterSshPage;
