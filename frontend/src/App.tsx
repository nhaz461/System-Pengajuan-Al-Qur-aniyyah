import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MasterUnitPage from './pages/MasterUnitPage';
import MasterKegiatanPage from './pages/MasterKegiatanPage';
import TahunAnggaranPage from './pages/TahunAnggaranPage';
import MasterSshPage from './pages/MasterSshPage';
import PengajuanPage from './pages/PengajuanPage';
import ReviewPage from './pages/ReviewPage';
import ApprovalPage from './pages/ApprovalPage';
import PencairanPage from './pages/PencairanPage';
import RealisasiPage from './pages/RealisasiPage';
import BackupPage from './pages/BackupPage';
import {
  PengaturanPage,
} from './pages/PlaceholderPages';

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

  if (roles && user && !roles.includes(user.role)) {
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
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected */}
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

      <Route
        path="/pengajuan/*"
        element={
          <ProtectedRoute>
            <AppLayout><PengajuanPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/review/*"
        element={
          <ProtectedRoute roles={['ADMIN', 'KEUANGAN']}>
            <AppLayout><ReviewPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/persetujuan/*"
        element={
          <ProtectedRoute roles={['ADMIN', 'PIMPINAN']}>
            <AppLayout><ApprovalPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pencairan/*"
        element={
          <ProtectedRoute roles={['ADMIN', 'KEUANGAN']}>
            <AppLayout><PencairanPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/realisasi/*"
        element={
          <ProtectedRoute>
            <AppLayout><RealisasiPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/master-ssh/*"
        element={
          <ProtectedRoute roles={['ADMIN', 'KEUANGAN']}>
            <AppLayout><MasterSshPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/master-unit/*"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppLayout><MasterUnitPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/master-kegiatan/*"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppLayout><MasterKegiatanPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tahun-anggaran/*"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppLayout><TahunAnggaranPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/backup/*"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppLayout><BackupPage /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengaturan/*"
        element={
          <ProtectedRoute>
            <AppLayout><PengaturanPage /></AppLayout>
          </ProtectedRoute>
        }
      />

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
