const mongoose = require('mongoose');

const columnMetaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ['numeric', 'categorical', 'date', 'boolean', 'unknown'],
      default: 'unknown',
    },
    missingCount: { type: Number, default: 0 },
    uniqueCount: { type: Number, default: 0 },
    sampleValues: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { _id: false }
);

const datasetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Dataset name is required'],
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    sheetName: {
      type: String,
      default: 'Sheet1',
    },
    availableSheets: [
      {
        type: String,
      },
    ],
    fileSize: {
      type: Number,
      default: 0,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    columnCount: {
      type: Number,
      default: 0,
    },
    columns: [columnMetaSchema],
    // Store preview rows (e.g. first 200 rows) for rapid display and table pagination
    previewRows: [{ type: mongoose.Schema.Types.Mixed }],
    // Full processed records stored cleanly
    records: [{ type: mongoose.Schema.Types.Mixed }],
    // Map of all parsed sheets in workbook for multi-sheet switching
    parsedSheets: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Computed deterministic statistics
    analysisSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // AI generated insights and summary
    aiInsights: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'ready',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

datasetSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Dataset', datasetSchema);

