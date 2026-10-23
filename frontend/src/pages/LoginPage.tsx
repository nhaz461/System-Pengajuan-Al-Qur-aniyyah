import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/format';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Login berhasil. Selamat datang!');
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green via-primary-700 to-primary-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-islamic-green to-primary-700 px-8 py-8 text-white text-center">
            <img
              src="/logo.png"
              alt="Logo Yayasan Al-Qur'aniyyah"
              className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 shadow-xl p-1 bg-white/10 border border-white/20"
            />
            <h1 className="text-xl font-bold leading-tight">
              Yayasan Pendidikan Islam
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Pondok Pesantren Al-Qur'aniyyah
            </p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
                Akses Tunggal Bendahara Keuangan
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Masuk ke Sistem Keuangan
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Kelola pengajuan, review SSH, persetujuan, dan pencairan semua unit dalam 1 akun.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="form-label" htmlFor="email">
                  Email Bendahara
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input pl-10"
                    placeholder="keuangan@alquraniyyah.sch.id"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pl-10 pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={16} className="text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye size={16} className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-2.5 mt-2 font-bold cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Masuk Sebagai Bendahara'
                )}
              </button>
            </form>

            {/* Quick 1-Click Login Helper */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center mb-2.5">
                Tombol Cepat Isi Akun:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('keuangan@alquraniyyah.sch.id');
                    setPassword('Keuangan@2026');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-center transition-all cursor-pointer"
                >
                  ⚡ Bendahara
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@alquraniyyah.sch.id');
                    setPassword('Admin@2026');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-center transition-all cursor-pointer"
                >
                  👑 Admin Master
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Hubungi Administrator jika Anda lupa password.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-4">
          © 2026 Yayasan Pendidikan Islam Al-Qur'aniyyah. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
