import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { admin } from '../../lib/api.js';
import { CURRENCIES, CURRENCY_KEYS, num } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Button, SkeletonRows, Empty, ErrorBox } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { LedgerTable, PersonCell } from '../../ui/domain.js';
import { LedgerModal, PayoutModal } from './modals.js';

export function Finance() {
  const people = useQuery(() => admin.profiles(), [], ['profiles']);
  const bal = useQuery(() => admin.balances(), [], ['ledger']);
  const ledger = useQuery(() => admin.ledger(), [], ['ledger']);
  const [modal, setModal] = useState(null);

  const rows = useMemo(() => {
    const map = new Map();
    for (const b of bal.data ?? []) {
      if (!map.has(b.developer_id)) map.set(b.developer_id, {});
      map.get(b.developer_id)[b.currency] = Number(b.balance);
    }
    return (people.data ?? [])
      .filter((p) => p.status === 'active' || map.has(p.id))
      .map((p) => ({ p, b: map.get(p.id) ?? {} }))
      .sort((a, b) => Object.values(b.b).reduce((s, v) => s + Math.max(0, v), 0) - Object.values(a.b).reduce((s, v) => s + Math.max(0, v), 0));
  }, [people.data, bal.data]);

  const totals = useMemo(() => {
    const t = {};
    for (const r of rows) for (const c of CURRENCY_KEYS) t[c] = (t[c] ?? 0) + Math.max(0, r.b[c] ?? 0);
    return t;
  }, [rows]);

  return html`<div class="page">
    <${PageHead} title="المالية" sub="الأرصدة غير المصروفة لكل مطوّر، وسجل كل الحركات."
      actions=${html`<${Button} variant="primary" icon="plus" onClick=${() => setModal({ kind: 'ledger' })}>حركة مالية</${Button}>`} />
    <div class="grid-3">${CURRENCY_KEYS.map((c) => html`<div class="card stat spot"><div class="k"><span>إجمالي ${CURRENCIES[c].ar} مستحق</span><span class="ic"><${Icon} name="coins" /></span></div>
      <div class="v"><span>${num(totals[c] ?? 0)}</span><small>${CURRENCIES[c].short}</small></div></div>`)}</div>
    <section class="card section">
      <div class="card-head"><h3>أرصدة المطوّرين</h3></div>
      ${people.error || bal.error ? html`<div class="card-body"><${ErrorBox} error=${people.error || bal.error} onRetry=${() => { people.reload(); bal.reload(); }} /></div>`
        : (people.loading && !people.data) || (bal.loading && !bal.data) ? html`<${SkeletonRows} n=${4} />`
        : !rows.length ? html`<${Empty} title="لا يوجد مطوّرون مفعّلون بعد" tone="muted" />`
        : html`<div class="table-wrap"><table class="table">
          <thead><tr><th>المطوّر</th>${CURRENCY_KEYS.map((c) => html`<th>${CURRENCIES[c].ar}</th>`)}<th></th></tr></thead>
          <tbody>${rows.map(({ p, b }, i) => html`<tr key=${p.id} style=${`--i:${i}`}>
            <td><${PersonCell} p=${p} /></td>
            ${CURRENCY_KEYS.map((c) => html`<td class=${'mono nowrap ' + ((b[c] ?? 0) > 0 ? '' : (b[c] ?? 0) < 0 ? 'neg' : 'faint')}>${num(b[c] ?? 0)}</td>`)}
            <td><div class="row" style="gap:6px;justify-content:flex-end">
              <${Button} size="sm" icon="plus" onClick=${() => setModal({ kind: 'ledger', p })}>إضافة</${Button}>
              <${Button} size="sm" icon="wallet" disabled=${!Object.values(b).some((v) => v > 0)} onClick=${() => setModal({ kind: 'payout', p })}>صرف</${Button}>
            </div></td>
          </tr>`)}</tbody>
        </table></div>`}
    </section>
    <section class="card section">
      <div class="card-head"><h3>آخر الحركات</h3></div>
      ${ledger.loading && !ledger.data ? html`<${SkeletonRows} n=${4} />` : html`<${LedgerTable} entries=${ledger.data} showDev />`}
    </section>
    ${modal?.kind === 'ledger' && html`<${LedgerModal} developer=${modal.p} onClose=${() => setModal(null)} />`}
    ${modal?.kind === 'payout' && html`<${PayoutModal} developer=${modal.p} onClose=${() => setModal(null)} />`}
  </div>`;
}
