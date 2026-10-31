import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Layers,
  HelpCircle,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Edit,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Unit, Activity, FiscalYear, SubmissionListItem } from '../types';
import { unitsService } from '../services/units.service';
import { activitiesService } from '../services/activities.service';
import { fiscalYearsService } from '../services/fiscal-years.service';
import { submissionsService } from '../services/submissions.service';
import { formatRupiah, formatDate, getErrorMessage } from '../utils/format';
import toast from 'react-hot-toast';

export interface VolumeFactor {
  vol: number;
  unit: string;
}

export interface BudgetRow {
  id: string;
  category: string;
  uraian: string;
  unitPrice: number;
  factors: [VolumeFactor, VolumeFactor, VolumeFactor];
  notes: string;
}

const CATEGORIES = [
  'Konsumsi',
  'Pengadaan & Modul',
  'Honor & Insentif',
  'Transport',
  'Sewa & Perlengkapan',
  'Dokumentasi & Publikasi',
  'ATK & Kesekretariatan',
  'Lain-lain',
];

export const PengajuanUnitPage: React.FC<{ isStandalone?: boolean }> = ({ isStandalone = false }) => {
  const [activeTab, setActiveTab] = useState<'baru' | 'riwayat'>('baru');
  const [units, setUnits] = useState<Unit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Form State
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('');
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number | ''>('');
  const [submissionNumber, setSubmissionNumber] = useState('');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [picName, setPicName] = useState('');
  const [notes, setNotes] = useState('');

  // Rows State
  const [rows, setRows] = useState<BudgetRow[]>([
    {
      id: 'row-1',
      category: 'Pengadaan & Modul',
      uraian: '',
      unitPrice: 0,
      factors: [
        { vol: 1, unit: 'paket' },
        { vol: 0, unit: '' },
        { vol: 0, unit: '' },
      ],
      notes: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<SubmissionListItem[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);

  // Load Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoadingMeta(true);
        const [uRes, aRes, fRes] = await Promise.all([
          unitsService.getAll(true),
          activitiesService.getAll(true),
          fiscalYearsService.getAll(),
        ]);
        if (uRes.data) {
          setUnits(uRes.data);
          if (uRes.data.length > 0 && !selectedUnitId) {
            setSelectedUnitId(uRes.data[0].id);
          }
        }
        if (aRes.data) {
          setActivities(aRes.data);
          if (aRes.data.length > 0 && !selectedActivityId) {
            setSelectedActivityId(aRes.data[0].id);
          }
        }
        if (fRes.data) {
          setFiscalYears(fRes.data);
          const activeFy = fRes.data.find((f: any) => f.isActive) || fRes.data[0];
          if (activeFy) setSelectedFiscalYearId(activeFy.id);
        }
      } catch (err: any) {
        toast.error('Gagal memuat master data: ' + getErrorMessage(err));
      } finally {
        setIsLoadingMeta(false);
      }
    };
    fetchMetadata();
  }, []);

  // Generate Submission Number when Unit changes
  useEffect(() => {
    if (!editingSubmissionId && selectedUnitId) {
      const u = units.find((x) => x.id === Number(selectedUnitId));
      const code = u?.code || 'UNIT';
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      setSubmissionNumber(`PENG/${code}/${year}/${rand}`);
    }
  }, [selectedUnitId, editingSubmissionId, units]);

  // Load Unit Submissions
  const fetchMySubmissions = async () => {
    if (!selectedUnitId) return;
    try {
      setIsLoadingSubmissions(true);
      const res = await submissionsService.getAll({
        unitId: Number(selectedUnitId),
        limit: 50,
      });
      if (res.data?.items) {
        setMySubmissions(res.data.items);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'riwayat' && selectedUnitId) {
      fetchMySubmissions();
    }
  }, [activeTab, selectedUnitId]);

  // Calculate live row total
  const calculateRowTotal = (row: BudgetRow) => {
    let effectiveVol = 1;
    let factorCount = 0;
    row.factors.forEach((f) => {
      if (f.vol && f.vol > 0) {
        effectiveVol *= Number(f.vol);
        factorCount++;
      }
    });
    if (factorCount === 0) effectiveVol = 0;
    return Math.round((row.unitPrice || 0) * effectiveVol);
  };

  // Grand Total calculation
  const grandTotal = useMemo(() => {
    return rows.reduce((acc, row) => acc + calculateRowTotal(row), 0);
  }, [rows]);

  // Row Manipulation
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        category: 'Konsumsi',
        uraian: '',
        unitPrice: 0,
        factors: [
          { vol: 1, unit: 'orang' },
          { vol: 0, unit: '' },
          { vol: 0, unit: '' },
        ],
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      toast.error('Minimal harus ada 1 baris kebutuhan anggaran.');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof BudgetRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleFactorChange = (
    rowId: string,
    factorIndex: number,
    subField: 'vol' | 'unit',
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newFactors = [...r.factors] as [VolumeFactor, VolumeFactor, VolumeFactor];
        newFactors[factorIndex] = {
          ...newFactors[factorIndex],
          [subField]: subField === 'vol' ? (value === '' ? 0 : Number(value)) : value,
        };
        return { ...r, factors: newFactors };
      })
    );
  };

  // Prepare submission items for backend
  const buildPayloadItems = () => {
    return rows.map((r, idx) => {
      let totalEffectiveVol = 1;
      const factorDescs: string[] = [];

      r.factors.forEach((f) => {
        if (f.vol && f.vol > 0) {
          totalEffectiveVol *= f.vol;
          factorDescs.push(`${f.vol} ${f.unit || ''}`.trim());
        }
      });

      if (factorDescs.length === 0) {
        totalEffectiveVol = 1;
        factorDescs.push('1 item');
      }

      const rincianFormula = factorDescs.join(' × ');
      const totalAmount = Math.round((r.unitPrice || 0) * totalEffectiveVol);

      return {
        itemNumber: idx + 1,
        uraian: r.uraian || 'Tanpa Keterangan',
        category: r.category || 'Operasional',
        unitPrice: r.unitPrice || 0,
        volume: totalEffectiveVol,
        satuan: r.factors[0]?.unit || 'Item',
        rincianVolume: rincianFormula,
        keterangan: rincianFormula + (r.notes ? ` (${r.notes})` : ''),
        total: totalAmount,
      };
    });
  };

  // Save as Draft or Submit to General Treasurer
  const handleSave = async (isFinalSubmit: boolean) => {
    if (!selectedUnitId) {
      toast.error('Silakan pilih Unit Sekolah/Lembaga.');
      return;
    }
    if (!activityTitle.trim()) {
      toast.error('Silakan isi Nama Kegiatan / Pengajuan.');
      return;
    }
    if (rows.length === 0 || !rows.some((r) => r.uraian.trim())) {
      toast.error('Silakan isi minimal 1 rincian uraian kebutuhan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const items = buildPayloadItems();
      const statusTarget = isFinalSubmit ? 'MENUNGGU_EVALUASI' : 'DRAFT_UNIT';

      if (editingSubmissionId) {
        // Update existing
        await submissionsService.update(editingSubmissionId, {
          title: activityTitle,
          activityDate,
          picName,
          notes,
          status: statusTarget,
          items,
        });
        toast.success(
          isFinalSubmit
            ? 'Pengajuan berhasil dikirim ke Bendahara Umum!'
            : 'Draft Pengajuan berhasil disimpan.'
        );
      } else {
        // Create new
        await submissionsService.create({
          unitId: Number(selectedUnitId),
          activityId: Number(selectedActivityId) || 1,
          fiscalYearId: Number(selectedFiscalYearId) || 1,
          title: activityTitle,
          activityDate,
          picName,
          notes: (notes ? notes + ' | ' : '') + `Status: ${statusTarget}`,
          items,
          totalExcel: grandTotal,
          totalParsing: grandTotal,
        });
        toast.success(
          isFinalSubmit
            ? 'Pengajuan berhasil dikirim ke antrean Bendahara Umum!'
            : 'Draft Pengajuan berhasil disimpan.'
        );
      }

      // Reset or redirect to history
      setActiveTab('riwayat');
      fetchMySubmissions();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan pengajuan: ' + getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingSubmissionId(null);
    setActivityTitle('');
    setPicName('');
    setNotes('');
    setRows([
      {
        id: `row-${Date.now()}`,
        category: 'Pengadaan & Modul',
        uraian: '',
        unitPrice: 0,
        factors: [
          { vol: 1, unit: 'paket' },
          { vol: 0, unit: '' },
          { vol: 0, unit: '' },
        ],
        notes: '',
      },
    ]);
  };

  const handleEditSubmission = async (sub: SubmissionListItem) => {
    try {
      toast.loading('Memuat pengajuan untuk diedit...', { id: 'edit-sub' });
      const detailRes = await submissionsService.getById(sub.id);
      if (detailRes.data) {
        const d = detailRes.data;
        setEditingSubmissionId(d.id);
        setSelectedUnitId(d.unitId);
        setSelectedActivityId(d.activityId);
        setActivityTitle(d.title);
        setActivityDate(d.activityDate ? d.activityDate.split('T')[0] : '');
        setPicName(d.picName || '');
        setNotes(d.notes || '');

        if (d.items && d.items.length > 0) {
          const loadedRows: BudgetRow[] = d.items.map((it: any, idx: number) => {
            // parse existing factors
            const rawDesc = it.rincianVolume || it.keterangan || '';
            const parts = rawDesc.split(/[×x*]/).map((p: string) => p.trim());
            const factors: [VolumeFactor, VolumeFactor, VolumeFactor] = [
              { vol: 0, unit: '' },
              { vol: 0, unit: '' },
              { vol: 0, unit: '' },
            ];

            for (let i = 0; i < Math.min(parts.length, 3); i++) {
              const m = parts[i].match(/^([\d.,]+)\s*(.*)$/);
              if (m) {
                factors[i] = {
                  vol: parseFloat(m[1].replace(/,/g, '.')) || 0,
                  unit: m[2] || '',
                };
              }
            }
            if (factors[0].vol === 0) {
              factors[0] = { vol: it.volume || 1, unit: it.satuan || 'item' };
            }

            return {
              id: `row-${idx + 1}`,
              category: it.category || 'Operasional',
              uraian: it.uraian || '',
              unitPrice: it.unitPrice || 0,
              factors,
              notes: '',
            };
          });
          setRows(loadedRows);
        }

        setActiveTab('baru');
        toast.success('Silakan sesuaikan rincian pengajuan.', { id: 'edit-sub' });
      }
    } catch (err) {
      toast.error('Gagal membuka pengajuan untuk diedit', { id: 'edit-sub' });
    }
  };

  return (
    <div className={`space-y-6 ${isStandalone ? 'max-w-7xl mx-auto p-4 sm:p-6' : ''}`}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#14532D] via-[#166534] to-[#15803D] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5" />
              Portal Mandiri Unit Sekolah
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Pengajuan Anggaran Kegiatan
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm">
              Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah
            </p>
          </div>

          {/* Unit Selector Header */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col sm:flex-row items-center gap-3">
            <div className="text-xs text-emerald-100">
              <span className="block font-medium">Unit Anda:</span>
            </div>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(Number(e.target.value))}
              className="bg-white text-slate-800 text-xs font-bold px-3 py-2 rounded-lg border-0 shadow-sm focus:ring-2 focus:ring-emerald-400"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-t border-white/15 pt-4">
          <button
            onClick={() => setActiveTab('baru')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'baru'
                ? 'bg-white text-[#14532D] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingSubmissionId ? 'Edit Pengajuan Unit' : 'Form Pengajuan Baru'}
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'riwayat'
                ? 'bg-white text-[#14532D] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Riwayat & Status Pengajuan
            {mySubmissions.length > 0 && (
              <span className="ml-1 bg-emerald-800 text-emerald-100 px-1.5 py-0.2 rounded-full text-[10px]">
                {mySubmissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB 1: FORM PENGAJUAN BARU / EDIT ── */}
      {activeTab === 'baru' && (
        <div className="space-y-6">
          {editingSubmissionId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-900 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Sedang merevisi / mengedit pengajuan: <strong>{submissionNumber}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="underline text-amber-700 hover:text-amber-900 font-bold"
              >
                Batalkan & Buat Baru
              </button>
            </div>
          )}

          {/* Section 1: Identitas Pengajuan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-emerald-700" />
              1. Identitas Kegiatan & Pengajuan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Pengajuan
                </label>
                <input
                  type="text"
                  value={submissionNumber}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-mono font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Pengajuan
                </label>
                <input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Penanggung Jawab (PIC)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ust. Ahmad Fauzi / Panitia"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan / Agenda Pengajuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: ANGGARAN DANA TKA / UJIAN SEMESTER GANJIL"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pos Kegiatan (Opsional)
                </label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Tambahan untuk Bendahara Umum
                </label>
                <input
                  type="text"
                  placeholder="Keterangan urgensi atau catatan khusus pelaksanaan kegiatan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Rincian Anggaran (Perkalian Fleksibel 1-3 Faktor) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  2. Rincian Kebutuhan Anggaran (Mendukung Perkalian 1 s/d 3 Faktor)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Contoh: [102 buah × 5 paket] atau [9 mapel × 8 pertemuan × 1 bulan]
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-800 min-w-[850px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 w-36">Kategori</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Uraian Barang / Kebutuhan</th>
                    <th className="py-2.5 px-3 w-32 text-right">Harga Satuan (Rp)</th>
                    <th className="py-2.5 px-3 min-w-[340px] text-center bg-emerald-50/50">
                      Volume Fleksibel (1 s/d 3 Faktor)
                    </th>
                    <th className="py-2.5 px-3 w-32 text-right">Jumlah Total (Rp)</th>
                    <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const rowTotal = calculateRowTotal(row);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* No */}
                        <td className="py-2 px-2 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Kategori */}
                        <td className="py-2 px-2">
                          <select
                            value={row.category}
                            onChange={(e) => handleRowChange(row.id, 'category', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Uraian */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="Ketik uraian kebutuhan..."
                            value={row.uraian}
                            onChange={(e) => handleRowChange(row.id, 'uraian', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Harga Satuan */}
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">Rp</span>
                            <input
                              type="number"
                              min="0"
                              value={row.unitPrice || ''}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  'unitPrice',
                                  e.target.value === '' ? 0 : Number(e.target.value)
                                )
                              }
                              placeholder="0"
                              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs font-mono font-bold text-right text-slate-800 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </td>

                        {/* Volume Input (Horizontal 3 Faktor) */}
                        <td className="py-2 px-2 bg-emerald-50/30">
                          <div className="flex items-center gap-1.5 justify-center">
                            {/* Faktor 1 */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Vol 1"
                                value={row.factors[0]?.vol || ''}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 0, 'vol', e.target.value)
                                }
                                className="w-14 bg-white border border-emerald-300 rounded-md px-1.5 py-1 text-center font-bold text-emerald-950 text-xs focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                placeholder="Sat 1"
                                value={row.factors[0]?.unit}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 0, 'unit', e.target.value)
                                }
                                className="w-16 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 text-center focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <span className="text-slate-400 font-bold text-xs">×</span>

                            {/* Faktor 2 */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Vol 2"
                                value={row.factors[1]?.vol || ''}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 1, 'vol', e.target.value)
                                }
                                className="w-14 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-center font-medium text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                placeholder="Sat 2"
                                value={row.factors[1]?.unit}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 1, 'unit', e.target.value)
                                }
                                className="w-16 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 text-center focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <span className="text-slate-400 font-bold text-xs">×</span>

                            {/* Faktor 3 */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Vol 3"
                                value={row.factors[2]?.vol || ''}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 2, 'vol', e.target.value)
                                }
                                className="w-14 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-center font-medium text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                placeholder="Sat 3"
                                value={row.factors[2]?.unit}
                                onChange={(e) =>
                                  handleFactorChange(row.id, 2, 'unit', e.target.value)
                                }
                                className="w-16 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 text-center focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Jumlah Total Row */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/20">
                          {formatRupiah(rowTotal)}
                        </td>

                        {/* Delete Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Footer Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="text-xs text-slate-300">
                <span>Total Item Kebutuhan: </span>
                <strong className="text-white font-mono">{rows.length} Pos</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
                  Total Anggaran Pengajuan:
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-slate-500" />
                Simpan Draft Unit
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#14532D] to-[#166534] hover:from-[#166534] hover:to-[#15803D] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-200" />
                    Kirim Pengajuan ke Bendahara Umum
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: RIWAYAT & STATUS PENGAJUAN UNIT ── */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Daftar & Status Pengajuan Unit
              </h3>
              <p className="text-xs text-slate-500">
                Pengajuan yang telah dibuat oleh unit ini beserta status tindak lanjut Bendahara Umum.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchMySubmissions}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
            </button>
          </div>

          {isLoadingSubmissions ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
              <p className="text-xs">Memuat daftar pengajuan unit...</p>
            </div>
          ) : mySubmissions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Belum ada pengajuan dari unit ini.</p>
              <button
                onClick={() => setActiveTab('baru')}
                className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100"
              >
                + Buat Pengajuan Sekarang
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-800">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-3">No. Pengajuan</th>
                    <th className="py-3 px-3">Kegiatan / Agenda</th>
                    <th className="py-3 px-3">Tanggal Kegiatan</th>
                    <th className="py-3 px-3 text-right">Total Anggaran</th>
                    <th className="py-3 px-3 text-center">Status Alur</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mySubmissions.map((sub) => {
                    const isRevision = sub.status === 'PERLU_REVISI';
                    const isDraft = sub.status === 'DRAFT';
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {sub.submissionNumber}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {sub.title}
                          {sub.picName && (
                            <span className="block text-[11px] font-normal text-slate-500">
                              PIC: {sub.picName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {formatDate(sub.activityDate || sub.submittedAt)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(sub.totalAnggaran || sub.totalExcel || (sub as any).totalAmount || 0)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isRevision ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Perlu Revisi Unit
                            </span>
                          ) : isDraft ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Draft Unit
                            </span>
                          ) : sub.status === 'MENUNGGU_REVIEW' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              Menunggu Evaluasi
                            </span>
                          ) : sub.status === 'DALAM_REVIEW' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              Sedang Dievaluasi
                            </span>
                          ) : sub.status === 'DICAIRKAN' || sub.status === 'SELESAI' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Dicairkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {sub.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleEditSubmission(sub)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            {isRevision ? 'Revisi Sekarang' : 'Edit / Lihat'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PengajuanUnitPage;
