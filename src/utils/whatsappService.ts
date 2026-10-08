import { SchoolSettings, Student, AttendanceStatus, WhatsAppTransmissionLog } from '../types';
import {
  saveWhatsAppLogToCloud,
  saveAllWhatsAppLogsToCloud,
  deleteWhatsAppLogFromCloud,
  clearAllWhatsAppLogsFromCloud,
} from '../lib/supabase';
import { MONTH_NAMES } from '../data/initialData';

export interface DayAttendanceSummary {
  hCount: number;
  sCount: number;
  iCount: number;
  aCount: number;
  emptyCount: number;
  total: number;
  isComplete: boolean;
  absentList: Array<{ name: string; gender: string; status: string }>;
}

export const DEFAULT_GROUP_WHATSAPP_TEMPLATE = `📢 *LAPORAN KEHADIRAN SISWA*
🏫 *{nama_sekolah}*
📚 *Kelas:* {kelas} | *Wali Kelas:* {wali_kelas}
📅 *Hari/Tanggal:* {hari_tanggal}

{salam_pembuka}
📊 *REKAPITULASI HARI INI:*
👥 Total Siswa: {total_siswa} anak
✅ Hadir: {hadir_count} siswa ({persentase_hadir}%)
🔵 Sakit: {sakit_count} siswa
🟡 Izin: {izin_count} siswa
🔴 Alpa: {alpa_count} siswa
{belum_absen_baris}
─────────────────────────
📝 *RINCIAN KETERANGAN TIDAK HADIR:*
{daftar_tidak_hadir}

💬 *Catatan:*
{catatan_tambahan}`;

export const DEFAULT_PERSONAL_WHATSAPP_TEMPLATE = `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{nama_siswa}*,

Menginformasikan bahwa pada hari *{hari_tanggal}*, status kehadiran ananda di kelas *{kelas}* (*{nama_sekolah}*) adalah:
👉 Status: *{status_kehadiran}*

{keterangan_siswa}
Demikian informasi ini kami sampaikan untuk menjadi perhatian bersama. Atas kerja sama dan perhatian Bapak/Ibu, kami ucapkan terima kasih. 🙏

Wassalamu'alaikum Wr. Wb.
- *Wali Kelas {kelas}* ({wali_kelas})`;

export const GROUP_TEMPLATE_TAGS = [
  { tag: '{nama_sekolah}', label: 'Nama Sekolah', desc: 'Nama instansi sekolah' },
  { tag: '{kelas}', label: 'Kelas', desc: 'Nama kelas' },
  { tag: '{wali_kelas}', label: 'Wali Kelas', desc: 'Nama guru wali kelas' },
  { tag: '{hari_tanggal}', label: 'Hari/Tanggal', desc: 'Format: Senin, 15 September 2026' },
  { tag: '{salam_pembuka}', label: 'Salam Pembuka', desc: 'Ucapan salam pembuka khusus' },
  { tag: '{total_siswa}', label: 'Total Siswa', desc: 'Jumlah total siswa terdaftar' },
  { tag: '{hadir_count}', label: 'Jml Hadir', desc: 'Jumlah siswa hadir' },
  { tag: '{persentase_hadir}', label: '% Hadir', desc: 'Persentase kehadiran' },
  { tag: '{sakit_count}', label: 'Jml Sakit', desc: 'Jumlah siswa sakit' },
  { tag: '{izin_count}', label: 'Jml Izin', desc: 'Jumlah siswa izin' },
  { tag: '{alpa_count}', label: 'Jml Alpa', desc: 'Jumlah siswa alpa' },
  { tag: '{belum_absen_baris}', label: 'Baris Belum Absen', desc: 'Keterangan jika ada siswa belum diabsen' },
  { tag: '{daftar_tidak_hadir}', label: 'Daftar Tidak Hadir', desc: 'Rincian nama & keterangan siswa tidak hadir' },
  { tag: '{catatan_tambahan}', label: 'Catatan Tambahan', desc: 'Pesan penutup untuk wali murid' },
];

export const PERSONAL_TEMPLATE_TAGS = [
  { tag: '{nama_siswa}', label: 'Nama Siswa', desc: 'Nama lengkap siswa' },
  { tag: '{gender}', label: 'Gender', desc: 'L / P' },
  { tag: '{status_kehadiran}', label: 'Status Kehadiran', desc: 'Hadir / Sakit / Izin / Alpa' },
  { tag: '{keterangan_siswa}', label: 'Catatan Siswa', desc: 'Catatan khusus siswa jika ada' },
  { tag: '{hari_tanggal}', label: 'Hari/Tanggal', desc: 'Format: Senin, 15 September 2026' },
  { tag: '{kelas}', label: 'Kelas', desc: 'Nama kelas' },
  { tag: '{nama_sekolah}', label: 'Nama Sekolah', desc: 'Nama instansi sekolah' },
  { tag: '{wali_kelas}', label: 'Wali Kelas', desc: 'Nama guru wali kelas' },
  { tag: '{no_wa_ortu}', label: 'No. WA Ortu', desc: 'Nomor WhatsApp orang tua' },
];

/**
 * Checks if every registered student has their attendance filled for the given day.
 */
export function getDayAttendanceSummary(
  students: Student[],
  attendanceData: Record<string, Record<number, AttendanceStatus>>,
  day: number
): DayAttendanceSummary {
  let hCount = 0;
  let sCount = 0;
  let iCount = 0;
  let aCount = 0;
  let emptyCount = 0;
  const absentList: Array<{ name: string; gender: string; status: string }> = [];

  students.forEach((s) => {
    const studentDays = attendanceData[s.id];
    const st = studentDays ? studentDays[day] : '-';

    if (st === 'H') {
      hCount++;
    } else if (st === 'S') {
      sCount++;
      absentList.push({ name: s.name, gender: s.gender, status: 'Sakit (S)' });
    } else if (st === 'I') {
      iCount++;
      absentList.push({ name: s.name, gender: s.gender, status: 'Izin (I)' });
    } else if (st === 'A') {
      aCount++;
      absentList.push({ name: s.name, gender: s.gender, status: 'Alpa (A)' });
    } else {
      emptyCount++;
    }
  });

  const total = students.length;
  const isComplete = total > 0 && emptyCount === 0;

  return {
    hCount,
    sCount,
    iCount,
    aCount,
    emptyCount,
    total,
    isComplete,
    absentList,
  };
}

/**
 * Replace placeholders inside template text
 */
export function renderDynamicWhatsAppMessage(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = String(template || '');
  for (const [key, val] of Object.entries(variables || {})) {
    const safeKey = String(key || '');
    const regex = new RegExp(safeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, String(val ?? ''));
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Generates formatted WhatsApp message for Group WhatsApp using dynamic template
 */
export function generateAutoWhatsAppMessage(
  settings: SchoolSettings,
  students: Student[],
  attendanceData: Record<string, Record<number, AttendanceStatus>>,
  day: number,
  monthIndex: number,
  year: number
): string {
  const summary = getDayAttendanceSummary(students, attendanceData, day);
  const monthName = MONTH_NAMES[monthIndex] || 'Bulan';
  const schoolName = settings.schoolName || 'SMKS Nusantara 1 Ciputat';
  const className = settings.className || 'X TJKT 3';
  const teacherName = settings.homeroomTeacher || settings.teacherName || 'Wali Kelas';

  // Format hari dan tanggal
  const dObj = new Date(year, monthIndex, day);
  const dayNameList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNameList[dObj.getDay()] || 'Hari';
  const dateFormatted = `${dayName}, ${day} ${monthName} ${year}`;

  const pct = summary.total > 0 ? Math.round((summary.hCount / summary.total) * 100) : 0;

  let absentFormatted = '';
  if (summary.absentList.length === 0) {
    absentFormatted = `✨ *Alhamdulillah, Seluruh Siswa Hadir Lengkap (100%).* 🎉`;
  } else {
    absentFormatted = summary.absentList
      .map((item, idx) => `${idx + 1}. *${item.name}* (${item.gender}) - *${item.status}*`)
      .join('\n');
  }

  const belumAbsenBaris =
    summary.emptyCount > 0 ? `⚪ Belum Diabsen: ${summary.emptyCount} siswa` : '';

  const greeting = settings.autoSendWhatsAppCustomGreeting
    ? `${settings.autoSendWhatsAppCustomGreeting.trim()}\n`
    : '';

  const defaultNote =
    'Demikian laporan kehadiran siswa hari ini. Mohon perhatian dan kerja samanya dari Bapak/Ibu Orang Tua/Wali Murid. Terima kasih. 🙏';

  const variables: Record<string, string | number> = {
    '{nama_sekolah}': schoolName,
    '{kelas}': className,
    '{wali_kelas}': teacherName,
    '{hari_tanggal}': dateFormatted,
    '{salam_pembuka}': greeting,
    '{total_siswa}': summary.total,
    '{hadir_count}': summary.hCount,
    '{persentase_hadir}': pct,
    '{sakit_count}': summary.sCount,
    '{izin_count}': summary.iCount,
    '{alpa_count}': summary.aCount,
    '{belum_absen_count}': summary.emptyCount,
    '{belum_absen_baris}': belumAbsenBaris,
    '{daftar_tidak_hadir}': absentFormatted,
    '{catatan_tambahan}': defaultNote,
  };

  const activeTemplate = settings.whatsappGroupMessageTemplate?.trim()
    ? settings.whatsappGroupMessageTemplate
    : DEFAULT_GROUP_WHATSAPP_TEMPLATE;

  return renderDynamicWhatsAppMessage(activeTemplate, variables);
}

/**
 * Generates formatted WhatsApp message for a single student personal notification
 */
export function generatePersonalWhatsAppMessage(
  settings: SchoolSettings,
  student: Student,
  attendanceStatus: AttendanceStatus,
  day: number,
  monthIndex: number,
  year: number
): string {
  const monthName = MONTH_NAMES[monthIndex] || 'Bulan';
  const schoolName = settings.schoolName || 'SMKS Nusantara 1 Ciputat';
  const className = settings.className || 'X TJKT 3';
  const teacherName = settings.homeroomTeacher || settings.teacherName || 'Wali Kelas';

  const dObj = new Date(year, monthIndex, day);
  const dayNameList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNameList[dObj.getDay()] || 'Hari';
  const dateFormatted = `${dayName}, ${day} ${monthName} ${year}`;

  let statusText = 'Hadir (H) ✅';
  if (attendanceStatus === 'S') statusText = 'Sakit (S) 🔵';
  else if (attendanceStatus === 'I') statusText = 'Izin (I) 🟡';
  else if (attendanceStatus === 'A') statusText = 'Alpa / Tanpa Keterangan (A) 🔴';
  else if (attendanceStatus === '-') statusText = 'Belum Diisi / Nihil ⚪';

  const noteText = student.note ? `📌 *Catatan Guru:* ${student.note}\n` : '';

  const variables: Record<string, string | number> = {
    '{nama_siswa}': student.name,
    '{gender}': student.gender || 'L',
    '{status_kehadiran}': statusText,
    '{keterangan_siswa}': noteText,
    '{hari_tanggal}': dateFormatted,
    '{kelas}': className,
    '{nama_sekolah}': schoolName,
    '{wali_kelas}': teacherName,
    '{no_wa_ortu}': student.parentWhatsapp || '-',
  };

  const activeTemplate = settings.whatsappPersonalMessageTemplate?.trim()
    ? settings.whatsappPersonalMessageTemplate
    : DEFAULT_PERSONAL_WHATSAPP_TEMPLATE;

  return renderDynamicWhatsAppMessage(activeTemplate, variables);
}

/* =========================================================================
   TRANSMISSION AUDIT LOG MANAGEMENT
   ========================================================================= */

export const TRANSMISSION_LOG_KEY = 'whatsapp_transmissions_audit_v1';
const LEGACY_LOG_KEY = 'sditqu_whatsapp_tx_logs';

/**
 * Extracts a reliable epoch millisecond number from a WhatsAppTransmissionLog
 */
export function getLogTimestampMs(log: WhatsAppTransmissionLog): number {
  if (log.createdAt) {
    const t = new Date(log.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const match = log.id?.match(/watx_(\d+)/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const parsed = Date.parse(log.timestamp);
  if (!isNaN(parsed)) return parsed;
  return 0;
}

export function getWhatsAppTransmissionLogs(): WhatsAppTransmissionLog[] {
  try {
    const raw = localStorage.getItem(TRANSMISSION_LOG_KEY);
    let parsed: WhatsAppTransmissionLog[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) parsed = [];

    // Check and migrate legacy key if present
    const legacyRaw = localStorage.getItem(LEGACY_LOG_KEY);
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          const existingIds = new Set(parsed.map((l) => l.id));
          legacyParsed.forEach((item) => {
            if (item && item.id && !existingIds.has(item.id)) {
              parsed.push(item);
              existingIds.add(item.id);
            }
          });
          localStorage.removeItem(LEGACY_LOG_KEY);
          localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore legacy parse errors
      }
    }

    // Ensure sorted newest first
    parsed.sort((a, b) => getLogTimestampMs(b) - getLogTimestampMs(a));
    return parsed;
  } catch (err) {
    console.error('Failed to parse WhatsApp transmission logs:', err);
    return [];
  }
}

export function saveWhatsAppTransmissionLog(
  entry: Omit<WhatsAppTransmissionLog, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
    createdAt?: string;
  }
): WhatsAppTransmissionLog {
  const currentLogs = getWhatsAppTransmissionLogs();
  const now = new Date();

  const formattedTimestamp =
    entry.timestamp ||
    now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const newLog: WhatsAppTransmissionLog = {
    id: entry.id || `watx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formattedTimestamp,
    createdAt: entry.createdAt || now.toISOString(),
    target: entry.target,
    targetName: entry.targetName || entry.target,
    targetType: entry.targetType,
    message: entry.message,
    status: entry.status,
    responseMessage: entry.responseMessage,
    errorDetails: entry.errorDetails,
    sentBy: entry.sentBy || 'Otomatis',
    totalRecipients: entry.totalRecipients || 1,
    meta: entry.meta,
  };

  // Keep up to 500 latest entries sorted newest first
  const existingFiltered = currentLogs.filter((l) => l.id !== newLog.id);
  const updatedLogs = [newLog, ...existingFiltered]
    .sort((a, b) => getLogTimestampMs(b) - getLogTimestampMs(a))
    .slice(0, 500);

  try {
    localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(updatedLogs));
    // Persist to Cloud Supabase
    saveWhatsAppLogToCloud(newLog).catch((err) =>
      console.warn('Could not save WhatsApp log to Supabase cloud:', err)
    );
    // Dispatch custom event for real-time reactivity across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('whatsapp_transmission_logged', { detail: newLog }));
    }
  } catch (err) {
    console.error('Failed to save WhatsApp transmission log:', err);
  }

  return newLog;
}

/**
 * Saves a transmission log and guarantees cloud persistence (awaitable)
 */
export async function saveWhatsAppTransmissionLogAsync(
  entry: Omit<WhatsAppTransmissionLog, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
    createdAt?: string;
  }
): Promise<{ log: WhatsAppTransmissionLog; cloudSaved: boolean }> {
  const log = saveWhatsAppTransmissionLog(entry);
  const cloudSaved = await saveWhatsAppLogToCloud(log);
  return { log, cloudSaved };
}

/**
 * Persists all local WhatsApp transmission logs to the Cloud Supabase database
 */
export async function syncAllWhatsAppLogsToCloudDatabase(): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  const currentLogs = getWhatsAppTransmissionLogs();
  if (currentLogs.length === 0) {
    return {
      success: true,
      count: 0,
      message: 'Belum ada riwayat transmisi pesan WhatsApp untuk disimpan.',
    };
  }
  const ok = await saveAllWhatsAppLogsToCloud(currentLogs);
  if (ok) {
    return {
      success: true,
      count: currentLogs.length,
      message: `Berhasil menyimpan ${currentLogs.length} riwayat transmisi pesan WhatsApp ke database Cloud Supabase!`,
    };
  } else {
    return {
      success: false,
      count: 0,
      message: 'Gagal menyimpan riwayat transmisi ke database Cloud Supabase. Periksa koneksi internet Anda.',
    };
  }
}

export function deleteWhatsAppTransmissionLog(id: string): void {
  const currentLogs = getWhatsAppTransmissionLogs();
  const filtered = currentLogs.filter((log) => log.id !== id);
  localStorage.setItem(TRANSMISSION_LOG_KEY, JSON.stringify(filtered));
  deleteWhatsAppLogFromCloud(id).catch((err) =>
    console.warn('Could not delete WhatsApp log from Supabase cloud:', err)
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatsapp_transmission_logged'));
  }
}

export function clearWhatsAppTransmissionLogs(): void {
  localStorage.removeItem(TRANSMISSION_LOG_KEY);
  clearAllWhatsAppLogsFromCloud().catch((err) =>
    console.warn('Could not clear WhatsApp logs from Supabase cloud:', err)
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatsapp_transmission_logged'));
  }
}

export function exportWhatsAppTransmissionLogsCsv(logs: WhatsAppTransmissionLog[]): void {
  if (!logs || logs.length === 0) return;

  const headers = [
    'ID Transmisi',
    'Waktu Pengiriman',
    'Nama Tujuan',
    'Nomor / ID Target',
    'Tipe',
    'Status',
    'Pemicu / Pengirim',
    'Respon API Gateway',
    'Isi Pesan',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map((log) => [
    escapeCsv(log.id),
    escapeCsv(log.timestamp),
    escapeCsv(log.targetName),
    escapeCsv(log.target),
    escapeCsv(log.targetType === 'group' ? 'Group WA' : 'Personal Ortu'),
    escapeCsv(log.status === 'success' ? 'BERHASIL' : 'GAGAL'),
    escapeCsv(log.sentBy),
    escapeCsv(log.responseMessage || '-'),
    escapeCsv(log.message),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Riwayat_Transmisi_WhatsApp_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sends a message directly to Fonnte API from the browser.
 * This is essential for static deployments like GitHub Pages where no Node/Express server exists.
 * Fonnte natively supports CORS and FormData requests with Authorization header.
 */
export async function sendDirectToFonnte(
  token: string,
  target: string,
  message: string,
  endpointUrl?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const url = endpointUrl?.trim() || 'https://api.fonnte.com/send';

  const formData = new FormData();
  formData.append('target', target.trim());
  formData.append('message', message);
  formData.append('countryCode', '62');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token.trim(),
    },
    body: formData,
    mode: 'cors',
  });

  const data = await res.json().catch(() => null);

  if (res.ok && (data?.status === true || (data && data.status !== false && !data.reason))) {
    const successMsg = data?.message || 'Pesan WhatsApp berhasil dikirim melalui Gateway Fonnte!';
    return {
      success: true,
      message: successMsg,
      data,
    };
  } else {
    let errorReason = data?.reason || data?.message;
    if (!errorReason) {
      if (res.status === 401) {
        errorReason = 'Otorisasi gagal: Token Fonnte tidak valid atau sudah kadaluarsa.';
      } else if (res.status === 404) {
        errorReason = 'Endpoint Fonnte tidak ditemukan (404).';
      } else {
        errorReason = 'Gagal mengirim pesan melalui Gateway Fonnte (periksa token dan nomor tujuan).';
      }
    }
    return {
      success: false,
      message: errorReason,
      data,
    };
  }
}

/**
 * Sends a message via the server backend proxy to Fonnte, and optionally auto-logs audit entry
 */
export async function sendWhatsAppViaGateway(params: {
  token: string;
  endpointUrl?: string;
  target: string;
  message: string;
  auditMeta?: {
    targetName?: string;
    targetType?: 'group' | 'personal';
    sentBy?: string;
    meta?: Record<string, any>;
  };
}): Promise<{ success: boolean; message: string; log?: WhatsAppTransmissionLog }> {
  const { token, endpointUrl, target, message, auditMeta } = params;

  if (!token?.trim()) {
    const errorRes = { success: false, message: 'API Token Fonnte belum diisi.' };
    if (auditMeta) {
      saveWhatsAppTransmissionLog({
        target: target || 'Tidak diketahui',
        targetName: auditMeta.targetName || target || 'Target Belum Dipilih',
        targetType: auditMeta.targetType || 'group',
        message: message || '',
        status: 'failed',
        responseMessage: errorRes.message,
        sentBy: auditMeta.sentBy || 'Manual',
        meta: auditMeta.meta,
      });
    }
    return errorRes;
  }

  if (!target?.trim()) {
    const errorRes = { success: false, message: 'Target Nomor WhatsApp / ID Group belum ditentukan.' };
    if (auditMeta) {
      saveWhatsAppTransmissionLog({
        target: 'Tidak ditentukan',
        targetName: auditMeta.targetName || 'Belum Ada Target',
        targetType: auditMeta.targetType || 'group',
        message: message || '',
        status: 'failed',
        responseMessage: errorRes.message,
        sentBy: auditMeta.sentBy || 'Manual',
        meta: auditMeta.meta,
      });
    }
    return errorRes;
  }

  if (!message?.trim()) {
    const errorRes = { success: false, message: 'Isi pesan tidak boleh kosong.' };
    return errorRes;
  }

  // Detect if running in a static deployment (such as GitHub Pages) where Express backend doesn't exist
  const isStaticDeploy =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('gitlab.io') ||
      window.location.hostname.includes('pages.dev') ||
      window.location.hostname.includes('netlify.app') ||
      window.location.hostname.includes('vercel.app') ||
      window.location.protocol === 'file:' ||
      window.location.origin.includes('github.io'));

  // 1. If running on GitHub Pages / static host, send directly to Fonnte API via browser CORS
  if (isStaticDeploy) {
    try {
      const directResult = await sendDirectToFonnte(token, target, message, endpointUrl);
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: directResult.success ? 'success' : 'failed',
          responseMessage: directResult.message,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: directResult.success,
        message: directResult.message,
        log: logged,
      };
    } catch (directErr: any) {
      const errorMsg = directErr?.message || 'Gagal menghubungi Gateway Fonnte secara langsung.';
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: 'failed',
          responseMessage: errorMsg,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: false,
        message: errorMsg,
        log: logged,
      };
    }
  }

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.trim(),
        endpointUrl: endpointUrl || 'https://api.fonnte.com/send',
        target: target.trim(),
        message: message,
      }),
    });

    // If proxy is not available (404 on static hosting or serverless), fallback to direct call
    if (res.status === 404) {
      console.warn('Backend proxy /api/whatsapp/send not found (404), falling back to direct Fonnte API call...');
      const directResult = await sendDirectToFonnte(token, target, message, endpointUrl);
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: directResult.success ? 'success' : 'failed',
          responseMessage: directResult.message,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: directResult.success,
        message: directResult.message,
        log: logged,
      };
    }

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success) {
      const successMsg = data.message || 'Pesan berhasil dikirim via Gateway WhatsApp!';
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: 'success',
          responseMessage: successMsg,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: true,
        message: successMsg,
        log: logged,
      };
    } else {
      // If server proxy returned error, attempt direct Fonnte as fallback before failing
      console.warn('Backend proxy returned error, trying direct Fonnte fallback...', data);
      try {
        const directResult = await sendDirectToFonnte(token, target, message, endpointUrl);
        if (directResult.success) {
          let logged: WhatsAppTransmissionLog | undefined;
          if (auditMeta) {
            logged = saveWhatsAppTransmissionLog({
              target: target.trim(),
              targetName: auditMeta.targetName || target.trim(),
              targetType: auditMeta.targetType || 'group',
              message: message,
              status: 'success',
              responseMessage: directResult.message,
              sentBy: auditMeta.sentBy || 'Manual',
              meta: auditMeta.meta,
            });
          }
          return {
            success: true,
            message: directResult.message,
            log: logged,
          };
        }
      } catch {
        // Ignore fallback error and continue to report proxy response error
      }

      const errorMsg = data?.message || 'Gagal mengirim pesan melalui Gateway Fonnte.';
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: 'failed',
          responseMessage: errorMsg,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: false,
        message: errorMsg,
        log: logged,
      };
    }
  } catch (err: any) {
    // Network error connecting to proxy, fall back to direct Fonnte call
    console.warn('Network error calling /api/whatsapp/send, falling back to direct Fonnte API call:', err);
    try {
      const directResult = await sendDirectToFonnte(token, target, message, endpointUrl);
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: directResult.success ? 'success' : 'failed',
          responseMessage: directResult.message,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: directResult.success,
        message: directResult.message,
        log: logged,
      };
    } catch (directErr: any) {
      const errorMsg = directErr?.message || err?.message || 'Terjadi gangguan jaringan saat menghubungi Gateway.';
      let logged: WhatsAppTransmissionLog | undefined;
      if (auditMeta) {
        logged = saveWhatsAppTransmissionLog({
          target: target.trim(),
          targetName: auditMeta.targetName || target.trim(),
          targetType: auditMeta.targetType || 'group',
          message: message,
          status: 'failed',
          responseMessage: errorMsg,
          sentBy: auditMeta.sentBy || 'Manual',
          meta: auditMeta.meta,
        });
      }
      return {
        success: false,
        message: errorMsg,
        log: logged,
      };
    }
  }
}
