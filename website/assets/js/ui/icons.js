import { html } from '../lib/html.js';

// Line icons, 24×24 grid, 1.75 stroke.
const P = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  tasks: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1ZM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12l2 2 4-4M9 17h6',
  market: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5',
  alert: 'M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.5v.01',
  wallet: 'M4 7a2 2 0 0 1 2-2h11v4M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2ZM16 14.5h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1a4 4 0 0 0-3-3.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  chevL: 'm15 6-6 6 6 6',
  chevR: 'm9 6 6 6-6 6',
  chevD: 'm6 9 6 6 6-6',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5',
  image: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM4 16l4.5-4.5 4 4 2.5-2.5L20 18M15.5 8.5h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM3.5 7l8.5 6 8.5-6',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V8a4 4 0 0 1 8 0v3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 1.5M10 2h4',
  coins: 'M9 10c3.3 0 6-1.3 6-3s-2.7-3-6-3-6 1.3-6 3 2.7 3 6 3ZM3 7v5c0 1.7 2.7 3 6 3M3 12v5c0 1.7 2.7 3 6 3M15 13c3.3 0 6-1.3 6-3M15 13c-3.3 0-6 1.3-6 3s2.7 3 6 3 6-1.3 6-3v-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  eye: 'M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19c1.6 0 3-.4 4.3-1',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  bot: 'M12 4v3M7 8h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3ZM9 13v1.5M15 13v1.5M2 13v3M22 13v3',
  hash: 'M5 9h15M4 15h15M10 3 8 21M16 3l-2 18',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
  menu: 'M4 7h16M4 12h16M4 17h10',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8v.01',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0',
  cube: 'M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3ZM12 12l8-4.5M12 12v9M12 12 4 7.5',
  code: 'm8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14',
  shapes: 'M8.5 3 13 11H4l4.5-8ZM17 21a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 14h7v7H4v-7Z',
  layout: 'M4 4h16v16H4V4ZM4 9h16M10 9v11',
  film: 'M4 4h16v16H4V4ZM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  flame: 'M12 21c4 0 7-2.8 7-6.7 0-4.3-3.6-6.6-4.5-10.3-2.3 1.4-3.5 3.6-3.5 5.5C9.8 8 8.9 7 8.5 5.7 6.4 7.7 5 10.4 5 14.3 5 18.2 8 21 12 21Z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  money: 'M3 7h18v10H3V7ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v4M18 10v4',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  play: 'M7 5v14l11-7L7 5Z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  inbox: 'M3 13h5l1.5 3h5l1.5-3h5M5 5h14l2 8v6H3v-6l2-8Z',
  wrench: 'M15 5.5a4 4 0 0 0 5 5L13 17.5a2.8 2.8 0 0 1-4-4L15 5.5ZM14.5 4l5.5 5.5',
  tag: 'M3 12V4h8l9.5 9.5-8 8L3 12ZM7.5 8h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
};

export function Icon({ name, size, cls = '', title }) {
  const d = P[name] ?? P.dots;
  const style = size ? `width:${size}px;height:${size}px` : undefined;
  return html`<svg class=${cls} style=${style} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden=${title ? undefined : 'true'} role=${title ? 'img' : undefined}>${title ? html`<title>${title}</title>` : null}<path d=${d} /></svg>`;
}

export function DiscordIcon({ size = 18 }) {
  return html`<svg viewBox="0 0 24 24" style=${`width:${size}px;height:${size}px`} fill="currentColor" aria-hidden="true"><path d="M19.6 5.3A17.6 17.6 0 0 0 15.3 4l-.5 1.1a16.3 16.3 0 0 0-5 0L9.3 4a17.6 17.6 0 0 0-4.3 1.3C2.3 9.4 1.6 13.4 2 17.3A17.7 17.7 0 0 0 7.3 20l1.1-1.8c-.6-.2-1.2-.5-1.7-.9l.4-.3a12.6 12.6 0 0 0 10.8 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.8a17.7 17.7 0 0 0 5.3-2.7c.5-4.5-.8-8.5-3.4-12ZM8.7 14.9c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z"/></svg>`;
}

export function RobloxIcon({ size = 18 }) {
  return html`<svg viewBox="0 0 24 24" style=${`width:${size}px;height:${size}px`} fill="currentColor" aria-hidden="true"><path d="M6.6 2 2 19.2 17.4 23 22 5.8 6.6 2Zm7.6 13.4-4.6-1.2 1.2-4.6 4.6 1.2-1.2 4.6Z"/></svg>`;
}
