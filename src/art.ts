export const artSources: {
  farm?: HTMLImageElement;
  hero?: HTMLImageElement;
  npcs?: HTMLImageElement;
} = {};
let loading: Promise<void> | undefined;
export function loadArtwork(progress: (value: number) => void = () => {}) {
  if (!loading)
    loading = Promise.all(
      (
        Object.entries({
          farm: "/assets/farm-retro.png",
          hero: "/assets/farmer-retro.png",
          npcs: "/assets/family-retro.png",
        }) as [keyof typeof artSources, string][]
      ).map(
        ([key, url], i) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              artSources[key] = img;
              progress(Object.keys(artSources).length / 3);
              resolve();
            };
            img.onerror = () =>
              reject(
                Error("Não foi possível carregar a arte. Recarregue a página."),
              );
            img.src = url;
          }),
      ),
    )
      .then(() => {})
      .catch((e) => {
        loading = undefined;
        throw e;
      });
  return loading;
}
import type { State } from "../shared/game";

// Original resolution-independent artwork, baked to a texture to keep rendering cheap.
type C = CanvasRenderingContext2D;
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function box(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 0,
) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function line(c: C, points: number[][], color: string, width: number) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
function shadow(c: C, x: number, y: number, rx: number, ry: number) {
  const g = c.createRadialGradient(x, y, 1, x, y, rx);
  g.addColorStop(0, "#263c3440");
  g.addColorStop(1, "#263c3400");
  ellipse(c, x, y, rx, ry, g as unknown as string);
}
function tree(c: C, x: number, y: number, fruit: boolean, seed: number) {
  shadow(c, x + 17, y + 8, 64, 23);
  line(
    c,
    [
      [x, y + 5],
      [x - 3, y - 40],
      [x - 20, y - 57],
    ],
    "#5b4737",
    12,
  );
  line(
    c,
    [
      [x - 2, y - 30],
      [x + 19, y - 53],
    ],
    "#745b3b",
    7,
  );
  line(
    c,
    [
      [x - 3, y],
      [x - 7, y - 33],
    ],
    "#aa8860",
    3,
  );
  const clusters = [
    [-27, -46, 28, 22],
    [26, -45, 30, 23],
    [0, -61, 35, 28],
    [-18, -68, 24, 22],
    [20, -68, 26, 23],
    [0, -40, 35, 22],
  ];
  for (const [dx, dy, rx, ry] of clusters) {
    const g = c.createRadialGradient(
      x + dx - 9,
      y + dy - 12,
      1,
      x + dx,
      y + dy,
      rx,
    );
    g.addColorStop(0, "#91aa60");
    g.addColorStop(0.45, "#5c854a");
    g.addColorStop(1, "#2f5940");
    ellipse(c, x + dx, y + dy, rx, ry, g as unknown as string);
  }
  for (let i = 0; i < 85; i++) {
    const a = i * 2.399 + seed,
      r = Math.sqrt((i % 23) / 23) * 44;
    const px = x + Math.cos(a) * r,
      py = y - 56 + Math.sin(a) * r * 0.58;
    ellipse(c, px, py, 3.5, 1.8, i % 3 ? "#a9bb6d42" : "#244f3b4d");
  }
  if (fruit)
    for (const [dx, dy] of [
      [-27, -48],
      [21, -42],
      [-8, -66],
      [33, -60],
      [-7, -33],
      [9, -52],
    ]) {
      ellipse(c, x + dx, y + dy, 3.2, 4.8, "#efb94c");
      ellipse(c, x + dx + 1, y + dy + 4.6, 1.8, 2, "#825c3a");
      ellipse(c, x + dx - 0.8, y + dy - 1, 1, 2, "#ffe6a0");
    }
}
function house(c: C, x: number, y: number, w: number, h: number) {
  shadow(c, x + w * 0.55, y + h + 8, w * 0.7, 24);
  box(c, x + 8, y + 35, w, h - 33, "#ebd7af", 3);
  box(c, x + w - 15, y + 38, 23, h - 35, "#c6ac83");
  box(c, x + 4, y + h - 8, w + 8, 13, "#bda784", 3);
  const wall = c.createLinearGradient(0, y + 40, 0, y + h);
  wall.addColorStop(0, "#c8b38a");
  wall.addColorStop(0.35, "#f6e8ca");
  wall.addColorStop(1, "#e6cfa6");
  box(c, x + 8, y + 40, w - 15, h - 48, wall as unknown as string);
  for (const dx of [22, w - 56]) {
    box(c, x + dx, y + h - 56, 30, 32, "#79684f", 3);
    box(c, x + dx + 3, y + h - 53, 24, 26, "#7c9e9a", 2);
    line(
      c,
      [
        [x + dx + 15, y + h - 53],
        [x + dx + 15, y + h - 28],
      ],
      "#eee5c9",
      2,
    );
    line(
      c,
      [
        [x + dx + 3, y + h - 40],
        [x + dx + 27, y + h - 40],
      ],
      "#eee5c9",
      2,
    );
    box(c, x + dx - 3, y + h - 23, 36, 5, "#a68d67", 2);
  }
  box(c, x + w * 0.5 - 14, y + h - 53, 28, 47, "#5a5145", 3);
  box(c, x + w * 0.5 - 11, y + h - 50, 22, 44, "#6e7c6a", 2);
  line(
    c,
    [
      [x + w * 0.5, y + h - 48],
      [x + w * 0.5, y + h - 9],
    ],
    "#889680",
    1,
  );
  ellipse(c, x + w * 0.5 + 7, y + h - 29, 1.6, 1.6, "#e1bf76");
  c.beginPath();
  c.moveTo(x - 8, y + 45);
  c.lineTo(x + 20, y - 12);
  c.lineTo(x + w - 20, y - 12);
  c.lineTo(x + w + 13, y + 45);
  c.closePath();
  const roof = c.createLinearGradient(0, y - 12, 0, y + 45);
  roof.addColorStop(0, "#cf8c65");
  roof.addColorStop(0.45, "#b46b4f");
  roof.addColorStop(1, "#8e4b3c");
  c.fillStyle = roof;
  c.fill();
  c.save();
  c.clip();
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < w / 11 + 4; col++) {
      const px = x - 15 + col * 12 + (row % 2) * 6,
        py = y - 8 + row * 9;
      c.strokeStyle = "#edb18a66";
      c.lineWidth = 1.1;
      c.beginPath();
      c.ellipse(px, py, 5, 4, 0, 0, Math.PI);
      c.stroke();
    }
  }
  c.restore();
  line(
    c,
    [
      [x - 8, y + 45],
      [x + w + 13, y + 45],
    ],
    "#734936",
    4,
  );
  line(
    c,
    [
      [x + 20, y - 12],
      [x + w - 20, y - 12],
    ],
    "#e0a17a",
    5,
  );
  for (const px of [x + 17, x + w - 18]) {
    ellipse(c, px, y + h + 1, 8, 4, "#855b40");
    box(c, px - 6, y + h - 10, 12, 10, "#ad7955", 2);
    ellipse(c, px, y + h - 14, 10, 8, "#49744d");
    ellipse(c, px - 4, y + h - 17, 3, 3, "#dcb68c");
  }
}
function fence(c: C, x: number, y: number, w: number) {
  line(
    c,
    [
      [x, y - 10],
      [x + w, y - 10],
    ],
    "#ac956a",
    3,
  );
  line(
    c,
    [
      [x, y - 2],
      [x + w, y - 2],
    ],
    "#c1ac83",
    3,
  );
  for (let i = 0; i <= w; i += 24) {
    box(c, x + i - 2, y - 18, 4, 24, "#c6b18b", 1);
    box(c, x + i - 2, y - 18, 1, 24, "#f1dfb6");
  }
}
function sign(c: C, x: number, y: number, title: string, sub?: string) {
  c.font = "600 12px Outfit, sans-serif";
  const w = Math.max(
    c.measureText(title).width + 28,
    sub ? c.measureText(sub).width + 26 : 0,
  );
  shadow(c, x, y + 15, w * 0.6, 10);
  box(c, x - w / 2, y - 14, w, sub ? 39 : 26, "#fff9eaeF", 8);
  c.textAlign = "center";
  c.fillStyle = "#354e40";
  c.fillText(title, x, y + 3);
  if (sub) {
    c.font = '10px "DM Sans",sans-serif';
    c.fillStyle = "#7b8367";
    c.fillText(sub, x, y + 17);
  }
}
function stall(c: C, x: number, y: number, color: string) {
  shadow(c, x + 4, y + 16, 38, 11);
  box(c, x - 30, y - 25, 60, 35, "#ac8257", 3);
  box(c, x - 32, y - 29, 64, 7, "#d9b987", 2);
  for (const dx of [-28, 28]) box(c, x + dx, y - 61, 3, 40, "#806c4d");
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - 32, y - 61);
  c.lineTo(x + 32, y - 61);
  c.lineTo(x + 39, y - 42);
  c.lineTo(x - 39, y - 42);
  c.closePath();
  c.fill();
  for (let i = 0; i < 6; i++)
    box(c, x - 35 + i * 13, y - 42, 13, 7, i % 2 ? "#faf0d5" : color, 3);
  for (let i = 0; i < 7; i++)
    ellipse(c, x - 22 + i * 7, y - 28, 3.5, 3, i % 2 ? "#e4b25f" : "#91a76c");
}
function hen(c: C, x: number, y: number, i: number) {
  shadow(c, x, y + 5, 9, 4);
  ellipse(c, x, y, 7, 5, i % 2 ? "#ece6d3" : "#bd8c59");
  ellipse(c, x + 6, y - 4, 3.8, 4, "#f2ead7");
  ellipse(c, x + 6, y - 8, 2.5, 2, "#b95a44");
  line(
    c,
    [
      [x + 9, y - 4],
      [x + 12, y - 3],
    ],
    "#d4a14e",
    2,
  );
  line(
    c,
    [
      [x - 3, y + 5],
      [x - 4, y + 8],
    ],
    "#c19657",
    1,
  );
  ellipse(c, x + 7, y - 5, 0.8, 0.8, "#34352b");
}

export function paintLandscape(
  canvas: HTMLCanvasElement,
  s: State,
  treasury = 0,
) {
  const c = canvas.getContext("2d")!;
  canvas.width = 2560;
  canvas.height = 1600;
  c.scale(2, 2);
  if (s.location === "home") {
    box(c, 0, 0, 1280, 800, "#233b36");
    box(c, 410, 210, 460, 370, "#b18b63", 12);
    for (let y = 240; y < 575; y += 22) {
      box(c, 420, y, 440, 20, y % 44 ? "#d5b58a" : "#cfac80");
      line(
        c,
        [
          [420, y + 21],
          [860, y + 21],
        ],
        "#9a7c55",
        1,
      );
    }
    box(c, 410, 200, 460, 46, "#f1e4c8", 8);
    box(c, 410, 230, 15, 340, "#f1e4c8");
    box(c, 855, 230, 15, 340, "#c4ae89");
    box(c, 465, 270, 90, 130, "#815c40", 5);
    box(c, 470, 275, 80, 120, "#f1e5cd", 6);
    box(c, 470, 310, 80, 85, "#789a85", 5);
    box(c, 480, 280, 60, 24, "#fff8eb", 8);
    box(c, 690, 288, 90, 55, "#9c7450", 8);
    ellipse(c, 735, 310, 16, 10, "#e9d8b0");
    box(c, 590, 405, 130, 80, "#bc8d65", 6);
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [605 + i * 29, 410],
          [605 + i * 29, 479],
        ],
        "#d2a379",
        2,
      );
    sign(c, 640, 232, "Nossa casa");
    sign(c, 505, 430, "Descansar");
    sign(c, 625, 554, "Sair para o sítio");
    return;
  }
  if (artSources.farm) {
    paintRetroFarm(c, s, treasury);
    return;
  }
  let seed = 2701;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const ground = c.createLinearGradient(0, 0, 1280, 800);
  ground.addColorStop(0, "#adb783");
  ground.addColorStop(0.4, "#b6bc88");
  ground.addColorStop(1, "#b5ad7a");
  box(c, 0, 0, 1280, 800, ground as unknown as string);
  for (let i = 0; i < 450; i++) {
    const x = rand() * 1280,
      y = rand() * 800;
    const g = c.createRadialGradient(x, y, 0, x, y, 35 + rand() * 55);
    g.addColorStop(0, i % 3 ? "#66855513" : "#ded3a422");
    g.addColorStop(1, "#b9c49200");
    ellipse(c, x, y, 75, 40, g as unknown as string);
  }
  const paths = [
    [
      [0, 312],
      [255, 310],
      [580, 318],
      [1020, 315],
      [1280, 310],
    ],
    [
      [290, 245],
      [302, 450],
      [318, 800],
    ],
    [
      [605, 320],
      [600, 480],
      [610, 800],
    ],
    [
      [1030, 310],
      [1000, 490],
      [1010, 800],
    ],
    [
      [187, 498],
      [300, 500],
      [600, 585],
      [890, 620],
    ],
  ];
  for (const p of paths) {
    line(c, p, "#9d956535", 69);
    line(c, p, "#d6bf94", 60);
    line(c, p, "#dfc9a2", 43);
    line(c, p, "#e8d3ad55", 27);
  }
  for (let i = 0; i < 11000; i++) {
    const x = rand() * 1280,
      y = rand() * 800;
    ellipse(
      c,
      x,
      y,
      0.35 + rand() * 0.8,
      0.3 + rand() * 0.5,
      i % 2 ? "#fff2cd20" : "#495b3421",
    );
  }
  for (let i = 0; i < 1100; i++) {
    const x = rand() * 1280,
      y = rand() * 800;
    if (
      Math.abs(y - 314) < 40 ||
      Math.abs(x - 300) < 40 ||
      Math.abs(x - 605) < 35 ||
      Math.abs(x - 1015) < 35
    )
      continue;
    line(
      c,
      [
        [x - 2, y],
        [x, y - 3],
        [x + 1, y],
      ],
      i % 3 ? "#798e5a65" : "#e1d5a666",
      0.8,
    );
  }
  fence(c, 45, 100, 1180);
  fence(c, 45, 750, 205);
  fence(c, 360, 750, 200);
  fence(c, 670, 750, 300);
  fence(c, 1060, 750, 170);
  // Main home, water reservoir and shaded front yard.
  house(c, 150, 140, 180, 110);
  sign(c, 240, 108, "Sítio Boa Esperança");
  shadow(c, 416, 257, 37, 12);
  box(c, 385, 210, 55, 47, "#a1b2a5", 8);
  ellipse(c, 412, 250, 27, 9, "#8a9e95");
  box(c, 385, 218, 55, 29, "#bdc9b9");
  ellipse(c, 412, 214, 29, 10, "#d5dfcf");
  ellipse(c, 412, 214, 22, 6, "#6c9598");
  ellipse(c, 407, 212, 14, 2, "#c0d9d2");
  line(
    c,
    [
      [437, 234],
      [448, 234],
      [448, 242],
    ],
    "#7c8980",
    3,
  );
  sign(c, 415, 279, "Cisterna", "Água para todos");
  // Coop with woven fence, recognizable birds and nearby egg buyer.
  house(c, 119, 411, 112, 72);
  box(c, 127, 485, 118, 64, "#c5b38b", 8);
  for (let i = 0; i < 8; i++)
    hen(c, 143 + (i % 4) * 25, 504 + Math.floor(i / 4) * 25, i);
  fence(c, 125, 555, 122);
  for (let j = 0; j < 4; j++)
    line(
      c,
      [
        [125, 492 + j * 17],
        [125, 555],
      ],
      "#b3a27d",
      2,
    );
  sign(c, 183, 588, "Galinheiro", "Cuidar • recolher ovos");
  stall(c, 329, 455, "#7d9778");
  // Orchard and harvest workspace.
  for (const [i, p] of [
    { x: 700, y: 220 },
    { x: 840, y: 220 },
    { x: 700, y: 370 },
    { x: 840, y: 370 },
  ].entries())
    tree(c, p.x, p.y, !s.trees[i] || s.day - s.trees[i] >= 3, i);
  sign(c, 770, 116, "Pomar de cajueiros", "Colha os frutos maduros");
  stall(c, 957, 317, "#c28d54");
  shadow(c, 604, 365, 40, 12);
  box(c, 572, 344, 63, 24, "#9b7653", 4);
  box(c, 568, 340, 71, 8, "#c6a277", 3);
  for (let i = 0; i < 5; i++) ellipse(c, 579 + i * 9, 339, 3, 3, "#e9b75d");
  sign(c, 601, 401, "Bancada de castanhas");
  // Soil beds have depth, leaf clusters and irrigation furrows.
  for (let i = 0; i < 4; i++) {
    const x = 645 + (i % 2) * 93,
      y = 510 + Math.floor(i / 2) * 70;
    shadow(c, x + 42, y + 53, 47, 8);
    box(c, x, y, 81, 56, "#9a7956", 7);
    box(c, x + 3, y + 3, 75, 48, s.plots[i].watered ? "#775d42" : "#99734f", 5);
    for (let row = 0; row < 3; row++) {
      line(
        c,
        [
          [x + 9, y + 12 + row * 14],
          [x + 72, y + 12 + row * 14],
        ],
        "#b08c603f",
        3,
      );
      line(
        c,
        [
          [x + 9, y + 15 + row * 14],
          [x + 72, y + 15 + row * 14],
        ],
        "#4b3e302f",
        1,
      );
    }
    if (s.plots[i].planted)
      for (let k = 0; k < 6; k++) {
        const px = x + 16 + (k % 3) * 24,
          py = y + 16 + Math.floor(k / 3) * 22;
        line(
          c,
          [
            [px, py + 6],
            [px, py - 7],
          ],
          "#4e713d",
          2,
        );
        ellipse(c, px - 4, py - 1, 5, 2.5, "#71934a");
        ellipse(c, px + 4, py - 4, 5, 2.5, "#8cab58");
      }
  }
  sign(c, 728, 674, "Horta de feijão-de-corda", "Plantar • regar • colher");
  stall(c, 892, 552, "#8d9b72");
  if (s.decisions.includes("pomar")) {
    line(
      c,
      [
        [860, 570],
        [860, 551],
      ],
      "#8c6b45",
      3,
    );
    ellipse(c, 855, 549, 8, 4, "#64874b");
    ellipse(c, 864, 545, 9, 5, "#83a260");
  }
  stall(c, 1093, 235, "#bc765c");
  sign(c, 1093, 178, "Armazém do Seu Zé", "Sementes e suprimentos");
  // A shallow pond and surrounding reeds.
  shadow(c, 1095, 536, 84, 34);
  ellipse(c, 1092, 523, 77, 42, "#9b9f72");
  const water = c.createLinearGradient(0, 485, 0, 555);
  water.addColorStop(0, "#7daba5");
  water.addColorStop(1, "#b2c9b4");
  ellipse(c, 1092, 520, 68, 34, water as unknown as string);
  for (let i = 0; i < 12; i++)
    line(
      c,
      [
        [1054 + (i % 4) * 21, 501 + Math.floor(i / 4) * 11],
        [1066 + (i % 4) * 21, 501 + Math.floor(i / 4) * 11],
      ],
      "#e7ebcf77",
      1,
    );
  for (let i = 0; i < 18; i++) {
    const a = i * 0.35,
      x = 1092 + Math.cos(a) * 76,
      y = 523 + Math.sin(a) * 42;
    line(
      c,
      [
        [x, y],
        [x - 2, y - 12],
      ],
      "#7f8b53",
      2,
    );
  }
  sign(c, 1090, 586, "Barreiro");
  for (const [i, [x, y]] of [
    [80, 200],
    [80, 360],
    [390, 650],
    [490, 165],
    [1175, 440],
    [1150, 680],
    [480, 725],
    [960, 120],
    [900, 725],
    [95, 700],
  ].entries())
    tree(c, x, y, false, i);
  if (treasury >= 300) {
    box(c, 424, 450, 108, 70, "#e2c99b", 12);
    for (let i = 0; i < 5; i++)
      line(
        c,
        [
          [424, 450 + i * 15],
          [532, 450 + i * 15],
        ],
        "#bca172",
        3,
      );
    house(c, 435, 422, 85, 45);
    sign(c, 478, 545, "Cantinho da família", "Construído em colaboração");
  }
  // Late afternoon warmth without obscuring the navigable paths.
  const light = c.createLinearGradient(0, 0, 1280, 800);
  light.addColorStop(0, "#fff0bd12");
  light.addColorStop(1, "#e8c79700");
  box(c, 0, 0, 1280, 800, light as unknown as string);
}

export function paintAvatar(
  canvas: HTMLCanvasElement,
  shirt: string,
  dir: number,
  frame: number,
  hat: boolean,
) {
  canvas.width = 128;
  canvas.height = 160;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  if (artSources.hero) {
    paintRetroAvatar(c, shirt, dir, frame, hat);
    return;
  }
  c.translate(32, 67);
  const step = Math.sin((frame * Math.PI) / 2) * 3;
  shadow(c, 2, 1, 17, 5);
  const side = dir === 1 || dir === 2,
    facing = dir === 1 ? -1 : 1;
  line(
    c,
    [
      [-5, -12],
      [-5, -4 + step],
      [-5, 0 + step],
    ],
    "#4c5e62",
    6,
  );
  line(
    c,
    [
      [5, -12],
      [5, -4 - step],
      [5, 0 - step],
    ],
    "#65777a",
    6,
  );
  ellipse(c, -4, -1 + step, 4.8, 2.5, "#5d5145");
  ellipse(c, 6, -1 - step, 4.8, 2.5, "#5d5145");
  const body = c.createLinearGradient(-10, -30, 10, -12);
  body.addColorStop(0, shirt);
  body.addColorStop(1, "#304438");
  box(
    c,
    side ? -7 : -10,
    -32,
    side ? 15 : 21,
    22,
    body as unknown as string,
    6,
  );
  line(
    c,
    [
      [-10, -28],
      [-12, -18 + step * 0.4],
    ],
    "#c48e69",
    5,
  );
  line(
    c,
    [
      [11, -28],
      [12, -17 - step * 0.4],
    ],
    "#d6aa7f",
    5,
  );
  line(
    c,
    [
      [-9, -29],
      [-11, -24],
    ],
    shirt,
    6,
  );
  line(
    c,
    [
      [10, -29],
      [11, -24],
    ],
    shirt,
    6,
  );
  box(c, -3, -38, 7, 7, "#ba8864", 2);
  const skin = c.createRadialGradient(-4, -44, 2, 0, -41, 12);
  skin.addColorStop(0, "#e2b98b");
  skin.addColorStop(1, "#b67f5d");
  ellipse(
    c,
    side ? facing * 2 : 0,
    -42,
    side ? 7.5 : 9,
    11,
    skin as unknown as string,
  );
  ellipse(c, side ? -facing * 4 : -9, -41, 2.5, 3, "#cc9b73");
  c.fillStyle = "#514239";
  c.beginPath();
  c.ellipse(0, -47, 9.5, 7, 0, Math.PI, Math.PI * 2);
  c.fill();
  if (dir === 3) {
    ellipse(c, 0, -44, 9, 9, "#5b493c");
    ellipse(c, -3, -47, 5, 5, "#6d5745");
  } else {
    const eyes = side ? [facing * 5] : [-3.3, 3.7];
    eyes.forEach((x) => ellipse(c, x, -42, 1, 1.3, "#374039"));
    line(
      c,
      [
        [side ? facing * 4 : -2, -36],
        [side ? facing * 6 : 3, -36],
      ],
      "#97664f",
      1,
    );
  }
  if (hat) {
    const brim = c.createLinearGradient(-14, -49, 16, -49);
    brim.addColorStop(0, "#b8995d");
    brim.addColorStop(0.4, "#f1db9d");
    brim.addColorStop(1, "#c3a56c");
    ellipse(c, 0, -50, 17, 5.5, brim as unknown as string);
    box(c, -10, -60, 20, 12, "#d8be82", 5);
    ellipse(c, 0, -59, 10, 3.7, "#ecdaa4");
    line(
      c,
      [
        [-9, -51],
        [9, -51],
      ],
      "#9a7852",
      2,
    );
  }
}

export function drawCover(canvas: HTMLCanvasElement) {
  const s = {
    location: "farm",
    trees: [0, 0, 0, 0],
    day: 1,
    plots: Array.from({ length: 4 }, () => ({ planted: 1, watered: true })),
    decisions: [],
  } as unknown as State;
  paintLandscape(canvas, s);
}

function paintRetroFarm(c: C, s: State, treasury: number) {
  c.imageSmoothingEnabled = true;
  c.drawImage(artSources.farm!, 0, 0, 1280, 800);
  for (let i = 0; i < 4; i++) {
    const p = s.plots[i],
      x = 587 + (i % 2) * 129,
      y = 480 + Math.floor(i / 2) * 98;
    if (p.watered) {
      box(c, x + 7, y + 8, 96, 62, "#17383c20");
    }
    if (p.planted)
      for (let k = 0; k < 12; k++) {
        const px = x + 18 + (k % 4) * 25,
          py = y + 20 + Math.floor(k / 4) * 20;
        box(c, px - 1, py - 4, 2, 13, "#294f38");
        box(c, px - 7, py - 5, 7, 4, "#428344");
        box(c, px - 5, py - 7, 4, 2, "#9bbf54");
        box(c, px + 1, py - 10, 7, 4, "#579c45");
        box(c, px + 2, py - 12, 4, 2, "#bdcf6a");
        if (s.day - p.planted >= 3) {
          box(c, px + 5, py - 3, 2, 7, "#e4c869");
          box(c, px + 7, py - 2, 2, 5, "#9ba84c");
        }
      }
  }
  if (s.decisions.includes("pomar")) {
    box(c, 855, 577, 4, 20, "#725442");
    box(c, 847, 569, 14, 6, "#4d8949");
    box(c, 856, 563, 15, 6, "#7ab653");
  }
  if (treasury >= 300) {
    house(c, 355, 525, 90, 64);
    sign(c, 400, 615, "Cantinho da família");
  }
  // Lightweight status tags are separate from the baked environment.
  for (const [i, p] of [
    { x: 680, y: 220 },
    { x: 840, y: 220 },
    { x: 680, y: 370 },
    { x: 840, y: 370 },
  ].entries())
    if (s.trees[i] && s.day - s.trees[i] < 3) {
      box(c, p.x - 22, p.y + 10, 44, 16, "#253d3be0", 3);
      c.font = "9px monospace";
      c.fillStyle = "#f4e3b8";
      c.textAlign = "center";
      c.fillText("colhido", p.x, p.y + 21);
    }
}
function paintRetroAvatar(
  c: C,
  shirt: string,
  dir: number,
  frame: number,
  hat: boolean,
) {
  const img = artSources.hero!,
    w = img.naturalWidth,
    h = img.naturalHeight;
  const centers = [0.167, 0.39, 0.613, 0.837],
    tops = [0.01, 0.25, 0.49, 0.735];
  c.imageSmoothingEnabled = false;
  c.drawImage(
    img,
    (centers[frame] - 0.085) * w,
    tops[dir] * h,
    0.17 * w,
    0.242 * h,
    11,
    6,
    42,
    61,
  );
  if (shirt !== "#d5906b") {
    const pixels = c.getImageData(0, 0, 128, 160),
      data = pixels.data;
    for (let y = 56; y < 96; y++)
      for (let x = 25; x < 104; x++) {
        const i = (y * 128 + x) * 4,
          r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        if (data[i + 3] > 100 && r > g * 1.8 && g > b * 1.2) {
          const light = (r + g + b) / 3;
          if (shirt === "#709bac") {
            data[i] = light * 0.66;
            data[i + 1] = light;
            data[i + 2] = light * 1.22;
          } else {
            data[i] = light * 0.77;
            data[i + 1] = light * 1.06;
            data[i + 2] = light * 0.57;
          }
        }
      }
    c.putImageData(pixels, 0, 0);
  }
  if (hat) {
    box(c, 18, 13, 28, 5, "#6b4e38");
    box(c, 16, 11, 32, 4, "#d6ab63");
    box(c, 23, 4, 18, 9, "#efd28b");
    box(c, 24, 10, 16, 3, "#977346");
    box(c, 26, 4, 12, 2, "#fff0ba");
  }
}
export function paintNpc(canvas: HTMLCanvasElement, index: number) {
  canvas.width = 128;
  canvas.height = 160;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  const image = artSources.npcs;
  if (!image) return;
  const col = index % 3,
    row = Math.floor(index / 3);
  c.imageSmoothingEnabled = true;
  c.drawImage(image, col * 512 + 112, row * 512 + 6, 292, 495, 13, 5, 38, 63);
}
