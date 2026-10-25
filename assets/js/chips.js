// tilt: poker chips and felt, drawn once into canvas textures and shared by every chip on the table.
import * as THREE from 'three';
export const C = { felt: '#5a0b19', red: '#a3122b', cream: '#f6eddc', ink: '#1e0a10', lime: '#d4ff3f', gold: '#c9a45a' };

function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// the tilt mark: a chart that climbs, tips over and dumps; the drop is filled in lime
export function drawMark(x, s = 1, ink = C.cream, fill = C.lime) {
  x.save(); x.scale(s, s);
  x.fillStyle = fill; x.beginPath(); x.moveTo(-60, -70); x.bezierCurveTo(10, -70, 40, -40, 70, 10); x.bezierCurveTo(95, 55, 120, 85, 150, 95); x.lineTo(150, -70); x.closePath(); x.fill();
  x.strokeStyle = ink; x.lineWidth = 34; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(-150, 0); x.bezierCurveTo(-120, -45, -100, -70, -60, -70); x.bezierCurveTo(10, -70, 40, -40, 70, 10); x.bezierCurveTo(95, 55, 120, 85, 150, 95); x.stroke();
  x.fillStyle = ink; x.beginPath(); x.arc(150, 95, 42, 0, 7); x.fill(); x.restore();
}

function chipFace(base, inlay, center, ring, markInk, markFill) {
  return tex(1024, 1024, (x, w) => { const c = w / 2; x.fillStyle = base; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 8; i++) { x.save(); x.translate(c, c); x.rotate(i / 8 * Math.PI * 2); x.fillStyle = inlay; x.beginPath(); x.arc(0, 0, 500, -.17, .17); x.arc(0, 0, 400, .17, -.17, true); x.closePath(); x.fill(); x.restore(); }
    x.strokeStyle = ring; x.lineWidth = 8; x.beginPath(); x.arc(c, c, 372, 0, 7); x.stroke(); x.setLineDash([18, 16]); x.lineWidth = 5; x.beginPath(); x.arc(c, c, 330, 0, 7); x.stroke(); x.setLineDash([]);
    x.fillStyle = center; x.beginPath(); x.arc(c, c, 300, 0, 7); x.fill();
    x.save(); x.translate(c, c); x.rotate(-Math.PI / 2); x.translate(0, 10); drawMark(x, 1, markInk, markFill); x.restore(); });
}
function chipEdge(base, inlay) {
  return tex(2048, 64, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = inlay; x.fillRect(i * w / 8 + 40, 0, w / 8 - 80, h); x.fillStyle = base; for (let k = 0; k < 3; k++) x.fillRect(i * w / 8 + 70 + k * 60, 0, 22, h); } });
}

let KIT = null;
export function chipKit() {
  if (KIT) return KIT;
  const geo = new THREE.CylinderGeometry(1, 1, .2, 96);
  const mk = (face, edge) => { const top = new THREE.MeshPhysicalMaterial({ map: face, roughness: .4, clearcoat: .6, clearcoatRoughness: .22, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0 });
    const side = new THREE.MeshPhysicalMaterial({ map: edge, roughness: .45, clearcoat: .5 }); return [side, top, top]; };
  KIT = {
    geo,
    cream: mk(chipFace(C.cream, C.red, C.ink, C.gold, C.cream, C.lime), chipEdge(C.cream, C.red)),
    ink: mk(chipFace(C.ink, C.lime, '#2a1018', C.lime, C.cream, C.lime), chipEdge(C.ink, C.lime)),
    red: mk(chipFace(C.red, C.cream, C.ink, C.gold, C.cream, C.lime), chipEdge(C.red, C.cream)),
  };
  return KIT;
}
export function chip(kind = 'cream') { const k = chipKit(); const m = new THREE.Mesh(k.geo, k[kind]); m.castShadow = true; m.receiveShadow = true; return m; }

export function feltTexture(rep = 8) {
  const t = tex(512, 512, (x, w, h) => { x.fillStyle = C.felt; x.fillRect(0, 0, w, h); const d = x.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - .5) * 24; d.data[i] += n; d.data[i + 1] += n * .4; d.data[i + 2] += n * .5; } x.putImageData(d, 0, 0); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
