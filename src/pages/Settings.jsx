// pages/Settings.jsx - Enhanced Automation Software Settings
// Migrated to TanStack Query for optimal caching and mutations
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Settings as SettingsIcon, Clock, Mail, Plus, Trash2, Save, AlertCircle, Check, 
  GripVertical, RefreshCw, Calendar, Pause, Zap, Shield, Send, Bell, 
  Database, Globe, ChevronRight, ToggleLeft, ToggleRight, AlertTriangle, TrendingUp, Flame, FileText
} from 'lucide-react';
import gsap from 'gsap';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../lib/queryClient';
import { 
  getSettings, updateSettings, addFollowup, updateFollowup, deleteFollowup, 
  getTemplates, createTemplate, updateTemplate, deleteTemplate, 
  getPausedDates, pauseDate, unpauseDate, updateWeekendDays, 
  reschedulePausedEmails, testBrevoConnection,
  getRulebook, updateRulebook, resetRulebook, getDefaultRulebook
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import RulebookSection from '../components/RulebookSection';

export default function Settings({ showToast }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('rate-limit');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newFollowup, setNewFollowup] = useState({ name: '', delayDays: 3 });
  const [newPauseDate, setNewPauseDate] = useState('');
  const formRef = useRef(null);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger' });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigation sections
  const navSections = useMemo(() => [
    { id: 'rate-limit', label: 'Rate Limiting', icon: Zap, category: 'Sending' },
    { id: 'business-hours', label: 'Business Hours', icon: Clock, category: 'Sending' },
    { id: 'smart-send', label: 'Smart Send Time', icon: TrendingUp, category: 'Sending' },
    { id: 'working-days', label: 'Working Days', icon: Calendar, category: 'Sending' },
    { id: 'paused-dates', label: 'Paused Dates', icon: Pause, category: 'Sending' },
    { id: 'retry', label: 'Retry & Recovery', icon: RefreshCw, category: 'Sending' },
    { id: 'sequences', label: 'Email Sequences', icon: Mail, category: 'Automation' },
    { id: 'templates', label: 'Email Templates', icon: Send, category: 'Automation' },
    { id: 'reports', label: 'Weekly Reports', icon: FileText, category: 'Analytics' },
    { id: 'brevo', label: 'Brevo Integration', icon: Globe, category: 'Integrations' },
    { id: 'rulebook', label: 'System Rulebook', icon: Shield, category: 'Advanced' },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, category: 'Advanced' },
  ], []);

  // TanStack Query - Data fetching
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: queryKeys.settings.all(),
    queryFn: getSettings,
    ...cacheConfig.config,
  });

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.templates.all(),
    queryFn: getTemplates,
    ...cacheConfig.static,
  });

  const { data: pausedData } = useQuery({
    queryKey: ['pausedDates'],
    queryFn: () => getPausedDates().catch(() => ({ pausedDates: [], weekendDays: [0, 6] })),
    ...cacheConfig.config,
  });

  // Derived state
  const pausedDates = useMemo(() => pausedData?.pausedDates || [], [pausedData]);
  const weekendDays = useMemo(() => pausedData?.weekendDays || [0, 6], [pausedData]);
  const loading = settingsLoading;

  // Local settings state for form editing
  const [localSettings, setLocalSettings] = useState(null);
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);


  useEffect(() => {
    if (!loading && formRef.current) {
      gsap.fromTo(formRef.current,
        { x: 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [activeSection, loading]);

  // Mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });

  // Handlers - using localSettings for form state
  const handleSaveRateLimit = useCallback(async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({ rateLimit: localSettings?.rateLimit });
      showToast?.('Rate limit settings saved!', 'success');
    } catch (error) {
      showToast?.('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [localSettings?.rateLimit, updateSettingsMutation, showToast]);

  const handleSaveBusinessHours = useCallback(async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({ businessHours: localSettings?.businessHours });
      showToast?.('Business hours saved!', 'success');
    } catch (error) {
      showToast?.('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [localSettings?.businessHours, updateSettingsMutation, showToast]);

  const handleSaveReporting = useCallback(async (reportSettings) => {
    setSaving(true);
    try {
      const settingsToSave = reportSettings || localSettings?.reporting;
      await updateSettingsMutation.mutateAsync({ reporting: settingsToSave });
      if (reportSettings) {
        setLocalSettings(prev => ({ ...prev, reporting: reportSettings }));
      }
      showToast?.('Report settings saved!', 'success');
    } catch (error) {
      showToast?.('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [localSettings?.reporting, updateSettingsMutation, showToast]);


  const handleToggleWeekendDay = useCallback(async (dayIndex) => {
    try {
      let newWeekendDays;
      if (weekendDays.includes(dayIndex)) {
        newWeekendDays = weekendDays.filter(d => d !== dayIndex);
      } else {
        newWeekendDays = [...weekendDays, dayIndex];
      }
      
      if (newWeekendDays.length >= 7) {
        showToast?.('Cannot mark all days as weekends', 'warning');
        return;
      }
      
      await updateWeekendDays(newWeekendDays);
      queryClient.invalidateQueries({ queryKey: ['pausedDates'] });
      showToast?.('Weekend days updated!', 'success');
    } catch (error) {
      showToast?.('Failed to update: ' + error.message, 'error');
    }
  }, [weekendDays, queryClient, showToast]);

  const handlePauseDate = useCallback(async () => {
    if (!newPauseDate) {
      showToast?.('Please select a date', 'warning');
      return;
    }
    try {
      setSaving(true);
      await pauseDate(newPauseDate);
      queryClient.invalidateQueries({ queryKey: ['pausedDates'] });
      setNewPauseDate('');
      showToast?.('Date paused!', 'success');
      await reschedulePausedEmails(newPauseDate);
    } catch (error) {
      showToast?.('Failed: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [newPauseDate, queryClient, showToast]);

  const handleUnpauseDate = useCallback(async (date) => {
    try {
      await unpauseDate(date);
      queryClient.invalidateQueries({ queryKey: ['pausedDates'] });
      showToast?.('Date unpaused!', 'success');
    } catch (error) {
      showToast?.('Failed: ' + error.message, 'error');
    }
  }, [queryClient, showToast]);

  const handleAddFollowup = useCallback(async () => {
    if (!newFollowup.name || !newFollowup.delayDays) {
      showToast?.('Please enter name and delay', 'warning');
      return;
    }
    try {
      const result = await addFollowup(newFollowup);
      setLocalSettings(prev => ({ ...prev, followups: result.followups }));
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
      setNewFollowup({ name: '', delayDays: 3 });
      showToast?.('Followup added!', 'success');
    } catch (error) {
      showToast?.('Failed: ' + error.message, 'error');
    }
  }, [newFollowup, queryClient, showToast]);

  const handleUpdateFollowup = useCallback(async (id, updates) => {
    try {
      const result = await updateFollowup(id, updates);
      setLocalSettings(prev => ({ ...prev, followups: result.followups }));
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    } catch (error) {
      showToast?.('Failed: ' + error.message, 'error');
    }
  }, [queryClient, showToast]);


  const handleDeleteFollowup = useCallback((id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Followup',
      message: 'Are you sure you want to delete this followup step?',
      onConfirm: async () => {
        try {
          const result = await deleteFollowup(id);
          setLocalSettings(prev => ({ ...prev, followups: result.followups }));
          queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
          showToast?.('Followup deleted', 'success');
        } catch (error) {
          showToast?.('Failed: ' + error.message, 'error');
        }
      },
      variant: 'danger'
    });
  }, [queryClient, showToast]);

  const handleSaveTemplate = useCallback(async (template) => {
    try {
      if (template.id) {
        await updateTemplate(template.id, template);
        showToast?.('Template updated', 'success');
      } else {
        await createTemplate(template);
        showToast?.('Template created', 'success');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() });
      setEditingTemplate(null);
    } catch (error) {
      showToast?.('Failed: ' + error.message, 'error');
    }
  }, [queryClient, showToast]);

  const handleDeleteTemplate = useCallback((id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Template',
      message: 'Delete this template? Any sequence using it will fail to send.',
      onConfirm: async () => {
        try {
          await deleteTemplate(id);
          queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() });
          showToast?.('Template deleted', 'success');
        } catch (error) {
          showToast?.('Failed: ' + error.message, 'error');
        }
      },
      variant: 'danger'
    });
  }, [queryClient, showToast]);


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Group sections by category
  const groupedSections = navSections.reduce((acc, section) => {
    if (!acc[section.category]) acc[section.category] = [];
    acc[section.category].push(section);
    return acc;
  }, {});

  return (
    <div className="settings-page">
      <style>{`
        .settings-page {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
          min-height: calc(100vh - 100px);
        }
        .settings-sidebar {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.5rem;
          height: fit-content;
          position: sticky;
          top: 100px;
        }
        .settings-sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
        }
        .settings-sidebar-header h2 {
          font-size: 1.25rem;
          margin: 0;
        }
        .settings-category {
          margin-bottom: 1.5rem;
        }
        .settings-category-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }
        .settings-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          border: 1px solid transparent;
        }
        .settings-nav-item:hover {
          background: var(--bg-hover);
        }
        .settings-nav-item.active {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          color: #a855f7;
        }
        .settings-nav-item.active .nav-icon {
          color: #a855f7;
        }
        .nav-icon {
          color: var(--text-secondary);
          transition: color 0.2s;
        }
        .settings-content {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 2rem;
        }
        .settings-section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 0.5rem;
        }
        .settings-section-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .settings-section-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
        }
        .settings-section-desc {
          color: var(--text-secondary);
          margin-bottom: 2rem;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .settings-group {
          background: var(--bg-hover);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .settings-group-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-color);
        }
        .settings-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .settings-row-label {
          font-weight: 500;
        }
        .settings-row-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .settings-input {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-glass);
          color: var(--text-primary);
          font-size: 0.95rem;
          min-width: 180px;
        }
        .settings-select {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-glass);
          color: var(--text-primary);
          font-size: 0.95rem;
          min-width: 180px;
          cursor: pointer;
        }
        .toggle-btn {
          width: 52px;
          height: 28px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }
        .toggle-btn.on {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .toggle-btn.off {
          background: var(--bg-secondary);
        }
        .toggle-btn::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          top: 3px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-btn.on::after {
          left: 27px;
        }
        .toggle-btn.off::after {
          left: 3px;
        }
        .day-toggle {
          padding: 10px 16px;
          border-radius: 8px;
          border: 2px solid var(--border-color);
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .day-toggle.active {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }
        .sequence-step {
          display: grid;
          grid-template-columns: 40px 50px 1fr 200px 140px 40px;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-glass);
          border-radius: 10px;
          border: 1px solid var(--border-color);
          margin-bottom: 0.75rem;
        }
        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .add-step-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.05);
          border: 2px dashed rgba(34, 197, 94, 0.3);
          border-radius: 10px;
          margin-top: 1rem;
        }
        .template-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          margin-bottom: 0.75rem;
          transition: border-color 0.2s;
        }
        .template-card:hover {
          border-color: var(--accent-color);
        }
        .danger-zone {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        /* Enhanced ReactQuill Editor Styles - MS Office-like */
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          background: #f9fafb;
          padding: 12px !important;
          border-radius: 8px 8px 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .ql-container.ql-snow {
          border: none !important;
          font-size: 15px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ql-editor {
          min-height: 300px;
          padding: 20px 24px;
          line-height: 1.8;
          color: #1f2937;
        }
        .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .ql-snow .ql-picker {
          color: #374151;
          font-weight: 500;
        }
        .ql-snow .ql-stroke {
          stroke: #6b7280;
        }
        .ql-snow .ql-fill {
          fill: #6b7280;
        }
        .ql-snow button:hover,
        .ql-snow .ql-picker-label:hover {
          color: #8b5cf6 !important;
        }
        .ql-snow button:hover .ql-stroke,
        .ql-snow .ql-picker-label:hover .ql-stroke {
          stroke: #8b5cf6 !important;
        }
        .ql-snow button:hover .ql-fill,
        .ql-snow .ql-picker-label:hover .ql-fill {
          fill: #8b5cf6 !important;
        }
        .ql-snow button.ql-active,
        .ql-snow .ql-picker-label.ql-active {
          color: #8b5cf6 !important;
        }
        .ql-snow button.ql-active .ql-stroke,
        .ql-snow .ql-picker-label.ql-active .ql-stroke {
          stroke: #8b5cf6 !important;
        }
        .ql-snow button.ql-active .ql-fill,
        .ql-snow .ql-picker-label.ql-active .ql-fill {
          fill: #8b5cf6 !important;
        }
        .ql-toolbar.ql-snow .ql-formats {
          margin-right: 12px;
          padding-right: 12px;
          border-right: 1px solid #e5e7eb;
        }
        .ql-toolbar.ql-snow .ql-formats:last-child {
          border-right: none;
          margin-right: 0;
          padding-right: 0;
        }
        .ql-snow .ql-picker.ql-font,
        .ql-snow .ql-picker.ql-size,
        .ql-snow .ql-picker.ql-header {
          width: auto;
          min-width: 80px;
        }
        .ql-snow .ql-picker-options {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
          padding: 8px;
        }
        .ql-snow .ql-picker-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .ql-snow .ql-color-picker .ql-picker-options,
        .ql-snow .ql-background .ql-picker-options {
          width: 200px;
          padding: 12px;
        }
        .ql-snow .ql-color-picker .ql-picker-item,
        .ql-snow .ql-background .ql-picker-item {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          margin: 2px;
        }
        .ql-editor blockquote {
          border-left: 4px solid #8b5cf6;
          padding-left: 16px;
          margin: 16px 0;
          color: #6b7280;
          background: rgba(139, 92, 246, 0.05);
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
        }
        .ql-editor pre {
          background: #1e1e1e;
          color: #d4d4d4;
          border-radius: 8px;
          padding: 16px;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 14px;
          overflow-x: auto;
        }
        .ql-editor a {
          color: #8b5cf6;
          text-decoration: underline;
        }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          font-weight: 600;
          margin: 0.5em 0;
        }
        .ql-editor ul, .ql-editor ol {
          padding-left: 24px;
        }
        .ql-editor li {
          margin: 4px 0;
        }
        .ql-tooltip {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
          padding: 12px 16px;
        }
        .ql-tooltip input {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
        }
        .ql-tooltip a.ql-action,
        .ql-tooltip a.ql-remove {
          margin-left: 12px;
          color: #8b5cf6;
          font-weight: 500;
        }
      `}</style>

      {/* Sidebar Navigation */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SettingsIcon size={22} color="white" />
          </div>
          <h2>Settings</h2>
        </div>

        {Object.entries(groupedSections).map(([category, sections]) => (
          <div key={category} className="settings-category">
            <div className="settings-category-label">{category}</div>
            {sections.map((section) => (
              <div
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                <section.icon size={18} className="nav-icon" />
                <span>{section.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="settings-content" ref={formRef}>
        {/* Rate Limiting */}
        {activeSection === "rate-limit" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(168, 85, 247, 0.1)" }}
              >
                <Zap size={24} color="#a855f7" />
              </div>
              <div>
                <h3 className="settings-section-title">Rate Limiting</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Control how many emails are sent per time window to maintain
              deliverability and avoid spam filters.
            </p>

            <div className="settings-group">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Emails Per Window</div>
                  <div className="settings-row-desc">
                    Maximum emails to send in each time window
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.rateLimit?.emailsPerWindow || 2}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      rateLimit: {
                        ...prev.rateLimit,
                        emailsPerWindow: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} email{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Window Duration</div>
                  <div className="settings-row-desc">
                    Time window for rate limiting
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.rateLimit?.windowMinutes || 15}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      rateLimit: {
                        ...prev.rateLimit,
                        windowMinutes: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {[5, 10, 12, 15, 20, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                padding: "1rem",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <AlertCircle size={20} color="#3b82f6" />
              <span
                style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
              >
                Current rate:{" "}
                <strong>
                  {localSettings?.rateLimit?.emailsPerWindow || 2}
                </strong>{" "}
                emails every{" "}
                <strong>{localSettings?.rateLimit?.windowMinutes || 15}</strong>{" "}
                minutes = ~
                {Math.round(
                  (localSettings?.rateLimit?.emailsPerWindow || 2) *
                    (60 / (localSettings?.rateLimit?.windowMinutes || 15)),
                )}{" "}
                emails/hour
              </span>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveRateLimit}
              disabled={saving}
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}

        {/* Business Hours */}
        {activeSection === "business-hours" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(59, 130, 246, 0.1)" }}
              >
                <Clock size={24} color="#3b82f6" />
              </div>
              <div>
                <h3 className="settings-section-title">Business Hours</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Define when emails can be sent. Emails scheduled outside these
              hours will be shifted to the next available window.
            </p>

            <div className="settings-group">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Start Hour</div>
                  <div className="settings-row-desc">
                    Earliest time to send emails
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.businessHours?.startHour || 8}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        startHour: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">End Hour</div>
                  <div className="settings-row-desc">
                    Latest time to send emails
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.businessHours?.endHour || 22}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        endHour: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveBusinessHours}
              disabled={saving}
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}

        {/* Smart Send Time */}
        {activeSection === "smart-send" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(249, 115, 22, 0.1)" }}
              >
                <TrendingUp size={24} color="#f97316" />
              </div>
              <div>
                <h3 className="settings-section-title">Smart Send Time</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Optimize email delivery times for maximum engagement. Emails will
              be scheduled during peak open-rate windows (adjusted for each
              lead's timezone).
            </p>

            <div className="settings-group">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">
                    Enable Smart Send Time
                  </div>
                  <div className="settings-row-desc">
                    Automatically optimize send times for better engagement
                  </div>
                </div>
                <button
                  className={`toggle-btn ${localSettings?.smartSendTime?.enabled !== false ? "on" : "off"}`}
                  onClick={() =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      smartSendTime: {
                        ...prev.smartSendTime,
                        enabled: !prev?.smartSendTime?.enabled,
                      },
                    }))
                  }
                />
              </div>
            </div>

            {localSettings?.smartSendTime?.enabled !== false && (
              <>
                <div className="settings-group">
                  <div className="settings-group-title">
                    <Flame size={16} color="#f97316" /> Morning Window (Peak
                    Hours)
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    Best for B2B - people check emails when starting work
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Start
                      </label>
                      <select
                        className="settings-select"
                        value={
                          localSettings?.smartSendTime?.morningWindow
                            ?.startHour ?? 9
                        }
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            smartSendTime: {
                              ...prev.smartSendTime,
                              morningWindow: {
                                ...prev.smartSendTime?.morningWindow,
                                startHour: parseInt(e.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 6).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h.toString().padStart(2, "0")}:00
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>to</span>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        End
                      </label>
                      <select
                        className="settings-select"
                        value={
                          localSettings?.smartSendTime?.morningWindow
                            ?.endHour ?? 11
                        }
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            smartSendTime: {
                              ...prev.smartSendTime,
                              morningWindow: {
                                ...prev.smartSendTime?.morningWindow,
                                endHour: parseInt(e.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 8).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h.toString().padStart(2, "0")}:00
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="settings-group">
                  <div className="settings-group-title">
                    <Clock size={16} color="#3b82f6" /> Afternoon Window
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    Secondary peak - after lunch, before end of day
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Start
                      </label>
                      <select
                        className="settings-select"
                        value={
                          localSettings?.smartSendTime?.afternoonWindow
                            ?.startHour ?? 14
                        }
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            smartSendTime: {
                              ...prev.smartSendTime,
                              afternoonWindow: {
                                ...prev.smartSendTime?.afternoonWindow,
                                startHour: parseInt(e.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 12).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h.toString().padStart(2, "0")}:00
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>to</span>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        End
                      </label>
                      <select
                        className="settings-select"
                        value={
                          localSettings?.smartSendTime?.afternoonWindow
                            ?.endHour ?? 16
                        }
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            smartSendTime: {
                              ...prev.smartSendTime,
                              afternoonWindow: {
                                ...prev.smartSendTime?.afternoonWindow,
                                endHour: parseInt(e.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 14).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h.toString().padStart(2, "0")}:00
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="settings-group">
                  <div className="settings-row">
                    <div>
                      <div className="settings-row-label">Priority Window</div>
                      <div className="settings-row-desc">
                        Which window to prefer when scheduling
                      </div>
                    </div>
                    <select
                      className="settings-select"
                      value={
                        localSettings?.smartSendTime?.priority || "morning"
                      }
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          smartSendTime: {
                            ...prev.smartSendTime,
                            priority: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="morning">🌅 Morning First</option>
                      <option value="afternoon">🌤️ Afternoon First</option>
                      <option value="balanced">⚖️ Balanced</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                padding: "1rem",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Check size={20} color="#22c55e" style={{ marginTop: 2 }} />
              <div
                style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
              >
                <strong>How it works:</strong> When an email is scheduled (e.g.,
                7:30 AM), Smart Send will shift it to the start of your morning
                window (9:00 AM). Emails between windows get moved to the next
                one. All times are adjusted for each lead's local timezone.
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={async () => {
                setSaving(true);
                try {
                  await updateSettings({
                    smartSendTime: settings.smartSendTime,
                  });
                  showToast?.("Smart Send Time settings saved!", "success");
                } catch (error) {
                  showToast?.("Failed: " + error.message, "error");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}

        {/* Working Days */}
        {activeSection === "working-days" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(34, 197, 94, 0.1)" }}
              >
                <Calendar size={24} color="#22c55e" />
              </div>
              <div>
                <h3 className="settings-section-title">Working Days</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Select which days of the week emails should be sent. Emails won't
              be scheduled on unchecked days.
            </p>

            <div className="settings-group">
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day, index) => {
                  const isWorkingDay = !weekendDays.includes(index);
                  return (
                    <button
                      key={day}
                      className={`day-toggle ${isWorkingDay ? "active" : ""}`}
                      onClick={() => handleToggleWeekendDay(index)}
                    >
                      {isWorkingDay && (
                        <Check size={14} style={{ marginRight: 6 }} />
                      )}
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-hover)",
                padding: "1rem",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                Working days: <strong>{7 - weekendDays.length}</strong>
              </span>
              <span>
                Weekend days: <strong>{weekendDays.length}</strong>
              </span>
            </div>
          </>
        )}

        {/* Paused Dates */}
        {activeSection === "paused-dates" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(249, 115, 22, 0.1)" }}
              >
                <Pause size={24} color="#f97316" />
              </div>
              <div>
                <h3 className="settings-section-title">Paused Dates</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Pause email sending on specific dates (holidays, events, etc.).
              Scheduled emails will be automatically rescheduled.
            </p>

            <div className="settings-group">
              <div className="settings-group-title">Add Pause Date</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={newPauseDate}
                  onChange={(e) => setNewPauseDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="settings-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={handlePauseDate}
                  disabled={saving || !newPauseDate}
                >
                  <Pause size={16} /> Pause Date
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const dateStr = tomorrow.toISOString().split("T")[0];
                    try {
                      setSaving(true);
                      const result = await pauseDate(dateStr);
                      setPausedDates(result.pausedDates);
                      showToast?.("Tomorrow paused!", "success");
                      await reschedulePausedEmails(dateStr);
                    } catch (error) {
                      showToast?.("Failed: " + error.message, "error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  ⏸️ Pause Tomorrow
                </button>
              </div>
            </div>

            {pausedDates.length > 0 && (
              <div className="settings-group">
                <div className="settings-group-title">
                  Currently Paused ({pausedDates.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {pausedDates.map((date, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        background: "rgba(249, 115, 22, 0.1)",
                        border: "1px solid rgba(249, 115, 22, 0.3)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#f97316",
                      }}
                    >
                      <span>
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <button
                        onClick={() => handleUnpauseDate(date)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Retry Configuration */}
        {activeSection === "retry" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(234, 179, 8, 0.1)" }}
              >
                <RefreshCw size={24} color="#eab308" />
              </div>
              <div>
                <h3 className="settings-section-title">Retry & Recovery</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Configure how the system handles temporary failures, soft bounces,
              and delivery retries.
            </p>

            <div className="settings-group">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">
                    Maximum Retry Attempts
                  </div>
                  <div className="settings-row-desc">
                    How many times to retry a failed email
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.retry?.maxAttempts || 5}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      retry: {
                        ...prev.retry,
                        maxAttempts: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {[1, 2, 3, 5, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} attempts
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Soft Bounce Delay</div>
                  <div className="settings-row-desc">
                    Wait time before retrying soft bounces
                  </div>
                </div>
                <select
                  className="settings-select"
                  value={localSettings?.retry?.softBounceDelayHours || 2}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      retry: {
                        ...prev.retry,
                        softBounceDelayHours: parseInt(e.target.value),
                      },
                    }))
                  }
                >
                  {[1, 2, 4, 8, 12, 24, 48].map((n) => (
                    <option key={n} value={n}>
                      {n} hours
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={async () => {
                setSaving(true);
                try {
                  await updateSettings({ retry: settings.retry });
                  showToast?.("Retry settings saved!", "success");
                } catch (error) {
                  showToast?.("Failed: " + error.message, "error");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}

        {/* Email Sequences */}
        {activeSection === "sequences" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(34, 197, 94, 0.1)" }}
              >
                <Mail size={24} color="#22c55e" />
              </div>
              <div>
                <h3 className="settings-section-title">Email Sequences</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Configure your email automation sequence. Each step represents an
              email in the followup chain.
            </p>

            {/* Headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 50px 1fr 200px 140px 40px",
                gap: "1rem",
                padding: "0.75rem 1rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span></span>
              <span>Step</span>
              <span>Name</span>
              <span>Template</span>
              <span>Delay</span>
              <span></span>
            </div>

            {localSettings?.followups
              ?.sort((a, b) => a.order - b.order)
              .map((followup, index) => (
                <div key={followup.id} style={{ marginBottom: "0.75rem" }}>
                  {/* Main Row */}
                  <div
                    className="sequence-step"
                    style={{
                      marginBottom: 0,
                      borderRadius: followup._showConditions
                        ? "10px 10px 0 0"
                        : "10px",
                    }}
                  >
                    <GripVertical
                      size={18}
                      color="var(--text-muted)"
                      style={{ cursor: "grab" }}
                    />
                    <div className="step-number">{index + 1}</div>
                    <input
                      type="text"
                      value={followup.name}
                      onChange={(e) =>
                        handleUpdateFollowup(followup.id, {
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Initial Outreach"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        fontSize: "0.95rem",
                        outline: "none",
                      }}
                    />
                    <select
                      value={followup.templateId || ""}
                      onChange={(e) =>
                        handleUpdateFollowup(followup.id, {
                          templateId: e.target.value,
                        })
                      }
                      className="settings-select"
                      style={{ minWidth: "unset" }}
                    >
                      <option value="">Default Template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={followup.delayDays}
                      onChange={(e) =>
                        handleUpdateFollowup(followup.id, {
                          delayDays: parseInt(e.target.value),
                        })
                      }
                      className="settings-select"
                      style={{ minWidth: "unset" }}
                      disabled={index === 0}
                    >
                      {index === 0 ? (
                        <option value={0}>Immediate</option>
                      ) : (
                        [1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((n) => (
                          <option key={n} value={n}>
                            {n} day{n > 1 ? "s" : ""}
                          </option>
                        ))
                      )}
                    </select>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      {index > 0 && (
                        <>
                          <button
                            onClick={() => {
                              const updatedFollowups = settings.followups.map(
                                (f) =>
                                  f.id === followup.id
                                    ? {
                                        ...f,
                                        _showConditions: !f._showConditions,
                                      }
                                    : f,
                              );
                              setLocalSettings((prev) => ({
                                ...prev,
                                followups: updatedFollowups,
                              }));
                            }}
                            title="Configure Conditions"
                            style={{
                              background:
                                followup.condition?.type &&
                                followup.condition.type !== "always"
                                  ? "rgba(168, 85, 247, 0.2)"
                                  : "rgba(59, 130, 246, 0.1)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px",
                              cursor: "pointer",
                              color:
                                followup.condition?.type &&
                                followup.condition.type !== "always"
                                  ? "#a855f7"
                                  : "#3b82f6",
                              display: "flex",
                            }}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: followup._showConditions
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteFollowup(followup.id)}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px",
                              cursor: "pointer",
                              color: "#ef4444",
                              display: "flex",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Condition Configuration Panel */}
                  {index > 0 && followup._showConditions && (
                    <div
                      style={{
                        background: "rgba(139, 92, 246, 0.05)",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                        borderTop: "none",
                        borderRadius: "0 0 10px 10px",
                        padding: "1rem 1.5rem",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          📋 Condition Type
                        </label>
                        <select
                          value={followup.condition?.type || "always"}
                          onChange={(e) =>
                            handleUpdateFollowup(followup.id, {
                              condition: {
                                ...followup.condition,
                                type: e.target.value,
                              },
                            })
                          }
                          className="settings-select"
                          style={{ width: "100%" }}
                        >
                          <option value="always">Always Send</option>
                          <option value="if_opened">
                            📬 If Previous Opened
                          </option>
                          <option value="if_not_opened">
                            📭 If Previous NOT Opened
                          </option>
                          <option value="if_clicked">
                            🖱️ If Previous Clicked
                          </option>
                          <option value="if_not_clicked">
                            🚫 If Previous NOT Clicked
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          🔍 Check Which Step
                        </label>
                        <select
                          value={followup.condition?.checkStep || "previous"}
                          onChange={(e) =>
                            handleUpdateFollowup(followup.id, {
                              condition: {
                                ...followup.condition,
                                checkStep: e.target.value,
                              },
                            })
                          }
                          className="settings-select"
                          style={{ width: "100%" }}
                          disabled={
                            !followup.condition?.type ||
                            followup.condition?.type === "always"
                          }
                        >
                          <option value="previous">Previous Step</option>
                          {localSettings?.followups
                            ?.filter((f, i) => i < index)
                            .map((f) => (
                              <option key={f.name} value={f.name}>
                                {f.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          📄 Alternative Template (if condition not met)
                        </label>
                        <select
                          value={
                            followup.condition?.alternativeTemplateId || ""
                          }
                          onChange={(e) =>
                            handleUpdateFollowup(followup.id, {
                              condition: {
                                ...followup.condition,
                                alternativeTemplateId: e.target.value || null,
                              },
                            })
                          }
                          className="settings-select"
                          style={{ width: "100%" }}
                          disabled={
                            !followup.condition?.type ||
                            followup.condition?.type === "always"
                          }
                        >
                          <option value="">No Alternative (use primary)</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          paddingTop: "20px",
                        }}
                      >
                        <button
                          className={`toggle-btn ${followup.condition?.skipIfNotMet ? "on" : "off"}`}
                          onClick={() =>
                            handleUpdateFollowup(followup.id, {
                              condition: {
                                ...followup.condition,
                                skipIfNotMet: !followup.condition?.skipIfNotMet,
                              },
                            })
                          }
                          disabled={
                            !followup.condition?.type ||
                            followup.condition?.type === "always"
                          }
                          style={{
                            opacity:
                              !followup.condition?.type ||
                              followup.condition?.type === "always"
                                ? 0.5
                                : 1,
                          }}
                        />
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                            Skip if not met
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Skip this step entirely instead of using alt
                            template
                          </div>
                        </div>
                      </div>

                      {followup.condition?.type &&
                        followup.condition?.type !== "always" && (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              padding: "8px 12px",
                              background: "rgba(34, 197, 94, 0.1)",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              color: "#22c55e",
                            }}
                          >
                            ✓ This step will{" "}
                            {followup.condition.skipIfNotMet
                              ? "be skipped"
                              : followup.condition.alternativeTemplateId
                                ? "use alternative template"
                                : "send anyway"}{" "}
                            if condition is not met
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}

            <div className="add-step-row">
              <Plus size={20} color="#22c55e" />
              <input
                type="text"
                placeholder="New followup name..."
                value={newFollowup.name}
                onChange={(e) =>
                  setNewFollowup((prev) => ({ ...prev, name: e.target.value }))
                }
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                }}
              />
              <select
                value={newFollowup.delayDays}
                onChange={(e) =>
                  setNewFollowup((prev) => ({
                    ...prev,
                    delayDays: parseInt(e.target.value),
                  }))
                }
                className="settings-select"
              >
                {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} day{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddFollowup}>
                <Plus size={16} /> Add Step
              </button>
            </div>
          </>
        )}

        {/* Templates */}
        {activeSection === "templates" && (
          <>
            <div
              className="settings-section-header"
              style={{ justifyContent: "space-between" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <div
                  className="settings-section-icon"
                  style={{ background: "rgba(139, 92, 246, 0.1)" }}
                >
                  <Send size={24} color="#8b5cf6" />
                </div>
                <h3 className="settings-section-title">Email Templates</h3>
              </div>
              {!editingTemplate && (
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    setEditingTemplate({
                      name: "",
                      subject: "",
                      body: "",
                      variables: [],
                    })
                  }
                >
                  <Plus size={16} /> Create Template
                </button>
              )}
            </div>
            <p className="settings-section-desc">
              Create and manage email templates. Use variables like {"{{name}}"}{" "}
              to personalize your messages.
            </p>

            {editingTemplate ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Initial Outreach"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="settings-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Email subject..."
                    value={editingTemplate.subject}
                    onChange={(e) =>
                      setEditingTemplate((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="settings-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Email Body
                  </label>
                  <div
                    style={{
                      background: "white",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <ReactQuill
                      value={editingTemplate.body}
                      onChange={(val) =>
                        setEditingTemplate((prev) => ({ ...prev, body: val }))
                      }
                      theme="snow"
                      style={{ height: "350px", marginBottom: "52px" }}
                      modules={{
                        toolbar: [
                          // Font & Size
                          [{ font: [] }],
                          [{ size: ["small", false, "large", "huge"] }],
                          [{ header: [1, 2, 3, 4, 5, 6, false] }],

                          // Text Formatting
                          ["bold", "italic", "underline", "strike"],
                          [{ script: "sub" }, { script: "super" }],

                          // Colors
                          [{ color: [] }, { background: [] }],

                          // Alignment
                          [{ align: [] }],

                          // Lists & Indentation
                          [{ list: "ordered" }, { list: "bullet" }],
                          [{ indent: "-1" }, { indent: "+1" }],

                          // Direction
                          [{ direction: "rtl" }],

                          // Links, Images, Video
                          ["link", "image", "video"],

                          // Blocks
                          ["blockquote", "code-block"],

                          // Clean
                          ["clean"],
                        ],
                        clipboard: {
                          matchVisual: false,
                        },
                      }}
                      formats={[
                        "font",
                        "size",
                        "header",
                        "bold",
                        "italic",
                        "underline",
                        "strike",
                        "script",
                        "color",
                        "background",
                        "align",
                        "list",
                        "bullet",
                        "indent",
                        "direction",
                        "link",
                        "image",
                        "video",
                        "blockquote",
                        "code-block",
                      ]}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Insert variable:
                  </span>
                  {[
                    "{{company}}",
                    "{{name}}",
                    "{{email}}",
                    "{{city}}",
                    "{{country}}",
                  ].map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        setEditingTemplate((prev) => ({
                          ...prev,
                          body: prev.body + " " + v,
                        }))
                      }
                      style={{
                        background: "var(--bg-hover)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div
                  style={{ display: "flex", gap: "12px", marginTop: "0.5rem" }}
                >
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSaveTemplate(editingTemplate)}
                  >
                    <Save size={16} /> Save Template
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {templates.length === 0 ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      background: "var(--bg-hover)",
                      borderRadius: "12px",
                    }}
                  >
                    <Send
                      size={48}
                      style={{ opacity: 0.3, marginBottom: "1rem" }}
                    />
                    <p>No templates created yet.</p>
                    <p style={{ fontSize: "0.9rem" }}>
                      Create your first email template to get started.
                    </p>
                  </div>
                ) : (
                  templates.map((t) => (
                    <div key={t.id} className="template-card">
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 600 }}>{t.name}</h4>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Subject: {t.subject}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setEditingTemplate(t)}
                          style={{ padding: "8px 16px" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          style={{
                            padding: "8px",
                            background: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Weekly Reports */}
        {activeSection === "reports" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(59, 130, 246, 0.1)" }}
              >
                <FileText size={24} color="#3b82f6" />
              </div>
              <h3 className="settings-section-title">Weekly Email Reports</h3>
            </div>
            <p className="settings-section-desc">
              Get an automated summary of your outreach performance delivered to
              your inbox every week.
            </p>

            <div className="settings-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    Enable Weekly Reports
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Automatically transform analytics into email summaries
                  </div>
                </div>
                <button
                  className={`toggle-btn ${settings.reporting?.enabled ? "on" : "off"}`}
                  onClick={() => {
                    const newSettings = {
                      ...settings,
                      reporting: {
                        ...settings.reporting,
                        enabled: !settings.reporting?.enabled,
                      },
                    };
                    setLocalSettings(newSettings);
                  }}
                />
              </div>

              {settings.reporting?.enabled && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Recipients
                    </label>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      Enter email addresses separated by commas
                    </div>
                    <input
                      type="text"
                      className="settings-input"
                      style={{ width: "100%" }}
                      placeholder="admin@example.com, manager@example.com"
                      value={settings.reporting?.recipients?.join(", ") || ""}
                      onChange={(e) => {
                        const recipients = e.target.value
                          .split(",")
                          .map((e) => e.trim());
                        const newSettings = {
                          ...settings,
                          reporting: { ...settings.reporting, recipients },
                        };
                        setLocalSettings(newSettings);
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: 500,
                        }}
                      >
                        Day of Week
                      </label>
                      <select
                        className="settings-select"
                        style={{ width: "100%" }}
                        value={settings.reporting?.dayOfWeek || 1}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            reporting: {
                              ...settings.reporting,
                              dayOfWeek: parseInt(e.target.value),
                            },
                          };
                          setLocalSettings(newSettings);
                        }}
                      >
                        {dayNames.map((name, idx) => (
                          <option key={idx} value={idx}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: 500,
                        }}
                      >
                        Delivery Time
                      </label>
                      <select
                        className="settings-select"
                        style={{ width: "100%" }}
                        value={settings.reporting?.time || "09:00"}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            reporting: {
                              ...settings.reporting,
                              time: e.target.value,
                            },
                          };
                          setLocalSettings(newSettings);
                        }}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option
                            key={i}
                            value={`${i.toString().padStart(2, "0")}:00`}
                          >
                            {i === 0
                              ? "12:00 AM"
                              : i < 12
                                ? `${i}:00 AM`
                                : i === 12
                                  ? "12:00 PM"
                                  : `${i - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleSaveReporting()}
                disabled={saving}
              >
                {saving ? (
                  <div className="loading-spinner small"></div>
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          </>
        )}

        {/* Brevo Integration */}
        {activeSection === "brevo" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(59, 130, 246, 0.1)" }}
              >
                <Globe size={24} color="#3b82f6" />
              </div>
              <div>
                <h3 className="settings-section-title">Brevo Integration</h3>
              </div>
            </div>
            <p className="settings-section-desc">
              Configure your Brevo (formerly Sendinblue) API credentials for
              email delivery.
            </p>

            <div className="settings-group">
              <div className="settings-group-title">
                <Shield size={16} /> API Credentials
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 500,
                  }}
                >
                  API Key
                </label>
                <input
                  type="password"
                  value={localSettings?.brevo?.apiKey || ""}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      brevo: { ...prev?.brevo, apiKey: e.target.value },
                    }))
                  }
                  placeholder="xkeysib-xxxxx..."
                  className="settings-input"
                  style={{ width: "100%" }}
                />
                <small
                  style={{
                    color: "var(--text-muted)",
                    marginTop: "6px",
                    display: "block",
                  }}
                >
                  Get your API key from{" "}
                  <a
                    href="https://app.brevo.com/settings/keys/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3b82f6" }}
                  >
                    Brevo Dashboard
                  </a>
                </small>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 500,
                  }}
                >
                  From Email
                </label>
                <input
                  type="email"
                  value={localSettings?.brevo?.fromEmail || ""}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      brevo: { ...prev?.brevo, fromEmail: e.target.value },
                    }))
                  }
                  placeholder="noreply@yourdomain.com"
                  className="settings-input"
                  style={{ width: "100%", maxWidth: "400px" }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 500,
                  }}
                >
                  From Name
                </label>
                <input
                  type="text"
                  value={localSettings?.brevo?.fromName || ""}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      brevo: { ...prev?.brevo, fromName: e.target.value },
                    }))
                  }
                  placeholder="Your Company Name"
                  className="settings-input"
                  style={{ width: "100%", maxWidth: "400px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateSettings({ brevo: localSettings?.brevo });
                    showToast?.("Brevo settings saved!", "success");
                  } catch (error) {
                    showToast?.("Failed: " + error.message, "error");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                <Save size={16} /> {saving ? "Saving..." : "Save Credentials"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const result = await testBrevoConnection(
                      localSettings?.brevo?.apiKey,
                    );
                    if (result.success) {
                      showToast?.(
                        `✓ Connected! Account: ${result.account.email}`,
                        "success",
                      );
                    } else {
                      showToast?.(
                        `Connection failed: ${result.error}`,
                        "error",
                      );
                    }
                  } catch (error) {
                    showToast?.(
                      `Test failed: ${error.response?.data?.error || error.message}`,
                      "error",
                    );
                  }
                }}
              >
                <RefreshCw size={16} /> Test Connection
              </button>
            </div>
          </>
        )}

        {/* System Rulebook */}
        {activeSection === "rulebook" && (
          <RulebookSection showToast={showToast} />
        )}

        {/* Danger Zone */}
        {activeSection === "danger" && (
          <>
            <div className="settings-section-header">
              <div
                className="settings-section-icon"
                style={{ background: "rgba(239, 68, 68, 0.1)" }}
              >
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <div>
                <h3
                  className="settings-section-title"
                  style={{ color: "#ef4444" }}
                >
                  Danger Zone
                </h3>
              </div>
            </div>
            <p className="settings-section-desc">
              These actions are irreversible. Please proceed with caution.
            </p>

            <div className="danger-zone">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Clear Brevo Logs
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Remove all webhook logs from the database
                  </div>
                </div>
                <button
                  className="btn"
                  onClick={async () => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Clear Logs",
                      message:
                        "Are you sure you want to clear all Brevo logs? This cannot be undone.",
                      onConfirm: async () => {
                        const { clearBrevoLogs } =
                          await import("../services/api");
                        await clearBrevoLogs();
                        showToast?.("Logs cleared", "success");
                      },
                      variant: "danger",
                    });
                  }}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                  }}
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}
