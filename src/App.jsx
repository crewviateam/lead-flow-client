// App.jsx
// Main application with code splitting, real-time updates, and optimized routing
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import NotificationCenter from './components/NotificationCenter';
import { ToastContainer } from './components/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { RulebookProvider } from './contexts/RulebookContext';
import { SocketProvider } from './contexts/SocketContext';
import './index.css';

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const EmailQueue = lazy(() => import('./pages/EmailQueue'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Upload = lazy(() => import('./pages/Upload'));
const Settings = lazy(() => import('./pages/Settings'));
const Schedule = lazy(() => import('./pages/Schedule'));
const FailedLeads = lazy(() => import('./pages/FailedLeads'));
const Templates = lazy(() => import('./pages/Templates'));
const ConditionalEmails = lazy(() => import('./pages/ConditionalEmails'));
const TerminalStates = lazy(() => import('./pages/TerminalStates'));

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh' 
    }}>
      <div className="loading-spinner"></div>
    </div>
  );
}

// Wrapper component to handle layout logic that needs Router context
function AppContent() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();

  useEffect(() => {
    // Initial loading animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Toast management - memoized callbacks
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (isLoading) {
    return (
      <div className="app-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading LeadFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="dashboard">
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed}
        />
        <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
          {/* Header with Notification Center */}
          <div style={{ 
            position: 'fixed', 
            top: '1rem', 
            right: '2rem', 
            zIndex: 99 
          }}>
            <NotificationCenter />
          </div>
          <div className="page-enter">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard showToast={showToast} />} />
                <Route path="/leads" element={<Leads showToast={showToast} />} />
                <Route path="/failed-leads" element={<FailedLeads showToast={showToast} />} />
                <Route path="/leads/:id" element={<LeadDetail showToast={showToast} />} />
                <Route path="/schedule" element={<Schedule showToast={showToast} />} />
                <Route path="/emails" element={<EmailQueue showToast={showToast} />} />
                <Route path="/analytics" element={<Analytics showToast={showToast} />} />
                <Route path="/templates" element={<Templates showToast={showToast} />} />
                <Route path="/conditional-emails" element={<ConditionalEmails showToast={showToast} />} />
                <Route path="/terminal-states" element={<TerminalStates showToast={showToast} />} />
                <Route path="/upload" element={<Upload showToast={showToast} />} />
                <Route path="/settings" element={<Settings showToast={showToast} />} />
                {/* Fallback route */}
                <Route path="*" element={<Dashboard showToast={showToast} />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RulebookProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </RulebookProvider>
    </ThemeProvider>
  );
}
