"use client";
import React from 'react';
import { X, File, FileText, Video, Image as ImageIcon, Music, FileArchive, Folder } from 'lucide-react';

export default function FileInfoSidebar({ file, onClose }) {
  if (!file) return null;

  const isFolder = file.mimetype === undefined;
  
  let Icon = File;
  let iconColor = "var(--text-secondary)";
  
  if (isFolder) {
    Icon = Folder;
    iconColor = "var(--accent-primary)";
  } else {
    if (file.mimetype?.startsWith('video/')) Icon = Video;
    else if (file.mimetype?.startsWith('image/')) Icon = ImageIcon;
    else if (file.mimetype?.startsWith('text/') || file.mimetype === 'application/pdf') { Icon = FileText; iconColor = "#ef4444"; }
    else if (file.mimetype?.includes('zip') || file.mimetype?.includes('tar') || file.mimetype?.includes('rar')) Icon = FileArchive;
    else if (file.mimetype?.startsWith('audio/')) Icon = Music;
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formattedDate = new Date(file.created_at).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const typeName = isFolder ? 'Folder' : (file.mimetype?.split('/')[1]?.toUpperCase() || 'FILE');

  return (
    <div className={`info-sidebar ${file ? 'open' : ''}`}>
      <div className="info-sidebar-header">
        <div className="info-sidebar-title">
          <Icon size={20} color={iconColor} fill={iconColor === '#ef4444' || isFolder ? iconColor : 'none'} />
          <span title={file.filename || file.name}>{file.filename || file.name}</span>
        </div>
        <button className="icon-btn-small" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="info-sidebar-tabs">
        <div className="tab active">Details</div>
        <div className="tab">Activity</div>
      </div>

      <div className="info-sidebar-content">
        <h3>File details</h3>
        
        <div className="detail-item">
          <span className="detail-label">Type</span>
          <span className="detail-value">{typeName}</span>
        </div>

        {!isFolder && (
          <>
            <div className="detail-item">
              <span className="detail-label">Size</span>
              <span className="detail-value">{formatBytes(file.size)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Storage used</span>
              <span className="detail-value">{formatBytes(file.size)}</span>
            </div>
          </>
        )}

        <div className="detail-item">
          <span className="detail-label">Location</span>
          <span className="detail-value location-badge"><Folder size={14} style={{marginRight: '4px'}}/> My Drive</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Owner</span>
          <span className="detail-value">me</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Modified</span>
          <span className="detail-value">{formattedDate} by me</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Opened</span>
          <span className="detail-value">{formattedDate} by me</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Created</span>
          <span className="detail-value">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
