import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, phase }) => (
  <div>
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
    </div>
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <Construction size={28} className="text-amber-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">Dalam Pengembangan</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        Modul ini akan tersedia pada <strong>{phase}</strong>.
        Sistem sedang dalam proses pembangunan bertahap.
      </p>
      <div className="mt-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        Phase saat ini: <strong>Phase 1 — Setup & Master Data</strong>
      </div>
    </div>
  </div>
);

export const PengajuanPage: React.FC = () => (
  <PlaceholderPage title="Pengajuan Unit" description="Upload dan kelola pengajuan anggaran unit" phase="Phase 3" />
);

export const ReviewPage: React.FC = () => (
  <PlaceholderPage title="Review Keuangan" description="Review dan verifikasi pengajuan anggaran" phase="Phase 4" />
);

export const PersetujuanPage: React.FC = () => (
  <PlaceholderPage title="Persetujuan Pimpinan" description="Persetujuan dan penolakan pengajuan" phase="Phase 5" />
);

export const PencairanPage: React.FC = () => (
  <PlaceholderPage title="Pencairan" description="Proses pencairan dana yang telah disetujui" phase="Phase 6" />
);

export const RealisasiPage: React.FC = () => (
  <PlaceholderPage title="Realisasi & LPJ" description="Input realisasi penggunaan anggaran" phase="Phase 7" />
);

export const MasterSshPage: React.FC = () => (
  <PlaceholderPage title="Master SSH 2026" description="Import dan kelola Standar Satuan Harga" phase="Phase 2" />
);

export const BackupPage: React.FC = () => (
  <PlaceholderPage title="Backup & Restore" description="Backup dan restore database" phase="Phase 9" />
);

import SystemDiagnosticsPage from './SystemDiagnosticsPage';

export const PengaturanPage: React.FC = () => (
  <SystemDiagnosticsPage />
);

