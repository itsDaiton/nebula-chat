const CODE_SSE = `<span class="c">// modules/chat/utils/sseEvents.ts</span>
<span class="k">export const</span> SSE_EVENTS = <span class="k">new</span> <span class="t">Set</span>([
  <span class="s">'token'</span>, <span class="s">'usage'</span>, <span class="s">'error'</span>, <span class="s">'end'</span>,
  <span class="s">'step-started'</span>, <span class="s">'step-finished'</span>, <span class="s">'run-finished'</span>,
] <span class="k">as const</span>);

<span class="k">export type</span> <span class="t">SseEventName</span> = <span class="t">typeof</span> SSE_EVENTS <span class="k">extends</span> <span class="t">Set</span>&lt;<span class="k">infer</span> <span class="t">T</span>&gt; ? <span class="t">T</span> : <span class="t">never</span>;`;

const THREAD_ANSWER = `<p>Add the three Run event names to the set the parser already filters on. Anything outside it is still dropped, so a Direct reply's stream is unaffected.</p>
${codeBlock('typescript', CODE_SSE)}
<p>Then handle them in <code class="i">useChatStream</code> next to <code class="i">token</code> and <code class="i">end</code>, validating each frame the way <code class="i">error</code> data is validated:</p>
<table><tr><th>Event</th><th>Payload</th><th>What the UI does</th></tr>
<tr><td><code class="i">step-started</code></td><td class="mono" style="font-size:12px">stepId, attempt, phase, label</td><td>Adds or resets a Step row</td></tr>
<tr><td><code class="i">step-finished</code></td><td class="mono" style="font-size:12px">stepId, status</td><td>Marks it done or failed</td></tr>
<tr><td><code class="i">run-finished</code></td><td class="mono" style="font-size:12px">runId, status</td><td>Shows the end status</td></tr></table>`;

const centerThread = ({ composerOpts = {}, lastMetaHidden = false, extraBottom = '' } = {}) => `
<div class="chat">
  <div class="thread"><div class="col">
    ${user('How do I make the client parser accept the new Run events?')}
    ${assistant(THREAD_ANSWER, { hidden: lastMetaHidden })}
    ${extraBottom}
  </div></div>
  <div class="col" style="padding-bottom:4px">${composer({ ctx: 4, ...composerOpts })}</div>
</div>`;

const SCREENS = {
  // NEB-547 · 548 · 549 · 551
  'chat-empty': () =>
    shell({
      left: leftChat({ active: -1 }),
      center: `<div class="chat"><div class="empty"><div class="col">
        <div class="greet">Good evening, David</div>
        <div class="greet-hint">${ic('workflow', 14)}Turn on Run to let Agents plan, analyse and review the answer.</div>
        <div style="margin-top:34px">${composer({ focus: true })}</div>
        <div class="starters" style="margin-top:6px">
          <div class="starter">${ic('zap', 14)}<span>Explain Redis Streams consumer groups like I'm new to them</span></div>
          <div class="starter">${ic('list-tree', 14)}<span>Plan a migration from Chakra UI to shadcn/ui</span></div>
          <div class="starter">${ic('type', 14)}<span>Rewrite this paragraph to be clearer and shorter</span></div>
          <div class="starter">${ic('gauge', 14)}<span>Build me a 4-week Zone 2 running plan</span></div>
        </div></div></div></div>`,
      right: sessionTab({ newChat: true }),
    }),

  // NEB-549 · 551
  'chat-thread': () =>
    shell({
      hdr: { crumb: 'Run events in the SSE parser' },
      left: leftChat({ active: 0 }),
      center: centerThread(),
      right: sessionTab(),
    }),

  // NEB-550 · 566
  'model-picker': () =>
    shell({
      hdr: { crumb: 'Run events in the SSE parser' },
      left: leftChat({ active: 0 }),
      center: centerThread({ composerOpts: { pickerOpen: true }, lastMetaHidden: true }),
      right: sessionTab(),
    }) +
    `<div class="pop mp" data-anchor="modeltrigger" data-place="top-end" data-gap="8">
      <div class="cmd-in" style="height:44px;font-size:13.5px">${ic('search', 15, 'muted')}<span>gpt</span><span class="caret"></span></div>
      <div class="cmd-list" style="padding:4px 6px 6px">
        <div class="cmd-g row-f" style="gap:6px">${logo('openai', 11)}OpenAI</div>
        ${MODELS.filter((m) => m.p === 'openai').slice(0, 6).map((m, i) =>
          `<div class="mp-i ${i === 2 ? 'hl' : ''}">${logo(m.p, 16)}<div class="grow"><div class="l">${m.l.replace('GPT', '<mark style="background:none;color:inherit;font-weight:600">GPT</mark>')}</div><div class="id">${m.id}</div></div><span class="ctx">${m.ctx}</span><span style="width:16px">${i === 0 ? ic('check', 15) : ''}</span></div>`).join('')}
        <div class="cmd-g row-f" style="gap:6px;margin-top:2px">${logo('anthropic', 11)}Anthropic</div>
        <div class="mp-i" style="height:34px;color:var(--faint);font-size:12.5px;padding-left:10px">No Anthropic models match “gpt”</div>
      </div>
      <div class="cmd-f"><span>${kbd('↑', '↓')} move</span><span>${kbd('↵')} select</span><span class="grow"></span><span>context size</span></div>
    </div>`,

  // NEB-652 · 662
  'run-streaming': () =>
    shell({
      hdr: { crumb: 'Should we move replies to Streams?' },
      left: leftChat({ active: 0, sessions: [['Should we move replies to Streams?', 'now'], ...SESSIONS.slice(0, 13)] }),
      center: `<div class="chat"><div class="thread"><div class="col">
        ${user('Should Nebula keep BullMQ for replies or move fully to Redis Streams? Weigh delivery guarantees and ops cost.')}
        <div class="steps">
          <div class="steps-h">${ic('workflow', 14)}<span>Run</span><span class="mono">running · 0:23</span><span class="grow"></span><span class="mono">turn 2 of ≤4</span></div>
          <div class="st-group"><div class="st-gl">Intake <span class="par">parallel</span></div>
            ${step('done', 'Detecting the language')}${step('done', 'Summarising the Session')}</div>
          <div class="st-group"><div class="st-gl">Turn 1</div>
            ${step('done', 'Planning the work', 'orchestrator')}
            ${step('done', 'Analysing', 'analyst', true, true)}${step('done', 'Reviewing', 'critic', true)}</div>
          <div class="st-group"><div class="st-gl">Turn 2</div>
            ${step('done', 'Planning the work', 'orchestrator')}
            ${step('run', 'Analysing', 'analyst', true, true)}${step('fail', 'Reviewing', 'critic · failed', true)}</div>
          <div class="st-group"><div class="st-gl">Answer</div>${step('wait', 'Writing the answer', 'output')}</div>
        </div>
      </div></div>
      <div class="col" style="padding-bottom:4px">${composer({ streaming: true, runDim: true, under: `<span class="row-f" style="gap:6px">${ic('info', 13)}Runs choose their own Models; the picker applies to Direct replies.</span><span></span>` })}</div></div>`,
      right: sessionTab(),
    }),

  // NEB-652 · 662 · 362 (in NEB-551's Run tab slot)
  'run-finished': () =>
    shell({
      cls: 'wide-right',
      hdr: { crumb: 'Should we move replies to Streams?' },
      left: leftChat({ active: 0, sessions: [['Should we move replies to Streams?', '1m'], ...SESSIONS.slice(0, 13)] }),
      center: `<div class="chat"><div class="thread"><div class="col">
        ${user('Should Nebula keep BullMQ for replies or move fully to Redis Streams? Weigh delivery guarantees and ops cost.')}
        <div class="msg-a"><div class="prose"><p><strong>Keep BullMQ for the Run job and Redis Streams for delivery</strong> — they solve different problems, and the split you already have (ADR-0014) is the cheaper one to operate.</p>
        <h3>Delivery guarantees</h3><ul><li>Streams give you replay from <code class="i">Last-Event-ID</code>, which the client already uses to re-attach mid-reply.</li><li>BullMQ gives retries, backoff and the one-job-per-Run rule, which Streams would make you rebuild by hand.</li></ul>
        <h3>Ops cost</h3><p>Both live in the same Redis, so moving fully to Streams saves no infrastructure — only a dependency, at the price of a hand-written scheduler.</p></div>
        <div class="endline warn">${ic('triangle-alert', 14)}<span><b style="font-weight:500">Partial answer.</b> <span class="sec">The reviewer failed in turn 2, so this answer wasn’t critiqued a second time.</span></span></div>
        ${runChip({ status: 'partial', steps: 9, dur: '41s', sel: true })}
        ${meta({ tok: '38,410', cost: '$0.031', model: 'Run', p: 'openai' })}</div>
      </div></div><div class="col" style="padding-bottom:4px">${composer({ run: false })}</div></div>`,
      right: `${tabs('run', '<span class="badge warn">partial</span>')}
      <div class="insp" style="gap:14px">
        <div class="row-f"><span class="badge warn"><span class="dot"></span>partial</span><span class="mono muted" style="font-size:11.5px">9 Steps · 41.2s · 27 Oct 21:14</span></div>
        <div><div class="lbl"><span>Run budget</span><span class="mono">38,410 / 60,000 tokens</span></div><div class="bar"><i style="width:64%"></i></div></div>
        <div><div class="lbl">Brief</div><div class="io" style="max-height:62px">Compare BullMQ and Redis Streams for Nebula's reply delivery. Language: English. Prior context: the user owns the worker app; ADR-0014 split send/stream…</div></div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <div class="st-gl" style="padding-left:2px">Intake</div>
          <div class="rs"><div class="rstep">${S.done}<span class="grow">Detecting the language</span><span class="mono">0.8s</span></div><div class="rstep">${S.done}<span class="grow">Summarising the Session</span><span class="mono">2.1s</span></div></div>
          <div class="st-gl" style="padding-left:2px;margin-top:4px">Turn 1</div>
          <div class="rs"><div class="rstep">${S.done}<span class="grow">Planning the work</span><span class="mono">3.4s</span></div><div class="rstep">${S.done}<span class="grow">Analysing <span class="mono">analyst</span></span><span class="mono">6.0s</span></div><div class="rstep">${S.done}<span class="grow">Reviewing <span class="mono">critic</span></span><span class="mono">4.2s</span></div></div>
          <div class="st-gl" style="padding-left:2px;margin-top:4px">Turn 2</div>
          <div class="rs"><div class="rstep">${S.done}<span class="grow">Planning the work</span><span class="mono">2.9s</span></div><div class="rstep">${S.done}<span class="grow">Analysing <span class="mono">analyst</span></span><span class="mono">5.5s</span></div>
            <div class="rstep sel">${S.fail}<span class="grow">Reviewing <span class="mono">critic</span></span><span class="mono">3.0s</span></div>
            <div class="card" style="margin:2px 0 6px;padding:10px;display:flex;flex-direction:column;gap:8px">
              <dl class="kv" style="font-size:12px"><dt>Model</dt><dd class="row-f" style="justify-content:flex-end;gap:5px">${logo('anthropic', 11)}claude-3-5-haiku</dd><dt>Tokens</dt><dd>2,912 in · 0 out</dd><dt>Error</dt><dd class="bad">ModelTimeout</dd></dl>
              <div class="lbl" style="margin:0">Input <span class="mono faint" style="font-weight:400">${ic('chevron-down', 11)}</span></div>
              <div class="io">{ "findings": "Streams already back delivery; BullMQ owns retries…", "task": "Challenge the analyst's ops-cost claim…" }</div>
              <button class="btn sm" style="align-self:flex-start">${ic('external-link', 13)}Show full input &amp; output</button>
            </div></div>
          <div class="st-gl" style="padding-left:2px;margin-top:4px">Answer</div>
          <div class="rs"><div class="rstep">${S.done}<span class="grow">Writing the answer <span class="mono">output</span></span><span class="mono">13.3s</span></div></div>
        </div>
      </div>`,
    }),

  // NEB-585
  'run-clarify': () =>
    shell({
      hdr: { crumb: 'Trip plan for the Dolomites' },
      left: leftChat({ active: 0, sessions: [['Trip plan for the Dolomites', 'now'], ...SESSIONS.slice(0, 13)] }),
      center: `<div class="chat"><div class="thread"><div class="col">
        ${user('Plan me a 4-day hiking trip in the Dolomites with one rest day.')}
        <div class="steps" style="padding-bottom:6px"><div class="steps-h" style="border:0;margin:0;padding:0">${ic('workflow', 14)}<span>Run</span><span class="mono">waiting for you · 4 Steps done</span><span class="grow"></span>${ic('chevron-down', 14, 'faint')}</div></div>
        <div class="msg-a">
          <div class="row-f" style="font-size:12px;color:var(--muted-foreground);margin-bottom:6px">${ic('message-circle-question', 14)}<span>Clarifying question</span></div>
          <div class="prose"><p>Before I plan the routes: <strong>which month are you going, and are you comfortable on via ferrata (fixed-cable) sections?</strong> That changes which huts are open and which passes I can include.</p></div>
          <div class="endline mute" style="margin-top:4px">${ic('hourglass', 14)}<span><span class="sec">Waiting for your answer.</span> If you don’t reply within 3 minutes, the Run carries on without it and the answer will be marked partial.</span></div>
        </div>
      </div></div>
      <div class="col" style="padding-bottom:4px">
        <div class="row-f" style="font-size:12px;color:var(--muted-foreground);padding:0 4px 6px 8px">${ic('corner-down-left', 13)}<span>Your next message answers the Run’s question</span><span class="grow"></span><button class="btn ghost sm" style="height:24px;font-size:12px">${ic('x', 12)}Cancel Run</button></div>
        ${composer({ text: 'Mid-September, and yes to easy via ferrata', focus: true, runDim: true, runOff: true })}</div></div>`,
      right: sessionTab(),
    }),

  // NEB-549 · 652 (Guest)
  guest: () =>
    shell({
      left: leftChat({ active: -1, who: 'guest', sessions: SESSIONS.slice(5, 7), count: 2 }),
      center: `<div class="chat"><div class="empty"><div class="col">
        <div class="greet">Good evening</div>
        <div class="greet-hint">Ask anything. Sign up to keep your Sessions and unlock Runs.</div>
        <div style="margin-top:34px">${composer({ guest: true, text: 'Compare Postgres and SQLite for a side project', under: `<span class="row-f warn" style="gap:6px"><span class="dot"></span><span class="mono">3 of 10</span> messages left</span><span><a>Sign up</a> to keep chatting</span>` })}</div>
      </div></div></div>`,
      right: sessionTab({ newChat: true }),
    }) + `<div class="tip" data-anchor="runtoggle" data-place="top-start" data-gap="8">Runs are for registered users.<br><b>Sign up</b> to let Agents plan and review answers.</div>`,

  // NEB-554
  palette: () =>
    shell({ hdr: { crumb: 'Run events in the SSE parser' }, left: leftChat({ active: 0 }), center: centerThread({ lastMetaHidden: true }), right: sessionTab() }) +
    `<div class="scrim"></div><div class="pop cmd" role="dialog" aria-label="Command palette">
      <div class="cmd-in">${ic('search', 17, 'muted')}<span>run</span><span class="caret"></span><span class="grow"></span><kbd>esc</kbd></div>
      <div class="cmd-list">
        <div class="cmd-g">Sessions</div>
        <div class="cmd-i hl">${ic('message-square')}<span class="grow"><mark>Run</mark> events in the SSE parser</span><span class="mono faint" style="font-size:11px">2m</span></div>
        <div class="cmd-i">${ic('message-square')}<span class="grow">Should we move replies to Streams? <span class="faint">· “…a <mark>Run</mark> job per message…”</span></span><span class="mono faint" style="font-size:11px">1d</span></div>
        <div class="cmd-i">${ic('message-square')}<span class="grow">Zone 2 plan for October <span class="faint">· “…easy <mark>run</mark>s at 135 bpm…”</span></span><span class="mono faint" style="font-size:11px">4d</span></div>
        <div class="cmd-g">Actions</div>
        <div class="cmd-i">${ic('square-pen')}<span class="grow">New chat</span>${kbd('⌘', 'E')}</div>
        <div class="cmd-i">${ic('workflow')}<span class="grow">Toggle <mark>Run</mark> for the next message</span></div>
        <div class="cmd-i">${ic('chevrons-up-down')}<span class="grow">Switch Model…</span></div>
        <div class="cmd-i">${ic('moon')}<span class="grow">Toggle theme</span></div>
        <div class="cmd-i">${ic('settings')}<span class="grow">Open Settings</span></div>
        <div class="cmd-g">Admin</div>
        <div class="cmd-i">${ic('layout-dashboard')}<span class="grow">Open admin</span><span class="badge" style="height:17px">Admin</span></div>
      </div>
      <div class="cmd-f"><span>${kbd('↑', '↓')} navigate</span><span>${kbd('↵')} open</span><span>${kbd('esc')} close</span></div>
    </div>`,

  // NEB-548
  archive: () =>
    shell({ hdr: { crumb: 'Run events in the SSE parser' }, left: leftChat({ active: 0, hoverIdx: 3 }), center: centerThread({ lastMetaHidden: true }), right: sessionTab() }) +
    `<div class="tip" data-anchor="rowarchive" data-place="right-center" data-gap="10">Archive</div>
     <div class="toast">${ic('archive', 16, 'muted')}<span class="grow">“Drizzle migration for run_id” archived</span><button class="btn sm">${ic('undo-2', 13)}Undo</button></div>`,

  // NEB-552 — Settings is a modal over the app, no route
  'settings-security': () =>
    settingsModal('Security', `
      <div class="notice warn">${ic('shield', 15)}<span><b style="font-weight:500">Admins must use two-factor authentication.</b> Turn it on to open the admin dashboard.</span></div>
      <div class="s-card">
        <div class="s-row"><div class="grow"><b>Password</b><span>Last changed 3 months ago</span></div><button class="btn sm">Change password</button></div>
        <div class="s-row" style="flex-direction:column;align-items:stretch;gap:14px">
          <div class="row-f" style="gap:16px"><div class="grow"><b>Two-factor authentication</b><span>Step 2 of 3 · scan the code, then enter the 6 digits your app shows</span></div><button class="btn sm ghost">Cancel</button></div>
          <div style="display:flex;gap:20px;align-items:center">${qr(29, 4)}
            <div class="grow"><div class="lbl" style="margin-bottom:6px">Can’t scan it? Enter this key</div>
              <div class="input mono" style="font-size:12px;justify-content:space-between">JBSW Y3DP EHPK 3PXP<button class="ibtn xs">${ic('copy', 13)}</button></div>
              <div class="field"><label>Code from the app</label><div class="row-f" style="gap:10px"><div class="otp" style="margin-top:0;gap:6px">${'48210'.split('').map((d) => `<span style="width:34px;height:40px;font-size:16px">${d}</span>`).join('')}<span class="focus" style="width:34px;height:40px"></span></div><button class="btn primary sm" style="height:40px">Verify</button></div></div></div></div>
        </div>
        <div class="s-row"><div class="grow"><b>Sign out everywhere</b><span>End every auth session, this one included</span></div><button class="btn sm danger-o">Sign out everywhere</button></div>
      </div>`, 'admin-no2fa'),

  'settings-appearance': () =>
    settingsModal('Appearance', `
      <div class="s-card">
        <div class="s-row" style="flex-direction:column;align-items:stretch;gap:12px"><div class="grow"><b>Theme</b><span>System follows your device setting</span></div>
          <div class="row-f" style="gap:12px">${themePrev('System', 'sys', true)}${themePrev('Light', 'l')}${themePrev('Dark', 'd')}</div></div>
        <div class="s-row"><div class="grow"><b>Interface font</b><span>Geist, or your system’s UI font</span></div><div class="seg"><span class="on">Geist</span><span style="font-family:system-ui">System</span></div></div>
      </div>`),

  'settings-archived': () =>
    settingsModal('Archived Sessions', `
      <div class="muted" style="font-size:12.5px">Archived Sessions are hidden from the list and search. Open one to read it, or restore it to keep chatting.</div>
      <div class="s-card">
        ${[['Drizzle migration for run_id', 'Archived 1m ago · 14 messages'], ['Old pricing notes', 'Archived 3d ago · 6 messages'], ['Test session — ignore', 'Archived 2w ago · 2 messages'], ['Weekly plan draft', 'Archived 1mo ago · 21 messages']].map(([t, w]) => `<div class="s-row" style="padding:10px 16px"><div class="grow"><b style="font-size:13px">${t}</b><span>${w}</span></div><button class="btn sm ghost">${ic('eye', 13)}Open</button><button class="btn sm">${ic('archive-restore', 13)}Restore</button></div>`).join('')}
      </div>`),

  'settings-account': () =>
    settingsModal('Account & data', `
      <div class="notice">${ic('eye', 15)}<span><b style="font-weight:500">Admins can read your Sessions.</b> Nebula’s Admins can open any Session to investigate abuse or bugs. Every read is recorded in an audit log.</span></div>
      <div class="s-card">
        <div class="s-row"><div class="grow"><b>Account ID</b><span class="mono" style="font-size:11.5px">usr_01JB7Q4X9M2V8KZ3H6T0RNC5WE</span></div><button class="btn sm">${ic('copy', 13)}Copy</button></div>
        <div class="s-row"><div class="grow"><b>Delete account</b><span>Your account is scheduled for deletion and removed for good after 30 days. Sign in before then to restore it.</span></div><button class="btn sm danger-o">Delete account…</button></div>
      </div>`),

  // NEB-548 · 552 — an archived Session opened by id
  'archived-session': () =>
    shell({
      hdr: { crumb: 'Drizzle migration for run_id' },
      left: leftChat({ active: -2 }),
      center: `<div class="banner">${ic('archive', 14)}<span class="grow">Archived Session. It’s hidden from your list and search.</span></div>
        <div class="chat"><div class="thread"><div class="col">
          ${user('Write the Drizzle migration that adds run_id to messages.')}
          ${assistant('<p>Add a nullable <code class="i">run_id</code> referencing <code class="i">runs.id</code>, with an index for the Run inspector’s lookups:</p>' + codeBlock('typescript', `<span class="k">export const</span> messages = <span class="f">pgTable</span>(<span class="s">'messages'</span>, {
  <span class="c">// …existing columns</span>
  runId: <span class="f">uuid</span>(<span class="s">'run_id'</span>).<span class="f">references</span>(() =&gt; runs.id),
}, (t) =&gt; [<span class="f">index</span>(<span class="s">'messages_run_id_idx'</span>).<span class="f">on</span>(t.runId)]);`), { tok: '642', cost: '$0.0007' })}
        </div></div>
        <div class="col" style="padding-bottom:14px"><div class="restore-bar">${ic('archive', 16, 'muted')}<span class="grow">Restore this Session to keep chatting.</span><button class="btn primary sm">${ic('archive-restore', 13)}Restore</button></div></div></div>`,
      right: sessionTab(),
    }),

  // Context window ring (new ticket): hover and click
  'context-hover': () =>
    shell({
      hdr: { crumb: 'Index strategy for the audit log' },
      left: leftChat({ active: 3 }),
      center: centerThread({ composerOpts: { ctx: 74, model: { p: 'anthropic', id: 'claude-3-5-haiku-20241022', l: 'Claude 3.5 Haiku', ctx: '200K', out: '8,192', ctxN: '200,000' } }, lastMetaHidden: true }),
      right: sessionTab({ model: { p: 'anthropic', id: 'claude-3-5-haiku-20241022', l: 'Claude 3.5 Haiku', ctx: '200K', out: '8,192', ctxN: '200,000' } }),
    }) + `<div class="tip" data-anchor="ctxring" data-place="top-center" data-gap="8"><span class="mono">74%</span> of context used · <span class="mono">142K / 192K</span> tokens</div>`,
  'context-details': () =>
    shell({
      hdr: { crumb: 'Index strategy for the audit log' },
      left: leftChat({ active: 3 }),
      center: centerThread({ composerOpts: { ctx: 74, ctxOpen: true, model: { p: 'anthropic', id: 'claude-3-5-haiku-20241022', l: 'Claude 3.5 Haiku', ctx: '200K', out: '8,192', ctxN: '200,000' } }, lastMetaHidden: true }),
      right: sessionTab({ model: { p: 'anthropic', id: 'claude-3-5-haiku-20241022', l: 'Claude 3.5 Haiku', ctx: '200K', out: '8,192', ctxN: '200,000' } }),
    }) +
    `<div class="pop" style="width:340px;padding:16px" data-anchor="ctxring" data-place="top-center" data-gap="10" role="dialog" aria-label="Context window">
      <div class="row-f" style="gap:14px">${ring(74, 52, 5)}<div class="grow"><div style="font-weight:600;font-size:14px">Context window</div><div class="row-f muted" style="gap:6px;font-size:12px">${logo('anthropic', 12)}Claude 3.5 Haiku</div></div><span class="mono warn" style="font-size:20px;font-weight:500">74%</span></div>
      <div style="margin-top:14px"><div class="lbl"><span>Sent with the last reply</span><span class="mono">142,300 / 191,808</span></div><div class="bar"><i style="width:74%;background:var(--warning)"></i></div></div>
      <dl class="kv" style="margin-top:14px"><dt>Messages included</dt><dd>last 20 of 46</dd><dt>Reserved for the reply</dt><dd>8,192 tokens</dd><dt>Context window</dt><dd>200,000 tokens</dd></dl>
      <div class="notice" style="margin-top:14px;padding:10px 12px">${ic('info', 14)}<span>When it fills up, the oldest messages stop being sent to the Model. Start a new chat to begin fresh.</span></div>
      <button class="btn sm" style="margin-top:12px;width:100%">${ic('square-pen', 13)}New chat</button>
    </div>`,

  // NEB-553
  'auth-signin': () => `<div class="auth">
    <div class="brand" style="font-size:16px">${mark(26)}<span>nebula chat</span></div>
    <div class="auth-card"><h1>Sign in</h1><div class="desc">Your Guest Sessions move to your account.</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px"><button class="btn block">${brandIc('github', 15)}Continue with GitHub</button><button class="btn block">${brandIc('google', 14)}Continue with Google</button></div>
      <div class="or">or</div>
      <div class="field"><label>Email</label><div class="input">david@example.com</div></div>
      <div class="field"><label class="row-f"><span class="grow">Password</span><span class="muted" style="font-weight:400;font-size:12px">Forgot password?</span></label><div class="input focus">•••••••••••<span class="grow"></span>${ic('eye', 15, 'muted')}</div></div>
      <button class="btn primary block" style="margin-top:18px">Sign in</button>
      <div style="text-align:center;margin-top:16px;font-size:12.5px" class="muted">No account? <span style="color:var(--foreground);text-decoration:underline;text-underline-offset:3px">Sign up</span></div>
    </div></div>`,

  'auth-states': () => `<div class="auth" style="gap:0"><div class="grid4">
    <div><div class="cap-l">2FA challenge</div><div class="auth-card" style="height:330px"><h1>Two-factor code</h1><div class="desc">Enter the 6-digit code from your authenticator app.</div>
      <div class="otp">${'381'.split('').map((d) => `<span>${d}</span>`).join('')}<span class="dash">–</span><span class="focus"></span><span></span><span></span></div>
      <div class="check"><span class="cbox on">${ic('check', 12)}</span>Trust this device for 30 days</div>
      <button class="btn primary block" style="margin-top:18px">Verify</button><div style="text-align:center;margin-top:12px;font-size:12.5px" class="muted">Use a backup code instead</div></div></div>
    <div><div class="cap-l">Pending deletion</div><div class="auth-card" style="height:330px"><div class="ring" style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;margin-bottom:14px">${ic('calendar', 18, 'warn')}</div>
      <h1>Restore your account?</h1><div class="desc">Your account is scheduled for deletion on <b style="color:var(--foreground);font-weight:500">26 November 2026</b>. Restore it to keep your Sessions, or sign out and it will be deleted on that date.</div>
      <button class="btn primary block" style="margin-top:22px">Restore my account</button><button class="btn ghost block" style="margin-top:6px">Sign out</button></div></div>
    <div><div class="cap-l">Banned</div><div class="auth-card" style="height:300px"><div class="ring" style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;margin-bottom:14px">${ic('ban', 18, 'bad')}</div>
      <h1>This account is suspended</h1><div class="desc">An Admin suspended it until <b style="color:var(--foreground);font-weight:500">10 November 2026</b>.</div>
      <div class="notice" style="margin-top:14px"><span><span class="muted">Reason</span><br>Automated prompts sent at a rate that breaks the fair-use policy.</span></div>
      <button class="btn block" style="margin-top:16px">Continue as Guest</button></div></div>
    <div><div class="cap-l">Sign-up with a pending email</div><div class="auth-card" style="height:300px"><h1>Create an account</h1>
      <div class="field"><label>Email</label><div class="input err">david@example.com</div><div class="errt">${ic('info', 13)}This email belongs to an account scheduled for deletion. Sign in to restore it.</div></div>
      <button class="btn primary block" style="margin-top:18px">Go to sign in</button></div></div>
  </div></div>`,

  // NEB-563
  device: () => `<div class="auth">
    <div class="brand" style="font-size:16px">${mark(26)}<span>nebula chat</span></div>
    <div class="auth-card" style="width:420px"><div class="row-f" style="gap:10px"><span class="avatar" style="border-radius:10px">${ic('terminal', 15)}</span><div><h1 style="font-size:17px">Approve CLI sign-in</h1><div class="desc" style="margin:0">nebula CLI is asking to act as you.</div></div></div>
      <div class="code-big">WDJB-MJHT</div>
      <div class="muted" style="text-align:center;font-size:12px;margin-top:8px">Check it matches the code in your terminal.</div>
      <dl class="kv" style="margin-top:18px"><dt>Client</dt><dd>nebula-cli</dd><dt>Signed in as</dt><dd>David Poslušný · Admin</dd><dt>Expires</dt><dd>in 9:12</dd></dl>
      <div class="notice" style="margin-top:16px">${ic('shield-check', 15)}<span>Only Admins who signed in with two-factor authentication can approve a CLI.</span></div>
      <div style="display:flex;gap:8px;margin-top:18px"><button class="btn block" style="flex:1">Deny</button><button class="btn primary block" style="flex:1">Approve</button></div>
    </div></div>`,

  // NEB-560 · 570
  'admin-overview': () => {
    const tile = (l, v, d, up, seed, color) =>
      `<div class="tile"><div class="tl"><span>${l}</span><span class="mono faint" style="font-size:10.5px">30d</span></div><div class="tv">${v}</div><div class="row-f" style="justify-content:space-between;align-items:flex-end"><div class="td ${up ? 'ok' : 'bad'}">${up ? '▲' : '▼'} ${d} <span class="faint">vs prev.</span></div>${spark(series(30, 40, 18, up ? 0.9 : -0.5, seed), 110, 34)}</div></div>`;
    return shell({
      left: leftAdmin('Overview'),
      center: `<div class="ad-h"><h1>Overview</h1><span class="grow"></span><div class="seg"><span>7d</span><span>14d</span><span class="on">30d</span><span>90d</span></div></div>
        <div class="tiles" style="grid-template-columns:repeat(3,1fr)">
          ${tile('Daily active Users', '214', '12.4%', 1, 11)}${tile('Weekly active Users', '1,082', '8.1%', 1, 23)}${tile('New registrations', '96', '3.0%', 0, 37)}
          ${tile('Guest → Registered', '6.8%', '0.9 pt', 1, 41)}${tile('Messages sent', '18,240', '21.7%', 1, 53)}${tile('Est. spend', '$142.80', '17.2%', 1, 67)}
        </div>
        <div style="padding:22px 20px 0"><div class="lbl" style="font-size:12.5px"><span>Latest Audit entries</span><span class="sec" style="font-weight:400">View all ${ic('chevron-right', 12)}</span></div></div>
        <table class="tbl"><tbody>
          ${[['2m', 'David P.', 'session.read', 'Session “Trip plan for…” of anna@…'], ['14m', 'operator', 'admin.grant', 'tomas@example.com'], ['1h', 'David P.', 'user.ban', 'spam-bot-42@…'], ['3h', 'system', 'purge.run', '41 Guests, 2 Pending deletion'], ['5h', 'Jana K.', 'user.restore', 'petr@example.com']].map(([t, a, ac, tg]) => `<tr><td class="mono faint" style="width:60px">${t}</td><td>${actor(a)}</td><td class="mono">${ac}</td><td class="trunc" style="max-width:340px">${tg}</td></tr>`).join('')}
        </tbody></table>`,
    });
  },

  // NEB-557 · 558
  'admin-users': () => adminUsers(),
  'admin-ban': () =>
    adminUsers() +
    `<div class="scrim"></div><div class="dialog">
      <h2>Ban spam-bot-42@mail.test?</h2><div class="desc">They’re signed out everywhere and can’t sign in until the ban ends. Waiting Runs are cancelled.</div>
      <div class="field"><label>Reason <span class="faint" style="font-weight:400">(shown to the User)</span></label><div class="input" style="height:64px;align-items:flex-start;padding-top:8px">Automated prompts sent at a rate that breaks the fair-use policy.</div></div>
      <div class="field"><label>Duration</label><div class="seg" style="align-self:flex-start"><span>Permanent</span><span class="on">Until a date</span></div><div class="input" style="width:200px">${ic('calendar', 14, 'muted')}10 Nov 2026</div></div>
      <div class="foot"><button class="btn">Cancel</button><button class="btn danger">Ban User</button></div>
    </div>`,

  // NEB-569
  'admin-usage': () => adminUsage(),

  // NEB-556
  'admin-audit': () =>
    shell({
      left: leftAdmin('Audit log'),
      center: `<div class="ad-h"><h1>Audit log</h1><span class="mono faint" style="font-size:11.5px">12,408 entries</span></div>
        <div class="toolbar"><span class="chip">${ic('user', 13)}Actor: any</span><span class="chip on">${ic('list-filter', 13)}Action: user.*  ${ic('x', 12)}</span><span class="chip dashed">${ic('list-filter', 13)}Target</span><span class="chip">${ic('calendar', 13)}20 Oct – 27 Oct</span></div>
        <table class="tbl"><thead><tr><th>Time ${ic('chevron-down', 12)}</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>
          ${[['27 Oct 21:02:11', 'David P.', 'user.ban', 'spam-bot-42@mail.test'], ['27 Oct 20:48:40', 'operator', 'user.grant_admin', 'tomas@example.com'], ['27 Oct 17:30:03', 'Jana K.', 'user.restore', 'petr@example.com'], ['27 Oct 09:12:55', 'David P.', 'user.unban', 'lukas@example.com'], ['26 Oct 22:01:19', 'system', 'user.purge', '41 Guests'], ['26 Oct 14:44:07', 'Jana K.', 'user.ban', 'promo@shop.test'], ['26 Oct 10:05:31', 'operator', 'user.revoke_admin', 'old-admin@example.com'], ['25 Oct 19:20:12', 'David P.', 'user.read', 'anna@example.com'], ['25 Oct 08:00:00', 'system', 'user.purge', '2 Pending deletion'], ['24 Oct 16:33:48', 'Jana K.', 'user.ban', 'bulk-07@mail.test'], ['24 Oct 11:09:02', 'David P.', 'user.read', 'marek@example.com'], ['23 Oct 18:51:27', 'David P.', 'user.restore', 'eva@example.com']].map(([t, a, ac, tg], i) => `<tr class="${i === 0 ? 'sel' : ''}"><td class="mono">${t}</td><td>${actor(a)}</td><td class="mono">${ac}</td><td>${tg}</td></tr>`).join('')}
        </tbody></table><div class="tbl-foot"><span>Showing 1–50</span><span class="row-f"><button class="btn sm" disabled>Previous</button><button class="btn sm">Next</button></span></div>`,
      right: `<div class="insp"><div class="row-f"><span class="mono" style="font-size:13px">user.ban</span><span class="grow"></span><button class="ibtn sm">${ic('x', 14)}</button></div>
        <dl class="kv"><dt>When</dt><dd>27 Oct 2026, 21:02:11</dd><dt>Actor</dt><dd>David Poslušný</dd><dt>Target</dt><dd>spam-bot-42@mail.test</dd><dt>Entry</dt><dd>aud_01JB8…7KQ</dd></dl>
        <div><div class="lbl">Detail</div><div class="json">{
  <span class="k2">"reason"</span>: <span class="v2">"Automated prompts sent at a</span>
           <span class="v2">rate that breaks the fair-use</span>
           <span class="v2">policy."</span>,
  <span class="k2">"expiresAt"</span>: <span class="v2">"2026-11-10T00:00:00Z"</span>,
  <span class="k2">"cancelledRuns"</span>: <span class="v2">1</span>,
  <span class="k2">"revokedAuthSessions"</span>: <span class="v2">3</span>
}</div></div></div>`,
    }),

  // NEB-559
  'admin-session': () =>
    shell({
      left: leftAdmin('Sessions'),
      center: `<div class="banner">${ic('eye', 14)}<span class="grow">Read-only. Opening this Session was recorded in the Audit log.</span><span class="sec row-f" style="gap:4px">${ic('arrow-left', 13)}Back to Sessions</span></div>
        <div class="chat"><div class="thread"><div class="col">
          ${user('Plan me a 4-day hiking trip in the Dolomites with one rest day.')}
          ${assistant('<p>Here’s a hut-to-hut plan based in <strong>Val Gardena</strong>, with the rest day on day 3 so your legs recover before the longest stage.</p><ol><li><strong>Day 1 — Seceda ridge.</strong> Cable car up, 11 km along the ridge, down via Pieralongia huts.</li><li><strong>Day 2 — Puez–Odle.</strong> 15 km loop from Col Raiser, 900 m of climbing.</li><li><strong>Day 3 — Rest.</strong> Ortisei, lake swim at Mont Sëuc.</li><li><strong>Day 4 — Sassolungo circuit.</strong> 17 km around the massif, ending at Rifugio Vicenza.</li></ol>', { tok: '812', cost: '$0.0009', model: 'GPT-4o mini' })}
          ${user('Swap day 2 for something with less climbing.')}
        </div></div></div>`,
      right: `<div class="insp"><div><div class="lbl">Owner</div><div class="card row-f" style="gap:10px"><span class="avatar">AN</span><div class="grow"><div style="font-weight:500">Anna Nováková</div><div class="mono faint" style="font-size:11px">anna@example.com</div></div>${ic('chevron-right', 14, 'faint')}</div></div>
        <div><div class="lbl">Session</div><dl class="kv"><dt>Title</dt><dd>Trip plan for the Dolomites</dd><dt>Model</dt><dd class="row-f" style="justify-content:flex-end;gap:5px">${logo('openai', 11)}gpt-4o-mini</dd><dt>Messages</dt><dd>6</dd><dt>Runs</dt><dd>1</dd><dt>Created</dt><dd>25 Oct, 09:14</dd><dt>Last activity</dt><dd>2h ago</dd><dt>Archived</dt><dd>No</dd></dl></div></div>`,
    }),

  // NEB-547 mobile
  'm-chat': () => mobile(`<div class="thread" style="padding-top:18px"><div class="col" style="padding:0 16px">${user('How do I make the client parser accept the new Run events?')}${assistant(THREAD_ANSWER.split('<table>')[0], { hidden: false })}</div></div><div style="padding:0 12px 12px">${composer({})}</div>`),
  'm-drawer': () => mobile(`<div class="thread"></div>`) + `<div class="scrim"></div><div class="drawer">${leftChat({ active: 0 })}</div>`,
  'm-sheet': () => mobile(`<div class="thread" style="padding-top:18px"><div class="col" style="padding:0 16px">${user('How do I make the client parser accept the new Run events?')}</div></div>`) + `<div class="scrim"></div><div class="sheet"><div class="grabber"></div>${sessionTab()}</div>`,
};

function mobile(content) {
  return `<div class="m-app"><div class="m-hdr"><button class="ibtn" aria-label="Open navigation">${ic('menu', 18)}</button><div class="brand" style="font-size:14px">${mark(20)}</div><span class="grow trunc" style="font-size:13px;font-weight:500">Run events in the SSE parser</span><button class="ibtn" aria-label="Open command palette">${ic('search', 17)}</button><button class="ibtn" aria-label="Open Inspector">${ic('panel-right', 17)}</button></div><div class="chat" style="flex:1;min-height:0">${content}</div></div>`;
}

function settingsModal(active, body, who = 'admin') {
  const items = [['Profile', 'user'], ['Security', 'lock'], ['Archived Sessions', 'archive'], ['Appearance', 'monitor'], ['Account & data', 'key-round']];
  return (
    shell({ hdr: { crumb: 'Run events in the SSE parser' }, left: leftChat({ active: 0, who }), center: centerThread({ lastMetaHidden: true }), right: sessionTab() }) +
    `<div class="scrim"></div><div class="setm" role="dialog" aria-label="Settings">
      <nav class="sm-nav"><div class="ttl">Settings</div>
        ${items.map(([n, i]) => `<div class="nav-row ${n === active ? 'active' : ''}">${ic(i)}<span class="grow">${n.replace('&', '&amp;')}</span></div>`).join('')}</nav>
      <div class="sm-body"><div class="sm-top"><h2>${active.replace('&', '&amp;')}</h2><button class="ibtn sm" aria-label="Close settings">${ic('x', 16)}</button></div>
        <div class="sm-in">${body}</div></div>
    </div>`
  );
}

function themePrev(name, kind, on = false) {
  const pal = { l: ['#fff', '#e8e8e8', '#f0f0f0'], d: ['#0a0a0a', '#1f1f1f', '#151515'] };
  const half = (p) => `<div style="flex:1;display:flex;gap:4px;background:${p[0]};padding:6px;border-radius:5px;border:1px solid ${p[1]}"><i style="width:30%;background:${p[2]}"></i><i style="flex:1;background:${p[2]}"></i></div>`;
  const body = kind === 'sys' ? `${half(pal.l)}${half(pal.d)}` : half(pal[kind]);
  return `<div class="theme-prev ${on ? 'on' : ''}"><div class="tp">${body}</div><div class="cap">${on ? ic('check', 13) : ''}${name}</div></div>`;
}

function actor(a) {
  if (a === 'operator') return `<span class="badge dashed">${ic('terminal', 11)}operator</span>`;
  if (a === 'system') return `<span class="badge">${ic('server', 11)}system</span>`;
  return `<span class="row-f" style="gap:7px"><span class="avatar" style="width:20px;height:20px;font-size:9px">${a.split(' ').map((x) => x[0]).join('')}</span>${a}</span>`;
}

function adminUsers() {
  const rows = [
    ['Anna Nováková', 'anna@example.com', ['Registered'], '12 Mar', '2h', 41, 612],
    ['spam-bot-42', 'spam-bot-42@mail.test', ['Registered', 'banned'], '21 Oct', '6d', 3, 980],
    ['Tomáš Dvořák', 'tomas@example.com', ['Admin'], '02 Jan', '14m', 77, 1204],
    ['Petr Svoboda', 'petr@example.com', ['Registered'], '18 Jul', '5h', 12, 140],
    ['Eva Horáková', 'eva@example.com', ['Pending deletion'], '30 May', '9d', 8, 66],
    ['Marek Černý', 'marek@example.com', ['unverified'], '25 Oct', '1d', 2, 9],
    ['Jana Kučerová', 'jana@example.com', ['Admin'], '11 Feb', '5h', 53, 890],
    ['Lukáš Procházka', 'lukas@example.com', ['Registered'], '07 Sep', '3d', 19, 233],
    ['Klára Veselá', 'klara@example.com', ['Registered'], '15 Aug', '6h', 26, 401],
    ['promo-shop', 'promo@shop.test', ['Registered', 'banned'], '26 Oct', '1d', 1, 120],
    ['Ondřej Malý', 'ondrej@example.com', ['unverified'], '27 Oct', '3h', 1, 4],
  ];
  const b = (s) => `<span class="badge ${{ banned: 'bad', 'Pending deletion': 'warn', Admin: 'solid', unverified: 'dashed' }[s] || ''}">${s}</span>`;
  return shell({
    left: leftAdmin('Users'),
    center: `<div class="ad-h"><h1>Users</h1><span class="mono faint" style="font-size:11.5px">1,946 Registered · 23,410 Guests hidden</span></div>
      <div class="toolbar"><div class="input" style="width:260px;height:30px">${ic('search', 14, 'muted')}<span class="faint">Search name or email</span></div>
        <span class="chip on">Registered</span><span class="chip on">Admin</span><span class="chip">banned</span><span class="chip">Pending deletion</span><span class="chip">unverified</span><span class="chip dashed">${ic('user-round', 13)}Show Guests</span></div>
      <table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th>Last active ${ic('chevron-down', 12)}</th><th class="r">Sessions</th><th class="r">Messages</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${i === 1 ? 'sel' : ''}"><td style="color:var(--foreground)">${r[0]}</td><td class="mono">${r[1]}</td><td><span class="row-f" style="gap:4px">${r[2].map(b).join('')}</span></td><td class="mono">${r[3]}</td><td class="mono">${r[4]}</td><td class="r mono">${r[5]}</td><td class="r mono">${r[6]}</td></tr>`).join('')}
      </tbody></table>`,
    right: `<div class="insp" style="gap:14px">
      <div class="row-f" style="gap:12px"><span class="avatar lg">SB</span><div class="grow"><div style="font-weight:600;font-size:14px">spam-bot-42</div><div class="mono faint" style="font-size:11px">spam-bot-42@mail.test</div></div><button class="ibtn sm">${ic('x', 14)}</button></div>
      <div class="row-f" style="gap:4px">${b('Registered')}${b('banned')}<span class="badge">2FA off</span></div>
      <div class="notice" style="padding:10px 12px;background:color-mix(in oklab,var(--destructive) 6%,transparent);border-color:color-mix(in oklab,var(--destructive) 25%,transparent)">${ic('ban', 14, 'bad')}<span>Banned until <b style="font-weight:500">10 Nov 2026</b> by David P.<br><span class="muted">Automated prompts sent at a rate that breaks the fair-use policy.</span></span></div>
      <dl class="kv"><dt>Created</dt><dd>21 Oct 2026</dd><dt>Last active</dt><dd>6d ago</dd><dt>Sessions</dt><dd>3</dd><dt>Messages sent</dt><dd>980</dd><dt>Pending deletion</dt><dd>—</dd></dl>
      <div><div class="lbl">Sessions</div>${['Generate 50 product names', 'Untitled', 'SEO keywords batch 3'].map((t) => `<div class="nav-row" style="height:30px;padding:0 6px">${ic('message-square', 14)}<span class="grow trunc">${t}</span>${ic('chevron-right', 13, 'faint')}</div>`).join('')}</div>
      <div><div class="lbl">Actions</div><div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" id="grant" disabled style="justify-content:flex-start">${ic('shield', 14)}Grant Admin</button>
        <button class="btn" style="justify-content:flex-start">${ic('undo-2', 14)}Unban</button>
        <button class="btn" id="restorebtn" disabled style="justify-content:flex-start">${ic('archive-restore', 14)}Restore account</button></div></div>
    </div>` + `<div class="tip" data-anchor="grant" data-place="left-center" data-gap="8">Unban this User before granting Admin.</div>`,
  });
}

function adminUsage() {
  const N = 30;
  const keys = [
    ['gpt-4.1-mini', 'GPT-4.1 mini', 'openai', 120, 1.6],
    ['run', 'Run', null, 40, 2.6],
    ['claude-3-5-haiku', 'Claude 3.5 Haiku', 'anthropic', 70, 0.4],
    ['gpt-4o-mini', 'GPT-4o mini', 'openai', 90, -1.2],
    ['gpt-5', 'GPT-5', 'openai', 30, 0.6],
    ['claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 25, 0.3],
  ];
  const data = keys.map((k, i) => series(N, k[3], k[3] * 0.35, k[4], 101 + i * 13));
  const W = 640, H = 250, P = 28;
  const tot = Array.from({ length: N }, (_, d) => data.reduce((a, s) => a + s[d], 0));
  const mx = Math.max(...tot) * 1.08;
  const x = (d) => P + (d / (N - 1)) * (W - P - 6);
  const y = (v) => H - 22 - (v / mx) * (H - 34);
  const greys = ['var(--foreground)', '#6e6e6e', '#555', '#454545', '#383838', '#2e2e2e'];
  const light = document.documentElement.classList.contains('dark') ? null : ['var(--foreground)', '#9a9a9a', '#b5b5b5', '#c8c8c8', '#d6d6d6', '#e2e2e2'];
  const fills = light || greys;
  const order = [1, 2, 3, 4, 5, 0]; // active series drawn on top of the stack
  let acc = Array(N).fill(0);
  let paths = '';
  // Draw from the bottom: active first so it sits at the baseline.
  [0, 1, 2, 3, 4, 5].forEach((si) => {
    const lo = acc.slice();
    acc = acc.map((a, d) => a + data[si][d]);
    const top = acc.map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`);
    const bot = lo.map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).reverse();
    paths += `<path d="M${top.join(' L')} L${bot.join(' L')} Z" fill="${fills[si]}" opacity="${si === 0 ? 0.92 : 1}" stroke="var(--panel)" stroke-width=".6"/>`;
  });
  const hd = 21;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="${P}" x2="${W - 6}" y1="${y(mx * f / 1.08)}" y2="${y(mx * f / 1.08)}" stroke="var(--border)" />`).join('');
  const ticks = [0, 7, 14, 21, 29].map((d) => `<text x="${x(d)}" y="${H - 6}" font-size="10" fill="var(--faint)" text-anchor="middle" font-family="Geist Mono">${['28 Sep', '5 Oct', '12 Oct', '19 Oct', '27 Oct'][[0, 7, 14, 21, 29].indexOf(d)]}</text>`).join('');
  const chart = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Prompts per Model, last 30 days">${grid}${paths}<line x1="${x(hd)}" x2="${x(hd)}" y1="8" y2="${H - 22}" stroke="var(--foreground)" stroke-dasharray="3 3"/><circle cx="${x(hd)}" cy="${y(data[0][hd])}" r="3.5" fill="var(--foreground)" stroke="var(--panel)" stroke-width="2"/>${ticks}</svg>`;
  const dayTot = tot[hd];
  const ranked = keys.map((k, i) => [k, data[i][hd]]).sort((a, b) => b[1] - a[1]);
  const list = ranked.map(([k, v], i) => {
    const share = (v / dayTot) * 100;
    const active = k[0] === 'gpt-4.1-mini';
    return `<div style="padding:7px 8px;border-radius:8px;${active ? 'background:var(--hover)' : ''}"><div class="row-f" style="gap:8px;font-size:12.5px">${k[2] ? logo(k[2], 13) : ic('workflow', 13, 'muted')}<span class="grow trunc" style="${active ? 'font-weight:500' : 'color:var(--foreground-secondary)'}">${k[1]}</span><span class="mono" style="font-size:11.5px">${Math.round(v)}</span><span class="mono faint" style="font-size:11px;width:38px;text-align:right">${share.toFixed(1)}%</span></div><div class="bar thin" style="margin-top:5px"><i style="width:${share * 2.2}%;${active ? '' : 'background:var(--faint)'}"></i></div></div>`;
  }).join('');
  const t = (l, v, d, up = 1) => `<div class="tile sm"><div class="tl"><span>${l}</span></div><div class="tv">${v}</div><div class="td ${up ? 'ok' : 'bad'}">${up ? '▲' : '▼'} ${d}</div></div>`;
  return shell({
    left: leftAdmin('Model usage'),
    center: `<div class="ad-h"><h1>Model usage</h1></div>
      <div class="toolbar"><div class="seg"><span class="on">Prompts</span><span>Tokens</span><span>Est. spend</span></div><div class="seg"><span>7d</span><span>14d</span><span class="on">30d</span><span>90d</span></div><div class="seg"><span>Share</span><span class="on">Volume</span></div><span class="grow"></span><span class="chip">${ic('list-filter', 13)}All Models</span><span class="chip">${ic('users', 13)}Registered + Guests</span></div>
      <div class="tiles" style="grid-template-columns:repeat(6,1fr)">${t('Prompts', '18,240', '21.7%')}${t('Tokens', '41.2M', '18.0%')}${t('Est. spend', '$142.80', '17.2%')}${t('Active Users', '1,082', '8.1%')}${t('Runs', '1,315', '64%')}${t('Cache hit rate', '11.4%', '1.2 pt', 0)}</div>
      <div style="display:flex;gap:14px;padding:16px 20px 0">
        <div class="card" style="flex:1;min-width:0;padding:12px 10px 4px"><div class="row-f" style="padding:0 4px 6px;font-size:12px"><span class="muted">Prompts per day</span><span class="grow"></span><span class="mono faint" style="font-size:11px">19 Oct · ${Math.round(dayTot)} prompts</span></div>${chart}</div>
        <div style="width:230px;flex:none"><div class="lbl" style="padding:2px 8px">19 Oct <span class="mono faint" style="font-weight:400">share</span></div>${list}</div>
      </div>
      <div class="muted" style="font-size:11.5px;padding:10px 20px">${ic('info', 12)} Runs count once in Prompts; in Tokens and Est. spend they split across the Models their Steps used. <span style="text-decoration:underline;text-underline-offset:3px">View as table</span></div>`,
    right: `<div class="insp"><div class="row-f" style="gap:10px">${logo('openai', 20)}<div class="grow"><div style="font-weight:600">GPT-4.1 mini</div><div class="mono faint" style="font-size:11px">gpt-4.1-mini · pinned</div></div></div>
      <div class="lbl" style="margin:0">19 Oct 2026</div>
      <dl class="kv"><dt>Prompts</dt><dd>${Math.round(data[0][hd])}</dd><dt>Input / prompt</dt><dd>2,410 tokens</dd><dt>Output / prompt</dt><dd>612 tokens</dd><dt>Cost / prompt</dt><dd>$0.0019</dd><dt>Cache replays</dt><dd>38</dd><dt>Completion rate</dt><dd>98.6%</dd><dt>Avg. duration</dt><dd>4.2s</dd></dl>
      <div><div class="lbl">30-day trend</div>${spark(data[0], 270, 60)}</div></div>`,
  });
}
