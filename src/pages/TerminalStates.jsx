import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Skull, UserX, Flag, RefreshCw, Search, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, Mail, ArrowLeft, RotateCcw
} from 'lucide-react';
import api from '../services/api';

const TABS = [
  { 
    id: 'dead', 
    label: 'Dead', 
    icon: Skull, 
    color: '#4b5563',
    bgColor: 'rgba(75, 85, 99, 0.15)',
    description: 'Leads exceeding max retry attempts - all future mails cancelled'
  },
  { 
    id: 'unsubscribed', 
    label: 'Unsubscribed', 
    icon: UserX, 
    color: '#9333ea',
    bgColor: 'rgba(147, 51, 234, 0.15)',
    description: 'Leads who opted out - compliance requires no further contact'
  },
  { 
    id: 'complaint', 
    label: 'Complaints', 
    icon: Flag, 
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    description: 'Leads who filed spam complaints - continuing may harm sender reputation'
  }
];

export default function TerminalStates() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dead');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ dead: 0, unsubscribed: 0, complaint: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [resurrecting, setResurrecting] = useState(null);
  
  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);
  
  // Fetch leads when tab or page changes
  useEffect(() => {
    fetchLeads();
  }, [activeTab, page, search]);
  
  const fetchStats = async () => {
    try {
      const response = await api.get('/terminal-states/stats');
      setStats(response.data.counts);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };
  
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { state: activeTab, page, limit: 20 };
      if (search) params.search = search;
      
      const response = await api.get('/terminal-states', { params });
      setLeads(response.data.leads);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResurrect = async (leadId) => {
    if (!confirm('Are you sure you want to resurrect this lead? This will reset retry counts and allow scheduling new emails.')) {
      return;
    }
    
    setResurrecting(leadId);
    try {
      await api.post(`/terminal-states/${leadId}/resurrect`);
      fetchLeads();
      fetchStats();
    } catch (error) {
      console.error('Failed to resurrect lead:', error);
      alert('Failed to resurrect lead: ' + error.message);
    } finally {
      setResurrecting(null);
    }
  };
  
  const activeTabConfig = TABS.find(t => t.id === activeTab);
  const ActiveIcon = activeTabConfig?.icon;
  
  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{ marginBottom: '1rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={28} style={{ color: '#f59e0b' }} />
            Terminal States
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Leads that have reached an end state and require special attention
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <div 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className="card stat-card"
            style={{ 
              cursor: 'pointer',
              background: activeTab === tab.id ? tab.bgColor : 'var(--bg-glass)',
              border: activeTab === tab.id ? `2px solid ${tab.color}` : '1px solid var(--border-color)',
              transition: 'all 0.3s ease',
              transform: activeTab === tab.id ? 'translateY(-2px)' : 'none',
              boxShadow: activeTab === tab.id ? `0 8px 24px ${tab.color}30` : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                className="stat-icon"
                style={{ 
                  background: tab.bgColor, 
                  color: tab.color,
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <tab.icon size={24} />
              </div>
              <div className="stat-content">
                <h2 style={{ fontSize: '2rem', margin: 0, color: tab.color }}>{stats[tab.id] || 0}</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{tab.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Tab Description Card */}
      <div 
        className="card"
        style={{ 
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem',
          background: activeTabConfig?.bgColor,
          borderLeft: `4px solid ${activeTabConfig?.color}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <AlertTriangle size={20} style={{ color: activeTabConfig?.color, flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: 0, color: activeTabConfig?.color, fontWeight: 600 }}>{activeTabConfig?.label}</h4>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeTabConfig?.description}</p>
        </div>
      </div>
      
      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} 
            size={18} 
          />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>
      
      {/* Leads Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <ActiveIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No {activeTabConfig?.label.toLowerCase()} leads found</p>
          </div>
        ) : (
          <>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Lead</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reason</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Last Email</th>
                  {activeTab === 'dead' && (
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr 
                    key={lead.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{lead.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div 
                        style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--text-secondary)', 
                          maxWidth: '200px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }} 
                        title={lead.terminalReason}
                      >
                        {lead.terminalReason || 'No reason provided'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} />
                        {lead.terminalStateAt 
                          ? new Date(lead.terminalStateAt).toLocaleDateString()
                          : 'Unknown'
                        }
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {lead.emailJobs?.[0] ? (
                        <div style={{ fontSize: '0.9rem' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{lead.emailJobs[0].type}</div>
                          <div style={{ 
                            color: lead.emailJobs[0].status === 'delivered' ? '#22c55e' : 
                                   lead.emailJobs[0].status === 'failed' ? '#ef4444' : 'var(--text-muted)',
                            fontSize: '0.8rem'
                          }}>
                            {lead.emailJobs[0].status}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>None</span>
                      )}
                    </td>
                    {activeTab === 'dead' && (
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleResurrect(lead.id)}
                          disabled={resurrecting === lead.id}
                          className="btn"
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.25))',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: resurrecting === lead.id ? 'not-allowed' : 'pointer',
                            opacity: resurrecting === lead.id ? 0.5 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {resurrecting === lead.id ? (
                            <RefreshCw size={14} className="spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          Resurrect
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'var(--bg-glass)'
              }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary"
                    style={{ padding: '8px', opacity: page === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary"
                    style={{ padding: '8px', opacity: page === totalPages ? 0.5 : 1 }}
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
