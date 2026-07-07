"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, File, FileText, Video, Image as ImageIcon, Music, FileArchive } from 'lucide-react';
import { useTransfer } from './TransferContext';

export default function TransferManager() {
  const { transfers, isManagerOpen, setIsManagerOpen, cancelAll, cancelTransfer } = useTransfer();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isManagerOpen || transfers.length === 0) return null;

  const inProgressTransfers = transfers.filter(t => t.status === 'in-progress' || t.status === 'pending');
  const activeCount = inProgressTransfers.length;
  const isAllComplete = activeCount === 0;

  // Calculate overall status text
  let overallStatusText = "";
  if (isAllComplete) {
    overallStatusText = "All transfers complete";
  } else {
    overallStatusText = `${activeCount} item${activeCount > 1 ? 's' : ''} left...`;
  }

  const renderIcon = (type, mimetype) => {
    if (mimetype?.startsWith('video/')) return <Video size={16} />;
    if (mimetype?.startsWith('image/')) return <ImageIcon size={16} />;
    if (mimetype?.startsWith('text/') || mimetype === 'application/pdf') return <FileText size={16} />;
    if (mimetype?.includes('zip') || mimetype?.includes('tar')) return <FileArchive size={16} />;
    if (mimetype?.startsWith('audio/')) return <Music size={16} />;
    return <File size={16} />;
  };

  return (
    <div className={`transfer-manager ${isCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="transfer-header"
        style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
        onClick={() => isCollapsed && setIsCollapsed(false)}
      >
        <div className="transfer-header-title">
          <span>{isAllComplete ? `Completed ${transfers.length} items` : `Transferring ${transfers.length} items`}</span>
          <div className="transfer-header-actions">
            <button 
              className="icon-btn-small" 
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            >
              {isCollapsed ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            </button>
            <button 
              className="icon-btn-small" 
              onClick={(e) => { e.stopPropagation(); setIsManagerOpen(false); }}
            >
              <X size={18}/>
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="transfer-subheader">
            <span className="transfer-time-left">{overallStatusText}</span>
            {!isAllComplete && <button className="cancel-all-btn" onClick={cancelAll}>Cancel</button>}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="transfer-list">
          {transfers.map((t) => {
            const progress = t.progress || 0;
            const isDone = t.status === 'completed';
            const isCancelled = t.status === 'cancelled';
            const isError = t.status === 'error';
            
            return (
              <div key={t.id} className={`transfer-item ${t.status}`}>
                <div className="transfer-item-icon">
                  {renderIcon(t.type, t.mimetype)}
                </div>
                <div className="transfer-item-name" title={t.name}>{t.name}</div>
                
                <div className="transfer-item-status">
                  {isDone ? (
                    <span className="status-icon success" style={{fontSize: '18px', color: '#10b981'}}>✓</span>
                  ) : isCancelled ? (
                    <span className="status-icon cancelled" style={{fontSize: '18px', color: '#6b7280'}}>✗</span>
                  ) : isError ? (
                    <span className="status-icon error" style={{fontSize: '18px', color: '#ef4444'}}>!</span>
                  ) : (
                    <div className="progress-circle" onClick={() => cancelTransfer(t.id)} title="Cancel transfer">
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                        <circle 
                          cx="12" cy="12" r="8" 
                          fill="none" 
                          stroke="var(--accent-color)" 
                          strokeWidth="2.5" 
                          strokeDasharray="50.24" 
                          strokeDashoffset={50.24 - (progress / 100) * 50.24} 
                          style={{transition: 'stroke-dashoffset 0.2s ease', transformOrigin: 'center', transform: 'rotate(-90deg)'}} 
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
