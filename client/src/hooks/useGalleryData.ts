import { useState, useEffect } from 'react';
import { useTransfer } from '../components/TransferContext';
import { useRouter } from 'next/navigation';

interface UseGalleryDataProps {
  refreshTrigger: any;
  activeCategory: string;
  currentFolder: any;
  onStorageUpdate: (size: number) => void;
}

export function useGalleryData({ refreshTrigger, activeCategory, currentFolder, onStorageUpdate }: UseGalleryDataProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addTransfer, updateTransferProgress, updateTransferStatus } = useTransfer();
  const router = useRouter();

  const handleResponse = async (res: Response) => {
    if (res.status === 401) {
      router.push('/login');
      throw new Error('Unauthorized');
    }
    return res.json();
  };

  const fetchContent = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setFiles([]);
      setFolders([]);
    }
    try {
      if (activeCategory === 'trash') {
        const res = await fetch('/api/trash');
        const data = await handleResponse(res);
        setFolders(data.folders || []);
        setFiles(data.files || []);
      } else if (activeCategory === 'starred') {
        const res = await fetch('/api/starred');
        const data = await handleResponse(res);
        setFolders(data.folders || []);
        setFiles(data.files || []);
      } else if (activeCategory === 'all') {
        const url = currentFolder ? `/api/content?folder_id=${currentFolder.id}` : '/api/content';
        const res = await fetch(url);
        const data = await handleResponse(res);
        setFolders(data.folders || []);
        setFiles(data.files || []);
        
        fetch('/api/files').then(handleResponse).then(d => {
           const loadedFiles = d.files || [];
           const totalSize = loadedFiles.reduce((sum: number, f: any) => sum + parseInt(f.size || '0', 10), 0);
           if (onStorageUpdate) onStorageUpdate(totalSize);
        }).catch(() => {});
      } else {
        const res = await fetch(`/api/files`);
        const data = await handleResponse(res);
        setFiles(data.files || []);
        setFolders([]); 
        
        const loadedFiles = data.files || [];
        const totalSize = loadedFiles.reduce((sum: number, f: any) => sum + parseInt(f.size || '0', 10), 0);
        if (onStorageUpdate) onStorageUpdate(totalSize);
      }
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        console.error('Failed to fetch content', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, currentFolder, activeCategory]);

  const handleDownload = async (e: any, fileId: string, filename: string, mimetype = 'application/octet-stream') => {
    e.stopPropagation();
    
    const transferId = Math.random().toString(36).substring(7) + '-dl-' + filename;
    const abortController = new AbortController();
    
    addTransfer({
      id: transferId,
      type: 'download',
      name: filename,
      mimetype: mimetype,
      progress: 0,
      status: 'in-progress',
      abortController
    });

    try {
      const res = await fetch(`/api/download-url/${fileId}`);
      const { url } = await res.json();
      
      updateTransferProgress(transferId, 5);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 90; // up to 95%
          updateTransferProgress(transferId, 5 + percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blobUrl = URL.createObjectURL(xhr.response);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          updateTransferProgress(transferId, 100);
          updateTransferStatus(transferId, 'completed');
        } else {
          updateTransferStatus(transferId, 'error');
        }
      };

      xhr.onerror = () => updateTransferStatus(transferId, 'error');
      xhr.onabort = () => updateTransferStatus(transferId, 'cancelled');
      
      abortController.signal.addEventListener('abort', () => xhr.abort());
      
      xhr.send();

    } catch (err) {
      console.error('Download failed', err);
      updateTransferStatus(transferId, 'error');
      alert('Download failed');
    }
  };

  const softDelete = async (e: any, id: string, type: string) => {
    e.stopPropagation();
    if (!confirm(`Move this ${type} to trash?`)) return;
    await fetch(`/api/${type}s/${id}`, { method: 'DELETE' });
    fetchContent(true);
  };

  const restoreItem = async (e: any, id: string, type: string) => {
    e.stopPropagation();
    await fetch(`/api/${type}s/${id}/restore`, { method: 'PUT' });
    fetchContent(true);
  };

  const permanentDelete = async (e: any, id: string, type: string) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete this ${type}? This cannot be undone.`)) return;
    await fetch(`/api/trash/${type}/${id}`, { method: 'DELETE' });
    fetchContent(true);
  };

  const handleRename = async (e: any, id: string, type: string, currentName: string) => {
    e.stopPropagation();
    const newName = prompt(`Enter new name for ${type}:`, currentName);
    if (!newName || newName === currentName) return;
    
    try {
      await fetch(`/api/${type}s/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      fetchContent(true);
    } catch (err) {
      alert(`Failed to rename ${type}`);
    }
  };

  const handleToggleStar = async (e: any, id: string, type: string, isStarred: boolean) => {
    e.stopPropagation();
    try {
      await fetch(`/api/${type}s/${id}/star`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: !isStarred })
      });
      fetchContent(true);
    } catch (err) {
      alert(`Failed to star ${type}`);
    }
  };

  const emptyTrash = async () => {
    if (!confirm("Are you sure you want to permanently delete all items in the trash? This cannot be undone.")) return;
    try {
      await fetch('/api/trash/empty', { method: 'DELETE' });
      fetchContent(true);
    } catch (err) {
      alert('Failed to empty trash');
    }
  };

  return {
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
  };
}
