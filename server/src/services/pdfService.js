const PDFDocument = require('pdfkit');

const generateAnalysisPdf = (dataset, res) => {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    info: {
      Title: `InsightAI Analysis - ${dataset.name}`,
      Author: 'InsightAI Analytics Platform',
    },
  });

  doc.pipe(res);

  // Header Banner
  doc
    .fillColor('#0f172a')
    .rect(0, 0, doc.page.width, 80)
    .fill();

  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('InsightAI', 50, 25);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text('Automated Dataset Analysis & Executive Report', 50, 50);

  doc
    .fontSize(9)
    .fillColor('#cbd5e1')
    .text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 220, 35, {
      width: 170,
      align: 'right',
    });

  doc.moveDown(3);
  let currentY = 105;

  // Dataset Overview
  doc
    .fillColor('#1e293b')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`Dataset: ${dataset.name}`, 50, currentY);

  currentY += 22;
  doc
    .fillColor('#64748b')
    .fontSize(10)
    .font('Helvetica')
    .text(
      `File: ${dataset.originalFilename}  |  Sheet: ${dataset.sheetName}  |  Rows: ${dataset.rowCount}  |  Columns: ${dataset.columnCount}`,
      50,
      currentY
    );

  currentY += 25;

  // Key KPI Metrics Section
  doc
    .fillColor('#2563eb')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('DETERMINISTIC KEY PERFORMANCE INDICATORS', 50, currentY);

  currentY += 18;

  const kpis = dataset.analysisSummary?.kpis || {};
  const kpiData = [
    { label: 'Total Records', value: String(kpis.totalRecords ?? dataset.rowCount) },
    { label: 'Duplicate Rows', value: String(kpis.duplicateRecords ?? 0) },
    { label: 'Missing Cells', value: String(kpis.totalMissingCells ?? 0) },
    {
      label: kpis.primaryMetricName ? `Total ${kpis.primaryMetricName}` : 'Primary Metric',
      value: kpis.totalPrimaryValue != null ? String(kpis.totalPrimaryValue) : 'N/A',
    },
    {
      label: kpis.primaryMetricName ? `Average ${kpis.primaryMetricName}` : 'Average Value',
      value: kpis.averagePrimaryValue != null ? String(kpis.averagePrimaryValue) : 'N/A',
    },
  ];

  // Draw KPI Boxes
  const boxWidth = 95;
  const boxHeight = 50;
  let boxX = 50;

  kpiData.forEach((kpi) => {
    doc
      .rect(boxX, currentY, boxWidth, boxHeight)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text(kpi.label, boxX + 5, currentY + 8, { width: boxWidth - 10, align: 'center' });

    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(kpi.value, boxX + 5, currentY + 26, { width: boxWidth - 10, align: 'center' });

    boxX += boxWidth + 6;
  });

  currentY += boxHeight + 25;

  // Numeric Columns Summary Table
  const numericStats = dataset.analysisSummary?.numericStats || {};
  const numEntries = Object.entries(numericStats).slice(0, 6);

  if (numEntries.length > 0) {
    doc
      .fillColor('#2563eb')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('NUMERIC METRICS BREAKDOWN', 50, currentY);

    currentY += 16;

    // Table Header
    doc
      .rect(50, currentY, 495, 20)
      .fill('#f1f5f9');

    doc
      .fillColor('#334155')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Metric Column', 55, currentY + 6)
      .text('Sum', 180, currentY + 6)
      .text('Mean', 245, currentY + 6)
      .text('Median', 310, currentY + 6)
      .text('Min - Max', 375, currentY + 6)
      .text('Outliers (IQR)', 455, currentY + 6);

    currentY += 20;

    numEntries.forEach(([key, stat]) => {
      doc
        .fillColor('#1e293b')
        .fontSize(8)
        .font('Helvetica')
        .text(stat.name.slice(0, 22), 55, currentY + 5)
        .text(String(stat.sum), 180, currentY + 5)
        .text(String(stat.mean), 245, currentY + 5)
        .text(String(stat.median), 310, currentY + 5)
        .text(`${stat.min} - ${stat.max}`, 375, currentY + 5)
        .text(String(stat.outliersCount), 465, currentY + 5);

      currentY += 18;
    });

    currentY += 15;
  }

  // Top Categories Distribution
  const catStats = dataset.analysisSummary?.categoricalStats || {};
  const catEntries = Object.entries(catStats).slice(0, 2);

  if (catEntries.length > 0) {
    doc
      .fillColor('#2563eb')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('CATEGORICAL DISTRIBUTIONS (TOP SEGMENTS)', 50, currentY);

    currentY += 16;

    catEntries.forEach(([key, stat]) => {
      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Dimension: ${stat.name} (${stat.uniqueCount} unique categories)`, 50, currentY);

      currentY += 14;

      (stat.topCategories || []).slice(0, 4).forEach((cat) => {
        doc
          .fillColor('#1e293b')
          .fontSize(8)
          .font('Helvetica')
          .text(`  • ${cat.name}: ${cat.count} occurrences (${cat.percentage}%)`, 60, currentY);
        currentY += 12;
      });

      currentY += 6;
    });

    currentY += 15;
  }

  // Check if we need a new page for AI Insights
  if (currentY > 620) {
    doc.addPage();
    currentY = 50;
  }

  // AI-Generated Insights Section
  doc
    .fillColor('#2563eb')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('AI EXECUTIVE INSIGHTS & INTERPRETATION', 50, currentY);

  currentY += 14;

  doc
    .fillColor('#94a3b8')
    .fontSize(8)
    .font('Helvetica-Oblique')
    .text(
      'Note: The following insights are generated by AI grounded in the deterministic metrics above.',
      50,
      currentY
    );

  currentY += 16;

  const rawInsights =
    dataset.aiInsights?.reply ||
    dataset.aiInsights?.summary ||
    'Automated AI insights have not been generated yet for this dataset. Please open AI Insights in the InsightAI dashboard to generate.';

  // Print cleaned text lines
  const cleanInsights = rawInsights.replace(/###/g, '').replace(/\*\*/g, '');
  doc
    .fillColor('#1e293b')
    .fontSize(9)
    .font('Helvetica')
    .text(cleanInsights, 50, currentY, { width: 495, lineGap: 3 });

  // Footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `InsightAI Platform — Confidential Analysis Report — Page ${i + 1} of ${range.count}`,
        50,
        doc.page.height - 35,
        { align: 'center', width: doc.page.width - 100 }
      );
  }

  doc.end();
};

module.exports = {
  generateAnalysisPdf,
};

