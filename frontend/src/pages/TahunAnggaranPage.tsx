import React, { useEffect, useState } from 'react';
import {
  Plus, CheckCircle, Trash2, Loader2, X, AlertCircle, CalendarDays
} from 'lucide-react';
import { FiscalYear } from '../types';
import { fiscalYearsService } from '../services/fiscal-years.service';
import { getErrorMessage, formatDate } from '../utils/format';
import toast from 'react-hot-toast';

// ─── Add Modal ────────────────────────────────────────────────
interface AddFiscalYearModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const AddFiscalYearModal: React.FC<AddFiscalYearModalProps> = ({ onClose, onSaved }) => {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await fiscalYearsService.create({ year, notes });
      toast.success(`Tahun anggaran ${year} berhasil dibuat.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Tambah Tahun Anggaran</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} />{error}
            </div>
          )}
          <div>
            <label className="form-label">Tahun <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="form-input"
              min={2020}
              max={2100}
              required
            />
          </div>
          <div>
            <label className="form-label">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input resize-none"
              rows={2}
              placeholder="Catatan tambahan (opsional)"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const TahunAnggaranPage: React.FC = () => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fiscalYearsService.getAll();
      setFiscalYears(res.data || []);
    } catch {
      toast.error('Gagal memuat data tahun anggaran.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSetActive = async (fy: FiscalYear) => {
    if (fy.isActive) return;
    if (!confirm(`Aktifkan tahun anggaran ${fy.year}? Tahun anggaran lain akan dinonaktifkan.`)) return;
    try {
      await fiscalYearsService.setActive(fy.id);
      toast.success(`Tahun anggaran ${fy.year} diaktifkan.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (fy: FiscalYear) => {
    if (fy.isActive) {
      toast.error('Tahun anggaran aktif tidak dapat dihapus.');
      return;
    }
    if (!confirm(`Hapus tahun anggaran ${fy.year}?`)) return;
    try {
      await fiscalYearsService.delete(fy.id);
      toast.success('Tahun anggaran berhasil dihapus.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const activeYear = fiscalYears.find((fy) => fy.isActive);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tahun Anggaran</h1>
          <p className="page-subtitle">Kelola tahun anggaran aktif yayasan</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />
          Tambah Tahun
        </button>
      </div>

      {/* Active Year Banner */}
      {activeYear && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Tahun Anggaran Aktif: {activeYear.year}
            </p>
            {activeYear.notes && (
              <p className="text-xs text-green-700 mt-0.5">{activeYear.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="w-full table-sticky min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Tahun</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Catatan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Dibuat</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <Loader2 size={20} className="animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </td></tr>
              ) : fiscalYears.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Belum ada tahun anggaran.</p>
                </td></tr>
              ) : (
                fiscalYears.map((fy) => (
                  <tr key={fy.id} className={`hover:bg-gray-50 transition-colors ${fy.isActive ? 'bg-green-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-gray-900">{fy.year}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {fy.notes || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {fy.isActive ? (
                        <span className="badge-green">✓ Aktif</span>
                      ) : (
                        <span className="badge-gray">Tidak Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(fy.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!fy.isActive && (
                          <button
                            onClick={() => handleSetActive(fy)}
                            className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          >
                            <CheckCircle size={13} />
                            Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(fy)}
                          disabled={fy.isActive}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddFiscalYearModal
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default TahunAnggaranPage;
