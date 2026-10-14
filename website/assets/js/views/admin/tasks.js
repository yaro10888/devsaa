import { html, useState, useMemo, useEffect } from '../../lib/html.js';
import { sb } from '../../lib/sb.js';
import { useQuery, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { setQuery } from '../../lib/router.js';
import { errorText } from '../../lib/errors.js';
import { SPECS, CURRENCIES, CURRENCY_KEYS, specAr, taskNo, date, safeName, fileSize } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Button, Input, Select, Textarea, Seg, Switch, Tabs, Field, Modal, Drawer, FileDrop, Due, SkeletonRows, Empty, ErrorBox, Skeleton } from '../../ui/components.js';
import { confirmDialog, promptDialog, toast, openLightbox } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { TaskStatus, Price, TaskFacts, TaskImages, SubmissionCard, isLate } from '../../ui/domain.js';

export function AdminTasks({ route }) {
  const q = useQuery(() => admin.tasks(), [], ['tasks', 'submissions']);
  const [tab, setTab] = useState(route.query.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const open = route.query.get('task');

  const all = q.data ?? [];
  const counts = useMemo(() => {
    const c = { all: all.length, open: 0, in_progress: 0, submitted: 0, completed: 0, cancelled: 0, late: 0 };
    for (const t of all) { c[t.status]++; if (isLate(t)) c.late++; }
    return c;
  }, [all]);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((t) => (tab === 'all' || (tab === 'late' ? isLate(t) : t.status === tab))
      && (!s || [t.title, t.assignee_name, String(t.seq)].some((v) => String(v ?? '').toLowerCase().includes(s))));
  }, [all, tab, search]);

  return html`<div class="page">
    <${PageHead} title="المهام" sub="أنشئ المهام، راجع التسليمات، وتابع حالة كل مهمة."
      actions=${html`<${Button} variant="primary" icon="plus" onClick=${() => setCreating(true)}>مهمة جديدة</${Button}>`} />
    <${Tabs} value=${tab} onChange=${setTab} tabs=${[
      { value: 'all', label: 'الكل', count: counts.all },
      { value: 'submitted', label: 'بانتظار المراجعة', count: counts.submitted },
      { value: 'in_progress', label: 'قيد التنفيذ', count: counts.in_progress },
      { value: 'late', label: 'متأخرة', count: counts.late },
      { value: 'open', label: 'متاحة', count: counts.open },
      { value: 'completed', label: 'مكتملة', count: counts.completed },
      { value: 'cancelled', label: 'ملغاة', count: counts.cancelled },
    ]} />
    <div class="toolbar section" style="margin-top:14px"><${Input} icon="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} placeholder="بحث بالعنوان أو المطوّر أو الرقم…" /></div>
    <section class="card">
      ${q.error ? html`<div class="card-body"><${ErrorBox} error=${q.error} onRetry=${q.reload} /></div>`
        : q.loading && !q.data ? html`<${SkeletonRows} n=${6} />`
        : list.length === 0 ? html`<${Empty} title="لا توجد مهام هنا" text=${tab === 'all' ? 'ابدأ بإنشاء أول مهمة.' : null}
            action=${tab === 'all' ? html`<${Button} size="sm" variant="primary" icon="plus" onClick=${() => setCreating(true)}>مهمة جديدة</${Button}>` : null} />`
        : html`<div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>المهمة</th><th class="hide-sm">النشر</th><th>المطوّر</th><th>المكافأة</th><th>الحالة</th><th class="hide-sm">المدة</th></tr></thead>
          <tbody>${list.map((t, i) => html`<tr key=${t.id} class="clickable" style=${`--i:${i}`} onClick=${() => setQuery('task', t.id)}>
            <td class="mono faint nowrap">${taskNo(t.seq)}</td>
            <td style="min-width:200px"><b>${t.title}</b><div class="faint" style="font-size:12px">${specAr(t.task_type)}</div></td>
            <td class="hide-sm">${t.scope === 'general' ? 'عامة' : 'مخصّصة'}</td>
            <td>${t.assignee_name ?? html`<span class="faint">—</span>`}</td>
            <td class="nowrap"><${Price} amount=${t.price_amount} currency=${t.price_currency} /></td>
            <td><${TaskStatus} task=${t} /></td>
            <td class="hide-sm nowrap"><${Due} task=${t} compact /></td>
          </tr>`)}</tbody>
        </table></div>`}
    </section>
    ${creating && html`<${TaskFormModal} onClose=${() => setCreating(false)} />`}
    ${open && html`<${AdminTaskDrawer} key=${open} id=${open} onClose=${() => setQuery('task', null)} />`}
  </div>`;
}

// ---------------------------------------------------------------- create
export function TaskFormModal({ onClose, presetAssignee }) {
  const devs = useQuery(() => admin.activeDevelopers(), [], ['profiles']);
  const [f, setF] = useState({
    title: '', task_type: 'builder', description: '', price: '', currency: 'ROBUX',
    hasDeadline: true, amount: '3', unit: 'day', scope: presetAssignee ? 'direct' : 'general', assignee: presetAssignee ?? '',
  });
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e?.currentTarget ? e.currentTarget.value : e });
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const addImages = (files) => {
    const next = [...images];
    for (const file of files) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setError('الصور فقط (PNG, JPG, WEBP, GIF).'); continue; }
      if (file.size > 8 * 1024 * 1024) { setError(`الصورة ${file.name} أكبر من 8MB.`); continue; }
      if (next.length >= 4) { setError('الحد الأقصى 4 صور.'); break; }
      next.push({ file, url: URL.createObjectURL(file), key: Math.random() });
    }
    setImages(next);
  };

  const minutes = f.hasDeadline ? Math.round(Number(f.amount) * (f.unit === 'day' ? 1440 : 60)) : null;

  const submit = async (close) => {
    setError('');
    if (f.title.trim().length < 3) return setError('العنوان 3 أحرف على الأقل.');
    if (!f.description.trim()) return setError('اكتب شرح المهمة.');
    if (f.price === '' || Number(f.price) < 0) return setError('اكتب السعر (0 إذا كانت بدون مقابل).');
    if (f.hasDeadline && !(minutes >= 15)) return setError('المدة غير صالحة.');
    if (f.scope === 'direct' && !f.assignee) return setError('اختر المطوّر.');
    setBusy(true);
    const uploaded = [];
    try {
      for (const img of images) {
        const path = `${crypto.randomUUID()}/${safeName(img.file.name)}`;
        const { error: upErr } = await sb.storage.from('task-images').upload(path, img.file, { contentType: img.file.type, upsert: false });
        if (upErr) throw upErr;
        uploaded.push(path);
      }
      const t = await admin.createTask({
        title: f.title.trim(), task_type: f.task_type, description: f.description.trim(), price: f.price, currency: f.currency,
        duration_minutes: minutes, images: uploaded, scope: f.scope, assignee: f.scope === 'direct' ? f.assignee : null,
      });
      toast.ok(`تم نشر المهمة ${taskNo(t.seq)}`, f.scope === 'general' ? 'أُرسلت إلى روم المهام العامة.' : 'أُرسلت إلى روم مهام المطوّر.');
      invalidate('tasks', 'activity');
      admin.kickWorker();
      close();
    } catch (err) {
      if (uploaded.length) sb.storage.from('task-images').remove(uploaded);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return html`<${Modal} title="مهمة جديدة" sub="تُنشر فوراً في الموقع والديسكورد." onClose=${onClose} wide
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" icon="send" loading=${busy} onClick=${() => submit(close)}>نشر المهمة</${Button}>`}>
    <div class="stack">
      <${Field} label="لمن المهمة؟">
        <${Seg} block value=${f.scope} onChange=${set('scope')} options=${[{ value: 'general', label: 'عامة — أول من يستلمها', icon: 'market' }, { value: 'direct', label: 'لمطوّر محدد', icon: 'user' }]} />
      </${Field}>
      ${f.scope === 'direct' && html`<${Field} label="المطوّر">
        <${Select} value=${f.assignee} onChange=${set('assignee')} placeholder=${devs.loading ? 'جارٍ التحميل…' : 'اختر المطوّر'}
          options=${(devs.data ?? []).map((p) => ({ value: p.id, label: `${p.display_name} — ${specAr(p.specialization)}` }))} />
      </${Field}>`}
      <div class="grid-2">
        <${Field} label="عنوان المهمة"><${Input} value=${f.title} maxLength="120" onInput=${set('title')} placeholder="مثال: بناء لوبي بطابع صحراوي" /></${Field}>
        <${Field} label="نوع المهمة"><${Select} value=${f.task_type} onChange=${set('task_type')} options=${SPECS.map((s) => ({ value: s.key, label: s.ar }))} /></${Field}>
      </div>
      <${Field} label="شرح المهمة"><${Textarea} rows="5" maxLength="4000" value=${f.description} onInput=${set('description')} placeholder="المطلوب بالتفصيل، المقاسات، الستايل، وأي ملاحظات…" /></${Field}>
      <div class="grid-2">
        <${Field} label="السعر"><${Input} ltr type="number" min="0" step="0.01" value=${f.price} onInput=${set('price')} placeholder="0" /></${Field}>
        <${Field} label="العملة"><${Seg} block value=${f.currency} onChange=${set('currency')} options=${CURRENCY_KEYS.map((c) => ({ value: c, label: CURRENCIES[c].ar }))} /></${Field}>
      </div>
      <${Field} label="المدة" hint=${f.hasDeadline ? (f.scope === 'general' ? 'تبدأ المدة من لحظة استلام المطوّر للمهمة.' : 'تبدأ المدة من الآن.') : 'بدون موعد نهائي.'}>
        <div class="row row-wrap">
          <${Switch} checked=${f.hasDeadline} onChange=${(v) => setF({ ...f, hasDeadline: v })} label="لها مدة محددة" />
          ${f.hasDeadline && html`<div class="row" style="gap:8px">
            <div style="width:96px"><${Input} ltr type="number" min="1" value=${f.amount} onInput=${set('amount')} /></div>
            <${Seg} value=${f.unit} onChange=${set('unit')} options=${[{ value: 'hour', label: 'ساعات' }, { value: 'day', label: 'أيام' }]} />
          </div>`}
        </div>
      </${Field}>
      <${Field} label="صور توضيحية" optional>
        <div class="stack stack-sm">
          ${images.length < 4 && html`<${FileDrop} accept="image/png,image/jpeg,image/webp,image/gif" onFiles=${addImages} title="أضف صوراً للمهمة" hint="حتى 4 صور — 8MB للصورة" disabled=${busy} />`}
          ${images.length > 0 && html`<div class="thumbs">${images.map((img) => html`<div class="thumb" key=${img.key}>
            <img src=${img.url} alt="" onClick=${() => openLightbox(img.url)} />
            ${!busy && html`<button type="button" class="x" aria-label="إزالة" onClick=${() => { URL.revokeObjectURL(img.url); setImages(images.filter((x) => x !== img)); }}><${Icon} name="x" /></button>`}
          </div>`)}</div>`}
        </div>
      </${Field}>
      ${error && html`<div class="error-text"><${Icon} name="info" size="14" />${error}</div>`}
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- detail
export function AdminTaskDrawer({ id, onClose }) {
  const task = useQuery(() => api.task(id), [id], ['tasks']);
  const subs = useQuery(() => api.taskSubmissions(id), [id], ['submissions']);
  const [busy, setBusy] = useState('');
  const t = task.data;

  const review = async (sub, decision) => {
    let note = null;
    if (decision === 'rejected') {
      note = await promptDialog({ title: 'رفض التسليم', text: 'اكتب للمطوّر ما الذي يحتاج تعديل — يصله على الموقع وفي سجلّه بالديسكورد.', label: 'المطلوب تعديله', confirm: 'إرسال الرفض', tone: 'danger' });
      if (note == null) return;
    } else {
      note = await promptDialog({ title: 'قبول التسليم', text: `ستُضاف المكافأة إلى مستحقات ${t.assignee_name ?? 'المطوّر'} وتُغلق المهمة.`, label: 'ملاحظة للمطوّر', confirm: 'قبول', tone: 'ok', required: false, minLength: 0 });
      if (note == null) return;
    }
    setBusy(sub.id + decision);
    try {
      await admin.review(sub.id, decision, note);
      toast.ok(decision === 'approved' ? 'تم قبول التسليم' : 'تم إرسال الرفض');
      invalidate('tasks', 'submissions', 'ledger', 'activity');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر الحفظ', errorText(err));
    } finally {
      setBusy('');
    }
  };

  const cancel = async () => {
    const reason = await promptDialog({ title: `إلغاء المهمة ${taskNo(t.seq)}`, text: 'ستُغلق المهمة ولن تقبل تسليمات.', label: 'سبب الإلغاء', confirm: 'إلغاء المهمة', tone: 'danger', required: false, minLength: 0 });
    if (reason == null) return;
    setBusy('cancel');
    try {
      await admin.cancelTask(t.id, reason);
      toast.ok('تم إلغاء المهمة');
      invalidate('tasks', 'activity');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر الإلغاء', errorText(err));
    } finally {
      setBusy('');
    }
  };

  return html`<${Drawer} onClose=${onClose}
    head=${html`<div class="grow row" style="gap:10px">${t ? html`<span class="mono faint">${taskNo(t.seq)}</span><${TaskStatus} task=${t} />` : html`<${Skeleton} h=${20} w=${140} />`}</div>`}
    footer=${t && !['completed', 'cancelled'].includes(t.status) && html`<${Button} variant="danger" icon="x" loading=${busy === 'cancel'} onClick=${cancel}>إلغاء المهمة</${Button}>`}>
    ${task.error ? html`<${ErrorBox} error=${task.error} onRetry=${task.reload} />`
      : !t ? html`<div class="stack"><${Skeleton} h=${26} w="70%" /><${Skeleton} h=${120} /></div>`
      : html`<div class="stack stack-lg">
        <h2 style="margin:0;font-family:var(--font-display);font-size:21px;line-height:1.4">${t.title}</h2>
        <${TaskFacts} task=${t} />
        <section class="stack stack-sm"><div class="label">شرح المهمة</div><div class="prose">${t.description}</div></section>
        ${t.images?.length > 0 && html`<section class="stack stack-sm"><div class="label">الصور</div><${TaskImages} paths=${t.images} /></section>`}
        ${t.cancel_reason && html`<div class="callout"><${Icon} name="info" /><div><b>سبب الإلغاء:</b> ${t.cancel_reason}</div></div>`}
        <section class="stack stack-sm">
          <div class="label">التسليمات ${subs.data?.length ? `(${subs.data.length})` : ''}</div>
          ${subs.loading && !subs.data ? html`<${Skeleton} h=${100} />`
            : !subs.data?.length ? html`<div class="hint">لم يُسلَّم شيء بعد.</div>`
            : subs.data.map((s) => html`<${SubmissionCard} key=${s.id} sub=${s}
                actions=${s.status === 'pending' && html`<div class="row" style="gap:8px">
                  <${Button} variant="ok" icon="check" loading=${busy === s.id + 'approved'} onClick=${() => review(s, 'approved')}>قبول</${Button}>
                  <${Button} variant="danger" icon="x" loading=${busy === s.id + 'rejected'} onClick=${() => review(s, 'rejected')}>رفض</${Button}>
                </div>`} />`)}
        </section>
      </div>`}
  </${Drawer}>`;
}
