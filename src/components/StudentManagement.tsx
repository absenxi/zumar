import React, { useState } from 'react';
import { Student, SchoolSettings, UserRole } from '../types';
import {
  UserPlus,
  Trash2,
  Edit2,
  RotateCcw,
  Users,
  Search,
  FileType,
  ArrowUpDown,
  Download,
  X,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  KeyRound,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  ExternalLink,
  Share2,
  UserCheck,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { PasswordPromptModal } from './PasswordPromptModal';
import { ConfirmationConfig } from './ConfirmationModal';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onResetStudents: () => void;
  onSetStudents?: (newList: Student[]) => void;
  schoolSettings?: SchoolSettings;
  isUnlocked?: boolean;
  onUnlockSession?: (role?: UserRole) => void;
  onRequestConfirmation?: (config: ConfirmationConfig) => void;
  selectedDay?: number;
  selectedMonthIndex?: number;
  selectedYear?: number;
  activeAttendanceData?: Record<string, Record<number, 'H' | 'S' | 'I' | 'A' | ''>>;
  attendanceStore?: Record<string, Record<string, Record<number, 'H' | 'S' | 'I' | 'A' | ''>>>;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onResetStudents,
  onSetStudents,
  schoolSettings,
  isUnlocked = true,
  onUnlockSession,
  onRequestConfirmation,
  selectedDay,
  selectedMonthIndex,
  selectedYear,
  activeAttendanceData,
  attendanceStore,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchMode, setBatchMode] = useState<'append' | 'replace'>('append');

  // Direct action execution (Database Siswa tidak perlu login)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const executeProtected = (action: () => void) => {
    action();
  };

  const handlePasswordSuccess = (role: UserRole) => {
    if (onUnlockSession) onUnlockSession(role);
    setShowPasswordModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Form State for Single Add / Edit
  const [nameInput, setNameInput] = useState('');
  const [genderInput, setGenderInput] = useState<'L' | 'P'>('L');
  const [nisnInput, setNisnInput] = useState('');
  const [parentWhatsappInput, setParentWhatsappInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSaveSuccessToast(message);
    setTimeout(() => {
      setSaveSuccessToast(null);
    }, 3000);
  };

  const resetForm = () => {
    setNameInput('');
    setGenderInput('L');
    setNisnInput('');
    setParentWhatsappInput('');
    setAddressInput('');
    setNoteInput('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    executeProtected(() => {
      onAddStudent({
        no: students.length + 1,
        name: nameInput.trim().toUpperCase(),
        gender: genderInput,
        nisn: nisnInput.trim(),
        parentWhatsapp: parentWhatsappInput.trim(),
        address: addressInput.trim(),
        note: noteInput.trim(),
      });
      resetForm();
      setIsAdding(false);
      showToast('✨ Siswa baru berhasil ditambahkan dan tersimpan ke Firebase!');
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !nameInput.trim()) return;
    executeProtected(() => {
      onEditStudent({
        ...editingStudent,
        name: nameInput.trim().toUpperCase(),
        gender: genderInput,
        nisn: nisnInput.trim(),
        parentWhatsapp: parentWhatsappInput.trim(),
        address: addressInput.trim(),
        note: noteInput.trim(),
      });
      setEditingStudent(null);
      resetForm();
      showToast('✨ Perubahan data siswa berhasil diperbarui ke Firebase!');
    });
  };

  const startEdit = (s: Student) => {
    executeProtected(() => {
      setEditingStudent(s);
      setNameInput(s.name);
      setGenderInput(s.gender);
      setNisnInput(s.nisn || '');
      setParentWhatsappInput(s.parentWhatsapp || '');
      setAddressInput(s.address || '');
      setNoteInput(s.note || '');
    });
  };

  // Auto Sort A-Z and Renumber 1..N
  const handleSortAndRenumber = () => {
    if (!onSetStudents) return;
    executeProtected(() => {
      const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
      const renumbered = sorted.map((s, idx) => ({ ...s, no: idx + 1 }));
      onSetStudents(renumbered);
    });
  };

  // Clear Database
  const handleClearAll = () => {
    if (!onSetStudents) return;
    executeProtected(() => {
      const performClear = () => {
        onSetStudents([]);
        setSaveSuccessToast('Seluruh database siswa berhasil dikosongkan.');
        setTimeout(() => setSaveSuccessToast(null), 3000);
      };

      if (onRequestConfirmation) {
        onRequestConfirmation({
          title: 'Konfirmasi Kosongkan Database Siswa',
          message: (
            <div>
              <p className="font-bold text-rose-800 text-xs sm:text-sm">
                PERINGATAN KRUSIAL: Hapus Semua Siswa!
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Apakah Anda yakin ingin <strong>MENGHAPUS SEMUA ({students.length}) DATA SISWA</strong> dari database kelas {schoolSettings?.className || ''}?
              </p>
              <p className="text-[11px] text-rose-600 font-bold mt-1">
                Seluruh data profil siswa akan dihapus dari sistem.
              </p>
            </div>
          ),
          confirmText: 'Ya, Kosongkan Semua Siswa',
          cancelText: 'Batal',
          variant: 'danger',
          icon: 'trash',
          onConfirm: performClear,
        });
      } else {
        performClear();
      }
    });
  };

  // Batch Import Parser (Supports Single List or Multi-Column Excel/TSV Paste)
  const parseBatchInput = (
    text: string
  ): {
    name: string;
    gender: 'L' | 'P';
    parentWhatsapp?: string;
    address?: string;
    note?: string;
  }[] => {
    const lines = text.split('\n');
    const result: {
      name: string;
      gender: 'L' | 'P';
      parentWhatsapp?: string;
      address?: string;
      note?: string;
    }[] = [];

    lines.forEach((rawLine) => {
      let line = rawLine.trim();
      if (!line) return;

      // Skip header row if pasted
      const lower = line.toLowerCase();
      if (
        (lower.includes('nama') && lower.includes('siswa')) ||
        (lower.includes('jenis') && lower.includes('kelamin')) ||
        lower.includes('wa orang tua')
      ) {
        return;
      }

      // Check if line is tab-separated (from Excel / Spreadsheet paste)
      if (line.includes('\t')) {
        const cols = line.split('\t').map((c) => c.trim());
        let colIndex = 0;

        // If 1st column is number (NO), skip
        if (cols[colIndex] && /^[0-9]+$/.test(cols[colIndex])) {
          colIndex++;
        }

        const name = cols[colIndex] ? cols[colIndex].toUpperCase() : '';
        colIndex++;

        let gender: 'L' | 'P' = 'L';
        if (cols[colIndex]) {
          const gStr = cols[colIndex].toUpperCase();
          if (gStr.includes('P') || gStr.includes('PEREMPUAN')) {
            gender = 'P';
          }
        }
        colIndex++;

        // Next columns optional: NO. WA ORANG TUA, ALAMAT, CATATAN
        const parentWhatsapp = cols[colIndex] || undefined;
        colIndex++;
        const address = cols[colIndex] || undefined;
        colIndex++;
        const note = cols[colIndex] || undefined;

        if (name) {
          result.push({
            name,
            gender,
            parentWhatsapp,
            address,
            note,
          });
        }
        return;
      }

      // Fallback for single list text (e.g. "1. ABDUL RAHMAN (L)")
      line = line.replace(/^[0-9]+[\.\-\)\s]+/, '').trim();

      let gender: 'L' | 'P' = 'L';
      const genderPatternP = /[\(\[\s]+P[\)\]\s]*$/i;
      const genderPatternL = /[\(\[\s]+L[\)\]\s]*$/i;

      if (genderPatternP.test(line)) {
        gender = 'P';
        line = line.replace(genderPatternP, '').trim();
      } else if (genderPatternL.test(line)) {
        gender = 'L';
        line = line.replace(genderPatternL, '').trim();
      }

      if (line) {
        result.push({
          name: line.toUpperCase(),
          gender,
        });
      }
    });

    return result;
  };

  const handleProcessBatchImport = () => {
    if (!batchText.trim()) return;
    const parsedList = parseBatchInput(batchText);
    if (parsedList.length === 0) {
      alert('Tidak ada nama siswa valid yang terdeteksi dari teks yang dimasukkan.');
      return;
    }

    executeProtected(() => {
      if (batchMode === 'replace') {
        const performReplace = () => {
          const newList: Student[] = parsedList.map((item, idx) => ({
            id: `batch_${Date.now()}_${idx}`,
            no: idx + 1,
            name: item.name,
            gender: item.gender,
            parentWhatsapp: item.parentWhatsapp,
            address: item.address,
            note: item.note,
          }));
          if (onSetStudents) onSetStudents(newList);
          setBatchText('');
          setIsBatchModalOpen(false);
          setSaveSuccessToast(`Berhasil mengganti database dengan ${newList.length} siswa baru.`);
          setTimeout(() => setSaveSuccessToast(null), 3000);
        };

        if (onRequestConfirmation) {
          onRequestConfirmation({
            title: 'Konfirmasi Timpa Seluruh Siswa (Batch)',
            message: (
              <div>
                <p className="font-bold text-amber-900 text-xs sm:text-sm">
                  Perhatian: Mode Gantikan Seluruh Daftar
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  Sebanyak <strong>{students.length} siswa</strong> lama akan dihapus dan digantikan oleh <strong>{parsedList.length} siswa baru</strong> yang Anda impor.
                </p>
                <p className="text-[11px] text-amber-700 font-bold mt-1">
                  Lanjutkan proses penggantian database siswa?
                </p>
              </div>
            ),
            confirmText: `Ya, Timpa dengan ${parsedList.length} Siswa`,
            cancelText: 'Batal',
            variant: 'warning',
            icon: 'database',
            onConfirm: performReplace,
          });
        } else {
          performReplace();
        }
      } else {
        const existingCount = students.length;
        const newItems: Student[] = parsedList.map((item, idx) => ({
          id: `batch_${Date.now()}_${idx}`,
          no: existingCount + idx + 1,
          name: item.name,
          gender: item.gender,
          parentWhatsapp: item.parentWhatsapp,
          address: item.address,
          note: item.note,
        }));
        if (onSetStudents) {
          onSetStudents([...students, ...newItems]);
        } else {
          newItems.forEach((s) => onAddStudent(s));
        }
        setBatchText('');
        setIsBatchModalOpen(false);
        setSaveSuccessToast(`Berhasil menambahkan ${newItems.length} siswa baru ke database.`);
        setTimeout(() => setSaveSuccessToast(null), 3000);
      }
    });
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.toLowerCase().includes(q)) ||
      (s.parentWhatsapp && s.parentWhatsapp.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.note && s.note.toLowerCase().includes(q)) ||
      s.no.toString() === q ||
      s.no.toString().includes(q);

    const matchGender =
      genderFilter === 'ALL' || s.gender === genderFilter;

    return matchSearch && matchGender;
  });

  const countL = students.filter((s) => s.gender === 'L').length;
  const countP = students.filter((s) => s.gender === 'P').length;

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
      {saveSuccessToast && (
        <div className="mb-4 p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-yellow-300 shrink-0" />
            <span>{saveSuccessToast}</span>
          </div>
          <button
            onClick={() => setSaveSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg border border-blue-400/30">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
              Database Input & Kelola Data Siswa
            </h2>
            <p className="text-xs text-slate-600 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
              <span>TOTAL: <strong className="text-blue-700 text-sm">{students.length}</strong> SISWA</span>
              <span className="text-slate-300">•</span>
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-extrabold text-[11px]">
                Laki-laki (L): {countL}
              </span>
              <span className="bg-pink-100 text-pink-900 px-2 py-0.5 rounded-md font-extrabold text-[11px]">
                Perempuan (P): {countP}
              </span>
            </p>
          </div>
        </div>

        {/* Action Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              executeProtected(() => {
                setIsAdding(true);
                setEditingStudent(null);
                setNameInput('');
              });
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4 text-yellow-300" />
            Tambah 1 Siswa
          </button>

          <button
            onClick={() => {
              executeProtected(() => {
                setIsBatchModalOpen(true);
              });
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Input Banyak Siswa (Paste)
          </button>

          <button
            onClick={handleSortAndRenumber}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 transition-all"
            title="Urutkan nama A-Z dan perbarui nomor 1..N"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-600" />
            Urutkan A-Z
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-2.5 rounded-xl border border-red-200 transition-all"
            title="Kosongkan seluruh daftar siswa"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            Kosongkan
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Prominent Top Controls) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, no. urut, atau no. WA orang tua..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Gender Filter Pills & Result Counter */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            <div className="inline-flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setGenderFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  genderFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Semua ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('L')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  genderFilter === 'L'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                L ({countL})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('P')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  genderFilter === 'P'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                P ({countP})
              </button>
            </div>

            {(search || genderFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setGenderFilter('ALL');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors flex items-center gap-1"
                title="Reset semua filter dan pencarian"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter Label */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
          <span>
            Menampilkan <strong className="text-slate-800 font-extrabold">{filtered.length}</strong> dari{' '}
            <strong className="text-slate-800 font-extrabold">{students.length}</strong> total siswa
          </span>
          {search && (
            <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
              Filter: &ldquo;{search}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Single Add or Edit Form Drawer */}
      {(isAdding || editingStudent) && (
        <form
          onSubmit={editingStudent ? handleUpdate : handleCreate}
          className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border-2 border-blue-400 p-4 sm:p-5 rounded-2xl mb-5 space-y-3 shadow-md animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <span>{editingStudent ? 'Edit Data Siswa' : 'Input Siswa Baru'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingStudent(null);
                resetForm();
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: MUHAMMAD FADLI"
                value={nameInput || ''}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Jenis Kelamin *
              </label>
              <select
                value={genderInput || 'L'}
                onChange={(e) => setGenderInput(e.target.value as 'L' | 'P')}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="L">L - Laki-laki</option>
                <option value="P">P - Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                NISN (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 0081234567"
                value={nisnInput || ''}
                onChange={(e) => setNisnInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>No. WhatsApp Orang Tua</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 08123456789"
                value={parentWhatsappInput || ''}
                onChange={(e) => setParentWhatsappInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-600" />
                <span>Alamat Rumah</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Tangsi Lama, Seruway"
                value={addressInput || ''}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-600" />
                <span>Catatan Tambahan</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Wali murid / Catatan khusus"
                value={noteInput || ''}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingStudent(null);
                resetForm();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md"
            >
              Simpan Data Siswa
            </button>
          </div>
        </form>
      )}

      {/* Student Database Table */}
      <div className="overflow-x-auto border-2 border-slate-200 rounded-2xl shadow-inner">
        <table className="w-full text-left text-xs">
          <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white uppercase font-black text-[11px] tracking-wider">
            <tr>
              <th className="py-3 px-3 w-12 text-center">NO</th>
              <th className="py-3 px-4">NAMA LENGKAP SISWA</th>
              <th className="py-3 px-3 w-28 text-center">JK</th>
              <th className="py-3 px-4">NO. WA ORANG TUA</th>
              <th className="py-3 px-4">ALAMAT</th>
              <th className="py-3 px-4">CATATAN</th>
              <th className="py-3 px-3 w-24 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 bg-slate-50/70">
                  {search || genderFilter !== 'ALL' ? (
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-black text-sm text-slate-800">
                        Tidak ditemukan siswa yang cocok
                      </p>
                      <p className="text-xs text-slate-500">
                        Tidak ada siswa yang sesuai dengan filter pencarian &ldquo;<strong>{search}</strong>&rdquo;
                        {genderFilter !== 'ALL' && ` (Kategori: ${genderFilter === 'L' ? 'Laki-laki' : 'Perempuan'})`}.
                      </p>
                      <button
                        onClick={() => {
                          setSearch('');
                          setGenderFilter('ALL');
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Reset Pencarian & Tampilkan Semua
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-sm text-slate-800">Tidak ada siswa dalam daftar</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Silakan tekan tombol &quot;Tambah 1 Siswa&quot; atau &quot;Input Banyak Siswa (Paste)&quot; untuk mengisi database.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((student, idx) => {
                let waUrl = null;
                if (student.parentWhatsapp) {
                  let cleanWa = String(student.parentWhatsapp || '').replace(/[^0-9]/g, '');
                  if (cleanWa.startsWith('0')) {
                    cleanWa = '62' + cleanWa.slice(1);
                  }
                  if (cleanWa) waUrl = `https://wa.me/${cleanWa}`;
                }

                return (
                  <tr
                    key={student.id || idx}
                    className="hover:bg-blue-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-black text-slate-600 bg-slate-50/50">
                      {student.no}
                    </td>
                    <td className="py-2.5 px-4 font-black text-slate-900 uppercase">
                      <div>{student.name}</div>
                      {student.nisn && (
                        <div className="text-[10px] text-slate-500 font-medium normal-case">
                          NISN: {student.nisn}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase shadow-sm ${
                          student.gender === 'L'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-pink-100 text-pink-900 border border-pink-300'
                        }`}
                      >
                        {student.gender === 'L' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-normal text-slate-700">
                      {student.parentWhatsapp ? (
                        waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 font-extrabold text-[11px] transition-all group"
                            title="Chat Orang Tua di WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span>{student.parentWhatsapp}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                          </a>
                        ) : (
                          <span className="text-xs font-semibold">{student.parentWhatsapp}</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-normal text-slate-700 text-xs">
                      {student.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{student.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-normal text-slate-700 text-xs">
                      {student.note ? (
                        <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-[11px] text-amber-900 font-medium">
                          {student.note}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => startEdit(student)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg border border-blue-200 transition-all shadow-sm"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            executeProtected(() => {
                              const performDelete = () => {
                                onDeleteStudent(student.id);
                                setSaveSuccessToast(`Siswa ${student.name} berhasil dihapus dari database.`);
                                setTimeout(() => setSaveSuccessToast(null), 3000);
                              };

                              if (onRequestConfirmation) {
                                onRequestConfirmation({
                                  title: 'Konfirmasi Hapus Siswa',
                                  message: (
                                    <div>
                                      <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                                        Apakah Anda yakin ingin menghapus data siswa{' '}
                                        <strong className="text-rose-700 uppercase font-black">
                                          {student.name}
                                        </strong>{' '}
                                        (No. {student.no}) dari database?
                                      </p>
                                      <p className="text-[11px] text-slate-500 mt-1">
                                        Data profil siswa ini akan terhapus dari daftar kelas {schoolSettings?.className || ''}.
                                      </p>
                                    </div>
                                  ),
                                  confirmText: 'Ya, Hapus Siswa',
                                  cancelText: 'Batal',
                                  variant: 'danger',
                                  icon: 'user-x',
                                  onConfirm: performDelete,
                                });
                              } else {
                                performDelete();
                              }
                            });
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg border border-red-200 transition-all shadow-sm cursor-pointer"
                          title={`Hapus ${student.name}`}
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

      {/* Batch Import Paste Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-emerald-400 w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-400 text-slate-950 rounded-2xl shadow font-black">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide">
                    Input Banyak Siswa Sekaligus (Batch Paste)
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium">
                    Copy dari Excel / Word / WhatsApp lalu paste di bawah ini.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 font-semibold space-y-1.5">
                <p className="font-extrabold text-emerald-900 uppercase">💡 Format Yang Mendukung Paste Excel / Kolom & Daftar Teks:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-300 text-slate-800">
                    <p className="font-sans font-bold text-[10px] text-emerald-700 uppercase mb-1">Format Kolom Excel (Tab-Separated):</p>
                    <pre className="overflow-x-auto">
{`NO\tNAMA LENGKAP SISWA\tJK\tNO. WA ORANG TUA\tALAMAT\tCATATAN
1\tABDUL RAHMAN\tL\t08123456789\tSeruway\tWali
2\tAISYAH AZZAHRA\tP\t08219876543\tTangsi\t-`}
                    </pre>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-300 text-slate-800">
                    <p className="font-sans font-bold text-[10px] text-emerald-700 uppercase mb-1">Format Teks Biasa:</p>
                    <pre className="overflow-x-auto">
{`1. ABDUL RAHMAN (L)
2. AISYAH AZZAHRA (P)
3. BUDI SANTOSO L
4. CINTIA BELLA P`}
                    </pre>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">
                  Semua data (termasuk No. WA, Alamat, Catatan) akan otomatis diproses dan disimpan secara permanen ke database Supabase Cloud.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                  Paste Daftar Nama Siswa Di Sini:
                </label>
                <textarea
                  rows={7}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Paste daftar nama siswa di sini..."
                  className="w-full p-3 border-2 border-slate-300 focus:border-emerald-500 rounded-2xl font-mono text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Mode Selection: Append or Replace */}
              <div className="flex items-center gap-6 bg-slate-100 p-3 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-slate-800">
                  <input
                    type="radio"
                    name="batchMode"
                    value="append"
                    checked={batchMode === 'append'}
                    onChange={() => setBatchMode('append')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tambahkan Ke Daftar Yang Ada</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-red-700">
                  <input
                    type="radio"
                    name="batchMode"
                    value="replace"
                    checked={batchMode === 'replace'}
                    onChange={() => setBatchMode('replace')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span>Gantikan Seluruh Daftar Saat Ini</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessBatchImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4 text-yellow-300" />
                  Proses & Impor Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal (Admin Level Only) */}
      <PasswordPromptModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onSuccess={handlePasswordSuccess}
        guruPassword={schoolSettings?.attendancePassword || '1234'}
        adminPassword={schoolSettings?.adminPassword || 'admin'}
        superAdminPassword={schoolSettings?.superAdminPassword || 'superadmin'}
        requiredLevel="admin"
        title="Otorisasi Database Siswa (Admin)"
        description="Pengelolaan database siswa hanya dapat dilakukan oleh akun Level Admin."
      />
    </div>
  );
};
