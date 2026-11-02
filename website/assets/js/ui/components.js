import { html, useState, useEffect, useRef, useCallback, useContext, useId, createContext, createPortal } from '../lib/html.js';
import { Icon } from './icons.js';
import { initials, num, remaining, duration as durationLabel } from '../lib/format.js';
import { useNow } from '../lib/store.js';

// ---------------------------------------------------------------- scroll lock (nested overlays)
let locks = 0;
function lockScroll() {
  locks++;
  document.documentElement.style.overflow = 'hidden';
  return () => {
    locks = Math.max(0, locks - 1);
    if (!locks) document.documentElement.style.overflow = '';
  };
}

// ---------------------------------------------------------------- buttons
export function Button({ variant = '', size = '', icon, iconEnd, loading, block, class: cls = '', children, type = 'button', ...rest }) {
  const classes = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', loading && 'is-loading', cls].filter(Boolean).join(' ');
  return html`<button type=${type} class=${classes} disabled=${loading || rest.disabled} aria-busy=${loading ? 'true' : undefined} ...${rest}>
    ${icon && html`<${Icon} name=${icon} />`}
    ${children != null && children !== false && html`<span>${children}</span>`}
    ${iconEnd && html`<${Icon} name=${iconEnd} />`}
    ${loading && html`<i class="spin"></i>`}
  </button>`;
}

export function IconButton({ icon, label, variant = 'ghost', size = 'sm', ...rest }) {
  return html`<button type="button" class=${`btn btn-${variant} btn-icon ${size ? 'btn-' + size : ''}`} aria-label=${label} title=${label} ...${rest}><${Icon} name=${icon} /></button>`;
}

export const Spinner = ({ size = 18 }) => html`<i class="spin" style=${`width:${size}px;height:${size}px`}></i>`;

// ---------------------------------------------------------------- form fields
const FieldId = createContext(null);

export function Field({ label, optional, hint, error, children, class: cls = '' }) {
  const id = useId();
  return html`<div class=${'field ' + cls}>
    ${label && html`<label for=${id}>${label}${optional && html` <span class="opt">(اختياري)</span>`}</label>`}
    <${FieldId.Provider} value=${id}>${children}</${FieldId.Provider}>
    ${error ? html`<div class="error-text" role="alert"><${Icon} name="info" size="14" />${error}</div>` : hint ? html`<div class="hint">${hint}</div>` : null}
  </div>`;
}

export function Input({ icon, iconEl, ltr, invalid, inputRef, action, id, class: cls = '', ...rest }) {
  const fieldId = useContext(FieldId);
  const input = html`<input id=${id ?? fieldId ?? undefined} class=${'input ' + cls} dir=${ltr ? 'ltr' : undefined} aria-invalid=${invalid ? 'true' : undefined} ref=${inputRef} ...${rest} />`;
  if (!icon && !iconEl && !action) return input;
  return html`<div class="input-wrap">${icon ? html`<${Icon} name=${icon} />` : iconEl && html`<span class="input-ico">${iconEl}</span>`}${input}${action && html`<div class="input-action">${action}</div>`}</div>`;
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return html`<${Input} icon="lock" ltr type=${show ? 'text' : 'password'} autocomplete=${props.autocomplete ?? 'current-password'} ...${props}
    action=${html`<button type="button" class="btn btn-ghost btn-icon btn-sm" onClick=${() => setShow(!show)} aria-label=${show ? 'إخفاء' : 'إظهار'}><${Icon} name=${show ? 'eyeOff' : 'eye'} /></button>`} />`;
}

export function Select({ options = [], placeholder, invalid, id, class: cls = '', ...rest }) {
  const fieldId = useContext(FieldId);
  return html`<select id=${id ?? fieldId ?? undefined} class=${'select ' + cls} aria-invalid=${invalid ? 'true' : undefined} ...${rest}>
    ${placeholder != null && html`<option value="">${placeholder}</option>`}
    ${options.map((o) => html`<option value=${o.value} disabled=${o.disabled}>${o.label}</option>`)}
  </select>`;
}

export function Textarea({ invalid, id, class: cls = '', ...rest }) {
  const fieldId = useContext(FieldId);
  return html`<textarea id=${id ?? fieldId ?? undefined} class=${'textarea ' + cls} aria-invalid=${invalid ? 'true' : undefined} ...${rest}></textarea>`;
}

export function Seg({ value, onChange, options, accent, block }) {
  return html`<div class=${'seg' + (accent ? ' accent' : '') + (block ? ' block' : '')} role="group">
    ${options.map((o) => html`<button type="button" aria-pressed=${String(value === o.value)} onClick=${() => onChange(o.value)}>
      ${o.icon && html`<${Icon} name=${o.icon} size="15" />`}${o.label}</button>`)}
  </div>`;
}

export function Switch({ checked, onChange, label }) {
  return html`<label class="switch"><input type="checkbox" checked=${checked} onChange=${(e) => onChange(e.currentTarget.checked)} />${label && html`<span>${label}</span>`}</label>`;
}

export function Tabs({ value, onChange, tabs }) {
  return html`<div class="tabs" role="tablist">
    ${tabs.map((t) => html`<button type="button" class="tab" role="tab" aria-selected=${String(value === t.value)} onClick=${() => onChange(t.value)}>
      ${t.label}${t.count != null && html`<span class="count">${t.count}</span>`}</button>`)}
  </div>`;
}

// ---------------------------------------------------------------- display
export function Badge({ tone = '', plain, pulse, children }) {
  return html`<span class=${['badge', tone, plain && 'plain', pulse && 'pulse'].filter(Boolean).join(' ')}>${children}</span>`;
}

export function Avatar({ src, name, size = '' }) {
  const [broken, setBroken] = useState(false);
  return html`<span class=${'avatar ' + size}>
    ${src && !broken ? html`<img src=${src} alt="" loading="lazy" referrerpolicy="no-referrer" onError=${() => setBroken(true)} />` : initials(name)}
  </span>`;
}

export function RankTag({ rank }) {
  if (!rank) return null;
  return html`<span class="rank-tag" style=${`color:${rank.color}`}><${Icon} name="star" size="12" />${rank.name}</span>`;
}

export function CountUp({ value, decimals = 0 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const target = Number(value || 0);
    const start = from.current;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || start === target) {
      from.current = target;
      setShown(target);
      return;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 750);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [value]);
  return html`<span>${num(decimals ? shown : Math.round(shown))}</span>`;
}

export function Stat({ label, icon, tone = '', value, suffix, foot, children }) {
  return html`<div class=${'card stat spot ' + tone}>
    <div class="k"><span>${label}</span><span class="ic"><${Icon} name=${icon} /></span></div>
    <div class="v">${children ?? html`<${CountUp} value=${value} />`}${suffix && html`<small>${suffix}</small>`}</div>
    ${foot && html`<div class="foot">${foot}</div>`}
  </div>`;
}

export function Due({ task, compact }) {
  const now = useNow(30000);
  if (!task.duration_minutes) return html`<span class="due"><${Icon} name="timer" />بدون مدة</span>`;
  if (!task.due_at) return html`<span class="due"><${Icon} name="timer" />${compact ? '' : 'المدة: '}${durationLabel(task.duration_minutes)}</span>`;
  if (!['in_progress', 'submitted'].includes(task.status)) return html`<span class="due"><${Icon} name="calendar" />${new Date(task.due_at).toLocaleDateString('ar-EG-u-nu-latn')}</span>`;
  const r = remaining(task.due_at, now);
  return html`<span class=${'due' + (r.late ? ' late' : r.soon ? ' soon' : '')}><${Icon} name="timer" />${r.late ? `متأخرة ${r.text}` : `متبقي ${r.text}`}</span>`;
}

export function Skeleton({ h = 14, w = '100%', r }) {
  return html`<div class="sk" style=${`height:${h}px;width:${typeof w === 'number' ? w + 'px' : w};${r ? `border-radius:${r}px` : ''}`}></div>`;
}
export function SkeletonCards({ n = 3, h = 150 }) {
  return html`<div class="task-grid">${Array.from({ length: n }, () => html`<div class="card card-pad stack"><${Skeleton} h=${12} w="30%" /><${Skeleton} h=${18} w="70%" /><${Skeleton} h=${12} /><${Skeleton} h=${h - 90} /></div>`)}</div>`;
}
export function SkeletonRows({ n = 5 }) {
  return html`<div class="card">${Array.from({ length: n }, () => html`<div class="list-row"><${Skeleton} h=${34} w=${34} r=${10} /><div class="grow stack stack-sm"><${Skeleton} h=${12} w="40%" /><${Skeleton} h=${10} w="65%" /></div></div>`)}</div>`;
}

export function CubeArt({ tone = 'accent' }) {
  const c = tone === 'muted' ? ['#3a404b', '#262b33', '#30353f'] : ['#ff9a5c', '#c9581b', '#e8692a'];
  return html`<svg class="art float" viewBox="0 0 84 84" aria-hidden="true">
    <ellipse cx="42" cy="74" rx="22" ry="5" fill="#000" opacity=".35" />
    <path d="M42 10 66 24v28L42 66 18 52V24z" fill=${c[2]} />
    <path d="M42 38 66 24v28L42 66z" fill=${c[1]} />
    <path d="M42 38v28L18 52V24z" fill=${c[2]} />
    <path d="M18 24 42 10l24 14-24 14z" fill=${c[0]} />
    <ellipse cx="42" cy="24" rx="8" ry="4.5" fill="#fff" opacity=".25" />
  </svg>`;
}

export function Empty({ title, text, action, tone }) {
  return html`<div class="empty"><${CubeArt} tone=${tone} /><h4>${title}</h4>${text && html`<p>${text}</p>`}${action}</div>`;
}

export function ErrorBox({ error, onRetry }) {
  return html`<div class="callout bad"><${Icon} name="alert" /><div class="grow">تعذّر تحميل البيانات. ${String(error?.message ?? '')}</div>${onRetry && html`<${Button} size="sm" onClick=${onRetry}>إعادة المحاولة</${Button}>`}</div>`;
}

// ---------------------------------------------------------------- overlays
function useEscape(fn) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && fn();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [fn]);
}

export function Modal({ title, sub, onClose, children, footer, wide, dismissable = true }) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (!dismissable) return;
    setClosing(true);
    setTimeout(() => onClose?.(), 170);
  }, [onClose, dismissable]);
  useEscape(close);
  useEffect(() => lockScroll(), []);
  return createPortal(html`<div class=${'overlay' + (closing ? ' closing' : '')} onMouseDown=${(e) => e.target === e.currentTarget && close()}>
    <div class=${'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label=${title}>
      <div class="modal-head">
        <div><h3>${title}</h3>${sub && html`<p>${sub}</p>`}</div>
        ${dismissable && html`<${IconButton} icon="x" label="إغلاق" onClick=${close} />`}
      </div>
      <div class="modal-body">${typeof children === 'function' ? children(close) : children}</div>
      ${footer && html`<div class="modal-foot">${typeof footer === 'function' ? footer(close) : footer}</div>`}
    </div>
  </div>`, document.body);
}

export function Drawer({ onClose, head, children, footer }) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose?.(), 200);
  }, [onClose]);
  useEscape(close);
  useEffect(() => lockScroll(), []);
  return createPortal(html`
    <div class=${'drawer-overlay' + (closing ? ' closing' : '')} onClick=${close}></div>
    <aside class=${'drawer' + (closing ? ' closing' : '')} role="dialog" aria-modal="true">
      <div class="drawer-head">${typeof head === 'function' ? head(close) : head}<${IconButton} icon="x" label="إغلاق" onClick=${close} /></div>
      <div class="drawer-body">${typeof children === 'function' ? children(close) : children}</div>
      ${footer && html`<div class="drawer-foot">${typeof footer === 'function' ? footer(close) : footer}</div>`}
    </aside>`, document.body);
}

// ---------------------------------------------------------------- file drop
export function FileDrop({ onFiles, accept, multiple = true, title = 'اسحب الملفات هنا أو اضغط للاختيار', hint, disabled }) {
  const [over, setOver] = useState(false);
  const pick = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles(files);
  };
  return html`<label class=${'drop' + (over ? ' over' : '')}
    onDragOver=${(e) => { e.preventDefault(); setOver(true); }}
    onDragLeave=${() => setOver(false)}
    onDrop=${(e) => { e.preventDefault(); setOver(false); if (!disabled) pick(e.dataTransfer.files); }}>
    <${Icon} name="upload" />
    <b>${title}</b>
    ${hint && html`<span class="hint">${hint}</span>`}
    <input type="file" accept=${accept} multiple=${multiple} disabled=${disabled} onChange=${(e) => { pick(e.currentTarget.files); e.currentTarget.value = ''; }} />
  </label>`;
}

// ---------------------------------------------------------------- copy
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
