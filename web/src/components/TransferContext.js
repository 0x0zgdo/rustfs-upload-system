"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

const TransferContext = createContext();

export function TransferProvider({ children }) {
  const [transfers, setTransfers] = useState([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const addTransfer = useCallback((transfer) => {
    setTransfers((prev) => {
      const exists = prev.find(t => t.id === transfer.id);
      if (exists) return prev; // Avoid duplicates
      return [transfer, ...prev]; // New transfers at the top
    });
    setIsManagerOpen(true);
  }, []);

  const updateTransferProgress = useCallback((id, progress) => {
    setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, progress } : t));
  }, []);

  const updateTransferStatus = useCallback((id, status) => {
    setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }, []);

  const removeTransfer = useCallback((id) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cancelTransfer = useCallback((id) => {
    setTransfers((prev) => {
      const transfer = prev.find((t) => t.id === id);
      if (transfer && transfer.abortController) {
        try {
          transfer.abortController.abort();
        } catch (e) {
          console.error('Abort failed', e);
        }
      }
      return prev.map((t) => t.id === id ? { ...t, status: 'cancelled' } : t);
    });
  }, []);

  const cancelAll = useCallback(() => {
    setTransfers((prev) => {
      prev.forEach(t => {
        if ((t.status === 'in-progress' || t.status === 'pending') && t.abortController) {
          try {
            t.abortController.abort();
          } catch(e){}
        }
      });
      return prev.map(t => (t.status === 'in-progress' || t.status === 'pending') ? { ...t, status: 'cancelled' } : t);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers((prev) => prev.filter(t => t.status !== 'completed' && t.status !== 'cancelled'));
  }, []);

  return (
    <TransferContext.Provider value={{
      transfers,
      isManagerOpen,
      setIsManagerOpen,
      addTransfer,
      updateTransferProgress,
      updateTransferStatus,
      removeTransfer,
      cancelTransfer,
      cancelAll,
      clearCompleted
    }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  return useContext(TransferContext);
}
