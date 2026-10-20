'use client';

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

const key = 'steady-reduce-effects-v1';
type EffectsState = {reduced: boolean; preference: boolean; systemReduced: boolean; ready: boolean; setPreference: (value: boolean) => void};
const EffectsContext = createContext<EffectsState>({reduced: true, preference: false, systemReduced: false, ready: false, setPreference: () => {}});

export function EffectsProvider({children}: {children: ReactNode}) {
  // Start motion-free until the device and saved preferences have been read.
  const [preference, setSavedPreference] = useState(false), [systemReduced, setSystemReduced] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function sync() {
      try { setSavedPreference(localStorage.getItem(key) === 'true'); } catch { /* Storage may be disabled. */ }
      setSystemReduced(media.matches); setReady(true);
    }
    sync(); media.addEventListener('change', sync);
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) sync(); };
    window.addEventListener('storage', storage);
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', storage); };
  }, []);
  const reduced = !ready || preference || systemReduced;
  useEffect(() => { document.documentElement.dataset.reduceEffects = String(reduced); }, [reduced]);
  function setPreference(value: boolean) {
    setSavedPreference(value);
    try { localStorage.setItem(key, String(value)); } catch { /* Still applies for this session. */ }
  }
  return <EffectsContext.Provider value={{reduced, preference, systemReduced, ready, setPreference}}>{children}</EffectsContext.Provider>;
}

export function useEffects() { return useContext(EffectsContext); }

export function EffectsSetting() {
  const {preference, systemReduced, ready, setPreference} = useEffects();
  return <div className="effects-setting"><label><input type="checkbox" checked={preference} disabled={!ready} onChange={event => setPreference(event.target.checked)}/><span><strong>Reduce effects</strong><small>Keep completion messages, with no confetti or movement.</small></span></label><p>{systemReduced ? 'Your device’s reduced-motion setting is active.' : 'Your device’s reduced-motion preference is always respected.'}</p></div>;
}
