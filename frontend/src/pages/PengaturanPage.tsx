import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings,
  Building2,
  Calendar,
  CalendarDays,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import MasterUnitPage from './MasterUnitPage';
import MasterKegiatanPage from './MasterKegiatanPage';
import TahunAnggaranPage from './TahunAnggaranPage';
import BackupPage from './BackupPage';

type TabKey = 'unit' | 'kegiatan' | 'tahun' | 'backup';

export const PengaturanPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'unit';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey;
    if (tabFromUrl && ['unit', 'kegiatan', 'tahun', 'backup'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Settings className="w-3.5 h-3.5 text-emerald-700" />
            Konfigurasi & Master Data Yayasan
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Sistem Administrasi Keuangan
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Kelola data master unit sekolah, pos kegiatan, tahun anggaran, dan pencadangan database.
          </p>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 gap-2 overflow-x-auto shadow-xs">
        <button
          type="button"
          onClick={() => handleTabChange('unit')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'unit'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-700" />
          Master Unit Sekolah
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('kegiatan')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'kegiatan'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-700" />
          Master Pos Kegiatan
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('tahun')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'tahun'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-emerald-700" />
          Tahun Anggaran
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('backup')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4 text-emerald-700" />
          Backup & Arsip Excel
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-transparent">
        {activeTab === 'unit' && <MasterUnitPage />}
        {activeTab === 'kegiatan' && <MasterKegiatanPage />}
        {activeTab === 'tahun' && <TahunAnggaranPage />}
        {activeTab === 'backup' && <BackupPage />}
      </div>
    </div>
  );
};

export default PengaturanPage;
