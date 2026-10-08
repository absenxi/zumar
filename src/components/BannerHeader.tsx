import React from 'react';
import { SchoolSettings, UserRole } from '../types';
import {
  BookOpen,
  Clock,
  Globe,
  Sparkles,
  Flag,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';

interface BannerHeaderProps {
  settings: SchoolSettings;
  selectedMonth: string;
  selectedYear: number;
  userRole?: UserRole;
  isAdminUnlocked?: boolean;
  onLogout?: () => void;
  isDashboardActive?: boolean;
  onOpenDashboard?: () => void;
}

export const BannerHeader: React.FC<BannerHeaderProps> = ({
  settings,
  selectedMonth,
  selectedYear,
  userRole,
  isAdminUnlocked = false,
  onLogout,
  isDashboardActive = false,
  onOpenDashboard,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-green-400 rounded-2xl shadow-xl border-4 border-yellow-300 p-4 sm:p-6 mb-6 print:hidden">
      {/* Sun & Cloud Background Elements */}
      <div className="absolute top-2 left-6 w-16 h-16 bg-yellow-300/30 rounded-full blur-xl animate-pulse" />
      <div className="absolute top-4 right-12 w-24 h-24 bg-white/40 rounded-full blur-xl" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: School Building Motif & Flag */}
        <div className="hidden lg:flex items-center gap-3 bg-white/85 backdrop-blur-sm p-3 rounded-2xl border-2 border-green-500 shadow-md">
          <div className="relative flex flex-col items-center justify-center bg-emerald-600 text-white p-3 rounded-xl shadow-inner">
            <Flag className="w-6 h-6 text-red-500 animate-bounce" />
            <GraduationCap className="w-8 h-8 text-yellow-300 mt-1" />
            <span className="text-[10px] font-black tracking-widest text-emerald-100 uppercase mt-1">
              SMKS
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
              {settings.foundationName}
            </div>
            <div className="text-sm font-black text-emerald-900 drop-shadow-sm">
              {settings.schoolName}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              Akr. A • Teknik Jaringan Komputer & Telekomunikasi
            </div>
          </div>
        </div>

        {/* Center Banner Title */}
        <div className="flex-1 text-center">
          {/* Main Title Badge */}
          <div className="inline-block relative">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-yellow-300 tracking-wider uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.7)] stroke-black font-sans my-1">
              ABSENSI SISWA
            </h1>
            <div className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-widest uppercase drop-shadow-[0_3px_3px_rgba(0,0,0,0.8)]">
              KELAS {settings.className}
            </div>
          </div>

          {/* Subtitle Pill */}
          <div className="mt-2 flex justify-center items-center gap-2 flex-wrap">
            <span className="bg-blue-700 text-white px-5 py-1 rounded-full font-black text-base sm:text-xl shadow-lg border-2 border-yellow-300 tracking-wide inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              {settings.schoolName}
            </span>
          </div>

          {/* Academic Year Ribbon */}
          <div className="mt-2 inline-block bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-extrabold text-xs sm:text-sm px-6 py-1 rounded-md shadow-md border border-red-700 tracking-wider uppercase">
            TAHUN PELAJARAN {settings.academicYear}
          </div>
        </div>

        {/* Right Side: School Emblem & Globe/Clock Motif */}
        <div className="hidden md:flex items-center gap-3 bg-white/85 backdrop-blur-sm p-3 rounded-2xl border-2 border-yellow-400 shadow-md">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border-2 border-emerald-700 shadow-md">
              <BookOpen className="w-7 h-7 text-emerald-900" />
            </div>
            <span className="text-[10px] font-black text-emerald-800 uppercase mt-1">
              TJKT
            </span>
          </div>
          <div className="flex flex-col gap-1 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1 text-blue-700">
              <Globe className="w-4 h-4" />
              <span>Vocational</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700">
              <Clock className="w-4 h-4" />
              <span>{selectedMonth} {selectedYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Selector Bar inside Header Banner */}
      <div className="relative z-10 mt-5 pt-3 border-t-2 border-white/50 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-xl shadow-md border border-blue-400">
            <span className="text-yellow-300 font-extrabold">KELAS :</span>
            <span className="bg-white text-blue-900 font-black px-3 py-0.5 rounded-lg border border-blue-300 text-base">
              {settings.className}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-pink-700 text-white px-4 py-2 rounded-xl shadow-md border border-pink-400">
            <span className="text-yellow-200 font-extrabold">BULAN :</span>
            <span className="bg-white text-pink-800 font-black px-3 py-0.5 rounded-lg border border-pink-300 text-base">
              {selectedMonth.toUpperCase()} {selectedYear}
            </span>
          </div>
        </div>

        {/* User Role Badge & Logout Button */}
        {userRole && userRole !== 'guest' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-md text-xs font-black border ${
                userRole === 'superadmin'
                  ? 'bg-purple-950 text-yellow-300 border-purple-400 ring-2 ring-purple-400/50'
                  : userRole === 'admin'
                  ? 'bg-indigo-950 text-yellow-300 border-indigo-400 ring-2 ring-indigo-400/40'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/30'
              }`}
            >
              {userRole === 'superadmin' ? (
                <ShieldAlert className="w-4 h-4 text-yellow-300" />
              ) : userRole === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-yellow-300" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-300" />
              )}
              <span>
                {userRole === 'superadmin'
                  ? 'SUPER ADMIN'
                  : userRole === 'admin'
                  ? 'ADMIN'
                  : 'GURU'}
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md font-bold text-white ml-0.5">
                Aktif
              </span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-md border border-red-300 transition-all cursor-pointer"
                title="Keluar / Logout dari sesi login"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
