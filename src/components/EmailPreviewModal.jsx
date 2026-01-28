// components/EmailPreviewModal.jsx
// Reusable modal to preview emails with variables replaced before sending
import { useState, useEffect } from 'react';
import { X, Eye, Send, User, Building, Mail, MapPin, Globe } from 'lucide-react';

export default function EmailPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  template,  // { subject, body }
  lead,      // { name, email, company, city, country }
  title = 'Preview Email'
}) {
  const [activeTab, setActiveTab] = useState('preview');
  
  if (!isOpen) return null;

  // Variable replacement function
  const replaceVariables = (text) => {
    if (!text) return '';
    const variables = {
      '{{name}}': lead?.name || 'Lead Name',
      '{{company}}': lead?.company || lead?.name || 'Company Name',
      '{{email}}': lead?.email || 'email@example.com',
      '{{city}}': lead?.city || 'City',
      '{{country}}': lead?.country || 'Country'
    };
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  };

  const previewSubject = replaceVariables(template?.subject || '(No Subject)');
  const previewBody = replaceVariables(template?.body || '<p>No content</p>');

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 100px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Eye size={20} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Review before sending
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)', border: 'none', borderRadius: '8px',
              padding: '8px', cursor: 'pointer', display: 'flex'
            }}
          >
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Recipient Info */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--bg-hover)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-secondary)' }}>To:</span>
            <strong>{lead?.name || 'Unknown'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} color="var(--text-muted)" />
            <span>{lead?.email || 'No email'}</span>
          </div>
          {lead?.company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} color="var(--text-muted)" />
              <span>{lead.company}</span>
            </div>
          )}
          {(lead?.city || lead?.country) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--text-muted)" />
              <span>{[lead.city, lead.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 24px'
        }}>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'preview' ? 600 : 400,
              color: activeTab === 'preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'preview' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'raw' ? 600 : 400,
              color: activeTab === 'raw' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'raw' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            Template (Raw)
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Subject */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              display: 'block',
              marginBottom: '6px'
            }}>
              Subject
            </label>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-hover)',
              borderRadius: '8px',
              fontWeight: 500
            }}>
              {activeTab === 'preview' ? previewSubject : template?.subject || '(No Subject)'}
            </div>
          </div>

          {/* Body */}
          <div>
            <label style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              display: 'block',
              marginBottom: '6px'
            }}>
              Body
            </label>
            <div style={{
              padding: '20px',
              background: activeTab === 'preview' ? 'white' : 'var(--bg-hover)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              minHeight: '200px',
              color: activeTab === 'preview' ? '#333' : 'var(--text-primary)'
            }}>
              {activeTab === 'preview' ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: previewBody }}
                  style={{ lineHeight: 1.7 }}
                />
              ) : (
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  margin: 0,
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}>
                  {template?.body || 'No content'}
                </pre>
              )}
            </div>
          </div>

          {/* Variable Legend */}
          {activeTab === 'raw' && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px 16px',
              background: 'rgba(124, 58, 237, 0.1)',
              borderRadius: '8px',
              fontSize: '0.8rem'
            }}>
              <strong style={{ color: 'var(--accent-primary)' }}>Available Variables:</strong>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                <code>{'{{name}}'}</code>
                <code>{'{{company}}'}</code>
                <code>{'{{email}}'}</code>
                <code>{'{{city}}'}</code>
                <code>{'{{country}}'}</code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {onConfirm && (
            <button className="btn btn-primary" onClick={onConfirm}>
              <Send size={16} /> Confirm & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
