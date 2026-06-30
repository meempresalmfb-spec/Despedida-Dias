// ============================================================
//  BANCO DE PERGUNTAS DO DUELO
//  Cada item: { cat, q, r }
//   cat = categoria · q = pergunta · r = resposta (gabarito, só o moderador vê)
//  Categorias: Conhece o Matheus? · Corinthians · Anapolina · Friends · Direito · Neymar · Gusttavo Lima
//  Sorteio é aleatório no banco inteiro — a categoria é só rótulo no gabarito.
// ============================================================
window.PERGUNTAS = [
  // ---- Conhece o Matheus? ----
  { cat: "Conhece o Matheus?", q: "Em que ano o Matheus começou a jogar tênis e quem o incentivou?", r: "2024 — o padrinho Ricardo" },
  { cat: "Conhece o Matheus?", q: "Em que ano o Matheus começou a torcer pela Anapolina?", r: "2004" },
  { cat: "Conhece o Matheus?", q: "Em que ano o Matheus foi reprovado no Agostiniano?", r: "2009" },
  { cat: "Conhece o Matheus?", q: "Quantas vezes o Matheus perguntava se já estava chegando, nas viagens de carro pra Angra?", r: "Entre 70 e 80 vezes" },
  { cat: "Conhece o Matheus?", q: "Qual esporte o Matheus prefere: futebol ou tênis?", r: "Futebol" },
  { cat: "Conhece o Matheus?", q: "Qual a série preferida do Matheus?", r: "Friends" },
  { cat: "Conhece o Matheus?", q: "Em que ano foi o primeiro jogo do Corinthians que o Matheus foi assistir?", r: "2017" },
  { cat: "Conhece o Matheus?", q: "Em que ano o Matheus capotou o carro comendo batatinha do McDonald's?", r: "2014" },
  { cat: "Conhece o Matheus?", q: "Qual joelho o Matheus rompeu o ligamento?", r: "O direito" },
  { cat: "Conhece o Matheus?", q: "Com quantos anos o Matheus deu o primeiro beijo?", r: "13 anos" },
  { cat: "Conhece o Matheus?", q: "Qual a música favorita do Matheus?", r: "Na Hora de Amar (Gusttavo Lima)" },
  { cat: "Conhece o Matheus?", q: "Qual o gênero de filme favorito do Matheus?", r: "Terror" },
  { cat: "Conhece o Matheus?", q: "Qual o escritor favorito do Matheus?", r: "Shakespeare" },

  // ---- Corinthians ----
  { cat: "Corinthians", q: "Em que ano o Corinthians foi fundado?", r: "1910" },
  { cat: "Corinthians", q: "Quantos Mundiais de Clubes (FIFA) o Timão tem e em quais anos?", r: "Dois — 2000 e 2012" },
  { cat: "Corinthians", q: "Quantos títulos paulistas o Corinthians tem?", r: "30" },
  { cat: "Corinthians", q: "Quantos títulos brasileiros o Corinthians tem?", r: "Sete (7)" },
  { cat: "Corinthians", q: "Em que ano veio o primeiro Brasileirão do Timão e contra quem foi a final?", r: "1990 — gol de Tupãzinho na final contra o São Paulo" },
  { cat: "Corinthians", q: "Em que ano o Corinthians ganhou sua única Libertadores e sobre quem?", r: "2012, invicto, sobre o Boca Juniors" },
  { cat: "Corinthians", q: "Qual foi a escalação titular do Corinthians na final do Mundial 2012 contra o Chelsea?", r: "Cássio; Alessandro, Chicão, Paulo André e Fábio Santos; Ralf e Paulinho; Jorge Henrique, Danilo e Emerson; Guerrero. Técnico: Tite" },

  // ---- Anapolina ----
  { cat: "Anapolina", q: "Em que ano a Anapolina foi fundada?", r: "1948" },
  { cat: "Anapolina", q: "Em que ano a Anapolina goleou o Grêmio por 4 a 0 em Anápolis (Série B)?", r: "2005" },
  { cat: "Anapolina", q: "Em 1981, a Anapolina foi campeã goiana dentro de campo, mas perdeu o título como?", r: "No tapetão — revertido na Justiça por escalação irregular; o título foi pro Goiás" },
  { cat: "Anapolina", q: "Qual o nome da torcida organizada da Anapolina?", r: "Torcida Organizada Rubra (a TOR)" },
  { cat: "Anapolina", q: "Em que ano a Anapolina goleou o rival Anápolis por 6 a 0?", r: "2004" },

  // ---- Friends ----
  { cat: "Friends", q: "Em que cafeteria a turma sempre se encontra?", r: "Central Perk" },
  { cat: "Friends", q: "Quantas temporadas tem a série?", r: "10" },

  // ---- Direito ----
  { cat: "Direito", q: "Qual o prazo para apresentar contestação no procedimento comum (CPC/2015)?", r: "15 dias úteis" },
  { cat: "Direito", q: "O que de fato transfere a propriedade de um imóvel: o contrato/escritura ou o registro?", r: "O registro do título no Cartório de Registro de Imóveis (art. 1.245 do CC) — só a escritura não basta" },
  { cat: "Direito", q: "No CPC/2015, os prazos processuais são contados em dias corridos ou em dias úteis?", r: "Em dias úteis" },

  // ---- Neymar ----
  { cat: "Neymar", q: "Quais clubes europeus o Neymar defendeu?", r: "Barcelona e Paris Saint-Germain" },
  { cat: "Neymar", q: "Quantos gols o Neymar tem em Copas do Mundo?", r: "8 (em 2014, 2018 e 2022)" },
  { cat: "Neymar", q: "Quantos gols o Neymar tem pela seleção brasileira?", r: "79" },
  { cat: "Neymar", q: "Contra qual time o Neymar marcou o gol que ganhou o Prêmio Puskás da FIFA?", r: "Flamengo (em 2011)" },

  // ---- Gusttavo Lima ----
  { cat: "Gusttavo Lima", q: "Qual o nome verdadeiro do Gusttavo Lima?", r: "Nivaldo Batista Lima" },
  { cat: "Gusttavo Lima", q: "Qual hit do Gusttavo Lima de 2018 ganhou Disco de Diamante Duplo e foi nº 1 no Brasil?", r: "Apelido Carinhoso" },
  { cat: "Gusttavo Lima", q: "Em que cidade o Gusttavo Lima nasceu?", r: "Presidente Olegário (MG)" },
  { cat: "Gusttavo Lima", q: "Quantos filhos o Gusttavo Lima tem?", r: "Dois: Gabriel e Samuel" },
];
