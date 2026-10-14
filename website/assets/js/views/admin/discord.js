import { html, useState, useEffect } from '../../lib/html.js';
import { useQuery, setState, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { errorText, codeOf } from '../../lib/errors.js';
import { Icon, DiscordIcon } from '../../ui/icons.js';
import { Button, Field, Input, Select, Avatar, Skeleton, ErrorBox, copyText, Badge } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';

function Check({ ok, label, hint, action }) {
  return html`<div class="list-row" style="padding-inline:0">
    <span class=${'ibox ' + (ok === true ? 'ok' : ok === false ? 'bad' : '')}><${Icon} name=${ok === true ? 'check' : ok === false ? 'x' : 'dots'} /></span>
    <div class="grow"><b style="font-size:13.5px">${label}</b>${hint && html`<div class="hint">${hint}</div>`}</div>
    ${action}
  </div>`;
}

export function DiscordSettings({ owner }) {
  const info = useQuery(() => admin.bot('bot_info'), []);
  const settings = useQuery(() => admin.settings(), [], ['settings']);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const s = settings.data;
    if (s && !form) {
      setForm({
        guild_id: s.guild_id ?? '', guild_name: s.guild_name ?? '', guild_icon: s.guild_icon ?? '',
        owner_role_id: s.owner_role_id ?? '', developer_role_id: s.developer_role_id ?? '',
        public_tasks_channel_id: s.public_tasks_channel_id ?? '', tasks_log_channel_id: s.tasks_log_channel_id ?? '',
        staff_log_channel_id: s.staff_log_channel_id ?? '', invite_url: s.invite_url ?? '', site_url: s.site_url ?? '', brand_name: s.brand_name ?? '',
      });
    }
  }, [settings.data]);

  const meta = useQuery(() => (form?.guild_id && info.data?.configured !== undefined ? admin.bot('guild_meta', { guild_id: form.guild_id }) : Promise.resolve(null)), [form?.guild_id, !!info.data]);
  const b = info.data;
  const set = (k) => (e) => setForm({ ...form, [k]: e.currentTarget.value });
  const ro = !owner;

  const save = async () => {
    setError('');
    if (!form.guild_id) return setError('اختر السيرفر أولاً.');
    if (!form.owner_role_id) return setError('اختر رتبة Owner — هي التي ترى رومات المطوّرين.');
    if (!form.public_tasks_channel_id || !form.tasks_log_channel_id) return setError('اختر روم المهام العامة وروم سجل المهام.');
    setSaving(true);
    try {
      await admin.saveSettings(form);
      toast.ok('تم حفظ إعدادات الديسكورد');
      const pub = await api.publicSettings().catch(() => null);
      if (pub) setState({ settings: pub });
      invalidate('settings');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const run = async (op, okText) => {
    setBusy(op);
    try {
      const res = await admin.bot(op);
      if (op === 'gateway_handshake' && !res.ok) throw new Error('handshake');
      toast.ok(okText);
      info.reload();
    } catch (err) {
      const c = codeOf(err);
      toast.bad('لم ينجح', c === 'INTERACTIONS_URL_FAILED' ? 'تأكد أن DISCORD_PUBLIC_KEY صحيح ثم أعد المحاولة.' : errorText(err));
    } finally {
      setBusy('');
    }
  };

  const pickGuild = (g) => setForm({ ...form, guild_id: g.id, guild_name: g.name, guild_icon: g.icon ?? '', owner_role_id: '', developer_role_id: '', public_tasks_channel_id: '', tasks_log_channel_id: '', staff_log_channel_id: '' });
  const chOptions = (meta.data?.channels ?? []).map((c) => ({ value: c.id, label: `# ${c.name}${c.category ? ` — ${c.category}` : ''}` }));
  const roleOptions = (meta.data?.roles ?? []).map((r) => ({ value: r.id, label: `@ ${r.name}` }));
  const fnMissing = codeOf(info.error) === 'FUNCTION_MISSING';

  return html`<div class="page">
    <${PageHead} title="البوت والسيرفر" sub=${owner ? 'اربط البوت بالسيرفر واختر الرومات والرتب التي يستخدمها.' : 'عرض فقط — المالك وحده يعدّل هذه الإعدادات.'}
      actions=${owner && form && html`<${Button} variant="primary" icon="check" loading=${saving} onClick=${save}>حفظ الإعدادات</${Button}>`} />

    <div class="grid-2" style="align-items:start">
      <section class="card card-pad stack">
        <div class="row between"><b>حالة البوت</b>${b?.bot && html`<${Badge} tone=${b.configured ? 'ok' : 'warn'}>${b.configured ? 'متصل' : 'إعداد ناقص'}</${Badge}>`}</div>
        ${info.loading && !info.data ? html`<${Skeleton} h=${56} />`
          : fnMissing ? html`<div class="callout warn"><${Icon} name="info" /><div>البوت لم يُنشر بعد على Supabase. شغّل ملف <b>deploy.cmd</b> من مجلد البوت كما في الدليل.</div></div>`
          : info.error ? html`<${ErrorBox} error=${info.error} onRetry=${info.reload} />`
          : !b?.bot ? html`<div class="callout bad"><${Icon} name="alert" /><div>${b?.invalid_token ? 'التوكن غير صحيح — ' : ''}أضف الأسرار التالية في Supabase: <span class="mono ltr">${(b?.missing ?? []).join(', ')}</span></div></div>`
          : html`<div class="bot-hero"><${Avatar} src=${b.bot.avatar} name=${b.bot.username} size="lg" /><div class="grow"><b style="font-family:var(--font-display);font-size:17px">${b.bot.username}</b><div class="faint mono" style="font-size:12px">${b.bot.id}</div></div>
              <a class="btn btn-sm" href=${b.invite_url} target="_blank" rel="noopener noreferrer"><${DiscordIcon} size="16" /><span>دعوة لسيرفر</span></a></div>`}
        ${b?.bot && html`<div>
          <${Check} ok=${b.missing.length === 0} label="الأسرار الثلاثة مضافة" hint=${b.missing.length ? `ناقص: ${b.missing.join(', ')}` : 'DISCORD_TOKEN · DISCORD_PUBLIC_KEY · DISCORD_APP_ID'} />
          <${Check} ok=${b.interactions_ok} label="رابط التفاعلات (Interactions Endpoint)" hint=${b.interactions_ok ? 'الأزرار والنوافذ تصل للبوت.' : 'بدونه لن تعمل أزرار الاستلام والتسليم.'}
            action=${owner && !b.interactions_ok && html`<${Button} size="sm" variant="primary" loading=${busy === 'set_interactions_url'} onClick=${() => run('set_interactions_url', 'تم ضبط رابط التفاعلات')}>ضبط تلقائي</${Button}>`} />
          <${Check} ok=${(b.guilds ?? []).length > 0} label="البوت داخل سيرفر" hint=${(b.guilds ?? []).length ? (b.guilds ?? []).map((g) => g.name).join('، ') : 'استخدم زر «دعوة لسيرفر».'} />
          <${Check} ok=${null} label="التشغيل لأول مرة" hint="اتصال واحد بالديسكورد يفعّل قدرة البوت على إرسال الرسائل. اضغطه مرة واحدة بعد الإعداد."
            action=${html`<${Button} size="sm" loading=${busy === 'gateway_handshake'} onClick=${() => run('gateway_handshake', 'تم الاتصال بالديسكورد بنجاح')}>تشغيل</${Button}>`} />
        </div>`}
        ${b?.interactions_url && html`<${Field} label="Interactions Endpoint URL" hint="إذا لم ينجح الضبط التلقائي، الصقه يدوياً في Developer Portal ← General Information.">
          <div class="copy-field"><${Input} readonly value=${b.interactions_url} /><${Button} icon="copy" onClick=${async () => (await copyText(b.interactions_url)) && toast.ok('تم النسخ')}>نسخ</${Button}></div>
        </${Field}>`}
      </section>

      <section class="card card-pad stack">
        <b>السيرفر</b>
        ${!form ? html`<${Skeleton} h=${120} />`
          : !(b?.guilds ?? []).length ? html`<div class="hint">${b?.bot ? 'البوت ليس في أي سيرفر بعد. ادعه أولاً ثم حدّث الصفحة.' : 'اربط البوت أولاً.'}</div>`
          : html`<div class="stack stack-sm">${b.guilds.map((g) => html`<label class=${'check' + (form.guild_id === g.id ? ' on' : '')}>
              <input type="radio" name="guild" checked=${form.guild_id === g.id} disabled=${ro} onChange=${() => pickGuild(g)} />
              <${Avatar} src=${g.icon} name=${g.name} size="sm" /><span class="grow">${g.name}</span><span class="faint mono" style="font-size:11.5px">${g.id}</span>
            </label>`)}</div>`}
        ${form?.guild_id && !b?.guilds?.some((g) => g.id === form.guild_id) && b?.bot && html`<div class="callout warn"><${Icon} name="info" /><div>البوت لم يعد داخل السيرفر المحفوظ (${form.guild_name}).</div></div>`}
      </section>
    </div>

    ${form?.guild_id && html`<section class="card card-pad stack section">
      <div class="row between"><b>الرومات والرتب</b>${meta.loading && html`<span class="spin" style="width:16px;height:16px"></span>`}</div>
      ${meta.error ? html`<${ErrorBox} error=${meta.error} onRetry=${meta.reload} />` : html`<div class="grid-2">
        <${Field} label="روم المهام العامة" hint="تُنشر فيه المهام العامة مع زرّي الاستلام والتفاصيل.">
          <${Select} disabled=${ro} value=${form.public_tasks_channel_id} onChange=${set('public_tasks_channel_id')} placeholder="اختر روماً" options=${chOptions} />
        </${Field}>
        <${Field} label="روم سجل المهام" hint="تُرسل إليه كل التسليمات مع الملفات للمراجعة.">
          <${Select} disabled=${ro} value=${form.tasks_log_channel_id} onChange=${set('tasks_log_channel_id')} placeholder="اختر روماً" options=${chOptions} />
        </${Field}>
        <${Field} label="رتبة Owner" hint="هي فقط (مع صاحب الرومات) ترى رومات كل مطوّر وتكتب فيها.">
          <${Select} disabled=${ro} value=${form.owner_role_id} onChange=${set('owner_role_id')} placeholder="اختر رتبة" options=${roleOptions} />
        </${Field}>
        <${Field} label="رتبة المطوّرين" optional hint="تُعطى لكل حساب يُفعَّل، ويُنادى عليها عند نشر مهمة عامة.">
          <${Select} disabled=${ro} value=${form.developer_role_id} onChange=${set('developer_role_id')} placeholder="بدون" options=${roleOptions} />
        </${Field}>
        <${Field} label="روم سجل الإدارة" optional hint="تنبيهات للإدارة: طلبات انضمام، مهام متأخرة، استلامات.">
          <${Select} disabled=${ro} value=${form.staff_log_channel_id} onChange=${set('staff_log_channel_id')} placeholder="بدون" options=${chOptions} />
        </${Field}>
      </div>`}
    </section>`}

    ${form && html`<section class="card card-pad stack section">
      <b>عام</b>
      <div class="grid-3">
        <${Field} label="اسم الفريق"><${Input} disabled=${ro} maxLength="40" value=${form.brand_name} onInput=${set('brand_name')} /></${Field}>
        <${Field} label="رابط دعوة السيرفر" hint="يظهر في صفحة التسجيل."><${Input} disabled=${ro} ltr value=${form.invite_url} onInput=${set('invite_url')} placeholder="https://discord.gg/..." /></${Field}>
        <${Field} label="رابط الموقع" hint="يضعه البوت في رسائله.">
          <${Input} disabled=${ro} ltr value=${form.site_url} onInput=${set('site_url')} placeholder="https://..."
            action=${!ro && html`<button type="button" class="btn btn-ghost btn-sm" onClick=${() => setForm({ ...form, site_url: location.origin + location.pathname })}>هذا الموقع</button>`} />
        </${Field}>
      </div>
      ${error && html`<div class="callout bad"><${Icon} name="alert" /><div>${error}</div></div>`}
      ${owner && html`<div><${Button} variant="primary" icon="check" loading=${saving} onClick=${save}>حفظ الإعدادات</${Button}></div>`}
    </section>`}
  </div>`;
}
