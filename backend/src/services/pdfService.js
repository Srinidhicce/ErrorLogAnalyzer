const PDFDocument = require('pdfkit');


const generatePDFReport = (analysis) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const colors = {
      primary: '#1a1a2e',
      accent: '#4f46e5',
      critical: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      text: '#374151',
      light: '#f9fafb'
    };

    doc.rect(0, 0, 612, 80).fill(colors.primary);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('AI Log Analyzer Report', 50, 25);
    doc.fontSize(10).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, 50, 55);
    doc.fillColor(colors.text);

    doc.moveDown(2);

  
    const health = analysis.aiAnalysis?.overallHealth || 'unknown';
    const healthColor = health === 'healthy' ? colors.success : health === 'warning' ? colors.warning : colors.critical;

    doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary)
      .text('Analysis Summary', 50, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica').fillColor(colors.text);
    doc.text(`Provider: ${analysis.provider?.toUpperCase() || 'N/A'}`);
    doc.text(`Model: ${analysis.model || 'N/A'}`);
    doc.text(`Input Type: ${analysis.inputType?.toUpperCase() || 'N/A'}`);
    if (analysis.fileName) doc.text(`File: ${analysis.fileName}`);
    doc.text(`Cache Hit: ${analysis.cacheHit ? 'Yes (cached result)' : 'No (fresh analysis)'}`);
    doc.text(`Processing Time: ${analysis.processingTimeMs || 0}ms`);

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor(healthColor)
      .text(`Overall Health: ${health.toUpperCase()}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1);

  
    if (analysis.totalMasked > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary)
        .text('Sensitive Data Masking');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(colors.text)
        .text(`Total items masked: ${analysis.totalMasked}`);
      if (analysis.maskingSummary) {
        const summary = analysis.maskingSummary instanceof Map
          ? Object.fromEntries(analysis.maskingSummary)
          : analysis.maskingSummary;
        Object.entries(summary).forEach(([type, count]) => {
          doc.text(`  • ${type}: ${count}`);
        });
      }
      doc.moveDown(1);
    }

    doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary)
      .text('Error Statistics');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor(colors.text);
    doc.text(`Total Errors Found: ${analysis.totalErrors || 0}`);
    doc.text(`Repeated Errors: ${analysis.repeatedErrors?.length || 0}`);
    doc.text(`Unique Errors: ${analysis.nonRepeatedErrors?.length || 0}`);

    if (analysis.errorsBySeverity) {
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold').text('By Severity:');
      const sev = analysis.errorsBySeverity instanceof Map
        ? Object.fromEntries(analysis.errorsBySeverity)
        : analysis.errorsBySeverity;
      Object.entries(sev).forEach(([k, v]) => {
        doc.font('Helvetica').text(`  • ${k}: ${v}`);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1);

    
    if (analysis.aiAnalysis) {
      const ai = analysis.aiAnalysis;

      doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary)
        .text('AI Analysis');
      doc.moveDown(0.5);

      if (ai.rootCause) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.accent).text('Root Cause:');
        doc.fontSize(11).font('Helvetica').fillColor(colors.text).text(ai.rootCause);
        doc.moveDown(0.5);
      }

      if (ai.errorSummary) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.accent).text('Error Summary:');
        doc.fontSize(11).font('Helvetica').fillColor(colors.text).text(ai.errorSummary);
        doc.moveDown(0.5);
      }

      if (ai.criticalIssues?.length) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.critical).text('Critical Issues:');
        ai.criticalIssues.forEach((issue) => {
          doc.fontSize(11).font('Helvetica').fillColor(colors.text).text(`  ⚠ ${issue}`);
        });
        doc.moveDown(0.5);
      }

      if (ai.suggestedFixes?.length) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.success).text('Suggested Fixes:');
        ai.suggestedFixes.forEach((fix, i) => {
          doc.fontSize(11).font('Helvetica').fillColor(colors.text).text(`  ${i + 1}. ${fix}`);
        });
        doc.moveDown(0.5);
      }

      if (ai.technicalDetails) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.accent).text('Technical Details:');
        doc.fontSize(11).font('Helvetica').fillColor(colors.text).text(ai.technicalDetails);
      }
    }


    if (analysis.repeatedErrors?.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary)
        .text('Top Repeated Errors');
      doc.moveDown(0.5);

      analysis.repeatedErrors.slice(0, 10).forEach((error, i) => {
        const color = error.severity === 'CRITICAL' ? colors.critical
          : error.severity === 'ERROR' ? '#f97316'
          : error.severity === 'WARNING' ? colors.warning : colors.text;

        doc.fontSize(10).font('Helvetica-Bold').fillColor(color)
          .text(`${i + 1}. [${error.severity}] [${error.category}] (×${error.count})`);
        doc.fontSize(9).font('Helvetica').fillColor(colors.text)
          .text(error.content.substring(0, 150), { indent: 20 });
        doc.moveDown(0.3);
      });
    }

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).fillColor('#9ca3af')
        .text(`AI Log Analyzer - Page ${i + 1} of ${range.count} - Confidential`, 50, 780, {
          align: 'center', width: 512
        });
    }

    doc.end();
  });
};

module.exports = { generatePDFReport };