const DEFAULTS = [
  { id: 1, name: "LULA",   color: "#d92d3c", votes: 0, photo: "Lula-web.jpg",   emoji: "🧑‍🦳", icon: "rose" },
  { id: 2, name: "FLÁVIO", color: "#1f6fe0", votes: 0, photo: "Flávio.jpg", emoji: "🕴️", icon: "roseWhite" },
  { id: 3, name: "RENAN",  color: "#f07a1e", votes: 0, photo: "Renan-web.jpg",  emoji: "🧔", icon: "gift" },
  { id: 4, name: "MARÇAL", color: "#7c3aed", votes: 0, photo: "Marçal.jpg",     emoji: "🧑‍💼", icon: "crown" }
];
const KEY = "politica-live-v5";

let candidates = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw) && raw.length === DEFAULTS.length) {
      return DEFAULTS.map((d, i) => ({ ...d, ...raw[i] }));
    }
  } catch (e) {}
  return structuredClone(DEFAULTS);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(candidates)); } catch (e) {}
}

const $ = (s) => document.querySelector(s);
const cardsEl = $("#cards");

/* ---------- render ---------- */
function build() {
  cardsEl.innerHTML = "";
  candidates.forEach((c, i) => {
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--c", c.color);
    card.dataset.index = i;
    card.innerHTML = `
      <div class="tag right" data-role="rank">–</div>
      <div class="photo">
        ${c.photo
          ? `<img src="${src(c.photo)}" alt="${c.name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'${c.emoji}'}))">`
          : `<div class="placeholder">${c.emoji}</div>`}
      </div>
      <div class="info">
        <div class="counter">
          <button class="step" data-act="dec" title="Remover 1 voto">−</button>
          <span class="icon">${ICONS[c.icon] || ""}</span>
          <input class="num" type="number" min="0" value="${c.votes}" data-role="num" title="Clique para digitar">
          <button class="step" data-act="inc" title="Adicionar 1 voto">+</button>
        </div>
        <div class="name">${c.name}</div>
        <div class="pct" data-role="pct">0%</div>
        <div class="pct-label">DOS VOTOS</div>
        <div class="bar"><span data-role="bar"></span></div>
      </div>`;
    cardsEl.appendChild(card);
  });
  paint();
}

function paint() {
  const total = candidates.reduce((s, c) => s + c.votes, 0);
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const max = sorted[0] ? sorted[0].votes : 0;

  [...cardsEl.children].forEach((card, i) => {
    const c = candidates[i];
    const pct = total ? (c.votes / total) * 100 : 0;
    const shown = Number.isInteger(pct) ? pct : Math.round(pct * 10) / 10;

    card.querySelector('[data-role="pct"]').textContent = shown + "%";
    card.querySelector('[data-role="bar"]').style.width = pct + "%";
    const input = card.querySelector('[data-role="num"]');
    if (document.activeElement !== input) input.value = pad(c.votes);

    const pos = sorted.findIndex((s) => s.id === c.id) + 1;
    card.querySelector('[data-role="rank"]').textContent = total ? `🏆 ${pos}º` : "–";
    card.classList.toggle("leader", total > 0 && c.votes === max);
  });

  $("#total").textContent = total;
  save();
}

const pad = (n) => String(n).padStart(4, "0");

// arquivos locais com acento precisam ser codificados na URL
const src = (p) => (p.startsWith("data:") ? p : encodeURI(p));

/* ---------- interações ---------- */
cardsEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const i = +card.dataset.index;
  const step = e.target.closest(".step");

  if (step) {
    candidates[i].votes = Math.max(0, candidates[i].votes + (step.dataset.act === "inc" ? 1 : -1));
  } else if (e.target.closest('[data-role="num"]')) {
    return; // clicou no campo: deixa digitar
  } else {
    candidates[i].votes += 1; // clique no card = +1
  }
  card.classList.remove("bump");
  void card.offsetWidth;
  card.classList.add("bump");
  paint();
});

cardsEl.addEventListener("focusin", (e) => {
  if (e.target.matches('[data-role="num"]')) {
    e.target.value = candidates[+e.target.closest(".card").dataset.index].votes;
    e.target.select();
  }
});

cardsEl.addEventListener("input", (e) => {
  if (!e.target.matches('[data-role="num"]')) return;
  const i = +e.target.closest(".card").dataset.index;
  candidates[i].votes = Math.max(0, parseInt(e.target.value, 10) || 0);
  paint();
});

cardsEl.addEventListener("focusout", (e) => {
  if (e.target.matches('[data-role="num"]')) paint();
});

cardsEl.addEventListener("keydown", (e) => {
  if (e.target.matches('[data-role="num"]') && e.key === "Enter") e.target.blur();
});

/* ---------- zerar (tecla R) ---------- */
function resetVotes() {
  if (!confirm("Zerar todos os votos?")) return;
  candidates.forEach((c) => (c.votes = 0));
  paint();
}

/* ---------- finalizar ---------- */
$("#btn-finish").addEventListener("click", () => {
  const total = candidates.reduce((s, c) => s + c.votes, 0);
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const body = $("#result-body");

  if (!total) {
    body.innerHTML = `<p style="color:#8d97b0">Nenhum voto registrado ainda.</p>`;
  } else {
    body.innerHTML = sorted.map((c, i) => {
      const pct = (c.votes / total) * 100;
      const shown = Number.isInteger(pct) ? pct : Math.round(pct * 10) / 10;
      return `<div class="res-row ${i === 0 ? "win" : ""}" style="--c:${c.color}">
        <div class="pos">${i + 1}º</div>
        <div class="rn">${c.name}</div>
        <div class="rv">${c.votes} · ${shown}%</div>
      </div>`;
    }).join("") + `<p style="margin-top:14px;color:#8d97b0;font-size:13px">Total de votos: <strong style="color:#f5b942">${total}</strong></p>`;
  }
  $("#modal-result").hidden = false;
});
$("#btn-close-result").addEventListener("click", () => ($("#modal-result").hidden = true));

/* ---------- edição ---------- */
function openEdit() {
  $("#edit-body").innerHTML = candidates.map((c, i) => `
    <div class="edit-item">
      <img class="edit-thumb" data-thumb="${i}" src="${c.photo ? src(c.photo) : transparent()}" alt="">
      <div class="edit-fields">
        <input type="text" data-name="${i}" value="${c.name}" placeholder="Nome">
        <input type="color" data-color="${i}" value="${c.color}" style="width:48px;height:28px;background:none;border:none;cursor:pointer">
        <input type="file" accept="image/*" data-file="${i}">
      </div>
    </div>`).join("");
  $("#modal-edit").hidden = false;
}

$("#edit-body").addEventListener("change", (e) => {
  const fi = e.target.dataset.file;
  if (fi === undefined || !e.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = () => {
    candidates[+fi].photo = reader.result;
    document.querySelector(`[data-thumb="${fi}"]`).src = reader.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

$("#btn-save-edit").addEventListener("click", () => {
  candidates.forEach((c, i) => {
    const n = document.querySelector(`[data-name="${i}"]`).value.trim();
    if (n) c.name = n;
    c.color = document.querySelector(`[data-color="${i}"]`).value;
  });
  $("#modal-edit").hidden = true;
  build();
});
$("#btn-cancel-edit").addEventListener("click", () => {
  candidates = load();
  $("#modal-edit").hidden = true;
  build();
});

function transparent() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54"><rect width="54" height="54" fill="#222a3a"/></svg>'
  );
}

/* ---------- atalhos: teclas 1, 2, 3 ---------- */
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input")) return;
  if (e.key === "r" || e.key === "R") return resetVotes();
  if (e.key === "e" || e.key === "E") return openEdit();
  const i = ["1", "2", "3", "4"].indexOf(e.key);
  if (i === -1) return;
  candidates[i].votes += 1;
  const card = cardsEl.children[i];
  card.classList.remove("bump"); void card.offsetWidth; card.classList.add("bump");
  paint();
});

build();
