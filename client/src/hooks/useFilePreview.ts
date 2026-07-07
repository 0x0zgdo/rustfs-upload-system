import { useState, useEffect } from 'react';

export function useFilePreview(file: any) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!file);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      return;
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    // Fetch the inline presigned URL
    fetch(`/api/preview-url/${file.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setPreviewUrl(data.url);
        } else {
          setError('Failed to load preview URL.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Error connecting to server.');
        setLoading(false);
      });
  }, [file]);

  const handleDownload = () => {
    if (!file) return;
    
    // Generate a temporary link to download properly (so we don't just navigate away)
    fetch(`/api/download-url/${file.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          const a = document.createElement('a');
          a.href = data.url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
  };

  return { previewUrl, loading, error, handleDownload };
}
