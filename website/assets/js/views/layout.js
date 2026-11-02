import { html, useState, useEffect } from '../lib/html.js';
import { sb, CFG } from '../lib/sb.js';
import { useAppState, isAdmin, isOwner, useQuery } from '../lib/store.js';
import { api, admin } from '../lib/api.js';
import { ROLES, specAr } from '../lib/format.js';
import { Icon } from '../ui/icons.js';
import { Avatar, IconButton, Empty } from '../ui/components.js';
import { confirmDialog } from '../ui/overlays.js';

import { DevHome } from './dev/home.js';
import { MyTasks } from './dev/tasks.js';
import { Market } from './dev/market.js';
import { MyWarnings } from './dev/warnings.js';
import { Wallet } from './dev/wallet.js';
import { Activity } from './dev/activity.js';
import { Settings } from './dev/settings.js';
import { AdminOverview } from './admin/overview.js';
import { Accounts } from './admin/accounts.js';
import { AdminTasks } from './admin/tasks.js';
import { AdminWarnings } from './admin/warnings.js';
import { Finance } from './admin/finance.js';
import { Ranks } from './admin/ranks.js';
import { Logs } from './admin/logs.js';
import { DiscordSettings } from './admin/discord.js';
import { BotJobs } from './admin/bot.js';

const DEV_ROUTES = {
  '/': DevHome, '/tasks': MyTasks, '/market': Market, '/warnings': MyWarnings,
  '/wallet': Wallet, '/activity': Activity, '/settings': Settings,
};
const ADMIN_ROUTES = {
  '/admin': AdminOverview, '/admin/accounts': Accounts, '/admin/tasks': AdminTasks, '/admin/warnings': AdminWarnings,
  '/admin/finance': Finance, '/admin/ranks': Ranks, '/admin/logs': Logs, '/admin/discord': DiscordSettings, '/admin/bot': BotJobs,
};

function NavItem({ href, icon, label, active, pill, soft }) {
  return html`<a class=${'nav-item' + (active ? ' on' : '')} href=${'#' + href} aria-current=${active ? 'page' : undefined}>
    <${Icon} name=${icon} /><span>${label}</span>${pill ? html`<span class=${'pill' + (soft ? ' soft' : '')}>${pill}</span>` : null}
  </a>`;
}

function Sidebar({ path, profile, onNavigate }) {
  const staff = isAdmin(profile);
  const st = useAppState();
  const brand = st.settings?.brand_name || CFG.BRAND;
  const overview = useQuery(() => api.overview(), [profile.id], ['overview', 'tasks']);
  const dash = useQuery(() => (staff ? admin.dashboard() : Promise.resolve(null)), [staff], ['profiles', 'submissions', 'tasks', 'jobs']);
  const d = dash.data;

  const logout = async () => {
    if (await confirmDialog({ title: 'تسجيل الخروج', text: 'هل تريد تسجيل الخروج من حسابك؟', confirm: 'خروج' })) sb.auth.signOut();
  };

  return html`<nav class="sidebar" onClick=${(e) => e.target.closest('a') && onNavigate()}>
    <a class="brand" href="#/"><img src="assets/img/mark.svg" alt="" />${brand}</a>
    <div class="nav-group">
      <${NavItem} href="/" icon="home" label="الرئيسية" active=${path === '/'} />
      <${NavItem} href="/tasks" icon="tasks" label="مهامي" active=${path === '/tasks'} pill=${overview.data?.tasks?.in_progress || null} soft />
      <${NavItem} href="/market" icon="market" label="المهام المتاحة" active=${path === '/market'} pill=${overview.data?.tasks?.available || null} />
      <${NavItem} href="/warnings" icon="alert" label="التحذيرات" active=${path === '/warnings'} />
      <${NavItem} href="/wallet" icon="wallet" label="المستحقات" active=${path === '/wallet'} />
      <${NavItem} href="/activity" icon="history" label="سجلّي" active=${path === '/activity'} />
      <${NavItem} href="/settings" icon="settings" label="الإعدادات" active=${path === '/settings'} />
    </div>
    ${staff && html`<div class="nav-group">
      <div class="nav-title">الإدارة</div>
      <${NavItem} href="/admin" icon="shield" label="نظرة عامة" active=${path === '/admin'} />
      <${NavItem} href="/admin/accounts" icon="users" label="الحسابات" active=${path === '/admin/accounts'} pill=${d?.accounts?.pending || null} />
      <${NavItem} href="/admin/tasks" icon="tasks" label="المهام" active=${path === '/admin/tasks'} pill=${d?.tasks?.submitted || null} />
      <${NavItem} href="/admin/warnings" icon="alert" label="التحذيرات" active=${path === '/admin/warnings'} />
      <${NavItem} href="/admin/finance" icon="coins" label="المالية" active=${path === '/admin/finance'} />
      <${NavItem} href="/admin/ranks" icon="star" label="الرتب" active=${path === '/admin/ranks'} />
      <${NavItem} href="/admin/logs" icon="history" label="سجل النشاط" active=${path === '/admin/logs'} />
      <div class="nav-title">ديسكورد</div>
      <${NavItem} href="/admin/discord" icon="hash" label="البوت والسيرفر" active=${path === '/admin/discord'} />
      <${NavItem} href="/admin/bot" icon="bot" label="عمليات البوت" active=${path === '/admin/bot'} pill=${d?.jobs?.failed || null} />
    </div>`}
    <div class="sidebar-foot">
      <div class="me">
        <${Avatar} src=${profile.discord_avatar} name=${profile.display_name} />
        <div class="who"><b>${profile.display_name}</b><span>${profile.role === 'developer' ? specAr(profile.specialization) : ROLES[profile.role]}</span></div>
        <${IconButton} icon="logout" label="تسجيل الخروج" onClick=${logout} />
      </div>
    </div>
  </nav>`;
}

export function Shell({ route, blurred }) {
  const { profile } = useAppState();
  const [open, setOpen] = useState(false);
  const path = route.path;
  useEffect(() => setOpen(false), [path]);

  let Page = DEV_ROUTES[path];
  if (!Page && ADMIN_ROUTES[path]) Page = isAdmin(profile) ? ADMIN_ROUTES[path] : null;
  if (path === '/admin/discord' && !isAdmin(profile)) Page = null;

  return html`<div class=${'shell' + (open ? ' nav-open' : '') + (blurred ? ' blurred' : '')} aria-hidden=${blurred ? 'true' : undefined}>
    <${Sidebar} path=${path} profile=${profile} onNavigate=${() => setOpen(false)} />
    <div class="nav-scrim" onClick=${() => setOpen(false)}></div>
    <div class="main">
      <div class="topbar">
        <${IconButton} icon="menu" label="القائمة" onClick=${() => setOpen(true)} />
        <a class="brand" href="#/"><img src="assets/img/mark.svg" alt="" /></a>
        <${Avatar} src=${profile.discord_avatar} name=${profile.display_name} size="sm" />
      </div>
      ${Page
        ? html`<${Page} key=${path} route=${route} profile=${profile} owner=${isOwner(profile)} />`
        : html`<div class="page"><${Empty} title="الصفحة غير موجودة" text="الرابط غير صحيح أو ليست لديك صلاحية." action=${html`<a class="btn btn-sm" href="#/">الرئيسية</a>`} /></div>`}
    </div>
  </div>`;
}
