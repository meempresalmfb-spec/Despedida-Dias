# ORDEM DE TRABALHO — App Despedida de Solteiro do Matheus Dias

> Documento de especificação para o Claude Code executar.
> Product Owner: Lucas · Executor: Claude Code.
> Princípio: MVP primeiro, uma fase por vez, nada de escopo infinito.
> **Versão 2** — arquitetura multi-device (sala + papéis) definida.

---

## 0. Objetivo

App web para usar na despedida de solteiro do **Matheus Dias**, com **dois modos**:

- **Moderador** (1 tablet) — painel de controle: sorteia, vê perguntas/gabarito, dispara o buzzer, arbitra.
- **Convidado** (celular de cada um) — entra na sala, vê o botão de buzzer, custos e local.

Hospedável no GitHub Pages. Os aparelhos se conectam numa **sala** via Firebase. Estética masculina, "bar/clube premium", zoeira de despedida — nada infantil.

---

## 1. Stack e princípios técnicos

- **HTML/CSS/JS vanilla** (ou Vite vanilla). Resultado estático, GitHub Pages.
- **Tempo real / sala:** **Firebase Realtime Database** (tier free). É só o client SDK — continua site estático.
- **Persistência:**
  - **Firebase** → estado da sala: jogadores conectados, liberação do buzzer, tempos de reação, placar de doses, e (se escolhido) custos compartilhados.
  - `localStorage` → preferências locais do aparelho (nome escolhido, modo, config do organizador).
  - `IndexedDB` → comprovantes de pagamento (imagens). Nunca em localStorage.
- **Mobile-first.** Botões enormes (dedo de gente bêbada).
- **Funciona offline** para: Eu Nunca, Roda da Punição, Local. O **buzzer e o sync de custos exigem internet**.
- **Config única** (`config.js`) editável à mão: dados da festa, chave PIX, lista de participantes, credenciais Firebase.
- **Botão "Resetar sala"** (limpa o estado no Firebase) + **"Resetar local"**.

---

## 2. DECISÕES DO LUCAS

### 2.1 Buzzer — RESOLVIDO ✅
**Multi-device, critério "menor tempo de reação".** Cada celular cronometra do próprio "JÁ!" até o próprio toque e mostra o tempo. O menor vence. A latência de rede não afeta a lisura porque cada jogador é medido contra a própria largada (vira teste de reflexo, não corrida absoluta). Algoritmo no §4.2.

### 2.2 Custos — RESOLVIDO ✅
**Lista aberta compartilhada (Firebase), sem login.** Todos veem a lista inteira: nome · quanto cabe a cada um · status. Quem pagou fica **verde** no nome. Só o **organizador** marca pago / edita despesas. Convidado só visualiza.

### 2.3 Pendentes
- **Internet na festa garantida?** (o buzzer depende disso) → *assumindo que sim; se o local não tiver sinal, buzzer cai pro plano B (1 aparelho).*
- **Matheus entra no rateio?** → *padrão: não.*
- **PIN do moderador** pra ninguém abrir o painel e ver as respostas? → *padrão: sim, 4 dígitos.*

---

## 3. Design System

Vibe: **noite, bar premium, masculino, whisky.** Escuro com destaque âmbar/dourado.

- **Paleta:** fundo `#0E0E10` / cards `#1A1A1E` / texto `#F2EFE6` / destaque âmbar `#D4A017` / punição `#D43A2F` / pago `#3FA34D`.
- **Tipografia:** títulos display pesados (**Anton** / **Bebas Neue** / **Archivo Black**); corpo **Inter** / **Manrope**.
- **Componentes:** cards arredondados, microanimações, transições de aba, botões gigantes.
- **Header:** nome do evento + avatar do Matheus + contador regressivo (opcional).
- O **modo Convidado** e o **modo Moderador** têm cores de borda/acento distintas pra não confundir quem tá com o quê.

> Claude Code: consultar a skill `frontend-design` antes da UI.

---

## 4. Sala e Papéis

### Entrada do app
Tela inicial: **"Sou Moderador"** (pede PIN) ou **"Sou Convidado"**.

- **Convidado:** digita/escolhe o nome → entra na sala (código fixo da festa em `config.js`, ou QR pra entrar). Aparece na lista do moderador como "conectado".
- **Moderador:** PIN → painel completo.

### O que cada um vê
| Recurso | Moderador | Convidado |
|---|---|---|
| Sortear duelo | ✅ | — |
| Perguntas + gabarito | ✅ | — |
| Disparar "JÁ!" / arbitrar | ✅ | — |
| Botão de buzzer | (vê os tempos) | ✅ |
| Placar de doses | ✅ (edita) | ✅ (vê) |
| Custos & Pagamentos | ✅ (edita) | ✅ (vê)* |
| Local | ✅ | ✅ |
| Eu Nunca / Roda da Punição | ✅ | ✅ |

\* depende da decisão §2.2.

---

## 5. Módulo DUELO (buzzer) — núcleo

### 5.1 Fluxo
1. Moderador clica **Sortear duelo** → 2 convidados conectados são escolhidos (sem repetir até todos jogarem; toggle pra desligar). Mostra "A vs B".
2. Moderador lê a pergunta (banco no painel, categorias no §8) ou usa pergunta livre.
3. Moderador clica **Preparar** → após **atraso aleatório (1,5–4s)** o sistema emite o evento **"JÁ!"** pra sala. Só os 2 duelistas têm o buzzer habilitado.
4. Cada celular duelista: ao **renderizar** o "JÁ!", marca `t0`. Ao tocar, marca `t1`. `reacao = t1 - t0`. Trava e **mostra o tempo** (ex: `0,312s`). Envia ao Firebase.
   - **Queima de largada:** tocou antes do "JÁ!" local → marca queima (penalidade: ele bebe / o outro responde).
5. Painel do moderador mostra os tempos lado a lado e quem foi mais rápido. Moderador abre o **gabarito**.
6. Moderador marca **Acertou** (→ o outro bebe) ou **Errou** (→ quem respondeu bebe). Placar de doses atualiza.
7. **Próximo duelo.**

### 5.2 Lisura — detalhe de implementação (importante)
- `t0` deve ser marcado no **frame de pintura** do "JÁ!" (usar `requestAnimationFrame`), não no recebimento do evento de rede. Assim, mede reflexo puro mesmo em celular fraco.
- Comparar `reacao` é justo entre aparelhos diferentes porque cada um usa o próprio `t0`. **Não** comparar timestamps absolutos entre celulares.
- O envio do resultado ao Firebase pode atrasar — não afeta nada, é só exibição.

### 5.3 Variantes (futuro)
- Modo "todos contra todos": habilita o buzzer pra todos os conectados, ranking geral de reação.

### 5.4 Banco de perguntas
Categorias filtráveis, editáveis em arquivo de dados: **Geral, Boteco, Esporte, Conhece o Matheus?, Picante.** Seed no §8.

---

## 6. Módulo GINCANA (offline, em cada aparelho)

Launcher com cards. Conteúdo editável.

**Fase 1:**
- **Eu Nunca** — deck "Eu nunca...", avança no tap, quem já fez bebe.
- **Roda da Punição** — roleta animada que sorteia dose/mico.

**Fase 2:**
- **Missões do Noivo** — checklist gamificado de provas pro Matheus, com pontos e barra de progresso da noite.
- **Quem é mais provável de...** — frase + contagem "3,2,1", galera aponta, moderador registra o apontado → ele bebe.

**Fase 3:** Verdade ou Desafio, Bingo da Despedida, Tribunal do Noivo.

---

## 7. Módulo CUSTOS & PAGAMENTOS — lista aberta

Tela única compartilhada (Firebase), visível pra todos, **sem login**. Editada só pelo organizador.

**Visão principal — a lista:**
- Cada linha: **nome do convidado · quanto ele deve · status**.
- **Pagou → nome fica verde** (✓). Não pagou → neutro/vermelho.
- Topo: **total da festa · arrecadado · falta**, com barra de progresso.

**Controles (só organizador):**
- **Despesas:** descrição, valor, categoria, quem rateia (total ou parcial entre alguns) → recalcula quanto cabe a cada um.
- **Marcar pago:** toca no nome → vira verde. (Só o organizador, pra ninguém se auto-declarar pago.)
- **Chave PIX** com botão "copiar" (+ QR opcional via lib `qrcode`).
- **Comprovante (opcional):** ao marcar pago, pode anexar o print do PIX (IndexedDB).

Convidado: **só visualiza** a lista e o próprio status.

---

## 8. Módulo LOCAL (offline)

- **Endereço** + botões **Google Maps** e **Waze**.
- **Mapa embed** (iframe — único ponto que exige internet).
- **Data, horário, cronograma** da noite.
- **Checklist "o que levar".**
- **Contatos úteis** (organizador, uber do grupo) com ligar/whats.
- **Rodapé responsa:** "bebe com responsabilidade, tem água e comida, ninguém dirige bêbado, chama o uber."

---

## 9. Modelo de dados

### Firebase (sala) — esboço
```
salas/{codigoFesta}/
  jogadores/{uid}: { nome, conectado, doses }
  duelo/
    atual: { aId, bId, estado: "preparando|liberado|fim", jaEm }
    tempos/{uid}: { reacao, queima:bool }
  custos/                       // lista aberta, organizador edita
    despesas/{id}: { desc, valor, categoria, participantes:[uid] }
    status/{uid}: { pago:bool, comprovanteRef? }   // pago=true → nome verde
  config: { evento, pix, ... }  // espelho read-only pros convidados
```

### Local (por aparelho)
```js
localStorage: { modo:"moderador|convidado", meuNome, pinOk, configOrganizador }
IndexedDB: { comprovantes: <blob> }   // ref por comprovanteRef
```

---

## 10. Fases de entrega

- **Fase 1 (MVP):** Sala + papéis + Duelo multi-device (com lisura do §5.2) + Custos + Local + Eu Nunca + Roda da Punição. Design aplicado.
- **Fase 2:** Missões do Noivo + Quem é mais provável + QR do PIX + polish.
- **Fase 3:** jogos restantes; modo "todos contra todos"; refinos.

Cada fase fecha com teste real em pelo menos 2 celulares + 1 tablet antes de seguir.

---

## 11. Critérios de aceite (Fase 1)

- [ ] Site estático no GitHub Pages.
- [ ] Tela de entrada com modos Moderador (PIN) / Convidado.
- [ ] Convidado entra na sala e aparece conectado no painel do moderador.
- [ ] Duelo: sorteio de 2, atraso aleatório, "JÁ!" sincronizado pela sala, cada celular mede e mostra o próprio tempo, queima de largada penalizada, moderador vê os tempos e arbitra, placar de doses sincronizado.
- [ ] Lisura conforme §5.2 (`t0` no frame de pintura; nada de comparar timestamp absoluto).
- [ ] Custos: lista aberta com rateio (total/parcial), quanto cada um deve, **nome verde quando pago** (só organizador marca), totais com barra, comprovante opcional em IndexedDB.
- [ ] Local com Maps/Waze/embed/cronograma/checklist.
- [ ] Eu Nunca e Roda da Punição offline, banco editável.
- [ ] Reset de sala e reset local funcionam.
- [ ] Design system do §3 aplicado.

---

## 12. Banco de conteúdo seed (expandir depois)

> Tom: zoeira de despedida de solteiro, humor adulto leve. Nada degradante.

**Duelo — Boteco:** ml de uma long neck (355); "a número 1" (zoeira); time com mais Brasileirões (Palmeiras).
**Duelo — Conhece o Matheus?** *(Lucas preenche)*: bebida favorita; onde conheceu a noiva; apelido no grupo.
**Eu Nunca...:** mandei msg pro ex de madrugada; fui barrado na balada; dormi no busão e passei do ponto; menti pra sair cedo do trampo; acordei sem lembrar como cheguei em casa.
**Roda da Punição:** vira o copo; dose dupla; escolhe alguém pra beber por você; conta um mico; 1 rodada sem celular; imita o Matheus; paga o próximo shot da galera.
**Missões do Noivo:** foto com desconhecido (10); pagar shot pro garçom (15); dançar 1 música sozinho (20); ligar pra noiva e cantar (25); convencer outra mesa a brindar (15).
**Quem é mais provável de...:** dormir primeiro; chamar a ex hoje; passar mal; sumir no meio da festa; chorar de emoção pelo noivo.

---

## 13. Notas pro Claude Code

- Resolver §2.2 (Lucas) antes de codar custos compartilhados.
- Criar o projeto Firebase e pôr a config em `config.js` (não commitar credenciais sensíveis sem necessidade — Realtime DB com regras de leitura/escrita básicas por sala).
- Uma fase por vez; testar em 2 celulares + tablet antes de avançar.
- Mostrar estrutura/diff antes de mudanças grandes.
- Bancos de conteúdo em arquivo de dados separado do código.
