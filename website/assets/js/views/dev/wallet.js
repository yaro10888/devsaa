import { html } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { SkeletonRows, ErrorBox } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { BalanceTiles, LedgerTable } from '../../ui/domain.js';

export function Wallet({ profile }) {
  const ov = useQuery(() => api.overview(), [profile.id], ['overview', 'ledger']);
  const ledger = useQuery(() => api.myLedger(profile.id), [profile.id], ['ledger']);
  return html`<div class="page">
    <${PageHead} title="المستحقات" sub="رصيدك الحالي بكل عملة، وكل حركة مالية على حسابك." />
    <${BalanceTiles} balances=${Object.fromEntries(Object.entries(ov.data?.balances ?? {}).map(([k, v]) => [k, Number(v)]))} />
    <section class="card section">
      <div class="card-head"><h3>سجل الحركات</h3></div>
      ${ledger.error ? html`<div class="card-body"><${ErrorBox} error=${ledger.error} onRetry=${ledger.reload} /></div>`
        : ledger.loading && !ledger.data ? html`<${SkeletonRows} n=${4} />`
        : html`<${LedgerTable} entries=${ledger.data} />`}
    </section>
  </div>`;
}
