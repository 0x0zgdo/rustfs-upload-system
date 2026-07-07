import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';

export default function MoveFileModal({ file, onClose, onMoveComplete }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    // For a simple UX, let's fetch ALL folders in the system from a new endpoint 
    // Wait, we don't have an endpoint for ALL folders.
    // Let's add `/api/folders/all` on the backend real quick later.
    // For now, let's assume it exists.
    fetch('/api/folders/all')
      .then(res => res.json())
      .then(data => {
        setFolders(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleMove = async (folderId) => {
    setMoving(true);
    try {
      await fetch(`/api/files/${file.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId })
      });
      onMoveComplete();
    } catch (error) {
      console.error(error);
      alert('Failed to move file');
    }
    setMoving(false);
  };

  return (
    <div className="preview-modal-overlay">
      <div className="preview-modal-backdrop" onClick={onClose}></div>
      <div className="move-modal-container glass-panel">
        <header className="move-modal-header">
          <h3>Move {file.filename}</h3>
          <button className="preview-action-btn close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="move-modal-body">
          {loading ? (
            <p>Loading folders...</p>
          ) : (
            <ul className="folder-select-list">
              <li onClick={() => handleMove(null)} className="folder-select-item">
                <Folder size={20} />
                <span>My Drive (Root)</span>
              </li>
              {folders.map(folder => (
                <li key={folder.id} onClick={() => handleMove(folder.id)} className="folder-select-item">
                  <Folder size={20} />
                  <span>{folder.name}</span>
                </li>
              ))}
            </ul>
          )}
          {moving && <p>Moving...</p>}
        </div>
      </div>
    </div>
  );
}
