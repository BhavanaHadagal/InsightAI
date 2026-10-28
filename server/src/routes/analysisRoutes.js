const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  analyzeDatasetInsights,
  getDatasetAnalysis,
  chatWithDatasetHandler,
  getAnalysisHistory,
} = require('../controllers/analysisController');

const router = express.Router();

router.use(ensureAuthenticated);

router.post('/:id/analyze', aiLimiter, analyzeDatasetInsights);
router.get('/:id/analysis', getDatasetAnalysis);
router.post('/:id/chat', aiLimiter, chatWithDatasetHandler);
router.get('/:id/history', getAnalysisHistory);

module.exports = router;

