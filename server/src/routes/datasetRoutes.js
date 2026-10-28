const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadDataset,
  loadSampleDataset,
  switchDatasetWorksheet,
  updateColumnType,
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetPreview,
} = require('../controllers/datasetController');

const router = express.Router();

router.use(ensureAuthenticated);

router.post('/upload', upload.single('file'), uploadDataset);
router.post('/sample', loadSampleDataset);
router.post('/:id/sheet', switchDatasetWorksheet);
router.patch('/:id/columns', updateColumnType);
router.get('/', getDatasets);
router.get('/:id', getDatasetById);
router.patch('/:id', updateDataset);
router.delete('/:id', deleteDataset);
router.get('/:id/preview', getDatasetPreview);

module.exports = router;
