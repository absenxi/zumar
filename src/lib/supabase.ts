import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  SchoolSettings,
  Student,
  AttendanceStatus,
  HomeroomMonthlyReportData,
  TeacherAgendaEntry,
  Teacher,
  Subject,
  WhatsAppTransmissionLog,
} from '../types';

export const DEFAULT_SUPABASE_URL = 'https://jvrxlvozsycphcaeaalw.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cnhsdm96c3ljcGhjYWVhYWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDczMjYsImV4cCI6MjEwNjQyMzMyNn0.8X5oKVV_zZ0G0tgCfcZWh1gTT--1CpzfN4RGuP2dDNc';

const SUPABASE_CONFIG_STORAGE_KEY = 'smks_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Load config from localStorage or fallback to default
export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse Supabase config from storage:', e);
  }
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const sanitized: SupabaseConfig = {
    url: (config.url || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, ''),
    anonKey: (config.anonKey || DEFAULT_SUPABASE_ANON_KEY).trim(),
  };
  localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  resetSupabaseClientInstance();
  notifyConfigChanged();
}

export function resetSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
  resetSupabaseClientInstance();
  notifyConfigChanged();
}

// Event system for real-time config updates
type ConfigChangeListener = (config: SupabaseConfig) => void;
const configChangeListeners: Set<ConfigChangeListener> = new Set();

export function onSupabaseConfigChange(listener: ConfigChangeListener): () => void {
  configChangeListeners.add(listener);
  return () => configChangeListeners.delete(listener);
}

function notifyConfigChanged() {
  const cfg = getSupabaseConfig();
  configChangeListeners.forEach((fn) => {
    try {
      fn(cfg);
    } catch (e) {
      console.error('Error notifying config change listener:', e);
    }
  });
}

// Singleton client management
let supabaseClientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  if (!supabaseClientInstance || currentClientUrl !== url || currentClientKey !== anonKey) {
    currentClientUrl = url;
    currentClientKey = anonKey;
    supabaseClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClientInstance;
}

export function resetSupabaseClientInstance(): void {
  supabaseClientInstance = null;
  currentClientUrl = '';
  currentClientKey = '';
}

// Compatibility operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
}

export function handleSupabaseError(
  error: unknown,
  operationType: OperationType,
  table: string | null
) {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    table,
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
}

// Helper to strip undefined values so PostgREST JSONB never rejects objects
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Sanitize school settings
export function sanitizeSchoolSettings(s: SchoolSettings): SchoolSettings {
  const sanitized: SchoolSettings = {
    schoolName: (s.schoolName || '').trim() || 'SMKS NUSANTARA 1 CIPUTAT',
    foundationName: (s.foundationName || '').trim() || 'YAYASAN SMKS NUSANTARA 1 CIPUTAT',
    className: (s.className || '').trim() || 'X TJKT 3',
    academicYear: (s.academicYear || '').trim() || '2026/2027',
    locationName: (s.locationName || '').trim() || 'Ciputat',
    principalName: (s.principalName || '').trim() || 'Drs. H. M. Nursalam, M.M.',
    principalNip: (s.principalNip || '').trim() || '-',
    teacherName: (s.homeroomTeacher || s.teacherName || '').trim() || 'Wali Kelas X TJKT 3',
    teacherNip: (s.homeroomTeacherNip || s.teacherNip || '').trim() || '-',
    homeroomTeacher: (s.homeroomTeacher || s.teacherName || '').trim() || 'Wali Kelas X TJKT 3',
    homeroomTeacherNip: (s.homeroomTeacherNip || s.teacherNip || '').trim() || '-',
    studyProgram: (s.studyProgram || '').trim() || 'Teknik Jaringan Komputer dan Telekomunikasi',
    semester: (s.semester || '').trim() || 'GENAP',
    reportPlaceDate: (s.reportPlaceDate || '').trim() || 'Ciputat, 31 Januari 2026',
    headOfDepartment: (s.headOfDepartment || '').trim(),
    headOfDepartmentNip: (s.headOfDepartmentNip || '').trim() || '-',
    classLeader: (s.classLeader || '').trim(),
    signatureDate: (s.signatureDate || '').trim() || '13 Juli 2026',
    schoolLat: typeof s.schoolLat === 'number' && !isNaN(s.schoolLat) ? s.schoolLat : -6.3125,
    schoolLng: typeof s.schoolLng === 'number' && !isNaN(s.schoolLng) ? s.schoolLng : 106.7483,
    allowedRadiusMeters: typeof s.allowedRadiusMeters === 'number' && !isNaN(s.allowedRadiusMeters) ? s.allowedRadiusMeters : 200,
    attendancePassword: s.attendancePassword || '1234',
    adminPassword: s.adminPassword || 'admin',
    superAdminPassword: s.superAdminPassword || 'superadmin',
    requirePassword: s.requirePassword !== false,
    whatsappGatewayProvider: s.whatsappGatewayProvider || 'fonnte',
    whatsappApiToken: s.whatsappApiToken || '',
    whatsappEndpointUrl: s.whatsappEndpointUrl || 'https://api.fonnte.com/send',
    whatsappTestTarget: s.whatsappTestTarget || '',
    whatsappTestTargetType: s.whatsappTestTargetType || 'group',
    whatsappTargetList: Array.isArray(s.whatsappTargetList) ? s.whatsappTargetList : [],
    autoSendWhatsAppOnComplete: s.autoSendWhatsAppOnComplete === true,
    autoSendWhatsAppTargetId: (s.autoSendWhatsAppTargetId || '').trim(),
    autoSendWhatsAppTargetIds: Array.isArray(s.autoSendWhatsAppTargetIds)
      ? s.autoSendWhatsAppTargetIds.map(String).filter(Boolean)
      : (s.autoSendWhatsAppTargetId ? [(s.autoSendWhatsAppTargetId || '').trim()].filter(Boolean) : []),
    autoSendWhatsAppCustomGreeting: (s.autoSendWhatsAppCustomGreeting || '').trim(),
    lastAutoSentDate: (s.lastAutoSentDate || '').trim(),
    whatsappGroupMessageTemplate: typeof s.whatsappGroupMessageTemplate === 'string' ? s.whatsappGroupMessageTemplate : '',
    whatsappPersonalMessageTemplate: typeof s.whatsappPersonalMessageTemplate === 'string' ? s.whatsappPersonalMessageTemplate : '',
  };

  return stripUndefined(sanitized);
}

// -------------------------------------------------------------
// 1. Settings (Tabel settings)
// -------------------------------------------------------------
export function subscribeSchoolSettings(
  onUpdate: (settings: SchoolSettings) => void,
  initialFallback: SchoolSettings
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "settings" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase settings query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.data) {
        const merged = sanitizeSchoolSettings({
          ...initialFallback,
          ...data.data,
        });
        onUpdate(merged);
      } else {
        const cleanSettings = sanitizeSchoolSettings(initialFallback);
        onUpdate(initialFallback);
        supabase
          .from('settings')
          .upsert({
            id: 'main',
            data: cleanSettings,
            updated_at: new Date().toISOString(),
          })
          .then(({ error: upsertErr }) => {
            if (upsertErr && upsertErr.code !== 'PGRST205') {
              console.warn('Initial settings upsert to Supabase notice:', upsertErr.message);
            }
          });
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchSettings();

  try {
    channel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.main' },
        (payload) => {
          if (payload.new && (payload.new as any).data) {
            const merged = sanitizeSchoolSettings({
              ...initialFallback,
              ...(payload.new as any).data,
            });
            onUpdate(merged);
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to settings realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveSchoolSettingsToCloud(settings: SchoolSettings): Promise<boolean> {
  const supabase = getSupabaseClient();
  const cleanSettings = sanitizeSchoolSettings(settings);

  try {
    const { error } = await supabase.from('settings').upsert({
      id: 'main',
      data: cleanSettings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Supabase: Tabel "settings" belum ada di Supabase. Data tersimpan di lokal.');
        return false;
      }
      handleSupabaseError(error, OperationType.WRITE, 'settings');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'settings');
    return false;
  }
}

// -------------------------------------------------------------
// 2. Students (Tabel students)
// -------------------------------------------------------------
export function sanitizeStudent(s: Student): Student {
  return {
    id: String(s.id || '').trim(),
    no: typeof s.no === 'number' ? s.no : 1,
    name: (s.name || '').trim().toUpperCase(),
    gender: (s.gender === 'L' || s.gender === 'P' ? s.gender : 'L') as 'L' | 'P',
    nisn: (s.nisn || '').trim(),
    parentWhatsapp: (s.parentWhatsapp || '').trim(),
    address: (s.address || '').trim(),
    note: (s.note || '').trim(),
  };
}

export function subscribeStudents(
  onUpdate: (students: Student[]) => void,
  initialFallback: Student[]
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "students" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase students query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const studentList: Student[] = data.map((row: any, idx: number) => {
          const raw = row.data || row;
          return sanitizeStudent({
            ...raw,
            id: String(row.id || raw.id),
            no: typeof raw.no === 'number' ? raw.no : idx + 1,
            name: row.name || raw.name,
            gender: row.gender || raw.gender,
            nisn: row.nisn || raw.nisn,
            parentWhatsapp: row.parent_whatsapp || raw.parentWhatsapp,
            address: row.address || raw.address,
            note: row.note || raw.note,
          });
        });
        onUpdate(studentList);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchStudents();

  try {
    channel = supabase
      .channel('public:students')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          fetchStudents();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to students realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveStudentToCloud(student: Student): Promise<boolean> {
  const supabase = getSupabaseClient();
  const clean = sanitizeStudent(student);

  try {
    const { error } = await supabase.from('students').upsert({
      id: clean.id,
      name: clean.name,
      gender: clean.gender,
      nisn: clean.nisn,
      parent_whatsapp: clean.parentWhatsapp,
      data: clean,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `students/${clean.id}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `students/${clean.id}`);
    return false;
  }
}

export async function saveAllStudentsToCloud(students: Student[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (students.length === 0) {
    try {
      const { error } = await supabase.from('students').delete().neq('id', '');
      if (error && error.code !== 'PGRST205') {
        handleSupabaseError(error, OperationType.DELETE, 'students');
        return false;
      }
      return true;
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, 'students');
      return false;
    }
  }

  const rows = students.map((s) => {
    const clean = sanitizeStudent(s);
    return {
      id: clean.id,
      name: clean.name,
      gender: clean.gender,
      nisn: clean.nisn,
      parent_whatsapp: clean.parentWhatsapp,
      data: clean,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabase.from('students').upsert(rows);
    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, 'students');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'students');
    return false;
  }
}

export async function deleteStudentFromCloud(studentId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, `students/${studentId}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, `students/${studentId}`);
    return false;
  }
}

// -------------------------------------------------------------
// 3. Teachers (Tabel teachers)
// -------------------------------------------------------------
export function sanitizeTeacher(t: Teacher): Teacher {
  return {
    id: String(t.id || '').trim(),
    code: (t.code || '').trim(),
    nip: (t.nip || '').trim() || '-',
    nuptk: (t.nuptk || '').trim(),
    name: (t.name || '').trim().toUpperCase(),
    gender: (t.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
    subject: (t.subject || '').trim() || 'Semua Mata Pelajaran',
    additionalSubjects: Array.isArray(t.additionalSubjects) ? t.additionalSubjects : [],
    phone: (t.phone || '').trim(),
    email: (t.email || '').trim(),
    employmentStatus: t.employmentStatus || 'GTY',
    activeStatus: t.activeStatus || 'Aktif',
    homeroomClass: (t.homeroomClass || '').trim(),
    education: (t.education || '').trim(),
    address: (t.address || '').trim(),
    notes: t.notes || '',
    photoUrl: t.photoUrl || '',
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

export function subscribeTeachers(
  onUpdate: (teachers: Teacher[]) => void,
  initialFallback: Teacher[]
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name', { ascending: true });

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "teachers" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase teachers query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const list: Teacher[] = data.map((row: any) => {
          const raw = row.data || row;
          return sanitizeTeacher({
            ...raw,
            id: String(row.id || raw.id),
            name: row.name || raw.name,
            nip: row.nip || raw.nip,
            subject: row.subject || raw.subject,
            phone: row.phone || raw.phone,
            email: row.email || raw.email,
          });
        });
        onUpdate(list);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchTeachers();

  try {
    channel = supabase
      .channel('public:teachers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => {
          fetchTeachers();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to teachers realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveTeacherToCloud(teacher: Teacher): Promise<boolean> {
  const supabase = getSupabaseClient();
  const clean = sanitizeTeacher(teacher);

  try {
    const { error } = await supabase.from('teachers').upsert({
      id: clean.id,
      name: clean.name,
      nip: clean.nip,
      subject: clean.subject,
      phone: clean.phone,
      email: clean.email,
      data: clean,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `teachers/${clean.id}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `teachers/${clean.id}`);
    return false;
  }
}

export async function saveAllTeachersToCloud(teachers: Teacher[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (teachers.length === 0) {
    try {
      const { error } = await supabase.from('teachers').delete().neq('id', '');
      if (error && error.code !== 'PGRST205') {
        handleSupabaseError(error, OperationType.DELETE, 'teachers');
        return false;
      }
      return true;
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, 'teachers');
      return false;
    }
  }

  const rows = teachers.map((t) => {
    const clean = sanitizeTeacher(t);
    return {
      id: clean.id,
      name: clean.name,
      nip: clean.nip,
      subject: clean.subject,
      phone: clean.phone,
      email: clean.email,
      data: clean,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabase.from('teachers').upsert(rows);
    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, 'teachers');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'teachers');
    return false;
  }
}

export async function deleteTeacherFromCloud(teacherId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, `teachers/${teacherId}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, `teachers/${teacherId}`);
    return false;
  }
}

// -------------------------------------------------------------
// 4. Subjects (Tabel subjects)
// -------------------------------------------------------------
export function sanitizeSubject(s: Subject): Subject {
  return {
    id: String(s.id || '').trim(),
    name: (s.name || '').trim(),
    code: (s.code || '').trim().toUpperCase(),
    category: s.category || 'Muatan Peminatan Kejuruan / Produktif (C)',
    hoursPerWeek: typeof s.hoursPerWeek === 'number' && !isNaN(s.hoursPerWeek) ? s.hoursPerWeek : 2,
    defaultTeacherName: (s.defaultTeacherName || '').trim(),
    description: s.description || '',
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
  };
}

export function subscribeSubjects(
  onUpdate: (subjects: Subject[]) => void,
  initialFallback: Subject[]
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "subjects" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase subjects query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const list: Subject[] = data.map((row: any) => {
          const raw = row.data || row;
          return sanitizeSubject({
            ...raw,
            id: String(row.id || raw.id),
            name: row.name || raw.name,
            code: row.code || raw.code,
          });
        });
        onUpdate(list);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchSubjects();

  try {
    channel = supabase
      .channel('public:subjects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        () => {
          fetchSubjects();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to subjects realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveSubjectToCloud(subject: Subject): Promise<boolean> {
  const supabase = getSupabaseClient();
  const clean = sanitizeSubject(subject);

  try {
    const { error } = await supabase.from('subjects').upsert({
      id: clean.id,
      name: clean.name,
      code: clean.code,
      data: clean,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `subjects/${clean.id}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `subjects/${clean.id}`);
    return false;
  }
}

export async function saveAllSubjectsToCloud(subjects: Subject[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (subjects.length === 0) {
    try {
      const { error } = await supabase.from('subjects').delete().neq('id', '');
      if (error && error.code !== 'PGRST205') {
        handleSupabaseError(error, OperationType.DELETE, 'subjects');
        return false;
      }
      return true;
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, 'subjects');
      return false;
    }
  }

  const rows = subjects.map((s) => {
    const clean = sanitizeSubject(s);
    return {
      id: clean.id,
      name: clean.name,
      code: clean.code,
      data: clean,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabase.from('subjects').upsert(rows);
    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, 'subjects');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'subjects');
    return false;
  }
}

export async function deleteSubjectFromCloud(subjectId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, `subjects/${subjectId}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, `subjects/${subjectId}`);
    return false;
  }
}

// -------------------------------------------------------------
// 5. Attendance Store (Tabel attendance)
// Format: { [monthKey]: { [studentId]: { [day]: status } } }
// -------------------------------------------------------------
export function subscribeAttendance(
  onUpdate: (attendanceStore: Record<string, Record<string, Record<number, AttendanceStatus>>>) => void,
  initialFallback: Record<string, Record<string, Record<number, AttendanceStatus>>>
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase.from('attendance').select('*');

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "attendance" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase attendance query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const store: Record<string, Record<string, Record<number, AttendanceStatus>>> = {
          ...initialFallback,
        };
        data.forEach((row: any) => {
          const monthKey = row.month_key || row.id;
          if (row.data && typeof row.data === 'object') {
            store[monthKey] = row.data;
          }
        });
        onUpdate(store);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchAttendance();

  try {
    channel = supabase
      .channel('public:attendance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to attendance realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveMonthAttendanceToCloud(
  monthKey: string,
  monthData: Record<string, Record<number, AttendanceStatus>>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.from('attendance').upsert({
      id: monthKey,
      month_key: monthKey,
      data: monthData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `attendance/${monthKey}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `attendance/${monthKey}`);
    return false;
  }
}

// -------------------------------------------------------------
// 6. Homeroom Monthly Reports (Tabel homeroom_reports)
// -------------------------------------------------------------
export function sanitizeHomeroomReport(r: HomeroomMonthlyReportData): HomeroomMonthlyReportData {
  return stripUndefined({
    id: r.id || r.monthKey,
    monthKey: r.monthKey,
    schoolName: r.schoolName || 'SMKS NUSANTARA 1 CIPUTAT',
    homeroomTeacher: r.homeroomTeacher || 'Wali Kelas',
    classLeader: r.classLeader || '',
    majorClass: r.majorClass || 'X TJKT 3',
    month: r.month || '',
    attendancePercentage: r.attendancePercentage || '',
    oftenLateStudents: Array.isArray(r.oftenLateStudents) && r.oftenLateStudents.length === 4 ? r.oftenLateStudents : ['', '', '', ''],
    oftenAbsentStudents: Array.isArray(r.oftenAbsentStudents) && r.oftenAbsentStudents.length === 4 ? r.oftenAbsentStudents : ['', '', '', ''],
    oftenSickStudents: Array.isArray(r.oftenSickStudents) && r.oftenSickStudents.length === 4 ? r.oftenSickStudents : ['', '', '', ''],
    oftenLateOrPermissionStudents: Array.isArray(r.oftenLateOrPermissionStudents) && r.oftenLateOrPermissionStudents.length === 4 ? r.oftenLateOrPermissionStudents : ['', '', '', ''],
    perfectAttendanceStudents: Array.isArray(r.perfectAttendanceStudents) && r.perfectAttendanceStudents.length === 4 ? r.perfectAttendanceStudents : ['', '', '', ''],
    oftenLateTeachers: Array.isArray(r.oftenLateTeachers) && r.oftenLateTeachers.length === 4 ? r.oftenLateTeachers : ['', '', '', ''],
    oftenAbsentTeachers: Array.isArray(r.oftenAbsentTeachers) && r.oftenAbsentTeachers.length === 4 ? r.oftenAbsentTeachers : ['', '', '', ''],
    perfectAttendanceTeachers: Array.isArray(r.perfectAttendanceTeachers) && r.perfectAttendanceTeachers.length === 4 ? r.perfectAttendanceTeachers : ['', '', '', ''],
    monthlyCases: Array.isArray(r.monthlyCases) && r.monthlyCases.length === 2 ? r.monthlyCases : ['', ''],
    selfEvaluation: Array.isArray(r.selfEvaluation) && r.selfEvaluation.length === 2 ? r.selfEvaluation : ['', ''],
    signatureLocation: r.signatureLocation || 'Tangerang Selatan',
    signatureDate: r.signatureDate || '13 Juli 2026',
    headOfDepartment: r.headOfDepartment || '',
    headOfDepartmentNip: r.headOfDepartmentNip || '-',
    updatedAt: r.updatedAt || new Date().toISOString(),
  });
}

export function subscribeHomeroomReport(
  monthKey: string,
  onUpdate: (report: HomeroomMonthlyReportData | null) => void,
  initialFallback?: HomeroomMonthlyReportData
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('homeroom_reports')
        .select('*')
        .eq('id', monthKey)
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "homeroom_reports" belum dibuat. Menggunakan data lokal.');
        } else {
          console.warn('Supabase homeroom report query error:', error.message);
        }
        onUpdate(initialFallback || null);
        return;
      }

      if (data && data.data) {
        onUpdate(sanitizeHomeroomReport(data.data));
      } else {
        onUpdate(initialFallback || null);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback || null);
    }
  };

  fetchReport();

  try {
    channel = supabase
      .channel(`public:homeroom_reports:${monthKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'homeroom_reports', filter: `id=eq.${monthKey}` },
        (payload) => {
          if (payload.new && (payload.new as any).data) {
            onUpdate(sanitizeHomeroomReport((payload.new as any).data));
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to homeroom_reports realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveHomeroomReportToCloud(
  monthKey: string,
  reportData: HomeroomMonthlyReportData
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const clean = sanitizeHomeroomReport(reportData);

  try {
    const { error } = await supabase.from('homeroom_reports').upsert({
      id: monthKey,
      month_key: monthKey,
      data: clean,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `homeroom_reports/${monthKey}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `homeroom_reports/${monthKey}`);
    return false;
  }
}

// -------------------------------------------------------------
// 7. Teacher Agenda / Jurnal Guru (Tabel teacher_agenda)
// -------------------------------------------------------------
export function sanitizeTeacherAgendaEntries(entries: TeacherAgendaEntry[]): TeacherAgendaEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) =>
    stripUndefined({
      id: String(entry.id || '').trim(),
      date: String(entry.date || '').trim(),
      dayName: String(entry.dayName || 'Senin').trim(),
      period: String(entry.period || '').trim() || '1 - 2',
      timeRange: String(entry.timeRange || '').trim() || '07:15 - 08:45',
      subject: String(entry.subject || '').trim(),
      teacherName: String(entry.teacherName || '').trim(),
      teacherNip: String(entry.teacherNip || '').trim() || '-',
      status: entry.status || 'Hadir',
      topic: String(entry.topic || '').trim(),
      presentStudentsCount: typeof entry.presentStudentsCount === 'number' ? entry.presentStudentsCount : undefined,
      absentStudentsCount: typeof entry.absentStudentsCount === 'number' ? entry.absentStudentsCount : undefined,
      notes: String(entry.notes || '').trim(),
      hasAssignment: entry.hasAssignment === true,
      assignmentDetails: String(entry.assignmentDetails || '').trim(),
      signatureVerified: entry.signatureVerified === true,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    })
  );
}

/**
 * Subscribe to ALL teacher agenda rows across all months in Supabase Realtime
 * This ensures switching months never loses data and keeps the entire teacherAgendaStore in sync.
 */
export function subscribeTeacherAgendaStore(
  onUpdate: (store: Record<string, TeacherAgendaEntry[]>) => void,
  initialFallback: Record<string, TeacherAgendaEntry[]> = {}
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchAgendaStore = async () => {
    try {
      const { data, error } = await supabase.from('teacher_agenda').select('*');

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "teacher_agenda" belum dibuat di database. Menggunakan data lokal.');
        } else {
          console.warn('Supabase teacher_agenda query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const store: Record<string, TeacherAgendaEntry[]> = {
          ...initialFallback,
        };
        data.forEach((row: any) => {
          const monthKey = row.month_key || row.id;
          if (Array.isArray(row.entries)) {
            store[monthKey] = sanitizeTeacherAgendaEntries(row.entries);
          }
        });
        onUpdate(store);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchAgendaStore();

  try {
    channel = supabase
      .channel('public:teacher_agenda')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_agenda' },
        () => {
          fetchAgendaStore();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to teacher_agenda realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export function subscribeTeacherAgenda(
  monthKey: string,
  onUpdate: (entries: TeacherAgendaEntry[]) => void,
  initialFallback: TeacherAgendaEntry[] = []
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchAgenda = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_agenda')
        .select('*')
        .eq('id', monthKey)
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "teacher_agenda" belum dibuat. Menggunakan data lokal.');
        } else {
          console.warn('Supabase teacher agenda query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && Array.isArray(data.entries)) {
        onUpdate(sanitizeTeacherAgendaEntries(data.entries));
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchAgenda();

  try {
    channel = supabase
      .channel(`public:teacher_agenda:${monthKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_agenda' },
        () => {
          fetchAgenda();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to teacher_agenda realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveTeacherAgendaToCloud(
  monthKey: string,
  entries: TeacherAgendaEntry[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const cleanEntries = sanitizeTeacherAgendaEntries(entries);

  try {
    const { error } = await supabase.from('teacher_agenda').upsert({
      id: monthKey,
      month_key: monthKey,
      entries: cleanEntries,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Supabase: Tabel teacher_agenda belum dibuat di database.');
        return false;
      }
      handleSupabaseError(error, OperationType.WRITE, `teacher_agenda/${monthKey}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `teacher_agenda/${monthKey}`);
    return false;
  }
}

export async function saveAllTeacherAgendaToCloud(
  store: Record<string, TeacherAgendaEntry[]>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const entries = Object.entries(store);
  if (entries.length === 0) return true;

  const rows = entries.map(([mKey, list]) => ({
    id: mKey,
    month_key: mKey,
    entries: sanitizeTeacherAgendaEntries(list),
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error } = await supabase.from('teacher_agenda').upsert(rows);
    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, 'teacher_agenda');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'teacher_agenda');
    return false;
  }
}

export async function deleteTeacherAgendaMonthFromCloud(monthKey: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('teacher_agenda').delete().eq('id', monthKey);
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, `teacher_agenda/${monthKey}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, `teacher_agenda/${monthKey}`);
    return false;
  }
}

export async function fetchTeacherAgendaFromCloud(): Promise<{
  success: boolean;
  store: Record<string, TeacherAgendaEntry[]>;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.from('teacher_agenda').select('*');
    if (error) {
      return { success: false, store: {}, error: error.message };
    }
    const store: Record<string, TeacherAgendaEntry[]> = {};
    (data || []).forEach((row: any) => {
      const mKey = row.month_key || row.id;
      if (Array.isArray(row.entries)) {
        store[mKey] = sanitizeTeacherAgendaEntries(row.entries);
      }
    });
    return { success: true, store };
  } catch (err: any) {
    return { success: false, store: {}, error: err?.message || String(err) };
  }
}

// -------------------------------------------------------------
// 8. WhatsApp Transmission Audit Logs (Tabel whatsapp_logs)
// -------------------------------------------------------------
export function sanitizeWhatsAppLog(log: WhatsAppTransmissionLog): WhatsAppTransmissionLog {
  const sanitized: WhatsAppTransmissionLog = {
    id: String(log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
    timestamp: log.timestamp || new Date().toLocaleString('id-ID'),
    createdAt: log.createdAt || new Date().toISOString(),
    target: String(log.target || '-'),
    targetName: String(log.targetName || '-'),
    targetType: log.targetType || 'group',
    message: String(log.message || ''),
    status: log.status === 'success' || log.status === 'failed' ? log.status : 'failed',
    responseMessage: log.responseMessage ? String(log.responseMessage) : undefined,
    errorDetails: log.errorDetails ? String(log.errorDetails) : undefined,
    sentBy: String(log.sentBy || 'Sistem'),
    totalRecipients: typeof log.totalRecipients === 'number' ? log.totalRecipients : undefined,
    meta: log.meta || undefined,
  };

  return stripUndefined(sanitized);
}

export function subscribeWhatsAppLogs(
  onUpdate: (logs: WhatsAppTransmissionLog[]) => void,
  initialFallback: WhatsAppTransmissionLog[] = []
): () => void {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let isCancelled = false;

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (isCancelled) return;

      if (error) {
        if (error.code === 'PGRST205') {
          console.info('Supabase: Tabel "whatsapp_logs" belum dibuat. Menggunakan data lokal.');
        } else {
          console.warn('Supabase whatsapp_logs query error:', error.message);
        }
        onUpdate(initialFallback);
        return;
      }

      if (data && data.length > 0) {
        const logs: WhatsAppTransmissionLog[] = data.map((row: any) => {
          const raw = row.data || row;
          return sanitizeWhatsAppLog({
            ...raw,
            id: String(row.id || raw.id),
            target: row.target || raw.target,
            targetName: row.target_name || raw.targetName,
            status: row.status || raw.status,
          });
        });
        onUpdate(logs);
      } else {
        onUpdate(initialFallback);
      }
    } catch (err) {
      if (!isCancelled) onUpdate(initialFallback);
    }
  };

  fetchLogs();

  try {
    channel = supabase
      .channel('public:whatsapp_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Failed to subscribe to whatsapp_logs realtime:', e);
  }

  return () => {
    isCancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveWhatsAppLogToCloud(log: WhatsAppTransmissionLog): Promise<boolean> {
  const supabase = getSupabaseClient();
  const clean = sanitizeWhatsAppLog(log);

  try {
    const { error } = await supabase.from('whatsapp_logs').upsert({
      id: clean.id,
      target: clean.target,
      target_name: clean.targetName,
      status: clean.status,
      data: clean,
      created_at: clean.createdAt || new Date().toISOString(),
    });

    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, `whatsapp_logs/${clean.id}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, `whatsapp_logs/${clean.id}`);
    return false;
  }
}

export async function saveAllWhatsAppLogsToCloud(logs: WhatsAppTransmissionLog[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  const rows = logs.map((l) => {
    const clean = sanitizeWhatsAppLog(l);
    return {
      id: clean.id,
      target: clean.target,
      target_name: clean.targetName,
      status: clean.status,
      data: clean,
      created_at: clean.createdAt || new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabase.from('whatsapp_logs').upsert(rows);
    if (error) {
      if (error.code === 'PGRST205') return false;
      handleSupabaseError(error, OperationType.WRITE, 'whatsapp_logs');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'whatsapp_logs');
    return false;
  }
}

export async function deleteWhatsAppLogFromCloud(logId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('whatsapp_logs').delete().eq('id', logId);
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, `whatsapp_logs/${logId}`);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, `whatsapp_logs/${logId}`);
    return false;
  }
}

export async function clearAllWhatsAppLogsFromCloud(): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('whatsapp_logs').delete().neq('id', '');
    if (error && error.code !== 'PGRST205') {
      handleSupabaseError(error, OperationType.DELETE, 'whatsapp_logs');
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError(err, OperationType.DELETE, 'whatsapp_logs');
    return false;
  }
}

// -------------------------------------------------------------
// 9. Comprehensive Database Sync / Backup ke Cloud Supabase
// -------------------------------------------------------------
export async function syncEntireDatabaseToCloud(payload: {
  schoolSettings: SchoolSettings;
  students: Student[];
  teachers?: Teacher[];
  subjects?: Subject[];
  attendanceStore?: Record<string, Record<string, Record<number, AttendanceStatus>>>;
  teacherAgendaStore?: Record<string, TeacherAgendaEntry[]>;
  whatsappLogs?: WhatsAppTransmissionLog[];
  onProgress?: (step: string) => void;
}): Promise<{
  success: boolean;
  message: string;
  counts: {
    students: number;
    teachers: number;
    subjects: number;
    attendanceMonths: number;
    agendaMonths: number;
    whatsappLogs: number;
  };
  details: {
    students: number;
    teachers: number;
    subjects: number;
    attendanceMonths: number;
    teacherAgendaMonths: number;
    whatsappLogsCount: number;
    databaseId: string;
  };
}> {
  const { onProgress } = payload;
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  const emptyDetails = {
    students: 0,
    teachers: 0,
    subjects: 0,
    attendanceMonths: 0,
    teacherAgendaMonths: 0,
    whatsappLogsCount: 0,
    databaseId: config.url.replace(/^https?:\/\//, '').split('.')[0] || 'supabase',
  };
  const emptyCounts = {
    students: 0,
    teachers: 0,
    subjects: 0,
    attendanceMonths: 0,
    agendaMonths: 0,
    whatsappLogs: 0,
  };

  try {
    if (onProgress) onProgress('Memverifikasi koneksi ke server Supabase...');

    // 1. Settings
    if (onProgress) onProgress('1/6 Mengunggah Pengaturan & Identitas Sekolah ke Supabase...');
    const cleanSettings = sanitizeSchoolSettings(payload.schoolSettings);
    const { error: settingsErr } = await supabase.from('settings').upsert({
      id: 'main',
      data: cleanSettings,
      updated_at: new Date().toISOString(),
    });
    if (settingsErr) {
      if (settingsErr.code === 'PGRST205') {
        return {
          success: false,
          message: 'Tabel "settings" belum dibuat di Supabase. Silakan jalankan Skrip SQL di Dashboard -> Tab Koneksi Supabase & SQL Editor.',
          counts: emptyCounts,
          details: emptyDetails,
        };
      }
      throw new Error(`Gagal menyimpan pengaturan: ${settingsErr.message}`);
    }

    // 2. Students
    if (onProgress) onProgress(`2/6 Menyinkronkan ${payload.students.length} data Siswa ke Supabase...`);
    if (payload.students.length > 0) {
      const studentRows = payload.students.map((s) => {
        const clean = sanitizeStudent(s);
        return {
          id: clean.id,
          name: clean.name,
          gender: clean.gender,
          nisn: clean.nisn,
          parent_whatsapp: clean.parentWhatsapp,
          data: clean,
          updated_at: new Date().toISOString(),
        };
      });
      const { error: sErr } = await supabase.from('students').upsert(studentRows);
      if (sErr) throw new Error(`Gagal menyimpan siswa: ${sErr.message}`);
    }

    // 3. Teachers
    const teachers = payload.teachers || [];
    if (onProgress) onProgress(`3/6 Menyinkronkan ${teachers.length} data Guru ke Supabase...`);
    if (teachers.length > 0) {
      const teacherRows = teachers.map((t) => {
        const clean = sanitizeTeacher(t);
        return {
          id: clean.id,
          name: clean.name,
          nip: clean.nip,
          subject: clean.subject,
          phone: clean.phone,
          email: clean.email,
          data: clean,
          updated_at: new Date().toISOString(),
        };
      });
      const { error: tErr } = await supabase.from('teachers').upsert(teacherRows);
      if (tErr) throw new Error(`Gagal menyimpan guru: ${tErr.message}`);
    }

    // 4. Subjects
    const subjects = payload.subjects || [];
    if (onProgress) onProgress(`4/6 Menyinkronkan ${subjects.length} data Mata Pelajaran ke Supabase...`);
    if (subjects.length > 0) {
      const subjectRows = subjects.map((s) => {
        const clean = sanitizeSubject(s);
        return {
          id: clean.id,
          name: clean.name,
          code: clean.code,
          data: clean,
          updated_at: new Date().toISOString(),
        };
      });
      const { error: subErr } = await supabase.from('subjects').upsert(subjectRows);
      if (subErr) throw new Error(`Gagal menyimpan mata pelajaran: ${subErr.message}`);
    }

    // 5. Attendance
    const attendanceEntries = Object.entries(payload.attendanceStore || {});
    if (onProgress) onProgress(`5/6 Mengunggah Rekap Absensi (${attendanceEntries.length} bulan) ke Supabase...`);
    for (const [monthKey, monthData] of attendanceEntries) {
      const { error: attErr } = await supabase.from('attendance').upsert({
        id: monthKey,
        month_key: monthKey,
        data: monthData,
        updated_at: new Date().toISOString(),
      });
      if (attErr) throw new Error(`Gagal menyimpan absensi ${monthKey}: ${attErr.message}`);
    }

    // 6. Teacher Agenda
    const agendaEntries = Object.entries(payload.teacherAgendaStore || {});
    if (onProgress) onProgress(`6/6 Mengunggah Jurnal Guru (${agendaEntries.length} bulan) ke Supabase...`);
    for (const [monthKey, entries] of agendaEntries) {
      const cleanEntries = sanitizeTeacherAgendaEntries(entries);
      const { error: agErr } = await supabase.from('teacher_agenda').upsert({
        id: monthKey,
        month_key: monthKey,
        entries: cleanEntries,
        updated_at: new Date().toISOString(),
      });
      if (agErr) throw new Error(`Gagal menyimpan jurnal guru ${monthKey}: ${agErr.message}`);
    }

    // 7. WhatsApp Logs (if provided)
    const logs = payload.whatsappLogs || [];
    if (logs.length > 0) {
      const logRows = logs.map((l) => {
        const clean = sanitizeWhatsAppLog(l);
        return {
          id: clean.id,
          target: clean.target,
          target_name: clean.targetName,
          status: clean.status,
          data: clean,
          created_at: clean.createdAt || new Date().toISOString(),
        };
      });
      await supabase.from('whatsapp_logs').upsert(logRows);
    }

    const details = {
      students: payload.students.length,
      teachers: teachers.length,
      subjects: subjects.length,
      attendanceMonths: attendanceEntries.length,
      teacherAgendaMonths: agendaEntries.length,
      whatsappLogsCount: logs.length,
      databaseId: config.url.replace(/^https?:\/\//, '').split('.')[0] || 'supabase',
    };

    return {
      success: true,
      message: `Seluruh database berhasil diperbarui dan disinkronkan ke Supabase Cloud (${config.url})!`,
      counts: {
        students: payload.students.length,
        teachers: teachers.length,
        subjects: subjects.length,
        attendanceMonths: attendanceEntries.length,
        agendaMonths: agendaEntries.length,
        whatsappLogs: logs.length,
      },
      details,
    };
  } catch (err: any) {
    handleSupabaseError(err, OperationType.WRITE, 'syncEntireDatabaseToCloud');
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kegagalan saat sinkronisasi database ke Supabase.',
      counts: emptyCounts,
      details: emptyDetails,
    };
  }
}

// -------------------------------------------------------------
// 10. Status & Table Inspection
// -------------------------------------------------------------
export interface TableInspectionResult {
  table: string;
  label: string;
  exists: boolean;
  rowCount: number | null;
  rlsReadable?: boolean;
  rlsWritable?: boolean;
  error?: string;
}

export async function getSupabaseConnectionStatus(): Promise<{
  connected: boolean;
  url: string;
  projectId: string;
  databaseId: string;
  anonKeyValid: boolean;
  latencyMs?: number;
  error?: string;
  tablesAvailable?: number;
  totalTables?: number;
}> {
  const { url } = getSupabaseConfig();
  const projRef = url.replace(/^https?:\/\//, '').split('.')[0] || 'jvrxlvozsycphcaeaalw';
  const start = performance.now();

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('settings').select('id').limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      if (error.code === 'PGRST205') {
        return {
          connected: true,
          url,
          projectId: projRef,
          databaseId: 'postgres (supabase)',
          anonKeyValid: true,
          latencyMs: latency,
          error: 'Terhubung ke server Supabase, namun tabel belum dibuat di SQL Editor.',
        };
      }
      return {
        connected: false,
        url,
        projectId: projRef,
        databaseId: 'postgres (supabase)',
        anonKeyValid: false,
        latencyMs: latency,
        error: error.message,
      };
    }

    return {
      connected: true,
      url,
      projectId: projRef,
      databaseId: 'postgres (supabase)',
      anonKeyValid: true,
      latencyMs: latency,
    };
  } catch (err: any) {
    return {
      connected: false,
      url,
      projectId: projRef,
      databaseId: 'postgres (supabase)',
      anonKeyValid: false,
      error: err instanceof Error ? err.message : 'Tidak dapat terhubung ke Supabase',
    };
  }
}

export const SUPABASE_TABLES = [
  { name: 'settings', label: 'Pengaturan & Profil Sekolah' },
  { name: 'students', label: 'Database Siswa' },
  { name: 'teachers', label: 'Database Guru' },
  { name: 'subjects', label: 'Database Mata Pelajaran' },
  { name: 'attendance', label: 'Rekap Absensi Siswa' },
  { name: 'teacher_agenda', label: 'Jurnal & Agenda Guru' },
  { name: 'homeroom_reports', label: 'Laporan Bulanan Wali Kelas' },
  { name: 'whatsapp_logs', label: 'Riwayat Notifikasi WhatsApp' },
];

export async function checkSupabaseTables(): Promise<TableInspectionResult[]> {
  const supabase = getSupabaseClient();
  const results: TableInspectionResult[] = [];

  for (const t of SUPABASE_TABLES) {
    try {
      const { count, error } = await supabase
        .from(t.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        const isRlsDenied =
          error.code === '42501' ||
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('permission denied');
        results.push({
          table: t.name,
          label: t.label,
          exists: isRlsDenied,
          rowCount: null,
          rlsReadable: false,
          rlsWritable: false,
          error:
            error.code === 'PGRST205'
              ? 'Tabel belum dibuat'
              : isRlsDenied
              ? 'Diblokir RLS (Jalankan Skrip RLS)'
              : error.message,
        });
      } else {
        results.push({
          table: t.name,
          label: t.label,
          exists: true,
          rowCount: count ?? 0,
          rlsReadable: true,
          rlsWritable: true,
        });
      }
    } catch (err: any) {
      results.push({
        table: t.name,
        label: t.label,
        exists: false,
        rowCount: null,
        rlsReadable: false,
        rlsWritable: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

// -------------------------------------------------------------
// 11. Dedicated Row Level Security (RLS) Policy Script
// -------------------------------------------------------------
export const SUPABASE_RLS_SQL = `-- ==============================================================================
-- SKRIP KHUSUS ROW LEVEL SECURITY (RLS) & GRANT PERMISSIONS SUPABASE
-- SMKS NUSANTARA 1 CIPUTAT
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Mengatasi error: "new row violates row-level security policy" (Code 42501)
-- ==============================================================================

-- 1. PASTIKAN HAK AKSES SCHEMA & TABEL DIBERIKAN KE ROLE anon & authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 2. AKTIFKAN ROW LEVEL SECURITY (RLS) PADA SELURUH 8 TABEL UTAMA
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homeroom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- 3. BERSIHKAN POLICY LAMA AGAR TIDAK DUPLIKAT / BENTROK
DROP POLICY IF EXISTS "Anon public access settings" ON public.settings;
DROP POLICY IF EXISTS "Public full access settings" ON public.settings;
DROP POLICY IF EXISTS "Allow read write settings" ON public.settings;

DROP POLICY IF EXISTS "Anon public access students" ON public.students;
DROP POLICY IF EXISTS "Public full access students" ON public.students;
DROP POLICY IF EXISTS "Allow read write students" ON public.students;

DROP POLICY IF EXISTS "Anon public access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public full access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow read write teachers" ON public.teachers;

DROP POLICY IF EXISTS "Anon public access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public full access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow read write subjects" ON public.subjects;

DROP POLICY IF EXISTS "Anon public access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public full access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow read write attendance" ON public.attendance;

DROP POLICY IF EXISTS "Anon public access teacher_agenda" ON public.teacher_agenda;
DROP POLICY IF EXISTS "Public full access teacher_agenda" ON public.teacher_agenda;
DROP POLICY IF EXISTS "Allow read write teacher_agenda" ON public.teacher_agenda;

DROP POLICY IF EXISTS "Anon public access homeroom_reports" ON public.homeroom_reports;
DROP POLICY IF EXISTS "Public full access homeroom_reports" ON public.homeroom_reports;
DROP POLICY IF EXISTS "Allow read write homeroom_reports" ON public.homeroom_reports;

DROP POLICY IF EXISTS "Anon public access whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Public full access whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Allow read write whatsapp_logs" ON public.whatsapp_logs;

-- 4. BUAT POLICY RLS LENGKAP (SELECT, INSERT, UPDATE, DELETE) UNTUK ROLE public (anon + authenticated)
CREATE POLICY "Public full access settings"
  ON public.settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access students"
  ON public.students
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access teachers"
  ON public.teachers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access subjects"
  ON public.subjects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access attendance"
  ON public.attendance
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access teacher_agenda"
  ON public.teacher_agenda
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access homeroom_reports"
  ON public.homeroom_reports
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access whatsapp_logs"
  ON public.whatsapp_logs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. AKTIFKAN REPLICA IDENTITY FULL AGAR UPDATE/DELETE REALTIME BERJALAN LANCAR
ALTER TABLE IF EXISTS public.settings REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.students REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.teachers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.subjects REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.attendance REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.teacher_agenda REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.homeroom_reports REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.whatsapp_logs REPLICA IDENTITY FULL;
`;

// -------------------------------------------------------------
// 12. Complete SQL DDL Script for Supabase SQL Editor
// -------------------------------------------------------------
export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- SKRIP STRUKTUR DATABASE & ROW LEVEL SECURITY (RLS) SUPABASE
-- SMKS NUSANTARA 1 CIPUTAT
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. TABEL PENGATURAN SEKOLAH (settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL MASTER SISWA (students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  nisn TEXT,
  parent_whatsapp TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER GURU (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nip TEXT,
  subject TEXT,
  phone TEXT,
  email TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MATA PELAJARAN (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL REKAP ABSENSI BULANAN SISWA (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY, -- Format: YYYY_M (misal: "2026_8")
  month_key TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL JURNAL & AGENDA MENGAJAR GURU (teacher_agenda)
CREATE TABLE IF NOT EXISTS public.teacher_agenda (
  id TEXT PRIMARY KEY, -- Format: YYYY_M (misal: "2026_8")
  month_key TEXT,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL LAPORAN BULANAN WALI KELAS (homeroom_reports)
CREATE TABLE IF NOT EXISTS public.homeroom_reports (
  id TEXT PRIMARY KEY, -- Format: YYYY_M (misal: "2026_8")
  month_key TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL RIWAYAT PENGIRIMAN PESAN WHATSAPP (whatsapp_logs)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id TEXT PRIMARY KEY,
  target TEXT,
  target_name TEXT,
  status TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- HAK AKSES SCHEMA & TABEL UNTUK ROLE anon, authenticated, service_role
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY AKSES PENUH (anon + authenticated)
-- ------------------------------------------------------------------------------
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access settings" ON public.settings;
DROP POLICY IF EXISTS "Public full access settings" ON public.settings;
CREATE POLICY "Public full access settings" ON public.settings FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access students" ON public.students;
DROP POLICY IF EXISTS "Public full access students" ON public.students;
CREATE POLICY "Public full access students" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public full access teachers" ON public.teachers;
CREATE POLICY "Public full access teachers" ON public.teachers FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public full access subjects" ON public.subjects;
CREATE POLICY "Public full access subjects" ON public.subjects FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public full access attendance" ON public.attendance;
CREATE POLICY "Public full access attendance" ON public.attendance FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.teacher_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access teacher_agenda" ON public.teacher_agenda;
DROP POLICY IF EXISTS "Public full access teacher_agenda" ON public.teacher_agenda;
CREATE POLICY "Public full access teacher_agenda" ON public.teacher_agenda FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.homeroom_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access homeroom_reports" ON public.homeroom_reports;
DROP POLICY IF EXISTS "Public full access homeroom_reports" ON public.homeroom_reports;
CREATE POLICY "Public full access homeroom_reports" ON public.homeroom_reports FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon public access whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Public full access whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "Public full access whatsapp_logs" ON public.whatsapp_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- REPLICA IDENTITY & PUBLIKASI SUPABASE REALTIME
-- ------------------------------------------------------------------------------
ALTER TABLE public.settings REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.teachers REPLICA IDENTITY FULL;
ALTER TABLE public.subjects REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.teacher_agenda REPLICA IDENTITY FULL;
ALTER TABLE public.homeroom_reports REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_agenda;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homeroom_reports;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_logs;
  EXCEPTION WHEN others THEN NULL; END;
END $$;
`;
