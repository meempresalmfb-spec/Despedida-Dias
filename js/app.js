// ============================================================
//  APP — boot, papéis, roteamento de telas, header, placar de doses.
// ============================================================
window.App = (function () {
  const C = () => window.CONFIG;

  // ---------- util ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach((c) => e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }
  const money = (n) => "R$ " + (Number(n) || 0).toFixed(2).replace(".", ",");
  function namebtn(title, text, green) {
    return el("button", { class: "namebtn" + (green ? " on" : ""), type: "button" }, [
      el("span", {}),
      el("p", { "data-title": title, "data-text": text || title }),
    ]);
  }
  // botão de rota/caminho (pílula com pin) — pra todo link de navegação
  function mapbtn(text, href, cls) {
    return el("a", { class: "map-btn-wrapper" + (cls ? " " + cls : ""), href: href, target: "_blank", rel: "noopener" }, [
      el("div", { class: "map-btn" }, [text]),
      el("div", { class: "pinpoint" }),
    ]);
  }
  let toastT = null;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // identidade do aparelho
  function uid() {
    let u = localStorage.getItem("meuUid");
    if (!u) { u = "u_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36); localStorage.setItem("meuUid", u); }
    return u;
  }

  const me = { uid: uid(), nome: "", papel: null };

  // ---------- telas ----------
  const TABS = {
    moderador: [
      { id: "s-inicio", lbl: "Início" },
      { id: "s-jogos", lbl: "Jogos" },
      { id: "s-custos", lbl: "Custos" },
      { id: "s-local", lbl: "Local" },
      { id: "s-config", lbl: "Config" },
    ],
    convidado: [
      { id: "s-inicio", lbl: "Início" },
      { id: "s-jogos", lbl: "Jogos" },
      { id: "s-custos", lbl: "Custos" },
      { id: "s-local", lbl: "Local" },
    ],
  };

  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    $$("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.target === id));
    window.scrollTo(0, 0);
  }

  function buildHeader() {
    const ev = C().evento;
    const hdr = $("#hdr");
    hdr.className = "app-header";
    hdr.innerHTML = "";
    const avatar = el("img", { class: "avatar", src: ev.fotoMatheus, alt: "Matheus", onerror: function () { this.style.display = "none"; } });
    const titulo = el("div", { class: "titulo" }, [
      el("h1", {}, [ev.nome || "Despedida"]),
      el("div", { class: "sub", id: "hdr-sub" }, [contagemTxt()]),
    ]);
    const badge = el("span", {
      class: "badge-papel trocar " + (me.papel === "moderador" ? "mod" : "guest"),
      role: "button", tabindex: "0", title: "Trocar de modo (voltar pra tela inicial)",
      onclick: trocarModo,
    }, [me.papel === "moderador" ? "MODERADOR" : (me.nome || "CONVIDADO"), el("span", { class: "sw" }, [" · trocar"])]);
    badge.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") trocarModo(); });
    hdr.appendChild(avatar); hdr.appendChild(titulo); hdr.appendChild(badge);
  }

  function contagemTxt() {
    const ev = C().evento;
    if (!ev.contagemRegressiva || !ev.data) return Sala.modo === "local" ? "modo local (sem Firebase)" : "sala: " + Sala.codigo;
    const alvo = new Date(ev.data + "T" + (ev.horario || "20:00") + ":00");
    const dias = Math.ceil((alvo - new Date()) / 86400000);
    if (isNaN(dias)) return "sala: " + Sala.codigo;
    if (dias > 1) return "faltam " + dias + " dias";
    if (dias === 1) return "é amanhã!";
    if (dias === 0) return "é HOJE";
    return "rolou!";
  }

  function buildTabbar() {
    const bar = $("#tabbar");
    bar.className = "tabbar " + (me.papel === "convidado" ? "guest" : "");
    bar.innerHTML = "";
    TABS[me.papel].forEach((t) => {
      bar.appendChild(el("button", { "data-target": t.id, onclick: () => show(t.id) }, [
        el("span", {}, [t.lbl]),
      ]));
    });
  }

  // ---------- placar de doses ----------
  let jogadoresCache = {};
  function mountDoses() {
    const root = $("#s-doses"); root.innerHTML = "";
    const card = el("div", { class: "card" }, [el("h2", {}, ["Placar de doses"])]);
    const lista = el("div", { class: "placar", id: "placar-lista" });
    card.appendChild(lista);
    if (me.papel === "moderador") card.appendChild(el("p", { class: "muted mt" }, ["Toque + / − pra ajustar. (Só você edita.)"]));
    root.appendChild(card);
    renderDoses();
  }
  function renderDoses() {
    const lista = $("#placar-lista"); if (!lista) return;
    lista.innerHTML = "";
    const arr = Object.keys(jogadoresCache).map((k) => ({ uid: k, ...jogadoresCache[k] }))
      .sort((a, b) => (b.doses || 0) - (a.doses || 0) || (a.nome || "").localeCompare(b.nome || ""));
    if (!arr.length) { lista.appendChild(el("p", { class: "muted" }, ["Ninguém conectado ainda."])); return; }
    arr.forEach((j) => {
      const linha = el("div", { class: "linha" }, [
        el("span", { class: "conn-dot " + (j.conectado ? "on" : "") }),
        namebtn(j.nome || "?", String(j.doses || 0)),
      ]);
      if (me.papel === "moderador") {
        linha.appendChild(el("button", { class: "btn sm ghost", onclick: () => mudaDose(j.uid, -1) }, ["−"]));
        linha.appendChild(el("span", { class: "pts" }, [String(j.doses || 0)]));
        linha.appendChild(el("button", { class: "btn sm primary", onclick: () => mudaDose(j.uid, +1) }, ["+"]));
      } else {
        linha.appendChild(el("span", { class: "pts" }, [String(j.doses || 0)]));
      }
      lista.appendChild(linha);
    });
  }
  function mudaDose(u, d) {
    const atual = (jogadoresCache[u] && jogadoresCache[u].doses) || 0;
    Sala.update("jogadores/" + u, { doses: Math.max(0, atual + d) });
  }

  // ---------- entrada / papéis ----------
  function entrarConvidado(nome) {
    me.papel = "convidado"; me.nome = nome.trim();
    localStorage.setItem("modo", "convidado"); localStorage.setItem("meuNome", me.nome);
    Sala.get("jogadores/" + me.uid).then((cur) => {
      Sala.presenca("jogadores/" + me.uid, {
        nome: me.nome, conectado: true, papel: "convidado", doses: (cur && cur.doses) || 0,
      });
    });
    iniciarSessao();
  }
  function entrarModerador() {
    me.papel = "moderador";
    localStorage.setItem("modo", "moderador");
    iniciarSessao();
  }
  function iniciarSessao() {
    buildHeader(); buildTabbar();
    document.body.dataset.role = me.papel;
    $("#tabbar").classList.remove("hidden");
    mountDoses();
    Duelo.mount(me, { el, $, show, toast, money, namebtn, mapbtn, jogadores: () => jogadoresCache });
    Custos.mount(me, { el, $, toast, money, namebtn, mapbtn });
    Local.mount(me, { el, $, namebtn, mapbtn });
    if (me.papel === "moderador") mountConfig();
    mountInicio();
    mountJogosIntro();
    show("s-inicio");
    // assina jogadores (placar + duelo + custos usam)
    Sala.on("jogadores", (v) => {
      jogadoresCache = v || {};
      renderDoses();
      if (window.Duelo && Duelo.onJogadores) Duelo.onJogadores(jogadoresCache);
      if (window.Custos && Custos.onJogadores) Custos.onJogadores(jogadoresCache);
    });
    // atualiza header sub de tempos em tempos
    setInterval(() => { const s = $("#hdr-sub"); if (s) s.textContent = contagemTxt(); }, 60000);
  }

  function mountInicio() {
    const root = $("#s-inicio"); if (!root) return;
    const ev = C().evento, L = C().local || {};
    root.innerHTML = "";
    const card = el("div", { class: "card inicio-card" }, []);
    if (ev.fotoMatheus) card.appendChild(el("img", { class: "hero-foto", src: ev.fotoMatheus, alt: ev.noivo || "", onerror: function () { this.style.display = "none"; } }));
    card.appendChild(el("h2", { class: "inicio-titulo" }, [ev.nome || "Despedida"]));
    card.appendChild(el("p", { class: "quando" }, [dataEntrada(ev)]));
    if (L.nomeLugar || L.endereco) card.appendChild(el("p", { class: "onde" }, [[L.nomeLugar, L.endereco].filter(Boolean).join(" · ")]));
    const fotos = ev.fotos || [];
    if (fotos.length) card.appendChild(el("div", { class: "galeria" }, fotos.map((s) => el("img", { src: s, alt: ev.noivo || "", loading: "lazy", onerror: function () { this.style.display = "none"; } }))));
    card.appendChild(el("div", { class: "indices" }, [
      el("button", { class: "indice", onclick: () => show("s-jogos") }, ["Jogos"]),
      el("button", { class: "indice", onclick: () => show("s-custos") }, ["Custos"]),
      el("button", { class: "indice", onclick: () => show("s-local") }, ["Local"]),
    ]));
    if (L.googleMapsUrl) card.appendChild(mapbtn("Como chegar", L.googleMapsUrl, "map-sm"));
    root.appendChild(card);
  }
  function mountJogosIntro() {
    const root = $("#jogos-intro"); if (!root) return;
    root.innerHTML = "";
    root.appendChild(el("div", { class: "card" }, [
      el("h2", {}, ["Como funciona"]),
      el("p", { class: "muted" }, ["O moderador sorteia uma dupla e uma pergunta. No “JÁ!”, os dois apertam o buzzer o mais rápido possível — quem reage mais rápido é quem responde."]),
      el("p", { class: "muted" }, ["Acertou: o outro bebe. Errou: bebe quem respondeu. Apertar ANTES do “JÁ!” é queima de largada (bebe também)."]),
      el("p", { class: "muted" }, ["O ranking de doses fica aqui embaixo e atualiza ao vivo."]),
    ]));
  }
  function mountConfig() {
    const root = $("#s-config"); root.innerHTML = "";
    root.appendChild(el("div", { class: "card" }, [
      el("h2", {}, ["Sessão"]),
      el("p", { class: "muted" }, ["Modo: " + (Sala.modo === "firebase" ? "Firebase (multi-celular)" : "Local (1 aparelho / abas)") + " · sala: " + Sala.codigo]),
      el("button", { class: "btn danger mt", onclick: resetSala }, ["Resetar SALA (limpa duelo, doses, custos)"]),
      el("button", { class: "btn ghost mt", onclick: resetLocal }, ["Resetar este aparelho (sair)"]),
    ]));
  }
  async function resetSala() {
    if (!confirm("Resetar a sala inteira? Isso zera duelo, doses e custos pra todo mundo.")) return;
    await Sala.resetSala(); toast("Sala resetada.");
  }
  function resetLocal() {
    if (!confirm("Sair e limpar este aparelho?")) return;
    localStorage.removeItem("modo"); localStorage.removeItem("meuNome");
    location.reload();
  }
  // sair do papel atual e voltar pra tela inicial (mantém nome/uid/doses)
  function trocarModo() {
    if (!confirm("Trocar de modo? Você volta pra tela inicial (Moderador / Convidado). Seu nome e suas doses ficam salvos.")) return;
    localStorage.removeItem("modo");
    location.reload();
  }

  // ---------- telas de entrada ----------
  function dataEntrada(ev) {
    if (!ev.data) return "";
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const p = ev.data.split("-"); if (p.length !== 3) return ev.data;
    const dt = new Date(ev.data + "T" + (ev.horario || "10:00") + ":00");
    const diaSem = isNaN(dt) ? "" : dias[dt.getDay()] + ", ";
    const hora = ev.horario ? " · a partir das " + ev.horario.replace(":00", "h").replace(":", "h") : "";
    return diaSem + parseInt(p[2], 10) + " de " + (meses[parseInt(p[1], 10) - 1] || "") + hora;
  }
  function wireEntrada() {
    const ev = C().evento;
    $("#entrada-titulo").innerHTML = (ev.nome || "Despedida").replace(/Dias/i, "<em>Dias</em>");
    $("#btn-moderador").addEventListener("click", () => show("s-pin"));
    $("#btn-convidado").addEventListener("click", () => {
      const ult = localStorage.getItem("meuNome"); if (ult) $("#in-nome").value = ult;
      show("s-nome");
    });
    // PIN
    const pinIn = $("#in-pin");
    $("#btn-pin-ok").addEventListener("click", () => {
      if (pinIn.value === String(C().sala.pinModerador)) entrarModerador();
      else { toast("PIN errado."); pinIn.value = ""; pinIn.focus(); }
    });
    pinIn.addEventListener("keyup", (e) => { if (e.key === "Enter") $("#btn-pin-ok").click(); });
    $$(".voltar-entrada").forEach((b) => b.addEventListener("click", () => show("s-entrada")));
    // Nome
    $("#btn-nome-ok").addEventListener("click", () => {
      const n = $("#in-nome").value.trim();
      if (n.length < 2) { toast("Coloca um nome."); return; }
      entrarConvidado(n);
    });
    $("#in-nome").addEventListener("keyup", (e) => { if (e.key === "Enter") $("#btn-nome-ok").click(); });
    // datalist de participantes
    const dl = $("#participantes");
    (C().participantes || []).forEach((p) => dl.appendChild(el("option", { value: p })));
  }

  // ---------- boot ----------
  function boot() {
    Sala.init();
    wireEntrada();
    // auto-retomar papel salvo
    const modo = localStorage.getItem("modo");
    if (modo === "convidado" && localStorage.getItem("meuNome")) entrarConvidado(localStorage.getItem("meuNome"));
    else if (modo === "moderador") entrarModerador();
    else show("s-entrada");
  }

  return { boot, show, el, $, $$, toast, money, me };
})();

document.addEventListener("DOMContentLoaded", App.boot);
