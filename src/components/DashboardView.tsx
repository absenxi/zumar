import React, { useState } from 'react';
import {
  Student,
  Teacher,
  Subject,
  SchoolSettings,
  TeacherAgendaEntry,
  AttendanceStatus,
  UserRole,
} from '../types';
import { ConfirmationConfig } from './ConfirmationModal';
import { HomeroomMonthlyReport } from './HomeroomMonthlyReport';
import { TeacherManagement } from './TeacherManagement';
import { StudentManagement } from './StudentManagement';
import { AppSettingsAndBackup } from './AppSettingsAndBackup';
import { WhatsAppGatewaySettings } from './WhatsAppGatewaySettings';
import { MonthlyAbsenceRecap } from './MonthlyAbsenceRecap';
import { StudentRecapDetail } from './StudentRecapDetail';
import { SupabaseConnectionDashboard } from './SupabaseConnectionDashboard';
import {
  Users,
  GraduationCap,
  FileText,
  FileSpreadsheet,
  Settings,
  ArrowLeft,
  SlidersHorizontal,
  Database,
  UserCheck,
} from 'lucide-react';

export type DashboardSubTab =
  | 'laporan_walikelas'
  | 'rekap_ketidakhadiran'
  | 'rekap_per_siswa'
  | 'guru'
  | 'siswa'
  | 'gateway'
  | 'supabase'
  | 'pengaturan';

interface DashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  subjects?: Subject[];
  schoolSettings: SchoolSettings;
  teacherAgendaList: TeacherAgendaEntry[];
  activeAttendanceData: Record<string, Record<number, AttendanceStatus>>;
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
  selectedMonthIndex: number;
  selectedYear: number;
  currentMonthName: string;
  selectedDay: number;
  isAttendanceUnlocked: boolean;
  isAdminUnlocked: boolean;
  userRole: UserRole | null;
  triggerAuthPrompt: (config: {
    requiredLevel: 'admin' | 'guru';
    title: string;
    description: string;
    onSuccess: (role: UserRole) => void;
  }) => void;
  onRequestConfirmation: (config: ConfirmationConfig) => void;

  // Handlers for Teachers
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onResetTeachers: () => void;
  onBatchSetTeachers: (newTeachers: Teacher[]) => void;

  // Handlers for Subjects (optional)
  onAddSubject?: (subject: Omit<Subject, 'id'>) => void;
  onEditSubject?: (subject: Subject) => void;
  onDeleteSubject?: (id: string) => void;
  onResetSubjects?: () => void;
  onBatchSetSubjects?: (newSubjects: Subject[]) => void;

  // Handlers for Students
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onResetStudents: () => void;
  onSetStudents: (newStudents: Student[]) => void;

  // Handlers for Homeroom Report & Settings
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
  onUpdateSchoolSettings: (settings: SchoolSettings) => void;
  onUpdateStatus?: (
    studentId: string,
    day: number,
    status: AttendanceStatus,
    explicitMonthKey?: string
  ) => void;
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

  // Optional navigation to external main tabs
  onNavigateTab?: (tab: 'rekap' | 'harian' | 'agenda_guru') => void;

  // Controlled or initial subTab
  currentSubTab?: DashboardSubTab;
  onSubTabChange?: (tab: DashboardSubTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  teachers,
  subjects,
  schoolSettings,
  teacherAgendaList,
  activeAttendanceData,
  attendanceStore,
  teacherAgendaStore,
  selectedMonthIndex,
  selectedYear,
  currentMonthName,
  selectedDay,
  isAttendanceUnlocked,
  isAdminUnlocked,
  userRole,
  triggerAuthPrompt,
  onRequestConfirmation,
  onRestoreBackup,

  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onResetTeachers,
  onBatchSetTeachers,

  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onResetSubjects,
  onBatchSetSubjects,

  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onResetStudents,
  onSetStudents,

  onPrevMonth,
  onNextMonth,
  onGoToCurrentMonth,
  onUpdateSchoolSettings,
  onUpdateStatus,
  onNavigateTab,

  currentSubTab,
  onSubTabChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<DashboardSubTab>('laporan_walikelas');
  const subTab = currentSubTab !== undefined ? currentSubTab : internalSubTab;
  const setSubTab = (newTab: DashboardSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(newTab);
    } else {
      setInternalSubTab(newTab);
    }
  };

  // Sembunyikan tab Gateway WhatsApp & Koneksi Supabase saat guru atau admin login (hanya boleh diakses oleh superadmin)
  React.useEffect(() => {
    if ((subTab === 'supabase' || subTab === 'gateway') && userRole !== 'superadmin') {
      setSubTab('laporan_walikelas');
    }
  }, [subTab, userRole]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar inside Dashboard (Tabs: Laporan Wali Kelas, Database Guru, Database Siswa) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Sub-tab 1: Laporan Wali Kelas (Tanpa Perlu Login) */}
          <button
            onClick={() => setSubTab('laporan_walikelas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'laporan_walikelas'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
            }`}
            title="Laporan Bulanan Wali Kelas (Bebas Akses / Tanpa Login)"
          >
            <FileText className="w-4 h-4 text-yellow-300" />
            <span>Laporan Wali Kelas</span>
          </button>

          {/* Sub-tab 2: Rekap Ketidakhadiran Siswa (Sesuai Format Excel / Gambar) */}
          <button
            onClick={() => setSubTab('rekap_ketidakhadiran')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'rekap_ketidakhadiran'
                ? 'bg-[#2B579A] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-700 hover:text-slate-900 hover:bg-blue-50'
            }`}
            title="Rekap Total Ketidakhadiran Seluruh Siswa Per Bulan (Sakit, Izin, Alpa)"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-200" />
            <span>Rekap Ketidakhadiran</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                subTab === 'rekap_ketidakhadiran' ? 'bg-blue-950 text-white' : 'bg-blue-100 text-blue-900'
              }`}
            >
              Matriks
            </span>
          </button>

          {/* Sub-tab 2B: Rekap Kehadiran Per 1 Siswa (1 Semester Sesuai Gambar) */}
          <button
            onClick={() => setSubTab('rekap_per_siswa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'rekap_per_siswa'
                ? 'bg-indigo-800 text-white shadow-sm ring-2 ring-indigo-300'
                : 'text-slate-700 hover:text-slate-900 hover:bg-indigo-50'
            }`}
            title="Rekap Kehadiran Per 1 Siswa Selama 1 Semester (6 Bulan)"
          >
            <UserCheck className="w-4 h-4 text-yellow-300" />
            <span>Rekap Per Siswa</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                subTab === 'rekap_per_siswa' ? 'bg-indigo-950 text-yellow-300' : 'bg-indigo-100 text-indigo-900'
              }`}
            >
              1 Semester
            </span>
          </button>

          {/* Sub-tab 3: Database Guru */}
          <button
            onClick={() => setSubTab('guru')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'guru'
                ? 'bg-purple-900 text-white shadow-sm ring-2 ring-purple-300'
                : 'text-slate-700 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="Database Guru & Tenaga Pendidik"
          >
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <span>Database Guru</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                subTab === 'guru' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {teachers.length}
            </span>
          </button>

          {/* Sub-tab 3: Database Siswa (Tanpa Perlu Login) */}
          <button
            onClick={() => setSubTab('siswa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'siswa'
                ? 'bg-blue-900 text-white shadow-sm ring-2 ring-blue-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-blue-50'
            }`}
            title="Kelola Master Database Siswa (Bebas Akses / Tanpa Login)"
          >
            <Users className="w-4 h-4 text-blue-300" />
            <span>Database Siswa</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                subTab === 'siswa' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {students.length}
            </span>
          </button>

          {/* Sub-tab 4: Gateway WhatsApp API (Fonnte) - Khusus Super Admin, disembunyikan saat Guru atau Admin login */}
          {userRole === 'superadmin' && (
            <button
              onClick={() => setSubTab('gateway')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
                subTab === 'gateway'
                  ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-teal-50'
              }`}
              title="Gateway WhatsApp (Fonnte) - API Token & Nomor Tujuan / ID Group - Khusus Super Admin"
            >
              <SlidersHorizontal className="w-4 h-4 text-teal-300" />
              <span>Gateway WhatsApp</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  subTab === 'gateway' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800'
                }`}
              >
                Fonnte
              </span>
            </button>
          )}

          {/* Sub-tab 5: Koneksi Supabase & SQL Editor (Khusus Super Admin, disembunyikan saat Guru atau Admin login) */}
          {userRole === 'superadmin' && (
            <button
              onClick={() => setSubTab('supabase')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
                subTab === 'supabase'
                  ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-300'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-emerald-50'
              }`}
              title="Koneksi Database Supabase (API URL, Anon Key, & SQL Editor) - Khusus Super Admin"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Koneksi Supabase</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  subTab === 'supabase' ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                SQL
              </span>
            </button>
          )}

          {/* Sub-tab 6: Pengaturan Aplikasi & Backup Data */}
          <button
            onClick={() => setSubTab('pengaturan')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              subTab === 'pengaturan'
                ? 'bg-slate-900 text-yellow-300 shadow-sm ring-2 ring-yellow-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Pengaturan Aplikasi, Identitas Sekolah, Password, serta Backup & Restore Data"
          >
            <Settings className="w-4 h-4 text-yellow-400" />
            <span>Pengaturan & Backup</span>
          </button>
        </div>

        {/* Tombol Navigasi Kembali ke Halaman Absensi Siswa */}
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('rekap')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-extrabold text-xs sm:text-sm border border-blue-200 shadow-xs transition-all active:scale-95 cursor-pointer ml-auto"
            title="Keluar dari Dashboard dan kembali ke Rekap Absensi Siswa"
          >
            <ArrowLeft className="w-4 h-4 text-blue-700" />
            <span>Kembali ke Absensi</span>
          </button>
        )}
      </div>

      {/* Main Content Area based on subTab */}

      {/* SubTab 1: Laporan Wali Kelas (Tanpa Perlu Login) */}
      {subTab === 'laporan_walikelas' && (
        <HomeroomMonthlyReport
          students={students}
          teachers={teachers}
          teacherAgendaList={teacherAgendaList}
          schoolSettings={schoolSettings}
          selectedMonthIndex={selectedMonthIndex}
          selectedMonthName={currentMonthName}
          selectedYear={selectedYear}
          attendanceData={activeAttendanceData}
          isUnlocked={true}
          isAdminUnlocked={true}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          onGoToCurrentMonth={onGoToCurrentMonth}
          onUpdateSchoolSettings={onUpdateSchoolSettings}
          onRequestConfirmation={onRequestConfirmation}
        />
      )}

      {/* SubTab: Rekap Ketidakhadiran Siswa (Sesuai Gambar / Format Excel) */}
      {subTab === 'rekap_ketidakhadiran' && (
        <MonthlyAbsenceRecap
          students={students}
          schoolSettings={schoolSettings}
          selectedMonthIndex={selectedMonthIndex}
          selectedYear={selectedYear}
          currentMonthName={currentMonthName}
          activeAttendanceData={activeAttendanceData}
          attendanceStore={attendanceStore}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          onGoToCurrentMonth={onGoToCurrentMonth}
        />
      )}

      {/* SubTab: Rekap Kehadiran Per 1 Siswa Selama 1 Semester */}
      {subTab === 'rekap_per_siswa' && (
        <StudentRecapDetail
          students={students}
          schoolSettings={schoolSettings}
          selectedMonthIndex={selectedMonthIndex}
          selectedMonthName={currentMonthName}
          selectedYear={selectedYear}
          attendanceStore={attendanceStore}
          activeAttendanceData={activeAttendanceData}
        />
      )}

      {/* SubTab 2: Database Guru */}
      {subTab === 'guru' && (
        <TeacherManagement
          teachers={teachers}
          subjects={subjects}
          onAddTeacher={onAddTeacher}
          onEditTeacher={onEditTeacher}
          onDeleteTeacher={onDeleteTeacher}
          onResetTeachers={onResetTeachers}
          onBatchSetTeachers={onBatchSetTeachers}
          schoolSettings={schoolSettings}
          isUnlocked={isAttendanceUnlocked}
          isAdminUnlocked={isAdminUnlocked}
          userRole={userRole}
          onUnlockSession={(role) =>
            triggerAuthPrompt({
              requiredLevel: role || 'admin',
              title: 'Buka Akses Pengelolaan Database Guru',
              description:
                'Masukkan PIN Guru atau Password Admin untuk menambah, mengubah, atau menghapus data guru.',
              onSuccess: () => {},
            })
          }
          onRequestConfirmation={onRequestConfirmation}
        />
      )}

      {/* SubTab 3: Database Siswa (Tanpa Perlu Login) */}
      {subTab === 'siswa' && (
        <StudentManagement
          students={students}
          onAddStudent={onAddStudent}
          onEditStudent={onEditStudent}
          onDeleteStudent={onDeleteStudent}
          onResetStudents={onResetStudents}
          onSetStudents={onSetStudents}
          schoolSettings={schoolSettings}
          isUnlocked={true}
          onRequestConfirmation={onRequestConfirmation}
          selectedDay={selectedDay}
          selectedMonthIndex={selectedMonthIndex}
          selectedYear={selectedYear}
          activeAttendanceData={activeAttendanceData}
          attendanceStore={attendanceStore}
        />
      )}

      {/* SubTab 4: Gateway WhatsApp API (Fonnte) - Khusus Super Admin */}
      {subTab === 'gateway' && userRole === 'superadmin' && (
        <WhatsAppGatewaySettings
          schoolSettings={schoolSettings}
          onSaveSettings={onUpdateSchoolSettings}
          students={students}
          attendanceData={activeAttendanceData}
          selectedDay={selectedDay}
          selectedMonthIndex={selectedMonthIndex}
          selectedYear={selectedYear}
        />
      )}

      {/* SubTab 5: Koneksi Supabase, API URL, Anon Key & SQL Editor (Khusus Super Admin) */}
      {subTab === 'supabase' && userRole === 'superadmin' && (
        <SupabaseConnectionDashboard
          schoolSettings={schoolSettings}
          students={students}
          teachers={teachers}
          subjects={subjects}
          attendanceStore={attendanceStore}
          teacherAgendaStore={teacherAgendaStore}
          onSettingsUpdated={onUpdateSchoolSettings}
        />
      )}

      {/* SubTab 6: Pengaturan Aplikasi & Backup Data */}
      {subTab === 'pengaturan' && (
        <AppSettingsAndBackup
          schoolSettings={schoolSettings}
          students={students}
          teachers={teachers}
          subjects={subjects}
          attendanceStore={attendanceStore}
          teacherAgendaStore={teacherAgendaStore}
          onSaveSettings={onUpdateSchoolSettings}
          onRestoreBackup={onRestoreBackup || (() => {})}
          onRequestConfirmation={onRequestConfirmation}
          userRole={userRole || undefined}
        />
      )}
    </div>
  );
};
