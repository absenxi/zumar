import { Student, SchoolSettings, HomeroomMonthlyReportData } from '../types';
import { MONTH_NAMES } from '../data/initialData';

/**
 * Export Monthly Attendance Recap to CSV
 */
export function exportToCSV(
  students: Student[],
  schoolSettings: SchoolSettings,
  selectedMonthName: string,
  selectedYear: number,
  attendanceData: Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>>,
  daysInMonth: number
) {
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

  // Title header
  csvContent += `REKAP ABSENSI SISWA KELAS ${schoolSettings.className}\n`;
  csvContent += `${schoolSettings.schoolName} - ${schoolSettings.foundationName}\n`;
  csvContent += `BULAN: ${selectedMonthName} ${selectedYear}\n\n`;

  // Table Headers
  const headerDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).join(',');
  csvContent += `NO,NAMA SISWA,JENIS KELAMIN,WA ORANG TUA,ALAMAT,CATATAN,${headerDays},HADIR,ALPA,SAKIT,IZIN,PERSENTASE\n`;

  // Rows
  students.forEach((s) => {
    const studentData = attendanceData[s.id] || {};
    let countH = 0;
    let countA = 0;
    let countS = 0;
    let countI = 0;
    let totalActiveDays = 0;

    const daysStatuses = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const status = studentData[dayNum] || '-';
      if (status === 'H') countH++;
      if (status === 'A') countA++;
      if (status === 'S') countS++;
      if (status === 'I') countI++;
      if (status !== '-') totalActiveDays++;
      return status;
    }).join(',');

    const pct = totalActiveDays > 0 ? Math.round((countH / totalActiveDays) * 100) : 0;

    // Escaped text values
    const cleanName = `"${(s.name || '').replace(/"/g, '""')}"`;
    const cleanWa = `"${(s.parentWhatsapp || '').replace(/"/g, '""')}"`;
    const cleanAddress = `"${(s.address || '').replace(/"/g, '""')}"`;
    const cleanNote = `"${(s.note || '').replace(/"/g, '""')}"`;

    csvContent += `${s.no},${cleanName},${s.gender},${cleanWa},${cleanAddress},${cleanNote},${daysStatuses},${countH},${countA},${countS},${countI},${pct}%\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `Rekap_Absensi_Kelas_${schoolSettings.className}_${selectedMonthName}_${selectedYear}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger Native Browser Print Dialog (With option to Save as PDF)
 */
export function triggerPrint() {
  window.print();
}

/**
 * Helper to download a string as a Word file (.doc)
 */
function downloadWordDoc(
  htmlContent: string,
  fileName: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  const isLandscape = orientation === 'landscape';
  const pageCss = isLandscape
    ? `
@page {
  size: 29.7cm 21.0cm;
  margin: 1.0cm 1.0cm 1.0cm 1.0cm;
  mso-page-orientation: landscape;
}
@page WordSection1 {
  size: 841.9pt 595.3pt;
  margin: 1.0cm 1.0cm 1.0cm 1.0cm;
  mso-page-orientation: landscape;
}
div.WordSection1 {
  page: WordSection1;
}`
    : `
@page {
  size: 21.0cm 29.7cm;
  margin: 1.5cm 1.5cm 1.5cm 1.5cm;
  mso-page-orientation: portrait;
}
@page WordSection1 {
  size: 595.3pt 841.9pt;
  margin: 1.5cm 1.5cm 1.5cm 1.5cm;
  mso-page-orientation: portrait;
}
div.WordSection1 {
  page: WordSection1;
}`;

  const fileHeader = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
${pageCss}
body {
  font-family: 'Arial', 'Calibri', 'Times New Roman', sans-serif;
  font-size: 11pt;
  line-height: 1.35;
  color: #000000;
}
.page-title {
  text-align: center;
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 14px;
  text-transform: uppercase;
}
.meta-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}
.meta-table td {
  padding: 2px 0;
  font-size: 10.5pt;
  vertical-align: top;
}
.dotted-value {
  border-bottom: 1px dotted #000000;
  display: inline-block;
  min-width: 120px;
  padding-bottom: 1px;
}
.section-item {
  margin-bottom: 8px;
  font-size: 10.5pt;
}
.subgrid {
  width: 100%;
  border-collapse: collapse;
  margin-top: 3px;
  margin-bottom: 4px;
}
.subgrid td {
  padding: 2px 4px;
  font-size: 10pt;
  vertical-align: top;
}
.sign-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
}
.sign-table td {
  text-align: center;
  font-size: 10.5pt;
  vertical-align: top;
}
.table-data {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.table-data th, .table-data td {
  border: 1px solid #000000;
  padding: 4px 5px;
  font-size: 9pt;
  text-align: center;
}
.table-data th {
  background-color: #f0f0f0;
  font-weight: bold;
}
</style>
</head>
<body>
<div class="WordSection1">
${htmlContent}
</div>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + fileHeader], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Homeroom Teacher Monthly Report to Microsoft Word (.doc)
 */
export function exportHomeroomReportToWord(
  formData: HomeroomMonthlyReportData,
  schoolSettings: SchoolSettings,
  attendanceAnalytics?: {
    perfectStudentsCount?: number;
    overallPercentage?: string;
    absentStudentsCount?: number;
    sickStudentsCount?: number;
    permissionStudentsCount?: number;
  }
) {
  const schoolName = (schoolSettings.schoolName || formData.schoolName || 'SMKS NUSANTARA 1 CIPUTAT').toUpperCase();
  const homeroomTeacher = schoolSettings.teacherName || formData.homeroomTeacher || '....................................';
  const classLeader = schoolSettings.classLeader || formData.classLeader || '....................................';
  const majorClass = schoolSettings.className || formData.majorClass || 'X TJKT 3';
  const month = formData.month || 'Oktober 2026';
  const perfectCount = attendanceAnalytics?.perfectStudentsCount ?? 0;

  const renderFourItemsSubTable = (items: string[]) => `
    <table style="width: 100%; border-collapse: collapse; margin: 0; border: none;">
      <tr>
        <td style="width: 18px; vertical-align: bottom; padding: 1px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">1.</td>
        <td style="width: 46%; vertical-align: bottom; border: none; border-bottom: 1pt dotted #000000; padding: 1px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${items[0] || '&nbsp;'}</td>
        <td style="width: 24px; border: none;">&nbsp;</td>
        <td style="width: 18px; vertical-align: bottom; padding: 1px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">2.</td>
        <td style="width: 46%; vertical-align: bottom; border: none; border-bottom: 1pt dotted #000000; padding: 1px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${items[1] || '&nbsp;'}</td>
      </tr>
      <tr>
        <td style="width: 18px; vertical-align: bottom; padding: 6px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">3.</td>
        <td style="width: 46%; vertical-align: bottom; border: none; border-bottom: 1pt dotted #000000; padding: 6px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${items[2] || '&nbsp;'}</td>
        <td style="width: 24px; border: none;">&nbsp;</td>
        <td style="width: 18px; vertical-align: bottom; padding: 6px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">4.</td>
        <td style="width: 46%; vertical-align: bottom; border: none; border-bottom: 1pt dotted #000000; padding: 6px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${items[3] || '&nbsp;'}</td>
      </tr>
    </table>
  `;

  const html = `
  <div style="font-family: 'Times New Roman', Times, serif; color: #000000; font-size: 10.5pt; line-height: 1.3;">
    <!-- Judul Dokumen -->
    <div style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 12.5pt; font-weight: bold; text-decoration: underline; margin-bottom: 16px; text-transform: uppercase;">
      LAPORAN BULANAN WALI KELAS ${schoolName}
    </div>

    <!-- Tabel Identitas Atas (2 Kolom Kiri & Kanan dengan Garis Bawah Solid) -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">
      <tr>
        <td style="width: 20%; font-weight: bold; padding: 3px 0; vertical-align: bottom; border: none;">NAMA WALI KELAS</td>
        <td style="width: 2%; font-weight: bold; padding: 3px 2px; vertical-align: bottom; border: none;">:</td>
        <td style="width: 29%; font-weight: bold; border: none; border-bottom: 1pt solid #000000; padding: 3px 2px; vertical-align: bottom;">${homeroomTeacher}</td>
        <td style="width: 5%; border: none;">&nbsp;</td>
        <td style="width: 16%; font-weight: bold; padding: 3px 0; vertical-align: bottom; border: none;">KETUA KELAS</td>
        <td style="width: 2%; font-weight: bold; padding: 3px 2px; vertical-align: bottom; border: none;">:</td>
        <td style="width: 26%; font-weight: bold; border: none; border-bottom: 1pt solid #000000; padding: 3px 2px; vertical-align: bottom;">${classLeader}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; padding: 7px 0 3px 0; vertical-align: bottom; border: none;">JURUSAN/KELAS</td>
        <td style="font-weight: bold; padding: 7px 2px 3px 2px; vertical-align: bottom; border: none;">:</td>
        <td style="font-weight: bold; border: none; border-bottom: 1pt solid #000000; padding: 7px 2px 3px 2px; vertical-align: bottom;">${majorClass}</td>
        <td style="border: none;">&nbsp;</td>
        <td style="font-weight: bold; padding: 7px 0 3px 0; vertical-align: bottom; border: none;">BULAN</td>
        <td style="font-weight: bold; padding: 7px 2px 3px 2px; vertical-align: bottom; border: none;">:</td>
        <td style="font-weight: bold; border: none; border-bottom: 1pt solid #000000; padding: 7px 2px 3px 2px; vertical-align: bottom;">${month}</td>
      </tr>
    </table>

    <!-- Daftar Poin 1 s.d. 11 -->
    <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">
      <!-- 1. Prosentase kehadiran siswa bulan ini -->
      <tr>
        <td style="width: 22px; vertical-align: bottom; padding: 4px 0 6px 0; border: none;">1.</td>
        <td colspan="3" style="vertical-align: bottom; padding: 4px 0 6px 0; border: none;">
          <table style="border-collapse: collapse; border: none;">
            <tr>
              <td style="padding: 0; vertical-align: bottom; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">Prosentase kehadiran siswa bulan ini &nbsp;:&nbsp;</td>
              <td style="width: 45px; border: none; border-bottom: 1pt solid #000000; text-align: center; font-weight: bold; padding: 0 4px; vertical-align: bottom; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
                ${formData.attendancePercentage ? formData.attendancePercentage : '____'}
              </td>
              <td style="padding: 0 0 0 4px; vertical-align: bottom; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">%</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 2. Siswa yang sering terlambat -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 8px; border: none;">2.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 8px; border: none;">Siswa yang sering terlambat</td>
        <td style="width: 10px; vertical-align: top; padding-top: 8px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 6px; border: none;">
          ${renderFourItemsSubTable(formData.oftenLateStudents)}
        </td>
      </tr>

      <!-- 3. Siswa yang sering alpa/tidak masuk -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">3.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Siswa yang sering alpa/tidak masuk</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.oftenAbsentStudents)}
        </td>
      </tr>

      <!-- 4. Siswa yang sering sakit -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">4.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Siswa yang sering sakit</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.oftenSickStudents)}
        </td>
      </tr>

      <!-- 5. Siswa yang sering terlambat / izin -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">5.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Siswa yang sering terlambat / izin</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.oftenLateOrPermissionStudents)}
        </td>
      </tr>

      <!-- 6. Siswa masuk terus/hadir 100 % -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">6.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">
          Siswa masuk terus/hadir 100 %
          ${perfectCount > 0 ? `<br><span style="font-size: 8.5pt; font-weight: bold; color: #065f46;">(Total: ${perfectCount} Siswa)</span>` : ''}
        </td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.perfectAttendanceStudents)}
        </td>
      </tr>

      <!-- 7. Guru yang sering datang terlambat -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">7.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Guru yang sering datang terlambat</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.oftenLateTeachers)}
        </td>
      </tr>

      <!-- 8. Guru yang sering tidak masuk -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">8.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Guru yang sering tidak masuk</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.oftenAbsentTeachers)}
        </td>
      </tr>

      <!-- 9. Guru yang masuk terus /100 % -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 9px; border: none;">9.</td>
        <td style="width: 210px; vertical-align: top; padding-top: 9px; border: none;">Guru yang masuk terus /100 %</td>
        <td style="width: 10px; vertical-align: top; padding-top: 9px; border: none;">:</td>
        <td style="vertical-align: top; padding-top: 7px; border: none;">
          ${renderFourItemsSubTable(formData.perfectAttendanceTeachers)}
        </td>
      </tr>

      <!-- 10. Kasus yang up-date bulan ini dan penanganannya -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 10px; border: none;">10.</td>
        <td colspan="3" style="vertical-align: top; padding-top: 10px; border: none;">
          <div style="font-weight: bold; margin-bottom: 3px;">Kasus yang up-date bulan ini dan penanganannya :</div>
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="width: 18px; vertical-align: bottom; padding: 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">a.</td>
              <td style="border: none; border-bottom: 1pt dotted #000000; vertical-align: bottom; padding: 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${formData.monthlyCases[0] || '&nbsp;'}</td>
            </tr>
            <tr>
              <td style="width: 18px; vertical-align: bottom; padding: 5px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">b.</td>
              <td style="border: none; border-bottom: 1pt dotted #000000; vertical-align: bottom; padding: 5px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${formData.monthlyCases[1] || '&nbsp;'}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 11. Penilaian sendiri/Self evaluation wali kelas -->
      <tr>
        <td style="width: 22px; vertical-align: top; padding-top: 10px; border: none;">11.</td>
        <td colspan="3" style="vertical-align: top; padding-top: 10px; border: none;">
          <div style="font-weight: bold; margin-bottom: 3px;">
            Penilaian sendiri/Self evaluation wali kelas tentang disiplin, tugas mengajar, pendampingan dengan siswa :
          </div>
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="width: 18px; vertical-align: bottom; padding: 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">a.</td>
              <td style="border: none; border-bottom: 1pt dotted #000000; vertical-align: bottom; padding: 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${formData.selfEvaluation[0] || '&nbsp;'}</td>
            </tr>
            <tr>
              <td style="width: 18px; vertical-align: bottom; padding: 5px 0 2px 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">b.</td>
              <td style="border: none; border-bottom: 1pt dotted #000000; vertical-align: bottom; padding: 5px 4px 2px 4px; font-family: 'Times New Roman', Times, serif; font-size: 10pt;">${formData.selfEvaluation[1] || '&nbsp;'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Bagian Tanda Tangan -->
    <div style="margin-top: 18px; text-align: right; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; margin-bottom: 4px;">
      ${formData.signatureLocation || schoolSettings.locationName || 'Ciputat'}, ${formData.signatureDate || month}
    </div>

    <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; border: none;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
          <b>Wali Kelas</b>
          <br><br><br>
          <table style="margin: 0 auto; border-collapse: collapse; border: none;">
            <tr>
              <td style="border: none; border-bottom: 1pt solid #000000; font-weight: bold; padding: 0 12px 2px 12px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
                ( ${schoolSettings.teacherName || homeroomTeacher} )
              </td>
            </tr>
            <tr>
              <td style="border: none; padding-top: 2px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; color: #334155;">
                NIP. ${schoolSettings.teacherNip || '-'}
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
          <b>Ketua Kelas</b>
          <br><br><br>
          <table style="margin: 0 auto; border-collapse: collapse; border: none;">
            <tr>
              <td style="border: none; border-bottom: 1pt solid #000000; font-weight: bold; padding: 0 12px 2px 12px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
                ( ${schoolSettings.classLeader || formData.classLeader || '....................................'} )
              </td>
            </tr>
            <tr>
              <td style="border: none; padding-top: 2px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; color: #334155;">
                Siswa Kelas ${majorClass}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center; padding-top: 14px; vertical-align: top; border: none;">
          <b>Mengetahui,</b><br>
          <b>Ketua Jurusan</b>
          <br><br><br>
          <table style="margin: 0 auto; border-collapse: collapse; border: none;">
            <tr>
              <td style="border: none; border-bottom: 1pt solid #000000; font-weight: bold; padding: 0 14px 2px 14px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt;">
                ( ${schoolSettings.headOfDepartment || formData.headOfDepartment || '....................................'} )
              </td>
            </tr>
            ${
              schoolSettings.headOfDepartmentNip &&
              schoolSettings.headOfDepartmentNip !== '-' &&
              schoolSettings.headOfDepartmentNip.trim() !== ''
                ? `<tr>
                    <td style="border: none; padding-top: 2px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; color: #334155;">
                      NIP. ${schoolSettings.headOfDepartmentNip}
                    </td>
                  </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;

  const fileName = `Laporan_Bulanan_Wali_Kelas_${(majorClass || 'Kelas').replace(/\s+/g, '_')}_${(month || 'Bulan').replace(/\s+/g, '_')}.doc`;
  downloadWordDoc(html, fileName, 'portrait');
}

/**
 * Export Full Monthly Attendance Recap Table to Microsoft Word (.doc) in Landscape
 */
export function exportRecapToWord(
  students: Student[],
  schoolSettings: SchoolSettings,
  selectedMonthName: string,
  selectedYear: number,
  attendanceData: Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>>,
  daysInMonth: number
) {
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  let tableHeaderDays = '';
  dateArray.forEach((d) => {
    tableHeaderDays += `<th style="width: 18px; font-size: 8pt;">${d}</th>`;
  });

  let rowsHtml = '';
  students.forEach((s, idx) => {
    const sData = attendanceData[s.id] || {};
    let countH = 0;
    let countS = 0;
    let countI = 0;
    let countA = 0;
    let totalActive = 0;

    let dayCells = '';
    dateArray.forEach((d) => {
      const st = sData[d] || '-';
      if (st === 'H') countH++;
      if (st === 'S') countS++;
      if (st === 'I') countI++;
      if (st === 'A') countA++;
      if (st !== '-') totalActive++;

      const color = st === 'H' ? '#15803d' : st === 'S' ? '#0369a1' : st === 'I' ? '#b45309' : st === 'A' ? '#b91c1c' : '#94a3b8';
      dayCells += `<td style="font-size: 8pt; color: ${color}; font-weight: bold;">${st}</td>`;
    });

    const pct = totalActive > 0 ? Math.round((countH / totalActive) * 100) : 0;

    rowsHtml += `
    <tr>
      <td>${idx + 1}</td>
      <td style="text-align: left; font-weight: bold;">${s.name}</td>
      <td>${s.gender}</td>
      ${dayCells}
      <td style="background-color: #dcfce7; font-weight: bold; color: #166534;">${countH}</td>
      <td style="background-color: #e0f2fe; font-weight: bold; color: #075985;">${countS}</td>
      <td style="background-color: #fef3c7; font-weight: bold; color: #92400e;">${countI}</td>
      <td style="background-color: #fee2e2; font-weight: bold; color: #991b1b;">${countA}</td>
      <td style="font-weight: bold;">${pct}%</td>
    </tr>
    `;
  });

  const now = new Date();
  const exportDateStr = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const html = `
  <div style="text-align: center; margin-bottom: 12px;">
    <h2 style="margin: 0; text-transform: uppercase; font-size: 14pt;">${schoolSettings.schoolName}</h2>
    <h3 style="margin: 2px 0; font-size: 12pt;">REKAPITULASI ABSENSI SISWA KELAS ${schoolSettings.className}</h3>
    <p style="margin: 0; font-size: 10pt;">Bulan: <b>${selectedMonthName} ${selectedYear}</b> • Tahun Ajaran: ${schoolSettings.academicYear}</p>
  </div>

  <table class="table-data">
    <thead>
      <tr>
        <th rowspan="2" style="width: 25px;">NO</th>
        <th rowspan="2" style="width: 180px; text-align: left;">NAMA SISWA</th>
        <th rowspan="2" style="width: 30px;">L/P</th>
        <th colspan="${daysInMonth}">TANGGAL</th>
        <th colspan="4">REKAPITULASI</th>
        <th rowspan="2" style="width: 40px;">%</th>
      </tr>
      <tr>
        ${tableHeaderDays}
        <th style="width: 22px; background-color: #bbf7d0;">H</th>
        <th style="width: 22px; background-color: #bae6fd;">S</th>
        <th style="width: 22px; background-color: #fde68a;">I</th>
        <th style="width: 22px; background-color: #fecaca;">A</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- Tanda Tangan -->
  <table class="sign-table" style="margin-top: 30px; width: 100%;">
    <tr>
      <td style="width: 25%; text-align: center; vertical-align: top;">
        Mengetahui,<br>
        Kepala Sekolah<br><br><br><br><br>
        <b><u>${schoolSettings.principalName}</u></b><br>
        NIP. ${schoolSettings.principalNip || '-'}
      </td>
      <td style="width: 25%; text-align: center; vertical-align: top;">
        Mengetahui,<br>
        Ketua Jurusan<br><br><br><br><br>
        <b><u>${schoolSettings.headOfDepartment || '...........................................'}</u></b><br>
        NIP. ${schoolSettings.headOfDepartmentNip || '-'}
      </td>
      <td style="width: 25%; text-align: center; vertical-align: top;">
        ${schoolSettings.reportPlaceDate || schoolSettings.locationName || 'Ciputat'}, ${exportDateStr}<br>
        Wali Kelas ${schoolSettings.className}<br><br><br><br><br>
        <b><u>${schoolSettings.homeroomTeacher || schoolSettings.teacherName || 'Wali Kelas'}</u></b><br>
        NIP. ${schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '-'}
      </td>
      <td style="width: 25%; text-align: center; vertical-align: top;">
        <br>
        Ketua Kelas ${schoolSettings.className}<br><br><br><br><br>
        <b><u>${schoolSettings.classLeader || '...........................................'}</u></b><br>
        Siswa Kelas ${schoolSettings.className}
      </td>
    </tr>
  </table>
  `;

  const fileName = `Rekap_Absensi_Kelas_${schoolSettings.className}_${selectedMonthName}_${selectedYear}.doc`;
  downloadWordDoc(html, fileName, 'landscape');
}

/**
 * Export Monthly Student Absence Recap to Microsoft Word (.doc)
 * Matched strictly to the official "KETIDAK HADIRAN" table layout
 */
export function exportMonthlyAbsenceRecapToWord(
  recapList: {
    no: number;
    name: string;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
  }[],
  totals: {
    sumSakit: number;
    sumIzin: number;
    sumAlpa: number;
    grandTotal: number;
  },
  schoolSettings: SchoolSettings,
  monthName: string,
  year: number,
  showZeroAsDash: boolean = true
) {
  const daysInMonth = new Date(year, MONTH_NAMES.indexOf(monthName) + 1, 0).getDate();
  const formatVal = (val: number) => (val === 0 ? (showZeroAsDash ? '-' : '0') : String(val));

  const tableRows = recapList
    .map(
      (s, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#f9fbfd' : '#ffffff'};">
      <td style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px; font-size: 10pt;">${idx + 1}</td>
      <td style="border: 1px solid #000000; text-align: left; vertical-align: middle; padding: 4px 8px; font-size: 10pt; font-weight: bold; text-transform: uppercase;">${s.name}</td>
      <td style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px; font-size: 10pt; color: ${s.sakit > 0 ? '#b45309' : '#000000'}; font-weight: ${s.sakit > 0 ? 'bold' : 'normal'};">${formatVal(s.sakit)}</td>
      <td style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px; font-size: 10pt; color: ${s.izin > 0 ? '#1d4ed8' : '#000000'}; font-weight: ${s.izin > 0 ? 'bold' : 'normal'};">${formatVal(s.izin)}</td>
      <td style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px; font-size: 10pt; color: ${s.alpa > 0 ? '#be123c' : '#000000'}; font-weight: ${s.alpa > 0 ? 'bold' : 'normal'};">${formatVal(s.alpa)}</td>
      <td style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px; font-size: 10.5pt; font-weight: bold; background-color: #f1f5f9;">${formatVal(s.total)}</td>
    </tr>
  `
    )
    .join('');

  const html = `
  <div style="text-align: center; margin-bottom: 16px;">
    <div style="font-size: 14pt; font-weight: bold; letter-spacing: 1px; color: #000000; margin-bottom: 4px;">
      KETIDAK HADIRAN
    </div>
    <div style="font-size: 10pt; color: #333333; font-weight: normal; margin-top: 4px;">
      BULAN: <b>${monthName.toUpperCase()} ${year}</b> &nbsp;|&nbsp; 
      KELAS: <b>${schoolSettings.className}</b> &nbsp;|&nbsp; 
      SEKOLAH: <b>${schoolSettings.schoolName}</b>
      ${schoolSettings.academicYear ? `&nbsp;|&nbsp; TAHUN AJARAN: <b>${schoolSettings.academicYear}</b>` : ''}
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-family: Arial, sans-serif;" border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr style="background-color: #95B3D7; text-align: center; font-weight: bold; color: #000000;">
        <th rowspan="2" style="border: 1px solid #000000; width: 45px; text-align: center; vertical-align: middle; padding: 6px 4px; font-size: 10pt;">NO.</th>
        <th rowspan="2" style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 6px 8px; font-size: 10pt;">NAMA SISWA</th>
        <th colspan="3" style="border: 1px solid #000000; text-align: center; vertical-align: middle; padding: 6px 4px; font-size: 10pt;">KETERANGAN</th>
        <th rowspan="2" style="border: 1px solid #000000; width: 70px; text-align: center; vertical-align: middle; padding: 6px 4px; font-size: 10pt;">TOTAL</th>
      </tr>
      <tr style="background-color: #95B3D7; text-align: center; font-weight: bold; color: #000000;">
        <th style="border: 1px solid #000000; width: 65px; text-align: center; vertical-align: middle; padding: 5px 4px; font-size: 9.5pt;">SAKIT</th>
        <th style="border: 1px solid #000000; width: 65px; text-align: center; vertical-align: middle; padding: 5px 4px; font-size: 9.5pt;">IZIN</th>
        <th style="border: 1px solid #000000; width: 65px; text-align: center; vertical-align: middle; padding: 5px 4px; font-size: 9.5pt;">ALPA</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #B8CCE4; font-weight: bold; color: #000000;">
        <td colspan="2" style="border: 1px solid #000000; text-align: center; padding: 6px 8px; font-size: 10pt; font-weight: bold;">JUMLAH / TOTAL KESELURUHAN</td>
        <td style="border: 1px solid #000000; text-align: center; padding: 6px; font-size: 10pt; font-weight: bold;">${totals.sumSakit}</td>
        <td style="border: 1px solid #000000; text-align: center; padding: 6px; font-size: 10pt; font-weight: bold;">${totals.sumIzin}</td>
        <td style="border: 1px solid #000000; text-align: center; padding: 6px; font-size: 10pt; font-weight: bold;">${totals.sumAlpa}</td>
        <td style="border: 1px solid #000000; text-align: center; padding: 6px; font-size: 11pt; font-weight: bold; background-color: #A6C0DE;">${totals.grandTotal}</td>
      </tr>
    </tfoot>
  </table>

  <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-family: Arial, sans-serif; font-size: 10pt;" border="0">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        Mengetahui,<br>
        <b>Kepala Sekolah</b><br><br><br><br><br>
        <b><u>${schoolSettings.principalName || '................................................'}</u></b><br>
        NIP. ${schoolSettings.principalNip || '-'}
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        ${schoolSettings.locationName || schoolSettings.reportPlaceDate || 'Seruway'}, ${daysInMonth} ${monthName} ${year}<br>
        <b>Wali Kelas ${schoolSettings.className}</b><br><br><br><br><br>
        <b><u>${schoolSettings.homeroomTeacher || schoolSettings.teacherName || '................................................'}</u></b><br>
        NIP. ${schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '-'}
      </td>
    </tr>
  </table>
  `;

  const fileName = `Rekap_Ketidakhadiran_Kelas_${schoolSettings.className}_${monthName}_${year}.doc`;
  downloadWordDoc(html, fileName);
}

/**
 * Interface for Semester Student Absence Recap
 */
export interface SemesterStudentRecapItem {
  id: string;
  no: number;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  parentWhatsapp?: string;
  monthly: Record<number, { s: number; i: number; a: number }>;
  totalSemester: { s: number; i: number; a: number; jumlah: number };
}

export interface SemesterTotals {
  monthly: Record<number, { s: number; i: number; a: number }>;
  totalSemester: { s: number; i: number; a: number; jumlah: number };
}

/**
 * Export Semester Absence Recap to CSV (Matching the Excel format in rekap.jpg)
 */
export function exportSemesterAbsenceRecapToCSV(
  students: SemesterStudentRecapItem[],
  totals: SemesterTotals,
  schoolSettings: SchoolSettings,
  semesterName: string,
  yearText: string,
  months: { name: string; index: number }[]
) {
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += `REKAP KETIDAKHADIRAN SISWA\n`;
  csvContent += `${schoolSettings.schoolName} - KELAS ${schoolSettings.className}\n`;
  csvContent += `SEMESTER: ${semesterName} - TAHUN / TAHUN AJARAN: ${yearText}\n\n`;

  // Row 1 Header: No, NISN, Nama Siswa, [Month, , ,] x 6, Total Semester, , ,
  const r1: string[] = ['No', 'NISN', 'Nama Siswa'];
  months.forEach((m) => {
    r1.push(`"${m.name}"`, '', '');
  });
  r1.push('"Total Semester"', '', '', '');
  csvContent += r1.join(',') + '\n';

  // Row 2 Header
  const r2: string[] = ['', '', ''];
  months.forEach(() => {
    r2.push('S', 'I', 'A');
  });
  r2.push('S', 'I', 'A', 'Jumlah');
  csvContent += r2.join(',') + '\n';

  // Data rows
  students.forEach((s, idx) => {
    const row: string[] = [
      String(idx + 1),
      `"${s.nisn || '-'}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
    ];
    months.forEach((m) => {
      const stats = s.monthly[m.index] || { s: 0, i: 0, a: 0 };
      row.push(String(stats.s), String(stats.i), String(stats.a));
    });
    row.push(
      String(s.totalSemester.s),
      String(s.totalSemester.i),
      String(s.totalSemester.a),
      String(s.totalSemester.jumlah)
    );
    csvContent += row.join(',') + '\n';
  });

  // TOTAL Row
  const totalRow: string[] = ['TOTAL', '', ''];
  months.forEach((m) => {
    const mTot = totals.monthly[m.index] || { s: 0, i: 0, a: 0 };
    totalRow.push(String(mTot.s), String(mTot.i), String(mTot.a));
  });
  totalRow.push(
    String(totals.totalSemester.s),
    String(totals.totalSemester.i),
    String(totals.totalSemester.a),
    String(totals.totalSemester.jumlah)
  );
  csvContent += totalRow.join(',') + '\n';

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `Rekap_Ketidakhadiran_Semester_${schoolSettings.className}_${semesterName.replace(/\s+/g, '_')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Semester Absence Recap to Microsoft Word (.doc) matching the rekap.jpg format
 */
export function exportSemesterAbsenceRecapToWord(
  students: SemesterStudentRecapItem[],
  totals: SemesterTotals,
  schoolSettings: SchoolSettings,
  semesterName: string,
  yearText: string,
  months: { name: string; index: number }[],
  showZeroAsBlank: boolean = true
) {
  const formatVal = (val: number) => (val === 0 ? (showZeroAsBlank ? '' : '0') : String(val));

  const tableRows = students
    .map((s, idx) => {
      const monthCells = months
        .map((m) => {
          const stats = s.monthly[m.index] || { s: 0, i: 0, a: 0 };
          return `
            <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 8.5pt;">${formatVal(stats.s)}</td>
            <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 8.5pt;">${formatVal(stats.i)}</td>
            <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 8.5pt;">${formatVal(stats.a)}</td>
          `;
        })
        .join('');

      return `
        <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px; font-size: 9pt;">${idx + 1}</td>
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px; font-size: 8.5pt; font-family: monospace;">${s.nisn || '-'}</td>
          <td style="border: 1px solid #7f9ec7; text-align: left; vertical-align: middle; padding: 4px 6px; font-size: 9pt; font-weight: bold; text-transform: uppercase;">${s.name}</td>
          ${monthCells}
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 9pt; font-weight: bold;">${formatVal(s.totalSemester.s)}</td>
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 9pt; font-weight: bold;">${formatVal(s.totalSemester.i)}</td>
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 9pt; font-weight: bold;">${formatVal(s.totalSemester.a)}</td>
          <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 4px 2px; font-size: 9pt; font-weight: bold; background-color: #e2e8f0;">${formatVal(s.totalSemester.jumlah)}</td>
        </tr>
      `;
    })
    .join('');

  const monthTotalCells = months
    .map((m) => {
      const mTot = totals.monthly[m.index] || { s: 0, i: 0, a: 0 };
      return `
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 5px 2px; font-size: 9pt; font-weight: bold;">${formatVal(mTot.s)}</td>
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 5px 2px; font-size: 9pt; font-weight: bold;">${formatVal(mTot.i)}</td>
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 5px 2px; font-size: 9pt; font-weight: bold;">${formatVal(mTot.a)}</td>
      `;
    })
    .join('');

  const monthsHeaderRow1 = months
    .map(
      (m) =>
        `<th colspan="3" style="border: 1px solid #ffffff; background-color: #2F5597; color: #ffffff; font-weight: bold; text-align: center; padding: 6px 2px; font-size: 9pt;">${m.name}</th>`
    )
    .join('');

  const monthsHeaderRow2 = months
    .map(
      () =>
        `<th style="border: 1px solid #ffffff; background-color: #2F5597; color: #ffffff; font-weight: bold; text-align: center; padding: 4px 2px; font-size: 8.5pt;">S</th>
         <th style="border: 1px solid #ffffff; background-color: #2F5597; color: #ffffff; font-weight: bold; text-align: center; padding: 4px 2px; font-size: 8.5pt;">I</th>
         <th style="border: 1px solid #ffffff; background-color: #2F5597; color: #ffffff; font-weight: bold; text-align: center; padding: 4px 2px; font-size: 8.5pt;">A</th>`
    )
    .join('');

  const now = new Date();
  const exportDateStr = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const html = `
  <div style="text-align: center; margin-bottom: 14px;">
    <h2 style="margin: 0; text-transform: uppercase; font-size: 14pt; font-weight: bold; color: #1e3a8a;">${schoolSettings.schoolName}</h2>
    <h3 style="margin: 3px 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">REKAPITULASI KETIDAKHADIRAN SISWA</h3>
    <p style="margin: 0; font-size: 9.5pt; color: #333333;">
      KELAS: <b>${schoolSettings.className}</b> &nbsp;|&nbsp; 
      SEMESTER: <b>${semesterName.toUpperCase()}</b> &nbsp;|&nbsp; 
      TAHUN AJARAN: <b>${yearText}</b>
    </p>
  </div>

  <table border="1" cellpadding="3" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1.5px solid #2F5597; font-family: Arial, sans-serif;">
    <thead>
      <tr style="background-color: #2F5597; color: #ffffff;">
        <th rowspan="2" style="border: 1px solid #ffffff; text-align: center; vertical-align: middle; padding: 6px 3px; font-size: 9pt; width: 28px;">No</th>
        <th rowspan="2" style="border: 1px solid #ffffff; text-align: center; vertical-align: middle; padding: 6px 3px; font-size: 9pt; width: 75px;">NISN</th>
        <th rowspan="2" style="border: 1px solid #ffffff; text-align: center; vertical-align: middle; padding: 6px 6px; font-size: 9.5pt; min-width: 140px;">Nama Siswa</th>
        ${monthsHeaderRow1}
        <th colspan="4" style="border: 1px solid #ffffff; background-color: #2F5597; color: #ffffff; font-weight: bold; text-align: center; padding: 6px 3px; font-size: 9pt;">Total Semester</th>
      </tr>
      <tr style="background-color: #2F5597; color: #ffffff;">
        ${monthsHeaderRow2}
        <th style="border: 1px solid #ffffff; text-align: center; padding: 4px 2px; font-size: 8.5pt;">S</th>
        <th style="border: 1px solid #ffffff; text-align: center; padding: 4px 2px; font-size: 8.5pt;">I</th>
        <th style="border: 1px solid #ffffff; text-align: center; padding: 4px 2px; font-size: 8.5pt;">A</th>
        <th style="border: 1px solid #ffffff; text-align: center; padding: 4px 3px; font-size: 8.5pt;">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: bold; color: #000000;">
        <td colspan="3" style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 6px 6px; font-size: 9.5pt; font-weight: bold; letter-spacing: 1px;">TOTAL</td>
        ${monthTotalCells}
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 6px 2px; font-size: 9.5pt; font-weight: bold;">${formatVal(totals.totalSemester.s)}</td>
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 6px 2px; font-size: 9.5pt; font-weight: bold;">${formatVal(totals.totalSemester.i)}</td>
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 6px 2px; font-size: 9.5pt; font-weight: bold;">${formatVal(totals.totalSemester.a)}</td>
        <td style="border: 1px solid #7f9ec7; text-align: center; vertical-align: middle; padding: 6px 2px; font-size: 9.5pt; font-weight: bold; background-color: #cbd5e1;">${formatVal(totals.totalSemester.jumlah)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Official Signatures Area -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-family: Arial, sans-serif; font-size: 9pt;" border="0">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        Mengetahui,<br>
        <b>Kepala Sekolah</b><br><br><br><br>
        <b><u>${schoolSettings.principalName || '................................................'}</u></b><br>
        NIP. ${schoolSettings.principalNip || '-'}
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        ${schoolSettings.locationName || schoolSettings.reportPlaceDate || 'Ciputat'}, ${exportDateStr}<br>
        <b>Wali Kelas ${schoolSettings.className}</b><br><br><br><br>
        <b><u>${schoolSettings.homeroomTeacher || schoolSettings.teacherName || '................................................'}</u></b><br>
        NIP. ${schoolSettings.homeroomTeacherNip || schoolSettings.teacherNip || '-'}
      </td>
    </tr>
  </table>`;

  const fileName = `Rekap_Ketidakhadiran_Semester_${schoolSettings.className}_${semesterName.replace(/\s+/g, '_')}.doc`;
  downloadWordDoc(html, fileName, 'landscape');
}

/**
 * Export 1 Student Semester Attendance Recap to Microsoft Word (.doc)
 * Matches the 6-month vertical table layout per 1 student across 1 semester
 */
export function exportStudentSemesterRecapToWord(
  student: Student | null,
  schoolSettings: SchoolSettings,
  months: { name: string; index: number; year: number }[],
  getMonthAttendanceData: (year: number, monthIdx: number) => Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>>,
  options?: {
    blankTemplate?: boolean;
    showZeroRecap?: boolean;
  }
) {
  const isBlank = options?.blankTemplate || !student;
  const showZero = options?.showZeroRecap ?? false;
  const academicYear = schoolSettings.academicYear || '2026/2027';

  const dateHeaders = Array.from({ length: 31 }, (_, i) => i + 1)
    .map(
      (d) =>
        `<th style="border: 1px solid #000000; background-color: #e6e6e6; width: 18px; font-size: 7.5pt; font-weight: bold; text-align: center; padding: 2px 1px;">${d}</th>`
    )
    .join('');

  const monthBlocksHtml = months
    .map((m, mIdx) => {
      const daysInMonth = new Date(m.year, m.index + 1, 0).getDate();
      const monthData = getMonthAttendanceData(m.year, m.index);
      const studentRecords = !isBlank && student ? monthData[student.id] || {} : {};

      let countH = 0;
      let countS = 0;
      let countI = 0;
      let countA = 0;
      let filledDays = 0;

      const dayCells = Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        if (day > daysInMonth) {
          return `<td style="border: 1px solid #000000; background-color: #bdbdbd; width: 18px; height: 24px;">&nbsp;</td>`;
        }
        if (isBlank) {
          return `<td style="border: 1px solid #000000; width: 18px; height: 24px;">&nbsp;</td>`;
        }
        const st = studentRecords[day] || '-';
        if (st === 'H') {
          countH++;
          filledDays++;
        } else if (st === 'S') {
          countS++;
          filledDays++;
        } else if (st === 'I') {
          countI++;
          filledDays++;
        } else if (st === 'A') {
          countA++;
          filledDays++;
        }

        const displaySt = st === '-' ? '' : st;
        const color =
          st === 'H'
            ? '#166534'
            : st === 'S'
            ? '#075985'
            : st === 'I'
            ? '#92400e'
            : st === 'A'
            ? '#991b1b'
            : '#000000';

        return `<td style="border: 1px solid #000000; width: 18px; height: 24px; font-size: 7.5pt; font-weight: bold; text-align: center; color: ${color};">${displaySt}</td>`;
      }).join('');

      const pct = filledDays > 0 ? `${Math.round((countH / filledDays) * 100)}%` : showZero && !isBlank ? '0%' : '';
      const fmtCount = (val: number) => {
        if (isBlank) return '';
        if (val === 0 && !showZero && filledDays === 0) return '';
        return String(val);
      };

      return `
      <div style="margin-bottom: ${mIdx === months.length - 1 ? '4px' : '12px'}; page-break-inside: avoid;">
        <div style="text-align: center; font-size: 9pt; margin-bottom: 3px; color: #000000;">
          Bulan: <b>${m.name} ${m.year}</b> &bull; Tahun Ajaran: ${academicYear}
        </div>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-family: Arial, sans-serif;" border="1" cellpadding="2" cellspacing="0">
          <thead>
            <tr>
              <th rowspan="2" style="border: 1px solid #000000; background-color: #e6e6e6; width: 24px; font-size: 7.5pt; font-weight: bold; text-align: center;">NO</th>
              <th rowspan="2" style="border: 1px solid #000000; background-color: #e6e6e6; width: 120px; font-size: 7.5pt; font-weight: bold; text-align: left; padding-left: 5px;">NAMA<br/>SISWA</th>
              <th rowspan="2" style="border: 1px solid #000000; background-color: #e6e6e6; width: 24px; font-size: 7.5pt; font-weight: bold; text-align: center;">L/P</th>
              <th colspan="31" style="border: 1px solid #000000; background-color: #e6e6e6; font-size: 7.5pt; font-weight: bold; text-align: center; padding: 2px;">TANGGAL</th>
              <th colspan="4" style="border: 1px solid #000000; background-color: #e6e6e6; font-size: 7.5pt; font-weight: bold; text-align: center; padding: 2px;">REKAPITULASI</th>
              <th rowspan="2" style="border: 1px solid #000000; background-color: #e6e6e6; width: 32px; font-size: 7.5pt; font-weight: bold; text-align: center;">%</th>
            </tr>
            <tr>
              ${dateHeaders}
              <th style="border: 1px solid #000000; width: 20px; background-color: #c8e6c9; font-size: 7.5pt; font-weight: bold; text-align: center;">H</th>
              <th style="border: 1px solid #000000; width: 20px; background-color: #bbdefb; font-size: 7.5pt; font-weight: bold; text-align: center;">S</th>
              <th style="border: 1px solid #000000; width: 20px; background-color: #fff9c4; font-size: 7.5pt; font-weight: bold; text-align: center;">I</th>
              <th style="border: 1px solid #000000; width: 20px; background-color: #ffcdd2; font-size: 7.5pt; font-weight: bold; text-align: center;">A</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000000; height: 24px; font-size: 8pt; font-weight: bold; text-align: center;">${!isBlank && student ? student.no : ''}</td>
              <td style="border: 1px solid #000000; height: 24px; font-size: 8pt; font-weight: bold; text-align: left; padding: 2px 5px; text-transform: uppercase;">${!isBlank && student ? student.name : ''}</td>
              <td style="border: 1px solid #000000; height: 24px; font-size: 8pt; font-weight: bold; text-align: center;">${!isBlank && student ? student.gender : ''}</td>
              ${dayCells}
              <td style="border: 1px solid #000000; height: 24px; background-color: #dcfce7; font-size: 8pt; font-weight: bold; text-align: center; color: #166534;">${fmtCount(countH)}</td>
              <td style="border: 1px solid #000000; height: 24px; background-color: #e0f2fe; font-size: 8pt; font-weight: bold; text-align: center; color: #075985;">${fmtCount(countS)}</td>
              <td style="border: 1px solid #000000; height: 24px; background-color: #fef3c7; font-size: 8pt; font-weight: bold; text-align: center; color: #92400e;">${fmtCount(countI)}</td>
              <td style="border: 1px solid #000000; height: 24px; background-color: #fee2e2; font-size: 8pt; font-weight: bold; text-align: center; color: #991b1b;">${fmtCount(countA)}</td>
              <td style="border: 1px solid #000000; height: 24px; font-size: 8pt; font-weight: bold; text-align: center;">${pct}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `;
    })
    .join('');

  const html = `
  <div style="text-align: center; margin-bottom: 6px; font-family: Arial, sans-serif;">
    <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">${schoolSettings.schoolName}</div>
    <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">REKAPITULASI ABSENSI SISWA KELAS ${schoolSettings.className}</div>
  </div>
  ${monthBlocksHtml}
  `;

  const studentLabel = !isBlank && student ? student.name.replace(/\s+/g, '_') : 'Template_Kosong';
  const fileName = `Rekap_Semester_1_Siswa_${studentLabel}_${schoolSettings.className.replace(/\s+/g, '_')}.doc`;
  downloadWordDoc(html, fileName, 'landscape');
}

/**
 * Export 1 Student Semester Attendance Recap to CSV
 */
export function exportStudentSemesterRecapToCSV(
  student: Student,
  schoolSettings: SchoolSettings,
  months: { name: string; index: number; year: number }[],
  getMonthAttendanceData: (year: number, monthIdx: number) => Record<string, Record<number, 'H' | 'A' | 'S' | 'I' | '-'>>
) {
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  const academicYear = schoolSettings.academicYear || '2026/2027';

  csvContent += `${schoolSettings.schoolName.toUpperCase()}\n`;
  csvContent += `REKAPITULASI ABSENSI SISWA KELAS ${schoolSettings.className.toUpperCase()}\n`;
  csvContent += `NAMA SISWA: "${student.name}" (${student.gender}) - NO: ${student.no}\n`;
  csvContent += `TAHUN AJARAN: ${academicYear}\n\n`;

  const dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1).join(',');
  csvContent += `BULAN,NO,NAMA SISWA,L/P,${dayNumbers},H,S,I,A,%\n`;

  months.forEach((m) => {
    const daysInMonth = new Date(m.year, m.index + 1, 0).getDate();
    const monthData = getMonthAttendanceData(m.year, m.index);
    const sData = monthData[student.id] || {};

    let countH = 0;
    let countS = 0;
    let countI = 0;
    let countA = 0;
    let filled = 0;

    const daysArr = Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      if (d > daysInMonth) return 'X';
      const st = sData[d] || '-';
      if (st === 'H') {
        countH++;
        filled++;
      } else if (st === 'S') {
        countS++;
        filled++;
      } else if (st === 'I') {
        countI++;
        filled++;
      } else if (st === 'A') {
        countA++;
        filled++;
      }
      return st === '-' ? '' : st;
    });

    const pct = filled > 0 ? `${Math.round((countH / filled) * 100)}%` : '0%';
    const cleanName = `"${(student.name || '').replace(/"/g, '""')}"`;

    csvContent += `"${m.name} ${m.year}",${student.no},${cleanName},${student.gender},${daysArr.join(',')},${countH},${countS},${countI},${countA},${pct}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `Rekap_Semester_Siswa_${student.name.replace(/\s+/g, '_')}_${schoolSettings.className.replace(/\s+/g, '_')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

