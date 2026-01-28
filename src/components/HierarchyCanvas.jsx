// components/HierarchyCanvas.jsx - Advanced Animated Visualization
import { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const COLORS = {
  initial: { primary: '#3b82f6', glow: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
  followup: { primary: '#a855f7', glow: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)' },
  manual: { primary: '#eab308', glow: '#facc15', bg: 'rgba(234, 179, 8, 0.15)' },
  conditional: { primary: '#06b6d4', glow: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)' },
  delivered: { primary: '#22c55e', glow: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' },
  opened: { primary: '#06b6d4', glow: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)' },
  clicked: { primary: '#8b5cf6', glow: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)' },
  failed: { primary: '#ef4444', glow: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
  pending: { primary: '#f97316', glow: '#fb923c', bg: 'rgba(249, 115, 22, 0.15)' },
  root: { primary: '#8b5cf6', glow: '#a78bfa', bg: 'rgba(139, 92, 246, 0.2)' }
};

class Particle {
  constructor(startX, startY, endX, endY, color) {
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.color = color;
    this.progress = Math.random();
    this.speed = 0.002 + Math.random() * 0.003;
    this.size = 2 + Math.random() * 2;
  }
  
  update() {
    this.progress += this.speed;
    if (this.progress > 1) this.progress = 0;
    
    // Bezier curve path
    const t = this.progress;
    const midX = (this.startX + this.endX) / 2;
    const midY = (this.startY + this.endY) / 2 - 30;
    
    this.x = (1-t)*(1-t)*this.startX + 2*(1-t)*t*midX + t*t*this.endX;
    this.y = (1-t)*(1-t)*this.startY + 2*(1-t)*t*midY + t*t*this.endY;
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export default function HierarchyCanvas({ data }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const { theme } = useTheme();
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [hoveredNode, setHoveredNode] = useState(null);
  const nodesRef = useRef([]);
  
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0a0a12' : '#f8fafc';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#64748b' : '#94a3b8';

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Draw connections with gradient
    drawConnections(ctx, rect.width, rect.height);
    
    // Draw particles
    particlesRef.current.forEach(p => {
      p.update();
      p.draw(ctx);
    });
    
    // Draw nodes
    drawNodes(ctx, rect.width, rect.height);
    
    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  }, [data, hoveredNode, theme]);
  
  const drawConnections = (ctx, width, height) => {
    if (!data) return;
    
    const centerX = width / 2;
    const rootY = 80;
    const branchY = 200;
    const bottomY = 340;
    
    const branches = [
      { x: centerX - width * 0.3, type: 'Initial', color: COLORS.initial },
      { x: centerX - width * 0.1, type: 'Followup', color: COLORS.followup },
      { x: centerX + width * 0.1, type: 'Manual', color: COLORS.manual },
      { x: centerX + width * 0.3, type: 'Conditional', color: COLORS.conditional }
    ];
    
    // Root to branches
    branches.forEach(branch => {
      const gradient = ctx.createLinearGradient(centerX, rootY + 50, branch.x, branchY - 40);
      gradient.addColorStop(0, COLORS.root.primary + '80');
      gradient.addColorStop(1, branch.color.primary + '80');
      
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      // Curved bezier path
      ctx.moveTo(centerX, rootY + 50);
      ctx.bezierCurveTo(
        centerX, rootY + 100,
        branch.x, branchY - 100,
        branch.x, branchY - 40
      );
      ctx.stroke();
      
      // Glow effect
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    
    // Branch to results (delivered, pending, failed)
    const resultTypes = [
      { offset: -80, color: COLORS.delivered, label: 'delivered' },
      { offset: 0, color: COLORS.pending, label: 'pending' },
      { offset: 80, color: COLORS.failed, label: 'failed' }
    ];
    
    const selectedBranchX = selectedBranch === 'all' ? centerX : 
      selectedBranch === 'initial' ? centerX - width * 0.3 :
      selectedBranch === 'followup' ? centerX - width * 0.1 :
      selectedBranch === 'conditional' ? centerX + width * 0.3 :
      centerX + width * 0.1;
    
    if (selectedBranch !== 'all') {
      const branchColor = COLORS[selectedBranch];
      
      resultTypes.forEach(result => {
        const endX = selectedBranchX + result.offset;
        const gradient = ctx.createLinearGradient(selectedBranchX, branchY + 40, endX, bottomY - 35);
        gradient.addColorStop(0, branchColor.primary + '80');
        gradient.addColorStop(1, result.color.primary + '80');
        
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(selectedBranchX, branchY + 40);
        ctx.bezierCurveTo(
          selectedBranchX, branchY + 80,
          endX, bottomY - 80,
          endX, bottomY - 35
        );
        ctx.stroke();
      });
    }
  };
  
  const drawNodes = (ctx, width, height) => {
    if (!data) return;
    
    nodesRef.current = [];
    const centerX = width / 2;
    const rootY = 80;
    const branchY = 200;
    const bottomY = 340;
    
    // Root node - Total Sent
    drawGlowNode(ctx, centerX, rootY, data.totals?.sent || 0, '📧 Total Sent', COLORS.root, 55, hoveredNode === 'root');
    nodesRef.current.push({ id: 'root', x: centerX, y: rootY, radius: 55 });
    
    const branches = [
      { x: centerX - width * 0.3, type: 'Initial', id: 'initial', icon: '📤' },
      { x: centerX - width * 0.1, type: 'Followup', id: 'followup', icon: '🔄' },
      { x: centerX + width * 0.1, type: 'Manual', id: 'manual', icon: '✉️' },
      { x: centerX + width * 0.3, type: 'Conditional', id: 'conditional', icon: '⚡' }
    ];
    
    branches.forEach(branch => {
      const branchData = data.byType?.[branch.type] || {};
      const count = branchData.sent || 0;
      const pct = data.totals?.sent > 0 ? ((count / data.totals.sent) * 100).toFixed(0) : '0';
      const isSelected = selectedBranch === branch.id || selectedBranch === 'all';
      const alpha = isSelected ? 1 : 0.4;
      
      ctx.globalAlpha = alpha;
      drawGlowNode(ctx, branch.x, branchY, count, `${branch.icon} ${branch.type} (${pct}%)`, COLORS[branch.id], 42, hoveredNode === branch.id);
      ctx.globalAlpha = 1;
      
      nodesRef.current.push({ id: branch.id, x: branch.x, y: branchY, radius: 42 });
    });
    
    // Result nodes (only show when a branch is selected)
    if (selectedBranch !== 'all') {
      const branchKey = selectedBranch.charAt(0).toUpperCase() + selectedBranch.slice(1);
      const branchData = data.byType?.[branchKey] || {};
      const selectedBranchX = selectedBranch === 'initial' ? centerX - width * 0.3 :
        selectedBranch === 'followup' ? centerX - width * 0.1 :
        selectedBranch === 'conditional' ? centerX + width * 0.3 : centerX + width * 0.1;
      
      const results = [
        { offset: -80, color: COLORS.delivered, value: branchData.delivered || 0, label: '✅ Delivered', id: 'delivered' },
        { offset: 0, color: COLORS.pending, value: branchData.pendingReschedule || 0, label: '⏳ Pending', id: 'pending' },
        { offset: 80, color: COLORS.failed, value: branchData.failed || 0, label: '❌ Failed', id: 'failed' }
      ];
      
      results.forEach(result => {
        const x = selectedBranchX + result.offset;
        const pct = branchData.sent > 0 ? ((result.value / branchData.sent) * 100).toFixed(0) : '0';
        drawGlowNode(ctx, x, bottomY, result.value, `${result.label} (${pct}%)`, result.color, 35, hoveredNode === result.id);
        nodesRef.current.push({ id: result.id, x, y: bottomY, radius: 35 });
      });
    }
  };
  
  const drawGlowNode = (ctx, x, y, value, label, colorSet, radius, isHovered) => {
    const scale = isHovered ? 1.08 : 1;
    const r = radius * scale;
    
    // Outer glow rings
    for (let i = 3; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(x, y, r + i * 4, 0, Math.PI * 2);
      ctx.fillStyle = colorSet.primary + (isHovered ? '15' : '08');
      ctx.fill();
    }
    
    // Main circle with gradient
    const gradient = ctx.createRadialGradient(x - r/3, y - r/3, 0, x, y, r);
    gradient.addColorStop(0, colorSet.glow + '40');
    gradient.addColorStop(0.7, colorSet.bg);
    gradient.addColorStop(1, colorSet.primary + '30');
    
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border with glow
    ctx.strokeStyle = colorSet.primary;
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.shadowColor = colorSet.glow;
    ctx.shadowBlur = isHovered ? 20 : 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Value
    ctx.fillStyle = textColor;
    ctx.font = `bold ${r > 45 ? 22 : r > 35 ? 18 : 14}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), x, y - 2);
    
    // Label below
    ctx.fillStyle = mutedColor;
    ctx.font = `${r > 45 ? 10 : 8}px Inter, system-ui, sans-serif`;
    ctx.fillText(label, x, y + r + 12);
  };
  
  // Initialize particles
  useEffect(() => {
    if (!data) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const centerX = width / 2;
    const rootY = 80;
    const branchY = 200;
    
    particlesRef.current = [];
    
    const branches = [
      { x: centerX - width * 0.3, color: COLORS.initial.glow },
      { x: centerX - width * 0.1, color: COLORS.followup.glow },
      { x: centerX + width * 0.1, color: COLORS.manual.glow },
      { x: centerX + width * 0.3, color: COLORS.conditional.glow }
    ];
    
    branches.forEach(branch => {
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push(new Particle(
          centerX, rootY + 50,
          branch.x, branchY - 40,
          branch.color
        ));
      }
    });
    
  }, [data]);
  
  // Setup canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    animate();
    
    return () => {
      window.removeEventListener('resize', setupCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  // Mouse interaction
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let found = null;
    for (const node of nodesRef.current) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx*dx + dy*dy) < node.radius + 10) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  };
  
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (const node of nodesRef.current) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx*dx + dy*dy) < node.radius + 10) {
        if (['initial', 'followup', 'manual', 'conditional'].includes(node.id)) {
          setSelectedBranch(node.id === selectedBranch ? 'all' : node.id);
        } else if (node.id === 'root') {
          setSelectedBranch('all');
        }
        break;
      }
    }
  };
  
  // Get detailed stats for selected branch
  const branchKey = selectedBranch === 'all' ? null : selectedBranch.charAt(0).toUpperCase() + selectedBranch.slice(1);
  const branchData = branchKey ? (data?.byType?.[branchKey] || {}) : data?.totals || {};
  console.log("data", data);
  
  
  const total = branchData.sent || 0;
  const totalDelivered = branchData.delivered || 0;

  const calcPct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
  const calcPct2 = (v) => totalDelivered > 0 ? ((v / totalDelivered) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Animated Canvas */}
      <canvas 
        ref={canvasRef} 
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ 
          width: '100%', 
          height: '420px',
          borderRadius: '16px',
          background: isDark ? 'linear-gradient(145deg, #0a0a12, #12121a)' : 'linear-gradient(145deg, #f8fafc, #f1f5f9)'
        }} 
      />
      
      {/* Branch Quick Select */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center', 
        margin: '1.5rem 0',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'all', label: '🌐 All', color: COLORS.root },
          { id: 'initial', label: '📤 Initial', color: COLORS.initial },
          { id: 'followup', label: '🔄 Follow-up', color: COLORS.followup },
          { id: 'manual', label: '✉️ Manual', color: COLORS.manual },
          { id: 'conditional', label: '⚡ Conditional', color: COLORS.conditional }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setSelectedBranch(btn.id)}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: selectedBranch === btn.id ? `2px solid ${btn.color.primary}` : '1px solid var(--border-color)',
              background: selectedBranch === btn.id 
                ? `linear-gradient(135deg, ${btn.color.bg}, ${btn.color.primary}20)` 
                : 'var(--bg-glass)',
              color: selectedBranch === btn.id ? btn.color.primary : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: selectedBranch === btn.id ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: selectedBranch === btn.id ? `0 4px 20px ${btn.color.primary}40` : 'none',
              transform: selectedBranch === btn.id ? 'translateY(-2px)' : 'none'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Detailed Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '1rem',
        marginTop: '1rem'
      }}>
        {/* Sent */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.root.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.root.primary}30`,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.root.primary, textShadow: `0 0 20px ${COLORS.root.glow}40` }}>
            {total}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Sent
          </div>
        </div>
        
        {/* Delivered */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.delivered.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.delivered.primary}30`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.delivered.primary }}>
            {branchData.delivered || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Delivered ({calcPct(branchData.delivered)}%)
          </div>
        </div>
        
        {/* Opened */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.opened.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.opened.primary}30`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.opened.primary }}>
            {branchData.opened || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Opened ({calcPct2(branchData.opened)}%)
          </div>
        </div>
        
        {/* Clicked */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.clicked.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.clicked.primary}30`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.clicked.primary }}>
            {branchData.clicked || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Clicked ({calcPct2(branchData.clicked)}%)
          </div>
        </div>
        
        {/* Pending Reschedule */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.pending.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.pending.primary}30`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.pending.primary }}>
            {branchData.pendingReschedule || branchData.softBounce || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Pending ({calcPct(branchData.pendingReschedule)}%)
          </div>
        </div>
        
        {/* Failed */}
        <div className="hierarchy-stat-card" style={{ 
          padding: '1.25rem', 
          background: `linear-gradient(135deg, ${COLORS.failed.bg}, transparent)`,
          borderRadius: '16px', 
          border: `1px solid ${COLORS.failed.primary}30`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.failed.primary }}>
            {branchData.failed || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Failed ({calcPct(branchData.failed)}%)
          </div>
        </div>
      </div>
      
      {/* Sub-details Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginTop: '1rem',
        padding: '1rem',
        background: 'var(--bg-glass)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Engagement */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            📊 Engagement Breakdown
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <div>
              <span style={{ color: COLORS.opened.primary, fontWeight: 600 }}>👁 {branchData.opened || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Opened</div>
            </div>
            <div>
              <span style={{ color: COLORS.clicked.primary, fontWeight: 600 }}>🖱 {branchData.clicked || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Clicked</div>
            </div>
          </div>
        </div>
        
        {/* Bounce Details */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            📤 Bounce Types
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <div>
              <span style={{ color: COLORS.pending.primary, fontWeight: 600 }}>📤 {branchData.softBounce || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Soft</div>
            </div>
            <div>
              <span style={{ color: COLORS.failed.primary, fontWeight: 600 }}>💔 {branchData.hardBounce || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hard</div>
            </div>
          </div>
        </div>
        
        {/* Failure Details */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            🚫 Failure Types
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <div>
              <span style={{ color: '#f87171', fontWeight: 600 }}>🚫 {branchData.blocked || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Blocked</div>
            </div>
            <div>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>🗑 {branchData.spam || 0}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Spam</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Accuracy Note */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1rem', 
        background: `linear-gradient(135deg, ${COLORS.delivered.bg}, transparent)`, 
        borderRadius: '12px',
        borderLeft: `4px solid ${COLORS.delivered.primary}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.5rem' }}>✨</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.delivered.primary }}>
            Accurate Real-Time Analytics
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Counts unique email journeys only. Rescheduled duplicates are excluded. Click nodes to drill down.
          </div>
        </div>
      </div>
    </div>
  );
}
