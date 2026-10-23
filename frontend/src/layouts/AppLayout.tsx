import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  CheckSquare,
  Banknote,
  ClipboardList,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  HardDrive,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Bell,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/format';
import { backupService } from '../services/backup.service';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Pengajuan Anggaran', path: '/pengajuan', icon: FileText },
  { label: 'Review Anggaran & SSH', path: '/review', icon: Search },
  { label: 'Persetujuan (Approval)', path: '/persetujuan', icon: CheckSquare },
  { label: 'Pencairan Dana (SPPD)', path: '/pencairan', icon: Banknote },
  { label: 'Realisasi & LPJ', path: '/realisasi', icon: ClipboardList },
  { label: 'Master SSH 2026', path: '/master-ssh', icon: BookOpen },
  { label: 'Master Unit Sekolah', path: '/master-unit', icon: Building2 },
  { label: 'Master Pos Kegiatan', path: '/master-kegiatan', icon: Calendar },
  { label: 'Tahun Anggaran', path: '/tahun-anggaran', icon: CalendarDays },
  { label: 'Backup & Arsip Excel', path: '/backup', icon: HardDrive },
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'bg-red-100 text-red-800';
    case 'KEUANGAN': return 'bg-blue-100 text-blue-800';
    case 'PIMPINAN': return 'bg-purple-100 text-purple-800';
    case 'UNIT': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// ─── Sidebar Component ───────────────────────────────────────
const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || '')
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-islamic-green text-white">
      {/* Logo / Header */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Yayasan Al-Qur'aniyyah"
              className="w-10 h-10 rounded-xl object-contain shadow-md flex-shrink-0 bg-white/10 p-0.5 border border-white/20"
            />
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate text-white">Yayasan Al-Qur'aniyyah</p>
              <p className="text-[11px] text-emerald-200/80 leading-tight">Sistem Keuangan v1.0</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors ml-2 flex-shrink-0">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', getRoleBadgeColor(user?.role || ''))}>
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white flex-shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main App Layout ─────────────────────────────────────────
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const handleQuickBackupExcel = async () => {
    try {
      setIsBackingUp(true);
      toast.loading('Menghimpun seluruh database ke file Excel...', { id: 'backup-toast' });
      await backupService.downloadExcelBackup();
      toast.success('Database Excel berhasil diunduh dan tersimpan ke folder backup lokal!', {
        id: 'backup-toast',
      });
    } catch {
      toast.error('Gagal mengunduh backup Excel.', { id: 'backup-toast' });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Get current page title
  const currentItem = navItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  );

  return (
    <div className="flex h-screen min-h-[100dvh] max-h-[100dvh] bg-gray-50 overflow-hidden">
      {/* ── Desktop Sidebar (fixed, tidak collapse konten) ── */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-60 flex-col">
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative flex flex-col w-72 max-w-[80vw] h-full z-10 shadow-xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            {/* Page Title */}
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                {currentItem?.label || 'Sistem Keuangan'}
              </h1>
              {user?.unit && (
                <p className="text-xs text-gray-500">{user.unit.name}</p>
              )}
            </div>
          </div>

          {/* Header Right */}
          <div className="flex items-center gap-2.5">
            {/* Tombol Backup Excel Cepat (Himpun seluruh data lokal) */}
            <button
              type="button"
              onClick={handleQuickBackupExcel}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-[#1B4332] border border-emerald-300 hover:bg-emerald-100 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Unduh & simpan rekap seluruh data aplikasi ke file Excel lokal"
            >
              {isBackingUp ? (
                <Loader2 size={14} className="animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet size={15} className="text-[#1B4332]" />
              )}
              <span className="hidden sm:inline">Backup Excel</span>
            </button>

            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative" title="Notifikasi">
              <Bell size={18} className="text-gray-600" />
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-[#1B4332] flex items-center justify-center shadow-2xs">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-36 truncate">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content - SCROLLABLE & RESPONSIVE */}
        <main className="flex-1 overflow-y-auto overflow-x-auto min-h-0 focus:outline-none">
          <div className="p-4 sm:p-6 min-h-full pb-24 sm:pb-12 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
