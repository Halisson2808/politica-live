/*
 * Política Live — ponte com o TikTok LIVE
 * -----------------------------------------
 * Escuta os presentes da sua live no TikTok e avisa, em tempo real,
 * o site do placar (via WebSocket) qual candidato deve ganhar votos.
 *
 * Variáveis de ambiente (configure no Render, aba Environment):
 *   TIKTOK_USERNAME  - seu @usuario do TikTok, sem o @ (obrigatório)
 *   SIGN_API_KEY     - chave da Euler Stream, opcional mas recomendada
 *                       (aumenta o limite de conexões simultâneas do
 *                       serviço de assinatura que a biblioteca usa)
 *
 * DESLIGADO TEMPORARIAMENTE: veja TIKTOK_ENABLED logo abaixo. O servidor
 * continua no ar (o site consegue conectar nele normalmente), só a parte
 * que tenta falar com o TikTok está pausada. Mude para "true" para
 * reativar — nada mais precisa ser alterado.
 */

import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";
import { WebSocketServer } from "ws";
import http from "http";

const TIKTOK_ENABLED = false;

const USERNAME = process.env.TIKTOK_USERNAME;
const SIGN_API_KEY = process.env.SIGN_API_KEY || undefined;
const PORT = process.env.PORT || 8080;

if (TIKTOK_ENABLED && !USERNAME) {
  console.error("Defina a variável de ambiente TIKTOK_USERNAME (seu @ do TikTok, sem o @).");
  process.exit(1);
}

/*
 * Mapa presente do TikTok -> candidato do placar.
 * A CHAVE precisa bater com o nome exato do presente, em minúsculas,
 * sem acento. Os valores abaixo são um PALPITE inicial baseado nos
 * arquivos já usados no site — confirme rodando uma live de teste:
 * o servidor imprime no log o nome exato de cada presente recebido,
 * então é só ajustar a chave aqui para o nome real.
 *
 * id deve bater com o "id" de cada candidato em app.js.
 */
const GIFT_MAP = {
  "rosa": { id: 1, amount: 1 },          // Lula
  "rose": { id: 1, amount: 1 },
  "rosa branca": { id: 2, amount: 1 },   // Flávio
  "white rose": { id: 2, amount: 1 },
  "tiktok": { id: 3, amount: 1 },        // Renan
  "gg": { id: 4, amount: 1 },            // Cury
  "sorvete": { id: 5, amount: 1 },       // Marçal
  "ice cream cone": { id: 5, amount: 1 },
  "brilhante": { id: 6, amount: 1 },     // Caiado
  "diamante": { id: 6, amount: 1 }
};

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .trim();
}

/* ---------- servidor HTTP (health check) + WebSocket ---------- */
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Política Live bridge no ar.\n");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  console.log(`[bridge] placar conectado (${wss.clients.size} conectado(s))`);
  socket.on("close", () => {
    console.log(`[bridge] placar desconectado (${wss.clients.size} restante(s))`);
  });
});

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((c) => {
    if (c.readyState === c.OPEN) c.send(payload);
  });
}

httpServer.listen(PORT, () => {
  console.log(`[bridge] servidor ouvindo na porta ${PORT}`);
});

/* ---------- conexão com o TikTok LIVE ---------- */
let reconnectTimer = null;

// evita empilhar várias tentativas quando mais de um evento (DISCONNECTED,
// STREAM_END, erro de connect()) dispara ao mesmo tempo para a mesma queda
function scheduleReconnect(delay) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTikTok();
  }, delay);
}

function connectTikTok() {
  const connection = new TikTokLiveConnection(USERNAME, {
    signApiKey: SIGN_API_KEY
    // enableExtendedGiftInfo removido: essa opção faz uma chamada extra
    // ("buscar lista de presentes da sala") que a Euler Stream cobra no
    // plano Business. O nome do presente já vem de graça em
    // data.giftDetails.giftName no evento normal, sem precisar disso.
  });

  connection.connect()
    .then((state) => console.log(`[tiktok] conectado à live de @${USERNAME} (roomId ${state.roomId})`))
    .catch((err) => {
      console.error("[tiktok] falha ao conectar:", err?.message || err);
      console.log("[tiktok] tentando de novo em 15s...");
      scheduleReconnect(15000);
    });

  connection.on(WebcastEvent.GIFT, (data) => {
    const giftType = data.giftDetails?.giftType;
    const isStreakable = giftType === 1;
    if (isStreakable && !data.repeatEnd) return; // presente ainda sendo enviado em sequência

    const rawName = data.giftDetails?.giftName ?? "";
    const key = normalize(rawName);
    const amount = data.repeatCount || 1;

    console.log(`[tiktok] presente recebido: "${rawName}" (giftId ${data.giftId}) x${amount} de @${data.user?.uniqueId || "?"}`);

    const alvo = GIFT_MAP[key];
    if (!alvo) {
      console.log(`[tiktok] "${rawName}" (giftId ${data.giftId}) não está mapeado em GIFT_MAP — ajuste server.js`);
      return;
    }

    broadcast({ type: "vote", id: alvo.id, amount: alvo.amount * amount });
    console.log(`[bridge] +${alvo.amount * amount} voto(s) para candidato id ${alvo.id}`);
  });

  connection.on(WebcastEvent.DISCONNECTED, () => {
    console.log("[tiktok] desconectado da live, tentando reconectar em 10s...");
    scheduleReconnect(10000);
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    console.log("[tiktok] a live terminou, voltando a procurar em 10s...");
    scheduleReconnect(10000);
  });

  connection.on(WebcastEvent.ERROR, (err) => {
    console.error("[tiktok] erro:", err?.message || err);
  });
}

if (TIKTOK_ENABLED) {
  connectTikTok();
} else {
  console.log("[tiktok] conexão desligada (TIKTOK_ENABLED = false) — servidor no ar só para o placar se conectar.");
}
