/* global React */
const { useState, useEffect } = React;

/* ============ Theme (light/dark) ============
   Shares the 'eggTheme' localStorage key with the rest of the system, so a
   theme picked here carries across to the demos/preview surfaces and back. */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('eggTheme') || 'light'; }
    catch (_) { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('eggTheme', theme); } catch (_) {}
  }, [theme]);
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
}

/* ============ Sidebar collapse ============
   Drives the shell's .app--collapsed chrome (icon rail + tooltips) straight
   from demos/_shell.css, persisting to the same 'ep-sidebar-collapsed' key as
   _shell.js so the rail state matches every other shell surface. No custom CSS
   — only the toggle wiring lives here. */
function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ep-sidebar-collapsed') === '1'; }
    catch (_) { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('ep-sidebar-collapsed', collapsed ? '1' : '0'); } catch (_) {}
  }, [collapsed]);
  return [collapsed, () => setCollapsed(c => !c)];
}

/* The canonical menu-integrated theme switch (see colors_and_type.css
   → .ep-theme-toggle). Icon swaps via [data-theme] on <html>. */
function ThemeToggle({ onToggle }) {
  return (
    <button className="ep-theme-toggle" type="button" onClick={onToggle} aria-label="Switch theme">
      <svg className="ep-theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      <svg className="ep-theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
  );
}

/* ============ Icons (inline strokes, Lucide-style) ============ */
const Icon = ({ d, size = 16, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  home:     <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
  projects: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></>,
  inbox:    <><path d="M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8"/><path d="M3 14h5l2 3h4l2-3h5"/></>,
  team:     <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="11" r="2.5"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"/><path d="M14.5 19c0-2 1.5-3.5 3.5-3.5s3 1.5 3 3.5"/></>,
  files:    <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></>,
  invoices: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus:     <><path d="M12 5v14M5 12h14"/></>,
  arrow:    <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  bell:     <><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  filter:   <><path d="M3 5h18M6 12h12M10 19h4"/></>,
};

/* ============ Sidebar (shell .app-side chrome) ============ */
const NAV = [
  { group: 'Workspace', items: [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'projects', label: 'Projects', icon: 'projects', badge: 3 },
    { id: 'inbox',    label: 'Inbox',    icon: 'inbox',    badge: 7 },
    { id: 'team',     label: 'Team',     icon: 'team' },
  ]},
  { group: 'Studio', items: [
    { id: 'files',    label: 'Files',    icon: 'files' },
    { id: 'invoices', label: 'Invoices', icon: 'invoices' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

function Sidebar({ active, onNav, onToggleTheme }) {
  return (
    <aside className="app-side">
      <div className="app-side__brand">
        <img src="../../../eggproject-design/assets/logo-mark.svg" alt="" />
        <b>EggProject</b>
      </div>

      {NAV.map(group => (
        <div className="app-side__group" key={group.group}>
          <span className="app-side__label">{group.group}</span>
          {group.items.map(navItem => (
            <a key={navItem.id} href="#" data-tip={navItem.label}
               onClick={(event) => { event.preventDefault(); onNav(navItem.id); }}
               className={`app-side__link ${active === navItem.id ? 'is-on' : ''}`}>
              <Icon d={ICONS[navItem.icon]} />
              {navItem.label}
              {navItem.badge && <span className="pill">{navItem.badge}</span>}
            </a>
          ))}
        </div>
      ))}

      <div className="app-side__footer">
        <span className="avatar avatar--blue avatar--md">JS</span>
        <span className="app-side__footer-text">Júlia Szabó<small>Head of Ops</small></span>
        <ThemeToggle onToggle={onToggleTheme} />
      </div>
    </aside>
  );
}

/* ============ Top bar (shell .app-top--portal) ============ */
function TopBar({ title, sub, collapsed, onToggleSidebar }) {
  return (
    <header className="app-top app-top--portal">
      <button className="app-top__icon-btn" type="button" data-app-side-toggle
              onClick={onToggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
      </button>
      <div className="app-top__title">
        <h1>{title}</h1>
        <span>{sub}</span>
      </div>
      <div className="app-top__search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input placeholder="Search projects, files, invoices…" />
        <span className="kbd kbd--sm">⌘K</span>
      </div>
      <div className="app-top__actions">
        <button className="app-top__icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          <span className="dot"></span>
        </button>
        <button className="btn btn--primary btn--sm">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3v8m-4-4h8"/></svg>
          New brief
        </button>
      </div>
    </header>
  );
}

/* ============ Stats (DS .stat--card) ============ */
const STATS = [
  { label: 'Active projects',   value: '3',       sub: '+1 this month',   delta: '+1' },
  { label: 'Hours this sprint', value: '142',     sub: 'of 160 budgeted', meter: 0.89 },
  { label: 'Awaiting review',   value: '5',       sub: '2 from your team', featured: true },
  { label: 'Open invoices',     value: '€12,400', sub: 'Due in 14 days' },
];

function StatCard({ label, value, sub, delta, meter, featured }) {
  return (
    <div className={`stat stat--card ${featured ? 'stat--featured' : ''}`}>
      <span className="stat__label">{label}</span>
      <div className="stat__value-row">
        <span className="stat__value">{value}</span>
        {delta && <span className="stat__delta">{delta}</span>}
      </div>
      {meter != null && (
        <div className="portal-meter"><div style={{ width: `${meter * 100}%` }} /></div>
      )}
      <span className="stat__subtitle stat__subtitle--mono">{sub}</span>
    </div>
  );
}

/* ============ Project list ============ */
const PROJECTS = [
  { name: 'Atlas — Logistics platform',  status: 'In progress', statusKey: 'progress', updated: '2h ago', progress: 0.62, team: ['JS', 'AK', 'BT'], milestone: 'Beta release · May 28' },
  { name: 'Halifax Ops · Phase 2',        status: 'Review',      statusKey: 'review',   updated: '5h ago', progress: 0.94, team: ['JS', 'AK'],       milestone: 'Final approval' },
  { name: 'Lumenwerk CRM',                status: 'On hold',     statusKey: 'hold',     updated: 'Yesterday', progress: 0.35, team: ['BT'],          milestone: 'Awaiting brief sign-off' },
  { name: 'Méreg Labs — Marketing site',  status: 'Shipped',     statusKey: 'shipped',  updated: '3d ago', progress: 1.0,  team: ['AK', 'BT', 'NK', 'JS'], milestone: 'Live · v1.0.0' },
];

function StatusBadge({ kind, label }) {
  const tone = { progress: 'info', review: 'warning', hold: 'outline', shipped: 'success' }[kind];
  return <span className={`badge badge--${tone}`}><span className="badge__dot" />{label}</span>;
}

function Avatar({ initials, index }) {
  const palette = ['blue', 'yolk', 'ink', 'teal'];
  return <span className={`avatar avatar--${palette[index % palette.length]} avatar--sm`}>{initials}</span>;
}

function ProjectRow({ project, i }) {
  return (
    <a href="#" className="portal-project-row">
      <div className="portal-project-row__main">
        <strong>{project.name}</strong>
        <span>{project.milestone}</span>
      </div>
      <StatusBadge kind={project.statusKey} label={project.status} />
      <div className="portal-project-row__progress">
        <div className="portal-project-row__bar"><div style={{ width: `${project.progress * 100}%` }} /></div>
        <span>{Math.round(project.progress * 100)}%</span>
      </div>
      <div className="avatar-group avatar-group--sm">
        {project.team.map((teammate, j) => <Avatar key={teammate} initials={teammate} index={i + j} />)}
      </div>
      <span className="portal-project-row__updated">{project.updated}</span>
      <Icon d={ICONS.arrow} size={14} />
    </a>
  );
}

/* ============ Activity feed ============ */
const ACTIVITY = [
  { who: 'Adam K.',   what: 'pushed', target: 'atlas/dashboard.tsx', when: '12 min ago', kind: 'commit' },
  { who: 'Bence T.',  what: 'opened brief', target: 'Lumenwerk · Marketing', when: '1h ago', kind: 'brief' },
  { who: 'Júlia S.',  what: 'approved', target: 'Halifax Ops · invoice #042', when: '3h ago', kind: 'approve' },
  { who: 'Adam K.',   what: 'shipped', target: 'Méreg Labs v1.0.0', when: 'Yesterday', kind: 'ship' },
];

function ActivityItem({ activity }) {
  const dot = activity.kind === 'ship' ? 'yolk' : activity.kind === 'approve' ? 'mint' : activity.kind === 'brief' ? 'ink' : 'blue';
  return (
    <li className="portal-activity">
      <span className={`portal-activity__dot portal-activity__dot--${dot}`} />
      <div className="portal-activity__body">
        <strong>{activity.who}</strong> {activity.what} <em>{activity.target}</em>
        <span className="portal-activity__when">{activity.when}</span>
      </div>
    </li>
  );
}

/* ============ Upcoming card ============ */
function UpcomingCard() {
  return (
    <article className="portal-upcoming">
      <span className="portal-upcoming__eyebrow">Next milestone</span>
      <h3>Atlas — Beta release</h3>
      <p>The platform goes to closed beta on Thursday. Final go/no-go review with the Atlas team.</p>
      <div className="portal-upcoming__date">
        <div className="portal-upcoming__date-month">MAY</div>
        <div className="portal-upcoming__date-day">28</div>
      </div>
      <div className="portal-upcoming__row">
        <div className="avatar-group avatar-group--sm portal-upcoming__team">
          <Avatar initials="JS" index={0} />
          <Avatar initials="AK" index={1} />
          <Avatar initials="BT" index={2} />
        </div>
        <button className="btn btn--ghost-invert btn--sm">Open project →</button>
      </div>
    </article>
  );
}

/* ============ Page ============ */
function Portal() {
  const [active, setActive] = useState('overview');
  const [, toggleTheme] = useTheme();
  const [collapsed, toggleCollapsed] = useSidebarCollapse();
  return (
    <div className={`app ${collapsed ? 'app--collapsed' : ''}`} data-screen-label="EggProject Portal">
      <Sidebar active={active} onNav={setActive} onToggleTheme={toggleTheme} />
      <main className="app-main">
        <TopBar title="Good morning, Júlia." sub="Wednesday, 12 May · 3 active projects"
                collapsed={collapsed} onToggleSidebar={toggleCollapsed} />
        <section className="app-content">
          <div className="portal-stats">
            {STATS.map(stat => <StatCard key={stat.label} {...stat} />)}
          </div>
          <div className="portal-grid">
            <section className="portal-panel portal-panel--projects">
              <div className="portal-panel__header">
                <h2>Projects</h2>
                <div className="portal-panel__header-actions">
                  <button className="portal-chip">All <span>4</span></button>
                  <button className="portal-chip is-on">Active <span>3</span></button>
                  <button className="portal-chip">Archived</button>
                  <button className="portal-icon-button portal-icon-button--small"><Icon d={ICONS.filter} size={14} /></button>
                </div>
              </div>
              <div className="portal-project-rows">
                {PROJECTS.map((project, i) => <ProjectRow key={project.name} project={project} i={i} />)}
              </div>
            </section>

            <aside className="portal-aside">
              <UpcomingCard />
              <section className="portal-panel portal-panel--activity">
                <div className="portal-panel__header">
                  <h2>Activity</h2>
                  <a href="#" className="portal-link">See all →</a>
                </div>
                <ul className="portal-activities">
                  {ACTIVITY.map((activity, i) => <ActivityItem key={i} activity={activity} />)}
                </ul>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

Object.assign(window, { Portal });
