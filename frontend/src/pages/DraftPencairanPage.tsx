import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Banknote,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Printer,
  Download,
  Eye,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  X,
  CreditCard,
  Check,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { disbursementService } from '../services/disbursement.service';
import { submissionsService } from '../services/submissions.service';
import { formatRupiah, formatDate, formatDateTime, getErrorMessage } from '../utils/format';
import { SppdDocument, SppdData } from '../components/SppdDocument';
import toast from 'react-hot-toast';

export interface DisbursementSubmission {
  id: number;
  submissionNumber: string;
  title: string;
  totalAmount?: number;
  totalAnggaran?: number;
  totalApproved?: number | null;
  status: any;
  workflowStatus?: string;
  activityDate?: string | null;
  submittedAt?: string;
  picName?: string | null;
  disbursementDate?: string;
  disbursementAmount?: number;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  recipientName?: string;
  unit: any;
  unitCode?: string;
  activity?: any;
  fiscalYear?: any;
  items?: any[];
}

export const DraftPencairanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');

  const [submissions, setSubmissions] = useState<DisbursementSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // SPPD Modal State
  const [activeSppdData, setActiveSppdData] = useState<SppdData | null>(null);
  const [isLoadingSppd, setIsLoadingSppd] = useState(false);

  // Disbursement Confirmation Modal State
  const [confirmModalSub, setConfirmModalSub] = useState<DisbursementSubmission | null>(null);
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [disbursementAmount, setDisbursementAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'TUNAI'>('TRANSFER');
  const [bankName, setBankName] = useState('BSI (Bank Syariah Indonesia)');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [disbursementNotes, setDisbursementNotes] = useState('');
  const [isSubmittingDisbursement, setIsSubmittingDisbursement] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const res = await disbursementService.getSubmissions();
      if (res.data?.items) {
        setSubmissions(res.data.items as any);
      }
    } catch (err: any) {
      toast.error('Gagal memuat data pencairan: ' + getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Filtered List
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const unitStr = typeof sub.unit === 'string' ? sub.unit : (sub.unit?.name || '');
      const matchSearch =
        sub.submissionNumber.toLowerCase().includes(search.toLowerCase()) ||
        sub.title.toLowerCase().includes(search.toLowerCase()) ||
        unitStr.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'SIAP') {
        return (
          sub.status === 'MENUNGGU_PENCAIRAN' ||
          sub.status === 'REVIEW_SELESAI' ||
          sub.workflowStatus === 'SIAP_DICAIRKAN' ||
          sub.workflowStatus === 'SELESAI_EVALUASI'
        );
      }
      if (statusFilter === 'SUDAH_DIKIRIM') {
        return sub.workflowStatus === 'SUDAH_DIKIRIM';
      }
      if (statusFilter === 'DICAIRKAN') {
        return (
          sub.status === 'DICAIRKAN' ||
          sub.status === 'SELESAI' ||
          sub.workflowStatus === 'SUDAH_DICAIRKAN'
        );
      }
      return true;
    });
  }, [submissions, search, statusFilter]);

  // Total Summary Stats
  const stats = useMemo(() => {
    const totalSiap = submissions
      .filter((s) => s.status !== 'DICAIRKAN' && s.status !== 'SELESAI')
      .reduce((acc, s) => acc + (s.totalApproved || s.totalAmount || s.totalAnggaran || 0), 0);

    const totalCair = submissions
      .filter((s) => s.status === 'DICAIRKAN' || s.status === 'SELESAI')
      .reduce((acc, s) => acc + (s.disbursementAmount || s.totalApproved || s.totalAmount || s.totalAnggaran || 0), 0);

    return {
      countDraft: submissions.length,
      totalSiap,
      totalCair,
    };
  }, [submissions]);

  // Open SPPD Document
  const handleOpenSppd = async (sub: DisbursementSubmission) => {
    try {
      setIsLoadingSppd(true);
      toast.loading('Memuat dokumen SPPD...', { id: 'load-sppd' });
      const sppdRes = await disbursementService.getSppd(sub.id);
      if (sppdRes.data) {
        const d = sppdRes.data;
        const sppd: SppdData = {
          submissionId: sub.id,
          letterNumber: d.letterNumber || `SPPD/${sub.unitCode || 'YAYASAN'}/${new Date().getFullYear()}/${String(sub.id).padStart(4, '0')}`,
          academicYear: d.academicYear || '2026/2027',
          institution: d.institution || "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH",
          subInstitution: d.subInstitution || 'BENDAHARA UMUM & BENDAHARA PENGELUARAN',
          unit: typeof sub.unit === 'string' ? sub.unit : (sub.unit?.name || d.unit || 'Unit Sekolah'),
          activity: d.title || sub.title,
          activityDate: d.activityDate || sub.activityDate || sub.submittedAt || '',
          disbursementDate: sub.disbursementDate || d.disbursementDate,
          picName: sub.picName || 'Penanggung Jawab',
          summary: {
            totalPengajuan: d.summary?.totalPengajuan || 0,
            totalPencairan: d.summary?.totalPencairan || 0,
            selisih: d.summary?.selisihEfisiensi || 0,
          },
          items: (d.items || []).map((it: any, idx: number) => ({
            itemNumber: it.itemNumber || it.no || idx + 1,
            kebutuhan: it.kebutuhan,
            pengajuanHarga: it.pengajuanHarga,
            pengajuanRincian: it.pengajuanRincian,
            pengajuanTotal: it.pengajuanTotal,
            pencairanHarga: it.pencairanHarga,
            pencairanRincian: it.pencairanRincian,
            pencairanTotal: it.pencairanTotal,
          })),
          signatories: d.signatories ? {
            pemohon: d.signatories.pemohon,
            bendahara: d.signatories.keuangan,
            ketuaUmum: d.signatories.pimpinan,
          } : {
            pemohon: {
              nama: sub.picName || 'Penanggung Jawab Kegiatan',
              jabatan: 'Penanggung Jawab Kegiatan',
            },
            bendahara: {
              nama: 'Hj. Siti Aisyah, S.Pd.I',
              jabatan: 'Bendahara Umum Yayasan',
            },
            ketuaUmum: {
              nama: 'Drs. H. Ahmad Dahlan, M.Ag',
              jabatan: 'Ketua Umum Pengurus Yayasan',
            },
          },
        };

        setActiveSppdData(sppd);
        toast.success('Dokumen SPPD siap ditampilkan.', { id: 'load-sppd' });
      }
    } catch (err: any) {
      toast.error('Gagal memuat SPPD: ' + getErrorMessage(err), { id: 'load-sppd' });
    } finally {
      setIsLoadingSppd(false);
    }
  };

  // Open modal if highlightId is passed
  useEffect(() => {
    if (highlightId && submissions.length > 0) {
      const match = submissions.find((s) => s.id === Number(highlightId));
      if (match) {
        handleOpenSppd(match);
      }
    }
  }, [highlightId, submissions]);

  // Mark as Sent to Expenditure Treasurer
  const handleMarkAsSent = async (sub: DisbursementSubmission) => {
    try {
      await submissionsService.updateWorkflowStatus(sub.id, {
        status: 'SUDAH_DIKIRIM',
        notes: 'Draft SPPD telah dikirimkan ke Bendahara Pengeluaran.',
      });
      toast.success(`Draft ${sub.submissionNumber} berhasil dikirim ke Bendahara Pengeluaran.`);
      fetchSubmissions();
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + getErrorMessage(err));
    }
  };

  // Open Disbursement Confirm Modal
  const handleOpenDisbursementModal = (sub: DisbursementSubmission) => {
    setConfirmModalSub(sub);
    setDisbursementDate(new Date().toISOString().split('T')[0]);
    setDisbursementAmount(sub.totalApproved || sub.totalAmount || sub.totalAnggaran || 0);
    setRecipientName(sub.picName || (typeof sub.unit === 'string' ? sub.unit : sub.unit?.name) || '');
    setAccountNumber('');
  };

  // Submit Disbursement Confirmation
  const handleConfirmDisbursement = async () => {
    if (!confirmModalSub) return;
    if (!disbursementAmount || disbursementAmount <= 0) {
      toast.error('Nominal pencairan harus lebih dari Rp 0.');
      return;
    }

    try {
      setIsSubmittingDisbursement(true);
      await submissionsService.updateWorkflowStatus(confirmModalSub.id, {
        status: 'SUDAH_DICAIRKAN',
        disbursementAmount,
        disbursementDate,
        paymentMethod,
        bankName: paymentMethod === 'TRANSFER' ? bankName : 'KAS TUNAI',
        accountNumber: paymentMethod === 'TRANSFER' ? accountNumber : '-',
        recipientName: recipientName || confirmModalSub.picName || '-',
        notes: disbursementNotes || `Pencairan dana via ${paymentMethod}`,
      });

      toast.success(`Pencairan dana ${confirmModalSub.submissionNumber} sebesar ${formatRupiah(disbursementAmount)} BERHASIL dikonfirmasi!`);
      setConfirmModalSub(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error('Gagal mengonfirmasi pencairan: ' + getErrorMessage(err));
    } finally {
      setIsSubmittingDisbursement(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Banknote className="w-3.5 h-3.5 text-emerald-700" />
            Otorisasi & Eksekusi Pembayaran
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Draft Anggaran & Pencairan Dana (SPPD)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Penerbitan dokumen resmi SPPD dan konfirmasi pencairan dana kepada Bendahara Pengeluaran.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSubmissions}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 self-start md:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Draft SPPD</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.countDraft} Dokumen</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Siap / Menunggu Dicairkan</p>
            <p className="text-xl font-black text-amber-700 mt-0.5 font-mono">
              {formatRupiah(stats.totalSiap)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#14532D] flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Telah Dicairkan</p>
            <p className="text-xl font-black text-[#14532D] mt-0.5 font-mono">
              {formatRupiah(stats.totalCair)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full md:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari draft SPPD, kegiatan, atau unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Status Draft</option>
            <option value="SIAP">Siap Dicairkan</option>
            <option value="SUDAH_DIKIRIM">Sudah Dikirim ke Bendahara Pengeluaran</option>
            <option value="DICAIRKAN">Sudah Dicairkan</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
            <p className="text-xs font-medium">Memuat draft anggaran & pencairan...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              Tidak ada draft anggaran / SPPD ditemukan.
            </p>
            <p className="text-xs text-slate-400">
              Draft akan otomatis dibuat setelah Bendahara Umum menyelesaikan Evaluasi Keuangan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-800">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. SPPD / Pengajuan</th>
                  <th className="py-3 px-4">Unit Sekolah</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4 text-right">Usulan Awal</th>
                  <th className="py-3 px-4 text-right">Anggaran Disetujui</th>
                  <th className="py-3 px-4 text-center">Status Draft</th>
                  <th className="py-3 px-4 text-center">Aksi Dokumen & Pencairan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const isDisbursed =
                    sub.status === 'DICAIRKAN' ||
                    sub.status === 'SELESAI' ||
                    sub.workflowStatus === 'SUDAH_DICAIRKAN';

                  const isSent = sub.workflowStatus === 'SUDAH_DIKIRIM';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {sub.submissionNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: #{sub.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-emerald-950">
                        {typeof sub.unit === 'string' ? sub.unit : (sub.unit?.name || 'Unit')}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                        {sub.title}
                        {sub.picName && (
                          <span className="block text-[11px] text-slate-500 font-normal">
                            PIC: {sub.picName}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {formatRupiah(sub.totalAmount || sub.totalAnggaran || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#14532D] text-xs">
                        {formatRupiah(sub.totalApproved || sub.totalAmount || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isDisbursed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Sudah Dicairkan
                          </span>
                        ) : isSent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Send className="w-3 h-3 text-blue-600" /> Dikirim ke Bendahara Pengeluaran
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Siap Dicairkan
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Buka Dokumen SPPD */}
                          <button
                            type="button"
                            onClick={() => handleOpenSppd(sub)}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#14532D] to-[#166534] hover:from-[#166534] hover:to-[#15803D] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                            title="Buka Dokumen Resmi SPPD"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-300" />
                            Dokumen SPPD
                          </button>

                          {/* Tombol Kirim ke Bendahara Pengeluaran */}
                          {!isDisbursed && !isSent && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsSent(sub)}
                              className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Tandai Sudah Dikirim ke Bendahara Pengeluaran"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Konfirmasi Pencairan */}
                          {!isDisbursed ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDisbursementModal(sub)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                              title="Konfirmasi Pencairan Dana oleh Kasir / Bendahara Pengeluaran"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Cairkan Dana
                            </button>
                          ) : (
                            <div className="text-[10px] text-slate-500 font-mono text-left pl-1">
                              <span>Tgl Cair: {formatDate(sub.disbursementDate || sub.activityDate)}</span>
                              <span className="block font-bold text-[#14532D]">
                                Nominal: {formatRupiah(sub.disbursementAmount || sub.totalApproved || 0)}
                              </span>
                            </div>
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

      {/* ── MODAL RESMI DOKUMEN SPPD (MENGIKUTI DESAIN REFERENSI) ── */}
      {activeSppdData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-4 flex flex-col border border-slate-200 overflow-hidden print:border-0 print:shadow-none print:my-0 print:max-w-none">
            <SppdDocument
              data={activeSppdData}
              onClose={() => setActiveSppdData(null)}
              showActions={true}
            />
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI PENCAIRAN BENDAHARA PENGELUARAN ── */}
      {confirmModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Konfirmasi Pencairan Dana Kasir / Bendahara Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModalSub(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50/50 rounded-xl p-3 text-xs space-y-1.5 border border-emerald-100">
              <p>
                <strong>Nomor Pengajuan:</strong> {confirmModalSub.submissionNumber}
              </p>
              <p>
                <strong>Unit:</strong> {typeof confirmModalSub.unit === 'string' ? confirmModalSub.unit : (confirmModalSub.unit?.name || 'Unit')}
              </p>
              <p>
                <strong>Kegiatan:</strong> {confirmModalSub.title}
              </p>
              <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-bold text-emerald-950">
                <span>Anggaran Disetujui Evaluator:</span>
                <span className="font-mono">
                  {formatRupiah(confirmModalSub.totalApproved || confirmModalSub.totalAmount || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal yang Benar-Benar Dicairkan (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={disbursementAmount}
                  onChange={(e) => setDisbursementAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Terbilang: {formatRupiah(disbursementAmount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Pencairan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TUNAI">Kas Tunai</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="BSI / BRI / Mandiri"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Rekening Tujuan
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Nomor rekening"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Penerima Dana
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nama PIC atau perwakilan unit"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Pencairan (Opsional)
                </label>
                <input
                  type="text"
                  value={disbursementNotes}
                  onChange={(e) => setDisbursementNotes(e.target.value)}
                  placeholder="Keterangan transfer, no referensi bank, dsb..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalSub(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDisbursement}
                disabled={isSubmittingDisbursement}
                className="px-5 py-2 bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSubmittingDisbursement ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                )}
                Konfirmasi Telah Dicairkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPencairanPage;
