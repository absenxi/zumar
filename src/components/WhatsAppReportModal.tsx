import React, { useState, useEffect } from 'react';
import { Student, SchoolSettings, AttendanceStatus } from '../types';
import {
  generateAutoWhatsAppMessage,
  generatePersonalWhatsAppMessage,
  saveWhatsAppTransmissionLog,
} from '../utils/whatsappService';
import {
  X,
  MessageSquare,
  Send,
  Users,
  Calendar,
  Phone,
  ExternalLink,
  FileText,
  CheckCircle2,
  Filter,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

interface WhatsAppReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedDay?: number;
  selectedMonthIndex?: number;
  selectedYear?: number;
  attendanceData?: Record<string, Record<number, AttendanceStatus>>;
  attendanceStore?: Record<string, Record<string, Record<number, AttendanceStatus>>>;
}

export const WhatsAppReportModal: React.FC<WhatsAppReportModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolSettings,
  selectedDay,
  selectedMonthIndex,
  selectedYear,
  attendanceData = {},
  attendanceStore = {},
}) => {
  const realDate = new Date();
  const [waDay, setWaDay] = useState<number>(selectedDay || realDate.getDate());
  const [waMonth, setWaMonth] = useState<number>(
    selectedMonthIndex !== undefined ? selectedMonthIndex : realDate.getMonth()
  );
  const [waYear, setWaYear] = useState<number>(selectedYear || realDate.getFullYear());
  const [waTab, setWaTab] = useState<'group' | 'personal'>('group');
  const [waPersonalFilter, setWaPersonalFilter] = useState<'all' | 'absent' | 'hadir'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const schoolName = schoolSettings?.schoolName || 'SDITQu Seruway';
  const className = schoolSettings?.className || '4B';
  const teacherName = schoolSettings?.teacherName || '';

  const getAttendanceStatus = (
    studentId: string,
    day: number,
    monthIdx: number,
    year: number
  ): AttendanceStatus => {
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    if (attendanceStore && attendanceStore[monthKey]) {
      return attendanceStore[monthKey][studentId]?.[day] || '-';
    }
    if (
      monthIdx === (selectedMonthIndex !== undefined ? selectedMonthIndex : realDate.getMonth()) &&
      year === (selectedYear || realDate.getFullYear())
    ) {
      return attendanceData[studentId]?.[day] || '-';
    }
    return '-';
  };

  const dateObj = new Date(waYear, waMonth, waDay);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Generate Group WhatsApp text (uses customizable dynamic template)
  const generateGroupWaMessage = () => {
    return generateAutoWhatsAppMessage(
      schoolSettings,
      students,
      attendanceData,
      waDay,
      waMonth,
      waYear
    );
  };

  // Generate Personal WhatsApp text (uses customizable dynamic template)
  const generatePersonalWaMessage = (student: Student) => {
    const st = getAttendanceStatus(student.id, waDay, waMonth, waYear);
    return generatePersonalWhatsAppMessage(
      schoolSettings,
      student,
      st,
      waDay,
      waMonth,
      waYear
    );
  };

  const handleOpenWaGroup = () => {
    const text = generateGroupWaMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    // Record audit log
    try {
      saveWhatsAppTransmissionLog({
        target: schoolSettings.whatsappTestTarget || 'Group WhatsApp Kelas',
        targetName: `Grup WhatsApp Kelas ${className}`,
        targetType: 'group',
        message: text,
        status: 'success',
        responseMessage: 'Laporan dibuka via aplikasi/web WhatsApp oleh Wali Kelas',
        sentBy: 'Manual (Wali Kelas - Modal Rekap)',
        meta: {
          day: waDay,
          monthIndex: waMonth,
          year: waYear,
        },
      });
    } catch {
      // ignore
    }
    window.open(url, '_blank');
  };

  const daysInSelectedMonth = new Date(waYear, waMonth + 1, 0).getDate();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-300 w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/30 text-emerald-200 rounded-2xl border border-emerald-400/30 shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                Laporan Kehadiran Siswa via WhatsApp
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Kirim rekap otomatis ke Group WhatsApp Orang Tua atau WA Personal Wali Murid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Tanggal Laporan */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-black text-slate-700 uppercase">Pilih Tanggal:</span>
            <select
              value={waDay}
              onChange={(e) => setWaDay(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Tgl {d}
                </option>
              ))}
            </select>
            <select
              value={waMonth}
              onChange={(e) => setWaMonth(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={waYear}
              onChange={(e) => setWaYear(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {[realDate.getFullYear() - 1, realDate.getFullYear(), realDate.getFullYear() + 1].map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            onClick={() => {
              const now = new Date();
              setWaDay(now.getDate());
              setWaMonth(now.getMonth());
              setWaYear(now.getFullYear());
            }}
            className="w-full sm:w-auto px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Set Tanggal Hari Ini</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setWaTab('group')}
            className={`px-4 py-2.5 rounded-t-xl font-extrabold text-xs transition-all flex items-center gap-2 border-t border-x cursor-pointer ${
              waTab === 'group'
                ? 'bg-white text-emerald-800 border-slate-300 border-b-white -mb-px shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Mode Group WA Kelas</span>
          </button>
          <button
            onClick={() => setWaTab('personal')}
            className={`px-4 py-2.5 rounded-t-xl font-extrabold text-xs transition-all flex items-center gap-2 border-t border-x cursor-pointer ${
              waTab === 'personal'
                ? 'bg-white text-emerald-800 border-slate-300 border-b-white -mb-px shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Mode WA Personal Orang Tua</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 grow">
          {waTab === 'group' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Preview Pesan Otomatis Group WhatsApp:
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Siap dikirim ke Group Orang Tua
                </span>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={11}
                  value={generateGroupWaMessage()}
                  className="w-full p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-2xl border-2 border-slate-700 shadow-inner focus:outline-hidden leading-relaxed select-all"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Cara Mengirim Ke Group WhatsApp:</p>
                  <p className="text-slate-700 text-[11px]">
                    Tekan tombol <span className="font-extrabold text-emerald-800">&quot;Buka WhatsApp Group&quot;</span> di bawah. WhatsApp akan terbuka dengan pesan yang sudah terisi otomatis, lalu pilih Group Orang Tua Kelas Anda untuk langsung mengirimnya!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Personal Mode Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter Status Siswa:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setWaPersonalFilter('all')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      waPersonalFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Semua ({students.length})
                  </button>
                  <button
                    onClick={() => setWaPersonalFilter('absent')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      waPersonalFilter === 'absent'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Sakit / Izin / Alpa
                  </button>
                  <button
                    onClick={() => setWaPersonalFilter('hadir')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      waPersonalFilter === 'hadir'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    Hadir
                  </button>
                </div>
              </div>

              {/* Student list for personal messaging */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200 max-h-72 overflow-y-auto">
                {students
                  .filter((s) => {
                    const st = getAttendanceStatus(s.id, waDay, waMonth, waYear);
                    if (waPersonalFilter === 'absent')
                      return st === 'S' || st === 'I' || st === 'A';
                    if (waPersonalFilter === 'hadir') return st === 'H';
                    return true;
                  })
                  .map((s) => {
                    const st = getAttendanceStatus(s.id, waDay, waMonth, waYear);
                    let waClean = (s.parentWhatsapp || '').replace(/[^0-9]/g, '');
                    if (waClean.startsWith('0')) waClean = '62' + waClean.slice(1);
                    const personalMsg = generatePersonalWaMessage(s);
                    const personalUrl = waClean
                      ? `https://wa.me/${waClean}?text=${encodeURIComponent(personalMsg)}`
                      : null;

                    return (
                      <div
                        key={s.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-900 uppercase">
                              {s.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                st === 'H'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : st === 'S'
                                  ? 'bg-blue-100 text-blue-800'
                                  : st === 'I'
                                  ? 'bg-amber-100 text-amber-800'
                                  : st === 'A'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {st === 'H'
                                ? 'Hadir'
                                : st === 'S'
                                ? 'Sakit'
                                : st === 'I'
                                ? 'Izin'
                                : st === 'A'
                                ? 'Alpa'
                                : 'Belum Diabsen'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>
                              No. WA:{' '}
                              <strong className="text-slate-800">
                                {s.parentWhatsapp || 'Belum diisi'}
                              </strong>
                            </span>
                            {s.address && <span>• Alamat: {s.address}</span>}
                          </p>
                        </div>

                        {personalUrl ? (
                          <a
                            href={personalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              try {
                                saveWhatsAppTransmissionLog({
                                  target: s.parentWhatsapp || '-',
                                  targetName: `Wali Murid: ${s.name}`,
                                  targetType: 'personal',
                                  message: personalMsg,
                                  status: 'success',
                                  responseMessage: 'Tautan WhatsApp Personal dibuka oleh Wali Kelas',
                                  sentBy: 'Manual (Wali Kelas - Notifikasi Ortu)',
                                  meta: {
                                    studentId: s.id,
                                    studentName: s.name,
                                    day: waDay,
                                    monthIndex: waMonth,
                                    year: waYear,
                                  },
                                });
                              } catch {
                                // ignore
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Kirim WA</span>
                            <ExternalLink className="w-3 h-3 text-emerald-200" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic px-2">
                            No WA kosong
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-end gap-3 shrink-0">
          {waTab === 'personal' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Tutup
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenWaGroup}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ml-auto"
            >
              <Send className="w-4 h-4 text-yellow-300" />
              <span>Buka WhatsApp Group</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
