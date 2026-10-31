export type Item =
  | "caju"
  | "castanha"
  | "semente"
  | "feijao"
  | "alimento"
  | "muda"
  | "ovo"
  | "racao";
export type State = {
  delivery: {
    item: "caju" | "ovo" | "feijao";
    quantity: number;
    deadline: number;
  } | null;
  pickups: Record<string, number>;
  version: number;
  name: string;
  skin: string;
  mode: "historia" | "sobrevivencia";
  day: number;
  minute: number;
  money: number;
  water: number;
  energy: number;
  location: "farm" | "home";
  x: number;
  y: number;
  inventory: Record<Item, number>;
  trees: number[];
  plots: { planted: number; watered: boolean }[];
  family: {
    name: string;
    hunger: number;
    thirst: number;
    health: number;
    wellbeing: number;
    energy: number;
    alive: boolean;
  }[];
  missions: string[];
  decisions: string[];
  transactions: { day: number; description: string; amount: number }[];
  hat: boolean;
  rain: boolean;
  coopDay: number;
  contributed: number;
};
export const points = {
  home: { x: 206, y: 250 },
  cistern: { x: 414, y: 225 },
  family: { x: 290, y: 285 },
  teen: { x: 440, y: 345 },
  market: { x: 1850, y: 1550 },
  bench: { x: 600, y: 380 },
  coop: { x: 180, y: 620 },
  eggBuyer: { x: 950, y: 1550 },
  fruitBuyer: { x: 1250, y: 1550 },
  cropBuyer: { x: 1550, y: 1550 },
  plots: { x: 1400, y: 890 },
  trees: Array.from({ length: 10 }, (_, i) => ({
    x: 1400 + (i % 5) * 215,
    y: 300 + Math.floor(i / 5) * 260,
  })),
};
export const WORLD = { width: 2560, height: 1680, fenceY: 1370, gateX: 1200 };
export type Produce = "caju" | "ovo" | "feijao";
export const sectors = {
  caju: points.trees.map((p) => ({ x: p.x, y: p.y + 45 })),
  ovo: Array.from({ length: 10 }, (_, i) => ({
    x: 180 + (i % 5) * 210,
    y: 620 + Math.floor(i / 5) * 340,
  })),
  feijao: Array.from({ length: 10 }, (_, i) => ({
    x: 1400 + (i % 5) * 215,
    y: 890 + Math.floor(i / 5) * 250,
  })),
};
export const buyers = {
  ovo: { ...points.eggBuyer, name: "Dona Lúcia" },
  caju: { ...points.fruitBuyer, name: "Bento" },
  feijao: { ...points.cropBuyer, name: "Ana" },
};
export const DELIVERY_MS = 90_000;
export const REGROW_MS = 120_000;
export const labels: Record<Item, string> = {
  caju: "Caju",
  castanha: "Castanha in natura",
  semente: "Sementes de feijão",
  feijao: "Feijão-de-corda",
  alimento: "Cesta de alimentos",
  muda: "Muda de cajueiro",
  ovo: "Ovos caipiras",
  racao: "Ração para galinhas",
};
export const sell: Partial<Record<Item, number>> = {
  ovo: 4,
  caju: 3,
  castanha: 5,
  feijao: 8,
};
export const buy: Partial<Record<Item, number>> = {
  racao: 6,
  semente: 5,
  alimento: 18,
  muda: 35,
};
export function initial(
  name = "Agricultor",
  skin = "terracota",
  mode: State["mode"] = "historia",
): State {
  return {
    version: 0,
    delivery: null,
    pickups: {},
    name,
    skin,
    mode,
    day: 1,
    minute: 420,
    money: 80,
    water: 60,
    energy: 100,
    location: "farm",
    x: 330,
    y: 300,
    inventory: {
      ovo: 0,
      racao: 2,
      caju: 0,
      castanha: 0,
      semente: 3,
      feijao: 0,
      alimento: 2,
      muda: 0,
    },
    trees: Array(10).fill(0),
    plots: Array.from({ length: 10 }, () => ({ planted: -2, watered: true })),
    family: [name, "Mãe Rosa", "Pai João"].map((name) => ({
      name,
      hunger: 85,
      thirst: 90,
      health: 100,
      wellbeing: 80,
      energy: 100,
      alive: true,
    })),
    missions: [],
    decisions: [],
    transactions: [],
    hat: false,
    rain: false,
    coopDay: 0,
    contributed: 0,
  };
}
export type Action = {
  kind: string;
  target?: number;
  item?: Item;
  quantity?: number;
  x?: number;
  y?: number;
  location?: string;
};
export function restore(saved: State): State {
  const s = structuredClone(saved);
  s.inventory.ovo ??= 0;
  s.inventory.racao ??= 2;
  s.coopDay ??= 0;
  s.contributed ??= 0;
  s.delivery ??= null;
  s.pickups ??= {};
  while (s.trees.length < 10) s.trees.push(0);
  while (s.plots.length < 10) s.plots.push({ planted: -2, watered: true });
  if (s.family[1]) s.family[1].name = "Mãe Rosa";
  if (s.family[2]) s.family[2].name = "Pai João";
  return s;
}
export function act(s: State, a: Action, now = Date.now()): State {
  s = restore(s);
  if (s.delivery && s.delivery.deadline <= now) s.delivery = null;
  const done = (id: string) => {
    if (!s.missions.includes(id)) s.missions.push(id);
  };
  const near = (p: { x: number; y: number }, r = 125) => {
    if (s.location !== "farm" || Math.hypot(s.x - p.x, s.y - p.y) > r)
      throw Error("Aproxime-se para realizar esta ação.");
  };
  const spend = (n: number) => {
    if (s.energy < n) throw Error("Descanse em casa para recuperar energia.");
    s.energy -= n;
  };
  if (a.kind === "pickup") {
    if (!a.item || !(a.item in sectors)) throw Error("Produto inválido.");
    const item = a.item as Produce,
      i = a.target ?? -1,
      p = sectors[item][i];
    if (!p) throw Error("Ponto de coleta inválido.");
    near(p, 42);
    const key = `${item}:${i}`;
    if ((s.pickups[key] || 0) > now) throw Error("Aguarde a próxima produção.");
    if (s.delivery && s.delivery.item !== item)
      throw Error("Entregue a carga atual antes de pegar outro produto.");
    if (s.delivery && s.delivery.quantity >= 30)
      throw Error("Carga cheia. Vá ao comprador.");
    s.delivery = {
      item,
      quantity: (s.delivery?.quantity || 0) + 3,
      deadline: s.delivery?.deadline ?? now + DELIVERY_MS,
    };
    s.pickups[key] = now + REGROW_MS;
    if (
      ["ovo", "caju", "feijao"].every((item) =>
        Object.keys(s.pickups).some((k) => k.startsWith(item + ":")),
      )
    )
      done("tressetores");
    done("colher");
  } else if (a.kind === "deliver") {
    if (!s.delivery)
      throw Error("Não há carga dentro do prazo. Recolha uma nova produção.");
    const d = s.delivery;
    near(buyers[d.item], 85);
    const amount = d.quantity * sell[d.item]!;
    s.money += amount;
    s.transactions.push({
      day: s.day,
      description: `Entrega no prazo: ${d.quantity} ${labels[d.item]}`,
      amount,
    });
    s.delivery = null;
    done("entrega");
    done("feira");
    done("vender");
  } else if (a.kind === "expire") {
    // Server time controls expiry, including while the browser is closed.
  } else if (a.kind === "move") {
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y))
      throw Error("Posição inválida.");
    s.x = Math.max(40, Math.min(WORLD.width - 40, a.x!));
    s.y = Math.max(70, Math.min(WORLD.height - 40, a.y!));
    done("explorar");
  } else if (a.kind === "enter") {
    near(points.home);
    s.location = "home";
    s.x = 620;
    s.y = 480;
  } else if (a.kind === "exit") {
    if (s.location !== "home") throw Error("Você já está fora.");
    s.location = "farm";
    s.x = 206;
    s.y = 285;
  } else if (a.kind === "talk") {
    near(a.target === 1 ? points.teen : points.family);
    done("familia");
  } else if (a.kind === "harvest") {
    const i = a.target ?? -1;
    if (!points.trees[i]) throw Error("Árvore inválida.");
    near(points.trees[i]);
    if (s.trees[i] && s.day - s.trees[i] < 3)
      throw Error("Este cajueiro ainda está se recuperando.");
    spend(8);
    s.inventory.caju += 6;
    s.trees[i] = s.day;
    done("colher");
  } else if (a.kind === "separate") {
    near(points.bench);
    if (s.inventory.caju < 1) throw Error("Colha cajus primeiro.");
    const n = Math.min(6, s.inventory.caju);
    s.inventory.caju -= n;
    s.inventory.castanha += n;
    spend(3);
    done("separar");
  } else if (a.kind === "poultry") {
    near(points.coop, 95);
    if (s.coopDay === s.day)
      throw Error(
        "Você já cuidou das galinhas hoje. Volte depois de descansar.",
      );
    if (!s.inventory.racao)
      throw Error("Compre ração com Dona Lúcia, ao lado do galinheiro.");
    spend(8);
    s.inventory.racao--;
    s.inventory.ovo += 6;
    s.coopDay = s.day;
    done("galinhas");
  } else if (a.kind === "donate") {
    const n = a.quantity ?? 0;
    if (!Number.isInteger(n) || n < 1 || n > s.money)
      throw Error("Escolha um valor inteiro dentro do seu saldo.");
    s.money -= n;
    s.contributed += n;
    s.transactions.push({
      day: s.day,
      description: "Contribuição para o caixa da família",
      amount: -n,
    });
  } else if (a.kind === "trade") {
    const local =
      a.item === "ovo" || a.item === "racao"
        ? points.eggBuyer
        : a.item === "feijao" || a.item === "semente"
          ? points.cropBuyer
          : points.fruitBuyer;
    const marketDistance = Math.hypot(
      s.x - points.market.x,
      s.y - points.market.y,
    );
    near(marketDistance < 110 ? points.market : local, 110);
    const q = a.quantity ?? 0;
    if (!Number.isInteger(q) || q < 1 || q > 99 || !a.item)
      throw Error("Quantidade inválida.");
    const price = a.target === 1 ? buy[a.item] : sell[a.item];
    if (!price) throw Error("Produto indisponível.");
    const total = price * q;
    if (a.target === 1) {
      if (s.money < total) throw Error("Dinheiro insuficiente.");
      s.money -= total;
      s.inventory[a.item] += q;
      done("comprar");
    } else {
      if (s.inventory[a.item] < q) throw Error("Estoque insuficiente.");
      s.money += total;
      s.inventory[a.item] -= q;
      done("vender");
    }
    s.transactions.push({
      day: s.day,
      description: `${a.target === 1 ? "Compra" : "Venda"}: ${q} ${labels[a.item]}`,
      amount: a.target === 1 ? -total : total,
    });
    done("feira");
  } else if (a.kind === "plant") {
    near(points.plots);
    const i = a.target ?? 0;
    if (!s.plots[i] || s.plots[i].planted) throw Error("Canteiro ocupado.");
    if (!s.inventory.semente) throw Error("Compre sementes na feira.");
    spend(5);
    s.inventory.semente--;
    s.plots[i] = { planted: s.day, watered: false };
    done("plantar");
  } else if (a.kind === "water") {
    near(points.plots);
    if (s.water < 5) throw Error("A cisterna precisa de água.");
    s.water -= 5;
    s.plots.forEach((p) => {
      if (p.planted) p.watered = true;
    });
    spend(3);
  } else if (a.kind === "crop") {
    near(points.plots);
    const p = s.plots[a.target ?? 0];
    if (!p?.planted || s.day - p.planted < 3 || !p.watered)
      throw Error("O feijão precisa de água e três dias de jogo.");
    s.inventory.feijao += 5;
    p.planted = 0;
    p.watered = false;
  } else if (a.kind === "care") {
    if (!s.inventory.alimento || s.water < 9)
      throw Error("Você precisa de uma cesta e 9 L de água.");
    s.inventory.alimento--;
    s.water -= 9;
    s.family.forEach((f) => {
      if (f.alive) {
        f.hunger = Math.min(100, f.hunger + 45);
        f.thirst = Math.min(100, f.thirst + 50);
        f.health = Math.min(100, f.health + 15);
      }
    });
    done("cuidar");
  } else if (a.kind === "refill") {
    near(points.cistern);
    if (s.money < 12)
      throw Error("São necessários R$ 12 para a entrega de água.");
    s.money -= 12;
    s.water = Math.min(150, s.water + 50);
  } else if (a.kind === "hat") {
    near(points.market);
    if (s.hat) throw Error("Você já tem esse chapéu.");
    if (s.money < 25) throw Error("Dinheiro insuficiente.");
    s.money -= 25;
    s.hat = true;
    done("investir");
  } else if (a.kind === "expand") {
    near(points.plots);
    if (!s.inventory.muda) throw Error("Compre uma muda na feira.");
    if (s.decisions.includes("pomar")) throw Error("A muda já foi plantada.");
    s.inventory.muda--;
    s.decisions.push("pomar");
    done("investir");
  } else if (a.kind === "sleep") {
    if (s.location !== "home") throw Error("Volte para casa para descansar.");
    s.day++;
    s.minute = 420;
    s.energy = 100;
    s.rain = s.day % 4 === 0;
    if (s.rain) {
      s.water = Math.min(150, s.water + 35);
      s.plots.forEach((p) => {
        if (p.planted) p.watered = true;
      });
    }
    s.family.forEach((f) => {
      if (!f.alive) return;
      f.hunger = Math.max(0, f.hunger - 18);
      f.thirst = Math.max(0, f.thirst - 22);
      f.energy = 100;
      f.wellbeing = Math.round((f.hunger + f.thirst) / 2);
      if (f.hunger === 0 || f.thirst === 0)
        f.health = Math.max(s.mode === "historia" ? 20 : 0, f.health - 20);
      if (f.health === 0) f.alive = false;
    });
  } else throw Error("Ação desconhecida.");
  if (!["move", "sleep", "pickup", "deliver", "expire"].includes(a.kind))
    s.minute = Math.min(1320, (s.minute || 420) + 30);
  s.version++;
  s.transactions = s.transactions.slice(-100);
  return s;
}
