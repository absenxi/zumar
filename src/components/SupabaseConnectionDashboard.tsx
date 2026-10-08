import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Globe,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  UploadCloud,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  getSupabaseConnectionStatus,
  checkSupabaseTables,
  TableInspectionResult,
  SUPABASE_SCHEMA_SQL,
  SUPABASE_RLS_SQL,
  syncEntireDatabaseToCloud,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../lib/supabase';
import {
  SchoolSettings,
  Student,
  Teacher,
  Subject,
  AttendanceStatus,
  TeacherAgendaEntry,
} from '../types';

interface SupabaseConnectionDashboardProps {
  schoolSettings: SchoolSettings;
  students: Student[];
  teachers: Teacher[];
  subjects?: Subject[];
  attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
  onSettingsUpdated?: (settings: SchoolSettings) => void;
}

export const SupabaseConnectionDashboard: React.FC<SupabaseConnectionDashboardProps> = ({
  schoolSettings,
  students,
  teachers,
  subjects = [],
  attendanceStore,
  teacherAgendaStore = {},
}) => {
  // Config Form State
  const [apiUrl, setApiUrl] = useState<string>('');
  const [anonKey, setAnonKey] = useState<string>('');
  const [showAnonKey, setShowAnonKey] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Connection Status State
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    url: string;
    projectId: string;
    databaseId: string;
    anonKeyValid: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Tables Inspection State
  const [isCheckingTables, setIsCheckingTables] = useState<boolean>(false);
  const [tableResults, setTableResults] = useState<TableInspectionResult[]>([]);

  // SQL Editor State
  const [activeSqlTab, setActiveSqlTab] = useState<'schema' | 'rls'>('rls');
  const [sqlContent, setSqlContent] = useState<string>(SUPABASE_RLS_SQL);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedRlsQuick, setCopiedRlsQuick] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const cfg = getSupabaseConfig();
    setApiUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const res = await getSupabaseConnectionStatus();
      setConnectionStatus(res);
      // Auto inspect tables if connected
      if (res.connected) {
        inspectTables();
      }
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        url: apiUrl,
        projectId: '-',
        databaseId: '-',
        anonKeyValid: false,
        error: e?.message || 'Gagal memeriksa koneksi.',
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const inspectTables = async () => {
    setIsCheckingTables(true);
    try {
      const res = await checkSupabaseTables();
      setTableResults(res);
    } catch (e) {
      console.error('Failed to inspect tables:', e);
    } finally {
      setIsCheckingTables(false);
    }
  };

  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiUrl.trim() || !anonKey.trim()) {
      setSaveToast('API URL dan Anon Key tidak boleh kosong.');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    saveSupabaseConfig({
      url: apiUrl.trim(),
      anonKey: anonKey.trim(),
    });

    setSaveToast('Konfigurasi Supabase berhasil disimpan!');
    setTimeout(() => setSaveToast(null), 4000);
    checkConnection();
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Kembalikan kredensial Supabase ke pengaturan default resmi yang telah disediakan?'
      )
    ) {
      resetSupabaseConfig();
      setApiUrl(DEFAULT_SUPABASE_URL);
      setAnonKey(DEFAULT_SUPABASE_ANON_KEY);
      setSaveToast('Kredensial dikembalikan ke konfigurasi default!');
      setTimeout(() => setSaveToast(null), 3000);
      setTimeout(() => checkConnection(), 100);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(anonKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Extract project ref for direct Supabase Dashboard link
  const getProjectRef = () => {
    try {
      const clean = apiUrl.replace(/^https?:\/\//, '').split('.')[0];
      return clean || 'blhbmcgipmzxnewcfcia';
    } catch {
      return 'blhbmcgipmzxnewcfcia';
    }
  };

  const projectRef = getProjectRef();
  const supabaseSqlUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  // Sync all local data to Supabase
  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setSyncProgress('Memulai sinkronisasi data ke Supabase...');

    try {
      const result = await syncEntireDatabaseToCloud({
        schoolSettings,
        students,
        teachers,
        subjects,
        attendanceStore,
        teacherAgendaStore,
        onProgress: (step) => setSyncProgress(step),
      });

      if (result.success) {
        setSyncMessage({
          type: 'success',
          text: result.message,
        });
        inspectTables();
      } else {
        setSyncMessage({
          type: 'error',
          text: result.message,
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan tidak terduga saat sinkronisasi data.',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  };

  const allTablesReady =
    tableResults.length > 0 && tableResults.every((t) => t.exists);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold text-emerald-300">
              <Database className="w-3.5 h-3.5" />
              <span>Migrasi Database Supabase (PostgreSQL Cloud)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pengaturan Koneksi Supabase &amp; SQL Editor
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Seluruh sistem database aplikasi telah dialihkan secara menyeluruh dari Firebase ke Supabase.
              Kelola API URL, Anon Public Key, dan jalankan skrip struktur tabel di SQL Editor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkConnection}
              disabled={isCheckingConnection}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Periksa status koneksi ke server Supabase"
            >
              <RefreshCw
                className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin text-emerald-400' : ''}`}
              />
              <span>Uji Koneksi</span>
            </button>

            <a
              href={supabaseSqlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
              title="Buka Supabase Dashboard SQL Editor"
            >
              <span>Buka Console Supabase</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Live Status Pill Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/20 rounded-lg p-2.5 flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus?.connected
                  ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse'
                  : 'bg-rose-400 ring-4 ring-rose-500/20'
              }`}
            />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Status Server
              </div>
              <div className="font-bold text-white">
                {isCheckingConnection
                  ? 'Memeriksa...'
                  : connectionStatus?.connected
                  ? 'Terhubung (Online)'
                  : 'Terputus / Galat'}
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-2.5 flex items-center gap-2.5">
            <Server className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Project Ref
              </div>
              <div className="font-mono font-bold text-emerald-300 truncate max-w-[140px]">
                {connectionStatus?.projectId || projectRef}
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-2.5 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Anon Key Kredensial
              </div>
              <div className="font-bold text-white">
                {connectionStatus?.anonKeyValid ? 'Valid (Terotorisasi)' : 'Belum Diverifikasi'}
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-2.5 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Kesiapan 8 Tabel Supabase
              </div>
              <div className="font-bold text-white">
                {allTablesReady
                  ? '8/8 Tabel Siap (Lengkap)'
                  : `${tableResults.filter((t) => t.exists).length}/8 Tabel Ditemukan`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Kiri = Form Setting API URL & Anon Key, Kanan = Status Tabel & Sinkronisasi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom 1 (lg:col-span-7): Form Pengaturan API URL & Anon Public Key */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    1. Setting API URL &amp; 2. Anon Public Key
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kredensial akses database Supabase untuk autentikasi dan kueri real-time
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                title="Reset ke kredensial Supabase awal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Default</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Field 1: API URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    1. Supabase API URL <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Tersalin' : 'Salin URL'}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://blhbmcgipmzxnewcfcia.supabase.co"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  URL REST API instance Supabase Anda (berakhiran <code className="text-emerald-700">.supabase.co</code>).
                </p>
              </div>

              {/* Field 2: Anon Public Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    2. Supabase Anon Public Key (JWT) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showAnonKey ? 'Sembunyikan' : 'Tampilkan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Tersalin' : 'Salin Key'}</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute top-3 left-3 text-slate-400 pointer-events-none">
                    <Key className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={3}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                    style={{ WebkitTextSecurity: showAnonKey ? 'none' : 'disc' }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50 resize-none break-all"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Kunci anon publik aman digunakan di frontend dengan Row Level Security (RLS) terpasang.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Kredensial disimpan otomatis di browser dan aktif seketika.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkConnection}
                    disabled={isCheckingConnection}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                    <span>Tes Koneksi</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan &amp; Terapkan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Panduan Cepat Eksekusi SQL */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 text-amber-900">
            <h4 className="font-bold text-sm flex items-center gap-2 text-amber-900 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Petunjuk Menghubungkan &amp; Mengaktifkan Tabel Supabase:</span>
            </h4>
            <ol className="text-xs space-y-1.5 list-decimal list-inside text-amber-800 leading-relaxed">
              <li>
                Buka tab <strong>SQL Editor</strong> di bawah atau klik tombol{' '}
                <a
                  href={supabaseSqlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-amber-950 hover:text-black inline-flex items-center gap-0.5"
                >
                  Buka Console Supabase <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                Klik tombol <strong>"Salin Seluruh Skrip SQL DDL"</strong> di bawah.
              </li>
              <li>
                Tempelkan (Paste) skrip ke SQL Editor di Supabase lalu klik tombol <strong>Run</strong> (Ctrl+Enter).
              </li>
              <li>
                Setelah tabel selesai dibuat, kembali ke sini lalu klik tombol{' '}
                <strong>"Sinkronkan Seluruh Data Lokal ke Supabase Cloud"</strong> di sebelah kanan.
              </li>
            </ol>
          </div>
        </div>

        {/* Kolom 2 (lg:col-span-5): Status 8 Tabel Supabase & Tombol Sinkronisasi Data */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Tabel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Status 8 Tabel Database Supabase
                </h3>
              </div>
              <button
                type="button"
                onClick={inspectTables}
                disabled={isCheckingTables}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
                title="Muat ulang status tabel"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingTables ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {tableResults.length === 0 && !isCheckingTables ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                  <p>Sedang memeriksa tabel Supabase...</p>
                </div>
              ) : (
                tableResults.map((item) => (
                  <div
                    key={item.table}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono font-bold text-slate-800 truncate">
                        public.{item.table}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{item.label}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.exists ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.rowCount !== null ? `${item.rowCount} baris` : 'Siap'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Belum dibuat</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sync Database Button */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="mb-3">
                <h4 className="font-bold text-xs text-slate-800">
                  Sinkronisasi Data Lokal ke Supabase
                </h4>
                <p className="text-[11px] text-slate-500">
                  Unggah seluruh siswa ({students.length}), guru ({teachers.length}), mapel ({subjects.length}), absensi, &amp; agenda guru.
                </p>
              </div>

              {syncProgress && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>{syncProgress}</span>
                </div>
              )}

              {syncMessage && (
                <div
                  className={`mb-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    syncMessage.type === 'success'
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                      : 'bg-rose-100 border border-rose-300 text-rose-900'
                  }`}
                >
                  {syncMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                  )}
                  <span>{syncMessage.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce text-emerald-400' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Seluruh Data Lokal ke Supabase'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 3: Row Level Security (RLS) & SQL Editor Connection Supabase */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                3. Row Level Security (RLS) &amp; SQL Editor Supabase
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi Policy RLS (SELECT, INSERT, UPDATE, DELETE) untuk role <code className="font-mono text-emerald-700 font-bold">anon</code> &amp; <code className="font-mono text-emerald-700 font-bold">authenticated</code> pada seluruh 8 tabel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switcher Tab Skrip */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveSqlTab('rls');
                  setSqlContent(SUPABASE_RLS_SQL);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSqlTab === 'rls'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Skrip Khusus RLS Policy</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSqlTab('schema');
                  setSqlContent(SUPABASE_SCHEMA_SQL);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSqlTab === 'schema'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Skrip Lengkap (8 Tabel + RLS)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              {copiedSql ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              <span>
                {copiedSql
                  ? 'Tersalin ke Clipboard!'
                  : activeSqlTab === 'rls'
                  ? 'Salin Skrip RLS Policy'
                  : 'Salin Seluruh Skrip SQL'}
              </span>
            </button>

            <a
              href={supabaseSqlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Jalankan di Supabase</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Ringkasan Policy RLS untuk 8 Tabel */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Konfigurasi Row Level Security (RLS) Aktif untuk 8 Tabel:</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Mengaktifkan <code className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">ENABLE ROW LEVEL SECURITY</code>, memberikan hak akses <code className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">GRANT ALL ON ALL TABLES TO anon, authenticated</code>, serta membuat policy <code className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">FOR ALL TO public USING (true) WITH CHECK (true)</code> agar aplikasi dapat membaca &amp; menyimpan data tanpa terblokir error RLS (<code className="font-mono">42501</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_RLS_SQL);
              setCopiedRlsQuick(true);
              setTimeout(() => setCopiedRlsQuick(false), 2500);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
          >
            {copiedRlsQuick ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-emerald-700" />}
            <span>{copiedRlsQuick ? 'RLS Tersalin!' : 'Salin Cepat RLS'}</span>
          </button>
        </div>

        {/* Code Editor Container */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] text-slate-200 shadow-inner">
          <div className="bg-[#161b22] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 text-slate-300 font-semibold">
                {activeSqlTab === 'rls' ? 'supabase_rls_policies.sql' : 'schema_supabase.sql'}
              </span>
              <span className="text-[10px] text-slate-500">(PostgreSQL RLS &amp; Grants)</span>
            </div>
            <span className="text-[11px] text-slate-500">
              8 Tabel: settings, students, teachers, subjects, attendance, teacher_agenda, homeroom_reports, whatsapp_logs
            </span>
          </div>

          <div className="relative">
            <textarea
              value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full bg-[#0d1117] text-emerald-300 font-mono text-xs sm:text-sm p-4 leading-relaxed focus:outline-none focus:ring-0 border-none resize-y selection:bg-emerald-900 selection:text-white"
            />
          </div>

          <div className="bg-[#161b22] px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dapat diedit langsung atau disalin untuk dieksekusi di Supabase SQL Console.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSqlContent(activeSqlTab === 'rls' ? SUPABASE_RLS_SQL : SUPABASE_SCHEMA_SQL)
                }
                className="text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Reset Skrip Asli
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
