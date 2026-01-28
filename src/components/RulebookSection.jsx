// components/RulebookSection.jsx
// Settings UI for configuring the System Rulebook

import { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { getRulebook, updateRulebook, resetRulebook } from '../services/api';

export default function RulebookSection({ showToast }) {
  const [rulebook, setRulebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState(['leadStatusRules', 'actionRules']);

  useEffect(() => {
    loadRulebook();
  }, []);

  const loadRulebook = async () => {
    try {
      setLoading(true);
      const data = await getRulebook();
      setRulebook(data);
    } catch (error) {
      console.error('Failed to load rulebook:', error);
      showToast?.('Failed to load rulebook', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateRulebook(rulebook);
      showToast?.('Rulebook saved!', 'success');
    } catch (error) {
      showToast?.('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const data = await resetRulebook();
      setRulebook(data.rulebook);
      showToast?.('Rulebook reset to defaults!', 'success');
    } catch (error) {
      showToast?.('Failed to reset: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updateNestedValue = (path, value) => {
    setRulebook(prev => {
      const newRulebook = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newRulebook;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newRulebook;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="rulebook-section">
      <style>{`
        .rulebook-section {
          max-width: 100%;
        }
        .rulebook-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .rulebook-collapsible {
          background: var(--bg-hover);
          border-radius: 12px;
          margin-bottom: 1rem;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .rulebook-collapsible-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rulebook-collapsible-header:hover {
          background: var(--bg-secondary);
        }
        .rulebook-collapsible-content {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid var(--border-color);
        }
        .rule-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .rule-item:last-child {
          border-bottom: none;
        }
        .rule-label {
          font-weight: 500;
          font-size: 0.9rem;
        }
        .rule-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .rule-toggle {
          width: 48px;
          height: 26px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }
        .rule-toggle.on {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .rule-toggle.off {
          background: var(--bg-secondary);
        }
        .rule-toggle::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          top: 3px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .rule-toggle.on::after {
          left: 25px;
        }
        .rule-toggle.off::after {
          left: 3px;
        }
        .status-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 500;
          background: rgba(107, 114, 128, 0.2);
          color: var(--text-secondary);
        }
        .score-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }
        .score-table th, .score-table td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .score-table th {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .score-input {
          width: 80px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-glass);
          color: var(--text-primary);
          font-size: 0.9rem;
          text-align: center;
        }
      `}</style>

      <div className="rulebook-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, 
              background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={24} color="#8b5cf6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>System Rulebook</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                v{rulebook?.version || '1.0.0'}
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', maxWidth: '600px', lineHeight: 1.6 }}>
            Configure the core rules that govern email scheduling, status management, and automated actions.
            These rules are the single source of truth for system behavior.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn"
            onClick={handleReset}
            disabled={saving}
            style={{ background: 'var(--bg-secondary)' }}
          >
            <RefreshCw size={16} /> Reset Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Lead Status Rules */}
      <div className="rulebook-collapsible">
        <div 
          className="rulebook-collapsible-header"
          onClick={() => toggleSection('leadStatusRules')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {expandedSections.includes('leadStatusRules') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span style={{ fontWeight: 600 }}>Lead Status Rules</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Control what statuses are shown for leads
          </span>
        </div>
        {expandedSections.includes('leadStatusRules') && (
          <div className="rulebook-collapsible-content">
            <div className="rule-item">
              <div>
                <div className="rule-label">Forbidden Statuses</div>
                <div className="rule-desc">These statuses will never be shown as lead status</div>
                <div className="status-list">
                  {rulebook?.leadStatusRules?.forbiddenStatuses?.map(s => (
                    <span key={s} className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="rule-item">
              <div>
                <div className="rule-label">Allowed Statuses</div>
                <div className="rule-desc">Only these statuses can appear as lead status</div>
                <div className="status-list">
                  {rulebook?.leadStatusRules?.allowedStatuses?.map(s => (
                    <span key={s} className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Rules */}
      <div className="rulebook-collapsible">
        <div 
          className="rulebook-collapsible-header"
          onClick={() => toggleSection('actionRules')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {expandedSections.includes('actionRules') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span style={{ fontWeight: 600 }}>Action Rules</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Side effects when actions are performed
          </span>
        </div>
        {expandedSections.includes('actionRules') && (
          <div className="rulebook-collapsible-content">
            {/* Manual Mail Actions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--accent-color)' }}>
                When Scheduling Manual Mail
              </h4>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Pause Pending Followups</div>
                  <div className="rule-desc">Automatically pause any scheduled followups</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.manualMailActions?.pausePendingFollowups ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.manualMailActions.pausePendingFollowups', !rulebook?.actionRules?.manualMailActions?.pausePendingFollowups)}
                />
              </div>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Check Rate Limit</div>
                  <div className="rule-desc">Validate rate limit before scheduling</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.manualMailActions?.checkRateLimit ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.manualMailActions.checkRateLimit', !rulebook?.actionRules?.manualMailActions?.checkRateLimit)}
                />
              </div>
            </div>

            {/* Conditional Email Actions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#f97316' }}>
                When Conditional Email Triggers
              </h4>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Prevent Duplicates</div>
                  <div className="rule-desc">Don't create if a conditional job already exists for this lead</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.conditionalEmailActions?.preventDuplicates ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.conditionalEmailActions.preventDuplicates', !rulebook?.actionRules?.conditionalEmailActions?.preventDuplicates)}
                />
              </div>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Cancel Pending Followups If Configured</div>
                  <div className="rule-desc">Honor the conditional email's cancelPending setting</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.conditionalEmailActions?.cancelPendingFollowupsIfConfigured ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.conditionalEmailActions.cancelPendingFollowupsIfConfigured', !rulebook?.actionRules?.conditionalEmailActions?.cancelPendingFollowupsIfConfigured)}
                />
              </div>
            </div>

            {/* Resume Followup Actions */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#22c55e' }}>
                When Resuming Followups
              </h4>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Check for Conditional Emails</div>
                  <div className="rule-desc">Don't schedule followup if conditional email is pending</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.resumeFollowupActions?.checkForConditionalEmails ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.resumeFollowupActions.checkForConditionalEmails', !rulebook?.actionRules?.resumeFollowupActions?.checkForConditionalEmails)}
                />
              </div>
              <div className="rule-item">
                <div>
                  <div className="rule-label">Delete Old Paused Jobs</div>
                  <div className="rule-desc">Remove paused job records when resuming</div>
                </div>
                <button 
                  className={`rule-toggle ${rulebook?.actionRules?.resumeFollowupActions?.deleteOldPausedJobs ? 'on' : 'off'}`}
                  onClick={() => updateNestedValue('actionRules.resumeFollowupActions.deleteOldPausedJobs', !rulebook?.actionRules?.resumeFollowupActions?.deleteOldPausedJobs)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trigger Rules */}
      <div className="rulebook-collapsible">
        <div 
          className="rulebook-collapsible-header"
          onClick={() => toggleSection('triggerRules')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {expandedSections.includes('triggerRules') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span style={{ fontWeight: 600 }}>Trigger Rules</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            What events trigger actions
          </span>
        </div>
        {expandedSections.includes('triggerRules') && (
          <div className="rulebook-collapsible-content">
            <div className="rule-item">
              <div>
                <div className="rule-label">Score Adjustments</div>
                <div className="rule-desc">Lead score changes when events occur</div>
              </div>
            </div>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Score Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rulebook?.triggerRules?.scoreAdjustments || {}).map(([event, score]) => (
                  <tr key={event}>
                    <td>{event}</td>
                    <td>
                      <input 
                        type="number"
                        className="score-input"
                        value={score}
                        onChange={(e) => updateNestedValue(`triggerRules.scoreAdjustments.${event}`, parseInt(e.target.value) || 0)}
                        style={{ color: score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : 'inherit' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
