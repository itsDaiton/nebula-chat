const ic = (n, s = 16, cls = '') =>
  `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const logo = (p, s = 14) =>
  `<svg class="logo-${p}" width="${s}" height="${s}" viewBox="0 0 24 24" role="img" aria-label="${p === 'openai' ? 'OpenAI' : 'Anthropic'}"><path fill="currentColor" d="${BRANDS[p]}"/></svg>`;
const brandIc = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="currentColor" d="${BRANDS[n]}"/></svg>`;
const kbd = (...k) => `<span class="kbds">${k.map((x) => `<kbd>${x}</kbd>`).join('')}</span>`;
const mark = (s = 22) =>
  `<svg class="brand-mark" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Nebula Chat"><path d="M12 3c-1.333 1 -2 2.5 -2 4.5c0 3 2 4.5 2 4.5s2 1.5 2 4.5c0 2 -.667 3.5 -2 4.5"/><path d="M19.794 16.5c-.2 -1.655 -1.165 -2.982 -2.897 -3.982c-2.597 -1.5 -4.897 -.518 -4.897 -.518s-2.299 .982 -4.897 -.518c-1.732 -1 -2.698 -2.327 -2.897 -3.982"/><path d="M19.794 7.5c-1.532 -.655 -3.165 -.482 -4.897 .518c-2.597 1.5 -2.897 3.982 -2.897 3.982s-.299 2.482 -2.897 3.982c-1.732 1 -3.365 1.173 -4.897 .518"/></svg>`;

const MODELS = [
  { p: 'openai', id: 'gpt-4.1-mini', l: 'GPT-4.1 mini', ctx: '1M', out: '32,768', ctxN: '1,047,576' },
  { p: 'openai', id: 'gpt-4.1', l: 'GPT-4.1', ctx: '1M', out: '32,768' },
  { p: 'openai', id: 'gpt-5', l: 'GPT-5', ctx: '400K', out: '128,000' },
  { p: 'openai', id: 'gpt-5-mini', l: 'GPT-5 mini', ctx: '400K', out: '128,000' },
  { p: 'openai', id: 'gpt-5.6-luna', l: 'GPT-5.6 Luna', ctx: '1M', out: '128,000' },
  { p: 'openai', id: 'gpt-4o', l: 'GPT-4o', ctx: '128K', out: '16,384' },
  { p: 'openai', id: 'gpt-4o-mini', l: 'GPT-4o mini', ctx: '128K', out: '16,384' },
  { p: 'openai', id: 'gpt-4-turbo', l: 'GPT-4 Turbo', ctx: '128K', out: '4,096' },
  { p: 'anthropic', id: 'claude-3-5-sonnet-20241022', l: 'Claude 3.5 Sonnet', ctx: '200K', out: '8,192' },
  { p: 'anthropic', id: 'claude-3-5-haiku-20241022', l: 'Claude 3.5 Haiku', ctx: '200K', out: '8,192' },
  { p: 'anthropic', id: 'claude-3-opus-20240229', l: 'Claude 3 Opus', ctx: '200K', out: '4,096' },
];

const SESSIONS = [
  ['Run events in the SSE parser', '2m'],
  ['BullMQ vs Redis Streams for replies', '3h'],
  ['Drizzle migration for run_id', '5h'],
  ['Index strategy for the audit log', '1d'],
  ['Explain the LangGraph checkpointer', '2d'],
  ['Zone 2 plan for October', '4d'],
  ['Tailwind v4 theme tokens', '1w'],
  ['Draft: release notes 2.0', '1w'],
  ['Base UI vs Radix popover focus', '2w'],
  ['TOTP backup codes UX', '2w'],
  ['Postgres advisory locks', '3w'],
  ['Why is my Vitest coverage 79%', '1mo'],
  ['OpenTelemetry log export', '1mo'],
  ['Czech → English email', '2mo'],
];

// ---------- header ----------
const header = ({ rightOn = true, leftOn = true, crumb = '' } = {}) => `
<header class="hdr">
  <div class="brand">${mark()}<span>nebula chat</span></div>
  <button class="ibtn ${leftOn ? '' : 'on'}" aria-label="Toggle left panel">${ic('panel-left')}</button>
  ${crumb ? `<span class="hdr-title"><span class="slash">/</span><span class="trunc">${crumb}</span></span>` : ''}
  <div class="hdr-center"><div class="palette-hint">${ic('search', 14)}<span class="grow">Search Sessions or run a command…</span>${kbd('⌘', 'K')}</div></div>
  <button class="ibtn ${rightOn ? '' : 'on'}" aria-label="Toggle Inspector">${ic('panel-right')}</button>
  <button class="ibtn" aria-label="Toggle theme">${ic(document.documentElement.classList.contains('dark') ? 'sun' : 'moon')}</button>
</header>`;

const shell = ({ left, center, right, hdr = {}, cls = '' }) => `
<div class="app">${header({ ...hdr, rightOn: !!right })}
  <div class="panels ${right ? '' : 'no-right'} ${cls}">
    <aside class="panel" aria-label="Navigation">${left}</aside>
    <main class="panel">${center}</main>
    ${right ? `<aside class="panel" aria-label="Inspector">${right}</aside>` : ''}
  </div>
</div>`;

// ---------- left panel ----------
const footer = (who = 'admin') => {
  if (who === 'guest')
    return `<div class="lp-foot" style="flex-direction:column;align-items:stretch;gap:10px">
      <div class="row-f"><span class="avatar">${ic('user-round', 14)}</span><div class="who"><b>Guest</b><span>Your Sessions live on this device</span></div></div>
      <div class="row-f"><button class="btn block" style="flex:1">Sign in</button><button class="btn primary block" style="flex:1">Sign up</button></div></div>`;
  const status =
    who === 'admin-no2fa'
      ? `<span class="badge solid" style="height:16px;font-size:9.5px">Admin</span><span class="row-f warn" style="gap:3px">${ic('shield', 12)}2FA off</span>`
      : who === 'admin'
      ? `<span class="badge solid" style="height:16px;font-size:9.5px">Admin</span><span class="row-f ok" style="gap:3px">${ic('shield-check', 12)}2FA</span>`
      : who === 'unverified'
        ? `<span class="warn">Email not verified</span>`
        : `Registered`;
  return `<div class="lp-foot"><span class="avatar photo">DP</span><div class="who"><b>David Poslušný</b><span>${status}</span></div><button class="ibtn sm" aria-label="Account menu">${ic('chevrons-up-down', 15)}</button></div>`;
};

const leftChat = ({ active = 0, who = 'admin', sessions = SESSIONS, hoverIdx = -1, extra = '', count } = {}) => `
<div class="lp">
  <div class="nav-row ${active === -1 ? 'active' : ''}">${ic('square-pen')}<span class="grow">New chat</span>${kbd('⌘', 'E')}</div>
  <div class="nav-row">${ic('search')}<span class="grow">Search</span>${kbd('⌘', 'K')}</div>
  <div class="nav-row disabled">${ic('folder')}<span class="grow">Files</span><span class="soon">soon</span></div>
  <div class="nav-row disabled">${ic('sparkles')}<span class="grow">AI Studio</span><span class="soon">soon</span></div>
  <div class="sec-h"><span>Sessions</span><span class="mono">${count ?? sessions.length}</span></div>
  <div class="sessions">
    ${sessions
      .map(
        ([t, w], i) =>
          `<div class="s-item ${i === active ? 'active' : ''} ${i === hoverIdx ? 'hover' : ''}" ${i === hoverIdx ? 'id="hov"' : ''}><span class="tt">${t}</span>${
            i === hoverIdx ? `<button class="ibtn xs on" id="rowarchive" aria-label="Archive Session">${ic('archive', 14)}</button>` : `<span class="when">${w}</span>`
          }</div>`,
      )
      .join('')}
  </div>
  ${extra}
  ${footer(who)}
</div>`;

const leftAdmin = (active) => {
  const g = (label, items) =>
    `<div class="sec-h" style="padding-top:12px"><span>${label}</span></div>` +
    items
      .map(([n, i, soon]) =>
        `<div class="nav-row ${active === n ? 'active' : ''} ${soon ? 'disabled' : ''}">${ic(i)}<span class="grow">${n}</span>${soon ? '<span class="soon">soon</span>' : ''}</div>`,
      )
      .join('');
  return `<div class="lp">
    <div class="nav-row">${ic('arrow-left')}<span class="grow">Back to chat</span></div>
    ${g('Insights', [['Overview', 'layout-dashboard'], ['Model usage', 'chart-area']])}
    ${g('Manage', [['Users', 'users'], ['Sessions', 'message-square'], ['Runs', 'workflow', 1], ['Agents', 'bot', 1]])}
    ${g('System', [['Operations', 'server', 1], ['Audit log', 'scroll-text']])}
    <div style="flex:1"></div>
    ${footer('admin')}
  </div>`;
};

// ---------- context ring ----------
// Fills clockwise from 12 o'clock; the colour turns amber at 70% and red at 90%.
const ctxColor = (p) => (p >= 90 ? 'var(--destructive)' : p >= 70 ? 'var(--warning)' : 'var(--foreground-secondary)');
const ring = (p, size = 18, w = 2.4) => {
  const r = (size - w) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${p}% of context used"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--border-strong)" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${ctxColor(p)}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * p) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
};

// ---------- composer ----------
const composer = ({ text = '', run = false, guest = false, streaming = false, model = MODELS[0], pickerOpen = false, focus = false, under = '', ph = 'Ask anything…', runDim = false, runOff = false, ctx = null, ctxOpen = false } = {}) => `
<div class="composer ${focus ? 'focus' : ''}">
  <div class="ta ${text ? '' : 'ph'}">${text || ph}${focus ? '<span class="caret"></span>' : ''}</div>
  <div class="c-bar">
    <button class="ibtn sm" id="attach" aria-label="Attach (soon)" style="color:var(--faint)">${ic('paperclip', 16)}</button>
    <span class="pill ${run ? 'on' : ''} ${guest || runOff ? 'disabled' : ''}" id="runtoggle">${ic('workflow', 14)}Run</span>
    <span class="grow"></span>
    ${ctx === null ? '' : `<button class="ibtn sm ${ctxOpen ? 'on' : ''}" id="ctxring" aria-label="Context window usage">${ring(ctx)}</button>`}
    <span class="pill ghost model-trigger ${pickerOpen ? 'open' : ''} ${runDim ? 'dim' : ''}" id="modeltrigger">${logo(model.p, 13)}<span>${model.l}</span>${ic('chevron-down', 13)}</span>
    ${streaming ? `<span class="send" aria-label="Stop">${ic('square', 12)}</span>` : `<span class="send ${text ? '' : 'off'}" aria-label="Send">${ic('arrow-up', 16)}</span>`}
  </div>
</div>
<div class="c-under">${under || '<span></span><span>Nebula can make mistakes. Check important info.</span><span></span>'}</div>`;

// ---------- messages ----------
const user = (t) => `<div class="msg-u"><div class="bubble">${t}</div></div>`;
const meta = ({ tok = '1,284', cost = '$0.0021', model = 'GPT-4.1 mini', p = 'openai', hidden = false, cached = false } = {}) => `
<div class="meta ${hidden ? 'hidden' : ''}">
  <button class="ibtn xs" aria-label="Copy">${ic('copy', 14)}</button>
  <button class="ibtn xs" aria-label="Regenerate">${ic('refresh-cw', 14)}</button>
  <span class="sep"></span>
  ${logo(p, 11)}<span style="margin-left:5px">${model}</span>
  <span class="sep"></span><span class="mono">${tok} tokens</span>
  ${cost ? `<span class="sep"></span><span class="mono">~${cost}</span>` : ''}
  ${cached ? `<span class="sep"></span><span class="mono">cached</span>` : ''}
</div>`;
const assistant = (html, opts = {}) => `<div class="msg-a"><div class="prose">${html}</div>${opts.chip || ''}${opts.noMeta ? '' : meta(opts)}</div>`;

const codeBlock = (lang, body) => `<div class="code"><div class="code-h"><span>${lang}</span><button class="btn ghost sm" style="height:24px;font-size:11.5px;gap:5px">${ic('copy', 12)}Copy</button></div><pre>${body}</pre></div>`;

const runChip = ({ status = 'completed', steps = 9, dur = '41s', sel = false } = {}) => {
  const c = { completed: 'ok', partial: 'warn', failed: 'bad', cancelled: 'muted', running: 'sec' }[status];
  return `<div><span class="run-chip ${sel ? 'sel' : ''}">${ic('workflow', 13)}<span>Run</span><span class="${c} row-f" style="gap:5px"><span class="dot"></span>${status}</span><span class="mono">${steps} Steps · ${dur}</span>${ic('chevron-right', 13, 'faint')}</span></div>`;
};

// ---------- step progress ----------
const S = {
  done: ic('circle-check', 15, 'ok'),
  run: ic('loader-circle', 15, 'sec'),
  fail: ic('circle-x', 15, 'bad'),
  wait: ic('circle-dashed', 15, 'faint'),
};
const step = (state, label, agent = '', child = false, mid = false, extra = '') =>
  `<div class="st ${child ? 'child' : ''} ${mid ? 'mid' : ''} ${{ run: 'running', fail: 'failed', wait: 'pending', done: '' }[state]}">${S[state]}<span>${label}</span>${agent ? `<span class="mono">${agent}</span>` : ''}${extra}</div>`;

// ---------- inspector ----------
const tabs = (active, runBadge = '') => `<div class="tabs" role="tablist"><span class="tab ${active === 'session' ? 'active' : ''}">${ic('message-square', 13)}Session</span><span class="tab ${active === 'run' ? 'active' : ''}">${ic('workflow', 13)}Run${runBadge}</span><span class="grow"></span><button class="ibtn sm" aria-label="Close Inspector">${ic('x', 14)}</button></div>`;

const sessionTab = ({ model = MODELS[0], newChat = false } = {}) => `
${tabs('session')}
<div class="insp">
  ${newChat ? `<div class="notice" style="padding:9px 12px">${ic('info', 14)}<span>A new chat will use this Model. Pick another in the composer.</span></div>` : ''}
  <div><div class="lbl">Model</div>
    <div class="card raised row-f" style="gap:10px">${logo(model.p, 20)}<div class="grow"><div style="font-weight:500">${model.l}</div><div class="mono faint" style="font-size:11px">${model.id}</div></div></div></div>
  <div><div class="lbl">Limits</div>
    <dl class="kv"><dt>Context window</dt><dd>${model.ctxN || model.ctx} tokens</dd><dt>Max output</dt><dd>${model.out} tokens</dd></dl></div>
  ${newChat ? '' : `<div><div class="lbl">Session</div><dl class="kv"><dt>Messages</dt><dd>14</dd><dt>Created</dt><dd>27 Oct, 18:02</dd><dt>Last activity</dt><dd>2m ago</dd></dl></div>`}
</div>`;

const runEmpty = () => `
${tabs('run')}
<div class="insp"><div class="empty-state"><div class="ring">${ic('workflow', 18)}</div><b>No Run selected</b>
<span>Turn on <span class="badge" style="height:17px">${ic('workflow', 10)}Run</span> in the composer to have Agents plan, analyse and review an answer. Select a Run chip under an answer to see its Steps here.</span></div></div>`;

// ---------- overlays & positioning ----------
const place = () => {
  document.querySelectorAll('[data-anchor]').forEach((el) => {
    const a = document.getElementById(el.dataset.anchor);
    if (!a) return;
    const r = a.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    const [side, align] = (el.dataset.place || 'bottom-start').split('-');
    const gap = +(el.dataset.gap || 6);
    let top = side === 'top' ? r.top - e.height - gap : side === 'bottom' ? r.bottom + gap : r.top;
    let left = align === 'end' ? r.right - e.width : align === 'center' ? r.left + r.width / 2 - e.width / 2 : r.left;
    if (side === 'right' || side === 'left') {
      left = side === 'right' ? r.right + gap : r.left - e.width - gap;
      top = align === 'center' ? r.top + r.height / 2 - e.height / 2 : r.top;
    }
    el.style.top = `${Math.max(8, top)}px`;
    el.style.left = `${Math.max(8, Math.min(left, innerWidth - e.width - 8))}px`;
  });
};

// Deterministic pseudo-QR for the 2FA mock.
const qr = (n = 29, cell = 5) => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let r = '';
  const finder = (x, y) => {
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 7; j++) {
        const on = i === 0 || i === 6 || j === 0 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5);
        if (on) r += `<rect x="${(x + i) * cell}" y="${(y + j) * cell}" width="${cell}" height="${cell}"/>`;
      }
  };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const inF = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
      if (!inF && rnd() > 0.52) r += `<rect x="${i * cell}" y="${j * cell}" width="${cell}" height="${cell}"/>`;
    }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return `<svg width="${n * cell}" height="${n * cell}" viewBox="0 0 ${n * cell} ${n * cell}" style="background:#fff;padding:10px;border-radius:10px;box-sizing:content-box"><g fill="#0a0a0a">${r}</g></svg>`;
};

// Sparkline / chart helpers for admin pages.
const series = (n, base, vol, trend, seed) => {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, i) => Math.max(0, base + trend * i + (rnd() - 0.5) * vol + Math.sin(i / 1.6) * vol * 0.25));
};
const spark = (vals, w = 120, h = 30, stroke = 'var(--foreground)') => {
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)).toFixed(1)}`);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="M0,${h} L${pts.join(' L')} L${w},${h} Z" fill="${stroke}" opacity=".07"/><polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.4"/></svg>`;
};
