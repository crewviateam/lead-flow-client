// pages/Upload.jsx
import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { uploadLeads } from '../services/api';

export default function Upload({ showToast }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();
  const uploadZoneRef = useRef();
  const resultRef = useRef();

  useEffect(() => {
    // Animate upload zone on mount
    if (uploadZoneRef.current) {
      gsap.fromTo(uploadZoneRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  useEffect(() => {
    // Animate result card when it appears
    if (result && resultRef.current) {
      gsap.fromTo(resultRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [result]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      setResult(null);
    } else {
      showToast?.('Please upload a CSV or XLSX file', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const data = await uploadLeads(file);
      setResult({
        success: true,
        data: data
      });
      setFile(null);
      showToast?.(`Successfully imported ${data.import?.success || 0} leads!`, 'success');
    } catch (error) {
      setResult({
        success: false,
        error: error.response?.data?.error || error.message
      });
      showToast?.('Upload failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h2>Upload Leads</h2>
      </div>

      {/* Upload Zone */}
      <div className="card" style={{ marginBottom: '1.5rem' }} ref={uploadZoneRef}>
        <div
          className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: 'rgba(124, 58, 237, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <UploadIcon size={36} color="#a855f7" />
          </div>
          <h4 style={{ fontSize: '1.1rem' }}>Drag and drop your file here</h4>
          <p style={{ marginTop: '0.5rem' }}>or click to browse • Supports CSV and XLSX</p>
        </div>

        {/* Selected File */}
        {file && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem 1.25rem',
            background: 'var(--bg-hover)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                background: 'rgba(124, 58, 237, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileSpreadsheet size={22} color="#a855f7" />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{file.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                style={{ padding: '10px' }}
              >
                <X size={18} />
              </button>
              <button 
                className="btn btn-primary"
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Upload & Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card" ref={resultRef}>
          {result.success ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={26} color="#22c55e" />
                </div>
                <div>
                  <h3 style={{ color: '#22c55e', fontSize: '1.2rem' }}>Upload Successful!</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                    Your leads have been imported and scheduled.
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <h4 style={{ fontSize: '2rem', color: '#22c55e', fontWeight: 700 }}>
                    {result.data.import?.success || 0}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Imported</p>
                </div>
                <div style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(168, 85, 247, 0.1)', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <h4 style={{ fontSize: '2rem', color: '#a855f7', fontWeight: 700 }}>
                    {result.data.scheduling?.scheduled || 0}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Scheduled</p>
                </div>
                <div style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <h4 style={{ fontSize: '2rem', color: '#ef4444', fontWeight: 700 }}>
                    {result.data.import?.failed || 0}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Failed</p>
                </div>
              </div>

              {result.data.import?.errors?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Import Errors:</h4>
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    padding: '1rem', 
                    borderRadius: '10px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid rgba(239, 68, 68, 0.15)'
                  }}>
                    {result.data.import.errors.map((err, idx) => (
                      <p key={idx} style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '6px' }}>
                        {JSON.stringify(err.row?.email || err.row)} - {err.errors?.join(', ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertCircle size={26} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ color: '#ef4444', fontSize: '1.2rem' }}>Upload Failed</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Format Guide */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📋 Required CSV Format</h3>
        <div style={{ 
          background: 'var(--bg-glass)', 
          padding: '1rem 1.25rem', 
          borderRadius: '10px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          fontSize: '0.85rem',
          overflowX: 'auto',
          border: '1px solid var(--border-color)'
        }}>
          <p style={{ color: '#a855f7', fontWeight: 600 }}>name,email,city,country</p>
          <p style={{ color: 'var(--text-secondary)' }}>John Doe,john@example.com,New York,US</p>
          <p style={{ color: 'var(--text-secondary)' }}>Jane Smith,jane@example.com,London,GB</p>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> Use ISO 2-letter country codes (US, GB, IN, AU, etc.)
        </p>
      </div>
    </div>
  );
}
