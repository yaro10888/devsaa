import { useState, useEffect, useLayoutEffect, useRef, useCallback } from './html.js';

// ---------------------------------------------------------------- app state
const state = {
  ready: false,
  session: null,
  profile: null,
  settings: null,
  authBusy: false,
  gateLeaving: false,
};
const listeners = new Set();
let version = 0;

export const getState = () => state;

export function setState(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  version++;
  listeners.forEach((fn) => fn());
}

// Subscribes synchronously after render, and catches up on any change that
// landed between render and subscription (e.g. a fast auth/session response).
export function useAppState() {
  const [, force] = useState(0);
  const seen = useRef(version);
  seen.current = version;
  useLayoutEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    if (seen.current !== version) fn();
    return () => listeners.delete(fn);
  }, []);
  return state;
}

export const isAdmin = (p) => !!p && p.status === 'active' && (p.role === 'owner' || p.role === 'admin');
export const isOwner = (p) => !!p && p.status === 'active' && p.role === 'owner';

// ---------------------------------------------------------------- invalidation bus
const topics = new Map();
const timers = new Map();

export function invalidate(...keys) {
  for (const key of keys) {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => topics.get(key)?.forEach((fn) => fn()), 220));
  }
}

function subscribe(keys, fn) {
  keys.forEach((k) => {
    if (!topics.has(k)) topics.set(k, new Set());
    topics.get(k).add(fn);
  });
  return () => keys.forEach((k) => topics.get(k)?.delete(fn));
}

// ---------------------------------------------------------------- data hook
export function useQuery(fn, deps = [], keys = []) {
  const [st, setSt] = useState({ data: undefined, error: null, loading: true });
  const version = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (silent = false) => {
    const v = ++version.current;
    if (!silent) setSt((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (v === version.current) setSt({ data, error: null, loading: false });
    } catch (error) {
      console.error(error);
      if (v === version.current) setSt((s) => ({ ...s, error, loading: false }));
    }
  }, deps);

  useEffect(() => { load(); }, [load]);
  useEffect(() => (keys.length ? subscribe(keys, () => load(true)) : undefined), [load, keys.join('|')]);

  return {
    ...st,
    reload: () => load(true),
    setData: (d) => setSt((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })),
  };
}

export function useInterval(fn, ms) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!ms) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useInterval(() => setNow(Date.now()), ms);
  return now;
}
