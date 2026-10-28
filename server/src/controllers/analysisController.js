const { generateDatasetInsights, chatWithDataset } = require('../services/aiService');
const {
  getDatasetById: findDataset,
  createHistory,
  getHistoryByDataset,
} = require('../services/dataStorage');

// Generate or regenerate full AI dataset insights
const analyzeDatasetInsights = async (req, res, next) => {
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
        message: 'You do not have permission to analyze this dataset.',
      });
    }

    const aiResult = await generateDatasetInsights(dataset, dataset.analysisSummary);

    if (aiResult.success) {
      dataset.aiInsights = {
        reply: aiResult.reply,
        generatedAt: new Date(),
        model: process.env.AI_MODEL || 'gemini-3.8-flash',
      };
      await dataset.save();

      await createHistory({
        owner: ownerId,
        dataset: dataset._id,
        analysisType: 'summary',
        userQuestion: 'Generate executive summary & automated insights',
        computedResults: dataset.analysisSummary?.kpis,
        aiResponse: aiResult.reply,
      });

      return res.status(200).json({
        success: true,
        aiInsights: dataset.aiInsights,
        isConfigured: true,
      });
    } else {
      return res.status(200).json({
        success: false,
        isConfigured: aiResult.isConfigured,
        message: aiResult.message,
        aiInsights: dataset.aiInsights,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get current analysis and insights
const getDatasetAnalysis = async (req, res, next) => {
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
        message: 'You do not have permission to view this dataset analysis.',
      });
    }

    return res.status(200).json({
      success: true,
      dataset: {
        _id: dataset._id,
        name: dataset.name,
        originalFilename: dataset.originalFilename,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        analysisSummary: dataset.analysisSummary,
        aiInsights: dataset.aiInsights,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Chat with dataset
const chatWithDatasetHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid question.',
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
        message: 'You do not have permission to query this dataset.',
      });
    }

    const allHistory = await getHistoryByDataset(dataset._id);
    const previousHistory = allHistory
      .filter((h) => h.analysisType === 'chat')
      .slice(-6);

    const result = await chatWithDataset(
      dataset,
      dataset.analysisSummary,
      question,
      previousHistory
    );

    if (result.success) {
      let suggestedChart = null;
      const chartMatch = result.reply.match(/```chart\s*([\s\S]*?)\s*```/);
      if (chartMatch && chartMatch[1]) {
        try {
          suggestedChart = JSON.parse(chartMatch[1]);
        } catch (e) {
          // ignore chart parse error
        }
      }

      const historyRecord = await createHistory({
        owner: ownerId,
        dataset: dataset._id,
        analysisType: 'chat',
        userQuestion: question.trim(),
        computedResults: dataset.analysisSummary?.kpis,
        aiResponse: result.reply,
        suggestedChart,
      });

      return res.status(200).json({
        success: true,
        answer: result.reply,
        suggestedChart,
        historyId: historyRecord._id,
      });
    } else {
      return res.status(200).json({
        success: false,
        isConfigured: result.isConfigured,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get Analysis & Chat History
const getAnalysisHistory = async (req, res, next) => {
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
        message: 'You do not have permission to view this history.',
      });
    }

    const history = await getHistoryByDataset(dataset._id);

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeDatasetInsights,
  getDatasetAnalysis,
  chatWithDatasetHandler,
  getAnalysisHistory,
};
