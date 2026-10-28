import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useDataset } from '../context/DatasetContext';
import api from '../services/api';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, Bot, ArrowRight } from 'lucide-react';
import AiChatPanel from '../components/chat/AiChatPanel';

const AiInsightsPage = () => {
  const { selectedDataset, refreshSelectedDataset } = useDataset();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [aiConfigMessage, setAiConfigMessage] = useState(null);

  const handleGenerateInsights = async () => {
    if (!selectedDataset) return;
    setAnalyzing(true);
    setError(null);
    setAiConfigMessage(null);

    try {
      const res = await api.post(`/datasets/${selectedDataset._id}/analyze`);
      if (res.data.success) {
        await refreshSelectedDataset();
      } else {
        if (res.data.isConfigured === false) {
          setAiConfigMessage(res.data.message);
        } else {
          setError(res.data.message || 'Failed to generate insights.');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred while generating insights.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!selectedDataset) {
    return (
      <Layout title="AI Insights">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-12">
          <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-800">No Dataset Selected</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please upload or choose a dataset from the top navigation to generate AI insights.
          </p>
        </div>
      </Layout>
    );
  }

  const insights = selectedDataset.aiInsights;

  return (
    <Layout title="AI Insights">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner with generate button */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Executive AI Analysis: {selectedDataset.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grounded in {selectedDataset.rowCount} records and deterministic metrics.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={analyzing}
            className="flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Synthesizing Insights...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                {insights ? 'Regenerate Insights' : 'Generate Full AI Insights'}
              </>
            )}
          </button>
        </div>

        {/* AI Key configuration warning if needed */}
        {aiConfigMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Provider Not Configured</p>
              <p className="mt-0.5">{aiConfigMessage}</p>
              <p className="mt-1 text-[11px] text-amber-700 font-mono">
                Tip: Add AI_API_KEY=your_key in server/.env (supports Gemini or OpenAI compatible endpoints)
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated Insights Content or Empty Prompt */}
        {insights ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Automated Synthesis
              </span>
              <span className="text-[11px] text-slate-400">
                Generated {new Date(insights.generatedAt).toLocaleString()} • Model: {insights.model}
              </span>
            </div>

            <div className="prose prose-sm max-w-none text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
              {insights.reply}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
            <Sparkles className="w-10 h-10 text-brand-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Insights Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Click the button above to synthesize patterns, anomalies, and recommendations directly from your data.
            </p>
            <button
              onClick={handleGenerateInsights}
              disabled={analyzing}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
            >
              Generate Now
            </button>
          </div>
        )}

        {/* Embedded Interactive Assistant */}
        <div className="pt-4">
          <AiChatPanel datasetId={selectedDataset._id} datasetName={selectedDataset.name} />
        </div>
      </div>
    </Layout>
  );
};

export default AiInsightsPage;
