import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useDataset } from '../context/DatasetContext';
import KpiCard from '../components/dashboard/KpiCard';
import MainChart from '../components/dashboard/MainChart';
import DataTable from '../components/dashboard/DataTable';
import AiChatPanel from '../components/chat/AiChatPanel';
import {
  Database,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Loader2,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';

const DashboardPage = () => {
  const {
    selectedDataset,
    datasets,
    loading,
    datasetLoading,
    loadSampleDataset,
    switchWorksheet,
  } = useDataset();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'records' | 'chat' | 'quality'
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="h-96 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading analytics workspace...</p>
        </div>
      </Layout>
    );
  }

  // Empty state if no datasets uploaded yet
  if (!datasets || datasets.length === 0) {
    return (
      <Layout title="Dashboard">
        <div className="max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Welcome to InsightAI</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Upload an Excel (.xlsx, .xls) or CSV file to unlock deterministic analytics, dynamic charts, and AI-powered insights.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Your Dataset
            </button>
            <button
              onClick={() => loadSampleDataset()}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2 text-brand-600" />
              Try Supermarket Sales Demo
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (datasetLoading || !selectedDataset) {
    return (
      <Layout title="Dashboard">
        <div className="h-96 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Switching worksheet and analyzing metrics...</p>
        </div>
      </Layout>
    );
  }

  const kpis = selectedDataset.analysisSummary?.kpis || {};
  const dataQuality = selectedDataset.analysisSummary?.dataQuality || {};
  const isSales = Boolean(kpis.isSalesDataset);

  // Currency / number formatter
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      return isSales
        ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : val.toLocaleString();
    }
    return String(val);
  };

  const availableSheets = selectedDataset.availableSheets || [];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Active Sheet Banner */}
        {availableSheets.length > 1 && (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center space-x-2 text-slate-700">
              <Layers className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Workbook has <strong className="text-slate-900">{availableSheets.length} worksheets</strong>. Currently analyzing:</span>
              <strong className="text-brand-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                {selectedDataset.sheetName}
              </strong>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 font-medium">Switch Worksheet:</span>
              <select
                value={selectedDataset.sheetName}
                onChange={(e) => switchWorksheet(e.target.value)}
                className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-700 outline-none cursor-pointer focus:ring-1 focus:ring-brand-500"
              >
                {availableSheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Top KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Primary Value / Total Sales */}
          <KpiCard
            title={kpis.primaryKpiTitle || (isSales ? 'Total Sales' : 'Total Value')}
            value={formatValue(kpis.totalPrimaryValue)}
            subtitle={`Metric: ${kpis.primaryMetricName || 'Calculated'}`}
            icon={isSales ? DollarSign : TrendingUp}
            badge="Deterministic"
            color="emerald"
          />

          {/* Card 2: Total Transactions */}
          <KpiCard
            title={kpis.transKpiTitle || (isSales ? 'Total Transactions' : 'Total Records')}
            value={(kpis.validTransactions ?? selectedDataset.rowCount)?.toLocaleString()}
            subtitle={`${selectedDataset.columnCount} columns detected`}
            icon={Database}
            badge={`${selectedDataset.rowCount} rows`}
            color="blue"
          />

          {/* Card 3: Average Transaction Value */}
          <KpiCard
            title={kpis.avgKpiTitle || (isSales ? 'Average Transaction Value' : 'Average Value')}
            value={formatValue(kpis.averagePrimaryValue)}
            subtitle="Mean amount per record"
            icon={TrendingUp}
            badge="Calculated"
            color="purple"
          />

          {/* Card 4: Data Quality Card */}
          <KpiCard
            title="Data Quality"
            value={`${dataQuality.completenessPct ?? 100}%`}
            subtitle={`${dataQuality.missingCells ?? 0} missing cells • ${dataQuality.duplicateRows ?? 0} duplicates`}
            icon={ShieldCheck}
            badge={dataQuality.missingCells > 0 ? `${dataQuality.missingCells} missing` : 'Optimal'}
            color={dataQuality.completenessPct >= 95 ? 'emerald' : 'amber'}
          />
        </div>

        {/* Data Quality Details Banner */}
        {(dataQuality.missingCells > 0 || dataQuality.outliersTotal > 0 || dataQuality.duplicateRows > 0) && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Data Quality Notice:</strong> Detected {dataQuality.missingCells || 0} missing values,{' '}
                {dataQuality.duplicateRows || 0} duplicate rows, and {dataQuality.outliersTotal || 0} statistical outliers (IQR rule).
              </span>
            </div>
            <button
              onClick={() => setShowQualityDetails(!showQualityDetails)}
              className="text-amber-800 underline hover:text-amber-950 font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              {showQualityDetails ? 'Hide Audit Details' : 'View Quality Audit'}
            </button>
          </div>
        )}

        {/* Quality Audit Expandable Drawer */}
        {showQualityDetails && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Spreadsheet Quality Audit Breakdown</h3>
              <span className="text-xs text-slate-400 font-mono">Worksheet: {selectedDataset.sheetName}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Missing Values breakdown */}
              <div className="border border-slate-100 bg-slate-50 rounded-lg p-3">
                <span className="font-bold text-slate-700 block mb-2">Columns with Missing Values:</span>
                {(dataQuality.missingColumns || []).length === 0 ? (
                  <p className="text-emerald-600 font-medium">✓ No missing values detected in any column.</p>
                ) : (
                  <ul className="space-y-1">
                    {(dataQuality.missingColumns || []).map((m, idx) => (
                      <li key={idx} className="flex justify-between text-slate-600">
                        <span>• {m.column}:</span>
                        <strong className="text-amber-700">{m.missingCount} cells ({m.percentage}%)</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Outliers breakdown */}
              <div className="border border-slate-100 bg-slate-50 rounded-lg p-3">
                <span className="font-bold text-slate-700 block mb-2">Numeric Outliers (1.5x IQR Rule):</span>
                {(dataQuality.outliersList || []).length === 0 ? (
                  <p className="text-emerald-600 font-medium">✓ No extreme outliers detected.</p>
                ) : (
                  <ul className="space-y-1">
                    {(dataQuality.outliersList || []).slice(0, 4).map((o, idx) => (
                      <li key={idx} className="text-slate-600">
                        • <strong>{o.column}</strong>: {o.count} outliers [Bounds: {o.lowerBound} to {o.upperBound}]
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Visual Analytics
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'records'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Data Table
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              AI Assistant
            </button>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => navigate('/insights')}
              className="flex items-center text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 sm:px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Full Insights
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
              Export
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Visualizer Chart */}
            <MainChart dataset={selectedDataset} />

            {/* Bottom 2-col Split: AI Chat Panel + Quick Table Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AiChatPanel datasetId={selectedDataset._id} datasetName={`${selectedDataset.name} (${selectedDataset.sheetName})`} />
              <div className="space-y-4">
                <DataTable datasetId={selectedDataset._id} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-4">
            <DataTable datasetId={selectedDataset._id} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <AiChatPanel datasetId={selectedDataset._id} datasetName={`${selectedDataset.name} (${selectedDataset.sheetName})`} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
