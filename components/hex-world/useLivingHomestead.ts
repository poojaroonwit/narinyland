"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import { livingFamilyFarmAPI } from '@/services/living-family-farm-api';

export type LivingHomesteadController = {
  state: HomesteadLifeState | null;
  revision: number;
  loading: boolean;
  error: string | null;
  busy: boolean;
  act: (action: HomesteadLifeAction) => Promise<boolean>;
  retry: () => void;
};

export function useLivingHomestead(
  landId: string,
  showToast: (message: string) => void,
): LivingHomesteadController {
  const [state, setState] = useState<HomesteadLifeState | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const activeLandRef = useRef<string | null>(landId);
  const requestNonceRef = useRef(0);
  const actionLockRef = useRef(false);

  useEffect(() => {
    activeLandRef.current = landId;
    actionLockRef.current = false;
    const requestNonce = ++requestNonceRef.current;
    setState(null);
    setRevision(0);
    setLoading(true);
    setError(null);
    setBusy(false);

    void livingFamilyFarmAPI.get(landId)
      .then((response) => {
        if (activeLandRef.current !== landId || requestNonceRef.current !== requestNonce) return;
        setState(response.state);
        setRevision(response.revision);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (activeLandRef.current !== landId || requestNonceRef.current !== requestNonce) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load homestead life');
      })
      .finally(() => {
        if (activeLandRef.current === landId && requestNonceRef.current === requestNonce) setLoading(false);
      });

    return () => {
      if (activeLandRef.current === landId) activeLandRef.current = null;
      requestNonceRef.current += 1;
      actionLockRef.current = false;
    };
  }, [landId, reloadNonce]);

  const act = useCallback(async (action: HomesteadLifeAction) => {
    if (!state || busy || actionLockRef.current) return false;
    const requestNonce = ++requestNonceRef.current;
    actionLockRef.current = true;
    setBusy(true);
    try {
      const response = await livingFamilyFarmAPI.act(landId, action);
      if (activeLandRef.current !== landId || requestNonceRef.current !== requestNonce) return false;
      setState(response.state);
      setRevision(response.revision);
      setError(null);
      showToast(response.message || response.state.lastMessage);
      return true;
    } catch (actionError) {
      if (activeLandRef.current !== landId || requestNonceRef.current !== requestNonce) return false;
      showToast(actionError instanceof Error ? actionError.message : 'Could not update homestead life');
      return false;
    } finally {
      if (activeLandRef.current === landId && requestNonceRef.current === requestNonce) {
        actionLockRef.current = false;
        setBusy(false);
      }
    }
  }, [busy, landId, showToast, state]);

  const retry = useCallback(() => setReloadNonce((value) => value + 1), []);

  return { state, revision, loading, error, busy, act, retry };
}
