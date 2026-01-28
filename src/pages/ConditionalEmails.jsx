import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, 
  Clock, Mail, MousePointer, Eye, AlertTriangle, Check, X, RefreshCw
} from 'lucide-react';

// API functions
const API_BASE = 'http://localhost:3000/api';

const fetchConditionalEmails = async () => {
  const res = await fetch(`${API_BASE}/conditional-emails`);
  if (!res.ok) throw new Error('Failed to fetch conditional emails');
  return res.json();
};

const fetchTriggerOptions = async () => {
  const res = await fetch(`${API_BASE}/conditional-emails/trigger-options`);
  if (!res.ok) throw new Error('Failed to fetch trigger options');
  return res.json();
};

const fetchTemplates = async () => {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
};

const createConditionalEmail = async (data) => {
  const res = await fetch(`${API_BASE}/conditional-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create conditional email');
  return res.json();
};

const updateConditionalEmail = async (id, data) => {
  const res = await fetch(`${API_BASE}/conditional-emails/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update conditional email');
  return res.json();
};

const deleteConditionalEmail = async (id) => {
  const res = await fetch(`${API_BASE}/conditional-emails/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete conditional email');
  return res.json();
};

const toggleConditionalEmail = async (id) => {
  const res = await fetch(`${API_BASE}/conditional-emails/${id}/toggle`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to toggle conditional email');
  return res.json();
};

// Event icon mapping
const eventIcons = {
  opened: <Eye size={16} />,
  clicked: <MousePointer size={16} />,
  delivered: <Mail size={16} />,
  bounced: <AlertTriangle size={16} />
};

const eventColors = {
  opened: '#3b82f6',
  clicked: '#22c55e',
  delivered: '#8b5cf6',
  bounced: '#ef4444'
};

export default function ConditionalEmails({ showToast }) {
  const [conditionalEmails, setConditionalEmails] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [triggerOptions, setTriggerOptions] = useState({ events: [], steps: [] });
  const [templates, setTemplates] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: 'opened',
    triggerStep: 'Initial Email',
    delayHours: 0,
    templateId: '',
    cancelPending: true,
    priority: 10,
    enabled: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emailsData, optionsData, templatesData] = await Promise.all([
        fetchConditionalEmails(),
        fetchTriggerOptions(),
        fetchTemplates()
      ]);
      setConditionalEmails(emailsData.conditionalEmails || []);
      setStats(emailsData.stats || {});
      setTriggerOptions(optionsData);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast?.('Failed to load conditional emails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (email = null) => {
    if (email) {
      setEditingId(email.id);
      setFormData({
        name: email.name,
        description: email.description || '',
        triggerEvent: email.triggerEvent,
        triggerStep: email.triggerStep,
        delayHours: email.delayHours || 0,
        templateId: email.templateId || '',
        cancelPending: email.cancelPending !== false,
        priority: email.priority || 10,
        enabled: email.enabled !== false
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        triggerEvent: 'opened',
        triggerStep: 'Initial Email',
        delayHours: 0,
        templateId: '',
        cancelPending: true,
        priority: 10,
        enabled: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateConditionalEmail(editingId, formData);
        showToast?.('Conditional email updated', 'success');
      } else {
        await createConditionalEmail(formData);
        showToast?.('Conditional email created', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      showToast?.(error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this conditional email?')) return;
    try {
      await deleteConditionalEmail(id);
      showToast?.('Conditional email deleted', 'success');
      loadData();
    } catch (error) {
      showToast?.(error.message, 'error');
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleConditionalEmail(id);
      loadData();
    } catch (error) {
      showToast?.(error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div className="header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={28} color="#f59e0b" />
            Conditional Emails
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
            Trigger emails based on lead engagement events (opened, clicked, etc.)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={loadData}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Add Conditional Email
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: '#8b5cf6' }}>{stats.total || 0}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Total Configured</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: '#22c55e' }}>{stats.enabled || 0}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Enabled</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: '#3b82f6' }}>{stats.triggered || 0}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Emails Sent</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', color: '#f59e0b' }}>{stats.pending || 0}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Pending</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="card" style={{ marginBottom: '2rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <h4 style={{ marginBottom: '10px', color: '#a855f7' }}>💡 How It Works</h4>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <strong>Conditional Emails</strong> are triggered when specific events occur on your outreach emails. 
          For example, when a recipient <strong>opens</strong> your Initial Email, you can automatically send a 
          "Thank You" email. When triggered, conditional emails <strong>take priority</strong> and can cancel 
          pending followups.
        </p>
      </div>

      {/* Conditional Emails List */}
      {conditionalEmails.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Zap size={48} style={{ color: 'var(--text-muted)', marginBottom: '15px' }} />
          <h3>No Conditional Emails Configured</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Create your first conditional email to automatically respond to lead engagement.
          </p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Create Conditional Email
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {conditionalEmails.map(email => (
            <div 
              key={email.id} 
              className="card"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                opacity: email.enabled ? 1 : 0.6,
                border: email.enabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)'
              }}
            >
              {/* Trigger Badge */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 15px',
                borderRadius: '20px',
                background: `${eventColors[email.triggerEvent]}20`,
                color: eventColors[email.triggerEvent],
                fontWeight: 600
              }}>
                {eventIcons[email.triggerEvent]}
                {email.triggerEvent.toUpperCase()}
              </div>
              
              {/* Details */}
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '5px' }}>{email.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Triggers when <strong>{email.triggerStep}</strong> is <strong>{email.triggerEvent}</strong>
                  {email.delayHours > 0 && ` • Delay: ${email.delayHours} hr`}
                  {email.cancelPending && ' • Cancels followups'}
                </p>
              </div>
              
              {/* Template */}
              <div style={{ 
                padding: '5px 12px', 
                background: 'var(--bg-glass)', 
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                <Mail size={14} style={{ marginRight: '5px', opacity: 0.7 }} />
                {email.template?.name || 'No template'}
              </div>
              
              {/* Priority */}
              <div style={{ 
                padding: '5px 10px', 
                background: 'rgba(249, 115, 22, 0.1)', 
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#f97316'
              }}>
                P{email.priority}
              </div>
              
              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-icon"
                  onClick={() => handleToggle(email.id)}
                  title={email.enabled ? 'Disable' : 'Enable'}
                  style={{ color: email.enabled ? '#22c55e' : 'var(--text-muted)' }}
                >
                  {email.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button 
                  className="btn btn-icon"
                  onClick={() => handleOpenModal(email)}
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn btn-icon"
                  onClick={() => handleDelete(email.id)}
                  title="Delete"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Zap size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {editingId ? 'Edit' : 'Create'} Conditional Email
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Trigger emails based on lead engagement
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Basic Info Section */}
                <div style={{ 
                  background: 'var(--bg-glass)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    📝 Basic Information
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Name */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Thank You Email"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Trigger Configuration */}
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#3b82f6' }}>
                    🎯 Trigger Configuration
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Trigger Event <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={formData.triggerEvent}
                        onChange={e => setFormData({ ...formData, triggerEvent: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      >
                        {triggerOptions.events.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Watch Which Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={formData.triggerStep}
                        onChange={e => setFormData({ ...formData, triggerStep: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      >
                        {triggerOptions.steps.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <p style={{ 
                    margin: '12px 0 0 0', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    💡 When <strong>{formData.triggerStep}</strong> is <strong>{formData.triggerEvent}</strong>, this email will trigger
                  </p>
                </div>
                
                {/* Schedule & Template */}
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#22c55e' }}>
                    📧 Schedule & Template
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Delay (hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.delayHours}
                        onChange={e => setFormData({ ...formData, delayHours: parseInt(e.target.value) || 0 })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        Template
                      </label>
                      <select
                        value={formData.templateId}
                        onChange={e => setFormData({ ...formData, templateId: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">Select template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                      Priority (1-100)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                      style={{
                        width: '120px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Higher = processed first
                    </span>
                  </div>
                </div>
                
                {/* Options */}
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  background: 'var(--bg-glass)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.cancelPending}
                      onChange={e => setFormData({ ...formData, cancelPending: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
                    />
                    <span>Cancel pending followups when triggered</span>
                  </label>
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#22c55e' }}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div style={{ 
                padding: '16px 24px', 
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'var(--bg-glass)'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={18} />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
