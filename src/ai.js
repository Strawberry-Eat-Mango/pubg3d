/* ============================================================
   ai：机器人
   ============================================================ */
const DIFF = [
  { name: '简单', react: 0.9, err: 0.03, turn: 2.6, see: 0.6, burst: 3 },
  { name: '普通', react: 0.55, err: 0.017, turn: 4, see: 0.8, burst: 4 },
  { name: '困难', react: 0.35, err: 0.01, turn: 6, see: 1, burst: 6 },
  { name: '噩梦', react: 0.2, err: 0.005, turn: 9, see: 1.15, burst: 8 },
];
const NAME_A = ['落地成盒', '伏地魔', '刚枪王', '苟到决赛圈', '吃鸡小能手', '一枪爆头', '萌新求带', '老六', '快递员', '平底锅侠', '跑毒达人', '三级头', '满配M4', '空投猎人', '独狼', '机场刚枪', 'P城钉子户', '野区猎人', '98K爱好者', '毒圈跑者', '房区战神', '蹲厕所的', '开车撞人', '自闭玩家', '人体描边', '天命圈', '四倍镜', '急救包', '烟雾弹', '拉枪线'];
const NAME_B = ['', '', '_CN', '007', '233', '666', '_Pro', '丶', '灬', '_1998', 'yyds', '_TT', '520', '_King', '小号'];
function botName(i) { return pick(NAME_A) + pick(NAME_B) + (Math.random() < 0.3 ? irand(1, 99) : ''); }

function makeBrain(u) {
  return { target: null, visible: false, seenT: 0, lastSeenT: -99, lastSeenPos: new V3(), goal: new V3(), path: [], thinkT: rand(0, 0.5), lootT: rand(50, 110),
    itemT: null, ignore: new Set(), roamT: 0, strafe: 1, strafeT: 0, stuckT: 0, lastPos: new V3(), unstickT: 0, unstickDir: new V3(), burst: 0, pauseT: 0,
    aimErr: 0, aimOff: new V3(), aimOffT: 0, hurtBy: null, heard: null, jumpAt: 0, landPt: null, mode: 'loot', zonePt: null, avoidSide: pick([-1, 1]) };
}
function planJump(u) {
  const b = u.bot, P = G.plane;
  // 选择落点：城镇或随机建筑点
  let pt;
  if (Math.random() < 0.7) { const t = pick(W.towns.filter(t => t.tier >= (Math.random() < 0.3 ? 2 : 1))); pt = new V3(t.x + rand(-t.r, t.r) * 0.6, 0, t.z + rand(-t.r, t.r) * 0.6); }
  else { const l = pick(W.lootPts); pt = new V3(l.x, 0, l.z); }
  const along = pt.clone().sub(P.start).dot(P.dir);
  const perp = pt.clone().sub(P.start).addScaledVector(P.dir, -along).length();
  if (perp > 450) { pt.lerp(P.start.clone().addScaledVector(P.dir, along).setY(0), 0.5); }
  b.landPt = pt; b.jumpAt = clamp(along - rand(0, 80), 290, 1070);
}
const _be = new V3(), _bt = new V3(), _bd2 = new V3();
function botThink(u, dt) {
  const b = u.bot, I = u.input, D = DIFF[settings.diff];
  I.jump = I.crouch = I.prone = I.firePress = I.reload = I.interact = I.mode = I.nade = false; I.use = null; I.slot = null;
  I.fire = false; I.ads = false; I.sprint = false; I.fwd = I.right = 0;
  if (!u.alive) return;
  if (u.state === 'plane') { const along = G.plane.pos.clone().sub(G.plane.start).dot(G.plane.dir); if (G.plane.canJump && along >= b.jumpAt) I.interact = true; return; }
  if (u.state === 'fall' || u.state === 'chute') {
    const tp = b.landPt; _bd2.copy(tp).sub(u.pos); _bd2.y = 0;
    const hd = _bd2.length(); u.yaw = Math.atan2(-_bd2.x, -_bd2.z);
    const agl = u.pos.y - terrainH(u.pos.x, u.pos.z);
    if (u.state === 'fall') { u.pitch = hd > agl * 0.7 ? 0 : -1.2; I.fwd = hd > 20 ? 1 : 0; if (hd < 60 && agl < 250) I.interact = true; }
    else { I.fwd = hd > 25 ? 1 : hd < 8 ? -1 : 0; }
    return;
  }
  if (u.state === 'car') { I.interact = true; return; }
  const far = camera.position.distanceTo(u.pos) > 300;
  b.thinkT -= dt;
  if (b.thinkT <= 0) { b.thinkT = far ? 0.7 : 0.3; think(u, b, D); }
  if (b.target && !b.target.alive) { b.target = null; b.visible = false; }
  if (b.visible) b.seenT += dt;
  // 执行
  if (b.mode === 'combat' && b.target) combat(u, b, D, dt);
  else { b.aimErr = 0; lookMove(u, b, dt); }
  // 毒圈优先：在圈外时无论如何往圈里走
  const z = G.zone;
  if (z && b.mode !== 'zone' && z.next) {
    const dNext = Math.hypot(u.pos.x - z.next.x, u.pos.z - z.next.z), outCur = !z.inside(u.pos);
    if (outCur || (z.state === 'shrink' && dNext > z.next.r * 0.9) || (z.state === 'wait' && z.t < 25 && dNext > z.next.r)) {
      if (!b.zonePt || Math.hypot(b.zonePt.x - z.next.x, b.zonePt.z - z.next.z) > z.next.r) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * z.next.r * 0.6; b.zonePt = new V3(z.next.x + Math.cos(a) * r, 0, z.next.z + Math.sin(a) * r); }
      if (b.mode === 'combat') { b.goal.copy(b.zonePt); b.path = []; } else if (b.mode !== 'heal' || outCur) { if (b.mode !== 'zone') b.path = exitPath(u); b.mode = 'zone'; b.goal.copy(b.zonePt); b.itemT = null; }
      b.zoneRush = true;
    } else b.zoneRush = false;
  }
  if (b.mode === 'heal') { if (!u.heal) { const id = u.hp < 40 && countOf(u, 'medkit') ? 'medkit' : u.hp < 70 && countOf(u, 'firstaid') ? 'firstaid' : countOf(u, 'bandage') && u.hp < 75 ? 'bandage' : countOf(u, 'drink') && u.boost < 50 ? 'drink' : countOf(u, 'pills') && u.boost < 40 ? 'pills' : null; if (id) I.use = id; else b.mode = 'roam'; } return; }
  botMove(u, b, dt, D);
  const g = activeGun(u);
  if (g && g.ammo < magSize(g) * (b.visible ? 0.01 : 0.6) && countOf(u, GUNS[g.id].ammo) > 0 && u.reloadT <= 0) I.reload = true;
  if (!g && u.inv.guns.some(x => x)) I.slot = u.inv.guns[0] ? 0 : 1;
}
function think(u, b, D) {
  // 感知
  eyePos(u, _be); flatFwd(u.yaw, _v4);
  let best = null, bs = 1e9;
  for (const e of G.units) {
    if (!e.alive || e === u || e.state === 'plane' || e.state === 'fall') continue;
    const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z, d = Math.hypot(dx, dz);
    let range = 230 * D.see; if (e.stance === 'prone') range *= 0.45; else if (e.stance === 'crouch') range *= 0.8; if (e.state === 'car' || e.state === 'chute') range *= 1.4;
    const known = e === b.hurtBy || (b.heard && b.heard.who === e && G.time - b.heard.t < 3) || e === b.target;
    if (d > range * (known ? 1.5 : 1)) continue;
    if (!known && d > 15 && (dx * _v4.x + dz * _v4.z) / d < -0.2) continue;
    chestPos(e, _bt);
    if (!los(_be, _bt) && !los(_be, eyePos(e, _bd2))) continue;
    const s = d - (known ? 60 : 0);
    if (s < bs) { bs = s; best = e; }
  }
  if (best !== b.target) b.seenT = 0;
  if (best) { b.target = best; b.visible = true; b.lastSeenT = G.time; b.lastSeenPos.copy(best.pos); }
  else { b.visible = false; if (b.target && G.time - b.lastSeenT > 12) b.target = null; }
  if (b.hurtBy && G.time - u.lastHurt > 10) b.hurtBy = null;
  // 决策
  const g = activeGun(u);
  const hasGun = usable(u);
  const zone = G.zone;
  const outside = zone && !zone.inside(u.pos);
  const zoneSoon = zone && zone.next && (zone.state === 'shrink' || zone.t < 45) && Math.hypot(u.pos.x - zone.next.x, u.pos.z - zone.next.z) > zone.next.r * 0.85;
  if (b.target && hasGun && (b.visible || G.time - b.lastSeenT < 6) && !(outside && zone.dmg >= 3 && !b.visible)) { b.mode = 'combat'; return; }
  if (!hasGun && b.visible && b.target && b.target.pos.distanceTo(u.pos) < 40) { b.mode = 'flee'; b.goal.copy(u.pos).add(_v1.copy(u.pos).sub(b.target.pos).setY(0).normalize().multiplyScalar(30)); b.path = []; return; }
  b.target = b.visible ? b.target : null;
  if (outside || zoneSoon) {
    if (!b.zonePt || Math.hypot(b.zonePt.x - zone.next.x, b.zonePt.z - zone.next.z) > zone.next.r) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * zone.next.r * 0.6; b.zonePt = new V3(zone.next.x + Math.cos(a) * r, 0, zone.next.z + Math.sin(a) * r); }
    if (b.mode !== 'zone') { b.path = exitPath(u); }
    b.mode = 'zone'; b.goal.copy(b.zonePt); return;
  }
  if ((u.hp < 70 || (u.boost < 30 && (countOf(u, 'drink') || countOf(u, 'pills')) && u.hp < 95)) && G.time - u.lastHurt > 4 && G.time - b.lastSeenT > 4 && (countOf(u, 'bandage') || countOf(u, 'firstaid') || countOf(u, 'medkit') || countOf(u, 'drink') || countOf(u, 'pills'))) { b.mode = 'heal'; return; }
  // 搜刮
  b.lootT -= 0.3;
  if (b.lootT > 0 || !hasGun || countOf(u, g ? GUNS[g.id].ammo : 'x') < 30) {
    if (!b.itemT || b.itemT.dead || (b.itemT.box && !b.itemT.box.items.includes(b.itemT.entry))) chooseLoot(u, b);
    if (b.itemT) { b.mode = 'loot'; return; }
  }
  // 游荡
  if (b.mode !== 'roam' || u.pos.distanceTo(b.goal) < 4 || b.roamT < G.time) {
    b.mode = 'roam'; b.roamT = G.time + rand(20, 40);
    const zc = zone ? zone.next || zone.cur : { x: 0, z: 0, r: 300 };
    let p = null;
    for (let k = 0; k < 20; k++) { const l = pick(W.lootPts); if (Math.hypot(l.x - zc.x, l.z - zc.z) < zc.r * 0.8 && Math.hypot(l.x - u.pos.x, l.z - u.pos.z) < 220) { p = new V3(l.x, l.y, l.z); break; } }
    if (!p) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * zc.r * 0.7; p = new V3(zc.x + Math.cos(a) * r, 0, zc.z + Math.sin(a) * r); }
    b.goal.copy(p); b.path = exitPath(u); b.lootT = rand(15, 30);
  }
}
function exitPath(u) {
  const bd = isInsideBuilding(u.pos.x, u.pos.z); if (!bd) return [];
  const up = u.pos.y - bd.y > 1.5;
  if (up && !bd.down) return [];
  return [...(up ? bd.down.map(p => p.clone()) : []), bd.exit[1].clone(), bd.exit[0].clone()];
}
function usable(u) { return u.inv.guns.some(g => g && (g.ammo > 0 || countOf(u, GUNS[g.id].ammo) > 0)); }
function lootScore(u, id, entry) {
  const I = ITEMS[id], inv = u.inv;
  const rank = c => ({ AR: 5, DMR: 4, SR: 4, SMG: 3, SG: 2 }[c] || 0);
  switch (I.type) {
    case 'gun': { if (!inv.guns[0] || !inv.guns[1]) { if (inv.guns.some(g => g && g.id === id)) return 0; return 6 + rank(I.cls); } const w = Math.min(rank(GUNS[inv.guns[0].id].cls), rank(GUNS[inv.guns[1].id].cls)); return rank(I.cls) > w ? 5 : 0; }
    case 'ammo': { const uses = inv.guns.some(g => g && GUNS[g.id].ammo === id); if (uses) return countOf(u, id) < 150 ? 8 : 0; return inv.guns.every(g => !g) ? 1 : 0; }
    case 'helmet': case 'vest': case 'bag': { const c = inv[I.type]; return !c ? 7 : ITEMS[c.id].lvl < I.lvl ? 6 : 0; }
    case 'heal': return countOf(u, id) < ({ bandage: 10, firstaid: 3, medkit: 1 }[id]) ? 4 : 0;
    case 'boost': return countOf(u, id) < 3 ? 3 : 0;
    case 'scope': return inv.guns.some(g => g && canAttach(g.id, 'scope', id) && scopeRank(id) > scopeRank(g.scope)) ? 3 : 0;
    case 'mag': case 'muzzle': return inv.guns.some(g => g && canAttach(g.id, I.type, id) && !g[I.type]) ? 2 : 0;
    case 'throw': return countOf(u, id) < 2 ? 2 : 0;
  }
  return 0;
}
function chooseLoot(u, b) {
  let best = null, bs = 0;
  for (const it of itemsNear(u.pos.x, u.pos.z, 35)) {
    if (b.ignore.has(it)) continue;
    const s = lootScore(u, it.id, it); if (s <= 0) continue;
    const d = it.pos.distanceTo(u.pos) + Math.abs(it.pos.y - u.pos.y) * 3, sc = s / (1 + d / 12);
    if (sc > bs) { bs = sc; best = it; }
  }
  for (const bx of boxesNear(u.pos.x, u.pos.z, 45)) for (const e of bx.items) {
    const s = lootScore(u, e.id, e) + (bx.airdrop ? 3 : 0); if (s <= 0) continue;
    const d = bx.pos.distanceTo(u.pos), sc = s / (1 + d / 12);
    if (sc > bs) { bs = sc; best = { pos: bx.pos, box: bx, entry: e }; }
  }
  b.itemT = best; b.path = [];
  if (!best) return;
  const cur = isInsideBuilding(u.pos.x, u.pos.z), tb = isInsideBuilding(best.pos.x, best.pos.z);
  if (cur && cur !== tb && u.pos.y - cur.y < 1.5) b.path.push(cur.exit[1].clone(), cur.exit[0].clone());
  if (best.path && tb) {
    const up = best.pos.y - tb.y > 1.5, meUp = u.pos.y - tb.y > 1.5;
    if (tb !== cur) b.path.push(...best.path.map(p => p.clone()));
    else if (up && !meUp) b.path.push(...best.path.slice(2).map(p => p.clone()));
    else if (!up && meUp) b.path.push(...best.path.slice(2).reverse().map(p => p.clone()));
  }
}
/* 移动到目标 */
const _mv = new V3(), _yAx = new V3(0, 1, 0), _mt = new V3();
function blocked(u, dir, dist) {
  _mt.set(u.pos.x, u.pos.y + 0.9, u.pos.z);
  if (rayWorld(_mt, dir, dist, false) < dist) return true;
  const px = u.pos.x + dir.x * dist * 1.5, pz = u.pos.z + dir.z * dist * 1.5;
  if (!u.swim && terrainH(px, pz) < -1.0 && terrainH(u.pos.x, u.pos.z) > -1.0) return true;
  return false;
}
function botMove(u, b, dt, D) {
  const I = u.input;
  let goal = b.goal;
  if (b.mode === 'loot' && b.itemT) {
    if (b.path.length) goal = b.path[0]; else goal = b.itemT.pos;
    const it = b.itemT;
    if (!b.path.length && Math.hypot(it.pos.x - u.pos.x, it.pos.z - u.pos.z) < 1.4 && Math.abs(it.pos.y - u.pos.y) < 1.6) {
      if (it.box) { const e = it.entry; const n = pickupEntry(u, e); if (n > 0) { if (n >= e.count || ITEMS[e.id].type !== 'ammo' && ITEMS[e.id].type !== 'heal') it.box.items.splice(it.box.items.indexOf(e), 1); else e.count -= n; } else b.ignore.add(e); }
      else { const n = pickupEntry(u, it); if (n > 0) { if (n >= it.count || !['ammo', 'heal', 'boost', 'throw'].includes(ITEMS[it.id].type)) removeItem(it); else it.count -= n; } else b.ignore.add(it); }
      b.itemT = null; b.thinkT = 0; return;
    }
  } else if (b.path.length) goal = b.path[0];
  if (b.path.length && Math.hypot(b.path[0].x - u.pos.x, b.path[0].z - u.pos.z) < 1.1) b.path.shift();
  _mv.copy(goal).sub(u.pos); _mv.y = 0;
  const dist = _mv.length();
  let move = dist > (b.mode === 'combat' ? 3 : 0.8);
  if (move) _mv.divideScalar(dist); else _mv.set(0, 0, 0);
  b.stuckT += dt;
  if (b.stuckT > 1.2) {
    if (b.lastPos.distanceTo(u.pos) < 0.5 && move) { b.unstickT = rand(0.6, 1.3); b.unstickDir.set(rand(-1, 1), 0, rand(-1, 1)).normalize(); I.jump = true; b.avoidSide *= -1; if (u.stance !== 'stand') I.crouch = u.stance === 'crouch'; if (++b.stuckN > 4) { if (b.itemT) { b.ignore.add(b.itemT.entry || b.itemT); b.itemT = null; } if (b.path.length) b.path.shift(); b.stuckN = 0; if (b.mode === 'zone' || b.mode === 'roam') { b.path = exitPath(u); b.zonePt = null; } } }
    else b.stuckN = 0;
    b.stuckT = 0; b.lastPos.copy(u.pos);
  }
  if (b.unstickT > 0) { b.unstickT -= dt; _mv.copy(b.unstickDir); move = true; }
  else if (move && blocked(u, _mv, 1.5)) {
    let ok = false;
    for (const a of [0.5, 1, 1.5, 2.2]) { for (const s of [b.avoidSide, -b.avoidSide]) { _v5.copy(_mv).applyAxisAngle(_yAx, a * s); if (!blocked(u, _v5, 1.5)) { _mv.copy(_v5); ok = true; break; } } if (ok) break; }
  }
  if (b.mode === 'combat') {
    b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeT = rand(0.4, 1.4); b.strafe = pick([-1, 0, 1]); }
    rightOf(u.yaw, _v5); _mv.addScaledVector(_v5, b.strafe * (u.stance === 'prone' ? 0 : 0.8));
  }
  if (_mv.lengthSq() > 1) _mv.normalize();
  flatFwd(u.yaw, _f); rightOf(u.yaw, _r);
  I.fwd = _mv.dot(_f); I.right = _mv.dot(_r);
  if ((b.mode !== 'combat' || (b.zoneRush && !b.visible)) && dist > 12 && I.fwd > 0.7) I.sprint = true;
  if (b.mode !== 'combat' && u.stance !== 'stand') { I.crouch = u.stance === 'crouch'; I.prone = u.stance === 'prone'; }
}
function lookMove(u, b, dt) {
  const goal = b.path.length ? b.path[0] : b.mode === 'loot' && b.itemT ? b.itemT.pos : b.goal;
  _bd2.copy(goal).sub(u.pos);
  if (_bd2.x * _bd2.x + _bd2.z * _bd2.z > 0.5) { const wy = Math.atan2(-_bd2.x, -_bd2.z); u.yaw = angNorm(u.yaw + clamp(angNorm(wy - u.yaw), -5 * dt, 5 * dt)); }
  u.pitch = lerp(u.pitch, clamp(Math.atan2(_bd2.y, Math.hypot(_bd2.x, _bd2.z) + 1), -0.5, 0.5), 0.1);
}
/* 战斗 */
function combat(u, b, D, dt) {
  const I = u.input, t = b.target;
  const d = t.pos.distanceTo(u.pos);
  // 选枪
  const guns = u.inv.guns;
  const want = guns.map((g, i) => g ? { i, s: gunFit(GUNS[g.id], d) + (g.ammo > 0 || countOf(u, GUNS[g.id].ammo) ? 0 : -9) } : null).filter(Boolean).sort((a, c) => c.s - a.s)[0];
  if (want && want.i !== u.inv.active && u.fireT <= 0 && (Math.random() < 0.05 || (activeGun(u) && activeGun(u).ammo === 0 && !countOf(u, GUNS[activeGun(u).id].ammo)))) I.slot = want.i;
  const g = activeGun(u); if (!g) return;
  const GD = GUNS[g.id];
  // 移动目标
  if (b.zoneRush) { }
  else if (b.visible) {
    if (d > GD.range * 0.8) b.goal.copy(t.pos); else if (d < 8 && GD.cls !== 'SG') b.goal.copy(u.pos).add(_v1.copy(u.pos).sub(t.pos).setY(0).normalize().multiplyScalar(6)); else b.goal.copy(u.pos);
    b.path = [];
    if (d > 80 && u.stance === 'stand' && Math.random() < 0.004) I.prone = true;
    else if (d > 25 && d < 80 && u.stance === 'stand' && Math.random() < 0.01) I.crouch = true;
  } else if (!b.zoneRush) { b.goal.copy(b.lastSeenPos); if (u.stance !== 'stand') { I.crouch = u.stance === 'crouch'; I.prone = u.stance === 'prone'; } }
  // 瞄准
  eyePos(u, _be);
  const tp = _bt.set(t.pos.x, t.pos.y + (t.stance === 'prone' ? 0.25 : t.state === 'car' ? 1.2 : t.h * (settings.diff >= 2 && Math.random() < 0.3 ? 0.9 : 0.68)), t.pos.z);
  if (!b.visible) tp.copy(b.lastSeenPos).setY(b.lastSeenPos.y + 1.2);
  const tt = d / GD.vel;
  tp.addScaledVector(t.vel, tt * 0.9); tp.y += 0.5 * BGRAV * tt * tt;
  b.aimOffT -= dt; if (b.aimOffT <= 0) { b.aimOffT = rand(0.3, 0.7); b.aimOff.set(rand(-1, 1), rand(-0.7, 0.7), rand(-1, 1)); }
  const err = D.err * (b.seenT < 1.5 ? 2 : 1) * (u.hp < 50 ? 1.3 : 1);
  tp.addScaledVector(b.aimOff, err * d);
  _bd2.copy(tp).sub(_be);
  const wy = Math.atan2(-_bd2.x, -_bd2.z), wp = Math.atan2(_bd2.y, Math.hypot(_bd2.x, _bd2.z));
  const tr = D.turn * dt;
  u.yaw = angNorm(u.yaw + clamp(angNorm(wy - u.yaw), -tr, tr)); u.pitch = clamp(u.pitch + clamp(wp - u.pitch, -tr, tr), -1.4, 1.4);
  b.aimErr = err * 0.3;
  if (!b.visible || b.seenT < D.react) return;
  const aligned = Math.abs(angNorm(wy - u.yaw)) < 0.05 + 1 / Math.max(d, 1) && Math.abs(wp - u.pitch) < 0.05 + 1 / Math.max(d, 1);
  I.ads = d > 12;
  if (!aligned || d > GD.range * 1.4) return;
  if (b.pauseT > 0) { b.pauseT -= dt; return; }
  if (g.mode === 'auto') {
    const burstN = d < 20 ? 10 : d < 60 ? D.burst : 2;
    I.fire = true;
    if (u.fireT > GD.rate * 0.5) { b.burst++; if (b.burst >= burstN) { b.burst = 0; b.pauseT = d < 20 ? 0.1 : rand(0.25, 0.6); } }
  } else if (u.fireT <= 0 && Math.random() < (GD.bolt ? 0.6 : 0.25)) I.firePress = true;
  // 近距离手雷
  if (!b.visible) return;
  if (d > 12 && d < 35 && countOf(u, 'frag') && Math.random() < 0.002 * (settings.diff + 1)) { I.nade = true; }
}
function gunFit(GD, d) {
  const c = GD.cls;
  if (d < 12) return { SG: 10, SMG: 9, AR: 8, DMR: 4, SR: 2 }[c];
  if (d < 60) return { SG: 1, SMG: 7, AR: 9, DMR: 7, SR: 5 }[c];
  if (d < 150) return { SG: 0, SMG: 3, AR: 7, DMR: 9, SR: 8 }[c];
  return { SG: 0, SMG: 1, AR: 5, DMR: 8, SR: 10 }[c];
}
