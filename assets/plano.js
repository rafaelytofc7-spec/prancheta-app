/* Prancheta — Plano do jogo real: o que foi DECIDIDO (diferente da Caixa de ideias e do Caderno de design,
   que são rascunho). Documento estruturado (visão, público, gênero, plataformas, engine, core loop, mecânicas
   confirmadas, progressão, monetização, direção de arte e som, escopo), lista de escopo (MVP / 1.0 / depois),
   roadmap com marcos (protótipo → lançamento) e o registro de builds. Dados: p.plan, p.confirmed, p.scope,
   p.releases e os campos novos dos marcos (stage, deliverables, owner). */
(function () {
  'use strict';
  var api = null;

  var DOC = [
    ['pitch', 'Visão e pitch', 'O jogo em 2 ou 3 frases: o que é, para quem e por que é especial.', 'gdd'],
    ['audience', 'Público', 'Quem vai jogar: idade, o que já jogam, onde estão.', ''],
    ['genre', 'Gênero', 'Ex.: sobrevivência top-down, roguelite, plataforma 2D.', ''],
    ['platforms', 'Plataformas', 'Onde o jogo sai primeiro e depois.', ''],
    ['engine', 'Engine', 'Motor e versão (padrão: Godot 4).', ''],
    ['loop', 'Core loop', 'O ciclo que o jogador repete a cada minuto (ex.: explorar → coletar → construir → sobreviver).', ''],
    ['progression', 'Progressão', 'Como o jogador evolui: níveis, desbloqueios, história, dificuldade.', ''],
    ['monetization', 'Monetização', 'Preço, demo, DLC, anúncios ou grátis.', ''],
    ['art', 'Direção de arte', 'Estilo visual decidido, paleta, referências.', ''],
    ['sound', 'Direção de som', 'Clima da trilha, efeitos, vozes.', ''],
    ['scopeNote', 'Escopo', 'O tamanho do jogo: horas de jogo, número de fases, o que fica de fora.', '']
  ];
  var DOC_BY = {}; DOC.forEach(function (d) { DOC_BY[d[0]] = d; });
  var TIERS = [['mvp', 'MVP', 'O mínimo para o jogo ser jogável e divertido.'], ['v1', 'Versão 1.0', 'O que entra no lançamento.'], ['depois', 'Depois', 'Atualizações, DLC ou “se der tempo”.']];
  var TIER_BY = {}; TIERS.forEach(function (t) { TIER_BY[t[0]] = t[1]; });
  var SIZES = [['P', 'Pequeno'], ['M', 'Médio'], ['G', 'Grande']];
  var STAGES = [['prototipo', 'Protótipo'], ['vertical', 'Vertical slice'], ['alpha', 'Alpha'], ['beta', 'Beta'], ['lancamento', 'Lançamento'], ['outro', 'Outro marco']];
  var STAGE_BY = {}; STAGES.forEach(function (s, i) { STAGE_BY[s[0]] = i; });
  var STAGE_HINT = { prototipo: 'O core loop funciona, mesmo feio.', vertical: 'Um pedaço do jogo com a qualidade final.', alpha: 'Todo o conteúdo e mecânicas entram, com bugs.', beta: 'Conteúdo travado: só polimento e correções.', lancamento: 'Build final publicada.' };
  var REL_KINDS = [['interna', 'Interna'], ['playtest', 'Playtest'], ['demo', 'Demo'], ['publica', 'Pública']];
  var KINDS = { mecanica: 'Mecânica', ideia: 'Ideia', personagem: 'Personagem', fase: 'Fase', efeito: 'Efeito', outro: 'Outro' };
  var TABS = [['documento', 'Documento', 'plano'], ['escopo', 'Escopo', 'escopo'], ['roadmap', 'Roadmap', 'flag'], ['builds', 'Builds', 'build']];

  function E(s) { return api.esc(s); }
  function I(n) { return api.icon(n); }
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function str(v) { return v == null ? '' : String(v); }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + E(o[1]) + '</option>'; }).join(''); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDay(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function objs(a) { return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { if (!x.id) x.id = uid(); return x; }); }
  function T() { return window.PranchetaTime; }
  function first(s, n) { s = str(s).trim().split('\n')[0]; return s.length > (n || 100) ? s.slice(0, n || 100) + '…' : s; }

  // ---------------------------------------------------------------- dados
  function engineGuess(p) {
    if (p.engine === 'Godot' || !p.engine) return 'Godot ' + (p.engineVersion || '4');
    if (p.engine === 'Outro') return str(p.engineOther);
    return p.engine + (p.engineVersion ? ' ' + p.engineVersion : '');
  }
  function normalizeProject(p) {
    var fresh = !p.plan || typeof p.plan !== 'object';
    var plan = fresh ? {} : p.plan;
    DOC.forEach(function (d) { plan[d[0]] = str(plan[d[0]]); });
    // primeira vez: só copia os fatos que já estavam no jogo (não mexe nos originais)
    if (fresh) {
      plan.engine = engineGuess(p);
      plan.genre = str(p.genre); plan.audience = str(p.audience);
      plan.platforms = Array.isArray(p.platforms) ? p.platforms.join(', ') : '';
    }
    if (!plan.decided || typeof plan.decided !== 'object') plan.decided = {};
    p.plan = plan;
    p.confirmed = objs(p.confirmed); p.scope = objs(p.scope); p.releases = objs(p.releases);
    p.confirmed.forEach(function (c) { c.name = str(c.name) || 'Sem nome'; if (!KINDS[c.kind]) c.kind = 'outro'; c.refId = str(c.refId); c.notes = str(c.notes); });
    p.scope.forEach(function (s) { s.name = str(s.name) || 'Sem nome'; if (!TIER_BY[s.tier]) s.tier = 'mvp'; s.decision = s.decision === 'cortar' ? 'cortar' : 'manter'; if (['P', 'M', 'G'].indexOf(s.size) < 0) s.size = 'M'; s.notes = str(s.notes); s.refId = str(s.refId); });
    p.releases.forEach(function (r) { r.version = str(r.version) || 'sem versão'; r.date = /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : today(); if (!REL_KINDS.some(function (k) { return k[0] === r.kind; })) r.kind = 'interna'; ['platform', 'notes', 'link', 'milestoneId'].forEach(function (k) { r[k] = str(r[k]); }); });
    (p.milestones || []).forEach(function (m) { if (m.stage != null && STAGE_BY[m.stage] == null) m.stage = 'outro'; m.deliverables = str(m.deliverables); m.owner = str(m.owner); });
    return p;
  }
  function docProgress(p) {
    var filled = DOC.filter(function (d) { return str(p.plan && p.plan[d[0]]).trim(); }).length;
    return { filled: filled, total: DOC.length, pct: Math.round(filled / DOC.length * 100) };
  }
  // % do marco: tarefas feitas, recursos/efeitos prontos, bugs corrigidos e casos que passaram
  function milestoneProgress(p, m) {
    var items = [];
    (p.tasks || []).forEach(function (t) { if (t.milestoneId === m.id) items.push(t.col === 'done'); });
    (p.resources || []).forEach(function (r) { if (r.milestoneId === m.id) items.push(r.status === 'pronto'); });
    (p.effects || []).forEach(function (e) { if (e.milestoneId === m.id) items.push(e.status === 'pronto'); });
    (p.bugs || []).forEach(function (b) { if (b.milestoneId === m.id) items.push(b.status === 'corrigido' || b.status === 'verificado'); });
    (p.testCases || []).forEach(function (c) { if (c.milestoneId === m.id) items.push(c.status === 'passou'); });
    var done = items.filter(Boolean).length;
    var by = { tasks: 0, resources: 0, effects: 0, bugs: 0, testCases: 0 };
    ['tasks', 'resources', 'effects', 'bugs', 'testCases'].forEach(function (k) { (p[k] || []).forEach(function (x) { if (x.milestoneId === m.id) by[k]++; }); });
    return { done: done, total: items.length, pct: items.length ? Math.round(done / items.length * 100) : (m.done ? 100 : 0), by: by };
  }
  function summary(p) {
    var d = docProgress(p), mvp = (p.scope || []).filter(function (s) { return s.tier === 'mvp' && s.decision !== 'cortar'; }).length;
    var next = (p.milestones || []).filter(function (m) { return !m.done; }).sort(stageSort)[0] || null;
    return { doc: d, confirmed: (p.confirmed || []).length, mvp: mvp, scope: (p.scope || []).length, cut: (p.scope || []).filter(function (s) { return s.decision === 'cortar'; }).length,
      next: next, nextPct: next ? milestoneProgress(p, next).pct : 0, releases: (p.releases || []).length };
  }
  function stageSort(a, b) {
    var sa = STAGE_BY[a.stage] != null ? STAGE_BY[a.stage] : 9, sb = STAGE_BY[b.stage] != null ? STAGE_BY[b.stage] : 9;
    return ((a.done ? 1 : 0) - (b.done ? 1 : 0)) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0) || sa - sb;
  }
  function count(p) { return (p.confirmed || []).length; }
  function confirm(p, kind, ref) {
    // ref: o objeto de origem (mecânica, ideia, personagem, fase, efeito) ou {name}
    var name = kind === 'ideia' ? first(ref.text, 100) : str(ref.name || ref.title);
    if (ref.id && p.confirmed.some(function (c) { return c.refId === ref.id; })) return null;
    var c = { id: uid(), kind: KINDS[kind] ? kind : 'outro', refId: kind === 'ideia' ? '' : str(ref.id), name: name || 'Sem nome', notes: kind === 'ideia' ? (str(ref.text).length > name.length ? str(ref.text) : '') : str(ref.desc || ref.abilities || ref.purpose || ''), createdAt: api.now() };
    p.confirmed.push(c); return c;
  }

  // ---------------------------------------------------------------- telas
  var ui = { tierTab: 'mvp' };
  function tabsHtml(p, tab) {
    var s = summary(p), n = { documento: s.doc.pct + '%', escopo: s.scope || '', roadmap: (p.milestones || []).length || '', builds: s.releases || '' };
    return '<nav class="rs-tabs" aria-label="Partes do plano">' + TABS.map(function (t) {
      return '<a href="' + api.projHash(p, 'plano') + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + I(t[2]) + '<span>' + E(t[1]) + '</span>' + (n[t[0]] ? '<small>' + n[t[0]] + '</small>' : '') + '</a>';
    }).join('') + '</nav>';
  }
  function html(p, tab) {
    tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : 'documento';
    var head = '<header class="sec-head"><div><div class="eyebrow pl-eyebrow"><span class="pl-badge">Decidido</span> Plano do jogo real</div><h1>' + ({ documento: 'O jogo que vai ser feito', escopo: 'Escopo', roadmap: 'Roadmap', builds: 'Builds e versões' }[tab]) + '</h1>' +
      '<p>' + E({ documento: 'Só o que já foi decidido. Ideias soltas e rascunhos continuam na Caixa de ideias e no Caderno de design; quando uma ideia for aprovada, confirme ela aqui.', escopo: 'O que entra no MVP, na versão 1.0 e o que fica para depois. Cortar também é decidir.', roadmap: 'Do protótipo ao lançamento. O % de cada marco vem das tarefas, recursos, bugs e testes ligados a ele.', builds: 'Cada build que saiu: versão, data, para quem e o que mudou.' }[tab]) + '</p></div></header>';
    var flow = '<div class="pl-flow"><a href="' + api.projHash(p, 'ideias') + '" class="pl-flow-a"><span class="pl-flow-k">Rascunho</span><b>Ideias e Caderno de design</b><small>' + (p.ideas || []).length + ' ideias soltas</small></a>' + I('right') +
      '<a href="' + api.projHash(p, 'plano') + '" class="pl-flow-a on"><span class="pl-flow-k">Decidido</span><b>Jogo real</b><small>' + (p.confirmed || []).length + ' confirmados · documento ' + docProgress(p).pct + '%</small></a></div>';
    var body = tab === 'escopo' ? scopeHtml(p) : tab === 'roadmap' ? roadmapHtml(p) : tab === 'builds' ? buildsHtml(p) : docHtml(p);
    return '<div class="pl" data-pl-root>' + head + (tab === 'documento' ? flow : '') + tabsHtml(p, tab) + body + '</div>';
  }
  function draftFor(p, k) {
    if (k === 'pitch') return str(p.gdd && p.gdd.premise) || str(p.logline);
    if (k === 'loop') return str(p.gdd && p.gdd.loop);
    if (k === 'art') return [str(p.art && p.art.direction), str(p.art && p.art.style)].filter(Boolean).join('\n');
    if (k === 'sound') return str(p.art && p.art.audio);
    if (k === 'genre') return str(p.genre);
    if (k === 'audience') return str(p.audience);
    if (k === 'platforms') return (p.platforms || []).join(', ');
    if (k === 'engine') return engineGuess(p);
    return '';
  }
  function docField(p, d) {
    var k = d[0], v = str(p.plan[k]), draft = draftFor(p, k), canPull = draft && v.indexOf(draft.trim()) < 0;
    return '<section class="panel pl-sec' + (v.trim() ? ' filled' : '') + '" id="pl-' + k + '"><div class="pl-sec-h"><label class="label" for="pl-f-' + k + '">' + E(d[1]) + '</label>' +
      (canPull ? '<button class="btn ghost sm" type="button" data-pl-pull="' + k + '" title="Copiar o que está no rascunho">' + I('download') + 'Puxar do rascunho</button>' : '') + '</div>' +
      '<p class="hint">' + E(d[2]) + '</p><textarea class="textarea" id="pl-f-' + k + '" data-bind="plan.' + k + '" rows="' + (k === 'loop' || k === 'pitch' ? 3 : 2) + '" placeholder="' + E(draft ? 'Rascunho: ' + first(draft, 80) : 'Ainda não decidido') + '">' + E(v) + '</textarea></section>';
  }
  function docHtml(p) {
    var d = docProgress(p), confirmedIds = {}; p.confirmed.forEach(function (c) { if (c.refId) confirmedIds[c.refId] = true; });
    var cands = [];
    (p.mechanics || []).forEach(function (m) { if (!confirmedIds[m.id]) cands.push(['mecanica', m.id, m.name]); });
    (p.ideas || []).forEach(function (i) { cands.push(['ideia', i.id, first(i.text, 60)]); });
    (p.characters || []).forEach(function (c) { if (!confirmedIds[c.id]) cands.push(['personagem', c.id, c.name]); });
    (p.levels || []).forEach(function (l) { if (!confirmedIds[l.id]) cands.push(['fase', l.id, l.name]); });
    var confirmedBlock = '<section class="panel pl-conf" id="pl-confirmed"><div class="pl-sec-h"><h3>' + I('check') + 'Confirmado para o jogo <small>' + p.confirmed.length + '</small></h3></div>' +
      '<p class="hint">Mecânicas, personagens, fases e ideias que viraram decisão. Tirar daqui não apaga o original.</p>' +
      (p.confirmed.length ? '<ul class="pl-conf-l">' + p.confirmed.map(function (c) {
        return '<li class="pl-conf-i" data-list="confirmed" data-id="' + E(c.id) + '"><span class="pill">' + E(KINDS[c.kind]) + '</span><input class="input bare" data-field="name" value="' + E(c.name) + '" aria-label="Nome" autocomplete="off">' +
          '<input class="input bare pl-conf-n" data-field="notes" value="' + E(c.notes) + '" placeholder="Como fica no jogo (opcional)" aria-label="Notas" autocomplete="off">' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Tirar do jogo real: ' + E(c.name) + '">' + I('close') + '</button></li>';
      }).join('') + '</ul>' : '<p class="pl-empty">Nada confirmado ainda.</p>') +
      (cands.length ? '<details class="pl-cands"' + (p.confirmed.length ? '' : ' open') + '><summary>Confirmar do rascunho (' + cands.length + ')</summary><div class="rs-chips">' + cands.slice(0, 40).map(function (c) {
        return '<button class="chip" type="button" data-pl-confirm="' + c[0] + ':' + E(c[1]) + '"><small>' + E(KINDS[c[0]]) + '</small> ' + E(c[2]) + '</button>';
      }).join('') + '</div></details>' : '') + '</section>';
    var fields = DOC.map(function (x) { return docField(p, x); });
    fields.splice(6, 0, confirmedBlock); // depois do core loop
    return '<div class="panel pl-progress"><div class="rs-total-n"><b>' + d.pct + '%</b><span>' + d.filled + ' de ' + d.total + ' seções decididas · ' + p.confirmed.length + ' itens confirmados</span></div>' +
        '<div class="progress" style="--c:var(--pc)"><span style="width:' + d.pct + '%"></span></div>' +
        '<nav class="pl-toc" aria-label="Seções do documento">' + DOC.map(function (x) { return '<a href="#pl-' + x[0] + '" data-pl-jump="' + x[0] + '" class="' + (str(p.plan[x[0]]).trim() ? 'on' : '') + '">' + E(x[1]) + '</a>'; }).join('') + '<a href="#pl-confirmed" data-pl-jump="confirmed" class="' + (p.confirmed.length ? 'on' : '') + '">Confirmados</a></nav></div>' +
      '<div class="pl-doc">' + fields.join('') + '</div>';
  }

  function scopeHtml(p) {
    var by = {}; TIERS.forEach(function (t) { by[t[0]] = p.scope.filter(function (s) { return s.tier === t[0]; }); });
    var inScope = {}; p.scope.forEach(function (s) { if (s.refId) inScope[s.refId] = true; });
    var bring = p.confirmed.filter(function (c) { return !inScope[c.id]; });
    function sizeSum(list) { var o = { P: 0, M: 0, G: 0 }; list.forEach(function (s) { if (s.decision !== 'cortar') o[s.size]++; }); return o; }
    return '<form class="adder" data-pl-scopeadd><input class="input" name="name" placeholder="O que entra? (ex.: 3 tipos de inimigo)" aria-label="Novo item de escopo" autocomplete="off"><select class="select" name="tier" aria-label="Quando">' + opts(TIERS, ui.tierTab) + '</select><button class="btn primary" type="submit">' + I('plus') + 'Item</button></form>' +
      (bring.length ? '<div class="ts-gen"><span class="hint">' + bring.length + (bring.length === 1 ? ' item confirmado ainda não está no escopo.' : ' itens confirmados ainda não estão no escopo.') + '</span><button class="btn sm" type="button" data-pl-bring>' + I('plus') + 'Trazer para o MVP</button></div>' : '') +
      '<div class="board-tabs pl-tier-tabs" role="group" aria-label="Nível do escopo">' + TIERS.map(function (t) { return '<button type="button" data-pl-tier="' + t[0] + '" aria-pressed="' + (ui.tierTab === t[0]) + '">' + E(t[1]) + '<span class="count">' + by[t[0]].filter(function (s) { return s.decision !== 'cortar'; }).length + '</span></button>'; }).join('') + '</div>' +
      '<div class="pl-scope" data-active="' + ui.tierTab + '">' + TIERS.map(function (t) {
        var list = by[t[0]], z = sizeSum(list), cut = list.filter(function (s) { return s.decision === 'cortar'; }).length;
        return '<section class="pl-tier" data-tier="' + t[0] + '"><h3>' + E(t[1]) + ' <small>' + (list.length - cut) + ' itens' + (cut ? ' · ' + cut + ' cortados' : '') + '</small></h3><p class="hint">' + E(t[2]) + (list.length ? ' Tamanho: ' + z.P + ' P · ' + z.M + ' M · ' + z.G + ' G.' : '') + '</p>' +
          (list.length ? '<ul class="pl-scope-l">' + list.map(function (s) {
            return '<li class="pl-scope-i' + (s.decision === 'cortar' ? ' cut' : '') + '" data-list="scope" data-id="' + E(s.id) + '">' +
              '<div class="pl-scope-r"><input class="input bare" data-field="name" value="' + E(s.name) + '" aria-label="Item" autocomplete="off"><button class="icon-btn del" data-action="del-item" aria-label="Excluir item">' + I('trash') + '</button></div>' +
              '<div class="pl-scope-r"><select class="select" data-field="tier" aria-label="Quando">' + opts(TIERS, s.tier) + '</select><select class="select pl-size" data-field="size" aria-label="Tamanho">' + opts(SIZES, s.size) + '</select>' +
                '<button class="btn sm pl-cut" type="button" data-pl-cut aria-pressed="' + (s.decision === 'cortar') + '">' + (s.decision === 'cortar' ? 'Cortado · manter' : 'Manter · cortar') + '</button></div>' +
              '<input class="input bare pl-scope-n" data-field="notes" value="' + E(s.notes) + '" placeholder="Por quê / observações" aria-label="Notas" autocomplete="off"></li>';
          }).join('') + '</ul>' : '<p class="pl-empty">Vazio.</p>') + '</section>';
      }).join('') + '</div>';
  }

  function roadmapHtml(p) {
    var ms = (p.milestones || []).slice().sort(stageSort);
    var have = {}; ms.forEach(function (m) { if (m.stage) have[m.stage] = m; });
    var missing = STAGES.slice(0, 5).filter(function (s) { return !have[s[0]]; });
    var pipe = '<ol class="pl-pipe">' + STAGES.slice(0, 5).map(function (s) {
      var m = have[s[0]], pr = m ? milestoneProgress(p, m) : null, st = !m ? 'none' : m.done ? 'done' : pr.pct > 0 ? 'doing' : 'todo';
      return '<li class="pl-pipe-s" data-st="' + st + '"><span class="pl-pipe-dot">' + (st === 'done' ? '✓' : '') + '</span><b>' + E(s[1]) + '</b><small>' + (m ? (m.done ? 'feito' : pr.pct + '%') + (m.due ? ' · ' + E(fmtDay(m.due)) : '') : 'sem marco') + '</small></li>';
    }).join('') + '</ol>';
    return pipe +
      '<div class="pl-road-a"><form class="adder" data-pl-msadd><input class="input" name="name" placeholder="Novo marco (ex.: demo para a feira)" aria-label="Novo marco" autocomplete="off"><select class="select" name="stage" aria-label="Etapa">' + opts(STAGES, missing[0] ? missing[0][0] : 'outro') + '</select><input class="input" type="date" name="due" aria-label="Prazo"><button class="btn primary" type="submit">' + I('plus') + 'Marco</button></form>' +
        (missing.length ? '<button class="btn sm" type="button" data-pl-defaults>' + I('flag') + (missing.length === 5 ? 'Criar roadmap padrão (5 etapas)' : 'Criar etapas que faltam (' + missing.length + ')') + '</button>' : '') + '</div>' +
      (ms.length ? '<div class="pl-road">' + ms.map(function (m) {
        var pr = milestoneProgress(p, m), n = m.due ? Math.round((new Date(m.due + 'T00:00') - new Date(today() + 'T00:00')) / 86400000) : null;
        var parts = []; if (pr.by.tasks) parts.push(pr.by.tasks + ' tarefas'); if (pr.by.resources + pr.by.effects) parts.push((pr.by.resources + pr.by.effects) + ' recursos'); if (pr.by.bugs) parts.push(pr.by.bugs + ' bugs'); if (pr.by.testCases) parts.push(pr.by.testCases + ' testes');
        return '<article class="panel pl-ms' + (m.done ? ' done' : '') + '" data-list="milestones" data-id="' + E(m.id) + '" data-stage="' + E(m.stage || '') + '">' +
          '<div class="pl-ms-h"><input type="checkbox" class="check" data-field="done"' + (m.done ? ' checked' : '') + ' aria-label="Marco concluído"><input class="input bare ms-title" data-field="title" value="' + E(m.title) + '" aria-label="Nome do marco" autocomplete="off">' +
            '<span class="pl-pct">' + pr.pct + '%</span><button class="icon-btn del" data-action="del-item" aria-label="Excluir marco">' + I('trash') + '</button></div>' +
          '<div class="progress" style="--c:var(--pc)"><span style="width:' + pr.pct + '%"></span></div>' +
          '<small class="pl-ms-p">' + (pr.total ? pr.done + ' de ' + pr.total + ' itens prontos (' + parts.join(', ') + ')' : 'Ligue tarefas (no editor da tarefa), recursos, bugs e testes a este marco para calcular o %.') + '</small>' +
          '<div class="rs-item-sel"><select class="select" data-field="stage" aria-label="Etapa"><option value="">Etapa…</option>' + opts(STAGES, m.stage) + '</select><input class="input" type="date" data-field="due" value="' + E(m.due || '') + '" aria-label="Prazo">' +
            (T() ? '<select class="select" data-field="owner" aria-label="Responsável">' + T().memberOptions(p, m.owner, 'Sem responsável') + '</select>' : '') + '</div>' +
          (n !== null && !m.done ? '<span class="due' + (n < 0 ? ' late' : n <= 7 ? ' soon' : '') + '">' + (n < 0 ? 'atrasado ' + (-n) + ' dias' : n === 0 ? 'vence hoje' : 'em ' + n + ' dias') + '</span>' : '') +
          '<textarea class="textarea desc" data-field="deliverables" rows="2" aria-label="Entregas" placeholder="' + E('Entregas: ' + (STAGE_HINT[m.stage] || 'o que precisa estar pronto')) + '">' + E(m.deliverables) + '</textarea></article>';
      }).join('') + '</div>' : '<p class="hint" style="margin-top:14px">Nenhum marco ainda. Use “Criar roadmap padrão” para montar protótipo, vertical slice, alpha, beta e lançamento.</p>');
  }

  function buildsHtml(p) {
    var list = p.releases.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return '<form class="adder" data-pl-reladd><input class="input" name="name" placeholder="Versão (ex.: v0.3.0)" aria-label="Versão da build" autocomplete="off"><select class="select" name="kind" aria-label="Tipo">' + opts(REL_KINDS, 'interna') + '</select><button class="btn primary" type="submit">' + I('plus') + 'Build</button></form>' +
      (list.length ? '<ol class="pl-rel">' + list.map(function (r) {
        var fixed = (p.bugs || []).filter(function (b) { return (b.status === 'corrigido' || b.status === 'verificado') && b.fixedIn === r.version; }).length;
        return '<li class="panel pl-rel-i" data-list="releases" data-id="' + E(r.id) + '"><div class="pl-ms-h"><span class="pl-rel-dot" data-kind="' + E(r.kind) + '"></span><input class="input bare ms-title" data-field="version" value="' + E(r.version) + '" aria-label="Versão" autocomplete="off">' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Excluir build">' + I('trash') + '</button></div>' +
          '<div class="rs-item-sel"><input class="input" type="date" data-field="date" value="' + E(r.date) + '" aria-label="Data"><select class="select" data-field="kind" aria-label="Tipo">' + opts(REL_KINDS, r.kind) + '</select><input class="input" data-field="platform" value="' + E(r.platform) + '" placeholder="Plataformas" aria-label="Plataformas" autocomplete="off"></div>' +
          '<textarea class="textarea desc" data-field="notes" rows="2" aria-label="O que mudou" placeholder="O que mudou nesta build (changelog)">' + E(r.notes) + '</textarea>' +
          '<div class="rs-link"><span class="rs-link-ic" aria-hidden="true">' + I('link') + '</span><input class="input bare" data-field="link" value="' + E(r.link) + '" placeholder="Link ou arquivo da build (itch.io, Drive, pasta…)" aria-label="Link" autocomplete="off" spellcheck="false"></div>' +
          (fixed ? '<small class="hint">' + fixed + ' bugs corrigidos nesta versão</small>' : '') + '</li>';
      }).join('') + '</ol>' : '<p class="hint">Nenhuma build registrada. Toda vez que gerar uma build para testar ou publicar, registre aqui; os playtests e bugs usam a versão mais recente.</p>');
  }

  // ---------------------------------------------------------------- eventos
  function cur() { return api.curP(); }
  function itemOf(el, list) { var row = el.closest('[data-list="' + list + '"]'), p = cur(); return row && p ? p[list].filter(function (x) { return x.id === row.dataset.id; })[0] : null; }
  function defaults(p) {
    var have = {}; (p.milestones || []).forEach(function (m) { if (m.stage) have[m.stage] = 1; }); var n = 0;
    STAGES.slice(0, 5).forEach(function (s) { if (!have[s[0]]) { p.milestones.push({ id: uid(), title: s[1], due: '', done: false, stage: s[0], deliverables: STAGE_HINT[s[0]] || '', owner: '' }); n++; } });
    return n;
  }
  function mount(root) {
    if (root.__plBound) return; root.__plBound = true;
    root.addEventListener('submit', function (e) {
      var f = e.target, p = cur(); if (!p) return;
      var n = f.elements && f.elements.name ? f.elements.name.value.trim() : '';
      if (f.matches('[data-pl-scopeadd]')) { e.preventDefault(); if (!n) return f.elements.name.focus(); ui.tierTab = f.elements.tier.value; p.scope.push({ id: uid(), name: n, tier: f.elements.tier.value, decision: 'manter', size: 'M', notes: '', refId: '', createdAt: api.now() }); }
      else if (f.matches('[data-pl-msadd]')) { e.preventDefault(); if (!n) return f.elements.name.focus(); p.milestones.push({ id: uid(), title: n, due: f.elements.due.value || '', done: false, stage: f.elements.stage.value, deliverables: STAGE_HINT[f.elements.stage.value] || '', owner: '' }); }
      else if (f.matches('[data-pl-reladd]')) { e.preventDefault(); if (!n) return f.elements.name.focus(); p.releases.push({ id: uid(), version: n, date: today(), kind: f.elements.kind.value, platform: (p.platforms || []).join(', '), notes: '', link: '', createdAt: api.now() }); }
      else return;
      api.touch(p); api.rerender(); var x = document.querySelector('[data-pl-root] form [name=name]'); if (x) x.focus();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pl-pull],[data-pl-confirm],[data-pl-tier],[data-pl-cut],[data-pl-bring],[data-pl-defaults],[data-pl-jump]'); if (!b) return;
      var p = cur(); if (!p) return; var d = b.dataset;
      if (d.plJump) { e.preventDefault(); var t = document.getElementById('pl-' + d.plJump); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); var ta = t.querySelector('textarea'); if (ta) setTimeout(function () { ta.focus({ preventScroll: true }); }, 350); } return; }
      if (d.plPull) {
        var draft = draftFor(p, d.plPull).trim(), v = str(p.plan[d.plPull]).trim();
        p.plan[d.plPull] = v ? v + '\n\n' + draft : draft; api.touch(p); api.rerender(); api.toast('Copiado do rascunho. Ajuste o texto para o que foi decidido.'); return;
      }
      if (d.plConfirm) {
        var kv = d.plConfirm.split(':'), kind = kv[0], id = kv.slice(1).join(':');
        var src = { mecanica: p.mechanics, ideia: p.ideas, personagem: p.characters, fase: p.levels, efeito: p.effects }[kind] || [];
        var o = src.filter(function (x) { return x.id === id; })[0]; if (!o) return;
        var c = confirm(p, kind, o); if (!c) return;
        var idx = -1;
        if (kind === 'ideia') { idx = p.ideas.indexOf(o); p.ideas.splice(idx, 1); }
        api.touch(p); api.rerender();
        api.toast('“' + first(c.name, 40) + '” confirmado no jogo real.' + (kind === 'ideia' ? ' Saiu da Caixa de ideias.' : ''), 'Desfazer', function () { p.confirmed.splice(p.confirmed.indexOf(c), 1); if (idx >= 0) p.ideas.splice(idx, 0, o); api.touch(p); api.rerender(); });
        return;
      }
      if (d.plTier) { ui.tierTab = d.plTier; var box = document.querySelector('.pl-scope'); if (box) box.dataset.active = d.plTier; document.querySelectorAll('[data-pl-tier]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); var sel = document.querySelector('[data-pl-scopeadd] [name=tier]'); if (sel) sel.value = d.plTier; return; }
      if (b.hasAttribute('data-pl-cut')) { var s = itemOf(b, 'scope'); if (!s) return; s.decision = s.decision === 'cortar' ? 'manter' : 'cortar'; api.touch(p); api.rerender(); return; }
      if (b.hasAttribute('data-pl-bring')) {
        var inScope = {}; p.scope.forEach(function (x) { if (x.refId) inScope[x.refId] = true; }); var n = 0;
        p.confirmed.forEach(function (c) { if (!inScope[c.id]) { p.scope.push({ id: uid(), name: c.name, tier: 'mvp', decision: 'manter', size: 'M', notes: '', refId: c.id, createdAt: api.now() }); n++; } });
        ui.tierTab = 'mvp'; api.touch(p); api.rerender(); api.toast(n + ' itens no MVP.'); return;
      }
      if (b.hasAttribute('data-pl-defaults')) { var k = defaults(p); api.touch(p); api.rerender(); api.toast(k + ' etapas criadas no roadmap.'); }
    });
  }

  window.PranchetaPlano = {
    init: function (a) { api = a; },
    html: html, mount: mount, count: count, summary: summary, normalizeProject: normalizeProject,
    docProgress: docProgress, milestoneProgress: milestoneProgress, confirm: confirm, defaults: defaults,
    DOC: DOC, TIERS: TIERS, STAGES: STAGES, stageLabel: function (k) { return STAGE_BY[k] != null ? STAGES[STAGE_BY[k]][1] : ''; }
  };
})();
