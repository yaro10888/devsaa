import { useState, useEffect } from './html.js';

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.split('/').filter(Boolean).join('/');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(queryPart) };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      document.querySelector('.main')?.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', onChange);
    if (parseHash().path !== route.path) setRoute(parseHash());
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) return;
  if (replace) history.replaceState(null, '', target), dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

export function setQuery(key, value) {
  const { path, query } = parseHash();
  if (value == null || value === '') query.delete(key);
  else query.set(key, value);
  const qs = query.toString();
  history.replaceState(null, '', '#' + path + (qs ? '?' + qs : ''));
  dispatchEvent(new HashChangeEvent('hashchange'));
}
