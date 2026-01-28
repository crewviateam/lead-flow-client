// pages/Dashboard.jsx
// Dashboard with TanStack Query for optimized data fetching
import { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Mail, CheckCircle, XCircle, MousePointer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import gsap from 'gsap';
import StatCard from '../components/StatCard';
import DateRangeSelector from '../components/DateRangeSelector';
import { useDashboardStats, useAnalyticsSummary } from '../hooks/useApi';

const COLORS = ['#7c3aed', '#22c55e', '#eab308', '#ef4444', '#a855f7'];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const chartsRef = useRef(null);

  // Calculate dates for custom range
  const dates = useMemo(() => {
    if (dateRange === 'custom') {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : null,
        endDate: customEnd ? new Date(customEnd).toISOString() : new Date().toISOString(),
        period: undefined
      };
    }
    return { period: dateRange, startDate: undefined, endDate: undefined };
  }, [dateRange, customStart, customEnd]);

  // TanStack Query hooks - data is cached and deduplicated automatically
  const { 
    data: analytics, 
    isLoading: analyticsLoading 
  } = useAnalyticsSummary(dates.period, dates.startDate, dates.endDate);
  
  const { 
    data: dashboardStats, 
    isLoading: statsLoading,
    refetch 
  } = useDashboardStats(dates.period, dates.startDate, dates.endDate);

  const loading = analyticsLoading || statsLoading;
  const emailStats = dashboardStats;
  const leadStats = dashboardStats;

  // Animate charts when data loads
  useEffect(() => {
    if (!loading && chartsRef.current) {
      gsap.fromTo(chartsRef.current.children,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
      );
    }
  }, [loading]);

  // Memoize processed data to avoid recalculation on every render
  const summary = useMemo(() => analytics?.summary || {}, [analytics]);
  
  const dailyData = useMemo(() => {
    return summary.dailyBreakdown?.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sent: d.emailsSent || 0,
      delivered: d.emailsDelivered || 0,
      opened: d.emailsOpened || 0,
      clicked: d.emailsClicked || 0,
    })).reverse() || [];
  }, [summary.dailyBreakdown]);

  const emailStatusData = useMemo(() => {
    return emailStats?.emailJobs 
      ? Object.entries(emailStats.emailJobs).map(([name, value]) => ({ name, value })) 
      : [];
  }, [emailStats?.emailJobs]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h2>Dashboard Overview</h2>
        <DateRangeSelector 
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          showCustom={showCustom}
          setShowCustom={setShowCustom}
          onRefresh={refetch}
          loading={loading}
        />
      </div>

      {/* Stats Grid with staggered animations */}
      <div className="stats-grid">
        <StatCard 
          title="Total Leads" 
          value={summary.totalLeads || 0} 
          icon={Users} 
          color="blue"
          delay={0}
        />
        <StatCard 
          title="Emails Sent" 
          value={summary.emailsSent || 0} 
          icon={Mail} 
          color="purple"
          delay={1}
        />
        <StatCard 
          title="Delivered" 
          value={summary.emailsDelivered || 0} 
          icon={CheckCircle} 
          color="green"
          delay={2}
        />
        <StatCard 
          title="Converted" 
          value={leadStats?.convertedCount || 0} 
          icon={CheckCircle} 
          color="green"
          delay={3}
        />
        <StatCard 
          title="Frozen" 
          value={leadStats?.frozenCount || 0} 
          icon={XCircle} 
          color="blue"
          delay={4}
        />
        <StatCard 
          title="Click Rate" 
          value={`${(summary?.clickRate || 0)}%`} 
          icon={MousePointer} 
          color="purple"
          delay={5}
        />
      </div>

      {/* Main Content Area: Charts + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Charts Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} ref={chartsRef}>
          <div className="card" style={{ opacity: 0 }}>
            <div className="chart-header">
              <h3>Email Performance Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#5a5a70" fontSize={12} />
                <YAxis stroke="#5a5a70" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#12121a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                  }}
                />
                <Area type="monotone" dataKey="sent" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ opacity: 0 }}>
            <div className="chart-header">
              <h3>Email Status</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={emailStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {emailStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#12121a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pillar 3: Live Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="chart-header">
                <h3>Live Feed</h3>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '1rem', overflowY: 'auto', maxHeight: '600px', paddingRight: '10px' }}>
                {emailStats?.recentActivity?.length > 0 ? (
                    emailStats.recentActivity.map((activity, idx) => (
                        <div key={idx} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{activity.leadName}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <span className={`status-badge ${activity.status}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{activity.status}</span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.type}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' }}>
                        Waiting for new activity...
                    </div>
                )}
            </div>
            <button className="btn" style={{ marginTop: 'auto', background: 'var(--bg-hover)', border: 'none', fontSize: '0.8rem' }} onClick={refetch}>
                View All Events
            </button>
        </div>
      </div>

      {/* Lead Stats Table */}
      <div className="card">
        <div className="chart-header">
          <h3>Lead Status Breakdown</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {leadStats?.leads && Object.entries(leadStats.leads).map(([status, count]) => (
                <tr key={status}>
                  <td>
                    <span className={`status-badge ${status}`}>{status === 'pending' ? 'INITIAL: SCHEDULED' : status}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{count}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {((count / leadStats.total) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
