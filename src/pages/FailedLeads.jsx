// pages/FailedLeads.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Trash2, RefreshCw, Eye, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';
import { getLeads, deleteLead, retryLead } from '../services/api';

export default function FailedLeads({ showToast }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState(null);
  const tableRef = useRef(null);

  const statusFilters = [
    { key: 'all', label: 'All', statuses: 'hard_bounce,failed,blocked,spam' },
    { key: 'blocked', label: 'Blocked', statuses: 'blocked' },
    { key: 'hard_bounce', label: 'Hard Bounce', statuses: 'hard_bounce' },
    { key: 'spam', label: 'Spam', statuses: 'spam' },
    { key: 'failed', label: 'Failed', statuses: 'failed' },
    // { key: 'deferred', label: 'Deferred', statuses: 'deferred' }
  ];

  const getActiveStatuses = () => statusFilters.find(f => f.key === statusFilter)?.statuses || statusFilters[0].statuses;

  useEffect(() => {
    loadLeads();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    if (!loading && tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll('tbody tr'),
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.02, ease: 'power2.out' }
      );
    }
  }, [leads, loading]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads(pagination.page, 20, getActiveStatuses());
      setLeads(data.leads || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Failed to load leads:', error);
      showToast?.('Failed to load leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(id);
      showToast?.('Lead deleted successfully', 'success');
      setSelectedLeads(prev => prev.filter(x => x !== id));
      loadLeads();
    } catch (error) {
      showToast?.('Failed to delete lead: ' + error.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) return;
    try {
      for (const id of selectedLeads) {
        await deleteLead(id);
      }
      showToast?.(`Deleted ${selectedLeads.length} leads`, 'success');
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      showToast?.('Failed to delete some leads: ' + error.message, 'error');
    }
  };

  const handleRetry = async (id) => {
    setRetrying(id);
    try {
      await retryLead(id);
      showToast?.('Lead queued for retry!', 'success');
      loadLeads();
    } catch (error) {
      showToast?.('Failed to retry: ' + error.message, 'error');
    } finally {
      setRetrying(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length && leads.length > 0) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const filteredLeads = searchTerm 
    ? leads.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leads;

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Failed Outreach</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Leads with delivery issues, bounces, or blocks
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadLeads}>
            <RefreshCw size={18} />
            Refresh
          </button>
          {selectedLeads.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={handleBulkDelete}
              style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <Trash2 size={18} />
              Delete ({selectedLeads.length})
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statusFilters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: statusFilter === filter.key ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                background: statusFilter === filter.key ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-glass)',
                color: statusFilter === filter.key ? 'var(--accent-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: statusFilter === filter.key ? 600 : 400,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0 14px',
            flex: 1,
            maxWidth: '400px'
          }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                padding: '12px 0',
                fontSize: '0.9rem',
                width: '100%'
              }}
            />
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: 'auto' }}>
            {pagination.total} leads require attention
          </span>
        </div>
      </div>

      <div className="card" ref={tableRef}>
        {loading ? (
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
                    <th>Lead</th>
                    <th>Email</th>
                    <th>Last Status</th>
                    <th>Score</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: '1rem', opacity: 0.5 }}><ShieldAlert size={48} /></div>
                        <h3>No failed outreach found</h3>
                        <p>All your leads are currently in good standing.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className='cursor-pointer' onClick={() => navigate(`/leads/${lead.id}`)}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(lead.id);
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{lead.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.city}, {lead.country}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{lead.email}</td>
                        <td>
                          {(() => {
                            const schedule = lead.emailSchedule;
                            let displayStatus = lead.status;
                            let badgeClass = lead.status;

                            const formatLabel = (s) => {
                              const labels = {
                                'soft_bounce': 'Soft Bounced',
                                'hard_bounce': 'Hard Bounced',
                                'failed': 'Failed',
                                'blocked': 'Blocked',
                                // ': ',
                                'spam': 'Spam'
                              };
                              return labels[s] || s;
                            };

                            const failureStates = ['hard_bounce', 'failed', 'blocked', 'spam'];
                            
                            if (schedule) {
                              if (schedule.initialEmail && failureStates.includes(schedule.initialEmail.status)) {
                                displayStatus = `Initial: ${formatLabel(schedule.initialEmail.status)}`;
                                badgeClass = schedule.initialEmail.status;
                              } else {
                                const followups = [...(Array.isArray(schedule.followups) ? schedule.followups : [])].sort((a, b) => (b.order || 0) - (a.order || 0));
                                const failedFollowup = followups.find(f => failureStates.includes(f.status));
                                if (failedFollowup) {
                                  displayStatus = `${failedFollowup.name}: ${formatLabel(failedFollowup.status)}`;
                                  badgeClass = failedFollowup.status;
                                }
                              }
                            }

                            return <span className={`status-badge ${badgeClass}`}>{displayStatus}</span>;
                          })()}
                        </td>
                        <td style={{ fontWeight: 600 }}>{lead.score || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetry(lead.id); }}
                              className="action-btn"
                              title="Retry (Auto-reschedule)"
                              disabled={retrying === lead.id}
                              style={{ color: '#22c55e' }}
                            >
                              {retrying === lead.id ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
                              className="action-btn"
                              title="View / Manual Schedule"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                              className="action-btn"
                              title="Delete Lead"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    style={{ padding: '8px 12px' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    className="btn btn-secondary"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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
    </div>
  );
}
