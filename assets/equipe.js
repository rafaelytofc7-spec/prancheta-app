/* Prancheta — Equipe de IAs: 3 vagas de API. A vaga 1 é o Coordenador (divide o objetivo, distribui e junta);
   as vagas 2 e 3 são especialistas. Tudo o que a equipe propõe vira um lote para você aprovar.
   As chaves ficam só neste aparelho (localStorage "prancheta.equipe.v1") e nunca entram no backup nem no GitHub. */
(function () {
  'use strict';
  var CFG_KEY = 'prancheta.equipe.v1';
  var RUNS_KEY = 'prancheta.equipe.runs.v1';
  var MAX_RUNS = 12, MAX_TASKS = 6, MAX_PROPOSALS = 20;
  var ROLE_IDEAS = ['Roteiro e mecânicas', 'Arte e efeitos', 'Código Godot', 'Som e música', 'Level design', 'Testes e equilíbrio'];
  var GOALS = [
    ['Liste os efeitos especiais que o jogo precisa (explosões, impactos, clima, magia) com cores e gatilhos', 'Efeitos especiais'],
    ['Monte a lista de sons e músicas que faltam no jogo', 'Sons e música'],
    ['Planeje a primeira fase completa: fase, inimigos, itens, efeitos e tarefas', 'Primeira fase'],
    ['O que falta para o jogo ficar pronto? Liste recursos e tarefas por prioridade', 'O que falta']
  ];
  var api = null;
  function T() { return window.PranchetaIA && window.PranchetaIA.team; }

  // ---------------------------------------------------------------- configuração (fica só neste aparelho)
  function defaults() {
    return { slots: [
      { role: 'Coordenador', desc: 'Divide o objetivo em partes, distribui para a equipe e junta os resultados.', useMain: true, provider: '', key: '', model: '', baseUrl: '' },
      { role: 'Roteiro e mecânicas', desc: 'História, missões, diálogos, regras e equilíbrio do jogo.', useMain: false, provider: '', key: '', model: '', baseUrl: '' },
      { role: 'Arte, efeitos e Godot', desc: 'Efeitos especiais, sprites, sons, animações, UI e dicas de GDScript.', useMain: false, provider: '', key: '', model: '', baseUrl: '' }
    ], reviewPlan: false, lastGame: '' };
  }
  function loadCfg() {
    var c = null; try { c = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { c = null; }
    var d = defaults();
    if (!c || typeof c !== 'object') return d;
    var slots = Array.isArray(c.slots) ? c.slots : [];
    d.slots = d.slots.map(function (def, i) { var s = slots[i] && typeof slots[i] === 'object' ? slots[i] : {}; return Object.assign({}, def, s, { useMain: i === 0 ? s.useMain !== false : false }); });
    d.reviewPlan = !!c.reviewPlan; d.lastGame = String(c.lastGame || '');
    return d;
  }
  var cfg = loadCfg();
  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* sem espaço */ } }
  function loadRuns() {
    var r = []; try { r = JSON.parse(localStorage.getItem(RUNS_KEY) || '[]') || []; } catch (e) { r = []; }
    if (!Array.isArray(r)) r = [];
    var fixed = false;
    r.forEach(function (run) {
      if (run && /^(planning|working|merging)$/.test(run.status)) {
        fixed = true;
        run.status = 'stopped'; (run.log || []).forEach(function (l) { if (l.state === 'run') l.state = 'stop'; });
        (run.lanes || []).forEach(function (l) { if (l && l.state === 'run') { l.state = 'idle'; l.text = 'Parou'; } });
        (run.log || []).push({ at: Date.now(), who: -1, text: 'Execução interrompida (o app foi fechado no meio).', state: 'warn' });
      }
    });
    r = r.filter(function (x) { return x && x.id; });
    if (fixed) { try { localStorage.setItem(RUNS_KEY, JSON.stringify(r)); } catch (e) { /* sem espaço */ } }
    return r;
  }
  var runs = loadRuns();
  function saveRuns() { if (runs.length > MAX_RUNS) runs = runs.slice(-MAX_RUNS); try { localStorage.setItem(RUNS_KEY, JSON.stringify(runs)); } catch (e) { /* sem espaço */ } }

  // provedor efetivo de cada vaga (null = vazia ou incompleta)
  function effective(i, loose) {
    var t = T(); if (!t) return null;
    var s = cfg.slots[i];
    if (i === 0 && s.useMain) {
      if (!t.ready()) return null;
      var pm = t.provider(); return { id: pm.id, name: pm.name, key: pm.key, baseUrl: pm.baseUrl, model: pm.model, main: true, verified: pm.verified };
    }
    if (!s.provider || !t.presets[s.provider]) return null;
    var d = t.presets[s.provider], saved = t.provider(s.provider);
    var pv = { id: s.provider, name: d.name, key: t.cleanKey(s.key || saved.key || ''), baseUrl: String(s.baseUrl || d.baseUrl || saved.baseUrl || '').trim().replace(/\/+$/, ''), model: String(s.model || (s.key ? '' : saved.model) || d.model || '').trim(), verified: s.verified || null, keyFromMain: !s.key && !!saved.key };
    if (!pv.baseUrl || (!pv.model && !loose) || (d.key && !pv.key)) return null;
    return pv;
  }
  function slotState(i) {
    var s = cfg.slots[i], pv = effective(i);
    if (!pv) {
      var lz = effective(i, true);
      if (lz) return { k: 'warn', t: 'Toque em Testar', pv: lz };
      if (i === 0) return { k: 'off', t: s.useMain ? 'Assistente sem IA' : 'Não configurada' };
      return s.provider ? { k: 'off', t: 'Falta a chave' } : { k: 'empty', t: 'Vazia' };
    }
    var v = pv.verified;
    if (v && v.ok && v.model === pv.model) return { k: 'ok', t: 'Pronta', pv: pv };
    if (v && !v.ok) return { k: 'bad', t: 'Erro no teste', pv: pv, msg: v.msg };
    return { k: 'warn', t: 'Não testada', pv: pv };
  }
  function slotName(i) { return i < 0 ? 'Prancheta' : 'Vaga ' + (i + 1) + ' · ' + (cfg.slots[i].role || (i === 0 ? 'Coordenador' : 'Especialista')); }

  // ---------------------------------------------------------------- utilidades
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function E(s) { return api.esc(s); }
  function I(n) { return api.icon(n); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function md(s) { var t = T(); return t ? t.md(s) : '<p>' + E(s) + '</p>'; }
  function parseJSON(text) {
    var t = String(text || '').trim(), m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m) { try { return JSON.parse(m[1]); } catch (e) { /* tenta o resto */ } }
    try { return JSON.parse(t); } catch (e) { /* tenta achar o objeto */ }
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
    return null;
  }
  function toolDoc() {
    return T().writeTools().map(function (t) {
      var pr = t.parameters.properties;
      return '- ' + t.name + ': ' + t.description + ' Argumentos: ' + Object.keys(pr).filter(function (k) { return k !== 'jogo_id'; }).map(function (k) { return k + (pr[k].enum ? ' (' + pr[k].enum.join('|') + ')' : ''); }).join(', ');
    }).join('\n');
  }
  function teamDoc() {
    return cfg.slots.map(function (s, i) {
      var pv = effective(i);
      return '- Vaga ' + (i + 1) + (i === 0 ? ' (você, Coordenador)' : '') + ': ' + (s.role || '') + ' — ' + (s.desc || '') + (i > 0 && !pv ? ' [VAGA VAZIA: não atribua nada a ela]' : '');
    }).join('\n');
  }
  var RULES = 'Responda em português do Brasil. O jogo é feito por um dev indie brasileiro, principalmente no Godot 4.7.2 (GDScript). Baseie-se nos dados do jogo; o que for ideia sua, marque como sugestão. Não invente fatos sobre a história existente. Você não pode apagar nada.';

  function planMessages(run, p) {
    return [{ role: 'system', content: 'MODO: PLANO_DA_EQUIPE\nVocê é o COORDENADOR de uma equipe de IAs que ajuda a planejar o jogo "' + p.title + '" na Prancheta. ' + RULES +
      '\nEquipe:\n' + teamDoc() +
      '\nTarefa: divida o objetivo do usuário em 2 a ' + MAX_TASKS + ' subtarefas concretas e atribua cada uma à vaga mais adequada (use 1 para você mesmo quando fizer sentido). Use depende_de só quando uma subtarefa precisar do resultado de outra; as outras rodam em paralelo.' +
      '\nResponda SÓ com JSON válido, sem texto fora dele, neste formato:\n{"resumo":"plano em 1 ou 2 frases","subtarefas":[{"id":"t1","vaga":2,"titulo":"...","instrucoes":"o que entregar, com detalhes","depende_de":[]}]}' +
      '\nDados do jogo: ' + JSON.stringify(T().summary(p)) },
      { role: 'user', content: 'Objetivo: ' + run.goal }];
  }
  function taskMessages(run, p, task, slot, deps) {
    var s = cfg.slots[slot];
    return [{ role: 'system', content: 'MODO: SUBTAREFA\nVocê é a ' + slotName(slot) + ' numa equipe de IAs que planeja o jogo "' + p.title + '". Sua especialidade: ' + (s.desc || s.role) + '. ' + RULES +
      '\nEntregue a sua parte e proponha mudanças concretas nos dados do jogo usando estas ferramentas (o usuário revisa e aprova cada uma):\n' + toolDoc() +
      '\nResponda SÓ com JSON válido, sem texto fora dele:\n{"resultado":"sua entrega em markdown curto (até ~250 palavras)","propostas":[{"ferramenta":"criar_efeito","args":{"nome":"...","modelo":"explosao","cores":["#ffcc00","#ff3300"]}}]}' +
      '\nNo máximo 8 propostas. Dados do jogo: ' + JSON.stringify(T().summary(p)) },
      { role: 'user', content: 'Objetivo geral: ' + run.goal + '\n\nSua subtarefa: ' + task.titulo + '\n' + (task.instrucoes || '') +
        (deps.length ? '\n\nResultados de quem veio antes:\n' + deps.map(function (d) { return '### ' + d.titulo + '\n' + cut(d.result, 1500); }).join('\n\n') : '') }];
  }
  function mergeMessages(run, p) {
    var parts = run.plan.subtarefas.map(function (t) {
      return { id: t.id, titulo: t.titulo, feita_por: 'vaga ' + ((t.by != null ? t.by : t.slot) + 1), estado: t.state, resultado: cut(t.result || t.error || '', 1500),
        propostas: (t.proposals || []).map(function (a) { var g = Object.assign({}, a.args); delete g.jogo_id; return { ferramenta: a.tool, args: g }; }) };
    });
    return [{ role: 'system', content: 'MODO: JUNTAR_RESULTADOS\nVocê é o COORDENADOR da equipe. Junte o trabalho da equipe para o jogo "' + p.title + '". ' + RULES +
      '\nEscreva um resumo final curto e consolide as propostas: tire repetidas, corrija conflitos e fique com as melhores (no máximo ' + MAX_PROPOSALS + '). Ferramentas válidas:\n' + toolDoc() +
      '\nResponda SÓ com JSON válido:\n{"resumo":"markdown curto: o que a equipe fez e o que você recomenda","propostas":[{"ferramenta":"...","args":{...}}]}' },
      { role: 'user', content: 'Objetivo: ' + run.goal + '\n\nTrabalho da equipe:\n' + JSON.stringify(parts) }];
  }

  function cleanProposals(list, p, from) {
    var names = {}; T().writeTools().forEach(function (t) { names[t.name] = true; });
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (!x || typeof x !== 'object') return;
      var name = x.ferramenta || x.tool || x.acao || x.name, args = x.args || x.argumentos || x.arguments || {};
      if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
      if (!names[name] || !args || typeof args !== 'object') return;
      args = Object.assign({}, args, { jogo_id: p.id });
      out.push({ id: uid(), tool: name, args: args, status: 'pending', selected: true, from: from });
    });
    return out.slice(0, MAX_PROPOSALS);
  }
  function propKey(a) { var g = a.args || {}; return a.tool + '|' + String(g.nome || g.titulo || g.texto || g.tarefa || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, ' ').trim(); }
  function dedupe(list) { var seen = {}; return list.filter(function (a) { var k = propKey(a); if (seen[k]) return false; seen[k] = true; return true; }); }

  // ---------------------------------------------------------------- execução
  var active = null; // { run, ctrl }
  function log(run, who, text, state) { var l = { at: Date.now(), who: who, text: text, state: state || 'info' }; run.log.push(l); touchRun(run); return l; }
  function lane(run, i, state, text) { run.lanes[i] = { state: state, text: text }; touchRun(run); }
  var drawT = 0;
  function touchRun() { saveRuns(); if (drawT) return; drawT = requestAnimationFrame(function () { drawT = 0; renderRuns(); renderTeam(); }); }
  function errLabel(e) {
    if (!e) return 'Erro';
    if (e.name === 'AbortError') return 'Parado';
    return { key: 'Chave recusada', credit: 'Sem créditos', quota: 'Limite de uso', model: 'Modelo não encontrado', server: 'Provedor instável', net: 'Sem conexão', empty: 'Resposta vazia' }[e.kind] || 'Erro do provedor';
  }
  function call(run, i, messages, label) {
    var pv = effective(i); if (!pv) { var e = new Error('A ' + slotName(i) + ' não está configurada.'); e.kind = 'config'; return Promise.reject(e); }
    return T().complete(pv, messages, active.ctrl.signal, function (sec) { log(run, i, label + ': limite do provedor, tentando de novo em ' + sec + ' s', 'wait'); });
  }

  function start(goal, p) {
    goal = String(goal || '').trim();
    if (!goal || active || !p) return;
    if (!effective(0)) { configure(0); api.toast('Configure a vaga 1 (Coordenador) primeiro.'); return; }
    var run = { id: uid(), gameId: p.id, goal: goal, at: Date.now(), status: 'planning', log: [], lanes: [null, null, null], plan: null, planRaw: '', actions: [], summary: '' };
    runs.push(run); openRun = run.id;
    active = { run: run, ctrl: new AbortController() };
    log(run, -1, 'Objetivo enviado para a equipe.', 'ok');
    [1, 2].forEach(function (i) { if (!effective(i)) log(run, i, 'Vaga vazia: o Coordenador faz a parte dela.', 'info'); });
    lane(run, 0, 'run', 'Dividindo o objetivo em subtarefas…');
    var l = log(run, 0, 'Lendo o jogo e montando o plano…', 'run');
    call(run, 0, planMessages(run, p), 'Plano').then(function (text) {
      run.planRaw = text;
      var j = parseJSON(text), subs = j && Array.isArray(j.subtarefas) ? j.subtarefas : null;
      if (!subs || !subs.length) {
        l.state = 'warn'; l.text = 'O Coordenador não devolveu um plano em JSON; ele mesmo vai fazer o objetivo inteiro.';
        subs = [{ id: 't1', vaga: 1, titulo: cut(goal, 80), instrucoes: goal }];
      } else { l.state = 'ok'; l.text = 'Plano pronto: ' + subs.length + (subs.length === 1 ? ' subtarefa' : ' subtarefas'); }
      var ids = {};
      run.plan = { resumo: String((j && j.resumo) || ''), subtarefas: subs.slice(0, MAX_TASKS).map(function (x, k) {
        var id = String(x.id || 't' + (k + 1)); if (ids[id]) id = id + '_' + k; ids[id] = true;
        var vaga = parseInt(x.vaga != null ? x.vaga : x.slot, 10); var slot = vaga >= 1 && vaga <= 3 ? vaga - 1 : 0;
        return { id: id, slot: slot, planned: slot, titulo: String(x.titulo || x.title || 'Subtarefa ' + (k + 1)), instrucoes: String(x.instrucoes || x.instructions || ''), depende_de: Array.isArray(x.depende_de) ? x.depende_de.map(String) : [], state: 'wait', result: '', proposals: [] };
      }) };
      run.plan.subtarefas.forEach(function (t) {
        if (t.slot > 0 && !effective(t.slot)) { log(run, 0, '“' + cut(t.titulo, 50) + '” era da vaga ' + (t.slot + 1) + ', que está vazia: o Coordenador assume.', 'info'); t.slot = 0; }
      });
      lane(run, 0, 'idle', 'Plano entregue');
      if (cfg.reviewPlan) { run.status = 'plan'; log(run, -1, 'Plano aguardando sua revisão.', 'info'); active = null; touchRun(run); return; }
      return execute(run, p);
    }).catch(function (e) { fail(run, e, l); });
  }

  function execute(run, p) {
    if (!active) active = { run: run, ctrl: new AbortController() };
    run.status = 'working'; log(run, -1, 'A equipe começou a trabalhar.', 'info');
    var tasks = run.plan.subtarefas, busy = [false, false, false], byId = {};
    tasks.forEach(function (t) { byId[t.id] = t; if (t.state !== 'done') t.state = 'wait'; });
    return new Promise(function (resolve) {
      function finished(t) { return t.state === 'done' || t.state === 'error'; }
      function depsOk(t) { return t.depende_de.every(function (d) { return !byId[d] || d === t.id || finished(byId[d]); }); }
      function pump() {
        if (active && active.ctrl.signal.aborted) return resolve();
        tasks.forEach(function (t) { if (t.state === 'wait' && !busy[t.slot] && depsOk(t)) run1(t); });
        var left = tasks.filter(function (t) { return !finished(t); });
        if (!left.length) return resolve();
        // dependências em ciclo: libera a primeira que estiver parada
        if (!busy.some(Boolean) && !tasks.some(function (t) { return t.state === 'run'; })) { var w = left[0]; w.depende_de = []; run1(w); }
      }
      function run1(t) {
        var i = t.slot; busy[i] = true; t.state = 'run'; t.by = i;
        lane(run, i, 'run', t.titulo);
        var ln = log(run, i, 'Trabalhando em “' + cut(t.titulo, 70) + '”', 'run');
        var deps = t.depende_de.map(function (d) { return byId[d]; }).filter(function (d) { return d && d.result; });
        call(run, i, taskMessages(run, p, t, i, deps), cut(t.titulo, 40)).then(function (text) {
          var j = parseJSON(text);
          t.result = String((j && (j.resultado || j.result)) || (j ? '' : text) || '').trim();
          t.proposals = cleanProposals(j && (j.propostas || j.proposals), p, i);
          t.state = 'done'; ln.state = 'ok';
          ln.text = 'Terminou “' + cut(t.titulo, 60) + '”' + (t.proposals.length ? ' · ' + t.proposals.length + (t.proposals.length === 1 ? ' proposta' : ' propostas') : '') + (j ? '' : ' (sem JSON: só texto)');
          lane(run, i, 'ok', 'Entregou: ' + cut(t.titulo, 60));
        }, function (e) {
          if (e && e.name === 'AbortError') { t.state = 'error'; t.error = 'Parado'; ln.state = 'stop'; lane(run, i, 'idle', 'Parou'); return; }
          ln.state = 'err'; ln.text = errLabel(e) + ' em “' + cut(t.titulo, 50) + '”: ' + cut(e.message, 160);
          lane(run, i, 'err', errLabel(e));
          if (i !== 0) { log(run, 0, 'A vaga ' + (i + 1) + ' falhou: o Coordenador assume “' + cut(t.titulo, 50) + '”.', 'warn'); t.slot = 0; t.state = 'wait'; }
          else { t.state = 'error'; t.error = e.message; }
        }).then(function () { busy[i] = false; touchRun(run); pump(); });
      }
      pump();
    }).then(function () {
      if (active && active.ctrl.signal.aborted) { var ab = new Error('Parado'); ab.name = 'AbortError'; return fail(run, ab); }
      return merge(run, p);
    }).catch(function (e) { fail(run, e); });
  }

  function merge(run, p) {
    run.status = 'merging';
    var union = dedupe([].concat.apply([], run.plan.subtarefas.map(function (t) { return t.proposals || []; })));
    var done = run.plan.subtarefas.filter(function (t) { return t.state === 'done'; }).length;
    if (!done) { var e0 = new Error('Nenhuma subtarefa deu certo. Veja os erros na linha do tempo.'); return fail(run, e0); }
    lane(run, 0, 'run', 'Juntando os resultados…');
    var l = log(run, 0, 'Juntando os resultados da equipe…', 'run');
    return call(run, 0, mergeMessages(run, p), 'Juntar').then(function (text) {
      var j = parseJSON(text), list = j ? cleanProposals(j.propostas || j.proposals, p, 0) : [];
      run.summary = String((j && (j.resumo || j.summary)) || (j ? '' : text) || '').trim();
      if (!j) { l.state = 'warn'; l.text = 'O Coordenador respondeu sem JSON; mostrando todas as propostas da equipe.'; list = union; }
      else if (!list.length && union.length) { l.state = 'warn'; l.text = 'O Coordenador não consolidou as propostas; mostrando todas as da equipe.'; list = union; }
      else { l.state = 'ok'; l.text = 'Resultados juntados: ' + list.length + (list.length === 1 ? ' proposta' : ' propostas') + ' para você revisar'; }
      return list;
    }, function (e) {
      if (e && e.name === 'AbortError') throw e;
      l.state = 'warn'; l.text = errLabel(e) + ' ao juntar (' + cut(e.message, 120) + '). Mostrando todas as propostas da equipe.';
      return union;
    }).then(function (list) {
      // mostra de qual vaga veio cada proposta, mesmo depois de o Coordenador consolidar
      var origin = {}; union.forEach(function (u) { origin[propKey(u)] = u.from; });
      list.forEach(function (a) { var k = propKey(a); if (origin[k] != null) a.from = origin[k]; });
      run.actions = dedupe(list); run.status = 'review';
      lane(run, 0, 'ok', 'Entregou o resumo final');
      log(run, -1, run.actions.length ? 'Pronto: revise as ' + run.actions.length + ' propostas abaixo. Nada foi aplicado ainda.' : 'Pronto. A equipe não propôs mudanças nos dados.', 'ok');
      active = null; touchRun(run);
    }).catch(function (e) { fail(run, e, l); });
  }

  function fail(run, e, l) {
    var stopped = e && e.name === 'AbortError';
    if (l && l.state === 'run') { l.state = stopped ? 'stop' : 'err'; if (!stopped) l.text = errLabel(e) + ': ' + cut(e.message, 200); }
    run.status = stopped ? 'stopped' : 'error'; run.error = stopped ? '' : (e && e.message) || String(e);
    run.lanes = run.lanes.map(function (x) { return x && x.state === 'run' ? { state: 'idle', text: stopped ? 'Parou' : 'Erro' } : x; });
    if (stopped) log(run, -1, 'Execução parada por você.', 'warn');
    active = null; touchRun(run);
  }
  function stop() { if (active) active.ctrl.abort(); }

  // ---------------------------------------------------------------- aprovar propostas (mesma regra do assistente)
  function findRun(id) { for (var i = 0; i < runs.length; i++) if (runs[i].id === id) return runs[i]; return null; }
  function applySelected(run) {
    var t = T(), done = [], errs = 0;
    run.actions.forEach(function (a) {
      if (a.status !== 'pending') return;
      if (a.selected === false) { a.status = 'discarded'; return; }
      try { a.undo = t.apply(a); a.status = 'applied'; a.err = ''; done.push(a); } catch (e) { a.status = 'error'; a.err = e.message || String(e); errs++; }
    });
    if (done.length) { run.status = 'done'; log(run, -1, done.length + (done.length === 1 ? ' mudança aplicada' : ' mudanças aplicadas') + ' por você.', 'ok'); }
    saveRuns(); renderRuns();
    if (done.length) api.toast(done.length + (done.length === 1 ? ' mudança aplicada' : ' mudanças aplicadas') + (errs ? ' (' + errs + ' com erro)' : '') + '.', 'Desfazer', function () { undoMany(run, done); }, 9000);
    else api.toast(errs ? 'Não deu para aplicar: veja os erros no lote.' : 'Nada selecionado; propostas descartadas.');
  }
  function undoMany(run, list) {
    var t = T(), bad = 0;
    list.slice().reverse().forEach(function (a) { if (a.status === 'applied') { if (t.undo(a)) a.status = 'undone'; else bad++; } });
    saveRuns(); renderRuns();
    api.toast(bad ? 'Desfeito, menos ' + bad + ' item(ns) que mudaram depois.' : 'Mudanças desfeitas.');
  }

  // ---------------------------------------------------------------- interface
  var view = null, openRun = null, openBits = {};
  function ctxGame() {
    if (view && view.p) return view.p;
    var ps = api.state().projects.filter(function (x) { return !x.archived; });
    return api.getProject(cfg.lastGame) || ps[0] || null;
  }
  function html(p) {
    var games = api.state().projects.filter(function (x) { return !x.archived; });
    var g = p || api.getProject(cfg.lastGame) || games[0];
    return '<div class="eq" data-eq-root>' +
      '<header class="sec-head eq-head"><div><div class="eyebrow">Equipe de IAs</div><h1>' + (p ? E(p.title) + ': equipe de IAs' : 'Equipe de IAs') + '</h1>' +
        '<p>3 vagas de API. O Coordenador divide o seu objetivo, cada IA faz a parte dela e o Coordenador junta tudo. Nada muda nos dados sem você aprovar.</p></div>' +
        '<a class="btn ghost sm" href="' + (p ? api.projHash(p, 'ia') : '#/ia') + '">' + I('ia') + 'Assistente IA</a></header>' +
      '<div class="eq-team" data-eq-team></div>' +
      '<form class="eq-goal panel" data-eq-form>' +
        (p ? '' : '<div class="field"><label class="label" for="eqGame">Jogo</label><select class="select" id="eqGame" data-eq-game>' + games.map(function (x) { return '<option value="' + E(x.id) + '"' + (g && x.id === g.id ? ' selected' : '') + '>' + E(x.title) + '</option>'; }).join('') + '</select></div>') +
        '<label class="label" for="eqGoal">Objetivo para a equipe</label>' +
        '<textarea class="textarea" id="eqGoal" data-eq-input rows="3" placeholder="Ex.: crie todos os efeitos especiais da fase 1 e a lista de sons que faltam"></textarea>' +
        '<div class="ia-chips eq-chips">' + GOALS.map(function (x, i) { return '<button class="chip" type="button" data-eq-goal="' + i + '">' + I('flag') + E(x[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="eq-goal-foot"><label class="toggle"><input type="checkbox" data-eq-review' + (cfg.reviewPlan ? ' checked' : '') + '> Pausar para eu revisar o plano</label>' +
        '<button class="btn primary" type="submit" data-eq-send>' + I('send') + '<span>Mandar para a equipe</span></button></div>' +
      '</form>' +
      '<div class="eq-runs" data-eq-runs aria-live="polite"></div>' +
    '</div>';
  }
  function mount(root, p) {
    view = { root: root, p: p };
    var form = root.querySelector('[data-eq-form]'), input = root.querySelector('[data-eq-input]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (active) { stop(); return; }
      var g = ctxGame(); if (!g) { api.toast('Crie um jogo primeiro.'); return; }
      var v = input.value; if (!v.trim()) { input.focus(); return; }
      input.value = ''; start(v, g); renderAll();
    });
    var gs = root.querySelector('[data-eq-game]');
    if (gs) gs.addEventListener('change', function () { cfg.lastGame = gs.value; saveCfg(); renderRuns(); });
    root.querySelector('[data-eq-review]').addEventListener('change', function (e) { cfg.reviewPlan = e.target.checked; saveCfg(); });
    root.addEventListener('click', onClick);
    root.addEventListener('change', function (e) {
      var c = e.target.closest('[data-eq-sel]'); if (!c) return;
      var run = findRun(c.dataset.run), a = run && run.actions.filter(function (x) { return x.id === c.dataset.eqSel; })[0];
      if (a) { a.selected = c.checked; saveRuns(); var b = root.querySelector('[data-eq-apply="' + run.id + '"]'); if (b) b.textContent = 'Aplicar selecionados (' + run.actions.filter(function (x) { return x.status === 'pending' && x.selected !== false; }).length + ')'; }
    });
    var cur = ctxGame(); if (cur && !p) { cfg.lastGame = cur.id; }
    renderAll();
  }
  function alive() { return view && view.root && document.contains(view.root); }
  function renderAll() { renderTeam(); renderRuns(); }
  function renderTeam() {
    if (!alive()) return;
    var box = view.root.querySelector('[data-eq-team]'); if (!box) return;
    var run = active && active.run;
    box.innerHTML = cfg.slots.map(function (s, i) {
      var st = slotState(i), pv = st.pv, ln = run && run.lanes[i];
      var now = ln && ln.state === 'run' ? ln.text : '';
      return '<div class="eq-slot ' + st.k + (now ? ' busy' : '') + '" data-slot="' + i + '">' +
        '<div class="eq-slot-h"><span class="eq-av" data-n="' + (i + 1) + '">' + (i === 0 ? I('equipe') : '<b>' + (i + 1) + '</b>') + '</span>' +
          '<span class="eq-slot-t"><small>Vaga ' + (i + 1) + (i === 0 ? ' · coordena' : '') + '</small><b>' + E(s.role || 'Sem nome') + '</b></span>' +
          '<span class="eq-badge ' + st.k + '">' + E(st.t) + '</span></div>' +
        '<p class="eq-slot-d">' + E(cut(s.desc, 110)) + '</p>' +
        '<div class="eq-slot-pv">' + (pv ? '<span>' + E(pv.name) + (pv.main ? ' (a mesma do Assistente)' : '') + '</span><code>' + E(pv.model || 'o teste escolhe o modelo') + '</code>'
          : '<span>' + (i === 0 ? 'Conecte uma IA para coordenar.' : s.provider ? 'Falta a chave de API.' : 'Sem IA: o Coordenador faz a parte desta vaga.') + '</span>') + '</div>' +
        (now ? '<div class="eq-now"><span class="ia-spin" aria-hidden="true"></span><span>' + E(cut(now, 80)) + '</span></div>' : '') +
        '<div class="eq-slot-a"><button class="btn ghost sm" type="button" data-eq-conf="' + i + '">' + I('config') + 'Configurar</button>' +
          (pv ? '<button class="btn sm" type="button" data-eq-test="' + i + '">Testar</button>' : '') + '</div>' +
        '<p class="eq-test-r" data-eq-test-r="' + i + '" role="status"></p>' +
      '</div>';
    }).join('');
    var send = view.root.querySelector('[data-eq-send]');
    if (send) { send.classList.toggle('stop', !!active); send.innerHTML = I(active ? 'stop' : 'send') + '<span>' + (active ? 'Parar a equipe' : 'Mandar para a equipe') + '</span>'; }
    view.root.querySelectorAll('[data-eq-goal]').forEach(function (b) { b.disabled = !!active; });
  }
  var STATE_IC = { ok: '✓', err: '!', warn: '!', stop: '■', wait: '…', info: '•', run: '' };
  var RUN_ST = { planning: ['Planejando', 'run'], plan: ['Plano para revisar', 'warn'], working: ['Trabalhando', 'run'], merging: ['Juntando', 'run'], review: ['Revise as propostas', 'warn'], done: ['Concluída', 'ok'], error: ['Erro', 'bad'], stopped: ['Parada', ''] };
  function renderRuns() {
    if (!alive()) return;
    var box = view.root.querySelector('[data-eq-runs]'); if (!box) return;
    var g = ctxGame(), list = runs.filter(function (r) { return g && r.gameId === g.id; }).slice().reverse();
    if (!list.length) { box.innerHTML = '<div class="ia-empty eq-empty"><span class="empty-ic">' + I('equipe') + '</span><p>Dê um objetivo acima. Você vai ver o plano do Coordenador, quem está fazendo o quê e, no fim, as propostas para aprovar.</p></div>'; return; }
    if (!openRun || !list.some(function (r) { return r.id === openRun; })) openRun = list[0].id;
    box.innerHTML = list.map(function (r) { return runHtml(r, r.id === openRun); }).join('');
  }
  function who(i) { return i < 0 ? '<span class="eq-who sys">Prancheta</span>' : '<span class="eq-who" data-n="' + (i + 1) + '">' + (i + 1) + '</span>'; }
  function runHtml(r, open) {
    var st = RUN_ST[r.status] || [r.status, ''], live = active && active.run === r;
    var head = '<button type="button" class="eq-run-h" data-eq-open="' + E(r.id) + '" aria-expanded="' + open + '">' + (live ? '<span class="ia-spin" aria-hidden="true"></span>' : I('flag')) +
      '<span class="eq-run-g">' + E(cut(r.goal, 140)) + '</span><span class="eq-badge ' + st[1] + '">' + E(st[0]) + '</span>' + I('right') + '</button>';
    if (!open) return '<article class="eq-run panel">' + head + '</article>';
    var plan = r.plan, out = '<article class="eq-run panel open' + (live ? ' live' : '') + '" data-run="' + E(r.id) + '">' + head;
    if (live) out += '<div class="eq-run-stop"><button class="btn sm" type="button" data-eq-stop>' + I('stop') + 'Parar</button></div>';
    // quem está fazendo o quê
    out += '<div class="eq-lanes">' + [0, 1, 2].map(function (i) {
      var l = r.lanes && r.lanes[i]; var txt = l ? l.text : (i > 0 && !(plan && plan.subtarefas.some(function (t) { return t.slot === i || t.by === i; })) ? 'Sem tarefa' : 'Aguardando');
      return '<div class="eq-lane ' + (l ? l.state : 'idle') + '">' + who(i) + '<span><small>' + E(cfg.slots[i].role || 'Vaga ' + (i + 1)) + '</small><b>' + E(cut(txt, 70)) + '</b></span>' + (l && l.state === 'run' ? '<span class="ia-spin" aria-hidden="true"></span>' : '') + '</div>';
    }).join('') + '</div>';
    if (plan) {
      out += '<section class="eq-plan"><h3>' + I('checklist') + 'Plano do Coordenador</h3>' + (plan.resumo ? '<div class="ia-text">' + md(plan.resumo) + '</div>' : '') +
        '<ol class="eq-tasks">' + plan.subtarefas.map(function (t) {
          var res = t.result || t.error, k = r.id + ':' + t.id;
          return '<li class="eq-task ' + t.state + '"><div class="eq-task-m">' + who(t.by != null ? t.by : t.slot) + '<span class="eq-task-t"><b>' + E(t.titulo) + '</b><small>' + E(slotName(t.by != null ? t.by : t.slot)) +
            (t.planned !== t.slot ? ' (era da vaga ' + (t.planned + 1) + ')' : '') + (t.depende_de.length ? ' · depois de ' + E(t.depende_de.join(', ')) : '') + ' · ' + ({ wait: 'na fila', run: 'fazendo agora', done: 'feito', error: 'erro' }[t.state] || t.state) + '</small></span>' +
            (t.state === 'run' ? '<span class="ia-spin" aria-hidden="true"></span>' : '<span class="eq-st ' + t.state + '">' + (t.state === 'done' ? '✓' : t.state === 'error' ? '!' : '') + '</span>') + '</div>' +
            (res ? '<details class="eq-res" data-eq-bit="' + E(k) + '"' + (openBits[k] ? ' open' : '') + '><summary>' + (t.state === 'error' ? 'Ver o erro' : 'Ver a entrega' + (t.proposals && t.proposals.length ? ' (' + t.proposals.length + (t.proposals.length === 1 ? ' proposta)' : ' propostas)') : '')) + '</summary><div class="ia-text">' + (t.state === 'error' ? '<p>' + E(res) + '</p>' : md(res)) + '</div></details>' : '') + '</li>';
        }).join('') + '</ol>' +
        '<details class="eq-json" data-eq-bit="' + E(r.id) + ':json"' + (openBits[r.id + ':json'] ? ' open' : '') + '><summary>Plano em JSON</summary><pre>' + E(JSON.stringify({ resumo: plan.resumo, subtarefas: plan.subtarefas.map(function (t) { return { id: t.id, vaga: t.slot + 1, titulo: t.titulo, instrucoes: t.instrucoes, depende_de: t.depende_de }; }) }, null, 2)) + '</pre></details>' +
        (r.status === 'plan' ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-eq-cancel="' + E(r.id) + '">Cancelar</button><button class="btn primary sm" type="button" data-eq-exec="' + E(r.id) + '">' + I('play') + 'Executar o plano</button></div>' : '') +
      '</section>';
    }
    // linha do tempo
    out += '<details class="eq-log" data-eq-bit="' + E(r.id) + ':log"' + (openBits[r.id + ':log'] !== false ? ' open' : '') + '><summary>Linha do tempo · ' + r.log.length + ' passos</summary><ol>' + r.log.map(function (l) {
      return '<li class="' + l.state + '">' + who(l.who) + '<span class="eq-log-t">' + E(l.text) + '</span><span class="ia-step-ic" aria-hidden="true">' + (l.state === 'run' ? '<span class="ia-spin"></span>' : STATE_IC[l.state] || '') + '</span><time>' + new Date(l.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</time></li>';
    }).join('') + '</ol></details>';
    if (r.status === 'error' && r.error) out += '<p class="ia-card-err">' + E(r.error) + '</p><div class="ia-card-a"><button class="btn sm" type="button" data-eq-retry="' + E(r.id) + '">Tentar de novo</button></div>';
    if (r.summary) out += '<section class="eq-final"><h3>' + I('equipe') + 'Resumo do Coordenador</h3><div class="ia-text">' + md(r.summary) + '</div></section>';
    if (r.actions && r.actions.length) out += batchHtml(r);
    return out + '</article>';
  }
  function batchHtml(r) {
    var t = T(), pend = r.actions.filter(function (a) { return a.status === 'pending'; }), sel = pend.filter(function (a) { return a.selected !== false; }).length;
    var applied = r.actions.filter(function (a) { return a.status === 'applied' && a.undo; });
    var badge = { applied: '<span class="badge ok">Aplicado</span>', discarded: '<span class="badge">Descartado</span>', error: '<span class="badge bad">Erro</span>', undone: '<span class="badge">Desfeito</span>' };
    return '<div class="ia-batch eq-batch"><div class="ia-batch-h">' + I('equipe') + '<div><b>Propostas da equipe</b><small>' + r.actions.length + ' mudanças · nada é aplicado sem você</small></div>' +
      (pend.length > 1 ? '<button class="btn ghost sm" type="button" data-eq-all="' + E(r.id) + '" data-v="' + (sel === pend.length ? 'none' : 'all') + '">' + (sel === pend.length ? 'Desmarcar' : 'Marcar todas') + '</button>' : '') + '</div>' +
      '<ul class="ia-rows">' + r.actions.map(function (a) {
        var d = t.describe(a), k = r.id + ':' + a.id;
        return '<li class="ia-row ' + a.status + (openBits[k] ? ' open' : '') + '"><div class="ia-row-m">' +
          (a.status === 'pending' ? '<input type="checkbox" class="check" data-eq-sel="' + E(a.id) + '" data-run="' + E(r.id) + '" aria-label="Selecionar: ' + E(d.title + ' ' + d.main) + '"' + (a.selected !== false ? ' checked' : '') + '>' : '<span class="ia-row-ic">' + I(d.icon) + '</span>') +
          '<span class="ia-row-t"><small>' + E(d.title) + ' · vaga ' + ((a.from || 0) + 1) + '</small><b>' + E(cut(d.main, 120)) + '</b></span>' + (badge[a.status] || '') +
          '<button class="icon-btn ia-more" type="button" data-eq-more="' + E(k) + '" aria-expanded="' + !!openBits[k] + '" aria-label="Detalhes">' + I('right') + '</button></div>' +
          '<div class="ia-row-d"><dl>' + d.rows.map(function (x) { return '<dt>' + E(x[0]) + '</dt><dd>' + E(cut(x[1], 600)).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl>' + (a.status === 'error' ? '<p class="ia-card-err">' + E(a.err || '') + '</p>' : '') + '</div></li>';
      }).join('') + '</ul>' +
      (pend.length ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-eq-discard="' + E(r.id) + '">Descartar</button><button class="btn primary sm" type="button" data-eq-apply="' + E(r.id) + '">Aplicar selecionados (' + sel + ')</button></div>'
        : applied.length ? '<div class="ia-card-a"><button class="btn ghost sm" type="button" data-eq-undo="' + E(r.id) + '">Desfazer aplicadas (' + applied.length + ')</button></div>' : '') +
    '</div>';
  }

  function onClick(e) {
    var b = e.target.closest('[data-eq-goal],[data-eq-conf],[data-eq-test],[data-eq-open],[data-eq-stop],[data-eq-apply],[data-eq-discard],[data-eq-undo],[data-eq-all],[data-eq-more],[data-eq-exec],[data-eq-cancel],[data-eq-retry],summary');
    if (!b || !view) return;
    var d = b.dataset;
    if (b.tagName === 'SUMMARY') { var det = b.parentNode; if (det.dataset.eqBit) setTimeout(function () { openBits[det.dataset.eqBit] = det.open; }, 0); return; }
    if (d.eqGoal != null) { var inp = view.root.querySelector('[data-eq-input]'); inp.value = GOALS[+d.eqGoal][0]; inp.focus(); return; }
    if (d.eqConf != null) { configure(+d.eqConf); return; }
    if (d.eqTest != null) { test(+d.eqTest); return; }
    if (d.eqOpen) { openRun = openRun === d.eqOpen ? '__none' : d.eqOpen; renderRuns(); return; }
    if (d.eqStop != null) { stop(); return; }
    var run = findRun(d.eqApply || d.eqDiscard || d.eqUndo || d.eqAll || d.eqExec || d.eqCancel || d.eqRetry || '');
    if (d.eqMore) { openBits[d.eqMore] = !openBits[d.eqMore]; var li = b.closest('.ia-row'); if (li) li.classList.toggle('open', openBits[d.eqMore]); b.setAttribute('aria-expanded', String(openBits[d.eqMore])); return; }
    if (!run) return;
    if (d.eqApply) applySelected(run);
    else if (d.eqDiscard) { run.actions.forEach(function (a) { if (a.status === 'pending') a.status = 'discarded'; }); run.status = 'done'; saveRuns(); renderRuns(); }
    else if (d.eqUndo) undoMany(run, run.actions.filter(function (a) { return a.status === 'applied'; }));
    else if (d.eqAll) { run.actions.forEach(function (a) { if (a.status === 'pending') a.selected = d.v === 'all'; }); saveRuns(); renderRuns(); }
    else if (d.eqExec) { var g = api.getProject(run.gameId); if (!g || active) return; if (!effective(0)) { configure(0); return; } active = { run: run, ctrl: new AbortController() }; execute(run, g); renderAll(); }
    else if (d.eqCancel) { run.status = 'stopped'; log(run, -1, 'Plano cancelado por você.', 'warn'); renderRuns(); }
    else if (d.eqRetry) { var g2 = api.getProject(run.gameId); if (g2 && !active) { var inp2 = view.root.querySelector('[data-eq-input]'); inp2.value = run.goal; start(run.goal, g2); inp2.value = ''; renderAll(); } }
  }

  // testar uma vaga (lista os modelos, escolhe e faz uma pergunta curta)
  function test(i) {
    var t = T(), s = cfg.slots[i], pv = effective(i) || effective(i, true);
    var out = view && view.root.querySelector('[data-eq-test-r="' + i + '"]');
    function say(cls, txt) { if (!alive()) return; out = view.root.querySelector('[data-eq-test-r="' + i + '"]'); if (out) { out.className = 'eq-test-r ' + cls; out.textContent = txt; } }
    if (!pv) { configure(i); return; }
    say('busy', 'Testando…');
    return t.connect({ id: pv.id, key: pv.key, baseUrl: pv.baseUrl, model: pv.model }, function (m) { say('busy', m); }).then(function (r) {
      if (pv.main) t.saveMain(pv.id, r);
      else { s.model = r.model; s.verified = { ok: true, model: r.model, at: Date.now() }; saveCfg(); }
      renderTeam(); say('ok', '✓ Funcionando · ' + r.model + (r.warn ? ' — ' + r.warn : ''));
      api.toast('Vaga ' + (i + 1) + ' funcionando (' + r.model + ').');
    }, function (e) {
      if (!pv.main) { s.verified = { ok: false, model: pv.model, at: Date.now(), msg: e.message }; saveCfg(); }
      renderTeam(); say('bad', e.message || String(e));
    });
  }

  function configure(i) {
    var t = T(), s = cfg.slots[i]; if (!t) return;
    var ids = t.order;
    function fieldsHtml(prov, useMain) {
      if (i === 0 && useMain) {
        var pm = t.ready() ? t.provider() : null;
        return '<div class="sync-card ' + (pm ? 'ok' : 'off') + '"><span class="sync-ic">' + I('ia') + '</span><div><b>' + (pm ? E(pm.name) + ' · ' + E(pm.model) : 'O Assistente ainda não tem IA') + '</b><small>' + (pm ? 'O Coordenador usa a mesma chave e modelo do Assistente IA.' : 'Conecte uma IA no Assistente ou desligue a opção acima.') + '</small></div></div>' +
          '<button class="btn" type="button" data-eqc="wizard">' + I('ia') + (pm ? 'Trocar a IA do Assistente' : 'Conectar IA') + '</button>';
      }
      if (!prov) return '<p class="hint">Vaga vazia: o Coordenador faz as tarefas desta especialidade. Escolha um provedor para ligar esta vaga.</p>';
      var d = t.presets[prov], saved = t.provider(prov), same = s.provider === prov;
      return (d.key ? '<div class="field"><label class="label" for="eqKey">Chave de API</label><div class="ia-key wz-key"><input class="input" id="eqKey" name="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (saved.key ? 'Vazio = usa a chave salva no Assistente' : 'Cole a chave aqui') + '" value="' + E(same ? s.key : '') + '">' +
          '<button class="icon-btn" type="button" data-eqc="show" aria-label="Mostrar ou esconder a chave">' + I('olho') + '</button></div>' +
          (d.keyUrl ? '<p class="hint">Não tem? <a href="' + d.keyUrl + '" target="_blank" rel="noopener noreferrer">' + E(d.keyBtn || 'Criar chave') + ' ↗</a></p>' : '') + '</div>' : '') +
        '<div class="cols-2"><div class="field"><label class="label" for="eqModel">Modelo</label><input class="input" id="eqModel" name="model" autocomplete="off" spellcheck="false" list="eqModels" value="' + E(same ? s.model : '') + '" placeholder="' + E(saved.model || d.model || 'o teste escolhe') + '">' +
          '<datalist id="eqModels">' + (d.prefer || []).map(function (m) { return '<option value="' + E(m) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field"><label class="label" for="eqUrl">Endereço base</label><input class="input" id="eqUrl" name="baseUrl" inputmode="url" autocomplete="off" spellcheck="false" value="' + E(same ? s.baseUrl : '') + '" placeholder="' + E(d.baseUrl || 'https://…/v1') + '"></div></div>' +
        '<p class="hint">' + E(d.blurb || '') + '</p>';
    }
    var html = '<div class="dlg sheet eq-cfg"><h2 id="dialogTitle">Vaga ' + (i + 1) + (i === 0 ? ' · Coordenador' : '') + '</h2>' +
      '<div class="field"><label class="label" for="eqRole">Função</label><input class="input" id="eqRole" name="role" autocomplete="off" value="' + E(s.role) + '"' + (i === 0 ? '' : ' placeholder="Ex.: Arte e efeitos"') + '>' +
        (i === 0 ? '' : '<div class="rs-chips">' + ROLE_IDEAS.map(function (r) { return '<button class="chip" type="button" data-eqc-role="' + E(r) + '">' + E(r) + '</button>'; }).join('') + '</div>') + '</div>' +
      '<div class="field"><label class="label" for="eqDesc">Especialidade (o que ela faz)</label><textarea class="textarea" id="eqDesc" name="desc" rows="2">' + E(s.desc) + '</textarea></div>' +
      (i === 0 ? '<label class="toggle"><input type="checkbox" data-eqc-main' + (s.useMain ? ' checked' : '') + '> Usar a mesma IA do Assistente IA</label>' : '') +
      '<div class="field" data-eqc-prov' + (i === 0 && s.useMain ? ' hidden' : '') + '><label class="label" for="eqProv">Provedor</label><select class="select" id="eqProv" name="provider">' +
        (i === 0 ? '' : '<option value="">Vazia (o Coordenador faz a parte dela)</option>') + ids.map(function (k) { return '<option value="' + k + '"' + (k === s.provider ? ' selected' : '') + '>' + E(t.presets[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="eq-cfg-f" data-eqc-fields>' + fieldsHtml(i === 0 && !s.provider ? 'gemini' : s.provider, i === 0 && s.useMain) + '</div>' +
      '<p class="ia-privacy">' + I('archive') + '<span>A chave fica <b>só neste aparelho</b>: não vai para o backup, nem para o GitHub, nem para as outras vagas.</span></p>' +
      '<div class="dlg-actions"><button class="btn ghost" type="button" data-dlg="cancel">Cancelar</button><button class="btn primary" type="button" data-dlg="ok">Salvar</button></div></div>';
    var mainOn = !!s.useMain;
    api.openDialog(html, function (dl) {
      var sel = dl.querySelector('#eqProv'), box = dl.querySelector('[data-eqc-fields]'), main = dl.querySelector('[data-eqc-main]');
      function redraw() { box.innerHTML = fieldsHtml(sel.value || (i === 0 ? 'gemini' : ''), !!(main && main.checked)); }
      if (i === 0 && !s.provider) sel.value = 'gemini';
      sel.addEventListener('change', redraw);
      if (main) main.addEventListener('change', function () { mainOn = main.checked; dl.querySelector('[data-eqc-prov]').hidden = main.checked; redraw(); });
      dl.addEventListener('click', function (e) {
        var r = e.target.closest('[data-eqc-role]'); if (r) { dl.querySelector('#eqRole').value = r.dataset.eqcRole; return; }
        var b = e.target.closest('[data-eqc]'); if (!b) return;
        if (b.dataset.eqc === 'show') { var k = dl.querySelector('#eqKey'); k.type = k.type === 'password' ? 'text' : 'password'; }
        if (b.dataset.eqc === 'wizard') { dl.dispatchEvent(new Event('cancel')); setTimeout(function () { window.PranchetaIA.openWizard(); }, 50); }
      });
    }).then(function (r) {
      if (!r || !r.ok) return;
      var prevSig = [s.provider, s.key, s.model, s.baseUrl].join('|');
      s.role = String(r.role || '').trim() || (i === 0 ? 'Coordenador' : 'Especialista ' + (i + 1));
      s.desc = String(r.desc || '').trim();
      if (i === 0) s.useMain = mainOn;
      if (!(i === 0 && s.useMain)) {
        s.provider = r.provider || '';
        s.key = t.cleanKey(r.key || ''); s.model = String(r.model || '').trim(); s.baseUrl = String(r.baseUrl || '').trim().replace(/\/+$/, '');
        if (!s.provider) { s.key = ''; s.model = ''; s.baseUrl = ''; }
      }
      if ([s.provider, s.key, s.model, s.baseUrl].join('|') !== prevSig) s.verified = null;
      saveCfg(); renderTeam();
      var st = slotState(i);
      api.toast('Vaga ' + (i + 1) + ' salva' + (st.k === 'warn' ? '. Toque em Testar para conferir.' : ': ' + st.t.toLowerCase() + '.'));
    });
  }

  window.PranchetaEquipe = {
    init: function (a) { api = a; },
    html: html, mount: mount,
    // usado só nos testes automatizados
    _cfgKey: CFG_KEY, _runsKey: RUNS_KEY, _parse: parseJSON, _effective: effective, _runs: function () { return runs; }, _cfg: function () { return cfg; }, _active: function () { return !!active; }
  };
})();
