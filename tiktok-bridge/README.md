# Política Live — ponte com o TikTok LIVE

Escuta os presentes da sua live no TikTok e manda, em tempo real, um aviso
para o site do placar (`politica-live`) somar votos automaticamente no
candidato certo.

**Importante:** isso usa a biblioteca `tiktok-live-connector`, um projeto
de engenharia reversa (não é uma API oficial do TikTok). Ela depende de um
serviço externo de terceiros (Euler Stream) para funcionar, tem limites de
uso na versão gratuita, e pode parar de funcionar se o TikTok mudar algo no
protocolo, sem aviso prévio. Funciona hoje, mas não é 100% garantido para
sempre.

> **Nota:** não ligue a opção `enableExtendedGiftInfo` no `server.js`. Ela
> faz uma chamada extra ("buscar lista de presentes da sala") que a Euler
> Stream cobra no plano Business ($50/mês) — foi o que quebrou a primeira
> tentativa. O nome do presente já vem de graça no evento normal
> (`data.giftDetails.giftName`), sem precisar dessa opção.

## 1. Publicar no Render (gratuito)

1. Entre em [render.com](https://render.com) e crie uma conta (dá para usar
   login do GitHub).
2. **New +** → **Web Service**.
3. Conecte o repositório `politica-live` no GitHub.
4. Em **Root Directory**, coloque `tiktok-bridge` (é a pasta deste arquivo).
5. **Runtime**: Node. **Build Command**: `npm install`. **Start Command**:
   `npm start`.
6. Em **Environment**, adicione as variáveis:
   - `TIKTOK_USERNAME` → seu usuário do TikTok, **sem o @** (ex: `politicalive`)
   - `SIGN_API_KEY` → opcional; deixe em branco para começar. Se o serviço
     gratuito da Euler Stream começar a recusar conexão por excesso de uso,
     crie uma chave em [eulerstream.com](https://www.eulerstream.com) e
     cole aqui.
7. Plano **Free** e **Create Web Service**.

Depois do deploy, o Render te dá uma URL tipo
`https://politica-live-bridge.onrender.com`. O WebSocket dela é a mesma
URL trocando `https://` por `wss://`.

## 2. Ligar o site nela

Abra `app.js` na raiz do projeto (não esta pasta) e troque:

```js
const BRIDGE_URL = "";
```

por:

```js
const BRIDGE_URL = "wss://politica-live-bridge.onrender.com";
```

(usando a URL real que o Render te deu). Suba essa mudança pro GitHub —
o Vercel republica o site sozinho.

## 3. Calibrar os nomes dos presentes

Os nomes de presente em `GIFT_MAP`, dentro de `server.js`, são um palpite.
O nome real que chega pode vir diferente (em inglês, com maiúscula, etc).

Para descobrir o nome certo:

1. Comece uma live de teste no TikTok.
2. Olhe os **logs** do serviço no painel do Render (aba **Logs**).
3. Peça para alguém (ou você mesmo, de outra conta) mandar cada presente.
4. O log mostra uma linha assim para cada um:
   ```
   [tiktok] presente recebido: "Rose" x1 de @fulano
   [tiktok] "Rose" não está mapeado em GIFT_MAP — ajuste server.js
   ```
5. Copie o nome exato (aqui, `"Rose"`) e adicione/corrija a chave em
   `GIFT_MAP` no `server.js`, em minúsculas:
   ```js
   "rose": { id: 1, amount: 1 },
   ```
6. Salve, suba pro GitHub — o Render redeploya sozinho.

O `id` de cada entrada precisa bater com o `id` do candidato em `app.js`
(1=Lula, 2=Flávio, 3=Renan, 4=Cury, 5=Marçal, 6=Caiado).

## 4. Manter o servidor sempre acordado

O plano gratuito do Render "dorme" o serviço depois de ~15 minutos sem
receber requisição, e demora uns segundos para acordar. Se isso acontecer
durante uma live, o app perde a conexão com o TikTok até o serviço acordar
de novo.

Para evitar isso, configure um serviço gratuito de ping (ex:
[UptimeRobot](https://uptimerobot.com)) para acessar a URL do seu serviço
a cada 5 minutos — assim ele nunca dorme durante o dia. Ainda assim, é
prudente abrir o painel do Render um pouco antes de cada live e conferir
nos Logs se ele está conectado (`[tiktok] conectado à live de @...`).

## 5. Rodando local (para testar antes de publicar)

```bash
cd tiktok-bridge
npm install
TIKTOK_USERNAME=seu_usuario npm start
```

No Windows (PowerShell):

```powershell
cd tiktok-bridge
npm install
$env:TIKTOK_USERNAME="seu_usuario"; npm start
```

A live precisa estar ao vivo nesse momento, senão a conexão falha.
