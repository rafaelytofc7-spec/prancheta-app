/* Prancheta — Planejamento de jogos. App local e offline. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- constantes
  var KEY = 'prancheta.v1';
  var PHASES = ['Conceito', 'Pré-produção', 'Produção', 'Polimento', 'Lançamento'];
  var ENGINES = ['Godot', 'Python', 'Outro'];
  var PLATFORMS = ['Windows', 'Linux', 'Web (HTML)', 'Android', 'macOS', 'Console'];
  var MECH_STATUS = [['ideia', 'Ideia'], ['definir', 'A definir'], ['andamento', 'Em andamento'], ['pronto', 'Pronto']];
  var ART_STATUS = [['faltando', 'Faltando'], ['provisorio', 'Provisório'], ['pronto', 'Pronto']];
  var ASSET_TYPES = [['personagem', 'Personagem'], ['inimigo', 'Inimigo'], ['cenario', 'Cenário'], ['veiculo', 'Veículo'], ['item', 'Item / arma'], ['ui', 'UI'], ['sfx', 'SFX'], ['musica', 'Música'], ['outro', 'Outro']];
  var COLS = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Feito']];
  var COLORS = ['#ef5f5f', '#f2b544', '#9bd35a', '#4cc9b4', '#6aa8ff', '#a98bff', '#ff7ab6', '#d6d3c9'];

  var ICONS = {
    geral: '<path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/>',
    design: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    mecanicas: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    personagens: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.6 5.2"/>',
    mundo: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    arte: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    tecnica: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
    producao: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    ideias: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    back: '<path d="M15 6l-6 6 6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    mais: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    jogo: '<path d="M7 8.5h10a4.5 4.5 0 0 1 4.5 4.5v.6a3 3 0 0 1-5.3 1.9L14.7 14H9.3l-1.5 1.5a3 3 0 0 1-5.3-1.9V13A4.5 4.5 0 0 1 7 8.5Z"/><path d="M8 11.2v3M6.5 12.7h3M15.6 12.2h.01M17.8 13.6h.01"/>',
    tarefa: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    ia: '<path d="M12 3.5l1.6 4.2 4.2 1.6-4.2 1.6L12 15.1l-1.6-4.2-4.2-1.6 4.2-1.6z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5.5 15.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5L3.4 17.6l1.5-.6z"/>',
    config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/><path d="M11.5 13.5 20 4"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }

  // rótulos curtos para a barra de baixo do celular
  var SHORT = { geral: 'Geral', design: 'Design', mecanicas: 'Mecânicas', personagens: 'Personagens', mundo: 'Mundo', arte: 'Arte', tecnica: 'Técnica', producao: 'Produção', ideias: 'Ideias', ia: 'IA' };
  var BNAV = ['geral', 'producao', 'ia', 'ideias'];
  function phaseKey(ph) { return ['conceito', 'pre', 'producao', 'polimento', 'lancamento'][PHASES.indexOf(ph)] || 'conceito'; }
  function phaseBadge(ph) { return '<span class="badge phase-badge" data-phase="' + phaseKey(ph) + '"><span class="dot"></span>' + esc(ph) + '</span>'; }
  function isNarrow() { return !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches); }

  var SECTIONS = [
    ['geral', 'Visão geral'], ['design', 'Caderno de design'], ['mecanicas', 'Mecânicas'],
    ['personagens', 'Personagens e criaturas'], ['mundo', 'Mundo e níveis'], ['arte', 'Arte e áudio'],
    ['tecnica', 'Técnica'], ['producao', 'Produção'], ['ideias', 'Caixa de ideias'], ['ia', 'Assistente IA']
  ];

  // ---------------------------------------------------------------- utilidades
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function labelOf(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }
  function options(list, v) {
    return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  }
  function fmtRelative(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return 'há ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400) return 'há ' + Math.floor(diff / 3600) + ' h';
    if (diff < 86400 * 7) { var n = Math.floor(diff / 86400); return 'há ' + n + (n === 1 ? ' dia' : ' dias'); }
    return 'em ' + fmtDate(iso);
  }
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var p = dateStr.split('-'); if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]); var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }
  function dueLabel(dateStr) {
    var n = daysUntil(dateStr); if (n === null) return '';
    if (n < 0) return 'atrasado ' + (-n) + (n === -1 ? ' dia' : ' dias');
    if (n === 0) return 'vence hoje';
    if (n === 1) return 'vence amanhã';
    return 'em ' + n + ' dias';
  }
  function initials(s) { s = (s || '?').trim(); return (s[0] || '?').toUpperCase(); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  // ---------------------------------------------------------------- dados de exemplo
  function sampleProjects() {
    var t = now();
    function task(title, col, notes) { return { id: uid(), title: title, notes: notes || '', col: col || 'todo', milestoneId: '', createdAt: t }; }
    function mech(name, desc, status) { return { id: uid(), name: name, desc: desc || '', status: status || 'ideia' }; }
    function asset(name, type, status) { return { id: uid(), name: name, type: type, status: status || 'faltando' }; }

    var zz = blankProject('Zona Zero');
    zz.id = 'exemplo-zona-zero'; zz.sample = true; zz.color = '#9bd35a';
    zz.logline = 'Remake em Godot de um jogo de sobrevivência indie que hoje existe em HTML.';
    zz.genre = 'Sobrevivência'; zz.engine = 'Godot'; zz.engineVersion = '4.7.2';
    zz.phase = 'Pré-produção';
    zz.references = 'Project Zomboid (inspiração principal).';
    zz.notes = 'Fase sugerida pela Prancheta: ajuste se não for essa.';
    zz.gdd.premise = 'Remake do jogo HTML existente, agora em Godot.';
    zz.gdd.tone = 'Visual de indie profissional.';
    zz.gdd.references = 'Project Zomboid.';
    zz.gdd.notes = 'A versão HTML original deve continuar existindo. Não é para apagar.';
    zz.mechanics = [mech('Sobrevivência', 'Base do jogo, inspirada em Project Zomboid. Detalhar.', 'definir')];
    zz.art.direction = 'Visual de indie profissional.';
    zz.art.style = 'Texturas e modelos 3D gratuitos de terceiros.';
    zz.art.references = 'Project Zomboid.';
    zz.assets = [asset('Texturas 3D gratuitas de terceiros', 'cenario'), asset('Modelos 3D gratuitos de terceiros', 'outro')];
    zz.tech.constraints = 'Desempenho melhor que a versão HTML.\nManter a versão HTML original intacta (não apagar).';
    zz.tasks = [
      task('Levantar o que existe na versão HTML para o remake'),
      task('Escolher texturas e modelos 3D gratuitos de terceiros', 'todo', 'Conferir a licença de cada asset.'),
      task('Definir o visual de indie profissional'),
      task('Medir e melhorar o desempenho no Godot'),
      task('Guardar a versão HTML original (não apagar)')
    ];

    var zv = blankProject('Zona Vermelha');
    zv.id = 'exemplo-zona-vermelha'; zv.sample = true; zv.color = '#ef5f5f';
    zv.version = 'v0.9'; zv.engine = 'Godot'; zv.engineVersion = '4.7.2'; zv.phase = 'Produção';
    zv.notes = 'Motor e fase sugeridos pela Prancheta: confirme.';
    zv.gdd.notes = 'Pedidos para a próxima versão: arte própria no estilo do jogo, veículos gratuitos, otimização fora da tela, personagem começa sem arma, armas redesenhadas e três criaturas novas.';
    zv.mechanics = [
      mech('Começar sem arma', 'O personagem começa a partida desarmado.', 'definir'),
      mech('Veículos', 'Usar veículos gratuitos.', 'ideia'),
      mech('Sangramento', 'Efeito causado pelo Mastim Necrótico.', 'definir'),
      mech('Poças de bile', 'O Inchado Bilioso deixa poças de bile no chão.', 'definir'),
      mech('Armas redesenhadas', 'Refazer o design das armas.', 'definir')
    ];
    zv.characters = [
      { id: uid(), name: 'Mastim Necrótico', role: 'Criatura inimiga', abilities: 'Pula e causa sangramento.', artStatus: 'faltando' },
      { id: uid(), name: 'Inchado Bilioso', role: 'Criatura inimiga', abilities: 'Cospe bile à distância e deixa poças.', artStatus: 'faltando' },
      { id: uid(), name: 'Javali Couraçado', role: 'Criatura inimiga', abilities: 'Adaptado de scripts 2D existentes.', artStatus: 'faltando' }
    ];
    zv.art.direction = 'Arte própria no estilo do jogo, não gerada por código.';
    zv.assets = [
      asset('Mastim Necrótico', 'inimigo'), asset('Inchado Bilioso', 'inimigo'), asset('Javali Couraçado', 'inimigo'),
      asset('Poça de bile', 'cenario'), asset('Veículos gratuitos', 'veiculo'), asset('Armas (novo design)', 'item')
    ];
    zv.tech.constraints = 'Não carregar o que está fora da tela.';
    zv.tasks = [
      task('Fazer arte própria no estilo do jogo (não gerada por código)'),
      task('Adicionar veículos gratuitos', 'todo', 'Conferir a licença.'),
      task('Otimizar: não carregar o que está fora da tela'),
      task('Personagem começa sem arma'),
      task('Refazer o design das armas'),
      task('Criar o Mastim Necrótico (pulo + sangramento)'),
      task('Criar o Inchado Bilioso (cuspe de bile à distância + poças)'),
      task('Adaptar o Javali Couraçado a partir dos scripts 2D')
    ];

    var nc = blankProject('NACRE');
    nc.id = 'exemplo-nacre'; nc.sample = true; nc.color = '#4cc9b4';
    nc.engine = 'Python'; nc.engineVersion = ''; nc.phase = 'Produção';
    nc.notes = 'Fase sugerida pela Prancheta: ajuste. Preencha pitch, design e tarefas.';
    nc.tech.constraints = 'Jogo feito em Python.';

    [zz, zv, nc].forEach(function (p) { p.createdAt = t; p.updatedAt = t; });
    return [zz, zv, nc];
  }

  function blankProject(title) {
    var t = now();
    return {
      id: uid(), title: title || 'Novo jogo', logline: '', genre: '', version: '', platforms: [], engine: 'Godot', engineOther: '', engineVersion: '4.7.2',
      references: '', audience: '', phase: 'Conceito', color: COLORS[1], archived: false, sample: false, notes: '',
      gdd: { premise: '', loop: '', tone: '', world: '', references: '', notes: '' },
      mechanics: [], characters: [], levels: [],
      art: { direction: '', style: '', references: '', audio: '' }, assets: [],
      tech: { exports: '', constraints: '', risks: '', notes: '' },
      tasks: [], milestones: [], ideas: [],
      createdAt: t, updatedAt: t
    };
  }

  function normalize(p) {
    p = p && typeof p === 'object' ? p : {};
    var b = blankProject(p.title);
    var out = {};
    Object.keys(b).forEach(function (k) { out[k] = p[k] !== undefined && p[k] !== null ? p[k] : b[k]; });
    ['gdd', 'art', 'tech'].forEach(function (k) {
      out[k] = Object.assign({}, b[k], (p[k] && typeof p[k] === 'object') ? p[k] : {});
    });
    ['mechanics', 'characters', 'levels', 'assets', 'tasks', 'milestones', 'ideas', 'platforms'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    ['mechanics', 'characters', 'levels', 'assets', 'tasks', 'milestones', 'ideas'].forEach(function (k) {
      out[k] = out[k].filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { if (!x.id) x.id = uid(); return x; });
    });
    out.tasks.forEach(function (t) { if (['todo', 'doing', 'done'].indexOf(t.col) < 0) t.col = 'todo'; if (!t.title) t.title = 'Tarefa sem nome'; });
    if (PHASES.indexOf(out.phase) < 0) out.phase = 'Conceito';
    if (ENGINES.indexOf(out.engine) < 0) { out.engineOther = String(out.engine || ''); out.engine = 'Outro'; }
    if (!/^#[0-9a-f]{6}$/i.test(out.color)) out.color = COLORS[1];
    if (!out.id) out.id = uid();
    out.title = String(out.title || 'Sem título');
    out.archived = !!out.archived;
    return out;
  }

  // ---------------------------------------------------------------- estado
  var state = { version: 1, projects: [] };
  var storageOk = true;
  var ui = { search: '', phase: '', showArchived: false, mechFilter: '', assetFilter: '', kanbanCol: 'todo' };
  var pendingToasts = [];

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; }
    if (raw) {
      try {
        var data = JSON.parse(raw);
        state = { version: 1, projects: (data.projects || []).map(normalize) };
        return;
      } catch (e) {
        try { localStorage.setItem(KEY + '.corrompido.' + Date.now(), raw); } catch (e2) { /* sem espaço */ }
        pendingToasts.push('Os dados salvos estavam ilegíveis. Uma cópia foi guardada e os exemplos foram carregados.');
      }
    }
    state = { version: 1, projects: sampleProjects() };
    persist();
  }

  var saveTimer = null;
  function save() {
    var el = $('#saveState');
    if (el) { el.textContent = 'Salvando…'; el.className = 'save-state saving'; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }
  function persist() {
    clearTimeout(saveTimer); saveTimer = null;
    var el = $('#saveState');
    try {
      localStorage.setItem(KEY, JSON.stringify({ app: 'Prancheta', version: 1, savedAt: now(), projects: state.projects }));
      storageOk = true;
      if (el) { el.textContent = 'Salvo neste navegador'; el.className = 'save-state'; }
      $('#storageBanner').hidden = true;
    } catch (e) {
      storageOk = false;
      if (el) { el.textContent = 'Não foi possível salvar'; el.className = 'save-state error'; }
      var b = $('#storageBanner');
      b.textContent = 'Atenção: este navegador não está deixando a Prancheta salvar (armazenamento bloqueado ou cheio). Exporte um backup em "Dados e backup" para não perder nada.';
      b.hidden = false;
    }
  }
  window.addEventListener('beforeunload', function () { if (saveTimer) persist(); });

  function getProject(id) { for (var i = 0; i < state.projects.length; i++) if (state.projects[i].id === id) return state.projects[i]; return null; }
  function touch(p) { p.updatedAt = now(); save(); }
  function stats(p) {
    var total = p.tasks.length, done = 0, doing = 0;
    p.tasks.forEach(function (t) { if (t.col === 'done') done++; else if (t.col === 'doing') doing++; });
    return { total: total, done: done, doing: doing, todo: total - done - doing, pct: total ? Math.round(done / total * 100) : 0 };
  }
  function engineLabel(p) {
    var e = p.engine === 'Outro' ? (p.engineOther || 'Outro motor') : p.engine;
    return e + (p.engineVersion ? ' ' + p.engineVersion : '');
  }

  // ---------------------------------------------------------------- rotas
  var current = { project: null, section: null };
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    closeMenus();
    if (parts[0] === 'jogo' && parts[1]) {
      var p = getProject(parts[1]);
      if (!p) { location.hash = '#/'; return; }
      var sec = parts[2] || 'geral';
      if (!SECTIONS.some(function (s) { return s[0] === sec; })) sec = 'geral';
      renderProject(p, sec);
    } else if (parts[0] === 'ia' && window.PranchetaIA) {
      renderAssistantHome();
    } else {
      renderHome();
    }
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function projHash(p, sec) { return '#/jogo/' + encodeURIComponent(p.id) + (sec ? '/' + sec : ''); }

  // ---------------------------------------------------------------- assistente (tela geral, fora de um jogo)
  function renderAssistantHome() {
    current = { project: null, section: 'ia' };
    document.body.dataset.view = 'ia';
    document.body.dataset.sec = 'ia';
    document.documentElement.style.removeProperty('--pc');
    document.title = 'Assistente IA · Prancheta';
    $('#crumbs').innerHTML = '<a href="#/">Todos os jogos</a><span class="sep">/</span><span class="cur">Assistente IA</span>';
    $('#main').innerHTML = '<div class="ia-page"><section class="content ia-content" id="content">' + window.PranchetaIA.html(null) + '</section></div>';
    window.PranchetaIA.mount($('#content'), null);
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- início
  function renderHome() {
    current = { project: null, section: null };
    document.body.dataset.view = 'home';
    document.body.dataset.sec = '';
    document.documentElement.style.removeProperty('--pc');
    document.title = 'Prancheta · Planejamento de jogos';
    $('#crumbs').innerHTML = '<span class="cur">Todos os jogos</span>';
    var archived = state.projects.filter(function (p) { return p.archived; }).length;
    var active = state.projects.filter(function (p) { return !p.archived; });
    var open = 0, ideasN = 0;
    active.forEach(function (p) { var s = stats(p); open += s.total - s.done; ideasN += p.ideas.length; });
    $('#main').innerHTML =
      '<div class="home">' +
        '<section class="hero">' +
          '<div><h1>Seus jogos, <em>antes</em> do código.</h1>' +
          '<p>Ideia, design, arte, técnica e produção de cada projeto num lugar só. Tudo fica salvo automaticamente neste navegador.</p></div>' +
          '<button class="btn primary hero-new" data-action="new-project">' + icon('plus') + 'Novo jogo</button>' +
        '</section>' +
        (state.projects.length ? '<div class="home-stats" aria-label="Resumo">' +
          '<div class="stat"><b>' + active.length + '</b><span>' + (active.length === 1 ? 'jogo ativo' : 'jogos ativos') + '</span></div>' +
          '<div class="stat"><b>' + open + '</b><span>' + (open === 1 ? 'tarefa aberta' : 'tarefas abertas') + '</span></div>' +
          '<div class="stat"><b>' + ideasN + '</b><span>' + (ideasN === 1 ? 'ideia na caixa' : 'ideias na caixa') + '</span></div>' +
        '</div>' : '') +
        '<div class="toolbar">' +
          '<div class="search">' + icon('search') +
            '<input class="input" id="search" type="search" placeholder="Buscar por nome, gênero ou motor   ( / )" aria-label="Buscar jogos" value="' + esc(ui.search) + '"></div>' +
          '<div class="chips" role="group" aria-label="Filtrar por fase">' +
            '<button class="chip" data-phase="" aria-pressed="' + (ui.phase === '') + '">Todas as fases</button>' +
            PHASES.map(function (ph) { return '<button class="chip" data-phase="' + esc(ph) + '" aria-pressed="' + (ui.phase === ph) + '">' + esc(ph) + '</button>'; }).join('') +
          '</div>' +
          (archived ? '<label class="toggle"><input type="checkbox" id="showArchived"' + (ui.showArchived ? ' checked' : '') + '> Mostrar arquivados (' + archived + ')</label>' : '') +
        '</div>' +
        (window.PranchetaIA ? '<a class="ia-banner" href="#/ia"><span class="ia-banner-ic">' + icon('ia') + '</span><span class="ia-banner-t"><b>Assistente IA</b><small>Peça ideias, revise o GDD e crie tarefas conversando.</small></span>' + icon('right') + '</a>' : '') +
        '<div id="homeGrid"></div>' +
      '</div>';
    renderGrid();
  }

  function renderGrid() {
    var q = ui.search.trim().toLowerCase();
    var list = state.projects.filter(function (p) {
      if (p.archived && !ui.showArchived) return false;
      if (ui.phase && p.phase !== ui.phase) return false;
      if (q) {
        var hay = [p.title, p.genre, p.logline, engineLabel(p), p.phase, p.version].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return (a.archived - b.archived) || (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0); });

    var g = $('#homeGrid');
    if (!state.projects.length) {
      g.innerHTML = '<div class="empty-state"><span class="empty-ic">' + icon('jogo') + '</span><h3>Nenhum jogo ainda</h3><p>Comece um projeto do zero ou restaure os exemplos no menu “Dados e backup”.</p>' +
        '<button class="btn primary" data-action="new-project">' + icon('plus') + 'Criar meu primeiro jogo</button></div>';
      return;
    }
    if (!list.length) {
      g.innerHTML = '<div class="empty-state"><span class="empty-ic">' + icon('search') + '</span><h3>Nada encontrado</h3><p>Nenhum jogo corresponde à busca ou ao filtro.</p><button class="btn" data-action="clear-filters">Limpar filtros</button></div>';
      return;
    }
    g.innerHTML = '<div class="grid">' + list.map(cardHtml).join('') +
      '<button class="card new" data-action="new-project"><span class="plus">' + icon('plus') + '</span><strong>Novo jogo</strong><span class="hint">Começar um projeto do zero</span></button></div>';
  }

  function cardHtml(p) {
    var s = stats(p);
    return '<article class="card' + (p.archived ? ' archived' : '') + '" style="--c:' + esc(p.color) + '">' +
      '<a class="card-open" href="' + projHash(p) + '" aria-label="Abrir ' + esc(p.title) + '"></a>' +
      '<div class="card-cover"><span class="cover-mark" aria-hidden="true">' + esc(initials(p.title)) + '</span>' +
        '<div class="card-head"><h2>' + esc(p.title) + (p.version ? ' <span class="ver">' + esc(p.version) + '</span>' : '') + '</h2>' +
        '<div class="card-menu menu-wrap"><button class="icon-btn" data-action="card-menu" aria-haspopup="true" aria-expanded="false" aria-label="Ações de ' + esc(p.title) + '">' + icon('dots') + '</button>' +
          '<div class="menu" role="menu" hidden>' +
            '<button role="menuitem" data-action="open" data-id="' + esc(p.id) + '">Abrir</button>' +
            '<button role="menuitem" data-action="rename" data-id="' + esc(p.id) + '">Renomear…</button>' +
            '<button role="menuitem" data-action="archive" data-id="' + esc(p.id) + '">' + (p.archived ? 'Desarquivar' : 'Arquivar') + '</button>' +
            '<hr><button role="menuitem" class="danger" data-action="delete" data-id="' + esc(p.id) + '">Excluir…</button>' +
          '</div></div>' +
        '</div>' +
        '<div class="meta">' + phaseBadge(p.phase) +
          '<span class="tag">' + esc(engineLabel(p)) + '</span>' +
          (p.genre ? '<span class="tag">' + esc(p.genre) + '</span>' : '') +
          (p.archived ? '<span class="tag">Arquivado</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<p class="logline' + (p.logline ? '' : ' empty') + '">' + esc(p.logline || 'Sem pitch ainda. Abra o jogo e escreva a ideia em uma frase.') + '</p>' +
        '<div class="card-stats">' +
          '<span><b>' + p.mechanics.length + '</b>' + (p.mechanics.length === 1 ? 'mecânica' : 'mecânicas') + '</span>' +
          '<span><b>' + p.characters.length + '</b>' + (p.characters.length === 1 ? 'personagem' : 'personagens') + '</span>' +
          '<span><b>' + p.ideas.length + '</b>' + (p.ideas.length === 1 ? 'ideia' : 'ideias') + '</span>' +
        '</div>' +
        '<div class="card-foot">' +
          '<div class="prog-row"><span>Progresso</span><span><b>' + s.pct + '%</b> · ' + s.done + '/' + s.total + ' tarefas</span></div>' +
          '<div class="progress" role="progressbar" aria-label="Progresso de ' + esc(p.title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.pct + '"><span style="width:' + s.pct + '%"></span></div>' +
          '<div class="prog-row"><span>Editado ' + esc(fmtRelative(p.updatedAt)) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // ---------------------------------------------------------------- projeto
  function renderProject(p, sec) {
    var changed = current.project !== p.id || current.section !== sec;
    current = { project: p.id, section: sec };
    document.body.dataset.view = 'project';
    document.body.dataset.sec = sec;
    document.documentElement.style.setProperty('--pc', p.color);
    var secName = labelOf(SECTIONS, sec);
    document.title = p.title + ' · ' + secName + ' · Prancheta';
    $('#crumbs').innerHTML = '<a href="#/">Todos os jogos</a><span class="sep">/</span><a href="' + projHash(p) + '" id="crumbTitle">' + esc(p.title) + '</a><span class="sep">/</span><span class="cur">' + esc(secName) + '</span>';
    $('#main').innerHTML = '<div class="proj"><aside class="side" aria-label="Seções do jogo">' + sideHtml(p, sec) + '</aside>' +
      '<section class="content' + (sec === 'ia' ? ' ia-content' : '') + '" id="content">' + sectionHtml(p, sec) + '</section></div>';
    if (sec === 'ia' && window.PranchetaIA) window.PranchetaIA.mount($('#content'), p);
    autosizeAll($('#main'));
    if (changed) window.scrollTo(0, 0);
    centerNav();
  }

  // na barra de seções do celular (rolagem horizontal), deixa a seção atual visível
  function centerNav() {
    var nav = $('.nav'), cur = nav && $('[aria-current=page]', nav);
    if (!cur || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2);
  }

  function counts(p) {
    var s = stats(p);
    return { geral: '', design: '', mecanicas: p.mechanics.length, personagens: p.characters.length, mundo: p.levels.length,
      arte: p.assets.length, tecnica: '', producao: s.total - s.done, ideias: p.ideas.length };
  }

  function sideHtml(p, sec) {
    var s = stats(p), c = counts(p);
    var inBar = BNAV.indexOf(sec) >= 0;
    return '<div class="side-head">' +
        '<a class="back" href="#/" aria-label="Todos os jogos">' + icon('back') + '<span>Todos os jogos</span></a>' +
        '<div class="side-title"><div class="ring" style="--p:' + s.pct + '" title="' + s.pct + '% das tarefas feitas"><span>' + s.pct + '%</span></div>' +
        '<div class="side-name"><h2 id="sideTitle">' + esc(p.title) + '</h2><small>' + phaseBadge(p.phase) + '<span class="eng">' + esc(engineLabel(p)) + '</span></small></div></div>' +
      '</div>' +
      '<nav class="nav" aria-label="Seções">' + SECTIONS.map(function (x) {
        var n = c[x[0]];
        return '<a href="' + projHash(p, x[0]) + '"' + (x[0] === sec ? ' aria-current="page"' : '') + '>' + icon(x[0]) + '<span>' + esc(x[1]) + '</span>' +
          (n ? '<span class="count" title="' + (x[0] === 'producao' ? 'tarefas abertas' : 'itens') + '">' + n + '</span>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<nav class="bnav" aria-label="Seções do jogo">' + BNAV.map(function (k) {
        var n = k === 'producao' || k === 'ideias' ? c[k] : 0;
        return '<a href="' + projHash(p, k) + '"' + (k === sec ? ' aria-current="page"' : '') + '><span class="bn-ic">' + icon(k) + (n ? '<span class="bn-count">' + n + '</span>' : '') + '</span><span class="bn-l">' + esc(SHORT[k]) + '</span></a>';
      }).join('') +
        '<button type="button" data-action="more-sections" aria-haspopup="dialog"' + (inBar ? '' : ' aria-current="page"') + '><span class="bn-ic">' + icon(inBar ? 'mais' : sec) + '</span><span class="bn-l">' + esc(inBar ? 'Mais' : SHORT[sec]) + '</span></button>' +
      '</nav>' +
      '<div class="side-foot">Tudo é salvo automaticamente.<br>Faça backup em “Dados e backup”.</div>';
  }

  function moreSections(p) {
    var c = counts(p);
    openDialog('<div class="dlg sheet"><h2 id="dialogTitle">Seções do jogo</h2><div class="sheet-grid">' + SECTIONS.map(function (x) {
      var n = c[x[0]];
      return '<button class="sheet-tile" data-dlg="sec:' + x[0] + '"' + (x[0] === current.section ? ' aria-current="page"' : '') + '>' + icon(x[0]) + '<span>' + esc(x[1]) + '</span>' + (n ? '<small>' + n + '</small>' : '') + '</button>';
    }).join('') + '</div><div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Fechar</button></div></div>')
      .then(function (r) { if (r && r.action && r.action.indexOf('sec:') === 0) go(projHash(p, r.action.slice(4))); });
  }

  // botão flutuante (+) do celular
  function quickAdd() {
    var p = curP();
    if (!p) { newProject(); return; }
    openDialog('<div class="dlg sheet"><h2 id="dialogTitle">Adicionar em “' + esc(p.title) + '”</h2><div class="sheet-list">' +
      '<button class="sheet-item" data-dlg="task">' + icon('tarefa') + '<span><b>Nova tarefa</b><small>Entra em “A fazer”, na Produção</small></span></button>' +
      '<button class="sheet-item" data-dlg="idea">' + icon('ideias') + '<span><b>Nova ideia</b><small>Vai para a Caixa de ideias</small></span></button>' +
      '<button class="sheet-item" data-dlg="game">' + icon('jogo') + '<span><b>Novo jogo</b><small>Começar outro projeto do zero</small></span></button>' +
      '</div><div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button></div></div>')
      .then(function (r) {
        if (!r || !r.action) return;
        if (r.action === 'game') { newProject(); return; }
        var isTask = r.action === 'task';
        promptDialog(isTask ? 'Nova tarefa' : 'Nova ideia', isTask ? 'Tarefa' : 'Ideia', '', isTask ? 'Adicionar tarefa' : 'Guardar ideia').then(function (v) {
          if (!v) return;
          addItem(p, isTask ? 'tasks' : 'ideas', v, null);
          var sec = isTask ? 'producao' : 'ideias';
          if (isTask) ui.kanbanCol = 'todo';
          if (current.section === sec) { rerender(); toast(isTask ? 'Tarefa adicionada.' : 'Ideia guardada.'); }
          else { refreshSide(); toast(isTask ? 'Tarefa adicionada em “A fazer”.' : 'Ideia guardada.', 'Ver', function () { go(projHash(p, sec)); }); }
        });
      });
  }

  function refreshSide() {
    var p = curP(); if (!p) return;
    var side = $('.side'); if (!side) return;
    var scroll = side.scrollTop, nav = $('.nav', side), navX = nav ? nav.scrollLeft : 0;
    side.innerHTML = sideHtml(p, current.section);
    side.scrollTop = scroll;
    nav = $('.nav', side); if (nav) nav.scrollLeft = navX;
    var ct = $('#crumbTitle'); if (ct) ct.textContent = p.title;
  }

  function curP() { return current.project ? getProject(current.project) : null; }
  function getPath(o, path) { var v = path.split('.').reduce(function (a, k) { return a == null ? '' : a[k]; }, o); return v == null ? '' : v; }
  function setPath(o, path, v) { var ks = path.split('.'); var last = ks.pop(); var t = ks.reduce(function (a, k) { return a[k]; }, o); t[last] = v; }

  function head(eyebrow, title, desc, extra) {
    return '<header class="sec-head"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h1>' + esc(title) + '</h1>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div>' + (extra || '') + '</header>';
  }
  function ta(p, bind, label, hint, placeholder, rows) {
    var id = 'f-' + bind.replace(/\W/g, '-');
    return '<div class="field"><label class="label" for="' + id + '">' + esc(label) + '</label>' +
      (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') +
      '<textarea class="textarea" id="' + id + '" data-bind="' + bind + '" rows="' + (rows || 3) + '" placeholder="' + esc(placeholder || '') + '">' + esc(getPath(p, bind)) + '</textarea></div>';
  }
  function inp(p, bind, label, placeholder) {
    var id = 'f-' + bind.replace(/\W/g, '-');
    return '<div class="field"><label class="label" for="' + id + '">' + esc(label) + '</label>' +
      '<input class="input" id="' + id + '" data-bind="' + bind + '" placeholder="' + esc(placeholder || '') + '" value="' + esc(getPath(p, bind)) + '" autocomplete="off"></div>';
  }
  function engineControls(p, idp) {
    return '<div class="seg" role="group" aria-label="Motor">' + ENGINES.map(function (e) { return '<button data-action="set-engine" data-v="' + e + '" aria-pressed="' + (p.engine === e) + '">' + e + '</button>'; }).join('') + '</div>' +
      (p.engine === 'Outro' ? '<input class="input" style="max-width:180px" data-bind="engineOther" aria-label="Qual motor" placeholder="Qual motor?" value="' + esc(p.engineOther) + '" autocomplete="off">' : '') +
      '<input class="input" style="max-width:150px" data-bind="engineVersion" aria-label="Versão do motor" placeholder="Versão (ex.: 4.7.2)" value="' + esc(p.engineVersion) + '" autocomplete="off">';
  }

  function sectionHtml(p, sec) {
    switch (sec) {
      case 'design': return secDesign(p);
      case 'mecanicas': return secMechanics(p);
      case 'personagens': return secCharacters(p);
      case 'mundo': return secWorld(p);
      case 'arte': return secArt(p);
      case 'tecnica': return secTech(p);
      case 'producao': return secProduction(p);
      case 'ideias': return secIdeas(p);
      case 'ia': return window.PranchetaIA ? window.PranchetaIA.html(p) : emptyMsg('O assistente não carregou. Recarregue a página.', 'ia');
      default: return secOverview(p);
    }
  }

  // Visão geral
  function secOverview(p) {
    var s = stats(p);
    var pi = PHASES.indexOf(p.phase);
    var next = p.milestones.filter(function (m) { return !m.done; }).sort(function (a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; })[0];
    var assetsReady = p.assets.filter(function (a) { return a.status === 'pronto'; }).length;
    var mechReady = p.mechanics.filter(function (m) { return m.status === 'pronto'; }).length;
    return '<div class="overview-top">' +
        '<div class="stack" style="gap:6px">' +
          '<div class="eyebrow">Visão geral</div>' +
          '<input class="input bare title-input" data-bind="title" value="' + esc(p.title) + '" aria-label="Título do jogo" placeholder="Nome do jogo" autocomplete="off">' +
          '<input class="input bare logline-input" data-bind="logline" value="' + esc(p.logline) + '" aria-label="Pitch em uma frase" placeholder="O jogo em uma frase: quem você é, o que faz e por que é divertido." autocomplete="off">' +
          (p.notes ? '<p class="hint" style="margin-top:4px">' + esc(p.notes) + ' <button class="btn ghost sm" data-action="clear-note">Ok, ocultar aviso</button></p>' : '') +
        '</div>' +
        '<div class="panel prog-card"><div class="label">Progresso das tarefas</div>' +
          '<div class="big" style="margin-top:8px">' + s.pct + '%<small>' + s.done + ' de ' + s.total + '</small></div>' +
          '<div class="progress" style="margin-top:12px;--c:var(--pc)" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.pct + '"><span style="width:' + s.pct + '%"></span></div>' +
          '<div class="kv"><span>A fazer</span><b>' + s.todo + '</b><span>Em andamento</span><b>' + s.doing + '</b><span>Mecânicas prontas</span><b>' + mechReady + '/' + p.mechanics.length + '</b><span>Assets prontos</span><b>' + assetsReady + '/' + p.assets.length + '</b>' +
          '<span>Próximo marco</span><b style="font-family:var(--font);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (next ? esc(next.title) : '') + '">' + (next ? esc(next.title) : '—') + '</b></div>' +
          '<a class="btn sm" style="margin-top:14px" href="' + projHash(p, 'producao') + '">Abrir produção ' + icon('right') + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="stack">' +
        '<div class="panel"><div class="label" style="margin-bottom:10px">Fase de produção</div><div class="phases" role="group" aria-label="Fase de produção">' +
          PHASES.map(function (ph, i) { return '<button class="phase-btn' + (i < pi ? ' past' : '') + '" data-action="set-phase" data-v="' + esc(ph) + '" aria-pressed="' + (i === pi) + '"><small>0' + (i + 1) + '</small>' + esc(ph) + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="panel"><div class="cols-3">' +
          inp(p, 'genre', 'Gênero', 'Ex.: sobrevivência, plataforma, roguelike') +
          inp(p, 'version', 'Versão atual', 'Ex.: v0.9') +
          inp(p, 'audience', 'Público', 'Para quem é este jogo?') +
          '<div class="field span-2"><span class="label">Motor</span><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + engineControls(p) + '</div></div>' +
          '<div class="field"><span class="label" id="lbl-color">Cor do projeto</span><div class="swatches" role="group" aria-labelledby="lbl-color">' +
            COLORS.map(function (c, i) { return '<button class="swatch" style="--sw:' + c + '" data-action="set-color" data-v="' + c + '" aria-pressed="' + (p.color === c) + '" aria-label="Cor ' + (i + 1) + '"></button>'; }).join('') +
          '</div></div>' +
          '<div class="field span-2"><span class="label" id="lbl-plat">Plataformas</span><div class="plat" role="group" aria-labelledby="lbl-plat">' +
            PLATFORMS.map(function (x) { return '<button class="chip" data-action="toggle-platform" data-v="' + esc(x) + '" aria-pressed="' + (p.platforms.indexOf(x) >= 0) + '">' + esc(x) + '</button>'; }).join('') +
          '</div></div>' +
        '</div></div>' +
        '<div class="panel">' + ta(p, 'references', 'Referências', 'Jogos, filmes, livros ou imagens que inspiram o projeto.', 'Ex.: Project Zomboid pela tensão da sobrevivência…', 3) + '</div>' +
        '<div class="panel danger-zone"><h3>Gerenciar projeto</h3><p class="hint" style="margin-bottom:12px">Arquivar esconde o jogo da lista sem apagar nada. Excluir apaga o jogo deste navegador (exporte um backup antes, se quiser guardar).</p>' +
          '<div class="row-actions"><button class="btn" data-action="rename" data-id="' + esc(p.id) + '">' + icon('edit') + 'Renomear</button>' +
          '<button class="btn" data-action="archive" data-id="' + esc(p.id) + '">' + icon('archive') + (p.archived ? 'Desarquivar' : 'Arquivar') + '</button>' +
          '<button class="btn danger" data-action="delete" data-id="' + esc(p.id) + '">' + icon('trash') + 'Excluir jogo</button></div></div>' +
      '</div>';
  }

  function secDesign(p) {
    return head('Caderno de design', 'GDD', 'O documento vivo do jogo. Escreva curto e direto; dá para mudar quando quiser.') +
      '<div class="cols-2">' +
        '<div class="panel">' + ta(p, 'gdd.premise', 'Premissa e fantasia do jogador', 'Quem o jogador é e o que ele sente jogando.', 'Você é… e precisa…', 6) + '</div>' +
        '<div class="panel">' + ta(p, 'gdd.loop', 'Loop de jogabilidade', 'O ciclo que se repete, minuto a minuto e sessão a sessão.', 'Explorar → coletar → construir → sobreviver → …', 6) + '</div>' +
        '<div class="panel">' + ta(p, 'gdd.tone', 'Tom e direção', 'Clima, ritmo e o que o jogo NÃO é.', 'Sombrio, tenso, silencioso…', 5) + '</div>' +
        '<div class="panel">' + ta(p, 'gdd.world', 'Mundo', 'Onde e quando se passa, regras do mundo.', 'Onde o jogo acontece?', 5) + '</div>' +
        '<div class="panel">' + ta(p, 'gdd.references', 'Referências de design', 'O que aproveitar de cada referência.', 'De X: … / De Y: …', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'gdd.notes', 'Notas livres', '', 'Qualquer coisa que ainda não tem lugar.', 4) + '</div>' +
      '</div>';
  }

  function chipsFilter(name, list, cur, items, key) {
    return '<div class="chips" role="group" aria-label="Filtrar por estado">' +
      '<button class="chip" data-action="filter" data-f="' + name + '" data-v="" aria-pressed="' + (!cur) + '">Todos (' + items.length + ')</button>' +
      list.map(function (o) {
        var n = items.filter(function (x) { return x[key] === o[0]; }).length;
        return '<button class="chip" data-action="filter" data-f="' + name + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + esc(o[1]) + ' (' + n + ')</button>';
      }).join('') + '</div>';
  }
  function adder(kind, placeholder, btn) {
    return '<form class="adder" data-add="' + kind + '"><input class="input" name="name" placeholder="' + esc(placeholder) + '" aria-label="' + esc(placeholder) + '" autocomplete="off"><button class="btn primary" type="submit">' + icon('plus') + esc(btn) + '</button></form>';
  }
  function emptyMsg(t, ic) { return '<div class="empty-state compact">' + (ic ? '<span class="empty-ic">' + icon(ic) + '</span>' : '') + '<p>' + esc(t) + '</p></div>'; }

  function secMechanics(p) {
    var items = p.mechanics.filter(function (m) { return !ui.mechFilter || m.status === ui.mechFilter; });
    return head('Mecânicas', 'O que o jogo tem (e vai ter)', 'Cada sistema do jogo, do rascunho até pronto.') +
      adder('mechanics', 'Nome da nova mecânica (ex.: fome e sede)', 'Adicionar') +
      '<div class="filters">' + chipsFilter('mechFilter', MECH_STATUS, ui.mechFilter, p.mechanics, 'status') + '</div>' +
      '<div class="list">' + (items.length ? items.map(function (m) {
        return '<div class="item" data-list="mechanics" data-id="' + esc(m.id) + '">' +
          '<input class="input bare name" data-field="name" value="' + esc(m.name) + '" aria-label="Nome da mecânica" placeholder="Nome" autocomplete="off">' +
          '<div class="item-side"><select class="select status" data-field="status" data-v="' + esc(m.status) + '" aria-label="Estado">' + options(MECH_STATUS, m.status) + '</select>' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Excluir mecânica ' + esc(m.name) + '">' + icon('trash') + '</button></div>' +
          '<textarea class="textarea desc" data-field="desc" rows="1" aria-label="Descrição" placeholder="Descrição curta: como funciona e por que existe.">' + esc(m.desc) + '</textarea>' +
        '</div>';
      }).join('') : emptyMsg(p.mechanics.length ? 'Nenhuma mecânica neste estado.' : 'Nenhuma mecânica ainda. Adicione a primeira acima ou promova uma ideia da caixa de ideias.', 'mecanicas')) + '</div>';
  }

  function secCharacters(p) {
    return head('Personagens e criaturas', 'Quem vive no jogo', 'Fichas curtas: papel, comportamento e o estado da arte de cada um.') +
      adder('characters', 'Nome do personagem ou criatura', 'Adicionar') +
      (p.characters.length ? '<div class="chars">' + p.characters.map(function (c) {
        return '<div class="char" data-list="characters" data-id="' + esc(c.id) + '">' +
          '<div class="char-top"><div class="avatar" aria-hidden="true">' + esc(initials(c.name)) + '</div>' +
            '<input class="input bare" data-field="name" value="' + esc(c.name) + '" aria-label="Nome" placeholder="Nome" autocomplete="off">' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Excluir ' + esc(c.name) + '">' + icon('trash') + '</button></div>' +
          '<label class="field"><span class="label">Papel</span><input class="input" data-field="role" value="' + esc(c.role) + '" placeholder="Protagonista, inimigo, chefe, NPC…" autocomplete="off"></label>' +
          '<label class="field"><span class="label">Habilidades e comportamento</span><textarea class="textarea" data-field="abilities" rows="2" placeholder="O que faz, como ataca, como reage…">' + esc(c.abilities) + '</textarea></label>' +
          '<div class="char-foot"><span class="label">Estado da arte</span><select class="select status" data-field="artStatus" data-v="' + esc(c.artStatus) + '" aria-label="Estado da arte">' + options(ART_STATUS, c.artStatus) + '</select></div>' +
        '</div>';
      }).join('') + '</div>' : emptyMsg('Nenhum personagem ainda. Adicione o protagonista, inimigos e criaturas.', 'personagens'));
  }

  function secWorld(p) {
    return head('Mundo e níveis', 'Mapas, áreas e fases', 'Cada lugar do jogo e o que ele faz pela jogabilidade.') +
      adder('levels', 'Nome do mapa, área ou nível', 'Adicionar') +
      '<div class="list">' + (p.levels.length ? p.levels.map(function (l) {
        return '<div class="item" data-list="levels" data-id="' + esc(l.id) + '">' +
          '<input class="input bare name" data-field="name" value="' + esc(l.name) + '" aria-label="Nome" placeholder="Nome" autocomplete="off">' +
          '<div class="item-side"><select class="select status" data-field="status" data-v="' + esc(l.status) + '" aria-label="Estado">' + options(MECH_STATUS, l.status) + '</select>' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Excluir ' + esc(l.name) + '">' + icon('trash') + '</button></div>' +
          '<textarea class="textarea desc" data-field="purpose" rows="1" aria-label="Função na jogabilidade" placeholder="Função na jogabilidade: o que o jogador aprende, enfrenta ou encontra aqui.">' + esc(l.purpose) + '</textarea>' +
        '</div>';
      }).join('') : emptyMsg('Nenhum mapa ou nível ainda.', 'mundo')) + '</div>';
  }

  function secArt(p) {
    var items = p.assets.filter(function (a) { return !ui.assetFilter || a.status === ui.assetFilter; });
    var byS = { faltando: 0, provisorio: 0, pronto: 0 }; p.assets.forEach(function (a) { byS[a.status] = (byS[a.status] || 0) + 1; });
    var dotC = { faltando: 'var(--red)', provisorio: 'var(--orange)', pronto: 'var(--green)' };
    return head('Arte e áudio', 'Como o jogo parece e soa', 'Direção visual e sonora, mais a lista do que falta produzir ou conseguir.') +
      '<div class="cols-2" style="margin-bottom:28px">' +
        '<div class="panel">' + ta(p, 'art.direction', 'Direção de arte', '', 'A sensação visual que o jogo deve passar.', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'art.style', 'Estilo', '', 'Pixel art, low poly, 3D, paleta, câmera…', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'art.references', 'Referências visuais', '', 'Jogos, artistas, links de imagens…', 3) + '</div>' +
        '<div class="panel">' + ta(p, 'art.audio', 'Áudio e música', '', 'Clima sonoro, trilha, efeitos importantes…', 3) + '</div>' +
      '</div>' +
      '<div class="sec-head" style="margin-bottom:14px"><div><h2 style="font:700 22px var(--display);margin:0;letter-spacing:-.02em">Lista de assets</h2><div class="summary" style="margin-top:6px">' +
        ART_STATUS.map(function (s) { return '<span><span class="dot" style="background:' + dotC[s[0]] + '"></span>' + byS[s[0]] + ' ' + esc(s[1].toLowerCase()) + '</span>'; }).join('') +
      '</div></div></div>' +
      adder('assets', 'Nome do asset (ex.: sprite do protagonista, trilha do menu)', 'Adicionar') +
      '<div class="filters">' + chipsFilter('assetFilter', ART_STATUS, ui.assetFilter, p.assets, 'status') + '</div>' +
      (items.length ? '<div class="panel" style="padding:8px 10px"><table class="table"><thead><tr><th>Asset</th><th style="width:180px">Tipo</th><th style="width:160px">Estado</th><th style="width:44px"><span class="label" style="position:absolute;left:-9999px">Ações</span></th></tr></thead><tbody>' +
        items.map(function (a) {
          return '<tr data-list="assets" data-id="' + esc(a.id) + '">' +
            '<td><input class="input bare" data-field="name" value="' + esc(a.name) + '" aria-label="Nome do asset" autocomplete="off"></td>' +
            '<td><select class="select" data-field="type" aria-label="Tipo">' + options(ASSET_TYPES, a.type) + '</select></td>' +
            '<td><select class="select status" data-field="status" data-v="' + esc(a.status) + '" aria-label="Estado">' + options(ART_STATUS, a.status) + '</select></td>' +
            '<td><button class="icon-btn del" data-action="del-item" aria-label="Excluir asset ' + esc(a.name) + '">' + icon('trash') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' : emptyMsg(p.assets.length ? 'Nenhum asset neste estado.' : 'Nenhum asset listado ainda.', 'arte'));
  }

  function secTech(p) {
    return head('Técnica', 'Como o jogo é construído', 'Motor, exportações, limites e riscos técnicos.') +
      '<div class="panel" style="margin-bottom:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:space-between">' +
        '<div><div class="label">Motor</div><div style="font:700 22px var(--display);margin-top:4px">' + esc(engineLabel(p)) + '</div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + engineControls(p) + '</div>' +
      '</div>' +
      '<div class="cols-2">' +
        '<div class="panel">' + ta(p, 'tech.exports', 'Exportações', 'Para onde o jogo vai ser exportado e como.', 'Windows (.exe), Linux, Web…', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'tech.constraints', 'Restrições e metas de desempenho', 'Limites que o projeto precisa respeitar.', 'Ex.: meta de FPS, memória, tamanho do jogo…', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'tech.risks', 'Riscos', 'O que pode travar o projeto e o plano B.', 'Ex.: licença de assets de terceiros…', 4) + '</div>' +
        '<div class="panel">' + ta(p, 'tech.notes', 'Notas técnicas', 'Estrutura de pastas, plugins, scripts importantes.', '', 4) + '</div>' +
      '</div>';
  }

  function secProduction(p) {
    var s = stats(p);
    var ms = p.milestones.slice().sort(function (a, b) { return ((a.done ? 1 : 0) - (b.done ? 1 : 0)) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0); });
    return head('Produção', 'Tarefas e marcos', 'Arraste os cartões entre colunas ou use as setas. Toque ou clique numa tarefa para editar.',
        '<div class="summary"><span><b style="color:var(--text)">' + s.pct + '%</b> concluído</span><span>' + s.done + '/' + s.total + ' tarefas</span></div>') +
      '<div class="sec-head" style="margin-bottom:12px;align-items:center"><h2 style="font:700 20px var(--display);margin:0;display:flex;gap:8px;align-items:center">' + icon('flag') + 'Marcos</h2>' +
        '<form class="adder" data-add="milestones" style="margin:0;flex:1;max-width:560px"><input class="input" name="name" placeholder="Novo marco (ex.: demo jogável)" aria-label="Novo marco" autocomplete="off"><input class="input" type="date" name="due" aria-label="Prazo do marco (opcional)" style="max-width:165px"><button class="btn" type="submit">' + icon('plus') + 'Marco</button></form></div>' +
      (ms.length ? '<div class="milestones">' + ms.map(function (m) {
        var n = daysUntil(m.due), linked = p.tasks.filter(function (t) { return t.milestoneId === m.id; }), ld = linked.filter(function (t) { return t.col === 'done'; }).length;
        return '<div class="ms' + (m.done ? ' done' : '') + '" data-list="milestones" data-id="' + esc(m.id) + '">' +
          '<div class="ms-row"><input type="checkbox" class="check" data-field="done"' + (m.done ? ' checked' : '') + ' aria-label="Marco concluído: ' + esc(m.title) + '">' +
          '<input class="input bare ms-title" data-field="title" value="' + esc(m.title) + '" aria-label="Nome do marco" autocomplete="off">' +
          '<button class="icon-btn del" data-action="del-item" aria-label="Excluir marco ' + esc(m.title) + '">' + icon('trash') + '</button></div>' +
          '<div class="ms-row"><input class="input" type="date" data-field="due" value="' + esc(m.due || '') + '" aria-label="Prazo">' +
          '<span class="due' + (!m.done && n !== null ? (n < 0 ? ' late' : n <= 7 ? ' soon' : '') : '') + '">' + (m.due ? esc(dueLabel(m.due)) : 'sem prazo') + '</span></div>' +
          (linked.length ? '<div class="progress" style="--c:var(--pc)"><span style="width:' + Math.round(ld / linked.length * 100) + '%"></span></div><span class="due">' + ld + '/' + linked.length + ' tarefas ligadas feitas</span>' : '<span class="due">Ligue tarefas a este marco pelo editor da tarefa.</span>') +
        '</div>';
      }).join('') + '</div>' : '<p class="hint ms-empty">Nenhum marco ainda. Marcos são metas maiores, como “protótipo jogável” ou “demo”, com prazo opcional.</p>') +
      '<div class="board-tabs" role="group" aria-label="Coluna do quadro">' + COLS.map(function (c) {
        var n = p.tasks.filter(function (t) { return t.col === c[0]; }).length;
        return '<button type="button" data-action="kanban-tab" data-v="' + c[0] + '" data-col-tab="' + c[0] + '" aria-pressed="' + (ui.kanbanCol === c[0]) + '"><span class="dot"></span>' + esc(c[1]) + '<span class="count">' + n + '</span></button>';
      }).join('') + '</div>' +
      '<div class="board" data-active="' + esc(ui.kanbanCol) + '">' + COLS.map(function (c) {
        var tasks = p.tasks.filter(function (t) { return t.col === c[0]; });
        return '<section class="col" data-col="' + c[0] + '" aria-label="' + esc(c[1]) + '">' +
          '<div class="col-head"><span class="dot"></span>' + esc(c[1]) + '<span class="count">' + tasks.length + '</span></div>' +
          (tasks.length ? '' : '<p class="col-empty">' + (c[0] === 'done' ? 'Nada concluído ainda.' : c[0] === 'doing' ? 'Nada em andamento.' : 'Sem tarefas aqui.') + '</p>') +
          tasks.map(function (t) { return taskHtml(p, t); }).join('') +
          '<form class="col-add" data-add="tasks" data-col="' + c[0] + '"><input class="input" name="name" placeholder="+ Adicionar tarefa" aria-label="Nova tarefa em ' + esc(c[1]) + '" autocomplete="off"></form>' +
        '</section>';
      }).join('') + '</div>';
  }

  function taskHtml(p, t) {
    var m = t.milestoneId ? p.milestones.filter(function (x) { return x.id === t.milestoneId; })[0] : null;
    var ci = COLS.map(function (c) { return c[0]; }).indexOf(t.col);
    return '<article class="task' + (t.col === 'done' ? ' done' : '') + '" draggable="true" data-task="' + esc(t.id) + '">' +
      '<input type="checkbox" class="check" data-action="toggle-task" ' + (t.col === 'done' ? 'checked ' : '') + 'aria-label="Concluir: ' + esc(t.title) + '">' +
      '<div class="task-body" data-action="edit-task" role="button" tabindex="0" aria-label="Editar tarefa: ' + esc(t.title) + '"><div class="task-title">' + esc(t.title) + '</div>' +
        ((m || t.notes) ? '<div class="task-meta">' + (m ? '<span class="tag">' + icon('flag') + esc(m.title) + '</span>' : '') + (t.notes ? '<span class="tag">com notas</span>' : '') + '</div>' : '') +
      '</div>' +
      '<div class="task-move">' +
        (ci > 0 ? '<button class="icon-btn mv" data-action="move-task" data-dir="-1" aria-label="Mover para ' + esc(COLS[ci - 1][1]) + '">' + icon('left') + '<span class="mv-l" aria-hidden="true">' + esc(COLS[ci - 1][1]) + '</span></button>' : '') +
        (ci < 2 ? '<button class="icon-btn mv fwd" data-action="move-task" data-dir="1" aria-label="Mover para ' + esc(COLS[ci + 1][1]) + '"><span class="mv-l" aria-hidden="true">' + esc(COLS[ci + 1][1]) + '</span>' + icon('right') + '</button>' : '') +
      '</div></article>';
  }

  function secIdeas(p) {
    var ideas = p.ideas.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; });
    return head('Caixa de ideias', 'Anote antes que fuja', 'Capture ideias soltas sem pensar onde encaixam. Depois promova a tarefa ou a mecânica.') +
      '<form class="capture" data-add="ideas"><label for="ideaInput" class="label" style="display:block;margin-bottom:8px">Nova ideia</label>' +
        '<textarea class="textarea" id="ideaInput" name="name" placeholder="E se…" rows="3"></textarea>' +
        '<div class="capture-foot"><span class="hint"><kbd>Enter</kbd> guarda · <kbd>Shift</kbd>+<kbd>Enter</kbd> quebra a linha</span><button class="btn primary" type="submit">' + icon('plus') + 'Guardar ideia</button></div></form>' +
      (ideas.length ? '<div class="ideas">' + ideas.map(function (i) {
        return '<div class="idea" data-list="ideas" data-id="' + esc(i.id) + '">' +
          '<textarea class="textarea" data-field="text" rows="1" aria-label="Texto da ideia">' + esc(i.text) + '</textarea>' +
          '<div class="idea-foot"><span class="when">' + esc(fmtRelative(i.createdAt)) + '</span>' +
            '<button class="btn sm" data-action="promote" data-to="task">Virar tarefa</button>' +
            '<button class="btn sm" data-action="promote" data-to="mechanic">Virar mecânica</button>' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Excluir ideia">' + icon('trash') + '</button></div>' +
        '</div>';
      }).join('') + '</div>' : '<div style="margin-top:22px">' + emptyMsg('A caixa está vazia. Qualquer ideia vale, até as estranhas.', 'ideias') + '</div>');
  }

  // ---------------------------------------------------------------- textarea automática
  function autosize(t) { if (!t.offsetParent && t.id !== 'tkN') return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function autosizeAll(root) { $$('textarea', root).forEach(autosize); }

  // ---------------------------------------------------------------- diálogos
  var dlg = $('#dialog');
  var dlgReturnFocus = null;
  function openDialog(html, onOpen) {
    return new Promise(function (resolve) {
      dlgReturnFocus = document.activeElement;
      dlg.innerHTML = html;
      var done = false;
      function collect() { var o = { ok: true }; $$('[name]', dlg).forEach(function (f) { o[f.name] = f.value; }); return o; }
      function finish(v) {
        if (done) return; done = true;
        if (dlg.open) dlg.close();
        resolve(v);
        if (dlgReturnFocus && document.contains(dlgReturnFocus)) try { dlgReturnFocus.focus(); } catch (e) { /* ok */ }
      }
      dlg.onclick = function (e) {
        if (e.target === dlg) return finish(null);
        var b = e.target.closest('[data-dlg]');
        if (!b) return;
        e.preventDefault();
        if (b.dataset.dlg === 'ok') finish(collect());
        else if (b.dataset.dlg === 'cancel') finish(null);
        else finish({ action: b.dataset.dlg });
      };
      dlg.onkeydown = function (e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); finish(collect()); }
      };
      dlg.oncancel = function (e) { e.preventDefault(); finish(null); };
      dlg.showModal();
      if (onOpen) onOpen(dlg);
      var f = $('[autofocus]', dlg) || $('.btn.primary,.btn.danger-solid', dlg);
      if (f) { f.focus(); if (f.select && f.tagName === 'INPUT') f.select(); }
    });
  }
  function confirmDialog(title, msg, okText, danger) {
    return openDialog('<div class="dlg"><h2 id="dialogTitle">' + esc(title) + '</h2><p>' + esc(msg) + '</p>' +
      '<div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn ' + (danger ? 'danger-solid' : 'primary') + '" data-dlg="ok">' + esc(okText || 'Confirmar') + '</button></div></div>')
      .then(function (r) { return !!(r && r.ok); });
  }
  function promptDialog(title, label, value, okText) {
    return openDialog('<div class="dlg"><h2 id="dialogTitle">' + esc(title) + '</h2><div class="field"><label class="label" for="dlgIn">' + esc(label) + '</label>' +
      '<input class="input" id="dlgIn" name="value" value="' + esc(value || '') + '" autofocus autocomplete="off"></div>' +
      '<div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn primary" data-dlg="ok">' + esc(okText || 'Salvar') + '</button></div></div>')
      .then(function (r) { return r && r.ok ? r.value.trim() : null; });
  }

  // ---------------------------------------------------------------- avisos
  function toast(msg, actionLabel, action, ms) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
    if (actionLabel) t.querySelector('button').onclick = function () { action(); t.remove(); };
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 260); }, ms || (actionLabel ? 7000 : 3200));
  }

  // ---------------------------------------------------------------- ações de projeto
  function newProject() {
    openDialog('<div class="dlg"><h2 id="dialogTitle">Novo jogo</h2>' +
      '<div class="field"><label class="label" for="npT">Nome do jogo</label><input class="input" id="npT" name="title" placeholder="Ex.: Projeto sem nome" autofocus autocomplete="off"></div>' +
      '<div class="cols-2"><div class="field"><label class="label" for="npG">Gênero</label><input class="input" id="npG" name="genre" placeholder="Opcional" autocomplete="off"></div>' +
      '<div class="field"><label class="label" for="npE">Motor</label><select class="select" id="npE" name="engine">' + ENGINES.map(function (e) { return '<option>' + e + '</option>'; }).join('') + '</select></div></div>' +
      '<p class="hint">O resto você preenche depois, com calma.</p>' +
      '<div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn primary" data-dlg="ok">Criar jogo</button></div></div>')
      .then(function (r) {
        if (!r || !r.ok) return;
        var p = blankProject(r.title.trim() || 'Novo jogo');
        p.genre = r.genre.trim(); p.engine = r.engine;
        p.engineVersion = r.engine === 'Godot' ? '4.7.2' : '';
        p.color = COLORS[(state.projects.length + 4) % COLORS.length];
        state.projects.push(p); persist();
        go(projHash(p));
        toast('Jogo “' + p.title + '” criado.');
      });
  }
  function renameProject(p) {
    promptDialog('Renomear jogo', 'Novo nome', p.title, 'Renomear').then(function (v) {
      if (!v) return; p.title = v; touch(p); route(); toast('Nome atualizado.');
    });
  }
  function archiveProject(p) {
    p.archived = !p.archived; touch(p);
    if (p.archived) {
      go('#/');
      toast('“' + p.title + '” foi arquivado.', 'Desfazer', function () { p.archived = false; touch(p); route(); });
    } else { route(); toast('“' + p.title + '” voltou para a lista.'); }
  }
  function deleteProject(p) {
    confirmDialog('Excluir “' + p.title + '”?', 'O jogo e tudo dentro dele (design, tarefas, ideias) será apagado deste navegador. Se quiser guardar, exporte um backup antes.', 'Excluir jogo', true)
      .then(function (ok) {
        if (!ok) return;
        var idx = state.projects.indexOf(p);
        if (idx < 0) return;
        state.projects.splice(idx, 1); persist();
        go('#/');
        toast('Jogo excluído.', 'Desfazer', function () { state.projects.splice(Math.min(idx, state.projects.length), 0, p); persist(); route(); });
      });
  }

  // ---------------------------------------------------------------- backup
  function exportBackup() {
    persist();
    var data = { app: 'Prancheta', version: 1, exportedAt: now(), projects: state.projects };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
    a.href = URL.createObjectURL(blob);
    a.download = 'prancheta-backup-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + 'h' + pad(d.getMinutes()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Backup baixado (' + plural(state.projects.length, 'jogo', 'jogos') + '). Veja na pasta de downloads.');
  }
  function parseBackup(text) {
    var data = JSON.parse(text);
    var projects = Array.isArray(data) ? data : data && data.projects;
    if (!Array.isArray(projects)) throw new Error('formato');
    return projects;
  }
  function importBackup(file) {
    var r = new FileReader();
    r.onload = function () {
      var projects;
      try { projects = parseBackup(r.result); } catch (e) { toast('Esse arquivo não é um backup válido da Prancheta.'); return; }
      confirmDialog('Importar backup?', 'O backup tem ' + plural(projects.length, 'jogo', 'jogos') + ' e vai SUBSTITUIR tudo o que está salvo agora neste navegador (' + plural(state.projects.length, 'jogo', 'jogos') + '). Se quiser, exporte o estado atual antes.', 'Substituir pelos dados do backup', true)
        .then(function (ok) {
          if (!ok) return;
          state = { version: 1, projects: projects.map(normalize) };
          persist(); go('#/'); toast('Backup importado: ' + plural(state.projects.length, 'jogo', 'jogos') + '.');
        });
    };
    r.onerror = function () { toast('Não foi possível ler o arquivo.'); };
    r.readAsText(file);
  }
  function restoreSamples() {
    var samples = sampleProjects();
    var existing = samples.filter(function (s) { return getProject(s.id); });
    var msg = 'Os jogos de exemplo (Zona Zero, Zona Vermelha e NACRE) serão recriados como vieram. Seus outros jogos não são tocados.' +
      (existing.length ? ' Atenção: ' + existing.map(function (s) { return s.title; }).join(', ') + (existing.length === 1 ? ' já existe e será substituído' : ' já existem e serão substituídos') + ' pela versão original, perdendo o que você editou neles.' : '');
    confirmDialog('Restaurar jogos de exemplo?', msg, 'Restaurar exemplos', existing.length > 0).then(function (ok) {
      if (!ok) return;
      samples.forEach(function (s) {
        var cur = getProject(s.id);
        if (cur) state.projects[state.projects.indexOf(cur)] = s; else state.projects.push(s);
      });
      persist(); go('#/'); toast('Exemplos restaurados.');
    });
  }
  function wipeAll() {
    confirmDialog('Apagar todos os dados?', 'Todos os ' + plural(state.projects.length, 'jogo', 'jogos') + ' serão apagados deste navegador. Exporte um backup antes se quiser guardar alguma coisa. Isso não pode ser desfeito.', 'Apagar tudo', true)
      .then(function (ok) { if (!ok) return; state.projects = []; persist(); go('#/'); toast('Todos os dados foram apagados.'); });
  }

  // ---------------------------------------------------------------- itens
  function addItem(p, kind, name, form) {
    name = (name || '').trim();
    if (!name) return false;
    var t = now();
    if (kind === 'mechanics') p.mechanics.unshift({ id: uid(), name: name, desc: '', status: ui.mechFilter || 'ideia' });
    else if (kind === 'characters') p.characters.unshift({ id: uid(), name: name, role: '', abilities: '', artStatus: 'faltando' });
    else if (kind === 'levels') p.levels.unshift({ id: uid(), name: name, purpose: '', status: 'ideia' });
    else if (kind === 'assets') p.assets.unshift({ id: uid(), name: name, type: 'outro', status: ui.assetFilter || 'faltando' });
    else if (kind === 'milestones') p.milestones.push({ id: uid(), title: name, due: (form && form.elements.due && form.elements.due.value) || '', done: false });
    else if (kind === 'tasks') p.tasks.push({ id: uid(), title: name, notes: '', col: (form && form.dataset.col) || 'todo', milestoneId: '', createdAt: t });
    else if (kind === 'ideas') p.ideas.push({ id: uid(), text: name, createdAt: t });
    else return false;
    touch(p);
    return true;
  }

  function rerender(focusSel) {
    var p = curP(); if (!p) return;
    var y = window.scrollY;
    if (current.section === 'ia') { refreshSide(); return; }
    $('#content').innerHTML = sectionHtml(p, current.section);
    autosizeAll($('#content'));
    refreshSide();
    window.scrollTo(0, y);
    if (focusSel) { var f = $(focusSel); if (f) f.focus(); }
  }

  function findTask(p, el) { var id = el.closest('[data-task]').dataset.task; return p.tasks.filter(function (x) { return x.id === id; })[0]; }

  function editTask(p, t) {
    openDialog('<div class="dlg"><h2 id="dialogTitle">Editar tarefa</h2>' +
      '<div class="field"><label class="label" for="tkT">Tarefa</label><input class="input" id="tkT" name="title" value="' + esc(t.title) + '" autofocus autocomplete="off"></div>' +
      '<div class="field"><label class="label" for="tkN">Notas</label><textarea class="textarea" id="tkN" name="notes" rows="4" placeholder="Detalhes, links, o que define “pronto”…">' + esc(t.notes) + '</textarea></div>' +
      '<div class="cols-2"><div class="field"><label class="label" for="tkC">Coluna</label><select class="select" id="tkC" name="col">' + options(COLS, t.col) + '</select></div>' +
      '<div class="field"><label class="label" for="tkM">Marco</label><select class="select" id="tkM" name="milestoneId"><option value="">Nenhum</option>' +
        p.milestones.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === t.milestoneId ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="dlg-actions split"><button class="btn danger" data-dlg="delete">' + icon('trash') + 'Excluir</button>' +
      '<span class="dlg-main"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn primary" data-dlg="ok">Salvar</button></span></div></div>',
      function (d) { var x = $('#tkN', d); autosize(x); x.addEventListener('input', function () { autosize(x); }); })
      .then(function (r) {
        if (!r) return;
        if (r.action === 'delete') {
          var idx = p.tasks.indexOf(t); p.tasks.splice(idx, 1); touch(p); rerender();
          toast('Tarefa excluída.', 'Desfazer', function () { p.tasks.splice(idx, 0, t); touch(p); rerender(); });
          return;
        }
        t.title = r.title.trim() || t.title; t.notes = r.notes; t.col = r.col; t.milestoneId = r.milestoneId;
        touch(p); rerender();
      });
  }

  function moveTask(p, t, col, beforeId) {
    t.col = col;
    p.tasks.splice(p.tasks.indexOf(t), 1);
    var j = -1;
    if (beforeId) for (var i = 0; i < p.tasks.length; i++) if (p.tasks[i].id === beforeId) { j = i; break; }
    if (j >= 0) p.tasks.splice(j, 0, t); else p.tasks.push(t);
    touch(p);
  }

  // ---------------------------------------------------------------- menus
  function closeMenus(except) {
    $$('.menu').forEach(function (m) {
      if (m === except) return;
      m.hidden = true;
      var b = m.parentNode.querySelector('[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function toggleMenu(btn) {
    var m = btn.parentNode.querySelector('.menu');
    var open = m.hidden;
    closeMenus(m);
    m.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) { var f = m.querySelector('button'); if (f) f.focus(); }
  }

  // ---------------------------------------------------------------- eventos
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-wrap')) closeMenus();
    var el = e.target.closest('[data-action],[data-phase]');
    if (!el || el.closest('dialog')) return;
    if (el.hasAttribute('data-phase')) {
      ui.phase = el.dataset.phase;
      $$('[data-phase]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === el)); });
      renderGrid(); return;
    }
    var a = el.dataset.action, p = el.dataset.id ? getProject(el.dataset.id) : curP();
    if (a === 'fab') { quickAdd(); return; }
    var itemEl = el.closest('[data-list]');
    switch (a) {
      case 'new-project': newProject(); break;
      case 'clear-filters': ui.search = ''; ui.phase = ''; renderHome(); break;
      case 'card-menu': e.preventDefault(); toggleMenu(el); break;
      case 'open': go(projHash(p)); break;
      case 'rename': closeMenus(); renameProject(p); break;
      case 'archive': closeMenus(); archiveProject(p); break;
      case 'delete': closeMenus(); deleteProject(p); break;
      case 'export': closeMenus(); exportBackup(); break;
      case 'import': closeMenus(); $('#importFile').click(); break;
      case 'restore-samples': closeMenus(); restoreSamples(); break;
      case 'wipe': closeMenus(); wipeAll(); break;
      case 'clear-note': p.notes = ''; touch(p); rerender(); break;
      case 'set-phase': p.phase = el.dataset.v; touch(p); rerender('[data-action=set-phase][aria-pressed=true]'); break;
      case 'set-engine':
        p.engine = el.dataset.v;
        if (p.engine === 'Godot' && !p.engineVersion) p.engineVersion = '4.7.2';
        touch(p); rerender('[data-action=set-engine][aria-pressed=true]'); break;
      case 'set-color': p.color = el.dataset.v; document.documentElement.style.setProperty('--pc', p.color); touch(p); rerender('[data-action=set-color][aria-pressed=true]'); break;
      case 'toggle-platform': {
        var i = p.platforms.indexOf(el.dataset.v);
        if (i >= 0) p.platforms.splice(i, 1); else p.platforms.push(el.dataset.v);
        el.setAttribute('aria-pressed', String(i < 0)); touch(p); break;
      }
      case 'filter': ui[el.dataset.f] = el.dataset.v; rerender('[data-action=filter][aria-pressed=true]'); break;
      case 'del-item': {
        var list = p[itemEl.dataset.list], idx = -1;
        for (var k = 0; k < list.length; k++) if (list[k].id === itemEl.dataset.id) { idx = k; break; }
        if (idx < 0) break;
        var removed = list.splice(idx, 1)[0], unlinked = [];
        if (itemEl.dataset.list === 'milestones') p.tasks.forEach(function (t) { if (t.milestoneId === removed.id) { t.milestoneId = ''; unlinked.push(t); } });
        touch(p); rerender();
        var name = String(removed.name || removed.title || removed.text || 'Item');
        toast('“' + (name.length > 40 ? name.slice(0, 40) + '…' : name) + '” excluído.', 'Desfazer', function () {
          list.splice(idx, 0, removed); unlinked.forEach(function (t) { t.milestoneId = removed.id; }); touch(p); rerender();
        });
        break;
      }
      case 'promote': {
        var idea = p.ideas.filter(function (x) { return x.id === itemEl.dataset.id; })[0];
        if (!idea) break;
        var text = String(idea.text || '').trim();
        if (!text) { toast('Escreva a ideia antes de promover.'); break; }
        var first = text.split('\n')[0].slice(0, 100), rest = text.length > first.length ? text : '';
        var to = el.dataset.to;
        if (to === 'task') p.tasks.push({ id: uid(), title: first, notes: rest, col: 'todo', milestoneId: '', createdAt: now() });
        else p.mechanics.unshift({ id: uid(), name: first, desc: rest, status: 'ideia' });
        p.ideas.splice(p.ideas.indexOf(idea), 1); touch(p); rerender();
        toast(to === 'task' ? 'Virou tarefa em “A fazer”.' : 'Virou mecânica (estado: ideia).', 'Ver', function () { go(projHash(p, to === 'task' ? 'producao' : 'mecanicas')); });
        break;
      }
      case 'toggle-task': {
        var t = findTask(p, el);
        moveTask(p, t, t.col === 'done' ? 'todo' : 'done'); rerender('[data-task="' + t.id + '"] .check');
        if (t.col === 'done') toast('Tarefa concluída.');
        break;
      }
      case 'move-task': {
        var tk = findTask(p, el);
        var ci = COLS.map(function (c) { return c[0]; }).indexOf(tk.col) + Number(el.dataset.dir);
        if (ci < 0 || ci > 2) break;
        moveTask(p, tk, COLS[ci][0]);
        if (isNarrow()) {
          rerender('[data-action=kanban-tab][aria-pressed=true]');
          var dest = COLS[ci];
          toast('Movida para “' + dest[1] + '”.', 'Ver', function () { ui.kanbanCol = dest[0]; rerender(); });
        } else rerender('[data-task="' + tk.id + '"] [data-action=move-task]');
        break;
      }
      case 'edit-task': editTask(p, findTask(p, el)); break;
      case 'kanban-tab': ui.kanbanCol = el.dataset.v; rerender('[data-action=kanban-tab][aria-pressed=true]'); break;
      case 'more-sections': moreSections(p); break;
      case 'fab': quickAdd(); break;
    }
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Escape') closeMenus();
    if ((e.key === 'Enter' || e.key === ' ') && t.dataset && t.dataset.action === 'edit-task') { e.preventDefault(); t.click(); return; }
    if (t.id === 'ideaInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (t.form.requestSubmit) t.form.requestSubmit(); else t.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      return;
    }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && $('#search') && !dlg.open) { e.preventDefault(); $('#search').focus(); }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.closest('dialog')) return;
    if (t.id === 'search') { ui.search = t.value; renderGrid(); return; }
    if (t.tagName === 'TEXTAREA') autosize(t);
    var p = curP(); if (!p) return;
    if (t.dataset.bind) {
      setPath(p, t.dataset.bind, t.value); touch(p);
      if (t.dataset.bind === 'title') {
        var st = $('#sideTitle'); if (st) st.textContent = t.value || 'Sem título';
        var ct = $('#crumbTitle'); if (ct) ct.textContent = t.value || 'Sem título';
        document.title = (t.value || 'Sem título') + ' · Prancheta';
      }
      return;
    }
    var row = t.closest('[data-list]');
    if (row && t.dataset.field && t.type !== 'checkbox' && t.tagName !== 'SELECT' && t.type !== 'date') {
      var item = p[row.dataset.list].filter(function (x) { return x.id === row.dataset.id; })[0];
      if (!item) return;
      item[t.dataset.field] = t.value;
      if (row.dataset.list === 'characters' && t.dataset.field === 'name') { var av = row.querySelector('.avatar'); if (av) av.textContent = initials(t.value); }
      touch(p);
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'showArchived') { ui.showArchived = t.checked; renderGrid(); return; }
    if (t.id === 'importFile') { if (t.files && t.files[0]) importBackup(t.files[0]); t.value = ''; return; }
    if (t.closest('dialog')) return;
    var p = curP(); if (!p) return;
    var row = t.closest('[data-list]');
    if (row && t.dataset.field) {
      var item = p[row.dataset.list].filter(function (x) { return x.id === row.dataset.id; })[0];
      if (!item) return;
      item[t.dataset.field] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.classList.contains('status')) t.dataset.v = t.value;
      touch(p);
      if ((t.dataset.field === 'status' && (ui.mechFilter || ui.assetFilter)) || row.dataset.list === 'milestones' || row.dataset.list === 'assets') {
        rerender('[data-id="' + row.dataset.id + '"] [data-field="' + t.dataset.field + '"]');
      } else refreshSide();
    } else if (t.dataset.bind) {
      refreshSide();
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.dataset || !f.dataset.add) return;
    e.preventDefault();
    var p = curP(); if (!p) return;
    var kind = f.dataset.add, field = f.elements.name;
    if (addItem(p, kind, field.value, f)) {
      rerender(kind === 'tasks' ? '.col-add[data-col="' + f.dataset.col + '"] input' : '[data-add="' + kind + '"] [name=name]');
      if (kind === 'ideas') toast('Ideia guardada.');
    } else {
      field.focus();
    }
  });

  // arrastar e soltar tarefas
  var dragId = null;
  document.addEventListener('dragstart', function (e) {
    var t = e.target.closest && e.target.closest('[data-task]'); if (!t) return;
    dragId = t.dataset.task; t.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* ok */ }
  });
  document.addEventListener('dragend', function () {
    dragId = null;
    $$('.dragging,.over,.drop-before').forEach(function (x) { x.classList.remove('dragging', 'over', 'drop-before'); });
  });
  document.addEventListener('dragover', function (e) {
    if (!dragId) return;
    var col = e.target.closest && e.target.closest('.col'); if (!col) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    $$('.col.over').forEach(function (c) { if (c !== col) c.classList.remove('over'); });
    col.classList.add('over');
    $$('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); });
    var card = e.target.closest('[data-task]');
    if (card && card.dataset.task !== dragId) card.classList.add('drop-before');
  });
  document.addEventListener('drop', function (e) {
    if (!dragId) return;
    var col = e.target.closest && e.target.closest('.col'); if (!col) return;
    e.preventDefault();
    var p = curP(); if (!p) return;
    var t = p.tasks.filter(function (x) { return x.id === dragId; })[0];
    var card = e.target.closest('[data-task]');
    if (t) { moveTask(p, t, col.dataset.col, card && card.dataset.task !== dragId ? card.dataset.task : null); rerender(); }
    dragId = null;
  });

  $('#dataMenuBtn').addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(this); });
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) toast('A Prancheta foi alterada em outra aba. Recarregue a página para ver as mudanças.');
  });

  // ---------------------------------------------------------------- início
  load();
  if (window.PranchetaIA) window.PranchetaIA.init({
    state: function () { return state; }, getProject: getProject, curP: curP, current: function () { return current; },
    touch: touch, persist: persist, refreshSide: refreshSide, toast: toast, openDialog: openDialog, confirmDialog: confirmDialog,
    esc: esc, icon: icon, go: go, projHash: projHash, uid: uid, now: now, stats: stats, engineLabel: engineLabel,
    moveTask: moveTask, isNarrow: isNarrow, autosize: autosize, COLS: COLS, PHASES: PHASES, MECH_STATUS: MECH_STATUS, ART_STATUS: ART_STATUS
  });
  route();
  pendingToasts.forEach(function (m) { toast(m); });


  // ---------------------------------------------------------------- app instalável (PWA)
  var installEvt = null, installBtn = $('#installBtn');
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function syncInstallBtn() { if (installBtn) installBtn.hidden = !installEvt || isStandalone(); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); installEvt = e; syncInstallBtn();
  });
  window.addEventListener('appinstalled', function () {
    installEvt = null; syncInstallBtn(); toast('Prancheta instalada. Abra pelo ícone na tela inicial.');
  });
  if (installBtn) installBtn.addEventListener('click', function () {
    if (!installEvt) return;
    var ev = installEvt; installEvt = null; syncInstallBtn();
    ev.prompt();
    if (ev.userChoice) ev.userChoice.then(function (r) { if (r && r.outcome !== 'accepted') { installEvt = null; } });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(display-mode: standalone)');
    if (mq.addEventListener) mq.addEventListener('change', syncInstallBtn);
  }
  syncInstallBtn();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
      }).catch(function () { /* sem offline, segue normal */ });
    });
    // quando uma versão nova do app assume, avisa e oferece recarregar
    var hadController = !!navigator.serviceWorker.controller, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      if (reloading) return;
      toast('Nova versão disponível.', 'Atualizar', function () { reloading = true; location.reload(); }, 30000);
    });
  }

  // gancho de leitura usado só no teste automatizado
  window.__prancheta = { state: function () { return state; }, KEY: KEY, parseBackup: parseBackup };
})();
