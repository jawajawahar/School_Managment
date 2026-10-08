const PDFDocument = require('pdfkit');

// Intelligent subject abbreviation to prevent wrapping collisions
function formatSubjectDisplay(name, code) {
  if (!name && code) return code;
  if (!name) return 'Subject';

  const cleaned = name.trim();
  if (/information.*communication.*technology/i.test(cleaned) || /ICT/i.test(cleaned)) {
    return 'ICT (Info Tech)';
  }
  if (/second.*national.*language.*sinhala/i.test(cleaned)) {
    return 'Sinhala (2nd Lang)';
  }
  if (/second.*national.*language.*tamil/i.test(cleaned)) {
    return 'Tamil (2nd Lang)';
  }
  if (/health.*physical.*education/i.test(cleaned)) {
    return 'Health & P.E.';
  }
  if (/business.*accounting/i.test(cleaned)) {
    return 'Accounting & B.S.';
  }
  if (/english.*literature/i.test(cleaned)) {
    return 'English Lit.';
  }
  if (/citizenship.*education/i.test(cleaned)) {
    return 'Civics & Society';
  }
  if (cleaned.length > 20) {
    return cleaned.slice(0, 19) + '…';
  }
  return cleaned;
}

// Professional teacher name formatting (e.g. "Shaheed Mohammed Jawahar" -> "S. M. Jawahar")
function formatTeacherDisplay(fullName) {
  if (!fullName) return 'Staff';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  if (parts.length === 2) return fullName; // e.g. "Mohammed Aroos"
  // 3 or more words: initials for earlier names
  const initials = parts.slice(0, parts.length - 1).map(p => p[0].toUpperCase() + '.').join(' ');
  return `${initials} ${parts[parts.length - 1]}`;
}

function generateTimetablePdfBuffer({ type = 'class', className, academicYear = 2026, teacherName = 'Class Teacher', specialization = '', notes = '', slots = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 25, bottom: 25, left: 30, right: 30 }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const startX = 30;
      const startY = 22;
      const totalWidth = 781.89; // Matches A4 landscape printable width

      // 1. TOP HEADER BANNER
      doc.roundedRect(startX, startY, totalWidth, 54, 4).fill('#0f172a'); // Slate 900
      
      const isTeacherPdf = type === 'teacher';
      const headerTitle = isTeacherPdf
        ? `ACADEMIC YEAR ${academicYear} — OFFICIAL TEACHER TIMETABLE: ${teacherName.toUpperCase()}`
        : `ACADEMIC YEAR ${academicYear} — OFFICIAL CLASS TIMETABLE: ${(className || '').toUpperCase()}`;

      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('GOVERNMENT SENIOR MODEL SCHOOL (GSMS)', startX, startY + 11, { width: totalWidth, align: 'center' });
      doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold')
        .text(headerTitle, startX, startY + 32, { width: totalWidth, align: 'center' });

      // 2. METADATA SUBHEADER BAR
      const infoY = startY + 60;
      doc.roundedRect(startX, infoY, totalWidth, 26, 3).fill('#f8fafc');
      doc.roundedRect(startX, infoY, totalWidth, 26, 3).stroke('#e2e8f0');

      if (isTeacherPdf) {
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
          .text('Teacher: ', startX + 15, infoY + 8, { continued: true })
          .font('Helvetica').fillColor('#0f172a').text(`${teacherName}     `, { continued: true })
          .font('Helvetica-Bold').fillColor('#334155').text('Specialization: ', { continued: true })
          .font('Helvetica').fillColor('#0f172a').text(`${specialization || 'Academic Faculty'}     `, { continued: true })
          .font('Helvetica-Bold').fillColor('#334155').text('Certification: ', { continued: true })
          .fillColor('#16a34a').text('OFFICIALLY CERTIFIED ✓     ', { continued: true })
          .font('Helvetica').fillColor('#64748b').text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}`);
      } else {
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
          .text('Class: ', startX + 15, infoY + 8, { continued: true })
          .font('Helvetica').fillColor('#0f172a').text(`${className}     `, { continued: true })
          .font('Helvetica-Bold').fillColor('#334155').text('Class Teacher: ', { continued: true })
          .font('Helvetica').fillColor('#0f172a').text(`${teacherName}     `, { continued: true })
          .font('Helvetica-Bold').fillColor('#334155').text('Certification: ', { continued: true })
          .fillColor('#16a34a').text('OFFICIALLY CERTIFIED ✓     ', { continued: true })
          .font('Helvetica').fillColor('#64748b').text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}`);
      }

      // 3. TABLE LAYOUT SETUP
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayColWidth = 75;
      const intervalColWidth = 46;
      const periodColWidth = 82.5;

      const periods = [
        { no: 1, time: '08:00 - 08:45' },
        { no: 2, time: '08:45 - 09:30' },
        { no: 3, time: '09:30 - 10:15' },
        { no: 4, time: '10:15 - 11:00' },
        { interval: true, label: 'INTERVAL' },
        { no: 5, time: '11:15 - 12:00' },
        { no: 6, time: '12:00 - 12:45' },
        { no: 7, time: '12:45 - 01:25' },
        { no: 8, time: '01:25 - 02:00' }
      ];

      const tableStartY = infoY + 34;
      const headerHeight = 32;
      const rowHeight = 63;

      // TABLE HEADER ROW
      doc.roundedRect(startX, tableStartY, dayColWidth, headerHeight, 2).fill('#1e293b');
      doc.fillColor('#f8fafc').fontSize(8.5).font('Helvetica-Bold')
        .text('DAY / TIME', startX, tableStartY + 11, { width: dayColWidth, align: 'center' });

      let curHdrX = startX + dayColWidth;
      periods.forEach(p => {
        const w = p.interval ? intervalColWidth : periodColWidth;
        const bg = p.interval ? '#ca8a04' : '#1e3a8a';
        doc.roundedRect(curHdrX + 1, tableStartY, w - 2, headerHeight, 2).fill(bg);
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        if (p.interval) {
          doc.text('RECESS', curHdrX, tableStartY + 6, { width: w, align: 'center' });
          doc.fontSize(7).font('Helvetica').text('11:00-11:15', curHdrX, tableStartY + 19, { width: w, align: 'center' });
        } else {
          doc.text(`Period ${p.no}`, curHdrX, tableStartY + 6, { width: w, align: 'center' });
          doc.fontSize(7).font('Helvetica').fillColor('#bfdbfe').text(p.time, curHdrX, tableStartY + 19, { width: w, align: 'center' });
        }
        curHdrX += w;
      });

      // TABLE BODY ROWS
      let currentY = tableStartY + headerHeight + 2;

      days.forEach((dayName, dayIdx) => {
        const dayNumber = dayIdx + 1;

        // Day cell pill
        doc.roundedRect(startX, currentY, dayColWidth, rowHeight - 2, 2).fill('#f1f5f9');
        doc.roundedRect(startX, currentY, dayColWidth, rowHeight - 2, 2).stroke('#cbd5e1');
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold')
          .text(dayName, startX, currentY + (rowHeight / 2) - 6, { width: dayColWidth, align: 'center' });

        let cellX = startX + dayColWidth;

        periods.forEach(p => {
          const w = p.interval ? intervalColWidth : periodColWidth;

          if (p.interval) {
            // Recess / Interval Column
            doc.roundedRect(cellX + 1, currentY, w - 2, rowHeight - 2, 2).fill('#fefce8');
            doc.roundedRect(cellX + 1, currentY, w - 2, rowHeight - 2, 2).stroke('#fde047');
            doc.fillColor('#a16207').fontSize(7.5).font('Helvetica-Bold')
              .text('TEA', cellX, currentY + 18, { width: w, align: 'center' });
            doc.fillColor('#ca8a04').fontSize(6.5).font('Helvetica')
              .text('BREAK', cellX, currentY + 30, { width: w, align: 'center' });
          } else {
            // Period Card
            const slot = slots.find(s => Number(s.day_of_week) === dayNumber && Number(s.period_no) === p.no);
            
            doc.roundedRect(cellX + 1, currentY, w - 2, rowHeight - 2, 3).fill('#ffffff');
            doc.roundedRect(cellX + 1, currentY, w - 2, rowHeight - 2, 3).stroke('#e2e8f0');

            if (slot) {
              const subjDisplay = formatSubjectDisplay(slot.subject_name, slot.subject_code);
              
              if (isTeacherPdf) {
                // Teacher PDF Card: Display Target Class Name at top, Subject in middle
                const classDisplay = slot.class_grade
                  ? `${slot.class_grade} (${slot.class_section})`
                  : (slot.class_name || 'Class');

                doc.fillColor('#1e3a8a').fontSize(7.5).font('Helvetica-Bold')
                  .text(classDisplay, cellX + 3, currentY + 6, { width: w - 6, align: 'center' });

                doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
                  .text(subjDisplay, cellX + 3, currentY + 28, { width: w - 6, align: 'center' });
              } else {
                // Class PDF Card: Display Subject Name at top, Teacher Name in middle
                const teacherDisplay = formatTeacherDisplay(slot.teacher_name);

                doc.fillColor('#1e3a8a').fontSize(7.5).font('Helvetica-Bold')
                  .text(subjDisplay, cellX + 3, currentY + 6, { width: w - 6, align: 'center' });

                doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
                  .text(teacherDisplay, cellX + 3, currentY + 28, { width: w - 6, align: 'center' });
              }

              // Room Badge (Subtle Pill Chip at bottom)
              if (slot.room) {
                const badgeW = 48;
                const badgeH = 11;
                const badgeX = cellX + (w - badgeW) / 2;
                const badgeY = currentY + 44;
                doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2).fill('#f0fdf4');
                doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2).stroke('#bbf7d0');
                doc.fillColor('#15803d').fontSize(6.5).font('Helvetica-Bold')
                  .text(slot.room, cellX, badgeY + 1.5, { width: w, align: 'center' });
              }
            } else {
              doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
                .text('—', cellX, currentY + 24, { width: w, align: 'center' });
            }
          }

          cellX += w;
        });

        currentY += rowHeight;
      });

      // 4. FOOTER NOTICES & OFFICIAL SIGNATURE
      const footerY = currentY + 8;
      const noticeWidth = 530;
      const sigWidth = totalWidth - noticeWidth - 12;

      // Notice Box
      doc.roundedRect(startX, footerY, noticeWidth, 42, 3).fill('#f8fafc');
      doc.roundedRect(startX, footerY, noticeWidth, 42, 3).stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
        .text(isTeacherPdf ? 'Academic Faculty Teaching Instructions:' : 'Academic Directive & Student Instructions:', startX + 10, footerY + 6);
      doc.fillColor('#475569').fontSize(7).font('Helvetica')
        .text(notes || 'Classes begin promptly at 08:00 AM. 100% punctuality and mandatory attendance are required across all academic periods.', startX + 10, footerY + 18, { width: noticeWidth - 20 });

      // Principal Signature Box
      const sigX = startX + noticeWidth + 12;
      doc.roundedRect(sigX, footerY, sigWidth, 42, 3).fill('#f8fafc');
      doc.roundedRect(sigX, footerY, sigWidth, 42, 3).stroke('#cbd5e1');
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
        .text('CERTIFIED & CONFIRMED', sigX, footerY + 7, { width: sigWidth, align: 'center' });
      doc.fillColor('#0284c7').fontSize(6.5).font('Helvetica-Bold')
        .text('Office of the Academic Principal', sigX, footerY + 19, { width: sigWidth, align: 'center' });
      doc.fillColor('#64748b').fontSize(6).font('Helvetica')
        .text('Government Senior Model School', sigX, footerY + 28, { width: sigWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTimetablePdfBuffer };
