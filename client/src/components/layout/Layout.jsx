import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, title }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef(null);
  const location = useLocation();

  // Always reset scroll to the top when navigating or mounting
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

