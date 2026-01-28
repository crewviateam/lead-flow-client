import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';

export default function DateRangeSelector({ 
  dateRange, 
  setDateRange, 
  customStart, 
  setCustomStart, 
  customEnd, 
  setCustomEnd, 
  showCustom, 
  setShowCustom, 
  onRefresh,
  loading = false
}) {
  return (
    <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select 
          value={dateRange}
          onChange={(e) => {
            const val = e.target.value;
            setDateRange(val);
            setShowCustom(val === 'custom');
          }}
          style={{ minWidth: '160px' }}
        >
          <option value="7h">Last 7 hours</option>
          <option value="14h">Last 14 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="3d">Last 3 days</option>
          <option value="7d">Last 7 days</option>
          <option value="14d">Last 14 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {showCustom && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="date" 
            value={customStart} 
            onChange={(e) => setCustomStart(e.target.value)} 
            className="input-minimal"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              padding: '4px',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>to</span>
          <input 
            type="date" 
            value={customEnd} 
            onChange={(e) => setCustomEnd(e.target.value)} 
            className="input-minimal"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              padding: '4px',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <button 
            className="btn btn-primary" 
            onClick={onRefresh} 
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            disabled={loading}
          >
            Apply
          </button>
        </div>
      )}

      <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
