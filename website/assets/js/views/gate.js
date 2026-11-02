import { html } from '../lib/html.js';
import { sb } from '../lib/sb.js';
import { useAppState } from '../lib/store.js';
import { specAr } from '../lib/format.js';
import { Icon, DiscordIcon } from '../ui/icons.js';
import { Button } from '../ui/components.js';
import { Tower } from '../ui/blocks.js';

export function PendingGate({ profile, leaving }) {
  const st = useAppState();
  const invite = st.settings?.invite_url;
  return html`<div class=${'gate' + (leaving ? ' leaving' : '')} role="dialog" aria-modal="true" aria-live="polite">
    <div class="gate-card">
      <${Tower} done=${leaving} />
      ${leaving
        ? html`<h2>تم تفعيل حسابك</h2><p>أهلاً بك في الفريق يا ${profile.display_name}. جهّزنا لك مساحتك في الديسكورد.</p>`
        : html`<h2>بانتظار التفعيل</h2>
          <p>تم تأكيد حسابك عبر الديسكورد. يجب عليك الآن انتظار تفعيل الحساب من الإدارة — ستختفي هذه النافذة تلقائياً فور التفعيل، وسيراسلك البوت أيضاً.</p>`}
      <div class="gate-meta">
        <div><span>الاسم</span><b>${profile.display_name}</b></div>
        <div><span>ديسكورد</span><b class="ltr">@${profile.discord_username ?? '—'}</b></div>
        <div><span>المجال</span><b>${specAr(profile.specialization)}</b></div>
      </div>
      ${!leaving && html`<div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">
        ${invite && html`<a class="btn btn-sm" href=${invite} target="_blank" rel="noopener noreferrer"><${DiscordIcon} size="16" /><span>سيرفر الديسكورد</span></a>`}
        <${Button} size="sm" variant="ghost" icon="logout" onClick=${() => sb.auth.signOut()}>تسجيل الخروج</${Button}>
      </div>
      <div class="gate-status"><span class="live-dot"></span>متصل — سيتم التحديث لحظياً</div>`}
    </div>
  </div>`;
}

export function KickedScreen({ profile }) {
  return html`<div class="gate">
    <div class="gate-card">
      <div style="width:64px;height:64px;margin:0 auto;border-radius:20px;display:grid;place-items:center;background:var(--bad-soft);color:var(--bad)"><${Icon} name="ban" size="30" /></div>
      <h2>تم إيقاف حسابك</h2>
      <p>لم يعد بإمكانك استخدام لوحة الفريق بهذا الحساب.</p>
      ${profile.status_reason && html`<div class="callout bad" style="margin-top:16px;text-align:start"><${Icon} name="info" /><div><b>السبب:</b> ${profile.status_reason}</div></div>`}
      <div style="margin-top:18px"><${Button} variant="ghost" icon="logout" onClick=${() => sb.auth.signOut()}>تسجيل الخروج</${Button}></div>
    </div>
  </div>`;
}
