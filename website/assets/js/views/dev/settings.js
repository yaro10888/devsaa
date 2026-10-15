import { html, useState } from '../../lib/html.js';
import { api } from '../../lib/api.js';
import { errorText } from '../../lib/errors.js';
import { ROLES, ACCOUNT_STATUS, specAr, date } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Avatar, Badge, Button, Field, PasswordInput, RankTag } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';

export function Settings({ profile }) {
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const s = ACCOUNT_STATUS[profile.status];

  const change = async (e) => {
    e.preventDefault();
    if (pw.a.length < 8) return setError('كلمة المرور 8 أحرف على الأقل.');
    if (pw.a !== pw.b) return setError('كلمتا المرور غير متطابقتين.');
    setBusy(true);
    setError('');
    try {
      await api.changePassword(pw.a);
      setPw({ a: '', b: '' });
      toast.ok('تم تغيير كلمة المرور');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return html`<div class="page">
    <${PageHead} title="الإعدادات" sub="بيانات حسابك. لتعديل الاسم أو الحسابات المرتبطة تواصل مع الإدارة." />
    <div class="grid-2" style="align-items:start">
      <section class="card card-pad stack">
        <div class="row" style="gap:14px">
          <${Avatar} src=${profile.discord_avatar} name=${profile.display_name} size="lg" />
          <div class="grow">
            <div style="font-family:var(--font-display);font-weight:700;font-size:18px">${profile.display_name}</div>
            <div class="row row-wrap" style="gap:6px;margin-top:4px"><${Badge} tone=${s?.tone}>${s?.ar}</${Badge}><${Badge} plain>${ROLES[profile.role]}</${Badge}><${RankTag} rank=${profile.rank} /></div>
          </div>
        </div>
        <div class="kv">
          <div><span>البريد الإلكتروني</span><b class="ltr">${profile.email}</b></div>
          <div><span>العمر</span><b>${profile.age ?? '—'}</b></div>
          <div><span>المجال</span><b>${specAr(profile.specialization)}</b></div>
          <div><span>روبلوكس</span><b class="ltr">${profile.roblox_username ?? '—'}</b></div>
          <div><span>ديسكورد</span><b class="ltr">${profile.discord_username ? '@' + profile.discord_username : '—'}</b></div>
          <div><span>تاريخ الانضمام</span><b>${date(profile.created_at)}</b></div>
        </div>
      </section>
      <form class="card card-pad stack" onSubmit=${change}>
        <div class="row" style="gap:10px"><${Icon} name="lock" /><b>تغيير كلمة المرور</b></div>
        <${Field} label="كلمة المرور الجديدة"><${PasswordInput} autocomplete="new-password" value=${pw.a} onInput=${(e) => setPw({ ...pw, a: e.currentTarget.value })} /></${Field}>
        <${Field} label="تأكيد كلمة المرور"><${PasswordInput} autocomplete="new-password" value=${pw.b} onInput=${(e) => setPw({ ...pw, b: e.currentTarget.value })} /></${Field}>
        ${error && html`<div class="error-text"><${Icon} name="info" size="14" />${error}</div>`}
        <${Button} type="submit" variant="primary" loading=${busy}>حفظ</${Button}>
      </form>
    </div>
  </div>`;
}
