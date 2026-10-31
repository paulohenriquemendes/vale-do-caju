import Phaser from "phaser";
import { paintLandscape, paintAvatar, paintNpc } from "./art";
export type Member = {
  id: string;
  name: string;
  skin: string;
  hat: boolean;
  x: number;
  y: number;
  location: string;
  role: string;
};
import { points, type State } from "../shared/game";
export let scene: World | undefined;
export const stick = { x: 0, y: 0 };
export let paused = false;
export function setPaused(v: boolean) {
  paused = v;
  stick.x = stick.y = 0;
}
export class World extends Phaser.Scene {
  state!: State;
  player!: Phaser.GameObjects.Container;
  body!: Phaser.GameObjects.Image;
  relatives = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      body: Phaser.GameObjects.Image;
      label: Phaser.GameObjects.Text;
      member: Member;
    }
  >();
  treasury = 0;
  map!: Phaser.GameObjects.Container;
  shadow!: Phaser.GameObjects.Ellipse;
  keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  direction = 0;
  step = 0;
  obstacles: Phaser.Geom.Rectangle[] = [];
  onPosition: (x: number, y: number) => void = () => {};
  onContext: (s: string) => void = () => {};
  lastContext = "";
  weather!: Phaser.GameObjects.Graphics;
  cloud!: Phaser.GameObjects.Rectangle;
  constructor() {
    super("vale");
  }
  create() {
    scene = this;
    this.keys = this.input.keyboard!.createCursorKeys();
    this.cameras.main.setBackgroundColor("#789a55");
    this.map = this.add.container(0, 0);
    this.drawMap();
    this.shadow = this.add.ellipse(0, 0, 25, 10, 0x33442c, 0.25);
    this.body = this.add
      .image(0, 0, this.avatarTexture(this.state.skin, 0, 0, this.state.hat))
      .setDisplaySize(64, 80)
      .setOrigin(0.5, 0.8375);
    this.player = this.add
      .container(this.state.x, this.state.y, [this.body])
      .setDepth(2000);
    const name = this.add
      .text(0, -68, this.state.name + " · você", {
        fontFamily: "DM Sans",
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#365f4ed9",
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5);
    this.player.add(name);
    this.paintPlayer();
    this.weather = this.add.graphics().setDepth(3000).setScrollFactor(0);
    this.cloud = this.add
      .rectangle(0, 0, 3000, 2000, 0x152442, 0)
      .setOrigin(0)
      .setDepth(2900)
      .setScrollFactor(0);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.scale.on("resize", () => this.resize());
    this.resize();
    this.input.keyboard!.on("keydown-E", () => {
      if (!paused) document.getElementById("interact")?.click();
    });
    this.input.keyboard!.on("keydown-I", () => {
      if (!paused) document.getElementById("inventory")?.click();
    });
    this.events.once("shutdown", () => {
      if (scene === this) scene = undefined;
    });
  }
  resize() {
    const w = this.scale.width,
      h = this.scale.height;
    this.cameras.main.setZoom(w < 600 ? 1.05 : h < 500 ? 1.1 : 1.35);
    this.cameras.main.setBounds(0, 0, 1280, 800);
  }
  avatarTexture(skin: string, dir: number, frame: number, hat: boolean) {
    const key = `person-${skin}-${dir}-${frame}-${hat}`;
    if (!this.textures.exists(key)) {
      const t = this.textures.createCanvas(key, 128, 160)!;
      paintAvatar(
        t.canvas,
        (
          { terracota: "#d5906b", azul: "#709bac", verde: "#91a878" } as Record<
            string,
            string
          >
        )[skin] || "#d5906b",
        dir,
        frame,
        hat,
      );
      t.refresh();
    }
    return key;
  }
  drawMap() {
    this.map.removeAll(true);
    if (this.textures.exists("landscape")) this.textures.remove("landscape");
    const texture = this.textures.createCanvas("landscape", 2560, 1600)!;
    paintLandscape(texture.canvas, this.state, this.treasury);
    texture.refresh();
    this.map.add(
      this.add.image(0, 0, "landscape").setOrigin(0).setDisplaySize(1280, 800),
    );
    this.obstacles = [];
    if (this.state.location === "farm") {
      this.obstacles = [
        new Phaser.Geom.Rectangle(112, 89, 220, 151),
        new Phaser.Geom.Rectangle(87, 384, 140, 112),
        new Phaser.Geom.Rectangle(382, 158, 70, 65),
        new Phaser.Geom.Rectangle(1065, 99, 174, 156),
        new Phaser.Geom.Rectangle(1030, 490, 160, 140),
        ...points.trees.map(
          (p) => new Phaser.Geom.Rectangle(p.x - 55, p.y - 120, 108, 116),
        ),
      ];
      this.npc(
        points.family.x,
        points.family.y,
        "terracota",
        "Mãe Rosa",
        false,
      );
      this.npc(points.teen.x, points.teen.y, "azul", "Pai João", true);
      this.npc(
        points.market.x,
        points.market.y,
        "verde",
        "Seu Zé · armazém",
        true,
      );
      this.npc(
        points.eggBuyer.x,
        points.eggBuyer.y,
        "verde",
        "Dona Lúcia · compra ovos",
        false,
      );
      this.npc(
        points.fruitBuyer.x,
        points.fruitBuyer.y,
        "azul",
        "Bento · compra caju",
        true,
      );
      this.npc(
        points.cropBuyer.x,
        points.cropBuyer.y,
        "terracota",
        "Ana · compra feijão",
        false,
      );
    }
  }
  npc(x: number, y: number, skin: string, name: string, hat: boolean) {
    const index = name.startsWith("Mãe")
      ? 0
      : name.startsWith("Pai")
        ? 1
        : name.startsWith("Dona")
          ? 2
          : name.startsWith("Bento")
            ? 3
            : name.startsWith("Ana")
              ? 4
              : 5;
    const key = "npc-retro-" + index;
    if (!this.textures.exists(key)) {
      const t = this.textures.createCanvas(key, 128, 160)!;
      paintNpc(t.canvas, index);
      t.refresh();
    }
    this.map.add(
      this.add.image(x, y, key).setDisplaySize(64, 80).setOrigin(0.5, 0.8375),
    );
    this.map.add(
      this.add
        .text(x, y - 65, name, {
          fontFamily: "DM Sans",
          fontSize: "11px",
          color: "#344d3c",
          backgroundColor: "#fff9eaeF",
          padding: { x: 7, y: 4 },
        })
        .setOrigin(0.5),
    );
  }
  paintPlayer() {
    this.body.setTexture(
      this.avatarTexture(
        this.state.skin,
        this.direction,
        Math.floor(this.step) % 4,
        this.state.hat,
      ),
    );
  }
  updateFamily(members: Member[], ownId: string, treasury: number) {
    if (this.treasury >= 300 !== treasury >= 300) {
      this.treasury = treasury;
      this.drawMap();
    } else this.treasury = treasury;
    const visible = new Set<string>();
    const titles: Record<string, string> = {
      livre: "explorando",
      galinheiro: "galinheiro",
      pomar: "pomar",
      rocado: "horta",
      agua: "água",
    };
    for (const m of members) {
      if (m.id === ownId) continue;
      visible.add(m.id);
      let other = this.relatives.get(m.id);
      if (!other) {
        const body = this.add
          .image(0, 0, this.avatarTexture(m.skin, 0, 0, m.hat))
          .setDisplaySize(64, 80)
          .setOrigin(0.5, 0.8375);
        const label = this.add
          .text(0, -70, "", {
            fontFamily: "DM Sans",
            fontSize: "11px",
            color: "#fffaf0",
            backgroundColor: "#517a65",
            align: "center",
            padding: { x: 7, y: 4 },
          })
          .setOrigin(0.5);
        const container = this.add
          .container(m.x, m.y, [body, label])
          .setDepth(1900);
        other = { container, body, label, member: m };
        this.relatives.set(m.id, other);
      }
      other.member = m;
      other.label.setText(m.name + " · irmão\n" + titles[m.role]);
      other.container.setVisible(m.location === this.state.location);
    }
    for (const [id, other] of this.relatives)
      if (!visible.has(id)) {
        other.container.destroy();
        this.relatives.delete(id);
      }
  }
  context() {
    if (this.state.location === "home")
      return this.player.y > 510 ? "Sair" : "Descansar";
    const p = this.player;
    let nearest = "Explorar",
      d = 100;
    const options: [string, { x: number; y: number }][] = [
      ["Entrar", points.home],
      ["Conversar", points.family],
      ["Conversar", points.teen],
      ["Água", points.cistern],
      ["Feira", points.market],
      ["Separar", points.bench],
      ["Cultivar", points.plots],
      ["Galinheiro", points.coop],
      ["Vender ovos", points.eggBuyer],
      ["Vender caju", points.fruitBuyer],
      ["Vender feijão", points.cropBuyer],
      ...points.trees.map(
        (t) => ["Colher", t] as [string, { x: number; y: number }],
      ),
    ];
    for (const [name, t] of options) {
      const n = Math.hypot(p.x - t.x, p.y - t.y);
      if (n < d) {
        nearest = name;
        d = n;
      }
    }
    return nearest;
  }
  update(_t: number, delta: number) {
    for (const other of this.relatives.values()) {
      const dx = other.member.x - other.container.x,
        dy = other.member.y - other.container.y;
      other.container.x += dx * Math.min(1, delta / 120);
      other.container.y += dy * Math.min(1, delta / 120);
      const dir =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0;
      other.body.setTexture(
        this.avatarTexture(
          other.member.skin,
          dir,
          Math.hypot(dx, dy) > 2 ? Math.floor(_t / 150) % 4 : 0,
          other.member.hat,
        ),
      );
    }
    if (!this.player || paused) return;
    let dx = stick.x,
      dy = stick.y;
    if (this.keys.left.isDown) dx = -1;
    if (this.keys.right.isDown) dx = 1;
    if (this.keys.up.isDown) dy = -1;
    if (this.keys.down.isDown) dy = 1;
    if (Math.abs(dx) > Math.abs(dy)) dy = 0;
    else dx = 0;
    const moving = dx || dy;
    if (moving) {
      this.direction = dx < 0 ? 1 : dx > 0 ? 2 : dy < 0 ? 3 : 0;
      const speed = (125 * Math.min(delta, 40)) / 1000;
      const nx = this.player.x + dx * speed,
        ny = this.player.y + dy * speed;
      const inside =
        this.state.location === "home"
          ? nx > 440 && nx < 840 && ny > 260 && ny < 555
          : nx > 55 && nx < 1220 && ny > 115 && ny < 760;
      const blocked = this.obstacles.some((r) => r.contains(nx, ny));
      if (inside && !blocked) {
        this.player.setPosition(nx, ny);
        this.onPosition(nx, ny);
      }
      this.step += delta * 0.009;
      this.paintPlayer();
    }
    const ctx = this.context();
    if (ctx !== this.lastContext) {
      this.lastContext = ctx;
      this.onContext(ctx);
    }
    this.weather.clear();
    if (this.state.rain) {
      this.weather.lineStyle(1, 0xd3e6db, 0.5);
      for (let i = 0; i < 50; i++) {
        const x = (i * 79 + _t * 0.04) % this.scale.width,
          y = (i * 47 + _t * 0.3) % this.scale.height;
        this.weather.lineBetween(x, y, x - 4, y + 10);
      }
    }
    this.cloud.setAlpha(
      (this.state.minute || 420) >= 1080
        ? 0.3
        : (this.state.minute || 420) >= 1020
          ? 0.15
          : 0,
    );
  }
  sync(s: State) {
    const changed = s.location !== this.state.location;
    const redraw =
      changed ||
      s.day !== this.state.day ||
      JSON.stringify([s.trees, s.plots, s.decisions]) !==
        JSON.stringify([
          this.state.trees,
          this.state.plots,
          this.state.decisions,
        ]);
    this.state = s;
    if (redraw) this.drawMap();
    if (changed) this.player.setPosition(s.x, s.y);
    this.paintPlayer();
  }
}
export function startWorld(
  parent: string,
  state: State,
  onPosition: (x: number, y: number) => void,
  onContext: (s: string) => void,
) {
  const world = new World();
  world.state = state;
  world.onPosition = onPosition;
  world.onContext = onContext;
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#8eab62",
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: world,
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: "low-power" },
  });
}
