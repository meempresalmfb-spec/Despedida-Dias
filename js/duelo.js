// ============================================================
//  DUELO — o núcleo. Sorteio → pergunta → "JÁ!" → reação → arbitragem.
//  Lisura (OT §5.2): cada celular mede o PRÓPRIO reflexo (t0 no frame de
//  pintura do "JÁ!"). Nunca compara timestamp absoluto entre aparelhos.
//
//  Estados de duelo/atual.estado: aberto → preparando → liberado → fim
// ============================================================
window.Duelo = (function () {
  let me, H;
  let atual = null;       // duelo/atual
  let tempos = {};        // duelo/tempos
  let jogados = {};       // duelo/jogados (semRepetir de duplas)
  let perguntasUsadas = {}; // duelo/perguntasUsadas (semRepetir de perguntas)
  let jogadores = {};     // cache de jogadores conectados

  // estado local do convidado (lisura)
  let t0 = 0, jaMarquei = false, prevEstado = "", prevRid = "";
  // estado local do moderador
  let forceReveal = false;

  const cfg = () => window.CONFIG.duelo || {};
  const conectados = () => Object.keys(jogadores)
    .filter((k) => jogadores[k] && jogadores[k].conectado && jogadores[k].papel === "convidado")
    .map((k) => ({ uid: k, ...jogadores[k] }));
  const nomeDe = (u) => (jogadores[u] && jogadores[u].nome) || "?";

  function mount(_me, _H) {
    me = _me; H = _H;
    Sala.on("duelo/atual", (v) => { atual = v; render(); });
    Sala.on("duelo/tempos", (v) => { tempos = v || {}; render(); });
    Sala.on("duelo/jogados", (v) => { jogados = v || {}; });
    Sala.on("duelo/perguntasUsadas", (v) => { perguntasUsadas = v || {}; });
  }
  function onJogadores(cache) { jogadores = cache || {}; render(); }

  // ---------- MODERADOR: ações ----------
  function sortearDuelo() {
    let pool = conectados();
    if (pool.length < 2) { H.toast("Precisa de 2+ convidados conectados."); return; }
    if (cfg().semRepetir) {
      const restantes = pool.filter((p) => !jogados[p.uid]);
      if (restantes.length >= 2) pool = restantes;
      else { Sala.remove("duelo/jogados"); jogados = {}; H.toast("Todos jogaram — reembaralhando."); }
    }
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b; do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b.uid === a.uid);
    Sala.remove("duelo/tempos");
    Sala.set("duelo/atual", { aId: a.uid, bId: b.uid, estado: "aberto", perguntaId: null, rid: "r" + Date.now() });
    forceReveal = false;
  }
  function sortearPergunta() {
    const banco = window.PERGUNTAS || [];
    if (!banco.length) { H.toast("Sem perguntas no banco (js/data/perguntas.js)."); return; }
    let livres = banco.map((_, i) => i);
    if (cfg().semRepetir) {
      livres = livres.filter((i) => !perguntasUsadas[i]);
      if (!livres.length) {                       // todas já saíram → reembaralha
        Sala.remove("duelo/perguntasUsadas"); perguntasUsadas = {};
        livres = banco.map((_, i) => i);
        H.toast("Todas as perguntas já saíram — reembaralhando.");
      }
    }
    // re-roll ("Outra pergunta") não repete a que está na tela, se houver outra
    if (livres.length > 1 && atual && atual.perguntaId != null) {
      const semAtual = livres.filter((i) => i !== atual.perguntaId);
      if (semAtual.length) livres = semAtual;
    }
    const i = livres[Math.floor(Math.random() * livres.length)];
    Sala.update("duelo/atual", { perguntaId: i });
  }
  function prepararJa() {
    // a pergunta "saiu" (foi lida, vai ao ar) → não roda mais até reembaralhar
    if (cfg().semRepetir && atual && atual.perguntaId != null) Sala.update("duelo/perguntasUsadas", { [atual.perguntaId]: true });
    Sala.update("duelo/atual", { estado: "preparando" });
    const min = cfg().atrasoMinMs || 1500, max = cfg().atrasoMaxMs || 4000;
    const atraso = min + Math.random() * (max - min);
    setTimeout(() => {
      // só dispara se ainda estamos preparando este mesmo duelo
      Sala.get("duelo/atual").then((a) => {
        if (a && a.estado === "preparando" && a.rid === atual.rid) Sala.update("duelo/atual", { estado: "liberado" });
      });
    }, atraso);
  }
  function darDose(u, d) {
    const atualD = (jogadores[u] && jogadores[u].doses) || 0;
    Sala.update("jogadores/" + u, { doses: Math.max(0, atualD + (d || 1)) });
  }
  function arbitrar(acertou) {
    const resp = responder();
    if (!resp) { H.toast("Ninguém respondeu válido."); return; }
    const outro = resp === atual.aId ? atual.bId : atual.aId;
    if (acertou) { darDose(outro, +1); H.toast(nomeDe(resp) + " acertou! " + nomeDe(outro) + " bebe"); }
    else { darDose(resp, +1); H.toast(nomeDe(resp) + " errou — bebe"); }
    encerrar();
  }
  function encerrar() {
    if (cfg().semRepetir && atual) Sala.update("duelo/jogados", { [atual.aId]: true, [atual.bId]: true });
    Sala.update("duelo/atual", { estado: "fim" });
  }

  // melhor tempo válido (menor reação, sem queima)
  function responder() {
    if (!atual) return null;
    const cand = [atual.aId, atual.bId]
      .map((u) => ({ u, t: tempos[u] }))
      .filter((x) => x.t && !x.t.queima && typeof x.t.reacao === "number")
      .sort((a, b) => a.t.reacao - b.t.reacao);
    return cand.length ? cand[0].u : null;
  }
  const ambosResponderam = () => atual && tempos[atual.aId] && tempos[atual.bId];

  // ---------- CONVIDADO: buzzer ----------
  function buzzerPress() {
    if (jaMarquei || !atual) return;
    const sou = me.uid === atual.aId || me.uid === atual.bId;
    if (!sou) return;
    if (atual.estado === "preparando") {              // queimou a largada
      jaMarquei = true;
      Sala.set("duelo/tempos/" + me.uid, { queima: true, ts: Date.now() });
      H.toast("Queimou a largada!");
    } else if (atual.estado === "liberado" && t0) {   // reação válida
      const reacao = (performance.now() - t0) / 1000;
      jaMarquei = true;
      Sala.set("duelo/tempos/" + me.uid, { reacao: reacao, queima: false, ts: Date.now() });
    } else {
      return;
    }
    render(); // trava o botão na hora, sem esperar o eco da rede
  }

  // marca t0 no frame de PINTURA do "JÁ!" (lisura §5.2)
  function armarT0() {
    t0 = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { t0 = performance.now(); }));
  }

  // ---------- RENDER ----------
  function render() {
    const root = H.$("#s-duelo"); if (!root || !me.papel) return;
    // detecta novo duelo → reseta estado local do convidado
    const rid = atual ? atual.rid : "";
    if (rid !== prevRid) { jaMarquei = false; t0 = 0; forceReveal = false; prevRid = rid; }
    // detecta virada pra "liberado" → arma t0
    if (atual && atual.estado === "liberado" && prevEstado !== "liberado") armarT0();
    prevEstado = atual ? atual.estado : "";

    root.innerHTML = "";
    if (me.papel === "moderador") renderModerador(root);
    else renderConvidado(root);
  }

  function vsPanel() {
    if (!atual) return null;
    const lut = (u) => {
      const t = tempos[u];
      const d = H.el("div", { class: "lutador" + (responder() === u && (ambosResponderam() || forceReveal) ? " vencedor" : "") + (t && t.queima ? " queimou" : "") }, [
        H.el("div", { class: "nome" }, [nomeDe(u)]),
        H.el("div", { class: "tempo" }, [t ? (t.queima ? "QUEIMOU" : t.reacao.toFixed(3).replace(".", ",") + "s") : "—"]),
      ]);
      return d;
    };
    return H.el("div", { class: "duelo-vs" }, [lut(atual.aId), H.el("div", { class: "vs" }, ["VS"]), lut(atual.bId)]);
  }

  function gabaritoCard() {
    const banco = window.PERGUNTAS || [];
    const p = atual && atual.perguntaId != null ? banco[atual.perguntaId] : null;
    if (!p) return null;
    return H.el("div", { class: "gabarito" }, [
      H.el("div", { class: "cat" }, [p.cat || ""]),
      H.el("div", { class: "q" }, [p.q]),
      H.el("div", { class: "r" }, ["Resposta: " + p.r]),
    ]);
  }

  function renderModerador(root) {
    const card = H.el("div", { class: "card" }, [H.el("h2", {}, ["Duelo"])]);
    const conn = conectados();
    card.appendChild(H.el("p", { class: "muted" }, [conn.length + " convidado(s) conectado(s)."]));

    const estado = atual ? atual.estado : null;

    if (!atual || estado === "fim") {
      if (estado === "fim") { card.appendChild(vsPanel()); card.appendChild(gabaritoCard()); }
      card.appendChild(H.el("button", { class: "btn primary mt", disabled: conn.length < 2 ? "" : null, onclick: sortearDuelo },
        [estado === "fim" ? "Próximo duelo" : "Sortear duelo"]));
      if (conn.length < 2) card.appendChild(H.el("p", { class: "muted mt" }, ["Aguardando convidados entrarem na sala…"]));
      root.appendChild(card); return;
    }

    card.appendChild(vsPanel());

    if (estado === "aberto" && atual.perguntaId == null) {
      card.appendChild(H.el("button", { class: "btn primary", onclick: sortearPergunta }, ["Sortear pergunta"]));
      if (cfg().semRepetir) {
        const total = (window.PERGUNTAS || []).length, usadas = Object.keys(perguntasUsadas).length;
        card.appendChild(H.el("p", { class: "muted center mt" }, [Math.max(0, total - usadas) + " de " + total + " perguntas ainda não saíram"]));
      }
      card.appendChild(H.el("button", { class: "btn ghost mt", onclick: sortearDuelo }, ["Re-sortear dupla"]));
    } else if (estado === "aberto" && atual.perguntaId != null) {
      card.appendChild(gabaritoCard());
      card.appendChild(H.el("p", { class: "muted" }, ["Leia a pergunta em voz alta. Quando estiverem prontos:"]));
      card.appendChild(H.el("button", { class: "btn primary", onclick: prepararJa }, ["Preparar (dispara o JÁ!)"]));
      card.appendChild(H.el("button", { class: "btn ghost mt", onclick: sortearPergunta }, ["Outra pergunta"]));
    } else if (estado === "preparando") {
      card.appendChild(H.el("p", { class: "center" }, [H.el("span", { class: "estado-pill" }, ["preparando… aguarde o JÁ!"])]));
    } else if (estado === "liberado") {
      const revelar = ambosResponderam() || forceReveal;
      if (!revelar) {
        card.appendChild(H.el("p", { class: "center" }, [H.el("span", { class: "estado-pill live" }, ["JÁ! — buzzers liberados"])]));
        card.appendChild(H.el("p", { class: "muted center" }, ["Esperando os dois apertarem…"]));
        card.appendChild(H.el("button", { class: "btn ghost mt", onclick: () => { forceReveal = true; render(); } }, ["Encerrar buzzer agora"]));
      } else {
        card.appendChild(gabaritoCard());
        const resp = responder();
        // penalidade de queima
        [atual.aId, atual.bId].forEach((u) => {
          if (tempos[u] && tempos[u].queima) {
            card.appendChild(H.el("div", { class: "row mt" }, [
              H.el("span", { class: "spacer" }, [nomeDe(u) + " queimou a largada"]),
              H.el("button", { class: "btn sm danger", onclick: () => darDose(u, +1) }, ["+1 dose"]),
            ]));
          }
        });
        if (resp) {
          card.appendChild(H.el("p", { class: "center mt" }, ["Respondeu primeiro: ", H.el("b", {}, [nomeDe(resp)])]));
          card.appendChild(H.el("div", { class: "btn-row mt" }, [
            H.el("button", { class: "btn ok", onclick: () => arbitrar(true) }, ["Acertou"]),
            H.el("button", { class: "btn danger", onclick: () => arbitrar(false) }, ["Errou"]),
          ]));
        } else {
          card.appendChild(H.el("p", { class: "muted center mt" }, ["Ninguém válido (queima/sem resposta). Ajuste as doses no placar se precisar."]));
        }
        card.appendChild(H.el("button", { class: "btn ghost mt", onclick: encerrar }, ["Encerrar duelo"]));
      }
    }
    root.appendChild(card);
  }

  function renderConvidado(root) {
    const souDuelista = atual && (me.uid === atual.aId || me.uid === atual.bId);
    const card = H.el("div", { class: "card" }, [H.el("h2", {}, ["Duelo"])]);

    if (!atual || atual.estado === "fim") {
      card.appendChild(H.el("p", { class: "center" }, [!atual ? "Aguarde o moderador sortear um duelo." : "Duelo encerrado."]));
      if (atual && atual.estado === "fim") card.appendChild(vsPanel());
      root.appendChild(card); return;
    }

    if (!souDuelista) {
      card.appendChild(H.el("p", { class: "center" }, ["Rolando agora:"]));
      card.appendChild(vsPanel());
      card.appendChild(H.el("p", { class: "muted center" }, ["Você não está neste duelo. Próxima!"]));
      root.appendChild(card); return;
    }

    // EU sou duelista
    const adversario = me.uid === atual.aId ? atual.bId : atual.aId;
    card.appendChild(H.el("p", { class: "center" }, ["Você ", H.el("b", {}, ["VS"]), " " + nomeDe(adversario)]));

    let cls = "buzzer aguarde", txt = "AGUARDE", dis = true;
    if (jaMarquei) {
      const t = tempos[me.uid];
      if (t && t.queima) { cls = "buzzer queima"; txt = "QUEIMOU"; }
      else { cls = "buzzer travado"; txt = t ? t.reacao.toFixed(3).replace(".", ",") + "s" : "..."; }
    } else if (atual.estado === "aberto") {
      txt = "PREPARE-SE"; dis = true;
    } else if (atual.estado === "preparando") {
      cls = "buzzer aguarde"; txt = "ESPERA O JÁ!"; dis = false; // press aqui = queima
    } else if (atual.estado === "liberado") {
      cls = "buzzer ja"; txt = "JÁ!"; dis = false;
    }

    const btn = H.el("button", { class: cls, disabled: dis ? "" : null }, [txt]);
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); buzzerPress(); });
    card.appendChild(btn);

    if (jaMarquei) {
      const t = tempos[me.uid];
      if (t && !t.queima) card.appendChild(H.el("p", { class: "center muted" }, ["Seu tempo de reação. Aguarde o moderador."]));
    } else if (atual.estado === "aberto") {
      card.appendChild(H.el("p", { class: "center muted" }, ["Segura o dedo perto do botão. NÃO aperte antes do JÁ!"]));
    } else if (atual.estado === "preparando") {
      card.appendChild(H.el("p", { class: "center muted" }, ["Quase… apertar agora é queima de largada!"]));
    }
    root.appendChild(card);
  }

  return { mount, onJogadores };
})();
