import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, Calendar as CalendarIcon, Loader2, Users, Mail, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getEmailJobs, getSettings } from '../services/api';

const CalendarSlotPicker = ({ onSelectSlot, onCancel }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slotInterval, setSlotInterval] = useState(30);
  const [settings, setSettings] = useState(null);
  
  // Rate limit settings from backend
  const emailsPerWindow = settings?.rateLimit?.emailsPerWindow || 2;
  const windowMinutes = settings?.rateLimit?.windowMinutes || 15;

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        // Use window minutes as default slot interval
        if (s?.rateLimit?.windowMinutes) {
          setSlotInterval(s.rateLimit.windowMinutes);
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);

  // Fetch jobs for current month
  useEffect(() => {
    const fetchMonthJobs = async () => {
      setLoading(true);
      try {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const { jobs } = await getEmailJobs(1, 1000, '', '', start.toISOString(), end.toISOString());
        setScheduledJobs(jobs || []);
      } catch (err) {
        console.error('Failed to fetch calendar jobs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMonthJobs();
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get pending jobs only
  const getPendingJobs = (jobs) => {
    const pendingStatuses = ['pending', 'queued', 'scheduled', 'rescheduled'];
    return jobs.filter(j => pendingStatuses.includes(j.status));
  };

  // Calculate day load indicator
  const getDayLoadInfo = (dayNum) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const daysJobs = getPendingJobs(scheduledJobs).filter(j => {
      if (!j.scheduledFor) return false;
      const jd = new Date(j.scheduledFor);
      return jd.getDate() === dayNum && jd.getMonth() === currentDate.getMonth();
    });
    
    const count = daysJobs.length;
    // Estimate capacity: 18 hours * (60/windowMinutes) * emailsPerWindow
    const slotsPerDay = Math.floor(18 * (60 / windowMinutes));
    const capacity = slotsPerDay * emailsPerWindow;
    const loadPercent = Math.min((count / capacity) * 100, 100);
    
    return { count, capacity, loadPercent };
  };

  const renderCalendar = () => {
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      grid.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let d = 1; d <= days; d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const isSelected = selectedDate.toDateString() === date.toDateString();
      const isToday = today.getTime() === date.getTime();
      const isPast = date < today;
      const { count, loadPercent } = getDayLoadInfo(d);

      grid.push(
        <div
          key={d}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
          onClick={() => !isPast && setSelectedDate(date)}
        >
          <span className="day-number">{d}</span>
          {count > 0 && (
            <div className="day-load-indicator">
              <div
                className="load-fill"
                style={{
                  width: `${loadPercent}%`,
                  background: loadPercent >= 80 ? '#ef4444' : loadPercent >= 50 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
          )}
          {count > 0 && <span className="day-count">{count}</span>}
        </div>
      );
    }

    return grid;
  };

  // Generate time slots with capacity info
  const generateSlotsWithCapacity = () => {
    const slots = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const pendingJobs = getPendingJobs(scheduledJobs).filter(j => {
      if (!j.scheduledFor) return false;
      return new Date(j.scheduledFor).toDateString() === selectedDate.toDateString();
    });

    // Start from 6am to 11pm (business-ish hours)
    for (let hour = 6; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        let isPastTime = false;
        if (isToday) {
          const slotDate = new Date(selectedDate);
          slotDate.setHours(hour, minute, 0, 0);
          if (slotDate < now) isPastTime = true;
        }

        if (isPastTime) continue;

        const slotStartMinutes = hour * 60 + minute;
        const slotEndMinutes = slotStartMinutes + slotInterval;

        // Count jobs in this slot window
        const jobsInSlot = pendingJobs.filter(j => {
          const jd = new Date(j.scheduledFor);
          const jobMinutes = jd.getHours() * 60 + jd.getMinutes();
          return jobMinutes >= slotStartMinutes && jobMinutes < slotEndMinutes;
        });

        const scheduled = jobsInSlot.length;
        const available = Math.max(0, emailsPerWindow - scheduled);
        const isFull = available === 0;
        const isLimited = available > 0 && available < emailsPerWindow;

        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const timeLabel = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        slots.push({
          time: timeStr,
          label: timeLabel,
          scheduled,
          available,
          capacity: emailsPerWindow,
          isFull,
          isLimited,
          jobs: jobsInSlot
        });
      }
    }
    return slots;
  };

  const timeSlots = generateSlotsWithCapacity();

  const handleConfirm = () => {
    if (!selectedTime) return;
    const [hours, mins] = selectedTime.split(':');
    const finalDate = new Date(selectedDate);
    finalDate.setHours(parseInt(hours), parseInt(mins));
    onSelectSlot(finalDate);
  };

  const selectedDayJobs = getPendingJobs(scheduledJobs)
    .filter(j => {
      if (!j.scheduledFor) return false;
      return new Date(j.scheduledFor).toDateString() === selectedDate.toDateString();
    })
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

  const selectedSlotInfo = timeSlots.find(s => s.time === selectedTime);

  return (
    <div className="enhanced-slot-picker">
      <style>{`
        .enhanced-slot-picker {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        .esp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.05));
        }
        
        .esp-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .esp-body {
          display: grid;
          grid-template-columns: 280px 1fr;
          flex: 1;
          overflow: hidden;
        }
        
        /* Calendar Section - Compact */
        .calendar-pane {
          padding: 1rem;
          border-right: 1px solid var(--border-color);
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        
        .calendar-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .calendar-nav span {
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .nav-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .nav-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .week-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          text-align: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 4px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }
        
        .calendar-day {
          aspect-ratio: 1;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          background: var(--bg-secondary);
          transition: all 0.15s;
          font-size: 0.8rem;
          min-height: 32px;
        }
        
        .calendar-day.empty {
          background: transparent;
          cursor: default;
        }
        
        .calendar-day:not(.empty):not(.past):hover {
          background: rgba(59, 130, 246, 0.15);
          transform: scale(1.05);
        }
        
        .calendar-day.selected {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
        
        .calendar-day.today:not(.selected) {
          border: 2px solid #f59e0b;
        }
        
        .calendar-day.past {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .day-number {
          z-index: 1;
        }
        
        .day-load-indicator {
          position: absolute;
          bottom: 2px;
          left: 2px;
          right: 2px;
          height: 3px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .load-fill {
          height: 100%;
          transition: width 0.3s;
        }
        
        .day-count {
          position: absolute;
          top: 1px;
          right: 2px;
          font-size: 0.55rem;
          background: var(--bg-card);
          color: var(--text-secondary);
          padding: 0 3px;
          border-radius: 3px;
        }
        
        .calendar-day.selected .day-count {
          background: rgba(255,255,255,0.2);
          color: white;
        }
        
        /* Capacity Info */
        .capacity-info {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          font-size: 0.8rem;
        }
        
        .capacity-info h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .capacity-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        
        .capacity-stat {
          padding: 0.5rem;
          background: var(--bg-card);
          border-radius: 6px;
          text-align: center;
        }
        
        .capacity-stat .value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .capacity-stat .label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        
        /* Slots Section */
        .slots-pane {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-secondary);
        }
        
        .slots-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-card);
        }
        
        .slots-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .slots-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .interval-select {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
        }
        
        .interval-select select {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.8rem;
        }
        
        /* Legend */
        .slot-legend {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
        }
        
        .legend-dot.available { background: linear-gradient(135deg, #10b981, #059669); }
        .legend-dot.limited { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .legend-dot.full { background: linear-gradient(135deg, #ef4444, #dc2626); }
        
        /* Slots Grid */
        .slots-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.25rem;
        }
        
        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 8px;
        }
        
        .time-slot {
          padding: 10px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
        }
        
        .time-slot:hover:not(.full) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .time-slot.selected {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-color: transparent;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        
        .time-slot.selected .slot-time,
        .time-slot.selected .slot-capacity {
          color: white;
        }
        
        .time-slot.available {
          border-left: 3px solid #10b981;
        }
        
        .time-slot.limited {
          border-left: 3px solid #f59e0b;
        }
        
        .time-slot.full {
          border-left: 3px solid #ef4444;
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .slot-time {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        
        .slot-capacity {
          font-size: 0.7rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .slot-capacity .capacity-bar {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .slot-capacity .capacity-fill {
          height: 100%;
          transition: width 0.3s;
        }
        
        .slot-capacity .capacity-text {
          white-space: nowrap;
        }
        
        /* Scheduled Jobs List */
        .scheduled-section {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-card);
          max-height: 180px;
          overflow-y: auto;
        }
        
        .scheduled-section h5 {
          margin: 0 0 0.75rem 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .scheduled-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .scheduled-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 0.8rem;
        }
        
        .scheduled-time {
          font-weight: 600;
          color: #8b5cf6;
          min-width: 65px;
        }
        
        .scheduled-type {
          flex: 1;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .scheduled-lead {
          font-size: 0.7rem;
          color: var(--text-muted);
          max-width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Footer */
        .esp-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-card);
        }
        
        .selection-preview {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .selection-preview .preview-badge {
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .selection-preview .availability-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .availability-badge.good {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .availability-badge.warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        
        .footer-actions {
          display: flex;
          gap: 10px;
        }
        
        .btn-icon {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }
        
        .btn-icon:hover {
          background: var(--bg-hover);
        }
        
        /* Empty state */
        .empty-slots {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }
        
        .empty-slots svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div className="esp-header">
        <h3>
          <CalendarIcon size={20} style={{ color: '#8b5cf6' }} />
          Select Time Slot
          {loading && <Loader2 size={16} className="spin" />}
        </h3>
        <button onClick={onCancel} className="btn-icon">
          <X size={20} />
        </button>
      </div>

      <div className="esp-body">
        {/* Left: Compact Calendar */}
        <div className="calendar-pane">
          <div className="calendar-nav">
            <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={18} /></button>
            <span>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={nextMonth} className="nav-btn"><ChevronRight size={18} /></button>
          </div>

          <div className="week-header">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>

          <div className="calendar-grid">
            {renderCalendar()}
          </div>

          {/* Capacity Summary */}
          <div className="capacity-info">
            <h5>Selected Day Stats</h5>
            <div className="capacity-stats">
              <div className="capacity-stat">
                <div className="value">{selectedDayJobs.length}</div>
                <div className="label">Scheduled</div>
              </div>
              <div className="capacity-stat">
                <div className="value" style={{ color: '#10b981' }}>
                  {timeSlots.filter(s => s.available > 0).length}
                </div>
                <div className="label">Available Slots</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Time Slots */}
        <div className="slots-pane">
          <div className="slots-header">
            <div className="slots-header-top">
              <h4>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
              <div className="interval-select">
                <Clock size={14} />
                <select
                  value={slotInterval}
                  onChange={(e) => {
                    setSlotInterval(Number(e.target.value));
                    setSelectedTime(null);
                  }}
                >
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>
            
            <div className="slot-legend">
              <div className="legend-item">
                <div className="legend-dot available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot limited"></div>
                <span>Limited</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot full"></div>
                <span>Full</span>
              </div>
            </div>
          </div>

          <div className="slots-content">
            {timeSlots.length > 0 ? (
              <div className="slots-grid">
                {timeSlots.map(slot => {
                  const fillPercent = (slot.scheduled / slot.capacity) * 100;
                  const fillColor = slot.isFull ? '#ef4444' : slot.isLimited ? '#f59e0b' : '#10b981';
                  const statusClass = slot.isFull ? 'full' : slot.isLimited ? 'limited' : 'available';
                  
                  return (
                    <div
                      key={slot.time}
                      className={`time-slot ${statusClass} ${selectedTime === slot.time ? 'selected' : ''}`}
                      onClick={() => !slot.isFull && setSelectedTime(slot.time)}
                      title={`${slot.available} of ${slot.capacity} slots available`}
                    >
                      <div className="slot-time">{slot.label}</div>
                      <div className="slot-capacity">
                        <div className="capacity-bar">
                          <div
                            className="capacity-fill"
                            style={{ width: `${fillPercent}%`, background: fillColor }}
                          />
                        </div>
                        <span className="capacity-text">
                          {slot.available}/{slot.capacity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-slots">
                <AlertTriangle size={40} />
                <div>No available slots for this day</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Past times are hidden</div>
              </div>
            )}
          </div>

          {/* Scheduled Jobs on Selected Day */}
          {selectedDayJobs.length > 0 && (
            <div className="scheduled-section">
              <h5>
                <Mail size={14} />
                Already Scheduled ({selectedDayJobs.length})
              </h5>
              <div className="scheduled-list">
                {selectedDayJobs.slice(0, 5).map((job, i) => (
                  <div key={i} className="scheduled-item">
                    <span className="scheduled-time">
                      {new Date(job.scheduledFor).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                    <span className="scheduled-type">{job.type || 'Email'}</span>
                    <span className="scheduled-lead">{job.lead?.name || job.lead?.email || ''}</span>
                  </div>
                ))}
                {selectedDayJobs.length > 5 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>
                    +{selectedDayJobs.length - 5} more scheduled
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="esp-footer">
        <div className="selection-preview">
          {selectedTime ? (
            <>
              <div className="preview-badge">
                <Clock size={14} style={{ marginRight: '6px' }} />
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                {new Date(2000, 0, 1, ...selectedTime.split(':').map(Number)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
              {selectedSlotInfo && (
                <div className={`availability-badge ${selectedSlotInfo.available >= emailsPerWindow ? 'good' : 'warning'}`}>
                  <CheckCircle size={12} style={{ marginRight: '4px' }} />
                  {selectedSlotInfo.available} slot{selectedSlotInfo.available !== 1 ? 's' : ''} available
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Info size={14} style={{ marginRight: '6px' }} />
              Select a time slot to continue
            </div>
          )}
        </div>
        
        <div className="footer-actions">
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTime}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: !selectedTime ? 0.5 : 1 }}
          >
            <CheckCircle size={16} />
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarSlotPicker;
