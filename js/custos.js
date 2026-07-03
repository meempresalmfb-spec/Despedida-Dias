// ============================================================
//  CUSTOS & PAGAMENTOS — rateio pela LISTA DE CONFIRMADOS.
//  Miguel adiantou tudo (despesasFixas); os outros reembolsam via PIX.
//  Só o moderador marca pago (nome fica verde). Comprovante fica na despesa.
// ============================================================
window.Custos = (function () {
  let me, H;
  let despesas = {};     // custos/despesas/{id}  (despesas dinâmicas)
  let statusNome = {};   // custos/statusNome/{slug} = { pago }
  let jogadores = {};

  const cfgC = () => window.CONFIG.custos || {};

  function slug(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  const recebId = () => slug(cfgC().nomeRecebedor || "");
  const ehReceb = (id) => !!recebId() && id === recebId();

  // quem rateia = lista de confirmados, menos quem não paga (noivo)
  function pessoasRateio() {
    const fora = new Set((cfgC().naoPaga || []).map(slug));
    return (window.CONFIG.participantes || [])
      .map((nome) => ({ nome, id: slug(nome) }))
      .filter((p) => p.id && !fora.has(p.id));
  }
  const nomeDe = (id) => { const p = pessoasRateio().find((x) => x.id === id); return p ? p.nome : id; };

  // despesas fixas (config, já pagas pelo Miguel) + dinâmicas (sala)
  function fixas() {
    return (cfgC().despesasFixas || []).map((d, i) => ({
      id: "fix" + i, desc: d.desc, valor: d.valor, participantes: "todos",
      exclui: d.exclui, comprovante: d.comprovante, pagoPor: d.pagoPor, fixa: true,
    }));
  }
  function todas() {
    return fixas().concat(Object.keys(despesas).map((id) => ({ id, ...despesas[id] })));
  }
  function partsDe(d) {
    if (!d) return [];
    const base = (d.participantes === "todos" || !Array.isArray(d.participantes))
      ? pessoasRateio().map((p) => p.id) : d.participantes;
    const fora = new Set((Array.isArray(d.exclui) ? d.exclui : []).map(slug));
    return fora.size ? base.filter((id) => !fora.has(id)) : base;
  }
  function deve(id) {
    let total = 0;
    todas().forEach((d) => {
      const parts = partsDe(d);
      if (parts.includes(id) && parts.length) total += (Number(d.valor) || 0) / parts.length;
    });
    return total;
  }
  const totalFesta = () => todas().reduce((s, d) => s + (Number(d.valor) || 0), 0);
  function perHead() { const n = pessoasRateio().length; return n ? totalFesta() / n : 0; }
  // estado de pagamento por pessoa: quitado / parcial / deve tudo, guardando o valor já pago (valorPago).
  // back-compat: registro antigo { pago:true } sem valor = quitado (pagou a parte cheia).
  function pagoInfo(id) {
    const total = deve(id);
    const st = statusNome[id] || {};
    let vpago = Number(st.valorPago);
    if (isNaN(vpago)) vpago = st.pago ? total : 0;
    const quitado = st.pago === true || vpago >= total - 0.005;
    const parcial = !quitado && vpago > 0.005;
    return { total, vpago, quitado, parcial, falta: Math.max(0, total - vpago) };
  }
  const pago = (id) => ehReceb(id) || pagoInfo(id).quitado;
  // total que os outros devem ao recebedor, e quanto já voltou (soma do que cada um efetivamente pagou)
  const aReceber = () => pessoasRateio().filter((p) => !ehReceb(p.id)).reduce((s, p) => s + deve(p.id), 0);
  const arrecadado = () => pessoasRateio().filter((p) => !ehReceb(p.id)).reduce((s, p) => s + pagoInfo(p.id).vpago, 0);

  function mount(_me, _H) {
    me = _me; H = _H;
    Sala.on("custos/despesas", (v) => { despesas = v || {}; render(); });
    Sala.on("custos/statusNome", (v) => { statusNome = v || {}; render(); });
  }
  function onJogadores(cache) { jogadores = cache || {}; render(); }

  // ---------- ações (moderador) ----------
  function addDespesa() {
    const desc = H.$("#cst-desc").value.trim();
    const valor = parseFloat((H.$("#cst-valor").value || "").replace(",", "."));
    if (!desc || !(valor > 0)) { H.toast("Descrição e valor (>0)."); return; }
    const todos = H.$("#cst-todos").checked;
    let participantes = "todos";
    if (!todos) {
      participantes = Array.from(document.querySelectorAll(".cst-part:checked")).map((c) => c.value);
      if (!participantes.length) { H.toast("Escolha quem rateia."); return; }
    }
    Sala.push("custos/despesas", { desc, valor, participantes });
    H.$("#cst-desc").value = ""; H.$("#cst-valor").value = "";
    H.toast("Despesa adicionada.");
  }
  function rmDespesa(id) { if (confirm("Remover despesa?")) Sala.remove("custos/despesas/" + id); }
  function registrarPagamento(id) {
    const total = deve(id);
    const info = pagoInfo(id);
    const resp = prompt(
      nomeDe(id) + " — quanto já pagou?\nParte dele(a): " + H.money(total) +
      "\n\n• Digite o valor pago (ex: 260 ou 260,50)\n• \"ok\" = quitou (pagou tudo)\n• vazio ou 0 = deve tudo",
      info.vpago ? info.vpago.toFixed(2).replace(".", ",") : ""
    );
    if (resp === null) return;
    const s = resp.trim().toLowerCase();
    let v;
    if (s === "" || s === "0") v = 0;
    else if (["ok", "tudo", "quitar", "quitou", "pago"].includes(s)) v = total;
    else {
      let norm = s.replace(/\s/g, "");
      if (norm.indexOf(",") >= 0) norm = norm.replace(/\./g, "").replace(",", ".");
      v = parseFloat(norm);
    }
    if (isNaN(v) || v < 0) { H.toast("Valor inválido."); return; }
    v = Math.round(v * 100) / 100;
    const quitado = v >= total - 0.005;
    Sala.update("custos/statusNome/" + id, { valorPago: v, pago: quitado });
    H.toast(nomeDe(id) + ": pago " + H.money(v) + (quitado ? " (quitado)" : " · falta " + H.money(Math.max(0, total - v))));
  }
  function copiarPix() {
    const chave = cfgC().chavePix || "";
    if (!chave) { H.toast("Sem chave PIX no config."); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(chave) : Promise.reject()).then(
      () => H.toast("PIX copiado!"), () => H.toast("Copie manualmente: " + chave));
  }

  // ---------- render ----------
  function render() {
    const root = H.$("#s-custos"); if (!root || !me.papel) return;
    const ehMod = me.papel === "moderador";
    root.innerHTML = "";

    // resumo (progresso = reembolso ao recebedor)
    const total = totalFesta(), receber = aReceber(), arr = arrecadado(), falta = Math.max(0, receber - arr);
    const pct = receber ? Math.min(100, (arr / receber) * 100) : 0;
    root.appendChild(H.el("div", { class: "card" }, [
      H.el("h2", {}, ["Custos da festa"]),
      H.el("div", { class: "resumo-custos" }, [
        box("total", "Total", total), box("arrec", "Reembolsado", arr), box("falta", "Falta", falta),
      ]),
      barra(pct),
      cfgC().nomeRecebedor
        ? H.el("p", { class: "muted mt" }, [cfgC().nomeRecebedor + " adiantou tudo e recebe dos outros · em média " + H.money(perHead()) + "/pessoa (veja quem deve quanto)"])
        : H.el("span"),
    ]));

    // PIX
    const chave = cfgC().chavePix;
    if (chave) {
      root.appendChild(H.el("div", { class: "card" }, [
        H.el("h2", {}, ["Pagar via PIX"]),
        H.el("div", { class: "pix-box" }, [
          H.el("span", { class: "chave" }, [chave]),
          H.el("button", { class: "btn sm primary", onclick: copiarPix }, ["Copiar"]),
        ]),
        cfgC().nomeRecebedor ? H.el("p", { class: "muted mt" }, ["Recebedor: " + cfgC().nomeRecebedor]) : H.el("span"),
      ]));
    }

    // quem deve quanto
    const cardP = H.el("div", { class: "card" }, [H.el("h2", {}, ["Quem deve quanto"])]);
    const lista = H.el("div", { class: "lista-pessoas" });
    const pessoas = pessoasRateio().slice().sort((a, b) => (ehReceb(b.id) - ehReceb(a.id)) || a.nome.localeCompare(b.nome));
    if (!pessoas.length) lista.appendChild(H.el("p", { class: "muted" }, ["Sem lista de confirmados no config."]));
    pessoas.forEach((p) => {
      const isReceb = ehReceb(p.id);
      const info = pagoInfo(p.id);
      const cls = isReceb ? "" : (info.quitado ? " pago" : (info.parcial ? " parcial" : ""));
      const tag = isReceb ? "recebe" : (info.quitado ? "pago" : (info.parcial ? "parcial" : "deve"));
      let right;
      if (isReceb) right = H.el("span", { class: "deve" }, ["adiantou"]);
      else if (info.quitado) right = H.el("span", { class: "deve ok" }, ["pago " + H.money(info.vpago)]);
      else if (info.parcial) right = H.el("div", { class: "deve parc" }, [
        H.el("b", {}, ["falta " + H.money(info.falta)]),
        H.el("span", { class: "sub" }, ["pago " + H.money(info.vpago)]),
      ]);
      else right = H.el("span", { class: "deve" }, [H.money(info.total)]);
      const linha = H.el("div", { class: "pessoa" + cls }, [
        H.namebtn(p.nome + (isReceb ? " (recebe)" : ""), tag, info.quitado),
        right,
      ]);
      if (ehMod && !isReceb) {
        linha.style.cursor = "pointer";
        linha.addEventListener("click", () => registrarPagamento(p.id));
      }
      lista.appendChild(linha);
    });
    cardP.appendChild(lista);
    cardP.appendChild(H.el("p", { class: "muted mt" }, [
      ehMod
        ? "Toque no nome pra lançar quanto a pessoa já pagou (aceita valor parcial)."
        : "Verde = quitou · amarelo = pagou parte (falta o resto) · sem cor = deve tudo. Você acerta com o " + (cfgC().nomeRecebedor || "organizador") + ".",
    ]));
    root.appendChild(cardP);

    // despesas
    const cardD = H.el("div", { class: "card" }, [H.el("h2", {}, ["Despesas"])]);
    const lds = todas();
    if (!lds.length) cardD.appendChild(H.el("p", { class: "muted" }, ["Nenhuma despesa ainda."]));
    lds.forEach((d) => {
      const parts = partsDe(d);
      const temExclui = Array.isArray(d.exclui) && d.exclui.length;
      const meta = (d.participantes === "todos" && !temExclui ? "rateio entre todos" : parts.length + " pessoa(s)") + " · "
        + H.money((Number(d.valor) || 0) / (parts.length || 1)) + "/cabeça"
        + (temExclui ? " · sem " + d.exclui.join(", ") : "")
        + (d.pagoPor ? " · pago por " + d.pagoPor : "");
      const linha = H.el("div", { class: "despesa" }, [
        H.el("div", { class: "d" }, [
          H.el("div", { class: "nm" }, [d.desc]),
          H.el("div", { class: "meta" }, [meta]),
        ]),
        H.el("div", { class: "vl" }, [H.money(d.valor)]),
      ]);
      if (d.comprovante) linha.appendChild(H.el("button", { class: "btn sm ghost", title: "ver comprovante", onclick: () => window.open(d.comprovante, "_blank") }, ["comprovante"]));
      if (ehMod && !d.fixa) linha.appendChild(H.el("button", { class: "btn sm ghost", onclick: () => rmDespesa(d.id) }, ["remover"]));
      cardD.appendChild(linha);
    });

    // itens ainda não comprados (entram no rateio quando lançados)
    const aComprar = cfgC().aComprar || [];
    if (aComprar.length) {
      cardD.appendChild(H.el("p", { class: "muted mt" }, ["🛒 Ainda será comprado (entra no rateio quando lançado): " + aComprar.join(", ") + "."]));
    }

    if (ehMod) {
      const form = H.el("div", { class: "mt" }, [
        H.el("label", { class: "field" }, [H.el("span", {}, ["Descrição"]), H.el("input", { id: "cst-desc", placeholder: "Ex: gelo, carvão..." })]),
        H.el("label", { class: "field" }, [H.el("span", {}, ["Valor (R$)"]), H.el("input", { id: "cst-valor", inputmode: "decimal", placeholder: "120,00" })]),
        H.el("label", { class: "row", style: "gap:10px;margin:8px 0" }, [
          H.el("input", { type: "checkbox", id: "cst-todos", checked: "", style: "width:24px;height:24px;min-height:0", onchange: toggleTodos }),
          H.el("span", {}, ["Rateia entre TODOS"]),
        ]),
        H.el("div", { id: "cst-parts", class: "list-conectados hidden" }),
        H.el("button", { class: "btn primary mt", onclick: addDespesa }, ["+ Adicionar despesa"]),
      ]);
      cardD.appendChild(form);
    }
    root.appendChild(cardD);
    if (ehMod) renderPartsChecks();
  }

  function toggleTodos() {
    const wrap = H.$("#cst-parts");
    if (!wrap) return;
    wrap.classList.toggle("hidden", H.$("#cst-todos").checked);
  }
  function renderPartsChecks() {
    const wrap = H.$("#cst-parts"); if (!wrap) return;
    wrap.innerHTML = "";
    pessoasRateio().forEach((p) => {
      const lbl = H.el("label", { class: "chip" }, [
        H.el("input", { type: "checkbox", class: "cst-part", value: p.id, style: "width:auto;min-height:0;height:auto;margin-right:6px" }),
        document.createTextNode(p.nome),
      ]);
      wrap.appendChild(lbl);
    });
  }

  // helpers de UI
  function box(cls, label, val) {
    return H.el("div", { class: "box " + cls }, [H.el("div", { class: "v" }, [H.money(val)]), H.el("div", { class: "l" }, [label])]);
  }
  function barra(pct) {
    return H.el("div", { class: "barra" }, [H.el("i", { style: "width:" + pct + "%" })]);
  }

  return { mount, onJogadores };
})();
