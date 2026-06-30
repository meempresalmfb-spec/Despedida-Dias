// ============================================================
//  CONFIG — EDITE ESTE ARQUIVO À MÃO.
//  É o único arquivo que você precisa mexer pra preparar a festa.
// ============================================================
window.CONFIG = {

  // ---- Festa ----
  evento: {
    nome: "Despedida do Dias",
    noivo: "Matheus Dias",
    data: "2026-07-04",            // AAAA-MM-DD — sábado
    horario: "11:00",             // a partir das 11h (churrasco)
    contagemRegressiva: true,      // mostra contador no header
    fotoMatheus: "assets/matheus.jpg",
    fotos: ["assets/perfil-1.jpeg", "assets/perfil-2.jpeg"],  // galeria na tela de Início (mostradas inteiras)
  },

  // ---- Sala (conexão multi-device) ----
  sala: {
    codigo: "matheus2026",         // código fixo da festa; todos entram nele
    pinModerador: "1234",          // 4 dígitos pra abrir o painel do moderador
  },

  // ---- Duelo ----
  duelo: {
    atrasoMinMs: 1500,             // atraso aleatório antes do "JÁ!"
    atrasoMaxMs: 4000,
    semRepetir: true,              // não repete dupla nem pergunta até todas saírem (depois reembaralha)
  },

  // ---- Custos / PIX ----
  custos: {
    chavePix: "75120810144",       // PIX do Miguel (adiantou tudo) — CPF
    nomeRecebedor: "Miguel",
    matheusNoRateio: false,        // (legado)
    naoPaga: ["Dias"],             // noivo não paga (nome como aparece na lista de presença)
    // Despesas já pagas pelo Miguel — entram no rateio; comprovante = foto em assets/
    despesasFixas: [
      { desc: "Chopp (Brahma Express)", valor: 2580.49, pagoPor: "Miguel", comprovante: "assets/comprovante-chopp.jpeg" },
      { desc: "Churrasqueiro (Wanderson)", valor: 400.00, pagoPor: "Miguel", comprovante: "assets/comprovante-churrasco.jpeg" },
    ],
  },

  // ---- Local ----
  local: {
    nomeLugar: "Cond. Cidade Universitária — Mansões do Campus",
    endereco: "Via Universidade de Sorbonne, 12 — Quadra 01 Lote 10 · Sítios de Recreio Mansões do Campus, Goiânia/GO · CEP 74691-020",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Via+Universidade+de+Sorbonne+12+Quadra+01+Lote+10+Mansoes+do+Campus+Goiania+GO+74691-020",
    wazeUrl: "https://waze.com/ul?q=Via+Universidade+de+Sorbonne+12+Quadra+01+Lote+10+Goiania+GO+74691-020&navigate=yes",
    embedUrl: "https://www.google.com/maps?q=Via+Universidade+de+Sorbonne+12+Quadra+01+Lote+10+Mansoes+do+Campus+Goiania+GO+74691-020&output=embed",  // src do iframe do Google Maps (opcional)
    cronograma: [
      // { hora: "20:00", o: "Esquenta no bar" },
    ],
    contatos: [
      // { nome: "Lucas (organiza)", tel: "5511999999999" },
    ],
  },

  // ---- Participantes (confirmados; também aparecem como sugestão na entrada) ----
  participantes: [
    "Dias", "Miguel", "Igor Guerra", "Lucas Coelho", "Marcos P", "Matheus P.",
    "Sobras", "Igor G.", "Matheus Amaral", "Marcão", "Léo Honorato", "Cunha",
    "Claudim", "Rafinha", "Palitim", "Kisleu", "Caique", "Jhonny",
    "Outro Marcos P.", "Palitão", "Murillo",
  ],

  // ---- Firebase ----
  //  Cole aqui as credenciais do seu projeto (Console > Config do projeto > SDK web).
  //  ENQUANTO 'databaseURL' estiver vazio, o app roda em MODO LOCAL
  //  (1 aparelho ou abas do mesmo PC) — bom pra testar a UI sem Firebase.
  firebase: {
    apiKey: "AIzaSyDpW2wOb7eJgrqcJBWazNpZwm87ZvGyyN0",
    authDomain: "despedida-dias.firebaseapp.com",
    databaseURL: "https://despedida-dias-default-rtdb.firebaseio.com",
    projectId: "despedida-dias",
    storageBucket: "despedida-dias.firebasestorage.app",
    messagingSenderId: "868212698147",
    appId: "1:868212698147:web:50ebc4e5c9083b2a039596",
    measurementId: "G-SQ61Y20ZGN",
  },
};
