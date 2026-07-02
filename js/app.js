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
  const slugify = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  // ---------- ranking de doses (por nome, da lista de confirmados) ----------
  let dosesCache = {};
  function pessoasRanking() {
    return (C().participantes || []).map((n) => ({ nome: n, slug: slugify(n) })).filter((p) => p.slug);
  }
  function mountDoses() {
    const root = $("#s-doses"); root.innerHTML = "";
    const card = el("div", { class: "card" }, [el("h2", {}, ["Ranking de doses"])]);
    const lista = el("div", { class: "placar", id: "placar-lista" });
    card.appendChild(lista);
    if (me.papel === "moderador") card.appendChild(el("p", { class: "muted mt" }, ["Toque + / − pra ajustar manualmente. (O duelo já soma sozinho.)"]));
    root.appendChild(card);
    renderDoses();
  }
  function renderDoses() {
    const lista = $("#placar-lista"); if (!lista) return;
    lista.innerHTML = "";
    const arr = pessoasRanking().map((p) => ({ ...p, doses: dosesCache[p.slug] || 0 }))
      .sort((a, b) => (b.doses - a.doses) || a.nome.localeCompare(b.nome));
    if (!arr.length) { lista.appendChild(el("p", { class: "muted" }, ["Sem participantes no config."])); return; }
    const meuSlug = me.papel === "convidado" ? slugify(me.nome) : null;
    arr.forEach((j, i) => {
      const ehEu = meuSlug && j.slug === meuSlug;
      const linha = el("div", { class: "linha" + (ehEu ? " eu" : "") }, [
        el("span", { class: "rk" }, [String(i + 1)]),
        el("span", { class: "nome" }, [j.nome + (ehEu ? " (você)" : "")]),
      ]);
      if (me.papel === "moderador") {
        linha.appendChild(el("button", { class: "btn sm ghost", onclick: () => mudaDose(j.slug, -1) }, ["−"]));
        linha.appendChild(el("span", { class: "pts" }, [String(j.doses)]));
        linha.appendChild(el("button", { class: "btn sm primary", onclick: () => mudaDose(j.slug, +1) }, ["+"]));
      } else {
        linha.appendChild(el("span", { class: "pts" }, [String(j.doses)]));
      }
      lista.appendChild(linha);
    });
  }
  function mudaDose(s, d) {
    const atual = dosesCache[s] || 0;
    Sala.update("doses", { [s]: Math.max(0, atual + d) });
  }

  // ---------- entrada / papéis ----------
  function entrarConvidado(nome) {
    me.papel = "convidado"; me.nome = nome.trim();
    localStorage.setItem("modo", "convidado"); localStorage.setItem("meuNome", me.nome);
    // ranking é por nome (lista de confirmados) — convidado não precisa registrar presença.
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
    Duelo.mount(me, { el, $, toast, doses: () => dosesCache });
    Custos.mount(me, { el, $, toast, money, namebtn, mapbtn });
    Local.mount(me, { el, $, namebtn, mapbtn });
    if (me.papel === "moderador") mountConfig();
    mountInicio();
    renderJogos();
    show("s-inicio");
    // assina o ranking de doses (moderador incrementa no duelo, todos veem ao vivo)
    Sala.on("doses", (v) => {
      dosesCache = v || {};
      renderDoses();
    });
    // portão dos jogos: só abre quando o moderador clica "Começar Jogos"
    Sala.on("jogos/iniciado", (v) => { jogosIniciado = !!v; renderJogos(); });
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
  // ---------- portão "Começar Jogos" (moderador libera pra todos) ----------
  let jogosIniciado = false;
  function comecarJogos() {
    if (!confirm("Começar os jogos? Isso ZERA o placar de doses e o duelo pra todo mundo (limpa os testes).")) return;
    Sala.resetJogos().then(() => Sala.set("jogos/iniciado", true)).then(() => toast("Jogos começaram! 🍻"));
  }
  function encerrarJogos() {
    if (!confirm("Voltar pra tela de espera? O placar continua salvo (não zera).")) return;
    Sala.set("jogos/iniciado", false);
  }
  function renderJogos() {
    const intro = $("#jogos-intro"); if (!intro) return;
    const dueloSec = $("#s-duelo"), dosesSec = $("#s-doses");
    intro.innerHTML = "";
    if (!jogosIniciado) {
      // ANTES de começar: só a explicação (+ botão pro moderador)
      const card = el("div", { class: "card" }, [
        el("h2", {}, ["Os jogos"]),
        el("p", { class: "muted" }, ["As perguntas são sobre os gostos, o trabalho e a história do Dias (com umas zoeiras no meio 😏)."]),
        el("p", { class: "muted" }, ["O moderador sorteia uma dupla e uma pergunta e lê em voz alta. Quem errar (ou não souber) bebe uma dose."]),
        el("p", { class: "muted" }, ["O moderador marca quem bebeu e o ranking de doses sobe ao vivo pra todo mundo. 🍺"]),
      ]);
      if (me.papel === "moderador") {
        card.appendChild(el("button", { class: "btn primary mt", onclick: comecarJogos }, ["🍻 Começar Jogos"]));
        card.appendChild(el("p", { class: "muted center mt" }, ["Pode testar à vontade antes — “Começar” zera tudo e larga do zero."]));
      } else {
        card.appendChild(el("p", { class: "center mt", style: "font-weight:800;color:var(--acc-guest)" }, ["Aguarde o moderador começar os jogos. 🍻"]));
      }
      intro.appendChild(card);
      if (dueloSec) dueloSec.classList.add("hidden");
      if (dosesSec) dosesSec.classList.add("hidden");
    } else {
      // DEPOIS de começar: mostra o duelo + ranking (moderador tem "Encerrar")
      if (me.papel === "moderador") {
        intro.appendChild(el("div", { class: "row", style: "justify-content:flex-end;margin:2px 0 6px" }, [
          el("button", { class: "btn sm ghost", style: "width:auto", onclick: encerrarJogos }, ["Encerrar jogos"]),
        ]));
      }
      if (dueloSec) dueloSec.classList.remove("hidden");
      if (dosesSec) dosesSec.classList.remove("hidden");
    }
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
