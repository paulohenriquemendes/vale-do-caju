import { WORLD, points, sectors, isNight, type State } from "../shared/game";

// Recompose the approved original illustration into playable, generously spaced sectors.
export function paintExpandedFarm(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  ground: HTMLImageElement,
  treasury: number,
  state: State,
  cashew: HTMLImageElement,
  pond: HTMLImageElement,
) {
  const sx = image.naturalWidth / 1280,
    sy = image.naturalHeight / 800;
  c.drawImage(ground, 0, 0, WORLD.width, WORLD.height);
  function patch(
    x: number,
    y: number,
    w: number,
    h: number,
    dx: number,
    dy: number,
    dw = w,
    dh = h,
  ) {
    const tile = document.createElement("canvas");
    tile.width = Math.ceil(dw * 1.5);
    tile.height = Math.ceil(dh * 1.5);
    const t = tile.getContext("2d")!;
    t.scale(1.5, 1.5);
    t.imageSmoothingQuality = "high";
    t.drawImage(image, x * sx, y * sy, w * sx, h * sy, 0, 0, dw, dh);
    t.globalCompositeOperation = "destination-in";
    const gx = t.createLinearGradient(0, 0, dw, 0);
    gx.addColorStop(0, "transparent");
    gx.addColorStop(Math.min(0.06, 6 / dw), "black");
    gx.addColorStop(1 - Math.min(0.06, 6 / dw), "black");
    gx.addColorStop(1, "transparent");
    t.fillStyle = gx;
    t.fillRect(0, 0, dw, dh);
    const gy = t.createLinearGradient(0, 0, 0, dh);
    gy.addColorStop(0, "transparent");
    gy.addColorStop(Math.min(0.06, 6 / dh), "black");
    gy.addColorStop(1 - Math.min(0.06, 6 / dh), "black");
    gy.addColorStop(1, "transparent");
    t.fillStyle = gy;
    t.fillRect(0, 0, dw, dh);
    c.drawImage(tile, dx, dy, dw, dh);
  }
  // House and cistern retain their original door positions for existing saves.
  patch(100, 55, 248, 222, 100, 55);
  patch(366, 140, 144, 112, 350, 105, 158, 123);
  patch(553, 320, 100, 85, 550, 310, 100, 85);
  // Sandy walking lanes separate the sectors; the southern lane is outside the fence.
  // Broad feathered lanes blend into the same continuous ground texture.
  // Hard fillRect overlays previously looked like unfinished floor tiles.
  function lane(x: number, y: number, w: number, h: number, vertical = false) {
    const gradient = c.createLinearGradient(
      x,
      y,
      vertical ? x + w : x,
      vertical ? y : y + h,
    );
    gradient.addColorStop(0, "#e3b67500");
    gradient.addColorStop(0.3, "#e3b67555");
    gradient.addColorStop(0.7, "#e3b67555");
    gradient.addColorStop(1, "#e3b67500");
    c.fillStyle = gradient;
    c.fillRect(x, y, w, h);
  }
  lane(1100, 0, 200, WORLD.height, true);
  lane(0, 1220, WORLD.width, 140);
  lane(0, 1400, WORLD.width, 240);
  for (const [i, p] of points.trees.entries()) {
    const young = state.production?.caju[i].young;
    c.save();
    c.fillStyle = "#55452d30";
    c.beginPath();
    c.ellipse(p.x, p.y + 1, young ? 23 : 55, young ? 7 : 16, 0, 0, Math.PI * 2);
    c.fill();
    c.drawImage(
      cashew,
      p.x - (young ? 43 : 108),
      p.y - (young ? 73 : 205),
      young ? 86 : 216,
      young ? 90 : 228,
    );
    c.restore();
  }
  for (const p of sectors.ovo)
    patch(64, 368, 196, 228, p.x - 86, p.y - 174, 172, 200);
  for (const [i, p] of sectors.feijao.entries()) {
    const field = state.production?.feijao[i];
    const planted = field?.planted ?? true;
    const wet = field?.watered ?? true;
    const x = p.x - 78,
      y = p.y - 91;
    c.save();
    c.shadowColor = "#533e3066";
    c.shadowBlur = 5;
    c.shadowOffsetY = 5;
    c.fillStyle = "#765237";
    c.beginPath();
    c.roundRect(x - 4, y - 4, 164, 128, 9);
    c.fill();
    c.shadowColor = "transparent";
    const soil = c.createLinearGradient(0, y, 0, y + 120);
    soil.addColorStop(0, wet ? "#62472f" : "#98714c");
    soil.addColorStop(1, wet ? "#81603e" : "#b08b5b");
    c.fillStyle = soil;
    c.fillRect(x + 2, y + 2, 152, 116);
    for (let row = 0; row < 5; row++) {
      c.strokeStyle = wet ? "#473626" : "#7d593a";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + 10, y + 15 + row * 22);
      c.lineTo(x + 144, y + 15 + row * 22);
      c.stroke();
      c.strokeStyle = "#c6a47766";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + 10, y + 12 + row * 22);
      c.lineTo(x + 144, y + 12 + row * 22);
      c.stroke();
    }
    // Complete wooden border and rounded stakes, including the empty-bed state.
    c.strokeStyle = "#b58c5e";
    c.lineWidth = 4;
    c.strokeRect(x, y, 156, 120);
    for (const xx of [x, x + 39, x + 78, x + 117, x + 156])
      for (const yy of [y, y + 120]) {
        c.fillStyle = "#5b3c28";
        c.fillRect(xx - 4, yy - 7, 8, 13);
        c.fillStyle = "#c3a273";
        c.beginPath();
        c.ellipse(xx, yy - 7, 5, 3, 0, 0, Math.PI * 2);
        c.fill();
      }
    if (planted)
      for (let j = 0; j < 15; j++) {
        const px = x + 23 + (j % 5) * 27,
          py = y + 25 + Math.floor(j / 5) * 31;
        c.strokeStyle = "#52603a";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(px, py + 12);
        c.lineTo(px, py - 8);
        c.stroke();
        for (const [dx, dy, angle] of [
          [-5, -3, -0.5],
          [5, -7, 0.5],
          [-4, -12, -0.5],
        ]) {
          c.fillStyle = j % 3 ? "#78844b" : "#667745";
          c.beginPath();
          c.ellipse(px + dx, py + dy, 6, 3, angle, 0, Math.PI * 2);
          c.fill();
        }
        if (field?.readyAt && field.readyAt <= Date.now()) {
          c.strokeStyle = "#d0b873";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(px + 5, py - 3);
          c.quadraticCurveTo(px + 10, py + 4, px + 6, py + 10);
          c.stroke();
        }
      }
    c.restore();
  }
  // The ground painting already contains caatinga. Additional rectangular
  // copies cut vegetation at their borders and hid the continuous terrain.
  c.drawImage(pond, 740, 600, 235, 225);
  const fence = (x: number, y: number, w: number) => {
    c.fillStyle = "#63442d";
    c.fillRect(x, y - 24, w, 7);
    c.fillRect(x, y - 9, w, 6);
    for (let i = x; i < x + w; i += 36) {
      c.fillStyle = "#483523";
      c.fillRect(i, y - 36, 8, 43);
      c.fillStyle = "#b68c4d";
      c.fillRect(i + 1, y - 35, 3, 41);
    }
  };
  fence(60, 65, 2440);
  fence(60, WORLD.fenceY, 1060);
  fence(1280, WORLD.fenceY, 1220);
  function sign(x: number, y: number, label: string) {
    c.font = "bold 15px Georgia";
    c.textAlign = "center";
    const w = c.measureText(label).width + 30;
    c.fillStyle = "#493323";
    c.fillRect(x - w / 2, y - 21, w, 33);
    c.fillStyle = "#bb9156";
    c.fillRect(x - w / 2 + 2, y - 19, w - 4, 2);
    c.fillStyle = "#f4dca5";
    c.fillText(label, x, y);
  }
  sign(610, 425, "GALINHEIROS · 10 abrigos");
  sign(1820, 100, "POMAR · 10 cajueiros");
  sign(1810, 740, "ROÇADO · 10 canteiros");
  sign(1200, 1330, "PORTEIRA ↓ COMPRADORES");
  sign(430, 1470, "ESTRADA DA COMUNIDADE →");
  patch(260, 402, 94, 112, points.eggBuyer.x - 47, 1428, 94, 112);
  patch(945, 262, 105, 110, points.fruitBuyer.x - 53, 1428, 105, 110);
  patch(854, 472, 132, 114, points.cropBuyer.x - 66, 1428, 132, 114);
  patch(1028, 80, 246, 202, points.market.x - 123, 1355, 246, 202);
  if (isNight(state)) {
    for (const p of [
      points.market,
      points.eggBuyer,
      points.fruitBuyer,
      points.cropBuyer,
    ])
      sign(p.x, p.y - 60, "FECHADO · amanhecer");
    sign(610, 425, "GALINHEIROS · descanso");
    sign(1820, 100, "POMAR · fechado à noite");
    sign(1810, 740, "ROÇADO · fechado à noite");
  }
  if (treasury >= 300) sign(510, 300, "Cantinho da família");
}
