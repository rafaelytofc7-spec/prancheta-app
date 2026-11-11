/* Prancheta — Assistente IA (conecta a provedores compatíveis com a API da OpenAI).
   A chave fica só neste aparelho (localStorage "prancheta.ia.v1") e nunca entra no backup. */
(function () {
  'use strict';
  var CFG_KEY = 'prancheta.ia.v1';
  var CHAT_KEY = 'prancheta.ia.chats.v1';
  var MAX_HISTORY = 80;

  var PRESETS = {
    gemini: { label: 'Google Gemini (grátis)', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash', key: true,
      prefer: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      keyUrl: 'https://aistudio.google.com/apikey', keyBtn: 'Abrir Google AI Studio', tag: 'Recomendado · grátis', blurb: 'Grátis com sua conta Google. Bom em português e em planejamento.',
      note: 'A assinatura do app Gemini não inclui API; a chave do AI Studio é separada e tem uso grátis.',
      steps: ['Toque em <b>Abrir Google AI Studio</b> e entre com a mesma conta Google.', 'Toque em <b>Create API key</b> (Criar chave de API) e escolha ou crie um projeto.', 'Copie a chave (começa com <code>AIza</code>) e volte aqui.'],
      help: '<p>Crie a chave grátis no <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. A assinatura do app Gemini não inclui API; a chave do AI Studio é separada e tem uso grátis (com limite por minuto e por dia). No plano grátis o Google pode usar as conversas para melhorar os produtos dele.</p>' },
    groq: { label: 'Groq (grátis)', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b', key: true,
      prefer: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
      keyUrl: 'https://console.groq.com/keys', keyBtn: 'Abrir Groq Console', tag: 'Grátis · muito rápido', blurb: 'Respostas quase instantâneas. Limite por minuto.',
      steps: ['Abra o Groq Console e entre (Google ou e-mail).', 'Toque em <b>Create API Key</b>.', 'Copie a chave (começa com <code>gsk_</code>).'],
      help: '<p>Chave grátis em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a>. Muito rápido; tem limite por minuto.</p>' },
    openrouter: { label: 'OpenRouter (modelos grátis)', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemma-4-31b-it:free', key: true,
      prefer: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free', 'openai/gpt-oss-120b:free', 'openai/gpt-oss-20b:free'],
      keyUrl: 'https://openrouter.ai/keys', keyBtn: 'Abrir OpenRouter', tag: 'Modelos :free', blurb: 'Vários modelos; os que terminam em :free não cobram.',
      steps: ['Abra o OpenRouter e entre.', 'Crie uma chave em <b>Keys</b>.', 'Copie a chave (começa com <code>sk-or-</code>).'],
      help: '<p>Chave em <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a>. Modelos <code>:free</code> não cobram, mas a lista muda e o limite diário é baixo.</p>' },
    hf: { label: 'Hugging Face (precisa de créditos)', name: 'Hugging Face', baseUrl: 'https://router.huggingface.co/v1', model: 'openai/gpt-oss-120b', key: true,
      prefer: ['openai/gpt-oss-120b', 'Qwen/Qwen3.8-27B', 'openai/gpt-oss-20b'],
      keyUrl: 'https://huggingface.co/settings/tokens', keyBtn: 'Abrir Hugging Face', tag: 'Precisa de créditos', blurb: 'Muitos modelos abertos. Sem créditos na conta dá erro 402.',
      note: 'O roteador do Hugging Face cobra por uso: sem créditos na conta ele responde “402 – pagamento necessário”.',
      steps: ['Abra Settings → Access Tokens no Hugging Face.', 'Crie um token com a permissão <b>Make calls to Inference Providers</b>.', 'Copie o token (começa com <code>hf_</code>).'],
      help: '<p>Token em <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">huggingface.co/settings/tokens</a>. Precisa de créditos na conta (erro 402 = sem créditos).</p>' },
    openai: { label: 'OpenAI (pago)', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5-mini', key: true,
      prefer: ['gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini'],
      keyUrl: 'https://platform.openai.com/api-keys', keyBtn: 'Abrir OpenAI', tag: 'Pago', blurb: 'Cobra por uso (a assinatura do ChatGPT não inclui API).',
      steps: ['Abra a página de chaves da OpenAI.', 'Crie uma chave secreta.', 'Copie a chave (começa com <code>sk-</code>).'],
      help: '<p>Chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a>. Cobra por uso.</p>' },
    ollama: { label: 'Ollama (no PC, sem chave)', name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'dolphin3', key: false, prefer: [],
      tag: 'No seu PC · sem chave', blurb: 'Usa o modelo que roda no seu Linux Mint. Não funciona no celular.',
      steps: ['No PC, abra o terminal e deixe o Ollama rodando (<code>ollama serve</code>).', 'Se a Prancheta estiver aberta pelo site, libere o endereço: <code>OLLAMA_ORIGINS=https://rafaelytofc7-spec.github.io ollama serve</code>.', 'Volte aqui e toque em <b>Conectar</b>: o app escolhe o modelo sozinho (ex.: dolphin).'],
      help: '<p>Só funciona no computador onde o Ollama está rodando (não no celular). Se a Prancheta estiver aberta pelo site (https), rode <code>OLLAMA_ORIGINS=https://rafaelytofc7-spec.github.io ollama serve</code> e permita o acesso à rede local se o Chrome pedir. Modelos sem ferramentas usam o modo simples automaticamente.</p>' },
    custom: { label: 'Outro (compatível com OpenAI)', name: 'Outro', baseUrl: '', model: '', key: true, prefer: [],
      tag: 'Avançado', blurb: 'Qualquer serviço com /chat/completions no formato da OpenAI.',
      steps: ['Pegue o endereço base (termina em /v1) e a chave no site do serviço.'],
      help: '<p>Qualquer serviço com o endpoint <code>/chat/completions</code> no formato da OpenAI.</p>' }
  };
  var WIZ_ORDER = ['gemini', 'groq', 'openrouter', 'hf', 'openai', 'ollama', 'custom'];
  var MAX_STEPS = 8;

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
    c.mode = c.mode === 'agente' ? 'agente' : 'chat';
    return c;
  }
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* sem espaço */ } }
  function loadChats() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}') || {}; } catch (e) { c = {}; }
    if (typeof c !== 'object') c = {};
    Object.keys(c).forEach(function (k) {
      if (!Array.isArray(c[k])) { delete c[k]; return; }
      c[k] = c[k].filter(function (m) {
        if (m && m.role === 'run' && !m.done) { m.done = true; (m.steps || []).forEach(function (st) { if (st.state === 'run') st.state = 'stop'; }); }
        if (m && m.streaming) { m.streaming = false; return !!(m.content || m.tool_calls); } return !!m;
      });
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
    return { id: id, label: d.label, name: d.name, needsKey: d.key, key: s.key || '', baseUrl: (s.baseUrl || d.baseUrl || '').replace(/\/+$/, ''), model: s.model || d.model || '', verified: s.verified || null };
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
  var colArg = { type: 'string', enum: ['todo', 'doing', 'done'], description: 'todo = A fazer, doing = Em andamento, done = Feito' };
  var TOOLS = [
    { name: 'listar_jogos', write: false, description: 'Lista todos os jogos da Prancheta (id, título, fase, motor, tarefas abertas).', parameters: { type: 'object', properties: {} } },
    { name: 'ler_jogo', write: false, description: 'Lê os dados completos de um jogo: pitch, GDD, mecânicas, personagens, níveis, arte, técnica, tarefas (com id e coluna), marcos e ideias.', parameters: { type: 'object', properties: { jogo_id: gameArg } } },
    { name: 'buscar', write: false, description: 'Busca um texto em todos os jogos (ou em um): tarefas, marcos, mecânicas, personagens, níveis, ideias, assets e GDD.', parameters: { type: 'object', properties: { texto: { type: 'string' }, jogo_id: gameArg }, required: ['texto'] } },
    { name: 'resumo_progresso', write: false, description: 'Resume o progresso: tarefas por coluna, % feito, marcos (atrasados ou próximos), mecânicas e arte por estado. Sem jogo_id e sem jogo aberto, resume todos.', parameters: { type: 'object', properties: { jogo_id: gameArg } } },
    { name: 'criar_tarefa', write: true, description: 'Propõe uma nova tarefa no quadro de produção.', parameters: { type: 'object', properties: { jogo_id: gameArg, titulo: { type: 'string' }, notas: { type: 'string', description: 'detalhes ou passos (opcional)' }, coluna: colArg, marco: { type: 'string', description: 'id ou título de um marco existente (opcional)' } }, required: ['titulo'] } },
    { name: 'atualizar_tarefa', write: true, description: 'Propõe editar uma tarefa existente: título, notas e/ou prioridade (a prioridade vai na primeira linha das notas).', parameters: { type: 'object', properties: { jogo_id: gameArg, tarefa: { type: 'string', description: 'id da tarefa (de ler_jogo) ou o título exato' }, titulo: { type: 'string', description: 'novo título (opcional)' }, notas: { type: 'string', description: 'novas notas, substitui as atuais (opcional)' }, prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] } }, required: ['tarefa'] } },
    { name: 'mover_tarefa', write: true, description: 'Propõe mover uma tarefa existente para outra coluna.', parameters: { type: 'object', properties: { jogo_id: gameArg, tarefa: { type: 'string', description: 'id da tarefa (de ler_jogo) ou o título exato' }, coluna: colArg }, required: ['tarefa', 'coluna'] } },
    { name: 'criar_ideia', write: true, description: 'Propõe guardar uma ideia na Caixa de ideias.', parameters: { type: 'object', properties: { jogo_id: gameArg, texto: { type: 'string' } }, required: ['texto'] } },
    { name: 'criar_mecanica', write: true, description: 'Propõe uma nova mecânica.', parameters: { type: 'object', properties: { jogo_id: gameArg, nome: { type: 'string' }, descricao: { type: 'string' }, estado: { type: 'string', enum: ['ideia', 'definir', 'andamento', 'pronto'] } }, required: ['nome'] } },
    { name: 'criar_personagem', write: true, description: 'Propõe um novo personagem ou criatura.', parameters: { type: 'object', properties: { jogo_id: gameArg, nome: { type: 'string' }, papel: { type: 'string', description: 'protagonista, inimigo, chefe, NPC…' }, habilidades: { type: 'string', description: 'habilidades e comportamento' } }, required: ['nome'] } },
    { name: 'atualizar_gdd', write: true, description: 'Propõe escrever num campo do caderno de design (GDD).', parameters: { type: 'object', properties: { jogo_id: gameArg, campo: { type: 'string', enum: Object.keys(GDD_FIELDS), description: 'premise = premissa, loop = loop de jogabilidade, tone = tom, world = mundo, references = referências, notes = notas' }, texto: { type: 'string' }, modo: { type: 'string', enum: ['acrescentar', 'substituir'], description: 'acrescentar (padrão) adiciona ao fim; substituir troca o texto todo' } }, required: ['campo', 'texto'] } },
    { name: 'criar_marco', write: true, description: 'Propõe um novo marco de produção (meta maior, com prazo opcional).', parameters: { type: 'object', properties: { jogo_id: gameArg, titulo: { type: 'string' }, prazo: { type: 'string', description: 'data AAAA-MM-DD (opcional)' } }, required: ['titulo'] } },
    { name: 'criar_marco_com_tarefas', write: true, description: 'Propõe um marco já com tarefas novas ligadas a ele e/ou ligando tarefas existentes.', parameters: { type: 'object', properties: { jogo_id: gameArg, titulo: { type: 'string' }, prazo: { type: 'string', description: 'AAAA-MM-DD (opcional)' },
      tarefas: { type: 'array', description: 'tarefas novas do marco', items: { type: 'object', properties: { titulo: { type: 'string' }, notas: { type: 'string' }, coluna: colArg }, required: ['titulo'] } },
      ligar_tarefas: { type: 'array', description: 'ids ou títulos de tarefas existentes para ligar ao marco', items: { type: 'string' } } }, required: ['titulo'] } }
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
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function search(q, only) {
    var n = fold(q).trim(), out = [];
    if (!n) return { erro: 'Texto vazio.' };
    var games = only ? [only] : api.state().projects;
    games.forEach(function (p) {
      function hit(tipo, id, txt) { if (out.length < 30 && fold(txt).indexOf(n) >= 0) out.push({ jogo_id: p.id, jogo: p.title, tipo: tipo, id: id || undefined, texto: cut(txt, 160) }); }
      hit('jogo', p.id, p.title + ' — ' + (p.logline || ''));
      p.tasks.forEach(function (t) { hit('tarefa (' + (COL_NAMES[t.col] || t.col) + ')', t.id, t.title + (t.notes ? ' — ' + t.notes : '')); });
      p.milestones.forEach(function (m) { hit('marco', m.id, m.title); });
      p.mechanics.forEach(function (m) { hit('mecânica', m.id, m.name + (m.desc ? ' — ' + m.desc : '')); });
      p.characters.forEach(function (c) { hit('personagem', c.id, c.name + ' — ' + (c.role || '') + ' ' + (c.abilities || '')); });
      p.levels.forEach(function (l) { hit('nível', l.id, l.name + ' — ' + (l.purpose || '')); });
      p.ideas.forEach(function (i) { hit('ideia', i.id, i.text); });
      p.assets.forEach(function (a) { hit('asset', a.id, a.name + ' ' + (a.type || '')); });
      Object.keys(GDD_FIELDS).forEach(function (k) { if (fold(p.gdd[k]).indexOf(n) >= 0 && out.length < 30) { var t = String(p.gdd[k]), i = fold(t).indexOf(n); out.push({ jogo_id: p.id, jogo: p.title, tipo: 'GDD: ' + GDD_FIELDS[k], texto: '…' + t.slice(Math.max(0, i - 60), i + 100) + '…' }); } });
    });
    return { busca: q, resultados: out, total: out.length };
  }
  function progress(p) {
    var hoje = new Date().toISOString().slice(0, 10), by = { todo: 0, doing: 0, done: 0 };
    p.tasks.forEach(function (t) { by[t.col] = (by[t.col] || 0) + 1; });
    var total = p.tasks.length;
    function count(list, key) { var o = {}; list.forEach(function (x) { o[x[key] || '?'] = (o[x[key] || '?'] || 0) + 1; }); return o; }
    return {
      jogo_id: p.id, jogo: p.title, fase: p.phase,
      tarefas: { a_fazer: by.todo, em_andamento: by.doing, feito: by.done, total: total, pct_feito: total ? Math.round(by.done * 100 / total) : 0 },
      em_andamento: p.tasks.filter(function (t) { return t.col === 'doing'; }).map(function (t) { return t.title; }).slice(0, 10),
      marcos: p.milestones.map(function (m) {
        var ts = p.tasks.filter(function (t) { return t.milestoneId === m.id; });
        return { titulo: m.title, prazo: m.due || '', feito: !!m.done, atrasado: !m.done && !!m.due && m.due < hoje, tarefas: ts.length, tarefas_feitas: ts.filter(function (t) { return t.col === 'done'; }).length };
      }),
      mecanicas_por_estado: count(p.mechanics, 'status'), arte_dos_personagens: count(p.characters, 'artStatus'), assets_por_estado: count(p.assets, 'status'),
      ideias: p.ideas.length, gdd_vazio: Object.keys(GDD_FIELDS).filter(function (k) { return !String(p.gdd[k] || '').trim(); }).map(function (k) { return GDD_FIELDS[k]; })
    };
  }
  function runRead(name, args) {
    if (name === 'listar_jogos') return { jogos: listGames() };
    if (name === 'buscar') return search(args.texto, args.jogo_id ? targetGame(args) : null);
    if (name === 'resumo_progresso') {
      var pp = args.jogo_id || (view && view.p) ? targetGame(args) : null;
      return pp ? progress(pp) : { jogos: api.state().projects.filter(function (x) { return !x.archived; }).map(progress) };
    }
    var p = targetGame(args);
    if (!p) return { erro: 'Nenhum jogo aberto. Use listar_jogos e passe jogo_id.' };
    return gameSummary(p, true);
  }
  // rótulo do passo na linha do tempo do agente
  function readStepLabel(name, args) {
    var p = targetGame(args || {});
    if (name === 'listar_jogos') return 'Vendo a lista de jogos';
    if (name === 'buscar') return 'Buscando “' + cut(args.texto, 40) + '”';
    if (name === 'resumo_progresso') return 'Resumindo o progresso' + (p ? ' de ' + p.title : '');
    return 'Lendo o jogo' + (p ? ' “' + p.title + '”' : '');
  }

  var TITLES = { criar_tarefa: 'Nova tarefa', atualizar_tarefa: 'Editar tarefa', mover_tarefa: 'Mover tarefa', criar_ideia: 'Nova ideia', criar_mecanica: 'Nova mecânica', criar_personagem: 'Novo personagem', atualizar_gdd: 'Atualizar GDD', criar_marco: 'Novo marco', criar_marco_com_tarefas: 'Novo marco com tarefas' };
  var ICON_OF = { criar_tarefa: 'tarefa', atualizar_tarefa: 'edit', mover_tarefa: 'producao', criar_ideia: 'ideias', criar_mecanica: 'mecanicas', criar_personagem: 'personagens', atualizar_gdd: 'design', criar_marco: 'flag', criar_marco_com_tarefas: 'flag' };
  var PRIO = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  // descreve a ação para o cartão
  function describe(a) {
    var g = a.args || {}, p = targetGame(g), rows = [], main = '';
    if (a.tool === 'criar_tarefa') { main = g.titulo; rows.push(['Tarefa', g.titulo]); rows.push(['Coluna', COL_NAMES[g.coluna] || 'A fazer']); if (g.notas) rows.push(['Notas', g.notas]); if (g.marco) rows.push(['Marco', g.marco]); }
    else if (a.tool === 'atualizar_tarefa') { var tu = p && findTask(p, g.tarefa); main = tu ? tu.title : g.tarefa; rows.push(['Tarefa', main]); if (g.titulo) rows.push(['Novo título', g.titulo]); if (g.prioridade) rows.push(['Prioridade', PRIO[g.prioridade] || g.prioridade]); if (g.notas) rows.push(['Notas novas', g.notas]); }
    else if (a.tool === 'mover_tarefa') { var t = p && findTask(p, g.tarefa); main = (t ? t.title : g.tarefa) + ' → ' + (COL_NAMES[g.coluna] || g.coluna); rows.push(['Tarefa', t ? t.title : g.tarefa]); rows.push(['Para', COL_NAMES[g.coluna] || g.coluna]); }
    else if (a.tool === 'criar_ideia') { main = g.texto; rows.push(['Ideia', g.texto]); }
    else if (a.tool === 'criar_mecanica') { main = g.nome; rows.push(['Nome', g.nome]); if (g.descricao) rows.push(['Descrição', g.descricao]); rows.push(['Estado', MECH_NAMES[g.estado] || 'Ideia']); }
    else if (a.tool === 'criar_personagem') { main = g.nome; rows.push(['Nome', g.nome]); if (g.papel) rows.push(['Papel', g.papel]); if (g.habilidades) rows.push(['Habilidades', g.habilidades]); }
    else if (a.tool === 'atualizar_gdd') { main = GDD_FIELDS[g.campo] || g.campo; rows.push(['Campo', GDD_FIELDS[g.campo] || g.campo]); rows.push(['Modo', g.modo === 'substituir' ? 'Substituir o texto' : 'Acrescentar ao fim']); rows.push(['Texto', g.texto]); }
    else if (a.tool === 'criar_marco') { main = g.titulo; rows.push(['Marco', g.titulo]); if (g.prazo) rows.push(['Prazo', g.prazo]); }
    else if (a.tool === 'criar_marco_com_tarefas') {
      var nt = Array.isArray(g.tarefas) ? g.tarefas : [], lk = Array.isArray(g.ligar_tarefas) ? g.ligar_tarefas : [];
      main = g.titulo + ' (' + (nt.length + lk.length) + ' tarefas)'; rows.push(['Marco', g.titulo]); if (g.prazo) rows.push(['Prazo', g.prazo]);
      if (nt.length) rows.push(['Tarefas novas', nt.map(function (x) { return '• ' + (x && (x.titulo || x.title) || x); }).join('\n')]);
      if (lk.length) rows.push(['Ligar existentes', lk.map(function (r) { var tt = p && findTask(p, r); return '• ' + (tt ? tt.title : r); }).join('\n')]);
    }
    return { title: TITLES[a.tool] || a.tool, icon: ICON_OF[a.tool] || 'ia', rows: rows, main: String(main || ''), game: p ? p.title : '' };
  }

  // aplica uma ação; devolve as operações para desfazer (nada é apagado dos dados do usuário)
  function applyAction(a) {
    var g = a.args || {}, p = targetGame(g);
    if (!p) throw new Error('Abra um jogo (ou peça para a IA indicar qual) antes de aplicar.');
    var s = function (v) { return String(v == null ? '' : v).trim(); };
    var ops = [];
    function newTask(x, ms) {
      if (!s(x.titulo)) throw new Error('Tarefa sem título.');
      var t = { id: uid(), title: s(x.titulo).slice(0, 200), notes: s(x.notas), col: COL_NAMES[x.coluna] ? x.coluna : 'todo', milestoneId: ms || '', createdAt: api.now() };
      p.tasks.push(t); ops.push({ remove: 'tasks', id: t.id }); return t;
    }
    function findMs(ref) { var r = s(ref).toLowerCase(); return p.milestones.filter(function (m) { return m.id === ref || m.title.toLowerCase() === r; })[0]; }
    switch (a.tool) {
      case 'criar_tarefa': { var mm = g.marco ? findMs(g.marco) : null; newTask(g, mm ? mm.id : ''); break; }
      case 'atualizar_tarefa': {
        var tu = findTask(p, g.tarefa); if (!tu) throw new Error('Não achei a tarefa “' + s(g.tarefa) + '”.');
        if (!s(g.titulo) && g.notas == null && !PRIO[g.prioridade]) throw new Error('Nada para mudar nesta tarefa.');
        ops.push({ task: tu.id, title: tu.title, notes: tu.notes });
        if (s(g.titulo)) tu.title = s(g.titulo).slice(0, 200);
        var notes = g.notas != null ? s(g.notas) : (tu.notes || '');
        if (PRIO[g.prioridade]) notes = 'Prioridade: ' + PRIO[g.prioridade] + (notes.replace(/^Prioridade:[^\n]*\n?/i, '') ? '\n' + notes.replace(/^Prioridade:[^\n]*\n?/i, '') : '');
        tu.notes = notes; break;
      }
      case 'mover_tarefa': {
        var tk = findTask(p, g.tarefa); if (!tk) throw new Error('Não achei a tarefa “' + s(g.tarefa) + '”.');
        if (!COL_NAMES[g.coluna]) throw new Error('Coluna inválida.');
        ops.push({ move: { id: tk.id, col: tk.col, index: p.tasks.indexOf(tk) } });
        api.moveTask(p, tk, g.coluna); break;
      }
      case 'criar_ideia': {
        if (!s(g.texto)) throw new Error('Ideia vazia.');
        var i = { id: uid(), text: s(g.texto), createdAt: api.now() }; p.ideas.push(i); ops.push({ remove: 'ideas', id: i.id }); break;
      }
      case 'criar_mecanica': {
        if (!s(g.nome)) throw new Error('Mecânica sem nome.');
        var m = { id: uid(), name: s(g.nome), desc: s(g.descricao), status: MECH_NAMES[g.estado] ? g.estado : 'ideia' }; p.mechanics.unshift(m); ops.push({ remove: 'mechanics', id: m.id }); break;
      }
      case 'criar_personagem': {
        if (!s(g.nome)) throw new Error('Personagem sem nome.');
        var c = { id: uid(), name: s(g.nome), role: s(g.papel), abilities: s(g.habilidades), artStatus: 'faltando' }; p.characters.unshift(c); ops.push({ remove: 'characters', id: c.id }); break;
      }
      case 'atualizar_gdd': {
        if (!GDD_FIELDS[g.campo]) throw new Error('Campo do GDD inválido.');
        var prev = p.gdd[g.campo] || '';
        p.gdd[g.campo] = g.modo === 'substituir' ? s(g.texto) : (prev.trim() ? prev.replace(/\s+$/, '') + '\n\n' + s(g.texto) : s(g.texto));
        ops.push({ gdd: { field: g.campo, prev: prev } }); break;
      }
      case 'criar_marco':
      case 'criar_marco_com_tarefas': {
        if (!s(g.titulo)) throw new Error('Marco sem título.');
        var due = /^\d{4}-\d{2}-\d{2}$/.test(s(g.prazo)) ? s(g.prazo) : '';
        var ml = { id: uid(), title: s(g.titulo), due: due, done: false }; p.milestones.push(ml); ops.push({ remove: 'milestones', id: ml.id });
        if (a.tool === 'criar_marco_com_tarefas') {
          (Array.isArray(g.tarefas) ? g.tarefas : []).forEach(function (x) { if (typeof x === 'string') x = { titulo: x }; if (x && s(x.titulo)) newTask(x, ml.id); });
          (Array.isArray(g.ligar_tarefas) ? g.ligar_tarefas : []).forEach(function (r) { var t = findTask(p, r); if (t) { ops.push({ link: { id: t.id, prev: t.milestoneId || '' } }); t.milestoneId = ml.id; } });
        }
        break;
      }
      default: throw new Error('Ação desconhecida.');
    }
    api.touch(p); api.refreshSide();
    return { game: p.id, ops: ops };
  }
  function undoAction(a) {
    var u = a.undo; if (!u) return false;
    var p = api.getProject(u.game); if (!p) return false;
    var ops = u.ops || [u], ok = true; // u sem ops = formato antigo (v1.2)
    ops.slice().reverse().forEach(function (o) {
      var list = o.remove || o.list;
      if (list) { var arr = p[list], k = arr.map(function (x) { return x.id; }).indexOf(o.id); if (k < 0) ok = false; else arr.splice(k, 1); }
      else if (o.move) { var t = p.tasks.filter(function (x) { return x.id === o.move.id; })[0]; if (!t) { ok = false; return; } p.tasks.splice(p.tasks.indexOf(t), 1); t.col = o.move.col; p.tasks.splice(Math.min(o.move.index, p.tasks.length), 0, t); }
      else if (o.gdd) p.gdd[o.gdd.field] = o.gdd.prev;
      else if (o.task) { var tt = p.tasks.filter(function (x) { return x.id === o.task; })[0]; if (!tt) ok = false; else { tt.title = o.title; tt.notes = o.notes; } }
      else if (o.link) { var tl = p.tasks.filter(function (x) { return x.id === o.link.id; })[0]; if (tl) tl.milestoneId = o.link.prev; }
    });
    api.touch(p); api.refreshSide();
    return ok;
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
      '- Você é um agente: pode chamar várias ferramentas em sequência (até ' + MAX_STEPS + ' passos por pedido). Leia antes de propor (ler_jogo, buscar, resumo_progresso).',
      '- Para um objetivo grande: 1) leia o necessário; 2) escreva um plano curto e numerado; 3) proponha as mudanças de uma vez (várias chamadas na mesma resposta viram um lote para o usuário revisar); 4) termine com um resumo curto do que propôs.',
      '- Proponha no máximo 12 ações por pedido e não repita propostas já feitas. Prefira criar_marco_com_tarefas quando várias tarefas formam uma meta.',
      '- Você não pode apagar nada; não existe ferramenta de exclusão. Se algo precisar sair, sugira que o usuário faça isso.',
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
    var h = history(ctx).filter(function (m) { return !m.error && m.role !== 'run'; }).slice(-40);
    // não começa no meio de uma sequência de ferramentas
    while (h.length && h[0].role === 'tool') h.shift();
    h.forEach(function (m) {
      if (m.role === 'user') msgs.push({ role: 'user', content: m.goal ? goalPrompt(m.content) : m.content });
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
  function goalPrompt(g) {
    return 'OBJETIVO (modo agente): ' + g + '\n\nTrabalhe sozinho em passos, sem me pedir confirmação no meio: leia os dados de que precisar, escreva um plano curto numerado e proponha de uma vez as mudanças concretas (tarefas, marcos com tarefas, mecânicas, ideias, campos do GDD) usando as ferramentas. Eu reviso tudo num lote no fim. Termine com um resumo de 2–4 linhas do que propôs. Marque como sugestão o que não está nos dados.';
  }
  function statusWord(a) { return { pending: 'aguardando confirmação', applied: 'aplicada pelo usuário', discarded: 'descartada pelo usuário', error: 'falhou', undone: 'desfeita pelo usuário' }[a.status] || a.status; }

  // ---------------------------------------------------------------- chamada ao provedor (com streaming)
  function rawMsg(body) {
    var msg = '';
    try { var j = JSON.parse(body); if (Array.isArray(j)) j = j[0]; msg = (j && j.error && (j.error.message || j.error)) || (j && j.message) || ''; } catch (e) { msg = String(body || '').slice(0, 200); }
    return typeof msg === 'string' ? msg : JSON.stringify(msg);
  }
  // explica o erro em português simples; kind ajuda a decidir o que fazer
  function explain(status, body, pid) {
    var msg = rawMsg(body), low = (msg + ' ' + (body || '')).toLowerCase(), name = PRESETS[pid] ? PRESETS[pid].name : 'provedor';
    var kind = 'other', text;
    if (status === 401 || status === 403 || (status === 400 && /api.?key|api_key_invalid|invalid.*key|key.*invalid|unauthori[sz]ed/.test(low))) {
      kind = 'key'; text = 'Chave inválida: o ' + name + ' não aceitou essa chave. Confira se copiou ela inteira' + (pid === 'gemini' ? ' (começa com AIza)' : '') + ' ou gere uma nova.';
    } else if (status === 402 || /insufficient.?(credit|balance|quota)|payment required|billing/.test(low) && status !== 429) {
      kind = 'credit'; text = 'Sem créditos: a conta do ' + name + ' não tem saldo para usar a API (erro 402). Adicione créditos lá ou use o Google Gemini, que tem uso grátis.';
    } else if (status === 429) {
      kind = 'quota'; text = 'Limite de uso atingido (cota grátis por minuto ou por dia do ' + name + '). Espere um pouco e tente de novo' + (/day|daily|dia|per.?day|perday/.test(low) ? '; se for a cota do dia, ela volta amanhã.' : '.');
    } else if (status === 404 || (status === 400 && /model.*(not|n[aã]o).*(found|exist|supported)|unknown model|is not found/.test(low))) {
      kind = 'model'; text = 'Modelo não encontrado neste provedor. Toque em Conectar IA para o app escolher um modelo que funciona.';
    } else if (status >= 500) {
      kind = 'server'; text = 'O ' + name + ' está instável agora (erro ' + status + '). Tente de novo em instantes.';
    } else text = 'O ' + name + ' recusou o pedido (erro ' + status + ').';
    return { kind: kind, text: text + (msg && kind !== 'key' ? ' (' + cut(msg, 160) + ')' : ''), retryAfter: retryAfter(body) };
  }
  function retryAfter(body) {
    var b = String(body || ''), m = b.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || b.match(/try again in (\d+(?:\.\d+)?)\s*s/i) || b.match(/retry(?:[ _-]?after)?\D{0,12}(\d+(?:\.\d+)?)\s*s/i);
    return m ? Math.ceil(parseFloat(m[1])) : 0;
  }
  function errorText(status, body) { return explain(status, body, cfg.preset).text; }
  function httpError(res, body, pid) {
    var x = explain(res.status, body, pid), e = new Error(x.text);
    e.status = res.status; e.body = body; e.kind = x.kind;
    var h = 0; try { h = parseInt(res.headers.get('retry-after'), 10) || 0; } catch (er) { h = 0; }
    e.retryAfter = h || x.retryAfter; return e;
  }
  function looksLikeNoTools(status, body) { return status >= 400 && status < 500 && status !== 401 && status !== 402 && status !== 403 && status !== 429 && /tool|function/i.test(body || ''); }
  function wait(ms, signal) {
    return new Promise(function (res, rej) {
      var t = setTimeout(res, ms);
      if (signal) signal.addEventListener('abort', function () { clearTimeout(t); var e = new Error('abortado'); e.name = 'AbortError'; rej(e); }, { once: true });
    });
  }
  function authHeaders(pv) {
    var h = { 'Content-Type': 'application/json' };
    if (pv.key) h.Authorization = 'Bearer ' + pv.key;
    if (pv.id === 'openrouter') h['X-Title'] = 'Prancheta';
    return h;
  }

  // onRetry(segundos, tentativa) é chamado antes de esperar quando o provedor responde 429
  function callModel(messages, useTools, signal, onDelta, onRetry) {
    var pv = prov();
    var body = { model: pv.model, messages: messages, stream: true };
    if (useTools) { body.tools = toolsPayload(); body.tool_choice = 'auto'; }
    var attempt = 0;
    function go() {
      return fetch(pv.baseUrl + '/chat/completions', { method: 'POST', headers: authHeaders(pv), body: JSON.stringify(body), signal: signal, cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) return res.text().then(function (t) {
            var e = httpError(res, t, pv.id);
            if (res.status === 429 && attempt < 2) {
              var sec = Math.min(Math.max(e.retryAfter || [5, 15][attempt], 1), 40);
              attempt++; if (onRetry) onRetry(sec, attempt);
              return wait(sec * 1000, signal).then(go);
            }
            throw e;
          });
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
    return go();
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

  // ---------------------------------------------------------------- conversa / agente
  var NOUN = { criar_tarefa: ['tarefa', 'tarefas'], atualizar_tarefa: ['edição de tarefa', 'edições de tarefas'], mover_tarefa: ['movimento de tarefa', 'movimentos de tarefas'], criar_ideia: ['ideia', 'ideias'], criar_mecanica: ['mecânica', 'mecânicas'], criar_personagem: ['personagem', 'personagens'], atualizar_gdd: ['mudança no GDD', 'mudanças no GDD'], criar_marco: ['marco', 'marcos'], criar_marco_com_tarefas: ['marco com tarefas', 'marcos com tarefas'] };
  function proposeLabel(actions) {
    var n = actions.length, same = actions.every(function (a) { return a.tool === actions[0].tool; });
    var w = same && NOUN[actions[0].tool] ? NOUN[actions[0].tool][n === 1 ? 0 : 1] : (n === 1 ? 'mudança' : 'mudanças');
    return 'Propondo ' + n + ' ' + w;
  }
  function addStep(run, label, state) { var st = { label: label, state: state || 'run' }; run.steps.push(st); return st; }

  function send(text, goal) {
    text = String(text || '').trim();
    if (!text || busy || !view) return;
    if (!ready()) { openWizard(); return; }
    if (goal == null) goal = cfg.mode === 'agente';
    var ctx = view.ctx, p = view.p;
    history(ctx).push({ id: uid(), role: 'user', content: text, goal: !!goal || undefined, at: Date.now() });
    var run = { id: uid(), role: 'run', steps: [], done: false, goal: !!goal, at: Date.now() };
    history(ctx).push(run);
    saveChats(); renderMessages(true);
    runTurn(ctx, p, run, 0);
  }

  function runTurn(ctx, p, run, depth) {
    var pv = prov();
    var fallback = !!cfg.noTools[pv.id + '|' + pv.model];
    var step = addStep(run, depth === 0 ? (run.goal ? 'Planejando o objetivo…' : 'Pensando…') : 'Planejando o próximo passo…');
    var msg = { id: uid(), role: 'assistant', content: '', at: Date.now(), streaming: true, run: run.id };
    history(ctx).push(msg);
    busy = busy || new AbortController();
    var signal = busy.signal;
    setBusy(true); renderMessages(true);
    var raf = 0;
    function onDelta(d) {
      msg.content += d;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var bubble = view && view.root.querySelector('[data-msg="' + msg.id + '"] .ia-text');
        if (bubble) { bubble.innerHTML = md(fallback ? stripPartialAction(msg.content) : msg.content); scrollDown(); }
        else renderMessages(true);
      });
    }
    function onRetry(sec) { step.label = 'Limite do provedor atingido: tentando de novo em ' + sec + ' s…'; step.state = 'wait'; renderMessages(true); }
    callModel(apiMessages(ctx, p, fallback), !fallback, signal, onDelta, onRetry)
      .catch(function (e) {
        if (!fallback && e.status && looksLikeNoTools(e.status, e.body)) {
          cfg.noTools[pv.id + '|' + pv.model] = true; saveCfg();
          msg.content = ''; fallback = true;
          return callModel(apiMessages(ctx, p, true), false, signal, onDelta, onRetry);
        }
        throw e;
      })
      .then(function (r) {
        msg.streaming = false; step.state = 'ok';
        if (/^Limite/.test(step.label)) step.label = 'Tentou de novo após o limite';
        else step.label = step.label.replace(/…$/, '');
        msg.content = r.content || msg.content || '';
        var calls = (r.tool_calls || []).filter(function (c) { return c && c['function'] && c['function'].name; });
        if (fallback) {
          var fa = parseFallbackActions(msg.content);
          msg.content = fa.text;
          if (fa.actions.length) { fa.actions.forEach(function (a) { a.run = run.id; a.selected = true; }); msg.actions = fa.actions; addStep(run, proposeLabel(fa.actions), 'ok'); }
          if (cfg.autoApply) (msg.actions || []).forEach(function (a) { doApply(a, true); });
          finish(); return;
        }
        if (!calls.length) { if (depth > 0) step.label = run.goal ? 'Escreveu o resumo' : 'Respondeu'; finish(); return; }
        if (depth > 0 && !msg.content) { var si = run.steps.indexOf(step); if (si >= 0) run.steps.splice(si, 1); }
        else if (depth > 0) step.label = 'Escreveu o plano';
        calls.forEach(function (c, i) { if (!c.id) c.id = 'call_' + uid() + i; if (!c.type) c.type = 'function'; });
        msg.tool_calls = calls;
        var writes = [];
        calls.forEach(function (c) {
          var name = c['function'].name, args = {};
          try { args = c['function'].arguments ? JSON.parse(c['function'].arguments) : {}; } catch (e) { args = {}; }
          if (!args || typeof args !== 'object') args = {};
          var def = TOOL_BY[name];
          var tm = { id: uid(), role: 'tool', tool_call_id: c.id, name: name, at: Date.now(), run: run.id };
          if (!def) { tm.result = { erro: 'Ferramenta desconhecida (não existe ferramenta para apagar).' }; addStep(run, 'Ferramenta desconhecida: ' + cut(name, 30), 'err'); }
          else if (!def.write) {
            try { tm.result = runRead(name, args); } catch (er) { tm.result = { erro: String(er && er.message || er) }; }
            tm.read = true; addStep(run, readStepLabel(name, args), 'ok');
          } else {
            tm.action = { id: uid(), tool: name, args: args, status: 'pending', run: run.id, selected: true };
            writes.push(tm.action);
          }
          history(ctx).push(tm);
        });
        if (writes.length) { addStep(run, proposeLabel(writes), 'ok'); if (cfg.autoApply) writes.forEach(function (a) { doApply(a, true); }); }
        saveChats();
        if (depth + 1 < MAX_STEPS) { renderMessages(true); runTurn(ctx, p, run, depth + 1); }
        else { addStep(run, 'Limite de ' + MAX_STEPS + ' passos atingido', 'warn'); finish(); }
      })
      .catch(function (e) {
        msg.streaming = false;
        if (e && e.name === 'AbortError') { step.state = 'stop'; step.label = 'Interrompido'; msg.content = (msg.content || '') + (msg.content ? '\n\n' : '') + '_(resposta interrompida)_'; }
        else {
          var h = history(ctx); h.splice(h.indexOf(msg), 1);
          var net = e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e && e.message);
          step.state = 'err'; step.label = net ? 'Sem conexão com o provedor' : ({ key: 'Chave recusada', credit: 'Sem créditos', quota: 'Limite de uso', model: 'Modelo não encontrado', server: 'Provedor instável' }[e.kind] || 'Erro do provedor');
          if (e && e.kind && pv.verified) { var ent = cfg.providers[pv.id]; if (ent && (e.kind === 'key' || e.kind === 'credit')) { ent.verified = { ok: false, model: pv.model, at: Date.now(), msg: e.message }; saveCfg(); } }
          h.push({ id: uid(), role: 'assistant', error: true, kind: e && e.kind || (net ? 'net' : ''), at: Date.now(), content: net ? netError() : (e && e.message || String(e)) });
        }
        finish(true);
      });
    function finish(failed) {
      if (!msg.content && !msg.tool_calls && !msg.actions) { var h = history(ctx), k = h.indexOf(msg); if (k >= 0) h.splice(k, 1); }
      if (!failed) {
        var n = runActions(ctx, run.id).filter(function (a) { return a.status === 'pending'; }).length;
        addStep(run, n ? 'Pronto — revise ' + (n === 1 ? 'a proposta' : 'as ' + n + ' propostas') + ' abaixo' : 'Pronto', 'ok');
      }
      run.done = true;
      busy = null; saveChats(); setBusy(false); renderMessages(true);
    }
  }
  function runActions(ctx, runId) {
    var out = [];
    history(ctx).forEach(function (m) { if (m.action && m.action.run === runId) out.push(m.action); (m.actions || []).forEach(function (a) { if (a.run === runId) out.push(a); }); });
    return out;
  }
  function stripPartialAction(t) { var i = t.search(/```(acao|ação)/i); return i >= 0 ? t.slice(0, i) : t; }
  function netError() {
    if (!navigator.onLine) return 'Sem internet agora. O assistente precisa de conexão (menos o Ollama, que roda no seu PC).';
    var pv = prov();
    if (pv.id === 'ollama') return 'Não consegui falar com o Ollama em ' + pv.baseUrl + '. Ele está aberto neste computador? Se a Prancheta estiver aberta pelo site, libere o endereço com OLLAMA_ORIGINS (veja em Conectar IA).';
    return 'Não consegui conectar ao ' + pv.name + '. Confira a internet; se continuar, toque em Conectar IA para testar de novo.';
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

  function applyBatch(runId) {
    var list = runActions(view.ctx, runId), done = [];
    list.forEach(function (a) {
      if (a.status !== 'pending') return;
      if (a.selected === false) { a.status = 'discarded'; return; }
      doApply(a, true); if (a.status === 'applied') done.push(a);
    });
    var errs = list.filter(function (a) { return a.status === 'error'; }).length;
    saveChats(); renderMessages(false);
    if (done.length) api.toast(done.length + (done.length === 1 ? ' mudança aplicada' : ' mudanças aplicadas') + (errs ? ' (' + errs + ' com erro)' : '') + '.', 'Desfazer', function () { undoMany(done); }, 9000);
    else if (errs) api.toast('Não deu para aplicar: veja os erros no lote.');
    else api.toast('Nada selecionado; propostas descartadas.');
  }
  function undoMany(list) {
    var bad = 0;
    list.slice().reverse().forEach(function (a) { if (a.status === 'applied') { if (undoAction(a)) a.status = 'undone'; else bad++; } });
    saveChats(); renderMessages(false);
    api.toast(bad ? 'Desfeito, menos ' + bad + ' item(ns) que mudaram depois.' : 'Mudanças desfeitas.');
  }

  // ---------------------------------------------------------------- interface
  function I(n) { return api.icon(n); }
  var CHIPS = [['next', 'Sugira próximas tarefas'], ['gdd', 'Revise meu GDD'], ['mech', 'Ideias de mecânicas'], ['split', 'Quebre esta tarefa em passos']];
  var CHIP_TEXT = {
    next: 'Leia o jogo e sugira as próximas 3 a 5 tarefas mais importantes para avançar, em ordem. Proponha criá-las em "A fazer".',
    gdd: 'Revise o caderno de design (GDD) deste jogo: o que está claro, o que está faltando ou contraditório e 3 perguntas que eu deveria responder. Não invente respostas.',
    mech: 'Sugira 5 ideias de mecânicas que combinam com o que já está registrado neste jogo, com uma frase de por que cada uma funciona. Marque tudo como sugestão.'
  };
  function goalChips(p) {
    var n = p ? ' do ' + p.title : '';
    return [['Planeje a pré-produção' + n, 'Pré-produção'], ['Organize o quadro de tarefas' + n + ': prioridades, o que mover e o que quebrar em passos', 'Organizar tarefas'], ['Monte o primeiro marco jogável' + n + ' com as tarefas necessárias', 'Primeiro marco jogável'], ['Revise o GDD' + n + ' e proponha o que falta preencher', 'Completar o GDD']];
  }
  var openRuns = {}, openRows = {};

  function html(p) {
    var title = p ? p.title : 'Todos os jogos';
    var grok = !!window.PranchetaSync;
    return '<div class="ia" data-ia-root>' +
      '<header class="ia-head">' +
        '<div class="ia-head-t"><div class="eyebrow">Assistente IA</div><h1>' + (p ? api.esc(title) : 'Assistente da Prancheta') + '</h1>' +
          '<button class="ia-chip-conn" type="button" data-ia="wizard" data-ia-chipconn></button></div>' +
        '<div class="ia-head-a">' +
          (grok ? '<button class="icon-btn" type="button" data-ia="grok" aria-label="Falar com o Grok Bot" title="Falar com o Grok Bot">' + I('grok') + '</button>' : '') +
          '<button class="icon-btn" type="button" data-ia="config" aria-label="Configuração avançada da IA" title="Configuração avançada">' + I('config') + '</button>' +
          '<button class="icon-btn" type="button" data-ia="clear" aria-label="Limpar conversa" title="Limpar conversa">' + I('trash') + '</button>' +
        '</div>' +
      '</header>' +
      (p ? '' : '<div class="ia-ctx"><label class="label" for="iaGame">Jogo</label><select class="select" id="iaGame" data-ia-game><option value="">Geral (todos os jogos)</option>' +
        api.state().projects.filter(function (x) { return !x.archived; }).map(function (x) { return '<option value="' + api.esc(x.id) + '">' + api.esc(x.title) + '</option>'; }).join('') + '</select></div>') +
      '<div class="ia-status" data-ia-status></div>' +
      '<div class="ia-msgs" data-ia-msgs aria-live="polite"></div>' +
      '<div class="ia-dock">' +
        '<div class="ia-modes" role="radiogroup" aria-label="Modo do assistente">' +
          '<button type="button" role="radio" data-ia-mode="chat">' + I('send') + 'Conversa</button>' +
          '<button type="button" role="radio" data-ia-mode="agente">' + I('ia') + 'Modo agente</button></div>' +
        '<div class="ia-chips" role="group" aria-label="Sugestões rápidas" data-ia-chips></div>' +
        '<form class="ia-compose" data-ia-form>' +
          '<textarea class="textarea" data-ia-input rows="1" aria-label="Mensagem para o assistente"></textarea>' +
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
    root.addEventListener('change', function (e) {
      var c = e.target.closest('[data-ia-sel]'); if (!c) return;
      var a = findAction(c.dataset.iaSel); if (a) { a.selected = c.checked; saveChats(); updateBatchCount(c.closest('[data-batch]')); }
    });
    var auto = root.querySelector('[data-ia-auto]');
    auto.addEventListener('change', function () { cfg.autoApply = auto.checked; saveCfg(); api.toast(auto.checked ? 'As mudanças propostas serão aplicadas sem perguntar (dá para desfazer).' : 'Cada mudança vai pedir confirmação.'); });
    var gs = root.querySelector('[data-ia-game]');
    if (gs) gs.addEventListener('change', function () { var pr = api.getProject(gs.value); if (pr) api.go(api.projHash(pr, 'ia')); });
    renderMode(); renderStatus(); renderMessages(true); setBusy(!!busy);
    if (!ready() && !cfg.wizardSeen) { cfg.wizardSeen = true; saveCfg(); setTimeout(function () { if (view && view.root === root && document.contains(root) && !ready()) openWizard(); }, 350); }
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 160) + 'px'; }
  function renderMode() {
    if (!view) return;
    var r = view.root, ag = cfg.mode === 'agente';
    r.classList.toggle('agent', ag);
    r.querySelectorAll('[data-ia-mode]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.iaMode === cfg.mode)); });
    var chips = r.querySelector('[data-ia-chips]');
    chips.innerHTML = ag ? goalChips(view.p).map(function (c, i) { return '<button class="chip" type="button" data-ia-goal="' + i + '">' + I('flag') + api.esc(c[1]) + '</button>'; }).join('')
      : CHIPS.map(function (c) { return '<button class="chip" type="button" data-ia-chip="' + c[0] + '">' + api.esc(c[1]) + '</button>'; }).join('');
    var inp = r.querySelector('[data-ia-input]');
    inp.placeholder = ag ? 'Diga um objetivo para o agente…' : 'Pergunte ou peça algo…';
    inp.setAttribute('aria-label', ag ? 'Objetivo para o agente' : 'Mensagem para o assistente');
    setBusy(!!busy);
  }

  function onClick(e) {
    var b = e.target.closest('[data-ia],[data-ia-chip],[data-ia-act],[data-ia-goal],[data-ia-mode],[data-ia-batch],[data-ia-more],[data-ia-run]');
    if (!b || !view) return;
    var k = b.dataset.ia;
    if (k === 'config') { openConfig(); return; }
    if (k === 'wizard') { openWizard(); return; }
    if (k === 'grok') { if (window.PranchetaSync) window.PranchetaSync.openGrok(); return; }
    if (k === 'clear') {
      api.confirmDialog('Limpar conversa?', 'Apaga as mensagens desta conversa neste aparelho. Os dados do jogo não mudam.', 'Limpar', true).then(function (ok) { if (ok) { chats[view.ctx] = []; saveChats(); renderMessages(true); } });
      return;
    }
    if (b.dataset.iaMode) { cfg.mode = b.dataset.iaMode; saveCfg(); renderMode(); renderMessages(false); return; }
    if (b.dataset.iaChip) { if (b.dataset.iaChip === 'split') { pickTask(); return; } send(CHIP_TEXT[b.dataset.iaChip], false); return; }
    if (b.dataset.iaGoal) { send(goalChips(view.p)[+b.dataset.iaGoal][0], true); return; }
    if (b.dataset.iaRun) { var rid = b.dataset.iaRun; openRuns[rid] = !openRuns[rid]; renderMessages(false); return; }
    if (b.dataset.iaMore) { var mid = b.dataset.iaMore; openRows[mid] = !openRows[mid]; var li = b.closest('.ia-row'); if (li) li.classList.toggle('open', !!openRows[mid]); b.setAttribute('aria-expanded', String(!!openRows[mid])); return; }
    if (b.dataset.iaBatch) {
      var run = b.dataset.run, list = runActions(view.ctx, run);
      if (b.dataset.iaBatch === 'apply') applyBatch(run);
      else if (b.dataset.iaBatch === 'discard') { list.forEach(function (a) { if (a.status === 'pending') a.status = 'discarded'; }); saveChats(); renderMessages(false); }
      else if (b.dataset.iaBatch === 'undo') undoMany(list.filter(function (a) { return a.status === 'applied'; }));
      else if (b.dataset.iaBatch === 'all' || b.dataset.iaBatch === 'none') { list.forEach(function (a) { if (a.status === 'pending') a.selected = b.dataset.iaBatch === 'all'; }); saveChats(); renderMessages(false); }
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
        send('Quebre a tarefa "' + t.title + '" (id ' + t.id + ') em passos pequenos e concretos para Godot 4.7.2. Proponha cada passo como uma nova tarefa em "A fazer" (com o título começando pelo nome curto da tarefa original).', false);
      });
  }

  function connState() {
    var pv = prov(), off = !navigator.onLine && pv.id !== 'ollama';
    if (!ready()) return { cls: 'off', text: 'Não conectado', title: 'Toque para conectar uma IA' };
    if (off) return { cls: 'off', text: 'Sem internet', title: pv.name };
    var v = pv.verified;
    if (v && v.ok && v.model === pv.model) return { cls: 'ok', text: 'Conectado', model: pv.model, title: pv.name + ' · ' + pv.model };
    if (v && !v.ok) return { cls: 'bad', text: 'Erro na conexão', model: pv.model, title: v.msg || '' };
    return { cls: 'warn', text: 'Não testado', model: pv.model, title: 'Toque para testar a conexão' };
  }
  function renderStatus() {
    if (!view) return;
    var chip = view.root.querySelector('[data-ia-chipconn]');
    if (chip) {
      var c = connState();
      chip.className = 'ia-chip-conn ' + c.cls;
      chip.title = c.title || '';
      chip.setAttribute('aria-label', 'Conexão da IA: ' + c.text + (c.model ? ', modelo ' + c.model : '') + '. Toque para conectar ou trocar.');
      chip.innerHTML = '<span class="ia-dot"></span><b>' + api.esc(c.text) + '</b>' + (c.model ? '<span class="ia-chip-m">' + api.esc(c.model) + '</span>' : '');
    }
    var el = view.root.querySelector('[data-ia-status]'); if (!el) return;
    if (!ready()) {
      el.innerHTML = '<div class="ia-setup"><span class="empty-ic">' + I('ia') + '</span><h3>Conecte uma IA para começar</h3><p>Leva um minuto: escolha o provedor, pegue a chave grátis e cole. O app testa e escolhe o modelo sozinho.</p><button class="btn primary" type="button" data-ia="wizard">' + I('ia') + 'Conectar IA</button></div>';
      return;
    }
    el.innerHTML = '';
  }

  function badgeOf(st) { return { pending: '', applied: '<span class="badge ok">Aplicado</span>', discarded: '<span class="badge">Descartado</span>', error: '<span class="badge bad">Erro</span>', undone: '<span class="badge">Desfeito</span>' }[st] || ''; }
  function rowsHtml(d) { return '<dl>' + d.rows.map(function (r) { return '<dt>' + api.esc(r[0]) + '</dt><dd>' + api.esc(cut(r[1], 600)).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl>'; }
  function actionCard(a) {
    var d = describe(a), st = a.status;
    return '<div class="ia-card ' + st + '" data-action-id="' + api.esc(a.id) + '">' +
      '<div class="ia-card-h">' + I(d.icon) + '<b>' + api.esc(d.title) + '</b>' + (d.game ? '<span class="ia-card-g">' + api.esc(d.game) + '</span>' : '') + badgeOf(st) + '</div>' +
      rowsHtml(d) +
      (st === 'error' ? '<p class="ia-card-err">' + api.esc(a.err || '') + '</p>' : '') +
      (st === 'pending' ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-act="discard" data-id="' + api.esc(a.id) + '">Descartar</button><button class="btn primary sm" type="button" data-ia-act="apply" data-id="' + api.esc(a.id) + '">Aplicar</button></div>' : '') +
      (st === 'applied' && a.undo ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-act="undo" data-id="' + api.esc(a.id) + '">Desfazer</button></div>' : '') +
      (st === 'error' ? '<div class="ia-card-a"><button class="btn sm" type="button" data-ia-act="retry" data-id="' + api.esc(a.id) + '">Tentar de novo</button></div>' : '') +
    '</div>';
  }
  function batchCard(runId, list) {
    var pend = list.filter(function (a) { return a.status === 'pending'; }), sel = pend.filter(function (a) { return a.selected !== false; }).length;
    var applied = list.filter(function (a) { return a.status === 'applied' && a.undo; }).length;
    var game = describe(list[0]).game;
    return '<div class="ia-batch" data-batch="' + api.esc(runId) + '">' +
      '<div class="ia-batch-h">' + I('ia') + '<div><b>Lote de mudanças</b><small>' + list.length + ' propostas' + (game ? ' · ' + api.esc(game) : '') + '</small></div>' +
        (pend.length > 1 ? '<button class="btn ghost sm" type="button" data-ia-batch="' + (sel === pend.length ? 'none' : 'all') + '" data-run="' + api.esc(runId) + '">' + (sel === pend.length ? 'Desmarcar' : 'Marcar todas') + '</button>' : '') + '</div>' +
      '<ul class="ia-rows">' + list.map(function (a) {
        var d = describe(a), st = a.status, open = !!openRows[a.id];
        return '<li class="ia-row ' + st + (open ? ' open' : '') + '">' +
          '<div class="ia-row-m">' +
            (st === 'pending' ? '<input type="checkbox" class="check" data-ia-sel="' + api.esc(a.id) + '" aria-label="Selecionar: ' + api.esc(d.title + ' ' + d.main) + '"' + (a.selected !== false ? ' checked' : '') + '>' : '<span class="ia-row-ic">' + I(d.icon) + '</span>') +
            '<span class="ia-row-t"><small>' + api.esc(d.title) + '</small><b>' + api.esc(cut(d.main, 120)) + '</b></span>' + badgeOf(st) +
            '<button class="icon-btn ia-more" type="button" data-ia-more="' + api.esc(a.id) + '" aria-expanded="' + open + '" aria-label="Detalhes">' + I('right') + '</button>' +
          '</div>' +
          '<div class="ia-row-d">' + rowsHtml(d) + (st === 'error' ? '<p class="ia-card-err">' + api.esc(a.err || '') + '</p>' : '') + '</div>' +
        '</li>';
      }).join('') + '</ul>' +
      (pend.length ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-batch="discard" data-run="' + api.esc(runId) + '">Descartar</button><button class="btn primary sm" type="button" data-ia-batch="apply" data-run="' + api.esc(runId) + '" data-batch-count>Aplicar selecionados (' + sel + ')</button></div>'
        : applied ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-ia-batch="undo" data-run="' + api.esc(runId) + '">Desfazer aplicadas (' + applied + ')</button></div>' : '') +
    '</div>';
  }
  function updateBatchCount(card) {
    if (!card) return;
    var list = runActions(view.ctx, card.dataset.batch).filter(function (a) { return a.status === 'pending'; });
    var n = list.filter(function (a) { return a.selected !== false; }).length;
    var b = card.querySelector('[data-batch-count]'); if (b) { b.textContent = 'Aplicar selecionados (' + n + ')'; b.disabled = false; }
  }
  var STEP_IC = { ok: '✓', err: '!', warn: '!', stop: '■', wait: '…', run: '' };
  function runHtml(m) {
    var steps = m.steps || [];
    var live = !m.done, open = live || !!openRuns[m.id];
    var last = steps[steps.length - 1];
    var head = live ? (last ? last.label : 'Pensando…') : (m.goal ? 'Agente' : 'Assistente') + ' · ' + steps.length + ' passos';
    return '<div class="ia-run' + (live ? ' live' : '') + (open ? ' open' : '') + '" data-run-id="' + api.esc(m.id) + '">' +
      '<button type="button" class="ia-run-h" data-ia-run="' + api.esc(m.id) + '" aria-expanded="' + open + '"' + (live ? ' disabled' : '') + '>' + (live ? '<span class="ia-spin" aria-hidden="true"></span>' : I('ia')) + '<span>' + api.esc(head) + '</span>' + (live ? '' : I('right')) + '</button>' +
      (open ? '<ol class="ia-steps">' + steps.map(function (s) { return '<li class="' + s.state + '"><span class="ia-step-ic" aria-hidden="true">' + (s.state === 'run' ? '<span class="ia-spin"></span>' : STEP_IC[s.state] || '') + '</span>' + api.esc(s.label) + '</li>'; }).join('') + '</ol>' : '') +
    '</div>';
  }

  function renderMessages(stick) {
    if (!view) return;
    var box = view.root.querySelector('[data-ia-msgs]'); if (!box) return;
    renderStatus();
    var h = history(view.ctx);
    if (!h.length) {
      var ag = cfg.mode === 'agente';
      box.innerHTML = ready() ? '<div class="ia-empty"><span class="empty-ic">' + I('ia') + '</span><p>' + (ag
        ? '<b>Modo agente:</b> diga um objetivo e o agente lê o jogo, monta um plano e propõe as mudanças num lote para você revisar. Nada é aplicado sem você tocar em <b>Aplicar selecionados</b>.'
        : view.p ? 'Pergunte qualquer coisa sobre <b>' + api.esc(view.p.title) + '</b> ou use uma sugestão abaixo. Toda mudança nos dados vira um cartão para você aprovar.' : 'Pergunte sobre seus jogos ou escolha um jogo acima para o assistente ler e propor mudanças nele.') + '</p></div>' : '';
      return;
    }
    var byRun = {}, shown = {}, out = '';
    h.forEach(function (m) {
      if (m.action && m.action.run) (byRun[m.action.run] = byRun[m.action.run] || []).push(m.action);
      (m.actions || []).forEach(function (a) { if (a.run) (byRun[a.run] = byRun[a.run] || []).push(a); });
    });
    function act(a) {
      var list = a.run && byRun[a.run];
      if (list && list.length > 1) { if (shown[a.run]) return; shown[a.run] = true; out += '<div class="ia-msg act">' + batchCard(a.run, list) + '</div>'; }
      else out += '<div class="ia-msg act">' + actionCard(a) + '</div>';
    }
    h.forEach(function (m) {
      if (m.role === 'user') out += '<div class="ia-msg user' + (m.goal ? ' goal' : '') + '" data-msg="' + m.id + '"><div class="ia-bubble">' + (m.goal ? '<span class="ia-goal-l">' + I('flag') + 'Objetivo</span>' : '') + '<div class="ia-text">' + md(m.content) + '</div></div></div>';
      else if (m.role === 'run') { var ss = m.steps || []; if (m.goal || ss.length > (m.done ? 2 : 1) || ss.some(function (x) { return x.state === 'wait' || x.state === 'err'; })) out += runHtml(m); }
      else if (m.role === 'assistant') {
        if (m.error) {
          var fix = m.kind === 'key' || m.kind === 'credit' || m.kind === 'model' || !ready();
          out += '<div class="ia-msg bot err" data-msg="' + m.id + '"><div class="ia-bubble"><div class="ia-text">' + md(m.content) + '</div>' + (fix ? '<button class="btn sm" type="button" data-ia="wizard">' + I('ia') + 'Conectar IA</button>' : '') + '</div></div>'; return;
        }
        var txt = m.content || '';
        if (txt || (m.streaming && !m.run)) out += '<div class="ia-msg bot" data-msg="' + m.id + '"><span class="ia-av" aria-hidden="true">' + I('ia') + '</span><div class="ia-bubble"><div class="ia-text">' + (txt ? md(m.streaming ? stripPartialAction(txt) : txt) : '<span class="ia-typing" aria-label="Pensando"><i></i><i></i><i></i></span>') + '</div></div></div>';
        else if (m.streaming) out += '<div class="ia-msg bot" data-msg="' + m.id + '" data-empty><span class="ia-av" aria-hidden="true">' + I('ia') + '</span><div class="ia-bubble"><div class="ia-text"><span class="ia-typing" aria-label="Pensando"><i></i><i></i><i></i></span></div></div></div>';
        (m.actions || []).forEach(act);
      } else if (m.role === 'tool') {
        if (m.action) act(m.action);
        else if (m.read && !m.run) out += '<div class="ia-note">' + I('search') + (m.name === 'listar_jogos' ? 'Consultou a lista de jogos' : 'Leu os dados do jogo') + '</div>';
      }
    });
    box.innerHTML = out;
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
    b.setAttribute('aria-label', on ? 'Parar' : 'Enviar');
    view.root.querySelectorAll('[data-ia-chip],[data-ia-goal],[data-ia-mode]').forEach(function (c) { c.disabled = !!on; });
  }

  // ---------------------------------------------------------------- conexão: chave, modelos, teste
  function detectProvider(key) {
    key = String(key || '').trim();
    if (/^AIza/.test(key)) return 'gemini';
    if (/^gsk_/.test(key)) return 'groq';
    if (/^sk-or-/.test(key)) return 'openrouter';
    if (/^hf_/.test(key)) return 'hf';
    if (/^sk-/.test(key)) return 'openai';
    return '';
  }
  function cleanKey(k) { return String(k || '').trim().replace(/^bearer\s+/i, '').replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ''); }
  function timed(ms) { var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, ms); return { signal: c.signal, done: function () { clearTimeout(t); } }; }
  function netFail(t) {
    var e = new Error(t.id === 'ollama'
      ? 'Não achei o Ollama em ' + t.baseUrl + '. Ele precisa estar rodando neste computador e, se a Prancheta estiver aberta pelo site, liberado com OLLAMA_ORIGINS.'
      : 'Sem conexão com o ' + (PRESETS[t.id] ? PRESETS[t.id].name : 'provedor') + ' (internet fora, endereço errado ou o serviço bloqueia chamadas do navegador).');
    e.kind = 'net'; return e;
  }
  function listModels(t) {
    var tm = timed(20000);
    return fetch(t.baseUrl + '/models', { headers: authHeaders(t), signal: tm.signal, cache: 'no-store' })
      .then(function (res) {
        return res.text().then(function (body) {
          tm.done();
          if (res.status === 404 || res.status === 405) return null;
          if (!res.ok) throw httpError(res, body, t.id);
          var j; try { j = JSON.parse(body); } catch (e) { return null; }
          var arr = Array.isArray(j) ? j : (j && (j.data || j.models)) || [];
          return arr.map(function (m) {
            if (typeof m === 'string') return { id: m.replace(/^models\//, ''), tools: null };
            var sp = m.supported_parameters;
            return { id: String(m.id || m.name || '').replace(/^models\//, ''), tools: Array.isArray(sp) ? sp.indexOf('tools') >= 0 : null };
          }).filter(function (m) { return m.id; });
        });
      }, function (e) { tm.done(); if (e && e.name === 'AbortError') { var x = new Error('O provedor demorou demais para responder.'); x.kind = 'net'; throw x; } throw netFail(t); });
  }
  var SKIP_MODEL = /embed|tts|whisper|audio|image|imagen|veo|live|guard|moderation|transcri|aqa|learnlm|robotics|computer-use|native|realtime|search-preview|dall-e|sora|codex|instruct$/i;
  function verOf(id) { var m = id.match(/gemini-(\d+(?:\.\d+)?)/i); return m ? parseFloat(m[1]) : 0; }
  function pickModels(id, list, current) {
    var d = PRESETS[id] || PRESETS.custom;
    if (!list || !list.length) return [current || d.model].filter(Boolean);
    var ids = list.filter(function (m) { return !SKIP_MODEL.test(m.id) && m.tools !== false; }).map(function (m) { return m.id; });
    if (!ids.length) ids = list.map(function (m) { return m.id; });
    var out = [];
    function push(x) { if (x && ids.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x); }
    if (id === 'gemini') {
      // o flash estável mais novo primeiro; depois a lista conhecida; prévias por último
      var flash = ids.filter(function (x) { return /^gemini-[\d.]+-flash/i.test(x); })
        .sort(function (a, b) { return (/preview|exp/.test(a) - /preview|exp/.test(b)) || (verOf(b) - verOf(a)) || (/lite/.test(a) - /lite/.test(b)) || a.length - b.length; });
      flash.filter(function (x) { return !/preview|exp/.test(x); }).forEach(push);
      (d.prefer || []).forEach(push);
      flash.forEach(push);
      ids.filter(function (x) { return /^gemini-/.test(x); }).sort(function (a, b) { return verOf(b) - verOf(a); }).forEach(push);
    } else (d.prefer || []).forEach(push);
    if (id === 'openrouter') ids.filter(function (x) { return /:free$/.test(x); }).forEach(push);
    if (id === 'ollama') ids.filter(function (x) { return /dolphin/i.test(x); }).forEach(push);
    push(current);
    if (id !== 'openrouter' || !out.length) ids.forEach(push);
    return out.slice(0, 4);
  }
  function chatTest(t, model) {
    var tm = timed(30000);
    return fetch(t.baseUrl + '/chat/completions', { method: 'POST', headers: authHeaders(t), signal: tm.signal, cache: 'no-store',
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Responda só com a palavra: ok' }] }) })
      .then(function (res) {
        return res.text().then(function (body) {
          tm.done();
          if (!res.ok) throw httpError(res, body, t.id);
          var j; try { j = JSON.parse(body); } catch (e) { j = null; }
          var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          return String(c || '').trim();
        });
      }, function (e) { tm.done(); if (e && e.name === 'AbortError') { var x = new Error('O modelo demorou demais para responder.'); x.kind = 'net'; throw x; } throw netFail(t); });
  }
  // lista modelos, escolhe o melhor e testa; devolve { model, reply, warn, total }
  function connectProvider(t, onProgress) {
    var d = PRESETS[t.id] || PRESETS.custom;
    t = { id: t.id, key: cleanKey(t.key), baseUrl: String(t.baseUrl || d.baseUrl || '').trim().replace(/\/+$/, ''), model: String(t.model || '').trim() };
    onProgress = onProgress || function () {};
    if (!t.baseUrl) return Promise.reject(new Error('Falta o endereço base (URL).'));
    if (d.key && !t.key) return Promise.reject(new Error('Cole a chave de API primeiro.'));
    if (!navigator.onLine && t.id !== 'ollama') return Promise.reject(new Error('Sem internet agora. Conecte o aparelho e tente de novo.'));
    var quota = false, total = 0;
    onProgress('Verificando a chave…');
    return listModels(t)
      .catch(function (e) { if (e.kind === 'quota') { quota = true; return null; } throw e; })
      .then(function (list) {
        total = list ? list.length : 0;
        var cands = pickModels(t.id, list, t.model);
        if (!cands.length) throw new Error('Nenhum modelo de conversa disponível nesta conta.');
        var i = 0, lastErr = null, quotaModel = '';
        function next() {
          if (i >= cands.length) {
            if (quotaModel) return { model: quotaModel, reply: '', total: total, key: t.key, baseUrl: t.baseUrl, warn: 'A chave funciona, mas o limite grátis está no máximo agora. Espere um pouco antes de conversar.' };
            throw lastErr || new Error('Nenhum modelo respondeu.');
          }
          var m = cands[i++];
          onProgress('Testando o modelo ' + m + '…');
          return chatTest(t, m).then(function (reply) {
            return { model: m, reply: reply, total: total, key: t.key, baseUrl: t.baseUrl, warn: quota ? 'Conectado, mas o limite grátis está no máximo agora; espere um pouco antes de usar.' : '' };
          }, function (e) {
            if (e.kind === 'quota') { if (!quotaModel) quotaModel = m; lastErr = e; return next(); }
            if (e.kind === 'model' || (e.status === 400 && e.kind === 'other') || e.kind === 'server') { lastErr = e; return next(); }
            throw e;
          });
        }
        return next();
      });
  }
  function saveConnection(id, r) {
    var d = PRESETS[id], entry = cfg.providers[id] || {};
    if (d.key) entry.key = r.key; else delete entry.key;
    entry.model = r.model;
    if (r.baseUrl && r.baseUrl !== d.baseUrl) entry.baseUrl = r.baseUrl; else delete entry.baseUrl;
    entry.verified = { ok: true, model: r.model, at: Date.now() };
    cfg.providers[id] = entry; cfg.preset = id; cfg.wizardSeen = true;
    saveCfg();
  }

  // ---------------------------------------------------------------- assistente de conexão (3 passos)
  function openWizard() {
    var st = { step: 1, id: PRESETS[cfg.preset] ? cfg.preset : 'gemini', key: '', baseUrl: '', model: '', status: null, detected: '', busy: false, n: 0 };
    var cur = cfg.providers[st.id]; if (cur) { st.key = cur.key || ''; st.baseUrl = cur.baseUrl || ''; }
    var dlgEl = null, timer = 0, connected = false;
    function dots() {
      return '<div class="wz-dots" aria-label="Passo ' + st.step + ' de 3">' + ['Provedor', 'Chave', 'Conectar'].map(function (l, i) { return '<span class="' + (i + 1 < st.step ? 'done' : i + 1 === st.step ? 'on' : '') + '"><i>' + (i + 1 < st.step ? '✓' : i + 1) + '</i>' + l + '</span>'; }).join('') + '</div>';
    }
    function statusHtml() {
      var s = st.status;
      if (!s) return '<p class="wz-st">' + (PRESETS[st.id].key ? 'Ao colar, o app testa a chave sozinho e escolhe o melhor modelo.' : 'Toque em Conectar: o app procura os modelos instalados.') + '</p>';
      if (s.kind === 'busy') return '<p class="wz-st busy"><span class="ia-spin"></span>' + api.esc(s.text) + '</p>';
      if (s.kind === 'ok') return '<div class="wz-st ok"><b>✓ Conectado!</b><span>' + api.esc(PRESETS[st.id].name) + ' · modelo <code>' + api.esc(s.model) + '</code>' + (s.total ? ' (escolhido entre ' + s.total + ')' : '') + '</span>' + (s.warn ? '<small>' + api.esc(s.warn) + '</small>' : '') + '</div>';
      return '<div class="wz-st bad"><b>Não conectou</b><span>' + api.esc(s.text) + '</span></div>';
    }
    function body() {
      var d = PRESETS[st.id];
      if (st.step === 1) return dots() + '<h2 id="dialogTitle">Conectar IA</h2><p class="hint">Escolha onde a IA vai rodar. Dá para trocar depois.</p>' +
        '<div class="wz-cards">' + WIZ_ORDER.map(function (k) { var p = PRESETS[k]; return '<button type="button" class="wz-card' + (k === st.id ? ' sel' : '') + (k === 'gemini' ? ' rec' : '') + '" data-wz-pick="' + k + '"><span class="wz-card-t"><b>' + api.esc(p.name) + '</b><span class="wz-tag">' + api.esc(p.tag) + '</span></span><small>' + api.esc(p.blurb) + '</small></button>'; }).join('') + '</div>' +
        '<div class="dlg-actions"><button class="btn ghost" type="button" data-dlg="cancel">Cancelar</button><button class="btn primary" type="button" data-wz="next">Continuar</button></div>';
      if (st.step === 2) return dots() + '<h2 id="dialogTitle">' + (d.key ? 'Pegue a chave do ' + api.esc(d.name) : 'Prepare o ' + api.esc(d.name)) + '</h2>' +
        (d.note ? '<p class="wz-note">' + I('ia') + '<span>' + api.esc(d.note) + '</span></p>' : '') +
        '<ol class="wz-steps">' + d.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
        (d.keyUrl ? '<a class="btn primary wz-open" href="' + d.keyUrl + '" target="_blank" rel="noopener noreferrer">' + api.esc(d.keyBtn) + ' ↗</a>' : '') +
        '<div class="dlg-actions"><button class="btn ghost" type="button" data-wz="back">Voltar</button><button class="btn' + (d.keyUrl ? '' : ' primary') + '" type="button" data-wz="next">' + (d.key ? 'Já tenho a chave' : 'Continuar') + '</button></div>';
      var needUrl = st.id === 'custom' || st.id === 'ollama';
      return dots() + '<h2 id="dialogTitle">' + (d.key ? 'Cole a chave' : 'Conectar ao ' + api.esc(d.name)) + '</h2>' +
        (d.key ? '<div class="field"><label class="label" for="wzKey">Chave de API do ' + api.esc(d.name) + '</label><div class="ia-key wz-key"><input class="input" id="wzKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cole aqui' + (st.id === 'gemini' ? ' (começa com AIza…)' : '') + '" value="' + api.esc(st.key) + '">' +
          '<button class="icon-btn" type="button" data-wz="show" aria-label="Mostrar ou esconder a chave">' + I('olho') + '</button>' +
          '<button class="btn" type="button" data-wz="paste">Colar</button></div></div>' : '') +
        (st.detected ? '<p class="wz-detect">' + I('ia') + 'Reconheci uma chave do <b>' + api.esc(st.detected) + '</b> e troquei o provedor.</p>' : '') +
        (needUrl ? '<div class="field"><label class="label" for="wzUrl">Endereço base (URL)</label><input class="input" id="wzUrl" inputmode="url" autocomplete="off" spellcheck="false" value="' + api.esc(st.baseUrl || d.baseUrl) + '" placeholder="https://…/v1"></div>' : '') +
        (st.id === 'custom' ? '<div class="field"><label class="label" for="wzModel">Modelo (opcional)</label><input class="input" id="wzModel" autocomplete="off" spellcheck="false" value="' + api.esc(st.model) + '" placeholder="o app escolhe se ficar vazio"></div>' : '') +
        '<div data-wz-status role="status" aria-live="polite">' + statusHtml() + '</div>' +
        '<p class="ia-privacy">' + I('archive') + '<span>A chave fica <b>só neste aparelho</b>: não vai para o backup nem para o GitHub.</span></p>' +
        '<div class="dlg-actions"><button class="btn ghost" type="button" data-wz="back">Voltar</button>' +
          (st.status && st.status.kind === 'ok' ? '<button class="btn primary" type="button" data-dlg="ok">Concluir</button>' : '<button class="btn primary" type="button" data-wz="connect"' + (st.busy ? ' disabled' : '') + '>Conectar</button>') + '</div>';
    }
    function draw(focusKey) {
      if (!dlgEl) return;
      var box = dlgEl.querySelector('[data-wz-body]'); box.innerHTML = body();
      dlgEl.querySelector('.dlg').dataset.step = st.step;
      var k = box.querySelector('#wzKey');
      if (k) {
        k.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); run(); } });
        k.addEventListener('paste', function () { setTimeout(function () { onKey(true); }, 0); });
        k.addEventListener('input', function () { st.key = k.value; clearTimeout(timer); if (cleanKey(k.value).length >= 20) timer = setTimeout(function () { onKey(true); }, 700); });
        if (focusKey && !st.key) k.focus();
      }
      ['#wzUrl', '#wzModel'].forEach(function (q) { var f = box.querySelector(q); if (f) f.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); run(); } }); });
    }
    function setStatus(s) { st.status = s; var el = dlgEl && dlgEl.querySelector('[data-wz-status]'); if (el) el.innerHTML = statusHtml(); }
    function read() {
      var q = function (s) { var e = dlgEl.querySelector(s); return e ? e.value.trim() : null; };
      var k = q('#wzKey'), u = q('#wzUrl'), m = q('#wzModel');
      if (k != null) st.key = k; if (u != null) st.baseUrl = u; if (m != null) st.model = m;
    }
    function onKey(auto) {
      read();
      var key = cleanKey(st.key), det = detectProvider(key);
      if (!key) return;
      if (det && det !== st.id && st.id !== 'custom') { st.id = det; st.detected = PRESETS[det].name; st.status = null; st.key = key; draw(); }
      run(auto);
    }
    function run() {
      read();
      var my = ++st.n;
      st.busy = true; setStatus({ kind: 'busy', text: 'Conectando…' });
      var btn = dlgEl.querySelector('[data-wz="connect"]'); if (btn) btn.disabled = true;
      var d = PRESETS[st.id];
      connectProvider({ id: st.id, key: st.key, baseUrl: st.baseUrl || d.baseUrl, model: st.model || (cfg.providers[st.id] || {}).model || '' }, function (t) { if (my === st.n) setStatus({ kind: 'busy', text: t }); })
        .then(function (r) {
          if (my !== st.n) return;
          saveConnection(st.id, r); connected = true;
          st.busy = false; st.status = { kind: 'ok', model: r.model, total: r.total, warn: r.warn }; draw();
          renderStatus();
          var ok = dlgEl.querySelector('[data-dlg="ok"]'); if (ok) ok.focus();
        }, function (e) {
          if (my !== st.n) return;
          st.busy = false; st.status = { kind: 'bad', text: e.message || String(e) }; draw();
        });
    }
    function onNav() { if (dlgEl && dlgEl.open) dlgEl.dispatchEvent(new Event('cancel')); }
    window.addEventListener('hashchange', onNav);
    return api.openDialog('<div class="dlg sheet ia-wiz" data-step="1"><div data-wz-body></div></div>', function (d) {
      dlgEl = d; draw();
      d.addEventListener('click', function (e) {
        var p = e.target.closest('[data-wz-pick]');
        if (p) { st.id = p.dataset.wzPick; st.detected = ''; st.status = null; var c = cfg.providers[st.id] || {}; st.key = c.key || ''; st.baseUrl = c.baseUrl || ''; st.model = st.id === 'custom' ? c.model || '' : ''; st.step = 2; draw(); return; }
        var b = e.target.closest('[data-wz]'); if (!b) return;
        var k = b.dataset.wz;
        if (k === 'next') { read(); st.step = Math.min(3, st.step + 1); draw(true); }
        else if (k === 'back') { read(); st.n++; st.busy = false; st.step = Math.max(1, st.step - 1); if (st.step < 3) st.status = st.status && st.status.kind === 'ok' ? st.status : null; draw(); }
        else if (k === 'show') { var f = d.querySelector('#wzKey'); f.type = f.type === 'password' ? 'text' : 'password'; }
        else if (k === 'connect') onKey(false);
        else if (k === 'paste') {
          var f2 = d.querySelector('#wzKey');
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function (t) { t = cleanKey(t); if (!t) { setStatus({ kind: 'bad', text: 'A área de transferência está vazia. Copie a chave e toque em Colar de novo.' }); return; } f2.value = t; st.key = t; onKey(true); },
              function () { f2.focus(); setStatus({ kind: 'bad', text: 'O navegador não deixou ler a área de transferência. Toque e segure no campo e escolha “Colar”.' }); });
          } else { f2.focus(); setStatus({ kind: 'bad', text: 'Toque e segure no campo e escolha “Colar”.' }); }
        }
      });
    }).then(function () {
      window.removeEventListener('hashchange', onNav);
      st.n++; clearTimeout(timer);
      if (connected) { api.toast('IA conectada: ' + prov().name + ' · ' + prov().model + '.'); }
      renderStatus(); renderMessages(false);
    });
  }

  // ---------------------------------------------------------------- configuração avançada
  function openConfig() {
    var cur = cfg.preset, tested = null;
    function fields(id) {
      var d = PRESETS[id], v = prov(id);
      return '<div class="field"><label class="label" for="iaKey">Chave de API' + (d.key ? '' : ' (não precisa)') + '</label>' +
          '<div class="ia-key"><input class="input" id="iaKey" name="key" type="password" autocomplete="off" spellcheck="false" placeholder="' + (d.key ? 'Cole sua chave aqui' : 'Sem chave') + '" value="' + api.esc(v.key) + '"' + (d.key ? '' : ' disabled') + '>' +
          '<button class="icon-btn" type="button" data-cfg="show" aria-label="Mostrar ou esconder a chave">' + I('olho') + '</button></div></div>' +
        '<div class="field"><label class="label" for="iaModel">Modelo</label><input class="input" id="iaModel" name="model" autocomplete="off" spellcheck="false" list="iaModels" value="' + api.esc(v.model) + '" placeholder="nome do modelo">' +
          '<datalist id="iaModels">' + (d.prefer || []).map(function (m) { return '<option value="' + api.esc(m) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field"><label class="label" for="iaUrl">Endereço base (URL)</label><input class="input" id="iaUrl" name="baseUrl" autocomplete="off" spellcheck="false" inputmode="url" value="' + api.esc(v.baseUrl) + '" placeholder="https://…/v1"></div>' +
        '<div class="ia-help">' + d.help + '</div>';
    }
    api.openDialog('<div class="dlg sheet ia-cfg"><h2 id="dialogTitle">Configuração avançada</h2>' +
      '<p class="hint">Prefere o jeito fácil? <button class="linkbtn" type="button" data-dlg="wizard">Usar o assistente Conectar IA</button></p>' +
      '<div class="field"><label class="label" for="iaPreset">Provedor</label><select class="select" id="iaPreset" name="preset">' +
        Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + api.esc(PRESETS[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div data-cfg-fields>' + fields(cur) + '</div>' +
      '<div class="ia-test"><button class="btn" type="button" data-cfg="test">' + I('ia') + 'Testar e escolher modelo</button><span class="ia-test-r" data-cfg-result role="status"></span></div>' +
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
            var t = { id: sel.value, key: val('#iaKey'), model: val('#iaModel'), baseUrl: val('#iaUrl') };
            var det = detectProvider(cleanKey(t.key));
            res.className = 'ia-test-r'; res.textContent = 'Testando…'; b.disabled = true;
            connectProvider(t, function (m) { res.textContent = m; }).then(function (r) {
              tested = { id: t.id, model: r.model };
              d.querySelector('#iaModel').value = r.model;
              res.className = 'ia-test-r ok'; res.textContent = 'Conectado! Modelo: ' + r.model + (r.warn ? ' — ' + r.warn : '');
            }, function (err) {
              res.className = 'ia-test-r bad';
              res.textContent = (err.message || String(err)) + (det && det !== t.id ? ' Esta chave parece ser do ' + PRESETS[det].name + '.' : '');
            }).then(function () { b.disabled = false; });
          }
        });
      })
      .then(function (r) {
        if (r && r.action === 'wizard') { openWizard(); return; }
        if (!r || !r.ok) return;
        var id = r.preset;
        cfg.preset = id;
        var d = PRESETS[id], entry = cfg.providers[id] || {};
        var key = d.key ? cleanKey(r.key) : '', model = (r.model || '').trim() || d.model, base = (r.baseUrl || '').trim().replace(/\/+$/, '') || d.baseUrl;
        var same = entry.key === key && entry.model === model && (entry.baseUrl || d.baseUrl) === base;
        entry.key = key; entry.model = model; entry.baseUrl = base;
        if (!entry.key) delete entry.key;
        if (tested && tested.id === id && tested.model === model) entry.verified = { ok: true, model: model, at: Date.now() };
        else if (!same) delete entry.verified;
        cfg.providers[id] = entry;
        saveCfg();
        api.toast(ready() ? 'IA configurada: ' + d.name + '.' : 'Configuração salva. Falta a chave de API.');
        renderStatus(); renderMessages(false);
      });
  }

  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);

  window.PranchetaIA = {
    init: function (a) { api = a; },
    html: html,
    mount: mount,
    // usado só nos testes automatizados
    _md: md, _parseFallback: parseFallbackActions, _cfgKey: CFG_KEY, _chatKey: CHAT_KEY,
    _detect: detectProvider, _pick: pickModels, _explain: explain, _retryAfter: retryAfter,
    openWizard: function () { openWizard(); }, ready: function () { return ready(); }
  };
})();
