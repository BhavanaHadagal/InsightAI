const XLSX = require('xlsx');

// Identifier patterns and column name keywords that should NEVER be classified as dates
const IDENTIFIER_NAME_REGEX = /^(id|invoice|inv|code|sku|serial|uuid|guid|zip|phone|ssn|order_?id|cust_?id|ticket|item_?no|number|num|ref)$/i;
const IDENTIFIER_NAME_CONTAINS = /(?:_id|id$|invoice|code|sku|uuid|serial|account_?no|zip_?code|phone)/i;

/**
 * Check if a string is strictly a valid calendar date
 */
const isValidDateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length < 6 || trimmed.length > 35) return false;

  // Disallow common identifier patterns like INV-1001, CUST-002, A-123
  if (/^[A-Za-z]{1,6}[-_]\d+$/i.test(trimmed)) return false;
  if (/^[A-Za-z0-9]+[-_][A-Za-z0-9]+[-_][A-Za-z0-9]+$/i.test(trimmed) && !trimmed.includes('/')) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  }

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year >= 1970 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return true;
    }
  }

  // 2. Day/Month/Year or Month/Day/Year: DD-MM-YYYY, MM/DD/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const part1 = parseInt(dmyMatch[1], 10);
    const part2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (year >= 1970 && year <= 2100 && part1 >= 1 && part1 <= 31 && part2 >= 1 && part2 <= 31) {
      return true;
    }
  }

  // 3. Month Name Format: "15 Jan 2026", "January 15, 2026", "Jan-2026"
  const monthNameMatch = trimmed.match(/^(?:(\d{1,2})[-/\s]+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/,\s]+(?:(\d{1,2})[-/,\s]+)?(\d{4})/i);
  if (monthNameMatch) {
    const year = parseInt(monthNameMatch[4], 10);
    if (year >= 1970 && year <= 2100) return true;
  }

  return false;
};

/**
 * Infer data type for a column based on cell values and column name
 */
const inferColumnType = (values, columnName = '') => {
  if (!values || values.length === 0) return 'unknown';

  const cleanColName = columnName.trim().toLowerCase();

  // If column name strongly indicates an identifier, prefer categorical
  const isIdentifierName = IDENTIFIER_NAME_REGEX.test(cleanColName) || IDENTIFIER_NAME_CONTAINS.test(cleanColName);

  let numericCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  let stringCount = 0;

  for (const val of values) {
    if (val === null || val === undefined || val === '') continue;

    if (val instanceof Date) {
      const year = val.getFullYear();
      if (year >= 1970 && year <= 2100) {
        dateCount++;
      } else {
        stringCount++;
      }
      continue;
    }

    if (typeof val === 'boolean') {
      booleanCount++;
      continue;
    }

    if (typeof val === 'number') {
      if (
        (cleanColName.includes('date') || cleanColName.includes('time')) &&
        val > 25569 &&
        val < 65000 &&
        !cleanColName.includes('update')
      ) {
        dateCount++;
      } else {
        numericCount++;
      }
      continue;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();

      if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
        booleanCount++;
        continue;
      }

      // Check numeric strings (e.g. "123.45", "$1,200", "45%")
      const strippedNumber = trimmed.replace(/^[$\u20AC\u00A3\u20B9\s]+/, '').replace(/,/g, '').replace(/%$/, '');
      if (strippedNumber !== '' && !isNaN(Number(strippedNumber)) && !isIdentifierName) {
        numericCount++;
        continue;
      }

      // Check Date strings (only if not an identifier column like Invoice ID)
      if (!isIdentifierName && isValidDateString(trimmed)) {
        dateCount++;
        continue;
      }

      stringCount++;
    } else {
      stringCount++;
    }
  }

  const totalValid = numericCount + dateCount + booleanCount + stringCount;
  if (totalValid === 0) return 'unknown';

  // Never classify identifier column as date
  if (isIdentifierName && dateCount / totalValid < 0.95) {
    if (numericCount / totalValid >= 0.85) return 'numeric';
    return 'categorical';
  }

  if (dateCount / totalValid >= 0.6) return 'date';
  if (numericCount / totalValid >= 0.7) return 'numeric';
  if (booleanCount / totalValid >= 0.7) return 'boolean';
  return 'categorical';
};

/**
 * Parse a single worksheet into columns and structured records
 */
const parseWorksheetData = (worksheet, sheetName = 'Sheet1') => {
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
    cellDates: true,
  });

  if (!rawData || rawData.length === 0) {
    return {
      sheetName,
      columns: [],
      records: [],
      rowCount: 0,
      columnCount: 0,
      duplicateRowCount: 0,
      previewRows: [],
    };
  }

  let headerRowIndex = 0;
  while (headerRowIndex < rawData.length && (!rawData[headerRowIndex] || rawData[headerRowIndex].length === 0)) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rawData.length) {
    return {
      sheetName,
      columns: [],
      records: [],
      rowCount: 0,
      columnCount: 0,
      duplicateRowCount: 0,
      previewRows: [],
    };
  }

  const rawHeaders = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);

  const seenHeaders = {};
  const columns = [];

  rawHeaders.forEach((col, idx) => {
    let name = col !== null && col !== undefined && String(col).trim() !== ''
      ? String(col).trim()
      : `Column_${idx + 1}`;

    name = name.replace(/^[=+@-]/, '');

    let uniqueKey = name.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!uniqueKey) uniqueKey = `col_${idx + 1}`;

    if (seenHeaders[uniqueKey]) {
      seenHeaders[uniqueKey]++;
      uniqueKey = `${uniqueKey}_${seenHeaders[uniqueKey]}`;
      name = `${name} (${seenHeaders[uniqueKey]})`;
    } else {
      seenHeaders[uniqueKey] = 1;
    }

    columns.push({
      index: idx,
      name,
      key: uniqueKey,
      type: 'unknown',
      missingCount: 0,
      uniqueCount: 0,
      sampleValues: [],
    });
  });

  const records = [];
  const seenRowStrings = new Set();
  let duplicateRowCount = 0;

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || row.length === 0) continue;

    const record = {};
    let hasAnyValue = false;

    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      let val = row[col.index];

      if (val !== undefined && val !== null && String(val).trim() !== '') {
        hasAnyValue = true;
        if (typeof val === 'string') {
          val = val.replace(/^[=+@-]/, '').trim();
        } else if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
        record[col.key] = val;
      } else {
        record[col.key] = null;
        col.missingCount++;
      }
    }

    if (hasAnyValue) {
      const rowHash = JSON.stringify(record);
      if (seenRowStrings.has(rowHash)) {
        duplicateRowCount++;
      } else {
        seenRowStrings.add(rowHash);
      }
      records.push(record);
    }
  }

  columns.forEach((col) => {
    const values = records.map((r) => r[col.key]).filter((v) => v !== null && v !== undefined && v !== '');
    col.type = inferColumnType(values, col.name);

    const uniqueSet = new Set(values);
    col.uniqueCount = uniqueSet.size;
    col.sampleValues = Array.from(uniqueSet).slice(0, 5);

    if (col.type === 'numeric') {
      records.forEach((r) => {
        if (r[col.key] !== null && r[col.key] !== undefined) {
          let num = r[col.key];
          if (typeof num === 'string') {
            num = parseFloat(num.replace(/^[$\u20AC\u00A3\u20B9\s]+/, '').replace(/,/g, '').replace(/%$/, ''));
          }
          r[col.key] = isNaN(num) ? null : Math.round(num * 100) / 100;
        }
      });
    }

    if (col.type === 'date') {
      records.forEach((r) => {
        if (r[col.key] !== null && r[col.key] !== undefined) {
          const raw = r[col.key];
          if (typeof raw === 'string') {
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) {
              r[col.key] = parsed.toISOString().split('T')[0];
            }
          }
        }
      });
    }
  });

  return {
    sheetName,
    columns: columns.map(({ index, ...rest }) => rest),
    records,
    rowCount: records.length,
    columnCount: columns.length,
    duplicateRowCount,
    previewRows: records.slice(0, 200),
  };
};

/**
 * Parse an Excel or CSV buffer with full multi-sheet support
 */
const parseSpreadsheetBuffer = (buffer, options = {}) => {
  const { requestedSheet } = options;

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
    raw: true,
  });

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('The uploaded spreadsheet contains no sheets.');
  }

  const parsedSheets = {};
  sheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    if (ws) {
      parsedSheets[name] = parseWorksheetData(ws, name);
    }
  });

  const selectedSheet = requestedSheet && sheetNames.includes(requestedSheet)
    ? requestedSheet
    : sheetNames[0];

  const activeData = parsedSheets[selectedSheet] || Object.values(parsedSheets)[0];

  return {
    sheetNames,
    selectedSheet: activeData.sheetName,
    columns: activeData.columns,
    records: activeData.records,
    rowCount: activeData.rowCount,
    columnCount: activeData.columnCount,
    duplicateRowCount: activeData.duplicateRowCount,
    previewRows: activeData.previewRows,
    parsedSheets,
  };
};

module.exports = {
  parseSpreadsheetBuffer,
  parseWorksheetData,
  inferColumnType,
  isValidDateString,
};
