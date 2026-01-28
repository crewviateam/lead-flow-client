// components/StatCard.jsx
import { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import gsap from 'gsap';

export default function StatCard({ title, value, icon: Icon, color, trend, trendValue, delay = 0 }) {
  const cardRef = useRef(null);
  const valueRef = useRef(null);

  useEffect(() => {
    // Card entrance animation
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, delay: delay * 0.1, ease: 'power3.out' }
      );
    }

    // Value counter animation (for numbers)
    if (valueRef.current && typeof value === 'number') {
      gsap.fromTo(valueRef.current,
        { innerText: 0 },
        {
          innerText: value,
          duration: 1.5,
          delay: delay * 0.1 + 0.3,
          ease: 'power2.out',
          snap: { innerText: 1 },
          onUpdate: function() {
            if (valueRef.current) {
              valueRef.current.innerText = Math.round(this.targets()[0].innerText).toLocaleString();
            }
          }
        }
      );
    }
  }, [value, delay]);

  return (
    <div className="card stat-card" ref={cardRef}>
      <div className={`stat-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div className="stat-content">
        <h3 ref={valueRef}>
          {typeof value === 'number' ? '0' : value}
        </h3>
        <p>{title}</p>
        {trend && (
          <div className={`stat-trend ${trend}`} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            marginTop: '6px',
            fontSize: '0.8rem',
            color: trend === 'up' ? 'var(--success)' : 'var(--error)'
          }}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
