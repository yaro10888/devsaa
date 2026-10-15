import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { errorText } from '../../lib/errors.js';
import { Button, Seg, SkeletonRows, Empty, ErrorBox, Avatar } from '../../ui/components.js';
import { promptDialog, toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { WarningCard } from '../../ui/domain.js';
import { WarnModal } from './modals.js';

export function AdminWarnings() {
  const q = useQuery(async () => {
    const warnings = await admin.warnings();
    const ids = [...new Set(warnings.flatMap((w) => w.task_ids ?? []))];
    return { warnings, tasks: await api.tasksByIds(ids).catch(() => []) };
  }, [], ['warnings']);
  const [filter, setFilter] = useState('active');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState('');
  const list = useMemo(() => (q.data?.warnings ?? []).filter((w) => filter === 'all' || (filter === 'active' ? w.status === 'active' : w.status === 'revoked')), [q.data, filter]);

  const revoke = async (w) => {
    const reason = await promptDialog({ title: 'إلغاء التحذير', text: Object.keys(w.deductions ?? {}).length ? 'سيُسترجع أي مبلغ خُصم بسبب هذا التحذير.' : 'سيظهر للمطوّر أن التحذير أُلغي.', label: 'السبب', required: false, minLength: 0, confirm: 'إلغاء التحذير' });
    if (reason == null) return;
    setBusy(w.id);
    try {
      await admin.revokeWarning(w.id, reason);
      toast.ok('تم إلغاء التحذير');
      invalidate('warnings', 'ledger', 'activity');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر الإلغاء', errorText(err));
    } finally {
      setBusy('');
    }
  };

  return html`<div class="page">
    <${PageHead} title="التحذيرات" sub="التنبيه رسالة لفت نظر بدون خصم. التحذير الفعلي يمكن أن يخصم نسبة من المستحقات."
      actions=${html`<${Button} variant="primary" icon="alert" onClick=${() => setCreating(true)}>تحذير جديد</${Button}>`} />
    <div class="toolbar"><${Seg} value=${filter} onChange=${setFilter} options=${[{ value: 'active', label: 'فعّالة' }, { value: 'revoked', label: 'ملغاة' }, { value: 'all', label: 'الكل' }]} /></div>
    ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
      : q.loading && !q.data ? html`<${SkeletonRows} n=${4} />`
      : list.length === 0 ? html`<${Empty} title="لا توجد تحذيرات" tone="muted" />`
      : html`<div class="stack">${list.map((w, i) => html`<${WarningCard} key=${w.id} w=${w} i=${i} tasks=${q.data.tasks}
          who=${html`<span class="row" style="gap:6px"><${Avatar} src=${w.developer?.discord_avatar} name=${w.developer?.display_name} size="sm" /><b style="font-size:13px">${w.developer?.display_name}</b></span>`}
          actions=${w.status === 'active' && html`<div><${Button} size="sm" variant="ghost" icon="refresh" loading=${busy === w.id} onClick=${() => revoke(w)}>إلغاء التحذير</${Button}></div>`} />`)}</div>`}
    ${creating && html`<${WarnModal} onClose=${() => setCreating(false)} />`}
  </div>`;
}
