import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Image as ImageIcon, Video, FileText, Star, Trash2, X, Plus, FolderPlus, FileUp, FolderUp } from 'lucide-react';
import { useTransfer } from './TransferContext';

const CATEGORIES = [
  { id: 'all', label: 'All Files', icon: <LayoutGrid size={18} /> },
  { id: 'image', label: 'Images', icon: <ImageIcon size={18} /> },
  { id: 'video', label: 'Videos', icon: <Video size={18} /> },
  { id: 'document', label: 'Documents', icon: <FileText size={18} /> },
  { id: 'starred', label: 'Starred', icon: <Star size={18} /> },
  { id: 'trash', label: 'Trash', icon: <Trash2 size={18} /> },
];

// 10 GB Quota
const MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function Sidebar({ activeCategory, setActiveCategory, storageUsed, isOpen, setIsOpen, currentFolder, onUploadComplete, onFilesSelected }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const { addTransfer, updateTransferProgress, updateTransferStatus } = useTransfer();

  const usagePercentage = Math.min((storageUsed / MAX_STORAGE_BYTES) * 100, 100);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.new-btn')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateFolder = async () => {
    setIsDropdownOpen(false);
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: currentFolder?.id || null })
      });
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      alert("Failed to create folder");
    }
  };

  const handleFileChange = (e) => {
    setIsDropdownOpen(false);
    if (e.target.files && e.target.files.length > 0) {
      if (onFilesSelected) {
        onFilesSelected(Array.from(e.target.files));
      }
      e.target.value = '';
    }
  };



  return (
    <aside className={`glass-panel sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Epstein Files</h2>
        <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>
      </div>

      <div className="sidebar-new-container">
        <button className="new-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <Plus size={24} />
          <span>New</span>
        </button>

        {isDropdownOpen && (
          <div className="new-dropdown" ref={dropdownRef}>
            <button className="new-dropdown-item" onClick={handleCreateFolder}>
              <FolderPlus size={18} /> New folder
            </button>
            <div className="new-dropdown-divider"></div>
            <button className="new-dropdown-item" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={18} /> File upload
            </button>
            <button className="new-dropdown-item" onClick={() => folderInputRef.current?.click()}>
              <FolderUp size={18} /> Folder upload
            </button>
          </div>
        )}
      </div>
      
      <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
      <input type="file" webkitdirectory="" directory="" ref={folderInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      <nav className="sidebar-nav">
        <ul>
          {CATEGORIES.map(cat => (
            <li key={cat.id}>
              <button 
                className={`sidebar-link ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="icon">{cat.icon}</span>
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="storage-widget">
          <div className="storage-header">
            <span>Storage</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="storage-bar-bg">
            <div 
              className="storage-bar-fill" 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
          <div className="storage-details">
            {formatBytes(storageUsed)} of {formatBytes(MAX_STORAGE_BYTES)} used
          </div>
        </div>
      </div>
    </aside>
  );
}
