import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../../context/DatasetContext';
import { UploadCloud, Database, Sparkles, ChevronDown, FileSpreadsheet, Layers } from 'lucide-react';

const Header = ({ title = 'Dashboard' }) => {
  const {
    datasets,
    selectedDatasetId,
    selectDataset,
    selectedDataset,
    loadSampleDataset,
    switchWorksheet,
    loading,
    datasetLoading,
  } = useDataset();
  const navigate = useNavigate();

  const availableSheets = selectedDataset?.availableSheets || [];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Title, Dataset & Worksheet Selectors */}
      <div className="flex items-center space-x-4 lg:space-x-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>

        {/* Global Dataset Selector */}
        {datasets.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors">
              <Database className="w-4 h-4 text-brand-600 mr-2 shrink-0" />
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => selectDataset(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-4 appearance-none"
              >
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.rowCount} rows)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-2" />
            </div>

            {/* Interactive Worksheet Selector */}
            {selectedDataset && (
              <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors">
                <Layers className="w-3.5 h-3.5 text-brand-600 mr-1.5 shrink-0" />
                <span className="text-[11px] text-slate-500 font-medium mr-1.5">Sheet:</span>
                {availableSheets.length > 1 ? (
                  <select
                    value={selectedDataset.sheetName}
                    disabled={datasetLoading}
                    onChange={(e) => switchWorksheet(e.target.value)}
                    className="bg-transparent text-xs font-bold text-brand-700 outline-none cursor-pointer pr-4 appearance-none"
                  >
                    {availableSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-brand-700">{selectedDataset.sheetName}</span>
                )}
                {availableSheets.length > 1 && (
                  <ChevronDown className="w-3 h-3 text-brand-600 pointer-events-none -ml-2" />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-3">
        {datasets.length === 0 && (
          <button
            onClick={() => loadSampleDataset()}
            disabled={loading}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
            Load Demo Data
          </button>
        )}

        <button
          onClick={() => navigate('/upload')}
          className="flex items-center px-3.5 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
        >
          <UploadCloud className="w-4 h-4 mr-1.5" />
          Upload Dataset
        </button>
      </div>
    </header>
  );
};

export default Header;
