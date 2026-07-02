// ============================================================
//  DUELO — versão simplificada (moderador faz tudo no tablet).
//  Fluxo: Sortear duelo → sorteia 2 nomes da LISTA DE CONFIRMADOS
//  + uma pergunta → moderador lê em voz alta → toca em QUEM BEBEU.
//  O ranking de doses (por nome) sobe sozinho e aparece pra todos.
//  Sem buzzer, sem reação, sem depender do celular de cada um.
//
//  duelo/atual = { aSlug,aNome, bSlug,bNome, perguntaId, estado, rid, resultado, who }
//    estado: "ativo" (rolando) | "fim" (já marcou quem bebeu)
// ============================================================
window.Duelo = (function () {
  let me, H;
  let atual = null;          // duelo/atual
  let jogados = {};          // duelo/jogados/{slug}  (semRepetir de duplas)
  let perguntasUsadas = {};  // duelo/perguntasUsadas (semRepetir de perguntas)

  const cfg = () => window.CONFIG.duelo || {};
  const rand = (n) => Math.floor(Math.random() * n);

  function slug(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function pessoas() {
    return (window.CONFIG.participantes || []).map((n) => ({ nome: n, slug: slug(n) })).filter((p) => p.slug);
  }

  function mount(_me, _H) {
    me = _me; H = _H;
    Sala.on("duelo/atual", (v) => { atual = v; render(); });
    Sala.on("duelo/jogados", (v) => { jogados = v || {}; });
    Sala.on("duelo/perguntasUsadas", (v) => { perguntasUsadas = v || {}; });
  }

  // ---------- MODERADOR: ações ----------
  function sortearPerguntaIdx(prev) {
    const banco = window.PERGUNTAS || [];
    if (!banco.length) return null;
    let livres = banco.map((_, i) => i);
    if (cfg().semRepetir) {
      livres = livres.filter((i) => !perguntasUsadas[i]);
      if (!livres.length) {                       // todas já saíram → reembaralha
        Sala.remove("duelo/perguntasUsadas"); perguntasUsadas = {};
        livres = banco.map((_, i) => i);
        H.toast("Todas as perguntas já saíram — reembaralhando.");
      }
    }
    if (prev != null && livres.length > 1) livres = livres.filter((i) => i !== prev);
    return livres[rand(livres.length)];
  }

  function sortearDuelo() {
    const pool = pessoas();
    if (pool.length < 2) { H.toast("Precisa de 2+ nomes na lista de confirmados."); return; }
    let cand = pool;
    if (cfg().semRepetir) {
      const rest = pool.filter((p) => !jogados[p.slug]);
      if (rest.length >= 2) cand = rest;
      else { Sala.remove("duelo/jogados"); jogados = {}; H.toast("Todos já duelaram — reembaralhando."); }
    }
    const a = cand[rand(cand.length)];
    let b; do { b = cand[rand(cand.length)]; } while (b.slug === a.slug);
    const qid = sortearPerguntaIdx();
    Sala.set("duelo/atual", {
      aSlug: a.slug, aNome: a.nome, bSlug: b.slug, bNome: b.nome,
      perguntaId: qid, estado: "ativo", rid: "r" + Date.now(),
    });
    if (cfg().semRepetir) {
      Sala.update("duelo/jogados", { [a.slug]: true, [b.slug]: true });
      if (qid != null) Sala.update("duelo/perguntasUsadas", { [qid]: true });
    }
  }

  function outraPergunta() {
    if (!atual) return;
    const qid = sortearPerguntaIdx(atual.perguntaId);
    Sala.update("duelo/atual", { perguntaId: qid });
    if (cfg().semRepetir && qid != null) Sala.update("duelo/perguntasUsadas", { [qid]: true });
  }

  function darDose(s, d) {
    const cur = (H.doses()[s] || 0);
    Sala.update("doses", { [s]: Math.max(0, cur + (d || 1)) });
  }

  function marcarBebeu(who) {
    if (!atual || atual.estado === "fim") return;
    if (who === "a" || who === "ambos") darDose(atual.aSlug, +1);
    if (who === "b" || who === "ambos") darDose(atual.bSlug, +1);
    let resultado;
    if (who === "ambos") resultado = "Os dois beberam 🍺";
    else if (who === "nenhum") resultado = "Ninguém bebeu dessa vez.";
    else resultado = (who === "a" ? atual.aNome : atual.bNome) + " bebeu 🍺";
    Sala.update("duelo/atual", { estado: "fim", resultado: resultado, who: who });
  }

  // ---------- RENDER ----------
  function render() {
    const root = H.$("#s-duelo"); if (!root || !me.papel) return;
    root.innerHTML = "";
    if (me.papel === "moderador") renderModerador(root);
    else renderConvidado(root);
  }

  function vsPanel() {
    if (!atual) return null;
    const bebeuA = atual.estado === "fim" && (atual.who === "a" || atual.who === "ambos");
    const bebeuB = atual.estado === "fim" && (atual.who === "b" || atual.who === "ambos");
    const lut = (nome, bebeu) => H.el("div", { class: "lutador" + (bebeu ? " bebeu" : "") }, [H.el("div", { class: "nome" }, [nome])]);
    return H.el("div", { class: "duelo-vs" }, [lut(atual.aNome, bebeuA), H.el("div", { class: "vs" }, ["VS"]), lut(atual.bNome, bebeuB)]);
  }

  function gabaritoCard(comResposta) {
    const banco = window.PERGUNTAS || [];
    const p = atual && atual.perguntaId != null ? banco[atual.perguntaId] : null;
    if (!p) return null;
    const kids = [H.el("div", { class: "cat" }, [p.cat || ""]), H.el("div", { class: "q" }, [p.q])];
    if (comResposta) kids.push(H.el("div", { class: "r" }, ["Resposta: " + p.r]));
    return H.el("div", { class: "gabarito" }, kids);
  }

  function renderModerador(root) {
    const card = H.el("div", { class: "card" }, [H.el("h2", {}, ["Duelo"])]);
    const estado = atual ? atual.estado : null;

    if (!atual) {
      card.appendChild(H.el("p", { class: "muted" }, ["Sorteia uma dupla e uma pergunta. Você lê em voz alta e marca quem bebeu."]));
      card.appendChild(H.el("button", { class: "btn primary mt", onclick: sortearDuelo }, ["Sortear duelo"]));
      root.appendChild(card); return;
    }

    card.appendChild(vsPanel());
    const gabMod = gabaritoCard(true); if (gabMod) card.appendChild(gabMod);

    if (estado === "ativo") {
      if (cfg().semRepetir) {
        const total = (window.PERGUNTAS || []).length, usadas = Object.keys(perguntasUsadas).length;
        card.appendChild(H.el("p", { class: "muted center" }, [Math.max(0, total - usadas) + " de " + total + " perguntas restantes"]));
      }
      card.appendChild(H.el("p", { class: "center mt" }, ["Quem bebeu?"]));
      card.appendChild(H.el("div", { class: "btn-row mt" }, [
        H.el("button", { class: "btn danger", onclick: () => marcarBebeu("a") }, [atual.aNome + " bebe"]),
        H.el("button", { class: "btn danger", onclick: () => marcarBebeu("b") }, [atual.bNome + " bebe"]),
      ]));
      card.appendChild(H.el("div", { class: "btn-row mt" }, [
        H.el("button", { class: "btn ghost", onclick: () => marcarBebeu("ambos") }, ["Os dois bebem"]),
        H.el("button", { class: "btn ghost", onclick: () => marcarBebeu("nenhum") }, ["Ninguém"]),
      ]));
      card.appendChild(H.el("div", { class: "btn-row mt" }, [
        H.el("button", { class: "btn ghost", onclick: outraPergunta }, ["Outra pergunta"]),
        H.el("button", { class: "btn ghost", onclick: sortearDuelo }, ["Re-sortear dupla"]),
      ]));
    } else if (estado === "fim") {
      card.appendChild(H.el("p", { class: "center mt" }, [H.el("b", {}, [atual.resultado || "Duelo encerrado."])]));
      card.appendChild(H.el("button", { class: "btn primary mt", onclick: sortearDuelo }, ["Próximo duelo"]));
    }
    root.appendChild(card);
  }

  function renderConvidado(root) {
    const card = H.el("div", { class: "card" }, [H.el("h2", {}, ["Duelo"])]);
    if (!atual || atual.estado === "fim") {
      if (atual && atual.estado === "fim") {
        card.appendChild(vsPanel());
        card.appendChild(H.el("p", { class: "center mt" }, [H.el("b", {}, [atual.resultado || ""])]));
      } else {
        card.appendChild(H.el("p", { class: "center muted" }, ["Aguarde o moderador sortear o próximo duelo."]));
      }
      root.appendChild(card); return;
    }
    // estado ativo
    card.appendChild(H.el("p", { class: "center" }, ["Rolando agora:"]));
    card.appendChild(vsPanel());
    const gab = gabaritoCard(false); if (gab) card.appendChild(gab); // pergunta sem resposta
    card.appendChild(H.el("p", { class: "center muted mt" }, ["O moderador aponta quem responde. Ranking de doses ao vivo aqui embaixo. 👇"]));
    root.appendChild(card);
  }

  return { mount };
})();
