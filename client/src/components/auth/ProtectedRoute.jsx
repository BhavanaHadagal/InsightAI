import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [takingLong, setTakingLong] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setTakingLong(true);
      }, 2500);
    } else {
      setTakingLong(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center space-y-3 text-center max-w-sm">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Authenticating session...</p>
          {takingLong && (
            <p className="text-xs text-slate-500 animate-pulse">
              Waking up cloud server (Render free tier may take a few moments)...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

