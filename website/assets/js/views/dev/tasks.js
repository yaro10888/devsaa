import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery, invalidate } from '../../lib/store.js';
import { api, uploadFile, submissionPath } from '../../lib/api.js';
import { setQuery } from '../../lib/router.js';
import { errorText } from '../../lib/errors.js';
import { fileSize, taskNo } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Tabs, Drawer, Button, FileDrop, Field, Textarea, SkeletonCards, Empty, ErrorBox, Skeleton } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { TaskCard, TaskStatus, TaskImages, TaskFacts, SubmissionCard } from '../../ui/domain.js';

const MAX_FILE = 50 * 1024 * 1024;

export function MyTasks({ profile, route }) {
  const [tab, setTab] = useState('active');
  const q = useQuery(() => api.myTasks(profile.id), [profile.id], ['tasks', 'submissions']);
  const openId = route.query.get('open');
  const all = q.data ?? [];
  const groups = useMemo(() => ({
    active: all.filter((t) => t.status === 'in_progress'),
    review: all.filter((t) => t.status === 'submitted'),
    done: all.filter((t) => t.status === 'completed'),
    cancelled: all.filter((t) => t.status === 'cancelled'),
  }), [all]);
  const list = groups[tab];

  return html`<div class="page">
    <${PageHead} title="مهامي" sub="المهام المسندة إليك والتي استلمتها — سلّمها من هنا أو من روم مهامك في الديسكورد." />
    <${Tabs} value=${tab} onChange=${setTab} tabs=${[
      { value: 'active', label: 'قيد التنفيذ', count: groups.active.length },
      { value: 'review', label: 'قيد المراجعة', count: groups.review.length },
      { value: 'done', label: 'المكتملة', count: groups.done.length },
      { value: 'cancelled', label: 'الملغاة', count: groups.cancelled.length },
    ]} />
    <div class="section">
      ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
        : q.loading && !q.data ? html`<${SkeletonCards} n=${3} />`
        : list.length ? html`<div class="task-grid">${list.map((t, i) => html`<${TaskCard} key=${t.id} task=${t} i=${i} onOpen=${() => setQuery('open', t.id)} />`)}</div>`
        : html`<${Empty} title=${tab === 'active' ? 'لا توجد مهام قيد التنفيذ' : 'لا يوجد شيء هنا'} text=${tab === 'active' ? 'استلم مهمة من المهام المتاحة، أو انتظر مهمة من الإدارة.' : null}
            action=${tab === 'active' ? html`<a class="btn btn-sm" href="#/market">المهام المتاحة</a>` : null} />`}
    </div>
    ${openId && html`<${TaskDrawer} key=${openId} id=${openId} profile=${profile} onClose=${() => setQuery('open', null)} />`}
  </div>`;
}

export function TaskDrawer({ id, profile, onClose }) {
  const task = useQuery(() => api.task(id), [id], ['tasks']);
  const subs = useQuery(() => api.taskSubmissions(id), [id], ['submissions']);
  const t = task.data;
  const mine = t && t.assignee_id === profile.id;

  return html`<${Drawer} onClose=${onClose}
    head=${html`<div class="grow row" style="gap:10px;min-width:0">
      ${t ? html`<span class="mono faint">${taskNo(t.seq)}</span><${TaskStatus} task=${t} />` : html`<${Skeleton} h=${20} w=${140} />`}
    </div>`}>
    ${task.error ? html`<${ErrorBox} error=${task.error} onRetry=${task.reload} />`
      : !t ? html`<div class="stack"><${Skeleton} h=${26} w="70%" /><${Skeleton} h=${90} /><${Skeleton} h=${140} /></div>`
      : html`<div class="stack stack-lg">
        <div class="stack stack-sm">
          <h2 style="margin:0;font-family:var(--font-display);font-size:21px;line-height:1.4">${t.title}</h2>
        </div>
        <${TaskFacts} task=${t} />
        <section class="stack stack-sm"><div class="label">شرح المهمة</div><div class="prose">${t.description}</div></section>
        ${t.images?.length > 0 && html`<section class="stack stack-sm"><div class="label">الصور</div><${TaskImages} paths=${t.images} /></section>`}
        ${t.status === 'cancelled' && t.cancel_reason && html`<div class="callout"><${Icon} name="info" /><div><b>سبب الإلغاء:</b> ${t.cancel_reason}</div></div>`}
        ${mine && t.status === 'in_progress' && html`<${SubmitPanel} task=${t} profile=${profile} rejected=${subs.data?.[0]?.status === 'rejected' ? subs.data[0] : null} />`}
        ${subs.data?.length > 0 && html`<section class="stack stack-sm"><div class="label">التسليمات</div>${subs.data.map((s) => html`<${SubmissionCard} key=${s.id} sub=${s} />`)}</section>`}
      </div>`}
  </${Drawer}>`;
}

function SubmitPanel({ task, profile, rejected }) {
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = (list) => {
    setError('');
    const next = [...files];
    for (const f of list) {
      if (f.size > MAX_FILE) { setError(`الملف ${f.name} أكبر من 50MB.`); continue; }
      if (next.length >= 10) { setError('الحد الأقصى 10 ملفات.'); break; }
      next.push({ file: f, progress: 0, key: Math.random() });
    }
    setFiles(next);
  };

  const submit = async () => {
    if (!files.length) return setError('أرفق ملفاً واحداً على الأقل.');
    setBusy(true);
    setError('');
    try {
      const meta = [];
      for (const [i, item] of files.entries()) {
        const path = submissionPath(profile.id, task.id, item.file, i);
        await uploadFile('submissions', path, item.file, (p) => setFiles((l) => l.map((x) => (x.key === item.key ? { ...x, progress: p } : x))));
        meta.push({ path, name: item.file.name.slice(0, 120), size: item.file.size, type: item.file.type || null });
      }
      await api.submit(task.id, meta, note.trim());
      toast.ok('تم التسليم', 'تسليمك الآن قيد المراجعة.');
      setFiles([]);
      setNote('');
      invalidate('tasks', 'submissions', 'overview');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return html`<section class="card card-pad stack" style="border-color:var(--accent-line)">
    <div class="row" style="gap:12px"><span class="ibox accent"><${Icon} name="upload" /></span><div><b>تسليم المهمة</b><div class="hint">ارفع الملفات هنا، أو استخدم زر «تسليم المهمة» في الديسكورد.</div></div></div>
    ${rejected && html`<div class="callout bad"><${Icon} name="info" /><div><b>آخر تسليم يحتاج تعديل:</b> ${rejected.review_note}</div></div>`}
    <${FileDrop} onFiles=${add} disabled=${busy} hint="حتى 10 ملفات — 50MB للملف الواحد" />
    ${files.length > 0 && html`<div class="files">${files.map((x) => html`<div class="file" key=${x.key}>
      <span class="ico"><${Icon} name=${/^image\//.test(x.file.type) ? 'image' : 'file'} /></span>
      <div class="meta"><div class="n">${x.file.name}</div><div class="s">${fileSize(x.file.size)}</div>
        ${busy && html`<div class="progress" style="margin-top:6px"><i style=${`width:${Math.round(x.progress * 100)}%`}></i></div>`}</div>
      ${!busy && html`<button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="إزالة" onClick=${() => setFiles(files.filter((y) => y !== x))}><${Icon} name="x" /></button>`}
    </div>`)}</div>`}
    <${Field} label="ملاحظات للمراجِع" optional>
      <${Textarea} rows="3" maxLength="1000" value=${note} onInput=${(e) => setNote(e.currentTarget.value)} placeholder="أي تفاصيل تحب توضحها…" disabled=${busy} />
    </${Field}>
    ${error && html`<div class="error-text"><${Icon} name="info" size="14" />${error}</div>`}
    <${Button} variant="primary" icon="send" loading=${busy} onClick=${submit} disabled=${!files.length}>تسليم</${Button}>
  </section>`;
}
