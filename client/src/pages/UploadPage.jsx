import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useDataset } from '../context/DatasetContext';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const UploadPage = () => {
  const { uploadDataset, loadSampleDataset, loading: sampleLoading } = useDataset();
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [requestedSheet, setRequestedSheet] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB limit.');
      return;
    }

    setFile(selectedFile);
    if (!datasetName) {
      setDatasetName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (datasetName.trim()) {
      formData.append('datasetName', datasetName.trim());
    }
    if (requestedSheet.trim()) {
      formData.append('requestedSheet', requestedSheet.trim());
    }

    try {
      const res = await uploadDataset(formData);
      if (res.success) {
        setSuccess('Dataset uploaded and analyzed successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    setError(null);
    try {
      const res = await loadSampleDataset();
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to load demo dataset.');
    }
  };

  return (
    <Layout title="Upload Dataset">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Intro Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Excel or CSV Dataset</h2>
            <p className="text-xs text-slate-500 mt-1">
              InsightAI parses your spreadsheet, validates column types, detects outliers, and builds interactive analytics instantly.
            </p>
          </div>
          <button
            onClick={handleLoadDemo}
            disabled={sampleLoading || uploading}
            className="flex items-center justify-center px-4 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            {sampleLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-brand-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-2 text-brand-600" />
            )}
            Use Supermarket Demo Dataset
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success} Redirecting to dashboard...</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-brand-500 bg-brand-50/50'
                : file
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => validateAndSetFile(e.target.files[0])}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                </p>
                <span className="mt-3 text-[11px] font-medium text-brand-600 hover:underline">
                  Click or drag another file to replace
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Drag & drop your Excel or CSV file here, or <span className="text-brand-600">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, and .csv files up to 25 MB
                </p>
              </div>
            )}
          </div>

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dataset Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Q1 Supermarket Sales"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Sheet Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Defaults to first sheet"
                value={requestedSheet}
                onChange={(e) => setRequestedSheet(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex items-center px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Spreadsheet...
                </>
              ) : (
                <>
                  Analyze Dataset
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default UploadPage;

