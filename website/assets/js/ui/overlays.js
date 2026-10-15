import { html, useState, useEffect, useRef } from '../lib/html.js';
import { Icon } from './icons.js';
import { Modal, Button, Field, Textarea, Input } from './components.js';

// ---------------------------------------------------------------- toasts
let pushToast = () => {};
export function toast(tone, title, desc, ms = 4200) {
  pushToast({ id: Math.random().toString(36).slice(2), tone, title, desc, ms });
}
toast.ok = (t, d) => toast('ok', t, d);
toast.bad = (t, d) => toast('bad', t, d, 6000);
toast.info = (t, d) => toast('info', t, d);
toast.warn = (t, d) => toast('warn', t, d, 6000);

const TONE_ICON = { ok: 'check', bad: 'alert', info: 'bell', warn: 'alert' };

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    pushToast = (t) => {
      setItems((list) => [...list.slice(-3), t]);
      setTimeout(() => setItems((list) => list.map((x) => (x.id === t.id ? { ...x, out: true } : x))), t.ms);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.ms + 260);
    };
  }, []);
  return html`<div class="toasts" aria-live="polite">
    ${items.map((t) => html`<div key=${t.id} class=${`toast ${t.tone}${t.out ? ' out' : ''}`} role="status">
      <span class="ti"><${Icon} name=${TONE_ICON[t.tone] ?? 'info'} /></span>
      <div class="grow"><div class="tt">${t.title}</div>${t.desc && html`<div class="td">${t.desc}</div>`}</div>
      <i class="bar" style=${`animation-duration:${t.ms}ms`}></i>
    </div>`)}
  </div>`;
}

// ---------------------------------------------------------------- confirm / prompt
let pushDialog = () => {};

export function confirmDialog({ title, text, confirm = 'تأكيد', tone = 'primary' }) {
  return new Promise((resolve) => pushDialog({ kind: 'confirm', title, text, confirm, tone, resolve }));
}

export function promptDialog({ title, text, label, placeholder, confirm = 'تأكيد', tone = 'primary', required = true, multiline = true, minLength = 3 }) {
  return new Promise((resolve) => pushDialog({ kind: 'prompt', title, text, label, placeholder, confirm, tone, required, multiline, minLength, resolve }));
}

function PromptBody({ d, close }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 60); }, []);
  const submit = (e) => {
    e.preventDefault();
    if (d.required && value.trim().length < d.minLength) return setError(`اكتب ${d.minLength} أحرف على الأقل.`);
    d.resolve(value.trim());
    d.done = true;
    close();
  };
  return html`<form id="dlg-form" class="stack" onSubmit=${submit}>
    ${d.text && html`<p class="muted" style="margin:0">${d.text}</p>`}
    <${Field} label=${d.label} optional=${!d.required} error=${error}>
      ${d.multiline
        ? html`<${Textarea} ref=${ref} value=${value} placeholder=${d.placeholder} onInput=${(e) => { setValue(e.currentTarget.value); setError(''); }} rows="3" />`
        : html`<${Input} inputRef=${ref} value=${value} placeholder=${d.placeholder} onInput=${(e) => { setValue(e.currentTarget.value); setError(''); }} />`}
    </${Field}>
  </form>`;
}

export function DialogHost() {
  const [dialogs, setDialogs] = useState([]);
  useEffect(() => { pushDialog = (d) => setDialogs((l) => [...l, { ...d, id: Math.random() }]); }, []);
  return dialogs.map((d) => html`<${Modal} key=${d.id} title=${d.title}
    onClose=${() => { if (!d.done) d.resolve(d.kind === 'confirm' ? false : null); setDialogs((l) => l.filter((x) => x !== d)); }}
    footer=${(close) => html`
      <${Button} variant="ghost" onClick=${close}>إلغاء</${Button}>
      ${d.kind === 'confirm'
        ? html`<${Button} variant=${d.tone} onClick=${() => { d.done = true; d.resolve(true); close(); }}>${d.confirm}</${Button}>`
        : html`<${Button} variant=${d.tone} type="submit" form="dlg-form">${d.confirm}</${Button}>`}`}>
    ${(close) => (d.kind === 'confirm' ? html`<p class="muted" style="margin:0">${d.text}</p>` : html`<${PromptBody} d=${d} close=${close} />`)}
  </${Modal}>`);
}

// ---------------------------------------------------------------- lightbox
let pushLightbox = () => {};
export const openLightbox = (src) => pushLightbox(src);

export function LightboxHost() {
  const [src, setSrc] = useState(null);
  useEffect(() => { pushLightbox = setSrc; }, []);
  useEffect(() => {
    if (!src) return;
    const k = (e) => e.key === 'Escape' && setSrc(null);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [src]);
  return src ? html`<div class="lightbox" onClick=${() => setSrc(null)}><img src=${src} alt="" /></div>` : null;
}
