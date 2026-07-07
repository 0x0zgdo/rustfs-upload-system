import React from 'react';
import { X, Download, AlertCircle, Loader2 } from 'lucide-react';
import { useFilePreview } from '../hooks/useFilePreview';

export default function FilePreviewModal({ file, onClose }: { file: any, onClose: () => void }) {
  const { previewUrl, loading, error, handleDownload } = useFilePreview(file);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <Loader2 className="spinner" size={48} />
          <p>Loading preview...</p>
        </div>
      );
    }
    
    if (error || !previewUrl) {
      return (
        <div className="preview-error">
          <AlertCircle size={48} />
          <p>{error || 'Preview not available.'}</p>
          <button className="download-btn large" onClick={handleDownload}>
            <Download size={20} style={{ marginRight: '8px' }} />
            Download File Instead
          </button>
        </div>
      );
    }

    const mime = file.mimetype || '';

    if (mime.startsWith('image/')) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={previewUrl} alt={file.filename} className="preview-image" />;
    }
    
    if (mime.startsWith('video/')) {
      return <video src={previewUrl} controls autoPlay className="preview-video" />;
    }
    
    if (mime.startsWith('audio/')) {
      return (
        <div className="preview-audio-container">
          <audio src={previewUrl} controls autoPlay className="preview-audio" />
        </div>
      );
    }
    
    if (mime.startsWith('text/') || mime === 'application/pdf') {
      return <iframe src={previewUrl} title={file.filename} className="preview-iframe" />;
    }

    // Fallback for unsupported types (zip, rar, etc)
    return (
      <div className="preview-unsupported">
        <AlertCircle size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h2>No preview available</h2>
        <p>This file type ({mime || 'unknown'}) cannot be previewed in the browser.</p>
        <button className="download-btn large" onClick={handleDownload} style={{ marginTop: '2rem' }}>
          <Download size={20} style={{ marginRight: '8px' }} />
          Download {file.filename}
        </button>
      </div>
    );
  };

  if (!file) return null;

  return (
    <div className="preview-modal-overlay">
      <div className="preview-modal-backdrop" onClick={onClose}></div>
      <div className="preview-modal-container">
        <header className="preview-modal-header">
          <div className="preview-title">
            <h3>{file.filename}</h3>
            <span className="preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="preview-actions">
            <button className="preview-action-btn" onClick={handleDownload} title="Download">
              <Download size={24} />
            </button>
            <button className="preview-action-btn close" onClick={onClose} title="Close">
              <X size={24} />
            </button>
          </div>
        </header>
        <div className="preview-modal-content">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
