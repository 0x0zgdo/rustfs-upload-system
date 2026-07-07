"use client";
import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, File, Image as ImageIcon, Video, FileText, FileArchive, Music, Package, Folder, FolderPlus, ChevronRight, CornerUpLeft, MoreVertical, CornerDownRight, Trash2, RotateCcw, XOctagon, Download, Edit, Star, Info } from 'lucide-react';
import FilePreviewModal from './FilePreviewModal';
import MoveFileModal from './MoveFileModal';
import FileInfoSidebar from './FileInfoSidebar';
import { useGalleryData } from '../hooks/useGalleryData';export default function FileGallery({ refreshTrigger, activeCategory, onStorageUpdate, currentFolder, setCurrentFolder, isDragging, setIsDragging, onFilesSelected }) {
  const {
    files,
    folders,
    loading,
    fetchContent,
    handleDownload,
    softDelete,
    restoreItem,
    permanentDelete,
    handleRename,
    handleToggleStar,
    emptyTrash
  } = useGalleryData({ refreshTrigger, activeCategory, currentFolder, onStorageUpdate });

  const [viewMode, setViewMode] = useState('grid');
  const [dragTargetFolder, setDragTargetFolder] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [moveFile, setMoveFile] = useState(null);
  const [infoFile, setInfoFile] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Track folder navigation path
  const [folderPath, setFolderPath] = useState([]);

  const navigateToFolder = (folder) => {
    if (activeCategory === 'trash') return; // Disable navigation in trash
    setFolderPath([...folderPath, folder]);
    setCurrentFolder(folder);
  };

  const navigateUp = () => {
    if (folderPath.length === 0) return;
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1] : null);
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolder(null);
  };

  const handleFileInfo = (e, f) => {
    e.stopPropagation();
    setActiveDropdown(null);
    setInfoFile(f);
  };

  useEffect(() => {
    if (infoFile) {
      document.body.classList.add('info-sidebar-open');
    } else {
      document.body.classList.remove('info-sidebar-open');
    }
    return () => document.body.classList.remove('info-sidebar-open');
  }, [infoFile]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.more-btn') && !e.target.closest('.dropdown-menu')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);



  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };


  const filteredFiles = files.filter(f => {
    if (activeCategory === 'all' || activeCategory === 'trash') return true;
    if (activeCategory === 'starred') return f.is_starred;
    if (activeCategory === 'image') return f.mimetype && f.mimetype.startsWith('image/');
    if (activeCategory === 'video') return f.mimetype && f.mimetype.startsWith('video/');
    if (activeCategory === 'document') {
      return f.mimetype && (
        f.mimetype.startsWith('text/') || 
        f.mimetype === 'application/pdf' || 
        f.mimetype.includes('document')
      );
    }
    return true;
  });

  return (
    <div className={`gallery-section ${isDragging && !dragTargetFolder ? 'gallery-drag-active' : ''}`} style={{ minHeight: '50vh' }}>
      <div className="gallery-header">
        <div className="gallery-title-area">
          {/* Title removed */}
          {activeCategory === 'all' && folderPath.length > 0 && (
            <div className="breadcrumbs">
              <span onClick={navigateToRoot} className="breadcrumb-item">Root</span>
              {folderPath.map((f, i) => (
                <React.Fragment key={f.id}>
                  <ChevronRight size={14} className="breadcrumb-sep" />
                  <span onClick={() => {
                    const newPath = folderPath.slice(0, i + 1);
                    setFolderPath(newPath);
                    setCurrentFolder(newPath[newPath.length - 1]);
                  }} className="breadcrumb-item">{f.name}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="view-toggle">

          {activeCategory === 'trash' && (files.length > 0 || folders.length > 0) && (
             <button className="new-folder-btn" onClick={emptyTrash} title="Empty Trash" style={{color: '#ef4444', borderColor: '#ef4444'}}>
               <Trash2 size={18} style={{marginRight: '6px'}} /> Empty Trash
             </button>
          )}
          <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View"><List size={18} /></button>
          <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View"><LayoutGrid size={18} /></button>
        </div>
      </div>
      
      <div 
        className={viewMode === 'list' ? 'file-list' : 'file-grid'}
        style={{
          opacity: loading ? 0.5 : 1,
          pointerEvents: loading ? 'none' : 'auto',
          transition: 'opacity 0.2s ease'
        }}
      >
        
        {viewMode === 'list' && (
          <div className="list-header">
            <span className="header-name">Name</span>
            <span className="header-reason">Reason suggested</span>
            <span className="header-owner">Owner</span>
            <span className="header-location">Location</span>
            <div className="header-spacer"></div>
          </div>
        )}
        
        {/* Render "Up" Folder if inside a folder */}
        {activeCategory === 'all' && currentFolder && (
          <div className="glass-panel file-card folder-card" onClick={navigateUp}>
            <div className="file-preview folder-icon-container">
              <CornerUpLeft size={32} color="var(--text-secondary)" />
            </div>
            <div className="file-info">
              <span className="file-name">..</span>
              <span className="file-meta">Go back</span>
            </div>
          </div>
        )}

        {/* Render Folders */}
        {(activeCategory === 'all' || activeCategory === 'trash' || activeCategory === 'starred') && folders.filter(f => activeCategory === 'starred' ? f.is_starred : true).map(folder => (
          <div 
            key={folder.id} 
            className={`glass-panel file-card folder-card ${infoFile?.id === folder.id ? 'active-info' : ''} ${dragTargetFolder === folder.id ? 'folder-drag-active' : ''}`} 
            onClick={() => navigateToFolder(folder)}
            onDragOver={(e) => {
              if (window.innerWidth <= 768) return;
              e.preventDefault();
              e.stopPropagation();
              setDragTargetFolder(folder.id);
            }}
            onDragLeave={(e) => {
              if (window.innerWidth <= 768) return;
              e.preventDefault();
              e.stopPropagation();
              setDragTargetFolder(null);
            }}
            onDrop={(e) => {
              if (window.innerWidth <= 768) return;
              e.preventDefault();
              e.stopPropagation();
              setDragTargetFolder(null);
              if (setIsDragging) setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onFilesSelected) {
                onFilesSelected(Array.from(e.dataTransfer.files), folder.id);
              }
            }}
          >
            <div className="file-card-header">
              <div className="file-icon-small"><Folder size={16} fill={folder.is_starred ? "#facc15" : "var(--accent-primary)"} color={folder.is_starred ? "#facc15" : "var(--accent-primary)"} /></div>
              <span className="file-name" title={folder.name}>{folder.name}</span>
              
              <button className="more-btn" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === `folder-${folder.id}` ? null : `folder-${folder.id}`); }}>
                <MoreVertical size={16} />
              </button>
                
              {activeDropdown === `folder-${folder.id}` && (
                <div className="dropdown-menu">
                  {activeCategory === 'trash' ? (
                    <>
                      <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); restoreItem(e, folder.id, 'folder'); }}><RotateCcw size={16}/> Restore</button>
                      <button className="dropdown-item danger" onClick={(e) => { setActiveDropdown(null); permanentDelete(e, folder.id, 'folder'); }}><XOctagon size={16}/> Permanent Delete</button>
                    </>
                  ) : (
                    <>
                      <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); handleToggleStar(e, folder.id, 'folder', folder.is_starred); }}><Star size={16} fill={folder.is_starred ? "#facc15" : "none"}/> {folder.is_starred ? 'Unstar' : 'Add to starred'}</button>
                      <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); handleRename(e, folder.id, 'folder', folder.name); }}><Edit size={16}/> Rename</button>
                      <button className="dropdown-item danger" onClick={(e) => { setActiveDropdown(null); softDelete(e, folder.id, 'folder'); }}><Trash2 size={16}/> Remove</button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="file-preview folder-icon-container">
              <Folder size={48} fill="var(--accent-primary)" color="var(--accent-primary)" style={{ opacity: 0.5 }} />
            </div>
            
            <div className="file-info" style={{marginTop: 'auto', paddingTop: '0.5rem'}}>
              <span className="file-meta">Folder • {new Date(folder.created_at).toLocaleDateString()}</span>
            </div>

            {viewMode === 'list' && (
              <>
                <span className="list-owner"><div className="owner-avatar"></div> me</span>
                <span className="list-location">My Drive</span>
              </>
            )}
          </div>
        ))}

        {/* Render Files */}
        {filteredFiles.map(f => {
          const thumbnailUrl = f.thumbnail_url || null;
          
          let Icon = File;
          let iconColor = "var(--text-secondary)";
          if (f.mimetype?.startsWith('video/')) Icon = Video;
          else if (f.mimetype?.startsWith('image/')) Icon = ImageIcon;
          else if (f.mimetype?.startsWith('text/') || f.mimetype === 'application/pdf') { Icon = FileText; iconColor = "#ef4444"; }
          else if (f.mimetype?.includes('zip') || f.mimetype?.includes('tar') || f.mimetype?.includes('rar')) Icon = FileArchive;
          else if (f.mimetype?.startsWith('audio/')) Icon = Music;

          return (
            <div key={f.id} className={`glass-panel file-card ${infoFile?.id === f.id ? 'active-info' : ''}`} onClick={() => activeCategory !== 'trash' && setPreviewFile(f)} style={{ cursor: activeCategory !== 'trash' ? 'pointer' : 'default' }}>
              <div className="file-card-header">
                <div className="file-icon-small"><Icon size={16} color={iconColor} fill={iconColor === '#ef4444' ? '#ef4444' : 'none'}/></div>
                <span className="file-name" title={f.filename}>{f.filename}</span>
                
                <button className="more-btn" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === `file-${f.id}` ? null : `file-${f.id}`); }}>
                  <MoreVertical size={16} />
                </button>
                
                {activeDropdown === `file-${f.id}` && (
                  <div className="dropdown-menu">
                    {activeCategory === 'trash' ? (
                      <>
                        <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); restoreItem(e, f.id, 'file'); }}><RotateCcw size={16}/> Restore</button>
                        <button className="dropdown-item danger" onClick={(e) => { setActiveDropdown(null); permanentDelete(e, f.id, 'file'); }}><XOctagon size={16}/> Permanent Delete</button>
                      </>
                    ) : (
                      <>
                        <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); handleDownload(e, f.id, f.filename, f.mimetype); }}><Download size={16}/> Download</button>
                        <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setMoveFile(f); }}><CornerDownRight size={16}/> Move to</button>
                        <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); handleToggleStar(e, f.id, 'file', f.is_starred); }}><Star size={16} fill={f.is_starred ? "#facc15" : "none"}/> {f.is_starred ? 'Unstar' : 'Add to starred'}</button>
                        <button className="dropdown-item" onClick={(e) => { setActiveDropdown(null); handleRename(e, f.id, 'file', f.filename); }}><Edit size={16}/> Rename</button>
                        <button className="dropdown-item" onClick={(e) => handleFileInfo(e, f)}><Info size={16}/> File Information</button>
                        <button className="dropdown-item danger" onClick={(e) => { setActiveDropdown(null); softDelete(e, f.id, 'file'); }}><Trash2 size={16}/> Remove</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="file-preview">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl} alt={f.filename} />
                ) : (
                  <Icon size={48} color={iconColor} style={{ opacity: 0.5 }} />
                )}
              </div>
              
              <div className="file-info" style={{marginTop: 'auto', paddingTop: '0.5rem'}}>
                <span className="file-meta">{viewMode === 'list' ? `You opened • ${new Date(f.created_at).toLocaleDateString()}` : `${formatBytes(f.size)} • ${new Date(f.created_at).toLocaleDateString()}`}</span>
              </div>

              {viewMode === 'list' && (
                <>
                  <span className="list-owner"><div className="owner-avatar"></div> me</span>
                  <span className="list-location">My Drive</span>
                </>
              )}
            </div>
          );
        })}
        
        {folders.length === 0 && filteredFiles.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            color: 'var(--text-secondary)'
          }}>
            <p>{activeCategory === 'trash' ? 'Trash is empty.' : 'This folder is empty.'}</p>
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {moveFile && (
        <MoveFileModal 
           file={moveFile} 
           onClose={() => setMoveFile(null)} 
           onMoveComplete={() => {
             setMoveFile(null);
             fetchContent(true); // Refresh after moving
           }} 
        />
      )}

      <FileInfoSidebar file={infoFile} onClose={() => setInfoFile(null)} />
    </div>
  );
}
