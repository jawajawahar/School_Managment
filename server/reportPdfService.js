const PDFDocument = require('pdfkit');

function getGradeColor(grade) {
  switch (grade) {
    case 'A': return '#059669'; // Emerald
    case 'B': return '#2563eb'; // Blue
    case 'C': return '#d97706'; // Amber
    case 'S': return '#475569'; // Slate
    case 'F': return '#dc2626'; // Red / Rose
    default: return '#64748b';
  }
}

function generateReportPdfBuffer(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        schoolName = 'GOVERNMENT SENIOR MODEL SCHOOL',
        schoolCode = 'GSMS-2026/ZONE-01',
        zone = 'Eastern Educational Zone',
        academicYear = 2026,
        examName = 'FIRST TERM EXAMINATION 2026',
        studentName = 'Student Name',
        studentNo = 'GSMS-2026-0000',
        className = 'Grade 10 (A)',
        classTeacherName = 'Class Teacher',
        principalName = 'A. R. Gunawardena',
        studentMarksList = [],
        totalMarks = 0,
        totalPossible = 400,
        studentAvg = '0',
        rankPosition = 1,
        totalClassStudents = 1,
        finalRemarks = 'Passed',
        teacherNote = '',
        serialHash = '',
      } = reportData;

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 25, bottom: 25, left: 30, right: 30 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const startX = 30;
      const totalWidth = 535.28; // A4 portrait width minus margins

      // Outer Decorative Border Frame
      doc.roundedRect(startX - 5, 20, totalWidth + 10, 800, 6).lineWidth(1.5).stroke('#1e293b');
      doc.roundedRect(startX - 2, 23, totalWidth + 4, 794, 4).lineWidth(0.5).stroke('#94a3b8');

      // 1. TOP HEADER BANNER
      const headerY = 32;
      doc.fillColor('#b45309').fontSize(7.5).font('Helvetica-Bold')
        .text('GOVERNMENT OF SRI LANKA · DEPARTMENT OF EDUCATION', startX, headerY, { width: totalWidth, align: 'center' });

      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold')
        .text(schoolName.toUpperCase(), startX, headerY + 12, { width: totalWidth, align: 'center' });

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text(`School Code: ${schoolCode}   •   Zone: ${zone}   •   Academic Year: ${academicYear}`, startX, headerY + 32, { width: totalWidth, align: 'center' });

      // Title Pill Banner
      const titleY = headerY + 46;
      doc.roundedRect(startX + 40, titleY, totalWidth - 80, 18, 9).fill('#0f172a');
      doc.fillColor('#fbbf24').fontSize(8.5).font('Helvetica-Bold')
        .text('OFFICIAL CUMULATIVE STUDENT ACADEMIC REPORT CARD', startX, titleY + 4, { width: totalWidth, align: 'center' });

      // 2. EXAM & STUDENT LEDGER BOX
      const ledgerY = titleY + 26;

      // Exam Term Sub-Header
      doc.roundedRect(startX, ledgerY, totalWidth, 20, 4).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
        .text(`EXAMINATION TERM: ${examName.toUpperCase()}`, startX + 10, ledgerY + 5, { width: totalWidth - 20 });

      // Student Info Grid Box
      const infoBoxY = ledgerY + 22;
      doc.roundedRect(startX, infoBoxY, totalWidth, 42, 4).fill('#f8fafc');
      doc.roundedRect(startX, infoBoxY, totalWidth, 42, 4).lineWidth(0.5).stroke('#cbd5e1');

      const colWidth = totalWidth / 3;

      // Col 1: Student Name
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold')
        .text('STUDENT NAME & ROLL NO', startX + 10, infoBoxY + 6);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
        .text(studentName, startX + 10, infoBoxY + 16, { width: colWidth - 15 });
      doc.fillColor('#2563eb').fontSize(7.5).font('Helvetica')
        .text(`ID: ${studentNo}`, startX + 10, infoBoxY + 29);

      // Col 2: Class & Section
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold')
        .text('CLASS & SECTION', startX + colWidth + 5, infoBoxY + 6);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
        .text(className, startX + colWidth + 5, infoBoxY + 16, { width: colWidth - 10 });

      // Col 3: Class Teacher
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold')
        .text('CLASS TEACHER', startX + (colWidth * 2) + 5, infoBoxY + 6);
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold')
        .text(classTeacherName, startX + (colWidth * 2) + 5, infoBoxY + 16, { width: colWidth - 10 });

      // 3. SUBJECT PERFORMANCE MATRIX TABLE
      const tableStartY = infoBoxY + 48;
      const tableHeaderH = 22;

      const cW = {
        num: 25,
        code: 55,
        name: 200,
        max: 45,
        marks: 55,
        grade: 55,
        status: 100.28,
      };

      // Table Header Row
      doc.roundedRect(startX, tableStartY, totalWidth, tableHeaderH, 3).fill('#0f172a');

      let curX = startX;
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

      doc.text('#', curX, tableStartY + 6, { width: cW.num, align: 'center' });
      curX += cW.num;
      doc.text('CODE', curX, tableStartY + 6, { width: cW.code, align: 'left' });
      curX += cW.code;
      doc.text('SUBJECT TITLE', curX, tableStartY + 6, { width: cW.name, align: 'left' });
      curX += cW.name;
      doc.text('MAX', curX, tableStartY + 6, { width: cW.max, align: 'center' });
      curX += cW.max;
      doc.text('MARKS', curX, tableStartY + 6, { width: cW.marks, align: 'center' });
      curX += cW.marks;
      doc.text('GRADE', curX, tableStartY + 6, { width: cW.grade, align: 'center' });
      curX += cW.grade;
      doc.text('REMARKS', curX, tableStartY + 6, { width: cW.status, align: 'right' });

      // Table Rows
      let rowY = tableStartY + tableHeaderH;
      const rowH = 25;

      studentMarksList.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.roundedRect(startX, rowY, totalWidth, rowH - 1, 2).fill(bg);
        doc.roundedRect(startX, rowY, totalWidth, rowH - 1, 2).lineWidth(0.5).stroke('#e2e8f0');

        curX = startX;
        doc.fillColor('#64748b').fontSize(8).font('Helvetica')
          .text(String(idx + 1), curX, rowY + 7, { width: cW.num, align: 'center' });
        curX += cW.num;

        doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold')
          .text(item.sub?.code || item.code || '—', curX, rowY + 7, { width: cW.code, align: 'left' });
        curX += cW.code;

        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
          .text(item.sub?.name || item.label || 'Subject', curX, rowY + 7, { width: cW.name - 5, align: 'left' });
        curX += cW.name;

        doc.fillColor('#64748b').fontSize(8).font('Helvetica')
          .text('100', curX, rowY + 7, { width: cW.max, align: 'center' });
        curX += cW.max;

        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
          .text(item.hasMark ? String(item.score) : 'Awaiting', curX, rowY + 7, { width: cW.marks, align: 'center' });
        curX += cW.marks;

        // Grade Pill Chip
        if (item.hasMark) {
          const pillW = 22;
          const pillH = 14;
          const pillX = curX + (cW.grade - pillW) / 2;
          const pillY = rowY + 5;
          const gradeColor = getGradeColor(item.grade);

          doc.roundedRect(pillX, pillY, pillW, pillH, 3).fill(gradeColor);
          doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
            .text(item.grade, curX, pillY + 2.5, { width: cW.grade, align: 'center' });
        } else {
          doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
            .text('—', curX, rowY + 7, { width: cW.grade, align: 'center' });
        }
        curX += cW.grade;

        doc.fillColor('#334155').fontSize(8).font('Helvetica')
          .text(item.statusText || (item.grade === 'A' ? 'Distinction' : item.grade === 'B' ? 'Very Good' : item.grade === 'C' ? 'Credit Pass' : item.grade === 'S' ? 'Ordinary Pass' : 'Remedial Action'), curX - 5, rowY + 7, { width: cW.status, align: 'right' });

        rowY += rowH;
      });

      // 4. EXECUTIVE METRICS CARDS GRID
      const metricsY = Math.max(rowY + 10, 480);
      const cardW = (totalWidth - 15) / 4;
      const cardH = 46;

      // Card 1: Total Marks
      doc.roundedRect(startX, metricsY, cardW, cardH, 4).fill('#ffffff');
      doc.roundedRect(startX, metricsY, cardW, cardH, 4).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
        .text('TOTAL MARKS', startX, metricsY + 6, { width: cardW, align: 'center' });
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold')
        .text(`${totalMarks} / ${totalPossible}`, startX, metricsY + 20, { width: cardW, align: 'center' });

      // Card 2: Average
      const card2X = startX + cardW + 5;
      doc.roundedRect(card2X, metricsY, cardW, cardH, 4).fill('#ffffff');
      doc.roundedRect(card2X, metricsY, cardW, cardH, 4).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
        .text('AVERAGE', card2X, metricsY + 6, { width: cardW, align: 'center' });
      doc.fillColor('#2563eb').fontSize(13).font('Helvetica-Bold')
        .text(`${studentAvg}%`, card2X, metricsY + 20, { width: cardW, align: 'center' });

      // Card 3: Class Rank
      const card3X = card2X + cardW + 5;
      doc.roundedRect(card3X, metricsY, cardW, cardH, 4).fill('#ffffff');
      doc.roundedRect(card3X, metricsY, cardW, cardH, 4).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
        .text('CLASS RANK', card3X, metricsY + 6, { width: cardW, align: 'center' });
      doc.fillColor('#d97706').fontSize(12).font('Helvetica-Bold')
        .text(`#${rankPosition} of ${totalClassStudents}`, card3X, metricsY + 20, { width: cardW, align: 'center' });

      // Card 4: Result Status
      const card4X = card3X + cardW + 5;
      const statusBg = finalRemarks.includes('Remedial') ? '#fef2f2' : '#ecfdf5';
      const statusBorder = finalRemarks.includes('Remedial') ? '#fca5a5' : '#6ee7b7';
      const statusTextCol = finalRemarks.includes('Remedial') ? '#b91c1c' : '#047857';

      doc.roundedRect(card4X, metricsY, cardW, cardH, 4).fill(statusBg);
      doc.roundedRect(card4X, metricsY, cardW, cardH, 4).lineWidth(0.5).stroke(statusBorder);
      doc.fillColor(statusTextCol).fontSize(7).font('Helvetica-Bold')
        .text('OVERALL STATUS', card4X, metricsY + 6, { width: cardW, align: 'center' });
      doc.fillColor(statusTextCol).fontSize(9.5).font('Helvetica-Bold')
        .text(finalRemarks, card4X + 3, metricsY + 20, { width: cardW - 6, align: 'center' });

      // 5. MINISTRY GRADING REFERENCE SCHEME
      const legendY = metricsY + 52;
      doc.roundedRect(startX, legendY, totalWidth, 22, 3).fill('#f1f5f9');
      doc.roundedRect(startX, legendY, totalWidth, 22, 3).lineWidth(0.5).stroke('#e2e8f0');

      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
        .text('MINISTRY GRADING SCALE:', startX + 8, legendY + 7);

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
        .text('A (75-100% Distinction)  •  B (65-74% Very Good)  •  C (55-64% Credit)  •  S (40-54% Ordinary Pass)  •  F (0-39% Weak/Fail)', startX + 130, legendY + 7);

      // 6. CLASS TEACHER CUSTOM REMARKS & NOTES
      const remarksY = legendY + 28;
      doc.roundedRect(startX, remarksY, totalWidth, 54, 4).fill('#fafafa');
      doc.roundedRect(startX, remarksY, totalWidth, 54, 4).lineWidth(0.5).stroke('#cbd5e1');

      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
        .text('CLASS TEACHER REMARKS & OBSERVATIONS:', startX + 10, remarksY + 7);

      const noteText = teacherNote && teacherNote.trim()
        ? `"${teacherNote.trim()}"`
        : 'Student has demonstrated satisfactory academic progress during this examination term. Regular attendance and active classroom participation are highly encouraged for continued excellence.';

      doc.fillColor('#334155').fontSize(8).font('Helvetica-Oblique')
        .text(noteText, startX + 10, remarksY + 20, { width: totalWidth - 20, height: 28 });

      // 7. OFFICIAL STAMP & SIGNATURES BLOCK
      const sigY = remarksY + 62;
      const sigColW = totalWidth / 3;

      // Left: Class Teacher Signature
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
        .text(classTeacherName, startX, sigY + 22, { width: sigColW, align: 'center' });
      doc.moveTo(startX + 20, sigY + 36).lineTo(startX + sigColW - 20, sigY + 36).lineWidth(0.5).stroke('#94a3b8');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
        .text('CLASS TEACHER SIGNATURE', startX, sigY + 40, { width: sigColW, align: 'center' });

      // Center: Government Seal & Stamp
      const stampCenterX = startX + sigColW + (sigColW / 2);
      doc.circle(stampCenterX, sigY + 28, 24).lineWidth(1.5).stroke('#dc2626');
      doc.circle(stampCenterX, sigY + 28, 21).lineWidth(0.5).stroke('#dc2626');

      doc.fillColor('#dc2626').fontSize(5.5).font('Helvetica-Bold')
        .text('OFFICE OF THE PRINCIPAL', stampCenterX - 20, sigY + 14, { width: 40, align: 'center' });
      doc.fillColor('#dc2626').fontSize(7.5).font('Helvetica-Bold')
        .text('APPROVED', stampCenterX - 20, sigY + 25, { width: 40, align: 'center' });
      doc.fillColor('#dc2626').fontSize(5).font('Helvetica')
        .text('OFFICIAL SEAL', stampCenterX - 20, sigY + 36, { width: 40, align: 'center' });

      // Right: Principal Signature
      const rightSigX = startX + (sigColW * 2);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
        .text(principalName, rightSigX, sigY + 22, { width: sigColW, align: 'center' });
      doc.moveTo(rightSigX + 20, sigY + 36).lineTo(rightSigX + sigColW - 20, sigY + 36).lineWidth(0.5).stroke('#94a3b8');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
        .text('PRINCIPAL SEAL & SIGNATURE', rightSigX, sigY + 40, { width: sigColW, align: 'center' });

      // 8. SECURITY HASH & FOOTER
      const footerY = 804;
      const hashStr = serialHash || `SERIAL HASH: GSMS-2026-RPT-${studentNo.replace(/[^a-zA-Z0-9]/g, '')}`;
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
        .text(hashStr, startX, footerY, { width: totalWidth / 2, align: 'left' });
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
        .text(`VERIFIED GOVERNMENT SCHOOL RECORD SYSTEM  •  ${new Date().toLocaleDateString('en-GB')}`, startX + (totalWidth / 2), footerY, { width: totalWidth / 2, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReportPdfBuffer };
