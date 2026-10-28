const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const { exportCsv, exportPdf } = require('../controllers/reportController');

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/:id/export/csv', exportCsv);
router.get('/:id/export/pdf', exportPdf);

module.exports = router;

