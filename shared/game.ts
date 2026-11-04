import { catalog, starter, tones, type Appearance } from "./appearance.js";
export type Item =
  | "caju"
  | "castanha"
  | "semente"
  | "feijao"
  | "alimento"
  | "muda"
  | "ovo"
  | "racao";
export type Production = {
  planted: boolean;
  prepared: boolean;
  watered: boolean;
  fed: boolean;
  clean: boolean;
  readyAt: number;
  young: boolean;
};
export type State = {
  production: Record<Produce, Production[]>;
  delivery: {
    item: "caju" | "ovo" | "feijao";
    quantity: number;
    deadline: number;
    separated?: number;
  } | null;
  pickups: Record<string, number>;
  routineAt: number;
  meals: string[];
  version: number;
  name: string;
  skin: string;
  appearance: Appearance;
  owned: string[];
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
  feijao: "Feijão-de-corda (kg)",
  alimento: "Cesta de alimentos",
  muda: "Muda de cajueiro",
  ovo: "Ovos caipiras (un.)",
  racao: "Ração para galinhas",
};
export const sell: Partial<Record<Item, number>> = {
  ovo: 0.7,
  caju: 0.5,
  castanha: 0.05,
  feijao: 5,
};
export const buy: Partial<Record<Item, number>> = {
  racao: 0.5,
  semente: 0.5,
  alimento: 18,
  muda: 8,
};
export function initialProduction(
  pickups: Record<string, number> = {},
): Record<Produce, Production[]> {
  return Object.fromEntries(
    (["caju", "ovo", "feijao"] as Produce[]).map((item) => [
      item,
      Array.from({ length: 10 }, (_, i) => ({
        planted: true,
        prepared: true,
        watered: true,
        fed: true,
        clean: true,
        readyAt: pickups[`${item}:${i}`] || 1,
        young: false,
      })),
    ]),
  ) as Record<Produce, Production[]>;
}
export function productionStatus(
  s: State,
  item: Produce,
  i: number,
  now = Date.now(),
): string {
  const p = s.production?.[item]?.[i];
  if (!p) return "Pronto para colher";
  if (p.readyAt)
    return p.readyAt > now
      ? `Crescendo · ${Math.ceil((p.readyAt - now) / 1000)}s`
      : "Pronto para colher";
  if (item === "ovo")
    return !p.fed
      ? "Alimentar galinhas"
      : !p.watered
        ? "Encher bebedouro"
        : "Limpar galinheiro";
  return !p.prepared
    ? item === "caju"
      ? "Gradear ao redor"
      : "Preparar terra"
    : !p.planted
      ? "Plantar feijão"
      : "Regar";
}
export function initial(
  name = "Agricultor",
  skin = "terracota",
  mode: State["mode"] = "historia",
  seed = "",
): State {
  return {
    appearance: starter(seed, skin),
    owned: Object.values(starter(seed, skin)).filter((id) =>
      catalog.some((c) => c.id === id),
    ),
    production: initialProduction(),
    version: 0,
    delivery: null,
    pickups: {},
    routineAt: 0,
    meals: [],
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
  cosmetic?: string;
  name?: string;
  activity?: string;
  tone?: string;
  gender?: "homem" | "mulher";
  target?: number;
  item?: Item;
  quantity?: number;
  x?: number;
  y?: number;
  location?: string;
};
export function restore(saved: State): State {
  const s = structuredClone(saved);
  s.appearance ??= starter("", s.skin);
  s.appearance.gender ??= "homem";
  s.owned ??= Object.values(s.appearance).filter((id) =>
    catalog.some((c) => c.id === id),
  );
  s.inventory.ovo ??= 0;
  s.inventory.racao ??= 2;
  s.coopDay ??= 0;
  s.contributed ??= 0;
  s.delivery ??= null;
  s.pickups ??= {};
  s.routineAt ??= 0;
  s.meals ??= [];
  s.production ??= initialProduction(s.pickups);
  while (s.trees.length < 10) s.trees.push(0);
  while (s.plots.length < 10) s.plots.push({ planted: -2, watered: true });
  if (s.family[1]) s.family[1].name = "Mãe Rosa";
  if (s.family[2]) s.family[2].name = "Pai João";
  return s;
}
export const isNight = (s: State) => s.minute >= 1140;
export const WATER_CAPACITY = 500;
export function act(s: State, a: Action, now = Date.now()): State {
  s = restore(s);
  let needsAdvanced = false;
  const legacy: Record<string, Action> = {
    harvest: { kind: "pickup", item: "caju" },
    crop: { kind: "pickup", item: "feijao" },
    poultry: { kind: "tend", item: "ovo", activity: "feed" },
    plant: { kind: "tend", item: "feijao", activity: "plant" },
    water: { kind: "tend", item: "feijao", activity: "water" },
    expand: { kind: "tend", item: "caju", activity: "plant" },
  };
  if (legacy[a.kind]) a = { ...a, ...legacy[a.kind] };
  if (s.delivery && s.delivery.deadline <= now) s.delivery = null;
  const work = [
    "tend",
    "pickup",
    "harvest",
    "poultry",
    "crop",
    "plant",
    "water",
    "separate",
    "expand",
  ].includes(a.kind);
  const closed = work || ["trade", "deliver", "hat", "refill"].includes(a.kind);
  if (closed && !s.family[0].alive)
    throw Error("Sua jornada terminou. Recomece o dia.");
  if (closed && isNight(s))
    throw Error(
      "Fechado durante a noite. Descanse em casa e volte ao amanhecer.",
    );
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
  if (a.kind === "rename") {
    const name = a.name?.trim();
    if (
      !name ||
      name.length < 2 ||
      name.length > 30 ||
      /[<>\x00-\x1f]/.test(name)
    )
      throw Error("Use um nome de 2 a 30 caracteres, sem símbolos especiais.");
    s.name = name;
    s.family[0].name = name;
  } else if (a.kind === "tend") {
    if (!a.item || !(a.item in sectors)) throw Error("Setor inválido.");
    const item = a.item as Produce,
      i = a.target ?? 0,
      p = s.production[item][i];
    if (!p) throw Error("Local inválido.");
    near(sectors[item][i], 125);
    if (p.readyAt)
      throw Error("Aguarde e recolha a produção antes de cuidar novamente.");
    if (a.activity === "prepare" && item !== "ovo") {
      if (p.prepared) throw Error("Terra já preparada.");
      spend(3);
      p.prepared = true;
    } else if (a.activity === "plant" && item !== "ovo") {
      if (!p.prepared) throw Error("Prepare a terra primeiro.");
      if (item === "feijao" && p.planted) throw Error("Canteiro ocupado.");
      const supply = item === "caju" ? "muda" : "semente";
      if (!s.inventory[supply])
        throw Error("Compre sementes ou mudas no armazém.");
      spend(3);
      s.inventory[supply]--;
      p.planted = true;
      p.young = item === "caju";
      p.watered = false;
      done("plantar");
    } else if (a.activity === "water") {
      if (p.watered) throw Error("Já tem água suficiente.");
      if (item !== "ovo" && (!p.prepared || !p.planted))
        throw Error("Prepare e plante antes de regar.");
      const liters = item === "caju" ? 3 : 1;
      if (s.water < liters) throw Error("Reabasteça a cisterna.");
      spend(1);
      s.water -= liters;
      p.watered = true;
    } else if (a.activity === "feed" && item === "ovo") {
      if (p.fed) throw Error("Galinhas já alimentadas.");
      if (!s.inventory.racao)
        throw Error("Compre uma porção de ração com Dona Lúcia.");
      spend(2);
      s.inventory.racao--;
      p.fed = true;
      done("galinhas");
    } else if (a.activity === "clean" && item === "ovo") {
      if (p.clean) throw Error("Galinheiro já limpo.");
      spend(2);
      p.clean = true;
    } else throw Error("Cuidado inválido para este setor.");
    const cared =
      item === "ovo"
        ? p.fed && p.watered && p.clean
        : p.prepared && p.planted && p.watered;
    if (cared)
      p.readyAt = now + (p.young ? 240000 : item === "ovo" ? 60000 : REGROW_MS);
  } else if (a.kind === "routine") {
    const elapsed = now - s.routineAt;
    // No offline loss: only continuous active play advances the routine.
    if (
      s.routineAt &&
      elapsed >= 15000 &&
      elapsed <= 60000 &&
      s.family[0].alive
    ) {
      const steps = Math.floor(elapsed / 15000);
      needsAdvanced = true;
      s.minute = Math.min(1320, s.minute + steps * 10);
      s.family[0].thirst = Math.max(0, s.family[0].thirst - steps * 2);
      s.family[0].hunger = Math.max(0, s.family[0].hunger - steps);
      s.routineAt += steps * 15000;
    } else if (!s.routineAt || elapsed > 60000) s.routineAt = now;
  } else if (a.kind === "restartDay") {
    if (s.family[0].alive) throw Error("Sua jornada continua.");
    Object.assign(s.family[0], {
      alive: true,
      health: 100,
      thirst: 90,
      hunger: 85,
    });
    s.minute = 420;
    s.energy = 100;
    s.location = "home";
    s.x = 620;
    s.y = 480;
    s.delivery = null;
    s.meals = [];
    s.routineAt = now;
  } else if (a.kind === "drinkMother" || a.kind === "meal") {
    near(points.family, 125);
    if (!s.family[0].alive) throw Error("Recomece o dia para continuar.");
    if (a.kind === "drinkMother") {
      if (s.water < 1) throw Error("A reserva acabou. Reabasteça a cisterna.");
      s.water--;
      s.family[0].thirst = 100;
    } else {
      const meal = a.target ?? -1,
        names = ["Merenda", "Almoço", "Jantar"],
        hours = [540, 720, 1020];
      if (!names[meal]) throw Error("Refeição inválida.");
      if (s.minute < hours[meal])
        throw Error("Ainda não chegou a hora desta refeição.");
      if (s.meals.includes(names[meal]))
        throw Error("Você já fez esta refeição hoje.");
      s.meals.push(names[meal]);
      s.family[0].hunger = 100;
      s.energy = Math.min(100, s.energy + 25);
      if (meal === 2) s.minute = 1140;
    }
  } else if (a.kind === "appearance") {
    if (a.gender !== undefined) {
      if (!["homem", "mulher"].includes(a.gender))
        throw Error("Personagem inválido.");
      s.appearance.gender = a.gender;
    }
    if (a.tone !== undefined) {
      if (!tones.includes(a.tone)) throw Error("Tom de pele inválido.");
      s.appearance.tone = a.tone;
    }
    if (a.cosmetic !== undefined) {
      const item = catalog.find((item) => item.id === a.cosmetic);
      if (!item) throw Error("Visual inválido.");
      if (!s.owned.includes(item.id)) {
        if (s.money < item.price)
          throw Error("Saldo insuficiente para este visual.");
        s.money -= item.price;
        s.owned.push(item.id);
        if (item.price)
          s.transactions.push({
            day: s.day,
            description: item.name,
            amount: -item.price,
          });
      }
      s.appearance[item.slot] = item.id;
    }
  } else if (a.kind === "pickup") {
    if (!a.item || !(a.item in sectors)) throw Error("Produto inválido.");
    const item = a.item as Produce,
      i = a.target ?? -1,
      p = sectors[item][i];
    if (!p) throw Error("Ponto de coleta inválido.");
    near(p, 42);
    const field = s.production[item][i];
    if (!field.readyAt || field.readyAt > now)
      throw Error(
        "Aguarde a produção e cuide deste local: " +
          productionStatus(s, item, i, now),
      );
    const key = `${item}:${i}`;
    if (s.delivery && s.delivery.item !== item)
      throw Error("Entregue a carga atual antes de pegar outro produto.");
    if (s.delivery && s.delivery.quantity >= 30)
      throw Error("Carga cheia. Vá ao comprador.");
    s.delivery = {
      item,
      quantity: (s.delivery?.quantity || 0) + (item === "feijao" ? 1 : 3),
      deadline: s.delivery?.deadline ?? now + DELIVERY_MS,
    };
    s.pickups[key] = now + REGROW_MS;
    s.production[item][i] = {
      planted: item !== "feijao",
      prepared: false,
      watered: false,
      fed: false,
      clean: false,
      readyAt: 0,
      young: false,
    };
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
    if (d.item === "caju")
      s.inventory.castanha += d.quantity - (d.separated || 0);
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
  } else if (a.kind === "separate") {
    near(points.bench);
    if (s.delivery?.item === "caju") {
      const n = s.delivery.quantity - (s.delivery.separated || 0);
      if (!n) throw Error("Castanhas já separadas.");
      s.inventory.castanha += n;
      s.delivery.separated = s.delivery.quantity;
    } else {
      if (!s.inventory.caju) throw Error("Recolha cajus primeiro.");
      const n = Math.min(6, s.inventory.caju);
      s.inventory.caju -= n;
      s.inventory.castanha += n;
    }
    spend(3);
    done("separar");
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
    s.water = Math.min(WATER_CAPACITY, s.water + 50);
  } else if (a.kind === "hat") {
    near(points.market);
    if (s.hat) throw Error("Você já tem esse chapéu.");
    if (s.money < 25) throw Error("Dinheiro insuficiente.");
    s.money -= 25;
    s.hat = true;
    done("investir");
  } else if (a.kind === "sleep") {
    if (s.location !== "home") throw Error("Volte para casa para descansar.");
    s.day++;
    s.meals = [];
    s.routineAt = now;
    s.minute = 420;
    s.energy = 100;
    s.rain = s.day % 4 === 0;
    if (s.rain) {
      s.water = Math.min(WATER_CAPACITY, s.water + 35);
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
  if (work) {
    s.minute = Math.min(1320, s.minute + 15);
    s.energy = Math.max(0, s.energy - 2);
    s.family[0].thirst = Math.max(0, s.family[0].thirst - 6);
    s.family[0].hunger = Math.max(0, s.family[0].hunger - 3);
  }
  if (
    (work || needsAdvanced) &&
    (s.family[0].thirst === 0 || s.family[0].hunger === 0)
  ) {
    s.family[0].health = Math.max(0, s.family[0].health - 20);
    if (!s.family[0].health) {
      s.family[0].alive = false;
      s.delivery = null;
    }
  }
  s.money = Math.round(s.money * 100) / 100;
  s.transactions.forEach((t) => (t.amount = Math.round(t.amount * 100) / 100));
  s.version++;
  s.transactions = s.transactions.slice(-100);
  return s;
}
