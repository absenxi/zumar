export type AttendanceStatus = 'H' | 'A' | 'S' | 'I' | '-';

export interface Student {
  id: string;
  no: number;
  name: string;
  gender: 'L' | 'P';
  nisn?: string;
  parentWhatsapp?: string;
  address?: string;
  note?: string;
}

export interface AttendanceEntry {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
    distanceMeters: number;
    isWithinRadius: boolean;
    address?: string;
  };
}

export interface DailyAttendanceRecord {
  date: string; // YYYY-MM-DD
  entries: Record<string, AttendanceStatus>; // studentId -> status
  locationVerified?: boolean;
  locationData?: {
    latitude: number;
    longitude: number;
    distanceMeters: number;
    isWithinRadius: boolean;
    timestamp: string;
  };
}

export type UserRole = 'guest' | 'guru' | 'admin' | 'superadmin';

export interface WhatsAppTargetItem {
  id: string;
  name: string; // e.g. "Group WhatsApp Kelas X TJKT 3" atau "Nomor Wali Murid"
  target: string; // Phone number e.g. "6281234567801" or Group ID e.g. "1203630248281@g.us"
  type: 'group' | 'personal';
  isDefault?: boolean;
}

export interface SchoolSettings {
  schoolName: string; // e.g. "SDITQu Seruway"
  foundationName: string; // e.g. "YAYASAN HUDA WAN NURUL QUR'AN"
  className: string; // e.g. "4B"
  academicYear: string; // e.g. "2026/2027"
  locationName: string; // e.g. "Tangsi Lama, Seruway"
  principalName: string; // e.g. "Umi Nurul Ikfaini, S.Pd.SD.,Gr"
  principalNip: string;
  teacherName: string; // e.g. "Umi Ririn Prihartini, S.Pd., Gr"
  teacherNip: string;
  homeroomTeacher?: string; // e.g. "Nama Wali Kelas (Sinkron dengan Guru / Wali Kelas)"
  homeroomTeacherNip?: string;
  studyProgram?: string;
  semester?: string;
  reportPlaceDate?: string;
  headOfDepartment?: string; // e.g. "Nama Ketua Jurusan"
  headOfDepartmentNip?: string; // e.g. "NIP Ketua Jurusan"
  classLeader?: string; // e.g. "Nama Ketua Kelas (Sinkron ke semua bulan)"
  signatureDate: string; // e.g. "13 Juli 2026"
  // School GPS Location
  schoolLat: number; // Default approx for Tangsi Lama Seruway
  schoolLng: number;
  allowedRadiusMeters: number; // e.g. 150m
  // Attendance Protection Password & Role Levels
  attendancePassword?: string; // Password / PIN Guru (Hanya untuk absensi)
  adminPassword?: string;      // Password Admin (Untuk akses Database Siswa & Pengaturan)
  superAdminPassword?: string; // Level 3: Password Super Admin (Akses Tertinggi / Pengaturan & Otoritas Penuh)
  requirePassword?: boolean;
  // WhatsApp Gateway API Settings (Fonnte)
  whatsappGatewayProvider?: string; // e.g. "fonnte" | "wablas" | "custom"
  whatsappApiToken?: string;
  whatsappEndpointUrl?: string; // e.g. "https://api.fonnte.com/send"
  whatsappTestTarget?: string;  // e.g. "6281234567801 atau ID@g.us"
  whatsappTestTargetType?: 'group' | 'personal';
  whatsappTargetList?: WhatsAppTargetItem[];
  // Otomatis Kirim WhatsApp ke Group ketika Absensi Sudah Terisi Semua
  autoSendWhatsAppOnComplete?: boolean;
  autoSendWhatsAppTargetId?: string; // ID target dari whatsappTargetList
  autoSendWhatsAppTargetIds?: string[]; // Daftar ID target tujuan pengiriman (bisa pilih satu atau lebih)
  autoSendWhatsAppCustomGreeting?: string;
  lastAutoSentDate?: string; // Format e.g. "2026-09-11"
  // Dynamic Message Templates
  whatsappGroupMessageTemplate?: string;
  whatsappPersonalMessageTemplate?: string;
}

export interface WhatsAppTransmissionLog {
  id: string;
  timestamp: string; // Formatted date e.g. "17 Sep 2026, 08:30:15"
  createdAt?: string; // Standard ISO string e.g. "2026-09-17T08:30:15.000Z" for reliable sorting
  target: string;
  targetName: string;
  targetType: 'group' | 'personal';
  message: string;
  status: 'success' | 'failed';
  responseMessage?: string;
  errorDetails?: string;
  sentBy: string; // e.g. "Otomatis (Absensi Lengkap)", "Manual (Uji Coba)", "Manual (Guru/Admin)"
  totalRecipients?: number;
  meta?: {
    day?: number;
    monthIndex?: number;
    year?: number;
    studentId?: string;
    studentName?: string;
    [key: string]: any;
  };
}

export interface MonthInfo {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  name: string; // e.g. "Juli"
  daysCount: number; // 28, 29, 30, 31
}

export interface HomeroomMonthlyReportData {
  id?: string;
  monthKey: string; // e.g. "2026_7" (year_monthIndex)
  schoolName: string;
  homeroomTeacher: string;
  classLeader: string;
  majorClass: string;
  month: string;
  // 1. Attendance percentage
  attendancePercentage: string;
  // 2. Siswa sering terlambat (1, 2, 3, 4)
  oftenLateStudents: [string, string, string, string];
  // 3. Siswa sering alpa/tidak masuk (1, 2, 3, 4)
  oftenAbsentStudents: [string, string, string, string];
  // 4. Siswa sering sakit (1, 2, 3, 4)
  oftenSickStudents: [string, string, string, string];
  // 5. Siswa sering terlambat / izin (1, 2, 3, 4)
  oftenLateOrPermissionStudents: [string, string, string, string];
  // 6. Siswa masuk terus/hadir 100% (1, 2, 3, 4)
  perfectAttendanceStudents: [string, string, string, string];
  // 7. Guru yang sering datang terlambat (1, 2, 3, 4)
  oftenLateTeachers: [string, string, string, string];
  // 8. Guru yang sering tidak masuk (1, 2, 3, 4)
  oftenAbsentTeachers: [string, string, string, string];
  // 9. Guru yang masuk terus / 100% (1, 2, 3, 4)
  perfectAttendanceTeachers: [string, string, string, string];
  // 10. Kasus yang up-date bulan ini dan penanganannya (a, b)
  monthlyCases: [string, string];
  // 11. Penilaian sendiri / self-evaluation (a, b)
  selfEvaluation: [string, string];
  // Signatures
  signatureLocation: string; // e.g. "Tangerang Selatan"
  signatureDate: string; // e.g. "22 Agustus 2026"
  headOfDepartment: string; // e.g. "Ketua Jurusan"
  headOfDepartmentNip?: string; // e.g. "NIP Ketua Jurusan"
  updatedAt?: string;
}

export type SubjectCategory =
  | 'Muatan Nasional (A)'
  | 'Muatan Kewilayahan (B)'
  | 'Muatan Peminatan Kejuruan / Produktif (C)'
  | 'Muatan Lokal'
  | 'Bimbingan & Ekstrakurikuler';

export interface Subject {
  id: string;
  code?: string; // Kode Singkat Mapel (e.g. AIJ, ASJ, MTK)
  name: string; // Nama Mata Pelajaran
  category?: SubjectCategory | string;
  hoursPerWeek?: number; // Jam Pelajaran per Minggu (JP)
  defaultTeacherName?: string; // Guru Pengampu Utama
  description?: string; // Keterangan / Capaian Pembelajaran
  createdAt?: string;
  updatedAt?: string;
}

export type TeacherAgendaStatus = 'Hadir' | 'Guru Telat Masuk' | 'Telat' | 'Izin' | 'Sakit' | 'Tugas' | 'Alpa';

export type TeacherEmploymentStatus = 'PNS' | 'PPPK' | 'GTY' | 'GTT' | 'Honor' | 'Guru Tamu';
export type TeacherActiveStatus = 'Aktif' | 'Cuti' | 'Pensiun' | 'Mutasi';

export interface Teacher {
  id: string;
  code?: string; // Kode Singkat Mapel / Kode Guru (e.g. AIJ, MTK)
  nip?: string;
  nuptk?: string;
  name: string;
  gender: 'L' | 'P';
  subject: string; // Mata Pelajaran Utama
  additionalSubjects?: string[];
  email?: string;
  phone?: string; // No WhatsApp / Telp
  employmentStatus: TeacherEmploymentStatus;
  activeStatus: TeacherActiveStatus;
  homeroomClass?: string; // e.g. "X TJKT 3"
  education?: string; // e.g. "S1 Pendidikan Informatika"
  address?: string;
  notes?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherAgendaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Senin", "Selasa", dll.
  period: string; // Jam Ke- (e.g. "1 - 2", "3 - 4", "5 - 6", "7 - 8")
  timeRange?: string; // e.g. "07:15 - 08:45"
  subject?: string; // Mata Pelajaran (opsional)
  teacherName?: string; // Nama Guru Pengajar (opsional)
  teacherNip?: string; // NIP / Kode Guru
  status: TeacherAgendaStatus; // Hadir, Izin, Sakit, Tugas, Alpa
  topic: string; // Materi Pokok / Bahasan yang diajarkan
  presentStudentsCount?: number; // Jumlah Siswa Hadir
  absentStudentsCount?: number; // Jumlah Siswa Tidak Hadir
  notes?: string; // Catatan kejadian / kondisi kelas
  hasAssignment?: boolean; // Ada tugas
  assignmentDetails?: string; // Keterangan tugas jika guru berhalangan
  signatureVerified?: boolean; // Status paraf / verifikasi
  createdAt?: string;
  updatedAt?: string;
}

