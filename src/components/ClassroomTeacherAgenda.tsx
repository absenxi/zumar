import React, { useState, useMemo, useRef } from 'react';
import {
  Student,
  SchoolSettings,
  AttendanceStatus,
  UserRole,
  TeacherAgendaEntry,
  TeacherAgendaStatus,
  Teacher,
  Subject,
} from '../types';
import { ConfirmationConfig } from './ConfirmationModal';
import { DEFAULT_SUBJECTS, INDONESIAN_DAY_NAMES } from '../data/initialData';
import {
  BookOpen,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Printer,
  Download,
  Check,
  AlertCircle,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Users,
  FileSpreadsheet,
} from 'lucide-react';

interface ClassroomTeacherAgendaProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedYear: number;
  selectedMonthIndex: number;
  selectedMonthName: string;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  attendanceData: Record<string, Record<number, AttendanceStatus>>;
  teacherAgendaList: TeacherAgendaEntry[];
  teachers?: Teacher[];
  subjects?: Subject[];
  onSaveAgendaList: (updatedList: TeacherAgendaEntry[]) => void;
  isUnlocked?: boolean;
  isAdminUnlocked?: boolean;
  userRole?: UserRole;
  onUnlockSession?: (role?: UserRole) => void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
}

export const STANDARD_PERIOD_SCHEDULES = [
  { period: '1 - 2', timeRange: '07:15 - 08:45', label: 'Jam Ke- 1 - 2 (07:15 - 08:45)' },
  { period: '3 - 4', timeRange: '08:45 - 10:15', label: 'Jam Ke- 3 - 4 (08:45 - 10:15)' },
  { period: '5 - 6', timeRange: '10:45 - 12:15', label: 'Jam Ke- 5 - 6 (10:45 - 12:15)' },
  { period: '7 - 8', timeRange: '13:00 - 14:30', label: 'Jam Ke- 7 - 8 (13:00 - 14:30)' },
  { period: '9 - 10', timeRange: '14:30 - 16:00', label: 'Jam Ke- 9 - 10 (14:30 - 16:00)' },
  { period: '11 - 12', timeRange: '16:00 - 17:30', label: 'Jam Ke- 11 - 12 (16:00 - 17:30)' },
];

export const STANDARD_SMK_SUBJECTS = [
  { code: 'AIJ', name: 'Administrasi Infrastruktur Jaringan (AIJ)', defaultTeacher: 'Dedi Saputra, ST' },
  { code: 'ASJ', name: 'Administrasi Sistem Jaringan (ASJ)', defaultTeacher: 'Hendra Gunawan, S.Kom' },
  { code: 'TLJ', name: 'Teknologi Layanan Jaringan (TLJ)', defaultTeacher: 'Hendra Gunawan, S.Kom' },
  { code: 'WAN', name: 'Teknologi Jaringan Berbasis Luas (WAN)', defaultTeacher: 'Dedi Saputra, ST' },
  { code: 'D-TJKT', name: 'Dasar-dasar Teknik Jaringan Komputer & Telekomunikasi (TJKT)', defaultTeacher: 'Dedi Saputra, ST' },
  { code: 'PWPB', name: 'Pemrograman Web & Perangkat Bergerak', defaultTeacher: 'Fajar Nugraha, S.Kom' },
  { code: 'INF', name: 'Informatika', defaultTeacher: 'Fajar Nugraha, S.Kom' },
  { code: 'MTK', name: 'Matematika', defaultTeacher: 'Sri Wahyuni, M.Pd' },
  { code: 'BINDO', name: 'Bahasa Indonesia', defaultTeacher: 'Rina Marlina, S.Pd' },
  { code: 'BING', name: 'Bahasa Inggris', defaultTeacher: 'Bambang Irawan, S.Pd' },
  { code: 'PAI', name: 'Pendidikan Agama Islam & Budi Pekerti', defaultTeacher: 'Ust. Ahmad Fauzi, S.Pd.I' },
  { code: 'PPKN', name: 'Pendidikan Pancasila / PPKn', defaultTeacher: 'Dra. Siti Rahmah' },
  { code: 'SEJ', name: 'Sejarah', defaultTeacher: 'Drs. Supardi' },
  { code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', defaultTeacher: 'M. Rizky, S.Pd' },
  { code: 'PKK', name: 'Projek Kreatif dan Kewirausahaan (PKK)', defaultTeacher: 'Nurul Hidayah, S.E' },
  { code: 'BK', name: 'Bimbingan Konseling (BK)', defaultTeacher: 'Evi Susanti, S.Psi' },
  { code: 'MLOK', name: 'Muatan Lokal / Bahasa Sunda', defaultTeacher: 'Guru Muatan Lokal' },
];

/**
 * Format string tanggal YYYY-MM-DD menjadi format standar Indonesia DD-MM-YYYY
 */
export const formatToDDMMYYYY = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

export const ClassroomTeacherAgenda: React.FC<ClassroomTeacherAgendaProps> = ({
  students,
  schoolSettings,
  selectedYear,
  selectedMonthIndex,
  selectedMonthName,
  selectedDay,
  setSelectedDay,
  attendanceData,
  teacherAgendaList,
  teachers = [],
  subjects = [],
  onSaveAgendaList,
  isUnlocked = true,
  isAdminUnlocked = false,
  userRole = 'guest',
  onUnlockSession,
  onRequestConfirmation,
  onPrevMonth,
  onNextMonth,
  onGoToCurrentMonth,
}) => {
  // Feedback toast
  const [syncToast, setSyncToast] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // View mode: 'daily' (per selected date) or 'monthly' (all records in month)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Search and status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TeacherAgendaStatus>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Helper function to safely get Indonesian Day Name from YYYY-MM-DD string without UTC shift
  const getDayNameFromDateStr = (dateStr: string): string => {
    if (!dateStr) return 'Senin';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        return INDONESIAN_DAY_NAMES[dateObj.getDay()] || 'Senin';
      }
    }
    return 'Senin';
  };

  // Form State
  const initialFormState: Omit<TeacherAgendaEntry, 'id'> = {
    date: `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
    dayName: INDONESIAN_DAY_NAMES[new Date(selectedYear, selectedMonthIndex, selectedDay).getDay()] || 'Senin',
    period: '1 - 2',
    timeRange: '07:15 - 08:45',
    subject: '',
    teacherName: '',
    teacherNip: '',
    status: 'Hadir',
    topic: '',
    presentStudentsCount: 0,
    absentStudentsCount: 0,
    notes: 'Siswa kondusif dan tertib mengikuti proses KBM.',
    hasAssignment: false,
    assignmentDetails: '',
    signatureVerified: true,
  };

  const [formData, setFormData] = useState<Omit<TeacherAgendaEntry, 'id'>>(initialFormState);

  // Safe handler when date is changed in the modal
  const handleDateChange = (val: string) => {
    if (!val) {
      setFormData((prev) => ({ ...prev, date: '' }));
      return;
    }
    const dayName = getDayNameFromDateStr(val);

    if (!editingEntryId) {
      const autoSlot = getAutoPeriodForDate(val);
      setFormData((prev) => ({
        ...prev,
        date: val,
        dayName,
        period: autoSlot.period,
        timeRange: autoSlot.timeRange || prev.timeRange,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        date: val,
        dayName,
      }));
    }
  };

  // Max days in the selected month
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  // Current selected date string (YYYY-MM-DD)
  const selectedDateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayName = INDONESIAN_DAY_NAMES[new Date(selectedYear, selectedMonthIndex, selectedDay).getDay()];

  // Filtered entries for current view
  const displayEntries = useMemo(() => {
    let list = teacherAgendaList;

    if (viewMode === 'daily') {
      list = list.filter((item) => item.date === selectedDateStr);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          (item.subject && item.subject.toLowerCase().includes(q)) ||
          (item.teacherName && item.teacherName.toLowerCase().includes(q)) ||
          item.topic.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Sort by date then period chronologically
    return [...list].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const numA = parseInt(a.period, 10);
      const numB = parseInt(b.period, 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.period.localeCompare(b.period);
    });
  }, [teacherAgendaList, viewMode, selectedDateStr, searchQuery, statusFilter]);

  // Overall Monthly Statistics
  const stats = useMemo(() => {
    const total = teacherAgendaList.length;
    const hadir = teacherAgendaList.filter((e) => e.status === 'Hadir').length;
    const telat = teacherAgendaList.filter((e) => e.status === 'Guru Telat Masuk' || e.status === 'Telat').length;
    const izin = teacherAgendaList.filter((e) => e.status === 'Izin').length;
    const sakit = teacherAgendaList.filter((e) => e.status === 'Sakit').length;
    const tugas = teacherAgendaList.filter((e) => e.status === 'Tugas').length;
    const alpa = teacherAgendaList.filter((e) => e.status === 'Alpa').length;
    const pct = total > 0 ? Math.round(((hadir + telat + tugas) / total) * 100) : 100;

    return { total, hadir, telat, izin, sakit, tugas, alpa, pct };
  }, [teacherAgendaList]);

  // Daily statistics for selected day
  const dailyStats = useMemo(() => {
    const dayEntries = teacherAgendaList.filter((e) => e.date === selectedDateStr);
    const total = dayEntries.length;
    const hadir = dayEntries.filter((e) => e.status === 'Hadir' || e.status === 'Guru Telat Masuk' || e.status === 'Telat').length;
    return { total, hadir };
  }, [teacherAgendaList, selectedDateStr]);

  // Helper to compute next automatic period for a date based on entries already recorded
  const getAutoPeriodForDate = (targetDate: string, excludeId?: string | null) => {
    const existingForDate = teacherAgendaList.filter(
      (e) => e.date === targetDate && (!excludeId || e.id !== excludeId)
    );

    const takenPeriods = existingForDate.map((e) => e.period.trim());
    const nextSlot = STANDARD_PERIOD_SCHEDULES.find((s) => !takenPeriods.includes(s.period));

    if (nextSlot) {
      return {
        period: nextSlot.period,
        timeRange: nextSlot.timeRange,
        order: existingForDate.length + 1,
      };
    }

    const nextOrder = existingForDate.length;
    const startP = nextOrder * 2 + 1;
    const endP = startP + 1;
    return {
      period: `${startP} - ${endP}`,
      timeRange: '',
      order: nextOrder + 1,
    };
  };

  // Handle open add modal
  const handleOpenAddModal = () => {
    if (!isUnlocked && onUnlockSession) {
      onUnlockSession('guru');
      return;
    }
    const safeDay = Math.min(Math.max(1, selectedDay), daysInMonth);
    const curDateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    const curDayName = getDayNameFromDateStr(curDateStr);
    const autoSlot = getAutoPeriodForDate(curDateStr);

    setEditingEntryId(null);
    setFormData({
      date: curDateStr,
      dayName: curDayName,
      period: autoSlot.period,
      timeRange: autoSlot.timeRange,
      subject: '',
      teacherName: '',
      teacherNip: '',
      status: 'Hadir',
      topic: '',
      presentStudentsCount: 0,
      absentStudentsCount: 0,
      notes: 'Pembelajaran berlangsung lancar dan tertib.',
      hasAssignment: false,
      assignmentDetails: '',
      signatureVerified: true,
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (entry: TeacherAgendaEntry) => {
    if (!isUnlocked && onUnlockSession) {
      onUnlockSession('guru');
      return;
    }
    setEditingEntryId(entry.id);

    const dayName = getDayNameFromDateStr(entry.date) || entry.dayName;

    setFormData({
      date: entry.date,
      dayName,
      period: entry.period,
      timeRange: entry.timeRange || '',
      subject: entry.subject || '',
      teacherName: entry.teacherName || '',
      teacherNip: entry.teacherNip || '',
      status: entry.status,
      topic: entry.topic,
      presentStudentsCount: entry.presentStudentsCount ?? 0,
      absentStudentsCount: entry.absentStudentsCount ?? 0,
      notes: entry.notes || '',
      hasAssignment: Boolean(entry.hasAssignment),
      assignmentDetails: entry.assignmentDetails || '',
      signatureVerified: Boolean(entry.signatureVerified),
    });
    setIsModalOpen(true);
  };

  // Handle save form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherName?.trim()) {
      alert('Mohon pilih Guru Pengajar dari database guru.');
      return;
    }
    if (!formData.topic.trim()) {
      alert('Mohon lengkapi Materi Pokok / Bahasan yang diajarkan.');
      return;
    }

    const matchedSubject = subjects.find((s) => s.name === formData.subject);
    const matchedTeacher = teachers.find(
      (t) =>
        t.name === formData.teacherName ||
        (matchedSubject?.defaultTeacherName && t.name === matchedSubject.defaultTeacherName) ||
        t.subject?.toLowerCase() === formData.subject?.toLowerCase() ||
        t.additionalSubjects?.some((s) => s.toLowerCase() === formData.subject?.toLowerCase())
    );

    const effectiveTeacherName =
      formData.teacherName?.trim() ||
      matchedTeacher?.name ||
      matchedSubject?.defaultTeacherName ||
      schoolSettings.teacherName ||
      '';

    const effectiveTeacherNip =
      formData.teacherNip?.trim() ||
      matchedTeacher?.nip ||
      matchedSubject?.defaultTeacherNip ||
      schoolSettings.teacherNip ||
      '-';

    const effectiveSubject =
      formData.subject?.trim() ||
      matchedTeacher?.subject ||
      matchedSubject?.name ||
      '';

    const payload = {
      ...formData,
      subject: effectiveSubject,
      teacherName: effectiveTeacherName,
      teacherNip: effectiveTeacherNip,
    };

    if (editingEntryId) {
      // Edit existing
      const updated = teacherAgendaList.map((item) =>
        item.id === editingEntryId
          ? {
              ...item,
              ...payload,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      onSaveAgendaList(updated);
      setSyncToast({
        type: 'success',
        text: 'Perubahan Agenda Guru berhasil disimpan!',
      });
      setTimeout(() => setSyncToast(null), 3500);
    } else {
      // Add new
      const newEntry: TeacherAgendaEntry = {
        id: `agenda_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveAgendaList([...teacherAgendaList, newEntry]);
      setSyncToast({
        type: 'success',
        text: 'Agenda Guru baru berhasil disimpan!',
      });
      setTimeout(() => setSyncToast(null), 3500);
    }

    // Automatically synchronize selectedDay if the saved entry is within the current month & year
    if (payload.date) {
      const parts = payload.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (y === selectedYear && m === selectedMonthIndex) {
          setSelectedDay(d);
        }
      }
    }

    setIsModalOpen(false);
  };

  // Handle delete entry
  const handleDeleteEntry = (id: string, subject?: string, teacher?: string) => {
    if (!isUnlocked && onUnlockSession) {
      onUnlockSession('guru');
      return;
    }
    const doDelete = () => {
      const updated = teacherAgendaList.filter((item) => item.id !== id);
      onSaveAgendaList(updated);
      setSyncToast({
        type: 'info',
        text: 'Agenda guru berhasil dihapus.',
      });
      setTimeout(() => setSyncToast(null), 3000);
    };

    const targetLabel = subject || teacher ? `"${[subject, teacher].filter(Boolean).join(' - ')}"` : 'agenda ini';

    if (onRequestConfirmation) {
      onRequestConfirmation({
        title: 'Hapus Agenda Pelajaran?',
        message: `Apakah Anda yakin ingin menghapus ${targetLabel}? Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        variant: 'danger',
        onConfirm: doDelete,
      });
    } else {
      if (window.confirm(`Hapus ${targetLabel}?`)) {
        doDelete();
      }
    }
  };

  // Handle clear all agenda entries for the current month
  const handleClearAllAgendasThisMonth = () => {
    if (teacherAgendaList.length === 0) return;
    if (!isUnlocked && onUnlockSession) {
      onUnlockSession('guru');
      return;
    }
    const doClear = () => {
      onSaveAgendaList([]);
      setSyncToast({
        type: 'info',
        text: 'Seluruh agenda bulan ini telah dikosongkan.',
      });
      setTimeout(() => setSyncToast(null), 3000);
    };

    if (onRequestConfirmation) {
      onRequestConfirmation({
        title: 'Hapus Semua Agenda Bulan Ini?',
        message: `Apakah Anda yakin ingin menghapus seluruh ${teacherAgendaList.length} agenda pelajaran di bulan ${selectedMonthName} ${selectedYear}? Tindakan ini akan mengosongkan agenda dan tidak dapat dibatalkan.`,
        confirmText: 'Ya, Hapus Semua Agenda',
        cancelText: 'Batal',
        variant: 'danger',
        onConfirm: doClear,
      });
    } else {
      if (window.confirm(`Hapus seluruh ${teacherAgendaList.length} agenda di bulan ${selectedMonthName} ${selectedYear}?`)) {
        doClear();
      }
    }
  };

  // Toggle signature / paraf verification
  const handleToggleSignature = (entry: TeacherAgendaEntry) => {
    if (!isUnlocked && onUnlockSession) {
      onUnlockSession('guru');
      return;
    }
    const updated = teacherAgendaList.map((item) =>
      item.id === entry.id
        ? {
            ...item,
            signatureVerified: !item.signatureVerified,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    onSaveAgendaList(updated);
    setSyncToast({
      type: 'success',
      text: `Status paraf verifikasi guru berhasil diperbarui!`,
    });
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Export Agenda to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Hari',
      'Jam Ke-',
      'Mata Pelajaran',
      'Guru Pengajar',
      'NIP/Kode',
      'Status Kehadiran',
      'Materi / Pokok Bahasan',
      'Catatan Kelas',
      'Ada Tugas',
      'Rincian Tugas',
      'Paraf Terverifikasi',
    ];

    const rows = displayEntries.map((item, idx) => [
      idx + 1,
      `"${formatToDDMMYYYY(item.date)}"`,
      `"${item.dayName}"`,
      `"${(item.period || '-').replace(/^Jam\s*(Ke-?)?\s*/i, '')}"`,
      `"${(item.subject || '').replace(/"/g, '""')}"`,
      `"${(item.teacherName || '').replace(/"/g, '""')}"`,
      `"${item.teacherNip || '-'}"`,
      `"${item.status}"`,
      `"${(item.topic || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.hasAssignment ? 'Ya' : 'Tidak',
      `"${(item.assignmentDetails || '').replace(/"/g, '""')}"`,
      item.signatureVerified ? 'Terverifikasi' : 'Belum',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Agenda_Guru_Kelas_${(schoolSettings.className || 'Kelas').replace(/\s+/g, '_')}_${selectedMonthName}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Status badge styling helper
  const getStatusBadge = (status: TeacherAgendaStatus) => {
    switch (status) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Guru Telat Masuk':
      case 'Telat':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Izin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Sakit':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Tugas':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Alpa':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-blue-800 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Agenda Kehadiran Guru di Kelas
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Kelas {schoolSettings.className}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buku Jurnal Pembelajaran, Materi Pelajaran & Pencatatan Kehadiran Guru Masuk Kelas • {schoolSettings.schoolName}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-yellow-300" />
              <span>+ Tambah Agenda Guru</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
              title="Cetak Format Buku Jurnal Agenda Resmi"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Cetak Jurnal</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all cursor-pointer"
              title="Download Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn ${
            syncToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : syncToast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {syncToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {syncToast.type === 'info' && <Clock className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{syncToast.text}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mode Switcher, Date Controls & Filter Bar (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Daily vs Monthly Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Agenda Harian (Per Tanggal)</span>
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Semua Agenda Bulan Ini ({teacherAgendaList.length})</span>
            </button>
          </div>

          {/* Date Selector for Daily View */}
          {viewMode === 'daily' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                disabled={selectedDay <= 1}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-all cursor-pointer"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="font-black text-blue-900 text-xs sm:text-sm">
                  {selectedDayName}, {formatToDDMMYYYY(selectedDateStr)}
                </span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                  {dailyStats.total} Sesi
                </span>
              </div>

              <button
                onClick={() => setSelectedDay(Math.min(daysInMonth, selectedDay + 1))}
                disabled={selectedDay >= daysInMonth}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-all cursor-pointer"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Day selection dropdown */}
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Tgl {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Controls for Monthly View */}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2 flex-wrap">
              {teacherAgendaList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllAgendasThisMonth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Hapus seluruh data agenda di bulan ini"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Semua Agenda Bulan Ini</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru, mata pelajaran, materi bahasan..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap hidden md:inline">
              Filter:
            </span>
            {(['all', 'Hadir', 'Guru Telat Masuk', 'Izin', 'Sakit', 'Tugas', 'Alpa'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Official Print Header (Visible ONLY when printing) */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
        <div className="text-xs font-bold tracking-widest uppercase text-slate-700">
          {schoolSettings.foundationName}
        </div>
        <div className="text-lg font-black tracking-wide text-black uppercase">
          {schoolSettings.schoolName}
        </div>
        <div className="text-sm font-extrabold uppercase mt-1 text-slate-900">
          BUKU AGENDA PEMBELAJARAN & KEHADIRAN GURU DI KELAS
        </div>
        <div className="text-xs font-medium mt-0.5 text-slate-700">
          Kelas: <strong>{schoolSettings.className}</strong> • Bulan:{' '}
          <strong>
            {selectedMonthName} {selectedYear}
          </strong>{' '}
          • Tahun Pelajaran: <strong>{schoolSettings.academicYear}</strong>
        </div>
      </div>

      {/* Table / Agenda Entries List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white uppercase text-[11px] font-black border-b border-slate-700">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-28">Hari / Tanggal</th>
                <th className="py-3 px-3 w-20 text-center">Jam Ke-</th>
                <th className="py-3 px-4">Mata Pelajaran & Guru</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-4">Materi / Pokok Bahasan</th>
                <th className="py-3 px-4">Catatan / Tugas</th>
                <th className="py-3 px-3 w-20 text-center">Paraf</th>
                <th className="py-3 px-3 w-24 text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-10 h-10 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">
                        Belum ada data agenda guru yang tercatat untuk filter ini.
                      </p>
                      <p className="text-xs text-slate-400 max-w-md">
                        Klik tombol <strong>+ Tambah Agenda Guru</strong> untuk mencatat mata pelajaran, materi pokok, dan kehadiran guru di kelas.
                      </p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Agenda Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayEntries.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{item.dayName}</div>
                        <div className="text-[11px] text-slate-600 font-mono font-bold">
                          {formatToDDMMYYYY(item.date)}
                        </div>
                      </td>

                      {/* Jam Ke- */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono"
                          title={item.timeRange ? `Waktu: ${item.timeRange} WIB` : undefined}
                        >
                          {(item.period || '-').replace(/^Jam\s*(Ke-?)?\s*/i, '') || '-'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.subject && (
                          <div className="font-black text-slate-900 text-[13px]">
                            {item.subject}
                          </div>
                        )}
                        {item.teacherName && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold mt-0.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.teacherName}</span>
                            {item.teacherNip && item.teacherNip !== '-' && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({item.teacherNip})
                              </span>
                            )}
                          </div>
                        )}
                        {!item.subject && !item.teacherName && (
                          <span className="text-slate-400 font-normal italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-black text-[11px] border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium leading-relaxed max-w-sm">
                          {item.topic || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-600">
                          {item.notes || '-'}
                        </div>
                        {item.hasAssignment && item.assignmentDetails && (
                          <div className="mt-1 p-1.5 bg-amber-50 rounded-md border border-amber-200 text-[11px] text-amber-900">
                            <strong>Tugas:</strong> {item.assignmentDetails}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSignature(item)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            item.signatureVerified
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={
                            item.signatureVerified
                              ? 'Terverifikasi / Diparaf (Klik untuk ubah)'
                              : 'Belum diparaf (Klik untuk verifikasi)'
                          }
                        >
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              item.signatureVerified
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700 transition-all cursor-pointer"
                            title="Edit Agenda"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteEntry(item.id, item.subject, item.teacherName)
                            }
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                            title="Hapus Agenda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 print:hidden">
          <div>
            Menampilkan <strong>{displayEntries.length}</strong> agenda pelajaran ({viewMode === 'daily' ? `Tanggal ${selectedDay} ${selectedMonthName}` : `Bulan ${selectedMonthName} ${selectedYear}`})
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>
              Toleransi Kehadiran Guru: <strong>{stats.pct}%</strong>
            </span>
            <span>•</span>
            <span>
              Wali Kelas: <strong>{schoolSettings.teacherName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Official Signature Area (Printed Document Layout) */}
      <div className="hidden print:block mt-8 pt-4">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold">Ketua Kelas {schoolSettings.className}</div>
            <div className="h-16"></div>
            <div className="font-black underline uppercase">
              {schoolSettings.classLeader || '( ........................................ )'}
            </div>
            <div className="text-[10px] text-slate-600">NISN / Siswa</div>
          </div>

          <div>
            <div>Mengetahui / Memeriksa,</div>
            <div className="font-bold">Wali Kelas {schoolSettings.className}</div>
            <div className="h-16"></div>
            <div className="font-black underline uppercase">
              {schoolSettings.teacherName || '( ........................................ )'}
            </div>
            <div className="text-[10px] text-slate-600">
              NIP. {schoolSettings.teacherNip || '-'}
            </div>
          </div>

          <div>
            <div>{schoolSettings.locationName || 'Ciputat'}, {schoolSettings.signatureDate}</div>
            <div className="font-bold">Kepala Sekolah SMKS Nusantara 1</div>
            <div className="h-16"></div>
            <div className="font-black underline uppercase">
              {schoolSettings.principalName || '( ........................................ )'}
            </div>
            <div className="text-[10px] text-slate-600">
              NIP. {schoolSettings.principalNip || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add / Edit Teacher Agenda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-yellow-300">
                    {editingEntryId ? 'Edit Agenda Mengajar Guru' : 'Tambah Agenda Mengajar Guru di Kelas'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Kelas {schoolSettings.className} • SMKS Nusantara 1 Ciputat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Tanggal Pelajaran, Hari, Jam Ke- & Status Kehadiran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tanggal Pelajaran */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tanggal Pelajaran *
                  </label>
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="date"
                      required
                      value={formData.date || ''}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold font-mono text-xs text-slate-900 cursor-pointer shadow-2xs"
                      title="Klik untuk memilih Tanggal Pelajaran"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
                            dateInputRef.current.showPicker();
                          } else {
                            dateInputRef.current?.focus();
                          }
                        } catch {
                          dateInputRef.current?.focus();
                        }
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                      title="Buka Kalender"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                    <span className="text-slate-500 font-medium">
                      Format: <strong className="text-blue-800 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{formData.date ? formatToDDMMYYYY(formData.date) : 'DD-MM-YYYY'}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          const y = today.getFullYear();
                          const m = String(today.getMonth() + 1).padStart(2, '0');
                          const d = String(today.getDate()).padStart(2, '0');
                          handleDateChange(`${y}-${m}-${d}`);
                        }}
                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-200 transition-colors cursor-pointer"
                        title="Pilih Tanggal Hari Ini"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDateChange(selectedDateStr);
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-200 transition-colors cursor-pointer"
                        title={`Pilih tanggal aktif saat ini (Tgl ${selectedDay})`}
                      >
                        Tgl {selectedDay}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hari */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Hari
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.dayName || ''}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Otomatis sinkron tanggal
                  </span>
                </div>

                {/* Jam Pelajaran (Jam Ke-) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Jam Ke- (Waktu) *
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => {
                      const selectedP = e.target.value;
                      const matchedSlot = STANDARD_PERIOD_SCHEDULES.find((s) => s.period === selectedP);
                      setFormData((prev) => ({
                        ...prev,
                        period: selectedP,
                        timeRange: matchedSlot?.timeRange || prev.timeRange,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
                  >
                    {STANDARD_PERIOD_SCHEDULES.map((slot) => (
                      <option key={slot.period} value={slot.period}>
                        {slot.label}
                      </option>
                    ))}
                    {!STANDARD_PERIOD_SCHEDULES.some((s) => s.period === formData.period) && formData.period && (
                      <option value={formData.period}>
                        Jam Ke- {formData.period} {formData.timeRange ? `(${formData.timeRange})` : ''}
                      </option>
                    )}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {formData.timeRange ? `Waktu: ${formData.timeRange} WIB` : 'Jadwal Jam Mengajar'}
                  </span>
                </div>

                {/* Status Kehadiran Guru */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Status Kehadiran Guru *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TeacherAgendaStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
                  >
                    <option value="Hadir">Hadir (Mengajar di Kelas)</option>
                    <option value="Guru Telat Masuk">Guru Telat Masuk</option>
                    <option value="Izin">Izin (Ada Tugas / Modul)</option>
                    <option value="Sakit">Sakit (Izin Berhalangan)</option>
                    <option value="Tugas">Tugas Luar / Dinas</option>
                    <option value="Alpa">Tanpa Keterangan / Alpa</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Presensi guru pada jam ini
                  </span>
                </div>
              </div>

              {/* Row 2: Guru Pengajar (Database Guru) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/80 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800">
                      Guru Pengajar (Database Guru) *
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
                      <GraduationCap className="w-3 h-3 text-emerald-700" />
                      {teachers.length > 0 ? `${teachers.length} Guru DB` : 'Database Guru'}
                    </span>
                  </div>

                  <select
                    required
                    value={formData.teacherName || ''}
                    onChange={(e) => {
                      const selectedTeacherName = e.target.value;
                      const teacherObj = teachers.find((t) => t.name === selectedTeacherName);

                      if (teacherObj) {
                        const teacherCode =
                          teacherObj.code ||
                          subjects.find((s) => s.name.toLowerCase() === teacherObj.subject?.toLowerCase())?.code ||
                          '';
                        setFormData((prev) => ({
                          ...prev,
                          teacherName: teacherObj.name,
                          teacherNip:
                            teacherObj.nip && teacherObj.nip !== '-'
                              ? teacherObj.nip
                              : teacherCode || '-',
                          subject: teacherObj.subject || prev.subject || '',
                        }));
                      } else {
                        // Jika dipilih dari standar SMK
                        const stdMatch = STANDARD_SMK_SUBJECTS.find((std) => std.defaultTeacher === selectedTeacherName);
                        setFormData((prev) => ({
                          ...prev,
                          teacherName: selectedTeacherName,
                          teacherNip: stdMatch ? stdMatch.code : '-',
                          subject: stdMatch ? stdMatch.name : (prev.subject || ''),
                        }));
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 cursor-pointer text-xs shadow-xs"
                  >
                    <option value="">-- Pilih Guru dari Database Guru --</option>
                    {teachers.length > 0 ? (
                      teachers.map((t) => {
                        const teacherCode =
                          t.code ||
                          subjects.find((s) => s.name.toLowerCase() === t.subject?.toLowerCase())?.code ||
                          '';
                        return (
                          <option key={t.id} value={t.name}>
                            {teacherCode ? `[${teacherCode}] ` : ''}{t.name} {t.subject ? `• [Mapel: ${t.subject}]` : ''} {t.nip && t.nip !== '-' ? `(NIP: ${t.nip})` : ''}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value={schoolSettings.teacherName || 'Wali Kelas'}>
                          {schoolSettings.teacherName || 'Wali Kelas'} (Wali Kelas)
                        </option>
                        {STANDARD_SMK_SUBJECTS.map((std) => (
                          <option key={`std_t_${std.defaultTeacher}`} value={std.defaultTeacher}>
                            [{std.code}] {std.defaultTeacher} • [{std.name}]
                          </option>
                        ))}
                      </>
                    )}

                    {formData.teacherName &&
                      !teachers.some((t) => t.name === formData.teacherName) &&
                      formData.teacherName !== schoolSettings.teacherName && (
                        <option value={formData.teacherName}>{formData.teacherName}</option>
                      )}
                  </select>
                </div>
              </div>

              {/* Row 3: Materi Pembelajaran / Pokok Bahasan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Materi Pokok / Bahasan yang Diajarkan *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.topic || ''}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Contoh: Praktik Pengkabelan UTP Straight/Cross & Konfigurasi IP Address Static pada Lab Komputer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Catatan Kelas */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Ketertiban / Situasi Kelas
                  </label>
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="misal: Siswa antusias, praktik lab lancar, atau ada siswa yang izin ke UKS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="signatureVerified"
                    checked={formData.signatureVerified}
                    onChange={(e) =>
                      setFormData({ ...formData, signatureVerified: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="signatureVerified"
                    className="font-bold text-slate-700 cursor-pointer"
                  >
                    Tandai Status Terverifikasi / Diparaf oleh Guru Pengajar
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 text-yellow-300" />
                    <span>{editingEntryId ? 'Simpan Perubahan' : 'Tambah ke Agenda'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
