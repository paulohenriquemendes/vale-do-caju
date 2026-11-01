import { WORLD, points, sectors } from "../shared/game";

// Recompose the approved original illustration into playable, generously spaced sectors.
export function paintExpandedFarm(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  ground: HTMLImageElement,
  treasury: number,
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
    gx.addColorStop(0.07, "black");
    gx.addColorStop(0.93, "black");
    gx.addColorStop(1, "transparent");
    t.fillStyle = gx;
    t.fillRect(0, 0, dw, dh);
    const gy = t.createLinearGradient(0, 0, 0, dh);
    gy.addColorStop(0, "transparent");
    gy.addColorStop(0.07, "black");
    gy.addColorStop(0.93, "black");
    gy.addColorStop(1, "transparent");
    t.fillStyle = gy;
    t.fillRect(0, 0, dw, dh);
    c.drawImage(tile, dx, dy, dw, dh);
  }
  // House and cistern retain their original door positions for existing saves.
  patch(65, 55, 415, 230, 65, 55);
  patch(548, 320, 110, 90, 548, 320);
  // Sandy walking lanes separate the sectors; the southern lane is outside the fence.
  c.fillStyle = "#e3b67588";
  c.fillRect(1120, 70, 160, 1470);
  c.fillRect(60, 1240, 2440, 100);
  c.fillRect(60, 1420, 2440, 200);
  for (const p of points.trees)
    patch(572, 42, 180, 183, p.x - 90, p.y - 165, 180, 183);
  for (const p of sectors.ovo)
    patch(67, 374, 190, 218, p.x - 82, p.y - 168, 164, 188);
  for (const p of sectors.feijao) {
    patch(577, 469, 130, 100, p.x - 78, p.y - 91, 156, 120);
    for (let j = 0; j < 15; j++) {
      const x = p.x - 52 + (j % 5) * 25,
        y = p.y - 62 + Math.floor(j / 5) * 22;
      c.fillStyle = "#647445";
      c.fillRect(x, y, 3, 13);
      c.fillRect(x - 6, y - 4, 8, 4);
      c.fillRect(x + 2, y - 8, 8, 4);
      c.fillStyle = "#cbbb70";
      c.fillRect(x + 7, y - 2, 3, 9);
      c.fillRect(x - 4, y + 3, 3, 7);
    }
  }
  // Caatinga from the same painting, kept away from the routes and pickup spots.
  for (const [x, y] of [
    [620, 110],
    [850, 160],
    [960, 340],
    [500, 1070],
    [700, 1100],
    [220, 1120],
    [2320, 1230],
    [50, 280],
    [2280, 70],
  ])
    patch(315, 574, 180, 142, x, y, 160, 126);
  patch(1020, 485, 235, 225, 740, 600, 235, 225);
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
  patch(260, 410, 90, 110, points.eggBuyer.x - 45, 1435, 90, 110);
  patch(960, 270, 100, 100, points.fruitBuyer.x - 50, 1435, 100, 100);
  patch(860, 475, 125, 110, points.cropBuyer.x - 63, 1435, 125, 110);
  patch(1030, 85, 225, 195, points.market.x - 112, 1360, 225, 195);
  if (treasury >= 300) sign(510, 300, "Cantinho da família");
}
