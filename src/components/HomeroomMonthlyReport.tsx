import React, { useState, useEffect, useMemo } from 'react';
import {
  Student,
  Teacher,
  TeacherAgendaEntry,
  SchoolSettings,
  AttendanceStatus,
  HomeroomMonthlyReportData,
  UserRole,
} from '../types';
import { MONTH_NAMES } from '../data/initialData';
import {
  saveHomeroomReportToCloud,
  subscribeHomeroomReport,
} from '../lib/supabase';
import {
  FileText,
  Printer,
  Sparkles,
  Save,
  RotateCcw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  School,
  FileCheck,
  Eye,
  Edit3,
  Award,
  CheckCircle2,
  List,
  Users,
  Info,
  X,
  Download,
  Lock,
  KeyRound,
  ShieldCheck,
  UserX,
  AlertCircle,
  Activity,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { exportHomeroomReportToWord } from '../utils/export';
import { ConfirmationConfig } from './ConfirmationModal';

interface HomeroomMonthlyReportProps {
  students: Student[];
  teachers?: Teacher[];
  teacherAgendaList?: TeacherAgendaEntry[];
  schoolSettings: SchoolSettings;
  selectedMonthIndex: number;
  selectedMonthName: string;
  selectedYear: number;
  attendanceData: Record<string, Record<number, AttendanceStatus>>; // studentId -> day -> status
  isUnlocked?: boolean;
  isAdminUnlocked?: boolean;
  onUnlockSession?: (role?: UserRole) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onGoToCurrentMonth?: () => void;
  onUpdateSchoolSettings?: (settings: SchoolSettings) => void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
}

export const HomeroomMonthlyReport: React.FC<HomeroomMonthlyReportProps> = ({
  students,
  teachers = [],
  teacherAgendaList = [],
  schoolSettings,
  selectedMonthIndex,
  selectedMonthName,
  selectedYear,
  attendanceData,
  isUnlocked = true,
  isAdminUnlocked = false,
  onUnlockSession,
  onPrevMonth,
  onNextMonth,
  onGoToCurrentMonth,
  onUpdateSchoolSettings,
  onRequestConfirmation,
}) => {
  const monthKey = `${selectedYear}_${selectedMonthIndex}`;
  const localKey = `homeroom_report_${monthKey}`;

  // Default empty/pre-populated form structure
  const getDefaultReport = (): HomeroomMonthlyReportData => {
    return {
      monthKey,
      schoolName: schoolSettings.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
      homeroomTeacher: schoolSettings.teacherName || 'Wali Kelas',
      classLeader: schoolSettings.classLeader || '',
      majorClass: schoolSettings.className || 'X TJKT 3',
      month: `${selectedMonthName} ${selectedYear}`,
      attendancePercentage: '',
      oftenLateStudents: ['', '', '', ''],
      oftenAbsentStudents: ['', '', '', ''],
      oftenSickStudents: ['', '', '', ''],
      oftenLateOrPermissionStudents: ['', '', '', ''],
      perfectAttendanceStudents: ['', '', '', ''],
      oftenLateTeachers: ['', '', '', ''],
      oftenAbsentTeachers: ['', '', '', ''],
      perfectAttendanceTeachers: ['', '', '', ''],
      monthlyCases: ['', ''],
      selfEvaluation: ['', ''],
      signatureLocation: schoolSettings.locationName || 'Tangerang Selatan',
      signatureDate: `${new Date().getDate()} ${selectedMonthName} ${selectedYear}`,
      headOfDepartment: schoolSettings.headOfDepartment || '',
      headOfDepartmentNip: schoolSettings.headOfDepartmentNip || '-',
    };
  };

  const [formData, setFormData] = useState<HomeroomMonthlyReportData>(() => {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...getDefaultReport(),
          ...parsed,
          schoolName: schoolSettings.schoolName || parsed.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
          homeroomTeacher: schoolSettings.teacherName || parsed.homeroomTeacher || 'Wali Kelas',
          classLeader: schoolSettings.classLeader !== undefined ? schoolSettings.classLeader : (parsed.classLeader || ''),
          headOfDepartment: schoolSettings.headOfDepartment !== undefined ? schoolSettings.headOfDepartment : (parsed.headOfDepartment || ''),
          headOfDepartmentNip: schoolSettings.headOfDepartmentNip !== undefined ? schoolSettings.headOfDepartmentNip : (parsed.headOfDepartmentNip || '-'),
          majorClass: schoolSettings.className || parsed.majorClass || 'X TJKT 3',
          signatureLocation: schoolSettings.locationName || parsed.signatureLocation || 'Tangerang Selatan',
        };
      } catch (e) {
        console.error('Failed to parse local homeroom report:', e);
      }
    }
    return getDefaultReport();
  });

  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [copySuccess, setCopySuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeDetailModal, setActiveDetailModal] = useState<
    | 'perfect'
    | 'absent'
    | 'sick'
    | 'permission'
    | 'late_teachers'
    | 'absent_teachers'
    | 'perfect_teachers'
    | null
  >(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to Cloud Firestore data per month
  useEffect(() => {
    const unsubscribe = subscribeHomeroomReport(
      monthKey,
      (cloudData) => {
        if (cloudData) {
          const merged = {
            ...getDefaultReport(),
            ...cloudData,
            monthKey,
            schoolName: schoolSettings.schoolName || cloudData.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
            homeroomTeacher: schoolSettings.teacherName || cloudData.homeroomTeacher || 'Wali Kelas',
            classLeader: schoolSettings.classLeader !== undefined ? schoolSettings.classLeader : (cloudData.classLeader || ''),
            headOfDepartment: schoolSettings.headOfDepartment !== undefined ? schoolSettings.headOfDepartment : (cloudData.headOfDepartment || ''),
            headOfDepartmentNip: schoolSettings.headOfDepartmentNip !== undefined ? schoolSettings.headOfDepartmentNip : (cloudData.headOfDepartmentNip || '-'),
            majorClass: schoolSettings.className || cloudData.majorClass || 'X TJKT 3',
            signatureLocation: schoolSettings.locationName || cloudData.signatureLocation || 'Tangerang Selatan',
          };
          setFormData(merged);
          localStorage.setItem(localKey, JSON.stringify(merged));
        } else {
          // Check localStorage fallback
          const localSaved = localStorage.getItem(localKey);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              setFormData({
                ...getDefaultReport(),
                ...parsed,
                schoolName: schoolSettings.schoolName || parsed.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
                homeroomTeacher: schoolSettings.teacherName || parsed.homeroomTeacher || 'Wali Kelas',
                classLeader: schoolSettings.classLeader !== undefined ? schoolSettings.classLeader : (parsed.classLeader || ''),
                headOfDepartment: schoolSettings.headOfDepartment !== undefined ? schoolSettings.headOfDepartment : (parsed.headOfDepartment || ''),
                headOfDepartmentNip: schoolSettings.headOfDepartmentNip !== undefined ? schoolSettings.headOfDepartmentNip : (parsed.headOfDepartmentNip || '-'),
                majorClass: schoolSettings.className || parsed.majorClass || 'X TJKT 3',
                signatureLocation: schoolSettings.locationName || parsed.signatureLocation || 'Tangerang Selatan',
              });
            } catch (e) {
              setFormData(getDefaultReport());
            }
          } else {
            setFormData(getDefaultReport());
          }
        }
      },
      null
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [monthKey]);

  // Update default names if schoolSettings change
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      schoolName: schoolSettings.schoolName || prev.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
      homeroomTeacher: schoolSettings.teacherName || prev.homeroomTeacher || 'Wali Kelas',
      classLeader: schoolSettings.classLeader !== undefined ? schoolSettings.classLeader : (prev.classLeader || ''),
      headOfDepartment: schoolSettings.headOfDepartment !== undefined ? schoolSettings.headOfDepartment : (prev.headOfDepartment || ''),
      headOfDepartmentNip: schoolSettings.headOfDepartmentNip !== undefined ? schoolSettings.headOfDepartmentNip : (prev.headOfDepartmentNip || '-'),
      majorClass: schoolSettings.className || prev.majorClass || 'X TJKT 3',
      month: `${selectedMonthName} ${selectedYear}`,
      signatureLocation: schoolSettings.locationName || prev.signatureLocation || 'Tangerang Selatan',
    }));
  }, [schoolSettings, selectedMonthName, selectedYear]);

  // Auto-Save helper with debounce
  const handleDataChange = (updates: Partial<HomeroomMonthlyReportData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...updates };
      setSaveStatus('saving');

      // Local storage
      localStorage.setItem(localKey, JSON.stringify(updated));

      // Cloud storage debounced
      saveHomeroomReportToCloud(monthKey, updated)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('idle'));

      return updated;
    });
  };

  // Sync wali kelas changes to all months via schoolSettings & storage
  const handleHomeroomTeacherChange = (val: string) => {
    handleDataChange({ homeroomTeacher: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        teacherName: val,
      });
    }
  };

  // Sync major/class changes to all months via schoolSettings & storage
  const handleMajorClassChange = (val: string) => {
    handleDataChange({ majorClass: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        className: val,
      });
    }
  };

  // Sync school name changes to all months via schoolSettings & storage
  const handleSchoolNameChange = (val: string) => {
    handleDataChange({ schoolName: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        schoolName: val,
      });
    }
  };

  // Sync class leader changes to all months via schoolSettings & storage
  const handleClassLeaderChange = (val: string) => {
    handleDataChange({ classLeader: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        classLeader: val,
      });
    }
  };

  // Sync head of department changes to all months via schoolSettings & storage
  const handleHeadOfDepartmentChange = (val: string) => {
    handleDataChange({ headOfDepartment: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        headOfDepartment: val,
      });
    }
  };

  // Sync head of department NIP changes to all months via schoolSettings & storage
  const handleHeadOfDepartmentNipChange = (val: string) => {
    handleDataChange({ headOfDepartmentNip: val });
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        headOfDepartmentNip: val,
      });
    }
  };

  // Manual save trigger
  const handleManualSave = async () => {
    setSaveStatus('saving');
    localStorage.setItem(localKey, JSON.stringify(formData));
    await saveHomeroomReportToCloud(monthKey, formData);
    setSaveStatus('saved');
    showToast('Laporan bulanan berhasil disimpan ke Cloud & Lokal!');
  };

  // Calculate statistics from actual attendance data
  const attendanceAnalytics = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const activeDays: number[] = [];

    // Find effective days (excluding days with only '-' for all students)
    for (let day = 1; day <= daysInMonth; day++) {
      const hasAnyAttendance = students.some((s) => {
        const st = attendanceData[s.id]?.[day];
        return st && st !== '-';
      });
      if (hasAnyAttendance) {
        activeDays.push(day);
      }
    }

    let totalH = 0;
    let totalS = 0;
    let totalI = 0;
    let totalA = 0;

    const studentStats = students.map((s) => {
      let h = 0;
      let sCount = 0;
      let i = 0;
      let a = 0;

      activeDays.forEach((day) => {
        const st = attendanceData[s.id]?.[day] || '-';
        if (st === 'H') h++;
        else if (st === 'S') sCount++;
        else if (st === 'I') i++;
        else if (st === 'A') a++;
      });

      totalH += h;
      totalS += sCount;
      totalI += i;
      totalA += a;

      const totalActiveDays = activeDays.length;
      // Siswa hadir 100% jika ada hari aktif, hadir di semua hari aktif (H === totalActiveDays), dan tidak ada Sakit, Izin, maupun Alpa
      const isPerfect = totalActiveDays > 0 && h === totalActiveDays && sCount === 0 && i === 0 && a === 0;

      return {
        student: s,
        h,
        s: sCount,
        i,
        a,
        isPerfect,
        attendanceRate: totalActiveDays > 0 ? (h / totalActiveDays) * 100 : 0,
      };
    });

    const totalPossibleSlots = students.length * (activeDays.length || 1);
    const overallPercentage =
      totalPossibleSlots > 0 ? ((totalH / totalPossibleSlots) * 100).toFixed(1) : '0';

    // All absent/alpa students sorted by frequency (descending) and name
    const allAbsentStudents = [...studentStats]
      .filter((item) => item.a > 0)
      .sort((x, y) => y.a - x.a || (x.student.no || 0) - (y.student.no || 0) || x.student.name.localeCompare(y.student.name));

    const totalAbsentDays = allAbsentStudents.reduce((sum, item) => sum + item.a, 0);

    // Distribute all absent students across 4 form rows
    const formatAbsentAttendanceSlots = (
      list: typeof allAbsentStudents
    ): [string, string, string, string] => {
      const count = list.length;
      if (count === 0) return ['', '', '', ''];
      if (count <= 4) {
        const result: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          result[idx] = `${item.student.name} (${item.a}x)`;
        });
        return result;
      }
      const perRow = Math.ceil(count / 4);
      const result: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const rowStudents = list.slice(row * perRow, (row + 1) * perRow);
        result[row] = rowStudents.map((item) => `${item.student.name} (${item.a}x)`).join(', ');
      }
      return result;
    };

    const absentStudentsFormatted = formatAbsentAttendanceSlots(allAbsentStudents);

    // All sick students sorted by frequency (descending) and name
    const allSickStudents = [...studentStats]
      .filter((item) => item.s > 0)
      .sort((x, y) => y.s - x.s || (x.student.no || 0) - (y.student.no || 0) || x.student.name.localeCompare(y.student.name));

    const totalSickDays = allSickStudents.reduce((sum, item) => sum + item.s, 0);

    // Distribute all sick students across 4 form rows
    const formatSickAttendanceSlots = (
      list: typeof allSickStudents
    ): [string, string, string, string] => {
      const count = list.length;
      if (count === 0) return ['', '', '', ''];
      if (count <= 4) {
        const result: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          result[idx] = `${item.student.name} (${item.s}x)`;
        });
        return result;
      }
      const perRow = Math.ceil(count / 4);
      const result: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const rowStudents = list.slice(row * perRow, (row + 1) * perRow);
        result[row] = rowStudents.map((item) => `${item.student.name} (${item.s}x)`).join(', ');
      }
      return result;
    };

    const sickStudentsFormatted = formatSickAttendanceSlots(allSickStudents);

    // All permission/izin students sorted by frequency (descending) and name
    const allPermissionStudents = [...studentStats]
      .filter((item) => item.i > 0)
      .sort((x, y) => y.i - x.i || (x.student.no || 0) - (y.student.no || 0) || x.student.name.localeCompare(y.student.name));

    const totalPermissionDays = allPermissionStudents.reduce((sum, item) => sum + item.i, 0);

    // Distribute all permission students across 4 form rows
    const formatPermissionAttendanceSlots = (
      list: typeof allPermissionStudents
    ): [string, string, string, string] => {
      const count = list.length;
      if (count === 0) return ['', '', '', ''];
      if (count <= 4) {
        const result: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          result[idx] = `${item.student.name} (${item.i}x)`;
        });
        return result;
      }
      const perRow = Math.ceil(count / 4);
      const result: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const rowStudents = list.slice(row * perRow, (row + 1) * perRow);
        result[row] = rowStudents.map((item) => `${item.student.name} (${item.i}x)`).join(', ');
      }
      return result;
    };

    const permissionStudentsFormatted = formatPermissionAttendanceSlots(allPermissionStudents);

    // All perfect 100% attendance students sorted by student list number / name
    const allPerfectStudents = [...studentStats]
      .filter((item) => item.isPerfect)
      .sort((x, y) => (x.student.no || 0) - (y.student.no || 0) || x.student.name.localeCompare(y.student.name));

    // Distribute all 100% students across the 4 lines so NONE are left out
    const formatPerfectAttendanceSlots = (
      list: typeof allPerfectStudents
    ): [string, string, string, string] => {
      const count = list.length;
      if (count === 0) {
        return ['', '', '', ''];
      }
      if (count <= 4) {
        const result: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          result[idx] = item.student.name;
        });
        return result;
      }
      // If count > 4, distribute all student names across the 4 rows evenly
      const perRow = Math.ceil(count / 4);
      const result: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const rowStudents = list.slice(row * perRow, (row + 1) * perRow);
        result[row] = rowStudents.map((item) => item.student.name).join(', ');
      }
      return result;
    };

    const perfectStudentsFormatted = formatPerfectAttendanceSlots(allPerfectStudents);

    // Top 4 slices for quick single-pick
    const topAbsent = allAbsentStudents.slice(0, 4).map((item) => `${item.student.name} (${item.a}x)`);
    const topSick = allSickStudents.slice(0, 4).map((item) => `${item.student.name} (${item.s}x)`);
    const topPermission = allPermissionStudents.slice(0, 4).map((item) => `${item.student.name} (${item.i}x)`);

    return {
      activeDaysCount: activeDays.length,
      overallPercentage,
      allAbsentStudents,
      absentStudentsCount: allAbsentStudents.length,
      totalAbsentDays,
      absentStudentsFormatted,
      topAbsent,
      allSickStudents,
      sickStudentsCount: allSickStudents.length,
      totalSickDays,
      sickStudentsFormatted,
      topSick,
      allPermissionStudents,
      permissionStudentsCount: allPermissionStudents.length,
      totalPermissionDays,
      permissionStudentsFormatted,
      topPermission,
      allPerfectStudents,
      perfectStudentsCount: allPerfectStudents.length,
      perfectStudentsFormatted,
      // For backward compatibility
      perfectStudents: allPerfectStudents.slice(0, 4).map((item) => `${item.student.name} (100%)`),
    };
  }, [students, attendanceData, selectedYear, selectedMonthIndex]);

  // Calculate teacher attendance statistics from actual classroom teacher agenda data
  const teacherAgendaAnalytics = useMemo(() => {
    const monthStr = String(selectedMonthIndex + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthStr}`;

    // Filter agenda entries for the current active month and year
    const monthEntries = (teacherAgendaList || []).filter((e) => {
      if (!e.date) return true;
      return e.date.startsWith(monthPrefix);
    });

    const entries = monthEntries.length > 0 ? monthEntries : (teacherAgendaList || []);

    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        teacherNip?: string;
        total: number;
        hadir: number;
        telat: number;
        izin: number;
        sakit: number;
        alpa: number;
        tugas: number;
        tidakMasuk: number;
        subjects: string[];
      }
    >();

    entries.forEach((e) => {
      const rawName = (e.teacherName || '').trim();
      const rawSubject = (e.subject || '').trim();
      const name = rawName || rawSubject;
      if (!name) return;

      if (!teacherMap.has(name)) {
        teacherMap.set(name, {
          teacherName: name,
          teacherNip: e.teacherNip || '',
          total: 0,
          hadir: 0,
          telat: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
          tugas: 0,
          tidakMasuk: 0,
          subjects: [],
        });
      }

      const rec = teacherMap.get(name)!;
      rec.total += 1;
      if (rawSubject && !rec.subjects.includes(rawSubject)) {
        rec.subjects.push(rawSubject);
      }
      if (!rec.teacherNip && e.teacherNip) {
        rec.teacherNip = e.teacherNip;
      }

      if (e.status === 'Hadir') {
        rec.hadir += 1;
      } else if (e.status === 'Guru Telat Masuk' || e.status === 'Telat') {
        rec.telat += 1;
      } else if (e.status === 'Izin') {
        rec.izin += 1;
        rec.tidakMasuk += 1;
      } else if (e.status === 'Sakit') {
        rec.sakit += 1;
        rec.tidakMasuk += 1;
      } else if (e.status === 'Alpa') {
        rec.alpa += 1;
        rec.tidakMasuk += 1;
      } else if (e.status === 'Tugas') {
        rec.tugas += 1;
        rec.tidakMasuk += 1;
      }
    });

    const allTeachersStats = Array.from(teacherMap.values());

    // 1. Guru yang Sering Datang Terlambat
    const lateTeachers = allTeachersStats
      .filter((t) => t.telat > 0)
      .sort((a, b) => b.telat - a.telat || a.teacherName.localeCompare(b.teacherName));

    const totalLateCount = lateTeachers.reduce((sum, t) => sum + t.telat, 0);

    const formatLateSlots = (list: typeof lateTeachers): [string, string, string, string] => {
      if (list.length === 0) return ['', '', '', ''];
      if (list.length <= 4) {
        const res: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          res[idx] = `${item.teacherName} (${item.telat}x)`;
        });
        return res;
      }
      const perRow = Math.ceil(list.length / 4);
      const res: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const slice = list.slice(row * perRow, (row + 1) * perRow);
        res[row] = slice.map((item) => `${item.teacherName} (${item.telat}x)`).join(', ');
      }
      return res;
    };

    const lateTeachersFormatted = formatLateSlots(lateTeachers);

    // 2. Guru yang Sering Tidak Masuk (Izin, Sakit, Alpa, Tugas)
    const absentTeachers = allTeachersStats
      .filter((t) => t.tidakMasuk > 0)
      .sort((a, b) => b.tidakMasuk - a.tidakMasuk || a.teacherName.localeCompare(b.teacherName));

    const totalAbsentCount = absentTeachers.reduce((sum, t) => sum + t.tidakMasuk, 0);

    const formatAbsentSlots = (list: typeof absentTeachers): [string, string, string, string] => {
      if (list.length === 0) return ['', '', '', ''];
      if (list.length <= 4) {
        const res: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          res[idx] = `${item.teacherName} (${item.tidakMasuk}x)`;
        });
        return res;
      }
      const perRow = Math.ceil(list.length / 4);
      const res: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const slice = list.slice(row * perRow, (row + 1) * perRow);
        res[row] = slice.map((item) => `${item.teacherName} (${item.tidakMasuk}x)`).join(', ');
      }
      return res;
    };

    const absentTeachersFormatted = formatAbsentSlots(absentTeachers);

    // 3. Guru yang Masuk Terus / 100%
    const perfectTeachers = allTeachersStats
      .filter((t) => t.total > 0 && t.hadir === t.total && t.telat === 0 && t.tidakMasuk === 0)
      .sort((a, b) => b.hadir - a.hadir || a.teacherName.localeCompare(b.teacherName));

    const formatPerfectSlots = (list: typeof perfectTeachers): [string, string, string, string] => {
      if (list.length === 0) return ['', '', '', ''];
      if (list.length <= 4) {
        const res: [string, string, string, string] = ['', '', '', ''];
        list.forEach((item, idx) => {
          res[idx] = item.teacherName;
        });
        return res;
      }
      const perRow = Math.ceil(list.length / 4);
      const res: [string, string, string, string] = ['', '', '', ''];
      for (let row = 0; row < 4; row++) {
        const slice = list.slice(row * perRow, (row + 1) * perRow);
        res[row] = slice.map((item) => item.teacherName).join(', ');
      }
      return res;
    };

    const perfectTeachersFormatted = formatPerfectSlots(perfectTeachers);

    return {
      entriesCount: entries.length,
      allTeachersStats,
      lateTeachers,
      lateTeachersCount: lateTeachers.length,
      totalLateCount,
      lateTeachersFormatted,
      absentTeachers,
      absentTeachersCount: absentTeachers.length,
      totalAbsentCount,
      absentTeachersFormatted,
      perfectTeachers,
      perfectTeachersCount: perfectTeachers.length,
      perfectTeachersFormatted,
    };
  }, [teacherAgendaList, selectedYear, selectedMonthIndex]);

  // Handlers for Teacher Attendance Synchronization from Agenda
  const handleApplyAllLateTeachers = () => {
    handleDataChange({
      oftenLateTeachers: teacherAgendaAnalytics.lateTeachersFormatted,
    });
    showToast(
      `Berhasil mengisi ${teacherAgendaAnalytics.lateTeachersCount} guru sering datang terlambat dari agenda kelas!`
    );
  };

  const handleApplyAllAbsentTeachers = () => {
    handleDataChange({
      oftenAbsentTeachers: teacherAgendaAnalytics.absentTeachersFormatted,
    });
    showToast(
      `Berhasil mengisi ${teacherAgendaAnalytics.absentTeachersCount} guru sering tidak masuk dari agenda kelas!`
    );
  };

  const handleApplyAllPerfectTeachers = () => {
    handleDataChange({
      perfectAttendanceTeachers: teacherAgendaAnalytics.perfectTeachersFormatted,
    });
    showToast(
      `Berhasil mengisi ${teacherAgendaAnalytics.perfectTeachersCount} guru hadir 100% dari agenda kelas!`
    );
  };

  const handleSyncAllTeachersFromAgenda = () => {
    handleDataChange({
      oftenLateTeachers: teacherAgendaAnalytics.lateTeachersFormatted,
      oftenAbsentTeachers: teacherAgendaAnalytics.absentTeachersFormatted,
      perfectAttendanceTeachers: teacherAgendaAnalytics.perfectTeachersFormatted,
    });
    showToast(
      `Sinkronisasi Agenda Guru Sukses: ${teacherAgendaAnalytics.lateTeachersCount} Terlambat, ${teacherAgendaAnalytics.absentTeachersCount} Tidak Masuk, ${teacherAgendaAnalytics.perfectTeachersCount} Hadir 100%!`
    );
  };

  // Handlers for Absent students
  const handleApplyAllAbsentStudents = () => {
    handleDataChange({
      oftenAbsentStudents: attendanceAnalytics.absentStudentsFormatted,
    });
    showToast(
      `Seluruh ${attendanceAnalytics.absentStudentsCount} siswa alpa berhasil dimasukkan ke form laporan!`
    );
  };

  const handleApplyFirst4AbsentStudents = () => {
    const updated: [string, string, string, string] = ['', '', '', ''];
    attendanceAnalytics.allAbsentStudents.slice(0, 4).forEach((item, i) => {
      updated[i] = `${item.student.name} (${item.a}x)`;
    });
    handleDataChange({ oftenAbsentStudents: updated });
    showToast('4 Siswa alpa terbanyak dimasukkan ke form laporan.');
  };

  // Handlers for Sick students
  const handleApplyAllSickStudents = () => {
    handleDataChange({
      oftenSickStudents: attendanceAnalytics.sickStudentsFormatted,
    });
    showToast(
      `Seluruh ${attendanceAnalytics.sickStudentsCount} siswa sakit berhasil dimasukkan ke form laporan!`
    );
  };

  const handleApplyFirst4SickStudents = () => {
    const updated: [string, string, string, string] = ['', '', '', ''];
    attendanceAnalytics.allSickStudents.slice(0, 4).forEach((item, i) => {
      updated[i] = `${item.student.name} (${item.s}x)`;
    });
    handleDataChange({ oftenSickStudents: updated });
    showToast('4 Siswa sakit terbanyak dimasukkan ke form laporan.');
  };

  // Handlers for Permission/Izin students
  const handleApplyAllPermissionStudents = () => {
    handleDataChange({
      oftenLateOrPermissionStudents: attendanceAnalytics.permissionStudentsFormatted,
    });
    showToast(
      `Seluruh ${attendanceAnalytics.permissionStudentsCount} siswa izin/terlambat berhasil dimasukkan ke form laporan!`
    );
  };

  const handleApplyFirst4PermissionStudents = () => {
    const updated: [string, string, string, string] = ['', '', '', ''];
    attendanceAnalytics.allPermissionStudents.slice(0, 4).forEach((item, i) => {
      updated[i] = `${item.student.name} (${item.i}x)`;
    });
    handleDataChange({ oftenLateOrPermissionStudents: updated });
    showToast('4 Siswa izin terbanyak dimasukkan ke form laporan.');
  };

  // Handlers for Perfect attendance students
  const handleApplyAllPerfectStudents = () => {
    handleDataChange({
      perfectAttendanceStudents: attendanceAnalytics.perfectStudentsFormatted,
    });
    showToast(
      `Seluruh ${attendanceAnalytics.perfectStudentsCount} siswa hadir 100% berhasil dimasukkan ke form laporan!`
    );
  };

  const handleApplyFirst4PerfectStudents = () => {
    const updated: [string, string, string, string] = ['', '', '', ''];
    attendanceAnalytics.allPerfectStudents.slice(0, 4).forEach((item, i) => {
      updated[i] = item.student.name;
    });
    handleDataChange({ perfectAttendanceStudents: updated });
    showToast('4 Siswa hadir 100% pertama dimasukkan ke form laporan.');
  };

  // Auto-fill from actual attendance calculations & teacher agenda (Full & complete accommodation)
  const handleAutoFillFromAttendance = () => {
    handleDataChange({
      attendancePercentage: attendanceAnalytics.overallPercentage,
      oftenAbsentStudents: attendanceAnalytics.absentStudentsFormatted,
      oftenSickStudents: attendanceAnalytics.sickStudentsFormatted,
      oftenLateOrPermissionStudents: attendanceAnalytics.permissionStudentsFormatted,
      perfectAttendanceStudents: attendanceAnalytics.perfectStudentsFormatted,
      oftenLateTeachers: teacherAgendaAnalytics.lateTeachersFormatted,
      oftenAbsentTeachers: teacherAgendaAnalytics.absentTeachersFormatted,
      perfectAttendanceTeachers: teacherAgendaAnalytics.perfectTeachersFormatted,
    });

    showToast(
      `Sinkronisasi Lengkap Sukses: Siswa (${attendanceAnalytics.absentStudentsCount} Alpa, ${attendanceAnalytics.sickStudentsCount} Sakit, ${attendanceAnalytics.perfectStudentsCount} Hadir 100%) & Guru (${teacherAgendaAnalytics.lateTeachersCount} Terlambat, ${teacherAgendaAnalytics.absentTeachersCount} Tidak Masuk, ${teacherAgendaAnalytics.perfectTeachersCount} Hadir 100%)!`
    );
  };

  // Reset report
  const handleResetReport = () => {
    const performReset = () => {
      const resetData = getDefaultReport();
      setFormData(resetData);
      localStorage.removeItem(localKey);
      saveHomeroomReportToCloud(monthKey, resetData);
      showToast('Laporan bulanan telah dikosongkan/direset.');
    };

    if (onRequestConfirmation) {
      onRequestConfirmation({
        title: 'Konfirmasi Reset Laporan Wali Kelas',
        message: (
          <div>
            <p className="font-bold text-rose-800 text-xs sm:text-sm">
              Apakah Anda yakin ingin mengosongkan laporan bulan {selectedMonthName} {selectedYear}?
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Seluruh isian nomor 1 sampai 11 pada formulir ini akan dikosongkan.
            </p>
          </div>
        ),
        confirmText: 'Ya, Kosongkan Form',
        cancelText: 'Batal',
        variant: 'warning',
        icon: 'reset',
        onConfirm: performReset,
      });
    } else {
      performReset();
    }
  };

  // Copy structured report to WhatsApp
  const handleCopyWhatsApp = () => {
    const text = `*LAPORAN BULANAN WALI KELAS ${formData.schoolName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
*NAMA WALI KELAS* : ${formData.homeroomTeacher || '-'}
*KETUA KELAS* : ${formData.classLeader || '-'}
*JURUSAN/KELAS* : ${formData.majorClass || '-'}
*BULAN* : ${formData.month || '-'}

1. *Prosentase kehadiran siswa bulan ini* : ${formData.attendancePercentage || '0'} %
2. *Siswa yang sering terlambat* :
   1. ${formData.oftenLateStudents[0] || '-'}   2. ${formData.oftenLateStudents[1] || '-'}
   3. ${formData.oftenLateStudents[2] || '-'}   4. ${formData.oftenLateStudents[3] || '-'}

3. *Siswa yang sering alpa/tidak masuk*${attendanceAnalytics.absentStudentsCount > 0 ? ` (Total: ${attendanceAnalytics.absentStudentsCount} Siswa - ${attendanceAnalytics.totalAbsentDays} Hari)` : ''} :
   1. ${formData.oftenAbsentStudents[0] || '-'}   2. ${formData.oftenAbsentStudents[1] || '-'}
   3. ${formData.oftenAbsentStudents[2] || '-'}   4. ${formData.oftenAbsentStudents[3] || '-'}

4. *Siswa yang sering sakit*${attendanceAnalytics.sickStudentsCount > 0 ? ` (Total: ${attendanceAnalytics.sickStudentsCount} Siswa - ${attendanceAnalytics.totalSickDays} Hari)` : ''} :
   1. ${formData.oftenSickStudents[0] || '-'}   2. ${formData.oftenSickStudents[1] || '-'}
   3. ${formData.oftenSickStudents[2] || '-'}   4. ${formData.oftenSickStudents[3] || '-'}

5. *Siswa yang sering izin/terlambat*${attendanceAnalytics.permissionStudentsCount > 0 ? ` (Total: ${attendanceAnalytics.permissionStudentsCount} Siswa - ${attendanceAnalytics.totalPermissionDays} Hari)` : ''} :
   1. ${formData.oftenLateOrPermissionStudents[0] || '-'}   2. ${formData.oftenLateOrPermissionStudents[1] || '-'}
   3. ${formData.oftenLateOrPermissionStudents[2] || '-'}   4. ${formData.oftenLateOrPermissionStudents[3] || '-'}

6. *Siswa masuk terus/hadir 100 %*${attendanceAnalytics.perfectStudentsCount > 0 ? ` (Total: ${attendanceAnalytics.perfectStudentsCount} Siswa)` : ''} :
   1. ${formData.perfectAttendanceStudents[0] || '-'}   2. ${formData.perfectAttendanceStudents[1] || '-'}
   3. ${formData.perfectAttendanceStudents[2] || '-'}   4. ${formData.perfectAttendanceStudents[3] || '-'}

7. *Guru yang sering datang terlambat* :
   1. ${formData.oftenLateTeachers[0] || '-'}   2. ${formData.oftenLateTeachers[1] || '-'}
   3. ${formData.oftenLateTeachers[2] || '-'}   4. ${formData.oftenLateTeachers[3] || '-'}

8. *Guru yang sering tidak masuk* :
   1. ${formData.oftenAbsentTeachers[0] || '-'}   2. ${formData.oftenAbsentTeachers[1] || '-'}
   3. ${formData.oftenAbsentTeachers[2] || '-'}   4. ${formData.oftenAbsentTeachers[3] || '-'}

9. *Guru yang masuk terus /100 %* :
   1. ${formData.perfectAttendanceTeachers[0] || '-'}   2. ${formData.perfectAttendanceTeachers[1] || '-'}
   3. ${formData.perfectAttendanceTeachers[2] || '-'}   4. ${formData.perfectAttendanceTeachers[3] || '-'}

10. *Kasus yang up-date bulan ini dan penanganannya* :
    a. ${formData.monthlyCases[0] || '-'}
    b. ${formData.monthlyCases[1] || '-'}

11. *Penilaian sendiri/Self evaluation wali kelas tentang disiplin, tugas mengajar, pendampingan dengan siswa* :
    a. ${formData.selfEvaluation[0] || '-'}
    b. ${formData.selfEvaluation[1] || '-'}

━━━━━━━━━━━━━━━━━━━━
_${formData.signatureLocation}, ${formData.signatureDate}_

*Wali Kelas:* ${formData.homeroomTeacher}
*Ketua Kelas:* ${formData.classLeader || '....................'}
*Mengetahui Ketua Jurusan:* ${formData.headOfDepartment || '....................'}

_Catatan: lampirkan absensi bulanan siswa_`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    showToast('Laporan berhasil disalin ke clipboard! Siap ditempel di WhatsApp.');
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleExportWord = () => {
    exportHomeroomReportToWord(formData, schoolSettings, {
      perfectStudentsCount: attendanceAnalytics.perfectStudentsCount,
      overallPercentage: attendanceAnalytics.overallPercentage,
      absentStudentsCount: attendanceAnalytics.absentStudentsCount,
      sickStudentsCount: attendanceAnalytics.sickStudentsCount,
      permissionStudentsCount: attendanceAnalytics.permissionStudentsCount,
    });
    showToast('Laporan Word (.doc) berhasil diunduh!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Toolbar / Action Bar (Hidden in Print) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Title & Month Nav */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 bg-blue-900 text-white rounded-xl shadow-xs">
              <FileText className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  Laporan Bulanan Wali Kelas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Formulir Resmi
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sesuai format dokumen fisik SMKS Nusantara 1 Ciputat & Terhubung Cloud Database
              </p>
            </div>
          </div>

          {/* Center: Month Selector Quick Switch */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {onPrevMonth && (
              <button
                onClick={onPrevMonth}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-blue-900 rounded-lg transition-all cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="px-3 py-1 bg-white font-extrabold text-xs text-blue-900 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {selectedMonthName} {selectedYear}
              </span>
            </div>
            {onNextMonth && (
              <button
                onClick={onNextMonth}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-blue-900 rounded-lg transition-all cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {onGoToCurrentMonth && (
              <button
                onClick={onGoToCurrentMonth}
                className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                title="Kembali ke Bulan Sekarang"
              >
                Hari Ini
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            <button
              onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            >
              {viewMode === 'edit' ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-blue-700" />
                  <span>Lihat Kertas A4</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mode Isian Form</span>
                </>
              )}
            </button>

            <button
              onClick={handleAutoFillFromAttendance}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white shadow-xs transition-all cursor-pointer active:scale-95"
              title="Hitung persentase kehadiran kelas, rangkum siswa alpa, sakit, 100% hadir, serta sinkronkan status agenda guru terlambat, tidak masuk, dan hadir 100%"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Auto-Isi dari Absensi & Agenda</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
              title="Salin laporan berformat rapi untuk dikirim via WhatsApp"
            >
              {copySuccess ? (
                <Check className="w-3.5 h-3.5 text-yellow-300" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-yellow-300" />
              )}
              <span>{copySuccess ? 'Tersalin!' : 'Salin WA'}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-blue-800 hover:bg-blue-900 text-white shadow-xs transition-all cursor-pointer active:scale-95 border border-blue-700"
              title="Download format Microsoft Word (.doc) yang rapi & siap diedit"
            >
              <Download className="w-3.5 h-3.5 text-yellow-300" />
              <span>Word (.doc)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all cursor-pointer active:scale-95"
              title="Cetak format fisik A4 / Simpan PDF persis seperti formulir asli"
            >
              <Printer className="w-3.5 h-3.5 text-yellow-300" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={handleResetReport}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
              title="Reset isian form bulan ini"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Analytics Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Hari Efektif Aktif:{' '}
              <strong className="text-slate-800">{attendanceAnalytics.activeDaysCount} Hari</strong>
            </span>
            <span>
              Total Siswa Terdaftar:{' '}
              <strong className="text-slate-800">{students.length} Siswa</strong>
            </span>
            <span>
              Kalkulasi Kehadiran Kelas:{' '}
              <strong className="text-blue-900 font-black">
                {attendanceAnalytics.overallPercentage}%
              </strong>
            </span>
            <span>
              Agenda Guru Kelas:{' '}
              <strong className="text-indigo-900 font-black">
                {teacherAgendaAnalytics.entriesCount} Sesi Terpantau
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved'
                  ? 'bg-emerald-500'
                  : saveStatus === 'saving'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-slate-500 text-[10px]">
              {saveStatus === 'saving'
                ? 'Menyimpan perubahan...'
                : saveStatus === 'saved'
                ? 'Tersimpan otomatis di Cloud'
                : 'Siap'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EDIT MODE INTERACTIVE FORM (Easy to fill & responsive) */}
      {/* ========================================================================= */}
      {viewMode === 'edit' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-7 space-y-7 print:hidden">
          {/* Form Items 1 to 11 */}
          <div className="space-y-6">
            {/* Item 1: Prosentase Kehadiran */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                    1
                  </span>
                  <span>Prosentase Kehadiran Siswa Bulan Ini</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleDataChange({
                      attendancePercentage: attendanceAnalytics.overallPercentage,
                    })
                  }
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Isi Kalkulasi Sistem ({attendanceAnalytics.overallPercentage}%)
                </button>
              </div>

              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  value={formData.attendancePercentage || ''}
                  onChange={(e) => handleDataChange({ attendancePercentage: e.target.value })}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-blue-900 text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
                  placeholder="95.5"
                />
                <span className="font-black text-base text-slate-700">%</span>
              </div>
            </div>

            {/* Item 2: Siswa Sering Terlambat */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>Siswa yang Sering Terlambat</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-slate-500 text-xs">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenLateStudents[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenLateStudents] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenLateStudents: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                      placeholder={`Nama Siswa ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 3: Siswa Sering Alpa / Tidak Masuk */}
            <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-700 text-white flex items-center justify-center text-[11px] font-bold">
                      3
                    </span>
                    <span>Siswa yang Sering Alpa / Tidak Masuk</span>
                  </label>
                  {attendanceAnalytics.absentStudentsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                      Total: {attendanceAnalytics.absentStudentsCount} Siswa ({attendanceAnalytics.totalAbsentDays} Hari Alpa)
                    </span>
                  )}
                </div>

                {attendanceAnalytics.absentStudentsCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('absent')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-800 border border-rose-300 hover:bg-rose-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-rose-600" />
                      <span>Lihat Daftar ({attendanceAnalytics.absentStudentsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllAbsentStudents}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil Semua ({attendanceAnalytics.absentStudentsCount} Siswa)</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {attendanceAnalytics.absentStudentsCount > 4
                  ? `💡 Terdeteksi ${attendanceAnalytics.absentStudentsCount} siswa memiliki catatan alpa (${attendanceAnalytics.totalAbsentDays} total hari). Saat tombol 'Ambil Semua' diklik, seluruh ${attendanceAnalytics.absentStudentsCount} nama siswa didistribusikan merata ke 4 baris formulir di bawah.`
                  : attendanceAnalytics.absentStudentsCount > 0
                  ? `💡 Terdeteksi ${attendanceAnalytics.absentStudentsCount} siswa tercatat alpa (${attendanceAnalytics.totalAbsentDays} hari). Klik 'Ambil Semua' untuk mengisi otomatis.`
                  : 'Isikan atau ambil otomatis nama-nama siswa yang tercatat alpa/tidak masuk.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-rose-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenAbsentStudents[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenAbsentStudents] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenAbsentStudents: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-hidden"
                      placeholder={`Nama Siswa Alpa (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 4: Siswa Sering Sakit */}
            <div className="p-4 rounded-2xl bg-white border border-sky-200 bg-sky-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-700 text-white flex items-center justify-center text-[11px] font-bold">
                      4
                    </span>
                    <span>Siswa yang Sering Sakit</span>
                  </label>
                  {attendanceAnalytics.sickStudentsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                      Total: {attendanceAnalytics.sickStudentsCount} Siswa ({attendanceAnalytics.totalSickDays} Hari Sakit)
                    </span>
                  )}
                </div>

                {attendanceAnalytics.sickStudentsCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('sick')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-sky-800 border border-sky-300 hover:bg-sky-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-sky-600" />
                      <span>Lihat Daftar ({attendanceAnalytics.sickStudentsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllSickStudents}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-700 hover:bg-sky-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil Semua ({attendanceAnalytics.sickStudentsCount} Siswa)</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {attendanceAnalytics.sickStudentsCount > 4
                  ? `💡 Terdeteksi ${attendanceAnalytics.sickStudentsCount} siswa memiliki catatan sakit (${attendanceAnalytics.totalSickDays} total hari). Saat tombol 'Ambil Semua' diklik, seluruh ${attendanceAnalytics.sickStudentsCount} nama siswa didistribusikan merata ke 4 baris formulir di bawah.`
                  : attendanceAnalytics.sickStudentsCount > 0
                  ? `💡 Terdeteksi ${attendanceAnalytics.sickStudentsCount} siswa tercatat sakit (${attendanceAnalytics.totalSickDays} hari). Klik 'Ambil Semua' untuk mengisi otomatis.`
                  : 'Isikan atau ambil otomatis nama-nama siswa yang tercatat sakit.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-sky-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenSickStudents[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenSickStudents] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenSickStudents: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 outline-hidden"
                      placeholder={`Nama Siswa Sakit (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 5: Siswa Sering Terlambat / Izin */}
            <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-[11px] font-bold">
                      5
                    </span>
                    <span>Siswa yang Sering Terlambat / Izin</span>
                  </label>
                  {attendanceAnalytics.permissionStudentsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                      Total: {attendanceAnalytics.permissionStudentsCount} Siswa ({attendanceAnalytics.totalPermissionDays} Hari Izin)
                    </span>
                  )}
                </div>

                {attendanceAnalytics.permissionStudentsCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('permission')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-amber-600" />
                      <span>Lihat Daftar ({attendanceAnalytics.permissionStudentsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllPermissionStudents}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil Semua ({attendanceAnalytics.permissionStudentsCount} Siswa)</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {attendanceAnalytics.permissionStudentsCount > 4
                  ? `💡 Terdeteksi ${attendanceAnalytics.permissionStudentsCount} siswa memiliki catatan izin/terlambat (${attendanceAnalytics.totalPermissionDays} total hari). Saat tombol 'Ambil Semua' diklik, seluruh ${attendanceAnalytics.permissionStudentsCount} nama siswa didistribusikan merata ke 4 baris formulir di bawah.`
                  : attendanceAnalytics.permissionStudentsCount > 0
                  ? `💡 Terdeteksi ${attendanceAnalytics.permissionStudentsCount} siswa tercatat izin/terlambat (${attendanceAnalytics.totalPermissionDays} hari). Klik 'Ambil Semua' untuk mengisi otomatis.`
                  : 'Isikan atau ambil otomatis nama-nama siswa yang tercatat izin/terlambat.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-amber-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenLateOrPermissionStudents[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenLateOrPermissionStudents] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenLateOrPermissionStudents: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                      placeholder={`Nama Siswa Izin / Terlambat (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 6: Siswa Masuk Terus / Hadir 100% */}
            <div className="p-4 rounded-2xl bg-white border-2 border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-bold">
                      6
                    </span>
                    <span>Siswa Masuk Terus / Hadir 100 %</span>
                  </label>
                  {attendanceAnalytics.perfectStudentsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Total: {attendanceAnalytics.perfectStudentsCount} Siswa
                    </span>
                  )}
                </div>

                {attendanceAnalytics.perfectStudentsCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('perfect')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-emerald-600" />
                      <span>Lihat Daftar ({attendanceAnalytics.perfectStudentsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllPerfectStudents}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil Semua ({attendanceAnalytics.perfectStudentsCount} Siswa)</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {attendanceAnalytics.perfectStudentsCount > 4
                  ? `💡 Terdeteksi ${attendanceAnalytics.perfectStudentsCount} siswa hadir 100%. Saat tombol 'Ambil Semua' diklik, seluruh ${attendanceAnalytics.perfectStudentsCount} nama siswa didistribusikan merata ke 4 baris formulir di bawah.`
                  : 'Isikan atau ambil otomatis nama-nama siswa yang selalu hadir 100% tanpa catatan alpa/sakit/izin.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-emerald-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.perfectAttendanceStudents[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.perfectAttendanceStudents] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ perfectAttendanceStudents: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      placeholder={`Nama Siswa Hadir 100% (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Bar: Agenda Kehadiran Guru di Kelas */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-slate-50 border border-indigo-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span>Sinkronisasi Agenda Guru di Kelas</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {teacherAgendaAnalytics.entriesCount} Sesi Terpantau
                      </span>
                    </h4>
                    <p className="text-[11px] text-indigo-900/80 font-medium">
                      Status kehadiran guru otomatis disinkronkan dari Agenda Guru di Kelas ke Item 7, 8, dan 9.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAllTeachersFromAgenda}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-700 hover:bg-indigo-800 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Singkronkan sekaligus Guru Terlambat, Guru Tidak Masuk, dan Guru Hadir 100% dari Agenda Kelas"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Singkron Semua Agenda Guru</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Terlambat: {teacherAgendaAnalytics.lateTeachersCount} Guru ({teacherAgendaAnalytics.totalLateCount}x)</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-900 font-bold flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                  <span>Tidak Masuk: {teacherAgendaAnalytics.absentTeachersCount} Guru ({teacherAgendaAnalytics.totalAbsentCount}x)</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hadir 100%: {teacherAgendaAnalytics.perfectTeachersCount} Guru</span>
                </span>
              </div>
            </div>

            {/* Item 7: Guru Sering Datang Terlambat */}
            <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">
                      7
                    </span>
                    <span>Guru yang Sering Datang Terlambat</span>
                  </label>
                  {teacherAgendaAnalytics.lateTeachersCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      Total: {teacherAgendaAnalytics.lateTeachersCount} Guru ({teacherAgendaAnalytics.totalLateCount}x Terlambat)
                    </span>
                  )}
                </div>

                {teacherAgendaAnalytics.lateTeachersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('late_teachers')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-amber-600" />
                      <span>Lihat Daftar ({teacherAgendaAnalytics.lateTeachersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllLateTeachers}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil dari Agenda ({teacherAgendaAnalytics.lateTeachersCount})</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {teacherAgendaAnalytics.lateTeachersCount > 0
                  ? `💡 Terdeteksi ${teacherAgendaAnalytics.lateTeachersCount} guru terlambat (${teacherAgendaAnalytics.totalLateCount}x) pada agenda kelas bulan ini. Klik 'Ambil dari Agenda' untuk mengisi otomatis.`
                  : 'Tidak ada catatan guru terlambat di agenda kelas bulan ini, atau isikan manual nama guru.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-amber-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenLateTeachers[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenLateTeachers] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenLateTeachers: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                      placeholder={`Nama Guru Terlambat (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 8: Guru yang Sering Tidak Masuk */}
            <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-700 text-white flex items-center justify-center text-[11px] font-bold">
                      8
                    </span>
                    <span>Guru yang Sering Tidak Masuk</span>
                  </label>
                  {teacherAgendaAnalytics.absentTeachersCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                      Total: {teacherAgendaAnalytics.absentTeachersCount} Guru ({teacherAgendaAnalytics.totalAbsentCount}x Tidak Masuk)
                    </span>
                  )}
                </div>

                {teacherAgendaAnalytics.absentTeachersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('absent_teachers')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-900 border border-rose-300 hover:bg-rose-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-rose-600" />
                      <span>Lihat Daftar ({teacherAgendaAnalytics.absentTeachersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllAbsentTeachers}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil dari Agenda ({teacherAgendaAnalytics.absentTeachersCount})</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {teacherAgendaAnalytics.absentTeachersCount > 0
                  ? `💡 Terdeteksi ${teacherAgendaAnalytics.absentTeachersCount} guru tidak masuk/izin/sakit/alpa (${teacherAgendaAnalytics.totalAbsentCount}x) pada agenda kelas bulan ini. Klik 'Ambil dari Agenda' untuk mengisi otomatis.`
                  : 'Tidak ada catatan guru tidak masuk di agenda kelas bulan ini, atau isikan manual nama guru.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-rose-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.oftenAbsentTeachers[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.oftenAbsentTeachers] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ oftenAbsentTeachers: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-hidden"
                      placeholder={`Nama Guru Tidak Masuk (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 9: Guru yang Masuk Terus / 100% */}
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/10 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-bold">
                      9
                    </span>
                    <span>Guru yang Masuk Terus / 100 %</span>
                  </label>
                  {teacherAgendaAnalytics.perfectTeachersCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Total: {teacherAgendaAnalytics.perfectTeachersCount} Guru (Hadir 100%)
                    </span>
                  )}
                </div>

                {teacherAgendaAnalytics.perfectTeachersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveDetailModal('perfect_teachers')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3 h-3 text-emerald-600" />
                      <span>Lihat Daftar ({teacherAgendaAnalytics.perfectTeachersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllPerfectTeachers}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Ambil dari Agenda ({teacherAgendaAnalytics.perfectTeachersCount})</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {teacherAgendaAnalytics.perfectTeachersCount > 0
                  ? `💡 Terdeteksi ${teacherAgendaAnalytics.perfectTeachersCount} guru hadir 100% tanpa terlambat/izin pada agenda kelas bulan ini. Klik 'Ambil dari Agenda' untuk mengisi otomatis.`
                  : 'Belum ada data guru hadir 100% dari agenda kelas, atau isikan manual nama guru.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-emerald-700 text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={formData.perfectAttendanceTeachers[idx] || ''}
                      onChange={(e) => {
                        const updated = [...formData.perfectAttendanceTeachers] as [
                          string,
                          string,
                          string,
                          string
                        ];
                        updated[idx] = e.target.value;
                        handleDataChange({ perfectAttendanceTeachers: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      placeholder={`Nama Guru Hadir 100% (Baris ${idx + 1})`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Item 10: Kasus yang Update Bulan Ini dan Penanganannya */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                  10
                </span>
                <span>Kasus yang Up-date Bulan Ini dan Penanganannya</span>
              </label>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="w-6 text-center font-bold text-slate-700 text-xs pt-2">
                    a.
                  </span>
                  <textarea
                    rows={2}
                    value={formData.monthlyCases[0] || ''}
                    onChange={(e) => {
                      const updated = [...formData.monthlyCases] as [string, string];
                      updated[0] = e.target.value;
                      handleDataChange({ monthlyCases: updated });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Uraikan kasus pertama dan tindak lanjut/solusinya..."
                  />
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-6 text-center font-bold text-slate-700 text-xs pt-2">
                    b.
                  </span>
                  <textarea
                    rows={2}
                    value={formData.monthlyCases[1] || ''}
                    onChange={(e) => {
                      const updated = [...formData.monthlyCases] as [string, string];
                      updated[1] = e.target.value;
                      handleDataChange({ monthlyCases: updated });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Uraikan kasus kedua dan tindak lanjut/solusinya..."
                  />
                </div>
              </div>
            </div>

            {/* Item 11: Penilaian Sendiri / Self Evaluation */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <label className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                  11
                </span>
                <span>
                  Penilaian Sendiri / Self Evaluation Wali Kelas tentang Disiplin, Tugas Mengajar,
                  Pendampingan dengan Siswa
                </span>
              </label>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="w-6 text-center font-bold text-slate-700 text-xs pt-2">
                    a.
                  </span>
                  <textarea
                    rows={2}
                    value={formData.selfEvaluation[0] || ''}
                    onChange={(e) => {
                      const updated = [...formData.selfEvaluation] as [string, string];
                      updated[0] = e.target.value;
                      handleDataChange({ selfEvaluation: updated });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Evaluasi diri terkait disiplin dan pelaksanaan tugas mengajar..."
                  />
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-6 text-center font-bold text-slate-700 text-xs pt-2">
                    b.
                  </span>
                  <textarea
                    rows={2}
                    value={formData.selfEvaluation[1] || ''}
                    onChange={(e) => {
                      const updated = [...formData.selfEvaluation] as [string, string];
                      updated[1] = e.target.value;
                      handleDataChange({ selfEvaluation: updated });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Evaluasi diri terkait komunikasi dan pendampingan siswa/orang tua..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AUTHENTIC A4 PAPER FORMAT (Matches Physical Document Image Exactly) */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 12mm 15mm !important;
          }
        }
      `}</style>
      <div
        className={`bg-white text-black p-8 sm:p-12 shadow-xl border border-slate-300 rounded-xl max-w-4xl mx-auto font-sans leading-normal print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none ${
          viewMode === 'edit' ? 'hidden print:block' : 'block'
        }`}
        style={{
          fontFamily: '"Times New Roman", Times, serif, Arial, sans-serif',
          color: '#000000',
        }}
      >
        {/* Document Header / Title */}
        <div className="text-center mb-6">
          <h1 className="font-bold text-base sm:text-lg tracking-wide uppercase underline decoration-1 underline-offset-4">
            LAPORAN BULANAN WALI KELAS {(schoolSettings.schoolName || formData.schoolName).toUpperCase()}
          </h1>
        </div>

        {/* Top Info Grid with clean formal underlines */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-xs sm:text-sm">
          <div className="flex items-center">
            <span className="w-36 font-semibold shrink-0">NAMA WALI KELAS</span>
            <span className="mr-2">:</span>
            <span className="font-semibold border-b border-black flex-1 min-h-[20px]">
              {schoolSettings.teacherName || formData.homeroomTeacher || '...................................................'}
            </span>
          </div>

          <div className="flex items-center">
            <span className="w-28 font-semibold shrink-0">KETUA KELAS</span>
            <span className="mr-2">:</span>
            <span className="font-semibold border-b border-black flex-1 min-h-[20px]">
              {schoolSettings.classLeader || formData.classLeader || '...................................................'}
            </span>
          </div>

          <div className="flex items-center">
            <span className="w-36 font-semibold shrink-0">JURUSAN/KELAS</span>
            <span className="mr-2">:</span>
            <span className="font-semibold border-b border-black flex-1 min-h-[20px]">
              {schoolSettings.className || formData.majorClass || '...................................................'}
            </span>
          </div>

          <div className="flex items-center">
            <span className="w-28 font-semibold shrink-0">BULAN</span>
            <span className="mr-2">:</span>
            <span className="font-semibold border-b border-black flex-1 min-h-[20px]">
              {formData.month || `${selectedMonthName} ${selectedYear}`}
            </span>
          </div>
        </div>

        {/* Numbered Items 1 - 11 */}
        <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed">
          {/* 1. Prosentase kehadiran */}
          <div className="flex items-baseline">
            <span className="w-6 shrink-0 font-normal">1.</span>
            <span className="font-normal mr-2">Prosentase kehadiran siswa bulan ini</span>
            <span className="mr-2">:</span>
            <span className="border-b border-black px-3 font-bold min-w-[50px] text-center inline-block">
              {formData.attendancePercentage || '____'}
            </span>
            <span className="ml-1">%</span>
          </div>

          {/* 2. Siswa yang sering terlambat */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">2.</span>
              <span className="w-56 shrink-0">Siswa yang sering terlambat</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateStudents[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateStudents[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateStudents[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateStudents[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Siswa yang sering alpa/tidak masuk */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">3.</span>
              <span className="w-56 shrink-0">Siswa yang sering alpa/tidak masuk</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentStudents[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentStudents[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentStudents[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentStudents[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Siswa yang sering sakit */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">4.</span>
              <span className="w-56 shrink-0">Siswa yang sering sakit</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenSickStudents[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenSickStudents[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenSickStudents[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenSickStudents[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Siswa yang sering terlambat / izin */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">5.</span>
              <span className="w-56 shrink-0">Siswa yang sering terlambat / izin</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateOrPermissionStudents[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateOrPermissionStudents[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateOrPermissionStudents[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateOrPermissionStudents[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Siswa masuk terus / hadir 100% */}
          <div>
            <div className="flex items-start mb-1">
              <span className="w-6 shrink-0 font-normal">6.</span>
              <span className="w-56 shrink-0">
                <span>Siswa masuk terus/hadir 100 %</span>
                {attendanceAnalytics.perfectStudentsCount > 0 && (
                  <span className="text-[11px] font-bold text-emerald-800 block">
                    (Total: {attendanceAnalytics.perfectStudentsCount} Siswa)
                  </span>
                )}
              </span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div className="flex items-start">
                  <span className="w-4 shrink-0 font-medium">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px] text-[12px] leading-tight pb-0.5 break-words">
                    {formData.perfectAttendanceStudents[0]}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-4 shrink-0 font-medium">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px] text-[12px] leading-tight pb-0.5 break-words">
                    {formData.perfectAttendanceStudents[1]}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-4 shrink-0 font-medium">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px] text-[12px] leading-tight pb-0.5 break-words">
                    {formData.perfectAttendanceStudents[2]}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-4 shrink-0 font-medium">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px] text-[12px] leading-tight pb-0.5 break-words">
                    {formData.perfectAttendanceStudents[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Guru yang sering datang terlambat */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">7.</span>
              <span className="w-56 shrink-0">Guru yang sering datang terlambat</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateTeachers[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateTeachers[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateTeachers[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenLateTeachers[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Guru yang sering tidak masuk */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">8.</span>
              <span className="w-56 shrink-0">Guru yang sering tidak masuk</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentTeachers[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentTeachers[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentTeachers[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.oftenAbsentTeachers[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 9. Guru yang masuk terus / 100 % */}
          <div>
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">9.</span>
              <span className="w-56 shrink-0">Guru yang masuk terus /100 %</span>
              <span className="mr-2">:</span>
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-baseline">
                  <span className="w-4">1.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.perfectAttendanceTeachers[0]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">2.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.perfectAttendanceTeachers[1]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">3.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.perfectAttendanceTeachers[2]}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-4">4.</span>
                  <span className="border-b border-dotted border-black flex-1 min-h-[18px]">
                    {formData.perfectAttendanceTeachers[3]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 10. Kasus yang up-date bulan ini dan penanganannya */}
          <div className="pt-1">
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">10.</span>
              <span className="font-semibold">
                Kasus yang up-date bulan ini dan penanganannya :
              </span>
            </div>
            <div className="ml-6 space-y-1.5">
              <div className="flex items-start">
                <span className="w-5 shrink-0">a.</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[20px]">
                  {formData.monthlyCases[0]}
                </span>
              </div>
              <div className="flex items-start">
                <span className="w-5 shrink-0">b.</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[20px]">
                  {formData.monthlyCases[1]}
                </span>
              </div>
            </div>
          </div>

          {/* 11. Penilaian sendiri / Self evaluation wali kelas */}
          <div className="pt-1">
            <div className="flex items-baseline mb-1">
              <span className="w-6 shrink-0">11.</span>
              <span className="font-semibold">
                Penilaian sendiri/Self evaluation wali kelas tentang disiplin, tugas mengajar,
                pendampingan dengan siswa :
              </span>
            </div>
            <div className="ml-6 space-y-1.5">
              <div className="flex items-start">
                <span className="w-5 shrink-0">a.</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[20px]">
                  {formData.selfEvaluation[0]}
                </span>
              </div>
              <div className="flex items-start">
                <span className="w-5 shrink-0">b.</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[20px]">
                  {formData.selfEvaluation[1]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="mt-12 pt-4">
          <div className="text-right mb-2 text-xs sm:text-sm">
            <span>
              {formData.signatureLocation || schoolSettings.locationName || 'Tangerang Selatan'},{' '}
              {formData.signatureDate || `${selectedMonthName} ${selectedYear}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center text-xs sm:text-sm">
            <div>
              <p className="font-bold mb-14">Wali Kelas</p>
              <p className="font-bold border-b border-black inline-block min-w-[180px] pb-0.5">
                ( {schoolSettings.teacherName || formData.homeroomTeacher || '....................................'} )
              </p>
              <p className="text-[11px] text-slate-800 font-medium mt-0.5">
                NIP. {schoolSettings.teacherNip || '-'}
              </p>
            </div>

            <div>
              <p className="font-bold mb-14">Ketua Kelas</p>
              <p className="font-bold border-b border-black inline-block min-w-[180px] pb-0.5">
                ( {schoolSettings.classLeader || formData.classLeader || '....................................'} )
              </p>
              <p className="text-[11px] text-slate-800 font-medium mt-0.5">
                Siswa Kelas {formData.majorClass || schoolSettings.className}
              </p>
            </div>
          </div>

          {/* Center: Mengetahui Ketua Jurusan */}
          <div className="text-center mt-6 text-xs sm:text-sm">
            <p className="font-bold">Mengetahui,</p>
            <p className="font-bold mb-14">Ketua Jurusan</p>
            <p className="font-bold border-b border-black inline-block min-w-[200px] pb-0.5">
              ( {schoolSettings.headOfDepartment || formData.headOfDepartment || '....................................'} )
            </p>
            <p className="text-[11px] text-slate-800 font-medium mt-0.5">
              NIP. {schoolSettings.headOfDepartmentNip || formData.headOfDepartmentNip || '-'}
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-2 text-[11px] italic">
          <p>Catatan, lampirkan absensi bulanan siswa</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DAFTAR LENGKAP SISWA & GURU (HADIR 100%, ALPA, SAKIT, IZIN, AGENDA) */}
      {/* ========================================================================= */}
      {activeDetailModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                activeDetailModal === 'perfect' || activeDetailModal === 'perfect_teachers'
                  ? 'bg-gradient-to-r from-emerald-800 to-teal-800'
                  : activeDetailModal === 'absent' || activeDetailModal === 'absent_teachers'
                  ? 'bg-gradient-to-r from-rose-800 to-red-900'
                  : activeDetailModal === 'sick'
                  ? 'bg-gradient-to-r from-sky-800 to-blue-900'
                  : 'bg-gradient-to-r from-amber-700 to-orange-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {(activeDetailModal === 'perfect' || activeDetailModal === 'perfect_teachers') && <Award className="w-5 h-5 text-yellow-300" />}
                  {(activeDetailModal === 'absent' || activeDetailModal === 'absent_teachers') && <UserX className="w-5 h-5 text-rose-200" />}
                  {activeDetailModal === 'sick' && <Activity className="w-5 h-5 text-sky-200" />}
                  {(activeDetailModal === 'permission' || activeDetailModal === 'late_teachers') && <Clock className="w-5 h-5 text-amber-200" />}
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                    {activeDetailModal === 'perfect' && 'Daftar Siswa Hadir 100% (Masuk Terus)'}
                    {activeDetailModal === 'absent' && 'Daftar Siswa Alpa / Tidak Masuk'}
                    {activeDetailModal === 'sick' && 'Daftar Siswa Sakit'}
                    {activeDetailModal === 'permission' && 'Daftar Siswa Izin / Terlambat'}
                    {activeDetailModal === 'late_teachers' && 'Daftar Guru Sering Datang Terlambat'}
                    {activeDetailModal === 'absent_teachers' && 'Daftar Guru Sering Tidak Masuk'}
                    {activeDetailModal === 'perfect_teachers' && 'Daftar Guru Hadir 100% (Masuk Terus)'}
                  </h3>
                  <p className="text-xs text-white/80 font-medium">
                    {activeDetailModal.includes('teachers')
                      ? `Sumber: Agenda Kehadiran Guru di Kelas • Periode ${selectedMonthName} ${selectedYear}`
                      : `Periode ${selectedMonthName} ${selectedYear} • ${attendanceAnalytics.activeDaysCount} Hari Efektif Aktif`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailModal(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Summary Banner */}
            <div
              className={`px-6 py-3 border-b flex items-center justify-between flex-wrap gap-2 text-xs ${
                activeDetailModal === 'perfect' || activeDetailModal === 'perfect_teachers'
                  ? 'bg-emerald-50 border-emerald-100'
                  : activeDetailModal === 'absent' || activeDetailModal === 'absent_teachers'
                  ? 'bg-rose-50 border-rose-100'
                  : activeDetailModal === 'sick'
                  ? 'bg-sky-50 border-sky-100'
                  : 'bg-amber-50 border-amber-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {(activeDetailModal === 'perfect' || activeDetailModal === 'perfect_teachers') && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {(activeDetailModal === 'absent' || activeDetailModal === 'absent_teachers') && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                {activeDetailModal === 'sick' && <Activity className="w-4 h-4 text-sky-600 shrink-0" />}
                {(activeDetailModal === 'permission' || activeDetailModal === 'late_teachers') && <Clock className="w-4 h-4 text-amber-600 shrink-0" />}

                <span
                  className={`font-bold ${
                    activeDetailModal === 'perfect' || activeDetailModal === 'perfect_teachers'
                      ? 'text-emerald-950'
                      : activeDetailModal === 'absent' || activeDetailModal === 'absent_teachers'
                      ? 'text-rose-950'
                      : activeDetailModal === 'sick'
                      ? 'text-sky-950'
                      : 'text-amber-950'
                  }`}
                >
                  {activeDetailModal === 'perfect' && (
                    <>
                      Ditemukan <span className="text-emerald-700 font-black text-sm">{attendanceAnalytics.perfectStudentsCount}</span> dari {students.length} Siswa hadir sempurna tanpa alpa/sakit/izin.
                    </>
                  )}
                  {activeDetailModal === 'absent' && (
                    <>
                      Ditemukan <span className="text-rose-700 font-black text-sm">{attendanceAnalytics.absentStudentsCount}</span> Siswa dengan total <span className="text-rose-700 font-black text-sm">{attendanceAnalytics.totalAbsentDays}</span> hari alpa.
                    </>
                  )}
                  {activeDetailModal === 'sick' && (
                    <>
                      Ditemukan <span className="text-sky-700 font-black text-sm">{attendanceAnalytics.sickStudentsCount}</span> Siswa dengan total <span className="text-sky-700 font-black text-sm">{attendanceAnalytics.totalSickDays}</span> hari sakit.
                    </>
                  )}
                  {activeDetailModal === 'permission' && (
                    <>
                      Ditemukan <span className="text-amber-700 font-black text-sm">{attendanceAnalytics.permissionStudentsCount}</span> Siswa dengan total <span className="text-amber-700 font-black text-sm">{attendanceAnalytics.totalPermissionDays}</span> hari izin.
                    </>
                  )}
                  {activeDetailModal === 'late_teachers' && (
                    <>
                      Ditemukan <span className="text-amber-700 font-black text-sm">{teacherAgendaAnalytics.lateTeachersCount}</span> Guru tercatat terlambat dengan total <span className="text-amber-700 font-black text-sm">{teacherAgendaAnalytics.totalLateCount}</span> kali terlambat di agenda kelas.
                    </>
                  )}
                  {activeDetailModal === 'absent_teachers' && (
                    <>
                      Ditemukan <span className="text-rose-700 font-black text-sm">{teacherAgendaAnalytics.absentTeachersCount}</span> Guru berhalangan dengan total <span className="text-rose-700 font-black text-sm">{teacherAgendaAnalytics.totalAbsentCount}</span> kali tidak masuk di agenda kelas.
                    </>
                  )}
                  {activeDetailModal === 'perfect_teachers' && (
                    <>
                      Ditemukan <span className="text-emerald-700 font-black text-sm">{teacherAgendaAnalytics.perfectTeachersCount}</span> Guru hadir 100% tanpa catatan keterlambatan atau izin.
                    </>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  let textList = '';
                  let headerTitle = '';
                  if (activeDetailModal === 'perfect') {
                    textList = attendanceAnalytics.allPerfectStudents
                      .map((item, idx) => `${idx + 1}. ${item.student.name} (Hadir ${item.h} Hari - 100%)`)
                      .join('\n');
                    headerTitle = `*DAFTAR SISWA HADIR 100% - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${attendanceAnalytics.perfectStudentsCount} Siswa\n\n${textList}`;
                  } else if (activeDetailModal === 'absent') {
                    textList = attendanceAnalytics.allAbsentStudents
                      .map((item, idx) => `${idx + 1}. ${item.student.name} (${item.a} Hari Alpa)`)
                      .join('\n');
                    headerTitle = `*DAFTAR SISWA ALPA / TIDAK MASUK - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${attendanceAnalytics.absentStudentsCount} Siswa (${attendanceAnalytics.totalAbsentDays} Hari Alpa)\n\n${textList}`;
                  } else if (activeDetailModal === 'sick') {
                    textList = attendanceAnalytics.allSickStudents
                      .map((item, idx) => `${idx + 1}. ${item.student.name} (${item.s} Hari Sakit)`)
                      .join('\n');
                    headerTitle = `*DAFTAR SISWA SAKIT - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${attendanceAnalytics.sickStudentsCount} Siswa (${attendanceAnalytics.totalSickDays} Hari Sakit)\n\n${textList}`;
                  } else if (activeDetailModal === 'permission') {
                    textList = attendanceAnalytics.allPermissionStudents
                      .map((item, idx) => `${idx + 1}. ${item.student.name} (${item.i} Hari Izin)`)
                      .join('\n');
                    headerTitle = `*DAFTAR SISWA IZIN / TERLAMBAT - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${attendanceAnalytics.permissionStudentsCount} Siswa (${attendanceAnalytics.totalPermissionDays} Hari Izin)\n\n${textList}`;
                  } else if (activeDetailModal === 'late_teachers') {
                    textList = teacherAgendaAnalytics.lateTeachers
                      .map((item, idx) => `${idx + 1}. ${item.teacherName} (${item.telat}x Terlambat${item.subjects.length > 0 ? ` - ${item.subjects.join(', ')}` : ''})`)
                      .join('\n');
                    headerTitle = `*DAFTAR GURU SERING DATANG TERLAMBAT - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${teacherAgendaAnalytics.lateTeachersCount} Guru (${teacherAgendaAnalytics.totalLateCount}x Terlambat)\n\n${textList}`;
                  } else if (activeDetailModal === 'absent_teachers') {
                    textList = teacherAgendaAnalytics.absentTeachers
                      .map((item, idx) => `${idx + 1}. ${item.teacherName} (${item.tidakMasuk}x Tidak Masuk${item.subjects.length > 0 ? ` - ${item.subjects.join(', ')}` : ''})`)
                      .join('\n');
                    headerTitle = `*DAFTAR GURU SERING TIDAK MASUK - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${teacherAgendaAnalytics.absentTeachersCount} Guru (${teacherAgendaAnalytics.totalAbsentCount}x)\n\n${textList}`;
                  } else if (activeDetailModal === 'perfect_teachers') {
                    textList = teacherAgendaAnalytics.perfectTeachers
                      .map((item, idx) => `${idx + 1}. ${item.teacherName} (${item.hadir} Sesi Mengajar - 100%${item.subjects.length > 0 ? ` - ${item.subjects.join(', ')}` : ''})`)
                      .join('\n');
                    headerTitle = `*DAFTAR GURU HADIR 100% - ${formData.schoolName}*\nBulan: ${selectedMonthName} ${selectedYear}\nTotal: ${teacherAgendaAnalytics.perfectTeachersCount} Guru\n\n${textList}`;
                  }

                  navigator.clipboard.writeText(headerTitle);
                  showToast('Daftar berhasil disalin ke clipboard!');
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
              >
                <Copy className="w-3 h-3 text-slate-600" />
                <span>Salin Teks / WA</span>
              </button>
            </div>

            {/* Modal List (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {activeDetailModal === 'perfect' && attendanceAnalytics.allPerfectStudents.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada siswa yang tercatat hadir 100% pada bulan ini.</p>
                </div>
              )}

              {activeDetailModal === 'absent' && attendanceAnalytics.allAbsentStudents.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-800">Bagus sekali! Tidak ada siswa yang tercatat alpa bulan ini.</p>
                </div>
              )}

              {activeDetailModal === 'sick' && attendanceAnalytics.allSickStudents.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-800">Alhamdulillah! Tidak ada siswa yang tercatat sakit bulan ini.</p>
                </div>
              )}

              {activeDetailModal === 'permission' && attendanceAnalytics.allPermissionStudents.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-800">Tidak ada siswa yang tercatat izin bulan ini.</p>
                </div>
              )}

              {/* Empty states for teachers */}
              {activeDetailModal === 'late_teachers' && teacherAgendaAnalytics.lateTeachers.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-800">
                    Bagus sekali! Tidak ada guru yang tercatat datang terlambat pada agenda kelas bulan ini.
                  </p>
                </div>
              )}

              {activeDetailModal === 'absent_teachers' && teacherAgendaAnalytics.absentTeachers.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-800">
                    Alhamdulillah! Tidak ada guru yang tercatat tidak masuk (izin/sakit/alpa) pada agenda kelas bulan ini.
                  </p>
                </div>
              )}

              {activeDetailModal === 'perfect_teachers' && teacherAgendaAnalytics.perfectTeachers.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">
                    Belum ada guru yang tercatat hadir 100% pada agenda kelas bulan ini.
                  </p>
                </div>
              )}

              {/* Render Table for Student Modals */}
              {((activeDetailModal === 'perfect' && attendanceAnalytics.allPerfectStudents.length > 0) ||
                (activeDetailModal === 'absent' && attendanceAnalytics.allAbsentStudents.length > 0) ||
                (activeDetailModal === 'sick' && attendanceAnalytics.allSickStudents.length > 0) ||
                (activeDetailModal === 'permission' && attendanceAnalytics.allPermissionStudents.length > 0)) && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-50 px-4 py-2 text-[11px] font-black uppercase text-slate-600 grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-center">No</span>
                    <span className="col-span-6">Nama Siswa</span>
                    <span className="col-span-2 text-center">L/P</span>
                    <span className="col-span-3 text-right">
                      {activeDetailModal === 'perfect' ? 'Kehadiran' : 'Catatan'}
                    </span>
                  </div>

                  {activeDetailModal === 'perfect' &&
                    attendanceAnalytics.allPerfectStudents.map((item, idx) => (
                      <div
                        key={item.student.id}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-emerald-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-6 flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.student.name}</span>
                          {item.student.nisn && (
                            <span className="text-[10px] text-slate-400">({item.student.nisn})</span>
                          )}
                        </div>
                        <span className="col-span-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {item.student.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </span>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                            <Check className="w-3 h-3" />
                            <span>{item.h}/{attendanceAnalytics.activeDaysCount} (100%)</span>
                          </span>
                        </div>
                      </div>
                    ))}

                  {activeDetailModal === 'absent' &&
                    attendanceAnalytics.allAbsentStudents.map((item, idx) => (
                      <div
                        key={item.student.id}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-rose-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-6 flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.student.name}</span>
                          {item.student.nisn && (
                            <span className="text-[10px] text-slate-400">({item.student.nisn})</span>
                          )}
                        </div>
                        <span className="col-span-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {item.student.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </span>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                            <UserX className="w-3 h-3" />
                            <span>{item.a} Hari Alpa</span>
                          </span>
                        </div>
                      </div>
                    ))}

                  {activeDetailModal === 'sick' &&
                    attendanceAnalytics.allSickStudents.map((item, idx) => (
                      <div
                        key={item.student.id}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-sky-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-6 flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.student.name}</span>
                          {item.student.nisn && (
                            <span className="text-[10px] text-slate-400">({item.student.nisn})</span>
                          )}
                        </div>
                        <span className="col-span-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {item.student.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </span>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full text-[11px]">
                            <Activity className="w-3 h-3" />
                            <span>{item.s} Hari Sakit</span>
                          </span>
                        </div>
                      </div>
                    ))}

                  {activeDetailModal === 'permission' &&
                    attendanceAnalytics.allPermissionStudents.map((item, idx) => (
                      <div
                        key={item.student.id}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-amber-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-6 flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.student.name}</span>
                          {item.student.nisn && (
                            <span className="text-[10px] text-slate-400">({item.student.nisn})</span>
                          )}
                        </div>
                        <span className="col-span-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {item.student.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </span>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{item.i} Hari Izin</span>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Render Table for Teacher Modals */}
              {((activeDetailModal === 'late_teachers' && teacherAgendaAnalytics.lateTeachers.length > 0) ||
                (activeDetailModal === 'absent_teachers' && teacherAgendaAnalytics.absentTeachers.length > 0) ||
                (activeDetailModal === 'perfect_teachers' && teacherAgendaAnalytics.perfectTeachers.length > 0)) && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-50 px-4 py-2 text-[11px] font-black uppercase text-slate-600 grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-center">No</span>
                    <span className="col-span-5">Nama Guru</span>
                    <span className="col-span-3">Mata Pelajaran</span>
                    <span className="col-span-3 text-right">
                      {activeDetailModal === 'late_teachers'
                        ? 'Keterlambatan'
                        : activeDetailModal === 'absent_teachers'
                        ? 'Ketidakhadiran'
                        : 'Kehadiran'}
                    </span>
                  </div>

                  {activeDetailModal === 'late_teachers' &&
                    teacherAgendaAnalytics.lateTeachers.map((item, idx) => (
                      <div
                        key={item.teacherName + idx}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-amber-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-5 flex flex-col">
                          <span className="font-bold text-slate-900">{item.teacherName}</span>
                          {item.teacherNip && <span className="text-[10px] text-slate-400 font-normal">NIP: {item.teacherNip}</span>}
                        </div>
                        <div className="col-span-3 text-slate-600 text-[11px] truncate">
                          {item.subjects.join(', ') || '-'}
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{item.telat}x Terlambat</span>
                          </span>
                        </div>
                      </div>
                    ))}

                  {activeDetailModal === 'absent_teachers' &&
                    teacherAgendaAnalytics.absentTeachers.map((item, idx) => (
                      <div
                        key={item.teacherName + idx}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-rose-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-5 flex flex-col">
                          <span className="font-bold text-slate-900">{item.teacherName}</span>
                          {item.teacherNip && <span className="text-[10px] text-slate-400 font-normal">NIP: {item.teacherNip}</span>}
                        </div>
                        <div className="col-span-3 text-slate-600 text-[11px] truncate">
                          {item.subjects.join(', ') || '-'}
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                            <UserX className="w-3 h-3" />
                            <span>{item.tidakMasuk}x ({[item.izin > 0 && `I:${item.izin}`, item.sakit > 0 && `S:${item.sakit}`, item.alpa > 0 && `A:${item.alpa}`, item.tugas > 0 && `T:${item.tugas}`].filter(Boolean).join(' ')})</span>
                          </span>
                        </div>
                      </div>
                    ))}

                  {activeDetailModal === 'perfect_teachers' &&
                    teacherAgendaAnalytics.perfectTeachers.map((item, idx) => (
                      <div
                        key={item.teacherName + idx}
                        className="px-4 py-2.5 text-xs text-slate-800 grid grid-cols-12 gap-2 items-center hover:bg-emerald-50/40 transition-colors"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</span>
                        <div className="col-span-5 flex flex-col">
                          <span className="font-bold text-slate-900">{item.teacherName}</span>
                          {item.teacherNip && <span className="text-[10px] text-slate-400 font-normal">NIP: {item.teacherNip}</span>}
                        </div>
                        <div className="col-span-3 text-slate-600 text-[11px] truncate">
                          {item.subjects.join(', ') || '-'}
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                            <Check className="w-3 h-3" />
                            <span>{item.hadir} Sesi (100%)</span>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-slate-500 font-medium">
                Pilih metode penerapan ke formulir laporan wali kelas:
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {activeDetailModal === 'perfect' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyFirst4PerfectStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.perfectStudentsCount === 0}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Hanya 4 Siswa Pertama
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyAllPerfectStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.perfectStudentsCount === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Terapkan Seluruh Siswa ({attendanceAnalytics.perfectStudentsCount})</span>
                    </button>
                  </>
                )}

                {activeDetailModal === 'absent' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyFirst4AbsentStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.absentStudentsCount === 0}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Hanya 4 Siswa Terbanyak
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyAllAbsentStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.absentStudentsCount === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Terapkan Seluruh Siswa ({attendanceAnalytics.absentStudentsCount})</span>
                    </button>
                  </>
                )}

                {activeDetailModal === 'sick' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyFirst4SickStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.sickStudentsCount === 0}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Hanya 4 Siswa Terbanyak
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyAllSickStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.sickStudentsCount === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-sky-700 hover:bg-sky-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Terapkan Seluruh Siswa ({attendanceAnalytics.sickStudentsCount})</span>
                    </button>
                  </>
                )}

                {activeDetailModal === 'permission' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyFirst4PermissionStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.permissionStudentsCount === 0}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Hanya 4 Siswa Terbanyak
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyAllPermissionStudents();
                        setActiveDetailModal(null);
                      }}
                      disabled={attendanceAnalytics.permissionStudentsCount === 0}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Terapkan Seluruh Siswa ({attendanceAnalytics.permissionStudentsCount})</span>
                    </button>
                  </>
                )}

                {activeDetailModal === 'late_teachers' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyAllLateTeachers();
                      setActiveDetailModal(null);
                    }}
                    disabled={teacherAgendaAnalytics.lateTeachersCount === 0}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Terapkan ke Laporan ({teacherAgendaAnalytics.lateTeachersCount} Guru)</span>
                  </button>
                )}

                {activeDetailModal === 'absent_teachers' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyAllAbsentTeachers();
                      setActiveDetailModal(null);
                    }}
                    disabled={teacherAgendaAnalytics.absentTeachersCount === 0}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Terapkan ke Laporan ({teacherAgendaAnalytics.absentTeachersCount} Guru)</span>
                  </button>
                )}

                {activeDetailModal === 'perfect_teachers' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyAllPerfectTeachers();
                      setActiveDetailModal(null);
                    }}
                    disabled={teacherAgendaAnalytics.perfectTeachersCount === 0}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Terapkan ke Laporan ({teacherAgendaAnalytics.perfectTeachersCount} Guru)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
