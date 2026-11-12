/* Prancheta — Equipe do jogo (pessoas de verdade): membros, quem faz o quê, carga de trabalho,
   vagas abertas e reuniões. É diferente da "Equipe de IAs" (que são vagas de API), mas uma vaga de IA
   pode entrar na lista como membro. Dados no próprio jogo: p.members, p.openRoles, p.meetings. */
(function () {
  'use strict';
  var api = null;

  var ROLES = [['programador', 'Programador(a)'], ['arte2d', 'Artista 2D'], ['arte3d', 'Artista 3D'], ['design', 'Game designer'], ['som', 'Som e música'], ['roteiro', 'Roteirista'],
    ['qa', 'QA / tester'], ['produtor', 'Produtor(a)'], ['marketing', 'Marketing'], ['ia', 'IA (Equipe de IAs)'], ['outro', 'Outro']];
  var ROLE_BY = {}; ROLES.forEach(function (r) { ROLE_BY[r[0]] = r[1]; });
  var ROLE_STATUS = [['aberta', 'Aberta'], ['conversando', 'Conversando'], ['preenchida', 'Preenchida']];
  var RS_BY = {}; ROLE_STATUS.forEach(function (r) { RS_BY[r[0]] = r[1]; });
  var COLORS = ['#f2b544', '#5fd4c4', '#ad92ff', '#ef5f5f', '#7fd67b', '#6aa8ff', '#ff8fb1', '#c8a26a'];
  var CORE = ['programador', 'arte2d', 'design', 'som', 'qa'];
  var TABS = [['membros', 'Membros', 'time'], ['quem', 'Quem faz o quê', 'checklist'], ['vagas', 'Vagas abertas', 'vaga'], ['reunioes', 'Reuniões', 'reuniao']];

  function E(s) { return api.esc(s); }
  function I(n) { return api.icon(n); }
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function str(v) { return v == null ? '' : String(v); }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + E(o[1]) + '</option>'; }).join(''); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function initials(name) {
    var w = str(name).trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return ((w[0][0] || '') + (w.length > 1 ? w[w.length - 1][0] : (w[0][1] || ''))).toUpperCase();
  }
  function fmtDay(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function objs(a) { return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { if (!x.id) x.id = uid(); return x; }); }

  // ---------------------------------------------------------------- dados
  function normalizeProject(p) {
    p.members = objs(p.members); p.openRoles = objs(p.openRoles); p.meetings = objs(p.meetings);
    p.members.forEach(function (m, i) {
      m.name = str(m.name) || 'Sem nome';
      if (!ROLE_BY[m.role]) m.role = 'outro';
      ['skills', 'contact', 'notes'].forEach(function (k) { m[k] = str(m[k]); });
      var h = parseFloat(m.hours); m.hours = isFinite(h) && h >= 0 ? Math.min(h, 168) : '';
      if (!/^#[0-9a-f]{6}$/i.test(m.color || '')) m.color = COLORS[i % COLORS.length];
      var s = m.aiSlot === '' || m.aiSlot == null ? null : parseInt(m.aiSlot, 10); m.aiSlot = s >= 0 && s <= 2 ? s : null;
    });
    p.openRoles.forEach(function (r) {
      if (!ROLE_BY[r.role]) r.role = 'outro';
      if (!RS_BY[r.status]) r.status = 'aberta';
      r.desc = str(r.desc); var h = parseFloat(r.hours); r.hours = isFinite(h) && h >= 0 ? h : '';
    });
    p.meetings.forEach(function (m) {
      m.date = /^\d{4}-\d{2}-\d{2}$/.test(m.date || '') ? m.date : today();
      m.attendees = (Array.isArray(m.attendees) ? m.attendees : []).map(String);
      m.converted = (Array.isArray(m.converted) ? m.converted : []).map(String);
      ['title', 'notes', 'decisions', 'actions'].forEach(function (k) { m[k] = str(m[k]); });
    });
    return p;
  }
  function makeMember(o) {
    o = o || {};
    var p = o.project, n = p ? p.members.length : 0;
    return { id: uid(), name: str(o.name).trim() || 'Novo membro', role: ROLE_BY[o.role] ? o.role : 'outro', skills: str(o.skills), contact: str(o.contact),
      hours: isFinite(parseFloat(o.hours)) ? parseFloat(o.hours) : '', color: COLORS[n % COLORS.length], aiSlot: o.aiSlot != null ? o.aiSlot : null, notes: '', createdAt: api.now() };
  }
  function findMember(p, ref) {
    ref = str(ref).trim(); if (!ref) return null; var low = ref.toLowerCase();
    return (p.members || []).filter(function (m) { return m.id === ref; })[0] || (p.members || []).filter(function (m) { return m.name.toLowerCase() === low; })[0] ||
      (p.members || []).filter(function (m) { return m.name.toLowerCase().indexOf(low) >= 0; })[0] || null;
  }
  function member(p, id) { return id ? (p.members || []).filter(function (m) { return m.id === id; })[0] || null : null; }
  function memberOptions(p, v, empty) {
    var list = p.members || [], found = !v || list.some(function (m) { return m.id === v; });
    return '<option value="">' + E(empty || 'Sem responsável') + '</option>' + list.map(function (m) { return '<option value="' + E(m.id) + '"' + (m.id === v ? ' selected' : '') + '>' + E(m.name) + (m.aiSlot != null ? ' (IA)' : '') + '</option>'; }).join('') +
      (found ? '' : '<option value="' + E(v) + '" selected>(membro removido)</option>');
  }
  function avatar(m, cls) { return '<span class="tm-av' + (cls ? ' ' + cls : '') + '" style="--mc:' + E(m.color) + '" aria-hidden="true">' + (m.aiSlot != null ? I('ia') : E(initials(m.name))) + '</span>'; }
  function chip(p, id) { var m = member(p, id); return m ? '<span class="tm-chip" title="' + E(m.name) + '">' + avatar(m, 'xs') + '<span>' + E(m.name.split(' ')[0]) + '</span></span>' : ''; }

  // tudo o que está atribuído a alguém (ou sem responsável)
  var RS_DONE = { pronto: 1 }, BUG_DONE = { corrigido: 1, verificado: 1 };
  function allWork(p) {
    var out = [], h = function (sec) { return api.projHash(p, sec); };
    (p.tasks || []).forEach(function (t) { out.push({ kind: 'tasks', id: t.id, type: 'Tarefa', icon: 'tarefa', title: t.title, who: t.assignee || '', done: t.col === 'done', href: h('producao') }); });
    (p.bugs || []).forEach(function (b) { out.push({ kind: 'bugs', id: b.id, type: 'Bug', icon: 'bug', title: b.title, who: b.assignee || '', done: !!BUG_DONE[b.status], href: h('testes') + '/bugs', sev: b.severity }); });
    (p.testCases || []).forEach(function (c) { out.push({ kind: 'testCases', id: c.id, type: 'Caso de teste', icon: 'testes', title: c.title, who: c.assignee || '', done: c.status === 'passou', href: h('testes') + '/casos' }); });
    (p.resources || []).forEach(function (r) { out.push({ kind: 'resources', id: r.id, type: 'Recurso', icon: 'recursos', title: r.name, who: r.assignee || '', done: !!RS_DONE[r.status], href: h('recursos') + '/' + r.kind }); });
    (p.effects || []).forEach(function (e) { out.push({ kind: 'effects', id: e.id, type: 'Efeito', icon: 'efeito', title: e.name, who: e.assignee || '', done: !!RS_DONE[e.status], href: h('recursos') + '/efeitos/' + encodeURIComponent(e.id) }); });
    (p.milestones || []).forEach(function (m) { out.push({ kind: 'milestones', id: m.id, type: 'Marco', icon: 'flag', title: m.title, who: m.owner || '', done: !!m.done, href: h('plano') + '/roadmap', field: 'owner' }); });
    return out;
  }
  function load(p, m) {
    var mine = allWork(p).filter(function (w) { return w.who === m.id; }), open = mine.filter(function (w) { return !w.done; }).length;
    var cap = m.hours ? m.hours / 5 : 0; // ~5 h por item aberto por semana
    var ratio = cap ? open / cap : 0;
    var lvl = !m.hours ? (open ? 'sem-horas' : 'livre') : ratio > 1.5 ? 'sobrecarga' : ratio > 1 ? 'cheia' : ratio >= 0.4 ? 'ok' : 'livre';
    return { open: open, done: mine.length - open, total: mine.length, ratio: ratio, lvl: lvl };
  }
  var LOAD_LABEL = { livre: 'Com folga', ok: 'Carga boa', cheia: 'Carga cheia', sobrecarga: 'Sobrecarregado', 'sem-horas': 'Informe as horas' };
  function summary(p) {
    var hrs = 0; (p.members || []).forEach(function (m) { hrs += +m.hours || 0; });
    var open = (p.openRoles || []).filter(function (r) { return r.status !== 'preenchida'; }).length;
    var unassigned = allWork(p).filter(function (w) { return !w.done && !w.who; }).length;
    return { members: (p.members || []).length, hours: hrs, openRoles: open, unassigned: unassigned, meetings: (p.meetings || []).length };
  }
  function count(p) { return (p.members || []).length; }

  // ---------------------------------------------------------------- telas
  function tabsHtml(p, tab) {
    var s = summary(p), n = { membros: s.members, quem: s.unassigned ? s.unassigned : '', vagas: s.openRoles, reunioes: s.meetings };
    return '<nav class="rs-tabs" aria-label="Partes da equipe">' + TABS.map(function (t) {
      return '<a href="' + api.projHash(p, 'time') + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + I(t[2]) + '<span>' + E(t[1]) + '</span>' + (n[t[0]] ? '<small>' + n[t[0]] + '</small>' : '') + '</a>';
    }).join('') + '</nav>';
  }
  function html(p, tab) {
    tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : 'membros';
    var s = summary(p);
    var head = '<header class="sec-head"><div><div class="eyebrow">Equipe do jogo · pessoas</div><h1>Quem faz o jogo</h1>' +
      '<p>A equipe de verdade: funções, horas por semana, quem cuida de cada tarefa, bug e recurso, vagas abertas e reuniões. As IAs ficam na <a href="' + api.projHash(p, 'equipe') + '">Equipe de IAs</a>.</p></div>' +
      '<div class="summary tm-sum"><span><b>' + s.members + '</b> ' + (s.members === 1 ? 'pessoa' : 'pessoas') + '</span><span><b>' + s.hours + '</b> h/semana</span><span><b>' + s.openRoles + '</b> ' + (s.openRoles === 1 ? 'vaga aberta' : 'vagas abertas') + '</span></div></header>';
    var body = tab === 'quem' ? boardHtml(p) : tab === 'vagas' ? rolesHtml(p) : tab === 'reunioes' ? meetingsHtml(p) : membersHtml(p);
    return '<div class="tm" data-tm-root>' + head + tabsHtml(p, tab) + body + '</div>';
  }

  function aiSlotsHtml(p) {
    var EQ = window.PranchetaEquipe; if (!EQ || !EQ.slots) return '';
    var used = {}; p.members.forEach(function (m) { if (m.aiSlot != null) used[m.aiSlot] = true; });
    var free = EQ.slots().filter(function (s) { return !used[s.i]; });
    if (!free.length) return '';
    return '<div class="rs-chips tm-ai"><span class="hint">Vagas da Equipe de IAs:</span>' + free.map(function (s) { return '<button class="chip" type="button" data-tm-ai="' + s.i + '">' + I('ia') + '+ Vaga ' + (s.i + 1) + ' · ' + E(s.role) + (s.ready ? '' : ' <small>(sem chave)</small>') + '</button>'; }).join('') + '</div>';
  }
  function membersHtml(p) {
    var list = p.members;
    return '<form class="adder tm-add" data-tm-add><input class="input" name="name" placeholder="Nome (ex.: Ana)" aria-label="Nome do novo membro" autocomplete="off">' +
        '<select class="select" name="role" aria-label="Função">' + opts(ROLES.filter(function (r) { return r[0] !== 'ia'; }), 'programador') + '</select>' +
        '<button class="btn primary" type="submit">' + I('plus') + 'Membro</button></form>' + aiSlotsHtml(p) +
      (list.length ? '<div class="rs-items tm-members">' + list.map(function (m) {
        var L = load(p, m);
        return '<div class="rs-item tm-member" data-list="members" data-id="' + E(m.id) + '" style="--mc:' + E(m.color) + '">' +
          '<div class="rs-item-top"><button class="tm-av-btn" type="button" data-tm-color title="Trocar a cor" aria-label="Trocar a cor de ' + E(m.name) + '">' + avatar(m) + '</button>' +
            '<input class="input bare name" data-field="name" value="' + E(m.name) + '" aria-label="Nome" autocomplete="off">' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Remover ' + E(m.name) + '">' + I('trash') + '</button></div>' +
          '<div class="rs-item-sel"><select class="select" data-field="role" aria-label="Função">' + opts(ROLES, m.role) + '</select>' +
            '<label class="tm-hours"><input class="input" type="number" min="0" max="168" step="1" inputmode="numeric" data-field="hours" value="' + E(m.hours) + '" aria-label="Horas por semana" placeholder="0"><span>h/sem</span></label></div>' +
          '<input class="input tm-skills" data-field="skills" value="' + E(m.skills) + '" placeholder="Habilidades (ex.: GDScript, pixel art, Blender)" aria-label="Habilidades" autocomplete="off">' +
          '<input class="input tm-contact" data-field="contact" value="' + E(m.contact) + '" placeholder="Contato (opcional: Discord, e-mail…)" aria-label="Contato" autocomplete="off">' +
          (m.role === 'ia' || m.aiSlot != null ? '<label class="tm-ai-slot"><span class="label">Ligado a</span><select class="select" data-tm-slot aria-label="Vaga da Equipe de IAs"><option value="">Nenhuma vaga</option>' + [0, 1, 2].map(function (i) { return '<option value="' + i + '"' + (m.aiSlot === i ? ' selected' : '') + '>Vaga ' + (i + 1) + ' da Equipe de IAs</option>'; }).join('') + '</select><a class="btn ghost sm" href="' + api.projHash(p, 'equipe') + '">Abrir</a></label>' : '') +
          '<div class="tm-load" data-lvl="' + L.lvl + '"><div class="tm-load-t"><span>' + L.open + (L.open === 1 ? ' item aberto' : ' itens abertos') + (L.done ? ' · ' + L.done + ' feitos' : '') + '</span><b>' + E(LOAD_LABEL[L.lvl]) + '</b></div>' +
            '<div class="progress"><span style="width:' + Math.min(100, Math.round((m.hours ? L.ratio / 1.5 : L.open ? 0.3 : 0) * 100)) + '%"></span></div></div>' +
        '</div>';
      }).join('') + '</div>' : '<div class="ia-empty tm-empty"><span class="empty-ic">' + I('time') + '</span><p>Ninguém na equipe ainda. Comece por você: coloque seu nome e sua função. Depois dá para escolher quem faz cada tarefa, bug e recurso.</p></div>');
  }

  function boardHtml(p) {
    var work = allWork(p).filter(function (w) { return !w.done; });
    var cols = p.members.map(function (m) { return { m: m, items: work.filter(function (w) { return w.who === m.id; }) }; });
    var none = work.filter(function (w) { return !w.who || !member(p, w.who); });
    function row(w, assign) {
      return '<li class="tm-w"><a href="' + w.href + '"><span class="tm-w-ic">' + I(w.icon) + '</span><span class="tm-w-t"><small>' + E(w.type) + (w.sev ? ' · ' + E(w.sev) : '') + '</small><b>' + E(w.title) + '</b></span></a>' +
        (assign ? '<select class="select tm-assign" data-tm-assign="' + E(w.kind) + ':' + E(w.id) + '" aria-label="Responsável por ' + E(w.title) + '">' + memberOptions(p, '', 'Quem faz?') + '</select>' : '') + '</li>';
    }
    if (!p.members.length) return '<p class="hint">Adicione membros na aba <a href="' + api.projHash(p, 'time') + '/membros">Membros</a> para dividir o trabalho.</p>' +
      (none.length ? '<section class="tm-col none"><h3>Sem responsável · ' + none.length + '</h3><ul class="tm-ws">' + none.slice(0, 30).map(function (w) { return row(w, false); }).join('') + '</ul></section>' : '');
    return '<p class="hint tm-hint">Só o que está aberto. Escolha alguém em “Sem responsável” para atribuir; dentro de cada tela também dá para trocar o responsável.</p>' +
      '<div class="tm-board">' +
      (none.length ? '<section class="tm-col none"><h3>' + I('alert') + 'Sem responsável <small>' + none.length + '</small></h3><ul class="tm-ws">' + none.slice(0, 40).map(function (w) { return row(w, true); }).join('') + (none.length > 40 ? '<li class="hint">+' + (none.length - 40) + ' itens</li>' : '') + '</ul></section>' : '') +
      cols.map(function (c) {
        var L = load(p, c.m);
        return '<section class="tm-col" style="--mc:' + E(c.m.color) + '"><h3>' + avatar(c.m, 'sm') + '<span class="tm-col-n"><b>' + E(c.m.name) + '</b><small>' + E(ROLE_BY[c.m.role]) + (c.m.hours ? ' · ' + c.m.hours + ' h/sem' : '') + '</small></span><span class="tm-badge" data-lvl="' + L.lvl + '">' + c.items.length + '</span></h3>' +
          (c.items.length ? '<ul class="tm-ws">' + c.items.map(function (w) { return row(w, false); }).join('') + '</ul>' : '<p class="hint">Nada aberto com ' + E(c.m.name.split(' ')[0]) + '.</p>') + '</section>';
      }).join('') + '</div>';
  }

  function rolesHtml(p) {
    var have = {}; p.members.forEach(function (m) { have[m.role] = true; }); p.openRoles.forEach(function (r) { have[r.role] = true; });
    var sugg = CORE.filter(function (k) { return !have[k]; });
    return '<form class="adder" data-tm-roleadd><select class="select" name="role" aria-label="Função da vaga">' + opts(ROLES.filter(function (r) { return r[0] !== 'ia'; }), 'arte2d') + '</select><input class="input" name="desc" placeholder="O que essa pessoa vai fazer?" aria-label="Descrição da vaga" autocomplete="off"><button class="btn primary" type="submit">' + I('plus') + 'Vaga</button></form>' +
      (sugg.length ? '<div class="rs-chips rs-sugg"><span class="hint">Ninguém cobre:</span>' + sugg.map(function (k) { return '<button class="chip" type="button" data-tm-sugg="' + k + '">+ ' + E(ROLE_BY[k]) + '</button>'; }).join('') + '</div>' : '') +
      (p.openRoles.length ? '<div class="rs-items">' + p.openRoles.map(function (r) {
        return '<div class="rs-item" data-list="openRoles" data-id="' + E(r.id) + '"><div class="rs-item-top"><span class="tm-role-ic">' + I('vaga') + '</span><select class="select tm-role-sel" data-field="role" aria-label="Função">' + opts(ROLES, r.role) + '</select>' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Excluir vaga">' + I('trash') + '</button></div>' +
          '<div class="rs-item-sel"><select class="select status" data-field="status" data-v="' + E(r.status) + '" aria-label="Estado da vaga">' + opts(ROLE_STATUS, r.status) + '</select>' +
          '<label class="tm-hours"><input class="input" type="number" min="0" max="168" inputmode="numeric" data-field="hours" value="' + E(r.hours) + '" aria-label="Horas por semana" placeholder="0"><span>h/sem</span></label></div>' +
          '<textarea class="textarea desc" data-field="desc" rows="1" placeholder="Responsabilidades, requisitos, se é voluntário ou pago…" aria-label="Descrição">' + E(r.desc) + '</textarea>' +
          (r.status !== 'preenchida' ? '<button class="btn sm tm-fill" type="button" data-tm-fill>' + I('plus') + 'Preencher com um membro novo</button>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="hint">Nenhuma vaga aberta. Liste aqui as funções que faltam para montar a equipe.</p>');
  }

  function meetingsHtml(p) {
    var list = p.meetings.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return '<div class="tm-mt-new"><button class="btn primary" type="button" data-tm-meet>' + I('plus') + 'Nova reunião</button><span class="hint">Data, quem foi, decisões e ações. As ações viram tarefas com um toque.</span></div>' +
      (list.length ? '<div class="tm-meetings">' + list.map(function (m) {
        var lines = m.actions.split('\n').map(function (x) { return x.replace(/^[-•*\s]+/, '').trim(); }).filter(Boolean);
        var fresh = lines.filter(function (x) { return m.converted.indexOf(x) < 0; });
        return '<article class="panel tm-meet" data-list="meetings" data-id="' + E(m.id) + '">' +
          '<div class="tm-meet-h"><input class="input" type="date" data-field="date" value="' + E(m.date) + '" aria-label="Data da reunião">' +
            '<input class="input bare tm-meet-t" data-field="title" value="' + E(m.title) + '" placeholder="Assunto (ex.: planejamento da semana)" aria-label="Assunto" autocomplete="off">' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Excluir reunião">' + I('trash') + '</button></div>' +
          (p.members.length ? '<div class="tm-att" role="group" aria-label="Quem participou">' + p.members.map(function (x) { var on = m.attendees.indexOf(x.id) >= 0; return '<button type="button" class="tm-att-b" data-tm-att="' + E(x.id) + '" aria-pressed="' + on + '">' + avatar(x, 'xs') + E(x.name.split(' ')[0]) + '</button>'; }).join('') + '</div>' : '<p class="hint">Adicione membros para marcar quem participou.</p>') +
          '<label class="field"><span class="label">Notas</span><textarea class="textarea" data-field="notes" rows="2" placeholder="O que foi conversado">' + E(m.notes) + '</textarea></label>' +
          '<label class="field"><span class="label">Decisões</span><textarea class="textarea" data-field="decisions" rows="2" placeholder="O que ficou decidido">' + E(m.decisions) + '</textarea></label>' +
          '<label class="field"><span class="label">Ações (uma por linha)</span><textarea class="textarea" data-field="actions" rows="2" placeholder="- Ana: animação do pulo&#10;- Rafa: corrigir o bug da câmera">' + E(m.actions) + '</textarea></label>' +
          '<div class="tm-meet-f"><span class="hint">' + (m.converted.length ? m.converted.length + ' ações já viraram tarefa.' : 'Nenhuma ação virou tarefa ainda.') + '</span>' +
            '<button class="btn sm" type="button" data-tm-actions' + (fresh.length ? '' : ' disabled') + '>' + I('tarefa') + 'Criar ' + (fresh.length || '') + ' ' + (fresh.length === 1 ? 'tarefa' : 'tarefas') + '</button></div>' +
        '</article>';
      }).join('') + '</div>' : '<p class="hint" style="margin-top:14px">Nenhuma reunião registrada.</p>');
  }

  // ---------------------------------------------------------------- eventos
  function cur() { return api.curP(); }
  function itemOf(el, list) { var row = el.closest('[data-list="' + list + '"]'), p = cur(); return row && p ? p[list].filter(function (x) { return x.id === row.dataset.id; })[0] : null; }
  function actionsToTasks(p, m) {
    var lines = m.actions.split('\n').map(function (x) { return x.replace(/^[-•*\s]+/, '').trim(); }).filter(Boolean);
    var made = 0;
    lines.forEach(function (x) {
      if (m.converted.indexOf(x) >= 0) return;
      // "Ana: fazer X" -> responsável Ana, se existir
      var who = null, title = x, mm = x.match(/^([^:]{1,30}):\s*(.+)$/);
      if (mm) { who = findMember(p, mm[1]); if (who) title = mm[2]; }
      p.tasks.push({ id: uid(), title: title.slice(0, 200), notes: 'Da reunião de ' + fmtDay(m.date) + (m.title ? ' (' + m.title + ')' : '') + '.', col: 'todo', milestoneId: '', assignee: who ? who.id : '', createdAt: api.now() });
      m.converted.push(x); made++;
    });
    return made;
  }
  function mount(root) {
    if (root.__tmBound) return; root.__tmBound = true;
    root.addEventListener('submit', function (e) {
      var f = e.target, p = cur(); if (!p) return;
      if (f.matches('[data-tm-add]')) {
        e.preventDefault(); var n = f.elements.name.value.trim(); if (!n) { f.elements.name.focus(); return; }
        p.members.push(makeMember({ project: p, name: n, role: f.elements.role.value })); api.touch(p); api.rerender();
        var x = document.querySelector('[data-tm-add] [name=name]'); if (x) x.focus();
      } else if (f.matches('[data-tm-roleadd]')) {
        e.preventDefault();
        p.openRoles.push({ id: uid(), role: f.elements.role.value, desc: f.elements.desc.value.trim(), hours: '', status: 'aberta', createdAt: api.now() }); api.touch(p); api.rerender();
      }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tm-color],[data-tm-ai],[data-tm-sugg],[data-tm-fill],[data-tm-meet],[data-tm-att],[data-tm-actions]'); if (!b) return;
      var p = cur(); if (!p) return;
      if (b.hasAttribute('data-tm-color')) { var m = itemOf(b, 'members'); if (!m) return; m.color = COLORS[(COLORS.indexOf(m.color) + 1) % COLORS.length]; api.touch(p); api.rerender(); return; }
      if (b.dataset.tmAi != null) {
        var s = window.PranchetaEquipe.slots()[+b.dataset.tmAi]; if (!s) return;
        p.members.push(makeMember({ project: p, name: s.role + ' (IA)', role: 'ia', skills: s.desc, aiSlot: s.i })); api.touch(p); api.rerender(); api.toast('Vaga ' + (s.i + 1) + ' da Equipe de IAs entrou na equipe.'); return;
      }
      if (b.dataset.tmSugg) { p.openRoles.push({ id: uid(), role: b.dataset.tmSugg, desc: '', hours: '', status: 'aberta', createdAt: api.now() }); api.touch(p); api.rerender(); return; }
      if (b.hasAttribute('data-tm-fill')) {
        var r = itemOf(b, 'openRoles'); if (!r) return;
        api.openDialog('<div class="dlg"><h2 id="dialogTitle">Quem entrou como ' + E(ROLE_BY[r.role]) + '?</h2><div class="field"><label class="label" for="tmFill">Nome</label><input class="input" id="tmFill" name="name" autocomplete="off" autofocus></div>' +
          '<div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn primary" data-dlg="ok">Adicionar</button></div></div>').then(function (res) {
          if (!res || !res.ok || !String(res.name || '').trim()) return;
          var mm = makeMember({ project: p, name: res.name, role: r.role, hours: r.hours }); p.members.push(mm); r.status = 'preenchida'; api.touch(p); api.rerender(); api.toast(mm.name + ' entrou na equipe.');
        });
        return;
      }
      if (b.hasAttribute('data-tm-meet')) { p.meetings.push({ id: uid(), date: today(), title: '', attendees: p.members.filter(function (m) { return m.aiSlot == null; }).map(function (m) { return m.id; }), notes: '', decisions: '', actions: '', converted: [], createdAt: api.now() }); api.touch(p); api.rerender(); return; }
      if (b.dataset.tmAtt) {
        var mt = itemOf(b, 'meetings'); if (!mt) return; var k = mt.attendees.indexOf(b.dataset.tmAtt);
        if (k >= 0) mt.attendees.splice(k, 1); else mt.attendees.push(b.dataset.tmAtt);
        b.setAttribute('aria-pressed', String(k < 0)); api.touch(p); return;
      }
      if (b.hasAttribute('data-tm-actions')) {
        var mt2 = itemOf(b, 'meetings'); if (!mt2) return;
        var n = actionsToTasks(p, mt2); api.touch(p); api.rerender();
        if (n) api.toast(n + (n === 1 ? ' tarefa criada' : ' tarefas criadas') + ' em “A fazer”.', 'Ver', function () { api.go(api.projHash(p, 'producao')); });
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-tm-slot')) { var mm = itemOf(e.target, 'members'), pp = cur(); if (!mm || !pp) return; mm.aiSlot = e.target.value === '' ? null : +e.target.value; api.touch(pp); api.rerender(); return; }
      var s = e.target.closest('[data-tm-assign]'); if (!s || !s.value) return;
      var p = cur(); if (!p) return; var kv = s.dataset.tmAssign.split(':'), list = p[kv[0]] || [], it = list.filter(function (x) { return x.id === kv[1]; })[0];
      if (!it) return; it[kv[0] === 'milestones' ? 'owner' : 'assignee'] = s.value; api.touch(p);
      var m = member(p, s.value); api.toast('“' + str(it.title || it.name).slice(0, 40) + '” agora é com ' + (m ? m.name : '?') + '.'); api.rerender();
    });
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.field === 'actions' && t.closest('[data-list=meetings]')) {
        var mt = itemOf(t, 'meetings'), btn = t.closest('.tm-meet').querySelector('[data-tm-actions]');
        if (mt && btn) { var n = t.value.split('\n').map(function (x) { return x.replace(/^[-•*\s]+/, '').trim(); }).filter(function (x) { return x && mt.converted.indexOf(x) < 0; }).length;
          btn.disabled = !n; btn.lastChild.textContent = 'Criar ' + (n || '') + ' ' + (n === 1 ? 'tarefa' : 'tarefas'); }
        return;
      } if (t.dataset.field !== 'name' || !t.closest('[data-list=members]')) return;
      var av = t.closest('.tm-member').querySelector('.tm-av'); var m = itemOf(t, 'members'); if (av && m && m.aiSlot == null) av.textContent = initials(t.value);
    });
  }

  window.PranchetaTime = {
    init: function (a) { api = a; },
    html: html, mount: mount, count: count, summary: summary, normalizeProject: normalizeProject,
    makeMember: makeMember, findMember: findMember, member: member, memberOptions: memberOptions, avatar: avatar, chip: chip,
    allWork: allWork, load: load, actionsToTasks: actionsToTasks, ROLES: ROLES, roleLabel: function (k) { return ROLE_BY[k] || k; }, initials: initials
  };
})();
