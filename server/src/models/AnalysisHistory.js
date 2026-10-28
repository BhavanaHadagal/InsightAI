const mongoose = require('mongoose');

const analysisHistorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dataset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
      index: true,
    },
    analysisType: {
      type: String,
      enum: ['chat', 'summary', 'custom_query', 'outliers', 'correlation'],
      default: 'chat',
    },
    userQuestion: {
      type: String,
      trim: true,
    },
    computedResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiResponse: {
      type: String,
      required: true,
    },
    suggestedChart: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

analysisHistorySchema.index({ owner: 1, dataset: 1, createdAt: -1 });

module.exports = mongoose.model('AnalysisHistory', analysisHistorySchema);

