/* ============================================================
   items：物品、枪械、配件、背包、地面物资
   ============================================================ */
const AMMO = {
  a556: { name: '5.56mm', color: '#c8a93a', w: 0.5, stack: 30 },
  a762: { name: '7.62mm', color: '#b2642c', w: 0.7, stack: 30 },
  a45: { name: '.45 ACP', color: '#6b8fb2', w: 0.4, stack: 30 },
  a12: { name: '12口径', color: '#b23a3a', w: 1.25, stack: 10 },
  a300: { name: '.300马格南', color: '#6b6b6b', w: 1.0, stack: 10 },
};
/* 枪械：dmg 单发伤害；rate 射击间隔；vel 弹速 m/s；hip/ads 散布；rv/rh 后坐 */
const GUNS = {
  m416: { name: 'M416', cls: 'AR', ammo: 'a556', mag: 30, ext: 40, dmg: 41, rate: 0.086, vel: 880, hip: 0.035, ads: 0.0015, rv: 0.009, rh: 0.004, modes: ['auto', 'single'], snd: 'ar', reload: 2.1, head: 2.35, range: 220, color: '#2a2b2e' },
  akm: { name: 'AKM', cls: 'AR', ammo: 'a762', mag: 30, ext: 40, dmg: 47, rate: 0.1, vel: 715, hip: 0.04, ads: 0.0025, rv: 0.014, rh: 0.007, modes: ['auto', 'single'], snd: 'ak', reload: 2.3, head: 2.35, range: 200, color: '#6b4426' },
  scar: { name: 'SCAR-L', cls: 'AR', ammo: 'a556', mag: 30, ext: 40, dmg: 41, rate: 0.096, vel: 870, hip: 0.035, ads: 0.0018, rv: 0.01, rh: 0.004, modes: ['auto', 'single'], snd: 'ar', reload: 2.2, head: 2.35, range: 210, color: '#b9a57e' },
  ump: { name: 'UMP45', cls: 'SMG', ammo: 'a45', mag: 25, ext: 35, dmg: 39, rate: 0.092, vel: 360, hip: 0.028, ads: 0.003, rv: 0.006, rh: 0.003, modes: ['auto', 'single'], snd: 'smg', reload: 2.0, head: 2.1, range: 90, color: '#3a3d40' },
  mini14: { name: 'Mini14', cls: 'DMR', ammo: 'a556', mag: 20, ext: 30, dmg: 46, rate: 0.13, vel: 990, hip: 0.05, ads: 0.0008, rv: 0.016, rh: 0.004, modes: ['single'], snd: 'dmr', reload: 2.5, head: 2.35, range: 400, color: '#7a5a3a' },
  kar98k: { name: 'Kar98k', cls: 'SR', ammo: 'a762', mag: 5, ext: 5, dmg: 79, rate: 1.8, vel: 760, hip: 0.06, ads: 0.0004, rv: 0.035, rh: 0.004, modes: ['single'], snd: 'sniper', reload: 3.6, head: 2.5, range: 500, bolt: true, color: '#6b4426' },
  awm: { name: 'AWM', cls: 'SR', ammo: 'a300', mag: 5, ext: 7, dmg: 105, rate: 1.85, vel: 945, hip: 0.06, ads: 0.0003, rv: 0.04, rh: 0.004, modes: ['single'], snd: 'sniper', reload: 4.0, head: 2.5, range: 600, bolt: true, airdrop: true, color: '#3f4f36' },
  s686: { name: 'S686', cls: 'SG', ammo: 'a12', mag: 2, ext: 2, dmg: 25, pellets: 9, rate: 0.22, vel: 370, hip: 0.07, ads: 0.06, rv: 0.03, rh: 0.01, modes: ['single'], snd: 'shotgun', reload: 2.2, head: 1.5, range: 30, color: '#5a3a22' },
};
const ITEMS = {
  reddot: { type: 'scope', name: '红点瞄准镜', zoom: 1.35, reticle: 'dot', w: 1 },
  x2: { type: 'scope', name: '2倍镜', zoom: 2, reticle: 'x2', w: 1 },
  x4: { type: 'scope', name: '4倍镜', zoom: 4, reticle: 'x4', w: 1 },
  x8: { type: 'scope', name: '8倍镜', zoom: 8, reticle: 'x8', w: 1 },
  extmag: { type: 'mag', name: '扩容弹匣', w: 1 },
  comp: { type: 'muzzle', name: '补偿器', w: 1 },
  helmet1: { type: 'helmet', lvl: 1, name: '一级头', dura: 80, red: 0.3 },
  helmet2: { type: 'helmet', lvl: 2, name: '二级头', dura: 150, red: 0.4 },
  helmet3: { type: 'helmet', lvl: 3, name: '三级头', dura: 230, red: 0.55 },
  vest1: { type: 'vest', lvl: 1, name: '一级甲', dura: 200, red: 0.3 },
  vest2: { type: 'vest', lvl: 2, name: '二级甲', dura: 220, red: 0.4 },
  vest3: { type: 'vest', lvl: 3, name: '三级甲', dura: 250, red: 0.55 },
  bag1: { type: 'bag', lvl: 1, name: '一级包', cap: 100 },
  bag2: { type: 'bag', lvl: 2, name: '二级包', cap: 150 },
  bag3: { type: 'bag', lvl: 3, name: '三级包', cap: 200 },
  bandage: { type: 'heal', name: '绷带', heal: 10, cap: 75, time: 4, w: 2, stack: 5 },
  firstaid: { type: 'heal', name: '急救包', heal: 75, cap: 75, time: 6, w: 10, stack: 1 },
  medkit: { type: 'heal', name: '医疗箱', heal: 100, cap: 100, time: 8, w: 20, stack: 1 },
  drink: { type: 'boost', name: '能量饮料', boost: 40, time: 4, w: 4, stack: 1 },
  pills: { type: 'boost', name: '止痛药', boost: 60, time: 6, w: 10, stack: 1 },
  frag: { type: 'throw', name: '破片手榴弹', w: 12, stack: 1 },
};
for (const k in GUNS) ITEMS[k] = Object.assign({ type: 'gun' }, GUNS[k]);
for (const k in AMMO) ITEMS[k] = Object.assign({ type: 'ammo' }, AMMO[k]);
const itemName = id => ITEMS[id] ? ITEMS[id].name : id;

/* ---------- 掉落表 ---------- */
const LOOT_TABLE = {
  1: { ump: 6, s686: 5, akm: 3.5, m416: 3, scar: 3, mini14: 2, kar98k: 1.2, helmet1: 6, vest1: 6, bag1: 5, helmet2: 2.5, vest2: 2.5, bag2: 1.5, bandage: 11, firstaid: 5, drink: 5, pills: 2, medkit: 0.4, frag: 4, reddot: 4, x2: 3, x4: 1, extmag: 2, comp: 2, _ammo: 16 },
  2: { ump: 5, s686: 3, akm: 4, m416: 4, scar: 4, mini14: 3, kar98k: 2, helmet1: 4, vest1: 4, bag1: 3, helmet2: 4, vest2: 4, bag2: 3, helmet3: 0.4, vest3: 0.4, bag3: 0.8, bandage: 9, firstaid: 5, drink: 5, pills: 3, medkit: 0.8, frag: 4, reddot: 4, x2: 3, x4: 2, x8: 0.4, extmag: 3, comp: 3, _ammo: 15 },
  3: { ump: 3, s686: 2, akm: 5, m416: 5, scar: 5, mini14: 4, kar98k: 3, helmet2: 6, vest2: 6, bag2: 4, helmet3: 1.2, vest3: 1.2, bag3: 1.5, bandage: 7, firstaid: 6, drink: 5, pills: 3, medkit: 1.5, frag: 5, reddot: 3, x2: 3, x4: 3.5, x8: 1, extmag: 4, comp: 4, _ammo: 14 },
};
function rollLoot(tier, rng = Math.random) {
  const t = LOOT_TABLE[tier]; let s = 0; for (const k in t) s += t[k];
  let r = rng() * s;
  for (const k in t) { r -= t[k]; if (r <= 0) return k; }
  return 'bandage';
}

/* ---------- 地面物资 ---------- */
const GI = { list: [], cells: [], boxes: [], cullT: 0 };
function giReset() { for (const it of GI.list) if (it.mesh) scene.remove(it.mesh); for (const b of GI.boxes) scene.remove(b.mesh); GI.list = []; GI.boxes = []; GI.cells = []; for (let i = 0; i < GN * GN; i++) GI.cells.push([]); }
function giCell(it) { const c = cellIdx(it.pos.x, it.pos.z); return c < 0 ? null : GI.cells[c]; }
function newGun(id) { const g = GUNS[id]; return { id, ammo: g.mag, scope: null, mag: null, muzzle: null, mode: g.modes[0] }; }
function spawnItem(id, count, pos, gun) {
  const it = { id, count, gun: gun || null, pos: pos.clone(), mesh: null, dead: false };
  GI.list.push(it); const c = giCell(it); if (c) c.push(it);
  return it;
}
function removeItem(it) {
  it.dead = true; if (it.mesh) { scene.remove(it.mesh); it.mesh = null; }
  const c = giCell(it); if (c) { const i = c.indexOf(it); if (i >= 0) c.splice(i, 1); }
}
function itemsNear(x, z, r) {
  const out = [];
  const i0 = clamp(Math.floor((x - r + HALF) / GRID), 0, GN - 1), i1 = clamp(Math.floor((x + r + HALF) / GRID), 0, GN - 1);
  const j0 = clamp(Math.floor((z - r + HALF) / GRID), 0, GN - 1), j1 = clamp(Math.floor((z + r + HALF) / GRID), 0, GN - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const it of GI.cells[j * GN + i]) if (!it.dead && Math.abs(it.pos.x - x) < r && Math.abs(it.pos.z - z) < r) out.push(it);
  return out;
}
function spawnLoot() {
  giReset();
  const rng = Math.random;
  for (const p of W.lootPts) {
    if (rng() < 0.05) continue;
    const n = rng() < 0.35 ? 3 : rng() < 0.6 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      let id = rollLoot(p.tier, rng);
      const pos = new V3(p.x + rand(-0.6, 0.6), p.y + 0.02, p.z + rand(-0.6, 0.6));
      const _sp = spawnItem; const spawnItem2 = (a, b, c, d) => { const it = _sp(a, b, c, d); it.path = p.path; return it; };
      pos.y = groundHeight(pos.x, pos.z, p.y + 0.3) + 0.02;
      if (id === '_ammo') { const a = pick(['a556', 'a556', 'a762', 'a762', 'a45', 'a12', 'a762']); spawnItem2(a, AMMO[a].stack, pos); continue; }
      if (GUNS[id]) {
        spawnItem2(id, 1, pos, newGun(id)).gun.ammo = 0;
        const a = GUNS[id].ammo; spawnItem2(a, AMMO[a].stack * (rng() < 0.5 ? 2 : 1), pos.clone().add(_v1.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))));
        continue;
      }
      spawnItem2(id, ITEMS[id].type === 'heal' && id === 'bandage' ? 5 : 1, pos);
    }
  }
}
/* 物品外观 */
const itemMats = {};
function iMat(c, o) { const k = c + JSON.stringify(o || {}); if (!itemMats[k]) itemMats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o)); return itemMats[k]; }
function itemMesh(it) {
  const I = ITEMS[it.id], g = new THREE.Group();
  const box = (w, h, d, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), iMat(c, o)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  if (I.type === 'gun') { const gm = buildGun(it.id, it.gun || {}); gm.rotation.z = Math.PI / 2; gm.position.y = 0.05; g.add(gm); }
  else if (I.type === 'ammo') { box(0.26, 0.14, 0.18, I.color); box(0.2, 0.02, 0.12, '#222', 0, 0.14, 0); }
  else if (I.type === 'helmet') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, TAU, 0, Math.PI / 2), iMat(['#5a6a4a', '#4a5a3a', '#3a3f35'][I.lvl - 1])); m.position.y = 0.02; g.add(m); }
  else if (I.type === 'vest') { box(0.45, 0.1, 0.5, ['#6b7a55', '#3a4a33', '#2a2e28'][I.lvl - 1]); }
  else if (I.type === 'bag') { box(0.4, 0.22, 0.3, ['#7a6a4a', '#5a4e3a', '#3a3a30'][I.lvl - 1]); box(0.3, 0.1, 0.05, '#2a2a2a', 0, 0.05, 0.17); }
  else if (I.type === 'heal') { box(it.id === 'medkit' ? 0.4 : 0.26, it.id === 'bandage' ? 0.06 : 0.14, 0.22, '#e8e6e0'); box(0.1, 0.02, 0.03, '#c82020', 0, it.id === 'bandage' ? 0.06 : 0.14, 0); box(0.03, 0.02, 0.1, '#c82020', 0, it.id === 'bandage' ? 0.06 : 0.14, 0); }
  else if (I.type === 'boost') { if (it.id === 'drink') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 10), iMat('#3a9ad8')); m.position.y = 0.08; g.add(m); } else { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10), iMat('#e8e0c0')); m.position.y = 0.05; g.add(m); } }
  else if (I.type === 'throw') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), iMat('#3a4a2a')); m.position.y = 0.06; g.add(m); }
  else { box(0.14, 0.08, 0.2, '#222'); box(0.06, 0.05, 0.08, '#8fd3ff', 0, 0.08, 0, { emissive: '#306080' }); }
  g.position.copy(it.pos); g.rotation.y = (it.pos.x * 7 + it.pos.z * 3) % TAU;
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
function updateItemVisibility(dt) {
  GI.cullT -= dt; if (GI.cullT > 0) return; GI.cullT = 0.4;
  const cx = camera.position.x, cz = camera.position.z, R = 55;
  const near = new Set(itemsNear(cx, cz, R));
  for (const it of near) if (!it.mesh) { it.mesh = itemMesh(it); scene.add(it.mesh); }
  for (const it of GI.list) if (it.mesh && !near.has(it)) { scene.remove(it.mesh); it.mesh.traverse(o => o.geometry && o.geometry.dispose()); it.mesh = null; }
  if (GI.list.length > 4000) GI.list = GI.list.filter(i => !i.dead);
}

/* ---------- 盒子（死亡盒 / 空投） ---------- */
function spawnBox(pos, items, name, airdrop) {
  const g = new THREE.Group();
  const mat = airdrop ? iMat('#3f5f8f') : iMat('#8a6a3a', { map: MATS.crate.map });
  const m = new THREE.Mesh(new THREE.BoxGeometry(airdrop ? 1.4 : 0.9, airdrop ? 1 : 0.6, airdrop ? 1.4 : 0.6), mat);
  m.position.y = airdrop ? 0.5 : 0.3; m.castShadow = true; g.add(m);
  if (airdrop) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 1.45), iMat('#c83a2a')); s.position.y = 0.6; g.add(s); }
  g.position.copy(pos); scene.add(g);
  const b = { pos: pos.clone(), items, name, mesh: g, airdrop: !!airdrop };
  GI.boxes.push(b);
  return b;
}
function boxesNear(x, z, r) { return GI.boxes.filter(b => b.items.length && Math.abs(b.pos.x - x) < r && Math.abs(b.pos.z - z) < r); }

/* ---------- 背包 ---------- */
function newInv() { return { guns: [null, null], active: -1, helmet: null, vest: null, bag: null, items: {} }; }
function capacity(u) { return 60 + (u.inv.bag ? ITEMS[u.inv.bag.id].cap : 0); }
function weight(u) { let w = 0; for (const k in u.inv.items) { const I = ITEMS[k]; w += (I.w || 1) * u.inv.items[k]; } return w; }
function countOf(u, id) { return u.inv.items[id] || 0; }
function takeItem(u, id, n = 1) { const c = countOf(u, id); const t = Math.min(c, n); if (t <= 0) return 0; u.inv.items[id] = c - t; if (u.inv.items[id] <= 0) delete u.inv.items[id]; return t; }
function addItem(u, id, n) {
  const I = ITEMS[id], free = capacity(u) - weight(u);
  const fit = Math.min(n, Math.floor(free / (I.w || 1) + 1e-6));
  if (fit <= 0) return 0;
  u.inv.items[id] = countOf(u, id) + fit;
  return fit;
}
function scopeRank(id) { return { reddot: 1, x2: 2, x4: 3, x8: 4 }[id] || 0; }
function canAttach(gunId, type, id) {
  const g = GUNS[gunId]; if (!g) return false;
  if (g.cls === 'SG') return type === 'scope' && id === 'reddot';
  if (type === 'scope' && g.cls === 'SMG' && id === 'x8') return false;
  if (type === 'mag' && g.cls === 'SR' && gunId === 'kar98k') return false;
  return true;
}
/* 拾取：返回拾取数量（0 表示失败） */
function pickupEntry(u, e, opts = {}) {
  const I = ITEMS[e.id]; const inv = u.inv;
  const drop = (id, count, gun) => { const it = spawnItem(id, count, u.pos.clone().add(_v1.set(rand(-0.5, 0.5), 0.02, rand(-0.5, 0.5))), gun); it.pos.y = groundHeight(it.pos.x, it.pos.z, u.pos.y + 0.5) + 0.02; };
  if (I.type === 'gun') {
    let slot = inv.guns[0] ? (inv.guns[1] ? -1 : 1) : 0;
    if (slot < 0) {
      slot = opts.slot ?? (inv.active >= 0 ? inv.active : 0);
      const old = inv.guns[slot];
      if (old.ammo > 0) addItem(u, GUNS[old.id].ammo, old.ammo);
      for (const a of ['scope', 'mag', 'muzzle']) if (old[a] && !e.gun[a] && canAttach(e.id, ITEMS[old[a]].type, old[a])) { e.gun[a] = old[a]; old[a] = null; }
      old.ammo = 0; drop(old.id, 1, old);
    }
    inv.guns[slot] = e.gun || newGun(e.id);
    if (inv.active < 0 || opts.equip) setActive(u, slot);
    // 自动装填背包子弹
    return 1;
  }
  if (I.type === 'helmet' || I.type === 'vest' || I.type === 'bag') {
    const cur = inv[I.type];
    if (cur) {
      if (ITEMS[cur.id].lvl > I.lvl && !opts.force) return 0;
      if (ITEMS[cur.id].lvl === I.lvl && I.type !== 'bag' && (e.dura ?? I.dura) <= cur.dura && !opts.force) return 0;
      drop(cur.id, 1); const dropped = GI.list[GI.list.length - 1]; if (I.type !== 'bag') dropped.dura = cur.dura;
      if (I.type === 'bag') { inv.bag = null; }
    }
    inv[I.type] = { id: e.id, dura: e.dura ?? I.dura };
    if (u.model) dressModel(u);
    return 1;
  }
  if (I.type === 'scope' || I.type === 'mag' || I.type === 'muzzle') {
    const slotKey = I.type;
    for (const k of [inv.active, 0, 1]) {
      const g = inv.guns[k]; if (!g || !canAttach(g.id, slotKey, e.id)) continue;
      if (!g[slotKey]) { g[slotKey] = e.id; if (slotKey === 'mag') { } refreshGunVisual(u); return 1; }
      if (slotKey === 'scope' && scopeRank(e.id) > scopeRank(g.scope) && !(g.scope === 'x8' || GUNS[g.id].cls !== 'SR' && e.id === 'x8')) { const old = g.scope; g.scope = e.id; if (!addItem(u, old, 1)) drop(old, 1); refreshGunVisual(u); return 1; }
    }
    return addItem(u, e.id, 1);
  }
  return addItem(u, e.id, e.count);
}
function setActive(u, slot) {
  if (slot >= 0 && !u.inv.guns[slot]) return;
  u.inv.active = slot; u.reloadT = 0; u.fireT = Math.max(u.fireT, 0.4); u.ads = false;
  if (u.heal) u.heal = null;
  refreshGunVisual(u);
}
function activeGun(u) { return u.inv.active >= 0 ? u.inv.guns[u.inv.active] : null; }
function magSize(g) { const G = GUNS[g.id]; return g.mag === 'extmag' ? G.ext : G.mag; }
function dropAll(u) {
  const items = [];
  for (const g of u.inv.guns) if (g) items.push({ id: g.id, count: 1, gun: g });
  for (const k of ['helmet', 'vest', 'bag']) if (u.inv[k]) items.push({ id: u.inv[k].id, count: 1, dura: u.inv[k].dura });
  for (const k in u.inv.items) items.push({ id: k, count: u.inv.items[k] });
  if (!items.length) return;
  const p = u.pos.clone(); p.y = groundHeight(p.x, p.z, p.y + 0.5);
  spawnBox(p, items, u.name, false);
}

/* ---------- 枪械模型 ---------- */
function buildGun(id, att = {}, vm = false) {
  const G = GUNS[id], g = new THREE.Group();
  const black = iMat('#26272a', { metalness: 0.5, roughness: 0.4 }), body = iMat(G.color, { metalness: 0.3, roughness: 0.55 });
  const wood = iMat('#6b4426', { roughness: 0.7 }), dark = iMat('#3a3b3e', { metalness: 0.6, roughness: 0.35 });
  const box = (w, h, d, m, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
  const cyl = (r, l, m, x, y, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 8), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };
  let barrelEnd = -0.6, sightY = 0.07;
  switch (G.cls) {
    case 'AR':
      box(0.055, 0.09, 0.42, id === 'akm' ? black : body, 0, 0.02, -0.1);
      box(0.06, 0.07, 0.24, id === 'akm' ? wood : body, 0, 0.02, -0.4);
      cyl(0.012, 0.25, black, 0, 0.03, -0.6); barrelEnd = -0.73;
      box(0.04, 0.16, 0.07, id === 'akm' ? black : dark, 0, -0.1, -0.2, id === 'akm' ? 0.35 : 0.15);
      box(0.035, 0.1, 0.05, dark, 0, -0.07, 0.03, -0.3);
      box(0.045, 0.08, 0.26, id === 'akm' ? wood : dark, 0, 0.0, 0.22);
      box(0.02, 0.025, 0.36, black, 0, 0.08, -0.18);
      break;
    case 'SMG':
      box(0.065, 0.11, 0.38, body, 0, 0.02, -0.12); cyl(0.013, 0.12, black, 0, 0.03, -0.37); barrelEnd = -0.44;
      box(0.045, 0.17, 0.06, dark, 0, -0.1, -0.12); box(0.035, 0.1, 0.05, dark, 0, -0.07, 0.03, -0.3);
      box(0.04, 0.07, 0.2, dark, 0, 0.0, 0.17); box(0.02, 0.025, 0.3, black, 0, 0.085, -0.12);
      break;
    case 'DMR':
      box(0.05, 0.08, 0.72, wood, 0, 0.0, -0.1); box(0.045, 0.06, 0.34, black, 0, 0.05, -0.12);
      cyl(0.011, 0.3, black, 0, 0.04, -0.6); barrelEnd = -0.76; box(0.035, 0.1, 0.05, black, 0, -0.08, -0.1);
      box(0.02, 0.02, 0.3, black, 0, 0.09, -0.12);
      break;
    case 'SR':
      box(0.05, 0.08, 0.95, id === 'awm' ? body : wood, 0, 0.0, -0.15); cyl(0.013, 0.45, black, 0, 0.04, -0.75); barrelEnd = -0.98;
      box(0.045, 0.05, 0.3, black, 0, 0.055, -0.1);
      const bolt = box(0.08, 0.015, 0.015, dark, 0.05, 0.06, 0.02);
      if (id === 'awm') { box(0.05, 0.13, 0.2, body, 0, -0.03, 0.3); box(0.04, 0.12, 0.05, dark, 0, -0.1, -0.08); }
      break;
    case 'SG':
      cyl(0.016, 0.6, black, -0.017, 0.035, -0.45); cyl(0.016, 0.6, black, 0.017, 0.035, -0.45); barrelEnd = -0.76;
      box(0.05, 0.08, 0.3, wood, 0, 0.0, -0.3); box(0.06, 0.09, 0.14, dark, 0, 0.02, -0.05); box(0.05, 0.1, 0.32, wood, 0, -0.03, 0.17, -0.12);
      sightY = 0.06;
      break;
  }
  const sc = att.scope;
  if (sc) {
    const sm = iMat('#1f2022', { metalness: 0.6, roughness: 0.3 });
    if (sc === 'reddot') { box(0.04, 0.04, 0.06, sm, 0, 0.115, -0.1); const lens = box(0.03, 0.03, 0.005, iMat('#ff4a4a', { emissive: '#ff2020', emissiveIntensity: 0.3, transparent: true, opacity: 0.4 }), 0, 0.12, -0.13); sightY = 0.12; }
    else { const len = { x2: 0.1, x4: 0.16, x8: 0.3 }[sc]; const r = { x2: 0.022, x4: 0.025, x8: 0.028 }[sc]; cyl(r, len, sm, 0, 0.13, -0.12); box(0.02, 0.04, 0.05, sm, 0, 0.1, -0.12); sightY = 0.13; }
  }
  if (att.mag === 'extmag' && G.cls !== 'SG') box(0.04, 0.07, 0.07, dark, 0, -0.22, -0.2);
  if (att.muzzle === 'comp') cyl(0.02, 0.07, dark, 0, 0.03, barrelEnd - 0.02);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, barrelEnd - (att.muzzle ? 0.06 : 0)); g.add(muzzle);
  g.userData = { muzzle, sightY };
  if (!vm) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
