import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { BarChart3, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Key } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [devInfo, setDevInfo] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setDevInfo(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(res.data.message);
      if (res.data.devResetUrl) {
        setDevInfo({
          url: res.data.devResetUrl,
          note: res.data.devNote,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30">
            <Key className="w-6 h-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="mt-1 text-xs text-slate-400">
            Enter your account email to receive a password recovery link
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Request Received</p>
                <p className="mt-1 leading-relaxed">{successMessage}</p>
              </div>
            </div>

            {/* Development helper link if SMTP not configured */}
            {devInfo && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200 space-y-2">
                <span className="font-bold text-[10px] uppercase tracking-wider text-blue-400">
                  Development Mode
                </span>
                <p className="text-[11px] text-slate-300">{devInfo.note}</p>
                <a
                  href={devInfo.url}
                  className="block text-brand-400 underline font-mono text-[11px] break-all hover:text-brand-300"
                >
                  Click here to proceed to Password Reset Form
                </a>
              </div>
            )}

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center text-xs font-semibold text-brand-400 hover:text-brand-300">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </button>

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

