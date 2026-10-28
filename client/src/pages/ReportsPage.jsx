import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useDataset } from '../context/DatasetContext';
import { FileText, Download, Printer, FileSpreadsheet, CheckCircle2, Bot, Sparkles, Loader2 } from 'lucide-react';
import api from '../services/api';

const ReportsPage = () => {
  const { selectedDataset } = useDataset();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  if (!selectedDataset) {
    return (
      <Layout title="Reports & Exports">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-800">No Dataset Selected</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please choose a dataset from the top navigation to export reports.
          </p>
        </div>
      </Layout>
    );
  }

  const kpis = selectedDataset.analysisSummary?.kpis || {};
  const numericStats = selectedDataset.analysisSummary?.numericStats || {};

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!selectedDataset?._id || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/datasets/${selectedDataset._id}/export/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = (selectedDataset.name || 'InsightAI').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${cleanName}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!selectedDataset?._id || downloadingCsv) return;
    setDownloadingCsv(true);
    try {
      const res = await api.get(`/datasets/${selectedDataset._id}/export/csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = (selectedDataset.name || 'InsightAI').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${cleanName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <Layout title="Reports & Exports">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Export Action Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Analysis & Data Exports</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Export raw records or generate a publication-ready PDF executive report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              className="flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              {downloadingCsv ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
              )}
              {downloadingCsv ? 'Downloading CSV...' : 'Download CSV'}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg shadow-sm transition-colors"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-2" />
              )}
              {downloadingPdf ? 'Generating PDF...' : 'Generate PDF Report'}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 mr-2 text-slate-500" />
              Print
            </button>
          </div>
        </div>

        {/* Printable Preview Document */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-brand-600 font-bold text-xl tracking-tight">
                <span>InsightAI</span>
                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                  CONFIDENTIAL REPORT
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-2">{selectedDataset.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Original file: {selectedDataset.originalFilename} • Worksheet: {selectedDataset.sheetName}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Report Date</p>
              <p className="font-semibold text-slate-700 mt-0.5">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Section 1: Deterministic Metrics */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Computed Key Metrics (Deterministic Facts)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Records</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedDataset.rowCount?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total {kpis.primaryMetricName || 'Value'}</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{kpis.totalPrimaryValue?.toLocaleString() ?? 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Average per Record</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{kpis.averagePrimaryValue?.toLocaleString() ?? 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Data Quality</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{kpis.totalMissingCells || 0} missing cells</p>
              </div>
            </div>
          </div>

          {/* Section 2: Metric Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              2. Numerical Distribution Summary
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Sum</th>
                    <th className="py-2.5 px-3">Mean</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Min - Max</th>
                    <th className="py-2.5 px-3">IQR Outliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Object.entries(numericStats).slice(0, 8).map(([key, stat]) => (
                    <tr key={key}>
                      <td className="py-2 px-3 font-medium text-slate-900">{stat.name}</td>
                      <td className="py-2 px-3">{stat.sum?.toLocaleString()}</td>
                      <td className="py-2 px-3">{stat.mean?.toLocaleString()}</td>
                      <td className="py-2 px-3">{stat.median?.toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{stat.min} — {stat.max}</td>
                      <td className="py-2 px-3 font-medium text-amber-700">{stat.outliersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: AI-Generated Interpretation */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. AI Strategic Interpretation & Recommendations
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 italic mb-4">
              Note: Generated by configured AI provider grounded in the deterministic computations above.
            </p>

            <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedDataset.aiInsights?.reply ||
                'No automated AI insights generated yet. Click "Generate Full AI Insights" on the AI Insights tab to populate this section.'}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;

