/* Prancheta — sincronização com um repositório PRIVADO do GitHub (API de conteúdo, com controle por sha).
   O token fica só neste aparelho (localStorage "prancheta.sync.v1") e nunca entra no backup exportado. */
(function () {
  'use strict';
  var KEY = 'prancheta.sync.v1';
  var CONFLICTS_KEY = 'prancheta.sync.conflitos.v1';
  var DEFAULT_REPO = 'rafaelytofc7-spec/prancheta-dados';
  var PATH = 'dados/prancheta.json';
  var TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
  var PUSH_DELAY = 4000;
  var api = null, quiet = false, timer = 0, running = null, dirty = false;
  var st = { state: 'off', text: '' }; // off | ok | busy | dirty | error | offline

  function loadCfg() {
    var c = null; try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { c = null; }
    c = c && typeof c === 'object' ? c : {};
    if (!c.repo) c.repo = DEFAULT_REPO;
    if (!c.path) c.path = PATH;
    if (!Array.isArray(c.lastIds)) c.lastIds = [];
    return c;
  }
  var cfg = loadCfg();
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* sem espaço */ } }
  function on() { return !!(cfg.token && cfg.repo); }
  function apiBase() { return (cfg.apiBase || 'https://api.github.com').replace(/\/+$/, ''); }
  function contentsUrl() { return apiBase() + '/repos/' + cfg.repo.split('/').map(encodeURIComponent).join('/') + '/contents/' + cfg.path.split('/').map(encodeURIComponent).join('/'); }
  function headers() { return { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }

  // ---------------------------------------------------------------- base64 UTF-8
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || '').replace(/\s+/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------------------------------------------------------------- erros em português
  function ghError(res, body) {
    var msg = ''; try { msg = JSON.parse(body).message || ''; } catch (e) { msg = ''; }
    var e = new Error(), s = res.status;
    var limit = res.headers && res.headers.get && res.headers.get('x-ratelimit-remaining') === '0';
    if (s === 401) e.message = 'Token inválido ou vencido. Crie um novo token no GitHub e cole de novo.';
    else if (s === 403 && limit) e.message = 'Limite de uso da API do GitHub atingido. Tente de novo em alguns minutos.';
    else if (s === 403) e.message = 'O token não tem permissão de escrita. No GitHub, dê a ele “Contents: Read and write” no repositório ' + cfg.repo + '.';
    else if (s === 404) e.message = 'Não achei o repositório ' + cfg.repo + ' (ou o token não tem acesso a ele). Confira o nome e se o token inclui esse repositório.';
    else if (s === 409 || s === 422) e.message = 'O arquivo mudou no GitHub enquanto enviava.';
    else if (s >= 500) e.message = 'O GitHub está instável agora (erro ' + s + '). Tento de novo depois.';
    else e.message = 'O GitHub recusou (erro ' + s + ')' + (msg ? ': ' + msg : '.');
    e.status = s; return e;
  }
  function netErr() { var e = new Error(navigator.onLine ? 'Sem conexão com o GitHub agora.' : 'Sem internet: as mudanças ficam salvas aqui e são enviadas quando voltar.'); e.net = true; return e; }

  // ---------------------------------------------------------------- API de conteúdo
  function pull() {
    return fetch(contentsUrl() + '?ref=' + encodeURIComponent(cfg.branch || 'main') + '&t=' + Date.now(), { headers: headers(), cache: 'no-store' })
      .then(function (res) {
        return res.text().then(function (body) {
          if (res.status === 404) return repoExists().then(function (ok) { if (!ok) throw ghError(res, body); return { sha: '', projects: null }; });
          if (!res.ok) throw ghError(res, body);
          var j = JSON.parse(body), text;
          if (j.content && j.encoding === 'base64') text = b64decode(j.content);
          else return rawPull().then(function (t) { return parse(t, j.sha); });
          return parse(text, j.sha);
        });
      }, function () { throw netErr(); });
  }
  function rawPull() {
    return fetch(contentsUrl() + '?ref=' + encodeURIComponent(cfg.branch || 'main') + '&t=' + Date.now(), { headers: Object.assign(headers(), { Accept: 'application/vnd.github.raw+json' }), cache: 'no-store' })
      .then(function (r) { if (!r.ok) return r.text().then(function (b) { throw ghError(r, b); }); return r.text(); });
  }
  function parse(text, sha) {
    var d; try { d = JSON.parse(text); } catch (e) { throw new Error('O arquivo ' + cfg.path + ' no GitHub não é um JSON válido. Corrija ou apague o conteúdo dele no GitHub.'); }
    var projects = Array.isArray(d) ? d : d && d.projects;
    if (!Array.isArray(projects)) throw new Error('O arquivo ' + cfg.path + ' não está no formato da Prancheta (falta "projects").');
    return { sha: sha, projects: projects, savedAt: d.savedAt || '' };
  }
  function repoExists() {
    return fetch(apiBase() + '/repos/' + cfg.repo + '?t=' + Date.now(), { headers: headers(), cache: 'no-store' }).then(function (r) { return r.ok; }, function () { throw netErr(); });
  }
  function put(projects, sha) {
    var data = { app: 'Prancheta', version: 1, savedAt: new Date().toISOString(), projects: projects };
    var body = { message: 'Prancheta: sincroniza ' + projects.length + ' jogo(s) ' + data.savedAt.slice(0, 16).replace('T', ' '), content: b64encode(JSON.stringify(data, null, 2) + '\n'), branch: cfg.branch || 'main' };
    if (sha) body.sha = sha;
    return fetch(contentsUrl(), { method: 'PUT', headers: Object.assign(headers(), { 'Content-Type': 'application/json' }), body: JSON.stringify(body), cache: 'no-store' })
      .then(function (res) {
        return res.text().then(function (t) {
          if (!res.ok) throw ghError(res, t);
          var j = JSON.parse(t); return j.content && j.content.sha;
        });
      }, function () { throw netErr(); });
  }

  // ---------------------------------------------------------------- mesclagem por jogo (updatedAt)
  function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function merge(local, remote, meta) {
    var last = meta.lastSyncAt || '', known = {}, out = [], conflicts = [], changedLocal = false, changedRemote = false;
    (meta.lastIds || []).forEach(function (id) { known[id] = true; });
    var R = {}; remote.forEach(function (p) { if (p && p.id) R[p.id] = p; });
    var seen = {};
    local.forEach(function (l) {
      var r = R[l.id]; seen[l.id] = true;
      if (!r) {
        // só aqui: jogo novo deste aparelho, ou apagado em outro lugar depois da última sincronização
        if (known[l.id] && !(l.updatedAt > last)) { changedLocal = true; return; }
        out.push(l); changedRemote = true; return;
      }
      if (sameJson(l, r)) { out.push(l); return; }
      var lu = l.updatedAt || '', ru = r.updatedAt || '';
      var both = last && lu > last && ru > last;
      if (both) conflicts.push({ title: l.title, kept: ru > lu ? 'github' : 'aparelho', other: ru > lu ? l : r });
      if (ru > lu) { out.push(r); changedLocal = true; } else { out.push(l); changedRemote = true; }
    });
    remote.forEach(function (r) {
      if (!r || !r.id || seen[r.id]) return;
      if (known[r.id] && !(r.updatedAt > last)) { changedRemote = true; return; } // apagado neste aparelho
      out.push(r); changedLocal = true;
    });
    return { projects: out, changedLocal: changedLocal, changedRemote: changedRemote, conflicts: conflicts };
  }
  function keepConflicts(list) {
    if (!list.length) return;
    var arr = []; try { arr = JSON.parse(localStorage.getItem(CONFLICTS_KEY) || '[]') || []; } catch (e) { arr = []; }
    list.forEach(function (c) { arr.push({ at: new Date().toISOString(), title: c.title, kept: c.kept, version: c.other }); });
    try { localStorage.setItem(CONFLICTS_KEY, JSON.stringify(arr.slice(-10))); } catch (e) { /* sem espaço */ }
  }

  // ---------------------------------------------------------------- ciclo
  function setStatus(s, text) { st = { state: s, text: text || '' }; renderChip(); if (dlgRefresh) dlgRefresh(); }
  function applyLocal(projects) { quiet = true; try { api.setProjects(projects); } finally { quiet = false; } }
  function markSynced(projects, sha) {
    cfg.sha = sha || cfg.sha; cfg.lastSyncAt = new Date().toISOString(); cfg.lastIds = projects.map(function (p) { return p.id; }); cfg.lastError = '';
    saveCfg();
  }
  // mode: 'auto' (abre o app / depois de mudanças), 'push' (Enviar agora), 'pull' (Baixar agora)
  function sync(mode) {
    if (!on()) return Promise.resolve(false);
    if (running) { dirty = dirty || mode !== 'pull'; return running; }
    if (!navigator.onLine) { setStatus('offline', 'Sem internet'); return Promise.resolve(false); }
    clearTimeout(timer); timer = 0;
    var wasDirty = dirty || mode === 'push'; dirty = false;
    setStatus('busy', mode === 'pull' ? 'Baixando…' : 'Sincronizando…');
    var tries = 0;
    function round() {
      tries++;
      return pull().then(function (remote) {
        var local = api.state().projects;
        if (!remote.projects) {
          return put(local, '').then(function (sha) { markSynced(local, sha); return { pushed: true }; });
        }
        var m = merge(local, remote.projects, cfg);
        if (m.changedLocal) applyLocal(m.projects);
        if (m.conflicts.length) {
          keepConflicts(m.conflicts);
          api.toast('Conflito em ' + m.conflicts.map(function (c) { return '“' + c.title + '”'; }).join(', ') + ': fiquei com a versão mais recente (' + (m.conflicts[0].kept === 'github' ? 'do GitHub' : 'deste aparelho') + '). A outra foi guardada neste aparelho.', null, null, 9000);
        }
        var needPush = m.changedRemote || (wasDirty && !sameJson(m.projects, remote.projects));
        if (mode === 'pull' && !m.changedRemote) needPush = false;
        if (!needPush) { markSynced(m.projects, remote.sha); return { pulled: m.changedLocal }; }
        return put(m.projects, remote.sha).then(function (sha) { markSynced(m.projects, sha); return { pushed: true, pulled: m.changedLocal }; });
      }).catch(function (e) {
        if ((e.status === 409 || e.status === 422) && tries < 3) return round();
        throw e;
      });
    }
    running = round().then(function (r) {
      running = null;
      setStatus('ok', 'Sincronizado');
      if (dirty) schedule();
      return r;
    }, function (e) {
      running = null;
      cfg.lastError = e.message; saveCfg();
      setStatus(e.net ? 'offline' : 'error', e.message);
      if (e.net) dirty = true;
      throw e;
    });
    return running;
  }
  function schedule() {
    if (!on()) return;
    dirty = true; setStatus('dirty', 'Mudanças para enviar');
    clearTimeout(timer); timer = setTimeout(function () { sync('auto').catch(function () {}); }, PUSH_DELAY);
  }
  function changed() { if (quiet || !on()) return; schedule(); }

  // ---------------------------------------------------------------- interface
  var dlgRefresh = null;
  function I(n) { return api.icon(n); }
  function ago(iso) {
    if (!iso) return 'nunca';
    var s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'agora há pouco'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  var LABEL = { ok: 'Sincronizado', busy: 'Sincronizando…', dirty: 'Mudanças para enviar', error: 'Erro na sincronização', offline: 'Sem internet', off: 'Não conectado' };
  function renderChip() {
    var c = document.getElementById('syncChip'); if (!c) return;
    c.hidden = !on();
    c.className = 'sync-chip ' + st.state;
    c.title = (LABEL[st.state] || '') + (st.text && st.text !== LABEL[st.state] ? ' — ' + st.text : '') + (cfg.lastSyncAt ? ' · última: ' + ago(cfg.lastSyncAt) : '');
    c.setAttribute('aria-label', 'Sincronização com GitHub: ' + (LABEL[st.state] || st.state));
    c.innerHTML = I('sync') + '<span class="sync-l">' + api.esc(LABEL[st.state] || '') + '</span>';
  }
  function guideHtml() {
    return '<ol class="wz-steps sync-guide">' +
      '<li>Toque em <b>Criar token no GitHub</b> (abre a página certa, já logado).</li>' +
      '<li><b>Token name:</b> Prancheta · <b>Expiration:</b> 1 ano (ou o que preferir).</li>' +
      '<li><b>Repository access:</b> “Only select repositories” → escolha <code>' + api.esc(cfg.repo.split('/')[1] || 'prancheta-dados') + '</code>.</li>' +
      '<li><b>Permissions</b> → Repository permissions → <b>Contents: Read and write</b>. Não precisa de mais nada.</li>' +
      '<li>Toque em <b>Generate token</b>, copie (começa com <code>github_pat_</code>) e cole abaixo.</li></ol>';
  }
  function open() {
    var view = null;
    function body() {
      if (!on()) return '<h2 id="dialogTitle">Sincronizar com GitHub</h2>' +
        '<p class="hint">Guarda seus jogos num repositório <b>privado</b> do GitHub. Assim dá para usar em mais de um aparelho e o Grok Bot consegue ler e ajudar nos seus jogos.</p>' +
        guideHtml() +
        '<a class="btn primary wz-open" href="' + TOKEN_URL + '" target="_blank" rel="noopener noreferrer">Criar token no GitHub ↗</a>' +
        '<div class="field"><label class="label" for="syTok">Token do GitHub</label><div class="ia-key wz-key"><input class="input" id="syTok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…"><button class="btn" type="button" data-sy="paste">Colar</button></div></div>' +
        '<div class="field"><label class="label" for="syRepo">Repositório privado</label><input class="input" id="syRepo" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + api.esc(cfg.repo) + '"></div>' +
        '<div data-sy-status role="status" aria-live="polite">' + statusHtml() + '</div>' +
        '<p class="ia-privacy">' + I('archive') + '<span>O token fica <b>só neste aparelho</b>: não vai para o backup exportado. Use um token que só tenha acesso a esse repositório.</span></p>' +
        '<div class="dlg-actions"><button class="btn ghost" type="button" data-dlg="cancel">Fechar</button><button class="btn primary" type="button" data-sy="connect">Conectar e sincronizar</button></div>';
      return '<h2 id="dialogTitle">Sincronizar com GitHub</h2>' +
        '<div class="sync-card ' + st.state + '"><span class="sync-ic">' + I('sync') + '</span><div><b>' + api.esc(LABEL[st.state] || '') + '</b><small>Última sincronização: ' + api.esc(ago(cfg.lastSyncAt)) + '</small></div></div>' +
        (st.state === 'error' || st.state === 'offline' ? '<p class="sync-err">' + api.esc(st.text) + '</p>' : '') +
        '<dl class="sync-kv"><dt>Repositório</dt><dd><a href="https://github.com/' + api.esc(cfg.repo) + '" target="_blank" rel="noopener noreferrer">' + api.esc(cfg.repo) + ' ↗</a></dd><dt>Arquivo</dt><dd><code>' + api.esc(cfg.path) + '</code></dd></dl>' +
        '<div class="sync-btns"><button class="btn" type="button" data-sy="push">' + I('send') + 'Enviar agora</button><button class="btn" type="button" data-sy="pull">' + I('sync') + 'Baixar agora</button></div>' +
        '<button class="sheet-item" type="button" data-dlg="grok">' + I('grok') + '<span><b>Falar com o Grok Bot</b><small>Ele lê seus jogos sincronizados e ajuda</small></span></button>' +
        '<p class="hint">A Prancheta baixa as mudanças ao abrir e envia sozinha alguns segundos depois de cada mudança. Se o mesmo jogo mudar nos dois lados, fica a versão mais recente e a outra é guardada neste aparelho.</p>' +
        '<div class="dlg-actions split"><button class="btn danger" type="button" data-sy="logout">Desconectar</button><span class="dlg-main"><button class="btn primary" type="button" data-dlg="cancel">Fechar</button></span></div>';
    }
    function statusHtml() {
      if (st.state === 'busy') return '<p class="wz-st busy"><span class="ia-spin"></span>' + api.esc(st.text) + '</p>';
      if (st.state === 'error' || st.state === 'offline') return st.text ? '<div class="wz-st bad"><b>Não sincronizou</b><span>' + api.esc(st.text) + '</span></div>' : '';
      return '';
    }
    function draw() {
      if (!view) return;
      var tok = view.querySelector('#syTok'), keep = tok ? tok.value : '';
      view.querySelector('[data-sy-body]').innerHTML = body();
      var t2 = view.querySelector('#syTok'); if (t2 && keep) t2.value = keep;
      if (t2) t2.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); connect(); } });
    }
    function connect() {
      var tok = (view.querySelector('#syTok').value || '').trim().replace(/^bearer\s+/i, ''), repo = (view.querySelector('#syRepo').value || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$|\/+$/g, '');
      if (!tok) { setStatus('error', 'Cole o token primeiro.'); return; }
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { setStatus('error', 'Repositório no formato dono/nome, ex.: ' + DEFAULT_REPO + '.'); return; }
      var prev = { token: cfg.token, repo: cfg.repo };
      cfg.token = tok; cfg.repo = repo; cfg.sha = ''; cfg.lastSyncAt = ''; cfg.lastIds = [];
      sync('push').then(function () {
        saveCfg(); draw(); api.toast('Sincronização ligada: ' + repo + '.');
      }, function () { cfg.token = prev.token; cfg.repo = prev.repo || DEFAULT_REPO; saveCfg(); var keepSt = st; draw(); st = keepSt; var el = view && view.querySelector('[data-sy-status]'); if (el) el.innerHTML = statusHtml(); });
    }
    return api.openDialog('<div class="dlg sheet sync-dlg"><div data-sy-body></div></div>', function (d) {
      view = d; dlgRefresh = function () { if (!view) return; if (on()) draw(); else { var el = view.querySelector('[data-sy-status]'); if (el) el.innerHTML = statusHtml(); } };
      draw();
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sy]'); if (!b) return;
        var k = b.dataset.sy;
        if (k === 'connect') connect();
        else if (k === 'paste') {
          var f = d.querySelector('#syTok');
          if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { f.value = String(t || '').trim(); if (f.value) connect(); }, function () { f.focus(); setStatus('error', 'Toque e segure no campo e escolha “Colar”.'); });
          else f.focus();
        }
        else if (k === 'push') sync('push').then(function () { api.toast('Enviado para o GitHub.'); }, function () {});
        else if (k === 'pull') sync('pull').then(function (r) { api.toast(r && r.pulled ? 'Mudanças do GitHub baixadas.' : 'Já estava tudo igual ao GitHub.'); }, function () {});
        else if (k === 'logout') {
          cfg.token = ''; cfg.sha = ''; cfg.lastIds = []; cfg.lastSyncAt = ''; saveCfg(); setStatus('off');
          api.toast('Sincronização desligada neste aparelho. O repositório no GitHub continua como está.'); draw();
        }
      });
    }).then(function (r) { view = null; dlgRefresh = null; if (r && r.action === 'grok') openGrok(); });
  }

  var GROK_IDEAS = ['revise o GDD e me diga o que falta', 'sugira as próximas tarefas e adicione no quadro', 'organize as tarefas por prioridade', 'monte um plano para o próximo marco'];
  function openGrok() {
    var p = api.current && api.current();
    var game = p && p.title ? 'no jogo “' + p.title + '”, ' : '';
    var synced = on() && cfg.lastSyncAt;
    function prompt(idea) { return 'Grok, abre a Prancheta (' + cfg.repo + ', arquivo ' + cfg.path + ') e ' + game + idea + '. Pode editar o arquivo direto no repositório mantendo o mesmo formato (updatedAt atualizado no jogo que mudar).'; }
    var html = '<div class="dlg sheet grok-dlg"><h2 id="dialogTitle">Falar com o Grok Bot</h2>' +
      (synced
        ? '<div class="sync-card ok"><span class="sync-ic">' + I('grok') + '</span><div><b>Seus jogos estão sincronizados</b><small>Abra o Grok Bot e peça o que quiser. Última sincronização: ' + api.esc(ago(cfg.lastSyncAt)) + '.</small></div></div>' +
          '<p class="hint">O Grok Bot não roda dentro do app: ele lê e edita o arquivo dos seus jogos no GitHub (' + api.esc(cfg.repo) + '). Quando ele terminar, abra a Prancheta ou toque em <b>Baixar agora</b>.</p>' +
          '<div class="field"><label class="label" for="grokP">Pedido pronto (dá para editar)</label><textarea class="textarea" id="grokP" rows="4">' + api.esc(prompt(GROK_IDEAS[0])) + '</textarea></div>' +
          '<div class="ia-chips grok-ideas">' + GROK_IDEAS.map(function (x, i) { return '<button class="chip" type="button" data-grok-idea="' + i + '">' + api.esc(x) + '</button>'; }).join('') + '</div>' +
          '<div class="dlg-actions"><button class="btn ghost" type="button" data-dlg="cancel">Fechar</button><button class="btn primary" type="button" data-grok="copy">Copiar pedido</button></div>'
        : '<div class="sync-card off"><span class="sync-ic">' + I('grok') + '</span><div><b>Primeiro, sincronize seus jogos</b><small>O Grok Bot ajuda lendo os seus jogos num repositório privado do GitHub.</small></div></div>' +
          '<p class="hint">Ligue a sincronização com GitHub (leva 2 minutos). Depois volte aqui para copiar um pedido pronto para o Grok Bot.</p>' +
          '<div class="dlg-actions"><button class="btn ghost" type="button" data-dlg="cancel">Fechar</button><button class="btn primary" type="button" data-dlg="sync">Configurar sincronização</button></div>') +
      '</div>';
    return api.openDialog(html, function (d) {
      d.addEventListener('click', function (e) {
        var i = e.target.closest('[data-grok-idea]');
        if (i) { d.querySelector('#grokP').value = prompt(GROK_IDEAS[+i.dataset.grokIdea]); return; }
        var c = e.target.closest('[data-grok=copy]'); if (!c) return;
        var t = d.querySelector('#grokP');
        copyText(t.value, t).then(function (ok) { c.textContent = ok ? 'Copiado ✓' : 'Selecione e copie'; api.toast(ok ? 'Pedido copiado. Agora cole na conversa com o Grok Bot.' : 'Não deu para copiar sozinho: o texto está selecionado, copie manualmente.'); });
      });
    }).then(function (r) { if (r && r.action === 'sync') open(); });
  }
  function copyText(text, el) {
    function fallback() { try { el.focus(); el.select(); return Promise.resolve(document.execCommand('copy')); } catch (e) { return Promise.resolve(false); } }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return fallback();
  }

  window.addEventListener('online', function () { if (on() && (dirty || st.state === 'offline')) sync('auto').catch(function () {}); });
  window.addEventListener('offline', function () { if (on()) setStatus('offline', 'Sem internet'); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && dirty && timer) { clearTimeout(timer); sync('auto').catch(function () {}); } });

  window.PranchetaSync = {
    init: function (a) {
      api = a; renderChip();
      if (on()) { setStatus('busy', 'Sincronizando…'); setTimeout(function () { sync('auto').catch(function () {}); }, 300); }
    },
    open: open, openGrok: openGrok, changed: changed, sync: sync,
    on: on, status: function () { return st; },
    // usado só nos testes automatizados
    _merge: merge, _key: KEY, _b64: { enc: b64encode, dec: b64decode }
  };
})();
