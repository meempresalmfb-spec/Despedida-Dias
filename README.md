# 🥃 App Despedida do Matheus

App web pra usar na despedida de solteiro do **Matheus Dias**. Dois modos numa mesma sala:

- **Moderador** (tablet, com PIN) — sorteia duelos, vê perguntas+gabarito, dispara o "JÁ!", arbitra, edita custos.
- **Convidado** (celular de cada um) — entra na sala, pega o buzzer, vê doses, custos e local.

Site estático (HTML/CSS/JS vanilla) + **Firebase Realtime Database** pro tempo real. Hospeda no GitHub Pages.

---

## ▶️ Como rodar e testar localmente

O app usa `<script>` clássicos, então abrir o `index.html` direto já funciona **no modo local** (1 aparelho / abas do mesmo PC). Mas o jeito recomendado é servir por um servidor estático:

```powershell
# qualquer um destes, dentro da pasta do projeto:
npx serve .
#  ou
python -m http.server 8000
```

Aí abre `http://localhost:8000`. Pra simular **2 jogadores + moderador**, abra a mesma URL em **3 abas/janelas** (ou anônima): uma como Moderador, duas como Convidado. No **modo local** as abas conversam entre si pelo navegador (BroadcastChannel) — dá pra testar o fluxo inteiro do duelo **sem Firebase**.

> Em celulares de verdade (cada um numa rede), o sync **só funciona com Firebase configurado** (passo abaixo).

---

## 🔥 Configurar o Firebase (pra valer em vários celulares)

1. Crie um projeto em <https://console.firebase.google.com> → **Realtime Database** → criar banco (modo de teste pra começar).
2. Em **Configurações do projeto → Seus apps → Web**, copie o objeto `firebaseConfig`.
3. Cole os campos em **`js/config.js`**, no bloco `firebase: { ... }` (precisa pelo menos `apiKey` e `databaseURL`).
4. **Regras** do Realtime Database (Database → Regras). Pra uma festa, regra simples por sala:

```json
{
  "rules": {
    "salas": {
      "$codigo": { ".read": true, ".write": true }
    }
  }
}
```

> ⚠️ Isso deixa a sala aberta pra leitura/escrita — ok pra uma festa privada com código não-óbvio. Não guarde nada sensível aqui. Pra endurecer depois, dá pra exigir auth anônima.

Com `databaseURL` preenchido, o app entra sozinho em **modo Firebase** (multi-celular). Vazio = modo local.

---

## ⚙️ O que editar (só `js/config.js`)

- **evento** — nome, noivo, data/horário, foto (`assets/matheus.jpg`).
- **sala.codigo** — código da festa (todos entram nele). **sala.pinModerador** — 4 dígitos.
- **custos** — chave PIX, recebedor, se o Matheus entra no rateio.
- **local** — endereço, links Maps/Waze, embed do mapa, cronograma, checklist, contatos.
- **participantes** — sugestões de nome na entrada.
- **firebase** — credenciais.

As **perguntas do duelo** ficam em **`js/data/perguntas.js`** (`{ cat, q, r }`). O arquivo atual é só um placeholder — troque pelas suas.

> 🔓 Nota de segurança: como é site estático, `config.js` vai pro navegador — o PIN é um **portão casual** (evita o convidado curioso abrir o painel), não segurança de verdade. A `apiKey` do Firebase web é pública por design; quem protege é a regra do banco.

---

## 🚀 Deploy no GitHub Pages

1. Suba o repositório no GitHub.
2. **Settings → Pages → Source: Deploy from a branch → `main` / root.**
3. A URL sai tipo `https://SEU_USUARIO.github.io/REPO/`. Compartilhe (ou gere um QR dela) pros convidados.

---

## 🗂️ Estrutura

```
index.html            casca + telas
css/styles.css        design system (bar premium / âmbar)
js/config.js          ÚNICO arquivo de edição manual
js/sala.js            tempo real (adapter Firebase + adapter Local)
js/app.js             boot, papéis, telas, placar de doses
js/duelo.js           buzzer: JÁ! + reação + queima + arbitragem
js/custos.js          lista aberta, rateio, pago=verde, PIX, comprovante
js/local.js           endereço, maps, cronograma, checklist
js/data/perguntas.js  banco de perguntas (você troca)
assets/matheus.jpg    avatar do header
```

## 🎮 Fluxo do duelo (resumo)

Moderador **sorteia o duelo** (2 convidados) → **sorteia a pergunta** → lê em voz alta → **Preparar** dispara o **"JÁ!"** depois de um atraso aleatório → cada celular mede o **próprio** tempo de reação (justo mesmo com internet ruim) → quem aperta primeiro (válido) responde → moderador marca **Acertou** (o outro bebe) ou **Errou** (quem respondeu bebe). Apertar antes do JÁ = **queima de largada**.
