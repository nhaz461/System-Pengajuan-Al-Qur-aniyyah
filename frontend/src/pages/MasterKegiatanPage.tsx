import React, { useEffect, useState } from 'react';
import {
  Plus, Pencil, ToggleLeft, ToggleRight, Trash2,
  Search, Calendar, Loader2, X, AlertCircle
} from 'lucide-react';
import { Activity } from '../types';
import { activitiesService } from '../services/activities.service';
import { getErrorMessage, formatDate } from '../utils/format';
import toast from 'react-hot-toast';

// ─── Modal ────────────────────────────────────────────────────
interface ActivityModalProps {
  activity?: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ activity, onClose, onSaved }) => {
  const isEdit = !!activity;
  const [name, setName] = useState(activity?.name || '');
  const [description, setDescription] = useState(activity?.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isEdit) {
        await activitiesService.update(activity!.id, { name, description });
        toast.success('Kegiatan berhasil diperbarui.');
      } else {
        await activitiesService.create({ name, description });
        toast.success('Kegiatan berhasil dibuat.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} />{error}
            </div>
          )}
          <div>
            <label className="form-label">Nama Kegiatan <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Contoh: Ujian Semester"
              required
            />
          </div>
          <div>
            <label className="form-label">Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input resize-none"
              rows={3}
              placeholder="Deskripsi kegiatan (opsional)"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {isEdit ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const MasterKegiatanPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const res = await activitiesService.getAll();
      setActivities(res.data || []);
    } catch {
      toast.error('Gagal memuat data kegiatan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadActivities(); }, []);

  const handleToggle = async (a: Activity) => {
    try {
      await activitiesService.toggleActive(a.id);
      toast.success(`Kegiatan ${a.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
      loadActivities();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (a: Activity) => {
    if (!confirm(`Hapus kegiatan "${a.name}"?`)) return;
    try {
      await activitiesService.delete(a.id);
      toast.success('Kegiatan berhasil dihapus.');
      loadActivities();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = activities.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Kegiatan</h1>
          <p className="page-subtitle">Kelola jenis kegiatan yang dapat diajukan unit</p>
        </div>
        <button
          onClick={() => { setEditActivity(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Tambah Kegiatan
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
            placeholder="Cari nama kegiatan..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="w-full table-sticky min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Nama Kegiatan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Keterangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Dibuat</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Loader2 size={20} className="animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {search ? 'Tidak ada kegiatan yang sesuai.' : 'Belum ada kegiatan.'}
                  </p>
                </td></tr>
              ) : (
                filtered.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {a.description || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={a.isActive ? 'badge-green' : 'badge-gray'}>
                        {a.isActive ? '● Aktif' : '○ Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditActivity(a); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggle(a)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title={a.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {a.isActive
                            ? <ToggleRight size={15} className="text-green-600" />
                            : <ToggleLeft size={15} className="text-gray-400" />}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
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
        {!isLoading && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {filtered.length} dari {activities.length} kegiatan
          </div>
        )}
      </div>

      {showModal && (
        <ActivityModal
          activity={editActivity}
          onClose={() => setShowModal(false)}
          onSaved={loadActivities}
        />
      )}
    </div>
  );
};

export default MasterKegiatanPage;
