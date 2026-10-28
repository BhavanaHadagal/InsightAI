import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const DEFAULT_SUGGESTED_QUESTIONS = [
  'Summarize this dataset.',
  'Which category has the highest value?',
  'What trends do you observe?',
  'Are there missing or unusual values?',
  'Compare the top-performing categories.',
];

const AiChatPanel = ({ datasetId, datasetName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configWarning, setConfigWarning] = useState(null);
  const chatContainerRef = useRef(null);

  // Fetch chat history for this dataset
  const fetchHistory = async () => {
    if (!datasetId) return;
    try {
      const res = await api.get(`/datasets/${datasetId}/history`);
      if (res.data.success && res.data.history) {
        const formatted = [];
        res.data.history
          .filter((h) => h.analysisType === 'chat')
          .forEach((h) => {
            if (h.userQuestion) {
              formatted.push({ id: `${h._id}-q`, role: 'user', content: h.userQuestion });
            }
            if (h.aiResponse) {
              formatted.push({ id: `${h._id}-a`, role: 'assistant', content: h.aiResponse, chart: h.suggestedChart });
            }
          });
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [datasetId]);

  useEffect(() => {
    // Only scroll the internal chat messages container, never the outer window or dashboard
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || !datasetId || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: textToSend.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setConfigWarning(null);

    try {
      const res = await api.post(`/datasets/${datasetId}/chat`, {
        question: textToSend.trim(),
      });

      if (res.data.success) {
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.answer,
          chart: res.data.suggestedChart,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        if (res.data.isConfigured === false) {
          setConfigWarning(res.data.message);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: res.data.message || 'Unable to generate response.',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[560px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">InsightAI Assistant</h2>
            <p className="text-[11px] text-slate-500 truncate max-w-[160px] xs:max-w-[220px] sm:max-w-xs">
              Active: {datasetName || 'No dataset selected'}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Clear Chat Screen"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Warning if AI key is missing */}
      {configWarning && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{configWarning}</span>
        </div>
      )}

      {/* Message List */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Ask Anything About Your Data</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Ask questions grounded strictly in your spreadsheet's computed statistics and distributions.
            </p>

            {/* Suggested Questions */}
            <div className="w-full max-w-md space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Suggested Prompts
              </span>
              <div className="flex flex-col space-y-1.5 text-left">
                {DEFAULT_SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-xs text-slate-700 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-lg px-3 py-2 text-left transition-colors flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-brand-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end space-x-2">
                  <div className="max-w-[80%] bg-brand-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs shadow-sm leading-relaxed">
                    {msg.content}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-brand-700 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              );
            }

            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {msg.content}
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex justify-start space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px] shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-800 leading-relaxed shadow-sm space-y-2 whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex justify-start space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px]">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-500 flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
              <span>Analyzing data and synthesizing response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this dataset..."
          disabled={loading || !datasetId}
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !datasetId}
          className="p-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default AiChatPanel;

