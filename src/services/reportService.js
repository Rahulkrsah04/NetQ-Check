// ============================================================
// NetQ Check — PDF Report Service (Phase 3)
// Generates downloadable PDF compliance reports using jsPDF
// ============================================================

import jsPDF from 'jspdf';
import { getStatusConfig } from './complianceEngine';

/**
 * Generate and download a PDF compliance screening report
 * @param {Object} reportData
 */
export async function generatePDFReport(reportData) {
  const { scan, extractedData, complianceResults, summary, overallStatus, category, audit } = reportData;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ----------------------------------------
  // Helper functions
  // ----------------------------------------
  const addText = (text, x, yPos, opts = {}) => {
    pdf.setFont('helvetica', opts.style || 'normal');
    pdf.setFontSize(opts.size || 10);
    pdf.setTextColor(...(opts.color || [23, 32, 51]));
    pdf.text(text, x, yPos);
  };

  const addLine = (y1, color = [226, 232, 240]) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y1, pageW - margin, y1);
  };

  const addRect = (x, y1, w, h, fillColor, borderColor) => {
    if (fillColor) { pdf.setFillColor(...fillColor); pdf.rect(x, y1, w, h, 'F'); }
    if (borderColor) { pdf.setDrawColor(...borderColor); pdf.setLineWidth(0.3); pdf.rect(x, y1, w, h, 'S'); }
  };

  // ----------------------------------------
  // Header Band (Deep Teal & Navy)
  // ----------------------------------------
  addRect(0, 0, pageW, 22, [23, 32, 51]);
  addText('NetQ Check', margin, 10, { size: 14, style: 'bold', color: [255, 255, 255] });
  addText('Scan. Verify. Comply.', margin, 16, { size: 8, color: [148, 163, 184] });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 118, 110);
  pdf.text('COMPLIANCE SCREENING ASSESSMENT REPORT', pageW - margin, 12, { align: 'right' });

  y = 30;

  // ----------------------------------------
  // Report Audit Metadata
  // ----------------------------------------
  addText(`Assessment ID: ${audit?.assessmentId || 'ASM-' + Date.now()}`, margin, y, { size: 8, color: [107, 114, 128] });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Rule Set: ${audit?.ruleSetVersion || 'PC_RULES_2011_V1'} · Generated: ${new Date().toLocaleString('en-IN')}`, pageW - margin, y, { align: 'right' });
  y += 8;
  addLine(y);
  y += 6;

  // ----------------------------------------
  // Overall Status Banner
  // ----------------------------------------
  const statusConfig = getStatusConfig(overallStatus);
  const bannerColor = overallStatus === 'COMPLIANT' ? [22, 163, 74]
    : overallStatus === 'NON_COMPLIANT' ? [220, 38, 38] : [217, 119, 6];
  const bannerLight = overallStatus === 'COMPLIANT' ? [240, 253, 244]
    : overallStatus === 'NON_COMPLIANT' ? [254, 242, 242] : [254, 243, 199];

  addRect(margin, y, contentW, 14, bannerLight, bannerColor);
  addText('Overall Screening Result:', margin + 3, y + 6, { size: 9, color: [55, 65, 81] });
  addText(statusConfig.label.toUpperCase(), margin + 50, y + 6, { size: 10, style: 'bold', color: bannerColor });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  pdf.text(`${summary?.pass || 0} of ${summary?.applicable || summary?.total || 0} applicable checks passed`, pageW - margin - 3, y + 6, { align: 'right' });
  y += 20;

  // ----------------------------------------
  // Product Information
  // ----------------------------------------
  addText('PRODUCT & CATEGORY INFORMATION', margin, y, { size: 9, style: 'bold', color: [15, 118, 110] });
  y += 5;
  addLine(y);
  y += 5;

  const infoRows = [
    ['Product Name', extractedData?.productName?.value || '—'],
    ['Commodity Category', category?.name || 'General Packaged Commodity'],
    ['Net Quantity', extractedData?.netQuantity?.value || '—'],
    ['MRP', extractedData?.mrp?.value || '—'],
    ['Manufacturer / Importer', extractedData?.manufacturer?.value || '—'],
    ['Manufacturing Date', extractedData?.manufactureDate?.value || '—'],
    ['Consumer Care Helpline', extractedData?.consumerCare?.value || '—'],
    ['Country of Origin', extractedData?.countryOfOrigin?.value || '—'],
  ];

  infoRows.forEach(([label, val], i) => {
    if (i % 2 === 0) addRect(margin, y - 1, contentW, 7, [247, 250, 250]);
    addText(label + ':', margin + 2, y + 4, { size: 8.5, style: 'bold', color: [55, 65, 81] });
    addText(val, margin + 50, y + 4, { size: 8.5, color: [23, 32, 51] });
    y += 7;
  });
  y += 4;

  // ----------------------------------------
  // Compliance Checklist
  // ----------------------------------------
  addText('DETAILED REQUIREMENT CHECKLIST', margin, y, { size: 9, style: 'bold', color: [15, 118, 110] });
  y += 5;
  addLine(y);
  y += 5;

  // Table header
  addRect(margin, y, contentW, 7, [15, 118, 110]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Requirement', margin + 2, y + 5);
  pdf.text('Extracted Value', margin + 65, y + 5);
  pdf.text('Status', margin + 130, y + 5);
  y += 9;

  (complianceResults || []).forEach((result, i) => {
    const rowColor = i % 2 === 0 ? [255, 255, 255] : [247, 250, 250];
    addRect(margin, y, contentW, 7, rowColor);

    const statusColor = result.status === 'PASS' ? [22, 163, 74]
      : result.status === 'FAIL' ? [220, 38, 38]
      : result.status === 'REVIEW' ? [217, 119, 6] : [107, 114, 128];

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(23, 32, 51);
    pdf.text(truncate(result.requirementName || result.requirement, 35), margin + 2, y + 5);
    pdf.text(truncate(result.extractedValue || result.value || 'Not Detected', 30), margin + 65, y + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...statusColor);
    pdf.text(result.status, margin + 130, y + 5);

    y += 7;

    // Add new page if needed
    if (y > pageH - 30) {
      pdf.addPage();
      y = margin;
    }
  });
  y += 5;

  // ----------------------------------------
  // Summary Stats
  // ----------------------------------------
  const statsY = y;
  const boxW = contentW / 4;
  const statItems = [
    { label: 'Total Applicable', val: summary?.applicable || summary?.total || 0, color: [23, 32, 51] },
    { label: 'Passed', val: summary?.pass || 0, color: [22, 163, 74] },
    { label: 'Failed', val: summary?.fail || 0, color: [220, 38, 38] },
    { label: 'Needs Review', val: summary?.review || 0, color: [217, 119, 6] },
  ];

  statItems.forEach((stat, i) => {
    const bx = margin + i * boxW;
    addRect(bx, statsY, boxW - 2, 16, [247, 250, 250], [226, 232, 240]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...stat.color);
    pdf.text(String(stat.val), bx + (boxW - 2) / 2, statsY + 9, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text(stat.label, bx + (boxW - 2) / 2, statsY + 14, { align: 'center' });
  });
  y = statsY + 22;

  // ----------------------------------------
  // Legal Disclaimer
  // ----------------------------------------
  if (y > pageH - 30) { pdf.addPage(); y = margin; }
  addLine(y);
  y += 5;
  addRect(margin, y, contentW, 14, [254, 252, 232], [253, 224, 71]);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(113, 63, 18);
  const disclaimer = 'LEGAL DISCLAIMER: This automated assessment is a preliminary compliance screening based on available product information and applicable configured requirements under the Legal Metrology (Packaged Commodities) Rules, 2011. Final legal determination requires verification by the appropriate authority or qualified professional.';
  const lines = pdf.splitTextToSize(disclaimer, contentW - 6);
  pdf.text(lines, margin + 3, y + 5);
  y += 18;

  // Footer
  addLine(pageH - 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  pdf.text('NetQ Check — Scan. Verify. Comply. (Engine v3.0.0)', margin, pageH - 6);
  pdf.text(`Page 1`, pageW - margin, pageH - 6, { align: 'right' });

  // Save
  const filename = `NetQCheck_ScreeningReport_${scan?.id || Date.now()}.pdf`;
  pdf.save(filename);
  return filename;
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 2) + '…' : str;
}
