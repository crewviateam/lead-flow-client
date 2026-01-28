// pages/Leads.jsx
// Leads management with TanStack Query for caching and mutations
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Trash2, Mail, RefreshCw, Eye, Snowflake, Play, Download, MoreVertical, Tag, X, TrendingUp, Flame } from 'lucide-react';
import gsap from 'gsap';
import { useLeads, useTags, useDeleteLead, useFreezeLead, useUnfreezeLead } from '../hooks/useApi';
import { scheduleEmails, bulkAddTags } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function Leads({ showToast }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const tableRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger' });
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // TanStack Query hooks - automatic caching and deduplication
  const { 
    data: leadsData, 
    isLoading, 
    refetch 
  } = useLeads(page, 20, statusFilter || undefined, tagFilter || undefined, sortBy);
  
  const { data: tagsData } = useTags();
  
  // Mutations
  const deleteMutation = useDeleteLead();
  const freezeMutation = useFreezeLead();
  const unfreezeMutation = useUnfreezeLead();

  const leads = useMemo(() => leadsData?.leads || [], [leadsData?.leads]);
  const pagination = useMemo(() => leadsData?.pagination || { page: 1, pages: 1, total: 0 }, [leadsData?.pagination]);
  const availableTags = useMemo(() => tagsData?.tags || [], [tagsData?.tags]);

  // Animate table rows when data changes
  useEffect(() => {
    if (!isLoading && tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll('tbody tr'),
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.02, ease: 'power2.out' }
      );
    }
  }, [leads, isLoading]);

  // Close bulk menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setBulkMenuOpen(false);
    if (bulkMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [bulkMenuOpen]);

  const handleSchedule = useCallback(async () => {
    try {
      const ids = selectedLeads.length > 0 ? selectedLeads : undefined;
      const result = await scheduleEmails(ids);
      showToast?.(`Scheduled ${result.results?.scheduled || 0} emails`, 'success');
      setSelectedLeads([]);
      refetch();
    } catch (error) {
      showToast?.('Failed to schedule emails: ' + error.message, 'error');
    }
  }, [selectedLeads, showToast, refetch]);

  const handleDelete = useCallback((id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead and all associated email jobs?',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          showToast?.('Lead deleted successfully', 'success');
          setSelectedLeads(prev => prev.filter(x => x !== id));
        } catch (error) {
          showToast?.('Failed to delete lead: ' + error.message, 'error');
        }
      },
      variant: 'danger'
    });
  }, [deleteMutation, showToast]);

  const handleBulkDelete = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Multiple Leads',
      message: `Are you sure you want to delete ${selectedLeads.length} leads?`,
      onConfirm: async () => {
        try {
          for (const id of selectedLeads) {
            await deleteMutation.mutateAsync(id);
          }
          showToast?.(`Deleted ${selectedLeads.length} leads`, 'success');
          setSelectedLeads([]);
        } catch (error) {
          showToast?.('Failed to delete some leads: ' + error.message, 'error');
        }
      },
      variant: 'danger'
    });
  }, [selectedLeads, deleteMutation, showToast]);

  const handleBulkFreeze = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Freeze Selected Leads',
      message: `Freeze ${selectedLeads.length} leads? This will pause all email sequences for these leads.`,
      onConfirm: async () => {
        try {
          let success = 0;
          for (const id of selectedLeads) {
            try {
              await freezeMutation.mutateAsync({ id });
              success++;
            } catch (e) { /* continue */ }
          }
          showToast?.(`Frozen ${success} leads`, 'success');
          setSelectedLeads([]);
        } catch (error) {
          showToast?.('Failed to freeze some leads: ' + error.message, 'error');
        }
      },
      variant: 'warning'
    });
    setBulkMenuOpen(false);
  }, [selectedLeads, freezeMutation, showToast]);

  const handleBulkUnfreeze = useCallback(async () => {
    try {
      let success = 0;
      for (const id of selectedLeads) {
        try {
          await unfreezeMutation.mutateAsync(id);
          success++;
        } catch (e) { /* continue */ }
      }
      showToast?.(`Unfrozen ${success} leads`, 'success');
      setSelectedLeads([]);
    } catch (error) {
      showToast?.('Failed to unfreeze some leads: ' + error.message, 'error');
    }
    setBulkMenuOpen(false);
  }, [selectedLeads, unfreezeMutation, showToast]);

  const handleExportCSV = useCallback(() => {
    const dataToExport = selectedLeads.length > 0 
      ? leads.filter(l => selectedLeads.includes(l.id))
      : leads;
    
    const headers = ['Name', 'Email', 'Company', 'Status', 'Country', 'Timezone', 'Created'];
    const rows = dataToExport.map(l => [
      l.name || '',
      l.email || '',
      l.company || '',
      l.status || '',
      l.country || '',
      l.timezone || '',
      l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast?.(`Exported ${dataToExport.length} leads to CSV`, 'success');
    setBulkMenuOpen(false);
  }, [leads, selectedLeads, showToast]);

  const handleBulkAddTags = useCallback(async () => {
    if (!newTagInput.trim()) return;
    
    const tagsToAdd = newTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;
    
    try {
      await bulkAddTags(selectedLeads, tagsToAdd);
      showToast?.(`Added ${tagsToAdd.length} tag(s) to ${selectedLeads.length} leads`, 'success');
      setNewTagInput('');
      setShowTagModal(false);
      setSelectedLeads([]);
      refetch();
    } catch (error) {
      showToast?.('Failed to add tags: ' + error.message, 'error');
    }
  }, [selectedLeads, newTagInput, showToast, refetch]);

  const toggleSelect = useCallback((id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  }, [selectedLeads.length, leads]);

  // Memoized filtered leads for search
  const filteredLeads = useMemo(() => {
    return searchTerm 
      ? leads.filter(l => 
          l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : leads;
  }, [leads, searchTerm]);

  // Memoized status formatter
  const formatStatus = useCallback((status) => {
    if (!status) return { display: 'Unknown', badgeClass: 'unknown' };
    
    let displayStatus = status;
    let badgeClass = status;
    
    if (status.includes(':')) {
      const [type, rawStatus] = status.split(':');
      badgeClass = rawStatus;
      const cleanType = type === 'manual' ? 'Manual' : 
                        type === 'initial' || type === 'Initial Email' ? 'Initial' : type;
      const cleanStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).replace('_', ' ');
      displayStatus = `${cleanType}: ${cleanStatus}`;
      
      if (rawStatus === 'manual_scheduled' || type === 'manual_scheduled') {
        displayStatus = 'Manual: Scheduled';
        badgeClass = 'manual_scheduled';
      }
    } else {
      const labels = {
        'soft_bounce': 'Soft Bounced',
        'hard_bounce': 'Hard Bounced',
        'pending': 'Initial: Scheduled',
        'scheduled': 'Scheduled',
        'manual_scheduled': 'Manual: Scheduled',
        'rescheduled': 'Rescheduled',
        'frozen': 'Frozen',
        'converted': 'Converted',
        'failed': 'Failed',
        'blocked': 'Blocked',
        'deferred': 'Deferred',
        'spam': 'Spam'
      };
      displayStatus = labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
    
    return { display: displayStatus, badgeClass };
  }, []);

  return (
    <div>
      <div className="header">
        <h2>Lead Management</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {selectedLeads.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={handleBulkDelete}
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={18} />
              Delete ({selectedLeads.length})
            </button>
          )}
          
          {/* Bulk Actions Dropdown */}
          {selectedLeads.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary"
                onClick={(e) => { e.stopPropagation(); setBulkMenuOpen(!bulkMenuOpen); }}
              >
                <MoreVertical size={18} />
                More Actions
              </button>
              {bulkMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  minWidth: '180px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <button 
                    onClick={handleBulkFreeze}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-primary)',
                      cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Snowflake size={16} color="#3b82f6" /> Freeze All
                  </button>
                  <button 
                    onClick={handleBulkUnfreeze}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-primary)',
                      cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Play size={16} color="#22c55e" /> Unfreeze All
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-color)' }} />
                  <button 
                    onClick={handleExportCSV}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-primary)',
                      cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Download size={16} color="#a855f7" /> Export to CSV
                  </button>
                  <button 
                    onClick={() => { setShowTagModal(true); setBulkMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-primary)',
                      cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Tag size={16} color="#f59e0b" /> Add Tags
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button 
            className="btn btn-primary" 
            onClick={handleSchedule}
            disabled={isLoading}
          >
            <Mail size={18} />
            Schedule {selectedLeads.length > 0 && `(${selectedLeads.length})`}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0 14px',
            flex: 1,
            maxWidth: '300px'
          }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                padding: '10px 0',
                fontSize: '0.9rem',
                width: '100%'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          {/* Tag Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={18} color="var(--text-muted)" />
            <select 
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          
          {/* Sort Toggle */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-glass)', 
            borderRadius: '8px', 
            padding: '4px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setSortBy('createdAt')}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: '6px',
                background: sortBy === 'createdAt' ? 'var(--accent-primary)' : 'transparent',
                color: sortBy === 'createdAt' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('score')}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: '6px',
                background: sortBy === 'score' ? 'var(--accent-primary)' : 'transparent',
                color: sortBy === 'score' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Flame size={14} /> Hot Leads
            </button>
          </div>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: 'auto' }}>
            {pagination.total} total leads
          </span>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card" ref={tableRef}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.length === leads.length && leads.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Timezone</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No leads found
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const { display, badgeClass } = formatStatus(lead.status);
                      const score = lead.score || 0;
                      const tier = score >= 50 ? 'hot' : score >= 20 ? 'warm' : score >= 1 ? 'cold' : 'new';
                      const colors = {
                        hot: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', icon: '🔥' },
                        warm: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', icon: '⚡' },
                        cold: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: '❄️' },
                        new: { bg: 'var(--bg-hover)', text: 'var(--text-muted)', icon: '•' }
                      };
                      const c = colors[tier];
                      
                      return (
                        <tr key={lead.id} className='cursor-pointer'>
                          <td>
                            <input 
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                            />
                          </td>
                          <td style={{ fontWeight: 500 }}>{lead.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{lead.email}</td>
                          <td>{lead.city}, {lead.country}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lead.timezone}</td>
                          <td>
                            <div style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              background: c.bg, padding: '4px 10px', borderRadius: '8px'
                            }}>
                              <span style={{ fontSize: '12px' }}>{c.icon}</span>
                              <span style={{ fontWeight: 600, color: c.text, fontSize: '0.85rem' }}>{score}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${badgeClass}`} style={{ whiteSpace: 'nowrap' }}>{display}</span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => navigate(`/leads/${lead.id}`)}
                                style={{
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  color: '#3b82f6'
                                }}
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(lead.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  color: '#ef4444'
                                }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{ padding: '8px 12px' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    className="btn btn-secondary"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                    style={{ padding: '8px 12px' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
      
      {/* Bulk Tag Modal */}
      {showTagModal && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowTagModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-card)', borderRadius: '16px',
              padding: '24px', width: '400px', maxWidth: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Add Tags to {selectedLeads.length} Lead(s)</h3>
              <button onClick={() => setShowTagModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Enter tags (comma separated)..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: 'var(--bg-glass)',
                color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '12px'
              }}
              autoFocus
            />
            
            {availableTags.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Existing tags (click to add):</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availableTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setNewTagInput(prev => prev ? `${prev}, ${tag}` : tag)}
                      style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem',
                        background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowTagModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkAddTags} disabled={!newTagInput.trim()}>
                <Tag size={16} /> Add Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
