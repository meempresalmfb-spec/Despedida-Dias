// ============================================================
//  CUSTOS & PAGAMENTOS — lista aberta (Firebase), sem login.
//  Todos veem; só o moderador edita despesas e marca pago (nome fica verde).
//  Comprovante de PIX → IndexedDB (local do aparelho do moderador).
// ============================================================
window.Custos = (function () {
  let me, H;
  let despesas = {};   // custos/despesas/{id}
  let status = {};     // custos/status/{uid}
  let jogadores = {};

  const cfgC = () => window.CONFIG.custos || {};
  const ev = () => window.CONFIG.evento || {};

  // pessoas que entram no rateio
  function pessoasRateio() {
    const noivo = (ev().noivo || "").toLowerCase();
    return Object.keys(jogadores)
      .filter((k) => jogadores[k] && jogadores[k].papel === "convidado")
      .map((k) => ({ uid: k, nome: jogadores[k].nome || "?" }))
      .filter((p) => cfgC().matheusNoRateio || !(noivo && p.nome.toLowerCase().includes(noivo.split(" ")[0])));
  }
  const nomeDe = (u) => (jogadores[u] && jogadores[u].nome) || "?";

  function partsDe(d) {
    if (!d) return [];
    if (d.participantes === "todos" || !Array.isArray(d.participantes)) return pessoasRateio().map((p) => p.uid);
    return d.participantes;
  }
  function deve(uid) {
    let total = 0;
    Object.values(despesas).forEach((d) => {
      const parts = partsDe(d);
      if (parts.includes(uid) && parts.length) total += (Number(d.valor) || 0) / parts.length;
    });
    return total;
  }
  const totalFesta = () => Object.values(despesas).reduce((s, d) => s + (Number(d.valor) || 0), 0);
  function arrecadado() {
    return pessoasRateio().reduce((s, p) => s + ((status[p.uid] && status[p.uid].pago) ? deve(p.uid) : 0), 0);
  }

  function mount(_me, _H) {
    me = _me; H = _H;
    Sala.on("custos/despesas", (v) => { despesas = v || {}; render(); });
    Sala.on("custos/status", (v) => { status = v || {}; render(); });
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
  function togglePago(uid) {
    const novo = !(status[uid] && status[uid].pago);
    Sala.update("custos/status/" + uid, { pago: novo });
    H.toast(nomeDe(uid) + (novo ? " marcado PAGO ✓" : " desmarcado"));
  }
  function copiarPix() {
    const chave = cfgC().chavePix || "";
    if (!chave) { H.toast("Sem chave PIX no config."); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(chave) : Promise.reject()).then(
      () => H.toast("PIX copiado!"), () => H.toast("Copie manualmente: " + chave));
  }
  // comprovante → IndexedDB
  function anexarComprovante(uid, file) {
    if (!file) return;
    idbPut(uid, file).then(() => { Sala.update("custos/status/" + uid, { comprovanteRef: uid }); H.toast("Comprovante salvo (neste aparelho)."); });
  }
  function verComprovante(uid) {
    idbGet(uid).then((blob) => {
      if (!blob) { H.toast("Comprovante não está neste aparelho."); return; }
      const url = URL.createObjectURL(blob); window.open(url, "_blank");
    });
  }

  // ---------- render ----------
  function render() {
    const root = H.$("#s-custos"); if (!root || !me.papel) return;
    const ehMod = me.papel === "moderador";
    root.innerHTML = "";

    // resumo
    const total = totalFesta(), arr = arrecadado(), falta = Math.max(0, total - arr);
    const pct = total ? Math.min(100, (arr / total) * 100) : 0;
    const resumo = H.el("div", { class: "card" }, [
      H.el("h2", {}, ["💸 Custos da festa"]),
      H.el("div", { class: "resumo-custos" }, [
        box("total", "Total", total), box("arrec", "Arrecadado", arr), box("falta", "Falta", falta),
      ]),
      barra(pct),
    ]);
    root.appendChild(resumo);

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

    // lista de pessoas
    const cardP = H.el("div", { class: "card" }, [H.el("h2", {}, ["Quem deve quanto"])]);
    const lista = H.el("div", { class: "lista-pessoas" });
    const pessoas = pessoasRateio().sort((a, b) => a.nome.localeCompare(b.nome));
    if (!pessoas.length) lista.appendChild(H.el("p", { class: "muted" }, ["Ninguém na sala ainda."]));
    pessoas.forEach((p) => {
      const pago = status[p.uid] && status[p.uid].pago;
      const temComp = status[p.uid] && status[p.uid].comprovanteRef;
      const euMesmo = p.uid === me.uid;
      const linha = H.el("div", { class: "pessoa" + (pago ? " pago" : "") }, [
        H.el("span", { class: "check" }, [pago ? "✅" : "•"]),
        H.el("span", { class: "nome" }, [p.nome + (euMesmo ? " (você)" : "")]),
        H.el("span", { class: "deve" }, [H.money(deve(p.uid))]),
      ]);
      if (ehMod) {
        linha.style.cursor = "pointer";
        linha.addEventListener("click", (e) => { if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") togglePago(p.uid); });
        const fileId = "comp-" + p.uid;
        const file = H.el("input", { type: "file", accept: "image/*", id: fileId, class: "hidden", onchange: (e) => anexarComprovante(p.uid, e.target.files[0]) });
        linha.appendChild(H.el("button", { class: "btn sm ghost", title: "anexar comprovante", onclick: () => document.getElementById(fileId).click() }, ["📎"]));
        linha.appendChild(file);
        if (temComp) linha.appendChild(H.el("button", { class: "btn sm ghost", onclick: () => verComprovante(p.uid) }, ["👁"]));
      }
      lista.appendChild(linha);
    });
    cardP.appendChild(lista);
    if (ehMod) cardP.appendChild(H.el("p", { class: "muted mt" }, ["Toque no nome pra marcar/desmarcar PAGO."]));
    root.appendChild(cardP);

    // despesas
    const cardD = H.el("div", { class: "card" }, [H.el("h2", {}, ["Despesas"])]);
    const dids = Object.keys(despesas);
    if (!dids.length) cardD.appendChild(H.el("p", { class: "muted" }, ["Nenhuma despesa ainda."]));
    dids.forEach((id) => {
      const d = despesas[id];
      const parts = partsDe(d);
      const linha = H.el("div", { class: "despesa" }, [
        H.el("div", { class: "d" }, [
          H.el("div", { class: "nm" }, [d.desc]),
          H.el("div", { class: "meta" }, [(d.participantes === "todos" ? "todos" : parts.length + " pessoa(s)") + " · " + H.money((Number(d.valor) || 0) / (parts.length || 1)) + "/cabeça"]),
        ]),
        H.el("div", { class: "vl" }, [H.money(d.valor)]),
      ]);
      if (ehMod) linha.appendChild(H.el("button", { class: "btn sm ghost", onclick: () => rmDespesa(id) }, ["🗑"]));
      cardD.appendChild(linha);
    });

    if (ehMod) {
      const form = H.el("div", { class: "mt" }, [
        H.el("label", { class: "field" }, [H.el("span", {}, ["Descrição"]), H.el("input", { id: "cst-desc", placeholder: "Ex: balde de cerveja" })]),
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
        H.el("input", { type: "checkbox", class: "cst-part", value: p.uid, style: "width:auto;min-height:0;height:auto;margin-right:6px" }),
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
    const b = H.el("div", { class: "barra" }, [H.el("i", { style: "width:" + pct + "%" })]);
    return b;
  }

  // ---------- IndexedDB (comprovantes) ----------
  let _db = null;
  function idb() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      const r = indexedDB.open("despedida-comprovantes", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("comp");
      r.onsuccess = () => { _db = r.result; res(_db); };
      r.onerror = () => rej(r.error);
    });
  }
  function idbPut(key, blob) {
    return idb().then((db) => new Promise((res, rej) => {
      const tx = db.transaction("comp", "readwrite"); tx.objectStore("comp").put(blob, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    }));
  }
  function idbGet(key) {
    return idb().then((db) => new Promise((res, rej) => {
      const tx = db.transaction("comp", "readonly"); const rq = tx.objectStore("comp").get(key);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    }));
  }

  return { mount, onJogadores };
})();
