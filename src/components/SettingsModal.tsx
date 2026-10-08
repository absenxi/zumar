import React, { useState, useEffect, useRef } from 'react';
import { SchoolSettings, Student, AttendanceStatus, UserRole } from '../types';
import { ConfirmationConfig } from './ConfirmationModal';
import {
  Settings,
  X,
  Save,
  Building,
  UserCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  Database,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Navigation,
  Cloud,
  Code,
} from 'lucide-react';

export interface BackupDataPayload {
  version: string;
  exportedAt: string;
  appTitle: string;
  schoolSettings: SchoolSettings;
  students: Student[];
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
}

interface SettingsModalProps {
  settings: SchoolSettings;
  students: Student[];
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: SchoolSettings) => void;
  onRestoreBackup: (payload: {
    schoolSettings: SchoolSettings;
    students: Student[];
    attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  }) => void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
  userRole?: UserRole;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  students,
  attendanceStore,
  isOpen,
  onClose,
  onSave,
  onRestoreBackup,
  onRequestConfirmation,
  userRole,
}) => {
  const [formData, setFormData] = useState<SchoolSettings>({
    ...settings,
    attendancePassword: settings.attendancePassword || '1234',
    adminPassword: settings.adminPassword || 'admin',
    superAdminPassword: settings.superAdminPassword || 'superadmin',
    requirePassword: settings.requirePassword ?? true,
  });
  const [showGuruPassword, setShowGuruPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);

  useEffect(() => {
    setFormData({
      ...settings,
      attendancePassword: settings.attendancePassword || '1234',
      adminPassword: settings.adminPassword || 'admin',
      superAdminPassword: settings.superAdminPassword || 'superadmin',
      requirePassword: settings.requirePassword ?? true,
    });
  }, [settings, isOpen]);

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupDataPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation tidak didukung di browser ini.');
      return;
    }
    setIsDetectingGps(true);
    setGpsStatusMsg('Mendeteksi koordinat GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          schoolLat: lat,
          schoolLng: lng,
        }));
        setGpsStatusMsg(`Koordinat berhasil diambil: ${lat}, ${lng}`);
        setTimeout(() => setGpsStatusMsg(null), 4000);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsStatusMsg(`Gagal mendeteksi GPS: ${err.message}`);
        setTimeout(() => setGpsStatusMsg(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      superAdminPassword:
        formData.superAdminPassword || settings.superAdminPassword || 'superadmin',
    });
    onClose();
  };

  // 1. Download Backup
  const handleExportBackup = () => {
    const backupPayload: BackupDataPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appTitle: 'Absensi Siswa SDIT/SMK',
      schoolSettings: formData,
      students,
      attendanceStore,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(backupPayload, null, 2));

    const dateFormatted = new Date().toISOString().slice(0, 10);
    const fileName = `backup_absensi_kelas_${(formData.className || 'Kelas').replace(/\s+/g, '_')}_${dateFormatted}.json`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setRestoreSuccess('File backup .json berhasil diunduh!');
    setTimeout(() => setRestoreSuccess(null), 4000);
  };

  // 2. Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setParsedBackup(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate structure
        if (
          !parsed.students ||
          !Array.isArray(parsed.students) ||
          !parsed.schoolSettings ||
          typeof parsed.schoolSettings !== 'object'
        ) {
          throw new Error('Format file backup .json tidak valid!');
        }

        setParsedBackup({
          version: parsed.version || '1.0.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          appTitle: parsed.appTitle || 'Absensi Siswa',
          schoolSettings: parsed.schoolSettings,
          students: parsed.students,
          attendanceStore: parsed.attendanceStore || {},
        });
      } catch (err: any) {
        setRestoreError(err.message || 'Gagal membaca file .json backup.');
      }
    };
    reader.readAsText(file);
  };

  // 3. Confirm and Execute Restore
  const handleConfirmRestore = () => {
    if (!parsedBackup) return;

    const performRestore = () => {
      onRestoreBackup({
        schoolSettings: parsedBackup.schoolSettings,
        students: parsedBackup.students,
        attendanceStore: parsedBackup.attendanceStore,
      });

      setFormData(parsedBackup.schoolSettings);
      setRestoreSuccess(
        `Berhasil memulihkan ${parsedBackup.students.length} data siswa dan rekap absensi!`
      );
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        setRestoreSuccess(null);
      }, 5000);
    };

    if (onRequestConfirmation) {
      onRequestConfirmation({
        title: 'Konfirmasi Restore Database Sistem',
        message: (
          <div>
            <p className="font-bold text-amber-900 text-xs sm:text-sm">
              Perhatian: Timpa Seluruh Data Sistem
            </p>
            <p className="text-xs text-slate-700 mt-1">
              Apakah Anda yakin ingin memulihkan data dari file backup{' '}
              <strong className="text-slate-950">
                {parsedBackup.schoolSettings.schoolName} ({parsedBackup.schoolSettings.className})
              </strong>?
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Sebanyak <strong>{parsedBackup.students.length} siswa</strong> dan seluruh riwayat absensi bulanan saat ini akan digantikan dengan data cadangan ini.
            </p>
          </div>
        ),
        confirmText: 'Ya, Restore & Timpa Data',
        cancelText: 'Batal',
        variant: 'warning',
        icon: 'database',
        onConfirm: performRestore,
      });
    } else {
      performRestore();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-5 flex items-center justify-between border-b-2 border-yellow-400 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400 text-blue-950 rounded-xl font-black">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">
                Pengaturan Aplikasi & Backup Data
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Ubah identitas sekolah, password, serta ekspor & impor seluruh database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6 text-xs overflow-y-auto grow">
          {/* Cloud Synchronization Status Banner */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-sky-950">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-xs text-sky-950 flex items-center gap-1.5">
                  Database Supabase PostgreSQL Terintegrasi
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p className="text-[11px] text-sky-800">
                  Seluruh pengaturan, identitas sekolah, password, dan koordinat GPS disimpan langsung ke Cloud secara real-time.
                </p>
              </div>
            </div>
          </div>
          {/* Section 1: School Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm border-b pb-1">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Identitas Sekolah & Kelas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Yayasan / Lembaga
                </label>
                <input
                  type="text"
                  required
                  value={formData.foundationName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, foundationName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kelas (e.g. TKJ 3)
                </label>
                <input
                  type="text"
                  required
                  value={formData.className || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, className: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-black text-blue-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formData.academicYear || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Signatures & Pejabat */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm border-b pb-1">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Pejabat & Tanda Tangan (Format Laporan Poster)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={formData.principalName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, principalName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={formData.principalNip || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, principalNip: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Guru / Wali Kelas
                </label>
                <input
                  type="text"
                  required
                  value={formData.teacherName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NIP Guru / Wali Kelas
                </label>
                <input
                  type="text"
                  value={formData.teacherNip || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherNip: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Nama Ketua Jurusan
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ⚡ Sinkron Tanda Tangan
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.headOfDepartment || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, headOfDepartment: e.target.value })
                  }
                  placeholder="e.g. Nama Ketua Jurusan"
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NIP Ketua Jurusan
                </label>
                <input
                  type="text"
                  value={formData.headOfDepartmentNip || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, headOfDepartmentNip: e.target.value })
                  }
                  placeholder="NIP atau '-' jika belum ada"
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Nama Ketua Kelas (Sinkron ke Semua Bulan & Tanda Tangan)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ⚡ Sinkron Tanda Tangan
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.classLeader || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, classLeader: e.target.value })
                  }
                  placeholder="Nama Ketua Kelas"
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lokasi Kota/Daerah (e.g. Tangsi Lama)
                </label>
                <input
                  type="text"
                  required
                  value={formData.locationName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, locationName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Laporan Signature (e.g. 13 Juli 2026)
                </label>
                <input
                  type="text"
                  required
                  value={formData.signatureDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, signatureDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section: GPS Location & Presensi Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
              <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Titik Koordinat Sekolah & Radius Presensi GPS</span>
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isDetectingGps}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 transition-all cursor-pointer"
                title="Deteksi koordinat GPS perangkat saat ini"
              >
                <Navigation className={`w-3 h-3 text-rose-600 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? 'Mendeteksi...' : 'Ambil GPS Sekarang'}</span>
              </button>
            </div>

            {gpsStatusMsg && (
              <div className="text-[11px] font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                {gpsStatusMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Latitude Sekolah
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.schoolLat ?? -6.3125}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolLat: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="-6.312500"
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Longitude Sekolah
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.schoolLng ?? 106.7483}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolLng: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="106.748300"
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Radius Toleransi Presensi (Meter)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  required
                  value={formData.allowedRadiusMeters ?? 200}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowedRadiusMeters: Math.max(10, parseInt(e.target.value, 10) || 200),
                    })
                  }
                  placeholder="200"
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Password Protection & Multi-Level Security */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm border-b pb-1">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Keamanan Multi-Level: Password Guru & Admin</span>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <div className="font-black text-slate-900 text-xs">
                    Wajibkan Proteksi Password Sistem
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Membagi hak akses: Guru hanya dapat mengisi absensi, sedangkan Admin mengelola Database Siswa & Pengaturan.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requirePassword ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, requirePassword: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {formData.requirePassword !== false && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: PIN Guru (Hanya Absensi) */}
                  <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-amber-200 text-amber-900 rounded-lg">
                          <KeyRound className="w-3.5 h-3.5" />
                        </span>
                        <label className="font-black text-amber-950 text-xs uppercase tracking-wide">
                          Level 1: PIN / Password Guru
                        </label>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                        Hanya Absen
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={showGuruPassword ? 'text' : 'password'}
                        required
                        value={formData.attendancePassword || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, attendancePassword: e.target.value })
                        }
                        placeholder="Default: 1234"
                        className="w-full pl-9 pr-10 py-2 border-2 border-amber-300 rounded-xl font-mono font-black text-amber-950 bg-white focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                      <button
                        type="button"
                        onClick={() => setShowGuruPassword(!showGuruPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showGuruPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                      Digunakan guru untuk mengisi absensi harian. <strong className="text-red-700">TIDAK BISA</strong> membuka atau mengedit Database Siswa.
                    </p>
                  </div>

                  {/* Card 2: Password Admin (Akses Penuh) */}
                  <div className="bg-indigo-50/90 border-2 border-indigo-300 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-indigo-200 text-indigo-900 rounded-lg">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                        <label className="font-black text-indigo-950 text-xs uppercase tracking-wide">
                          Level 2: Password Admin
                        </label>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-200 text-indigo-900 rounded-full">
                        Akses Penuh
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={formData.adminPassword || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, adminPassword: e.target.value })
                        }
                        placeholder="Default: admin"
                        className="w-full pl-9 pr-10 py-2 border-2 border-indigo-300 rounded-xl font-mono font-black text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-indigo-800 font-medium leading-relaxed">
                      Digunakan Admin / Kepala Sekolah untuk membuka <strong>Database Siswa</strong>, mengedit siswa, serta mengubah Pengaturan Sistem.
                    </p>
                  </div>

                  {/* Card 3: Password Super Admin (Disembunyikan ketika login sebagai admin Level 2) */}
                  {userRole !== 'admin' && (
                    <div className="bg-purple-50/90 border-2 border-purple-300 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-purple-200 text-purple-900 rounded-lg">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                          <label className="font-black text-purple-950 text-xs uppercase tracking-wide">
                            Level 3: Password Super Admin
                          </label>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-200 text-purple-900 rounded-full">
                          Super User
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type={showSuperAdminPassword ? 'text' : 'password'}
                          required
                          value={formData.superAdminPassword || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, superAdminPassword: e.target.value })
                          }
                          placeholder="Default: superadmin"
                          className="w-full pl-9 pr-10 py-2 border-2 border-purple-300 rounded-xl font-mono font-black text-purple-950 bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" />
                        <button
                          type="button"
                          onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSuperAdminPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-purple-800 font-medium leading-relaxed">
                        Akses hierarki tertinggi. Memiliki kewenangan penuh membuka semua proteksi, reset database, dan backup master sistem.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Backup & Restore Data System */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm border-b pb-1">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Backup & Restore Seluruh Data Sistem</span>
            </div>

            {restoreSuccess && (
              <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-3 rounded-2xl flex items-center gap-2 font-bold text-xs animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{restoreSuccess}</span>
              </div>
            )}

            {restoreError && (
              <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-3 rounded-2xl flex items-center gap-2 font-bold text-xs animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Backup / Export */}
              <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-black text-indigo-950 text-sm">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Backup Data (Ekspor)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">
                    Simpan cadangan {students.length} siswa, pengaturan, dan seluruh rekap bulanan ke file JSON.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-black py-2.5 px-4 rounded-xl shadow border border-indigo-400 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FileJson className="w-4 h-4 text-yellow-300" />
                  <span>Unduh Backup (.json)</span>
                </button>
              </div>

              {/* Card 2: Restore / Import */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Restore Data (Impor)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">
                    Unggah file backup JSON untuk memulihkan seluruh data dan rekap absensi.
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-yellow-300" />
                    <span>Pilih File Backup (.json)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parsed Backup Confirmation Preview Card */}
            {parsedBackup && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 font-black text-blue-950 text-sm">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>Konfirmasi Restore Data</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1 bg-white p-3 rounded-xl border border-yellow-300 font-medium">
                  <div>
                    Sekolah/Kelas: <span className="font-bold">{parsedBackup.schoolSettings.schoolName} ({parsedBackup.schoolSettings.className})</span>
                  </div>
                  <div>
                    Jumlah Siswa: <span className="font-bold text-blue-900">{parsedBackup.students.length} Siswa</span>
                  </div>
                  <div>
                    Jumlah Bulan Rekap: <span className="font-bold text-emerald-800">{Object.keys(parsedBackup.attendanceStore || {}).length} Bulan</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t">
                    Waktu Backup: {new Date(parsedBackup.exportedAt).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedBackup(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Proses Restore & Timpa Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons & Creator info */}
          <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>created by <strong className="text-slate-800 font-bold">DEDI SAPUTRA, ST</strong></span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

