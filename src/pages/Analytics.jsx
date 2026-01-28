// pages/Analytics.jsx
// Analytics page with TanStack Query for optimized data fetching
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, Calendar, CheckCircle, Eye, XCircle, 
  AlertTriangle, Clock, MousePointer, Mail, ShieldAlert, BarChart3, Binary
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Area
} from 'recharts';
import gsap from 'gsap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../lib/queryClient';
import DateRangeSelector from '../components/DateRangeSelector';
import HierarchyCanvas from '../components/HierarchyCanvas';
import { getAnalyticsSummary, syncAnalytics, getAnalyticsBreakdown, getHierarchicalAnalytics } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444', '#f97316'];

export default function Analytics({ showToast }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const statsRef = useRef(null);

  // Memoized chart styles
  const chartStyles = useMemo(() => ({
    stroke: theme === 'dark' ? '#5a5a70' : '#94a3b8',
    tooltipBg: theme === 'dark' ? '#12121a' : '#ffffff',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tooltipColor: theme === 'dark' ? '#fff' : '#1e293b',
    gridStroke: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  }), [theme]);

  // Calculate query parameters
  const queryParams = useMemo(() => {
    if (dateRange === 'custom') {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : null,
        endDate: customEnd ? new Date(customEnd).toISOString() : new Date().toISOString(),
        period: undefined
      };
    }
    return { period: dateRange, startDate: undefined, endDate: undefined };
  }, [dateRange, customStart, customEnd]);

  // TanStack Query hooks
  const { data: analytics, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['analytics', 'summary', queryParams],
    queryFn: () => getAnalyticsSummary(queryParams.startDate, queryParams.endDate, queryParams.period),
    ...cacheConfig.standard,
  });

  const { data: breakdown } = useQuery({
    queryKey: ['analytics', 'breakdown', queryParams.period || '24h'],
    queryFn: () => getAnalyticsBreakdown(queryParams.period || '24h'),
    ...cacheConfig.standard,
  });

  const { data: hierarchy } = useQuery({
    queryKey: ['analytics', 'hierarchy', queryParams.period || '7d'],
    queryFn: () => getHierarchicalAnalytics(queryParams.period || '7d'),
    ...cacheConfig.standard,
  });

  const loading = summaryLoading;

  // Refetch all data
  const loadAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    refetchSummary();
  }, [queryClient, refetchSummary]);

  // Animate stats on load
  useEffect(() => {
    if (!loading && statsRef.current) {
      gsap.fromTo(statsRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [loading, breakdown]);

  // Sync handler
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncAnalytics();
      showToast?.(`Synced ${result.updated} events from Brevo`, 'success');
      loadAnalytics();
    } catch (error) {
      showToast?.('Sync failed: ' + error.message, 'error');
    } finally {
      setSyncing(false);
    }
  }, [showToast, loadAnalytics]);

  // Memoized derived data
  const summary = useMemo(() => analytics?.summary || {}, [analytics]);
  const bd = useMemo(() => breakdown?.breakdown || {}, [breakdown]);
  const rates = useMemo(() => breakdown?.rates || {}, [breakdown]);
  const fd = useMemo(() => breakdown?.failedData || { total: 0, blocked: 0, hardBounce: 0 }, [breakdown]);
  const rd = useMemo(() => breakdown?.rescheduledData || { total: 0, softBounce: 0, deferred: 0 }, [breakdown]);

  const dailyData = useMemo(() => {
    return summary.dailyBreakdown?.map(d => {
      const isHourly = d.date.includes(' ');
      const dateLabel = isHourly 
        ? new Date(d.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const sent = d.emailsSent || 0;
      const delivered = d.emailsDelivered || 0;
      const opened = d.emailsOpened || 0;
      const clicked = d.emailsClicked || 0;
      const bounced = d.emailsBounced || 0;
        
      return {
        date: dateLabel,
        fullDate: d.date,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        openRate: sent > 0 ? parseFloat(((opened / sent) * 100).toFixed(1)) : 0,
        clickRate: sent > 0 ? parseFloat(((clicked / sent) * 100).toFixed(1)) : 0,
      };
    }).reverse() || [];
  }, [summary.dailyBreakdown]);

  const funnelData = useMemo(() => [
    { name: 'Sent', value: bd.sent || 0, fill: '#8b5cf6' },
    { name: 'Delivered', value: bd.delivered || 0, fill: '#22c55e' },
    { name: 'Opened', value: bd.opened || 0, fill: '#3b82f6' },
    { name: 'Clicked', value: bd.clicked || 0, fill: '#f59e0b' },
  ], [bd]);

  const pieData = useMemo(() => [
    { name: 'Delivered', value: bd.delivered || 0, color: '#22c55e' },
    { name: 'Opened', value: bd.opened || 0, color: '#3b82f6' },
    { name: 'Clicked', value: bd.clicked || 0, color: '#a855f7' },
    { name: 'Soft Bounce', value: bd.softBounced || 0, color: '#eab308' },
    { name: 'Hard Bounce', value: bd.hardBounced || 0, color: '#ef4444' },
    { name: 'Deferred', value: bd.deferred || 0, color: '#f97316' },
  ].filter(d => d.value > 0), [bd]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2>Analytics</h2>
          <DateRangeSelector 
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            showCustom={showCustom}
            setShowCustom={setShowCustom}
            onRefresh={loadAnalytics}
            loading={loading}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                Syncing...
              </>
            ) : (
              <>
                <TrendingUp size={18} />
                Sync from Brevo
              </>
            )}
          </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: activeTab === 'overview' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            background: activeTab === 'overview' ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-glass)',
            color: activeTab === 'overview' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'overview' ? 600 : 400
          }}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: activeTab === 'hierarchy' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            background: activeTab === 'hierarchy' ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-glass)',
            color: activeTab === 'hierarchy' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'hierarchy' ? 600 : 400
          }}
        >
          🌳 Hierarchy
        </button>
      </div>

      {/* Hierarchy Tab */}
      {activeTab === 'hierarchy' && hierarchy && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-header">
            <h3>🌳 Email Flow Hierarchy</h3>
          </div>
          <HierarchyCanvas data={hierarchy} />
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
      <>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-header">
          <h3>📊 Today's Detailed Breakdown</h3>
        </div>

        <div className="stats-grid" ref={statsRef} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Main Stats */}
          <div className="card stat-card" style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="stat-icon purple"><Mail size={24} /></div>
              <div className="stat-content">
                <h2 style={{ fontSize: '2rem', margin: 0 }}>{bd.sent || 0}</h2>
                <p style={{ margin: 0 }}>Total Sent</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
              <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>{bd.delivered || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Delivered</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>{bd.opened || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Opened</div>
              </div>
            </div>
          </div>

          <div className="card stat-card failure-box" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="stat-icon red"><ShieldAlert size={24} /></div>
              <div className="stat-content">
                <h2 style={{ fontSize: '2rem', margin: 0, color: '#ef4444' }}>{fd.total || 0}</h2>
                <p style={{ margin: 0 }}>Failed Mails</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f87171' }}>{fd.blocked || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blocked</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f87171' }}>{fd.hardBounce || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hard Bounce</div>
              </div>
            </div>
          </div>

          <div className="card stat-card reschedule-box" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="stat-icon orange"><RefreshCw size={24} /></div>
              <div className="stat-content">
                <h2 style={{ fontSize: '2rem', margin: 0, color: '#f97316' }}>{rd.total || 0}</h2>
                <p style={{ margin: 0 }}>Rescheduled Mails</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
              <div style={{ padding: '10px', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.1)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fb923c' }}>{rd.softBounce || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Soft Bounce</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.1)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fb923c' }}>{rd.deferred || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deferred</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rates Overview */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '2.5rem', color: '#22c55e' }}>{rates.deliveryRate || 0}%</h4>
          <p style={{ color: 'var(--text-secondary)' }}>Delivery Rate</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '2.5rem', color: '#3b82f6' }}>{rates.openRate || 0}%</h4>
          <p style={{ color: 'var(--text-secondary)' }}>Open Rate</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '2.5rem', color: '#ef4444' }}>{rates.bounceRate || 0}%</h4>
          <p style={{ color: 'var(--text-secondary)' }}>Bounce Rate</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Line Chart */}
        <div className="card">
          <div className="chart-header">
            <h3>Email Performance Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
              <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
              <YAxis stroke={chartStyles.stroke} fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  background: chartStyles.tooltipBg, 
                  border: `1px solid ${chartStyles.tooltipBorder}`,
                  borderRadius: '12px',
                  color: chartStyles.tooltipColor
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sent" />
              <Line type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} dot={false} name="Delivered" />
              <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} dot={false} name="Opened" />
              <Line type="monotone" dataKey="bounced" stroke="#ef4444" strokeWidth={2} dot={false} name="Bounced" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="chart-header">
            <h3>Today's Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No data for today. Click "Sync from Brevo" to fetch events.
            </div>
          )}
        </div>
      </div>

      {/* Daily Volume Bar Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-header">
          <h3>Daily Email Volume</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
            <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
            <YAxis stroke={chartStyles.stroke} fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                background: chartStyles.tooltipBg, 
                border: `1px solid ${chartStyles.tooltipBorder}`,
                borderRadius: '12px',
                color: chartStyles.tooltipColor
              }}
            />
            <Legend />
            <Bar dataKey="sent" fill="#8b5cf6" name="Sent" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" fill="#22c55e" name="Delivered" radius={[4, 4, 0, 0]} />
            <Bar dataKey="bounced" fill="#ef4444" name="Bounced" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-grid">
        {/* Combination Chart */}
        <div className="card">
          <div className="chart-header">
            <h3><TrendingUp size={18} style={{ marginRight: '8px' }} /> Volume vs. Engagement</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
              <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
              <YAxis yAxisId="left" stroke={chartStyles.stroke} fontSize={12} label={{ value: 'Emails', angle: -90, position: 'insideLeft', fill: chartStyles.stroke }} />
              <YAxis yAxisId="right" orientation="right" stroke={chartStyles.stroke} fontSize={12} label={{ value: 'Rate %', angle: 90, position: 'insideRight', fill: chartStyles.stroke }} />
              <Tooltip 
                contentStyle={{ 
                  background: chartStyles.tooltipBg, 
                  border: `1px solid ${chartStyles.tooltipBorder}`,
                  borderRadius: '12px',
                  color: chartStyles.tooltipColor
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="sent" fill="#8b5cf6" fillOpacity={0.6} name="Volume (Sent)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="openRate" stroke="#3b82f6" strokeWidth={3} name="Open Rate %" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel */}
        <div className="card">
          <div className="chart-header">
            <h3><Binary size={18} style={{ marginRight: '8px' }} /> Conversion Funnel</h3>
          </div>
          <div style={{ padding: '10px' }}>
            {funnelData.map((item, idx) => {
               const percentage = item.value && funnelData[0].value ? ((item.value / funnelData[0].value) * 100).toFixed(1) : 0;
               return (
                <div key={item.name} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>{item.value} <small style={{ color: 'var(--text-muted)' }}>({percentage}%)</small></span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: item.fill, boxShadow: `0 0 10px ${item.fill}80` }}></div>
                  </div>
                </div>
               );
            })}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Overall Sent-to-Click Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>
                {funnelData[3].value && funnelData[0].value ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(2) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
