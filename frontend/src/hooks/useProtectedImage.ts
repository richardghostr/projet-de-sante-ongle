import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { getTokenFromStorage } from '@/lib/auth';

type UseProtectedImageResult = {
  src: string | null;
  loading: boolean;
  error: Error | null;
};

// Simple in-memory cache to reuse blob URLs per resource during session
const blobUrlCache = new Map<string, string>();

export function useProtectedImage(url?: string | null): UseProtectedImageResult {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    // reuse cached blob URL when available
    const cached = blobUrlCache.get(url);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    // token retrieval: prefer api client token or fallback to localStorage
    const token = (localStorage.getItem('unguealhealth_token') || '') as string;

    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'image/*',
        Authorization: token ? `Bearer ${token}` : ''
      },
      signal: controller.signal
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Authentication required' : `Image fetch failed (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, objectUrl);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      // abort ongoing fetch
      controller.abort();
      // don't revoke cached blob urls here (session cache)
    };
  }, [url]);

  return { src, loading, error };
}

export default useProtectedImage;
