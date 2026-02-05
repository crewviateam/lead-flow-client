// components/DeveloperModeSection.jsx
// Developer Mode testing dashboard for debugging and testing all system features

import { useState } from 'react';
import { 
  Mail, Send, Zap, Database, RefreshCw, ChevronRight, Play, 
  CheckCircle, XCircle, Clock, Search, Trash2, Eye, FastForward
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

// Use same port as main api.js (port 3000)
const API_BASE = API_BASE_URL;

export default function DeveloperModeSection({ showToast }) {
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  
  // Email Testing State
  const [testEmail, setTestEmail] = useState({ recipient: '', templateId: '', leadData: '' });
  const [templates, setTemplates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  // Webhook Simulation State
  const [webhookData, setWebhookData] = useState({ jobId: '', eventType: 'delivered' });
  
  // Scheduling State
  const [scheduleData, setScheduleData] = useState({ jobId: '', leadId: '' });
  
  // Integration Status
  const [integrationStatus, setIntegrationStatus] = useState({});
  
  // Queue Status
  const [queueStatus, setQueueStatus] = useState(null);

  const tabs = [
    { id: 'email', label: 'Email Testing', icon: Mail },
    { id: 'webhook', label: 'Webhooks', icon: Zap },
    { id: 'scheduling', label: 'Scheduling', icon: Clock },
    { id: 'integration', label: 'Integration', icon: Database },
    { id: 'debug', label: 'Debug Tools', icon: Search }
  ];

  const eventTypes = [
    'delivered', 'opened', 'clicked', 'soft_bounce', 
    'hard_bounce', 'blocked', 'spam', 'invalid', 'deferred', 'error'
  ];

  // API Helper
  const callApi = async (key, method, endpoint, data = null) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const url = `${API_BASE}${endpoint}`;
      const response = method === 'get' 
        ? await axios.get(url, { params: data })
        : await axios[method](url, data);
      setResults(prev => ({ ...prev, [key]: { success: true, data: response.data } }));
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setResults(prev => ({ ...prev, [key]: { success: false, error: errorMsg } }));
      showToast?.(`Error: ${errorMsg}`, 'error');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Load Templates
  const loadTemplates = async () => {
    const result = await callApi('templates', 'get', '/dev/email/templates');
    if (result?.templates) setTemplates(result.templates);
  };

  // Load Recent Leads
  const loadLeads = async () => {
    const result = await callApi('leads', 'get', '/dev/leads', { limit: 20 });
    if (result?.leads) setLeads(result.leads);
  };

  // Load Recent Jobs
  const loadJobs = async (status = null) => {
    const result = await callApi('jobs', 'get', '/dev/jobs', { limit: 20, status });
    if (result?.jobs) setJobs(result.jobs);
  };

  // Send Test Email
  const sendTestEmail = async () => {
    if (!testEmail.recipient) {
      showToast?.('Please enter a recipient email', 'error');
      return;
    }
    let leadData = {};
    try {
      if (testEmail.leadData) leadData = JSON.parse(testEmail.leadData);
    } catch (e) {
      showToast?.('Invalid lead data JSON', 'error');
      return;
    }
    const result = await callApi('sendTest', 'post', '/dev/email/send-test', {
      recipientEmail: testEmail.recipient,
      templateId: testEmail.templateId || null,
      leadData
    });
    if (result?.success) {
      showToast?.(`✓ Test email sent! MessageId: ${result.messageId}`, 'success');
    }
  };

  // Preview Template
  const previewTemplate = async () => {
    if (!testEmail.templateId) {
      showToast?.('Please select a template', 'error');
      return;
    }
    let leadData = {};
    try {
      if (testEmail.leadData) leadData = JSON.parse(testEmail.leadData);
    } catch (e) { /* use empty */ }
    await callApi('preview', 'post', '/dev/email/preview', {
      templateId: testEmail.templateId,
      leadData
    });
  };

  // Simulate Webhook
  const simulateWebhook = async () => {
    if (!webhookData.jobId) {
      showToast?.('Please enter a Job ID', 'error');
      return;
    }
    const result = await callApi('webhook', 'post', '/dev/webhook/simulate', {
      jobId: parseInt(webhookData.jobId),
      eventType: webhookData.eventType
    });
    if (result?.success) {
      showToast?.(`✓ Simulated ${webhookData.eventType} for job ${webhookData.jobId}`, 'success');
    }
  };

  // Fast Forward Job
  const fastForwardJob = async () => {
    if (!scheduleData.jobId) {
      showToast?.('Please enter a Job ID', 'error');
      return;
    }
    const result = await callApi('fastForward', 'post', '/dev/job/fast-forward', {
      jobId: parseInt(scheduleData.jobId)
    });
    if (result?.success) {
      showToast?.(`✓ Job ${scheduleData.jobId} fast-forwarded to immediate execution`, 'success');
    }
  };

  // Trigger Followup
  const triggerFollowup = async () => {
    if (!scheduleData.leadId) {
      showToast?.('Please enter a Lead ID', 'error');
      return;
    }
    const result = await callApi('followup', 'post', '/dev/followup/trigger', {
      leadId: parseInt(scheduleData.leadId)
    });
    if (result?.success) {
      showToast?.(result.jobCreated 
        ? `✓ Followup scheduled: ${result.jobCreated.type}` 
        : 'No followup to schedule', 
        result.jobCreated ? 'success' : 'info'
      );
    }
  };

  // Test Integrations
  const testIntegrations = async () => {
    const [brevo, redis, database] = await Promise.all([
      callApi('brevo', 'get', '/dev/status/brevo'),
      callApi('redis', 'get', '/dev/status/redis'),
      callApi('database', 'get', '/dev/status/database')
    ]);
    setIntegrationStatus({ brevo, redis, database });
  };

  // Get Queue Status
  const getQueueStatus = async () => {
    const result = await callApi('queue', 'get', '/dev/queue/status');
    if (result) setQueueStatus(result);
  };

  // Clear Test Data
  const clearTestData = async () => {
    const result = await callApi('clear', 'delete', '/dev/test-data');
    if (result?.success) {
      showToast?.(`✓ Cleared ${result.deleted?.jobs || 0} test jobs`, 'success');
    }
  };

  const ResultDisplay = ({ resultKey }) => {
    const result = results[resultKey];
    if (!result) return null;
    
    return (
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        borderRadius: '8px',
        background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {result.success 
            ? <CheckCircle size={16} color="#22c55e" />
            : <XCircle size={16} color="#ef4444" />
          }
          <span style={{ fontWeight: 600, color: result.success ? '#22c55e' : '#ef4444' }}>
            {result.success ? 'Success' : 'Error'}
          </span>
        </div>
        <pre style={{ 
          fontSize: '0.8rem', 
          margin: 0, 
          whiteSpace: 'pre-wrap',
          color: 'var(--text-secondary)'
        }}>
          {JSON.stringify(result.success ? result.data : result.error, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <>
      <div className="settings-section-header">
        <div className="settings-section-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
          <Zap size={24} color="#8b5cf6" />
        </div>
        <div>
          <h3 className="settings-section-title">Developer Mode</h3>
        </div>
      </div>
      <p className="settings-section-desc">
        Test and debug all system features without waiting for real events. Simulate webhooks, send test emails, and inspect data.
      </p>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1rem'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              border: `1px solid ${activeTab === tab.id ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-color)'}`,
              borderRadius: '8px',
              color: activeTab === tab.id ? '#8b5cf6' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Email Testing Tab */}
      {activeTab === 'email' && (
        <div className="settings-group">
          <div className="settings-group-title">
            <Mail size={16} /> Send Test Email
          </div>
          
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Test Recipient Email *</label>
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail.recipient}
                onChange={e => setTestEmail(prev => ({ ...prev, recipient: e.target.value }))}
                className="settings-input"
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Template</label>
                <select
                  value={testEmail.templateId}
                  onChange={e => setTestEmail(prev => ({ ...prev, templateId: e.target.value }))}
                  className="settings-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Default Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={loadTemplates}
                disabled={loading.templates}
              >
                <RefreshCw size={14} className={loading.templates ? 'spin' : ''} /> Load
              </button>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Custom Lead Data (JSON)</label>
              <textarea
                placeholder='{"name": "John Doe", "company": "Acme Corp"}'
                value={testEmail.leadData}
                onChange={e => setTestEmail(prev => ({ ...prev, leadData: e.target.value }))}
                className="settings-input"
                style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              onClick={sendTestEmail}
              disabled={loading.sendTest}
            >
              <Send size={16} /> {loading.sendTest ? 'Sending...' : 'Send Test Email'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={previewTemplate}
              disabled={loading.preview || !testEmail.templateId}
            >
              <Eye size={16} /> Preview Template
            </button>
          </div>

          <ResultDisplay resultKey="sendTest" />
          <ResultDisplay resultKey="preview" />
        </div>
      )}

      {/* Webhook Simulation Tab */}
      {activeTab === 'webhook' && (
        <div className="settings-group">
          <div className="settings-group-title">
            <Zap size={16} /> Simulate Brevo Webhook
          </div>
          
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Trigger webhook events as if they came from Brevo. Useful for testing event handlers and lead status updates.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Email Job ID *</label>
              <input
                type="number"
                placeholder="e.g. 123"
                value={webhookData.jobId}
                onChange={e => setWebhookData(prev => ({ ...prev, jobId: e.target.value }))}
                className="settings-input"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Event Type</label>
              <select
                value={webhookData.eventType}
                onChange={e => setWebhookData(prev => ({ ...prev, eventType: e.target.value }))}
                className="settings-select"
                style={{ width: '100%' }}
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={simulateWebhook}
              disabled={loading.webhook}
            >
              <Play size={16} /> {loading.webhook ? 'Simulating...' : 'Simulate'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => loadJobs('sent')}>
              Load Sent Jobs
            </button>
            <button className="btn btn-secondary" onClick={() => loadJobs('delivered')}>
              Load Delivered Jobs
            </button>
          </div>

          {jobs.length > 0 && (
            <div style={{ 
              background: 'var(--bg-glass)', 
              borderRadius: '8px', 
              padding: '1rem',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Recent Jobs (click to select)</div>
              {jobs.map(job => (
                <div 
                  key={job.id}
                  onClick={() => setWebhookData(prev => ({ ...prev, jobId: job.id.toString() }))}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: webhookData.jobId === job.id.toString() ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem'
                  }}
                >
                  <span>#{job.id} - {job.type}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{job.status}</span>
                </div>
              ))}
            </div>
          )}

          <ResultDisplay resultKey="webhook" />
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <div className="settings-group">
          <div className="settings-group-title">
            <Clock size={16} /> Scheduling Controls
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Fast Forward Job */}
            <div style={{ 
              padding: '1rem', 
              background: 'var(--bg-glass)', 
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FastForward size={16} color="#f59e0b" /> Fast-Forward Job
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Move a scheduled job to execute immediately
              </p>
              <input
                type="number"
                placeholder="Job ID"
                value={scheduleData.jobId}
                onChange={e => setScheduleData(prev => ({ ...prev, jobId: e.target.value }))}
                className="settings-input"
                style={{ width: '100%', marginBottom: '12px' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={fastForwardJob}
                disabled={loading.fastForward}
                style={{ width: '100%' }}
              >
                {loading.fastForward ? 'Processing...' : 'Fast-Forward →'}
              </button>
              <ResultDisplay resultKey="fastForward" />
            </div>

            {/* Trigger Followup */}
            <div style={{ 
              padding: '1rem', 
              background: 'var(--bg-glass)', 
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={16} color="#22c55e" /> Trigger Next Followup
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Force-schedule the next followup for a lead
              </p>
              <input
                type="number"
                placeholder="Lead ID"
                value={scheduleData.leadId}
                onChange={e => setScheduleData(prev => ({ ...prev, leadId: e.target.value }))}
                className="settings-input"
                style={{ width: '100%', marginBottom: '12px' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={triggerFollowup}
                disabled={loading.followup}
                style={{ width: '100%' }}
              >
                {loading.followup ? 'Processing...' : 'Trigger Followup'}
              </button>
              <ResultDisplay resultKey="followup" />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={loadLeads}>
              <RefreshCw size={14} /> Load Recent Leads
            </button>
            {leads.length > 0 && (
              <div style={{ 
                marginTop: '1rem',
                background: 'var(--bg-glass)', 
                borderRadius: '8px', 
                padding: '1rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {leads.map(lead => (
                  <div 
                    key={lead.id}
                    onClick={() => setScheduleData(prev => ({ ...prev, leadId: lead.id.toString() }))}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: scheduleData.leadId === lead.id.toString() ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>#{lead.id} - {lead.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{lead.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && (
        <div className="settings-group">
          <div className="settings-group-title">
            <Database size={16} /> Integration Status
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={testIntegrations}
            disabled={loading.brevo || loading.redis || loading.database}
            style={{ marginBottom: '1.5rem' }}
          >
            <RefreshCw size={16} className={(loading.brevo || loading.redis || loading.database) ? 'spin' : ''} />
            Test All Connections
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Brevo */}
            <div style={{
              padding: '1.25rem',
              background: 'var(--bg-glass)',
              borderRadius: '10px',
              border: `1px solid ${integrationStatus.brevo?.connected ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ 
                  width: 10, height: 10, borderRadius: '50%',
                  background: integrationStatus.brevo?.connected ? '#22c55e' : '#6b7280'
                }} />
                <span style={{ fontWeight: 600 }}>Brevo API</span>
              </div>
              {integrationStatus.brevo && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {integrationStatus.brevo.connected 
                    ? `✓ Connected (${integrationStatus.brevo.duration})`
                    : `✗ ${integrationStatus.brevo.error}`
                  }
                </div>
              )}
            </div>

            {/* Redis */}
            <div style={{
              padding: '1.25rem',
              background: 'var(--bg-glass)',
              borderRadius: '10px',
              border: `1px solid ${integrationStatus.redis?.connected ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ 
                  width: 10, height: 10, borderRadius: '50%',
                  background: integrationStatus.redis?.connected ? '#22c55e' : '#6b7280'
                }} />
                <span style={{ fontWeight: 600 }}>Redis</span>
              </div>
              {integrationStatus.redis && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {integrationStatus.redis.connected 
                    ? `✓ ${integrationStatus.redis.ping} (${integrationStatus.redis.duration})`
                    : `✗ ${integrationStatus.redis.error}`
                  }
                </div>
              )}
            </div>

            {/* Database */}
            <div style={{
              padding: '1.25rem',
              background: 'var(--bg-glass)',
              borderRadius: '10px',
              border: `1px solid ${integrationStatus.database?.connected ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ 
                  width: 10, height: 10, borderRadius: '50%',
                  background: integrationStatus.database?.connected ? '#22c55e' : '#6b7280'
                }} />
                <span style={{ fontWeight: 600 }}>Database</span>
              </div>
              {integrationStatus.database && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {integrationStatus.database.connected 
                    ? `✓ ${integrationStatus.database.stats?.leads || 0} leads (${integrationStatus.database.duration})`
                    : `✗ ${integrationStatus.database.error}`
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug Tools Tab */}
      {activeTab === 'debug' && (
        <div className="settings-group">
          <div className="settings-group-title">
            <Search size={16} /> Debug Tools
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={getQueueStatus}>
              <RefreshCw size={14} /> Queue Status
            </button>
            <button 
              className="btn" 
              onClick={clearTestData}
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <Trash2 size={14} /> Clear Test Data
            </button>
          </div>

          {queueStatus && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email Queue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{queueStatus.emailSendQueue?.waiting || 0}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Active: {queueStatus.emailSendQueue?.active || 0} | 
                  Failed: {queueStatus.emailSendQueue?.failed || 0}
                </div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Followup Queue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{queueStatus.followupQueue?.waiting || 0}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Active: {queueStatus.followupQueue?.active || 0}
                </div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Pending Jobs (DB)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{queueStatus.database?.pendingJobs || 0}</div>
              </div>
            </div>
          )}

          <ResultDisplay resultKey="clear" />
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
