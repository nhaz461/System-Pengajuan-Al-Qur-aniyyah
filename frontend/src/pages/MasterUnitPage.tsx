import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, ToggleLeft, ToggleRight, Trash2,
  Search, Building2, Loader2, X, AlertCircle
} from 'lucide-react';
import { Unit } from '../types';
import { unitsService } from '../services/units.service';
import { getErrorMessage, formatDate } from '../utils/format';
import toast from 'react-hot-toast';

// ─── Modal Component ─────────────────────────────────────────
interface UnitModalProps {
  unit?: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}

const UnitModal: React.FC<UnitModalProps> = ({ unit, onClose, onSaved }) => {
  const isEdit = !!unit;
  const [name, setName] = useState(unit?.name || '');
  const [code, setCode] = useState(unit?.code || '');
  const [description, setDescription] = useState(unit?.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isEdit) {
        await unitsService.update(unit!.id, { name, code, description });
        toast.success('Unit berhasil diperbarui.');
      } else {
        await unitsService.create({ name, code, description });
        toast.success('Unit berhasil dibuat.');
      }
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Unit' : 'Tambah Unit Baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Nama Unit <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Contoh: SD IT Al-Qur'aniyyah"
              required
            />
          </div>

          <div>
            <label className="form-label">Kode Unit <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="form-input font-mono"
              placeholder="Contoh: SDIT"
              maxLength={10}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Kode singkat unik, akan dikonversi ke HURUF BESAR</p>
          </div>

          <div>
            <label className="form-label">Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input resize-none"
              rows={2}
              placeholder="Keterangan tambahan (opsional)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {isEdit ? 'Simpan Perubahan' : 'Tambah Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ────────────────────────────────────
interface DeleteModalProps {
  unit: Unit;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ unit, onClose, onDeleted }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await unitsService.delete(unit.id);
      toast.success('Unit berhasil dihapus.');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Hapus Unit</h3>
            <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Apakah Anda yakin ingin menghapus unit <strong>"{unit.name}"</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleDelete} disabled={isLoading} className="btn-danger flex-1">
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────
const MasterUnitPage: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const res = await unitsService.getAll();
      setUnits(res.data || []);
    } catch {
      toast.error('Gagal memuat data unit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUnits(); }, []);

  const handleToggleActive = async (unit: Unit) => {
    try {
      await unitsService.toggleActive(unit.id);
      toast.success(`Unit berhasil ${unit.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
      loadUnits();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = units.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Unit</h1>
          <p className="page-subtitle">Kelola data unit / satuan kerja yayasan</p>
        </div>
        <button
          onClick={() => { setEditUnit(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Tambah Unit
        </button>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
            placeholder="Cari nama atau kode unit..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="w-full table-sticky min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Nama Unit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Kode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Pengguna</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Dibuat</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 size={20} className="animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Memuat data...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Building2 size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {search ? 'Tidak ada unit yang sesuai pencarian.' : 'Belum ada unit. Klik "Tambah Unit" untuk mulai.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((unit, idx) => (
                  <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{unit.name}</p>
                      {unit.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{unit.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{unit.code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {unit._count?.users ?? 0} pengguna
                    </td>
                    <td className="px-4 py-3">
                      <span className={unit.isActive ? 'badge-green' : 'badge-gray'}>
                        {unit.isActive ? '● Aktif' : '○ Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(unit.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditUnit(unit); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(unit)}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title={unit.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {unit.isActive
                            ? <ToggleRight size={15} className="text-green-600" />
                            : <ToggleLeft size={15} className="text-gray-400" />
                          }
                        </button>
                        <button
                          onClick={() => setDeleteUnit(unit)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Hapus"
                          disabled={(unit._count?.users ?? 0) > 0}
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
        {!isLoading && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {filtered.length} dari {units.length} unit
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <UnitModal
          unit={editUnit}
          onClose={() => setShowModal(false)}
          onSaved={loadUnits}
        />
      )}
      {deleteUnit && (
        <DeleteModal
          unit={deleteUnit}
          onClose={() => setDeleteUnit(null)}
          onDeleted={loadUnits}
        />
      )}
    </div>
  );
};

export default MasterUnitPage;
