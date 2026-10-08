import React, { useState, useEffect, useMemo } from 'react';
import { SchoolSettings, WhatsAppTransmissionLog } from '../../types';
import {
  getWhatsAppTransmissionLogs,
  saveWhatsAppTransmissionLog,
  deleteWhatsAppTransmissionLog,
  clearWhatsAppTransmissionLogs,
  exportWhatsAppTransmissionLogsCsv,
  sendWhatsAppViaGateway,
  TRANSMISSION_LOG_KEY,
  getLogTimestampMs,
} from '../../utils/whatsappService';
import {
  subscribeWhatsAppLogs,
  saveAllWhatsAppLogsToCloud,
} from '../../lib/supabase';
import { WhatsAppTransmissionDetailModal } from './WhatsAppTransmissionDetailModal';
import {
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Send,
  Eye,
  Copy,
  CheckCheck,
  Users,
  User,
  Radio,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Cloud,
  Database,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppTransmissionHistoryProps {
  schoolSettings: SchoolSettings;
}

type DateRangeFilter = 'all' | 'today' | 'week' | 'month';

export const WhatsAppTransmissionHistory: React.FC<WhatsAppTransmissionHistoryProps> = ({
  schoolSettings,
}) => {
  const [logs, setLogs] = useState<WhatsAppTransmissionLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'group' | 'personal'>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [selectedLog, setSelectedLog] = useState<WhatsAppTransmissionLog | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  const loadLogs = () => {
    const local = getWhatsAppTransmissionLogs();
    setLogs(local);
  };

  useEffect(() => {
    // 1. Initial load from local
    const initialLogs = getWhatsAppTransmissionLogs();
    setLogs(initialLogs);

    // 2. Subscribe to Cloud Supabase realtime listener
    const unsubscribeCloud = subscribeWhatsAppLogs((cloudLogs) => {
      setIsCloudConnected(true);
      if (cloudLogs && cloudLogs.length > 0) {
        // Merge and sort newest first
        setLogs(cloudLogs);
        try {
          localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(cloudLogs));
        } catch {
          // ignore quota issues
        }
      } else {
        // If Supabase is empty but local has logs, push initial local logs to cloud
        if (initialLogs.length > 0) {
          saveAllWhatsAppLogsToCloud(initialLogs).catch(() => {});
        }
      }
    }, initialLogs);

    // 3. Listen for local window events
    const handleLogUpdate = () => {
      loadLogs();
    };
    window.addEventListener('whatsapp_transmission_logged', handleLogUpdate);

    return () => {
      unsubscribeCloud();
      window.removeEventListener('whatsapp_transmission_logged', handleLogUpdate);
    };
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return logs.filter((item) => {
      // 1. Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // 2. Type filter
      if (typeFilter !== 'all' && item.targetType !== typeFilter) {
        return false;
      }
      // 3. Date range filter
      if (dateFilter !== 'all') {
        const itemMs = getLogTimestampMs(item);
        if (itemMs > 0) {
          const diffMs = nowMs - itemMs;
          if (dateFilter === 'today' && diffMs > oneDayMs) return false;
          if (dateFilter === 'week' && diffMs > 7 * oneDayMs) return false;
          if (dateFilter === 'month' && diffMs > 30 * oneDayMs) return false;
        }
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTarget = item.target?.toLowerCase().includes(q);
        const matchName = item.targetName?.toLowerCase().includes(q);
        const matchMessage = item.message?.toLowerCase().includes(q);
        const matchTrigger = item.sentBy?.toLowerCase().includes(q);
        const matchResponse = item.responseMessage?.toLowerCase().includes(q);
        if (!matchTarget && !matchName && !matchMessage && !matchTrigger && !matchResponse) {
          return false;
        }
      }
      return true;
    });
  }, [logs, statusFilter, typeFilter, dateFilter, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const successCount = logs.filter((l) => l.status === 'success').length;
    const failedCount = logs.filter((l) => l.status === 'failed').length;
    const groupCount = logs.filter((l) => l.targetType === 'group').length;
    const personalCount = logs.filter((l) => l.targetType === 'personal').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    return { total, successCount, failedCount, groupCount, personalCount, successRate };
  }, [logs]);

  // Handle Manual Cloud Database Sync
  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true);
    setActionFeedback(null);
    try {
      const currentLogs = getWhatsAppTransmissionLogs();
      if (currentLogs.length === 0) {
        setActionFeedback('Belum ada riwayat transmisi WhatsApp untuk disimpan ke database.');
        setIsSyncingCloud(false);
        return;
      }
      const ok = await saveAllWhatsAppLogsToCloud(currentLogs);
      if (ok) {
        setActionFeedback(`✅ Berhasil menyimpan ${currentLogs.length} catatan riwayat transmisi WhatsApp ke database Cloud Supabase!`);
      } else {
        setActionFeedback('⚠️ Gagal menyimpan ke database Cloud Supabase. Periksa koneksi internet.');
      }
    } catch (err: any) {
      setActionFeedback(`⚠️ Terjadi kesalahan penyimpanan database: ${err?.message || 'Gagal'}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Handle Resend
  const handleResend = async (logToResend: WhatsAppTransmissionLog) => {
    if (!schoolSettings.whatsappApiToken) {
      setActionFeedback('⚠️ API Token belum diisi. Harap isi token Fonnte di tab Koneksi API.');
      return;
    }

    setIsResending(true);
    setActionFeedback(null);

    const res = await sendWhatsAppViaGateway({
      token: schoolSettings.whatsappApiToken,
      endpointUrl: schoolSettings.whatsappEndpointUrl,
      target: logToResend.target,
      message: logToResend.message,
      auditMeta: {
        targetName: logToResend.targetName,
        targetType: logToResend.targetType,
        sentBy: 'Kirim Ulang (Audit)',
        meta: logToResend.meta,
      },
    });

    setIsResending(false);
    loadLogs();

    if (res.success) {
      setActionFeedback(`✅ Berhasil mengirim ulang pesan ke ${logToResend.targetName}!`);
      if (selectedLog?.id === logToResend.id) {
        setSelectedLog(null);
      }
    } else {
      setActionFeedback(`⚠️ Gagal mengirim ulang: ${res.message}`);
    }

    setTimeout(() => setActionFeedback(null), 6000);
  };

  // Handle Copy Message
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  // Handle Delete Single Log
  const handleDeleteLog = (id: string) => {
    deleteWhatsAppTransmissionLog(id);
    loadLogs();
    if (selectedLog?.id === id) {
      setSelectedLog(null);
    }
    setActionFeedback('Catatan transmisi berhasil dihapus dari lokal & cloud.');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Handle Clear All Logs
  const handleClearAll = () => {
    clearWhatsAppTransmissionLogs();
    loadLogs();
    setShowClearConfirm(false);
    setActionFeedback('Riwayat transmisi berhasil dikosongkan dari penyimpanan lokal & Cloud Supabase.');
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Generate Sample Demo Logs if list is empty
  const handleGenerateSampleLogs = () => {
    const school = schoolSettings.schoolName || 'SMKS Nusantara 1 Ciputat';
    const cls = schoolSettings.className || 'X TJKT 3';
    const now = new Date();
    const todayStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const samples: Array<Omit<WhatsAppTransmissionLog, 'id' | 'timestamp'> & { createdAt?: string }> = [
      {
        target: '120363024892@g.us',
        targetName: `Grup Wali Murid Kelas ${cls}`,
        targetType: 'group',
        status: 'success',
        sentBy: 'Otomatis (Absensi Lengkap 100%)',
        responseMessage: '200 OK - Pesan berhasil dikirim ke antrean Gateway Fonnte',
        createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        message: `📢 *LAPORAN KEHADIRAN SISWA*\n🏫 *${school}*\n📚 *Kelas:* ${cls}\n📅 *Hari/Tanggal:* ${todayStr}\n\n📊 *REKAPITULASI HARI INI:*\n👥 Total Siswa: 32 anak\n✅ Hadir: 30 siswa (94%)\n🔵 Sakit: 1 siswa\n🟡 Izin: 1 siswa\n🔴 Alpa: 0 siswa\n─────────────────────────\n📝 *RINCIAN TIDAK HADIR:*\n1. *Ahmad Dani* (L) - *Sakit (S)*\n2. *Siti Nurhaliza* (P) - *Izin (I)*\n\n💬 Demikian laporan absensi harian ini disampaikan. Terima kasih. 🙏`,
      },
      {
        target: '6281234567890',
        targetName: 'Bpk. Hendra (Wali Ahmad Dani)',
        targetType: 'personal',
        status: 'success',
        sentBy: 'Manual (Notifikasi Wali Murid)',
        responseMessage: '200 OK - Pesan personal berhasil diteruskan ke server WhatsApp',
        createdAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        message: `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Orang Tua/Wali dari ananda *Ahmad Dani*,\n\nMenginformasikan bahwa pada hari *${todayStr}*, status kehadiran ananda di kelas *${cls}* (*${school}*) adalah:\n👉 Status: *Sakit (S) 🔵*\n\n📌 *Catatan Guru:* Surat keterangan dokter telah diterima oleh wali kelas.\n\nDemikian informasi ini kami sampaikan. Terima kasih. 🙏`,
      },
      {
        target: '6289876543210',
        targetName: 'Ibu Fatimah (Wali Budi Santoso)',
        targetType: 'personal',
        status: 'failed',
        sentBy: 'Uji Coba Kirim API',
        responseMessage: '400 Bad Request - Target nomor WhatsApp tidak terdaftar atau format salah',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
        message: `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu Orang Tua/Wali dari ananda *Budi Santoso*,\n\nStatus kehadiran: Hadir (H) ✅. Terima kasih.`,
      },
    ];

    samples.forEach((s) => saveWhatsAppTransmissionLog(s));
    loadLogs();
    setActionFeedback('3 contoh catatan riwayat transmisi berhasil dimuat dan disinkronkan!');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Alert / Feedback Notification */}
      {actionFeedback && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-2 cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Cloud Supabase Status & Quick Sync Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
            <Database className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">Database Riwayat Transmisi WhatsApp</span>
              <span className="inline-flex items-center gap-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Cloud Supabase Aktif
              </span>
            </div>
            <p className="text-xs text-teal-100/90 font-medium mt-0.5">
              Seluruh riwayat transmisi pesan WhatsApp disimpan ke database Supabase (tabel: <code className="bg-black/25 px-1 py-0.5 rounded text-emerald-200 font-mono text-[11px]">whatsapp_logs</code>) secara otomatis dan real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncingCloud}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm border border-emerald-400/40 transition-all cursor-pointer disabled:opacity-50"
            title="Simpan seluruh riwayat transmisi WhatsApp ke database Cloud Supabase"
          >
            <Database className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyimpan...' : 'Simpan ke Database'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Transmisi
            </span>
            <span className="text-xl font-black text-slate-800">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Berhasil Terkirim
            </span>
            <span className="text-xl font-black text-emerald-600">{stats.successCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gagal / Error
            </span>
            <span className="text-xl font-black text-rose-600">{stats.failedCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tingkat Sukses
            </span>
            <span className="text-xl font-black text-sky-700">{stats.successRate}%</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
        {/* Header & Export Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                Riwayat Transmisi Pesan WhatsApp
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Catatan audit otomatis seluruh pesan yang dikirim via API ke orang tua dan group WA
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={handleSyncToCloud}
              disabled={isSyncingCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Simpan seluruh catatan riwayat transmisi ke database Cloud Supabase"
            >
              <Database className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Menyimpan...' : 'Simpan ke Database'}</span>
            </button>

            <button
              type="button"
              onClick={loadLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => exportWhatsAppTransmissionLogsCsv(filteredLogs)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Unduh format spreadsheet CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ekspor CSV ({filteredLogs.length})</span>
              </button>
            )}

            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Kosongkan Semua Log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Riwayat</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama penerima, nomor WA, kata kunci pesan, atau pemicu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Waktu:</span>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('week')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'week'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('success')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sukses ({stats.successCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('failed')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gagal ({stats.failedCount})
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Tipe:</span>
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('group')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  typeFilter === 'group'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Group ({stats.groupCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('personal')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  typeFilter === 'personal'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Personal ({stats.personalCount})
              </button>
            </div>
          </div>
        </div>

        {/* Transmission Log Table */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-extrabold text-slate-700 text-sm">
                Belum Ada Catatan Transmisi
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Setiap pengiriman rekap otomatis maupun pesan ke orang tua akan dicatat
                secara otomatis di sini dan disinkronkan ke Cloud Supabase.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateSampleLogs}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muat Contoh Data Riwayat Transmisi</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-3.5 text-center w-24">Status</th>
                  <th className="py-3 px-3.5">Waktu Pengiriman</th>
                  <th className="py-3 px-3.5">Target / Penerima</th>
                  <th className="py-3 px-3.5">Tipe</th>
                  <th className="py-3 px-3.5">Pemicu</th>
                  <th className="py-3 px-3.5">Cuplikan Pesan</th>
                  <th className="py-3 px-3.5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-teal-50/40 transition-colors group"
                  >
                    {/* Status Badge */}
                    <td className="py-3 px-3.5 text-center">
                      {item.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>SUKSES</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>GAGAL</span>
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.timestamp}</span>
                      </div>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800 leading-tight">
                        {item.targetName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {item.target}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {item.targetType === 'group' ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          <Users className="w-3 h-3" />
                          <span>Group WA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                          <User className="w-3 h-3" />
                          <span>Personal</span>
                        </span>
                      )}
                    </td>

                    {/* Pemicu */}
                    <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        {item.sentBy || 'Otomatis'}
                      </span>
                    </td>

                    {/* Snippet */}
                    <td className="py-3 px-3.5 max-w-xs">
                      <p className="text-slate-600 truncate font-mono text-[11px]" title={item.message || ''}>
                        {(item.message || '').replace(/\n/g, ' ')}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Detail / Simulation Modal */}
                        <button
                          type="button"
                          onClick={() => setSelectedLog(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-[11px] transition-all cursor-pointer border border-teal-200"
                          title="Lihat Pratinjau Chat WhatsApp & Detail API"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                          <span>Lihat Chat</span>
                        </button>

                        {/* Copy message */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(item.id, item.message)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                          title="Salin Teks Pesan"
                        >
                          {copiedId === item.id ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Resend */}
                        <button
                          type="button"
                          onClick={() => handleResend(item)}
                          disabled={isResending}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                          title="Kirim Ulang Pesan via API"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete item */}
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Hapus Catatan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <WhatsAppTransmissionDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onResend={handleResend}
          isResending={isResending}
        />
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">Hapus Seluruh Riwayat?</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus seluruh {logs.length} catatan audit transmisi pesan WhatsApp?
              Semua data riwayat pengiriman akan dibersihkan dari penyimpanan lokal dan Cloud Supabase.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
