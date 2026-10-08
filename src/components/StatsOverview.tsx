import React from 'react';
import { Student, AttendanceStatus } from '../types';
import { Users, CheckCircle, AlertCircle, Clock, Award, Activity } from 'lucide-react';

interface StatsOverviewProps {
  students: Student[];
  selectedMonthName: string;
  selectedYear: number;
  attendanceData: Record<string, Record<number, AttendanceStatus>>;
  selectedMonthIndex: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  students,
  selectedMonthName,
  selectedYear,
  attendanceData,
  selectedMonthIndex,
}) => {
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  let grandH = 0;
  let grandA = 0;
  let grandS = 0;
  let grandI = 0;
  let grandTotalActiveEntries = 0;

  students.forEach((s) => {
    const stData = attendanceData[s.id] || {};
    for (let day = 1; day <= daysInMonth; day++) {
      const st = stData[day] || '-';
      if (st === 'H') grandH++;
      if (st === 'A') grandA++;
      if (st === 'S') grandS++;
      if (st === 'I') grandI++;
      if (st !== '-') grandTotalActiveEntries++;
    }
  });

  const overallAttendancePct =
    grandTotalActiveEntries > 0
      ? Math.round((grandH / grandTotalActiveEntries) * 100)
      : 0;

  const countL = students.filter((s) => s.gender === 'L').length;
  const countP = students.filter((s) => s.gender === 'P').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
      {/* Card 1: Total Students & Ratio */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-lg border border-blue-400/30 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
            TOTAL SISWA
          </div>
          <div className="text-3xl font-black mt-1">{students.length} Siswa</div>
          <div className="text-[11px] text-blue-100 font-medium mt-1 flex items-center gap-2">
            <span className="bg-blue-900/60 px-2 py-0.5 rounded-md font-bold">L: {countL}</span>
            <span className="bg-pink-900/60 px-2 py-0.5 rounded-md font-bold">P: {countP}</span>
          </div>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <Users className="w-8 h-8 text-yellow-300" />
        </div>
      </div>

      {/* Card 2: Attendance Percentage */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-lg border border-emerald-400/30 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
              Persentase Kehadiran
            </div>
            <div className="text-3xl font-black mt-1 flex items-baseline gap-2">
              <span>{overallAttendancePct}%</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-emerald-100">
                {overallAttendancePct >= 90
                  ? 'Sangat Baik'
                  : overallAttendancePct >= 75
                  ? 'Baik'
                  : 'Perlu Perhatian'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
            <Award className="w-8 h-8 text-emerald-200" />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/20">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                overallAttendancePct >= 90
                  ? 'bg-gradient-to-r from-emerald-300 to-green-100'
                  : overallAttendancePct >= 75
                  ? 'bg-gradient-to-r from-amber-300 to-yellow-200'
                  : 'bg-gradient-to-r from-rose-400 to-orange-300'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, overallAttendancePct))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-emerald-100 font-semibold mt-1">
            <span>Bulan {selectedMonthName} {selectedYear}</span>
            <span>{grandH}/{grandTotalActiveEntries} Entry</span>
          </div>
        </div>
      </div>

      {/* Card 3: Total Days Present & Sick */}
      <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white rounded-2xl p-4 shadow-lg border border-sky-400/30 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-sky-200 uppercase tracking-wider">
            Hadir & Sakit (Total)
          </div>
          <div className="text-2xl font-black mt-1">
            {grandH} <span className="text-xs font-normal text-sky-200">Hadir</span>
          </div>
          <div className="text-[11px] text-sky-100 font-medium mt-1">
            Sakit: <span className="font-bold text-yellow-200">{grandS} Kali</span>
          </div>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <CheckCircle className="w-8 h-8 text-sky-200" />
        </div>
      </div>

      {/* Card 4: Izin & Alpa Total */}
      <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl p-4 shadow-lg border border-amber-400/30 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
            Izin & Alpa (Total)
          </div>
          <div className="text-2xl font-black mt-1">
            {grandI} <span className="text-xs font-normal text-amber-200">Izin</span> |{' '}
            {grandA} <span className="text-xs font-normal text-red-200">Alpa</span>
          </div>
          <div className="text-[11px] text-amber-100 font-medium mt-1">
            {grandA === 0 ? 'Tanpa Alpa (Nihil)' : `Perlu perhatian: ${grandA} Alpa`}
          </div>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <Activity className="w-8 h-8 text-amber-200" />
        </div>
      </div>
    </div>
  );
};
