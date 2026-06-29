// ============================================================
//  CONFIG — EDITE ESTE ARQUIVO À MÃO.
//  É o único arquivo que você precisa mexer pra preparar a festa.
// ============================================================
window.CONFIG = {

  // ---- Festa ----
  evento: {
    nome: "Despedida do Matheus",
    noivo: "Matheus Dias",
    data: "2026-08-15",            // AAAA-MM-DD
    horario: "20:00",
    contagemRegressiva: true,      // mostra contador no header
    fotoMatheus: "assets/matheus.jpg",
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
    semRepetir: true,              // evita repetir a mesma dupla até todos jogarem
  },

  // ---- Custos / PIX ----
  custos: {
    chavePix: "",                  // sua chave PIX
    nomeRecebedor: "",
    matheusNoRateio: false,        // noivo entra no rateio? padrão: não
  },

  // ---- Local ----
  local: {
    nomeLugar: "",
    endereco: "",
    googleMapsUrl: "",
    wazeUrl: "",
    embedUrl: "",                  // src do iframe do Google Maps (opcional)
    cronograma: [
      // { hora: "20:00", o: "Esquenta no bar" },
    ],
    checklist: ["Documento", "Dinheiro / cartão", "Carregador", "Disposição"],
    contatos: [
      // { nome: "Lucas (organiza)", tel: "5511999999999" },
    ],
    avisoResponsa: "Bebe com responsabilidade. Tem água e comida. Ninguém dirige bêbado — chama o Uber.",
  },

  // ---- Participantes (seed; também entram sozinhos pela sala) ----
  participantes: ["Matheus", "Lucas"],

  // ---- Firebase ----
  //  Cole aqui as credenciais do seu projeto (Console > Config do projeto > SDK web).
  //  ENQUANTO 'databaseURL' estiver vazio, o app roda em MODO LOCAL
  //  (1 aparelho ou abas do mesmo PC) — bom pra testar a UI sem Firebase.
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
