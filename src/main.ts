import { uiIcon } from "./ui-icons";
import { loadArtwork } from "./art";
import type { Member } from "./world";
import "./style.css";
import {
  initial,
  sectors,
  buyers,
  WORLD,
  DELIVERY_MS,
  points,
  labels,
  buy,
  sell,
  type State,
  type Item,
  type Action,
} from "../shared/game";
import { startWorld, scene, stick, setPaused } from "./world";
import type Phaser from "phaser";
const app = document.querySelector<HTMLDivElement>("#app")!;
let account: { id: string; nickname: string; guest?: boolean } | null = null,
  state: State | null = null,
  game: Phaser.Game | undefined,
  busy = false,
  dirty = false,
  pos = { x: 0, y: 0 };
let context = "Explorar";
const uuid = () =>
  crypto.randomUUID?.() ||
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  );
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const missions = [
  ["explorar", "Conhecer a propriedade"],
  ["familia", "Conversar com a família"],
  ["colher", "Recolher a primeira produção"],
  ["entrega", "Entregar uma carga dentro do prazo"],
  ["feira", "Visitar a feira"],
  ["vender", "Realizar a primeira venda"],
  ["comprar", "Comprar suprimentos"],
  ["cuidar", "Cuidar da água e da alimentação"],
  ["tressetores", "Recolher nos três setores"],
  ["investir", "Investir no futuro"],
];
async function api(path: string, body?: unknown) {
  const res = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw Object.assign(Error(data.error || "Falha na conexão."), {
      status: res.status,
    });
  return data;
}
function toast(msg: string) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 4200);
}
function on(id: string, fn: () => void) {
  document.getElementById(id)?.addEventListener("click", fn);
}
function shell(content: string) {
  app.innerHTML = `<header class="site"><div class="brand"><img src="/icon.svg" alt="">VALE DO CAJU FARM</div><nav><span>Pacajus, Ceará · Brasil</span><button id="about" class="ghost">Sobre o jogo ↗</button></nav></header>${content}`;
  on("about", about);
}
function landing() {
  void boot();
}
function auth(kind: "login" | "register" | "forgot" | "reset") {
  if (game) void api("family/leave", {}).catch(() => {});
  game?.destroy(true);
  game = undefined;
  closeModal();
  const register = kind === "register",
    forgot = kind === "forgot",
    reset = kind === "reset";
  shell(
    `<main class="auth"><button id="back" class="link">← Voltar ao sítio</button><div class="eyebrow">BEM-VINDO AO VALE</div><h1>${register ? "Sua história começa aqui" : forgot ? "Recupere seu acesso" : reset ? "Escolha uma nova senha" : "Bom ter você de volta."}</h1><p class="muted">${register ? "Vincule esta partida para continuar em outros aparelhos." : "Sua propriedade está esperando por você."}</p><form id="auth-form">${register ? '<label>Apelido<input name="nickname" required minlength="2" maxlength="30" autocomplete="nickname"></label>' : ""}${!reset ? '<label>E-mail<input name="email" type="email" required autocomplete="email" placeholder="voce@exemplo.com"></label>' : ""}${!forgot ? '<label>Senha<input id="password" name="password" type="password" required minlength="12" maxlength="128" autocomplete="' + (register || reset ? "new-password" : "current-password") + '" placeholder="Pelo menos 12 caracteres"></label><label class="check"><input type="checkbox" id="show-password"> Mostrar senha</label>' : ""}${register ? '<label>Confirme a senha<input name="confirm" type="password" required minlength="12" autocomplete="new-password"></label><label class="check"><input type="checkbox" required> Li as informações de uso e privacidade.</label><button type="button" id="privacy" class="link">Ler informações de uso e privacidade</button>' : ""}<div class="error" id="auth-error" role="alert"></div><button class="primary" type="submit">${register ? "Criar conta" : forgot ? "Enviar link" : reset ? "Salvar nova senha" : "Entrar e continuar"} →</button></form>${kind === "login" ? '<button id="forgot" class="link">Esqueci minha senha</button><p><small>Ainda não tem uma conta? <button id="signup" class="link">Criar conta</button></small></p>' : ""}</main>`,
  );
  on("back", landing);
  on("show-password", () => {
    const p = document.getElementById("password") as HTMLInputElement;
    p.type = p.type === "password" ? "text" : "password";
  });
  on("privacy", privacy);
  on("forgot", () => auth("forgot"));
  on("signup", () => auth("register"));
  document
    .getElementById("auth-form")!
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement,
        b = Object.fromEntries(new FormData(form));
      const error = document.getElementById("auth-error")!;
      error.textContent = "";
      if (register && b.password !== b.confirm) {
        error.textContent = "As senhas precisam ser iguais.";
        return;
      }
      const button = form.querySelector(
        "button[type=submit]",
      ) as HTMLButtonElement;
      button.disabled = true;
      try {
        if (forgot) {
          await api("forgot", b);
          toast("Se o e-mail estiver cadastrado, você receberá um link.");
          return;
        }
        if (reset) {
          await api("reset", {
            token: new URLSearchParams(location.search).get("reset"),
            password: b.password,
          });
          history.replaceState({}, "", "/");
          toast("Senha alterada. Entre novamente.");
          auth("login");
          return;
        }
        account = await api(register && account?.guest ? "claim" : kind, b);
        state = await api("save");
        if (!state)
          state = await api("new", {
            name: account!.nickname,
            skin: "terracota",
            mode: "historia",
          });
        await play();
      } catch (e: any) {
        error.textContent = e.message;
      } finally {
        button.disabled = false;
      }
    });
}
function modal(title: string, html: string, setup?: () => void) {
  document.querySelector(".overlay")?.remove();
  setPaused(true);
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${title}</h2><button id="close-modal" aria-label="Fechar">✕</button></div>${html}</section>`;
  document.body.append(overlay);
  on("close-modal", closeModal);
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      const nodes = Array.from(
        overlay.querySelectorAll<HTMLElement>("button,input,select,a[href]"),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  setup?.();
  document.getElementById("close-modal")?.focus();
}
function closeModal() {
  document.querySelector(".overlay")?.remove();
  setPaused(false);
}
function about() {
  modal(
    "Uma história que nasce da terra",
    `<p>Vale do Caju Farm é um jogo de agricultura familiar ambientado em uma comunidade fictícia da zona rural de Pacajus, Ceará, em 2027.</p><p>Explore o sítio, cuide da família, colha cajus e leve sua produção à feira. Suas escolhas conectam água, alimentação e economia.</p><p class="note">MVP em desenvolvimento para o Ceará Científico 2027. Os ciclos e preços são simplificações de jogo. Campanha até 2050, beneficiamento industrial e pesquisa com estudantes são etapas futuras.</p><button id="about-privacy" class="ghost full">Uso e privacidade</button>`,
    () => on("about-privacy", privacy),
  );
}
function privacy() {
  modal(
    "Uso e privacidade",
    `<p>O protótipo armazena apelido, e-mail, hash da senha, sessões e progresso para permitir acesso à sua partida em outros aparelhos. Senhas não são armazenadas em texto puro.</p><p>Durante a partida, os outros jogadores veem o nome do seu personagem, aparência, posição no sítio e atividade escolhida. E-mail, senha, mochila e saldo pessoal não são compartilhados. Não solicitamos nome completo, escola, CPF ou endereço. Não há publicidade, compras com dinheiro real ou coleta de indicadores de pesquisa nesta versão.</p><p>O ambiente de desenvolvimento é destinado a testes. Antes da publicação e de qualquer pesquisa com estudantes, a instituição responsável deverá definir base legal, consentimentos quando aplicáveis, prazo de retenção, canal de direitos e revisão ética e jurídica.</p><p class="note">Não use dados reais de estudantes nesta fase. Recuperação de senha depende da configuração do serviço de e-mail pelo responsável técnico.</p>`,
  );
}
async function profile() {
  if (game) api("family/leave", {}).catch(() => {});
  game?.destroy(true);
  game = undefined;
  closeModal();
  shell(
    `<main class="profile"><span class="eyebrow">SEU CANTINHO NO VALE</span><h1>Olá, ${esc(account!.nickname)}.</h1><section class="profile-card"><div class="avatar">♧</div><div><h2>${state ? "Sítio Boa Esperança" : "Uma terra cheia de possibilidades"}</h2><p>${state ? `${esc(state.name)} · ${state.mode === "historia" ? "Modo História" : "Modo Sobrevivência"}` : "Escolha seu personagem e comece sua história em Pacajus."}</p>${state ? `<div class="stats"><div><small>Dia do jogo</small><strong>${state.day}</strong></div><div><small>Dinheiro</small><strong>${money(state.money)}</strong></div><div><small>Missões</small><strong>${missions.filter(([id]) => state!.missions.includes(id)).length}/10</strong></div></div>` : ""}</div></section><div class="actions">${state ? '<button id="continue" class="primary">Continuar partida →</button>' : ""}<button id="new" class="${state ? "ghost" : "primary"}">${state ? "Novo jogo" : "Começar minha história →"}</button><button id="settings" class="ghost">Configurações</button><button id="logout" class="ghost">Sair da conta</button></div><small>Seu progresso é salvo na conta após cada ação. Para continuar em outro aparelho, entre com o mesmo e-mail.</small></main>`,
  );
  on("continue", play);
  on("new", () => {
    if (state)
      confirm(
        "Começar de novo?",
        "A partida atual será substituída. Essa ação não pode ser desfeita.",
        newGame,
      );
    else newGame();
  });
  on("logout", async () => {
    await api("logout", {});
    account = null;
    state = null;
    landing();
  });
  on("settings", settings);
}
function settings() {
  modal(
    "Configurações",
    `<p>Controles por toque sempre disponíveis. No computador, use as setas para andar, E para interagir e I para o inventário.</p><p>O modo de dificuldade é escolhido ao criar a partida. O MVP não contém áudio.</p><button id="fullscreen" class="primary full">Alternar tela cheia</button><p class="note">No iPhone, a disponibilidade de tela cheia depende do navegador. O jogo funciona sem ela.</p>`,
    () =>
      on("fullscreen", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else
          document.documentElement
            .requestFullscreen?.()
            .catch(() => toast("Tela cheia não disponível neste navegador."));
      }),
  );
}
function newGame() {
  modal(
    "Quem vai cultivar essa história?",
    `<form id="new-form"><label>Nome do personagem<input name="name" required minlength="2" maxlength="30" value="${esc(account!.nickname)}"></label><br><label>Cor da camisa<select name="skin"><option value="terracota">Terracota · cor da terra</option><option value="azul">Azul · céu do Ceará</option><option value="verde">Verde · cajueiral</option></select></label><br><label>Modo de jogo<select name="mode"><option value="historia">História · cuidado e descoberta</option><option value="sobrevivencia">Sobrevivência · recursos limitados e riscos</option></select></label><p><small>História permite recuperar a saúde da família sem mortes permanentes. Sobrevivência inclui morte não gráfica após privação prolongada.</small></p><button class="primary full">Começar no sítio →</button></form>`,
    () =>
      document
        .getElementById("new-form")!
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            state = await api(
              "new",
              Object.fromEntries(new FormData(e.target as HTMLFormElement)),
            );
            localStorage.removeItem("vale-pending-" + account!.id);
            closeModal();
            await play();
            setTimeout(
              () =>
                dialog(
                  "Mãe Rosa",
                  "Chegue, meu filho! Aqui todo mundo é da família. Seus irmãos podem cuidar do pomar, da horta ou do galinheiro. Dona Lúcia compra ovos logo ao lado. Escolha uma atividade no botão Família, visse?",
                ),
              500,
            );
          } catch (e: any) {
            toast(e.message);
          }
        }),
  );
}
function confirm(title: string, message: string, fn: () => void) {
  modal(
    title,
    `<p>${message}</p><div class="actions"><button id="confirm" class="primary">Confirmar</button><button id="cancel" class="ghost">Cancelar</button></div>`,
    () => {
      on("confirm", () => {
        closeModal();
        fn();
      });
      on("cancel", closeModal);
    },
  );
}
async function play() {
  closeModal();
  app.innerHTML =
    '<div class="loading"><img src="/icon.svg" width="64" style="margin:auto"><h2>Entrando no Vale…</h2><progress id="art-progress" max="1" value="0" aria-label="Carregando cenário e personagens"></progress></div>';
  try {
    await document.fonts.ready;
    await loadArtwork((p) => {
      const bar = document.getElementById(
        "art-progress",
      ) as HTMLProgressElement | null;
      if (bar) bar.value = p;
    });
  } catch (e: any) {
    toast(e.message);
    profile();
    return;
  }
  chosenRole = localStorage.getItem("vale-role-" + account!.id) || "livre";
  app.innerHTML = `<main class="game-shell"><div id="world"></div><div class="hud"><div class="hud-card"><div class="eyebrow">SÍTIO BOA ESPERANÇA</div><strong id="date"></strong></div><div class="hud-card resources"><span>◉ <b id="cash"></b></span><span>♧ <span id="water"></span> L</span><span>ϟ <span id="energy-number"></span><div class="energy"><i id="energy"></i></div></span></div><div class="game-top-buttons"><button class="icon-btn siblings-btn" id="siblings" aria-label="Família online">${uiIcon("people")}<i class="online-dot"></i><span id="online-count">Família</span></button><button class="icon-btn" id="missions" aria-label="Mapa e missões">${uiIcon("map")}</button><button class="icon-btn" id="pause" aria-label="Pausar">${uiIcon("pause")}</button></div></div><div class="quest-pin" id="quest"></div><div id="delivery" class="delivery-panel" aria-live="polite"></div><div class="rotate">↻ Na horizontal, você vê mais do sítio.</div><div class="controls"><div class="joystick" id="joystick" role="group" aria-label="Joystick de movimento"><div class="knob" id="knob"></div></div><div class="action-buttons"><button id="inventory">${uiIcon("bag")}<span class="control-label">Mochila</span></button><button id="tool">${uiIcon("map")}<span class="control-label">Rotas</span></button><button id="interact" class="main-action">${uiIcon("hand")}<b class="control-label" id="context">Explorar</b></button></div></div><div class="save-status" id="save-status">✓ Progresso salvo</div><div class="keyboard-hint">SETAS para andar &nbsp; · &nbsp; E interagir &nbsp; · &nbsp; I mochila</div></main>`;
  pos = { x: state!.x, y: state!.y };
  game = startWorld(
    "world",
    state!,
    (x, y) => {
      pos = { x, y };
      dirty = true;
    },
    (label) => {
      context = label;
      document.getElementById("context")!.textContent = label;
    },
    (item, target) => {
      if (!busy) void perform({ kind: "pickup", item, target });
    },
  );
  hud();
  joystick();
  on("siblings", siblings);
  heartbeat();
  on("inventory", inventory);
  on("missions", journal);
  on("pause", pause);
  on("interact", interact);
  on("tool", () => {
    journal();
  });
  recover().catch(() => status("⚠ Reconecte para recuperar a ação pendente."));
}
function hud() {
  if (!state || !game) return;
  const s = state,
    date = new Date(Date.UTC(2027, 0, s.day));
  document.getElementById("date")!.textContent =
    `${s.rain ? "☂" : "☀"} ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} · ${Math.floor(
      (s.minute || 420) / 60,
    )
      .toString()
      .padStart(
        2,
        "0",
      )}:${((s.minute || 420) % 60).toString().padStart(2, "0")}`;
  document.getElementById("cash")!.textContent = money(s.money);
  document.getElementById("water")!.textContent = String(s.water);
  document.getElementById("energy-number")!.textContent = String(s.energy);
  document.getElementById("energy")!.style.width = s.energy + "%";
  const m = missions.find(([id]) => !s.missions.includes(id));
  document.getElementById("quest")!.innerHTML =
    `<small>CAPÍTULO 1 · CRIANDO RAÍZES</small>${m ? `◇ ${m[1]}` : "✓ Primeiros passos concluídos! Continue cultivando."}`;
}
function joystick() {
  const el = document.getElementById("joystick")!,
    knob = document.getElementById("knob")!;
  let pointer: number | null = null;
  const move = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return;
    const r = el.getBoundingClientRect();
    let x = e.clientX - r.left - r.width / 2,
      y = e.clientY - r.top - r.height / 2;
    const len = Math.hypot(x, y);
    if (len > 34) {
      x = (x / len) * 34;
      y = (y / len) * 34;
    }
    stick.x = Math.abs(x) > 8 ? x / 34 : 0;
    stick.y = Math.abs(y) > 8 ? y / 34 : 0;
    knob.style.transform = `translate(${x}px,${y}px)`;
  };
  el.addEventListener("pointerdown", (e) => {
    if (pointer !== null) return;
    pointer = e.pointerId;
    el.setPointerCapture(pointer);
    move(e);
  });
  el.addEventListener("pointermove", move);
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    stick.x = stick.y = 0;
    knob.style.transform = "";
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("lostpointercapture", end);
  window.addEventListener(
    "blur",
    () => {
      pointer = null;
      stick.x = stick.y = 0;
      knob.style.transform = "";
    },
    { once: true },
  );
}
function status(text: string) {
  const el = document.getElementById("save-status");
  if (el) el.textContent = text;
}
async function send(action: Action) {
  const payload = { id: uuid(), version: state!.version, action };
  localStorage.setItem("vale-pending-" + account!.id, JSON.stringify(payload));
  status("Salvando…");
  try {
    state = await api("action", payload);
    localStorage.removeItem("vale-pending-" + account!.id);
    scene?.sync(state!);
    hud();
    status("✓ Progresso salvo");
  } catch (e: any) {
    if (e.status && e.status !== 409)
      localStorage.removeItem("vale-pending-" + account!.id);
    if (e.status === 409) {
      state = await api("save");
      localStorage.removeItem("vale-pending-" + account!.id);
      scene?.sync(state!);
      hud();
    }
    status(
      "⚠ " +
        (e.status
          ? "Ação não realizada"
          : "Sem conexão · reconecte para salvar"),
    );
    throw e;
  }
}
async function perform(action: Action, success?: string) {
  if (busy) return false;
  busy = true;
  try {
    if (localStorage.getItem("vale-pending-" + account!.id)) await recover();
    if (dirty && action.kind !== "move") {
      const p = { ...pos };
      await send({ kind: "move", ...p });
      dirty = false;
    }
    await send(action);
    if (action.kind === "enter" || action.kind === "exit") {
      pos = { x: state!.x, y: state!.y };
      dirty = false;
    }
    if (success) toast(success);
    return true;
  } catch (e: any) {
    toast(
      e.message || "Sem conexão. Sua ação ficou pendente para nova tentativa.",
    );
    return false;
  } finally {
    busy = false;
  }
}
async function recover() {
  const raw = localStorage.getItem("vale-pending-" + account!.id);
  if (!raw) return;
  try {
    state = await api("action", JSON.parse(raw));
    localStorage.removeItem("vale-pending-" + account!.id);
    scene?.sync(state!);
    hud();
    status("✓ Progresso recuperado");
  } catch (e: any) {
    if (e.status === 409) {
      state = await api("save");
      localStorage.removeItem("vale-pending-" + account!.id);
      scene?.sync(state!);
      hud();
      toast("Uma versão mais recente foi carregada.");
    } else {
      if (e.status >= 400 && e.status < 500 && e.status !== 401)
        localStorage.removeItem("vale-pending-" + account!.id);
      throw e;
    }
  }
}
setInterval(() => {
  if (
    game &&
    dirty &&
    !busy &&
    !document.querySelector(".overlay") &&
    navigator.onLine
  ) {
    const p = { ...pos };
    dirty = false;
    perform({ kind: "move", ...p });
  }
}, 7000);
window.addEventListener("online", () => {
  if (account) recover().catch(() => status("⚠ Não foi possível reconectar."));
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game) {
    stick.x = stick.y = 0;
    if (dirty && !busy) {
      dirty = false;
      perform({ kind: "move", ...pos });
    }
  }
});
function dialog(name: string, text: string) {
  modal(
    name,
    `<div class="portrait">${name === "Rosa" ? "❀" : name === "Ari" ? "☀" : "♧"}</div><p class="dialogue">${text}</p><button class="primary full" id="dialog-ok">Continuar →</button>`,
    () => on("dialog-ok", closeModal),
  );
}
async function interact() {
  if (busy) return;
  if (context === "Entregar carga") {
    const d = state!.delivery;
    if (d)
      await perform(
        { kind: "deliver" },
        `Entrega feita! +${money(d.quantity * sell[d.item]!)}`,
      );
    return;
  }
  if (context === "Entrar") {
    await perform({ kind: "enter" });
    return;
  }
  if (context === "Sair") {
    await perform({ kind: "exit" });
    return;
  }
  if (context === "Descansar") {
    confirm(
      "Encerrar o dia?",
      `A família consumirá energia e recursos. Cuide da alimentação e da água antes de descansar.`,
      async () => {
        if (await perform({ kind: "sleep" }, "Um novo dia começa no sítio.")) {
          if (state!.rain)
            toast("Choveu! A cisterna ganhou 35 L e o roçado foi regado.");
          else if (state!.family.some((f) => f.hunger < 30 || f.thirst < 30))
            toast("A família precisa de alimento e água. Abra a mochila.");
        }
      },
    );
    return;
  }
  if (context === "Colher") {
    const i = points.trees.reduce(
      (best, p, i) =>
        Math.hypot(pos.x - p.x, pos.y - p.y) <
        Math.hypot(pos.x - points.trees[best].x, pos.y - points.trees[best].y)
          ? i
          : best,
      0,
    );
    await perform(
      { kind: "harvest", target: i },
      "+6 cajus na mochila. Leve à bancada para separar as castanhas.",
    );
    return;
  }
  if (context === "Conversar") {
    const teen = Math.hypot(pos.x - points.teen.x, pos.y - points.teen.y) < 100;
    if (await perform({ kind: "talk", target: teen ? 1 : 0 }))
      dialog(
        teen ? "Pai João" : "Mãe Rosa",
        teen
          ? "Meu filho, quando os irmãos dividem o trabalho, o sítio rende mais. Um cuida das galinhas, outro do pomar. Os compradores ficam pertinho de cada atividade. Anote cada venda e reserve um pouco para o caixa da família, se puder."
          : state!.family[1].hunger < 35
            ? "A despensa anda vazia. Vamos comprar uma cesta na feira e dividir com a família?"
            : "Bom ter vocês por perto! Já deixamos os dez galinheiros, dez cajueiros e dez canteiros produzindo. Passe sobre ovos, cajus ou feijão para recolher. Você tem 90 segundos desde a primeira coleta: saia pela porteira ao sul e entregue ao comprador da estrada. Juntar mais não reinicia o relógio!",
      );
    return;
  }
  if (context === "Separar") {
    await perform(
      { kind: "separate" },
      "Castanhas separadas e guardadas. Venda in natura na feira.",
    );
    return;
  }
  if (context === "Galinheiro") {
    poultry();
    return;
  }
  if (context === "Vender ovos") {
    market("eggs");
    return;
  }
  if (context === "Vender caju") {
    market("fruit");
    return;
  }
  if (context === "Vender feijão") {
    market("crops");
    return;
  }
  if (context === "Feira") {
    market();
    return;
  }
  if (context === "Cultivar") {
    cultivate();
    return;
  }
  if (context === "Água") {
    confirm(
      "Cuidar da cisterna",
      `Reserva: ${state!.water}/150 L. Comprar uma entrega de 50 L por R$ 12? A chuva também repõe a reserva a cada quatro dias de jogo.`,
      () => perform({ kind: "refill" }, "Água recebida na cisterna."),
    );
    return;
  }
  toast("Explore o sítio. Aproxime-se das pessoas e objetos para interagir.");
}
function inventory() {
  const s = state!;
  modal(
    "Sua mochila",
    `<p>O que a terra deu, e o que a família precisa.</p><div class="grid">${Object.entries(
      labels,
    )
      .map(
        ([id, label]) =>
          `<div class="tile"><strong>${label}</strong><small>${s.inventory[id as Item] ?? 0} unidades</small>${id === "alimento" ? '<button id="care">Alimentar a família · 1 cesta + 9 L</button>' : ""}</div>`,
      )
      .join(
        "",
      )}</div><div class="actions"><button id="family" class="ghost">Ver família</button><button id="ledger" class="ghost">Caderno de contas</button></div>`,
    () => {
      on("care", async () => {
        if (
          await perform(
            { kind: "care" },
            "A família está alimentada e hidratada.",
          )
        )
          inventory();
      });
      on("family", family);
      on("ledger", () =>
        modal(
          "Caderno de contas",
          `<p>Saldo: <strong>${money(s.money)}</strong></p>${
            s.transactions.length
              ? s.transactions
                  .slice()
                  .reverse()
                  .map(
                    (t) =>
                      `<div class="row"><span>${esc(t.description)}<small>Dia ${t.day}</small></span><strong>${money(t.amount)}</strong></div>`,
                  )
                  .join("")
              : "<p>Nenhuma compra ou venda de produtos ainda.</p>"
          }`,
        ),
      );
    },
  );
}
function family() {
  modal(
    "Nossa família",
    `<p>Repartir os recursos também é cuidar do amanhã.</p>${state!.family.map((f) => `<div class="tile" style="margin-bottom:10px"><strong>${esc(f.name)} ${f.alive ? "" : "· faleceu"}</strong><small>Alimentação ${f.hunger}% · Hidratação ${f.thirst}%</small><small>Saúde ${f.health}% · Bem-estar ${f.wellbeing}% · Energia ${f.energy}%</small></div>`).join("")}<button id="family-care" class="primary full">Dividir uma cesta e 9 L de água</button>`,
    () =>
      on("family-care", async () => {
        if (
          await perform({ kind: "care" }, "Hora de cuidar de quem está junto.")
        )
          family();
      }),
  );
}
let merchant: "all" | "eggs" | "fruit" | "crops" = "all";
function market(type: typeof merchant = "all") {
  merchant = type;
  const titles = {
    all: "Armazém do Seu Zé",
    eggs: "Dona Lúcia · ovos e ração",
    fruit: "Bento · frutos do pomar",
    crops: "Ana · produtos da horta",
  };
  const allowed: Record<typeof merchant, Item[]> = {
    all: Object.keys(labels) as Item[],
    eggs: ["ovo", "racao"],
    fruit: ["caju", "castanha"],
    crops: ["feijao", "semente"],
  };
  const rows = (prices: Partial<Record<Item, number>>, purchase: boolean) =>
    Object.entries(prices)
      .filter(([id]) => allowed[type].includes(id as Item))
      .map(
        ([id, price]) =>
          `<div class="row"><span><strong>${labels[id as Item]}</strong><small>${money(price!)} / unidade${purchase ? "" : ` · Na mochila: ${state!.inventory[id as Item] ?? 0}`}</small></span><button data-trade="${id}" data-buy="${purchase ? 1 : 0}">${purchase ? "Comprar" : "Vender"}</button></div>`,
      )
      .join("");
  modal(
    titles[type],
    `<p>Produziu aqui, vendeu aqui. O pagamento entra na sua carteira e no caderno de contas.</p><div class="wallet-banner">Sua carteira <strong>${money(state!.money)}</strong></div><div class="eyebrow">VENDER SUA PRODUÇÃO</div>${rows(sell, false)}<br><div class="eyebrow">COMPRAR SUPRIMENTOS</div>${rows(buy, true)}${type === "all" ? `<div class="row"><span><strong>Chapéu de palha</strong><small>R$ 25,00 · dinheiro do jogo</small></span><button id="hat">${state!.hat ? "Adquirido" : "Comprar"}</button></div>` : ""}`,
    () => {
      document
        .querySelectorAll<HTMLButtonElement>("[data-trade]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              trade(b.dataset.trade as Item, b.dataset.buy === "1")),
        );
      on("hat", () =>
        confirm(
          "Chapéu de palha",
          "Comprar por R$ 25,00 do jogo?",
          async () => {
            await perform({ kind: "hat" }, "Chapéu equipado!");
            market(type);
          },
        ),
      );
    },
  );
}
function poultry() {
  modal(
    "Galinheiro da família",
    `<div class="activity-steps"><span>1. Cuidar</span><b>→</b><span>2. Recolher</span><b>→</b><span>3. Vender</span></div><p>Cuide das galinhas com <strong>1 porção de ração</strong> e recolha <strong>6 ovos caipiras</strong>. Dona Lúcia compra os ovos por <strong>R$ 4,00 cada</strong> no balcão ao lado.</p><div class="wallet-banner"><span>Seis ovos vendidos</span><strong>R$ 24,00</strong></div><p>Na mochila: ${state!.inventory.ovo ?? 0} ovos · ${state!.inventory.racao ?? 2} porções de ração. Custo de reposição: R$ 6,00 por porção.</p><button id="collect-eggs" class="primary full" ${state!.coopDay === state!.day ? "disabled" : ""}>${state!.coopDay === state!.day ? "Galinhas cuidadas hoje" : "Cuidar e recolher 6 ovos · 8 energia"}</button><p class="note">Uma coleta por irmão a cada dia de jogo. Descansar em casa libera a próxima coleta. Caminhe alguns passos à direita para encontrar Dona Lúcia.</p>`,
    () =>
      on("collect-eggs", async () => {
        if (
          await perform(
            { kind: "poultry" },
            "+6 ovos na mochila! Dona Lúcia compra logo ao lado.",
          )
        )
          poultry();
      }),
  );
}
function trade(item: Item, purchase: boolean) {
  const price = (purchase ? buy : sell)[item]!;
  modal(
    `${purchase ? "Comprar" : "Vender"} ${labels[item]}`,
    `<p>${money(price)} por unidade · Seu saldo: ${money(state!.money)}</p><label>Quantidade<input id="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label><p id="total" style="margin-top:15px">Total: ${money(price)}</p><button id="trade-confirm" class="primary full">Confirmar ${purchase ? "compra" : "venda"}</button>`,
    () => {
      const input = document.getElementById("quantity") as HTMLInputElement;
      input.oninput = () =>
        (document.getElementById("total")!.textContent =
          "Total: " + money(price * Number(input.value)));
      on("trade-confirm", async () => {
        if (
          await perform(
            {
              kind: "trade",
              target: purchase ? 1 : 0,
              item,
              quantity: Number(input.value),
            },
            purchase
              ? "Compra guardada na mochila."
              : "Venda concluída. Bom negócio!",
          )
        )
          market(merchant);
      });
    },
  );
}
function cultivate() {
  modal(
    "Cuidar do roçado",
    `<p>Feijão-de-corda: plante, regue e espere três dias de jogo. Este ciclo foi abreviado para o protótipo.</p><div class="grid">${state!.plots.map((p, i) => `<div class="tile"><strong>Canteiro ${i + 1}</strong><small>${p.planted ? `Plantado há ${state!.day - p.planted} dias · ${p.watered ? "regado" : "precisa de água"}` : "Terra pronta para plantar"}</small><button data-plot="${i}" data-kind="${p.planted ? "crop" : "plant"}">${p.planted ? "Colher feijão" : "Plantar · 1 semente"}</button></div>`).join("")}</div><div class="actions"><button id="water-plots" class="primary">Regar roçado · 5 L</button><button id="expand" class="ghost">Plantar muda de cajueiro</button></div><p class="note">O cajueiro é perene. A muda plantada aparece no sítio, mas não produz neste capítulo inicial. As árvores adultas renovam a colheita a cada três dias de jogo.</p>`,
    () => {
      document.querySelectorAll<HTMLButtonElement>("[data-plot]").forEach(
        (b) =>
          (b.onclick = async () => {
            if (
              await perform(
                { kind: b.dataset.kind!, target: Number(b.dataset.plot) },
                "Roçado atualizado.",
              )
            )
              cultivate();
          }),
      );
      on("water-plots", async () => {
        if (await perform({ kind: "water" }, "Roçado regado.")) cultivate();
      });
      on("expand", async () => {
        if (
          await perform({ kind: "expand" }, "Uma muda plantada para o futuro.")
        )
          cultivate();
      });
    },
  );
}
function journal() {
  modal(
    "Mapa e missões",
    `${farmMap()}<p class="note">Passe sobre a produção para coletar. Cada ponto repõe seus produtos em 2 minutos. Leve a carga em até 90 segundos pela porteira sul e toque em Entregar carga junto ao comprador. O prazo continua nos menus.</p><div class="mini-map"><span>↖ Casa e cisterna</span><span>↗ 10 cajueiros</span><span>↙ 10 galinheiros</span><span>↘ 10 canteiros de feijão</span></div><br><div class="eyebrow">CAPÍTULO 1 · CRIANDO RAÍZES</div>${missions.map(([id, label], i) => `<div class="mission ${state!.missions.includes(id) ? "done" : ""}"><i>${state!.missions.includes(id) ? "✓" : i + 1}</i>${label}</div>`).join("")}<button id="discoveries" class="primary full">Abrir Caderno de Descobertas</button>`,
    () => on("discoveries", discoveries),
  );
}
function discoveries() {
  modal(
    "Caderno de Descobertas",
    `<div class="tile"><strong>01 · Uma cultura para muitos anos</strong><p>O cajueiro é uma planta perene. Investir em mudas pede planejamento: o retorno não é imediato. O protótipo começa com árvores adultas para sustentar a primeira safra.</p></div><br><div class="tile"><strong>02 · Água guardada, futuro cuidado</strong><p>Uma reserva de água ajuda a enfrentar períodos secos. No jogo, regar e atender a família disputam a mesma reserva: observe a cisterna antes de gastar.</p></div><br><div class="tile"><strong>03 · A castanha e o pedúnculo</strong><p>A castanha é o fruto verdadeiro. A parte carnosa conhecida como caju é o pedúnculo. Neste MVP, a separação converte a unidade de colheita em castanha e simplifica o aproveitamento do pedúnculo.</p></div><p class="note">Castanhas são vendidas in natura. Não há instruções de processamento doméstico: o beneficiamento envolve cuidados técnicos e riscos associados à casca.</p><p>Referências para aprofundamento: <a href="https://www.atermaisdigital.cnptia.embrapa.br/web/caju/o-cajueiro" target="_blank" rel="noopener">Embrapa · Cultivo do caju</a> e <a href="https://www.ibge.gov.br/cidades-e-estados/ce/pacajus.html" target="_blank" rel="noopener">IBGE · Pacajus</a>.</p><small>Os preços, rendimentos, clima periódico e ciclos abreviados são regras fictícias de jogo. O conteúdo deverá passar por revisão docente antes do estudo educacional.</small>`,
  );
}
function pause() {
  modal(
    "Uma pausa à sombra",
    `<p>O personagem fica parado neste menu. O prazo real da entrega continua correndo, inclusive ao sair do jogo.</p><div class="grid"><button id="resume" class="primary">Continuar</button><button id="pause-family">Família</button><button id="pause-settings">Configurações</button><button id="account-options">${account?.guest ? "Guardar minha partida" : "Minha conta"}</button><button id="menu">Salvar e voltar ao menu</button></div>`,
    () => {
      on("resume", closeModal);
      on("account-options", accountOptions);
      on("pause-family", family);
      on("pause-settings", settings);
      on("menu", async () => {
        if (busy) {
          toast("Aguarde o salvamento atual.");
          return;
        }
        if (dirty) {
          if (!(await perform({ kind: "move", ...pos }))) return;
          dirty = false;
        }
        try {
          await recover();
          profile();
        } catch (e: any) {
          toast("Reconecte para concluir o salvamento antes de sair.");
        }
      });
    },
  );
}
async function boot() {
  game?.destroy(true);
  game = undefined;
  closeModal();
  app.innerHTML =
    '<div class="loading"><h2>Entrando no sítio…</h2><progress aria-label="Carregando o jogo"></progress></div>';
  if (new URLSearchParams(location.search).has("reset")) {
    auth("reset");
    return;
  }
  try {
    try {
      account = await api("me");
    } catch (e: any) {
      if (e.status !== 401) throw e;
      account = await api("guest", {});
    }
    state = await api("save");
    if (!state)
      state = await api("new", {
        name: account!.nickname,
        skin: "terracota",
        mode: "historia",
      });
    await play();
  } catch (e: any) {
    app.innerHTML = `<div class="loading"><h2>Não foi possível entrar no sítio</h2><p>${esc(e.message || "Verifique sua conexão.")}</p><button id="retry">Tentar novamente</button></div>`;
    on("retry", () => void boot());
  }
}
boot();

let chosenRole = "livre",
  heartbeating = false;
let cooperative: { members: Member[]; treasury: number; goal: number } = {
  members: [],
  treasury: 0,
  goal: 300,
};
const roleNames: Record<string, string> = {
  livre: "Explorando o sítio",
  galinheiro: "Cuidando das galinhas",
  pomar: "Colhendo no pomar",
  rocado: "Cuidando da horta",
  agua: "Cuidando da água",
};
async function heartbeat() {
  if (!account || !game || !state || heartbeating) return;
  heartbeating = true;
  try {
    const data = await api("family/heartbeat", {
      ...pos,
      location: state.location,
      role: chosenRole,
    });
    if (!game || !account) return;
    cooperative = data;
    scene?.updateFamily(data.members, account.id, data.treasury);
    const count = document.getElementById("online-count");
    if (count) count.textContent = `${data.members.length} online`;
    refreshRoster();
  } catch {
    const count = document.getElementById("online-count");
    if (count) count.textContent = "Reconectando";
  } finally {
    heartbeating = false;
  }
}
setInterval(() => {
  if (!document.hidden) heartbeat();
}, 2000);
function roster() {
  return (
    cooperative.members
      .map(
        (m) =>
          `<div class="relative-row"><i class="online-dot"></i><div><strong>${esc(m.name)} ${m.id === account!.id ? "· você" : "· irmão"}</strong><small>${roleNames[m.role] || roleNames.livre}${m.location === "home" ? " · em casa" : ""}</small></div></div>`,
      )
      .join("") || "<p>Conectando a família…</p>"
  );
}
function refreshRoster() {
  const el = document.getElementById("family-roster");
  if (el) el.innerHTML = roster();
  const fund = document.getElementById("family-fund");
  if (fund) fund.textContent = money(cooperative.treasury);
  const progress = document.getElementById(
    "family-progress",
  ) as HTMLProgressElement | null;
  if (progress) progress.value = cooperative.treasury;
}
function siblings() {
  modal(
    "Uma família, muitas mãos",
    `<p>Mãe Rosa e Pai João acolhem todos no sítio. Cada jogador online é um irmão, com seu nome e sua atividade.</p><label>Hoje eu vou ajudar…<select id="choose-role">${Object.entries(
      roleNames,
    )
      .map(
        ([id, name]) =>
          `<option value="${id}" ${chosenRole === id ? "selected" : ""}>${name}</option>`,
      )
      .join(
        "",
      )}</select></label><div id="family-roster">${roster()}</div><div class="family-project"><div class="eyebrow">PROJETO EM FAMÍLIA</div><h3>Um cantinho para todos</h3><p>Juntos, construam um espaço de convivência no quintal. Ele aparece no mapa de todos ao atingir R$ 300,00.</p><div class="wallet-banner"><span>Caixa compartilhado</span><strong id="family-fund">${money(cooperative.treasury)}</strong></div><progress id="family-progress" max="300" value="${cooperative.treasury}"></progress><label>Minha contribuição em reais<input id="donation" type="number" min="1" max="${state!.money}" value="10" inputmode="numeric"></label><button id="donate" class="primary full">Contribuir com dinheiro do jogo</button><small>Voluntário. Sua carteira: ${money(state!.money)}. Sua mochila, colheitas e dias são individuais; presença e caixa da família são compartilhados.</small></div>`,
    () => {
      document
        .getElementById("choose-role")!
        .addEventListener("change", (e) => {
          chosenRole = (e.target as HTMLSelectElement).value;
          localStorage.setItem("vale-role-" + account!.id, chosenRole);
          heartbeat();
        });
      on("donate", () => {
        const quantity = Number(
          (document.getElementById("donation") as HTMLInputElement).value,
        );
        confirm(
          "Contribuir com a família",
          `Transferir ${money(quantity)} da sua carteira para o caixa compartilhado? É dinheiro do jogo.`,
          async () => {
            if (
              await perform(
                { kind: "donate", quantity },
                "Contribuição registrada no caixa da família.",
              )
            ) {
              await heartbeat();
              siblings();
            }
          },
        );
      });
    },
  );
}

function farmMap() {
  const circles = Object.entries(sectors)
    .map(([item, nodes]) =>
      nodes
        .map(
          (p) =>
            `<circle cx="${p.x}" cy="${p.y}" r="24" fill="${item === "ovo" ? "#faf0cb" : item === "caju" ? "#a95029" : "#687847"}"/>`,
        )
        .join(""),
    )
    .join("");
  return `<svg class="farm-map" viewBox="0 0 ${WORLD.width} ${WORLD.height}" role="img" aria-label="Mapa do sítio: galinheiros à esquerda, cajueiros e feijão à direita, saída ao sul"><rect width="2560" height="1680" fill="#cfac72"/><path d="M1200 100V1570M60 1290H2500" stroke="#f3d89b" stroke-width="95"/><path d="M60 1370H1120M1280 1370H2500" stroke="#66472d" stroke-width="18"/>${circles}<g fill="#513b28" font-size="75" font-family="Georgia"><text x="120" y="220">Casa</text><text x="130" y="460">Galinheiros</text><text x="1450" y="160">Cajueiros</text><text x="1450" y="770">Feijão</text><text x="850" y="1660">Compradores · estrada</text></g><circle cx="${pos.x}" cy="${pos.y}" r="30" fill="#315d72" stroke="#fff7e2" stroke-width="12"/></svg>`;
}
setInterval(() => {
  const el = document.getElementById("delivery");
  if (!game || !state || !el) return;
  const d = state.delivery;
  if (!d) {
    el.classList.remove("urgent");
    el.innerHTML =
      "<small>COLHEITA E ENTREGA</small><strong>Passe sobre os produtos para recolher</strong><span>Ovos ↙ · Caju ↗ · Feijão ↘</span>";
    return;
  }
  const seconds = Math.max(0, Math.ceil((d.deadline - Date.now()) / 1000));
  if (!seconds) {
    el.innerHTML =
      "<strong>Prazo encerrado</strong><span>Recolha uma nova carga. Seu dinheiro foi preservado.</span>";
    if (!busy)
      void perform(
        { kind: "expire" },
        "O prazo da carga acabou. Recolha uma nova produção.",
      );
    return;
  }
  const buyer = buyers[d.item],
    distance = Math.round(Math.hypot(pos.x - buyer.x, pos.y - buyer.y) / 10);
  const outside = pos.y > WORLD.fenceY;
  const target = outside ? buyer : { x: WORLD.gateX, y: WORLD.fenceY + 70 };
  const routeAngle =
    (Math.atan2(target.y - pos.y, target.x - pos.x) * 180) / Math.PI;
  el.classList.toggle("urgent", seconds <= 20);
  el.innerHTML = `<small>ENTREGA · ${d.quantity} ${labels[d.item]}</small><div class="delivery-heading"><strong>${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}</strong><span class="route-arrow" style="transform:rotate(${routeAngle}deg)">➜</span><span>${outside ? buyer.name : "Porteira ao sul"}<small>${buyer.name} · ${distance} passos</small></span></div><progress max="${DELIVERY_MS}" value="${seconds * 1000}" aria-label="Tempo restante para entregar"></progress>`;
}, 250);

function accountOptions() {
  modal(
    account?.guest ? "Sua partida de visitante" : "Sua conta",
    `<p>${account?.guest ? "Sua partida fica salva nesta sessão. Vincule a um e-mail para recuperar o acesso e jogar em outro aparelho." : `Jogando como ${esc(account?.nickname || "")}. Sua partida está salva na conta.`}</p><div class="actions">${account?.guest ? '<button id="claim-account" class="primary">Vincular esta partida</button><button id="existing-account">Já tenho conta</button>' : '<button id="account-profile">Gerenciar partida</button>'}</div>`,
    () => {
      on("claim-account", () => void leaveForAuth("register"));
      on("existing-account", () => void leaveForAuth("login"));
      on("account-profile", () => void profile());
    },
  );
}
async function leaveForAuth(kind: "register" | "login") {
  if (busy) {
    toast("Aguarde o salvamento.");
    return;
  }
  if (dirty && !(await perform({ kind: "move", ...pos }))) return;
  try {
    await recover();
    auth(kind);
  } catch {
    toast("Reconecte para salvar sua partida antes de continuar.");
  }
}
