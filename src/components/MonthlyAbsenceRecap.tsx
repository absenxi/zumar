import React, { useState, useMemo } from 'react';
import { Student, SchoolSettings, AttendanceStatus } from '../types';
import { MONTH_NAMES } from '../data/initialData';
import {
  exportMonthlyAbsenceRecapToWord,
  exportSemesterAbsenceRecapToCSV,
  exportSemesterAbsenceRecapToWord,
  SemesterStudentRecapItem,
  SemesterTotals,
} from '../utils/export';
import {
  Printer,
  FileText,
  FileSpreadsheet,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface MonthlyAbsenceRecapProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedMonthIndex: number;
  selectedYear: number;
  currentMonthName: string;
  activeAttendanceData: Record<string, Record<number, AttendanceStatus>>;
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onGoToCurrentMonth?: () => void;
}

export const MonthlyAbsenceRecap: React.FC<MonthlyAbsenceRecapProps> = ({
  students,
  schoolSettings,
  selectedMonthIndex,
  selectedYear,
  activeAttendanceData,
  attendanceStore,
}) => {
  // View mode: 'semester' (matching rekap.jpg) or 'monthly' (single month)
  const [viewMode, setViewMode] = useState<'semester' | 'monthly'>('semester');

  // Semester configuration: 'ganjil' (Juli - Desember) matches rekap.jpg exactly
  const [semester, setSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [selectedSemesterYear, setSelectedSemesterYear] = useState<number>(selectedYear || 2026);

  // Single-month mode state
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(selectedMonthIndex);
  const [activeSingleYear, setActiveSingleYear] = useState<number>(selectedYear);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'absent_only' | 'perfect_only'>('all');
  const [sortBy] = useState<'no' | 'name' | 'total_desc' | 'alpa_desc'>('no');
  const [showZeroMode] = useState<'blank' | 'dash' | 'zero'>('blank');

  // Toast / Copy notification
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to fetch attendance data for any year and month index
  const getMonthAttendanceData = (year: number, monthIdx: number) => {
    const isCurrentActive = year === selectedYear && monthIdx === selectedMonthIndex;
    const key = `${year}_${monthIdx}`;
    if (isCurrentActive && activeAttendanceData && Object.keys(activeAttendanceData).length > 0) {
      return activeAttendanceData;
    }
    return attendanceStore[key] || {};
  };

  // Months for current semester
  const semesterMonths = useMemo(() => {
    if (semester === 'ganjil') {
      return [
        { name: 'Juli', index: 6, year: selectedSemesterYear },
        { name: 'Agustus', index: 7, year: selectedSemesterYear },
        { name: 'September', index: 8, year: selectedSemesterYear },
        { name: 'Oktober', index: 9, year: selectedSemesterYear },
        { name: 'November', index: 10, year: selectedSemesterYear },
        { name: 'Desember', index: 11, year: selectedSemesterYear },
      ];
    } else {
      return [
        { name: 'Januari', index: 0, year: selectedSemesterYear },
        { name: 'Februari', index: 1, year: selectedSemesterYear },
        { name: 'Maret', index: 2, year: selectedSemesterYear },
        { name: 'April', index: 3, year: selectedSemesterYear },
        { name: 'Mei', index: 4, year: selectedSemesterYear },
        { name: 'Juni', index: 5, year: selectedSemesterYear },
      ];
    }
  }, [semester, selectedSemesterYear]);

  // Compute semester recap data per student (exactly for the 25-column table in rekap.jpg)
  const semesterStudentRecapList: SemesterStudentRecapItem[] = useMemo(() => {
    return students.map((s, idx) => {
      const monthlyStats: Record<number, { s: number; i: number; a: number }> = {};
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;

      semesterMonths.forEach((m) => {
        const daysInM = new Date(m.year, m.index + 1, 0).getDate();
        const mAttendance = getMonthAttendanceData(m.year, m.index);
        const sData = mAttendance[s.id] || {};

        let sCount = 0;
        let iCount = 0;
        let aCount = 0;

        for (let day = 1; day <= daysInM; day++) {
          const st = sData[day];
          if (st === 'S') sCount++;
          else if (st === 'I') iCount++;
          else if (st === 'A') aCount++;
        }

        monthlyStats[m.index] = { s: sCount, i: iCount, a: aCount };
        totalS += sCount;
        totalI += iCount;
        totalA += aCount;
      });

      return {
        id: s.id,
        no: s.no || idx + 1,
        nisn: s.nisn || '',
        name: s.name,
        gender: s.gender,
        parentWhatsapp: s.parentWhatsapp,
        monthly: monthlyStats,
        totalSemester: {
          s: totalS,
          i: totalI,
          a: totalA,
          jumlah: totalS + totalI + totalA,
        },
      };
    });
  }, [students, semesterMonths, activeAttendanceData, attendanceStore, selectedYear, selectedMonthIndex]);

  // Filtered & Sorted Semester Students
  const filteredSemesterStudents = useMemo(() => {
    let list = semesterStudentRecapList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesNisn = item.nisn.toLowerCase().includes(q);
        const matchesNo = String(item.no).includes(q);
        if (!matchesName && !matchesNisn && !matchesNo) return false;
      }

      if (filterType === 'absent_only') {
        return item.totalSemester.jumlah > 0;
      }
      if (filterType === 'perfect_only') {
        return item.totalSemester.jumlah === 0;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'id');
      }
      if (sortBy === 'total_desc') {
        if (b.totalSemester.jumlah !== a.totalSemester.jumlah) {
          return b.totalSemester.jumlah - a.totalSemester.jumlah;
        }
        return b.totalSemester.a - a.totalSemester.a;
      }
      if (sortBy === 'alpa_desc') {
        if (b.totalSemester.a !== a.totalSemester.a) {
          return b.totalSemester.a - a.totalSemester.a;
        }
        return b.totalSemester.jumlah - a.totalSemester.jumlah;
      }
      return a.no - b.no;
    });

    return list;
  }, [semesterStudentRecapList, searchQuery, filterType, sortBy]);

  // Totals for Semester View
  const semesterTotals: SemesterTotals = useMemo(() => {
    const monthlyTotals: Record<number, { s: number; i: number; a: number }> = {};
    semesterMonths.forEach((m) => {
      monthlyTotals[m.index] = { s: 0, i: 0, a: 0 };
    });

    let grandS = 0;
    let grandI = 0;
    let grandA = 0;
    let grandJumlah = 0;

    filteredSemesterStudents.forEach((s) => {
      semesterMonths.forEach((m) => {
        const stats = s.monthly[m.index] || { s: 0, i: 0, a: 0 };
        monthlyTotals[m.index].s += stats.s;
        monthlyTotals[m.index].i += stats.i;
        monthlyTotals[m.index].a += stats.a;
      });

      grandS += s.totalSemester.s;
      grandI += s.totalSemester.i;
      grandA += s.totalSemester.a;
      grandJumlah += s.totalSemester.jumlah;
    });

    return {
      monthly: monthlyTotals,
      totalSemester: {
        s: grandS,
        i: grandI,
        a: grandA,
        jumlah: grandJumlah,
      },
    };
  }, [filteredSemesterStudents, semesterMonths]);

  // Overall student stats (for filter badges)
  const semesterCounts = useMemo(() => {
    let perfect = 0;
    let absent = 0;
    semesterStudentRecapList.forEach((s) => {
      if (s.totalSemester.jumlah === 0) perfect++;
      else absent++;
    });
    return {
      perfect,
      absent,
      total: semesterStudentRecapList.length,
    };
  }, [semesterStudentRecapList]);

  // ---------------- Single Month Logic (fallback / secondary view) ----------------
  const singleMonthName = MONTH_NAMES[activeMonthIdx] || 'Bulan';
  const singleDaysInMonth = new Date(activeSingleYear, activeMonthIdx + 1, 0).getDate();

  const singleMonthAttendance = useMemo(() => {
    return getMonthAttendanceData(activeSingleYear, activeMonthIdx);
  }, [activeSingleYear, activeMonthIdx, selectedYear, selectedMonthIndex, activeAttendanceData, attendanceStore]);

  const singleMonthRecapList = useMemo(() => {
    return students.map((s, idx) => {
      const sData = singleMonthAttendance[s.id] || {};
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let hadir = 0;

      for (let day = 1; day <= singleDaysInMonth; day++) {
        const st = sData[day];
        if (st === 'S') sakit++;
        else if (st === 'I') izin++;
        else if (st === 'A') alpa++;
        else if (st === 'H') hadir++;
      }

      return {
        id: s.id,
        no: s.no || idx + 1,
        name: s.name,
        gender: s.gender,
        parentWhatsapp: s.parentWhatsapp,
        sakit,
        izin,
        alpa,
        hadir,
        total: sakit + izin + alpa,
      };
    });
  }, [students, singleMonthAttendance, singleDaysInMonth]);

  const filteredSingleMonthStudents = useMemo(() => {
    let list = singleMonthRecapList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesNo = String(item.no).includes(q);
        if (!matchesName && !matchesNo) return false;
      }
      if (filterType === 'absent_only') return item.total > 0;
      if (filterType === 'perfect_only') return item.total === 0;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'id');
      if (sortBy === 'total_desc') return b.total - a.total || b.alpa - a.alpa;
      if (sortBy === 'alpa_desc') return b.alpa - a.alpa || b.total - a.total;
      return a.no - b.no;
    });

    return list;
  }, [singleMonthRecapList, searchQuery, filterType, sortBy]);

  const singleMonthTotals = useMemo(() => {
    let sumSakit = 0;
    let sumIzin = 0;
    let sumAlpa = 0;
    let grandTotal = 0;

    filteredSingleMonthStudents.forEach((s) => {
      sumSakit += s.sakit;
      sumIzin += s.izin;
      sumAlpa += s.alpa;
      grandTotal += s.total;
    });

    return { sumSakit, sumIzin, sumAlpa, grandTotal };
  }, [filteredSingleMonthStudents]);

  // Cell rendering for values
  const renderCellValue = (val: number, isHighlight: boolean = false) => {
    if (val === 0) {
      if (showZeroMode === 'blank') {
        return null;
      }
      if (showZeroMode === 'dash') {
        return <span className="text-slate-300 font-mono text-xs">-</span>;
      }
      return <span className="text-slate-300 text-xs">0</span>;
    }
    return (
      <span
        className={`font-black ${
          isHighlight
            ? val >= 5
              ? 'text-rose-600'
              : 'text-slate-900'
            : 'text-slate-800'
        }`}
      >
        {val}
      </span>
    );
  };

  // Copy table to clipboard in TSV (Tab Separated Values) format for direct Excel paste
  const handleCopyTableToClipboard = () => {
    if (viewMode === 'semester') {
      let tsv = `REKAP KETIDAKHADIRAN SISWA\n`;
      tsv += `${schoolSettings.schoolName}\tKELAS ${schoolSettings.className}\tSEMESTER ${semester.toUpperCase()} ${selectedSemesterYear}\n\n`;

      // Header row 1
      tsv += `No\tNISN\tNama Siswa\t`;
      semesterMonths.forEach((m) => {
        tsv += `${m.name}\t\t\t`;
      });
      tsv += `Total Semester\t\t\t\n`;

      // Header row 2
      tsv += `\t\t\t`;
      semesterMonths.forEach(() => {
        tsv += `S\tI\tA\t`;
      });
      tsv += `S\tI\tA\tJumlah\n`;

      // Rows
      filteredSemesterStudents.forEach((s, idx) => {
        tsv += `${idx + 1}\t${s.nisn || ''}\t${s.name}\t`;
        semesterMonths.forEach((m) => {
          const stats = s.monthly[m.index] || { s: 0, i: 0, a: 0 };
          tsv += `${stats.s || ''}\t${stats.i || ''}\t${stats.a || ''}\t`;
        });
        tsv += `${s.totalSemester.s || ''}\t${s.totalSemester.i || ''}\t${s.totalSemester.a || ''}\t${s.totalSemester.jumlah || ''}\n`;
      });

      // Total row
      tsv += `TOTAL\t\t\t`;
      semesterMonths.forEach((m) => {
        const mTot = semesterTotals.monthly[m.index] || { s: 0, i: 0, a: 0 };
        tsv += `${mTot.s}\t${mTot.i}\t${mTot.a}\t`;
      });
      tsv += `${semesterTotals.totalSemester.s}\t${semesterTotals.totalSemester.i}\t${semesterTotals.totalSemester.a}\t${semesterTotals.totalSemester.jumlah}\n`;

      navigator.clipboard.writeText(tsv);
      setCopied(true);
      showToast('Tabel format semester berhasil disalin! Siap ditempel langsung ke Microsoft Excel.');
      setTimeout(() => setCopied(false), 3000);
    } else {
      let tsv = `KETIDAK HADIRAN\n`;
      tsv += `Bulan: ${singleMonthName} ${activeSingleYear}\tKelas: ${schoolSettings.className}\tSekolah: ${schoolSettings.schoolName}\n\n`;
      tsv += `NO.\tNAMA SISWA\tSAKIT\tIZIN\tALPA\tTOTAL\n`;

      filteredSingleMonthStudents.forEach((s, idx) => {
        tsv += `${idx + 1}\t${s.name}\t${s.sakit}\t${s.izin}\t${s.alpa}\t${s.total}\n`;
      });

      tsv += `TOTAL KESELURUHAN\t\t${singleMonthTotals.sumSakit}\t${singleMonthTotals.sumIzin}\t${singleMonthTotals.sumAlpa}\t${singleMonthTotals.grandTotal}\n`;

      navigator.clipboard.writeText(tsv);
      setCopied(true);
      showToast('Tabel bulanan berhasil disalin! Siap ditempel langsung ke Excel.');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (viewMode === 'semester') {
      exportSemesterAbsenceRecapToCSV(
        filteredSemesterStudents,
        semesterTotals,
        schoolSettings,
        semester === 'ganjil' ? 'Ganjil' : 'Genap',
        String(selectedSemesterYear),
        semesterMonths
      );
      showToast('File CSV Rekap Ketidakhadiran Semester berhasil didownload!');
    } else {
      let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
      csvContent += `REKAP KETIDAKHADIRAN SISWA BULANAN\n`;
      csvContent += `${schoolSettings.schoolName} - KELAS ${schoolSettings.className}\n`;
      csvContent += `BULAN: ${singleMonthName} ${activeSingleYear}\n\n`;
      csvContent += `NO,NAMA SISWA,SAKIT,IZIN,ALPA,TOTAL\n`;

      filteredSingleMonthStudents.forEach((s, idx) => {
        csvContent += `${idx + 1},"${(s.name || '').replace(/"/g, '""')}",${s.sakit},${s.izin},${s.alpa},${s.total}\n`;
      });
      csvContent += `TOTAL,,${singleMonthTotals.sumSakit},${singleMonthTotals.sumIzin},${singleMonthTotals.sumAlpa},${singleMonthTotals.grandTotal}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Ketidakhadiran_${schoolSettings.className}_${singleMonthName}_${activeSingleYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('File CSV Rekap Bulanan berhasil didownload!');
    }
  };

  // Export to Microsoft Word
  const handleExportWord = () => {
    if (viewMode === 'semester') {
      exportSemesterAbsenceRecapToWord(
        filteredSemesterStudents,
        semesterTotals,
        schoolSettings,
        semester === 'ganjil' ? 'Ganjil' : 'Genap',
        String(selectedSemesterYear),
        semesterMonths,
        showZeroMode === 'blank'
      );
      showToast('File Word (.doc) Rekap Ketidakhadiran Semester berhasil didownload!');
    } else {
      exportMonthlyAbsenceRecapToWord(
        filteredSingleMonthStudents,
        singleMonthTotals,
        schoolSettings,
        singleMonthName,
        activeSingleYear,
        showZeroMode === 'dash'
      );
      showToast('File Word (.doc) Rekap Bulanan berhasil didownload!');
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Controls Card (Hidden in Print) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4 print:hidden">
        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2F5597] text-white rounded-xl shadow-xs">
            <FileSpreadsheet className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Rekap Ketidakhadiran Siswa
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                Format Excel Resmi
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tabel rekapitulasi ketidakhadiran siswa (Sakit, Izin, Alpa) per bulan dan Total Semester sesuai template Excel resmi.
            </p>
          </div>
        </div>

        {/* Toolbar: Posisi Rapi Sesuai Urutan Permintaan */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Kelompok Kiri: 1. Semester, 2. Tahun, 3. Cari nama atau NISN */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* 1. Ganjil (Juli - Des) / Genap (Jan - Jun) */}
            {viewMode === 'semester' ? (
              <div className="flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300 text-xs font-bold shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSemester('ganjil')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    semester === 'ganjil'
                      ? 'bg-[#2F5597] text-white shadow-xs font-black'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60 font-semibold'
                  }`}
                >
                  Ganjil (Juli - Des)
                </button>
                <button
                  type="button"
                  onClick={() => setSemester('genap')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    semester === 'genap'
                      ? 'bg-[#2F5597] text-white shadow-xs font-black'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60 font-semibold'
                  }`}
                >
                  Genap (Jan - Jun)
                </button>
              </div>
            ) : (
              /* Navigasi Bulan jika dalam mode Rekap 1 Bulan */
              <div className="flex items-center gap-1.5 bg-slate-200/80 rounded-xl p-1 border border-slate-300 shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (activeMonthIdx > 0) setActiveMonthIdx(activeMonthIdx - 1);
                    else {
                      setActiveMonthIdx(11);
                      setActiveSingleYear(activeSingleYear - 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg cursor-pointer transition-all"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={activeMonthIdx}
                  onChange={(e) => setActiveMonthIdx(Number(e.target.value))}
                  className="bg-transparent font-black text-xs text-slate-900 focus:outline-none cursor-pointer py-1 px-1"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (activeMonthIdx < 11) setActiveMonthIdx(activeMonthIdx + 1);
                    else {
                      setActiveMonthIdx(0);
                      setActiveSingleYear(activeSingleYear + 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg cursor-pointer transition-all"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 2. Tahun Selector dengan Background Tombol Elegan */}
            <div className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#2F5597] rounded-xl px-3 py-1.5 shadow-xs shrink-0 transition-all cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-[#2F5597] shrink-0" />
              <select
                value={viewMode === 'semester' ? selectedSemesterYear : activeSingleYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  if (viewMode === 'semester') setSelectedSemesterYear(y);
                  else setActiveSingleYear(y);
                }}
                className="bg-transparent font-black text-xs text-slate-900 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Cari nama atau NISN... */}
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NISN..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Kelompok Kanan: 4. Mode Rekap, 5. Export Word, 6. Cetak / PDF */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 4. Rekap Semester & Rekap 1 Bulan */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('semester')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'semester'
                    ? 'bg-[#2F5597] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Rekap Semester
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-[#2F5597] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Rekap 1 Bulan
              </button>
            </div>

            {/* 5. Export Word */}
            <button
              type="button"
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F5597] hover:bg-[#234377] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              title="Download File Microsoft Word (.doc)"
            >
              <FileText className="w-3.5 h-3.5 text-sky-200" />
              <span>Export Word</span>
            </button>

            {/* 6. Cetak / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              title="Cetak Laporan / Simpan PDF"
            >
              <Printer className="w-3.5 h-3.5 text-yellow-300" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Document & Sheet Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 print:p-0 print:border-none print:shadow-none overflow-hidden">
        {/* Document Header (Formal Title for School) */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-black uppercase">
            KETIDAK HADIRAN
          </h1>
          <div className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-700 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>
              KELAS: <strong className="text-black">{schoolSettings.className}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span>
              SEKOLAH: <strong className="text-black">{schoolSettings.schoolName}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span>
              SEMESTER: <strong className="text-black uppercase">{viewMode === 'semester' ? (semester === 'ganjil' ? 'GANJIL' : 'GENAP') : singleMonthName.toUpperCase()}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span>
              TAHUN: <strong className="text-black">{viewMode === 'semester' ? selectedSemesterYear : activeSingleYear}</strong>
            </span>
            {schoolSettings.academicYear && (
              <>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span>
                  TAHUN AJARAN: <strong className="text-black">{schoolSettings.academicYear}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* ---------------- VIEW 1: REKAP SEMESTER (EXACTLY AS SHOWN IN rekap.jpg) ---------------- */}
        {viewMode === 'semester' && (
          <div className="overflow-x-auto pb-4">
            <table className="w-full border-collapse border border-slate-400 text-xs font-sans select-text">
              <thead>
                {/* Header Row 1: No, NISN, Nama Siswa, [Months x 6], Total Semester */}
                <tr className="bg-[#2F5597] text-white">
                  {/* Column 1: No */}
                  <th
                    rowSpan={2}
                    className="border border-[#7f9ec7] px-2 py-2 text-center align-middle font-bold text-white w-10 min-w-[36px] tracking-wide"
                  >
                    No
                  </th>

                  {/* Column 2: NISN */}
                  <th
                    rowSpan={2}
                    className="border border-[#7f9ec7] px-2 py-2 text-center align-middle font-bold text-white w-24 min-w-[85px] tracking-wide"
                  >
                    NISN
                  </th>

                  {/* Column 3: Nama Siswa */}
                  <th
                    rowSpan={2}
                    className="border border-[#7f9ec7] px-3 py-2 text-center align-middle font-bold text-white min-w-[170px] tracking-wide"
                  >
                    Nama Siswa
                  </th>

                  {/* Columns 4-9: Months (e.g. Juli, Agustus, September, Oktober, November, Desember) */}
                  {semesterMonths.map((m) => (
                    <th
                      key={m.name}
                      colSpan={3}
                      className="border border-[#7f9ec7] px-2 py-1.5 text-center align-middle font-bold text-white tracking-wide"
                    >
                      {m.name}
                    </th>
                  ))}

                  {/* Column 10: Total Semester */}
                  <th
                    colSpan={4}
                    className="border border-[#7f9ec7] px-2 py-1.5 text-center align-middle font-bold text-white tracking-wide bg-[#27467d]"
                  >
                    Total Semester
                  </th>
                </tr>

                {/* Header Row 2: S, I, A for each month, and S, I, A, Jumlah for Total Semester */}
                <tr className="bg-[#2F5597] text-white text-[11px]">
                  {semesterMonths.map((m) => (
                    <React.Fragment key={`sub-${m.name}`}>
                      <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-7 min-w-[28px]">
                        S
                      </th>
                      <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-7 min-w-[28px]">
                        I
                      </th>
                      <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-7 min-w-[28px]">
                        A
                      </th>
                    </React.Fragment>
                  ))}

                  {/* Total Semester Subheaders */}
                  <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-8 min-w-[30px] bg-[#27467d]">
                    S
                  </th>
                  <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-8 min-w-[30px] bg-[#27467d]">
                    I
                  </th>
                  <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-8 min-w-[30px] bg-[#27467d]">
                    A
                  </th>
                  <th className="border border-[#7f9ec7] py-1 text-center align-middle font-bold w-12 min-w-[44px] bg-[#233f72]">
                    Jumlah
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSemesterStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={25}
                      className="border border-slate-300 py-10 text-center text-slate-500 font-medium italic"
                    >
                      Tidak ada data siswa yang cocok dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredSemesterStudents.map((student, idx) => {
                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        {/* No */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-medium text-slate-800 align-middle">
                          {idx + 1}
                        </td>

                        {/* NISN */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-slate-700 text-xs align-middle">
                          {student.nisn || '-'}
                        </td>

                        {/* Nama Siswa */}
                        <td className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-900 uppercase align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <span>{student.name}</span>
                            {student.totalSemester.jumlah === 0 && (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 print:hidden">
                                100%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Months S, I, A values */}
                        {semesterMonths.map((m) => {
                          const stats = student.monthly[m.index] || { s: 0, i: 0, a: 0 };
                          return (
                            <React.Fragment key={`${student.id}-${m.name}`}>
                              {/* S */}
                              <td className="border border-slate-300 px-1 py-1 text-center align-middle text-amber-900">
                                {renderCellValue(stats.s)}
                              </td>
                              {/* I */}
                              <td className="border border-slate-300 px-1 py-1 text-center align-middle text-blue-900">
                                {renderCellValue(stats.i)}
                              </td>
                              {/* A */}
                              <td className="border border-slate-300 px-1 py-1 text-center align-middle text-rose-900">
                                {renderCellValue(stats.a)}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Total Semester: S, I, A, Jumlah */}
                        <td className="border border-slate-300 px-1 py-1 text-center align-middle font-bold text-amber-950 bg-slate-50/70">
                          {renderCellValue(student.totalSemester.s)}
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-center align-middle font-bold text-blue-950 bg-slate-50/70">
                          {renderCellValue(student.totalSemester.i)}
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-center align-middle font-bold text-rose-950 bg-slate-50/70">
                          {renderCellValue(student.totalSemester.a)}
                        </td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center align-middle font-black text-slate-950 bg-slate-100">
                          {renderCellValue(student.totalSemester.jumlah, true)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Bottom Row: TOTAL (matching rekap.jpg) */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 text-xs">
                  {/* Spans No, NISN, Nama Siswa with centered 'TOTAL' */}
                  <td
                    colSpan={3}
                    className="border border-slate-400 px-3 py-2 text-center font-black tracking-widest uppercase align-middle text-slate-950"
                  >
                    TOTAL
                  </td>

                  {/* Monthly column totals */}
                  {semesterMonths.map((m) => {
                    const mTot = semesterTotals.monthly[m.index] || { s: 0, i: 0, a: 0 };
                    return (
                      <React.Fragment key={`tot-${m.name}`}>
                        <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-900">
                          {mTot.s === 0 && showZeroMode === 'blank' ? '' : mTot.s}
                        </td>
                        <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-900">
                          {mTot.i === 0 && showZeroMode === 'blank' ? '' : mTot.i}
                        </td>
                        <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-900">
                          {mTot.a === 0 && showZeroMode === 'blank' ? '' : mTot.a}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Total Semester column totals */}
                  <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-950 bg-slate-200/80">
                    {semesterTotals.totalSemester.s}
                  </td>
                  <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-950 bg-slate-200/80">
                    {semesterTotals.totalSemester.i}
                  </td>
                  <td className="border border-slate-400 px-1 py-2 text-center align-middle font-black text-slate-950 bg-slate-200/80">
                    {semesterTotals.totalSemester.a}
                  </td>
                  <td className="border border-slate-400 px-1.5 py-2 text-center align-middle font-black text-slate-950 bg-slate-300 text-sm">
                    {semesterTotals.totalSemester.jumlah}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ---------------- VIEW 2: REKAP BULANAN (DETAIL 1 BULAN) ---------------- */}
        {viewMode === 'monthly' && (
          <div className="overflow-x-auto max-w-3xl mx-auto">
            <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-2 text-center align-middle w-12 tracking-wider"
                  >
                    NO.
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-3 py-2 text-center align-middle tracking-wider"
                  >
                    NAMA SISWA
                  </th>
                  <th
                    colSpan={3}
                    className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-1.5 text-center align-middle tracking-wider"
                  >
                    KETERANGAN
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-2 text-center align-middle w-16 sm:w-20 tracking-wider"
                  >
                    TOTAL
                  </th>
                </tr>
                <tr>
                  <th className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-1 text-center align-middle w-14 sm:w-16 tracking-wider">
                    SAKIT
                  </th>
                  <th className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-1 text-center align-middle w-14 sm:w-16 tracking-wider">
                    IZIN
                  </th>
                  <th className="border border-black bg-[#95B3D7] text-black font-extrabold uppercase px-2 py-1 text-center align-middle w-14 sm:w-16 tracking-wider">
                    ALPA
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSingleMonthStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-black py-8 text-center text-slate-500 font-medium italic"
                    >
                      Tidak ada data siswa yang cocok dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredSingleMonthStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      <td className="border border-black px-2 py-1.5 text-center font-medium text-black align-middle">
                        {idx + 1}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-left font-semibold uppercase text-black align-middle">
                        {student.name}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center align-middle">
                        {renderCellValue(student.sakit)}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center align-middle">
                        {renderCellValue(student.izin)}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center align-middle">
                        {renderCellValue(student.alpa)}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center font-bold text-black bg-slate-50/70 align-middle">
                        {renderCellValue(student.total, true)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="bg-[#B8CCE4] text-black font-black">
                  <td
                    colSpan={2}
                    className="border border-black px-3 py-2 text-center font-black uppercase tracking-wider align-middle"
                  >
                    JUMLAH / TOTAL KESELURUHAN
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-black text-black align-middle">
                    {singleMonthTotals.sumSakit}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-black text-black align-middle">
                    {singleMonthTotals.sumIzin}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-black text-black align-middle">
                    {singleMonthTotals.sumAlpa}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-black text-black bg-[#A6C0DE] align-middle text-sm sm:text-base">
                    {singleMonthTotals.grandTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Official Signatures Area (Tanda Tangan) */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs sm:text-sm text-black">
          {/* Left: Kepala Sekolah */}
          <div className="space-y-16">
            <div>
              <p className="font-semibold text-slate-700">Mengetahui,</p>
              <p className="font-bold text-black uppercase">Kepala Sekolah</p>
            </div>
            <div>
              <p className="font-black text-black underline uppercase">
                {schoolSettings.principalName || '................................................'}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                NIP: {schoolSettings.principalNip || '................................'}
              </p>
            </div>
          </div>

          {/* Right: Wali Kelas */}
          <div className="space-y-16">
            <div>
              <p className="font-semibold text-slate-700">
                {schoolSettings.locationName || schoolSettings.reportPlaceDate || 'Ciputat'},{' '}
                {viewMode === 'semester'
                  ? semester === 'ganjil'
                    ? `31 Desember ${selectedSemesterYear}`
                    : `30 Juni ${selectedSemesterYear}`
                  : `${singleDaysInMonth} ${singleMonthName} ${activeSingleYear}`}
              </p>
              <p className="font-bold text-black uppercase">Wali Kelas {schoolSettings.className}</p>
            </div>
            <div>
              <p className="font-black text-black underline uppercase">
                {schoolSettings.homeroomTeacher || schoolSettings.teacherName || '................................................'}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                NIP: {schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '................................'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
