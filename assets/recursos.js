/* Prancheta — Recursos do jogo: efeitos especiais (com editor de partículas), sons, arte, animações,
   personagens, itens, fases, UI e diálogos. Os dados ficam no próprio jogo (p.effects e p.resources),
   então entram no backup e na sincronização junto com o resto. */
(function () {
  'use strict';
  var api = null;

  // ---------------------------------------------------------------- listas
  var RES_STATUS = [['ideia', 'Ideia'], ['fazendo', 'Fazendo'], ['pronto', 'Pronto']];
  var PRIORITY = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
  var FX_TYPES = [['particulas', 'Partículas'], ['explosao', 'Explosão'], ['fumaca', 'Fumaça'], ['fogo', 'Fogo'], ['brilho', 'Brilho'], ['impacto', 'Impacto'], ['clima', 'Clima'], ['magia', 'Magia / cura'], ['outro', 'Outro']];
  var INTENSITY = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']];
  var SHAPES = [['circulo', 'Círculo'], ['quadrado', 'Quadrado'], ['faisca', 'Faísca'], ['cruz', 'Cruz']];
  var EMITTERS = [['ponto', 'Ponto'], ['circulo', 'Círculo'], ['linha', 'Linha']];
  var ORIGINS = [['centro', 'Centro'], ['base', 'Embaixo'], ['topo', 'No topo']];
  var MODES = [['continuo', 'Contínuo'], ['rajada', 'Rajada']];

  // categorias da tela (as de "list" usam p.resources; personagens e fases reaproveitam o que já existe)
  var KINDS = [
    { k: 'efeitos', label: 'Efeitos especiais', short: 'Efeitos', icon: 'efeito', hint: 'Partículas, explosões, fumaça, brilho, impacto e clima.' },
    { k: 'sons', label: 'Sons e música', short: 'Sons', icon: 'som', list: 'resources', subs: ['SFX', 'Música', 'Ambiente', 'Voz'], hint: 'Efeitos sonoros (SFX), trilhas (BGM), ambiente e vozes.',
      starters: ['Música do menu', 'Música da fase 1', 'Som de passos', 'Som de dano', 'Som de morte', 'Clique de botão (UI)', 'Som de pegar item'] },
    { k: 'arte', label: 'Sprites, arte e 3D', short: 'Arte', icon: 'arte', list: 'resources', subs: ['Sprite', 'Modelo 3D', 'Textura', 'Cenário', 'Ícone', 'Outro'], hint: 'Sprites, tilesets, modelos 3D, texturas e cenários.',
      starters: ['Sprite do protagonista', 'Tileset do cenário', 'Fundo (parallax)', 'Ícone do app', 'Texturas do chão'] },
    { k: 'animacoes', label: 'Animações', short: 'Animações', icon: 'animacao', list: 'resources', subs: ['Personagem', 'Inimigo', 'Objeto', 'UI', 'Cena'], hint: 'Andar, correr, pular, atacar, morrer, abrir porta…',
      starters: ['Parado (idle)', 'Andar', 'Correr', 'Pular', 'Atacar', 'Levar dano', 'Morrer'] },
    { k: 'personagens', label: 'Personagens e inimigos', short: 'Personagens', icon: 'personagens', hint: 'A mesma lista da seção Personagens e criaturas.' },
    { k: 'itens', label: 'Itens', short: 'Itens', icon: 'item', list: 'resources', subs: ['Arma', 'Consumível', 'Equipamento', 'Chave', 'Coletável', 'Veículo', 'Outro'], hint: 'Armas, consumíveis, equipamentos, chaves e coletáveis.',
      starters: ['Kit médico', 'Munição', 'Arma corpo a corpo', 'Chave da porta'] },
    { k: 'fases', label: 'Fases e níveis', short: 'Fases', icon: 'mundo', hint: 'A mesma lista da seção Mundo e níveis.' },
    { k: 'ui', label: 'UI e HUD', short: 'UI/HUD', icon: 'hud', list: 'resources', subs: ['HUD', 'Menu', 'Tela', 'Ícone', 'Fonte', 'Outro'], hint: 'Menus, barra de vida, inventário, pausa, game over…',
      starters: ['Menu principal', 'Barra de vida (HUD)', 'Tela de pausa', 'Tela de game over', 'Inventário', 'Configurações'] },
    { k: 'dialogos', label: 'Diálogos e história', short: 'História', icon: 'dialogo', list: 'resources', subs: ['Diálogo', 'Cutscene', 'Missão', 'Lore', 'Texto da tela'], hint: 'Falas, cutscenes, missões, lore e textos do jogo.',
      starters: ['Introdução da história', 'Tutorial (textos)', 'Final do jogo'] }
  ];
  var KIND_BY = {}; KINDS.forEach(function (x) { KIND_BY[x.k] = x; });
  var RES_KINDS = KINDS.filter(function (x) { return x.list === 'resources'; }).map(function (x) { return x.k; });
  var FX_STARTERS = [['explosao', 'Explosão'], ['faiscas', 'Faíscas de impacto'], ['fumaca', 'Fumaça'], ['fogo', 'Fogo'], ['cura', 'Cura'], ['chuva', 'Chuva']];

  // ---------------------------------------------------------------- presets de partículas
  var BASE = { mode: 'continuo', rate: 40, amount: 60, origin: 'centro', emitter: 'ponto', emitSize: 20, speed: 120, speedVar: 0.3, direction: 0, spread: 30,
    gravity: 0, damping: 0, lifetime: 1.2, sizeStart: 8, sizeEnd: 2, colorStart: '#ffd25a', colorEnd: '#ff3b1f', shape: 'circulo', additive: true };
  var PRESETS = {
    explosao: { label: 'Explosão', type: 'explosao', p: { mode: 'rajada', amount: 140, origin: 'centro', emitter: 'ponto', speed: 260, speedVar: 0.6, direction: 0, spread: 180, gravity: 120, damping: 1.8, lifetime: 0.9, sizeStart: 10, sizeEnd: 2, colorStart: '#fff3b0', colorEnd: '#ff5a1f', shape: 'circulo', additive: true } },
    fogo: { label: 'Fogo', type: 'fogo', p: { mode: 'continuo', rate: 90, origin: 'base', emitter: 'circulo', emitSize: 14, speed: 90, speedVar: 0.4, direction: 0, spread: 16, gravity: -60, damping: 0.2, lifetime: 1.0, sizeStart: 18, sizeEnd: 4, colorStart: '#ffd25a', colorEnd: '#ff3b1f', shape: 'circulo', additive: true } },
    fumaca: { label: 'Fumaça', type: 'fumaca', p: { mode: 'continuo', rate: 22, origin: 'base', emitter: 'circulo', emitSize: 12, speed: 45, speedVar: 0.4, direction: 0, spread: 22, gravity: -15, damping: 0.3, lifetime: 2.6, sizeStart: 14, sizeEnd: 46, colorStart: '#9a9a9a', colorEnd: '#3a3a3a', shape: 'circulo', additive: false } },
    faiscas: { label: 'Faíscas', type: 'impacto', p: { mode: 'rajada', amount: 40, origin: 'centro', emitter: 'ponto', speed: 340, speedVar: 0.5, direction: 0, spread: 70, gravity: 600, damping: 0.4, lifetime: 0.6, sizeStart: 3, sizeEnd: 1, colorStart: '#ffffff', colorEnd: '#ffb020', shape: 'faisca', additive: true } },
    chuva: { label: 'Chuva', type: 'clima', p: { mode: 'continuo', rate: 160, origin: 'topo', emitter: 'linha', emitSize: 460, speed: 520, speedVar: 0.15, direction: 190, spread: 3, gravity: 300, damping: 0, lifetime: 0.9, sizeStart: 2, sizeEnd: 2, colorStart: '#9cc9ff', colorEnd: '#5f8fd6', shape: 'faisca', additive: false } },
    cura: { label: 'Cura', type: 'magia', p: { mode: 'continuo', rate: 40, origin: 'centro', emitter: 'circulo', emitSize: 40, speed: 50, speedVar: 0.3, direction: 0, spread: 12, gravity: -40, damping: 0, lifetime: 1.4, sizeStart: 8, sizeEnd: 3, colorStart: '#9dffb0', colorEnd: '#2bd96b', shape: 'cruz', additive: true } },
    neve: { label: 'Neve', type: 'clima', p: { mode: 'continuo', rate: 30, origin: 'topo', emitter: 'linha', emitSize: 460, speed: 60, speedVar: 0.4, direction: 180, spread: 15, gravity: 10, damping: 0, lifetime: 5, sizeStart: 4, sizeEnd: 3, colorStart: '#ffffff', colorEnd: '#dfe9ff', shape: 'circulo', additive: false } },
    magia: { label: 'Magia', type: 'magia', p: { mode: 'continuo', rate: 60, origin: 'centro', emitter: 'circulo', emitSize: 30, speed: 30, speedVar: 0.5, direction: 0, spread: 180, gravity: -20, damping: 0.5, lifetime: 1.6, sizeStart: 6, sizeEnd: 1, colorStart: '#c39bff', colorEnd: '#4cc9ff', shape: 'circulo', additive: true } }
  };
  var PRESET_ORDER = ['explosao', 'fogo', 'fumaca', 'faiscas', 'chuva', 'cura', 'neve', 'magia'];
  // limites dos controles: [min, max, passo, unidade]
  var RANGES = { rate: [1, 300, 1, '/s'], amount: [1, 400, 1, ''], emitSize: [0, 480, 1, 'px'], speed: [0, 900, 5, 'px/s'], speedVar: [0, 1, 0.05, ''], direction: [0, 359, 1, '°'], spread: [0, 180, 1, '°'],
    gravity: [-800, 1200, 10, 'px/s²'], damping: [0, 5, 0.1, ''], lifetime: [0.1, 8, 0.1, 's'], sizeStart: [0, 80, 1, 'px'], sizeEnd: [0, 80, 1, 'px'] };

  // ---------------------------------------------------------------- modelo
  function uid() { return api ? api.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }
  function has(list, v) { return list.some(function (o) { return o[0] === v; }); }
  function hex(v, d) { v = String(v || '').trim(); if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]; return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d; }
  function num(v, k) { var r = RANGES[k], n = parseFloat(v); if (!isFinite(n)) n = BASE[k]; return Math.min(r[1], Math.max(r[0], n)); }
  function cleanParticles(x) {
    x = x && typeof x === 'object' ? x : {};
    var o = {};
    Object.keys(RANGES).forEach(function (k) { o[k] = num(x[k] != null ? x[k] : BASE[k], k); });
    o.mode = has(MODES, x.mode) ? x.mode : BASE.mode;
    o.origin = has(ORIGINS, x.origin) ? x.origin : BASE.origin;
    o.emitter = has(EMITTERS, x.emitter) ? x.emitter : BASE.emitter;
    o.shape = has(SHAPES, x.shape) ? x.shape : BASE.shape;
    o.colorStart = hex(x.colorStart, BASE.colorStart); o.colorEnd = hex(x.colorEnd, BASE.colorEnd);
    o.additive = x.additive == null ? BASE.additive : !!x.additive;
    o.preset = PRESETS[x.preset] ? x.preset : '';
    return o;
  }
  function normalizeEffect(e) {
    e = e && typeof e === 'object' ? e : {};
    var out = Object.assign({}, e);
    out.id = e.id || uid();
    out.name = String(e.name || 'Efeito sem nome');
    out.type = has(FX_TYPES, e.type) ? e.type : 'particulas';
    out.trigger = String(e.trigger || '');
    out.duration = isFinite(parseFloat(e.duration)) ? Math.max(0, Math.min(60, parseFloat(e.duration))) : 1;
    out.intensity = has(INTENSITY, e.intensity) ? e.intensity : 'media';
    out.status = has(RES_STATUS, e.status) ? e.status : 'ideia';
    out.priority = has(PRIORITY, e.priority) ? e.priority : 'media';
    out.notes = String(e.notes || '');
    out.mechanic = String(e.mechanic || ''); out.level = String(e.level || '');
    out.assignee = String(e.assignee || ''); out.milestoneId = String(e.milestoneId || '');
    out.particles = cleanParticles(e.particles);
    out.colors = [out.particles.colorStart, out.particles.colorEnd];
    if (!out.createdAt) out.createdAt = now();
    return out;
  }
  function normalizeResource(r) {
    var out = Object.assign({}, r);
    out.id = r.id || uid();
    out.kind = RES_KINDS.indexOf(r.kind) >= 0 ? r.kind : 'arte';
    out.name = String(r.name || 'Sem nome');
    out.sub = String(r.sub || '');
    out.status = has(RES_STATUS, r.status) ? r.status : 'ideia';
    out.priority = has(PRIORITY, r.priority) ? r.priority : 'media';
    out.notes = String(r.notes || ''); out.link = String(r.link || '');
    out.assignee = String(r.assignee || ''); out.milestoneId = String(r.milestoneId || '');
    if (!out.createdAt) out.createdAt = now();
    return out;
  }
  // chamada pelo normalize() do app: dados da v1.3 ganham as listas novas sem perder nada
  function normalizeProject(p) {
    if (!Array.isArray(p.effects)) p.effects = [];
    if (!Array.isArray(p.resources)) p.resources = [];
    p.effects = p.effects.filter(function (x) { return x && typeof x === 'object'; }).map(normalizeEffect);
    p.resources = p.resources.filter(function (x) { return x && typeof x === 'object'; }).map(normalizeResource);
    return p;
  }
  function makeEffect(o) {
    o = o || {};
    var key = PRESETS[o.preset] ? o.preset : guessPreset(o.type);
    var pr = PRESETS[key];
    var parts = Object.assign({}, BASE, pr ? pr.p : {}, { preset: pr ? key : '' });
    var cols = Array.isArray(o.colors) ? o.colors : [];
    if (hex(cols[0])) parts.colorStart = hex(cols[0]);
    if (hex(cols[1])) parts.colorEnd = hex(cols[1]); else if (hex(cols[0])) parts.colorEnd = hex(cols[0]);
    return normalizeEffect({ id: uid(), name: o.name || (pr ? pr.label : 'Novo efeito'), type: o.type || (pr ? pr.type : 'particulas'), trigger: o.trigger, duration: o.duration,
      intensity: o.intensity, status: o.status, priority: o.priority, notes: o.notes, mechanic: o.mechanic, level: o.level, particles: Object.assign(parts, o.particles || {}), createdAt: now() });
  }
  function guessPreset(type) { return { explosao: 'explosao', fumaca: 'fumaca', fogo: 'fogo', impacto: 'faiscas', clima: 'chuva', magia: 'cura', brilho: 'magia' }[type] || ''; }
  function makeResource(o) {
    return normalizeResource({ id: uid(), kind: o.kind, name: o.name, sub: o.sub, status: o.status, priority: o.priority, notes: o.notes, link: o.link, createdAt: now() });
  }

  // ---------------------------------------------------------------- progresso / checklist
  function bucket(kind, item) {
    var s = kind === 'personagens' ? item.artStatus : item.status;
    if (s === 'pronto') return 'pronto';
    if (s === 'fazendo' || s === 'andamento' || s === 'provisorio') return 'fazendo';
    return 'falta';
  }
  function itemsOf(p, kind) {
    if (kind === 'efeitos') return p.effects || [];
    if (kind === 'personagens') return p.characters || [];
    if (kind === 'fases') return p.levels || [];
    return (p.resources || []).filter(function (r) { return r.kind === kind; });
  }
  function summary(p) {
    var total = 0, done = 0, doing = 0, per = {};
    KINDS.forEach(function (K) {
      var it = itemsOf(p, K.k), d = 0, g = 0;
      it.forEach(function (x) { var b = bucket(K.k, x); if (b === 'pronto') d++; else if (b === 'fazendo') g++; });
      per[K.k] = { total: it.length, done: d, doing: g };
      total += it.length; done += d; doing += g;
    });
    return { total: total, done: done, doing: doing, pct: total ? Math.round(done * 100 / total) : 0, per: per };
  }
  function count(p) { return (p.effects || []).length + (p.resources || []).length; }

  // ---------------------------------------------------------------- simulação (pré-visualização no canvas)
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function Sim(canvas, getCfg) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.get = getCfg; this.ps = []; this.acc = 0; this.timer = 0; this.last = 0; this.paused = false; this.raf = 0; this.frames = 0;
    this.bg = 'escuro';
  }
  Sim.prototype.size = function () {
    var r = this.c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this.c.width !== Math.round(w * dpr) || this.c.height !== Math.round(h * dpr)) { this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); }
    this.w = w; this.h = h; this.dpr = dpr;
  };
  Sim.prototype.origin = function (q) {
    var x = this.w / 2, y = q.origin === 'topo' ? 6 : q.origin === 'base' ? this.h - 18 : this.h / 2;
    if (q.emitter === 'circulo' && q.emitSize > 0) { var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * q.emitSize; x += Math.cos(a) * r; y += Math.sin(a) * r; }
    else if (q.emitter === 'linha') x += (Math.random() - 0.5) * q.emitSize;
    return [x, y];
  };
  Sim.prototype.spawn = function (q, n) {
    for (var i = 0; i < n && this.ps.length < 1500; i++) {
      var o = this.origin(q), a = (q.direction + (Math.random() * 2 - 1) * q.spread) * Math.PI / 180;
      var sp = q.speed * (1 + (Math.random() * 2 - 1) * q.speedVar);
      this.ps.push({ x: o[0], y: o[1], vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp, age: 0, life: q.lifetime * (0.75 + Math.random() * 0.5) });
    }
  };
  Sim.prototype.burst = function () { var q = this.get(); this.spawn(q, q.amount); this.timer = Math.max(q.lifetime + 0.5, (this.fx && this.fx.duration) || 0); };
  Sim.prototype.step = function (dt) {
    var q = this.get();
    if (q.mode === 'rajada') { this.timer -= dt; if (this.timer <= 0) this.burst(); }
    else { this.acc += q.rate * dt; var n = Math.floor(this.acc); this.acc -= n; this.spawn(q, n); }
    var damp = Math.max(0, 1 - q.damping * dt), out = [];
    for (var i = 0; i < this.ps.length; i++) {
      var p = this.ps[i]; p.age += dt; if (p.age >= p.life) continue;
      p.vy += q.gravity * dt; p.vx *= damp; p.vy *= damp; p.x += p.vx * dt; p.y += p.vy * dt; out.push(p);
    }
    this.ps = out;
  };
  Sim.prototype.draw = function () {
    var q = this.get(), g = this.ctx, w = this.w, h = this.h;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (this.bg === 'claro') { g.fillStyle = '#d9dbe4'; g.fillRect(0, 0, w, h); }
    else {
      g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; g.beginPath();
      for (var gx = 0; gx < w; gx += 24) { g.moveTo(gx + .5, 0); g.lineTo(gx + .5, h); }
      for (var gy = 0; gy < h; gy += 24) { g.moveTo(0, gy + .5); g.lineTo(w, gy + .5); }
      g.stroke();
    }
    var c0 = rgb(q.colorStart), c1 = rgb(q.colorEnd);
    g.globalCompositeOperation = q.additive ? 'lighter' : 'source-over';
    for (var i = 0; i < this.ps.length; i++) {
      var p = this.ps[i], t = p.age / p.life, s = q.sizeStart + (q.sizeEnd - q.sizeStart) * t;
      var a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92; if (a <= 0 || s <= 0) continue;
      var r = Math.round(c0[0] + (c1[0] - c0[0]) * t), gg = Math.round(c0[1] + (c1[1] - c0[1]) * t), b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      g.globalAlpha = Math.max(0, Math.min(1, a * (q.additive ? 0.85 : 0.75)));
      g.fillStyle = g.strokeStyle = 'rgb(' + r + ',' + gg + ',' + b + ')';
      if (q.shape === 'quadrado') g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      else if (q.shape === 'faisca') {
        var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, len = Math.max(s * 2, Math.min(40, v * 0.035));
        g.lineWidth = Math.max(1, s); g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx / v * len, p.y - p.vy / v * len); g.stroke();
      } else if (q.shape === 'cruz') { var k = s / 3; g.fillRect(p.x - s / 2, p.y - k / 2, s, k); g.fillRect(p.x - k / 2, p.y - s / 2, k, s); }
      else { g.beginPath(); g.arc(p.x, p.y, s / 2, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  };
  Sim.prototype.start = function () {
    var self = this; this.size(); this.reset();
    function loop(t) {
      if (!self.c.isConnected) { self.raf = 0; return; }
      var dt = self.last ? Math.min(0.05, (t - self.last) / 1000) : 0.016; self.last = t;
      if (!self.paused && !document.hidden) { self.size(); self.step(dt); self.draw(); self.frames++; }
      self.raf = requestAnimationFrame(loop);
    }
    this.raf = requestAnimationFrame(loop);
  };
  Sim.prototype.reset = function () { this.ps = []; this.acc = 0; this.timer = 0; };
  Sim.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; };

  // ---------------------------------------------------------------- exportar (JSON e cena do Godot 4)
  function f(n, d) { return (+n).toFixed(d == null ? 3 : d).replace(/\.?0+$/, '') || '0'; }
  function gf(n) { var s = f(n, 3); return s.indexOf('.') < 0 ? s + '.0' : s; }
  function col(h, a) { var c = rgb(h); return gf(c[0] / 255) + ', ' + gf(c[1] / 255) + ', ' + gf(c[2] / 255) + ', ' + gf(a); }
  function godotParams(fx) {
    var q = fx.particles, burst = q.mode === 'rajada';
    var amount = burst ? Math.round(q.amount) : Math.max(1, Math.ceil(q.rate * q.lifetime));
    var a = q.direction * Math.PI / 180;
    var big = Math.max(q.sizeStart, q.sizeEnd, 0.01);
    return { amount: amount, lifetime: q.lifetime, one_shot: burst, explosiveness: burst ? 1 : 0,
      direction: [+f(Math.sin(a)), +f(-Math.cos(a)), 0], spread: q.spread,
      initial_velocity_min: +f(q.speed * (1 - q.speedVar), 1), initial_velocity_max: +f(q.speed * (1 + q.speedVar), 1),
      gravity: [0, q.gravity, 0], damping: +f(q.damping * q.speed * 0.5, 1), scale: +f(big, 2), scale_curve: [+f(q.sizeStart / big), +f(q.sizeEnd / big)],
      color_ramp: [q.colorStart, q.colorEnd], blend_add: q.additive,
      emission_shape: q.emitter === 'circulo' ? 'sphere' : q.emitter === 'linha' ? 'box' : 'point', emission_size: q.emitSize };
  }
  function toJSON(fx, p) {
    var q = fx.particles;
    return { formato: 'prancheta-efeito', versao: 1, jogo: p ? p.title : undefined, nome: fx.name, tipo: fx.type, gatilho: fx.trigger, duracao_s: fx.duration, intensidade: fx.intensity,
      cores: [q.colorStart, q.colorEnd], estado: fx.status, prioridade: fx.priority, mecanica: fx.mechanic || undefined, fase: fx.level || undefined, notas: fx.notes || undefined,
      particulas: { modo: q.mode, taxa_por_s: q.rate, quantidade_rajada: q.amount, origem: q.origin, emissor: q.emitter, tamanho_emissor_px: q.emitSize, velocidade_px_s: q.speed,
        variacao_velocidade: q.speedVar, direcao_graus: q.direction, abertura_graus: q.spread, gravidade_px_s2: q.gravity, arrasto: q.damping, vida_s: q.lifetime,
        tamanho_inicial_px: q.sizeStart, tamanho_final_px: q.sizeEnd, cor_inicial: q.colorStart, cor_final: q.colorEnd, formato: q.shape, brilho_aditivo: q.additive, preset: q.preset || undefined },
      godot4: Object.assign({ no: 'GPUParticles2D', material: 'ParticleProcessMaterial' }, godotParams(fx)) };
  }
  function nodeName(s) { var n = String(s || 'Efeito').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); return n || 'Efeito'; }
  function toTscn(fx) {
    var q = fx.particles, g = godotParams(fx), subs = [], n = 0;
    function sub(type, body) { var id = type + '_' + (++n); subs.push('[sub_resource type="' + type + '" id="' + id + '"]\n' + body + '\n'); return id; }
    var grad = sub('Gradient', 'offsets = PackedFloat32Array(0, 1)\ncolors = PackedColorArray(' + col(q.colorStart, 1) + ', ' + col(q.colorEnd, 0) + ')');
    var gtex = sub('GradientTexture1D', 'gradient = SubResource("' + grad + '")');
    var curve = sub('Curve', '_data = [Vector2(0, ' + gf(g.scale_curve[0]) + '), 0.0, 0.0, 0, 0, Vector2(1, ' + gf(g.scale_curve[1]) + '), 0.0, 0.0, 0, 0]\npoint_count = 2');
    var ctex = sub('CurveTexture', 'curve = SubResource("' + curve + '")');
    var mat = ['particle_flag_disable_z = true'];
    if (g.emission_shape === 'sphere') mat.push('emission_shape = 1', 'emission_sphere_radius = ' + gf(Math.max(0.01, q.emitSize)));
    if (g.emission_shape === 'box') mat.push('emission_shape = 3', 'emission_box_extents = Vector3(' + gf(q.emitSize / 2) + ', 1, 1)');
    mat.push('direction = Vector3(' + gf(g.direction[0]) + ', ' + gf(g.direction[1]) + ', 0)', 'spread = ' + gf(q.spread),
      'initial_velocity_min = ' + gf(g.initial_velocity_min), 'initial_velocity_max = ' + gf(g.initial_velocity_max),
      'gravity = Vector3(0, ' + gf(q.gravity) + ', 0)');
    if (g.damping > 0) mat.push('damping_min = ' + gf(g.damping), 'damping_max = ' + gf(g.damping));
    mat.push('scale_min = ' + gf(g.scale), 'scale_max = ' + gf(g.scale), 'scale_curve = SubResource("' + ctex + '")', 'color_ramp = SubResource("' + gtex + '")');
    var pm = sub('ParticleProcessMaterial', mat.join('\n'));
    var cim = q.additive ? sub('CanvasItemMaterial', 'blend_mode = 1') : '';
    var node = ['[node name="' + nodeName(fx.name) + '" type="GPUParticles2D"]'];
    if (cim) node.push('material = SubResource("' + cim + '")');
    node.push('amount = ' + g.amount, 'lifetime = ' + gf(q.lifetime));
    if (g.one_shot) node.push('one_shot = true', 'explosiveness = 1.0');
    node.push('process_material = SubResource("' + pm + '")');
    var nm = String(fx.name || '').replace(/[\r\n]+/g, ' ');
    return '[gd_scene load_steps=' + (subs.length + 1) + ' format=3]\n\n' +
      '; Efeito "' + nm + '" exportado pela Prancheta para Godot 4.x (GPUParticles2D)\n' +
      '; Salve como ' + nodeName(fx.name).toLowerCase() + '.tscn dentro do projeto e instancie na cena.\n' +
      '; Sem textura cada partícula é um quadradinho; para ' + labelOf(SHAPES, q.shape).toLowerCase() + ', coloque uma textura em "Texture".\n' +
      (g.one_shot ? '; Rajada (one_shot): no código, chame $' + nodeName(fx.name) + '.restart() para disparar.\n' : '') +
      '\n' + subs.join('\n') + '\n' + node.join('\n') + '\n';
  }
  function labelOf(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }

  // ---------------------------------------------------------------- interface
  function I(n) { return api.icon(n); }
  function E(s) { return api.esc(s); }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + E(o[1]) + '</option>'; }).join(''); }
  var ui = { tab: 'visao' };

  function tabsHtml(p, tab) {
    var s = summary(p);
    var tabs = [['visao', 'Visão geral', 'checklist', s.total ? s.pct + '%' : '']].concat(KINDS.map(function (K) { return [K.k, K.short, K.icon, s.per[K.k].total || '']; }));
    return '<nav class="rs-tabs" aria-label="Categorias de recursos">' + tabs.map(function (t) {
      return '<a href="' + api.projHash(p, 'recursos') + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + I(t[2]) + '<span>' + E(t[1]) + '</span>' + (t[3] !== '' ? '<small>' + E(t[3]) + '</small>' : '') + '</a>';
    }).join('') + '</nav>';
  }

  function html(p, tab, fxId) {
    tab = tab === 'visao' || KIND_BY[tab] ? tab : 'visao';
    ui.tab = tab;
    if (tab === 'efeitos' && fxId) {
      var fx = (p.effects || []).filter(function (x) { return x.id === fxId; })[0];
      if (fx) return '<div class="rs" data-rs-root>' + editorHtml(p, fx) + '</div>';
    }
    var head = '<header class="sec-head"><div><div class="eyebrow">Recursos do jogo</div><h1>' + (tab === 'visao' ? 'Tudo o que o jogo precisa' : E(KIND_BY[tab].label)) + '</h1><p>' +
      E(tab === 'visao' ? 'Efeitos especiais, sons, arte, animações, personagens, itens, fases, UI e história, com o que já está pronto e o que falta.' : KIND_BY[tab].hint) + '</p></div></header>';
    var body = tab === 'visao' ? overviewHtml(p) : tab === 'efeitos' ? effectsHtml(p) : listHtml(p, tab);
    return '<div class="rs" data-rs-root>' + head + tabsHtml(p, tab) + body + '</div>';
  }

  function overviewHtml(p) {
    var s = summary(p), missing = [];
    KINDS.forEach(function (K) {
      itemsOf(p, K.k).forEach(function (x) { if (bucket(K.k, x) !== 'pronto') missing.push({ K: K, x: x, pr: { alta: 0, media: 1, baixa: 2 }[x.priority] != null ? { alta: 0, media: 1, baixa: 2 }[x.priority] : 1 }); });
    });
    missing.sort(function (a, b) { return a.pr - b.pr; });
    var assetsN = (p.assets || []).length;
    return '<div class="rs-over">' +
      '<div class="panel rs-total"><div class="rs-total-n"><b>' + s.pct + '%</b><span>' + s.done + ' de ' + s.total + ' recursos prontos' + (s.doing ? ' · ' + s.doing + ' em andamento' : '') + '</span></div>' +
        '<div class="progress" role="progressbar" aria-label="Recursos prontos" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.pct + '" style="--c:var(--green)"><span style="width:' + s.pct + '%"></span></div></div>' +
      '<div class="rs-cats">' + KINDS.map(function (K) {
        var c = s.per[K.k], pct = c.total ? Math.round(c.done * 100 / c.total) : 0;
        return '<a class="rs-cat' + (c.total ? '' : ' empty') + '" href="' + api.projHash(p, 'recursos') + '/' + K.k + '"><span class="rs-cat-ic">' + I(K.icon) + '</span>' +
          '<span class="rs-cat-t"><b>' + E(K.label) + '</b><small>' + (c.total ? c.done + '/' + c.total + ' prontos' + (c.doing ? ' · ' + c.doing + ' fazendo' : '') : 'Nada listado ainda') + '</small>' +
          '<span class="progress"><span style="width:' + pct + '%"></span></span></span>' + I('right') + '</a>';
      }).join('') + '</div>' +
      '<section class="panel rs-check"><h3>' + I('checklist') + 'O que falta</h3>' +
        (missing.length ? '<ul class="rs-miss">' + missing.slice(0, 40).map(function (m) {
          var st = m.K.k === 'personagens' ? m.x.artStatus : m.x.status;
          return '<li><a href="' + api.projHash(p, 'recursos') + '/' + m.K.k + (m.K.k === 'efeitos' ? '/' + encodeURIComponent(m.x.id) : '') + '"><span class="prio-dot" data-v="' + E(m.x.priority || 'media') + '" title="Prioridade ' + E(labelOf(PRIORITY, m.x.priority || 'media')) + '"></span>' +
            '<span class="rs-miss-t"><b>' + E(m.x.name || 'Sem nome') + '</b><small>' + E(m.K.short) + ' · ' + E(st ? labelStatus(m.K.k, st) : 'Ideia') + '</small></span>' + I('right') + '</a></li>';
        }).join('') + '</ul>' + (missing.length > 40 ? '<p class="hint">+ ' + (missing.length - 40) + ' itens</p>' : '') : '<p class="hint">' + (s.total ? 'Tudo pronto. 🎉' : 'Nada listado ainda. Comece pelas sugestões abaixo ou peça para a Equipe de IAs montar a lista.') + '</p>') +
      '</section>' +
      '<section class="panel rs-start"><h3>' + I('plus') + 'Começar rápido</h3><p class="hint">Toque para adicionar o básico que quase todo jogo precisa.</p>' +
        KINDS.filter(function (K) { return K.starters && !itemsOf(p, K.k).length; }).map(function (K) {
          return '<div class="rs-starter"><span class="label">' + E(K.label) + '</span><div class="rs-chips">' + K.starters.map(function (n) { return '<button class="chip" type="button" data-rs-starter="' + K.k + '" data-name="' + E(n) + '">+ ' + E(n) + '</button>'; }).join('') + '</div></div>';
        }).join('') +
        (!(p.effects || []).length ? '<div class="rs-starter"><span class="label">Efeitos especiais</span><div class="rs-chips">' + FX_STARTERS.map(function (x) { return '<button class="chip" type="button" data-rs-fxstart="' + x[0] + '">+ ' + E(x[1]) + '</button>'; }).join('') + '</div></div>' : '') +
        (assetsN ? '<p class="hint rs-assets-note">' + I('arte') + 'A lista de assets da seção <a href="' + api.projHash(p, 'arte') + '">Arte e áudio</a> continua lá (' + assetsN + ' itens).</p>' : '') +
      '</section></div>';
  }
  function labelStatus(kind, st) {
    if (kind === 'personagens') return labelOf(api.ART_STATUS, st);
    if (kind === 'fases') return labelOf(api.MECH_STATUS, st);
    return labelOf(RES_STATUS, st);
  }

  function effectsHtml(p) {
    var list = p.effects || [];
    return '<form class="adder" data-rs-fxadd><input class="input" name="name" placeholder="Nome do efeito (ex.: explosão do barril)" aria-label="Nome do novo efeito" autocomplete="off">' +
      '<select class="select rs-preset-sel" name="preset" aria-label="Começar a partir de">' + '<option value="">Começar do zero</option>' + PRESET_ORDER.map(function (k) { return '<option value="' + k + '">' + E(PRESETS[k].label) + '</option>'; }).join('') + '</select>' +
      '<button class="btn primary" type="submit">' + I('plus') + 'Criar efeito</button></form>' +
      (list.length ? '<div class="fx-list">' + list.map(function (fx) {
        var q = fx.particles;
        return '<a class="fx-card" href="' + api.projHash(p, 'recursos') + '/efeitos/' + encodeURIComponent(fx.id) + '" data-fx-open="' + E(fx.id) + '">' +
          '<span class="fx-sw" style="--a:' + E(q.colorStart) + ';--b:' + E(q.colorEnd) + '" aria-hidden="true">' + I('efeito') + '</span>' +
          '<span class="fx-card-t"><b>' + E(fx.name) + '</b><small>' + E(labelOf(FX_TYPES, fx.type)) + (fx.trigger ? ' · ' + E(fx.trigger) : '') + '</small>' +
            '<span class="fx-tags"><span class="pill st" data-v="' + E(fx.status) + '">' + E(labelOf(RES_STATUS, fx.status)) + '</span><span class="pill pr" data-v="' + E(fx.priority) + '">' + E(labelOf(PRIORITY, fx.priority)) + '</span>' + (fx.mechanic ? '<span class="pill">' + E(fx.mechanic) + '</span>' : '') + '</span></span>' +
          '<span class="fx-edit">' + I('edit') + '<span>Editar</span></span></a>';
      }).join('') + '</div>' :
      '<div class="empty-state compact"><span class="empty-ic">' + I('efeito') + '</span><p>Nenhum efeito ainda. Crie um acima ou comece por um modelo:</p><div class="rs-chips" style="justify-content:center;margin-top:10px">' +
        FX_STARTERS.map(function (x) { return '<button class="chip" type="button" data-rs-fxstart="' + x[0] + '">+ ' + E(x[1]) + '</button>'; }).join('') + '</div></div>');
  }

  // cartões das outras categorias (usam data-list/data-field: o app salva sozinho ao digitar)
  function listHtml(p, kind) {
    var K = KIND_BY[kind], items = itemsOf(p, kind);
    var listName = kind === 'personagens' ? 'characters' : kind === 'fases' ? 'levels' : 'resources';
    var stField = kind === 'personagens' ? 'artStatus' : 'status';
    var stList = kind === 'personagens' ? api.ART_STATUS : kind === 'fases' ? api.MECH_STATUS : RES_STATUS;
    var noteField = kind === 'personagens' ? 'abilities' : kind === 'fases' ? 'purpose' : 'notes';
    var notePh = kind === 'personagens' ? 'Habilidades e comportamento' : kind === 'fases' ? 'O que o jogador faz, aprende ou enfrenta aqui' : 'Notas: como deve ser, referência, o que define pronto…';
    var assetsN = (p.assets || []).filter(function (a) { return ({ sons: ['sfx', 'musica'], arte: ['personagem', 'inimigo', 'cenario', 'outro'], itens: ['item', 'veiculo'], ui: ['ui'] }[kind] || []).indexOf(a.type) >= 0; }).length;
    var addKind = kind === 'personagens' ? 'characters' : kind === 'fases' ? 'levels' : 'resources';
    return '<form class="adder" data-add="' + addKind + '" data-kind="' + kind + '"><input class="input" name="name" placeholder="' + E(kind === 'personagens' ? 'Nome do personagem ou inimigo' : kind === 'fases' ? 'Nome da fase ou nível' : 'Novo item em ' + K.label.toLowerCase()) + '" aria-label="Adicionar em ' + E(K.label) + '" autocomplete="off"><button class="btn primary" type="submit">' + I('plus') + 'Adicionar</button></form>' +
      (K.starters && !items.length ? '<div class="rs-chips rs-sugg">' + K.starters.map(function (n) { return '<button class="chip" type="button" data-rs-starter="' + kind + '" data-name="' + E(n) + '">+ ' + E(n) + '</button>'; }).join('') + '</div>' : '') +
      (kind === 'personagens' || kind === 'fases' ? '<p class="hint rs-shared">' + I('olho') + 'Esta lista é a mesma da seção <a href="' + api.projHash(p, kind === 'personagens' ? 'personagens' : 'mundo') + '">' + (kind === 'personagens' ? 'Personagens e criaturas' : 'Mundo e níveis') + '</a>: o que mudar aqui muda lá.</p>' : '') +
      (assetsN ? '<p class="hint rs-shared">' + I('arte') + 'Há mais ' + assetsN + ' itens deste tipo na lista de assets em <a href="' + api.projHash(p, 'arte') + '">Arte e áudio</a>.</p>' : '') +
      (items.length ? '<div class="rs-items">' + items.map(function (x) {
        var st = x[stField] || stList[0][0], pr = x.priority || 'media';
        return '<div class="rs-item" data-list="' + listName + '" data-id="' + E(x.id) + '">' +
          '<div class="rs-item-top"><input class="input bare name" data-field="name" value="' + E(x.name) + '" aria-label="Nome" placeholder="Nome" autocomplete="off">' +
            '<button class="icon-btn del" data-action="del-item" aria-label="Excluir ' + E(x.name) + '">' + I('trash') + '</button></div>' +
          '<div class="rs-item-sel">' +
            (K.subs ? '<select class="select rs-sub" data-field="sub" aria-label="Tipo"><option value="">Tipo…</option>' + K.subs.map(function (s) { return '<option' + (x.sub === s ? ' selected' : '') + '>' + E(s) + '</option>'; }).join('') + '</select>'
              : kind === 'personagens' ? '<input class="input rs-sub" data-field="role" value="' + E(x.role || '') + '" placeholder="Papel (inimigo, chefe…)" aria-label="Papel" autocomplete="off">' : '') +
            '<select class="select status" data-field="' + stField + '" data-v="' + E(st) + '" aria-label="Estado">' + opts(stList, st) + '</select>' +
            '<select class="select prio" data-field="priority" data-v="' + E(pr) + '" aria-label="Prioridade">' + PRIORITY.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === pr ? ' selected' : '') + '>Prioridade ' + E(o[1].toLowerCase()) + '</option>'; }).join('') + '</select>' +
          '</div>' + (listName === 'resources' ? ownHtml(p, x, 'data-field') : '') +
          '<textarea class="textarea desc" data-field="' + noteField + '" rows="1" aria-label="Notas" placeholder="' + E(notePh) + '">' + E(x[noteField] || '') + '</textarea>' +
          '<div class="rs-link"><span class="rs-link-ic" aria-hidden="true">' + I('link') + '</span><input class="input bare" data-field="link" value="' + E(x.link || '') + '" placeholder="Link ou arquivo (ex.: res://sons/tiro.ogg)" aria-label="Link ou arquivo" autocomplete="off" spellcheck="false">' +
            (/^https?:\/\//i.test(x.link || '') ? '<a class="btn ghost sm" href="' + E(x.link) + '" target="_blank" rel="noopener noreferrer">Abrir ↗</a>' : '') + '</div>' +
        '</div>';
      }).join('') + '</div>' : '<div class="empty-state compact"><span class="empty-ic">' + I(K.icon) + '</span><p>Nada em ' + E(K.label.toLowerCase()) + ' ainda.</p></div>');
  }

  // quem faz e em qual marco do roadmap entra (Equipe do jogo / Jogo real)
  function ownHtml(p, x, attr, fields) {
    var T = window.PranchetaTime, ms = p.milestones || [];
    var who = T ? '<select class="select rs-own" ' + attr + '="assignee" aria-label="Responsável">' + T.memberOptions(p, x.assignee || '', 'Sem responsável') + '</select>' : '';
    var mil = '<select class="select rs-own" ' + attr + '="milestoneId" aria-label="Marco"><option value="">Sem marco</option>' + ms.map(function (m) { return '<option value="' + E(m.id) + '"' + (m.id === x.milestoneId ? ' selected' : '') + '>' + E(m.title) + '</option>'; }).join('') + '</select>';
    if (fields) return (who ? '<label class="field"><span class="label">Responsável</span>' + who + '</label>' : '') + '<label class="field"><span class="label">Marco do roadmap</span>' + mil + '</label>';
    return '<div class="rs-item-sel rs-item-own">' + who + mil + '</div>';
  }

  // ---------------------------------------------------------------- editor de efeito
  function slider(k, label, v) {
    var r = RANGES[k];
    return '<label class="fx-sl"><span class="fx-sl-l">' + E(label) + '<output data-fx-out="' + k + '">' + fmtVal(k, v) + '</output></span>' +
      '<input type="range" data-fx-p="' + k + '" min="' + r[0] + '" max="' + r[1] + '" step="' + r[2] + '" value="' + v + '" aria-label="' + E(label) + '"></label>';
  }
  function fmtVal(k, v) { var r = RANGES[k]; return (r[2] < 1 ? (+v).toFixed(r[2] < 0.1 ? 2 : 1) : Math.round(v)) + (r[3] ? ' ' + r[3] : ''); }
  function seg(k, list, v) { return '<div class="seg fx-seg" role="group" data-fx-seg="' + k + '">' + list.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === v) + '">' + E(o[1]) + '</button>'; }).join('') + '</div>'; }

  function editorHtml(p, fx) {
    var q = fx.particles;
    return '<div class="fx-ed" data-fx-id="' + E(fx.id) + '">' +
      '<div class="fx-top"><a class="btn ghost sm fx-back" href="' + api.projHash(p, 'recursos') + '/efeitos">' + I('back') + 'Efeitos</a>' +
        '<button class="icon-btn del" type="button" data-fx-act="delete" aria-label="Excluir efeito">' + I('trash') + '</button></div>' +
      '<input class="input bare fx-name" data-fx="name" value="' + E(fx.name) + '" aria-label="Nome do efeito" placeholder="Nome do efeito" autocomplete="off">' +
      '<div class="fx-grid"><div class="fx-left">' +
        '<div class="fx-stage"><canvas class="fx-canvas" data-fx-canvas aria-label="Pré-visualização do efeito" role="img"></canvas>' +
          '<div class="fx-stage-bar"><button class="btn sm" type="button" data-fx-act="play" aria-pressed="true">' + I('stop') + '<span>Pausar</span></button>' +
          '<button class="btn sm" type="button" data-fx-act="burst">' + I('efeito') + '<span>Disparar</span></button>' +
          '<button class="btn ghost sm" type="button" data-fx-act="bg" aria-label="Trocar o fundo">Fundo</button><span class="fx-count" data-fx-count></span></div></div>' +
        '<div class="fx-presets"><span class="label">Modelos</span><div class="rs-chips">' + PRESET_ORDER.map(function (k) { return '<button class="chip" type="button" data-fx-preset="' + k + '" aria-pressed="' + (q.preset === k) + '">' + E(PRESETS[k].label) + '</button>'; }).join('') + '</div></div>' +
        '<div class="fx-export panel"><h3>' + I('send') + 'Exportar</h3><p class="hint">Configuração em JSON ou cena pronta do Godot 4 (GPUParticles2D).</p>' +
          '<div class="fx-ex-btns"><button class="btn sm" type="button" data-fx-act="copy-json">Copiar JSON</button><button class="btn sm" type="button" data-fx-act="dl-json">Baixar .json</button>' +
          '<button class="btn sm" type="button" data-fx-act="copy-tscn">Copiar cena Godot</button><button class="btn sm" type="button" data-fx-act="dl-tscn">Baixar .tscn</button></div>' +
          '<details class="fx-code"><summary>Ver o código</summary><pre data-fx-code></pre></details></div>' +
      '</div><div class="fx-right">' +
        '<section class="fx-group panel"><h3>Emissão</h3>' + seg('mode', MODES, q.mode) +
          '<div data-fx-show="continuo"' + (q.mode === 'continuo' ? '' : ' hidden') + '>' + slider('rate', 'Partículas por segundo', q.rate) + '</div>' +
          '<div data-fx-show="rajada"' + (q.mode === 'rajada' ? '' : ' hidden') + '>' + slider('amount', 'Partículas na rajada', q.amount) + '</div>' +
          '<span class="label">Origem</span>' + seg('origin', ORIGINS, q.origin) +
          '<span class="label">Forma do emissor</span>' + seg('emitter', EMITTERS, q.emitter) + slider('emitSize', 'Tamanho do emissor', q.emitSize) + '</section>' +
        '<section class="fx-group panel"><h3>Movimento</h3>' + slider('speed', 'Velocidade', q.speed) + slider('speedVar', 'Variação da velocidade', q.speedVar) +
          slider('direction', 'Direção (0 = cima)', q.direction) + slider('spread', 'Abertura', q.spread) + slider('gravity', 'Gravidade', q.gravity) + slider('damping', 'Arrasto', q.damping) + '</section>' +
        '<section class="fx-group panel"><h3>Aparência</h3>' + slider('lifetime', 'Vida de cada partícula', q.lifetime) + slider('sizeStart', 'Tamanho inicial', q.sizeStart) + slider('sizeEnd', 'Tamanho final', q.sizeEnd) +
          '<div class="fx-colors"><label class="fx-color"><input type="color" data-fx-p="colorStart" value="' + E(q.colorStart) + '" aria-label="Cor inicial"><span>Cor inicial</span></label>' +
          '<span class="fx-grad" data-fx-grad style="--a:' + E(q.colorStart) + ';--b:' + E(q.colorEnd) + '"></span>' +
          '<label class="fx-color"><input type="color" data-fx-p="colorEnd" value="' + E(q.colorEnd) + '" aria-label="Cor final"><span>Cor final</span></label></div>' +
          '<span class="label">Formato</span>' + seg('shape', SHAPES, q.shape) +
          '<label class="toggle"><input type="checkbox" data-fx-p="additive"' + (q.additive ? ' checked' : '') + '> Brilho (mistura aditiva)</label></section>' +
        '<section class="fx-group panel"><h3>Ficha do efeito</h3><div class="cols-2">' +
          '<label class="field"><span class="label">Tipo</span><select class="select" data-fx="type">' + opts(FX_TYPES, fx.type) + '</select></label>' +
          '<label class="field"><span class="label">Intensidade</span><select class="select" data-fx="intensity">' + opts(INTENSITY, fx.intensity) + '</select></label>' +
          '<label class="field"><span class="label">Estado</span><select class="select status" data-fx="status" data-v="' + E(fx.status) + '">' + opts(RES_STATUS, fx.status) + '</select></label>' +
          '<label class="field"><span class="label">Prioridade</span><select class="select prio" data-fx="priority" data-v="' + E(fx.priority) + '">' + opts(PRIORITY, fx.priority) + '</select></label>' +
          '<label class="field"><span class="label">Gatilho</span><input class="input" data-fx="trigger" value="' + E(fx.trigger) + '" placeholder="Quando acontece? (ex.: barril explode)" autocomplete="off"></label>' +
          '<label class="field"><span class="label">Duração (s)</span><input class="input" type="number" min="0" max="60" step="0.1" inputmode="decimal" data-fx="duration" value="' + E(fx.duration) + '"></label>' +
          '<label class="field"><span class="label">Mecânica ligada</span><select class="select" data-fx="mechanic"><option value="">Nenhuma</option>' + (p.mechanics || []).map(function (m) { return '<option' + (m.name === fx.mechanic ? ' selected' : '') + '>' + E(m.name) + '</option>'; }).join('') + (fx.mechanic && !(p.mechanics || []).some(function (m) { return m.name === fx.mechanic; }) ? '<option selected>' + E(fx.mechanic) + '</option>' : '') + '</select></label>' +
          ownHtml(p, fx, 'data-fx', true) +
          '<label class="field"><span class="label">Fase ligada</span><select class="select" data-fx="level"><option value="">Nenhuma</option>' + (p.levels || []).map(function (l) { return '<option' + (l.name === fx.level ? ' selected' : '') + '>' + E(l.name) + '</option>'; }).join('') + (fx.level && !(p.levels || []).some(function (l) { return l.name === fx.level; }) ? '<option selected>' + E(fx.level) + '</option>' : '') + '</select></label>' +
        '</div><label class="field"><span class="label">Notas</span><textarea class="textarea" data-fx="notes" rows="3" placeholder="Som junto, tremida de câmera, referência…">' + E(fx.notes) + '</textarea></label></section>' +
      '</div></div></div>';
  }

  // ---------------------------------------------------------------- eventos
  var sim = null;
  function mount(root, p, tab, fxId) {
    if (sim) { sim.stop(); sim = null; }
    var ed = root.querySelector('.fx-ed');
    if (ed) mountEditor(root, p, ed);
    if (root.__rsBound) return; root.__rsBound = true;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rs-starter],[data-rs-fxstart]'); if (!b) return;
      var cp = api.curP(); if (!cp) return;
      if (b.dataset.rsFxstart) { var fx = makeEffect({ preset: b.dataset.rsFxstart }); cp.effects.unshift(fx); api.touch(cp); api.go(api.projHash(cp, 'recursos') + '/efeitos/' + encodeURIComponent(fx.id)); api.toast('Efeito “' + fx.name + '” criado.'); return; }
      var kind = b.dataset.rsStarter, name = b.dataset.name;
      if (kind === 'personagens') cp.characters.unshift({ id: uid(), name: name, role: '', abilities: '', artStatus: 'faltando' });
      else if (kind === 'fases') cp.levels.unshift({ id: uid(), name: name, purpose: '', status: 'ideia' });
      else cp.resources.push(makeResource({ kind: kind, name: name }));
      api.touch(cp); api.rerender(); api.toast('Adicionado: ' + name + '.');
    });
    root.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-rs-fxadd]'); if (!f) return;
      e.preventDefault();
      var cp = api.curP(); if (!cp) return;
      var name = f.elements.name.value.trim(), preset = f.elements.preset.value;
      var fx = makeEffect({ name: name || undefined, preset: preset });
      cp.effects.unshift(fx); api.touch(cp);
      api.go(api.projHash(cp, 'recursos') + '/efeitos/' + encodeURIComponent(fx.id));
    });
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return Promise.resolve(false);
  }
  function mountEditor(root, p, ed) {
    var fx = (p.effects || []).filter(function (x) { return x.id === ed.dataset.fxId; })[0]; if (!fx) return;
    var canvas = ed.querySelector('[data-fx-canvas]');
    sim = new Sim(canvas, function () { return fx.particles; }); sim.fx = fx;
    sim.start();
    var mySim = sim, code = ed.querySelector('[data-fx-code]'), det = ed.querySelector('.fx-code'), countEl = ed.querySelector('[data-fx-count]');
    var cTimer = setInterval(function () { if (!canvas.isConnected) { clearInterval(cTimer); return; } countEl.textContent = mySim.ps.length + ' partículas'; }, 400);
    function refreshCode() { if (det.open) code.textContent = toTscn(fx); }
    det.addEventListener('toggle', refreshCode);
    function changed() { fx.colors = [fx.particles.colorStart, fx.particles.colorEnd]; fx.updatedAt = new Date().toISOString(); api.touch(p); refreshCode(); }
    function setPresetPressed() { ed.querySelectorAll('[data-fx-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.fxPreset === fx.particles.preset)); }); }
    ed.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.fxP) {
        var k = t.dataset.fxP;
        if (k === 'additive') fx.particles.additive = t.checked;
        else if (k === 'colorStart' || k === 'colorEnd') { fx.particles[k] = hex(t.value, fx.particles[k]); var gr = ed.querySelector('[data-fx-grad]'); gr.style.setProperty('--a', fx.particles.colorStart); gr.style.setProperty('--b', fx.particles.colorEnd); }
        else { fx.particles[k] = num(t.value, k); var o = ed.querySelector('[data-fx-out="' + k + '"]'); if (o) o.textContent = fmtVal(k, fx.particles[k]); }
        fx.particles.preset = ''; setPresetPressed(); changed(); return;
      }
      if (t.dataset.fx && t.tagName !== 'SELECT') {
        var f = t.dataset.fx;
        if (f === 'duration') { var d = parseFloat(t.value); if (isFinite(d)) fx.duration = Math.max(0, Math.min(60, d)); }
        else fx[f] = t.value;
        if (f === 'name') { fx.name = t.value || 'Efeito sem nome'; }
        changed();
      }
    });
    ed.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.fxP === 'additive') { fx.particles.additive = t.checked; changed(); return; }
      if (t.dataset.fx && t.tagName === 'SELECT') { fx[t.dataset.fx] = t.value; if (t.classList.contains('status') || t.classList.contains('prio')) t.dataset.v = t.value; changed(); api.refreshSide(); }
    });
    ed.addEventListener('click', function (e) {
      var s = e.target.closest('[data-fx-seg] button');
      if (s) {
        var key = s.closest('[data-fx-seg]').dataset.fxSeg; fx.particles[key] = s.dataset.v;
        s.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === s)); });
        if (key === 'mode') { ed.querySelectorAll('[data-fx-show]').forEach(function (x) { x.hidden = x.dataset.fxShow !== fx.particles.mode; }); mySim.reset(); }
        fx.particles.preset = ''; setPresetPressed(); changed(); return;
      }
      var pb = e.target.closest('[data-fx-preset]');
      if (pb) {
        var pr = PRESETS[pb.dataset.fxPreset]; if (!pr) return;
        fx.particles = cleanParticles(Object.assign({}, BASE, pr.p, { preset: pb.dataset.fxPreset }));
        if (fx.type === 'particulas' || !fx.type) fx.type = pr.type;
        changed(); mySim.reset();
        var y = window.scrollY; api.rerender(); window.scrollTo(0, y); api.toast('Modelo “' + pr.label + '” aplicado.');
        return;
      }
      var a = e.target.closest('[data-fx-act]'); if (!a) return;
      var act = a.dataset.fxAct, base = nodeName(fx.name).toLowerCase();
      if (act === 'play') { mySim.paused = !mySim.paused; a.setAttribute('aria-pressed', String(!mySim.paused)); a.innerHTML = I(mySim.paused ? 'play' : 'stop') + '<span>' + (mySim.paused ? 'Continuar' : 'Pausar') + '</span>'; }
      else if (act === 'burst') { if (fx.particles.mode === 'rajada') mySim.burst(); else mySim.spawn(fx.particles, Math.max(10, Math.round(fx.particles.rate))); if (mySim.paused) { mySim.paused = false; var pl = ed.querySelector('[data-fx-act=play]'); pl.setAttribute('aria-pressed', 'true'); pl.innerHTML = I('stop') + '<span>Pausar</span>'; } }
      else if (act === 'bg') { mySim.bg = mySim.bg === 'claro' ? 'escuro' : 'claro'; }
      else if (act === 'copy-json') copy(JSON.stringify(toJSON(fx, p), null, 2)).then(function (ok) { api.toast(ok ? 'JSON do efeito copiado.' : 'Não deu para copiar: use “Baixar .json”.'); });
      else if (act === 'dl-json') { download(base + '.json', JSON.stringify(toJSON(fx, p), null, 2) + '\n', 'application/json'); api.toast('Arquivo ' + base + '.json baixado.'); }
      else if (act === 'copy-tscn') copy(toTscn(fx)).then(function (ok) { api.toast(ok ? 'Cena do Godot copiada.' : 'Não deu para copiar: use “Baixar .tscn”.'); });
      else if (act === 'dl-tscn') { download(base + '.tscn', toTscn(fx), 'text/plain'); api.toast('Arquivo ' + base + '.tscn baixado.'); }
      else if (act === 'delete') {
        api.confirmDialog('Excluir “' + fx.name + '”?', 'O efeito e as configurações dele serão apagados deste jogo.', 'Excluir efeito', true).then(function (ok) {
          if (!ok) return;
          var i = p.effects.indexOf(fx); if (i < 0) return;
          p.effects.splice(i, 1); api.touch(p); api.go(api.projHash(p, 'recursos') + '/efeitos');
          api.toast('Efeito excluído.', 'Desfazer', function () { p.effects.splice(Math.min(i, p.effects.length), 0, fx); api.touch(p); api.rerender(); });
        });
      }
    });
  }

  window.PranchetaRecursos = {
    init: function (a) { api = a; },
    html: html, mount: mount, count: count, summary: summary,
    normalizeProject: normalizeProject, normalizeEffect: normalizeEffect, makeEffect: makeEffect, makeResource: makeResource,
    toJSON: toJSON, toTscn: toTscn, KINDS: KINDS, RES_KINDS: RES_KINDS, FX_TYPES: FX_TYPES, PRESETS: PRESETS, RES_STATUS: RES_STATUS, PRIORITY: PRIORITY,
    labelOf: labelOf, sim: function () { return sim; }
  };
})();
