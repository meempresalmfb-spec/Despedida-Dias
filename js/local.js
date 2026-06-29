// ============================================================
//  LOCAL — offline. Endereço, Maps/Waze, embed, cronograma, checklist, contatos.
//  Tudo vem do CONFIG.local. Checklist marcado fica salvo no aparelho.
// ============================================================
window.Local = (function () {
  let me, H;

  function mount(_me, _H) { me = _me; H = _H; render(); }

  function render() {
    const root = H.$("#s-local"); if (!root) return;
    const L = window.CONFIG.local || {};
    root.innerHTML = "";

    // endereço + botões
    const cardEnd = H.el("div", { class: "card" }, [H.el("h2", {}, ["📍 Onde é"])]);
    if (L.nomeLugar) cardEnd.appendChild(H.el("p", {}, [H.el("b", {}, [L.nomeLugar])]));
    cardEnd.appendChild(H.el("p", { class: L.endereco ? "" : "muted" }, [L.endereco || "Endereço a definir no config.js"]));
    const botoes = H.el("div", { class: "btn-row mt" }, []);
    if (L.googleMapsUrl) botoes.appendChild(H.el("a", { class: "btn primary", href: L.googleMapsUrl, target: "_blank", rel: "noopener" }, ["Google Maps"]));
    if (L.wazeUrl) botoes.appendChild(H.el("a", { class: "btn ghost", href: L.wazeUrl, target: "_blank", rel: "noopener" }, ["Waze"]));
    if (botoes.children.length) cardEnd.appendChild(botoes);
    if (L.embedUrl) cardEnd.appendChild(H.el("iframe", { class: "mapa-embed mt", src: L.embedUrl, loading: "lazy", referrerpolicy: "no-referrer-when-downgrade" }));
    root.appendChild(cardEnd);

    // data / horário / cronograma
    const ev = window.CONFIG.evento || {};
    const cardCr = H.el("div", { class: "card" }, [H.el("h2", {}, ["🕗 A noite"])]);
    if (ev.data) cardCr.appendChild(H.el("p", {}, [dataBonita(ev.data) + (ev.horario ? " · " + ev.horario : "")]));
    const cron = L.cronograma || [];
    if (cron.length) {
      const lista = H.el("div", { class: "cronograma" });
      cron.forEach((c) => lista.appendChild(H.el("div", { class: "item" }, [H.el("div", { class: "h" }, [c.hora || ""]), H.el("div", {}, [c.o || ""])])));
      cardCr.appendChild(lista);
    } else cardCr.appendChild(H.el("p", { class: "muted" }, ["Cronograma a definir."]));
    root.appendChild(cardCr);

    // checklist (salvo local)
    const cardCk = H.el("div", { class: "card" }, [H.el("h2", {}, ["🎒 O que levar"])]);
    const ck = H.el("div", { class: "checklist" });
    const salvo = JSON.parse(localStorage.getItem("checklist") || "{}");
    (L.checklist || []).forEach((item, i) => {
      const id = "ck" + i;
      const input = H.el("input", { type: "checkbox", id });
      if (salvo[item]) input.checked = true;
      input.addEventListener("change", () => { salvo[item] = input.checked; localStorage.setItem("checklist", JSON.stringify(salvo)); });
      ck.appendChild(H.el("label", { for: id }, [input, document.createTextNode(item)]));
    });
    cardCk.appendChild(ck);
    root.appendChild(cardCk);

    // contatos
    const contatos = L.contatos || [];
    if (contatos.length) {
      const cardCt = H.el("div", { class: "card" }, [H.el("h2", {}, ["📞 Contatos"])]);
      contatos.forEach((c) => {
        cardCt.appendChild(H.el("div", { class: "row", style: "padding:8px 0;border-bottom:1px solid var(--line)" }, [
          H.el("span", { class: "spacer" }, [c.nome || c.tel]),
          H.el("a", { class: "btn sm ghost", href: "tel:" + c.tel }, ["Ligar"]),
          H.el("a", { class: "btn sm primary", href: "https://wa.me/" + (c.tel || "").replace(/\D/g, ""), target: "_blank", rel: "noopener" }, ["Whats"]),
        ]));
      });
      root.appendChild(cardCt);
    }

    // aviso responsa
    if (L.avisoResponsa) root.appendChild(H.el("div", { class: "card" }, [H.el("div", { class: "aviso-responsa" }, ["⚠️ " + L.avisoResponsa])]));
  }

  function dataBonita(d) {
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const p = (d || "").split("-");
    if (p.length !== 3) return d;
    return parseInt(p[2], 10) + " de " + (meses[parseInt(p[1], 10) - 1] || "") + " de " + p[0];
  }

  return { mount };
})();
