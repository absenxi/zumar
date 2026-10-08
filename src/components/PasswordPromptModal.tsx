import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertTriangle, X, ShieldAlert, ShieldCheck, Eye, EyeOff, UserCheck, Shield } from 'lucide-react';
import { UserRole } from '../types';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole) => void;
  guruPassword?: string;
  adminPassword?: string;
  superAdminPassword?: string;
  requiredLevel?: 'guru' | 'admin';
  title?: string;
  description?: string;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  guruPassword = '1234',
  adminPassword = 'admin',
  superAdminPassword = 'superadmin',
  requiredLevel = 'guru',
  title,
  description,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isAdminOnly = requiredLevel === 'admin';

  const defaultTitle = isAdminOnly
    ? 'Akses Terbatas: Level Admin / Super Admin'
    : 'Masukkan Password / PIN Absensi';

  const defaultDescription = isAdminOnly
    ? 'Database Siswa & Pengaturan memerlukan otorisasi Level Admin atau Super Admin.'
    : 'Masukkan PIN Guru untuk pengisian absensi, atau Password Admin / Super Admin untuk akses penuh.';

  const modalTitle = title || defaultTitle;
  const modalDescription = description || defaultDescription;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = passwordInput.trim();

    if (isAdminOnly) {
      if (input === superAdminPassword) {
        setErrorMsg('');
        setPasswordInput('');
        onSuccess('superadmin');
      } else if (input === adminPassword) {
        setErrorMsg('');
        setPasswordInput('');
        onSuccess('admin');
      } else if (input === guruPassword) {
        setErrorMsg(
          '⛔ Akses Ditolak: Password/PIN Guru HANYA bisa untuk mengisi absensi harian dan TIDAK BISA membuka Database Siswa / Pengaturan. Masukkan Password Level Admin / Super Admin!'
        );
      } else {
        setErrorMsg('Password Admin / Super Admin salah! Silakan coba lagi.');
      }
    } else {
      // Guru level required (can be satisfied by superAdminPassword, adminPassword or guruPassword)
      if (input === superAdminPassword) {
        setErrorMsg('');
        setPasswordInput('');
        onSuccess('superadmin');
      } else if (input === adminPassword) {
        setErrorMsg('');
        setPasswordInput('');
        onSuccess('admin');
      } else if (input === guruPassword) {
        setErrorMsg('');
        setPasswordInput('');
        onSuccess('guru');
      } else {
        setErrorMsg('Password / PIN salah! Masukkan PIN Guru, Password Admin, atau Password Super Admin.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl border-4 w-full max-w-md overflow-hidden transform transition-all scale-100 ${
          isAdminOnly ? 'border-indigo-500' : 'border-amber-400'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between border-b-2 text-white ${
            isAdminOnly
              ? 'bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 border-indigo-300'
              : 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-800 border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl shadow-inner font-black ${
                isAdminOnly
                  ? 'bg-indigo-500/40 text-yellow-300 border border-indigo-300/40'
                  : 'bg-yellow-400 text-amber-950'
              }`}
            >
              {isAdminOnly ? (
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              ) : (
                <Lock className="w-6 h-6 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  {modalTitle}
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isAdminOnly
                      ? 'bg-yellow-400 text-indigo-950'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isAdminOnly ? 'Level Admin' : 'Guru / Admin'}
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5 leading-tight">
                {modalDescription}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isAdminOnly ? (
            <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-indigo-950">
                <p className="font-extrabold uppercase tracking-wide">
                  Proteksi Keamanan Database Siswa
                </p>
                <p className="leading-relaxed text-slate-600">
                  Password Guru hanya berhak untuk mengisi absensi. Untuk membuka dan mengedit Database Siswa atau Pengaturan, masukkan <strong className="text-indigo-900 font-bold">Password Admin atau Super Admin</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-950">
                <p className="font-extrabold uppercase tracking-wide">
                  Otorisasi Pengisian Absensi
                </p>
                <p className="leading-relaxed text-amber-900 font-medium">
                  Masukkan <strong className="font-bold">Password / PIN Guru</strong> untuk mengisi absensi, atau <strong className="font-bold">Password Admin / Super Admin</strong> untuk akses penuh.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                {isAdminOnly ? 'Password Level Admin / Super Admin' : 'Password / PIN Guru / Admin / Super Admin'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tampilkan</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={isAdminOnly ? 'Masukkan Password Admin / Super Admin' : 'PIN Guru / Admin / Super Admin'}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-2xl font-mono text-center text-lg tracking-widest font-black bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                  isAdminOnly
                    ? 'border-slate-300 focus:border-indigo-500 text-indigo-950 focus:ring-indigo-500/20'
                    : 'border-slate-300 focus:border-amber-500 text-amber-950 focus:ring-amber-500/20'
                }`}
              />
              <KeyRound
                className={`w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isAdminOnly ? 'text-indigo-400' : 'text-slate-400'
                }`}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100 border-2 border-red-300 text-red-900 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl active:scale-95 text-white font-black text-xs shadow-lg flex items-center gap-2 transition-all ${
                isAdminOnly
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300'
                  : 'bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-yellow-300" />
              {isAdminOnly ? 'Buka Akses Admin' : 'Buka Akses Absensi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

