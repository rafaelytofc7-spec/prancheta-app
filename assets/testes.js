/* Prancheta — Área de testes (QA e playtest): sessões de playtest, casos de teste por mecânica/fase/efeito,
   bugs, caixa de feedback dos testers e um painel com o resumo. Dados no próprio jogo:
   p.playtests, p.testCases, p.bugs, p.feedback (entram no backup e na sincronização). */
(function () {
  'use strict';
  var api = null;

  var SEVERITY = [['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
  var SEV_BY = {}; SEVERITY.forEach(function (s, i) { SEV_BY[s[0]] = i; });
  var BUG_STATUS = [['aberto', 'Aberto'], ['corrigindo', 'Corrigindo'], ['corrigido', 'Corrigido'], ['verificado', 'Verificado']];
  var BS_BY = {}; BUG_STATUS.forEach(function (s) { BS_BY[s[0]] = s[1]; });
  var CASE_STATUS = [['nao', 'Não testado'], ['passou', 'Passou'], ['falhou', 'Falhou']];
  var CS_BY = {}; CASE_STATUS.forEach(function (s) { CS_BY[s[0]] = s[1]; });
  var AREAS = [['mecanica', 'Mecânica'], ['fase', 'Fase'], ['efeito', 'Efeito'], ['personagem', 'Personagem'], ['ui', 'Interface'], ['geral', 'Geral']];
  var AREA_BY = {}; AREAS.forEach(function (a) { AREA_BY[a[0]] = a[1]; });
  var FB_STATUS = { novo: 'Novo', 'virou-bug': 'Virou bug', 'virou-tarefa': 'Virou tarefa', arquivado: 'Arquivado' };
  var PLATFORMS = ['Windows', 'Linux', 'Android', 'Web', 'macOS', 'iOS', 'Console'];
  var TABS = [['visao', 'Painel', 'checklist'], ['bugs', 'Bugs', 'bug'], ['casos', 'Casos de teste', 'testes'], ['sessoes', 'Playtests', 'play'], ['feedback', 'Feedback', 'feedback']];
  var BUG_DONE = { corrigido: 1, verificado: 1 };

  function E(s) { return api.esc(s); }
  function I(n) { return api.icon(n); }
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function str(v) { return v == null ? '' : String(v); }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + E(o[1]) + '</option>'; }).join(''); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDay(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function objs(a) { return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { if (!x.id) x.id = uid(); return x; }); }
  function T() { return window.PranchetaTime; }
  function memberSel(p, v, field) { return T() ? '<select class="select" data-field="' + (field || 'assignee') + '" aria-label="Responsável">' + T().memberOptions(p, v) + '</select>' : ''; }
  function msSel(p, v) {
    if (!(p.milestones || []).length) return '';
    return '<select class="select" data-field="milestoneId" aria-label="Marco"><option value="">Sem marco</option>' + p.milestones.map(function (m) { return '<option value="' + E(m.id) + '"' + (m.id === v ? ' selected' : '') + '>' + E(m.title) + '</option>'; }).join('') + '</select>';
  }
  function tags(s) { return str(s).split(',').map(function (x) { return x.trim().replace(/^#/, ''); }).filter(Boolean); }

  // "mecanica:Nome" -> referência a algo do jogo
  function linkOptions(p, v, area) {
    var groups = [['mecanica', 'Mecânicas', (p.mechanics || []).map(function (m) { return m.name; })], ['fase', 'Fases', (p.levels || []).map(function (l) { return l.name; })],
      ['efeito', 'Efeitos', (p.effects || []).map(function (e) { return e.name; })], ['personagem', 'Personagens', (p.characters || []).map(function (c) { return c.name; })]];
    if (area && area !== 'geral' && area !== 'ui') groups = groups.filter(function (g) { return g[0] === area; });
    var found = !v, html = '<option value="">' + (area === 'geral' || area === 'ui' ? 'Ligado a… (opcional)' : 'Ligado a…') + '</option>';
    groups.forEach(function (g) {
      if (!g[2].length) return;
      html += '<optgroup label="' + E(g[1]) + '">' + g[2].map(function (n) { var val = g[0] + ':' + n; if (val === v) found = true; return '<option value="' + E(val) + '"' + (val === v ? ' selected' : '') + '>' + E(n) + '</option>'; }).join('') + '</optgroup>';
    });
    if (!found) html += '<option value="' + E(v) + '" selected>' + E(linkLabel(v)) + '</option>';
    return html;
  }
  function linkLabel(v) { v = str(v); var i = v.indexOf(':'); if (i < 0) return v; return (AREA_BY[v.slice(0, i)] || v.slice(0, i)) + ': ' + v.slice(i + 1); }

  // ---------------------------------------------------------------- dados
  function normalizeProject(p) {
    p.playtests = objs(p.playtests); p.testCases = objs(p.testCases); p.bugs = objs(p.bugs); p.feedback = objs(p.feedback);
    p.playtests.forEach(function (s) {
      s.date = /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : today();
      ['build', 'testers', 'goals', 'notes'].forEach(function (k) { s[k] = str(s[k]); });
      var d = parseFloat(s.duration); s.duration = isFinite(d) && d >= 0 ? d : '';
      var r = parseInt(s.rating, 10); s.rating = r >= 1 && r <= 5 ? r : 0;
    });
    p.testCases.forEach(function (c) {
      c.title = str(c.title) || 'Caso sem nome';
      if (!AREA_BY[c.area]) c.area = 'geral';
      if (!CS_BY[c.status]) c.status = 'nao';
      ['link', 'steps', 'expected', 'assignee', 'lastRun', 'milestoneId'].forEach(function (k) { c[k] = str(c[k]); });
    });
    p.bugs.forEach(function (b) {
      b.title = str(b.title) || 'Bug sem nome';
      if (SEV_BY[b.severity] == null) b.severity = 'media';
      if (!BS_BY[b.status]) b.status = 'aberto';
      ['steps', 'platform', 'build', 'assignee', 'link', 'milestoneId', 'fromFeedback', 'fromCase'].forEach(function (k) { b[k] = str(b[k]); });
    });
    p.feedback.forEach(function (f) {
      ['text', 'tester', 'tags', 'ref', 'build'].forEach(function (k) { f[k] = str(f[k]); });
      if (!FB_STATUS[f.status]) f.status = 'novo';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) f.date = today();
    });
    return p;
  }
  function makeBug(o) {
    o = o || {};
    return { id: uid(), title: str(o.title).trim().slice(0, 200) || 'Novo bug', severity: SEV_BY[o.severity] != null ? o.severity : 'media', status: 'aberto', steps: str(o.steps), platform: str(o.platform),
      build: str(o.build), assignee: str(o.assignee), link: str(o.link), milestoneId: '', fromFeedback: str(o.fromFeedback), fromCase: str(o.fromCase), createdAt: api.now() };
  }
  function makeCase(o) {
    o = o || {};
    return { id: uid(), title: str(o.title).trim().slice(0, 200) || 'Novo caso de teste', area: AREA_BY[o.area] ? o.area : 'geral', link: str(o.link), steps: str(o.steps), expected: str(o.expected),
      status: 'nao', assignee: str(o.assignee), lastRun: '', milestoneId: '', createdAt: api.now() };
  }
  function lastBuild(p) {
    var r = (p.releases || []).slice().sort(function (a, b) { return str(a.date) < str(b.date) ? 1 : -1; })[0];
    return r ? r.version : (p.version || '');
  }
  function summary(p) {
    var open = (p.bugs || []).filter(function (b) { return !BUG_DONE[b.status]; });
    var bySev = { critica: 0, alta: 0, media: 0, baixa: 0 }; open.forEach(function (b) { bySev[b.severity]++; });
    var c = p.testCases || [], passed = c.filter(function (x) { return x.status === 'passou'; }).length, failed = c.filter(function (x) { return x.status === 'falhou'; }).length;
    var run = passed + failed;
    var last = (p.playtests || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; })[0] || null;
    var rated = (p.playtests || []).filter(function (s) { return s.rating; });
    return { openBugs: open.length, bySev: bySev, fixed: (p.bugs || []).length - open.length, totalBugs: (p.bugs || []).length,
      cases: c.length, passed: passed, failed: failed, notRun: c.length - run, passRate: run ? Math.round(passed / run * 100) : null, coverage: c.length ? Math.round(run / c.length * 100) : 0,
      last: last, playtests: (p.playtests || []).length, avgRating: rated.length ? Math.round(rated.reduce(function (a, s) { return a + s.rating; }, 0) / rated.length * 10) / 10 : null,
      newFeedback: (p.feedback || []).filter(function (f) { return f.status === 'novo'; }).length };
  }
  function count(p) { return summary(p).openBugs; }

  // ---------------------------------------------------------------- telas
  var ui = { bugFilter: 'abertos', caseFilter: '', fbTag: '', fbShowAll: false };
  function tabsHtml(p, tab) {
    var s = summary(p), n = { visao: '', bugs: s.openBugs, casos: s.cases, sessoes: s.playtests, feedback: s.newFeedback };
    return '<nav class="rs-tabs" aria-label="Partes da área de testes">' + TABS.map(function (t) {
      return '<a href="' + api.projHash(p, 'testes') + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + I(t[2]) + '<span>' + E(t[1]) + '</span>' + (n[t[0]] ? '<small>' + n[t[0]] + '</small>' : '') + '</a>';
    }).join('') + '</nav>';
  }
  function html(p, tab) {
    tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : 'visao';
    var head = '<header class="sec-head"><div><div class="eyebrow">Área de testes · QA e playtest</div><h1>' + ({ visao: 'Testar o jogo', bugs: 'Bugs', casos: 'Casos de teste', sessoes: 'Sessões de playtest', feedback: 'Feedback dos testers' }[tab]) + '</h1>' +
      '<p>' + E({ visao: 'Bugs por gravidade, taxa de aprovação dos testes, o último playtest e o feedback que chegou.', bugs: 'Cada bug com gravidade, passos para reproduzir, plataforma, build, responsável e o que ele afeta.', casos: 'Checklist do que testar em cada mecânica, fase e efeito: passos, resultado esperado e se passou.', sessoes: 'Quando testaram, qual build, quem jogou, o que queriam descobrir e a nota geral.', feedback: 'Tudo o que os testers disseram. Marque com tags e transforme em bug ou tarefa.' }[tab]) + '</p></div></header>';
    var body = tab === 'bugs' ? bugsHtml(p) : tab === 'casos' ? casesHtml(p) : tab === 'sessoes' ? sessionsHtml(p) : tab === 'feedback' ? feedbackHtml(p) : dashHtml(p);
    return '<div class="ts" data-ts-root>' + head + tabsHtml(p, tab) + body + '</div>';
  }
  function stars(n, interactive) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += interactive ? '<button type="button" class="ts-star' + (i <= n ? ' on' : '') + '" data-ts-rate="' + i + '" aria-label="Nota ' + i + ' de 5" aria-pressed="' + (i === n) + '">★</button>' : '<span class="ts-star' + (i <= n ? ' on' : '') + '" aria-hidden="true">★</span>';
    return '<span class="ts-stars"' + (interactive ? ' role="group" aria-label="Nota geral"' : ' aria-label="Nota ' + n + ' de 5"') + '>' + out + '</span>';
  }

  function dashHtml(p) {
    var s = summary(p), H = api.projHash(p, 'testes');
    var maxSev = Math.max(1, s.bySev.critica, s.bySev.alta, s.bySev.media, s.bySev.baixa);
    var top = (p.bugs || []).filter(function (b) { return !BUG_DONE[b.status]; }).sort(function (a, b) { return SEV_BY[a.severity] - SEV_BY[b.severity]; }).slice(0, 5);
    var failing = (p.testCases || []).filter(function (c) { return c.status === 'falhou'; }).slice(0, 5);
    return '<div class="ts-dash">' +
      '<a class="panel ts-card ts-bugs" href="' + H + '/bugs"><div class="ts-card-h">' + I('bug') + '<span>Bugs abertos</span></div><b class="ts-big">' + s.openBugs + '</b>' +
        '<div class="ts-sev">' + SEVERITY.map(function (sv) { var n = s.bySev[sv[0]]; return '<div class="ts-sev-r" data-sev="' + sv[0] + '"><span>' + E(sv[1]) + '</span><div class="ts-bar"><span style="width:' + Math.round(n / maxSev * 100) + '%"></span></div><b>' + n + '</b></div>'; }).join('') + '</div>' +
        '<small>' + s.fixed + ' de ' + s.totalBugs + ' corrigidos</small></a>' +
      '<a class="panel ts-card" href="' + H + '/casos"><div class="ts-card-h">' + I('testes') + '<span>Taxa de aprovação</span></div><b class="ts-big">' + (s.passRate == null ? '—' : s.passRate + '%') + '</b>' +
        '<div class="ts-split"><span class="ok">' + s.passed + ' passaram</span><span class="bad">' + s.failed + ' falharam</span><span>' + s.notRun + ' sem teste</span></div>' +
        '<div class="progress" style="--c:var(--green)"><span style="width:' + s.coverage + '%"></span></div><small>' + s.coverage + '% dos ' + s.cases + ' casos já foram testados</small></a>' +
      '<a class="panel ts-card" href="' + H + '/sessoes"><div class="ts-card-h">' + I('play') + '<span>Último playtest</span></div>' +
        (s.last ? '<b class="ts-big ts-date">' + E(fmtDay(s.last.date)) + '</b>' + stars(s.last.rating) + '<small>' + E([s.last.build ? 'Build ' + s.last.build : '', s.last.testers].filter(Boolean).join(' · ') || 'Sem detalhes') + '</small>' + (s.avgRating ? '<small>Média de ' + s.playtests + ' sessões: ' + s.avgRating + ' ★</small>' : '')
          : '<b class="ts-big">—</b><small>Nenhuma sessão registrada ainda.</small>') + '</a>' +
      '<a class="panel ts-card" href="' + H + '/feedback"><div class="ts-card-h">' + I('feedback') + '<span>Feedback novo</span></div><b class="ts-big">' + s.newFeedback + '</b><small>' + (p.feedback || []).length + ' no total</small></a>' +
      '</div>' +
      '<div class="ts-quick"><button class="btn primary" type="button" data-ts-new="bug">' + I('bug') + 'Novo bug</button><button class="btn" type="button" data-ts-new="sessao">' + I('play') + 'Nova sessão</button><button class="btn" type="button" data-ts-new="feedback">' + I('feedback') + 'Feedback</button></div>' +
      '<div class="cols-2 ts-lists">' +
        '<section class="panel"><h3>' + I('alert') + 'Bugs mais graves</h3>' + (top.length ? '<ul class="rs-miss">' + top.map(function (b) { return '<li><a href="' + H + '/bugs"><span class="sev-dot" data-sev="' + b.severity + '"></span><span class="rs-miss-t"><b>' + E(b.title) + '</b><small>' + E(SEVERITY[SEV_BY[b.severity]][1]) + ' · ' + E(BS_BY[b.status]) + (b.assignee && T() && T().member(p, b.assignee) ? ' · ' + E(T().member(p, b.assignee).name) : '') + '</small></span>' + I('right') + '</a></li>'; }).join('') + '</ul>' : '<p class="hint">Nenhum bug aberto. 🎉</p>') + '</section>' +
        '<section class="panel"><h3>' + I('testes') + 'Testes que falharam</h3>' + (failing.length ? '<ul class="rs-miss">' + failing.map(function (c) { return '<li><a href="' + H + '/casos"><span class="sev-dot" data-sev="alta"></span><span class="rs-miss-t"><b>' + E(c.title) + '</b><small>' + E(c.link ? linkLabel(c.link) : AREA_BY[c.area]) + '</small></span>' + I('right') + '</a></li>'; }).join('') + '</ul>' : '<p class="hint">' + (s.cases ? 'Nenhum caso falhando.' : 'Crie casos de teste para cada mecânica e fase.') + '</p>') + '</section>' +
      '</div>';
  }

  function bugsHtml(p) {
    var list = (p.bugs || []).filter(function (b) { return ui.bugFilter === 'todos' ? true : ui.bugFilter === 'corrigidos' ? !!BUG_DONE[b.status] : !BUG_DONE[b.status]; })
      .sort(function (a, b) { return (BUG_DONE[a.status] ? 1 : 0) - (BUG_DONE[b.status] ? 1 : 0) || SEV_BY[a.severity] - SEV_BY[b.severity] || (str(a.createdAt) < str(b.createdAt) ? 1 : -1); });
    var s = summary(p);
    return '<form class="adder ts-add" data-ts-bugadd><input class="input" name="name" placeholder="O que deu errado? (ex.: personagem atravessa a parede)" aria-label="Título do novo bug" autocomplete="off">' +
        '<select class="select" name="sev" aria-label="Gravidade">' + opts(SEVERITY, 'media') + '</select><button class="btn primary" type="submit">' + I('plus') + 'Bug</button></form>' +
      '<div class="chips ts-filter" role="group" aria-label="Filtrar bugs">' + [['abertos', 'Abertos', s.openBugs], ['corrigidos', 'Corrigidos', s.fixed], ['todos', 'Todos', s.totalBugs]].map(function (f) { return '<button class="chip" type="button" data-ts-bf="' + f[0] + '" aria-pressed="' + (ui.bugFilter === f[0]) + '">' + f[1] + ' <small>' + f[2] + '</small></button>'; }).join('') + '</div>' +
      (list.length ? '<div class="rs-items">' + list.map(function (b) { return bugCard(p, b); }).join('') + '</div>' : '<p class="hint">' + (s.totalBugs ? 'Nada neste filtro.' : 'Nenhum bug registrado. Quando algo der errado num teste, anote aqui com os passos para reproduzir.') + '</p>');
  }
  function bugCard(p, b) {
    var fb = b.fromFeedback ? (p.feedback || []).filter(function (f) { return f.id === b.fromFeedback; })[0] : null;
    return '<div class="rs-item ts-bug" data-list="bugs" data-id="' + E(b.id) + '" data-sev="' + E(b.severity) + '">' +
      '<div class="rs-item-top"><span class="sev-dot" data-sev="' + E(b.severity) + '" aria-hidden="true"></span><input class="input bare name" data-field="title" value="' + E(b.title) + '" aria-label="Título do bug" autocomplete="off">' +
        '<button class="icon-btn del" data-action="del-item" aria-label="Excluir bug">' + I('trash') + '</button></div>' +
      '<div class="rs-item-sel"><select class="select sev" data-field="severity" data-v="' + E(b.severity) + '" aria-label="Gravidade">' + opts(SEVERITY.map(function (x) { return [x[0], 'Gravidade ' + x[1].toLowerCase()]; }), b.severity) + '</select>' +
        '<select class="select status" data-field="status" data-v="' + E(b.status) + '" aria-label="Estado do bug">' + opts(BUG_STATUS, b.status) + '</select>' + memberSel(p, b.assignee) + '</div>' +
      '<textarea class="textarea desc" data-field="steps" rows="2" aria-label="Passos para reproduzir" placeholder="Passos para reproduzir:&#10;1. …&#10;2. …&#10;Aconteceu: … / Esperado: …">' + E(b.steps) + '</textarea>' +
      '<div class="rs-item-sel ts-meta"><input class="input" data-field="platform" list="tsPlatforms" value="' + E(b.platform) + '" placeholder="Plataforma" aria-label="Plataforma" autocomplete="off">' +
        '<input class="input" data-field="build" value="' + E(b.build) + '" placeholder="Build (ex.: v0.9.2)" aria-label="Build" autocomplete="off"></div>' +
      '<div class="rs-item-sel"><select class="select ts-link" data-field="link" aria-label="O que o bug afeta">' + linkOptions(p, b.link) + '</select>' + msSel(p, b.milestoneId) + '</div>' +
      (fb ? '<p class="hint ts-from">' + I('feedback') + 'Veio do feedback de ' + E(fb.tester || 'um tester') + '.</p>' : '') +
    '</div>';
  }

  function casesHtml(p) {
    var all = p.testCases || [], s = summary(p);
    var list = all.filter(function (c) { return !ui.caseFilter || c.status === ui.caseFilter; });
    var covered = {}; all.forEach(function (c) { if (c.link) covered[c.link] = true; });
    var missing = (p.mechanics || []).map(function (m) { return 'mecanica:' + m.name; }).concat((p.levels || []).map(function (l) { return 'fase:' + l.name; })).filter(function (k) { return !covered[k]; });
    var groups = {}; list.forEach(function (c) { var k = c.link || ('area:' + c.area); (groups[k] = groups[k] || []).push(c); });
    return '<form class="adder ts-add" data-ts-caseadd><input class="input" name="name" placeholder="O que testar? (ex.: pulo duplo funciona na borda)" aria-label="Novo caso de teste" autocomplete="off">' +
        '<select class="select" name="link" aria-label="Ligado a">' + linkOptions(p, '', 'geral') + '</select><button class="btn primary" type="submit">' + I('plus') + 'Caso</button></form>' +
      (missing.length ? '<div class="ts-gen"><span class="hint">' + missing.length + (missing.length === 1 ? ' mecânica ou fase ainda sem caso de teste.' : ' mecânicas e fases ainda sem caso de teste.') + '</span><button class="btn sm" type="button" data-ts-gen>' + I('plus') + 'Criar um caso para cada</button></div>' : '') +
      '<div class="chips ts-filter" role="group" aria-label="Filtrar casos">' + [['', 'Todos', s.cases], ['falhou', 'Falharam', s.failed], ['nao', 'Não testados', s.notRun], ['passou', 'Passaram', s.passed]].map(function (f) { return '<button class="chip" type="button" data-ts-cf="' + f[0] + '" aria-pressed="' + (ui.caseFilter === f[0]) + '">' + f[1] + ' <small>' + f[2] + '</small></button>'; }).join('') + '</div>' +
      (list.length ? Object.keys(groups).map(function (k) {
        var label = k.indexOf('area:') === 0 ? AREA_BY[k.slice(5)] : linkLabel(k), g = groups[k], ok = g.filter(function (c) { return c.status === 'passou'; }).length;
        return '<section class="ts-group"><h3>' + E(label) + ' <small>' + ok + '/' + g.length + ' passaram</small></h3><div class="rs-items">' + g.map(function (c) { return caseCard(p, c); }).join('') + '</div></section>';
      }).join('') : '<p class="hint">' + (all.length ? 'Nada neste filtro.' : 'Nenhum caso de teste ainda. Um caso diz o que fazer no jogo e o que deveria acontecer.') + '</p>');
  }
  function caseCard(p, c) {
    return '<div class="rs-item ts-case" data-list="testCases" data-id="' + E(c.id) + '" data-st="' + E(c.status) + '">' +
      '<div class="rs-item-top"><input class="input bare name" data-field="title" value="' + E(c.title) + '" aria-label="Caso de teste" autocomplete="off"><button class="icon-btn del" data-action="del-item" aria-label="Excluir caso">' + I('trash') + '</button></div>' +
      '<div class="seg ts-res" role="group" aria-label="Resultado">' + CASE_STATUS.map(function (o) { return '<button type="button" data-ts-res="' + o[0] + '" aria-pressed="' + (c.status === o[0]) + '">' + E(o[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="rs-item-sel"><select class="select" data-field="area" aria-label="Área">' + opts(AREAS, c.area) + '</select><select class="select ts-link" data-field="link" aria-label="Ligado a">' + linkOptions(p, c.link, c.area) + '</select>' + memberSel(p, c.assignee) + '</div>' +
      '<textarea class="textarea desc" data-field="steps" rows="1" aria-label="Passos" placeholder="Passos: 1. … 2. …">' + E(c.steps) + '</textarea>' +
      '<textarea class="textarea desc" data-field="expected" rows="1" aria-label="Resultado esperado" placeholder="Resultado esperado">' + E(c.expected) + '</textarea>' +
      '<div class="ts-case-f"><span class="hint">' + (c.lastRun ? 'Testado em ' + E(fmtDay(c.lastRun)) : 'Ainda não testado') + '</span>' +
        (c.status === 'falhou' ? ((p.bugs || []).some(function (b) { return b.fromCase === c.id; }) ? '<span class="pill st" data-v="fazendo">Bug registrado</span>' : '<button class="btn sm" type="button" data-ts-casebug>' + I('bug') + 'Registrar bug</button>') : '') + '</div>' +
    '</div>';
  }

  function sessionsHtml(p) {
    var list = (p.playtests || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return '<div class="tm-mt-new"><button class="btn primary" type="button" data-ts-new="sessao">' + I('plus') + 'Nova sessão de playtest</button><span class="hint">Build atual: ' + E(lastBuild(p) || 'não informada') + '</span></div>' +
      (list.length ? '<div class="rs-items ts-sessions">' + list.map(function (s) {
        return '<div class="rs-item ts-session" data-list="playtests" data-id="' + E(s.id) + '">' +
          '<div class="rs-item-top"><input class="input" type="date" data-field="date" value="' + E(s.date) + '" aria-label="Data"><input class="input bare name" data-field="build" value="' + E(s.build) + '" placeholder="Build / versão" aria-label="Build" autocomplete="off">' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Excluir sessão">' + I('trash') + '</button></div>' +
          '<div class="ts-rate-row">' + stars(s.rating, true) + '<label class="tm-hours"><input class="input" type="number" min="0" max="1440" inputmode="numeric" data-field="duration" value="' + E(s.duration) + '" aria-label="Duração em minutos" placeholder="0"><span>min</span></label></div>' +
          '<input class="input" data-field="testers" value="' + E(s.testers) + '" placeholder="Quem testou (ex.: Lucas, Bia, primo)" aria-label="Testers" autocomplete="off">' +
          '<textarea class="textarea desc" data-field="goals" rows="1" aria-label="Objetivos" placeholder="O que queríamos descobrir? (ex.: o tutorial é claro?)">' + E(s.goals) + '</textarea>' +
          '<textarea class="textarea desc" data-field="notes" rows="2" aria-label="Notas" placeholder="Notas: onde travaram, o que gostaram, tempo até o primeiro chefe…">' + E(s.notes) + '</textarea>' +
          '<div class="ts-case-f"><span class="hint">' + (p.feedback || []).filter(function (f) { return f.session === s.id; }).length + ' feedbacks desta sessão</span><button class="btn sm" type="button" data-ts-new="feedback" data-session="' + E(s.id) + '">' + I('feedback') + 'Anotar feedback</button></div>' +
        '</div>';
      }).join('') + '</div>' : '<p class="hint" style="margin-top:14px">Nenhum playtest registrado. Cada vez que alguém jogar uma build, registre aqui.</p>');
  }

  function feedbackHtml(p) {
    var all = p.feedback || [], tagCount = {};
    all.forEach(function (f) { tags(f.tags).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    var list = all.filter(function (f) { return (ui.fbShowAll || f.status === 'novo') && (!ui.fbTag || tags(f.tags).indexOf(ui.fbTag) >= 0); })
      .sort(function (a, b) { return str(a.createdAt) < str(b.createdAt) ? 1 : -1; });
    return '<form class="panel ts-fbform" data-ts-fbadd><label class="label" for="tsFb">Novo feedback</label><textarea class="textarea" id="tsFb" name="text" rows="2" placeholder="O que o tester disse ou sentiu (ex.: “a câmera gira rápido demais no carro”)"></textarea>' +
        '<div class="cols-2"><input class="input" name="tester" placeholder="Quem disse" aria-label="Tester" autocomplete="off"><input class="input" name="tags" placeholder="Tags: câmera, dificuldade" aria-label="Tags separadas por vírgula" autocomplete="off"></div>' +
        '<div class="capture-foot"><span class="hint">Separe as tags com vírgula.</span><button class="btn primary" type="submit">' + I('plus') + 'Guardar</button></div></form>' +
      '<div class="chips ts-filter" role="group" aria-label="Filtrar feedback"><button class="chip" type="button" data-ts-fball aria-pressed="' + ui.fbShowAll + '">' + (ui.fbShowAll ? 'Mostrando todos' : 'Só os novos') + '</button>' +
        Object.keys(tagCount).sort().map(function (t) { return '<button class="chip" type="button" data-ts-tag="' + E(t) + '" aria-pressed="' + (ui.fbTag === t) + '">#' + E(t) + ' <small>' + tagCount[t] + '</small></button>'; }).join('') + '</div>' +
      (list.length ? '<div class="rs-items">' + list.map(function (f) {
        return '<div class="rs-item ts-fb" data-list="feedback" data-id="' + E(f.id) + '" data-st="' + E(f.status) + '">' +
          '<textarea class="textarea desc ts-fb-t" data-field="text" rows="2" aria-label="Feedback">' + E(f.text) + '</textarea>' +
          '<div class="rs-item-sel"><input class="input" data-field="tester" value="' + E(f.tester) + '" placeholder="Quem disse" aria-label="Tester" autocomplete="off"><input class="input" data-field="tags" value="' + E(f.tags) + '" placeholder="tags" aria-label="Tags" autocomplete="off"></div>' +
          '<div class="ts-fb-tags">' + tags(f.tags).map(function (t) { return '<span class="pill">#' + E(t) + '</span>'; }).join('') + '<span class="pill st" data-v="' + (f.status === 'novo' ? 'ideia' : f.status === 'arquivado' ? '' : 'pronto') + '">' + E(FB_STATUS[f.status]) + '</span><span class="hint">' + E(fmtDay(f.date)) + '</span></div>' +
          '<div class="ts-fb-a">' + (f.status === 'novo' ? '<button class="btn sm" type="button" data-ts-fb="bug">' + I('bug') + 'Virar bug</button><button class="btn sm" type="button" data-ts-fb="task">' + I('tarefa') + 'Virar tarefa</button><button class="btn ghost sm" type="button" data-ts-fb="archive">Arquivar</button>'
            : '<button class="btn ghost sm" type="button" data-ts-fb="reopen">Reabrir</button>') + '<button class="icon-btn del" data-action="del-item" aria-label="Excluir feedback">' + I('trash') + '</button></div>' +
        '</div>';
      }).join('') + '</div>' : '<p class="hint">' + (all.length ? 'Nada neste filtro.' : 'Nenhum feedback ainda.') + '</p>') +
      '<datalist id="tsPlatforms">' + PLATFORMS.map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>';
  }

  // ---------------------------------------------------------------- ações
  function cur() { return api.curP(); }
  function itemOf(el, list) { var row = el.closest('[data-list="' + list + '"]'), p = cur(); return row && p ? p[list].filter(function (x) { return x.id === row.dataset.id; })[0] : null; }
  function feedbackTo(p, f, to) {
    var text = str(f.text).trim(), first = text.split('\n')[0].slice(0, 120) || 'Feedback';
    if (to === 'bug') {
      var b = makeBug({ title: first, steps: text + (f.tester ? '\n\n(feedback de ' + f.tester + ')' : ''), fromFeedback: f.id, build: f.build || lastBuild(p) });
      p.bugs.unshift(b); f.status = 'virou-bug'; f.ref = b.id; return b;
    }
    var t = { id: uid(), title: first, notes: text + (f.tester ? '\n\n(feedback de ' + f.tester + ')' : ''), col: 'todo', milestoneId: '', assignee: '', createdAt: api.now() };
    p.tasks.push(t); f.status = 'virou-tarefa'; f.ref = t.id; return t;
  }
  function genCases(p) {
    var covered = {}; p.testCases.forEach(function (c) { if (c.link) covered[c.link] = true; }); var n = 0;
    (p.mechanics || []).forEach(function (m) { var k = 'mecanica:' + m.name; if (!covered[k]) { p.testCases.push(makeCase({ title: m.name + ' funciona como descrito', area: 'mecanica', link: k, expected: str(m.desc) })); n++; } });
    (p.levels || []).forEach(function (l) { var k = 'fase:' + l.name; if (!covered[k]) { p.testCases.push(makeCase({ title: 'Dá para terminar ' + l.name, area: 'fase', link: k, expected: str(l.purpose) })); n++; } });
    return n;
  }
  function focusFirst(sel) { setTimeout(function () { var x = document.querySelector(sel); if (x) x.focus(); }, 30); }
  function mount(root, p, tab) {
    if (root.__tsBound) return; root.__tsBound = true;
    root.addEventListener('submit', function (e) {
      var f = e.target, p = cur(); if (!p) return;
      if (f.matches('[data-ts-bugadd]')) {
        e.preventDefault(); var n = f.elements.name.value.trim(); if (!n) { f.elements.name.focus(); return; }
        p.bugs.unshift(makeBug({ title: n, severity: f.elements.sev.value, build: lastBuild(p) })); ui.bugFilter = 'abertos'; api.touch(p); api.rerender(); focusFirst('[data-ts-bugadd] [name=name]');
      } else if (f.matches('[data-ts-caseadd]')) {
        e.preventDefault(); var t = f.elements.name.value.trim(); if (!t) { f.elements.name.focus(); return; }
        var lk = f.elements.link.value, ar = lk ? lk.split(':')[0] : 'geral';
        p.testCases.push(makeCase({ title: t, link: lk, area: ar })); api.touch(p); api.rerender(); focusFirst('[data-ts-caseadd] [name=name]');
      } else if (f.matches('[data-ts-fbadd]')) {
        e.preventDefault(); var tx = f.elements.text.value.trim(); if (!tx) { f.elements.text.focus(); return; }
        p.feedback.push({ id: uid(), text: tx, tester: f.elements.tester.value.trim(), tags: f.elements.tags.value.trim(), status: 'novo', date: today(), build: lastBuild(p), session: f.dataset.session || '', createdAt: api.now() });
        api.touch(p); api.rerender(); api.toast('Feedback guardado.'); focusFirst('#tsFb');
      }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ts-new],[data-ts-bf],[data-ts-cf],[data-ts-tag],[data-ts-fball],[data-ts-fb],[data-ts-rate],[data-ts-res],[data-ts-casebug],[data-ts-gen]'); if (!b) return;
      var p = cur(); if (!p) return; var d = b.dataset, H = api.projHash(p, 'testes');
      if (d.tsNew === 'bug') { api.go(H + '/bugs'); focusFirst('[data-ts-bugadd] [name=name]'); return; }
      if (d.tsNew === 'sessao') { p.playtests.push({ id: uid(), date: today(), build: lastBuild(p), testers: '', goals: '', duration: '', rating: 0, notes: '', createdAt: api.now() }); api.touch(p); if (location.hash !== H + '/sessoes') api.go(H + '/sessoes'); else api.rerender(); return; }
      if (d.tsNew === 'feedback') { api.go(H + '/feedback'); setTimeout(function () { var f = document.querySelector('[data-ts-fbadd]'); if (f && d.session) f.dataset.session = d.session; }, 20); focusFirst('#tsFb'); return; }
      if (d.tsBf) { ui.bugFilter = d.tsBf; api.rerender(); return; }
      if (d.tsCf != null) { ui.caseFilter = d.tsCf; api.rerender(); return; }
      if (d.tsTag) { ui.fbTag = ui.fbTag === d.tsTag ? '' : d.tsTag; api.rerender(); return; }
      if (b.hasAttribute('data-ts-fball')) { ui.fbShowAll = !ui.fbShowAll; api.rerender(); return; }
      if (d.tsFb) {
        var f = itemOf(b, 'feedback'); if (!f) return;
        if (d.tsFb === 'archive') { f.status = 'arquivado'; api.touch(p); api.rerender(); return; }
        if (d.tsFb === 'reopen') { f.status = 'novo'; api.touch(p); api.rerender(); return; }
        var made = feedbackTo(p, f, d.tsFb); api.touch(p); api.rerender();
        api.toast(d.tsFb === 'bug' ? 'Virou bug.' : 'Virou tarefa em “A fazer”.', 'Ver', function () { api.go(d.tsFb === 'bug' ? H + '/bugs' : api.projHash(p, 'producao')); });
      }
      if (d.tsRate) { var s = itemOf(b, 'playtests'); if (!s) return; var r = +d.tsRate; s.rating = s.rating === r ? 0 : r; api.touch(p); api.rerender(); return; }
      if (d.tsRes) { var c = itemOf(b, 'testCases'); if (!c) return; c.status = d.tsRes; c.lastRun = d.tsRes === 'nao' ? '' : today(); api.touch(p); api.rerender(); return; }
      if (b.hasAttribute('data-ts-casebug')) {
        var cc = itemOf(b, 'testCases'); if (!cc) return;
        var bug = makeBug({ title: 'Falhou: ' + cc.title, steps: (cc.steps ? cc.steps + '\n' : '') + (cc.expected ? 'Esperado: ' + cc.expected : ''), link: cc.link, fromCase: cc.id, build: lastBuild(p), assignee: '' });
        p.bugs.unshift(bug); api.touch(p); api.rerender(); api.toast('Bug registrado.', 'Ver', function () { api.go(H + '/bugs'); }); return;
      }
      if (b.hasAttribute('data-ts-gen')) { var n = genCases(p); api.touch(p); api.rerender(); api.toast(n + (n === 1 ? ' caso criado.' : ' casos criados.')); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.classList.contains('sev')) { t.dataset.v = t.value; var row = t.closest('[data-sev]'); if (row) row.dataset.sev = t.value; var dot = row && row.querySelector('.sev-dot'); if (dot) dot.dataset.sev = t.value; }
      // a área mudou: a lista "ligado a" muda junto
      if (t.dataset.field === 'area' && t.closest('[data-list=testCases]')) setTimeout(function () { api.rerender(); }, 0);
      if (t.dataset.field === 'tags' && t.closest('[data-list=feedback]')) setTimeout(function () { api.rerender(); }, 0);
    });
  }

  window.PranchetaTestes = {
    init: function (a) { api = a; },
    html: html, mount: mount, count: count, summary: summary, normalizeProject: normalizeProject,
    makeBug: makeBug, makeCase: makeCase, feedbackTo: feedbackTo, genCases: genCases, linkLabel: linkLabel, lastBuild: lastBuild,
    SEVERITY: SEVERITY, BUG_STATUS: BUG_STATUS, CASE_STATUS: CASE_STATUS, AREAS: AREAS
  };
})();
