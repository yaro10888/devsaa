import { html } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { SkeletonRows, ErrorBox } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { Timeline } from '../../ui/domain.js';

export function Activity({ profile }) {
  const q = useQuery(() => api.myActivity(profile.id, 150), [profile.id], ['activity']);
  return html`<div class="page">
    <${PageHead} title="سجلّي" sub="كل ما حدث على حسابك بالترتيب — نفس ما يصلك في روم «سجلك» بالديسكورد." />
    <section class="card card-body">
      ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
        : q.loading && !q.data ? html`<${SkeletonRows} n=${6} />`
        : html`<${Timeline} items=${q.data} />`}
    </section>
  </div>`;
}
