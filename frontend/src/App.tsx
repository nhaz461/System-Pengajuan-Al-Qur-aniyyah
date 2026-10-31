import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PengajuanUnitPage from './pages/PengajuanUnitPage';
import DraftPengajuanPage from './pages/DraftPengajuanPage';
import ReviewPage from './pages/ReviewPage';
import DraftPencairanPage from './pages/DraftPencairanPage';
import MasterSshPage from './pages/MasterSshPage';
import PengaturanPage from './pages/PengaturanPage';

// ─── Protected Route ─────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Mode Akses Tunggal Bendahara: User KEUANGAN, ADMIN, BENDAHARA, PIMPINAN bisa akses semua halaman
  const isMasterUser = ['KEUANGAN', 'ADMIN', 'BENDAHARA', 'PIMPINAN'].includes(user?.role || '');
  if (roles && user && !isMasterUser && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ─── App Routes ───────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public Routes (Dapat diakses langsung oleh Unit tanpa login Bendahara) ── */}
      <Route
        path="/portal-unit"
        element={<PengajuanUnitPage isStandalone={true} />}
      />

      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* ── 7 Menu Utama Sistem Baru ── */}
      {/* 1. Dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 2. Pengajuan Unit */}
      <Route
        path="/pengajuan-unit"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PengajuanUnitPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 3. Draft Pengajuan */}
      <Route
        path="/draft-pengajuan"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DraftPengajuanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 4. Evaluasi Keuangan (Bendahara Umum) */}
      <Route
        path="/evaluasi"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ReviewPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 5. Draft Pencairan (SPPD & Eksekusi Pembayaran) */}
      <Route
        path="/draft-pencairan"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DraftPencairanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 6. Master SSH 2026 */}
      <Route
        path="/master-ssh"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MasterSshPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 7. Pengaturan Sistem & Master Data */}
      <Route
        path="/pengaturan"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PengaturanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ── Backward Compatibility Redirects (Alur Lama -> Alur Baru) ── */}
      <Route path="/pengajuan/*" element={<Navigate to="/draft-pengajuan" replace />} />
      <Route path="/review/*" element={<Navigate to="/evaluasi" replace />} />
      <Route path="/persetujuan/*" element={<Navigate to="/draft-pencairan" replace />} />
      <Route path="/pencairan/*" element={<Navigate to="/draft-pencairan" replace />} />
      <Route path="/realisasi/*" element={<Navigate to="/draft-pencairan" replace />} />
      <Route path="/master-unit/*" element={<Navigate to="/pengaturan?tab=unit" replace />} />
      <Route path="/master-kegiatan/*" element={<Navigate to="/pengaturan?tab=kegiatan" replace />} />
      <Route path="/tahun-anggaran/*" element={<Navigate to="/pengaturan?tab=tahun" replace />} />
      <Route path="/backup/*" element={<Navigate to="/pengaturan?tab=backup" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ─── App Root ─────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
