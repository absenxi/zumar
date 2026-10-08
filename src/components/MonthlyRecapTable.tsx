import React, { useState } from 'react';
import { Student, SchoolSettings, AttendanceStatus, UserRole } from '../types';
import { Search } from 'lucide-react';
import { PasswordPromptModal } from './PasswordPromptModal';

interface MonthlyRecapTableProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedMonthIndex: number;
  selectedMonthName: string;
  selectedYear: number;
  attendanceData: Record<string, Record<number, AttendanceStatus>>;
  onUpdateStatus: (studentId: string, day: number, status: AttendanceStatus) => void;
  onQuickMarkDay: (day: number, status: AttendanceStatus) => void;
  onResetMonthAttendance?: () => void;
  isUnlocked?: boolean;
  isAdminUnlocked?: boolean;
  onUnlockSession?: (role?: UserRole) => void;
}

export const MonthlyRecapTable: React.FC<MonthlyRecapTableProps> = ({
  students,
  schoolSettings,
  selectedMonthIndex,
  selectedMonthName,
  selectedYear,
  attendanceData,
  onUpdateStatus,
  onQuickMarkDay,
  onResetMonthAttendance,
  isUnlocked = false,
  isAdminUnlocked = false,
  onUnlockSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isPasswordRequired = schoolSettings.requirePassword !== false;

  const handleCellClick = (studentId: string, day: number, newStatus: AttendanceStatus) => {
    if (isPasswordRequired && !isUnlocked) {
      setPendingAction(() => () => onUpdateStatus(studentId, day, newStatus));
      setShowPasswordModal(true);
    } else {
      onUpdateStatus(studentId, day, newStatus);
    }
  };

  const handlePasswordSuccess = (role: UserRole) => {
    if (onUnlockSession) onUnlockSession(role);
    setShowPasswordModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Number of days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender =
      selectedGenderFilter === 'ALL' || s.gender === selectedGenderFilter;
    return matchesSearch && matchesGender;
  });

  // Cycle status on cell click
  const cycleStatus = (currentStatus: AttendanceStatus): AttendanceStatus => {
    if (currentStatus === 'H') return 'S';
    if (currentStatus === 'S') return 'I';
    if (currentStatus === 'I') return 'A';
    if (currentStatus === 'A') return '-';
    return 'H';
  };

  const getStatusBgColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'H':
        return 'bg-emerald-500 text-white font-black';
      case 'A':
        return 'bg-red-500 text-white font-black';
      case 'S':
        return 'bg-sky-500 text-white font-black';
      case 'I':
        return 'bg-amber-400 text-slate-900 font-black';
      case '-':
      default:
        return 'bg-slate-50 text-slate-300 font-normal';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-3 sm:p-5 overflow-hidden print:shadow-none print:border-none print:p-0">
      {/* Search & Quick Controls (Hidden in Print Mode) */}
      <div className="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-300 p-0.5 bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setSelectedGenderFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedGenderFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({students.length})
            </button>
            <button
              onClick={() => setSelectedGenderFilter('L')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedGenderFilter === 'L'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              L ({students.filter((s) => s.gender === 'L').length})
            </button>
            <button
              onClick={() => setSelectedGenderFilter('P')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedGenderFilter === 'P'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              P ({students.filter((s) => s.gender === 'P').length})
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
          <span className="text-slate-500">Petunjuk:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500 text-white">H = Hadir</span>
          <span className="px-2 py-0.5 rounded bg-sky-500 text-white">S = Sakit</span>
          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900">I = Izin</span>
          <span className="px-2 py-0.5 rounded bg-red-500 text-white">A = Alpa</span>
        </div>
      </div>

      {/* Main Grid Matrix Table */}
      <div className="overflow-x-auto border-2 border-blue-900 rounded-lg shadow-inner">
        <table className="w-full text-center border-collapse text-[10px] sm:text-xs">
          <thead>
            {/* Top Header Grouping */}
            <tr className="bg-blue-900 text-white font-extrabold uppercase tracking-wider border-b-2 border-blue-950">
              <th rowSpan={2} className="px-2 py-2 border-r border-blue-700 w-8">
                NO
              </th>
              <th rowSpan={2} className="px-3 py-2 border-r border-blue-700 text-left min-w-[180px]">
                NAMA SISWA
              </th>
              <th rowSpan={2} className="px-1 py-2 border-r border-blue-700 w-10 text-center">
                JENIS KELAMIN
              </th>
              <th colSpan={daysInMonth} className="py-1 border-r border-blue-700 bg-blue-800">
                TANGGAL
              </th>
              <th colSpan={4} className="py-1 border-r border-blue-700 bg-indigo-900">
                JUMLAH
              </th>
              <th rowSpan={2} className="px-2 py-2 w-14">
                KET
              </th>
            </tr>

            {/* Date Numbers Row */}
            <tr className="bg-blue-800 text-white font-bold text-[9px] sm:text-[11px] border-b border-blue-900">
              {dateArray.map((d) => {
                const dateObj = new Date(selectedYear, selectedMonthIndex, d);
                const isSunday = dateObj.getDay() === 0;
                return (
                  <th
                    key={d}
                    className={`w-6 py-1 border-r border-blue-700 ${
                      isSunday ? 'bg-red-600 text-white font-black' : ''
                    }`}
                    title={`Tanggal ${d} ${selectedMonthName}`}
                  >
                    {d}
                  </th>
                );
              })}
              {/* Summary Subheaders */}
              <th className="w-7 py-1 bg-emerald-700 text-white border-r border-blue-700">HADIR</th>
              <th className="w-7 py-1 bg-red-700 text-white border-r border-blue-700">ALPA</th>
              <th className="w-7 py-1 bg-sky-700 text-white border-r border-blue-700">S</th>
              <th className="w-7 py-1 bg-amber-600 text-white border-r border-blue-700">I</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-300 font-medium">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 8} className="py-8 text-center text-slate-500 font-bold">
                  Tidak ada data siswa ditemukan.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, idx) => {
                const studentRecords = attendanceData[student.id] || {};
                let countH = 0;
                let countA = 0;
                let countS = 0;
                let countI = 0;

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-blue-50/70 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                    }`}
                  >
                    {/* NO */}
                    <td className="py-1 px-1 border-r border-slate-300 font-bold text-slate-700">
                      {student.no}
                    </td>

                    {/* NAMA SISWA */}
                    <td className="py-1 px-2 border-r border-slate-300 text-left font-bold text-slate-800 uppercase whitespace-nowrap">
                      {student.name}
                    </td>

                    {/* JENIS KELAMIN */}
                    <td className="py-1 px-1 border-r border-slate-300 font-extrabold text-slate-700">
                      {student.gender}
                    </td>

                    {/* 1..31 DATE STATUS CELLS */}
                    {dateArray.map((day) => {
                      const status = studentRecords[day] || '-';
                      if (status === 'H') countH++;
                      if (status === 'A') countA++;
                      if (status === 'S') countS++;
                      if (status === 'I') countI++;

                      const dateObj = new Date(selectedYear, selectedMonthIndex, day);
                      const isSunday = dateObj.getDay() === 0;

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(student.id, day, cycleStatus(status))}
                          className={`w-6 h-7 p-0 border-r border-slate-300 cursor-pointer transition-all hover:scale-105 select-none ${getStatusBgColor(
                            status
                          )} ${isSunday && status === '-' ? 'bg-red-50 text-red-300 font-normal' : ''}`}
                          title={`Klik untuk ubah: Tanggal ${day} (${student.name}) - Status: ${status}`}
                        >
                          <div className="w-full h-full flex items-center justify-center font-bold">
                            {status === '-' ? '' : status}
                          </div>
                        </td>
                      );
                    })}

                    {/* JUMLAH SUMMARY COLUMNS */}
                    <td className="py-1 border-r border-slate-300 bg-emerald-50 text-emerald-800 font-black">
                      {countH > 0 ? countH : ''}
                    </td>
                    <td className="py-1 border-r border-slate-300 bg-red-50 text-red-800 font-black">
                      {countA > 0 ? countA : ''}
                    </td>
                    <td className="py-1 border-r border-slate-300 bg-sky-50 text-sky-800 font-black">
                      {countS > 0 ? countS : ''}
                    </td>
                    <td className="py-1 border-r border-slate-300 bg-amber-50 text-amber-800 font-black">
                      {countI > 0 ? countI : ''}
                    </td>

                    {/* KET (Keterangan / Persentase) */}
                    <td className="py-1 px-1 text-[9px] font-bold text-slate-600">
                      {countH + countS + countI + countA > 0
                        ? `${Math.round(
                            (countH / (countH + countS + countI + countA)) * 100
                          )}%`
                        : ''}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signature Footer Block (Matching Poster Format & Synchronized with Settings) */}
      <div className="mt-8 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 text-xs font-bold text-slate-800">
        {/* Block 1: Kepala Sekolah */}
        <div className="bg-blue-50/80 border-2 border-blue-500 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-blue-800 text-white py-1 px-3 rounded-xl uppercase font-black tracking-wider text-[10px] mb-2 inline-block">
              MENGETAHUI
            </div>
            <div className="text-slate-800 font-bold mb-10 text-[11px]">
              Kepala Sekolah {schoolSettings.schoolName}
            </div>
          </div>
          <div>
            <div className="border-b-2 border-slate-800 font-extrabold pb-0.5 text-slate-900 inline-block px-2">
              {schoolSettings.principalName || 'Drs. H. M. Nursalam, M.M.'}
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1">
              NIP. {schoolSettings.principalNip || '-'}
            </div>
          </div>
        </div>

        {/* Block 2: Ketua Jurusan (Synchronized) */}
        <div className="bg-purple-50/80 border-2 border-purple-500 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-purple-800 text-white py-1 px-3 rounded-xl uppercase font-black tracking-wider text-[10px] mb-2 inline-block">
              MENGETAHUI
            </div>
            <div className="text-slate-800 font-bold mb-10 text-[11px]">
              Ketua Jurusan
            </div>
          </div>
          <div>
            <div className="border-b-2 border-slate-800 font-extrabold pb-0.5 text-slate-900 inline-block px-2">
              {schoolSettings.headOfDepartment || '...........................................'}
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1">
              NIP. {schoolSettings.headOfDepartmentNip || '-'}
            </div>
          </div>
        </div>

        {/* Block 3: Wali / Guru Kelas */}
        <div className="bg-emerald-50/80 border-2 border-emerald-600 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-emerald-800 text-white py-1 px-3 rounded-xl uppercase font-black tracking-wider text-[10px] mb-2 inline-block">
              WALI KELAS {schoolSettings.className}
            </div>
            <div className="text-slate-700 text-[10px] mb-1">
              {schoolSettings.reportPlaceDate || schoolSettings.locationName || 'Ciputat'}, {schoolSettings.signatureDate || `${selectedMonthName} ${selectedYear}`}
            </div>
            <div className="text-slate-800 font-bold mb-8 text-[11px]">
              Guru / Wali Kelas {schoolSettings.className}
            </div>
          </div>
          <div>
            <div className="border-b-2 border-slate-800 font-extrabold pb-0.5 text-slate-900 inline-block px-2">
              {schoolSettings.homeroomTeacher || schoolSettings.teacherName || 'Wali Kelas'}
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1">
              NIP. {schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '-'}
            </div>
          </div>
        </div>

        {/* Block 4: Ketua Kelas (Synchronized) */}
        <div className="bg-amber-50/80 border-2 border-amber-500 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-amber-700 text-white py-1 px-3 rounded-xl uppercase font-black tracking-wider text-[10px] mb-2 inline-block">
              KETUA KELAS
            </div>
            <div className="text-slate-800 font-bold mb-10 text-[11px]">
              Ketua Kelas {schoolSettings.className}
            </div>
          </div>
          <div>
            <div className="border-b-2 border-slate-800 font-extrabold pb-0.5 text-slate-900 inline-block px-2">
              {schoolSettings.classLeader || '...........................................'}
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1">
              Siswa Kelas {schoolSettings.className}
            </div>
          </div>
        </div>
      </div>

      {/* Password Prompt Modal */}
      <PasswordPromptModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onSuccess={handlePasswordSuccess}
        guruPassword={schoolSettings.attendancePassword || '1234'}
        adminPassword={schoolSettings.adminPassword || 'admin'}
        superAdminPassword={schoolSettings.superAdminPassword || 'superadmin'}
        requiredLevel="guru"
      />
    </div>
  );
};
