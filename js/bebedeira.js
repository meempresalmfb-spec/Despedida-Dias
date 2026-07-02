// ============================================================
//  BEBEDEIRA DO MATHEUS — brinquedo interativo na tela de Início.
//  Substitui a foto redonda. Arrasta a caneca de chopp até a boca
//  dele pra ele beber: fica bêbado (bochechas), acumula canecas na
//  mesa e, na 6ª dose, apaga de cara na mesa. Botão "mais uma rodada".
//  Escalado menor que o original pra não desequilibrar a Início.
//  API: Bebedeira.mount(hostEl) — injeta o markup e liga a animação.
//  (Sem transform de escala em ancestral: o arraste usa position:fixed
//   com coords do dedo, e transform quebraria isso.)
// ============================================================
window.Bebedeira = (function () {
  var MARKUP =
    '<section id="bb-cena">' +
      '<div class="bb-palco" id="bb-palco">' +
        '<div class="bb-luz"></div>' +
        '<div class="bb-char-wrap bb-cambaleia" id="bb-char">' +
          '<img src="assets/bebedeira.png" alt="Matheus">' +
          '<div class="bb-blush l"></div><div class="bb-blush r"></div>' +
          '<div class="bb-ko" id="bb-ko">✖✖</div>' +
          '<div class="bb-boca" id="bb-boca"></div>' +
        '</div>' +
        '<div class="bb-mesa"></div>' +
        '<div class="bb-vazias" id="bb-vazias"></div>' +
        '<svg id="bb-cerveja" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="10" y="20" width="34" height="60" rx="6" fill="#3a2b12" stroke="#1a1a1a" stroke-width="3"/>' +
          '<rect x="13" y="34" width="28" height="44" rx="4" fill="#f0a500"/>' +
          '<ellipse cx="27" cy="22" rx="17" ry="8" fill="#fff8e6" stroke="#1a1a1a" stroke-width="2"/>' +
          '<path d="M44 34 h8 a8 8 0 0 1 8 8 v14 a8 8 0 0 1 -8 8 h-8" fill="none" stroke="#1a1a1a" stroke-width="3"/>' +
        '</svg>' +
      '</div>' +
      '<button class="bb-reset" id="bb-reset">🔄 mais uma rodada</button>' +
    '</section>';

  function mount(host) {
    if (!host) return;
    host.innerHTML = MARKUP;
    init();
  }

  function init() {
    var META = 6;                          // apaga na 6ª dose
    var cervejas = 0, apagou = false;
    var $ = function (id) { return document.getElementById(id); };
    var char = $('bb-char'), cerveja = $('bb-cerveja'), boca = $('bb-boca'),
        vazias = $('bb-vazias'), reset = $('bb-reset');
    if (!char || !cerveja || !boca) return;

    // ---- arrastar (mouse + toque) ----
    var drag = false, dx = 0, dy = 0;
    cerveja.addEventListener('pointerdown', function (e) {
      if (apagou) return;
      drag = true;
      cerveja.setPointerCapture(e.pointerId);
      cerveja.classList.remove('bb-volta');
      var r = cerveja.getBoundingClientRect();
      dx = e.clientX - r.left; dy = e.clientY - r.top;
      cerveja.style.position = 'fixed';
      cerveja.style.right = 'auto'; cerveja.style.bottom = 'auto';
      mover(e);
    });
    cerveja.addEventListener('pointermove', function (e) { if (drag) mover(e); });
    cerveja.addEventListener('pointerup', function (e) {
      if (!drag) return;
      drag = false;
      var b = boca.getBoundingClientRect();
      var dentro = e.clientX > b.left && e.clientX < b.right &&
                   e.clientY > b.top && e.clientY < b.bottom;
      if (dentro && !apagou) beber(e.clientX, e.clientY);
      voltar();
    });
    function mover(e) {
      cerveja.style.left = (e.clientX - dx) + 'px';
      cerveja.style.top = (e.clientY - dy) + 'px';
    }
    function voltar() {
      cerveja.style.position = 'absolute';
      cerveja.style.left = ''; cerveja.style.top = '';
      cerveja.style.right = '22px'; cerveja.style.bottom = '36px';
    }

    // ---- beber ----
    function beber(x, y) {
      cervejas++;
      if (navigator.vibrate) navigator.vibrate(30);
      flut(x, y, cervejas < META ? ['🍺','😋','🥴','💫','🌀'][Math.min(cervejas - 1, 4)] : '💥');
      var v = document.createElement('span'); v.textContent = '🍺';
      vazias.appendChild(v);
      char.style.transition = 'transform .12s';
      char.style.transform = 'translateX(-50%) scaleY(.92) scaleX(1.04)';
      setTimeout(function () { char.style.transition = ''; char.style.transform = ''; }, 130);
      estado();
      if (cervejas >= META) cair();
    }

    // ---- estado de bêbado: 3 variáveis, o CSS reage ----
    function estado() {
      var p = Math.min(cervejas / META, 1);
      char.style.setProperty('--bb-drunk', p);
      // 3° parado (já balança de leve, mostra que é animação) → 10° bêbado
      char.style.setProperty('--bb-tilt', (3 + p * 7) + 'deg');
      char.style.setProperty('--bb-sway', (2.4 - p * 1.7) + 's');
    }

    // ---- apagou ----
    var zzzTimer = null;
    function cair() {
      apagou = true;
      char.classList.remove('bb-cambaleia');
      char.classList.add('bb-apagou');
      $('bb-ko').style.opacity = 1;
      reset.style.display = 'block';
      cerveja.style.opacity = .35;
      zzzTimer = setInterval(function () {
        var r = char.getBoundingClientRect();
        flut(r.left + r.width * .6, r.top + r.height * .35, '💤');
      }, 800);
    }

    // ---- emoji flutuante ----
    function flut(x, y, t) {
      var el = document.createElement('div');
      el.className = 'bb-flut'; el.textContent = t;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 1100);
    }

    // ---- reset ----
    reset.onclick = function () {
      cervejas = 0; apagou = false;
      clearInterval(zzzTimer);
      char.classList.remove('bb-apagou');
      char.classList.add('bb-cambaleia');
      char.style.transform = '';
      $('bb-ko').style.opacity = 0;
      vazias.innerHTML = '';
      cerveja.style.opacity = 1;
      reset.style.display = 'none';
      estado();
    };

    estado();
  }

  return { mount: mount };
})();
