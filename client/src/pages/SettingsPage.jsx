import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Settings, User, Key, Mail, Cpu, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <Layout title="Settings & Integrations">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full border border-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Status: Active
                </span>
                {user?.googleId && (
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                    Google OAuth Linked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Integration Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Platform Integrations Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current environment configuration detected on the InsightAI server.
            </p>
          </div>

          <div className="space-y-3">
            {/* AI Provider */}
            <div className="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">AI Provider (Gemini / OpenAI compatible)</h4>
                  <p className="text-[11px] text-slate-500">Powers dataset summaries and natural language chat</p>
                </div>
              </div>
              <div>
                {health?.aiConfigured ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Configured
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Missing Key
                  </span>
                )}
              </div>
            </div>

            {/* Google OAuth */}
            <div className="p-3 rounded-lg border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Google OAuth 2.0</h4>
                  <p className="text-[11px] text-slate-500">Sign in with Google credentials</p>
                </div>
              </div>
              <div>
                {health?.googleOAuthConfigured ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Configured
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Optional
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs text-slate-600">
            <p className="font-semibold text-slate-800">To configure credentials:</p>
            <p className="mt-1 font-mono text-[11px] text-slate-700">Edit server/.env with your API keys and restart the backend.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;

