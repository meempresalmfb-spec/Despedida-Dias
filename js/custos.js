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
      comprovante: d.comprovante, pagoPor: d.pagoPor, fixa: true,
    }));
  }
  function todas() {
    return fixas().concat(Object.keys(despesas).map((id) => ({ id, ...despesas[id] })));
  }
  function partsDe(d) {
    if (!d) return [];
    if (d.participantes === "todos" || !Array.isArray(d.participantes)) return pessoasRateio().map((p) => p.id);
    return d.participantes;
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
  const pago = (id) => ehReceb(id) || !!(statusNome[id] && statusNome[id].pago);
  // total que os outros devem ao recebedor, e quanto já voltou
  const aReceber = () => pessoasRateio().filter((p) => !ehReceb(p.id)).reduce((s, p) => s + deve(p.id), 0);
  const arrecadado = () => pessoasRateio().filter((p) => !ehReceb(p.id) && pago(p.id)).reduce((s, p) => s + deve(p.id), 0);

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
  function togglePago(id) {
    const novo = !(statusNome[id] && statusNome[id].pago);
    Sala.update("custos/statusNome/" + id, { pago: novo });
    H.toast(nomeDe(id) + (novo ? " marcado PAGO" : " desmarcado"));
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
        ? H.el("p", { class: "muted mt" }, [cfgC().nomeRecebedor + " adiantou tudo e recebe dos outros · cada um deve " + H.money(perHead())])
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
      const pg = !isReceb && !!(statusNome[p.id] && statusNome[p.id].pago);
      const linha = H.el("div", { class: "pessoa" + (pg ? " pago" : "") }, [
        H.namebtn(p.nome + (isReceb ? " (recebe)" : ""), isReceb ? "recebe" : (pg ? "pago" : "deve"), pg),
        H.el("span", { class: "deve" }, [isReceb ? "adiantou" : H.money(deve(p.id))]),
      ]);
      if (ehMod && !isReceb) {
        linha.style.cursor = "pointer";
        linha.addEventListener("click", () => togglePago(p.id));
      }
      lista.appendChild(linha);
    });
    cardP.appendChild(lista);
    cardP.appendChild(H.el("p", { class: "muted mt" }, [
      ehMod ? "Toque no nome pra marcar/desmarcar PAGO." : "Verde = já acertou com o " + (cfgC().nomeRecebedor || "organizador") + ".",
    ]));
    root.appendChild(cardP);

    // despesas
    const cardD = H.el("div", { class: "card" }, [H.el("h2", {}, ["Despesas"])]);
    const lds = todas();
    if (!lds.length) cardD.appendChild(H.el("p", { class: "muted" }, ["Nenhuma despesa ainda."]));
    lds.forEach((d) => {
      const parts = partsDe(d);
      const meta = (d.participantes === "todos" ? "rateio entre todos" : parts.length + " pessoa(s)") + " · "
        + H.money((Number(d.valor) || 0) / (parts.length || 1)) + "/cabeça"
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
