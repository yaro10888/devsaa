import { html, useState, useEffect, useRef } from '../lib/html.js';
import { sb, CFG } from '../lib/sb.js';
import { setState, useAppState, useNow } from '../lib/store.js';
import { navigate } from '../lib/router.js';
import { api, callBot } from '../lib/api.js';
import { AppError, codeOf, errorText } from '../lib/errors.js';
import { SPECS } from '../lib/format.js';
import { Icon, DiscordIcon, RobloxIcon } from '../ui/icons.js';
import { Button, Field, Input, PasswordInput, Avatar } from '../ui/components.js';
import { IsoScene } from '../ui/blocks.js';

const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const RX = {
  email: /^[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}$/,
  discord: /^(?=.{2,32}$)(?!.*\.\.)[a-z0-9_.]+$/,
  roblox: /^(?=.{3,20}$)[A-Za-z0-9]+(?:_[A-Za-z0-9]+)?$/,
};

// ====================================================================== layout
export function AuthView({ mode }) {
  const st = useAppState();
  const brand = st.settings?.brand_name || CFG.BRAND || 'Studio';
  const invite = st.settings?.invite_url;
  return html`<div class="auth">
    <section class="auth-panel">
      <header class="auth-top">
        <a class="brand" href="#/login"><img src="assets/img/mark.svg" alt="" />${brand}</a>
        ${invite && html`<a class="btn btn-ghost btn-sm" href=${invite} target="_blank" rel="noopener noreferrer"><${DiscordIcon} size="16" /><span>سيرفر الديسكورد</span></a>`}
      </header>
      <main class="auth-main">
        <div class="auth-card">
          <div class="auth-switch" role="tablist">
            <button type="button" aria-pressed=${String(mode === 'login')} onClick=${() => navigate('/login')}>تسجيل الدخول</button>
            <button type="button" aria-pressed=${String(mode === 'signup')} onClick=${() => navigate('/signup')}>حساب جديد</button>
          </div>
          ${mode === 'login' ? html`<${LoginForm} key="login" />` : html`<${SignupFlow} key="signup" settings=${st.settings} />`}
        </div>
      </main>
      <footer class="auth-foot">
        <span>© ${new Date().getFullYear()} ${brand}</span>
        <span>تواجه مشكلة؟ راسل الإدارة في الديسكورد.</span>
      </footer>
    </section>
    <aside class="auth-art" aria-hidden="true">
      <div class="art-copy">
        <span class="eyebrow"><${Icon} name="cube" size="14" />مساحة عمل الفريق</span>
        <h2>ابنِ، سلّم، واستلم مستحقاتك — <em>بدون فوضى.</em></h2>
        <p>المهام توصلك على الموقع والديسكورد معاً. تسلّم ملفاتك بضغطة، وتتابع مستحقاتك وسجلّك أول بأول.</p>
      </div>
      <div class="art-stage"><${IsoScene} /></div>
      <div class="art-feats">
        <div class="art-feat"><${Icon} name="tasks" /><b>مهام واضحة</b><span>سعر ومدة وصور لكل مهمة</span></div>
        <div class="art-feat"><${DiscordIcon} size="18" /><b>رومات خاصة</b><span>مهامك وسجلّك وتحذيراتك</span></div>
        <div class="art-feat"><${Icon} name="wallet" /><b>مستحقات شفافة</b><span>كل حركة مالية مسجّلة</span></div>
      </div>
    </aside>
  </div>`;
}

// ====================================================================== login
function LoginForm() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const set = (k) => (e) => { setF({ ...f, [k]: e.currentTarget.value }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim() || !f.password) {
      setError('أكمل كل الحقول.');
      setShake((x) => x + 1);
      return;
    }
    setBusy(true);
    setState({ authBusy: true });
    try {
      const { data, error: err } = await sb.auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.password });
      if (err) throw err;
      const profile = await api.profile(data.user.id);
      if (norm(profile.display_name) !== norm(f.name)) {
        await sb.auth.signOut();
        throw new AppError('NAME_MISMATCH');
      }
      setState({ authBusy: false });
    } catch (err) {
      setState({ authBusy: false });
      setError(errorText(err));
      setShake((x) => x + 1);
      setBusy(false);
    }
  };

  return html`<form class="stack step-panel" onSubmit=${submit} noValidate>
    <div>
      <h1>أهلاً بعودتك</h1>
      <p class="lead">سجّل دخولك لمتابعة مهامك ومستحقاتك.</p>
    </div>
    ${error && html`<div class="callout bad" key=${shake}><${Icon} name="alert" /><div>${error}</div></div>`}
    <${Field} label="الاسم العام">
      <${Input} icon="user" value=${f.name} onInput=${set('name')} autocomplete="nickname" placeholder="الاسم الذي سجّلت به" />
    </${Field}>
    <${Field} label="البريد الإلكتروني">
      <${Input} icon="mail" ltr type="email" value=${f.email} onInput=${set('email')} autocomplete="email" placeholder="name@example.com" />
    </${Field}>
    <${Field} label="كلمة المرور">
      <${PasswordInput} value=${f.password} onInput=${set('password')} placeholder="••••••••" />
    </${Field}>
    <${Button} type="submit" variant="primary" size="lg" block loading=${busy} iconEnd="chevL">دخول</${Button}>
    <p class="hint" style="text-align:center;margin:0">ليس لديك حساب؟ <a href="#/signup">أنشئ حساباً جديداً</a></p>
  </form>`;
}

// ====================================================================== signup
const STEP_FIELDS = { 1: ['display_name', 'email', 'age'], 2: ['specialization', 'roblox_username'], 3: ['discord_username', 'password', 'confirm'] };
const ERROR_FIELD = {
  INVALID_NAME: 'display_name', INVALID_EMAIL: 'email', EMAIL_TAKEN: 'email', INVALID_AGE: 'age',
  INVALID_SPECIALIZATION: 'specialization', INVALID_ROBLOX: 'roblox_username', ROBLOX_TAKEN: 'roblox_username',
  INVALID_DISCORD: 'discord_username', DISCORD_TAKEN: 'discord_username', DISCORD_NOT_IN_GUILD: 'discord_username',
  DM_CLOSED: 'discord_username', WEAK_PASSWORD: 'password',
};
const stepOf = (field) => Number(Object.keys(STEP_FIELDS).find((k) => STEP_FIELDS[k].includes(field)) ?? 3);

function validate(f, step) {
  const e = {};
  if (step === 1) {
    const n = f.display_name.trim();
    if (n.length < 2 || n.length > 32) e.display_name = 'الاسم بين 2 و 32 حرفاً.';
    if (!RX.email.test(f.email.trim())) e.email = 'اكتب بريداً إلكترونياً صحيحاً.';
    const age = Number(f.age);
    if (!Number.isInteger(age) || age < 8 || age > 99) e.age = 'اكتب عمرك بالأرقام.';
  }
  if (step === 2) {
    if (!f.specialization) e.specialization = 'اختر مجالك.';
    if (!RX.roblox.test(f.roblox_username.trim())) e.roblox_username = 'اسم روبلوكس: 3–20 حرفاً إنجليزياً أو أرقاماً، وشرطة سفلية واحدة كحد أقصى.';
  }
  if (step === 3) {
    const d = f.discord_username.trim().replace(/^@/, '').toLowerCase();
    if (d.includes('#') || !RX.discord.test(d)) e.discord_username = 'اكتب الـ username (حروف إنجليزية صغيرة وأرقام و _ و .) وليس الاسم الظاهر.';
    if (f.password.length < 8) e.password = 'كلمة المرور 8 أحرف على الأقل.';
    else if (f.password.length > 72) e.password = 'كلمة المرور طويلة جداً.';
    if (f.confirm !== f.password) e.confirm = 'كلمتا المرور غير متطابقتين.';
  }
  return e;
}

function Steps({ step }) {
  const items = ['بياناتك', 'روبلوكس', 'ديسكورد', 'التأكيد'];
  return html`<div class="steps" aria-label="خطوات التسجيل">
    ${items.map((label, i) => html`
      ${i > 0 && html`<span class=${'step-line' + (step > i ? ' done' : '')}></span>`}
      <div class=${'step' + (step === i + 1 ? ' on' : step > i + 1 ? ' done' : '')}>
        <span class="n">${step > i + 1 ? html`<${Icon} name="check" size="13" />` : i + 1}</span>
        <span class="hide-sm">${label}</span>
      </div>`)}
  </div>`;
}

function SignupFlow({ settings }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ display_name: '', email: '', age: '', specialization: '', roblox_username: '', discord_username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState(null);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.currentTarget.value }); setErrors({ ...errors, [k]: undefined }); setGeneral(null); };

  const next = (e) => {
    e?.preventDefault();
    const errs = validate(f, step);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (step < 3) setStep(step + 1);
    else start();
  };

  const start = async () => {
    setBusy(true);
    setGeneral(null);
    try {
      const res = await callBot('signup_start', {
        display_name: f.display_name.trim(),
        email: f.email.trim().toLowerCase(),
        age: Number(f.age),
        specialization: f.specialization,
        roblox_username: f.roblox_username.trim(),
        discord_username: f.discord_username.trim().replace(/^@/, '').toLowerCase(),
      });
      setRequest({ ...res, sentAt: Date.now() });
      setStep(4);
    } catch (err) {
      const code = codeOf(err);
      const field = ERROR_FIELD[code];
      if (field) {
        setErrors({ [field]: errorText(err) });
        setStep(stepOf(field));
        if (code === 'DISCORD_NOT_IN_GUILD') setGeneral({ code, invite: err.extra?.invite_url || settings?.invite_url });
      } else {
        setGeneral({ code, text: errorText(err) });
      }
    } finally {
      setBusy(false);
    }
  };

  const back = () => { setStep(Math.max(1, step - 1)); setGeneral(null); };

  return html`<div>
    <h1>${step === 4 ? 'تأكيد الحساب' : 'حساب جديد'}</h1>
    <p class="lead">${step === 4 ? 'خطوة أخيرة — أكّد أن حساب الديسكورد لك.' : 'التسجيل يتم عبر الديسكورد، بدون رسائل بريد.'}</p>
    <${Steps} step=${step} />

    ${general && general.code === 'DISCORD_NOT_IN_GUILD' && html`<div class="callout warn" style="margin-bottom:14px">
      <${Icon} name="info" /><div class="grow">لازم تكون عضواً في سيرفر الديسكورد قبل التسجيل.
      ${general.invite && html` <a href=${general.invite} target="_blank" rel="noopener noreferrer">ادخل السيرفر من هنا</a> ثم أعد المحاولة.`}</div></div>`}
    ${general && general.text && html`<div class="callout bad" style="margin-bottom:14px"><${Icon} name="alert" /><div>${general.text}</div></div>`}

    ${step === 1 && html`<form class="stack step-panel" key="s1" onSubmit=${next} noValidate>
      <${Field} label="الاسم العام" hint="الاسم الذي يظهر للإدارة وفي الديسكورد." error=${errors.display_name}>
        <${Input} icon="user" value=${f.display_name} onInput=${set('display_name')} maxLength="32" autocomplete="nickname" invalid=${!!errors.display_name} />
      </${Field}>
      <${Field} label="البريد الإلكتروني" error=${errors.email}>
        <${Input} icon="mail" ltr type="email" value=${f.email} onInput=${set('email')} autocomplete="email" placeholder="name@example.com" invalid=${!!errors.email} />
      </${Field}>
      <${Field} label="العمر" error=${errors.age}>
        <${Input} icon="calendar" ltr type="number" inputmode="numeric" min="8" max="99" value=${f.age} onInput=${set('age')} invalid=${!!errors.age} />
      </${Field}>
      <${Button} type="submit" variant="primary" size="lg" block iconEnd="chevL">التالي</${Button}>
    </form>`}

    ${step === 2 && html`<form class="stack step-panel" key="s2" onSubmit=${next} noValidate>
      <${Field} label="مجالك في روبلوكس" error=${errors.specialization}>
        <div class="spec-grid">
          ${SPECS.map((s) => html`<button type="button" class="spec" aria-pressed=${String(f.specialization === s.key)}
            onClick=${() => { setF({ ...f, specialization: s.key }); setErrors({ ...errors, specialization: undefined }); }}>
            <${Icon} name=${s.icon} /><span>${s.ar}</span></button>`)}
        </div>
      </${Field}>
      <${Field} label="اسمك في روبلوكس" hint="الـ Username كما يظهر في رابط ملفك." error=${errors.roblox_username}>
        <${Input} iconEl=${html`<${RobloxIcon} size="17" />`} ltr value=${f.roblox_username} onInput=${set('roblox_username')} maxLength="20" autocomplete="off" spellcheck="false" invalid=${!!errors.roblox_username} />
      </${Field}>
      <div class="row"><${Button} variant="ghost" onClick=${back} icon="chevR">رجوع</${Button}><div class="grow"></div><${Button} type="submit" variant="primary" iconEnd="chevL">التالي</${Button}></div>
    </form>`}

    ${step === 3 && html`<form class="stack step-panel" key="s3" onSubmit=${next} noValidate>
      <${Field} label="اسم المستخدم في ديسكورد" hint="الـ username وليس الاسم الظاهر — تجده تحت اسمك في ملفك الشخصي." error=${errors.discord_username}>
        <${Input} iconEl=${html`<span style="color:#8891f2;display:flex"><${DiscordIcon} size="17" /></span>`} ltr value=${f.discord_username} onInput=${set('discord_username')} placeholder="username" autocomplete="off" spellcheck="false" maxLength="33" invalid=${!!errors.discord_username} />
      </${Field}>
      <div class="grid-2">
        <${Field} label="كلمة المرور" error=${errors.password}>
          <${PasswordInput} value=${f.password} onInput=${set('password')} autocomplete="new-password" invalid=${!!errors.password} />
        </${Field}>
        <${Field} label="تأكيد كلمة المرور" error=${errors.confirm}>
          <${PasswordInput} value=${f.confirm} onInput=${set('confirm')} autocomplete="new-password" invalid=${!!errors.confirm} />
        </${Field}>
      </div>
      <div class="callout accent"><${DiscordIcon} size="18" /><div>سيرسل لك البوت رمز تأكيد في الرسائل الخاصة. تأكد أنك داخل السيرفر وأن الرسائل الخاصة مفعّلة.
        ${settings?.invite_url && html` <a href=${settings.invite_url} target="_blank" rel="noopener noreferrer">رابط السيرفر</a>`}</div></div>
      <div class="row"><${Button} variant="ghost" onClick=${back} icon="chevR">رجوع</${Button}><div class="grow"></div><${Button} type="submit" variant="primary" loading=${busy} iconEnd="send">أرسل رمز التأكيد</${Button}></div>
    </form>`}

    ${step === 4 && request && html`<${VerifyStep} key=${request.request_id} request=${request} form=${f}
      onRestart=${() => { setRequest(null); setStep(3); }}
      onResent=${(r) => setRequest({ ...request, ...r, sentAt: Date.now() })} />`}

    ${step < 4 && html`<p class="hint" style="text-align:center;margin:18px 0 0">لديك حساب؟ <a href="#/login">سجّل الدخول</a></p>`}
  </div>`;
}

// ====================================================================== OTP
function Otp({ value, onChange, disabled, shake }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  useEffect(() => { setTimeout(() => refs.current[Math.min(value.length, 5)]?.focus(), 80); }, []);

  const write = (start, text) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return;
    const arr = digits.slice();
    let i = start;
    for (const ch of clean) {
      if (i > 5) break;
      arr[i++] = ch;
    }
    const next = arr.join('').slice(0, 6);
    onChange(next);
    refs.current[Math.min(i, 5)]?.focus();
  };

  const onKey = (i) => (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) arr[i] = '';
      else if (i > 0) { arr[i - 1] = ''; refs.current[i - 1]?.focus(); }
      onChange(arr.join('').replace(/\s/g, ''));
    } else if (e.key === 'ArrowLeft') refs.current[Math.max(0, i - 1)]?.focus();
    else if (e.key === 'ArrowRight') refs.current[Math.min(5, i + 1)]?.focus();
  };

  return html`<div class=${'otp' + (shake ? ' shake' : '')} key=${shake} dir="ltr">
    ${digits.map((d, i) => html`${i === 3 && html`<span class="gap"></span>`}<input
      ref=${(el) => (refs.current[i] = el)} class=${d ? 'filled' : ''} value=${d} inputmode="numeric" autocomplete=${i === 0 ? 'one-time-code' : 'off'}
      maxLength="6" disabled=${disabled} aria-label=${`الرقم ${i + 1}`}
      onInput=${(e) => { const v = e.currentTarget.value; e.currentTarget.value = d; write(i, v.slice(-6)); }}
      onKeyDown=${onKey(i)}
      onPaste=${(e) => { e.preventDefault(); write(0, e.clipboardData.getData('text')); }}
      onFocus=${(e) => e.currentTarget.select()} />`)}
  </div>`;
}

function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function VerifyStep({ request, form, onRestart, onResent }) {
  const now = useNow(1000);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [resending, setResending] = useState(false);
  const expiresIn = new Date(request.expires_at).getTime() - now;
  const resendIn = request.sentAt + 60000 - now;

  const verify = async (value) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await callBot('signup_verify', { request_id: request.request_id, token: request.token, code: value, password: form.password });
      setDone(true);
      const { error: err } = await sb.auth.signInWithPassword({ email: res.email, password: form.password });
      if (err) throw err;
    } catch (err) {
      const c = codeOf(err);
      setDone(false);
      setError(errorText(err) + (c === 'INVALID_CODE' && err.extra?.remaining ? ` (متبقي ${err.extra.remaining} محاولات)` : ''));
      setShake((x) => x + 1);
      setCode('');
      setBusy(false);
    }
  };

  useEffect(() => { if (code.length === 6) verify(code); }, [code]);

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      const r = await callBot('signup_resend', { request_id: request.request_id, token: request.token });
      onResent(r);
      setCode('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setResending(false);
    }
  };

  const d = request.discord ?? {};
  return html`<div class="stack step-panel">
    <div class="dc-card">
      <${Avatar} src=${d.avatar} name=${d.username} />
      <div class="grow"><div class="n">${d.global_name || d.username}</div><div class="u">@${d.username}</div></div>
      <${DiscordIcon} size="22" />
    </div>
    <p class="muted" style="margin:0">أرسل البوت رمزاً من 6 أرقام إلى رسائلك الخاصة في ديسكورد. اكتبه هنا:</p>
    <${Otp} value=${code} onChange=${(v) => { setCode(v); setError(''); }} disabled=${busy} shake=${shake} />
    ${error && html`<div class="error-text" style="justify-content:center"><${Icon} name="info" size="14" />${error}</div>`}
    ${done
      ? html`<div class="callout ok"><${Icon} name="check" /><div>تم التحقق. جارٍ إنشاء حسابك والدخول…</div></div>`
      : html`<${Button} variant="primary" size="lg" block loading=${busy} disabled=${code.length !== 6} onClick=${() => verify(code)}>تأكيد</${Button}>`}
    <div class="row between" style="font-size:13px">
      <span class=${expiresIn <= 0 ? 'neg' : 'faint'}>${expiresIn > 0 ? html`ينتهي الرمز خلال <span class="mono">${clock(expiresIn)}</span>` : 'انتهت صلاحية الرمز'}</span>
      <${Button} variant="ghost" size="sm" icon="refresh" loading=${resending} disabled=${resendIn > 0 || busy} onClick=${resend}>
        ${resendIn > 0 ? html`إعادة الإرسال بعد <span class="mono">${clock(resendIn)}</span>` : 'إعادة إرسال الرمز'}
      </${Button}>
    </div>
    <hr class="divider" />
    <p class="hint" style="margin:0">لم تصلك رسالة؟ تأكد أن الرسائل الخاصة من أعضاء السيرفر مفعّلة لديك.
      <button type="button" class="linklike" onClick=${onRestart}>تعديل البيانات</button></p>
  </div>`;
}
