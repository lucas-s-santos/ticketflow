// Injetado em toda página gravada ANTES de qualquer script dela (evaluateOnNewDocument).
//
// 1. Relógio virtual. performance.now, Date.now, requestAnimationFrame, setTimeout
//    e setInterval passam a obedecer um relógio que só anda quando o gravador
//    manda (window.__gravacao.avancar). GSAP, Three.js e o Angular continuam
//    achando que o tempo é real — só que ele anda exatamente 1/30 s por quadro,
//    por mais que o print de cada quadro demore. É isso que deixa o vídeo
//    fluido mesmo numa máquina lenta.
// 2. Animações de CSS e transições de página (View Transitions) são pausadas e
//    posicionadas no mesmo relógio a cada quadro (Web Animations API).
// 3. <video> é pausado e posicionado no tempo virtual (cada quadro espera o seek).
// 4. Uma camada por cima de tudo desenha o ponteiro do mouse (o print do
//    headless não tem cursor), o círculo dos toques e o escurecimento das
//    trocas de página. As legendas não ficam aqui: entram na montagem, fora
//    da tela do site (ver montagem.mjs), para nunca cobrir o que importa.
(() => {
  if (window.__gravacao) return;

  const perfNativo = performance.now.bind(performance);
  const dataNativa = Date.now.bind(Date);
  const timeoutNativo = window.setTimeout.bind(window);

  let tempo = perfNativo();
  const baseData = dataNativa() - tempo;
  const quadros = new Map();
  const timers = new Map();
  let proximoId = 1;

  performance.now = () => tempo;
  Date.now = () => baseData + tempo;
  window.requestAnimationFrame = (cb) => { const id = proximoId++; quadros.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { quadros.delete(id); };
  window.setTimeout = (fn, ms, ...args) => {
    const id = proximoId++;
    timers.set(id, { quando: tempo + Math.max(0, Number(ms) || 0), fn, args });
    return id;
  };
  window.setInterval = (fn, ms, ...args) => {
    const id = proximoId++;
    const intervalo = Math.max(1, Number(ms) || 0);
    timers.set(id, { quando: tempo + intervalo, fn, args, intervalo });
    return id;
  };
  window.clearTimeout = (id) => { timers.delete(id); };
  window.clearInterval = (id) => { timers.delete(id); };

  // ------------------------------------------------------------ animações CSS
  const controladas = new WeakMap();
  function sincronizarAnimacoes() {
    for (const a of document.getAnimations()) {
      let c = controladas.get(a);
      if (!c) {
        c = { inicio: tempo - (Number(a.currentTime) || 0) };
        controladas.set(a, c);
      }
      if (a.playState === 'finished') continue;
      if (a.playState !== 'paused') a.pause();
      const t = tempo - c.inicio;
      const fim = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
      // Terminar de verdade (finish) importa: uma View Transition só acaba quando
      // as animações dela terminam — pausada no fim, ela travaria a página.
      if (Number.isFinite(fim) && t >= fim) a.finish();
      else a.currentTime = t;
    }
  }

  // ------------------------------------------------------------------ vídeos
  function sincronizarVideos() {
    const videos = Array.from(document.querySelectorAll('video'));
    return Promise.all(videos.map((v) => new Promise((pronto) => {
      if (!v.paused) v.pause();
      if (!(v.duration > 0)) return pronto();
      const alvo = (tempo / 1000) % v.duration;
      if (Math.abs(v.currentTime - alvo) < 0.004) return pronto();
      let feito = false;
      const fim = () => { if (feito) return; feito = true; v.removeEventListener('seeked', fim); pronto(); };
      v.addEventListener('seeked', fim);
      timeoutNativo(fim, 1000);
      v.currentTime = alvo;
    })));
  }

  // ----------------------------------------------------------------- camada
  const toques = [];
  const escurecimentos = [];
  let ponteiro = null;
  const SETA = `<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v21l5.5-5.2 3.6 8.3 3.7-1.6-3.6-8.1H19z"
    fill="#13171A" stroke="#FCFAF6" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  function camada() {
    let el = document.getElementById('__gravacao');
    if (!el) {
      el = document.createElement('div');
      el.id = '__gravacao';
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden';
      document.documentElement.appendChild(el);
    }
    return el;
  }

  const suave = (t) => t * t * (3 - 2 * t);

  function desenhar() {
    const raiz = camada();
    let html = '';

    for (const e of escurecimentos) {
      const p = Math.min(1, Math.max(0, (tempo - e.de) / e.duracao));
      const alfa = e.deAlfa + (e.paraAlfa - e.deAlfa) * suave(p);
      if (alfa > 0.001) html += `<div style="position:absolute;inset:0;background:#13171A;opacity:${alfa.toFixed(3)}"></div>`;
    }

    for (const t of toques) {
      const p = (tempo - t.de) / 650;
      if (p < 0 || p > 1) continue;
      const tam = 34 + 30 * suave(p);
      const alfa = 0.55 * (1 - p);
      html += `<div style="position:absolute;left:${t.x - tam / 2}px;top:${t.y - tam / 2}px;width:${tam}px;height:${tam}px;
                border-radius:50%;background:rgba(252,250,246,${(alfa * 0.6).toFixed(3)});
                border:2px solid rgba(185,247,6,${alfa.toFixed(3)})"></div>`;
    }

    if (ponteiro) {
      html += `<div style="position:absolute;left:${ponteiro.x - 2}px;top:${ponteiro.y - 2}px;
                filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${SETA}</div>`;
    }

    if (raiz.innerHTML !== html) raiz.innerHTML = html;
  }

  // -------------------------------------------------------------------- API
  window.__gravacao = {
    agora: () => tempo,

    async avancar(ms) {
      const alvo = tempo + ms;
      // Timers que vencem dentro do passo, em ordem de vencimento.
      for (;;) {
        let proximo = null;
        for (const [id, t] of timers) {
          if (t.quando <= alvo && (!proximo || t.quando < proximo[1].quando)) proximo = [id, t];
        }
        if (!proximo) break;
        const [id, t] = proximo;
        tempo = Math.max(tempo, t.quando);
        if (t.intervalo) t.quando += t.intervalo; else timers.delete(id);
        try { if (typeof t.fn === 'function') t.fn(...t.args); } catch (e) { console.error(e); }
        await Promise.resolve();
      }
      tempo = alvo;
      const chamadas = Array.from(quadros.values());
      quadros.clear();
      for (const cb of chamadas) {
        try { cb(tempo); } catch (e) { console.error(e); }
      }
      await Promise.resolve();
      sincronizarAnimacoes();
      await sincronizarVideos();
      desenhar();
    },

    rolar(y) { window.scrollTo(0, y); },
    toque(x, y) { toques.push({ x, y, de: tempo }); },
    ponteiro(x, y) { ponteiro = { x, y }; },
    escurecer(deAlfa, paraAlfa, duracaoMs) {
      escurecimentos.length = 0;
      escurecimentos.push({ deAlfa, paraAlfa, de: tempo, duracao: duracaoMs });
    },
  };
})();
