// components/Sidebar.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Mail, BarChart3, Upload, Settings, Zap, ChevronLeft, ChevronRight, Calendar, ShieldAlert, Code, Moon, Sun, AlertTriangle, Skull } from 'lucide-react';
import gsap from 'gsap';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { id: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/leads', label: 'Leads', icon: Users },
  { id: '/failed-leads', label: 'Failed Outreach', icon: ShieldAlert },
  { id: '/terminal-states', label: 'Terminal States', icon: Skull },
  { id: '/schedule', label: 'Calendar', icon: Calendar },
  { id: '/emails', label: 'Email Queue', icon: Mail },
  { id: '/analytics', label: 'Analytics', icon: BarChart3 },
  { id: '/templates', label: 'Templates', icon: Code },
  { id: '/conditional-emails', label: 'Conditional Emails', icon: Zap },
  { id: '/upload', label: 'Upload Leads', icon: Upload },
];


export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logoRef = useRef(null);
  const navRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  // (Removed local theme state logic)

  useEffect(() => {
    // Animate logo on mount
    if (logoRef.current) {
      gsap.fromTo(logoRef.current, 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }

    // Animate nav items on mount
    if (navRef.current) {
      gsap.fromTo(
        navRef.current.children,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, []);

  const handleNavClick = (path) => {
    navigate(path);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo" ref={logoRef}>
          <img
            src="/LOGO ICON PNG 1.png"
            alt="OutFlow Logo"
            style={{ width: 32, height: 32, borderRadius: 6 }}
          />
          <h1>OutFlow</h1>
        </div>
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav" ref={navRef}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${isActive(item.id) ? "active" : ""} ${isCollapsed ? "tooltip" : ""}`}
            onClick={() => handleNavClick(item.id)}
            data-tooltip={item.label}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`nav-item ${isCollapsed ? "tooltip" : ""}`}
          data-tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}
          style={{ marginBottom: "0.5rem" }}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button
          onClick={() => handleNavClick("/settings")}
          className={`nav-item ${isActive("/settings") ? "active" : ""} ${isCollapsed ? "tooltip" : ""}`}
          data-tooltip="Settings"
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
