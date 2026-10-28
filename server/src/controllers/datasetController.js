const fs = require('fs');
const path = require('path');
const { parseSpreadsheetBuffer } = require('../services/excelParser');
const { analyzeDataset } = require('../services/analyticsEngine');
const { generateSampleExcel } = require('../utils/sampleData');
const {
  createDataset,
  getDatasetsByOwner,
  getDatasetById: findDataset,
  deleteDatasetById,
} = require('../services/dataStorage');

// Upload and process dataset
const uploadDataset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
      });
    }

    const { requestedSheet, datasetName } = req.body;
    const originalFilename = req.file.originalname;
    const fileSize = req.file.size;

    const parsed = parseSpreadsheetBuffer(req.file.buffer, { requestedSheet });
    const analysisSummary = analyzeDataset(parsed.records, parsed.columns, parsed.duplicateRowCount);

    const ownerId = req.user._id || req.user.id;

    const dataset = await createDataset({
      owner: ownerId,
      name: datasetName && datasetName.trim() ? datasetName.trim() : originalFilename.replace(/\.[^/.]+$/, ''),
      originalFilename,
      fileSize,
      sheetName: parsed.selectedSheet,
      availableSheets: parsed.sheetNames,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      columns: parsed.columns,
      previewRows: parsed.previewRows,
      records: parsed.records,
      parsedSheets: parsed.parsedSheets,
      analysisSummary,
      processingStatus: 'ready',
    });

    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded and analyzed successfully.',
      dataset: {
        _id: dataset._id,
        name: dataset.name,
        originalFilename: dataset.originalFilename,
        sheetName: dataset.sheetName,
        availableSheets: dataset.availableSheets,
        fileSize: dataset.fileSize,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        analysisSummary: dataset.analysisSummary,
        previewRows: dataset.previewRows.slice(0, 50),
        createdAt: dataset.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Load Built-in / Sample Dataset (Supermarket Sales)
const loadSampleDataset = async (req, res, next) => {
  try {
    const sampleFilePath = path.resolve(__dirname, '../../../sample-data/supermarket_sales_ai_analyzer.xlsx');
    if (!fs.existsSync(sampleFilePath)) {
      generateSampleExcel(sampleFilePath);
    }

    const buffer = fs.readFileSync(sampleFilePath);
    const parsed = parseSpreadsheetBuffer(buffer, { requestedSheet: 'Sales_Transactions' });
    const analysisSummary = analyzeDataset(parsed.records, parsed.columns, parsed.duplicateRowCount);

    const ownerId = req.user._id || req.user.id;

    const dataset = await createDataset({
      owner: ownerId,
      name: 'Supermarket Sales & Performance Demo',
      originalFilename: 'supermarket_sales_ai_analyzer.xlsx',
      fileSize: buffer.length,
      sheetName: parsed.selectedSheet,
      availableSheets: parsed.sheetNames,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      columns: parsed.columns,
      previewRows: parsed.previewRows,
      records: parsed.records,
      parsedSheets: parsed.parsedSheets,
      analysisSummary,
      processingStatus: 'ready',
    });

    return res.status(201).json({
      success: true,
      message: 'Demo dataset loaded successfully.',
      dataset: {
        _id: dataset._id,
        name: dataset.name,
        originalFilename: dataset.originalFilename,
        sheetName: dataset.sheetName,
        availableSheets: dataset.availableSheets,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        analysisSummary: dataset.analysisSummary,
        previewRows: dataset.previewRows.slice(0, 50),
        createdAt: dataset.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Switch active worksheet in a multi-sheet workbook
const switchDatasetWorksheet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sheetName } = req.body;

    if (!sheetName || typeof sheetName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid sheetName is required.',
      });
    }

    const dataset = await findDataset(id);
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const parsedSheets = dataset.parsedSheets || {};
    let targetSheetData = parsedSheets[sheetName];

    // If target sheet data not pre-saved, check available sheets
    if (!targetSheetData) {
      return res.status(404).json({
        success: false,
        message: `Worksheet "${sheetName}" not found in this workbook. Available sheets: ${(dataset.availableSheets || []).join(', ')}`,
      });
    }

    // Compute fresh analysis for the newly selected sheet
    const analysisSummary = analyzeDataset(
      targetSheetData.records,
      targetSheetData.columns,
      targetSheetData.duplicateRowCount || 0
    );

    dataset.sheetName = sheetName;
    dataset.columns = targetSheetData.columns;
    dataset.records = targetSheetData.records;
    dataset.rowCount = targetSheetData.rowCount;
    dataset.columnCount = targetSheetData.columnCount;
    dataset.previewRows = targetSheetData.previewRows;
    dataset.analysisSummary = analysisSummary;
    dataset.aiInsights = null; // Reset insights for new worksheet

    await dataset.save();

    return res.status(200).json({
      success: true,
      message: `Switched to worksheet "${sheetName}".`,
      dataset: {
        _id: dataset._id,
        name: dataset.name,
        originalFilename: dataset.originalFilename,
        sheetName: dataset.sheetName,
        availableSheets: dataset.availableSheets,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        analysisSummary: dataset.analysisSummary,
        previewRows: dataset.previewRows.slice(0, 50),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Manually change a column's detected data type
const updateColumnType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columnKey, newType } = req.body;

    const validTypes = ['numeric', 'categorical', 'date', 'boolean'];
    if (!columnKey || !validTypes.includes(newType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid column type change. Expected newType to be one of: ${validTypes.join(', ')}`,
      });
    }

    const dataset = await findDataset(id);
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const colIndex = (dataset.columns || []).findIndex((c) => c.key === columnKey);
    if (colIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Column "${columnKey}" not found in dataset.`,
      });
    }

    // Update column type
    dataset.columns[colIndex].type = newType;

    // Convert records to match new type
    (dataset.records || []).forEach((r) => {
      if (r[columnKey] !== null && r[columnKey] !== undefined) {
        if (newType === 'numeric') {
          let num = r[columnKey];
          if (typeof num === 'string') {
            num = parseFloat(num.replace(/^[$\u20AC\u00A3\u20B9\s]+/, '').replace(/,/g, '').replace(/%$/, ''));
          }
          r[columnKey] = isNaN(num) ? null : Math.round(num * 100) / 100;
        } else if (newType === 'date') {
          const parsed = new Date(r[columnKey]);
          if (!isNaN(parsed.getTime())) {
            r[columnKey] = parsed.toISOString().split('T')[0];
          }
        } else if (newType === 'boolean') {
          const str = String(r[columnKey]).toLowerCase().trim();
          r[columnKey] = str === 'true' || str === 'yes' || str === '1';
        } else if (newType === 'categorical') {
          r[columnKey] = String(r[columnKey]);
        }
      }
    });

    // Recompute deterministic analysis with the new column type
    const analysisSummary = analyzeDataset(dataset.records, dataset.columns, dataset.duplicateRowCount || 0);
    dataset.analysisSummary = analysisSummary;

    // Also update previewRows
    dataset.previewRows = (dataset.records || []).slice(0, 200);

    await dataset.save();

    return res.status(200).json({
      success: true,
      message: `Column "${dataset.columns[colIndex].name}" changed to ${newType}.`,
      columns: dataset.columns,
      analysisSummary: dataset.analysisSummary,
    });
  } catch (error) {
    next(error);
  }
};

// Get all datasets owned by current user
const getDatasets = async (req, res, next) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const datasets = await getDatasetsByOwner(ownerId);

    return res.status(200).json({
      success: true,
      datasets,
    });
  } catch (error) {
    next(error);
  }
};

// Get single dataset by ID
const getDatasetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataset = await findDataset(id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.',
      });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this dataset.',
      });
    }

    return res.status(200).json({
      success: true,
      dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Update / Rename dataset
const updateDataset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dataset name cannot be blank.',
      });
    }

    const dataset = await findDataset(id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.',
      });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this dataset.',
      });
    }

    dataset.name = name.trim();
    await dataset.save();

    return res.status(200).json({
      success: true,
      message: 'Dataset renamed successfully.',
      dataset: {
        _id: dataset._id,
        name: dataset.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete dataset
const deleteDataset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataset = await findDataset(id);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.',
      });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this dataset.',
      });
    }

    await deleteDatasetById(id);

    return res.status(200).json({
      success: true,
      message: 'Dataset and associated history deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Paginated data table preview with search & sort
const getDatasetPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const dataset = await findDataset(id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.',
      });
    }

    const ownerId = req.user._id || req.user.id;
    if (dataset.owner && dataset.owner.equals && !dataset.owner.equals(ownerId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this dataset.',
      });
    }

    let records = dataset.records || [];

    if (search) {
      records = records.filter((r) => {
        return Object.values(r).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(search);
        });
      });
    }

    if (sortBy) {
      records.sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * sortOrder;
        }

        return String(valA).localeCompare(String(valB)) * sortOrder;
      });
    }

    const totalFiltered = records.length;
    const totalPages = Math.ceil(totalFiltered / limit);
    const startIndex = (page - 1) * limit;
    const paginatedRecords = records.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      columns: dataset.columns,
      totalRows: totalFiltered,
      page,
      limit,
      totalPages,
      rows: paginatedRecords,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDataset,
  loadSampleDataset,
  switchDatasetWorksheet,
  updateColumnType,
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetPreview,
};
