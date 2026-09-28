(() => {
  const POLL_MS = 5000;
  const PAGE = 100;
  const STACK_PREVIEW_LINES = 12;
  const FRAMEWORK_FRAME = /^\s*at (java\.|javax\.|jakarta\.|jdk\.|sun\.|org\.springframework\.|org\.apache\.|org\.hibernate\.|com\.mysql\.|com\.zaxxer\.|io\.micrometer\.|tools\.jackson\.|com\.fasterxml\.|org\.eclipse\.|io\.undertow\.|reactor\.|kotlin\.)/;

  const state = { service: '', host: '', kind: '', statuses: new Set(), exceptionOnly: false, q: '', maxId: 0, minId: null, selectedId: null };
  const $ = (id) => document.getElementById(id);

  // ---------- 유틸 ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function fmtTime(ms, withMs = true) {
    const d = new Date(ms);
    const now = new Date();
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${withMs ? '.' + pad(d.getMilliseconds(), 3) : ''}`;
    return d.toDateString() === now.toDateString() ? time : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
  }
  function fmtDur(ms) {
    if (ms === null || ms === undefined) return '-';
    return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s` : `${ms}ms`;
  }
  function badge(code) {
    if (code === null || code === undefined) return '<span class="badge bx" title="응답 없음 (연결 실패·타임아웃)">ERR</span>';
    const cls = code >= 500 ? 'b5' : code >= 400 ? 'b4' : code >= 300 ? 'b3' : 'b2';
    return `<span class="badge ${cls}">${code}</span>`;
  }
  const shortClass = (c) => (c ? c.split('.').pop() : '');
  function pathCell(r) {
    if (r.kind === 'OUTBOUND') {
      return `<span class="out-arrow" title="외부 호출">→</span><span class="host">${esc(r.target_host || '')}</span><span class="path">${esc(r.path)}</span>${
        r.parent_request_id ? '' : '<span class="bg-tag" title="HTTP 요청 처리 밖(스케줄러·MQ·별도 스레드)에서 나간 호출">백그라운드</span>'}`;
    }
    const child = r.child_count ? `<span class="child-tag">외부 호출 ${r.child_count}</span>` : '';
    return `<span class="path">${esc(r.path)}</span>${child}`;
  }
  function exTag(r) {
    if (!r.exception_class) return '';
    const handled = r.status_code !== null && r.status_code < 500;
    const title = `${esc(r.exception_class)}: ${esc(r.exception_message || '')}`;
    return `<span class="ex-tag ex-long ${handled ? 'handled' : ''}" title="${title}">${esc(shortClass(r.exception_class))}</span><span class="ex-tag ex-short ${handled ? 'handled' : ''}" title="${title}">예외</span>`;
  }

  // ---------- 목록 ----------
  function queryString(extra = {}) {
    const p = new URLSearchParams();
    if (state.service) p.set('service', state.service);
    if (state.host) p.set('host', state.host);
    if (state.kind) p.set('kind', state.kind);
    if (state.statuses.size) p.set('status', [...state.statuses].join(','));
    if (state.exceptionOnly) p.set('exception', '1');
    if (state.q) p.set('q', state.q);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  }

  function rowHtml(r, isNew) {
    return `<tr data-id="${r.id}" class="${isNew ? 'new' : ''} ${r.id === state.selectedId ? 'sel' : ''}">
      <td>${badge(r.status_code)}</td>
      <td class="svc" title="${esc(r.service_name)}${r.instance_id ? ' @ ' + esc(r.instance_id) : ''}">${esc(r.service_name)}</td>
      <td class="method">${esc(r.method)}</td>
      <td title="${esc((r.target_host || '') + (r.path || ''))}">${pathCell(r)}</td>
      <td class="dur ${r.duration_ms >= 3000 ? 'slow' : ''}">${fmtDur(r.duration_ms)}</td>
      <td class="time">${fmtTime(r.created_at)}</td>
      <td class="ex">${exTag(r)}</td>
    </tr>`;
  }

  let listToken = 0;
  async function reloadList() {
    const token = ++listToken;
    const res = await fetch(`api/logs?${queryString({ limit: PAGE })}`);
    const { items } = await res.json();
    if (token !== listToken) return;
    $('rows').innerHTML = items.map((r) => rowHtml(r, false)).join('');
    state.maxId = items.length ? items[0].id : state.maxId;
    state.minId = items.length ? items[items.length - 1].id : null;
    $('empty').hidden = items.length > 0;
    $('empty').textContent = hasFilter() ? '조건에 맞는 로그가 없습니다.' : '아직 수신된 로그가 없습니다.';
    $('loadMore').hidden = items.length < PAGE;
    stamp();
  }

  async function pollNew() {
    const token = listToken;
    const res = await fetch(`api/logs?${queryString({ afterId: state.maxId, limit: 500 })}`);
    const { items } = await res.json();
    if (token !== listToken || !items.length) return stamp();
    $('rows').insertAdjacentHTML('afterbegin', items.map((r) => rowHtml(r, true)).join(''));
    state.maxId = items[0].id;
    if (state.minId === null) state.minId = items[items.length - 1].id;
    $('empty').hidden = true;
    stamp();
  }

  async function loadMore() {
    if (state.minId === null) return;
    const res = await fetch(`api/logs?${queryString({ beforeId: state.minId, limit: PAGE })}`);
    const { items } = await res.json();
    $('rows').insertAdjacentHTML('beforeend', items.map((r) => rowHtml(r, false)).join(''));
    if (items.length) state.minId = items[items.length - 1].id;
    $('loadMore').hidden = items.length < PAGE;
  }

  const hasFilter = () => state.service || state.host || state.kind || state.statuses.size || state.exceptionOnly || state.q;
  const stamp = () => ($('lastUpdated').textContent = `갱신 ${fmtTime(Date.now(), false)}`);

  // ---------- 사이드바 ----------
  async function reloadSidebar() {
    const { services, hosts } = await (await fetch('api/services')).json();
    const all = services.reduce((a, s) => ({ total: a.total + s.total, errors: a.errors + s.errors }), { total: 0, errors: 0 });
    const counts = (t, e) => `<span class="counts"><span>${t.toLocaleString()}</span>${e ? `<span class="cnt-err" title="5xx·응답 없음">${e.toLocaleString()}</span>` : ''}</span>`;
    $('serviceList').innerHTML =
      `<li data-service="" class="${!state.service ? 'on' : ''}"><span class="name">전체</span>${counts(all.total, all.errors)}</li>` +
      (services.length
        ? services.map((s) => `<li data-service="${esc(s.name)}" class="${state.service === s.name ? 'on' : ''}" title="마지막 수신 ${fmtTime(s.lastSeen, false)} · 예외 ${s.exceptions}건"><span class="name">${esc(s.name)}</span>${counts(s.total, s.errors)}</li>`).join('')
        : '<li class="empty-note">아직 로그를 보낸 서비스가 없습니다</li>');
    $('hostList').innerHTML = hosts.length
      ? hosts.map((h) => `<li data-host="${esc(h.host)}" class="${state.host === h.host ? 'on' : ''}"><span class="name">${esc(h.host)}</span><span class="counts">${h.total.toLocaleString()}</span></li>`).join('')
      : '<li class="empty-note">외부 호출 기록 없음</li>';
  }

  // ---------- 상세 ----------
  function prettyBody(body) {
    if (body === null || body === undefined || body === '') return null;
    const t = body.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return JSON.stringify(JSON.parse(t), null, 2); } catch { /* 잘린 JSON은 원문 */ }
    }
    return body;
  }
  function headersTable(h) {
    if (!h || typeof h !== 'object' || !Object.keys(h).length) return '<div class="none">헤더 없음</div>';
    return `<table class="headers">${Object.entries(h).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(Array.isArray(v) ? v.join(', ') : v)}</td></tr>`).join('')}</table>`;
  }
  function bodyBlock(body, truncated) {
    const p = prettyBody(body);
    if (p === null) return '<div class="none">바디 없음</div>';
    return `<pre class="body">${esc(p)}</pre>${truncated ? '<div class="trunc">최대 크기를 넘어 앞부분만 저장되었습니다.</div>' : ''}`;
  }
  function stackHtml(stack, full) {
    const lines = stack.split('\n');
    const shown = full ? lines : lines.slice(0, STACK_PREVIEW_LINES);
    return shown.map((l) => (/^\s*at /.test(l) && !FRAMEWORK_FRAME.test(l) ? `<span class="app">${esc(l)}</span>` : esc(l))).join('\n');
  }
  function resultBlock(d) {
    if (d.exception_class) {
      const handled = d.status_code !== null && d.status_code < 500;
      const label = handled ? `예외 발생 · 앱이 ${d.status_code} 응답으로 처리함` : d.kind === 'OUTBOUND' ? '외부 호출 실패' : '예외 발생 · 서버 오류';
      const causes = Array.isArray(d.exception_causes) && d.exception_causes.length
        ? `<ul class="causes">${d.exception_causes.map((c) => `<li>Caused by: ${esc(c.exceptionClass)}${c.message ? `<div class="m">${esc(c.message)}</div>` : ''}</li>`).join('')}</ul>` : '';
      const stack = d.exception_stacktrace || '';
      const lines = stack ? stack.split('\n').length : 0;
      return `<div class="result ${handled ? 'warn' : 'err'}">
        <div class="r-label">${label}</div>
        <div class="ex-class">${esc(d.exception_class)}</div>
        ${d.exception_message ? `<div class="ex-msg">${esc(d.exception_message)}</div>` : ''}
        ${causes}
        ${stack ? `<pre class="stack" id="stack">${stackHtml(stack, false)}</pre>
          ${lines > STACK_PREVIEW_LINES ? `<button class="link-btn" id="stackToggle">전체 스택트레이스 보기 (${lines}줄)</button>` : ''}` : ''}
      </div>`;
    }
    if (d.status_code === null) return '<div class="result err"><div class="r-label">응답 없음</div></div>';
    if (d.status_code >= 500) return `<div class="result err"><div class="r-label">서버 오류 ${d.status_code} · 예외 정보 없음</div></div>`;
    if (d.status_code >= 400) return `<div class="result warn"><div class="r-label">요청 거부 ${d.status_code} · 예외 정보 없음 (인증 필터 등 컨트롤러 이전 단계 응답)</div></div>`;
    return '<div class="result ok">✓ 정상 처리</div>';
  }
  function relatedList(title, rows) {
    if (!rows || !rows.length) return '';
    return `<h3 class="sec">${title}</h3><ul class="related">${rows.map((r) => `<li data-id="${r.id}">
      ${badge(r.status_code)}<span class="method">${esc(r.method)}</span>
      <span class="path" title="${esc((r.target_host || '') + r.path)}">${r.kind === 'OUTBOUND' ? `<span class="out-arrow">→</span><span class="host">${esc(r.target_host || '')}</span>` : `<span class="host">[${esc(r.service_name)}]</span> `}${esc(r.path)}</span>
      <span class="dur">${fmtDur(r.duration_ms)}</span><span class="time muted">${fmtTime(r.created_at)}${r.exception_class ? ' · ' + esc(shortClass(r.exception_class)) : ''}</span>
    </li>`).join('')}</ul>`;
  }

  async function openDetail(id) {
    state.selectedId = id;
    document.querySelectorAll('#rows tr.sel').forEach((tr) => tr.classList.remove('sel'));
    document.querySelector(`#rows tr[data-id="${id}"]`)?.classList.add('sel');
    const res = await fetch(`api/logs/${id}`);
    if (!res.ok) return;
    const d = await res.json();
    const out = d.kind === 'OUTBOUND';
    $('dTitle').innerHTML = `${badge(d.status_code)}<span class="method">${esc(d.method)}</span>${out ? `<span class="out-arrow">→</span><span class="host">${esc(d.target_host || '')}</span>` : ''}<span class="path">${esc(d.path)}</span>`;
    const meta = [
      ['서비스', `${esc(d.service_name)}${d.instance_id ? ` <span class="muted">@ ${esc(d.instance_id)}</span>` : ''}`],
      ['구분', out ? (d.parent_request_id ? '외부 호출' : '외부 호출 (백그라운드)') : `들어온 요청${d.async ? ' · 비동기/SSE' : ''}`],
      ['시각', fmtTime(d.created_at)],
      ['소요시간', fmtDur(d.duration_ms)],
      [out ? '호출 ID' : 'requestId', `<span class="path">${esc(d.request_id)}</span><button class="copy" data-copy="${esc(d.request_id)}">복사</button>`],
      out ? ['부모 requestId', d.parent_request_id ? `<span class="path">${esc(d.parent_request_id)}</span><button class="copy" data-copy="${esc(d.parent_request_id)}">복사</button>` : '-'] : ['클라이언트 IP', esc(d.client_ip || '-')],
    ];
    $('dBody').innerHTML = `
      <dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${resultBlock(d)}
      ${d.related.parent ? relatedList('이 호출을 발생시킨 요청', [d.related.parent]) : ''}
      ${relatedList(`처리 중 나간 외부 호출 (${d.related.children.length})`, d.related.children)}
      ${relatedList('같은 requestId의 다른 서비스 요청', d.related.sameRequestId)}
      <div class="tabs"><button data-tab="req" class="on">요청</button><button data-tab="res">응답</button></div>
      <div id="tab-req">
        <h3 class="sec">헤더</h3>${headersTable(d.request_headers)}
        <h3 class="sec">바디</h3>${bodyBlock(d.request_body, d.request_body_truncated)}
      </div>
      <div id="tab-res" hidden>
        <h3 class="sec">헤더</h3>${headersTable(d.response_headers)}
        <h3 class="sec">바디</h3>${bodyBlock(d.response_body, d.response_body_truncated)}
      </div>`;
    let full = false;
    $('stackToggle')?.addEventListener('click', (e) => {
      full = !full;
      $('stack').innerHTML = stackHtml(d.exception_stacktrace, full);
      e.target.textContent = full ? '접기' : `전체 스택트레이스 보기 (${d.exception_stacktrace.split('\n').length}줄)`;
    });
    $('drawer').hidden = false;
    $('drawerBackdrop').hidden = false;
    $('dBody').scrollTop = 0;
  }
  function closeDetail() {
    $('drawer').hidden = true;
    $('drawerBackdrop').hidden = true;
    state.selectedId = null;
    document.querySelectorAll('#rows tr.sel').forEach((tr) => tr.classList.remove('sel'));
  }

  // ---------- 이벤트 ----------
  $('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) openDetail(Number(tr.dataset.id));
  });
  $('dBody').addEventListener('click', (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      navigator.clipboard?.writeText(copy.dataset.copy);
      copy.textContent = '복사됨';
      setTimeout(() => (copy.textContent = '복사'), 1200);
      return;
    }
    const li = e.target.closest('li[data-id]');
    if (li) return openDetail(Number(li.dataset.id));
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b === tab));
      $('tab-req').hidden = tab.dataset.tab !== 'req';
      $('tab-res').hidden = tab.dataset.tab !== 'res';
    }
  });
  $('dClose').addEventListener('click', closeDetail);
  $('drawerBackdrop').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());

  function refreshFilters() {
    const labels = [];
    if (state.service) labels.push(`서비스: ${state.service}`);
    if (state.host) labels.push(`외부 호출 대상: ${state.host}`);
    $('activeFilter').hidden = !labels.length;
    $('activeFilter').innerHTML = labels.length ? `${esc(labels.join(' · '))} <button id="clearSide">해제</button>` : '';
    reloadList();
    reloadSidebar();
  }
  $('activeFilter').addEventListener('click', (e) => {
    if (e.target.id === 'clearSide') { state.service = ''; state.host = ''; refreshFilters(); }
  });
  $('serviceList').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-service]');
    if (!li) return;
    state.service = li.dataset.service;
    state.host = '';
    refreshFilters();
  });
  $('hostList').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-host]');
    if (!li) return;
    state.host = state.host === li.dataset.host ? '' : li.dataset.host;
    if (state.host) {
      state.kind = 'OUTBOUND';
      document.querySelectorAll('#kindSeg button').forEach((b) => b.classList.toggle('on', b.dataset.kind === 'OUTBOUND'));
    }
    refreshFilters();
  });
  $('kindSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.kind = b.dataset.kind;
    if (state.kind !== 'OUTBOUND') state.host = '';
    document.querySelectorAll('#kindSeg button').forEach((x) => x.classList.toggle('on', x === b));
    refreshFilters();
  });
  $('statusChips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const s = b.dataset.status;
    state.statuses.has(s) ? state.statuses.delete(s) : state.statuses.add(s);
    b.classList.toggle('on', state.statuses.has(s));
    reloadList();
  });
  $('exceptionOnly').addEventListener('change', (e) => { state.exceptionOnly = e.target.checked; reloadList(); });
  let searchTimer;
  $('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value.trim(); reloadList(); }, 300);
  });
  $('loadMore').addEventListener('click', loadMore);

  // ---------- 자동 갱신 ----------
  let tick = 0;
  setInterval(async () => {
    if (!$('autoRefresh').checked || document.hidden) return;
    try {
      await pollNew();
      if (++tick % 2 === 0) await reloadSidebar();
    } catch { /* 서버 재시작 중 등은 다음 주기에 재시도 */ }
  }, POLL_MS);
  $('autoRefresh').addEventListener('change', (e) => document.querySelector('.brand .dot').classList.toggle('paused', !e.target.checked));

  reloadList();
  reloadSidebar();
})();
