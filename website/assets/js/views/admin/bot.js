import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery, useNow } from '../../lib/store.js';
import { admin } from '../../lib/api.js';
import { errorText } from '../../lib/errors.js';
import { ago, dateTime } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Button, Seg, Badge, SkeletonRows, Empty, ErrorBox } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';

const KIND = {
  account_created: 'إشعار بحساب جديد',
  account_activated: 'تفعيل حساب وإنشاء رومات',
  account_reinstated: 'إعادة تفعيل حساب',
  account_kicked: 'إيقاف حساب',
  task_created: 'نشر مهمة',
  task_claimed: 'استلام مهمة',
  task_reopened: 'إعادة فتح مهمة',
  task_cancelled: 'إلغاء مهمة',
  task_reminder: 'تذكير بالموعد',
  task_overdue: 'تنبيه تأخير',
  submission_created: 'إرسال تسليم لسجل المهام',
  submission_reviewed: 'نتيجة مراجعة',
  warning_created: 'إرسال تحذير',
  warning_revoked: 'إلغاء تحذير',
  ledger_added: 'حركة مالية',
  rank_changed: 'تحديث رتبة',
  resolve_discord: 'ربط حساب ديسكورد',
  profile_renamed: 'تحديث اسم الكاتيجوري',
  ensure_channels: 'إصلاح الرومات',
};
const STATUS = { pending: ['بالانتظار', 'warn'], processing: ['قيد التنفيذ', 'info'], done: ['تمت', 'ok'], failed: ['فشلت', 'bad'] };

export function BotJobs() {
  const now = useNow(20000);
  const q = useQuery(() => admin.jobs(), [], ['jobs']);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const list = useMemo(() => (q.data ?? []).filter((j) => filter === 'all' || j.status === filter || (filter === 'pending' && j.status === 'processing')), [q.data, filter]);

  const retry = async (j) => {
    setBusy(String(j.id));
    try {
      await admin.retryJob(j.id);
      await admin.kickWorker();
      toast.ok('أُعيدت المحاولة');
      q.reload();
    } catch (err) {
      toast.bad('تعذّر', errorText(err));
    } finally {
      setBusy('');
    }
  };
  const kick = async () => {
    setBusy('kick');
    try {
      await admin.bot('kick_worker');
      toast.ok('تم تشغيل المعالجة');
      setTimeout(q.reload, 2500);
    } catch (err) {
      toast.bad('تعذّر التشغيل', errorText(err));
    } finally {
      setBusy('');
    }
  };

  return html`<div class="page">
    <${PageHead} title="عمليات البوت" sub="كل ما يرسله البوت للديسكورد يمر من هنا. إذا فشلت عملية تظهر رسالة الخطأ ويمكنك إعادتها."
      actions=${html`<${Button} icon="play" loading=${busy === 'kick'} onClick=${kick}>تشغيل المعالجة الآن</${Button}>`} />
    <div class="toolbar"><${Seg} value=${filter} onChange=${setFilter} options=${[{ value: 'all', label: 'الكل' }, { value: 'pending', label: 'بالانتظار' }, { value: 'failed', label: 'فشلت' }, { value: 'done', label: 'تمت' }]} /></div>
    <section class="card">
      ${q.error ? html`<div class="card-body"><${ErrorBox} error=${q.error} onRetry=${q.reload} /></div>`
        : q.loading && !q.data ? html`<${SkeletonRows} n=${6} />`
        : !list.length ? html`<${Empty} title="لا توجد عمليات" tone="muted" />`
        : list.map((j, i) => html`<div class="list-row" key=${j.id} style=${`--i:${i}`}>
            <span class=${'ibox ' + (STATUS[j.status]?.[1] ?? '')}><${Icon} name=${j.status === 'done' ? 'check' : j.status === 'failed' ? 'alert' : 'clock'} /></span>
            <div class="grow" style="min-width:0">
              <div class="row row-wrap" style="gap:8px"><b style="font-size:13.5px">${KIND[j.kind] ?? j.kind}</b><${Badge} tone=${STATUS[j.status]?.[1]}>${STATUS[j.status]?.[0] ?? j.status}</${Badge}>${j.attempts > 1 && html`<span class="faint" style="font-size:12px">${j.attempts} محاولات</span>`}</div>
              ${j.last_error && html`<div class="mono" style="font-size:12px;color:var(--bad);margin-top:4px;overflow-wrap:anywhere;direction:ltr;text-align:start">${j.last_error}</div>`}
              <div class="faint" style="font-size:12px;margin-top:2px" title=${dateTime(j.created_at)}>${ago(j.created_at, now)} · #${j.id}</div>
            </div>
            ${j.status === 'failed' && html`<${Button} size="sm" icon="refresh" loading=${busy === String(j.id)} onClick=${() => retry(j)}>إعادة</${Button}>`}
          </div>`)}
    </section>
  </div>`;
}
