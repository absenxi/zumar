import { Student, SchoolSettings, AttendanceEntry, TeacherAgendaEntry, Teacher, Subject } from '../types';

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_TEACHERS: Teacher[] = [];

export const DEFAULT_SUBJECTS: string[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INDONESIAN_DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function generateSampleTeacherAgenda(
  _year?: number,
  _monthIndex?: number,
  _className = 'X TJKT 3'
): TeacherAgendaEntry[] {
  // Data agenda guru default dibuat kosong murni (clean slate)
  return [];
}

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SMKS NUSANTARA 1 CIPUTAT',
  foundationName: 'YAYASAN SMKS NUSANTARA 1 CIPUTAT',
  className: 'X TJKT 3',
  academicYear: '2026/2027',
  locationName: 'Ciputat',
  principalName: 'Drs. H. M. Nursalam, M.M.',
  principalNip: '-',
  teacherName: 'Wali Kelas X TJKT 3',
  teacherNip: '-',
  homeroomTeacher: 'Wali Kelas X TJKT 3',
  homeroomTeacherNip: '-',
  studyProgram: 'Teknik Jaringan Komputer dan Telekomunikasi',
  semester: 'GENAP',
  reportPlaceDate: 'Ciputat, 31 Januari 2026',
  headOfDepartment: '',
  headOfDepartmentNip: '-',
  classLeader: '',
  signatureDate: '13 Juli 2026',
  // Coordinates for SMKS Nusantara 1 Ciputat
  schoolLat: -6.31250,
  schoolLng: 106.74830,
  allowedRadiusMeters: 200,
  attendancePassword: '1234',
  adminPassword: 'admin',
  superAdminPassword: 'superadmin',
  requirePassword: true,
  whatsappGatewayProvider: 'fonnte',
  whatsappApiToken: '',
  whatsappEndpointUrl: 'https://api.fonnte.com/send',
  whatsappTestTarget: '',
  whatsappTestTargetType: 'group',
  whatsappTargetList: [],
  autoSendWhatsAppOnComplete: false,
  autoSendWhatsAppTargetId: '',
  autoSendWhatsAppTargetIds: [],
  autoSendWhatsAppCustomGreeting: '',
  lastAutoSentDate: '',
  whatsappGroupMessageTemplate: '',
  whatsappPersonalMessageTemplate: '',
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Generate realistic initial attendance entries for the given month
 */
export function generateSampleAttendance(
  students: Student[],
  year: number,
  monthIndex: number
): Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>> {
  // result structure: { [studentId]: { [day]: status } }
  const result: Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>> = {};
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  students.forEach((student) => {
    result[student.id] = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIndex, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat

      // Weekends off
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        result[student.id][day] = '-';
        continue;
      }

      // Random realistic attendance
      // 90% Hadir, 4% Sakit, 3% Izin, 3% Alpa
      const studentHash = (parseInt(student.id, 10) * 17 + day * 31 + monthIndex * 7) % 100;
      if (studentHash < 88) {
        result[student.id][day] = 'H';
      } else if (studentHash < 93) {
        result[student.id][day] = 'S';
      } else if (studentHash < 97) {
        result[student.id][day] = 'I';
      } else {
        result[student.id][day] = 'A';
      }
    }
  });

  return result;
}
