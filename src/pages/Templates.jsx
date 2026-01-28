// pages/Templates.jsx
import { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, Eye, Code, X, Save, Copy, Check } from 'lucide-react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  
  const previewRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
    } else {
      setEditingTemplate(null);
      setName('');
      setSubject('');
      setBody(getDefaultTemplate());
    }
    setShowEditor(true);
    setPreviewMode(false);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setBody('');
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      const templateData = {
        name: name.trim(),
        subject: subject.trim(),
        body: body,
        variables: extractVariables(body)
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }

      await loadTemplates();
      closeEditor();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  // Extract {{variable}} patterns from HTML
  const extractVariables = (html) => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  };

  const getDefaultTemplate = () => `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hello {{name}}!</h1>
    </div>
    <div class="content">
      <p>Welcome to our platform. We're excited to have you here!</p>
      <p>Your company <strong>{{company}}</strong> is now set up and ready to go.</p>
      <a href="#" class="button">Get Started</a>
    </div>
    <div class="footer">
      <p>© 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const detectedVariables = extractVariables(body);

  return (
    <div>
      <div className="header">
        <h2>📧 Email Templates</h2>
        <button className="btn btn-primary" onClick={() => openEditor()}>
          <Plus size={18} /> New Template
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Code size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Templates Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Create your first email template with HTML and CSS
          </p>
          <button className="btn btn-primary" onClick={() => openEditor()}>
            <Plus size={18} /> Create Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {templates.map(template => (
            <div key={template.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Preview Header */}
              <div style={{ 
                height: '150px', 
                overflow: 'hidden', 
                background: 'var(--bg-glass)',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <iframe
                  srcDoc={template.body}
                  style={{ 
                    width: '200%', 
                    height: '300px', 
                    border: 'none',
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none'
                  }}
                  title={template.name}
                />
              </div>
              
              {/* Template Info */}
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{template.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Subject: {template.subject}
                </p>
                
                {/* Variables */}
                {template.variables?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                    {template.variables.map(v => (
                      <span key={v} style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: '#a855f7',
                        borderRadius: '4px'
                      }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openEditor(template)}>
                    <Edit3 size={16} /> Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '8px 12px' }}
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1200px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>
                {editingTemplate ? '✏️ Edit Template' : '➕ New Template'}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Toggle Preview/Code */}
                <div style={{ 
                  display: 'flex', 
                  background: 'var(--bg-glass)', 
                  borderRadius: '8px', 
                  padding: '4px'
                }}>
                  <button
                    onClick={() => setPreviewMode(false)}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      background: !previewMode ? 'var(--accent-primary)' : 'transparent',
                      color: !previewMode ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Code size={16} /> Code
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      background: previewMode ? 'var(--accent-primary)' : 'transparent',
                      color: previewMode ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Eye size={16} /> Preview
                  </button>
                </div>
                <button onClick={closeEditor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left Panel - Form */}
              <div style={{ 
                width: previewMode ? '50%' : '100%', 
                padding: '1.5rem', 
                overflowY: 'auto',
                transition: 'width 0.3s ease'
              }}>
                {/* Name */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Template Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome Email"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Subject */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Subject</label>
                  <input
                    type="text"
                    className="input-field"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Welcome to {{company}}!"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Variables Hint */}
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  background: 'rgba(168, 85, 247, 0.1)', 
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <strong>💡 Available Variables:</strong> Use <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{`{{variable}}`}</code> syntax.
                  <br/>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Common: <code>name</code>, <code>company</code>, <code>email</code>
                  </span>
                  {detectedVariables.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <strong>Detected:</strong> {detectedVariables.map(v => `{{${v}}}`).join(', ')}
                    </div>
                  )}
                </div>

                {/* HTML Editor */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>HTML Content</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your HTML email content..."
                    style={{
                      width: '100%',
                      height: previewMode ? '300px' : '400px',
                      padding: '1rem',
                      fontFamily: 'Monaco, Consolas, monospace',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Right Panel - Preview */}
              {previewMode && (
                <div style={{ 
                  width: '50%', 
                  borderLeft: '1px solid var(--border-color)',
                  background: '#ffffff',
                  overflow: 'hidden'
                }}>
                  <iframe
                    ref={previewRef}
                    srcDoc={body}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Preview"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button className="btn btn-secondary" onClick={closeEditor}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
