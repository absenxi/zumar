import React, { useState, useEffect } from 'react';
import {
  INITIAL_STUDENTS,
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_TEACHERS,
  INITIAL_SUBJECTS,
  MONTH_NAMES,
  generateSampleAttendance,
} from './data/initialData';
import { Student, SchoolSettings, AttendanceStatus, UserRole, TeacherAgendaEntry, Teacher, Subject, WhatsAppTargetItem, WhatsAppTransmissionLog } from './types';
import { exportToCSV, exportRecapToWord, triggerPrint } from './utils/export';
import {
  subscribeSchoolSettings,
  saveSchoolSettingsToCloud,
  subscribeStudents,
  saveStudentToCloud,
  saveAllStudentsToCloud,
  deleteStudentFromCloud,
  subscribeAttendance,
  saveMonthAttendanceToCloud,
  subscribeTeacherAgenda,
  subscribeTeacherAgendaStore,
  saveTeacherAgendaToCloud,
  saveAllTeacherAgendaToCloud,
  subscribeTeachers,
  saveTeacherToCloud,
  saveAllTeachersToCloud,
  deleteTeacherFromCloud,
  subscribeSubjects,
  saveSubjectToCloud,
  saveAllSubjectsToCloud,
  deleteSubjectFromCloud,
  subscribeWhatsAppLogs,
  saveAllWhatsAppLogsToCloud,
  syncEntireDatabaseToCloud,
  saveHomeroomReportToCloud,
  getSupabaseConnectionStatus,
  onSupabaseConfigChange,
} from './lib/supabase';

// Components
import { BannerHeader } from './components/BannerHeader';
import { MonthlyRecapTable } from './components/MonthlyRecapTable';
import { DailyAttendance } from './components/DailyAttendance';
import { WhatsAppReportModal } from './components/WhatsAppReportModal';
import { ClassroomTeacherAgenda } from './components/ClassroomTeacherAgenda';
import { DashboardView, DashboardSubTab } from './components/DashboardView';

// Icons
import {
  LayoutDashboard,
  Table,
  CalendarCheck,
  Users,
  Settings,
  Download,
  Printer,
  School,
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  FileText,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Code,
  BookOpen,
  GraduationCap,
  KeyRound,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
} from 'lucide-react';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { ConfirmationModal, ConfirmationConfig } from './components/ConfirmationModal';
import {
  generateAutoWhatsAppMessage,
  sendWhatsAppViaGateway,
  getDayAttendanceSummary,
  TRANSMISSION_LOG_KEY,
  getWhatsAppTransmissionLogs,
} from './utils/whatsappService';

export default function App() {
  const currentDate = new Date();
  const currentRealYear = currentDate.getFullYear();
  const currentRealMonth = currentDate.getMonth(); // 0-indexed
  const currentRealDay = currentDate.getDate();

  // State 1: Active Navigation Tab (Default halaman utama: Rekap Bulanan Matriks)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'rekap' | 'harian' | 'agenda_guru'
  >('rekap');

  // Sub-tab inside Dashboard
  const [dashboardSubTab, setDashboardSubTab] = useState<DashboardSubTab>('laporan_walikelas');

  // State 2: School Settings
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem('sditqu_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.schoolName === 'SDITQu Seruway' || parsed.className === '4B') {
        return INITIAL_SCHOOL_SETTINGS;
      }
      return parsed;
    }
    return INITIAL_SCHOOL_SETTINGS;
  });

  // State 3: Students
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('sditqu_students');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (s) => s.name === 'ABDUL RAHMAN' || s.name === 'ZAHARA SRI WAHYUNI'
        )
      ) {
        return [];
      }
      return parsed;
    }
    return INITIAL_STUDENTS;
  });

  // State 4: Month & Year Selector (Default to current real-time month and year)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentRealMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);

  // State 5: Daily Attendance Day (Default to current real-time day)
  const [selectedDay, setSelectedDay] = useState<number>(currentRealDay);

  // Auto-switch helpers for month and year
  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonthIndex(today.getMonth());
    setSelectedYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // Ensure selectedDay is valid for the selected month/year
  useEffect(() => {
    const maxDays = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedMonthIndex, selectedYear]);

  // State 6: Attendance Data
  // Format: { [monthKey]: { [studentId]: { [day]: status } } }
  const [attendanceStore, setAttendanceStore] = useState<
    Record<string, Record<string, Record<number, AttendanceStatus>>>
  >(() => {
    const saved = localStorage.getItem('sditqu_attendance');
    if (saved) return JSON.parse(saved);

    // Default sample data for July 2026
    const monthKey = '2026_6';
    const sampleData = generateSampleAttendance(INITIAL_STUDENTS, 2026, 6);
    return { [monthKey]: sampleData };
  });

  // State 6B: Teacher Attendance & Classroom Agenda Store
  // Format: { [monthKey]: TeacherAgendaEntry[] }
  const [teacherAgendaStore, setTeacherAgendaStore] = useState<
    Record<string, TeacherAgendaEntry[]>
  >(() => {
    const saved = localStorage.getItem('sditqu_teacher_agenda');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Bersihkan data default/sample buatan masa lalu jika ada (ID: agenda_YYYY_M_D_IDX)
          const cleanedStore: Record<string, TeacherAgendaEntry[]> = {};
          let hadLegacyDefault = false;
          for (const [key, entries] of Object.entries(parsed)) {
            if (Array.isArray(entries)) {
              const nonDefault = entries.filter((entry: TeacherAgendaEntry) => {
                const isSampleId = Boolean(entry.id && /^agenda_\d{4}_\d+_\d+_\d+$/.test(entry.id));
                return !isSampleId;
              });
              if (nonDefault.length !== entries.length) {
                hadLegacyDefault = true;
              }
              cleanedStore[key] = nonDefault;
            }
          }
          if (hadLegacyDefault) {
            localStorage.setItem('sditqu_teacher_agenda', JSON.stringify(cleanedStore));
          }
          return cleanedStore;
        }
      } catch (e) {
        console.warn('Failed to parse cached teacher agenda:', e);
      }
    }
    return {};
  });

  // State 6C: Teachers Database
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('sditqu_teachers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const isLegacyDefaultSeed =
            parsed.length > 0 &&
            parsed.every((t: Teacher) => t.id && /^teacher_([1-9]|1[0-2])$/.test(t.id));
          if (isLegacyDefaultSeed) {
            localStorage.removeItem('sditqu_teachers');
            return [];
          }
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse cached teachers:', e);
      }
    }
    return INITIAL_TEACHERS;
  });

  // State 6D: Subjects Database (Mata Pelajaran)
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('sditqu_subjects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse cached subjects:', e);
      }
    }
    return INITIAL_SUBJECTS;
  });

  // State 8: WhatsApp Report Modal Open
  const [isWaReportOpen, setIsWaReportOpen] = useState(false);

  // Multi-Level Role-Based Access Control ('guest' | 'guru' | 'admin' | 'superadmin')
  const [userRole, setUserRole] = useState<UserRole>('guest');

  // Reusable Password Prompt Modal State
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    isOpen: boolean;
    requiredLevel: 'guru' | 'admin';
    title?: string;
    description?: string;
    onSuccessAction?: (role: UserRole) => void;
  }>({
    isOpen: false,
    requiredLevel: 'guru',
  });

  // Supabase Connection Status
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const updateStatus = () => {
      getSupabaseConnectionStatus().then((res) => {
        if (isMounted) {
          setSupabaseConnected(res.connected);
        }
      });
    };

    updateStatus();
    const unsub = onSupabaseConfigChange(() => updateStatus());
    const interval = setInterval(updateStatus, 30000);

    return () => {
      isMounted = false;
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Global Confirmation Modal State for Destructive Actions
  const [confirmationConfig, setConfirmationConfig] = useState<
    ConfirmationConfig & { isOpen: boolean }
  >({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleRequestConfirmation = (config: ConfirmationConfig) => {
    setConfirmationConfig({
      isOpen: true,
      title: config.title,
      message: config.message,
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      variant: config.variant || 'danger',
      icon: config.icon || 'alert',
      onConfirm: config.onConfirm,
    });
  };

  const isPasswordRequired = schoolSettings.requirePassword !== false;
  // Superadmin adalah level tertinggi sehingga otomatis membuka level guru dan admin
  const isAttendanceUnlocked =
    !isPasswordRequired ||
    userRole === 'guru' ||
    userRole === 'admin' ||
    userRole === 'superadmin';
  const isAdminUnlocked =
    !isPasswordRequired || userRole === 'admin' || userRole === 'superadmin';

  const triggerAuthPrompt = (options: {
    requiredLevel: 'guru' | 'admin';
    title?: string;
    description?: string;
    onSuccess: (role: UserRole) => void;
  }) => {
    setPasswordModalConfig({
      isOpen: true,
      requiredLevel: options.requiredLevel,
      title: options.title,
      description: options.description,
      onSuccessAction: options.onSuccess,
    });
  };

  const handleOpenWaReport = () => {
    if (!isAttendanceUnlocked) {
      triggerAuthPrompt({
        requiredLevel: 'guru',
        title: 'Otorisasi Kirim Laporan WA',
        description: 'Masukkan PIN Guru atau Password Admin untuk membuka Laporan WhatsApp.',
        onSuccess: (role) => {
          setUserRole(role);
          setIsWaReportOpen(true);
        },
      });
    } else {
      setIsWaReportOpen(true);
    }
  };

  const handleOpenSettings = () => {
    handleTabClick('pengaturan');
  };

  const handleTabClick = (
    tabKey:
      | 'dashboard'
      | 'rekap'
      | 'harian'
      | 'agenda_guru'
      | 'guru'
      | 'mapel'
      | 'laporan_walikelas'
      | 'siswa'
      | 'pengaturan'
  ) => {
    // Wajib login Admin pada Dashboard dan semua sub-modulnya
    if (
      tabKey === 'dashboard' ||
      tabKey === 'laporan_walikelas' ||
      tabKey === 'guru' ||
      tabKey === 'mapel' ||
      tabKey === 'siswa' ||
      tabKey === 'pengaturan'
    ) {
      const targetSub = tabKey === 'dashboard' ? dashboardSubTab : tabKey;
      if (!isAdminUnlocked && schoolSettings.requirePassword !== false) {
        triggerAuthPrompt({
          requiredLevel: 'admin',
          title: 'Wajib Login Admin Dashboard',
          description:
            'Akses menu Dashboard (Laporan Wali Kelas, Database Guru, Database Siswa, Pengaturan & Backup) wajib login menggunakan Password Admin.',
          onSuccess: (role) => {
            setUserRole(role);
            setActiveTab('dashboard');
            if (tabKey !== 'dashboard') {
              setDashboardSubTab(targetSub as DashboardSubTab);
            }
          },
        });
        return;
      }
      setActiveTab('dashboard');
      if (tabKey !== 'dashboard') {
        setDashboardSubTab(targetSub as DashboardSubTab);
      }
      return;
    }
    setActiveTab(tabKey);
  };

  const handleLogout = () => {
    const roleLabel =
      userRole === 'superadmin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Guru';
    handleRequestConfirmation({
      title: 'Konfirmasi Keluar (Logout)',
      message: `Apakah Anda yakin ingin keluar dari sesi login ${roleLabel}? Mode pengeditan dan menu khusus akan terkunci kembali.`,
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      variant: 'danger',
      icon: 'alert',
      onConfirm: () => {
        setUserRole('guest');
        if (activeTab === 'dashboard') {
          setActiveTab('rekap');
        }
      },
    });
  };

  const handleExportCSVClick = () => {
    const doExport = () => {
      exportToCSV(
        students,
        schoolSettings,
        currentMonthName,
        selectedYear,
        activeAttendanceData,
        daysInMonth
      );
    };

    if (!isAttendanceUnlocked) {
      triggerAuthPrompt({
        requiredLevel: 'guru',
        title: 'Otorisasi Export Excel',
        description: 'Masukkan PIN Guru atau Password Admin untuk mendownload file rekap.',
        onSuccess: (role) => {
          setUserRole(role);
          doExport();
        },
      });
    } else {
      doExport();
    }
  };

  const handlePrintClick = () => {
    const doPrint = () => {
      triggerPrint();
    };

    if (!isAttendanceUnlocked) {
      triggerAuthPrompt({
        requiredLevel: 'guru',
        title: 'Otorisasi Cetak Laporan',
        description: 'Masukkan PIN Guru atau Password Admin untuk mencetak laporan poster.',
        onSuccess: (role) => {
          setUserRole(role);
          doPrint();
        },
      });
    } else {
      doPrint();
    }
  };

  // If user role is revoked or not admin while viewing admin tabs, redirect to rekap
  useEffect(() => {
    if (!isAdminUnlocked && (activeTab === 'siswa' || activeTab === 'laporan_walikelas')) {
      setActiveTab('rekap');
    }
  }, [isAdminUnlocked, activeTab]);

  // Sembunyikan tab Gateway WhatsApp & Koneksi Supabase jika user bukan Super Admin (guru, admin, guest)
  useEffect(() => {
    if ((dashboardSubTab === 'supabase' || dashboardSubTab === 'gateway') && userRole !== 'superadmin') {
      setDashboardSubTab('laporan_walikelas');
    }
  }, [dashboardSubTab, userRole]);

  // Sync with Supabase Realtime listeners
  useEffect(() => {
    const unsubscribeSettings = subscribeSchoolSettings((data) => {
      setSchoolSettings(data);
    }, schoolSettings);

    const unsubscribeStudents = subscribeStudents((data) => {
      setStudents(data);
    }, students);

    const unsubscribeAttendance = subscribeAttendance((data) => {
      setAttendanceStore(data);
    }, attendanceStore);

    const unsubscribeTeacherAgenda = subscribeTeacherAgendaStore((cloudAgendaStore) => {
      if (cloudAgendaStore && Object.keys(cloudAgendaStore).length > 0) {
        setTeacherAgendaStore((prev) => ({
          ...prev,
          ...cloudAgendaStore,
        }));
      }
    }, teacherAgendaStore);

    return () => {
      unsubscribeSettings();
      unsubscribeStudents();
      unsubscribeAttendance();
      unsubscribeTeacherAgenda();
    };
  }, []);

  // Sync to local storage as offline cache
  useEffect(() => {
    localStorage.setItem('sditqu_settings', JSON.stringify(schoolSettings));
  }, [schoolSettings]);

  useEffect(() => {
    localStorage.setItem('sditqu_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('sditqu_attendance', JSON.stringify(attendanceStore));
  }, [attendanceStore]);

  useEffect(() => {
    localStorage.setItem('sditqu_teacher_agenda', JSON.stringify(teacherAgendaStore));
  }, [teacherAgendaStore]);

  useEffect(() => {
    localStorage.setItem('sditqu_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('sditqu_subjects', JSON.stringify(subjects));
  }, [subjects]);

  // Sync Teachers Database with Supabase Realtime
  useEffect(() => {
    const unsubscribeTeachers = subscribeTeachers((cloudTeachers) => {
      if (cloudTeachers) {
        setTeachers(cloudTeachers);
      }
    }, INITIAL_TEACHERS);

    return () => {
      unsubscribeTeachers();
    };
  }, []);

  // Sync Subjects Database with Supabase Realtime
  useEffect(() => {
    const unsubscribeSubjects = subscribeSubjects((cloudSubjects) => {
      if (cloudSubjects && cloudSubjects.length > 0) {
        setSubjects(cloudSubjects);
      }
    }, subjects);

    return () => {
      unsubscribeSubjects();
    };
  }, []);

  // Sync WhatsApp Transmission Logs with Supabase Cloud Database
  useEffect(() => {
    const initialLogs = getWhatsAppTransmissionLogs();
    const unsubscribeWhatsApp = subscribeWhatsAppLogs((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        try {
          localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(cloudLogs));
          window.dispatchEvent(
            new CustomEvent('whatsapp_transmission_logged', { detail: cloudLogs })
          );
        } catch {
          // ignore quota limits
        }
      } else if (initialLogs.length > 0) {
        // If Supabase is empty but local has logs, push initial local logs to cloud database
        saveAllWhatsAppLogsToCloud(initialLogs).catch(() => {});
      }
    }, initialLogs);

    return () => {
      unsubscribeWhatsApp();
    };
  }, []);

  // Helper CRUD methods for Teacher Database
  const handleAddTeacher = (newTeacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...newTeacherData,
      id: `teacher_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTeachers((prev) => {
      const updated = [...prev, newTeacher];
      saveTeacherToCloud(newTeacher);
      return updated;
    });
  };

  const handleEditTeacher = (updatedTeacher: Teacher) => {
    setTeachers((prev) => {
      const updated = prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t));
      saveTeacherToCloud(updatedTeacher);
      return updated;
    });
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== teacherId);
      deleteTeacherFromCloud(teacherId);
      return updated;
    });
  };

  const handleResetTeachers = () => {
    setTeachers([]);
    saveAllTeachersToCloud([]);
    localStorage.removeItem('sditqu_teachers');
  };

  const handleBatchSetTeachers = (newList: Teacher[]) => {
    setTeachers(newList);
    saveAllTeachersToCloud(newList);
  };

  // Helper CRUD methods for Subjects Database (Mata Pelajaran)
  const handleAddSubject = (newSubjectData: Omit<Subject, 'id'>) => {
    const newSub: Subject = {
      ...newSubjectData,
      id: `subject_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSubjects((prev) => {
      const updated = [...prev, newSub];
      saveSubjectToCloud(newSub);
      return updated;
    });
  };

  const handleEditSubject = (updatedSubject: Subject) => {
    setSubjects((prev) => {
      const updated = prev.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
      saveSubjectToCloud(updatedSubject);
      return updated;
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => {
      const updated = prev.filter((s) => s.id !== subjectId);
      deleteSubjectFromCloud(subjectId);
      return updated;
    });
  };

  const handleResetSubjects = () => {
    setSubjects(INITIAL_SUBJECTS);
    saveAllSubjectsToCloud(INITIAL_SUBJECTS);
  };

  const handleBatchSetSubjects = (newList: Subject[]) => {
    setSubjects(newList);
    saveAllSubjectsToCloud(newList);
  };

  // Current Month Key
  const currentMonthKey = `${selectedYear}_${selectedMonthIndex}`;
  const currentMonthName = MONTH_NAMES[selectedMonthIndex];

  // Get active attendance data for selected month/year
  const activeAttendanceData =
    attendanceStore[currentMonthKey] ||
    generateSampleAttendance(students, selectedYear, selectedMonthIndex);

  // Active teacher agenda list for selected month/year (default murni kosong)
  const activeTeacherAgendaList = teacherAgendaStore[currentMonthKey] || [];

  // Helper to save teacher agenda list to local state & Supabase Cloud
  const handleSaveTeacherAgendaList = async (
    updatedList: TeacherAgendaEntry[],
    explicitMonthKey?: string
  ): Promise<boolean> => {
    const targetMonthKey = explicitMonthKey || currentMonthKey;

    // 1. Update local state & localStorage immediately
    setTeacherAgendaStore((prevStore) => {
      const updatedStore = {
        ...prevStore,
        [targetMonthKey]: updatedList,
      };
      try {
        localStorage.setItem('sditqu_teacher_agenda', JSON.stringify(updatedStore));
      } catch (e) {
        console.warn('Failed to cache teacher agenda to localStorage:', e);
      }
      return updatedStore;
    });

    // 2. Persist to Supabase Database
    try {
      const ok = await saveTeacherAgendaToCloud(targetMonthKey, updatedList);
      return ok;
    } catch (err) {
      console.error('Failed to save teacher agenda to Supabase:', err);
      return false;
    }
  };

  // Floating Toast Notification for Auto WhatsApp Dispatch
  const [autoSendToast, setAutoSendToast] = useState<{
    status: 'sending' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Otomatisasi pengiriman laporan WA ke Group saat absensi 100% terisi
  const checkAndTriggerAutoSendWhatsApp = async (
    currentMonthRecords: Record<string, Record<number, AttendanceStatus>>,
    day: number
  ) => {
    if (!schoolSettings.autoSendWhatsAppOnComplete) return;
    if (!schoolSettings.whatsappApiToken?.trim()) return;

    // Cek apakah seluruh siswa telah memiliki status kehadiran (tidak ada '-' dan tidak kosong)
    const summary = getDayAttendanceSummary(students, currentMonthRecords, day);
    if (!summary.isComplete) return;

    // Kunci tanggal untuk mencegah pengiriman duplikat pada tanggal yang sama
    const dateKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (schoolSettings.lastAutoSentDate === dateKey) {
      return;
    }

    // Tentukan target pengiriman (bisa satu atau lebih nomor/group)
    let selectedTargets: WhatsAppTargetItem[] = [];
    const targetIds =
      schoolSettings.autoSendWhatsAppTargetIds && schoolSettings.autoSendWhatsAppTargetIds.length > 0
        ? schoolSettings.autoSendWhatsAppTargetIds
        : schoolSettings.autoSendWhatsAppTargetId
        ? [schoolSettings.autoSendWhatsAppTargetId]
        : [];

    if (schoolSettings.whatsappTargetList && schoolSettings.whatsappTargetList.length > 0) {
      if (targetIds.length > 0) {
        selectedTargets = schoolSettings.whatsappTargetList.filter((t) => targetIds.includes(t.id));
      }
      if (selectedTargets.length === 0) {
        const defaultItem =
          schoolSettings.whatsappTargetList.find((t) => t.isDefault) || schoolSettings.whatsappTargetList[0];
        if (defaultItem) selectedTargets = [defaultItem];
      }
    } else if (schoolSettings.whatsappTestTarget?.trim()) {
      selectedTargets = [
        {
          id: 'target_default_fallback',
          name: 'Target Utama',
          target: schoolSettings.whatsappTestTarget.trim(),
          type: schoolSettings.whatsappTestTargetType || 'group',
        },
      ];
    }

    if (selectedTargets.length === 0) return;

    const msg = generateAutoWhatsAppMessage(
      schoolSettings,
      students,
      currentMonthRecords,
      day,
      selectedMonthIndex,
      selectedYear
    );

    const targetNames = selectedTargets.map((t) => t.name || t.target).join(', ');
    setAutoSendToast({
      status: 'sending',
      message: `✨ Seluruh absensi tanggal ${day} telah lengkap (100%). Mengirim rekap otomatis ke ${selectedTargets.length} tujuan WhatsApp (${targetNames})...`,
    });

    try {
      const sendResults: Array<{ item: WhatsAppTargetItem; success: boolean; message: string }> = [];
      for (const item of selectedTargets) {
        if (!item.target?.trim()) continue;
        const res = await sendWhatsAppViaGateway({
          token: schoolSettings.whatsappApiToken,
          endpointUrl: schoolSettings.whatsappEndpointUrl,
          target: item.target.trim(),
          message: msg,
          auditMeta: {
            targetName: item.name || item.target,
            targetType: item.type || 'group',
            sentBy: 'Otomatis (Absensi Lengkap 100%)',
            meta: {
              day,
              monthIndex: selectedMonthIndex,
              year: selectedYear,
            },
          },
        });
        sendResults.push({ item, success: res.success, message: res.message });
      }

      const successful = sendResults.filter((r) => r.success);
      const failed = sendResults.filter((r) => !r.success);

      if (successful.length > 0) {
        // Simpan tanggal terkirim agar tidak berulang
        const updatedSettings: SchoolSettings = {
          ...schoolSettings,
          lastAutoSentDate: dateKey,
        };
        handleSaveSettings(updatedSettings);

        if (failed.length === 0) {
          setAutoSendToast({
            status: 'success',
            message: `✅ Berhasil! Rekap absensi tanggal ${day} otomatis terkirim ke ${successful.length} tujuan WhatsApp (${successful.map((s) => s.item.name).join(', ')}).`,
          });
        } else {
          setAutoSendToast({
            status: 'success',
            message: `⚠️ Terkirim ke ${successful.length} tujuan (${successful.map((s) => s.item.name).join(', ')}), namun gagal ke ${failed.length} tujuan.`,
          });
        }
        setTimeout(() => setAutoSendToast(null), 6000);
      } else {
        const errorDetail = failed.map((f) => f.message).join('; ');
        setAutoSendToast({
          status: 'error',
          message: `⚠️ Pengiriman otomatis ke WA Group gagal: ${errorDetail || 'Tidak dapat terkirim'}`,
        });
        setTimeout(() => setAutoSendToast(null), 7000);
      }
    } catch (err: any) {
      setAutoSendToast({
        status: 'error',
        message: `⚠️ Pengiriman otomatis ke WA Group gagal: ${err?.message || 'Gangguan koneksi'}`,
      });
      setTimeout(() => setAutoSendToast(null), 7000);
    }
  };

  // Helper to update a single attendance cell
  const handleUpdateStatus = (
    studentId: string,
    day: number,
    status: AttendanceStatus,
    explicitMonthKey?: string
  ) => {
    const targetMonthKey = explicitMonthKey || currentMonthKey;
    setAttendanceStore((prevStore) => {
      const monthData =
        prevStore[targetMonthKey] ||
        (targetMonthKey === currentMonthKey ? activeAttendanceData : {});
      const currentRecords: Record<string, Record<number, AttendanceStatus>> = {};

      students.forEach((s) => {
        currentRecords[s.id] = monthData[s.id] ? { ...monthData[s.id] } : {};
      });

      if (!currentRecords[studentId]) {
        currentRecords[studentId] = {};
      }
      currentRecords[studentId][day] = status;

      const updatedStore = {
        ...prevStore,
        [targetMonthKey]: currentRecords,
      };

      // Save to Cloud
      saveMonthAttendanceToCloud(targetMonthKey, currentRecords);
      if (targetMonthKey === currentMonthKey) {
        checkAndTriggerAutoSendWhatsApp(currentRecords, day);
      }
      return updatedStore;
    });
  };

  // Helper to quick mark entire day for all students
  const handleQuickMarkDay = (day: number, status: AttendanceStatus) => {
    setAttendanceStore((prevStore) => {
      const monthData = prevStore[currentMonthKey] || activeAttendanceData;
      const currentRecords: Record<string, Record<number, AttendanceStatus>> = {};

      students.forEach((student) => {
        const studentDays = monthData[student.id] ? { ...monthData[student.id] } : {};
        studentDays[day] = status;
        currentRecords[student.id] = studentDays;
      });

      const updatedStore = {
        ...prevStore,
        [currentMonthKey]: currentRecords,
      };

      // Save to Firestore Realtime
      saveMonthAttendanceToCloud(currentMonthKey, currentRecords);
      // Trigger check for automated WA dispatch when complete
      checkAndTriggerAutoSendWhatsApp(currentRecords, day);
      return updatedStore;
    });
  };

  // Helper to reset attendance data for selected month (Admin Only)
  const handleResetMonthAttendance = () => {
    if (!isAdminUnlocked) {
      triggerAuthPrompt({
        requiredLevel: 'admin',
        title: 'Otorisasi Reset Absensi Bulan Ini',
        description: 'Hanya Admin yang memiliki akses untuk mengosongkan / mereset data absensi satu bulan penuh.',
        onSuccess: (role) => {
          setUserRole(role);
          handleResetMonthAttendance();
        },
      });
      return;
    }

    const clearedRecords: Record<string, Record<number, AttendanceStatus>> = {};
    const days = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

    students.forEach((student) => {
      clearedRecords[student.id] = {};
      for (let d = 1; d <= days; d++) {
        clearedRecords[student.id][d] = '-';
      }
    });

    setAttendanceStore((prevStore) => ({
      ...prevStore,
      [currentMonthKey]: clearedRecords,
    }));

    // Save cleared state to Firestore Realtime
    saveMonthAttendanceToCloud(currentMonthKey, clearedRecords);
  };

  // Helper to reset attendance for a specific day
  const handleResetDayAttendance = (day: number) => {
    setAttendanceStore((prevStore) => {
      const monthData = prevStore[currentMonthKey] || activeAttendanceData;
      const currentRecords: Record<string, Record<number, AttendanceStatus>> = {};

      students.forEach((student) => {
        const studentDays = monthData[student.id] ? { ...monthData[student.id] } : {};
        studentDays[day] = '-';
        currentRecords[student.id] = studentDays;
      });

      const updatedStore = {
        ...prevStore,
        [currentMonthKey]: currentRecords,
      };

      // Save to Firestore Realtime
      saveMonthAttendanceToCloud(currentMonthKey, currentRecords);
      return updatedStore;
    });
  };

  // Student CRUD handlers
  const handleAddStudent = (newS: Omit<Student, 'id'>) => {
    const id = Date.now().toString();
    const studentWithId = { ...newS, id };
    setStudents((prev) => [...prev, studentWithId]);
    saveStudentToCloud(studentWithId);
  };

  const handleEditStudent = (updatedS: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedS.id ? updatedS : s))
    );
    saveStudentToCloud(updatedS);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    deleteStudentFromCloud(id);
  };

  const handleResetStudents = () => {
    setStudents(INITIAL_STUDENTS);
    saveAllStudentsToCloud(INITIAL_STUDENTS);
    localStorage.removeItem('sditqu_students');
  };

  const handleSetStudents = (newList: Student[]) => {
    setStudents(newList);
    saveAllStudentsToCloud(newList);
  };

  const handleSaveSettings = (updatedSettings: SchoolSettings) => {
    setSchoolSettings(updatedSettings);
    saveSchoolSettingsToCloud(updatedSettings);
  };

  const handleRestoreBackup = async (data: {
    schoolSettings: SchoolSettings;
    students: Student[];
    teachers?: Teacher[];
    subjects?: Subject[];
    attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
    teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
    whatsappLogs?: WhatsAppTransmissionLog[];
    homeroomReports?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> => {
    // 1. Immediately apply to local state & synchronous localStorage cache
    if (data.schoolSettings) {
      setSchoolSettings(data.schoolSettings);
      try {
        localStorage.setItem('sditqu_settings', JSON.stringify(data.schoolSettings));
      } catch (e) {
        console.warn('Failed to cache restored settings:', e);
      }
    }
    if (data.students && Array.isArray(data.students)) {
      setStudents(data.students);
      try {
        localStorage.setItem('sditqu_students', JSON.stringify(data.students));
      } catch (e) {
        console.warn('Failed to cache restored students:', e);
      }
    }
    if (data.teachers && Array.isArray(data.teachers)) {
      setTeachers(data.teachers);
      try {
        localStorage.setItem('sditqu_teachers', JSON.stringify(data.teachers));
      } catch (e) {
        console.warn('Failed to cache restored teachers:', e);
      }
    }
    if (data.subjects && Array.isArray(data.subjects)) {
      setSubjects(data.subjects);
      try {
        localStorage.setItem('sditqu_subjects', JSON.stringify(data.subjects));
      } catch (e) {
        console.warn('Failed to cache restored subjects:', e);
      }
    }
    if (data.attendanceStore) {
      setAttendanceStore(data.attendanceStore);
      try {
        localStorage.setItem('sditqu_attendance', JSON.stringify(data.attendanceStore));
      } catch (e) {
        console.warn('Failed to cache restored attendance:', e);
      }
    }
    if (data.teacherAgendaStore) {
      setTeacherAgendaStore(data.teacherAgendaStore);
      try {
        localStorage.setItem('sditqu_teacher_agenda', JSON.stringify(data.teacherAgendaStore));
      } catch (e) {
        console.warn('Failed to cache restored teacher agenda:', e);
      }
    }
    if (data.whatsappLogs && Array.isArray(data.whatsappLogs)) {
      try {
        localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(data.whatsappLogs));
        saveAllWhatsAppLogsToCloud(data.whatsappLogs).catch(() => {});
      } catch (e) {
        console.warn('Failed to restore whatsapp logs:', e);
      }
    }
    if (data.homeroomReports && typeof data.homeroomReports === 'object') {
      Object.entries(data.homeroomReports).forEach(([mKey, rep]) => {
        try {
          localStorage.setItem(`homeroom_report_${mKey}`, JSON.stringify(rep));
          if (rep) {
            saveHomeroomReportToCloud(mKey, rep as any).catch(() => {});
          }
        } catch (e) {
          console.warn(`Failed restoring homeroom report ${mKey}:`, e);
        }
      });
    }

    // 2. Synchronize entire restored database to Supabase Cloud
    try {
      const syncResult = await syncEntireDatabaseToCloud({
        schoolSettings: data.schoolSettings || schoolSettings,
        students: data.students || students,
        teachers: data.teachers || teachers,
        subjects: data.subjects || subjects,
        attendanceStore: data.attendanceStore || attendanceStore,
        teacherAgendaStore: data.teacherAgendaStore || teacherAgendaStore,
        whatsappLogs: data.whatsappLogs || getWhatsAppTransmissionLogs(),
      });

      return {
        success: syncResult.success,
        message: syncResult.success
          ? 'Data cadangan berhasil dipulihkan secara penuh dan disinkronkan ke Supabase Cloud!'
          : 'Data cadangan berhasil diterapkan di perangkat Anda. Catatan: ' + syncResult.message,
      };
    } catch (err: any) {
      console.warn('Supabase cloud sync error during restore:', err);
      return {
        success: true,
        message: 'Data cadangan berhasil dipulihkan di penyimpanan lokal.',
      };
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  const handleExportWordClick = () => {
    if (!isAdminUnlocked) {
      triggerAuthPrompt({
        requiredLevel: 'admin',
        title: 'Export Word Dilindungi',
        description: 'Masukkan Password Admin untuk mengunduh rekap Word.',
        onSuccess: () => {
          exportRecapToWord(
            students,
            schoolSettings,
            currentMonthName,
            selectedYear,
            activeAttendanceData,
            daysInMonth
          );
        },
      });
      return;
    }

    exportRecapToWord(
      students,
      schoolSettings,
      currentMonthName,
      selectedYear,
      activeAttendanceData,
      daysInMonth
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12 selection:bg-yellow-300 selection:text-slate-900">
      {/* Top Application Navigation Bar (Hidden in Print Mode) */}
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-xl sticky top-0 z-40 border-b-2 border-yellow-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-blue-950 rounded-2xl flex items-center justify-center font-black shadow-lg border-2 border-white">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base tracking-wide text-yellow-300 uppercase">
                {schoolSettings.schoolName}
              </div>
              <div className="text-[11px] text-blue-200 font-medium">
                Absensi Digital Kelas {schoolSettings.className} • Multi-Level Access
              </div>
            </div>
          </div>

          {/* Controls: Month/Year Selector & Export / Print / Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Automatic Month & Year Navigation Control */}
            <div className="flex items-center gap-1 bg-blue-900/90 p-1 rounded-2xl border border-blue-400/50 text-xs font-bold shadow-inner">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-blue-800 text-yellow-300 hover:text-white rounded-xl transition-all active:scale-95"
                title="Bulan Sebelumnya (Otomatis ganti tahun jika lewat Januari)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                className="bg-transparent text-white font-black focus:outline-none cursor-pointer py-1 px-1.5 text-xs sm:text-sm"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="text-slate-900 font-bold">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-yellow-300 font-black focus:outline-none cursor-pointer py-1 px-1.5 text-xs sm:text-sm"
              >
                {Array.from({ length: 11 }, (_, i) => currentRealYear - 5 + i).map((y) => (
                  <option key={y} value={y} className="text-slate-900 font-bold">
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-blue-800 text-yellow-300 hover:text-white rounded-xl transition-all active:scale-95"
                title="Bulan Berikutnya (Otomatis ganti tahun jika lewat Desember)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleGoToCurrentMonth}
                className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-blue-950 px-2 py-1 rounded-xl text-[11px] font-black transition-all active:scale-95 ml-1 shadow-sm"
                title="Kembali ke Bulan & Tahun Saat Ini (Real-time)"
              >
                <Clock className="w-3 h-3" />
                <span className="hidden xs:inline">Bulan Ini</span>
              </button>
            </div>

            {/* Kirim Laporan WA Kehadiran Button */}
            <button
              onClick={handleOpenWaReport}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition-all ring-2 ring-emerald-300/70"
              title="Kirim Laporan Kehadiran Ke Group WhatsApp Orang Tua"
            >
              <MessageSquare className="w-4 h-4 text-emerald-200" />
              <span className="hidden md:inline">Kirim Laporan WA Kehadiran</span>
              <span className="md:hidden inline">Laporan WA</span>
            </button>

            {/* Export Word Button (Admin Only) */}
            {isAdminUnlocked && (
              <button
                onClick={handleExportWordClick}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-extrabold px-3 py-2 rounded-xl shadow border border-blue-400/50 transition-all active:scale-95"
                title="Download Rekap Microsoft Word (.doc)"
              >
                <Download className="w-3.5 h-3.5 text-yellow-300" />
                <span className="hidden sm:inline">Export Word</span>
              </button>
            )}

            {/* Print Poster Button (Admin Only) */}
            {isAdminUnlocked && (
              <button
                onClick={handlePrintClick}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-2 rounded-xl shadow border border-amber-300 transition-all active:scale-95"
                title="Cetak Laporan Poster / Simpan PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak / PDF</span>
              </button>
            )}

            {/* Supabase Cloud Live Status Indicator (Khusus Super Admin, disembunyikan saat Guru atau Admin login) */}
            {userRole === 'superadmin' && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setDashboardSubTab('supabase');
                }}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 shadow-sm cursor-pointer ${
                  supabaseConnected
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/60 text-amber-200'
                }`}
                title="Status Database Supabase (Klik untuk membuka pengaturan Supabase & SQL Editor) - Khusus Super Admin"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-extrabold text-white">
                  {supabaseConnected ? 'Supabase Aktif' : 'Supabase Setup'}
                </span>
              </button>
            )}

            {/* Dashboard Tab di Header Utama (Wajib Login Admin) */}
            <button
              onClick={() => {
                if (activeTab === 'dashboard') {
                  handleTabClick('rekap');
                } else {
                  handleTabClick('dashboard');
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl shadow-md border transition-all active:scale-95 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 ring-2 ring-yellow-300 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-yellow-300 border-slate-700'
              }`}
              title={
                activeTab === 'dashboard'
                  ? 'Klik untuk kembali ke Rekap Absensi Siswa'
                  : !isAdminUnlocked
                  ? 'Dashboard (Wajib Login Admin): Laporan Wali Kelas, Rekap Ketidakhadiran, Database Guru, Database Siswa, Pengaturan & Backup'
                  : 'Dashboard: Laporan Wali Kelas, Rekap Ketidakhadiran, Database Guru, Database Siswa, Pengaturan & Backup'
              }
            >
              <LayoutDashboard className="w-4 h-4 text-amber-500" />
              <span>{activeTab === 'dashboard' ? 'Tutup Dashboard' : 'Dashboard'}</span>
              {!isAdminUnlocked && activeTab !== 'dashboard' && (
                <Lock className="w-3 h-3 text-yellow-300 ml-0.5" />
              )}
            </button>

            {/* Active User Role Badge & Quick Logout Button */}
            {userRole !== 'guest' && (
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow border ${
                    userRole === 'superadmin'
                      ? 'bg-purple-950 text-yellow-300 border-purple-400 ring-2 ring-purple-400/50'
                      : userRole === 'admin'
                      ? 'bg-indigo-950 text-yellow-300 border-indigo-400'
                      : 'bg-emerald-950 text-emerald-200 border-emerald-400'
                  }`}
                  title={`Status Login: ${
                    userRole === 'superadmin'
                      ? 'Super Admin (Level Tertinggi - Akses Penuh)'
                      : userRole === 'admin'
                      ? 'Admin (Level 2)'
                      : 'Guru (Level 1)'
                  }`}
                >
                  {userRole === 'superadmin' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-yellow-300" />
                  ) : userRole === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                  <span className="hidden sm:inline">
                    {userRole === 'superadmin'
                      ? 'Super Admin'
                      : userRole === 'admin'
                      ? 'Admin'
                      : 'Guru'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow border border-red-400 transition-all cursor-pointer"
                  title="Logout / Kunci Sesi"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
        {/* Poster Style Banner Header (Hidden when printing) */}
        <div className="print:hidden">
          <BannerHeader
            settings={schoolSettings}
            selectedMonth={currentMonthName}
            selectedYear={selectedYear}
            userRole={userRole}
            isAdminUnlocked={isAdminUnlocked}
            onLogout={handleLogout}
          />
        </div>

        {/* Navigation Tabs Bar (Hidden in Print Mode & Hidden saat aktif di Dashboard) */}
        {activeTab !== 'dashboard' && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
            <button
              onClick={() => handleTabClick('rekap')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                activeTab === 'rekap'
                  ? 'bg-blue-900 text-white ring-2 ring-yellow-400 shadow-md'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Table className="w-4 h-4 text-yellow-300" />
              Rekap Bulanan (Matriks)
            </button>

            <button
              onClick={() => handleTabClick('harian')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                activeTab === 'harian'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-300 shadow-md'
                  : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-yellow-200" />
              Input Absensi Harian
            </button>

            {/* Tab: Agenda Kehadiran Guru di Kelas */}
            <button
              onClick={() => handleTabClick('agenda_guru')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                activeTab === 'agenda_guru'
                  ? 'bg-blue-800 text-white ring-2 ring-yellow-400 shadow-md'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
              title="Agenda Kehadiran Guru di Kelas & Jurnal KBM"
            >
              <BookOpen className="w-4 h-4 text-yellow-300" />
              <span>Agenda Guru di Kelas</span>
            </button>
          </div>
        )}

        {/* Tab 0: Dashboard Terpadu (Wajib Login Admin) */}
        {activeTab === 'dashboard' && (
          !isAdminUnlocked && schoolSettings.requirePassword !== false ? (
            <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-8 sm:p-12 mb-6 text-center animate-in fade-in duration-300">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-300">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black mb-2 border border-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    Wajib Login Level Admin
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Dashboard Khusus Administrator
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                    Halaman Dashboard memuat pengelolaan Laporan Wali Kelas, Database Guru, dan Database Siswa. Silakan masukkan Password Admin untuk mengakses.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() =>
                      triggerAuthPrompt({
                        requiredLevel: 'admin',
                        title: 'Login Admin Dashboard',
                        description: 'Masukkan Password Admin untuk membuka menu Dashboard.',
                        onSuccess: (role) => setUserRole(role),
                      })
                    }
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-yellow-300" />
                    <span>Login Admin Sekarang</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('rekap')}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Kembali ke Halaman Utama
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <DashboardView
              students={students}
              teachers={teachers}
              subjects={subjects}
              schoolSettings={schoolSettings}
              teacherAgendaList={activeTeacherAgendaList}
              activeAttendanceData={activeAttendanceData}
              attendanceStore={attendanceStore}
              teacherAgendaStore={teacherAgendaStore}
              selectedMonthIndex={selectedMonthIndex}
              selectedYear={selectedYear}
              currentMonthName={currentMonthName}
              selectedDay={selectedDay}
              isAttendanceUnlocked={isAttendanceUnlocked}
              isAdminUnlocked={isAdminUnlocked}
              userRole={userRole}
              triggerAuthPrompt={triggerAuthPrompt}
              onRequestConfirmation={handleRequestConfirmation}
              onAddTeacher={handleAddTeacher}
              onEditTeacher={handleEditTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onResetTeachers={handleResetTeachers}
              onBatchSetTeachers={handleBatchSetTeachers}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onResetSubjects={handleResetSubjects}
              onBatchSetSubjects={handleBatchSetSubjects}
              onAddStudent={handleAddStudent}
              onEditStudent={handleEditStudent}
              onDeleteStudent={handleDeleteStudent}
              onResetStudents={handleResetStudents}
              onSetStudents={handleSetStudents}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToCurrentMonth={handleGoToCurrentMonth}
              onUpdateSchoolSettings={handleSaveSettings}
              onUpdateStatus={handleUpdateStatus}
              onRestoreBackup={handleRestoreBackup}
              onNavigateTab={(tab) => handleTabClick(tab)}
              currentSubTab={dashboardSubTab}
              onSubTabChange={setDashboardSubTab}
            />
          )
        )}

        {/* Tab 1: Rekap Laporan Bulanan (Table Matrix matched with poster) */}
        {activeTab === 'rekap' && (
          <MonthlyRecapTable
            students={students}
            schoolSettings={schoolSettings}
            selectedMonthIndex={selectedMonthIndex}
            selectedMonthName={currentMonthName}
            selectedYear={selectedYear}
            attendanceData={activeAttendanceData}
            onUpdateStatus={handleUpdateStatus}
            onQuickMarkDay={handleQuickMarkDay}
            onResetMonthAttendance={handleResetMonthAttendance}
            isUnlocked={isAttendanceUnlocked}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockSession={(role) => setUserRole(role || 'guru')}
          />
        )}

        {/* Tab 2: Input Absensi Harian */}
        {activeTab === 'harian' && (
          <DailyAttendance
            students={students}
            schoolSettings={schoolSettings}
            selectedYear={selectedYear}
            selectedMonthIndex={selectedMonthIndex}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            attendanceData={activeAttendanceData}
            onUpdateStatus={handleUpdateStatus}
            onQuickMarkDay={handleQuickMarkDay}
            onResetMonthAttendance={handleResetMonthAttendance}
            onResetDayAttendance={handleResetDayAttendance}
            isUnlocked={isAttendanceUnlocked}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockSession={(role) => setUserRole(role || 'guru')}
            onLockSession={() => setUserRole('guest')}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onGoToCurrentMonth={handleGoToCurrentMonth}
            onRequestConfirmation={handleRequestConfirmation}
          />
        )}

        {/* Tab Baru: Agenda Kehadiran Guru di Kelas */}
        {activeTab === 'agenda_guru' && (
          <ClassroomTeacherAgenda
            students={students}
            schoolSettings={schoolSettings}
            selectedYear={selectedYear}
            selectedMonthIndex={selectedMonthIndex}
            selectedMonthName={currentMonthName}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            attendanceData={activeAttendanceData}
            teacherAgendaList={activeTeacherAgendaList}
            teachers={teachers}
            subjects={subjects}
            onSaveAgendaList={handleSaveTeacherAgendaList}
            isUnlocked={isAttendanceUnlocked}
            isAdminUnlocked={isAdminUnlocked}
            userRole={userRole}
            onUnlockSession={(role) =>
              triggerAuthPrompt({
                requiredLevel: role || 'guru',
                title: 'Otorisasi Agenda Kehadiran Guru',
                description: 'Masukkan PIN Guru atau Password Admin untuk menambah atau mengubah agenda guru.',
                onSuccess: (unlockedRole) => setUserRole(unlockedRole),
              })
            }
            onRequestConfirmation={handleRequestConfirmation}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onGoToCurrentMonth={handleGoToCurrentMonth}
          />
        )}
      </main>

      {/* WhatsApp Report Modal */}
      <WhatsAppReportModal
        isOpen={isWaReportOpen}
        onClose={() => setIsWaReportOpen(false)}
        students={students}
        schoolSettings={schoolSettings}
        selectedDay={selectedDay}
        selectedMonthIndex={selectedMonthIndex}
        selectedYear={selectedYear}
        attendanceData={activeAttendanceData}
        attendanceStore={attendanceStore}
      />

      {/* Global Confirmation Modal for Destructive Actions */}
      <ConfirmationModal
        isOpen={confirmationConfig.isOpen}
        onClose={() =>
          setConfirmationConfig((prev) => ({ ...prev, isOpen: false }))
        }
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        confirmText={confirmationConfig.confirmText}
        cancelText={confirmationConfig.cancelText}
        variant={confirmationConfig.variant}
        icon={confirmationConfig.icon}
        onConfirm={confirmationConfig.onConfirm}
      />

      {/* Global Configurable Password Unlock Modal */}
      <PasswordPromptModal
        isOpen={passwordModalConfig.isOpen}
        onClose={() => {
          setPasswordModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onSuccess={(role) => {
          setPasswordModalConfig((prev) => ({ ...prev, isOpen: false }));
          setUserRole(role);
          if (passwordModalConfig.onSuccessAction) {
            passwordModalConfig.onSuccessAction(role);
          }
        }}
        guruPassword={schoolSettings.attendancePassword || '1234'}
        adminPassword={schoolSettings.adminPassword || 'admin'}
        superAdminPassword={schoolSettings.superAdminPassword || 'superadmin'}
        requiredLevel={passwordModalConfig.requiredLevel}
        title={passwordModalConfig.title}
        description={passwordModalConfig.description}
      />

      {/* Footer Notice & Creator Info */}
      <footer className="mt-10 mb-6 text-center text-xs text-slate-500 print:hidden flex flex-col items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 bg-white/90 hover:bg-white text-slate-700 font-medium px-4 py-2 rounded-full border border-slate-200 shadow-xs transition-all">
          <Code className="w-3.5 h-3.5 text-blue-600" />
          <span>Aplikasi Absensi Siswa • created by <strong className="text-slate-900 font-bold">DEDI SAPUTRA, ST</strong></span>
        </div>
        <p className="text-[11px] text-slate-400">
          {schoolSettings.schoolName} — Kelas {schoolSettings.className} • Tahun Pelajaran {schoolSettings.academicYear}
        </p>
      </footer>

      {/* Print Footer Notice (Visible only when printing) */}
      <footer className="hidden print:block text-center text-[10px] text-slate-500 mt-4 border-t pt-2">
        Dokumen Laporan Absensi Siswa Resmi {schoolSettings.schoolName} Kelas {schoolSettings.className} • Tahun Pelajaran {schoolSettings.academicYear}
      </footer>

      {/* Floating Real-Time Toast for Automated WhatsApp Dispatch */}
      {autoSendToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100%-3rem)] animate-in slide-in-from-bottom-5 duration-300 print:hidden">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${
              autoSendToast.status === 'sending'
                ? 'bg-slate-900 text-white border-amber-400/50'
                : autoSendToast.status === 'success'
                ? 'bg-emerald-900 text-white border-emerald-400'
                : 'bg-rose-900 text-white border-rose-400'
            }`}
          >
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              {autoSendToast.status === 'sending' ? (
                <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />
              ) : autoSendToast.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider text-yellow-300">
                  {autoSendToast.status === 'sending'
                    ? 'Gateway WhatsApp Fonnte'
                    : autoSendToast.status === 'success'
                    ? 'Pengiriman Otomatis Berhasil'
                    : 'Pengiriman Otomatis Gagal'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoSendToast(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-100 font-medium mt-1 leading-relaxed">
                {autoSendToast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
