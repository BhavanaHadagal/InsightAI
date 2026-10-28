/**
 * Deterministic Data Analytics Engine for InsightAI
 */

// Helper to compute median and quartiles
const computeQuartiles = (sortedNumbers) => {
  if (sortedNumbers.length === 0) return { q1: 0, median: 0, q3: 0 };
  const mid = Math.floor(sortedNumbers.length / 2);

  const median = sortedNumbers.length % 2 !== 0
    ? sortedNumbers[mid]
    : (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;

  const lowerHalf = sortedNumbers.slice(0, mid);
  const upperHalf = sortedNumbers.length % 2 !== 0
    ? sortedNumbers.slice(mid + 1)
    : sortedNumbers.slice(mid);

  const getMedian = (arr) => {
    if (arr.length === 0) return 0;
    const m = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  return {
    q1: getMedian(lowerHalf),
    median,
    q3: getMedian(upperHalf),
  };
};

// Compute Pearson correlation between two numeric arrays
const computePearsonCorrelation = (x, y) => {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
};

// Check if a categorical column is a high-cardinality identifier like Invoice ID
const isIdentifierColumn = (col, totalRows) => {
  const name = col.name.toLowerCase();
  if (/(?:_id|id$|invoice|code|sku|uuid|serial|account_?no|num$)/i.test(name)) {
    return true;
  }
  if (totalRows > 10 && col.uniqueCount / totalRows > 0.8) {
    return true;
  }
  return false;
};

/**
 * Generate full deterministic analysis for records & columns
 */
const analyzeDataset = (records = [], columns = [], duplicateRowCount = 0) => {
  const totalRows = records.length;
  const numericColumns = columns.filter((c) => c.type === 'numeric');
  const categoricalColumns = columns.filter((c) => c.type === 'categorical');
  const dateColumns = columns.filter((c) => c.type === 'date');

  // 1. Numeric statistics & outlier detection using IQR
  const numericStats = {};
  let salesCandidate = null;
  let highestSumNumeric = null;
  let totalOutliersAcrossAllCols = 0;
  const outlierDetails = [];

  numericColumns.forEach((col) => {
    const values = records
      .map((r) => r[col.key])
      .filter((v) => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) {
      numericStats[col.key] = {
        name: col.name,
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        outliers: [],
        outliersCount: 0,
      };
      return;
    }

    const count = values.length;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    // Standard deviation
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Min & Max
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // IQR & Outliers
    const { q1, median, q3 } = computeQuartiles(sorted);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = values.filter((v) => v < lowerBound || v > upperBound);
    totalOutliersAcrossAllCols += outliers.length;

    if (outliers.length > 0) {
      outlierDetails.push({
        column: col.name,
        key: col.key,
        count: outliers.length,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        samples: outliers.slice(0, 5),
      });
    }

    numericStats[col.key] = {
      name: col.name,
      count,
      sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      lowerBound: Math.round(lowerBound * 100) / 100,
      upperBound: Math.round(upperBound * 100) / 100,
      outliersCount: outliers.length,
      outlierSamples: outliers.slice(0, 5),
    };

    // Detect sales/revenue column: prefer 'total', 'revenue', 'sales', 'amount', 'cogs'
    const lowerName = col.name.toLowerCase();
    if (
      lowerName === 'total' ||
      lowerName === 'sales' ||
      lowerName === 'revenue' ||
      lowerName.includes('total sales') ||
      lowerName.includes('revenue') ||
      lowerName.includes('gross income') ||
      lowerName.includes('amount')
    ) {
      if (!salesCandidate || lowerName === 'total' || lowerName.includes('sales')) {
        salesCandidate = col;
      }
    }

    if (!highestSumNumeric || sum > highestSumNumeric.sum) {
      highestSumNumeric = { col, sum };
    }
  });

  const primaryNumericCol = salesCandidate || (highestSumNumeric ? highestSumNumeric.col : numericColumns[0]);

  // 2. Categorical statistics & frequency distributions
  const categoricalStats = {};
  let bestCategoricalCol = null;

  categoricalColumns.forEach((col) => {
    const counts = {};
    records.forEach((r) => {
      const val = r[col.key];
      const key = (val !== null && val !== undefined && String(val).trim() !== '')
        ? String(val).trim()
        : '(Blank)';
      counts[key] = (counts[key] || 0) + 1;
    });

    const sortedCategories = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalRows > 0 ? Math.round((count / totalRows) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    categoricalStats[col.key] = {
      name: col.name,
      uniqueCount: sortedCategories.length,
      isIdentifier: isIdentifierColumn(col, totalRows),
      topCategories: sortedCategories.slice(0, 10),
    };

    // Select best meaningful categorical grouping dimension (not an ID)
    if (!isIdentifierColumn(col, totalRows)) {
      const lower = col.name.toLowerCase();
      if (
        !bestCategoricalCol ||
        lower.includes('category') ||
        lower.includes('product') ||
        lower.includes('line') ||
        lower.includes('branch') ||
        lower.includes('city') ||
        lower.includes('department') ||
        lower.includes('payment') ||
        lower.includes('type')
      ) {
        bestCategoricalCol = col;
      }
    }
  });

  if (!bestCategoricalCol && categoricalColumns.length > 0) {
    // Pick the one with lowest unique count
    bestCategoricalCol = [...categoricalColumns].sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
  }

  // 3. Time-based trends: Monthly Sales / Performance Trend (Chronological)
  const monthlyTrends = [];
  const dailyTrends = [];
  let primaryDateCol = null;

  if (dateColumns.length > 0 && primaryNumericCol) {
    primaryDateCol = dateColumns[0];
    const monthGroups = {};
    const dateGroups = {};

    records.forEach((r) => {
      const rawDate = r[primaryDateCol.key];
      if (!rawDate) return;

      const dateStr = String(rawDate).split('T')[0];
      const monthStr = dateStr.slice(0, 7); // YYYY-MM
      const val = typeof r[primaryNumericCol.key] === 'number' ? r[primaryNumericCol.key] : 0;

      // Group by month
      if (!monthGroups[monthStr]) {
        monthGroups[monthStr] = { month: monthStr, total: 0, count: 0 };
      }
      monthGroups[monthStr].total += val;
      monthGroups[monthStr].count += 1;

      // Group by day
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { date: dateStr, total: 0, count: 0 };
      }
      dateGroups[dateStr].total += val;
      dateGroups[dateStr].count += 1;
    });

    // Chronological sort for months
    Object.keys(monthGroups)
      .sort()
      .forEach((m) => {
        // Pretty label (e.g. "Jan 2026")
        const [yr, mo] = m.split('-');
        const monthDate = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
        const label = !isNaN(monthDate.getTime())
          ? monthDate.toLocaleString('default', { month: 'short', year: 'numeric' })
          : m;

        monthlyTrends.push({
          period: m,
          label,
          total: Math.round(monthGroups[m].total * 100) / 100,
          average: Math.round((monthGroups[m].total / monthGroups[m].count) * 100) / 100,
          count: monthGroups[m].count,
        });
      });

    // Chronological sort for days
    Object.keys(dateGroups)
      .sort()
      .forEach((d) => {
        dailyTrends.push({
          date: d,
          total: Math.round(dateGroups[d].total * 100) / 100,
          average: Math.round((dateGroups[d].total / dateGroups[d].count) * 100) / 100,
          count: dateGroups[d].count,
        });
      });
  }

  // 4. Category vs Numeric metric grouping (using non-identifier categorical column)
  const categoryGroupings = [];
  const chosenCatCol = bestCategoricalCol || categoricalColumns[0];

  if (chosenCatCol && primaryNumericCol) {
    const catMap = {};

    records.forEach((r) => {
      const cat = r[chosenCatCol.key] || 'Uncategorized';
      const val = typeof r[primaryNumericCol.key] === 'number' ? r[primaryNumericCol.key] : 0;

      if (!catMap[cat]) {
        catMap[cat] = { category: cat, total: 0, count: 0 };
      }
      catMap[cat].total += val;
      catMap[cat].count += 1;
    });

    Object.values(catMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .forEach((item) => {
        categoryGroupings.push({
          category: item.category,
          total: Math.round(item.total * 100) / 100,
          average: Math.round((item.total / item.count) * 100) / 100,
          count: item.count,
        });
      });
  }

  // 5. Correlation matrix for numeric columns
  const correlations = [];
  if (numericColumns.length >= 2) {
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];

        const validPairs = records
          .filter((r) => typeof r[col1.key] === 'number' && typeof r[col2.key] === 'number')
          .map((r) => ({ x: r[col1.key], y: r[col2.key] }));

        if (validPairs.length > 2) {
          const x = validPairs.map((p) => p.x);
          const y = validPairs.map((p) => p.y);
          const r = computePearsonCorrelation(x, y);

          correlations.push({
            col1: col1.name,
            col2: col2.name,
            correlation: r,
            relationship:
              Math.abs(r) > 0.7
                ? 'Strong'
                : Math.abs(r) > 0.4
                ? 'Moderate'
                : 'Weak',
          });
        }
      }
    }
  }

  // 6. Data Quality Audit
  const missingColDetails = [];
  let totalMissingCells = 0;

  columns.forEach((c) => {
    totalMissingCells += c.missingCount || 0;
    if (c.missingCount > 0) {
      missingColDetails.push({
        column: c.name,
        key: c.key,
        type: c.type,
        missingCount: c.missingCount,
        percentage: totalRows > 0 ? Math.round((c.missingCount / totalRows) * 1000) / 10 : 0,
      });
    }
  });

  const totalPossibleCells = totalRows * (columns.length || 1);
  const completenessPct = totalPossibleCells > 0
    ? Math.max(0, Math.min(100, Math.round((1 - totalMissingCells / totalPossibleCells) * 100)))
    : 100;

  const dataQuality = {
    totalRows,
    totalColumns: columns.length,
    duplicateRows: duplicateRowCount,
    missingCells: totalMissingCells,
    completenessPct,
    missingColumns: missingColDetails,
    outliersTotal: totalOutliersAcrossAllCols,
    outliersList: outlierDetails,
  };

  // 7. Dynamic, Professional KPI Calculations
  const isSalesDataset = Boolean(
    salesCandidate ||
    (primaryNumericCol && /(total|sales|revenue|amount|income|cogs|price)/i.test(primaryNumericCol.name))
  );

  const primaryStats = primaryNumericCol ? numericStats[primaryNumericCol.key] : null;

  // Clean KPI Titles (Never "TOTAL TOTAL" or "AVERAGE TOTAL")
  let primaryKpiTitle = 'Total Value';
  let avgKpiTitle = 'Average Value';
  let transKpiTitle = 'Total Transactions';

  if (isSalesDataset) {
    primaryKpiTitle = 'Total Sales';
    avgKpiTitle = 'Average Transaction Value';
    transKpiTitle = 'Total Transactions';
  } else if (primaryNumericCol) {
    const rawName = primaryNumericCol.name.trim();
    // Prevent duplicate "Total Total"
    if (rawName.toLowerCase().startsWith('total')) {
      primaryKpiTitle = rawName;
      avgKpiTitle = `Average ${rawName.slice(5).trim() || 'Value'}`;
    } else {
      primaryKpiTitle = `Total ${rawName}`;
      avgKpiTitle = `Average ${rawName}`;
    }
    transKpiTitle = 'Total Records';
  }

  const validRecordCount = primaryStats ? primaryStats.count : totalRows;
  const totalValue = primaryStats ? primaryStats.sum : null;
  const averageValue = (totalValue !== null && validRecordCount > 0)
    ? Math.round((totalValue / validRecordCount) * 100) / 100
    : (primaryStats ? primaryStats.mean : null);

  const kpis = {
    isSalesDataset,
    primaryKpiTitle,
    transKpiTitle,
    avgKpiTitle,
    totalRecords: totalRows,
    validTransactions: validRecordCount,
    duplicateRecords: duplicateRowCount,
    totalMissingCells,
    completenessPct,
    primaryMetricName: primaryNumericCol ? primaryNumericCol.name : 'N/A',
    primaryMetricKey: primaryNumericCol ? primaryNumericCol.key : null,
    totalPrimaryValue: totalValue,
    averagePrimaryValue: averageValue,
    medianPrimaryValue: primaryStats ? primaryStats.median : null,
    defaultDimensionKey: primaryDateCol ? primaryDateCol.key : (bestCategoricalCol ? bestCategoricalCol.key : ''),
    defaultDimensionName: primaryDateCol ? primaryDateCol.name : (bestCategoricalCol ? bestCategoricalCol.name : ''),
    hasDateColumn: Boolean(primaryDateCol),
    dateColumnKey: primaryDateCol ? primaryDateCol.key : null,
  };

  return {
    kpis,
    dataQuality,
    numericStats,
    categoricalStats,
    monthlyTrends,
    timeTrends: dailyTrends.slice(-60),
    categoryGroupings,
    correlations,
  };
};

module.exports = {
  analyzeDataset,
  computeQuartiles,
  computePearsonCorrelation,
  isIdentifierColumn,
};
