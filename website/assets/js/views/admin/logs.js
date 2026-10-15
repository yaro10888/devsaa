import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { admin } from '../../lib/api.js';
import { Seg, Input, SkeletonRows, ErrorBox } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { Timeline } from '../../ui/domain.js';

const GROUPS = {
  accounts: ['account.', 'role.', 'rank.'],
  tasks: ['task.'],
  warnings: ['warning.', 'notice.'],
  money: ['ledger.'],
  system: ['settings.'],
};

export function Logs() {
  const q = useQuery(() => admin.activity(400), [], ['activity']);
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((a) => (group === 'all' || GROUPS[group].some((p) => a.action.startsWith(p)))
      && (!s || [a.target?.display_name, a.actor?.display_name, JSON.stringify(a.details ?? {})].some((v) => String(v ?? '').toLowerCase().includes(s))));
  }, [q.data, group, search]);

  return html`<div class="page">
    <${PageHead} title="سجل النشاط" sub="كل ما يحدث في النظام: الحسابات، المهام، التحذيرات، والمالية — مع من قام به ومتى." />
    <div class="toolbar">
      <${Seg} value=${group} onChange=${setGroup} options=${[
        { value: 'all', label: 'الكل' }, { value: 'accounts', label: 'الحسابات' }, { value: 'tasks', label: 'المهام' },
        { value: 'warnings', label: 'التحذيرات' }, { value: 'money', label: 'المالية' }, { value: 'system', label: 'الإعدادات' },
      ]} />
      <div class="grow"></div>
      <${Input} icon="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} placeholder="بحث باسم أو تفاصيل…" />
    </div>
    <section class="card card-body">
      ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
        : q.loading && !q.data ? html`<${SkeletonRows} n=${8} />`
        : html`<${Timeline} items=${list} showPeople />`}
    </section>
  </div>`;
}
