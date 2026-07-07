"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, CloudUpload } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import FileGallery from '../components/FileGallery';
import { useTransfer } from '../components/TransferContext';

export default function Home() {
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [storageUsed, setStorageUsed] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  
  const { addTransfer, updateTransferProgress, updateTransferStatus } = useTransfer();

  const handleUploadComplete = useCallback(() => {
    // Trigger gallery refresh after a slight delay to allow worker to finish thumbnail
    setTimeout(() => {
      setRefreshGallery(prev => prev + 1);
    }, 1500);
  }, []);

  const processFiles = useCallback((filesArray, targetFolderId = null) => {
    filesArray.forEach(async (file) => {
      const transferId = Math.random().toString(36).substring(7) + '-' + file.name;
      const abortController = new AbortController();
      
      addTransfer({
        id: transferId,
        type: 'upload',
        name: file.name,
        mimetype: file.type || 'application/octet-stream',
        progress: 0,
        status: 'in-progress',
        abortController
      });

      try {
        const res1 = await fetch(`/api/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimetype: file.type || 'application/octet-stream' })
        });
        const { url, key } = await res1.json();

        updateTransferProgress(transferId, 5);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const filePercent = (event.loaded / event.total) * 90;
              updateTransferProgress(transferId, 5 + filePercent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error('Upload failed'));
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.onabort = () => reject(new Error('Cancelled'));
          
          abortController.signal.addEventListener('abort', () => xhr.abort());

          xhr.send(file);
        });

        updateTransferProgress(transferId, 95);

        await fetch(`/api/metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: file.name, 
            key, 
            size: file.size, 
            mimetype: file.type || 'application/octet-stream',
            folder_id: targetFolderId !== null ? targetFolderId : (currentFolder?.id || null)
          })
        });

        updateTransferProgress(transferId, 100);
        updateTransferStatus(transferId, 'completed');

        handleUploadComplete();
      } catch (error) {
        if (error.message === 'Cancelled') {
          updateTransferStatus(transferId, 'cancelled');
        } else {
          console.error(`Upload Error for ${file.name}:`, error);
          updateTransferStatus(transferId, 'error');
        }
      }
    });
  }, [currentFolder, addTransfer, updateTransferProgress, updateTransferStatus, handleUploadComplete]);

  useEffect(() => {
    const handleDragEnter = (e) => {
      if (window.innerWidth <= 768) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      if (window.innerWidth <= 768) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e) => {
      if (window.innerWidth <= 768) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      if (window.innerWidth <= 768) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processFiles]);

  return (
    <div className="app-layout">
      <div className="mobile-top-bar">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        <h2>Epstein Files</h2>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      
      <Sidebar 
        activeCategory={activeCategory} 
        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          setIsMobileMenuOpen(false);
        }} 
        storageUsed={storageUsed} 
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        currentFolder={currentFolder}
        onUploadComplete={handleUploadComplete}
        onFilesSelected={processFiles}
      />
      
      <main className="dashboard-container">
        {isDragging && (
          <div className="drop-banner">
            <CloudUpload size={24} />
            <span>Drop files to upload {currentFolder ? `to ${currentFolder.name}` : 'to My Drive'}</span>
          </div>
        )}
        <div className="dashboard-inner">
          <FileGallery 
            refreshTrigger={refreshGallery} 
            activeCategory={activeCategory}
            onStorageUpdate={setStorageUsed}
            currentFolder={currentFolder}
            setCurrentFolder={setCurrentFolder}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onFilesSelected={processFiles}
          />
        </div>
      </main>
    </div>
  );
}
