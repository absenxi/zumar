import React, { useState, useEffect } from 'react';
import {
  SchoolSettings,
  Student,
  Teacher,
  Subject,
  AttendanceStatus,
  TeacherAgendaEntry,
  UserRole,
} from '../types';
import { ConfirmationConfig } from './ConfirmationModal';
import {
  syncEntireDatabaseToCloud,
  getSupabaseConnectionStatus as getFirestoreConnectionStatus,
} from '../lib/supabase';
import { getWhatsAppTransmissionLogs } from '../utils/whatsappService';
import {
  Settings,
  Save,
  Building,
  UserCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Code,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Database,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  FileJson,
  Server,
  CheckCheck,
  HardDrive,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Clock,
} from 'lucide-react';

interface AppSettingsAndBackupProps {
  schoolSettings: SchoolSettings;
  students?: Student[];
  teachers?: Teacher[];
  subjects?: Subject[];
  attendanceStore?: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
  onSaveSettings: (newSettings: SchoolSettings) => void;
  onRestoreBackup?: (payload: {
    schoolSettings: SchoolSettings;
    students: Student[];
    teachers?: Teacher[];
    subjects?: Subject[];
    attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
    teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
    whatsappLogs?: any[];
    homeroomReports?: Record<string, any>;
  }) => Promise<any> | void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
  userRole?: UserRole;
}

export const AppSettingsAndBackup: React.FC<AppSettingsAndBackupProps> = ({
  schoolSettings,
  students = [],
  teachers = [],
  subjects = [],
  attendanceStore = {},
  teacherAgendaStore = {},
  onSaveSettings,
  onRestoreBackup,
  onRequestConfirmation,
  userRole,
}) => {
  const initialTeacher = schoolSettings.homeroomTeacher || schoolSettings.teacherName || '';
  const initialNip = schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '';

  const [formData, setFormData] = useState<SchoolSettings>({
    ...schoolSettings,
    homeroomTeacher: initialTeacher,
    teacherName: initialTeacher,
    homeroomTeacherNip: initialNip,
    teacherNip: initialNip,
    attendancePassword: schoolSettings.attendancePassword || '1234',
    adminPassword: schoolSettings.adminPassword || 'admin',
    superAdminPassword: schoolSettings.superAdminPassword || 'superadmin',
    requirePassword: schoolSettings.requirePassword ?? true,
  });

  const [showGuruPassword, setShowGuruPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Cloud Database Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusStep, setSyncStatusStep] = useState<string | null>(null);
  const [syncResultDetails, setSyncResultDetails] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    stats?: {
      students: number;
      teachers: number;
      subjects: number;
      attendanceMonths: number;
      teacherAgendaMonths: number;
      whatsappLogsCount?: number;
      databaseId?: string;
    };
  } | null>(null);

  // Firestore Connection State
  const [connectionInfo, setConnectionInfo] = useState<{
    status: 'checking' | 'connected' | 'error';
    projectId: string;
    databaseId?: string;
    error?: string;
  }>({
    status: 'checking',
    projectId: 'ai-studio-remixabsensismks-1b8821b7-8637-4e07-9edd-5f03084d1e0b',
    databaseId: '(default)',
  });

  // Restore State
  const [restoreMessage, setRestoreMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Check connection on mount
  useEffect(() => {
    let mounted = true;
    getFirestoreConnectionStatus().then((res) => {
      if (!mounted) return;
      if (res.connected) {
        setConnectionInfo({
          status: 'connected',
          projectId: res.projectId,
          databaseId: res.databaseId,
        });
      } else {
        setConnectionInfo({
          status: 'error',
          projectId: res.projectId,
          error: res.error,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const teacher = schoolSettings.homeroomTeacher || schoolSettings.teacherName || '';
    const nip = schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '';
    setFormData({
      ...schoolSettings,
      homeroomTeacher: teacher,
      teacherName: teacher,
      homeroomTeacherNip: nip,
      teacherNip: nip,
      attendancePassword: schoolSettings.attendancePassword || '1234',
      adminPassword: schoolSettings.adminPassword || 'admin',
      superAdminPassword: schoolSettings.superAdminPassword || 'superadmin',
      requirePassword: schoolSettings.requirePassword ?? true,
    });
  }, [schoolSettings]);

  // Form Submit for Settings
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      ...formData,
      teacherName: formData.homeroomTeacher || formData.teacherName || '',
      homeroomTeacher: formData.homeroomTeacher || formData.teacherName || '',
      teacherNip: formData.homeroomTeacherNip || formData.teacherNip || '',
      homeroomTeacherNip: formData.homeroomTeacherNip || formData.teacherNip || '',
      attendancePassword: formData.attendancePassword || '1234',
      adminPassword: formData.adminPassword || 'admin',
      superAdminPassword:
        formData.superAdminPassword || schoolSettings.superAdminPassword || 'superadmin',
    };
    onSaveSettings(updated);
    setSaveSuccessToast('Pengaturan sekolah & sistem berhasil disimpan dan disinkronkan!');
    setTimeout(() => setSaveSuccessToast(null), 4000);
  };

  // Comprehensive Database Sync / Update ke Cloud Supabase
  const handleTriggerSyncEntireDatabase = async () => {
    setIsSyncingCloud(true);
    setSyncResultDetails(null);
    setSyncStatusStep('Menghubungkan ke Server Cloud Supabase...');

    try {
      setSyncStatusStep('1/5 Menyinkronkan Pengaturan Sekolah & Keamanan...');
      await new Promise((r) => setTimeout(r, 200));

      setSyncStatusStep(`2/5 Menyinkronkan Database Siswa (${students.length} data)...`);
      await new Promise((r) => setTimeout(r, 250));

      setSyncStatusStep(`3/5 Menyinkronkan Database Guru (${teachers.length}) & Mapel (${subjects.length})...`);
      await new Promise((r) => setTimeout(r, 250));

      const attendanceMonthCount = Object.keys(attendanceStore).length;
      setSyncStatusStep(`4/6 Menyinkronkan Rekap Absensi (${attendanceMonthCount} bulan)...`);
      await new Promise((r) => setTimeout(r, 200));

      const agendaMonthCount = Object.keys(teacherAgendaStore).length;
      setSyncStatusStep(`5/6 Menyinkronkan Agenda Kehadiran Guru (${agendaMonthCount} bulan)...`);
      await new Promise((r) => setTimeout(r, 200));

      const localLogs = getWhatsAppTransmissionLogs();
      setSyncStatusStep(`6/6 Menyinkronkan Audit Log WhatsApp (${localLogs.length} pesan)...`);

      const res = await syncEntireDatabaseToCloud({
        schoolSettings: formData,
        students,
        teachers,
        subjects,
        attendanceStore,
        teacherAgendaStore,
        whatsappLogs: localLogs,
      });

      if (res.success) {
        setSyncResultDetails({
          success: true,
          message: res.message || 'Seluruh database berhasil diperbarui dan disinkronkan ke Supabase Cloud!',
          timestamp: new Date().toLocaleTimeString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          stats: {
            students: res.details.students,
            teachers: res.details.teachers,
            subjects: res.details.subjects,
            attendanceMonths: res.details.attendanceMonths,
            teacherAgendaMonths: res.details.teacherAgendaMonths,
            whatsappLogsCount: res.details.whatsappLogsCount,
            databaseId: res.details.databaseId,
          },
        });
        setSaveSuccessToast('Database Supabase Cloud Berhasil Diperbarui 100%!');
        setTimeout(() => setSaveSuccessToast(null), 4000);
      } else {
        setSyncResultDetails({
          success: false,
          message: res.message || 'Gagal memperbarui database ke Supabase.',
        });
      }
    } catch (err: any) {
      setSyncResultDetails({
        success: false,
        message: err?.message || 'Terjadi kesalahan saat sinkronisasi database.',
      });
    } finally {
      setIsSyncingCloud(false);
      setSyncStatusStep(null);
    }
  };

  // Export Full JSON Backup
  const handleDownloadFullBackup = () => {
    try {
      // Gather any homeroom reports saved locally
      const homeroomReports: Record<string, any> = {};
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('homeroom_report_')) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const mKey = k.replace('homeroom_report_', '');
                homeroomReports[mKey] = JSON.parse(raw);
              }
            }
          }
        } catch (err) {
          console.warn('Notice: Gagal mengumpulkan beberapa laporan wali kelas:', err);
        }
      }

      const localLogs = getWhatsAppTransmissionLogs();

      const backupPayload = {
        metadata: {
          appName: 'SMKS Nusantara 1 Ciputat - Sistem Absensi & Manajemen Akademik',
          appVersion: '4.0',
          exportedAt: new Date().toISOString(),
          exportedDateFormatted: new Date().toLocaleString('id-ID', {
            dateStyle: 'full',
            timeStyle: 'medium',
          }),
          creator: formData.teacherName || formData.homeroomTeacher || 'Administrator',
          schoolName: formData.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
          className: formData.className || 'X TJKT 3',
          academicYear: formData.academicYear || '2026/2027',
          counts: {
            students: students.length,
            teachers: teachers.length,
            subjects: subjects.length,
            attendanceMonths: Object.keys(attendanceStore).length,
            teacherAgendaMonths: Object.keys(teacherAgendaStore).length,
            whatsappLogs: localLogs.length,
            homeroomReports: Object.keys(homeroomReports).length,
          },
        },
        schoolSettings: formData,
        students,
        teachers,
        subjects,
        attendanceStore,
        teacherAgendaStore,
        homeroomReports,
        whatsappLogs: localLogs,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      const safeClassName = (formData.className || 'Kelas').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.download = `backup_database_smks_nusantara1_${safeClassName}_${dateStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      setTimeout(() => {
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(blobUrl);
      }, 300);

      setSaveSuccessToast('File cadangan database JSON lengkap berhasil diunduh ke komputer Anda!');
      setTimeout(() => setSaveSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Gagal membuat file cadangan: ${err?.message || 'Error tidak terduga'}`);
    }
  };

  // Restore from JSON File
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileReader = new FileReader();

    fileReader.readAsText(file, 'UTF-8');
    fileReader.onload = async (event) => {
      try {
        const rawContent = event.target?.result as string;
        if (!rawContent || !rawContent.trim()) {
          throw new Error('File JSON yang dipilih kosong.');
        }

        let parsed: any;
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          throw new Error('Format file tidak valid. Pastikan file berformat .json yang sah.');
        }

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Struktur isi file JSON tidak valid.');
        }

        // 1. Settings extraction
        const validSettings = parsed.schoolSettings || parsed.settings;

        // 2. Students extraction
        const validStudents = Array.isArray(parsed.students) ? parsed.students : undefined;

        // 3. Teachers extraction
        const validTeachers = Array.isArray(parsed.teachers) ? parsed.teachers : undefined;

        // 4. Subjects extraction
        const validSubjects = Array.isArray(parsed.subjects) ? parsed.subjects : undefined;

        // 5. Attendance Store extraction
        const validAttendance =
          parsed.attendanceStore && typeof parsed.attendanceStore === 'object' && !Array.isArray(parsed.attendanceStore)
            ? parsed.attendanceStore
            : parsed.attendance && typeof parsed.attendance === 'object' && !Array.isArray(parsed.attendance)
            ? parsed.attendance
            : undefined;

        // 6. Teacher Agenda extraction (supports store object or flat list)
        let validAgendaStore: Record<string, TeacherAgendaEntry[]> | undefined = undefined;
        if (
          parsed.teacherAgendaStore &&
          typeof parsed.teacherAgendaStore === 'object' &&
          !Array.isArray(parsed.teacherAgendaStore)
        ) {
          validAgendaStore = parsed.teacherAgendaStore;
        } else if (
          parsed.teacher_agenda &&
          typeof parsed.teacher_agenda === 'object' &&
          !Array.isArray(parsed.teacher_agenda)
        ) {
          validAgendaStore = parsed.teacher_agenda;
        } else if (
          Array.isArray(parsed.teacherAgendaList) ||
          Array.isArray(parsed.teacherAgendaStore) ||
          Array.isArray(parsed.teacher_agenda)
        ) {
          const list: TeacherAgendaEntry[] =
            parsed.teacherAgendaList || parsed.teacherAgendaStore || parsed.teacher_agenda;
          validAgendaStore = {};
          list.forEach((entry) => {
            if (entry && entry.date) {
              const parts = entry.date.split('-');
              if (parts.length === 3) {
                const mKey = `${parts[0]}_${parseInt(parts[1], 10) - 1}`;
                if (!validAgendaStore![mKey]) validAgendaStore![mKey] = [];
                validAgendaStore![mKey].push(entry);
              }
            }
          });
        }

        // 7. WhatsApp Logs extraction
        const validLogs =
          Array.isArray(parsed.whatsappLogs)
            ? parsed.whatsappLogs
            : Array.isArray(parsed.whatsapp_logs)
            ? parsed.whatsapp_logs
            : undefined;

        // 8. Homeroom Reports extraction
        const validReports =
          parsed.homeroomReports && typeof parsed.homeroomReports === 'object' ? parsed.homeroomReports : undefined;

        // Validation check
        if (!validSettings && !validStudents && !validTeachers && !validSubjects && !validAttendance && !validAgendaStore) {
          throw new Error('File JSON ini tidak berisi data yang dikenali dari aplikasi Absensi SMKS Nusantara 1.');
        }

        const studentCount = validStudents ? validStudents.length : students.length;
        const teacherCount = validTeachers ? validTeachers.length : teachers.length;
        const subjectCount = validSubjects ? validSubjects.length : subjects.length;
        const attMonths = validAttendance ? Object.keys(validAttendance).length : Object.keys(attendanceStore).length;
        const agendaMonths = validAgendaStore ? Object.keys(validAgendaStore).length : Object.keys(teacherAgendaStore).length;
        const exportDate = parsed.metadata?.exportedDateFormatted || parsed.metadata?.exportedAt || null;

        const doRestore = async () => {
          setIsSyncingCloud(true);
          setRestoreMessage({
            type: 'success',
            text: 'Menerapkan data cadangan dan menyinkronkan ke Supabase Cloud...',
          });

          try {
            if (onRestoreBackup) {
              const res = await onRestoreBackup({
                schoolSettings: validSettings || formData,
                students: validStudents || students,
                teachers: validTeachers || teachers,
                subjects: validSubjects || subjects,
                attendanceStore: validAttendance || attendanceStore,
                teacherAgendaStore: validAgendaStore || teacherAgendaStore,
                whatsappLogs: validLogs,
                homeroomReports: validReports,
              });

              if (res && res.message) {
                setRestoreMessage({
                  type: 'success',
                  text: res.message,
                });
              } else {
                setRestoreMessage({
                  type: 'success',
                  text: `Data cadangan berhasil dipulihkan: ${studentCount} siswa, ${teacherCount} guru, ${subjectCount} mapel, ${attMonths} bulan absensi, dan ${agendaMonths} bulan agenda guru.`,
                });
              }
            }

            if (validSettings) {
              setFormData((prev) => ({
                ...prev,
                ...validSettings,
              }));
            }

            setSaveSuccessToast('Pemulihan database (Restore) berhasil 100%!');
            setTimeout(() => setSaveSuccessToast(null), 5000);
          } catch (err: any) {
            setRestoreMessage({
              type: 'error',
              text: `Gagal menyelesaikan pemulihan: ${err?.message || 'Error tidak terduga'}`,
            });
          } finally {
            setIsSyncingCloud(false);
            setTimeout(() => setRestoreMessage(null), 8000);
          }
        };

        if (onRequestConfirmation) {
          onRequestConfirmation({
            title: 'Konfirmasi Pemulihan Database (Restore)',
            message: (
              <div className="space-y-3 text-left">
                <p className="text-xs text-slate-700 font-medium">
                  File cadangan <strong>"{file.name}"</strong> siap dipulihkan. Rincian data yang akan dimasukkan:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sekolah & Kelas:</span>
                    <span className="font-bold text-slate-900">
                      {validSettings?.schoolName || formData.schoolName} ({validSettings?.className || formData.className})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Master Siswa:</span>
                    <span className="font-bold text-blue-700">{studentCount} Siswa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Database Guru:</span>
                    <span className="font-bold text-purple-700">{teacherCount} Guru</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mata Pelajaran:</span>
                    <span className="font-bold text-emerald-700">{subjectCount} Mapel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rekap Absensi Siswa:</span>
                    <span className="font-bold text-amber-700">{attMonths} Bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Agenda Kehadiran Guru:</span>
                    <span className="font-bold text-teal-700">{agendaMonths} Bulan</span>
                  </div>
                  {exportDate && (
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-400">Tanggal Backup Asli:</span>
                      <span className="font-medium text-slate-600">{exportDate}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold leading-relaxed">
                  ⚠️ Peringatan: Proses ini akan menimpa pengaturan, absensi, dan master data saat ini dengan data dari file cadangan, lalu menyinkronkannya ke database Supabase Cloud.
                </div>
              </div>
            ),
            confirmText: 'Ya, Pulihkan Sekarang',
            cancelText: 'Batal',
            variant: 'warning',
            icon: 'database',
            onConfirm: () => {
              doRestore();
            },
          });
        } else {
          if (
            window.confirm(
              `Pulihkan data dari file "${file.name}"? Data saat ini akan digantikan dengan data cadangan ini.`
            )
          ) {
            doRestore();
          }
        }
      } catch (err: any) {
        setRestoreMessage({
          type: 'error',
          text: `Gagal membaca file cadangan: ${err?.message || 'Format tidak valid'}`,
        });
        setTimeout(() => setRestoreMessage(null), 6000);
      } finally {
        e.target.value = '';
      }
    };
  };

  const totalAttendanceMonths = Object.keys(attendanceStore).length;
  const totalTeacherAgendaMonths = Object.keys(teacherAgendaStore).length;

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Berhasil Simpan */}
      {saveSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-6 h-6 text-yellow-300 shrink-0" />
          <div>
            <p className="font-extrabold text-sm">Pembaruan Berhasil</p>
            <p className="text-xs text-emerald-100">{saveSuccessToast}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: PUSAT DATABASE CLOUD & SINKRONISASI FIRESTORE */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-blue-200 overflow-hidden">
        {/* Banner Header Database */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-950 text-white p-6 border-b-2 border-yellow-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-yellow-400 text-blue-950 rounded-2xl shadow-md font-black">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-wider text-yellow-300">
                  Pusat Pembaruan Database Cloud
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-xs">
                  Supabase Cloud DB
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                Kelola sinkronisasi langsung ke Supabase PostgreSQL, cadangkan seluruh data, dan pantau status koneksi server.
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-xs">
            <Server className="w-4 h-4 text-cyan-300" />
            <div>
              <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Status Koneksi</div>
              <div className="flex items-center gap-1.5 font-black">
                {connectionInfo.status === 'connected' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">Terhubung ke Cloud</span>
                  </>
                ) : connectionInfo.status === 'checking' ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-300 animate-spin" />
                    <span className="text-amber-300">Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-rose-300">Offline / Lokal</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Database Control Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Stat 1: Siswa */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-700">
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded-md">
                  /students
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-blue-950">{students.length}</div>
                <div className="text-xs font-bold text-blue-800">Master Siswa</div>
              </div>
            </div>

            {/* Stat 2: Guru */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-700">
                <GraduationCap className="w-5 h-5" />
                <span className="text-[10px] font-black px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-md">
                  /teachers
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-950">{teachers.length}</div>
                <div className="text-xs font-bold text-purple-800">Database Guru</div>
              </div>
            </div>

            {/* Stat 3: Mata Pelajaran */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700">
                <BookOpen className="w-5 h-5" />
                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-md">
                  /subjects
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-950">{subjects.length}</div>
                <div className="text-xs font-bold text-emerald-800">Mata Pelajaran</div>
              </div>
            </div>

            {/* Stat 4: Rekap Absensi */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-700">
                <CalendarDays className="w-5 h-5" />
                <span className="text-[10px] font-black px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                  /attendance
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-950">{totalAttendanceMonths}</div>
                <div className="text-xs font-bold text-amber-800">Bulan Absensi</div>
              </div>
            </div>

            {/* Stat 5: Agenda Guru */}
            <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-teal-700">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-black px-2 py-0.5 bg-teal-200/80 text-teal-900 rounded-md">
                  /teacher_agenda
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-teal-950">{totalTeacherAgendaMonths}</div>
                <div className="text-xs font-bold text-teal-800">Bulan Agenda Guru</div>
              </div>
            </div>
          </div>

          {/* Action Hub Cards: Update DB, Backup JSON, Restore JSON */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Action 1: Update Database Cloud (Utama) */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border-2 border-yellow-400 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-yellow-300 font-black text-sm uppercase tracking-wide">
                  <Cloud className="w-5 h-5" />
                  <span>Update Database Cloud</span>
                </div>
                <p className="text-xs text-blue-100 font-medium mt-1.5 leading-relaxed">
                  Unggah & sinkronkan seluruh data terbaru (Identitas Sekolah, Siswa, Guru, Mapel, Rekap Absensi, dan Jurnal Guru) ke Supabase Database.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerSyncEntireDatabase}
                disabled={isSyncingCloud}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
                  isSyncingCloud
                    ? 'bg-amber-600 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-blue-950 hover:from-yellow-300 hover:to-amber-300 active:scale-95'
                }`}
              >
                {isSyncingCloud ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menyinkronkan Database...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-950" />
                    <span>Update Database Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Action 2: Backup Database JSON */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <Download className="w-5 h-5 text-blue-600" />
                  <span>Unduh Cadangan (Backup)</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  Simpan cadangan lengkap database ke file <strong>.json</strong> di komputer Anda. Aman disimpan sebagai arsip offline sekolah.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">✓ {students.length} Siswa</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md">✓ {teachers.length} Guru</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">✓ {subjects.length} Mapel</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">✓ {totalAttendanceMonths} Bln Absensi</span>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded-md">✓ {totalTeacherAgendaMonths} Bln Agenda</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadFullBackup}
                className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-white hover:bg-slate-100 text-blue-900 border-2 border-blue-300 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                <span>Unduh File Backup JSON</span>
              </button>
            </div>

            {/* Action 3: Restore Database JSON */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-wide">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>Pulihkan Data (Restore)</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                  Pulihkan seluruh pengaturan, master guru, siswa, agenda kelas, dan kehadiran dari file cadangan <strong>.json</strong> sebelumnya.
                </p>
                <div className="pt-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Verifikasi & pratinjau otomatis sebelum dipulihkan</span>
                </div>
              </div>

              <label className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-white hover:bg-emerald-50 text-emerald-900 border-2 border-emerald-400 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer text-center">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>Pilih File Backup JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Sync Progress Indicator during execution */}
          {isSyncingCloud && syncStatusStep && (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div>
                <div className="font-extrabold text-xs text-blue-950 uppercase tracking-wide">
                  Sedang Memperbarui Database ke Cloud...
                </div>
                <div className="text-xs font-semibold text-blue-800 mt-0.5">{syncStatusStep}</div>
              </div>
            </div>
          )}

          {/* Sync Result Summary Banner */}
          {syncResultDetails && (
            <div
              className={`rounded-2xl p-4 border-2 flex items-start gap-3.5 animate-in fade-in duration-300 ${
                syncResultDetails.success
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-rose-50 border-rose-400 text-rose-950'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  syncResultDetails.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {syncResultDetails.success ? (
                  <CheckCheck className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-xs uppercase tracking-wider">
                    {syncResultDetails.success ? 'Sinkronisasi Database Berhasil' : 'Pembaruan Gagal'}
                  </span>
                  {syncResultDetails.timestamp && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-md">
                      {syncResultDetails.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium mt-1 leading-relaxed">{syncResultDetails.message}</p>
                {syncResultDetails.stats && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="px-2 py-0.5 bg-white border rounded-md text-slate-800">
                      Siswa: {syncResultDetails.stats.students}
                    </span>
                    <span className="px-2 py-0.5 bg-white border rounded-md text-slate-800">
                      Guru: {syncResultDetails.stats.teachers}
                    </span>
                    <span className="px-2 py-0.5 bg-white border rounded-md text-slate-800">
                      Mapel: {syncResultDetails.stats.subjects}
                    </span>
                    <span className="px-2 py-0.5 bg-white border rounded-md text-slate-800">
                      Bulan Absensi: {syncResultDetails.stats.attendanceMonths}
                    </span>
                    <span className="px-2 py-0.5 bg-white border rounded-md text-slate-800">
                      Bulan Agenda: {syncResultDetails.stats.teacherAgendaMonths}
                    </span>
                    {typeof syncResultDetails.stats.whatsappLogsCount === 'number' && (
                      <span className="px-2 py-0.5 bg-teal-50 border border-teal-300 rounded-md text-teal-900">
                        Audit Log WA: {syncResultDetails.stats.whatsappLogsCount}
                      </span>
                    )}
                    {syncResultDetails.stats.databaseId && (
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 rounded-md text-blue-900 font-mono text-[10px]">
                        DB: {syncResultDetails.stats.databaseId}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Restore Notification */}
          {restoreMessage && (
            <div
              className={`rounded-2xl p-4 border-2 flex items-center gap-3 animate-in fade-in duration-200 ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-rose-50 border-rose-400 text-rose-950'
              }`}
            >
              {restoreMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div className="text-xs font-bold leading-relaxed">{restoreMessage.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PENGATURAN IDENTITAS SEKOLAH, KELAS, & KEAMANAN */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 border-b-2 border-yellow-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-yellow-400 text-blue-950 rounded-2xl shadow-md font-black">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-yellow-300 flex items-center gap-2">
                Pengaturan Identitas & Keamanan
              </h2>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                Kelola identitas sekolah, penandatangan laporan, serta keamanan password guru dan administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {/* Section 2A: School & Class Identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-black text-blue-950 text-base">
                <Building className="w-5 h-5 text-blue-600" />
                <span>Identitas Sekolah & Kelas</span>
              </div>
              <span className="text-xs text-slate-500 font-bold">Informasi Kop Surat & Header</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Nama Sekolah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Tingkat / Kelas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.className || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, className: e.target.value })
                  }
                  placeholder="Contoh: X TJKT 3"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Program Keahlian
                </label>
                <input
                  type="text"
                  value={formData.studyProgram || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, studyProgram: e.target.value })
                  }
                  placeholder="Contoh: Teknik Komputer & Jaringan"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Tahun Pelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.academicYear || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
                  placeholder="Contoh: 2025/2026"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.semester || 'GENAP'}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="GANJIL">GANJIL</option>
                  <option value="GENAP">GENAP</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Tempat & Tanggal Titimangsa Dokumen
                </label>
                <input
                  type="text"
                  value={formData.reportPlaceDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, reportPlaceDate: e.target.value })
                  }
                  placeholder="Contoh: Tangerang Selatan, 31 Januari 2026"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2B: Penanggung Jawab Kelas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-black text-blue-950 text-base">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Penanggung Jawab Kelas & Dokumen</span>
              </div>
              <span className="text-xs text-slate-500 font-bold">Nama & NIP untuk Tanda Tangan Laporan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Nama Kepala Sekolah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.principalName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, principalName: e.target.value })
                  }
                  placeholder="Nama Lengkap Beserta Gelar"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  NIP / NUPTK Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={formData.principalNip || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, principalNip: e.target.value })
                  }
                  placeholder="Contoh: 19700101 199501 1 001 atau -"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Nama Wali Kelas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.homeroomTeacher || formData.teacherName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      homeroomTeacher: e.target.value,
                      teacherName: e.target.value,
                    })
                  }
                  placeholder="Nama Lengkap Wali Kelas"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  NIP / NUPTK Wali Kelas
                </label>
                <input
                  type="text"
                  value={formData.homeroomTeacherNip || formData.teacherNip || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      homeroomTeacherNip: e.target.value,
                      teacherNip: e.target.value,
                    })
                  }
                  placeholder="Contoh: 19850101 201001 2 001 atau -"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Nama Kepala Program Keahlian
                </label>
                <input
                  type="text"
                  value={formData.headOfDepartment || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, headOfDepartment: e.target.value })
                  }
                  placeholder="Contoh: Dedi Saputra, ST"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Nama Ketua Kelas
                </label>
                <input
                  type="text"
                  value={formData.classLeader || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, classLeader: e.target.value })
                  }
                  placeholder="Contoh: Alif Ramadhan"
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2C: Keamanan & Hak Akses Password */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-black text-blue-950 text-base">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Keamanan & Hak Akses Password</span>
              </div>
              <span className="text-xs text-slate-500 font-bold">2 Tingkat Proteksi Keamanan</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                <div>
                  <div className="font-extrabold text-sm text-slate-900">
                    Aktifkan Proteksi Password Aplikasi
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    Jika dinonaktifkan, pengisian absensi tidak akan meminta PIN Guru.
                  </div>
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

              {(formData.requirePassword ?? true) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
                  {/* Password Guru */}
                  <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                          <KeyRound className="w-4 h-4" />
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
                        className="w-full pl-9 pr-10 py-2.5 border-2 border-amber-300 rounded-xl font-mono font-black text-amber-950 bg-white focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                      <button
                        type="button"
                        onClick={() => setShowGuruPassword(!showGuruPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showGuruPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      Digunakan guru untuk mengisi absensi harian dan agenda jurnal kelas.
                    </p>
                  </div>

                  {/* Password Admin */}
                  <div className="bg-indigo-50/70 border border-indigo-300 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-200 text-indigo-900 rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <label className="font-black text-indigo-950 text-xs uppercase tracking-wide">
                          Level 2: Password Administrator
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
                        className="w-full pl-9 pr-10 py-2.5 border-2 border-indigo-300 rounded-xl font-mono font-black text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                      Digunakan untuk membuka menu <strong>Dashboard</strong>, mengedit data guru, mapel, siswa, dan pengaturan.
                    </p>
                  </div>

                  {/* Password Super Admin (Disembunyikan ketika login sebagai admin Level 2) */}
                  {userRole !== 'admin' && (
                    <div className="bg-purple-50/70 border border-purple-300 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-purple-200 text-purple-900 rounded-lg">
                            <ShieldAlert className="w-4 h-4" />
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
                          className="w-full pl-9 pr-10 py-2.5 border-2 border-purple-300 rounded-xl font-mono font-black text-purple-950 bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" />
                        <button
                          type="button"
                          onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSuperAdminPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                        Akses hierarki tertinggi. Memiliki kewenangan penuh membuka semua proteksi, reset database, dan backup master sistem.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
              <Code className="w-4 h-4 text-blue-600" />
              <span>created by <strong className="text-slate-900 font-bold">DEDI SAPUTRA, ST</strong></span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Save className="w-5 h-5 text-yellow-300" />
              <span>Simpan Pengaturan Aplikasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
