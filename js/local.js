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
    const cardEnd = H.el("div", { class: "card" }, [H.el("h2", {}, ["Onde é"])]);
    if (L.nomeLugar) cardEnd.appendChild(H.el("p", {}, [H.el("b", {}, [L.nomeLugar])]));
    cardEnd.appendChild(H.el("p", { class: L.endereco ? "" : "muted" }, [L.endereco || "Endereço a definir no config.js"]));
    const botoes = H.el("div", { class: "btn-row mt" }, []);
    if (L.googleMapsUrl) botoes.appendChild(H.mapbtn("Google Maps", L.googleMapsUrl));
    if (L.wazeUrl) botoes.appendChild(H.mapbtn("Waze", L.wazeUrl));
    if (botoes.children.length) cardEnd.appendChild(botoes);
    if (L.embedUrl) cardEnd.appendChild(H.el("iframe", { class: "mapa-embed mt", src: L.embedUrl, loading: "lazy", referrerpolicy: "no-referrer-when-downgrade" }));
    root.appendChild(cardEnd);

    // o dia da festa — card animado (Uiverse cloud)
    const ev = window.CONFIG.evento || {};
    if (ev.data) {
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const diasS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const pp = ev.data.split("-");
      const dt = new Date(ev.data + "T" + (ev.horario || "11:00") + ":00");
      const cloud = '<svg viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg"><g fill="#ffffff"><ellipse cx="80" cy="82" rx="60" ry="34"/><ellipse cx="125" cy="66" rx="46" ry="40"/><ellipse cx="160" cy="90" rx="42" ry="28"/><rect x="46" y="84" width="140" height="30" rx="15"/></g></svg>';
      const sun = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="#C2870F" stroke-width="6" stroke-linecap="round"><line x1="50" y1="6" x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="94"/><line x1="6" y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="94" y2="50"/><line x1="19" y1="19" x2="29" y2="29"/><line x1="71" y1="71" x2="81" y2="81"/><line x1="81" y1="19" x2="71" y2="29"/><line x1="29" y1="71" x2="19" y2="81"/></g><circle cx="50" cy="50" r="19" fill="#F2B705" stroke="#C2870F" stroke-width="4"/></svg>';
      const cardDia = H.el("div", { class: "card-time-cloud" }, [
        H.el("div", { class: "card-time-cloud-back", html: cloud + cloud }),
        H.el("div", { class: "card-time-cloud-front" }),
        H.el("span", { class: "card-time-cloud-day" }, [isNaN(dt) ? "" : diasS[dt.getDay()]]),
        H.el("span", { class: "card-time-cloud-day-number" }, [parseInt(pp[2], 10) + " de " + (meses[parseInt(pp[1], 10) - 1] || "")]),
        H.el("span", { class: "card-time-cloud-hour" }, [(ev.horario || "").replace(":00", "h").replace(":", "h")]),
        H.el("span", { class: "card-time-cloud-icon", html: sun }),
      ]);
      root.appendChild(H.el("div", { style: "display:flex;justify-content:center;margin:14px 0" }, [cardDia]));
    }

    // lista de presença (confirmados)
    const confirmados = window.CONFIG.participantes || [];
    if (confirmados.length) {
      const cardLp = H.el("div", { class: "card" }, [H.el("h2", {}, ["Confirmados (" + confirmados.length + ")"])]);
      const grid = H.el("div", { class: "confirmados" });
      confirmados.forEach((n, i) => grid.appendChild(H.el("div", { class: "cf" }, [H.el("span", { class: "i" }, [String(i + 1)]), n])));
      cardLp.appendChild(grid);
      root.appendChild(cardLp);
    }

    // contatos
    const contatos = L.contatos || [];
    if (contatos.length) {
      const cardCt = H.el("div", { class: "card" }, [H.el("h2", {}, ["Contatos"])]);
      contatos.forEach((c) => {
        cardCt.appendChild(H.el("div", { class: "row", style: "padding:8px 0;border-bottom:1px solid var(--line)" }, [
          H.el("span", { class: "spacer" }, [c.nome || c.tel]),
          H.el("a", { class: "btn sm ghost", href: "tel:" + c.tel }, ["Ligar"]),
          H.el("a", { class: "btn sm primary", href: "https://wa.me/" + (c.tel || "").replace(/\D/g, ""), target: "_blank", rel: "noopener" }, ["Whats"]),
        ]));
      });
      root.appendChild(cardCt);
    }
  }

  function dataBonita(d) {
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const p = (d || "").split("-");
    if (p.length !== 3) return d;
    return parseInt(p[2], 10) + " de " + (meses[parseInt(p[1], 10) - 1] || "") + " de " + p[0];
  }

  return { mount };
})();
