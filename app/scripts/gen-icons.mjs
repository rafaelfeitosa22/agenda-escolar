// Gera os ícones PNG do PWA (mesmo desenho de public/icons/icon.svg) sem dependências.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const RED = [0xec, 0x30, 0x13], BG = [0xf3, 0xf2, 0xf2];

// Retângulos em coordenadas 0..512 (traço de 32px do SVG convertido em retângulos cheios).
const SHAPES = [
  [96, 120, 320, 32], [96, 360, 320, 32], [96, 120, 32, 272], [384, 120, 32, 272], // moldura do calendário
  [96, 200, 320, 32], // linha do cabeçalho
  [168, 104, 32, 64], [312, 104, 32, 64], // argolas
  [176, 272, 56, 56], // dia marcado
];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, inset = 0) {
  const scale = (size * (1 - 2 * inset)) / 512, off = size * inset;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const sx = (x + 0.5 - off) / scale, sy = (y + 0.5 - off) / scale;
      const hit = SHAPES.some(([rx, ry, w, h]) => sx >= rx && sx < rx + w && sy >= ry && sy < ry + h);
      const [r, g, b] = hit ? BG : RED;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
writeFileSync("public/icons/icon-maskable-512.png", png(512, 0.1));
writeFileSync("public/icons/apple-touch-icon.png", png(180));
writeFileSync("public/favicon.ico", png(48)); // PNG dentro de .ico é aceito pelos navegadores atuais
console.log("ícones gerados");
