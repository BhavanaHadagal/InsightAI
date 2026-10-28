const XLSX = require('xlsx');
const { generateAnalysisPdf } = require('../services/pdfService');
const { getDatasetById: findDataset } = require('../services/dataStorage');

// Export dataset records to CSV
const exportCsv = async (req, res, next) => {
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
        message: 'You do not have permission to export this dataset.',
      });
    }

    const records = dataset.records || [];
    const worksheet = XLSX.utils.json_to_sheet(records);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    const safeFilename = encodeURIComponent(dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_'));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.csv"`);

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Export dataset analysis to PDF
const exportPdf = async (req, res, next) => {
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
        message: 'You do not have permission to export this report.',
      });
    }

    const safeFilename = encodeURIComponent(dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}-report.pdf"`);

    generateAnalysisPdf(dataset, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportCsv,
  exportPdf,
};
