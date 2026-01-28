import React from 'react';
import { X, Play, Pause, FastForward, RotateCcw, Trash2, CalendarClock, Mail, Edit3, XCircle } from 'lucide-react';
import { useRulebook } from '../contexts/RulebookContext';

const TimelineDetailModal = ({ item, onClose, onAction, getStatusColor, getEventIcon }) => {
  if (!item) return null;

  const { status, type, name, category, rawData, isProjected } = item;
  const { canPerformAction, getAllowedActions, loading: rulebookLoading } = useRulebook();
  
  // Get allowed actions based on mail type and status
  const allowedActions = getAllowedActions(type || name, status);
  
  // Helper to trigger action wrapper
  const trigger = (action, payload = null) => {
      onAction(action, item, payload);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '12px', width: '90%', maxWidth: '600px',
        maxHeight: '90vh', overflowY: 'auto', padding: '0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding:'10px', borderRadius:'10px', background: isProjected ? 'var(--bg-secondary)' : `${getStatusColor(status)}20`, color: isProjected ? 'var(--text-muted)' : getStatusColor(status) }}>
                  {category === 'manual' ? <Edit3 size={24} /> : <Mail size={24} />}
              </div>
              <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{name}</h2>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'4px' }}>
                      <span className={`status-badge ${status?.startsWith('manual_') ? 'manual_scheduled' : status}`}>
                          {status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {category === 'manual' && <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Manual Mail</span>}
                  </div>
              </div>
           </div>
           <button onClick={onClose} className="btn-icon"><X size={24} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
            
            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="detail-group">
                    <label style={{ display:'block', fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'4px' }}>Scheduled For</label>
                    <div style={{ fontSize:'1rem' }}>
                        {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : (isProjected ? 'Projected' : 'N/A')}
                    </div>
                </div>
                <div className="detail-group">
                    <label style={{ display:'block', fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'4px' }}>Sent At</label>
                    <div style={{ fontSize:'1rem' }}>
                        {item.sentAt ? new Date(item.sentAt).toLocaleString() : '-'}
                    </div>
                </div>
                {/* Manual Mail Details */}
                {category === 'manual' && rawData.title && (
                   <div style={{ gridColumn: 'span 2' }}>
                       <label style={{ display:'block', fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'4px' }}>Subject</label>
                       <div style={{ padding:'8px 12px', background:'var(--bg-secondary)', borderRadius:'6px' }}>
                           {rawData.title}
                       </div>
                   </div>
                )}
            </div>

            {/* Actions Toolbar - Now using Rulebook permissions */}
            {!isProjected && (
                <div style={{ marginBottom: '2rem', padding:'1rem', background:'var(--bg-secondary)', borderRadius:'8px', display:'flex', flexWrap:'wrap', gap:'10px' }}>
                    
                    {/* Resume Job button - For jobs paused due to priority */}
                    {status === 'paused' && (
                        <button onClick={() => trigger('resumeJob')} className="btn btn-primary" style={{ display:'flex', gap:'6px' }}>
                            <Play size={16} /> Resume Job
                        </button>
                    )}
                    
                    {/* Active job actions */}
                    {['pending', 'scheduled', 'queued', 'rescheduled'].includes(status) && (
                        <>
                            {/* Reschedule - Check rulebook */}
                            {allowedActions.reschedule && (
                                <button onClick={() => trigger('reschedule')} className="btn btn-secondary" style={{ display:'flex', gap:'6px' }}>
                                    <CalendarClock size={16} /> Change Slot
                                </button>
                            )}
                            
                            {/* Skip - ONLY for followups per rulebook */}
                            {allowedActions.skip && (
                                <button onClick={() => trigger('skip')} className="btn" style={{ background:'rgba(234, 179, 8, 0.1)', color:'#ca8a04', border:'none', display:'flex', gap:'6px' }}>
                                    <FastForward size={16} /> Skip
                                </button>
                            )}
                            
                            {/* Pause - ONLY for followups per rulebook */}
                            {allowedActions.pause && (
                                <button onClick={() => trigger('pause')} className="btn" style={{ background:'rgba(245, 158, 11, 0.1)', color:'#f59e0b', border:'none', display:'flex', gap:'6px' }}>
                                    <Pause size={16} /> Pause Followups
                                </button>
                            )}
                            
                            {/* Cancel - For initial, manual, conditional - NOT followups per rulebook */}
                            {allowedActions.cancel && (
                                <button onClick={() => trigger('cancel')} className="btn hover-danger" style={{ background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'none', display:'flex', gap:'6px' }}>
                                    <XCircle size={16} /> Cancel
                                </button>
                            )}
                        </>
                    )}

                    {/* Skipped status actions */}
                    {(status === 'skipped' || rawData?.skipped) && (
                        <>
                            <button onClick={() => trigger('revertSkip')} className="btn btn-secondary" style={{ display:'flex', gap:'6px' }}>
                                <RotateCcw size={16} /> Revert Skip
                            </button>
                            <button onClick={() => trigger('delete')} className="btn hover-danger" style={{ background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'none', display:'flex', gap:'6px' }}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </>
                    )}

                    {/* Failed/Terminal status actions */}
                    {['cancelled', 'blocked', 'failed', 'hard_bounce', 'soft_bounce', 'spam', 'bounced', 'error', 'complaint', 'unsubscribed'].includes(status) && (
                         <>
                             {allowedActions.retry && (
                                 <button onClick={() => trigger('retry')} className="btn btn-primary" style={{ display:'flex', gap:'6px' }}>
                                     <RotateCcw size={16} /> Retry
                                 </button>
                             )}
                             <button onClick={() => trigger('delete')} className="btn hover-danger" style={{ background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'none', display:'flex', gap:'6px' }}>
                                 <Trash2 size={16} /> Delete
                             </button>
                         </>
                    )}
                    
                    {/* No actions message */}
                    {!allowedActions.skip && !allowedActions.cancel && !allowedActions.pause && 
                     !allowedActions.resume && !allowedActions.retry && !allowedActions.reschedule &&
                     !['skipped', 'cancelled', 'blocked', 'failed', 'hard_bounce', 'soft_bounce', 'spam', 'bounced', 'error', 'complaint', 'unsubscribed'].includes(status) && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No actions available for this email status.
                        </div>
                    )}
                </div>
            )}

            {/* History Timeline */}
            <h3 style={{ fontSize:'1rem', marginBottom:'1rem' }}>Activity Log</h3>
            <div style={{ position:'relative', paddingLeft:'16px' }}>
                <div style={{ position:'absolute', left:'0', top:'8px', bottom:'8px', width:'2px', background:'var(--border-color)' }}></div>
                {item.history && item.history.length > 0 ? (
                     item.history.map((h, i) => (
                         <div key={i} style={{ marginBottom:'12px', position:'relative', paddingLeft:'16px' }}>
                             <div style={{ position:'absolute', left:'-5px', top:'4px', width:'12px', height:'12px', borderRadius:'50%', background:'var(--bg-card)', border:`2px solid ${getStatusColor(h.event)}` }}></div>
                             <div style={{ fontSize:'0.9rem' }}>{h.event.replace(/_/g, ' ')}</div>
                             <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{new Date(h.timestamp).toLocaleString()}</div>
                         </div>
                     ))
                ) : (
                    <div style={{ fontSize:'0.9rem', color:'var(--text-secondary)', fontStyle:'italic' }}>No detailed history available.</div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default TimelineDetailModal;
