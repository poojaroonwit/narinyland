"use client";

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedHexMotion(): boolean {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  ));

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}
