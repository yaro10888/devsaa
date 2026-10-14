import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { errorText } from '../../lib/errors.js';
import { Icon } from '../../ui/icons.js';
import { Button, Field, Input, Select, Modal, SkeletonRows, Empty, ErrorBox } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';

const COLORS = ['#FF7A2F', '#FBBF24', '#3DDC97', '#64A8FF', '#A78BFA', '#F472B6', '#F87171', '#94A3B8', '#22D3EE', '#ECEEF1'];

export function Ranks() {
  const ranks = useQuery(() => api.ranks(), [], ['ranks']);
  const people = useQuery(() => admin.profiles(), [], ['profiles']);
  const [editing, setEditing] = useState(null);
  const counts = useMemo(() => {
    const c = {};
    for (const p of people.data ?? []) if (p.rank_id) c[p.rank_id] = (c[p.rank_id] ?? 0) + 1;
    return c;
  }, [people.data]);

  const remove = async (r) => {
    if (!(await confirmDialog({ title: `حذف رتبة ${r.name}`, text: 'ستُزال الرتبة من كل من يحملها (ومن الديسكورد إن كانت مربوطة).', confirm: 'حذف', tone: 'danger' }))) return;
    try {
      await admin.deleteRank(r.id);
      toast.ok('تم حذف الرتبة');
      ranks.reload();
      invalidate('profiles');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر الحذف', errorText(err));
    }
  };

  return html`<div class="page">
    <${PageHead} title="الرتب" sub="رتب داخلية للمطوّرين (مثل Junior و Senior). يمكن ربط كل رتبة برتبة في الديسكورد ليعطيها البوت تلقائياً."
      actions=${html`<${Button} variant="primary" icon="plus" onClick=${() => setEditing({})}>رتبة جديدة</${Button}>`} />
    ${ranks.error ? html`<${ErrorBox} error=${ranks.error} onRetry=${ranks.reload} />`
      : ranks.loading && !ranks.data ? html`<${SkeletonRows} n=${3} />`
      : !ranks.data?.length ? html`<${Empty} title="لا توجد رتب بعد" text="أنشئ أول رتبة ثم أعطها للمطوّرين من صفحة الحسابات." action=${html`<${Button} size="sm" variant="primary" icon="plus" onClick=${() => setEditing({})}>رتبة جديدة</${Button}>`} />`
      : html`<div class="task-grid">${ranks.data.map((r, i) => html`<div class="card card-pad stack stack-sm spot" style=${`--i:${i};animation:fadeUp .4s var(--ease-out) both;animation-delay:${i * 40}ms`} key=${r.id}>
          <div class="row between"><span class="rank-tag" style=${`color:${r.color};height:28px;font-size:13px`}><${Icon} name="star" size="13" />${r.name}</span><span class="faint" style="font-size:12.5px">${counts[r.id] ?? 0} مطوّر</span></div>
          <div class="hint">${r.discord_role_id ? html`مربوطة برتبة ديسكورد <span class="mono">${r.discord_role_id}</span>` : 'غير مربوطة بالديسكورد'}</div>
          <div class="row" style="gap:6px"><${Button} size="sm" icon="edit" onClick=${() => setEditing(r)}>تعديل</${Button}><${Button} size="sm" variant="ghost" icon="trash" onClick=${() => remove(r)}>حذف</${Button}></div>
        </div>`)}</div>`}
    ${editing && html`<${RankForm} rank=${editing} onClose=${() => setEditing(null)} onSaved=${() => { ranks.reload(); invalidate('profiles'); }} />`}
  </div>`;
}

function RankForm({ rank, onClose, onSaved }) {
  const [f, setF] = useState({ id: rank.id, name: rank.name ?? '', color: rank.color ?? COLORS[0], discord_role_id: rank.discord_role_id ?? '', position: rank.position ?? 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const roles = useQuery(async () => {
    const s = await admin.settings();
    if (!s?.guild_id) return [];
    const meta = await admin.bot('guild_meta', { guild_id: s.guild_id });
    return meta.roles ?? [];
  }, []);

  const save = async (close) => {
    if (!f.name.trim()) return setError('اكتب اسم الرتبة.');
    setBusy(true);
    setError('');
    try {
      await admin.saveRank(f);
      toast.ok('تم حفظ الرتبة');
      onSaved();
      close();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return html`<${Modal} title=${rank.id ? 'تعديل الرتبة' : 'رتبة جديدة'} onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" loading=${busy} onClick=${() => save(close)}>حفظ</${Button}>`}>
    <div class="stack">
      <div class="grid-2">
        <${Field} label="اسم الرتبة"><${Input} maxLength="40" value=${f.name} onInput=${(e) => setF({ ...f, name: e.currentTarget.value })} placeholder="مثال: Senior Builder" /></${Field}>
        <${Field} label="الترتيب" hint="الأعلى يظهر أولاً."><${Input} ltr type="number" value=${f.position} onInput=${(e) => setF({ ...f, position: e.currentTarget.value })} /></${Field}>
      </div>
      <${Field} label="اللون"><div class="swatches">${COLORS.map((c) => html`<button type="button" class="swatch" style=${`background:${c}`} aria-label=${c} aria-pressed=${String(f.color.toUpperCase() === c)} onClick=${() => setF({ ...f, color: c })}></button>`)}</div></${Field}>
      <${Field} label="رتبة الديسكورد المرتبطة" optional hint="يجب أن تكون رتبة البوت أعلى منها في إعدادات السيرفر.">
        ${roles.data?.length
          ? html`<${Select} value=${f.discord_role_id} onChange=${(e) => setF({ ...f, discord_role_id: e.currentTarget.value })} placeholder="بدون ربط" options=${roles.data.map((r) => ({ value: r.id, label: r.name }))} />`
          : html`<${Input} ltr value=${f.discord_role_id} onInput=${(e) => setF({ ...f, discord_role_id: e.currentTarget.value.trim() })} placeholder=${roles.loading ? 'جارٍ تحميل الرتب…' : 'Role ID (اختياري)'} />`}
      </${Field}>
      <div class="row" style="gap:8px"><span class="faint">معاينة:</span><span class="rank-tag" style=${`color:${f.color}`}><${Icon} name="star" size="12" />${f.name || 'اسم الرتبة'}</span></div>
      ${error && html`<div class="error-text"><${Icon} name="info" size="14" />${error}</div>`}
    </div>
  </${Modal}>`;
}
