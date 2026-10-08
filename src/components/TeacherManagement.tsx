import React, { useState, useMemo } from 'react';
import { Teacher, TeacherEmploymentStatus, TeacherActiveStatus, SchoolSettings, Subject, UserRole } from '../types';
import { DEFAULT_SUBJECTS } from '../data/initialData';
import { ConfirmationConfig } from './ConfirmationModal';
import {
  UserPlus,
  Trash2,
  Edit3,
  Search,
  RotateCcw,
  GraduationCap,
  Briefcase,
  Phone,
  Mail,
  BookOpen,
  Filter,
  XCircle,
  X,
  Send,
  LayoutGrid,
  List,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface TeacherManagementProps {
  teachers: Teacher[];
  subjects?: Subject[];
  schoolSettings: SchoolSettings;
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onResetTeachers: () => void;
  onBatchSetTeachers?: (newTeachers: Teacher[]) => void;
  isUnlocked?: boolean;
  isAdminUnlocked?: boolean;
  userRole?: UserRole | null;
  onUnlockSession?: (role?: UserRole) => void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  subjects = [],
  schoolSettings,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onResetTeachers,
  onBatchSetTeachers,
  isUnlocked = false,
  isAdminUnlocked = false,
  userRole = null,
  onUnlockSession,
  onRequestConfirmation,
}) => {
  // State: Filter & Search
  const [search, setSearch] = useState('');
  const [filterEmployment, setFilterEmployment] = useState<string>('ALL');
  const [filterActiveStatus, setFilterActiveStatus] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // State: Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formNuptk, setFormNuptk] = useState('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formSubject, setFormSubject] = useState('');
  const [formEmployment, setFormEmployment] = useState<TeacherEmploymentStatus>('GTY');
  const [formActiveStatus, setFormActiveStatus] = useState<TeacherActiveStatus>('Aktif');
  const [formHomeroomClass, setFormHomeroomClass] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Password / Security check helper
  const isProtected = schoolSettings.requirePassword !== false;
  const canEdit = !isProtected || isUnlocked || isAdminUnlocked;

  const executeProtected = (action: () => void) => {
    if (!canEdit && onUnlockSession) {
      onUnlockSession('guru');
    } else {
      action();
    }
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    executeProtected(() => {
      setEditingTeacher(null);
      setFormName('');
      setFormCode('');
      setFormNip('');
      setFormNuptk('');
      setFormGender('L');
      setFormSubject('');
      setFormEmployment('GTY');
      setFormActiveStatus('Aktif');
      setFormHomeroomClass('');
      setFormPhone('');
      setFormNotes('');
      setFormError('');
      setIsFormOpen(true);
    });
  };

  // Open Form for Editing
  const handleOpenEdit = (teacher: Teacher) => {
    executeProtected(() => {
      setEditingTeacher(teacher);
      setFormName(teacher.name);
      setFormCode(teacher.code || '');
      setFormNip(teacher.nip || '');
      setFormNuptk(teacher.nuptk || '');
      setFormGender(teacher.gender || 'L');
      setFormSubject(teacher.subject || '');
      setFormEmployment(teacher.employmentStatus || 'GTY');
      setFormActiveStatus(teacher.activeStatus || 'Aktif');
      setFormHomeroomClass(teacher.homeroomClass || '');
      setFormPhone(teacher.phone || '');
      setFormNotes(teacher.notes || '');
      setFormError('');
      setIsFormOpen(true);
    });
  };

  // Save Add/Edit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Nama lengkap guru wajib diisi.');
      return;
    }

    const finalSubject = formSubject.trim();
    if (!finalSubject) {
      setFormError('Mata pelajaran yang diampu wajib diisi.');
      return;
    }

    const teacherData = {
      name: trimmedName,
      code: formCode.trim().toUpperCase(),
      nip: formNip.trim(),
      nuptk: formNuptk.trim(),
      gender: formGender,
      subject: finalSubject,
      employmentStatus: formEmployment,
      activeStatus: formActiveStatus,
      homeroomClass: formHomeroomClass.trim(),
      phone: formPhone.trim(),
      notes: formNotes.trim(),
    };

    if (editingTeacher) {
      onEditTeacher({
        ...editingTeacher,
        ...teacherData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddTeacher(teacherData);
    }

    setIsFormOpen(false);
  };

  // Delete Teacher
  const handleDelete = (teacher: Teacher) => {
    executeProtected(() => {
      if (onRequestConfirmation) {
        onRequestConfirmation({
          title: 'Hapus Data Guru',
          message: `Apakah Anda yakin ingin menghapus "${teacher.name}" (${teacher.subject}) dari database guru? Data ini tidak dapat dikembalikan.`,
          confirmText: 'Ya, Hapus Guru',
          confirmVariant: 'danger',
          onConfirm: () => onDeleteTeacher(teacher.id),
        });
      } else {
        onDeleteTeacher(teacher.id);
      }
    });
  };

  // Reset / Kosongkan Database Guru
  const handleReset = () => {
    executeProtected(() => {
      if (onRequestConfirmation) {
        onRequestConfirmation({
          title: 'Kosongkan Database Guru',
          message:
            'Apakah Anda yakin ingin MENGHAPUS SEMUA data guru dari database? Tindakan ini akan mengosongkan seluruh daftar guru dan tersinkronisasi ke Cloud Supabase.',
          confirmText: 'Ya, Kosongkan Database',
          confirmVariant: 'danger',
          onConfirm: onResetTeachers,
        });
      } else {
        onResetTeachers();
      }
    });
  };

  // Format WhatsApp Link
  const getWhatsAppLink = (phone?: string, teacherName?: string) => {
    if (!phone) return null;
    let clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    const message = encodeURIComponent(
      `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${teacherName || 'Guru'}, perihal koordinasi pembelajaran di ${schoolSettings.schoolName}.`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCode = (t.code || '').toLowerCase().includes(q);
        const matchesNip = (t.nip || '').toLowerCase().includes(q);
        const matchesNuptk = (t.nuptk || '').toLowerCase().includes(q);
        const matchesSubject = (t.subject || '').toLowerCase().includes(q);
        const matchesHomeroom = (t.homeroomClass || '').toLowerCase().includes(q);
        const matchesPhone = (t.phone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesNip && !matchesNuptk && !matchesSubject && !matchesHomeroom && !matchesPhone) {
          return false;
        }
      }

      // Employment
      if (filterEmployment !== 'ALL' && t.employmentStatus !== filterEmployment) {
        return false;
      }

      // Active Status
      if (filterActiveStatus !== 'ALL' && t.activeStatus !== filterActiveStatus) {
        return false;
      }

      // Gender
      if (filterGender !== 'ALL' && t.gender !== filterGender) {
        return false;
      }

      return true;
    });
  }, [teachers, search, filterEmployment, filterActiveStatus, filterGender]);

  return (
    <div className="space-y-6 pb-12">
      {/* Printable Header for print mode */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-900 text-white flex items-center justify-center font-black text-2xl">
            N1
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              {schoolSettings.schoolName}
            </h1>
            <p className="text-xs text-slate-600">
              {schoolSettings.address} | Telp: {schoolSettings.phoneNumber || '(021) 7470707'} | Website:{' '}
              {schoolSettings.website || 'smksnusantara1ciputat.sch.id'}
            </p>
            <p className="text-xs font-bold text-blue-900 uppercase mt-1">
              BUKU INDUK & DATABASE DEWAN GURU DAN TENAGA PENDIDIK
            </p>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-bold mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Database Pendidik & Tenaga Kependidikan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Database Dewan Guru
            </h2>
            <p className="text-sm text-blue-200 mt-1 max-w-2xl">
              Pusat data master pengajar {schoolSettings.schoolName}. Tersinkronisasi realtime ke cloud Supabase dan
              terhubung langsung dengan Agenda Kehadiran Guru di Kelas.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              title="Tambah Guru Baru"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white font-bold rounded-xl text-xs transition-all border border-red-400/20 cursor-pointer"
              title="Kosongkan seluruh data guru dari database"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-300" />
              <span className="hidden sm:inline">Kosongkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari guru berdasarkan nama, NIP, NUPTK, mata pelajaran, wali kelas..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kepegawaian */}
            <select
              value={filterEmployment}
              onChange={(e) => setFilterEmployment(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Status Pegawai</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="GTY">GTY (Guru Tetap Yayasan)</option>
              <option value="GTT">GTT (Guru Tidak Tetap)</option>
              <option value="Honor">Honor</option>
              <option value="Guru Tamu">Guru Tamu / Industri</option>
            </select>

            {/* Filter Keaktifan */}
            <select
              value={filterActiveStatus}
              onChange={(e) => setFilterActiveStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Keaktifan</option>
              <option value="Aktif">Aktif Mengajar</option>
              <option value="Cuti">Sedang Cuti</option>
              <option value="Pensiun">Pensiun</option>
              <option value="Mutasi">Mutasi</option>
            </select>

            {/* Filter Gender */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kartu Profil"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(search || filterEmployment !== 'ALL' || filterActiveStatus !== 'ALL' || filterGender !== 'ALL') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold">Filter aktif:</span>
            <span>Ditemukan {filteredTeachers.length} guru</span>
            <button
              onClick={() => {
                setSearch('');
                setFilterEmployment('ALL');
                setFilterActiveStatus('ALL');
                setFilterGender('ALL');
              }}
              className="text-blue-600 font-bold hover:underline ml-auto"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Table View or Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="p-3 sm:p-4 w-12 text-center">No</th>
                  <th className="p-3 sm:p-4">Identitas Guru</th>
                  <th className="p-3 sm:p-4">Mata Pelajaran Utama</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-3 sm:p-4">Tugas / Wali Kelas</th>
                  <th className="p-3 sm:p-4">Kontak WhatsApp</th>
                  <th className="p-3 sm:p-4 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
                      <p className="font-bold text-slate-700 text-sm">
                        {teachers.length === 0
                          ? 'Database Dewan Guru Masih Kosong'
                          : 'Tidak ada data guru yang sesuai'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {teachers.length === 0
                          ? 'Silakan tekan tombol "Tambah Guru" untuk menambahkan data guru baru.'
                          : 'Silakan sesuaikan kata kunci pencarian atau bersihkan filter pencarian.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t, idx) => {
                    const waLink = getWhatsAppLink(t.phone, t.name);
                    return (
                      <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3 sm:p-4 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 ${
                                t.gender === 'P' ? 'bg-pink-600' : 'bg-blue-700'
                              }`}
                            >
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                <span>{t.name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    t.gender === 'P'
                                      ? 'bg-pink-100 text-pink-700 border border-pink-200'
                                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {t.gender}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.code && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-bold border border-blue-200">
                                {t.code}
                              </span>
                            )}
                            <span className="font-bold text-slate-800">{t.subject}</span>
                          </div>
                          {t.additionalSubjects && t.additionalSubjects.length > 0 && (
                            <span className="text-[11px] text-slate-500 block">
                              +{t.additionalSubjects.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold ${
                                t.employmentStatus === 'PNS'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : t.employmentStatus === 'GTY'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : t.employmentStatus === 'PPPK'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {t.employmentStatus}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                t.activeStatus === 'Aktif' ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              ● {t.activeStatus}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          {t.homeroomClass ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-extrabold text-xs">
                              <BookOpen className="w-3 h-3" />
                              <span>Wali {t.homeroomClass}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                          {t.notes && <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{t.notes}</p>}
                        </td>
                        <td className="p-3 sm:p-4 text-xs">
                          {t.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700">{t.phone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold transition-all"
                                  title={`Kirim pesan WhatsApp ke ${t.name}`}
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Chat WA</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-right print:hidden">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-100/60 rounded-lg transition-all cursor-pointer"
                              title="Edit Data Guru"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Hapus Guru"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      ) : (
        /* Grid Profile Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
              <p className="font-bold text-slate-700 text-sm">
                {teachers.length === 0 ? 'Database Dewan Guru Masih Kosong' : 'Tidak ada guru ditemukan.'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {teachers.length === 0
                  ? 'Gunakan tombol "Tambah Guru" di atas untuk menambahkan data guru.'
                  : 'Silakan sesuaikan kata kunci pencarian atau filter Anda.'}
              </p>
            </div>
          ) : (
            filteredTeachers.map((t) => {
              const waLink = getWhatsAppLink(t.phone, t.name);
              return (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                >
                  <div>
                    {/* Top Row: Avatar & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0 ${
                            t.gender === 'P' ? 'bg-pink-600' : 'bg-blue-800'
                          }`}
                        >
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm leading-snug">{t.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                                t.employmentStatus === 'PNS'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : t.employmentStatus === 'GTY'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.employmentStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Menu */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subject & Duties */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="line-clamp-1">
                          {t.code && (
                            <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold mr-1.5 border border-blue-200">
                              {t.code}
                            </span>
                          )}
                          {t.subject}
                        </span>
                      </div>
                      {t.homeroomClass && (
                        <div className="flex items-center gap-2 text-purple-700 font-bold">
                          <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Wali Kelas: {t.homeroomClass}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes if any */}
                    {t.notes && <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">"{t.notes}"</p>}
                  </div>

                  {/* Bottom: Contact & WA Chat */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.phone || '-'}</span>
                    </div>

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Print Signatures */}
      <div className="hidden print:block mt-12 pt-6 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-bold text-slate-900 mt-0.5">Wakil Bid. Kurikulum</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">Dra. Siti Rahmah</p>
            <p className="text-slate-500">NIP: 19680512 199403 2 003</p>
          </div>
          <div>
            <p className="text-slate-500">Petugas Tata Usaha,</p>
            <p className="font-bold text-slate-900 mt-0.5">Operator Simdik / Database</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">( ............................................ )</p>
            <p className="text-slate-500">NIP / NUPTK</p>
          </div>
          <div>
            <p className="text-slate-500">Ciputat, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold text-slate-900 mt-0.5">Kepala SMKS Nusantara 1</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">{schoolSettings.principalName}</p>
            <p className="text-slate-500">{schoolSettings.principalNip ? `NIP. ${schoolSettings.principalNip}` : 'Kepala Sekolah'}</p>
          </div>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Guru */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Lengkapi identitas pendidik, mata pelajaran, dan tugas di {schoolSettings.schoolName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama Lengkap & Gelar */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap beserta Gelar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName || ''}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Dedi Saputra, S.T., M.Kom."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  required
                />
              </div>

              {/* Jenis Kelamin & Nomor WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formGender || 'L'}
                    onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formPhone || ''}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Contoh: 081289123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Kode & Nama Mata Pelajaran */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Kode
                    </label>
                    <input
                      type="text"
                      value={formCode || ''}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="AIJ"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Nama Mata Pelajaran <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formSubject || ''}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="Contoh: Administrasi Infrastruktur Jaringan"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Wali Kelas */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Wali Kelas (Jika bertugas)
                </label>
                <input
                  type="text"
                  value={formHomeroomClass || ''}
                  onChange={(e) => setFormHomeroomClass(e.target.value)}
                  placeholder="Contoh: X TJKT 3 atau kosongkan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Tugas Tambahan / Catatan */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Tugas Tambahan / Catatan
                </label>
                <input
                  type="text"
                  value={formNotes || ''}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Kepala Lab Komputer / Pembina Pramuka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editingTeacher ? 'Perbarui Data Guru' : 'Simpan Guru Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
