import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  Banknote,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatDate } from '../utils/format';
import toast from 'react-hot-toast';

export interface SppdItem {
  itemNumber: number;
  kebutuhan: string;
  pengajuanHarga: number;
  pengajuanRincian: string;
  pengajuanTotal: number;
  pencairanHarga: number;
  pencairanRincian: string;
  pencairanTotal: number;
}

export interface SppdData {
  submissionId: number;
  letterNumber: string;
  academicYear: string;
  institution: string;
  subInstitution: string;
  unit: string;
  activity: string;
  activityDate: string;
  disbursementDate?: string;
  picName?: string;
  summary: {
    totalPengajuan: number;
    totalPencairan: number;
    selisih: number;
  };
  items: SppdItem[];
  signatories: {
    pemohon: { nama: string; jabatan: string };
    bendahara: { nama: string; jabatan: string };
    ketuaUmum: { nama: string; jabatan: string };
  };
}

interface SppdDocumentProps {
  data: SppdData;
  onClose?: () => void;
  showActions?: boolean;
}

export const SppdDocument: React.FC<SppdDocumentProps> = ({ data, onClose, showActions = true }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!printRef.current) return;
    try {
      setIsExportingPng(true);
      toast.loading('Menyiapkan gambar SPPD kualitas tinggi...', { id: 'sppd-png' });

      const canvas = await html2canvas(printRef.current, {
        scale: 2, // High resolution (retina display quality)
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const safeNum = (data.letterNumber || 'SPPD').replace(/[/\\?%*:|"<>]/g, '_');
      link.download = `SPPD_${safeNum}.png`;
      link.href = image;
      link.click();

      toast.success('Gambar SPPD berhasil diunduh (PNG)', { id: 'sppd-png' });
    } catch (err: any) {
      console.error('Failed to export SPPD image:', err);
      toast.error('Gagal mengunduh gambar SPPD: ' + (err.message || 'Error'), { id: 'sppd-png' });
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-white text-slate-800">
      {/* Action Bar (Hidden during print) */}
      {showActions && (
        <div className="px-6 py-4 bg-gradient-to-r from-[#14532D] via-[#166534] to-[#15803D] text-white flex flex-wrap items-center justify-between gap-3 print:hidden shadow-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                Dokumen Resmi Pencairan
              </div>
              <h3 className="text-sm font-bold text-white">
                Surat Perintah Pencairan Dana (SPPD)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-emerald-50 rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title="Unduh format Gambar PNG HD"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-700" />
              )}
              Download PNG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-emerald-600"
            >
              <Printer className="w-3.5 h-3.5 text-white" /> Cetak / PDF
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors ml-2"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Area */}
      <div
        ref={printRef}
        id="sppd-print-area"
        className="p-6 sm:p-8 bg-white print:p-0 print:m-0"
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #sppd-print-area, #sppd-print-area * {
                visibility: visible !important;
              }
              #sppd-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `
        }} />

        {/* 1. Header Banner / Kop Lembaga */}
        <div className="bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-200/80 rounded-2xl p-5 text-center shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Tahun Ajaran {data.academicYear?.replace(/^Tahun Ajaran\s*/i, '') || '2026-2027'}</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-[#14532D] uppercase">
            SURAT PERINTAH PENCAIRAN DANA (SPPD)
          </h1>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide mt-0.5">
            {data.institution || "YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH"}
          </h2>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {data.subInstitution || 'BENDAHARA UMUM & PENGELUARAN'}
          </h3>
        </div>

        {/* 2. Metadata Cards (Left: Info Pengajuan, Right: Ringkasan Anggaran) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
          {/* Left Column: Info Pengajuan */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" /> Informasi Pengajuan & Unit
            </div>
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 text-slate-500 font-medium">Tanggal Pelaksanaan</span>
              <span className="col-span-1 text-center text-slate-300">:</span>
              <span className="col-span-7 font-bold text-slate-900 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                {formatDate(data.activityDate)}
              </span>
            </div>
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 text-slate-500 font-medium">Nomor Surat SPPD</span>
              <span className="col-span-1 text-center text-slate-300">:</span>
              <span className="col-span-7 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md inline-block w-fit">
                {data.letterNumber}
              </span>
            </div>
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 text-slate-500 font-medium">Unit / Lembaga</span>
              <span className="col-span-1 text-center text-slate-300">:</span>
              <span className="col-span-7 font-bold text-slate-900">{data.unit}</span>
            </div>
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-4 text-slate-500 font-medium">Agenda Kegiatan</span>
              <span className="col-span-1 text-center text-slate-300">:</span>
              <span className="col-span-7 font-semibold text-slate-800">{data.activity}</span>
            </div>
            {data.picName && (
              <div className="grid grid-cols-12 items-center">
                <span className="col-span-4 text-slate-500 font-medium">Penanggung Jawab</span>
                <span className="col-span-1 text-center text-slate-300">:</span>
                <span className="col-span-7 font-medium text-slate-700">{data.picName}</span>
              </div>
            )}
          </div>

          {/* Right Column: Ringkasan Biaya Kegiatan */}
          <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-700" /> Ringkasan Anggaran
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetujui
              </span>
            </div>

            <div className="space-y-2 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Usulan Pengajuan</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">
                    Rp {formatNumber(data.summary.totalPengajuan)}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
                  Usulan Unit
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Realisasi Pencairan</p>
                  <p className="text-base font-extrabold text-[#14532D] font-mono">
                    Rp {formatNumber(data.summary.totalPencairan)}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-xs">
                  Kasir Yayasan
                </span>
              </div>

              {data.summary.selisih > 0 && (
                <div className="text-[11px] text-emerald-700 font-medium px-1 flex justify-between">
                  <span>Efisiensi / Penghematan:</span>
                  <span className="font-bold font-mono">Rp {formatNumber(data.summary.selisih)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Side-by-Side Comparison Table (Pengajuan Dana vs Pencairan Dana) */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-xs border-collapse text-slate-900">
            <thead>
              {/* Top Header Split Row */}
              <tr className="border-b border-slate-200">
                <th colSpan={5} className="bg-slate-100/90 text-center font-bold uppercase py-2.5 px-3 border-r border-slate-200 tracking-wider text-slate-700">
                  PENGAJUAN DANA (USULAN UNIT)
                </th>
                <th colSpan={3} className="bg-emerald-100/70 text-center font-bold uppercase py-2.5 px-3 tracking-wider text-[#14532D]">
                  PENCAIRAN DANA (DISETUJUI YAYASAN)
                </th>
              </tr>
              {/* Sub Header Column Names */}
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                <th className="py-2 px-2.5 border-r border-slate-200 w-10 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-200 text-left">Kebutuhan</th>
                <th className="py-2 px-2.5 border-r border-slate-200 text-right w-28">Harga Satuan</th>
                <th className="py-2 px-2.5 border-r border-slate-200 text-center w-28">Rincian Volume</th>
                <th className="py-2 px-2.5 border-r-2 border-slate-200 text-right w-32 font-bold text-slate-800">Total Usulan</th>
                <th className="py-2 px-2.5 border-r border-slate-200 text-right w-28">Harga Satuan</th>
                <th className="py-2 px-2.5 border-r border-slate-200 text-center w-28">Rincian Disetujui</th>
                <th className="py-2 px-2.5 text-right w-32 font-bold text-[#14532D]">Total Cair</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Tidak ada rincian item anggaran.
                  </td>
                </tr>
              ) : (
                data.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                    {/* Pengajuan Dana Data */}
                    <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] text-slate-500">
                      {it.itemNumber || idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                      {it.kebutuhan}
                    </td>
                    <td className="py-2 px-2.5 text-right border-r border-slate-200 font-mono text-slate-600">
                      <span className="float-left text-slate-400">Rp</span> {formatNumber(it.pengajuanHarga)}
                    </td>
                    <td className="py-2 px-2.5 text-center border-r border-slate-200 text-slate-600 font-medium">
                      {it.pengajuanRincian}
                    </td>
                    <td className="py-2 px-2.5 text-right border-r-2 border-slate-200 font-mono font-semibold text-slate-800">
                      <span className="float-left text-slate-400">Rp</span> {formatNumber(it.pengajuanTotal)}
                    </td>

                    {/* Pencairan Dana Data */}
                    <td className="py-2 px-2.5 text-right border-r border-slate-200 font-mono text-emerald-950 font-medium">
                      <span className="float-left text-emerald-600/50">Rp</span> {formatNumber(it.pencairanHarga)}
                    </td>
                    <td className="py-2 px-2.5 text-center border-r border-slate-200 text-emerald-950 font-medium">
                      {it.pencairanRincian}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-[#14532D]">
                      <span className="float-left text-emerald-700/60">Rp</span> {formatNumber(it.pencairanTotal)}
                    </td>
                  </tr>
                ))
              )}

              {/* Total Row Bawah */}
              <tr className="border-t-2 border-slate-200 font-extrabold text-slate-900 bg-slate-50/80">
                <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider border-r border-slate-200 text-slate-600 text-[11px]">
                  TOTAL PENGAJUAN DANA
                </td>
                <td className="py-3 px-2.5 text-right border-r-2 border-slate-200 font-mono text-xs font-bold text-slate-800 bg-slate-100">
                  <span className="float-left text-slate-500">Rp</span> {formatNumber(data.summary.totalPengajuan)}
                </td>
                <td colSpan={2} className="py-3 px-3 text-right uppercase tracking-wider border-r border-slate-200 text-emerald-800 text-[11px]">
                  TOTAL PENCAIRAN DANA
                </td>
                <td className="py-3 px-2.5 text-right font-mono text-xs font-extrabold text-[#14532D] bg-emerald-50">
                  <span className="float-left text-emerald-700">Rp</span> {formatNumber(data.summary.totalPencairan)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Tanggal Pencairan Banner Bawah */}
        <div className="flex justify-end items-center mt-3 text-xs">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-950 font-semibold shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-slate-600 font-normal">Tanggal Pencairan:</span>
            <span className="font-bold font-mono">
              {formatDate(data.disbursementDate || data.activityDate)}
            </span>
          </div>
        </div>

        {/* 5. Tanda Tangan Resmi (3 Pihak) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-200">
          {/* Pemohon */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-700">Pemohon / Pengaju</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{data.unit}</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 italic font-mono">(Tanda Tangan)</span>
            </div>
            <p className="font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">{data.signatories?.pemohon?.nama || data.picName || 'Penanggung Jawab'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{data.signatories?.pemohon?.jabatan || 'Penanggung Jawab Kegiatan'}</p>
          </div>

          {/* Bendahara Umum */}
          <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/80 text-center shadow-xs">
            <p className="text-xs font-semibold text-emerald-950">Menyetujui & Mengevaluasi</p>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Bendahara Umum Yayasan</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-emerald-400 italic font-mono">(Tanda Tangan Digital)</span>
            </div>
            <p className="font-bold text-emerald-950 text-xs pt-1 border-t border-emerald-200">{data.signatories?.bendahara?.nama || 'Hj. Siti Aisyah, S.Pd.I'}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{data.signatories?.bendahara?.jabatan || 'Bendahara Umum Yayasan'}</p>
          </div>

          {/* Ketua Umum Yayasan */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-700">Mengetahui / Mengesahkan</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Ketua Umum Yayasan</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 italic font-mono">(Tanda Tangan)</span>
            </div>
            <p className="font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">{data.signatories?.ketuaUmum?.nama || 'Drs. H. Ahmad Dahlan, M.Ag'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{data.signatories?.ketuaUmum?.jabatan || 'Ketua Umum Pengurus'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SppdDocument;
