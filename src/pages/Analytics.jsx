// pages/Analytics.jsx
// Enhanced Analytics Dashboard with Advanced Features
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Calendar, CheckCircle, Eye, XCircle, 
  AlertTriangle, Clock, MousePointer, Mail, ShieldAlert, BarChart3, Binary,
  Zap, Target, Award, ArrowUpRight, ArrowDownRight, Sparkles, Filter,
  Download, Maximize2, ChevronDown, Activity, PieChart as PieIcon,
  Layers, GitBranch, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Area, AreaChart,
  RadialBarChart, RadialBar
} from 'recharts';
import gsap from 'gsap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheConfig } from '../lib/queryClient';
import DateRangeSelector from '../components/DateRangeSelector';
import HierarchyCanvas from '../components/HierarchyCanvas';
import { getAnalyticsSummary, syncAnalytics, getAnalyticsBreakdown, getHierarchicalAnalytics } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import './Analytics.css';

const COLORS = {
  purple: '#8b5cf6',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  cyan: '#06b6d4',
  pink: '#ec4899',
  gray: '#6b7280',
};

export default function Analytics({ showToast }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedChart, setExpandedChart] = useState(null);
  const [showInsights, setShowInsights] = useState(true);
  const statsRef = useRef(null);
  const pageRef = useRef(null);

  // Chart color scheme based on theme
  const chartStyles = useMemo(() => ({
    stroke: theme === "dark" ? "#5a5a70" : "#94a3b8",
    tooltipBg: theme === "dark" ? "#1a1a2e" : "#ffffff",
    tooltipBorder: theme === "dark" ? "rgba(139, 92, 246, 0.3)" : "rgba(0,0,0,0.1)",
    tooltipColor: theme === "dark" ? "#fff" : "#1e293b",
    gridStroke: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  }), [theme]);

  // Query parameters
  const queryParams = useMemo(() => {
    if (dateRange === "custom") {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : null,
        endDate: customEnd ? new Date(customEnd).toISOString() : new Date().toISOString(),
        period: undefined,
      };
    }
    return { period: dateRange, startDate: undefined, endDate: undefined };
  }, [dateRange, customStart, customEnd]);

  // Data fetching
  const { data: analytics, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["analytics", "summary", queryParams],
    queryFn: () => getAnalyticsSummary(queryParams.startDate, queryParams.endDate, queryParams.period),
    ...cacheConfig.standard,
  });

  const { data: breakdown } = useQuery({
    queryKey: ["analytics", "breakdown", queryParams.period || "24h"],
    queryFn: () => getAnalyticsBreakdown(queryParams.period || "24h"),
    ...cacheConfig.standard,
  });

  const { data: hierarchy } = useQuery({
    queryKey: ["analytics", "hierarchy", queryParams.period || "7d"],
    queryFn: () => getHierarchicalAnalytics(queryParams.period || "7d"),
    ...cacheConfig.standard,
  });

  const loading = summaryLoading;

  // Refresh handler
  const loadAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    refetchSummary();
  }, [queryClient, refetchSummary]);

  // Animate on load
  useEffect(() => {
    if (!loading && pageRef.current) {
      gsap.fromTo(
        pageRef.current.querySelectorAll('.animate-in'),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" }
      );
    }
  }, [loading]);

  // Sync handler
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncAnalytics();
      showToast?.(`Synced ${result.updated} events from Brevo`, "success");
      loadAnalytics();
    } catch (error) {
      showToast?.("Sync failed: " + error.message, "error");
    } finally {
      setSyncing(false);
    }
  }, [showToast, loadAnalytics]);

  // Memoized data
  const summary = useMemo(() => analytics?.summary || {}, [analytics]);
  const bd = useMemo(() => breakdown?.breakdown || {}, [breakdown]);
  const rates = useMemo(() => breakdown?.rates || {}, [breakdown]);
  
  const fd = useMemo(() => breakdown?.failedData || {
    total: 0, hardBounce: 0, blocked: 0, spam: 0, error: 0, invalid: 0
  }, [breakdown]);
  
  const rd = useMemo(() => breakdown?.rescheduledData || { total: 0, softBounce: 0, deferred: 0 }, [breakdown]);
  
  const td = useMemo(() => breakdown?.terminalData || {
    total: 0, unsubscribed: 0, complaint: 0, dead: 0
  }, [breakdown]);
  
  const pd = useMemo(() => {
    const pending = breakdown?.pendingData || {};
    return {
      total: pending.total || bd.pending || 0,
      initial: pending.initial || 0,
      followup: pending.followup || 0,
      manual: pending.manual || 0,
      conditional: pending.conditional || 0,
    };
  }, [breakdown, bd.pending]);

  // Daily data for charts
  const dailyData = useMemo(() => {
    return (summary.dailyBreakdown?.map((d) => {
      const isHourly = d.date.includes(" ");
      const dateLabel = isHourly
        ? new Date(d.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const sent = d.emailsSent || 0;
      const delivered = d.emailsDelivered || 0;
      const opened = d.emailsOpened || 0;
      const clicked = d.emailsClicked || 0;
      const bounced = d.emailsBounced || 0;

      return {
        date: dateLabel,
        fullDate: d.date,
        sent, delivered, opened, clicked, bounced,
        openRate: sent > 0 ? parseFloat(((opened / sent) * 100).toFixed(1)) : 0,
        clickRate: sent > 0 ? parseFloat(((clicked / sent) * 100).toFixed(1)) : 0,
      };
    }).reverse() || []);
  }, [summary.dailyBreakdown]);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    const deliveryWeight = 0.3;
    const openWeight = 0.4;
    const clickWeight = 0.3;
    
    const deliveryScore = Math.min((rates.deliveryRate || 0) / 95 * 100, 100);
    const openScore = Math.min((rates.openRate || 0) / 25 * 100, 100);
    const clickScore = Math.min((rates.clickRate || 0) / 5 * 100, 100);
    
    const score = Math.round(
      deliveryScore * deliveryWeight + 
      openScore * openWeight + 
      clickScore * clickWeight
    );
    
    return {
      score,
      grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D',
      color: score >= 80 ? COLORS.green : score >= 60 ? COLORS.yellow : COLORS.red,
    };
  }, [rates]);

  // Insights generation
  const insights = useMemo(() => {
    const items = [];
    
    if (rates.openRate > 25) {
      items.push({ type: 'success', icon: '🎯', text: `Excellent open rate of ${rates.openRate}%! Your subject lines are working well.` });
    } else if (rates.openRate < 15 && bd.sent > 10) {
      items.push({ type: 'warning', icon: '💡', text: `Open rate at ${rates.openRate}%. Consider A/B testing subject lines.` });
    }
    
    if (rates.bounceRate > 5) {
      items.push({ type: 'error', icon: '⚠️', text: `High bounce rate of ${rates.bounceRate}%. Review your email list quality.` });
    }
    
    if (fd.spam > 0) {
      items.push({ type: 'error', icon: '🚨', text: `${fd.spam} emails marked as spam. Review content and sender reputation.` });
    }
    
    if (pd.total > 50) {
      items.push({ type: 'info', icon: '📬', text: `${pd.total} emails pending. System is actively processing your queue.` });
    }
    
    if (bd.clicked > 0 && bd.opened > 0) {
      const ctr = ((bd.clicked / bd.opened) * 100).toFixed(1);
      if (parseFloat(ctr) > 10) {
        items.push({ type: 'success', icon: '🔥', text: `Strong click-to-open rate of ${ctr}%! Your CTAs are effective.` });
      }
    }
    
    return items.slice(0, 4);
  }, [rates, bd, fd, pd]);

  // Chart data
  const funnelData = useMemo(() => [
    { name: "Sent", value: bd.sent || 0, fill: COLORS.purple },
    { name: "Delivered", value: bd.delivered || 0, fill: COLORS.green },
    { name: "Opened", value: bd.opened || 0, fill: COLORS.blue },
    { name: "Clicked", value: bd.clicked || 0, fill: COLORS.yellow },
  ], [bd]);

  const pieData = useMemo(() => [
    { name: "Delivered", value: bd.delivered || 0, color: COLORS.green },
    { name: "Opened", value: bd.opened || 0, color: COLORS.blue },
    { name: "Clicked", value: bd.clicked || 0, color: COLORS.purple },
    { name: "Soft Bounce", value: bd.softBounced || 0, color: COLORS.yellow },
    { name: "Hard Bounce", value: bd.hardBounced || 0, color: COLORS.red },
    { name: "Deferred", value: bd.deferred || 0, color: COLORS.orange },
  ].filter((d) => d.value > 0), [bd]);

  const radialData = useMemo(() => [
    { name: 'Delivery', value: rates.deliveryRate || 0, fill: COLORS.green },
    { name: 'Open', value: rates.openRate || 0, fill: COLORS.blue },
    { name: 'Click', value: rates.clickRate || 0, fill: COLORS.purple },
  ], [rates]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="analytics-tooltip">
        <div className="tooltip-label">{label}</div>
        {payload.map((entry, idx) => (
          <div key={idx} className="tooltip-item" style={{ color: entry.color }}>
            <span className="tooltip-dot" style={{ background: entry.color }}></span>
            <span>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="analytics-page" ref={pageRef}>
      {/* Enhanced Header */}
      <header className="analytics-header animate-in">
        <div className="header-left">
          <div className="header-title">
            <BarChart3 size={32} className="header-icon" />
            <div>
              <h1>Analytics Dashboard</h1>
              <p className="header-subtitle">
                Real-time email performance insights • Last synced: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
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
          
          <button className="btn-sync" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Sync Brevo</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="analytics-tabs animate-in">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={18} />
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "hierarchy" ? "active" : ""}`}
          onClick={() => setActiveTab("hierarchy")}
        >
          <GitBranch size={18} />
          <span>Flow Hierarchy</span>
        </button>
      </nav>

      {/* Hierarchy Tab */}
      {activeTab === "hierarchy" && hierarchy && (
        <div className="card hierarchy-card animate-in">
          <div className="card-header">
            <h3><GitBranch size={20} /> Email Flow Hierarchy</h3>
          </div>
          <HierarchyCanvas data={hierarchy} />
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Performance Score + Key Metrics */}
          <div className="metrics-hero animate-in">
            {/* Performance Score */}
            <div className="performance-card">
              <div className="score-circle" style={{ borderColor: performanceScore.color }}>
                <span className="score-grade" style={{ color: performanceScore.color }}>
                  {performanceScore.grade}
                </span>
                <span className="score-label">Score</span>
              </div>
              <div className="score-details">
                <h3>Performance Score</h3>
                <p className="score-value">{performanceScore.score}/100</p>
                <p className="score-desc">Based on delivery, open & click rates</p>
              </div>
            </div>

            {/* Key Rate Cards */}
            <div className="rate-card delivery">
              <div className="rate-icon"><CheckCircle size={24} /></div>
              <div className="rate-content">
                <span className="rate-value">{rates.deliveryRate || 0}%</span>
                <span className="rate-label">Delivery Rate</span>
              </div>
              <div className="rate-trend up">
                <ArrowUpRight size={16} />
              </div>
            </div>

            <div className="rate-card opens">
              <div className="rate-icon"><Eye size={24} /></div>
              <div className="rate-content">
                <span className="rate-value">{rates.openRate || 0}%</span>
                <span className="rate-label">Open Rate</span>
              </div>
              <div className={`rate-trend ${(rates.openRate || 0) >= 20 ? 'up' : 'down'}`}>
                {(rates.openRate || 0) >= 20 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>

            <div className="rate-card clicks">
              <div className="rate-icon"><MousePointer size={24} /></div>
              <div className="rate-content">
                <span className="rate-value">{rates.clickRate || 0}%</span>
                <span className="rate-label">Click Rate</span>
              </div>
              <div className={`rate-trend ${(rates.clickRate || 0) >= 3 ? 'up' : 'neutral'}`}>
                {(rates.clickRate || 0) >= 3 ? <ArrowUpRight size={16} /> : <Activity size={16} />}
              </div>
            </div>

            <div className="rate-card bounces">
              <div className="rate-icon"><AlertTriangle size={24} /></div>
              <div className="rate-content">
                <span className="rate-value">{rates.bounceRate || 0}%</span>
                <span className="rate-label">Bounce Rate</span>
              </div>
              <div className={`rate-trend ${(rates.bounceRate || 0) <= 2 ? 'up' : 'down'}`}>
                {(rates.bounceRate || 0) <= 2 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>
          </div>

          {/* AI Insights Panel */}
          {showInsights && insights.length > 0 && (
            <div className="insights-panel animate-in">
              <div className="insights-header">
                <Sparkles size={20} />
                <span>Smart Insights</span>
                <button className="insights-close" onClick={() => setShowInsights(false)}>×</button>
              </div>
              <div className="insights-grid">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`insight-card ${insight.type}`}>
                    <span className="insight-icon">{insight.icon}</span>
                    <span className="insight-text">{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Breakdown - Clean Row Design */}
          <div className="breakdown-section animate-in">
            <h2 className="section-title">
              <Layers size={20} />
              Detailed Breakdown
            </h2>
            
            <div className="breakdown-row" ref={statsRef}>
              {/* Sent */}
              <div className="breakdown-card">
                <div className="bc-main purple">
                  <Mail size={20} />
                  <span className="bc-value">{bd.sent || 0}</span>
                  <span className="bc-label">Sent</span>
                </div>
                <div className="bc-sub">
                  <span><strong style={{color:'#22c55e'}}>{bd.delivered || 0}</strong> delivered</span>
                  <span><strong style={{color:'#3b82f6'}}>{bd.opened || 0}</strong> opened</span>
                  <span><strong style={{color:'#a855f7'}}>{bd.clicked || 0}</strong> clicked</span>
                </div>
              </div>

              {/* Failed */}
              <div className="breakdown-card">
                <div className="bc-main red">
                  <ShieldAlert size={20} />
                  <span className="bc-value">{fd.total || 0}</span>
                  <span className="bc-label">Failed</span>
                </div>
                <div className="bc-sub">
                  <span><strong style={{color:'#ef4444'}}>{fd.hardBounce || 0}</strong> hard</span>
                  <span><strong style={{color:'#ef4444'}}>{fd.blocked || 0}</strong> blocked</span>
                  <span><strong style={{color:'#ef4444'}}>{fd.spam || 0}</strong> spam</span>
                  <span><strong style={{color:'#ef4444'}}>{fd.error || 0}</strong> error</span>
                  <span><strong style={{color:'#ef4444'}}>{fd.invalid || 0}</strong> invalid</span>
                </div>
              </div>

              {/* Rescheduled */}
              <div className="breakdown-card">
                <div className="bc-main orange">
                  <RefreshCw size={20} />
                  <span className="bc-value">{rd.total || 0}</span>
                  <span className="bc-label">Retry</span>
                </div>
                <div className="bc-sub">
                  <span><strong>{rd.softBounce || 0}</strong> soft bounce</span>
                  <span><strong>{rd.deferred || 0}</strong> deferred</span>
                </div>
              </div>

              {/* Terminal */}
              <div className="breakdown-card">
                <div className="bc-main gray">
                  <XCircle size={20} />
                  <span className="bc-value">{td.total || 0}</span>
                  <span className="bc-label">Terminal</span>
                </div>
                <div className="bc-sub">
                  <span><strong style={{color:'#9ca3af'}}>{td.unsubscribed || 0}</strong> unsub</span>
                  <span><strong style={{color:'#9ca3af'}}>{td.complaint || 0}</strong> complaint</span>
                  <span><strong style={{color:'#9ca3af'}}>{td.dead || 0}</strong> dead</span>
                </div>
              </div>

              {/* Pending */}
              <div className="breakdown-card">
                <div className="bc-main blue">
                  <Clock size={20} />
                  <span className="bc-value">{pd.total || 0}</span>
                  <span className="bc-label">Pending</span>
                </div>
                <div className="bc-sub">
                  <span><strong style={{color:'#3b82f6'}}>{pd.initial || 0}</strong> initial</span>
                  <span><strong style={{color:'#3b82f6'}}>{pd.followup || 0}</strong> followup</span>
                  <span><strong style={{color:'#3b82f6'}}>{pd.manual || 0}</strong> manual</span>
                  <span><strong style={{color:'#3b82f6'}}>{pd.conditional || 0}</strong> conditional</span>
                </div>
              </div>
            </div>
          </div>

          

          {/* Charts Section */}
          <div className="charts-section animate-in">
            <h2 className="section-title">
              <Activity size={20} />
              Performance Trends
            </h2>

            <div className="charts-grid">
              {/* Main Trend Chart */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3><TrendingUp size={18} /> Email Performance Over Time</h3>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
                    <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
                    <YAxis stroke={chartStyles.stroke} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="sent" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorSent)" name="Sent" strokeWidth={2} />
                    <Area type="monotone" dataKey="opened" stroke={COLORS.blue} fillOpacity={1} fill="url(#colorOpened)" name="Opened" strokeWidth={2} />
                    <Line type="monotone" dataKey="clicked" stroke={COLORS.yellow} strokeWidth={2} dot={false} name="Clicked" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Distribution Pie */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3><PieIcon size={18} /> Status Distribution</h3>
                </div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <Info size={32} />
                    <p>No data available. Sync from Brevo to see distribution.</p>
                  </div>
                )}
              </div>

              {/* Funnel Chart */}
              <div className="chart-card funnel-card">
                <div className="chart-header">
                  <h3><Target size={18} /> Conversion Funnel</h3>
                </div>
                <div className="funnel-content">
                  {funnelData.map((item, idx) => {
                    const percentage = item.value && funnelData[0].value
                      ? ((item.value / funnelData[0].value) * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={item.name} className="funnel-step">
                        <div className="funnel-info">
                          <span className="funnel-name">{item.name}</span>
                          <span className="funnel-stats">
                            <strong>{item.value}</strong>
                            <small>({percentage}%)</small>
                          </span>
                        </div>
                        <div className="funnel-bar-wrap">
                          <div 
                            className="funnel-bar" 
                            style={{ width: `${percentage}%`, background: item.fill }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="funnel-summary">
                    <div className="funnel-conversion">
                      <span className="conversion-label">Sent → Click Rate</span>
                      <span className="conversion-value" style={{ color: COLORS.yellow }}>
                        {funnelData[3].value && funnelData[0].value
                          ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(2)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volume Bar Chart */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3><BarChart3 size={18} /> Daily Email Volume</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
                    <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
                    <YAxis stroke={chartStyles.stroke} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="sent" fill={COLORS.purple} name="Sent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" fill={COLORS.green} name="Delivered" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bounced" fill={COLORS.red} name="Bounced" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              

              {/* Engagement Combo Chart */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3><Zap size={18} /> Volume vs Engagement</h3>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridStroke} />
                    <XAxis dataKey="date" stroke={chartStyles.stroke} fontSize={12} />
                    <YAxis yAxisId="left" stroke={chartStyles.stroke} fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartStyles.stroke} fontSize={12} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sent" fill={COLORS.purple} fillOpacity={0.6} name="Volume" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="openRate" stroke={COLORS.blue} strokeWidth={3} name="Open Rate %" dot={{ r: 4, fill: COLORS.blue }} />
                    <Line yAxisId="right" type="monotone" dataKey="clickRate" stroke={COLORS.yellow} strokeWidth={3} name="Click Rate %" dot={{ r: 4, fill: COLORS.yellow }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
