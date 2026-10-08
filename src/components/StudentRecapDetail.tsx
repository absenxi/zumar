import React, { useState, useMemo } from 'react';
import { Student, SchoolSettings, AttendanceStatus } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Search,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface StudentRecapDetailProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedMonthIndex: number;
  selectedMonthName: string;
  selectedYear: number;
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  activeAttendanceData?: Record<string, Record<number, AttendanceStatus>>;
}

export const StudentRecapDetail: React.FC<StudentRecapDetailProps> = ({
  students,
  schoolSettings,
  selectedMonthIndex,
  selectedYear,
  attendanceStore,
  activeAttendanceData,
}) => {
  // Selected Student state (default to first student)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Semester state: default 'ganjil' (Juli - Desember) matching the image
  const [semester, setSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [semesterYear, setSemesterYear] = useState<number>(selectedYear || 2026);

  // Filtered students for search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.no).includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return (
      students.find((s) => s.id === selectedStudentId) ||
      filteredStudents[0] ||
      students[0] ||
      null
    );
  }, [students, selectedStudentId, filteredStudents]);

  // Navigation between students
  const currentIndex = students.findIndex((s) => s.id === selectedStudent?.id);

  const handlePrevStudent = () => {
    if (students.length === 0) return;
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    } else {
      setSelectedStudentId(students[students.length - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (students.length === 0) return;
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    } else {
      setSelectedStudentId(students[0].id);
    }
  };

  // Months for selected semester (6 months)
  const semesterMonths = useMemo(() => {
    if (semester === 'ganjil') {
      return [
        { name: 'Juli', index: 6, year: semesterYear },
        { name: 'Agustus', index: 7, year: semesterYear },
        { name: 'September', index: 8, year: semesterYear },
        { name: 'Oktober', index: 9, year: semesterYear },
        { name: 'November', index: 10, year: semesterYear },
        { name: 'Desember', index: 11, year: semesterYear },
      ];
    } else {
      return [
        { name: 'Januari', index: 0, year: semesterYear },
        { name: 'Februari', index: 1, year: semesterYear },
        { name: 'Maret', index: 2, year: semesterYear },
        { name: 'April', index: 3, year: semesterYear },
        { name: 'Mei', index: 4, year: semesterYear },
        { name: 'Juni', index: 5, year: semesterYear },
      ];
    }
  }, [semester, semesterYear]);

  // Helper to get attendance records for any (year, monthIdx)
  const getMonthAttendanceData = (year: number, monthIdx: number) => {
    const key = `${year}_${monthIdx}`;
    if (
      year === selectedYear &&
      monthIdx === selectedMonthIndex &&
      activeAttendanceData &&
      Object.keys(activeAttendanceData).length > 0
    ) {
      return activeAttendanceData;
    }
    return attendanceStore[key] || {};
  };

  // Compute semester summary for the selected student (Read-Only Recap)
  const semesterSummary = useMemo(() => {
    let totalH = 0;
    let totalS = 0;
    let totalI = 0;
    let totalA = 0;
    let totalFilled = 0;

    if (selectedStudent) {
      semesterMonths.forEach((m) => {
        const daysInM = new Date(m.year, m.index + 1, 0).getDate();
        const mData = getMonthAttendanceData(m.year, m.index);
        const sRecords = mData[selectedStudent.id] || {};
        for (let d = 1; d <= daysInM; d++) {
          const st = sRecords[d];
          if (st === 'H') {
            totalH++;
            totalFilled++;
          } else if (st === 'S') {
            totalS++;
            totalFilled++;
          } else if (st === 'I') {
            totalI++;
            totalFilled++;
          } else if (st === 'A') {
            totalA++;
            totalFilled++;
          }
        }
      });
    }

    const pct = totalFilled > 0 ? Math.round((totalH / totalFilled) * 100) : 0;
    return { totalH, totalS, totalI, totalA, totalFilled, pct };
  }, [
    selectedStudent,
    semesterMonths,
    attendanceStore,
    activeAttendanceData,
    selectedYear,
    selectedMonthIndex,
  ]);

  const days31 = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const academicYear = schoolSettings.academicYear || '2026/2027';

  return (
    <div className="space-y-5">
      {/* Control Bar (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-200 space-y-4 print:hidden">
        {/* Top Row: Title & Print Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-900 text-yellow-300 rounded-2xl flex items-center justify-center font-black shadow-md border-2 border-yellow-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Rekap Kehadiran Per 1 Siswa (1 Semester)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Laporan rekapitulasi absensi 1 siswa selama 6 bulan penuh (Semester{' '}
                {semester === 'ganjil' ? 'Ganjil: Juli – Desember' : 'Genap: Januari – Juni'}{' '}
                {semesterYear}) • Kelas{' '}
                <span className="font-bold text-blue-900">{schoolSettings.className}</span>
              </p>
            </div>
          </div>

          {/* Action Button: Cetak / PDF */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
              title="Cetak / Simpan PDF"
            >
              <Printer className="w-4 h-4 text-yellow-300" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Middle Row: Student Selector, Semester Selector & Year */}
        <div className="pt-3 border-t border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Student Search & Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative sm:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const q = e.target.value.toLowerCase();
                  const firstMatch = students.find(
                    (s) =>
                      s.name.toLowerCase().includes(q) ||
                      String(s.no).includes(q)
                  );
                  if (firstMatch) setSelectedStudentId(firstMatch.id);
                }}
                placeholder="Cari nama / no urut..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 flex-1 max-w-md min-w-0">
              <button
                type="button"
                onClick={handlePrevStudent}
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all active:scale-95 cursor-pointer shrink-0"
                title="Siswa Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="flex-1 min-w-0 bg-white text-slate-900 font-extrabold text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer truncate"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.no}. {s.name} ({s.gender})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextStudent}
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all active:scale-95 cursor-pointer shrink-0"
                title="Siswa Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Semester & Year Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Semester Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => setSemester('ganjil')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  semester === 'ganjil'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Ganjil (Jul–Des)
              </button>
              <button
                type="button"
                onClick={() => setSemester('genap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  semester === 'genap'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Genap (Jan–Jun)
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-800" />
              <select
                value={semesterYear}
                onChange={(e) => setSemesterYear(Number(e.target.value))}
                className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Summary Bar for Selected Student (Read-only info) */}
        {selectedStudent && (
          <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-900 text-white font-black">
                No. {selectedStudent.no}
              </span>
              <span className="font-black text-slate-900 uppercase text-sm">
                {selectedStudent.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                L/P: {selectedStudent.gender}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap font-extrabold">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#dcfce7] text-emerald-900 border border-emerald-300">
                Hadir (H): {semesterSummary.totalH}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#e0f2fe] text-sky-900 border border-sky-300">
                Sakit (S): {semesterSummary.totalS}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#fef3c7] text-amber-900 border border-amber-300">
                Izin (I): {semesterSummary.totalI}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#fee2e2] text-rose-900 border border-rose-300">
                Alpa (A): {semesterSummary.totalA}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-yellow-300">
                Kehadiran: {semesterSummary.pct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* READ-ONLY PRINTABLE 1-SEMESTER (6 MONTHS) SHEET MATCHING THE IMAGE    */}
      {/* ===================================================================== */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 7mm 9mm;
          }
        }
      `}</style>
      <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-md border border-slate-300 print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Main Sheet Header (Centered above the first month table, matching image) */}
        <div className="text-center mb-2 print:mb-1 font-sans text-black">
          <h1 className="text-base sm:text-xl print:text-base font-extrabold uppercase tracking-wide leading-tight text-black">
            {schoolSettings.schoolName || 'SMKS NUSANTARA 1 CIPUTAT'}
          </h1>
          <h2 className="text-sm sm:text-base print:text-xs font-extrabold uppercase tracking-wide leading-tight text-black mt-0.5">
            REKAPITULASI ABSENSI SISWA KELAS {schoolSettings.className || 'X TJKT 3'}
          </h2>
        </div>

        {/* 6 Monthly Tables Stacked Vertically (Strictly Read-Only & Fixed Column Alignment) */}
        <div className="space-y-6 print:space-y-2.5">
          {semesterMonths.map((monthItem) => {
            const daysInMonth = new Date(
              monthItem.year,
              monthItem.index + 1,
              0
            ).getDate();
            const monthAttendance = getMonthAttendanceData(
              monthItem.year,
              monthItem.index
            );
            const studentRecords = selectedStudent
              ? monthAttendance[selectedStudent.id] || {}
              : {};

            let countH = 0;
            let countS = 0;
            let countI = 0;
            let countA = 0;
            let filledDays = 0;

            for (let d = 1; d <= daysInMonth; d++) {
              const st = studentRecords[d];
              if (st === 'H') {
                countH++;
                filledDays++;
              } else if (st === 'S') {
                countS++;
                filledDays++;
              } else if (st === 'I') {
                countI++;
                filledDays++;
              } else if (st === 'A') {
                countA++;
                filledDays++;
              }
            }

            const monthPct =
              filledDays > 0 ? `${Math.round((countH / filledDays) * 100)}%` : '-';

            const formatRecapCell = (val: number) => {
              if (val === 0 && filledDays === 0) return '-';
              return String(val);
            };

            return (
              <div
                key={`${monthItem.year}_${monthItem.index}`}
                className="break-inside-avoid"
              >
                {/* Month & Academic Year Subtitle */}
                <div className="text-center text-xs sm:text-sm print:text-[11px] text-black mb-1 print:mb-0.5 font-sans">
                  Bulan:{' '}
                  <span className="font-bold">
                    {monthItem.name} {monthItem.year}
                  </span>{' '}
                  • Tahun Ajaran: {academicYear}
                </div>

                {/* Month Table (Fixed layout so all 6 tables align identically & student name is clearly visible) */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[980px] print:min-w-0 table-fixed border-collapse border border-black text-[10px] sm:text-[11px] print:text-[9.5px] font-sans text-black select-none">
                    <colgroup>
                      <col className="w-[28px] print:w-[24px]" />
                      <col className="w-[220px] sm:w-[240px] print:w-[195px]" />
                      <col className="w-[28px] print:w-[24px]" />
                      {days31.map((d) => (
                        <col key={d} className="w-[19px] print:w-[17px]" />
                      ))}
                      <col className="w-[23px] print:w-[20px]" />
                      <col className="w-[23px] print:w-[20px]" />
                      <col className="w-[23px] print:w-[20px]" />
                      <col className="w-[23px] print:w-[20px]" />
                      <col className="w-[36px] print:w-[32px]" />
                    </colgroup>

                    <thead>
                      {/* Header Row 1 */}
                      <tr className="bg-[#e6e6e6] text-black font-bold">
                        <th
                          rowSpan={2}
                          className="border border-black px-0.5 py-1 print:py-0.5 text-center align-middle"
                        >
                          NO
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-black px-2 py-1 print:py-0.5 text-left align-middle leading-tight"
                        >
                          NAMA SISWA
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-black px-0.5 py-1 print:py-0.5 text-center align-middle"
                        >
                          L/P
                        </th>
                        <th
                          colSpan={31}
                          className="border border-black py-1 print:py-0.5 text-center align-middle tracking-wide"
                        >
                          TANGGAL
                        </th>
                        <th
                          colSpan={4}
                          className="border border-black px-0.5 py-1 print:py-0.5 text-center align-middle tracking-tight"
                        >
                          REKAPITULASI
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-black px-1 py-1 print:py-0.5 text-center align-middle"
                        >
                          %
                        </th>
                      </tr>

                      {/* Header Row 2: 1..31 and H S I A */}
                      <tr className="bg-[#e6e6e6] text-black font-bold">
                        {days31.map((d) => (
                          <th
                            key={d}
                            className="border border-black py-1 print:py-0.5 text-center align-middle font-bold"
                          >
                            {d}
                          </th>
                        ))}
                        <th className="border border-black py-1 print:py-0.5 text-center align-middle bg-[#c8e6c9] text-black font-bold">
                          H
                        </th>
                        <th className="border border-black py-1 print:py-0.5 text-center align-middle bg-[#bbdefb] text-black font-bold">
                          S
                        </th>
                        <th className="border border-black py-1 print:py-0.5 text-center align-middle bg-[#fff9c4] text-black font-bold">
                          I
                        </th>
                        <th className="border border-black py-1 print:py-0.5 text-center align-middle bg-[#ffcdd2] text-black font-bold">
                          A
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Single Student Row (Read-Only) */}
                      <tr className="min-h-9 sm:min-h-10 print:h-7 bg-white">
                        {/* NO */}
                        <td className="border border-black px-0.5 py-1.5 print:py-1 text-center align-middle font-bold text-black">
                          {selectedStudent ? selectedStudent.no : ''}
                        </td>

                        {/* NAMA SISWA (Full clear visibility, no truncation) */}
                        <td className="border border-black px-2 py-1.5 print:py-1 text-left align-middle font-extrabold text-[11px] sm:text-xs print:text-[10px] text-black uppercase break-words leading-snug">
                          {selectedStudent ? selectedStudent.name : ''}
                        </td>

                        {/* L/P */}
                        <td className="border border-black px-0.5 py-1.5 print:py-1 text-center align-middle font-bold text-black">
                          {selectedStudent ? selectedStudent.gender : ''}
                        </td>

                        {/* TANGGAL 1..31 (Strictly Read-Only) */}
                        {days31.map((day) => {
                          const isInvalidDay = day > daysInMonth;
                          if (isInvalidDay) {
                            return (
                              <td
                                key={day}
                                className="border border-black bg-[#bdbdbd] text-center align-middle"
                              />
                            );
                          }

                          const status: AttendanceStatus = selectedStudent
                            ? studentRecords[day] || '-'
                            : '-';

                          const statusColor =
                            status === 'H'
                              ? 'text-emerald-800 font-extrabold'
                              : status === 'S'
                              ? 'text-sky-800 font-extrabold'
                              : status === 'I'
                              ? 'text-amber-800 font-extrabold'
                              : status === 'A'
                              ? 'text-rose-700 font-extrabold'
                              : 'text-slate-400 font-bold';

                          return (
                            <td
                              key={day}
                              className={`border border-black text-center align-middle ${statusColor}`}
                            >
                              {status !== '-' ? status : '-'}
                            </td>
                          );
                        })}

                        {/* REKAPITULASI: H */}
                        <td className="border border-black bg-[#d9f2d9] text-center align-middle font-extrabold text-emerald-950">
                          {formatRecapCell(countH)}
                        </td>

                        {/* REKAPITULASI: S */}
                        <td className="border border-black bg-[#d9eaf7] text-center align-middle font-extrabold text-sky-950">
                          {formatRecapCell(countS)}
                        </td>

                        {/* REKAPITULASI: I */}
                        <td className="border border-black bg-[#fff2cc] text-center align-middle font-extrabold text-amber-950">
                          {formatRecapCell(countI)}
                        </td>

                        {/* REKAPITULASI: A */}
                        <td className="border border-black bg-[#fce4d6] text-center align-middle font-extrabold text-rose-950">
                          {formatRecapCell(countA)}
                        </td>

                        {/* % */}
                        <td className="border border-black bg-white text-center align-middle font-extrabold text-black">
                          {monthPct}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
