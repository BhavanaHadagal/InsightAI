import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useDataset } from '../context/DatasetContext';
import {
  Database,
  FileSpreadsheet,
  Trash2,
  Edit2,
  ExternalLink,
  UploadCloud,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

const DatasetsPage = () => {
  const { datasets, selectedDatasetId, selectDataset, renameDataset, deleteDataset, loadSampleDataset, loading } = useDataset();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleStartRename = (d) => {
    setEditingId(d._id);
    setEditName(d.name);
  };

  const handleSaveRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await renameDataset(id, editName.trim());
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Failed to rename dataset.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDataset(id);
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete dataset.');
    }
  };

  return (
    <Layout title="My Datasets">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">Manage Your Datasets</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an active dataset for analysis, rename records, or upload new files.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadSampleDataset()}
              disabled={loading}
              className="flex items-center px-3.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
              Load Demo Dataset
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              Upload New
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Datasets Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {datasets.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No datasets uploaded yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                Upload your first Excel or CSV spreadsheet to begin analyzing your data.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Dataset Name</th>
                    <th className="py-3 px-4">Source File</th>
                    <th className="py-3 px-4">Rows</th>
                    <th className="py-3 px-4">Columns</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {datasets.map((d) => {
                    const isSelected = d._id === selectedDatasetId;
                    const isEditing = editingId === d._id;

                    return (
                      <tr key={d._id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-xs border border-brand-500 rounded px-2 py-1 outline-none text-slate-800"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRename(d._id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <FileSpreadsheet className="w-4 h-4 text-brand-600 shrink-0" />
                              <span className="font-semibold text-slate-900">{d.name}</span>
                              {isSelected && (
                                <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-bold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                          {d.originalFilename}
                          <span className="block text-[10px] text-slate-400 font-sans">Sheet: {d.sheetName}</span>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {d.rowCount?.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">
                          {d.columnCount}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                selectDataset(d._id);
                                navigate('/dashboard');
                              }}
                              title="Open Dashboard"
                              className="px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-white hover:bg-brand-600 border border-brand-200 hover:border-brand-600 rounded-md transition-colors"
                            >
                              Analyze
                            </button>

                            <button
                              onClick={() => handleStartRename(d)}
                              title="Rename"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === d._id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDelete(d._id)}
                                  className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(d._id)}
                                title="Delete"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DatasetsPage;

