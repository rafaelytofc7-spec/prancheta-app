/* Prancheta — Assistente IA (conecta a provedores compatíveis com a API da OpenAI).
   A chave fica só neste aparelho (localStorage "prancheta.ia.v1") e nunca entra no backup. */
(function () {
  'use strict';
  var CFG_KEY = 'prancheta.ia.v1';
  var CHAT_KEY = 'prancheta.ia.chats.v1';
  var MAX_HISTORY = 80;

  var PRESETS = {
    gemini: { label: 'Google Gemini (grátis)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash', key: true,
      models: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'],
      help: '<ol><li>Abra o <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a> e entre com sua conta Google.</li><li>Toque em <b>Criar chave de API</b> (Create API key).</li><li>Copie a chave e cole no campo acima.</li></ol><p>O plano gratuito tem limite de uso por minuto e por dia. No plano gratuito o Google pode usar as conversas para melhorar os produtos dele.</p>' },
    groq: { label: 'Groq (grátis)', baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-20b', key: true,
      models: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
      help: '<p>Crie uma chave grátis em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a>. Muito rápido; tem limite por minuto.</p>' },
    openrouter: { label: 'OpenRouter (modelos grátis)', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemma-4-31b-it:free', key: true,
      models: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free'],
      help: '<p>Crie uma chave em <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a>. Os modelos que terminam em <code>:free</code> não cobram, mas a lista muda com o tempo e o limite diário é baixo.</p>' },
    openai: { label: 'OpenAI (pago)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', key: true, models: [],
      help: '<p>Chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a>. Cobra por uso.</p>' },
    ollama: { label: 'Ollama (no PC, sem chave)', baseUrl: 'http://localhost:11434/v1', model: 'dolphin3', key: false, models: [],
      help: '<p>Só funciona no computador onde o Ollama está rodando (não no celular). Use o nome exato do modelo que aparece em <code>ollama list</code>.</p><p>Se a Prancheta estiver aberta pelo site (https), o Ollama precisa liberar esse endereço: rode <code>OLLAMA_ORIGINS=https://rafaelytofc7-spec.github.io ollama serve</code> (ou configure a variável no serviço) e permita o acesso à rede local se o Chrome pedir. Modelos sem suporte a ferramentas usam o modo simples automaticamente.</p>' },
    custom: { label: 'Outro (compatível com OpenAI)', baseUrl: '', model: '', key: true, models: [],
      help: '<p>Qualquer serviço com o endpoint <code>/chat/completions</code> no formato da OpenAI.</p>' }
  };

  var GDD_FIELDS = { premise: 'Premissa e fantasia do jogador', loop: 'Loop de jogabilidade', tone: 'Tom e direção', world: 'Mundo', references: 'Referências de design', notes: 'Notas livres' };
  var COL_NAMES = { todo: 'A fazer', doing: 'Em andamento', done: 'Feito' };
  var MECH_NAMES = { ideia: 'Ideia', definir: 'A definir', andamento: 'Em andamento', pronto: 'Pronto' };

  var api = null;
  var cfg = loadCfg();
  var chats = loadChats();
  var view = null; // { root, p, ctx }
  var busy = null; // AbortController enquanto responde

  // ---------------------------------------------------------------- armazenamento (separado dos dados dos jogos)
  function loadCfg() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { c = null; }
    c = c && typeof c === 'object' ? c : {};
    if (!PRESETS[c.preset]) c.preset = 'gemini';
    if (!c.providers || typeof c.providers !== 'object') c.providers = {};
    c.autoApply = !!c.autoApply;
    if (!c.noTools || typeof c.noTools !== 'object') c.noTools = {};
    return c;
  }
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* sem espaço */ } }
  function loadChats() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}') || {}; } catch (e) { c = {}; }
    if (typeof c !== 'object') c = {};
    Object.keys(c).forEach(function (k) {
      if (!Array.isArray(c[k])) { delete c[k]; return; }
      c[k] = c[k].filter(function (m) { if (m && m.streaming) { m.streaming = false; return !!(m.content || m.tool_calls); } return !!m; });
    });
    return c;
  }
  function saveChats() {
    Object.keys(chats).forEach(function (k) { if (chats[k].length > MAX_HISTORY) chats[k] = chats[k].slice(-MAX_HISTORY); });
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); } catch (e) { /* sem espaço */ }
  }
  function prov(id) {
    id = id || cfg.preset;
    var d = PRESETS[id], s = cfg.providers[id] || {};
    return { id: id, label: d.label, needsKey: d.key, key: s.key || '', baseUrl: (s.baseUrl || d.baseUrl || '').replace(/\/+$/, ''), model: s.model || d.model || '' };
  }
  function ready() { var p = prov(); return !!(p.baseUrl && p.model && (!p.needsKey || p.key)); }
  function history(ctx) { if (!chats[ctx]) chats[ctx] = []; return chats[ctx]; }
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // ---------------------------------------------------------------- texto (markdown simples, sempre escapado)
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(t) {
    return t
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
      .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)"]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function md(src) {
    var parts = String(src || '').split(/```/);
    var out = '';
    parts.forEach(function (chunk, i) {
      if (i % 2 === 1) { out += '<pre><code>' + esc(chunk.replace(/^[\w-]*\n/, '')) + '</code></pre>'; return; }
      var lines = esc(chunk).split('\n'), list = null, para = [];
      function flushPara() { if (para.length) { out += '<p>' + inline(para.join('<br>')) + '</p>'; para = []; } }
      function flushList() { if (list) { out += '</' + list + '>'; list = null; } }
      lines.forEach(function (ln) {
        var m;
        if (/^\s*$/.test(ln)) { flushPara(); flushList(); return; }
        if ((m = ln.match(/^\s{0,3}#{1,4}\s+(.*)$/))) { flushPara(); flushList(); out += '<h4>' + inline(m[1]) + '</h4>'; return; }
        if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { flushPara(); if (list !== 'ul') { flushList(); out += '<ul>'; list = 'ul'; } out += '<li>' + inline(m[1]) + '</li>'; return; }
        if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== 'ol') { flushList(); out += '<ol>'; list = 'ol'; } out += '<li>' + inline(m[1]) + '</li>'; return; }
        flushList(); para.push(ln);
      });
      flushPara(); flushList();
    });
    return out;
  }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }

  // ---------------------------------------------------------------- dados do jogo para a IA
  function gameSummary(p, full) {
    var lim = full ? 700 : 160;
    var o = {
      id: p.id, titulo: p.title, pitch: cut(p.logline, lim), genero: p.genre, fase: p.phase, versao: p.version,
      motor: api.engineLabel(p), plataformas: p.platforms, publico: cut(p.audience, lim),
      tarefas: p.tasks.map(function (t) { var m = t.milestoneId && p.milestones.filter(function (x) { return x.id === t.milestoneId; })[0]; return { id: t.id, titulo: t.title, coluna: t.col, notas: full ? cut(t.notes, 300) : undefined, marco: m ? m.title : undefined }; }),
      marcos: p.milestones.map(function (m) { return { id: m.id, titulo: m.title, prazo: m.due || '', feito: !!m.done }; }),
      mecanicas: p.mechanics.map(function (m) { return { nome: m.name, estado: m.status, descricao: full ? cut(m.desc, 300) : undefined }; }),
      personagens: p.characters.map(function (c) { return { nome: c.name, papel: c.role, habilidades: full ? cut(c.abilities, 300) : undefined, arte: c.artStatus }; }),
      ideias: p.ideas.map(function (i) { return cut(i.text, full ? 300 : 100); })
    };
    if (full) {
      o.gdd = {}; Object.keys(GDD_FIELDS).forEach(function (k) { o.gdd[k] = cut(p.gdd[k], lim); });
      o.niveis = p.levels.map(function (l) { return { nome: l.name, estado: l.status, funcao: cut(l.purpose, 200) }; });
      o.arte = { direcao: cut(p.art.direction, 400), estilo: cut(p.art.style, 400), referencias: cut(p.art.references, 300), audio: cut(p.art.audio, 300) };
      o.assets = p.assets.map(function (a) { return { nome: a.name, tipo: a.type, estado: a.status }; });
      o.tecnica = { exportacoes: cut(p.tech.exports, 300), restricoes: cut(p.tech.constraints, 300), riscos: cut(p.tech.risks, 300), notas: cut(p.tech.notes, 300) };
      o.referencias = cut(p.references, 400);
    } else {
      o.gdd_preenchido = Object.keys(GDD_FIELDS).filter(function (k) { return String(p.gdd[k] || '').trim(); });
    }
    return o;
  }
  function listGames() {
    return api.state().projects.map(function (p) { var s = api.stats(p); return { id: p.id, titulo: p.title, fase: p.phase, genero: p.genre, motor: api.engineLabel(p), arquivado: p.archived, tarefas_abertas: s.total - s.done }; });
  }

  // ---------------------------------------------------------------- ferramentas
  var gameArg = { type: 'string', description: 'id do jogo (de listar_jogos). Opcional quando há um jogo aberto.' };
  var TOOLS = [
    { name: 'listar_jogos', write: false, description: 'Lista todos os jogos da Prancheta (id, título, fase, motor, tarefas abertas).', parameters: { type: 'object', properties: {} } },
    { name: 'ler_jogo', write: false, description: 'Lê os dados completos de um jogo: pitch, GDD, mecânicas, personagens, níveis, arte, técnica, tarefas (com id e coluna), marcos e ideias.', parameters: { type: 'object', properties: { jogo_id: gameArg } } },
    { name: 'criar_tarefa', write: true, description: 'Propõe uma nova tarefa no quadro de produção.', parameters: { type: 'object', properties: { jogo_id: gameArg, titulo: { type: 'string' }, notas: { type: 'string', description: 'detalhes ou passos (opcional)' }, coluna: { type: 'string', enum: ['todo', 'doing', 'done'], description: 'todo = A fazer, doing = Em andamento, done = Feito' }, marco: { type: 'string', description: 'id ou título de um marco existente (opcional)' } }, required: ['titulo'] } },
    { name: 'mover_tarefa', write: true, description: 'Propõe mover uma tarefa existente para outra coluna.', parameters: { type: 'object', properties: { jogo_id: gameArg, tarefa: { type: 'string', description: 'id da tarefa (de ler_jogo) ou o título exato' }, coluna: { type: 'string', enum: ['todo', 'doing', 'done'] } }, required: ['tarefa', 'coluna'] } },
    { name: 'criar_ideia', write: true, description: 'Propõe guardar uma ideia na Caixa de ideias.', parameters: { type: 'object', properties: { jogo_id: gameArg, texto: { type: 'string' } }, required: ['texto'] } },
    { name: 'criar_mecanica', write: true, description: 'Propõe uma nova mecânica.', parameters: { type: 'object', properties: { jogo_id: gameArg, nome: { type: 'string' }, descricao: { type: 'string' }, estado: { type: 'string', enum: ['ideia', 'definir', 'andamento', 'pronto'] } }, required: ['nome'] } },
    { name: 'criar_personagem', write: true, description: 'Propõe um novo personagem ou criatura.', parameters: { type: 'object', properties: { jogo_id: gameArg, nome: { type: 'string' }, papel: { type: 'string', description: 'protagonista, inimigo, chefe, NPC…' }, habilidades: { type: 'string', description: 'habilidades e comportamento' } }, required: ['nome'] } },
    { name: 'atualizar_gdd', write: true, description: 'Propõe escrever num campo do caderno de design (GDD).', parameters: { type: 'object', properties: { jogo_id: gameArg, campo: { type: 'string', enum: Object.keys(GDD_FIELDS), description: 'premise = premissa, loop = loop de jogabilidade, tone = tom, world = mundo, references = referências, notes = notas' }, texto: { type: 'string' }, modo: { type: 'string', enum: ['acrescentar', 'substituir'], description: 'acrescentar (padrão) adiciona ao fim; substituir troca o texto todo' } }, required: ['campo', 'texto'] } },
    { name: 'criar_marco', write: true, description: 'Propõe um novo marco de produção (meta maior, com prazo opcional).', parameters: { type: 'object', properties: { jogo_id: gameArg, titulo: { type: 'string' }, prazo: { type: 'string', description: 'data AAAA-MM-DD (opcional)' } }, required: ['titulo'] } }
  ];
  var TOOL_BY = {}; TOOLS.forEach(function (t) { TOOL_BY[t.name] = t; });
  function toolsPayload() { return TOOLS.map(function (t) { return { type: 'function', 'function': { name: t.name, description: t.description, parameters: t.parameters } }; }); }

  function targetGame(args) {
    var p = args && args.jogo_id ? api.getProject(String(args.jogo_id)) : null;
    if (!p && args && args.jogo_id) {
      var t = String(args.jogo_id).toLowerCase();
      p = api.state().projects.filter(function (x) { return x.title.toLowerCase() === t; })[0] || null;
    }
    return p || (view && view.p) || null;
  }
  function findTask(p, ref) {
    ref = String(ref || '').trim(); var low = ref.toLowerCase();
    return p.tasks.filter(function (t) { return t.id === ref; })[0] || p.tasks.filter(function (t) { return t.title.toLowerCase() === low; })[0] ||
      p.tasks.filter(function (t) { return low && t.title.toLowerCase().indexOf(low) >= 0; })[0] || null;
  }
  function runRead(name, args) {
    if (name === 'listar_jogos') return { jogos: listGames() };
    var p = targetGame(args);
    if (!p) return { erro: 'Nenhum jogo aberto. Use listar_jogos e passe jogo_id.' };
    return gameSummary(p, true);
  }

  // descreve a ação para o cartão
  function describe(a) {
    var g = a.args || {}, p = targetGame(g), rows = [];
    var title = { criar_tarefa: 'Nova tarefa', mover_tarefa: 'Mover tarefa', criar_ideia: 'Nova ideia', criar_mecanica: 'Nova mecânica', criar_personagem: 'Novo personagem', atualizar_gdd: 'Atualizar GDD', criar_marco: 'Novo marco' }[a.tool] || a.tool;
    var ic = { criar_tarefa: 'tarefa', mover_tarefa: 'producao', criar_ideia: 'ideias', criar_mecanica: 'mecanicas', criar_personagem: 'personagens', atualizar_gdd: 'design', criar_marco: 'flag' }[a.tool] || 'ia';
    if (a.tool === 'criar_tarefa') { rows.push(['Tarefa', g.titulo]); rows.push(['Coluna', COL_NAMES[g.coluna] || 'A fazer']); if (g.notas) rows.push(['Notas', g.notas]); if (g.marco) rows.push(['Marco', g.marco]); }
    else if (a.tool === 'mover_tarefa') { var t = p && findTask(p, g.tarefa); rows.push(['Tarefa', t ? t.title : g.tarefa]); rows.push(['Para', COL_NAMES[g.coluna] || g.coluna]); }
    else if (a.tool === 'criar_ideia') rows.push(['Ideia', g.texto]);
    else if (a.tool === 'criar_mecanica') { rows.push(['Nome', g.nome]); if (g.descricao) rows.push(['Descrição', g.descricao]); rows.push(['Estado', MECH_NAMES[g.estado] || 'Ideia']); }
    else if (a.tool === 'criar_personagem') { rows.push(['Nome', g.nome]); if (g.papel) rows.push(['Papel', g.papel]); if (g.habilidades) rows.push(['Habilidades', g.habilidades]); }
    else if (a.tool === 'atualizar_gdd') { rows.push(['Campo', GDD_FIELDS[g.campo] || g.campo]); rows.push(['Modo', g.modo === 'substituir' ? 'Substituir o texto' : 'Acrescentar ao fim']); rows.push(['Texto', g.texto]); }
    else if (a.tool === 'criar_marco') { rows.push(['Marco', g.titulo]); if (g.prazo) rows.push(['Prazo', g.prazo]); }
    return { title: title, icon: ic, rows: rows, game: p ? p.title : '' };
  }

  // aplica uma ação; devolve dados para desfazer
  function applyAction(a) {
    var g = a.args || {}, p = targetGame(g);
    if (!p) throw new Error('Abra um jogo (ou peça para a IA indicar qual) antes de aplicar.');
    var s = function (v) { return String(v == null ? '' : v).trim(); };
    var undo = { game: p.id };
    switch (a.tool) {
      case 'criar_tarefa': {
        if (!s(g.titulo)) throw new Error('Tarefa sem título.');
        var col = COL_NAMES[g.coluna] ? g.coluna : 'todo', ms = '';
        if (g.marco) { var mm = p.milestones.filter(function (m) { return m.id === g.marco || m.title.toLowerCase() === s(g.marco).toLowerCase(); })[0]; if (mm) ms = mm.id; }
        var t = { id: uid(), title: s(g.titulo).slice(0, 200), notes: s(g.notas), col: col, milestoneId: ms, createdAt: api.now() };
        p.tasks.push(t); undo.list = 'tasks'; undo.id = t.id; break;
      }
      case 'mover_tarefa': {
        var tk = findTask(p, g.tarefa); if (!tk) throw new Error('Não achei a tarefa “' + s(g.tarefa) + '”.');
        if (!COL_NAMES[g.coluna]) throw new Error('Coluna inválida.');
        undo.move = { id: tk.id, col: tk.col, index: p.tasks.indexOf(tk) };
        api.moveTask(p, tk, g.coluna); break;
      }
      case 'criar_ideia': {
        if (!s(g.texto)) throw new Error('Ideia vazia.');
        var i = { id: uid(), text: s(g.texto), createdAt: api.now() }; p.ideas.push(i); undo.list = 'ideas'; undo.id = i.id; break;
      }
      case 'criar_mecanica': {
        if (!s(g.nome)) throw new Error('Mecânica sem nome.');
        var m = { id: uid(), name: s(g.nome), desc: s(g.descricao), status: MECH_NAMES[g.estado] ? g.estado : 'ideia' }; p.mechanics.unshift(m); undo.list = 'mechanics'; undo.id = m.id; break;
      }
      case 'criar_personagem': {
        if (!s(g.nome)) throw new Error('Personagem sem nome.');
        var c = { id: uid(), name: s(g.nome), role: s(g.papel), abilities: s(g.habilidades), artStatus: 'faltando' }; p.characters.unshift(c); undo.list = 'characters'; undo.id = c.id; break;
      }
      case 'atualizar_gdd': {
        if (!GDD_FIELDS[g.campo]) throw new Error('Campo do GDD inválido.');
        var prev = p.gdd[g.campo] || '';
        p.gdd[g.campo] = g.modo === 'substituir' ? s(g.texto) : (prev.trim() ? prev.replace(/\s+$/, '') + '\n\n' + s(g.texto) : s(g.texto));
        undo.gdd = { field: g.campo, prev: prev }; break;
      }
      case 'criar_marco': {
        if (!s(g.titulo)) throw new Error('Marco sem título.');
        var due = /^\d{4}-\d{2}-\d{2}$/.test(s(g.prazo)) ? s(g.prazo) : '';
        var ml = { id: uid(), title: s(g.titulo), due: due, done: false }; p.milestones.push(ml); undo.list = 'milestones'; undo.id = ml.id; break;
      }
      default: throw new Error('Ação desconhecida.');
    }
    api.touch(p); api.refreshSide();
    return undo;
  }
  function undoAction(a) {
    var u = a.undo; if (!u) return false;
    var p = api.getProject(u.game); if (!p) return false;
    if (u.list) { var arr = p[u.list], k = arr.map(function (x) { return x.id; }).indexOf(u.id); if (k < 0) return false; arr.splice(k, 1); }
    else if (u.move) { var t = p.tasks.filter(function (x) { return x.id === u.move.id; })[0]; if (!t) return false; p.tasks.splice(p.tasks.indexOf(t), 1); t.col = u.move.col; p.tasks.splice(Math.min(u.move.index, p.tasks.length), 0, t); }
    else if (u.gdd) p.gdd[u.gdd.field] = u.gdd.prev;
    api.touch(p); api.refreshSide();
    return true;
  }

  // ---------------------------------------------------------------- prompt
  function systemPrompt(p, fallback) {
    var hoje = new Date().toISOString().slice(0, 10);
    var lines = [
      'Você é o Assistente IA da Prancheta, um app de planejamento de jogos. Atue como produtor e game designer experiente ajudando um desenvolvedor indie brasileiro que usa principalmente o Godot 4.7.2 (GDScript).',
      'Responda sempre em português do Brasil, de forma curta, prática e organizada (listas curtas quando ajudar).',
      'Regras importantes:',
      '- Antes de opinar sobre um jogo, leia os dados dele. Baseie-se só no que está registrado.',
      '- Nunca apresente como decidido algo que não está nos dados. Quando for ideia sua, deixe claro que é sugestão (por exemplo, comece com "Sugestão:").',
      '- Não invente história, lore ou fatos sobre os jogos existentes. Se faltar informação, pergunte.',
      '- Para mudar dados (criar tarefa, mover tarefa, criar ideia, mecânica, personagem, marco ou escrever no GDD), proponha a ação. Cada ação vira um cartão que o usuário confirma com "Aplicar". Nunca diga que já aplicou: diga que propôs.',
      '- Proponha no máximo 6 ações por resposta e não repita propostas já feitas.',
      '- Dicas técnicas devem ser compatíveis com Godot 4.x (nós, cenas, sinais, GDScript).',
      'Data de hoje: ' + hoje + '.'
    ];
    if (p) lines.push('Jogo aberto agora: "' + p.title + '" (id ' + p.id + '). Resumo: ' + JSON.stringify(gameSummary(p, !!fallback)));
    else lines.push('Nenhum jogo aberto. Jogos disponíveis: ' + JSON.stringify(listGames()) + '. Para mudanças, informe jogo_id.');
    if (fallback) {
      lines.push('Este modelo não usa ferramentas. Para propor mudanças, inclua no fim da resposta um bloco por ação, exatamente assim:');
      lines.push('```acao\n{"ferramenta": "criar_tarefa", "args": {"titulo": "...", "coluna": "todo"}}\n```');
      lines.push('Ferramentas e argumentos: ' + TOOLS.filter(function (t) { return t.write; }).map(function (t) { return t.name + '(' + Object.keys(t.parameters.properties).join(', ') + ')'; }).join('; ') + '. Colunas: todo, doing, done. Campos do GDD: ' + Object.keys(GDD_FIELDS).join(', ') + '.');
    }
    return lines.join('\n');
  }

  function apiMessages(ctx, p, fallback) {
    var msgs = [{ role: 'system', content: systemPrompt(p, fallback) }];
    var h = history(ctx).filter(function (m) { return !m.error; }).slice(-30);
    // não começa no meio de uma sequência de ferramentas
    while (h.length && h[0].role === 'tool') h.shift();
    h.forEach(function (m) {
      if (m.role === 'user') msgs.push({ role: 'user', content: m.content });
      else if (m.role === 'assistant') {
        if (fallback || !m.tool_calls) { if (m.content) msgs.push({ role: 'assistant', content: m.content + (m.actions && m.actions.length ? '\n[Ações propostas: ' + m.actions.map(function (a) { return a.tool + ' (' + statusWord(a) + ')'; }).join(', ') + ']' : '') }); }
        else msgs.push({ role: 'assistant', content: m.content || null, tool_calls: m.tool_calls });
      } else if (m.role === 'tool' && !fallback) {
        var c = m.result != null ? m.result : (m.action ? 'Proposta mostrada ao usuário como cartão. Situação: ' + statusWord(m.action) + '. Não proponha de novo.' : '');
        msgs.push({ role: 'tool', tool_call_id: m.tool_call_id, content: typeof c === 'string' ? c : JSON.stringify(c) });
      }
    });
    return msgs;
  }
  function statusWord(a) { return { pending: 'aguardando confirmação', applied: 'aplicada pelo usuário', discarded: 'descartada pelo usuário', error: 'falhou', undone: 'desfeita pelo usuário' }[a.status] || a.status; }

  // ---------------------------------------------------------------- chamada ao provedor (com streaming)
  function errorText(status, body) {
    var msg = '';
    try { var j = JSON.parse(body); if (Array.isArray(j)) j = j[0]; msg = (j && j.error && (j.error.message || j.error)) || (j && j.message) || ''; } catch (e) { msg = String(body || '').slice(0, 200); }
    if (typeof msg !== 'string') msg = JSON.stringify(msg);
    var hint = status === 401 || status === 403 ? 'Chave inválida ou sem permissão.' : status === 404 ? 'Endereço ou modelo não encontrado.' : status === 429 ? 'Limite do plano atingido. Espere um pouco e tente de novo.' : status >= 500 ? 'O provedor está com problema agora.' : '';
    return (hint ? hint + ' ' : '') + (msg ? '(' + cut(msg, 220) + ')' : '(erro ' + status + ')');
  }
  function looksLikeNoTools(status, body) { return status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429 && /tool|function/i.test(body || ''); }

  function callModel(messages, useTools, signal, onDelta) {
    var pv = prov();
    var body = { model: pv.model, messages: messages, stream: true };
    if (useTools) { body.tools = toolsPayload(); body.tool_choice = 'auto'; }
    var headers = { 'Content-Type': 'application/json' };
    if (pv.key) headers.Authorization = 'Bearer ' + pv.key;
    if (pv.id === 'openrouter') { headers['X-Title'] = 'Prancheta'; }
    return fetch(pv.baseUrl + '/chat/completions', { method: 'POST', headers: headers, body: JSON.stringify(body), signal: signal, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { var e = new Error(errorText(res.status, t)); e.status = res.status; e.body = t; throw e; });
        var ct = res.headers.get('content-type') || '';
        if (!res.body || ct.indexOf('text/event-stream') < 0) {
          return res.json().then(function (j) {
            var m = (j.choices && j.choices[0] && j.choices[0].message) || {};
            if (m.content) onDelta(m.content);
            return { content: m.content || '', tool_calls: m.tool_calls || [] };
          });
        }
        return readStream(res.body, onDelta);
      });
  }
  function mergeToolDelta(list, d) {
    var i = typeof d.index === 'number' ? d.index : list.length;
    var cur = list[i] || (list[i] = { id: '', type: 'function', 'function': { name: '', arguments: '' } });
    Object.keys(d).forEach(function (k) {
      if (k === 'index') return;
      if (k === 'function') {
        var f = d['function'] || {};
        if (f.name) cur['function'].name += f.name;
        if (f.arguments) cur['function'].arguments += f.arguments;
      } else if (k === 'id') { if (d.id) cur.id = d.id; }
      else cur[k] = d[k]; // ex.: extra_content (assinatura de pensamento do Gemini)
    });
  }
  function readStream(stream, onDelta) {
    var reader = stream.getReader(), dec = new TextDecoder(), buf = '', content = '', calls = [];
    function handle(line) {
      line = line.trim();
      if (!line || line.indexOf('data:') !== 0) return;
      var data = line.slice(5).trim();
      if (data === '[DONE]') return;
      var j; try { j = JSON.parse(data); } catch (e) { return; }
      if (j.error) { var er = new Error(errorText(0, JSON.stringify(j))); throw er; }
      var ch = j.choices && j.choices[0]; if (!ch) return;
      var d = ch.delta || ch.message || {};
      if (d.content) { content += d.content; onDelta(d.content); }
      if (d.tool_calls) d.tool_calls.forEach(function (tc) { mergeToolDelta(calls, tc); });
    }
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) { buf.split('\n').forEach(handle); return { content: content, tool_calls: calls.filter(Boolean) }; }
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split('\n'); buf = lines.pop();
        lines.forEach(handle);
        return pump();
      });
    }
    return pump();
  }

  // ação no modo simples (sem ferramentas): blocos ```acao {json}```
  function parseFallbackActions(text) {
    var actions = [];
    var clean = String(text || '').replace(/```(?:acao|ação|json)?\s*\n?([\s\S]*?)```/gi, function (all, body) {
      var j; try { j = JSON.parse(body.trim()); } catch (e) { return all; }
      var list = Array.isArray(j) ? j : [j], ok = false;
      list.forEach(function (x) { var name = x && (x.ferramenta || x.tool || x.acao || x.name); if (name && TOOL_BY[name] && TOOL_BY[name].write) { actions.push({ id: uid(), tool: name, args: x.args || x.argumentos || x.arguments || {}, status: 'pending' }); ok = true; } });
      return ok ? '' : all;
    });
    return { text: clean.trim(), actions: actions };
  }

  // ---------------------------------------------------------------- conversa
  function send(text) {
    text = String(text || '').trim();
    if (!text || busy || !view) return;
    if (!ready()) { openConfig(); return; }
    var ctx = view.ctx, p = view.p;
    history(ctx).push({ id: uid(), role: 'user', content: text, at: Date.now() });
    saveChats(); renderMessages(true);
    runTurn(ctx, p, 0);
  }

  function runTurn(ctx, p, depth) {
    var pv = prov();
    var fallback = !!cfg.noTools[pv.id + '|' + pv.model];
    var msg = { id: uid(), role: 'assistant', content: '', at: Date.now(), streaming: true };
    history(ctx).push(msg);
    busy = new AbortController();
    setBusy(true); renderMessages(true);
    var bubble = null, raf = 0;
    function onDelta(d) {
      msg.content += d;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        bubble = bubble || (view && view.root.querySelector('[data-msg="' + msg.id + '"] .ia-text'));
        if (bubble) { bubble.innerHTML = md(fallback ? stripPartialAction(msg.content) : msg.content); scrollDown(); }
      });
    }
    callModel(apiMessages(ctx, p, fallback), !fallback, busy.signal, onDelta)
      .catch(function (e) {
        if (!fallback && e.status && looksLikeNoTools(e.status, e.body)) {
          cfg.noTools[pv.id + '|' + pv.model] = true; saveCfg();
          msg.content = ''; fallback = true;
          return callModel(apiMessages(ctx, p, true), false, busy.signal, onDelta);
        }
        throw e;
      })
      .then(function (r) {
        msg.streaming = false;
        msg.content = r.content || msg.content || '';
        var calls = (r.tool_calls || []).filter(function (c) { return c && c['function'] && c['function'].name; });
        if (fallback) {
          var fa = parseFallbackActions(msg.content);
          msg.content = fa.text; if (fa.actions.length) msg.actions = fa.actions;
          if (cfg.autoApply) (msg.actions || []).forEach(function (a) { doApply(a, true); });
          finish(); return;
        }
        if (!calls.length) { finish(); return; }
        calls.forEach(function (c, i) { if (!c.id) c.id = 'call_' + uid() + i; if (!c.type) c.type = 'function'; });
        msg.tool_calls = calls;
        var needMore = false;
        calls.forEach(function (c) {
          var name = c['function'].name, args = {};
          try { args = c['function'].arguments ? JSON.parse(c['function'].arguments) : {}; } catch (e) { args = {}; }
          var def = TOOL_BY[name];
          var tm = { id: uid(), role: 'tool', tool_call_id: c.id, name: name, at: Date.now() };
          if (!def) { tm.result = { erro: 'Ferramenta desconhecida' }; needMore = true; }
          else if (!def.write) { tm.result = runRead(name, args); tm.read = true; needMore = true; }
          else { tm.action = { id: uid(), tool: name, args: args, status: 'pending' }; if (cfg.autoApply) doApply(tm.action, true); needMore = true; }
          history(ctx).push(tm);
        });
        saveChats();
        if (needMore && depth < 4) { busy = null; runTurn(ctx, p, depth + 1); }
        else finish();
      })
      .catch(function (e) {
        msg.streaming = false;
        if (e && e.name === 'AbortError') { msg.content = (msg.content || '') + (msg.content ? '\n\n' : '') + '_(resposta interrompida)_'; }
        else {
          var h = history(ctx); h.splice(h.indexOf(msg), 1);
          var net = e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e && e.message);
          h.push({ id: uid(), role: 'assistant', error: true, at: Date.now(), content: net ? netError() : 'Não deu certo: ' + (e && e.message || e) });
        }
        finish();
      });
    function finish() {
      if (!msg.content && !msg.tool_calls && !msg.actions) { var h = history(ctx), k = h.indexOf(msg); if (k >= 0) h.splice(k, 1); }
      busy = null; saveChats(); setBusy(false); renderMessages(true);
    }
  }
  function stripPartialAction(t) { var i = t.search(/```(acao|ação)/i); return i >= 0 ? t.slice(0, i) : t; }
  function netError() {
    if (!navigator.onLine) return 'Sem internet agora. O assistente precisa de conexão (menos o Ollama, que roda no seu PC).';
    var pv = prov();
    if (pv.id === 'ollama') return 'Não consegui falar com o Ollama em ' + pv.baseUrl + '. Ele está aberto neste computador? Se a Prancheta estiver aberta pelo site, libere o endereço com OLLAMA_ORIGINS (veja em Configurar IA).';
    return 'Não consegui conectar ao provedor (' + pv.label + '). Confira a internet e o endereço em Configurar IA.';
  }

  function doApply(a, silent) {
    try { a.undo = applyAction(a); a.status = 'applied'; a.err = ''; }
    catch (e) { a.status = 'error'; a.err = e.message || String(e); }
    saveChats();
    if (!silent) {
      if (a.status === 'applied') api.toast('Aplicado: ' + describe(a).title.toLowerCase() + '.', 'Desfazer', function () { doUndo(a); });
      else api.toast(a.err);
      renderMessages(false);
    }
  }
  function doUndo(a) {
    if (a.status !== 'applied') return;
    if (undoAction(a)) { a.status = 'undone'; saveChats(); api.toast('Desfeito.'); } else api.toast('Não foi possível desfazer (o item mudou ou foi apagado).');
    renderMessages(false);
  }
  function findAction(id) {
    var h = view ? history(view.ctx) : [];
    for (var i = 0; i < h.length; i++) {
      if (h[i].action && h[i].action.id === id) return h[i].action;
      if (h[i].actions) for (var j = 0; j < h[i].actions.length; j++) if (h[i].actions[j].id === id) return h[i].actions[j];
    }
    return null;
  }

  // ---------------------------------------------------------------- interface
  function I(n) { return api.icon(n); }
  var CHIPS = [['next', 'Sugira próximas tarefas'], ['gdd', 'Revise meu GDD'], ['mech', 'Ideias de mecânicas'], ['split', 'Quebre esta tarefa em passos']];
  var CHIP_TEXT = {
    next: 'Leia o jogo e sugira as próximas 3 a 5 tarefas mais importantes para avançar, em ordem. Proponha criá-las em "A fazer".',
    gdd: 'Revise o caderno de design (GDD) deste jogo: o que está claro, o que está faltando ou contraditório e 3 perguntas que eu deveria responder. Não invente respostas.',
    mech: 'Sugira 5 ideias de mecânicas que combinam com o que já está registrado neste jogo, com uma frase de por que cada uma funciona. Marque tudo como sugestão.'
  };

  function html(p) {
    var title = p ? p.title : 'Todos os jogos';
    return '<div class="ia" data-ia-root>' +
      '<header class="ia-head">' +
        '<div class="ia-head-t"><div class="eyebrow">Assistente IA</div><h1>' + (p ? 'Conversar sobre ' + api.esc(title) : 'Assistente da Prancheta') + '</h1></div>' +
        '<div class="ia-head-a">' +
          '<button class="btn sm" type="button" data-ia="config" aria-label="Configurar IA">' + I('config') + '<span>Configurar IA</span></button>' +
          '<button class="icon-btn" type="button" data-ia="clear" aria-label="Limpar conversa" title="Limpar conversa">' + I('trash') + '</button>' +
        '</div>' +
      '</header>' +
      (p ? '' : '<div class="ia-ctx"><label class="label" for="iaGame">Jogo</label><select class="select" id="iaGame" data-ia-game><option value="">Geral (todos os jogos)</option>' +
        api.state().projects.filter(function (x) { return !x.archived; }).map(function (x) { return '<option value="' + api.esc(x.id) + '">' + api.esc(x.title) + '</option>'; }).join('') + '</select></div>') +
      '<div class="ia-status" data-ia-status></div>' +
      '<div class="ia-msgs" data-ia-msgs aria-live="polite"></div>' +
      '<div class="ia-dock">' +
        '<div class="ia-chips" role="group" aria-label="Sugestões rápidas">' + CHIPS.map(function (c) { return '<button class="chip" type="button" data-ia-chip="' + c[0] + '">' + api.esc(c[1]) + '</button>'; }).join('') + '</div>' +
        '<form class="ia-compose" data-ia-form>' +
          '<textarea class="textarea" data-ia-input rows="1" placeholder="Pergunte ou peça algo…" aria-label="Mensagem para o assistente"></textarea>' +
          '<button class="ia-send" type="submit" data-ia-send aria-label="Enviar">' + I('send') + '</button>' +
        '</form>' +
        '<label class="ia-auto"><input type="checkbox" data-ia-auto' + (cfg.autoApply ? ' checked' : '') + '> Aplicar mudanças automaticamente</label>' +
      '</div>' +
    '</div>';
  }

  function mount(root, p) {
    view = { root: root, p: p, ctx: p ? p.id : '_geral' };
    var form = root.querySelector('[data-ia-form]'), input = root.querySelector('[data-ia-input]');
    form.addEventListener('submit', function (e) { e.preventDefault(); if (busy) { busy.abort(); return; } var v = input.value; input.value = ''; autosize(input); send(v); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !api.isNarrow()) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    input.addEventListener('input', function () { autosize(input); });
    root.addEventListener('click', onClick);
    var auto = root.querySelector('[data-ia-auto]');
    auto.addEventListener('change', function () { cfg.autoApply = auto.checked; saveCfg(); api.toast(auto.checked ? 'As mudanças propostas serão aplicadas sem perguntar (dá para desfazer).' : 'Cada mudança vai pedir confirmação.'); });
    var gs = root.querySelector('[data-ia-game]');
    if (gs) gs.addEventListener('change', function () { var pr = api.getProject(gs.value); if (pr) api.go(api.projHash(pr, 'ia')); });
    renderStatus(); renderMessages(true); setBusy(!!busy);
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 160) + 'px'; }

  function onClick(e) {
    var b = e.target.closest('[data-ia],[data-ia-chip],[data-ia-act]');
    if (!b || !view) return;
    if (b.dataset.ia === 'config') { openConfig(); return; }
    if (b.dataset.ia === 'clear') {
      api.confirmDialog('Limpar conversa?', 'Apaga as mensagens desta conversa neste aparelho. Os dados do jogo não mudam.', 'Limpar', true).then(function (ok) { if (ok) { chats[view.ctx] = []; saveChats(); renderMessages(true); } });
      return;
    }
    if (b.dataset.iaChip) {
      var k = b.dataset.iaChip;
      if (k === 'split') { pickTask(); return; }
      send(CHIP_TEXT[k]);
      return;
    }
    if (b.dataset.iaAct) {
      var a = findAction(b.dataset.id); if (!a) return;
      if (b.dataset.iaAct === 'apply' && a.status === 'pending') doApply(a);
      else if (b.dataset.iaAct === 'discard' && a.status === 'pending') { a.status = 'discarded'; saveChats(); renderMessages(false); }
      else if (b.dataset.iaAct === 'undo') doUndo(a);
      else if (b.dataset.iaAct === 'retry' && a.status === 'error') { a.status = 'pending'; doApply(a); }
    }
  }
  function pickTask() {
    var p = view.p;
    var open = p ? p.tasks.filter(function (t) { return t.col !== 'done'; }) : [];
    if (!open.length) { var inp = view.root.querySelector('[data-ia-input]'); inp.value = 'Quebre esta tarefa em passos: '; inp.focus(); autosize(inp); return; }
    api.openDialog('<div class="dlg sheet"><h2 id="dialogTitle">Qual tarefa quebrar em passos?</h2><div class="sheet-list ia-pick">' +
      open.slice(0, 30).map(function (t) { return '<button class="sheet-item" data-dlg="t:' + api.esc(t.id) + '">' + I('tarefa') + '<span><b>' + api.esc(t.title) + '</b><small>' + COL_NAMES[t.col] + '</small></span></button>'; }).join('') +
      '</div><div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button></div></div>')
      .then(function (r) {
        if (!r || !r.action || r.action.indexOf('t:') !== 0) return;
        var t = p.tasks.filter(function (x) { return x.id === r.action.slice(2); })[0]; if (!t) return;
        send('Quebre a tarefa "' + t.title + '" (id ' + t.id + ') em passos pequenos e concretos para Godot 4.7.2. Proponha cada passo como uma nova tarefa em "A fazer" (com o título começando pelo nome curto da tarefa original).');
      });
  }

  function renderStatus() {
    if (!view) return;
    var el = view.root.querySelector('[data-ia-status]'); if (!el) return;
    var pv = prov();
    if (!ready()) {
      el.innerHTML = '<div class="ia-setup"><span class="empty-ic">' + I('ia') + '</span><h3>Conecte uma IA para começar</h3><p>Use sua própria chave. O jeito mais fácil e grátis é o Google Gemini: crie a chave no Google AI Studio e cole em Configurar IA.</p><button class="btn primary" type="button" data-ia="config">' + I('config') + 'Configurar IA</button></div>';
      return;
    }
    el.innerHTML = '<div class="ia-conn"><span class="ia-dot' + (navigator.onLine || pv.id === 'ollama' ? '' : ' off') + '"></span>' + api.esc(pv.label.replace(/\s*\(.*\)$/, '')) + ' · <code>' + api.esc(pv.model) + '</code>' + (navigator.onLine || pv.id === 'ollama' ? '' : ' · <b>sem internet</b>') + '</div>';
  }

  function actionCard(a) {
    var d = describe(a);
    var st = a.status;
    var badge = { pending: '', applied: '<span class="badge ok">Aplicado</span>', discarded: '<span class="badge">Descartado</span>', error: '<span class="badge bad">Erro</span>', undone: '<span class="badge">Desfeito</span>' }[st] || '';
    return '<div class="ia-card ' + st + '" data-action-id="' + api.esc(a.id) + '">' +
      '<div class="ia-card-h">' + I(d.icon) + '<b>' + api.esc(d.title) + '</b>' + (d.game ? '<span class="ia-card-g">' + api.esc(d.game) + '</span>' : '') + badge + '</div>' +
      '<dl>' + d.rows.map(function (r) { return '<dt>' + api.esc(r[0]) + '</dt><dd>' + api.esc(cut(r[1], 600)).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl>' +
      (st === 'error' ? '<p class="ia-card-err">' + api.esc(a.err || '') + '</p>' : '') +
      (st === 'pending' ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-act="discard" data-id="' + api.esc(a.id) + '">Descartar</button><button class="btn primary sm" type="button" data-ia-act="apply" data-id="' + api.esc(a.id) + '">Aplicar</button></div>' : '') +
      (st === 'applied' && a.undo ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-act="undo" data-id="' + api.esc(a.id) + '">Desfazer</button></div>' : '') +
      (st === 'error' ? '<div class="ia-card-a"><button class="btn sm" type="button" data-ia-act="retry" data-id="' + api.esc(a.id) + '">Tentar de novo</button></div>' : '') +
    '</div>';
  }

  function renderMessages(stick) {
    if (!view) return;
    var box = view.root.querySelector('[data-ia-msgs]'); if (!box) return;
    renderStatus();
    var h = history(view.ctx);
    if (!h.length) {
      box.innerHTML = ready() ? '<div class="ia-empty"><span class="empty-ic">' + I('ia') + '</span><p>' + (view.p ? 'Pergunte qualquer coisa sobre <b>' + api.esc(view.p.title) + '</b> ou use uma sugestão abaixo. Toda mudança nos dados vira um cartão para você aprovar.' : 'Pergunte sobre seus jogos ou escolha um jogo acima para o assistente ler e propor mudanças nele.') + '</p></div>' : '';
      return;
    }
    var pending = 0, out = '';
    h.forEach(function (m) {
      if (m.role === 'user') out += '<div class="ia-msg user" data-msg="' + m.id + '"><div class="ia-bubble"><div class="ia-text">' + md(m.content) + '</div></div></div>';
      else if (m.role === 'assistant') {
        if (m.error) { out += '<div class="ia-msg bot err" data-msg="' + m.id + '"><div class="ia-bubble"><div class="ia-text">' + md(m.content) + '</div>' + (ready() ? '' : '<button class="btn sm" type="button" data-ia="config">Configurar IA</button>') + '</div></div>'; return; }
        var txt = m.content || '';
        if (txt || m.streaming) out += '<div class="ia-msg bot" data-msg="' + m.id + '"><span class="ia-av" aria-hidden="true">' + I('ia') + '</span><div class="ia-bubble"><div class="ia-text">' + (txt ? md(m.streaming ? stripPartialAction(txt) : txt) : '<span class="ia-typing" aria-label="Pensando"><i></i><i></i><i></i></span>') + '</div></div></div>';
        (m.actions || []).forEach(function (a) { if (a.status === 'pending') pending++; out += '<div class="ia-msg act">' + actionCard(a) + '</div>'; });
      } else if (m.role === 'tool') {
        if (m.action) { if (m.action.status === 'pending') pending++; out += '<div class="ia-msg act">' + actionCard(m.action) + '</div>'; }
        else if (m.read) out += '<div class="ia-note">' + I('search') + (m.name === 'listar_jogos' ? 'Consultou a lista de jogos' : 'Leu os dados do jogo') + '</div>';
      }
    });
    if (pending > 1) out += '<div class="ia-bulk"><button class="btn sm" type="button" data-ia-bulk="discard">Descartar todas</button><button class="btn primary sm" type="button" data-ia-bulk="apply">Aplicar todas (' + pending + ')</button></div>';
    box.innerHTML = out;
    var bulk = box.querySelector('.ia-bulk');
    if (bulk) bulk.addEventListener('click', function (e) {
      var k = e.target.closest('[data-ia-bulk]'); if (!k) return;
      var all = [];
      h.forEach(function (m) { if (m.action && m.action.status === 'pending') all.push(m.action); (m.actions || []).forEach(function (a) { if (a.status === 'pending') all.push(a); }); });
      if (k.dataset.iaBulk === 'apply') { var n = 0; all.forEach(function (a) { doApply(a, true); if (a.status === 'applied') n++; }); api.toast(n + ' mudança(s) aplicada(s).'); }
      else all.forEach(function (a) { a.status = 'discarded'; });
      saveChats(); renderMessages(false);
    });
    if (stick) scrollDown();
  }
  function scrollDown() {
    var last = view && view.root.querySelector('[data-ia-msgs] > :last-child');
    if (last) { var r = last.getBoundingClientRect(), dock = view.root.querySelector('.ia-dock'); var limit = (dock ? dock.getBoundingClientRect().top : innerHeight) - 12; if (r.bottom > limit) window.scrollBy(0, r.bottom - limit); }
  }
  function setBusy(on) {
    if (!view) return;
    var b = view.root.querySelector('[data-ia-send]'); if (!b) return;
    b.classList.toggle('stop', !!on);
    b.innerHTML = I(on ? 'stop' : 'send');
    b.setAttribute('aria-label', on ? 'Parar resposta' : 'Enviar');
    view.root.querySelectorAll('[data-ia-chip]').forEach(function (c) { c.disabled = !!on; });
  }

  // ---------------------------------------------------------------- configurar IA
  function openConfig() {
    var cur = cfg.preset;
    function fields(id) {
      var d = PRESETS[id], v = prov(id);
      return '<div class="field"><label class="label" for="iaKey">Chave de API' + (d.key ? '' : ' (não precisa)') + '</label>' +
          '<div class="ia-key"><input class="input" id="iaKey" name="key" type="password" autocomplete="off" spellcheck="false" placeholder="' + (d.key ? 'Cole sua chave aqui' : 'Sem chave') + '" value="' + api.esc(v.key) + '"' + (d.key ? '' : ' disabled') + '>' +
          '<button class="icon-btn" type="button" data-cfg="show" aria-label="Mostrar ou esconder a chave">' + I('olho') + '</button></div></div>' +
        '<div class="field"><label class="label" for="iaModel">Modelo</label><input class="input" id="iaModel" name="model" autocomplete="off" spellcheck="false" list="iaModels" value="' + api.esc(v.model) + '" placeholder="nome do modelo">' +
          '<datalist id="iaModels">' + d.models.map(function (m) { return '<option value="' + api.esc(m) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field"><label class="label" for="iaUrl">Endereço base (URL)</label><input class="input" id="iaUrl" name="baseUrl" autocomplete="off" spellcheck="false" inputmode="url" value="' + api.esc(v.baseUrl) + '" placeholder="https://…/v1"></div>' +
        '<div class="ia-help">' + d.help + '</div>';
    }
    api.openDialog('<div class="dlg sheet ia-cfg"><h2 id="dialogTitle">Configurar IA</h2>' +
      '<div class="field"><label class="label" for="iaPreset">Provedor</label><select class="select" id="iaPreset" name="preset">' +
        Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + api.esc(PRESETS[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div data-cfg-fields>' + fields(cur) + '</div>' +
      '<div class="ia-test"><button class="btn" type="button" data-cfg="test">' + I('ia') + 'Testar conexão</button><span class="ia-test-r" data-cfg-result role="status"></span></div>' +
      '<p class="ia-privacy">' + I('archive') + '<span>A chave fica salva <b>só neste aparelho e navegador</b>. Ela não vai para o backup exportado nem para o GitHub. Quando você conversa, a mensagem e os dados do jogo que a IA lê são enviados ao provedor escolhido.</span></p>' +
      '<div class="dlg-actions"><button class="btn ghost" data-dlg="cancel">Cancelar</button><button class="btn primary" data-dlg="ok">Salvar</button></div></div>',
      function (d) {
        var sel = d.querySelector('#iaPreset'), box = d.querySelector('[data-cfg-fields]'), res = d.querySelector('[data-cfg-result]');
        var draft = {};
        function keep() { var k = sel.dataset.prev || cur; draft[k] = { key: val('#iaKey'), model: val('#iaModel'), baseUrl: val('#iaUrl') }; }
        function val(q) { var e = d.querySelector(q); return e ? e.value.trim() : ''; }
        sel.dataset.prev = cur;
        sel.addEventListener('change', function () {
          keep(); sel.dataset.prev = sel.value; box.innerHTML = fields(sel.value);
          var dr = draft[sel.value]; if (dr) { if (dr.key) d.querySelector('#iaKey').value = dr.key; if (dr.model) d.querySelector('#iaModel').value = dr.model; if (dr.baseUrl) d.querySelector('#iaUrl').value = dr.baseUrl; }
          res.textContent = ''; res.className = 'ia-test-r';
        });
        d.addEventListener('click', function (e) {
          var b = e.target.closest('[data-cfg]'); if (!b) return;
          if (b.dataset.cfg === 'show') { var k = d.querySelector('#iaKey'); k.type = k.type === 'password' ? 'text' : 'password'; return; }
          if (b.dataset.cfg === 'test') {
            var t = { id: sel.value, needsKey: PRESETS[sel.value].key, key: val('#iaKey'), model: val('#iaModel'), baseUrl: val('#iaUrl').replace(/\/+$/, '') };
            res.className = 'ia-test-r'; res.textContent = 'Testando…'; b.disabled = true;
            testConnection(t).then(function (msg) { res.className = 'ia-test-r ok'; res.textContent = msg; }, function (err) { res.className = 'ia-test-r bad'; res.textContent = err.message || String(err); })
              .then(function () { b.disabled = false; });
          }
        });
      })
      .then(function (r) {
        if (!r || !r.ok) return;
        var id = r.preset;
        cfg.preset = id;
        var d = PRESETS[id], entry = cfg.providers[id] || {};
        entry.key = d.key ? (r.key || '').trim() : '';
        entry.model = (r.model || '').trim() || d.model;
        entry.baseUrl = (r.baseUrl || '').trim().replace(/\/+$/, '') || d.baseUrl;
        if (!entry.key) delete entry.key;
        cfg.providers[id] = entry;
        saveCfg();
        api.toast(ready() ? 'IA configurada: ' + d.label + '.' : 'Configuração salva. Falta a chave de API.');
        renderStatus(); renderMessages(false);
      });
  }

  function testConnection(t) {
    if (!t.baseUrl) return Promise.reject(new Error('Falta o endereço base.'));
    if (!t.model) return Promise.reject(new Error('Falta o nome do modelo.'));
    if (t.needsKey && !t.key) return Promise.reject(new Error('Cole a chave de API primeiro.'));
    if (!navigator.onLine && t.id !== 'ollama') return Promise.reject(new Error('Sem internet agora.'));
    var headers = { 'Content-Type': 'application/json' };
    if (t.key) headers.Authorization = 'Bearer ' + t.key;
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 25000);
    return fetch(t.baseUrl + '/chat/completions', { method: 'POST', headers: headers, signal: ctrl.signal, cache: 'no-store',
      body: JSON.stringify({ model: t.model, messages: [{ role: 'user', content: 'Responda só com a palavra: ok' }], max_tokens: 20 }) })
      .then(function (res) {
        return res.text().then(function (body) {
          if (!res.ok) throw new Error(errorText(res.status, body));
          var j; try { j = JSON.parse(body); } catch (e) { j = null; }
          var reply = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          return 'Conectado! O modelo respondeu' + (reply ? ': “' + cut(String(reply).trim(), 40) + '”' : '.');
        });
      }, function (e) {
        if (e && e.name === 'AbortError') throw new Error('O provedor demorou demais para responder.');
        throw new Error(t.id === 'ollama' ? 'Não achei o Ollama em ' + t.baseUrl + '. Ele precisa estar rodando neste computador e, se a Prancheta estiver aberta pelo site, liberado com OLLAMA_ORIGINS.' : 'Não foi possível conectar (internet, endereço errado ou o provedor não aceita chamadas do navegador).');
      })
      .then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);

  window.PranchetaIA = {
    init: function (a) { api = a; },
    html: html,
    mount: mount,
    // usado só nos testes automatizados
    _md: md, _parseFallback: parseFallbackActions, _cfgKey: CFG_KEY, _chatKey: CHAT_KEY
  };
})();
