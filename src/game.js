/* ============================================================
   game：流程、镜头、第一人称、HUD、背包、地图、主循环
   ============================================================ */
const hc = {};
function setHTML(el, key, v) { if (hc[key] !== v) { hc[key] = v; el.innerHTML = v; } }
function setStyle(el, key, prop, v) { const k = key + prop; if (hc[k] !== v) { hc[k] = v; el.style[prop] = v; } }
const GUN_ICON = { AR: '▬', SMG: '▭', DMR: '━', SR: '═', SG: '≡' };

/* ---------------- 第一人称武器 ---------------- */
const VM = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(55, 1, 0.01, 10), group: null, muzzle: null, kick: 0, reloadT: 0, reloadD: 1, bob: 0, key: '', ads: 0, sightY: 0.07 };
VM.scene.add(new THREE.HemisphereLight(0xffffff, 0x665544, 1.6));
{ const l = new THREE.DirectionalLight(0xffffff, 1.4); l.position.set(1, 2, 1); VM.scene.add(l); }
VM.scene.add(VM.cam);
function buildVM(u) {
  const g = activeGun(u);
  const key = g ? g.id + g.scope + g.mag + g.muzzle : 'none';
  if (key === VM.key && VM.group) return;
  VM.key = key;
  if (VM.group) { VM.cam.remove(VM.group); disposeGroup(VM.group); VM.group = null; VM.muzzle = null; }
  const grp = new THREE.Group();
  const S = SKINS[u.skin % SKINS.length], sleeve = new THREE.MeshStandardMaterial({ color: S.shirt }), skin = new THREE.MeshStandardMaterial({ color: S.skin });
  if (g) {
    const gm = buildGun(g.id, g, true); grp.add(gm);
    VM.muzzle = gm.userData.muzzle; VM.sightY = gm.userData.sightY;
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), sleeve); a1.position.set(0.05, -0.12, 0.25); a1.rotation.x = 0.4; grp.add(a1);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.09), skin); h1.position.set(0.0, -0.07, 0.05); grp.add(h1);
    const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), sleeve); a2.position.set(-0.12, -0.14, -0.05); a2.rotation.set(0.3, -0.5, 0); grp.add(a2);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), skin); h2.position.set(-0.01, -0.04, -0.28); grp.add(h2);
  } else {
    for (const k of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), sleeve); a.position.set(k * 0.18, -0.18, -0.1); a.rotation.x = 0.3; grp.add(a); const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.1), skin); h.position.set(k * 0.18, -0.12, -0.32); grp.add(h); }
  }
  grp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  VM.group = grp; VM.cam.add(grp);
}
function updateVM(dt, u) {
  if (!VM.group) return;
  const g = activeGun(u);
  const sc = g && g.scope;
  const show = u.alive && u.state === 'ground' && !u.swim && (!G.tpp || G.adsView) && !(u.ads && sc && sc !== 'reddot') && !G.spectate;
  VM.group.visible = show; if (!show) return;
  VM.ads = lerp(VM.ads, u.ads ? 1 : 0, clamp(dt * 14, 0, 1));
  const hs = Math.hypot(u.vel.x, u.vel.z); VM.bob += dt * hs * 1.6;
  const b = u.onGround ? Math.min(1, hs / 6) * (1 - VM.ads * 0.85) : 0;
  VM.kick = Math.max(0, VM.kick - dt * 9);
  const hip = [0.2, -0.2, -0.42], ads = [0, -VM.sightY - 0.035, -0.36];
  const gp = VM.group.position;
  gp.set(lerp(hip[0], ads[0], VM.ads) + Math.cos(VM.bob) * 0.012 * b, lerp(hip[1], ads[1], VM.ads) - Math.abs(Math.sin(VM.bob)) * 0.014 * b, lerp(hip[2], ads[2], VM.ads) + VM.kick * 0.04);
  VM.group.rotation.set(VM.kick * 0.05, 0, 0);
  if (u.heal) { gp.y -= 0.25; }
  if (VM.reloadT > 0 && u.reloadT > 0) { VM.reloadT -= dt; const k = Math.sin(clamp(1 - VM.reloadT / VM.reloadD, 0, 1) * Math.PI); gp.y -= k * 0.1; VM.group.rotation.x -= k * 0.4; VM.group.rotation.z = k * 0.5; } else VM.group.rotation.z = 0;
  if (u.input.sprint && u.input.fwd > 0 && !u.ads) { VM.group.rotation.y = 0.6; gp.x += 0.05; gp.y -= 0.05; } else VM.group.rotation.y = 0;
}

/* ---------------- 提示 ---------------- */
let noticeT = 0, killT = 0, hitT = 0, flashT = 0;
function notice(t, kind = '', dur = 2.2) { const e = $('notice'); e.textContent = t; e.className = kind; e.style.opacity = 1; noticeT = dur; }
function hitMarker(head, kill) { const e = $('hitm'); e.className = kill ? 'kill' : head ? 'head' : ''; e.style.opacity = 1; hitT = 0.15; }
function hurtIndicator(src, dmg) {
  $('flash').style.opacity = Math.min(0.8, 0.2 + dmg / 50); flashT = 0.12; sfx('hurt', null, 0.4);
  const p = G.player;
  if (src && p) {
    const dx = src.x - p.pos.x, dz = src.z - p.pos.z; if (dx * dx + dz * dz < 1) return;
    const rel = angNorm(Math.atan2(-dx, -dz) - p.yaw);
    const d = document.createElement('div'); d.className = 'dd'; d.style.transform = `rotate(${-rel}rad)`;
    $('dmgdir').appendChild(d); requestAnimationFrame(() => d.style.opacity = 0); setTimeout(() => d.remove(), 1200);
  }
}
function weaponName(o) { return o.gun === 'zone' ? '蓝圈' : o.gun === 'fall' ? '坠落' : o.gun === 'car' ? '载具' : o.gun === 'frag' ? '破片手榴弹' : o.gun === 'fist' ? '拳头' : o.gun ? itemName(o.gun) : '未知'; }
function addFeed(k, v, o) {
  const d = document.createElement('div'); d.className = 'fe' + (k === G.player || v === G.player ? ' me' : '');
  d.innerHTML = k ? `<b>${esc(k.name)}</b> 使用 ${weaponName(o)}${o.head ? '<i>爆头</i>' : ''}淘汰了 <b>${esc(v.name)}</b>` : `<b>${esc(v.name)}</b> ${o.gun === 'zone' ? '死于蓝圈' : o.gun === 'fall' ? '摔死了' : '死了'}`;
  const f = $('feed'); f.prepend(d); while (f.children.length > 5) f.lastChild.remove();
  setTimeout(() => d.remove(), 7000);
}
function killMsg(v, o) {
  const e = $('killmsg');
  e.innerHTML = `<div>你使用 <b>${weaponName(o)}</b> ${o.head ? '<span class="hs">爆头</span>' : ''}淘汰了 <b class="v">${esc(v.name)}</b></div><div class="k">${G.player.stats.kills} 击杀</div>`;
  e.style.opacity = 1; killT = 3;
}
function onPlayerJump() { notice('已离开飞机', '', 1.5); }
function onPlayerLand() { }
function onPlayerDeath(k, o) {
  G.deadInfo = { k, o };
  setTimeout(() => { if (G.state === 'play') showDeath(); }, 1600);
}

/* ---------------- 大厅 ---------------- */
function lobbyModel() {
  if (G.lobby) { scene.remove(G.lobby.model.root); }
  const u = { skin: settings.skin, inv: newInv(), isPlayer: false };
  const m = buildHuman(u); u.model = m;
  u.inv.helmet = { id: 'helmet2', dura: 150 }; u.inv.vest = { id: 'vest2', dura: 220 }; u.inv.bag = { id: 'bag2' }; dressModel(u);
  const gm = buildGun('m416', { scope: 'reddot' }); m.hand.add(gm);
  const spot = G.lobbySpot;
  m.root.position.copy(spot.pos); m.root.rotation.y = spot.yaw;
  scene.add(m.root); G.lobby = u;
}
function pickLobbySpot() {
  const t = W.towns[0];
  for (let k = 0; k < 200; k++) {
    const x = t.x + rand(-40, 40), z = t.z + rand(-40, 40);
    queryArea(x - 4, z - 4, x + 4, z + 4); if (_qs.length) continue;
    if (roadDist(x, z) < 4) continue;
    const y = terrainH(x, z); G.lobbySpot = { pos: new V3(x, y, z), yaw: rand(0, TAU) }; return;
  }
  G.lobbySpot = { pos: new V3(t.x, terrainH(t.x, t.z), t.z), yaw: 0 };
}
function buildMenu() {
  const opts = (el, list, cur) => { $(el).innerHTML = list.map(([v, n]) => `<button class="opt${String(v) === String(cur) ? ' on' : ''}" data-v="${v}">${n}</button>`).join(''); };
  opts('o-players', [[25, '25 人'], [50, '50 人'], [80, '80 人']], settings.players);
  opts('o-diff', DIFF.map((d, i) => [i, d.name]), settings.diff);
  opts('o-view', [['tpp', '第三人称 TPP'], ['fpp', '第一人称 FPP']], settings.view);
  opts('o-qual', [[0, '流畅'], [1, '均衡'], [2, '高清']], settings.quality);
  $('skins').innerHTML = SKINS.map((s, i) => `<div class="sk${i === settings.skin ? ' on' : ''}" data-v="${i}"><i style="background:linear-gradient(180deg,${s.shirt} 55%,${s.pants} 55%)"></i><span>${s.name}</span></div>`).join('');
  $('sens').value = settings.sens; $('sensv').textContent = (+settings.sens).toFixed(2);
  $('fov').value = settings.fov; $('fovv').textContent = settings.fov;
  $('vol').value = settings.vol; $('volv').textContent = Math.round(settings.vol * 100);
  $('pname').value = settings.name;
}
const bindOpt = (id, key, conv, after) => $(id).addEventListener('click', e => { const b = e.target.closest('.opt'); if (!b) return; settings[key] = conv(b.dataset.v); saveSettings(); buildMenu(); if (after) after(); });
bindOpt('o-players', 'players', Number); bindOpt('o-diff', 'diff', Number); bindOpt('o-view', 'view', String); bindOpt('o-qual', 'quality', Number, applyQuality);
$('skins').addEventListener('click', e => { const c = e.target.closest('.sk'); if (!c) return; settings.skin = +c.dataset.v; saveSettings(); buildMenu(); lobbyModel(); });
$('sens').oninput = e => { settings.sens = +e.target.value; $('sensv').textContent = settings.sens.toFixed(2); saveSettings(); };
$('fov').oninput = e => { settings.fov = +e.target.value; $('fovv').textContent = settings.fov; saveSettings(); updateFov(); };
$('vol').oninput = e => { initAudio(); setVolume(+e.target.value); $('volv').textContent = Math.round(settings.vol * 100); saveSettings(); };
$('pname').oninput = e => { settings.name = e.target.value.slice(0, 14) || '吃鸡新人'; saveSettings(); };
$('start').onclick = () => startGame();

/* ---------------- 开始 / 结束 ---------------- */
function clearGame() {
  for (const u of G.units) { scene.remove(u.model.root); }
  G.units = []; G.bullets = []; for (const n of G.nades) scene.remove(n.mesh); G.nades = [];
  for (const c of G.cars) { scene.remove(c.mesh); if (c.engine) c.engine.stop(); } G.cars = [];
  for (const d of G.drops) scene.remove(d.mesh); G.drops = [];
  if (G.zone) { scene.remove(G.zone.mesh); G.zone = null; }
  if (G.plane && G.plane.mesh) scene.remove(G.plane.mesh); G.plane = null;
  for (const l of ['planeLoop', 'windLoop']) if (G[l]) { G[l].stop(); G[l] = null; }
  giReset(); glowFx.clear(); smokeFx.clear();
  $('feed').innerHTML = ''; $('dmgdir').innerHTML = ''; $('killmsg').style.opacity = 0; $('notice').style.opacity = 0; killT = noticeT = 0;
  G.player = null; G.spectate = null; G.over = false; G.marker = null;
}
function startGame() {
  initAudio();
  $('loading').classList.remove('hidden'); $('menu').classList.add('hidden');
  setTimeout(() => {
    clearGame();
    if (G.lobby) { scene.remove(G.lobby.model.root); G.lobby = null; }
    buildWorld(irand(1, 99999));
    spawnLoot(); spawnCars();
    G.time = 0; G.over = false; G.tpp = settings.view === 'tpp'; G.shake = 0;
    const me = new Unit(settings.name || '你', true, settings.skin); G.player = me; G.units.push(me);
    G.plane = makePlane();
    for (let i = 1; i < settings.players; i++) { const b = new Unit(botName(i), false, irand(0, SKINS.length - 1)); b.bot = makeBrain(b); b.bot.stuckN = 0; G.units.push(b); planJump(b); }
    G.total = G.units.length; G.alive = G.total;
    for (const u of G.units) { u.pos.copy(G.plane.pos); u.yaw = Math.atan2(-G.plane.dir.x, -G.plane.dir.z); }
    G.zone = makeZone();
    G.camYaw = G.units[0].yaw; G.camPitch = -0.3;
    G.planeLoop = makeLoop('plane'); G.windLoop = makeLoop('wind');
    buildVM(me);
    G.state = 'play'; G.paused = false; G.ui = null;
    ['loading', 'result', 'pause', 'inv', 'bigmap', 'death'].forEach(id => $(id).classList.add('hidden'));
    $('hud').classList.remove('hidden');
    if (IS_TOUCH) $('touch').classList.remove('hidden');
    notice('欢迎来到绝地海岛！按 F 跳伞', '', 4);
    lockPointer();
  }, 60);
}
function lockPointer() { if (IS_TOUCH) return; try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function endGame(winner) {
  if (G.state !== 'play') return;
  const me = G.player;
  if (winner === me) { me.stats.time = G.time; showResult(true); sfx('win'); }
  else if (!me.alive) { $('dTitle').innerHTML = winner ? `<span style="color:#f2a900">${esc(winner.name)}</span> 吃到了鸡` : '比赛结束'; }
}
function statBlocks(u, place) {
  return [['排名', `#${place}<small>/${G.total}</small>`], ['击杀', u.stats.kills], ['伤害', Math.round(u.stats.dmg)], ['爆头', u.stats.head], ['存活', fmtT(u.stats.time || G.time)], ['移动', (u.stats.dist / 1000).toFixed(2) + 'km']].map(([k, v]) => `<div><em>${v}</em><span>${k}</span></div>`).join('');
}
function showResult(win) {
  G.state = 'result'; if (document.pointerLockElement) document.exitPointerLock();
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('death').classList.add('hidden'); $('inv').classList.add('hidden'); $('bigmap').classList.add('hidden');
  $('rTitle').innerHTML = win ? '大吉大利，今晚吃鸡！' : '再接再厉';
  $('rSub').textContent = win ? 'WINNER WINNER CHICKEN DINNER' : '';
  $('rStats').innerHTML = statBlocks(G.player, 1);
  $('result').classList.remove('hidden');
}
function showDeath() {
  if (document.pointerLockElement) document.exitPointerLock();
  const u = G.player, { k, o } = G.deadInfo || {};
  $('dTitle').innerHTML = `#${u.place}<small>/${G.total}</small>`;
  $('dSub').innerHTML = k ? `你被 <b>${esc(k.name)}</b> 使用 ${weaponName(o)}${o.head ? ' 爆头' : ''}淘汰` : `你${o && o.gun === 'zone' ? '死于蓝圈' : o && o.gun === 'fall' ? '坠落身亡' : '阵亡了'}`;
  $('dStats').innerHTML = statBlocks(u, u.place);
  $('death').classList.remove('hidden'); G.ui = 'death';
}
$('dSpec').onclick = () => { const k = G.deadInfo && G.deadInfo.k; G.spectate = k && k.alive ? k : G.units.find(x => x.alive); $('death').classList.add('hidden'); G.ui = null; lockPointer(); };
$('dBack').onclick = toMenu; $('rBack').onclick = toMenu; $('rAgain').onclick = startGame;
function toMenu() {
  if (document.pointerLockElement) document.exitPointerLock();
  clearGame(); G.state = 'menu'; G.paused = false; G.ui = null;
  ['hud', 'result', 'pause', 'death', 'inv', 'bigmap', 'touch'].forEach(id => $(id).classList.add('hidden'));
  $('menu').classList.remove('hidden');
  zoomMul = 1; updateFov();
  pickLobbySpot(); lobbyModel(); buildMenu();
}
function setPaused(p) { if (G.state !== 'play') return; G.paused = p; $('pause').classList.toggle('hidden', !p); if (p) for (const k in mouseBtn) mouseBtn[k] = false; }
document.addEventListener('pointerlockchange', () => { if (G.state === 'play' && !locked() && !G.ui && !G.paused) setPaused(true); });
$('gl').addEventListener('click', () => { if (G.state === 'play' && !G.paused && !locked() && !G.ui) lockPointer(); });
$('resume').onclick = () => { setPaused(false); lockPointer(); };
$('quit').onclick = toMenu;

/* ---------------- 背包界面 ---------------- */
function openUI(kind) {
  if (G.ui === kind) { closeUI(); return; }
  if (G.ui && G.ui !== 'inv' && G.ui !== 'map') return;
  G.ui = kind; if (document.pointerLockElement) document.exitPointerLock();
  $('inv').classList.toggle('hidden', kind !== 'inv'); $('bigmap').classList.toggle('hidden', kind !== 'map');
  if (kind === 'inv') renderInv(); else drawBigMap();
}
function closeUI() { $('inv').classList.add('hidden'); $('bigmap').classList.add('hidden'); G.ui = null; for (const k in mouseBtn) mouseBtn[k] = false; lockPointer(); }
function nearbyEntries(u) {
  const out = [];
  for (const it of itemsNear(u.pos.x, u.pos.z, 2.4)) if (Math.abs(it.pos.y - u.pos.y) < 1.6) out.push({ it, id: it.id, count: it.count, gun: it.gun, d: it.pos.distanceTo(u.pos) });
  for (const b of boxesNear(u.pos.x, u.pos.z, 2.6)) if (Math.abs(b.pos.y - u.pos.y) < 2) for (const e of b.items) out.push({ box: b, e, id: e.id, count: e.count, gun: e.gun, d: b.pos.distanceTo(u.pos) });
  out.sort((a, b) => a.d - b.d);
  return out;
}
function takeEntry(u, n) {
  if (n.it) { const k = pickupEntry(u, n.it, { equip: true }); if (k > 0) { if (k >= n.it.count || !['ammo', 'heal', 'boost', 'throw'].includes(ITEMS[n.id].type)) removeItem(n.it); else n.it.count -= k; } return k; }
  const k = pickupEntry(u, n.e, { equip: true });
  if (k > 0) { if (k >= n.e.count || !['ammo', 'heal', 'boost', 'throw'].includes(ITEMS[n.id].type)) n.box.items.splice(n.box.items.indexOf(n.e), 1); else n.e.count -= k; }
  return k;
}
function tryPickup(u, n) {
  const k = takeEntry(u, n);
  if (k > 0) { sfx('pickup'); refreshGunVisual(u); dressModel(u); }
  else notice(['helmet', 'vest', 'bag'].includes(ITEMS[n.id].type) ? '已有更好的装备' : '背包空间不足', 'warn');
  return k;
}
function itemIcon(id) {
  const I = ITEMS[id];
  const c = { gun: '#f2a900', ammo: AMMO[id] && AMMO[id].color, helmet: '#7a8a6a', vest: '#6a7a5a', bag: '#8a7a5a', heal: '#e04a4a', boost: '#3a9ad8', throw: '#6a7a4a', scope: '#9ab', mag: '#9ab', muzzle: '#9ab' }[I.type] || '#999';
  const g = { gun: GUN_ICON[I.cls], ammo: '▮', helmet: '◓', vest: '▣', bag: '◫', heal: '✚', boost: '⚡', throw: '●', scope: '◎', mag: '▯', muzzle: '⊸' }[I.type] || '?';
  return `<i class="ii" style="color:${c}">${g}</i>`;
}
function renderInv() {
  const u = G.player; if (!u) return;
  const near = nearbyEntries(u); G.invNear = near;
  $('invNear').innerHTML = near.length ? near.map((n, i) => `<div class="row" data-near="${i}">${itemIcon(n.id)}<span>${itemName(n.id)}${n.gun && n.gun.scope ? ' · ' + itemName(n.gun.scope) : ''}</span><em>${n.count > 1 ? n.count : ''}</em>${n.box ? `<small>${n.box.airdrop ? '空投' : '盒子'}</small>` : ''}</div>`).join('') : '<div class="empty">附近没有物品</div>';
  const w = weight(u), cap = capacity(u);
  const bagItems = Object.keys(u.inv.items).sort((a, b) => ['ammo', 'heal', 'boost', 'throw', 'scope', 'mag', 'muzzle'].indexOf(ITEMS[a].type) - ['ammo', 'heal', 'boost', 'throw', 'scope', 'mag', 'muzzle'].indexOf(ITEMS[b].type));
  $('invBag').innerHTML = `<div class="cap"><i style="width:${Math.min(100, w / cap * 100)}%"></i><span>${Math.round(w)} / ${cap}</span></div>` + (bagItems.length ? bagItems.map(id => `<div class="row" data-bag="${id}">${itemIcon(id)}<span>${itemName(id)}</span><em>${u.inv.items[id]}</em>${['heal', 'boost'].includes(ITEMS[id].type) ? '<small>点击使用</small>' : ''}</div>`).join('') : '<div class="empty">背包是空的</div>');
  const gunCard = (g, i) => g ? `<div class="gun${u.inv.active === i ? ' on' : ''}" data-gun="${i}"><div class="gn">${i + 1} · ${GUNS[g.id].name}<small>${AMMO[GUNS[g.id].ammo].name}</small></div><div class="ga">${g.ammo} / ${countOf(u, GUNS[g.id].ammo)}</div><div class="att">${['scope', 'mag', 'muzzle'].map(k => `<span data-att="${i}:${k}" class="${g[k] ? 'has' : ''}">${g[k] ? itemName(g[k]) : { scope: '瞄准镜', mag: '弹匣', muzzle: '枪口' }[k]}</span>`).join('')}</div></div>` : `<div class="gun empty">${i + 1} · 空</div>`;
  const eq = k => { const e = u.inv[k]; return e ? `<div class="eq" data-eq="${k}">${itemIcon(e.id)}<span>${itemName(e.id)}</span>${e.dura !== undefined && k !== 'bag' ? `<b><i style="width:${Math.round(e.dura / ITEMS[e.id].dura * 100)}%"></i></b>` : ''}</div>` : `<div class="eq empty">${{ helmet: '头盔', vest: '防弹衣', bag: '背包' }[k]}</div>`; };
  $('invEq').innerHTML = gunCard(u.inv.guns[0], 0) + gunCard(u.inv.guns[1], 1) + `<div class="eqs">${eq('helmet')}${eq('vest')}${eq('bag')}</div><div class="tip">左键：拾取 / 使用 / 装备　右键：丢弃</div>`;
}
$('inv').addEventListener('mousedown', e => {
  const u = G.player; if (!u || !u.alive) return;
  const right = e.button === 2;
  const r = e.target.closest('[data-near],[data-bag],[data-gun],[data-att],[data-eq]'); if (!r) return;
  const drop = (id, count, gun, dura) => { const it = spawnItem(id, count, u.pos.clone().add(_v1.set(rand(-0.5, 0.5), 0, rand(-0.5, 0.5))), gun); it.pos.y = groundHeight(it.pos.x, it.pos.z, u.pos.y + 0.5) + 0.02; if (dura !== undefined) it.dura = dura; sfx('pickup'); };
  if (r.dataset.near !== undefined) { const n = G.invNear[+r.dataset.near]; if (n) tryPickup(u, n); }
  else if (r.dataset.bag) {
    const id = r.dataset.bag, I = ITEMS[id];
    if (right) { const n = I.type === 'ammo' ? Math.min(countOf(u, id), AMMO[id].stack) : 1; takeItem(u, id, n); drop(id, n); }
    else if (I.type === 'heal' || I.type === 'boost') { closeUI(); startUse(u, id); }
    else if (['scope', 'mag', 'muzzle'].includes(I.type)) { if (takeItem(u, id, 1)) { if (!pickupEntry(u, { id, count: 1 })) addItem(u, id, 1); } }
  }
  else if (r.dataset.att) { const [i, k] = r.dataset.att.split(':'); const g = u.inv.guns[+i]; if (g && g[k]) { const id = g[k]; g[k] = null; if (k === 'mag' && g.ammo > magSize(g)) { addItem(u, GUNS[g.id].ammo, g.ammo - magSize(g)); g.ammo = magSize(g); } if (right || !addItem(u, id, 1)) drop(id, 1); refreshGunVisual(u); } }
  else if (r.dataset.gun !== undefined) { const i = +r.dataset.gun, g = u.inv.guns[i]; if (!g) return; if (right) { if (g.ammo) addItem(u, GUNS[g.id].ammo, g.ammo); g.ammo = 0; u.inv.guns[i] = null; if (u.inv.active === i) setActive(u, u.inv.guns[1 - i] ? 1 - i : -1); drop(g.id, 1, g); refreshGunVisual(u); } else setActive(u, i); }
  else if (r.dataset.eq) { const k = r.dataset.eq, e2 = u.inv[k]; if (right && e2) { u.inv[k] = null; drop(e2.id, 1, null, e2.dura); dressModel(u); } }
  renderInv();
});

/* ---------------- 地图 ---------------- */
function mapToCanvas(g, S, ox, oz, cx, cy) {
  // 世界坐标 → 画布
  return (x, z) => [cx + (x - ox) * S, cy + (z - oz) * S];
}
function drawZones(g, P, S) {
  const z = G.zone; if (!z) return;
  g.save();
  // 蓝圈外暗化
  g.fillStyle = 'rgba(40,70,190,.28)'; g.beginPath(); g.rect(-5000, -5000, 10000, 10000);
  const [cx, cy] = P(z.cur.x, z.cur.z); g.arc(cx, cy, z.cur.r * S, 0, TAU, true); g.fill('evenodd');
  g.strokeStyle = '#3a6aff'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, z.cur.r * S, 0, TAU); g.stroke();
  if (z.next && z.state !== 'final') { const [nx, ny] = P(z.next.x, z.next.z); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(nx, ny, Math.max(1, z.next.r * S), 0, TAU); g.stroke(); }
  g.restore();
}
function drawArrow(g, x, y, yaw, s, color) { g.save(); g.translate(x, y); g.rotate(-yaw); g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.7, s * 0.8); g.lineTo(0, s * 0.35); g.lineTo(-s * 0.7, s * 0.8); g.closePath(); g.fill(); g.stroke(); g.restore(); }
function drawBigMap() {
  const c = $('mapc'), size = Math.min(innerHeight * 0.86, innerWidth * 0.7) | 0;
  if (c.width !== size) { c.width = c.height = size; c.style.width = c.style.height = size + 'px'; }
  const g = c.getContext('2d'), S = size / MAPSZ, P = (x, z) => [(x + HALF) * S, (z + HALF) * S];
  g.drawImage(W.mapCanvas, 0, 0, size, size);
  g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
  for (const t of W.towns) { const [x, y] = P(t.x, t.z); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(t.name, x + 1, y + 1); g.fillStyle = '#fff'; g.fillText(t.name, x, y); }
  drawZones(g, P, S);
  const pl = G.plane; if (pl && !pl.gone) { const [a, b] = P(pl.start.x, pl.start.z), [c2, d] = P(pl.end.x, pl.end.z); g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); g.setLineDash([]); const [px, py] = P(pl.pos.x, pl.pos.z); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('✈', px, py + 5); }
  for (const dr of G.drops) if (!dr.box || dr.box.items.length) { const [x, y] = P(dr.pos.x, dr.pos.z); g.fillStyle = '#e03a2a'; g.fillRect(x - 5, y - 5, 10, 10); g.strokeStyle = '#fff'; g.strokeRect(x - 5, y - 5, 10, 10); }
  if (G.marker) { const [x, y] = P(G.marker.x, G.marker.z); g.fillStyle = '#f2a900'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  const me = G.spectate || G.player; if (me) { const [x, y] = P(me.pos.x, me.pos.z); drawArrow(g, x, y, me.state === 'plane' ? Math.atan2(-G.plane.dir.x, -G.plane.dir.z) : me.yaw, 8, '#f2e24a'); }
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(8, size - 30, 250, 22); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.textAlign = 'left'; g.fillText('左键标记 · 右键清除 · M 关闭', 16, size - 15);
}
$('mapc').addEventListener('mousedown', e => {
  const c = $('mapc'), r = c.getBoundingClientRect(), S = c.width / MAPSZ;
  if (e.button === 2) G.marker = null; else G.marker = { x: (e.clientX - r.left) / S - HALF, z: (e.clientY - r.top) / S - HALF };
  drawBigMap();
});
function drawMinimap() {
  const c = $('mini'), g = c.getContext('2d'), N = c.width, u = G.spectate || G.player; if (!u || !W.mapCanvas) return;
  const R = u.state === 'plane' || u.state === 'fall' ? 400 : 140;
  const S = N / (R * 2), ox = u.pos.x, oz = u.pos.z;
  const P = (x, z) => [N / 2 + (x - ox) * S, N / 2 + (z - oz) * S];
  g.fillStyle = '#2a5f7f'; g.fillRect(0, 0, N, N);
  const k = W.mapCanvas.width / MAPSZ;
  g.drawImage(W.mapCanvas, (ox - R + HALF) * k, (oz - R + HALF) * k, R * 2 * k, R * 2 * k, 0, 0, N, N);
  drawZones(g, P, S);
  if (G.plane && !G.plane.gone && (u.state === 'plane')) { const [a, b] = P(G.plane.start.x, G.plane.start.z), [c2, d] = P(G.plane.end.x, G.plane.end.z); g.setLineDash([5, 4]); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); g.setLineDash([]); }
  for (const dr of G.drops) if (!dr.box || dr.box.items.length) { const [x, y] = P(dr.pos.x, dr.pos.z); g.fillStyle = '#e03a2a'; g.fillRect(x - 4, y - 4, 8, 8); }
  for (const cr of G.cars) if (!cr.dead && cr.pos.distanceTo(u.pos) < R) { const [x, y] = P(cr.pos.x, cr.pos.z); g.fillStyle = '#ddd'; g.fillRect(x - 2, y - 3, 4, 6); }
  if (G.marker) { const [x, y] = P(G.marker.x, G.marker.z); g.fillStyle = '#f2a900'; g.beginPath(); g.arc(clamp(x, 5, N - 5), clamp(y, 5, N - 5), 4, 0, TAU); g.fill(); }
  // 枪声提示
  if (G.shotMarks) for (const s of G.shotMarks) { const [x, y] = P(s.x, s.z); g.fillStyle = `rgba(255,80,60,${s.t})`; g.beginPath(); g.arc(clamp(x, 4, N - 4), clamp(y, 4, N - 4), 3, 0, TAU); g.fill(); }
  drawArrow(g, N / 2, N / 2, u.state === 'plane' ? Math.atan2(-G.plane.dir.x, -G.plane.dir.z) : u.yaw, 6, '#f2e24a');
}
function drawCompass() {
  const c = $('compass'), g = c.getContext('2d'), w = c.width, h = c.height, u = G.player;
  g.clearRect(0, 0, w, h);
  const yaw = G.state === 'play' ? (u.state === 'plane' || u.state === 'car' || !u.alive ? G.camYaw : u.yaw) : 0;
  const head = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
  const ppd = w / 150;
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  for (let dgr = Math.floor(head - 75); dgr <= head + 75; dgr++) {
    if (dgr % 5) continue;
    const x = w / 2 + (dgr - head) * ppd, d = ((dgr % 360) + 360) % 360;
    g.globalAlpha = 1 - Math.abs(dgr - head) / 80;
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, h - 8); g.lineTo(x, h - (d % 15 ? 12 : 17)); g.stroke();
    if (d % 15 === 0) { const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[d]; g.font = lab ? 'bold 15px sans-serif' : '11px sans-serif'; g.fillStyle = lab === 'N' ? '#f2a900' : '#fff'; g.fillText(lab || d, x, 16); }
  }
  g.globalAlpha = 1;
  if (G.marker && u) { const b = ((Math.atan2(G.marker.x - u.pos.x, -(G.marker.z - u.pos.z)) * 180 / Math.PI) + 360) % 360; let dd = b - head; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; if (Math.abs(dd) < 75) { g.fillStyle = '#f2a900'; g.beginPath(); const x = w / 2 + dd * ppd; g.moveTo(x, h - 2); g.lineTo(x - 5, h - 9); g.lineTo(x + 5, h - 9); g.fill(); } }
}

/* ---------------- HUD 更新 ---------------- */
function updateHud(dt) {
  const u = G.player, z = G.zone;
  setHTML($('alive'), 'alive', `<span><b>${G.alive}</b>存活</span><span><b>${u.stats.kills}</b>击杀</span>`);
  // 生命与能量
  const hp = Math.max(0, u.hp);
  setStyle($('hpfill'), 'hp', 'width', hp.toFixed(1) + '%');
  setStyle($('hpfill'), 'hpc', 'background', hp < 25 ? '#e03a2a' : hp < 75 ? '#fff' : '#fff');
  const hurt = G.time - u.lastHurt < 0.4; if (hc.hurt !== hurt) { hc.hurt = hurt; $('hpbar').classList.toggle('hurt', hurt); }
  const bs = $('boost').children; for (let i = 0; i < 4; i++) setStyle(bs[i].firstChild, 'b' + i, 'width', clamp((u.boost - [0, 20, 60, 90][i]) / [20, 40, 30, 10][i] * 100, 0, 100).toFixed(0) + '%');
  setStyle($('vig'), 'vig', 'opacity', u.alive && hp < 30 ? String(0.4 + Math.sin(G.time * 5) * 0.15) : '0');
  // 姿态
  setHTML($('stance'), 'st', u.state === 'ground' ? (u.swim ? '游泳' : { stand: '站立', crouch: '蹲下', prone: '趴下' }[u.stance]) : { plane: '飞机', fall: '自由落体', chute: '跳伞', car: '驾驶' }[u.state] || '');
  // 武器
  const g = activeGun(u);
  let wh = '';
  if (g) { const GD = GUNS[g.id]; wh = `<div class="am${g.ammo === 0 ? ' low' : ''}">${u.reloadT > 0 ? '<small>装填中</small>' : g.ammo}<span>|</span><em>${countOf(u, GD.ammo)}</em></div><div class="wn">${GD.name} · ${g.mode === 'auto' ? '全自动' : GD.bolt ? '栓动' : '单发'}</div>`; }
  else wh = `<div class="wn">徒手</div>`;
  setHTML($('ammo'), 'am', wh);
  setHTML($('slots'), 'sl', u.inv.guns.map((x, i) => `<div class="${u.inv.active === i ? 'on' : ''}${x ? '' : ' e'}"><b>${i + 1}</b>${x ? GUNS[x.id].name + (x.scope ? `<small>${itemName(x.scope)}</small>` : '') : '—'}</div>`).join('') + (countOf(u, 'frag') ? `<div><b>G</b>手雷 ×${countOf(u, 'frag')}</div>` : ''));
  const eq = k => { const e = u.inv[k]; if (!e) return `<div class="e">${{ helmet: '◓', vest: '▣', bag: '◫' }[k]}</div>`; const l = ITEMS[e.id].lvl; const pct = k === 'bag' ? 100 : Math.round(e.dura / ITEMS[e.id].dura * 100); return `<div class="l${l}">${{ helmet: '◓', vest: '▣', bag: '◫' }[k]}<b>${l}</b><i style="height:${pct}%"></i></div>`; };
  setHTML($('equip'), 'eq', eq('helmet') + eq('vest') + eq('bag'));
  const meds = [['7', 'bandage'], ['8', 'firstaid'], ['9', 'medkit'], ['0', u.inv.items.drink ? 'drink' : 'pills']].filter(([, id]) => countOf(u, id)).map(([k, id]) => `<span><b>${k}</b>${itemName(id)} ${countOf(u, id)}</span>`).join('');
  setHTML($('meds'), 'meds', meds);
  // 毒圈
  let zt = '';
  if (z) {
    if (z.state === 'wait') zt = `<b>${fmtT(z.t)}</b> 后安全区缩小`;
    else if (z.state === 'shrink') zt = `<b class="warn">安全区正在缩小</b> ${fmtT(z.t)}`;
    else zt = '最终安全区';
    const dz = Math.hypot(u.pos.x - z.cur.x, u.pos.z - z.cur.z);
    if (u.alive && dz > z.cur.r) zt += `<div class="out">⚠ 你在蓝圈外！距离安全区 ${Math.round(dz - z.cur.r)}m</div>`;
    else if (z.next && Math.hypot(u.pos.x - z.next.x, u.pos.z - z.next.z) > z.next.r && z.state !== 'final') zt += `<div class="run">距离下一安全区 ${Math.round(Math.hypot(u.pos.x - z.next.x, u.pos.z - z.next.z) - z.next.r)}m</div>`;
    const outside = u.alive && dz > z.cur.r; if (hc.out !== outside) { hc.out = outside; $('bluefx').style.opacity = outside ? 1 : 0; }
  }
  setHTML($('zonet'), 'zt', zt);
  // 飞机 / 跳伞提示
  let ph = '';
  if (u.state === 'plane') ph = G.plane.canJump ? '<b>F</b> 跳伞' : '飞机正在进入海岛上空……';
  else if (u.state === 'fall') ph = `高度 ${Math.round(u.pos.y - terrainH(u.pos.x, u.pos.z))}m · 速度 ${Math.round(u.vel.length() * 3.6)}km/h · <b>F</b> 开伞 · 按住 W 并向下看俯冲`;
  else if (u.state === 'chute') ph = `高度 ${Math.round(u.pos.y - terrainH(u.pos.x, u.pos.z))}m · W 加速 · S 减速`;
  else if (u.state === 'car') ph = `${Math.round(Math.abs(u.car.speed) * 3.6)} km/h · 车辆耐久 ${Math.max(0, Math.round(u.car.hp / 10))}% · <b>F</b> 下车`;
  setHTML($('phase'), 'ph', ph);
  // 拾取提示
  let pk = '';
  if (u.alive && u.state === 'ground' && !G.ui) {
    const near = nearbyEntries(u).slice(0, 4);
    if (near.length) pk = near.map((n, i) => `<div class="${i ? '' : 'first'}">${i ? '' : '<b>F</b>'}${itemIcon(n.id)}${itemName(n.id)}${n.count > 1 ? ' ×' + n.count : ''}</div>`).join('') + (nearbyEntries(u).length > 4 ? '<div class="more">Tab 查看更多</div>' : '');
    else { const c = nearCar(u); if (c) pk = `<div class="first"><b>F</b>驾驶车辆</div>`; }
  }
  setHTML($('pickup'), 'pk', pk);
  // 使用物品
  if (u.heal) { const k = 1 - u.heal.t / u.heal.total; $('healc').classList.remove('hidden'); setHTML($('healc'), 'hl', `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="4"/><circle cx="30" cy="30" r="26" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="163.4" stroke-dashoffset="${(163.4 * (1 - k)).toFixed(1)}" transform="rotate(-90 30 30)"/></svg><span>${u.heal.t.toFixed(1)}</span><em>${itemName(u.heal.id)}</em>`); }
  else if (hc.hl !== '') { hc.hl = ''; $('healc').classList.add('hidden'); }
  // 准星 / 瞄准镜
  const sc = g && g.scope;
  let scopeCls = '';
  if (u.ads && u.alive) scopeCls = sc || 'iron';
  if (hc.scope !== scopeCls) { hc.scope = scopeCls; $('scope').className = scopeCls; }
  const moving = Math.hypot(u.vel.x, u.vel.z) > 0.6;
  const spr = g ? GUNS[g.id].hip * (moving ? 1.6 : 1) * (u.stance === 'crouch' ? 0.8 : u.stance === 'prone' ? 0.6 : 1) : 0.02;
  const px = Math.round(spr / Math.tan(camera.fov * Math.PI / 360) * innerHeight / 2) + 4;
  setStyle($('xh'), 'xhs', 'width', px * 2 + 'px'); setStyle($('xh'), 'xhh', 'height', px * 2 + 'px');
  setStyle($('xh'), 'xho', 'opacity', (u.ads || !u.alive || u.state !== 'ground' || u.heal) ? '0' : '1');
  // 渐隐
  if (noticeT > 0) { noticeT -= dt; if (noticeT <= 0) $('notice').style.opacity = 0; }
  if (killT > 0) { killT -= dt; if (killT <= 0) $('killmsg').style.opacity = 0; }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) $('hitm').style.opacity = 0; }
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('flash').style.opacity = 0; }
  if (G.shotMarks) { for (const s of G.shotMarks) s.t -= dt * 0.5; G.shotMarks = G.shotMarks.filter(s => s.t > 0); }
  hc.miniT = (hc.miniT || 0) - dt; if (hc.miniT <= 0) { hc.miniT = 0.1; drawMinimap(); }
  drawCompass();
  if (G.ui === 'map') drawBigMap();
  if (G.ui === 'inv') { hc.invT = (hc.invT || 0) - dt; if (hc.invT <= 0) { hc.invT = 0.5; renderInv(); } }
}
function nearCar(u) { for (const c of G.cars) if (!c.dead && !c.driver && c.pos.distanceTo(u.pos) < 3.2) return c; return null; }

/* ---------------- 玩家输入 ---------------- */
const touchSt = { mx: 0, my: 0 };
function playerLook() {
  const u = G.player;
  const sens = 0.0021 * settings.sens / (u.ads ? Math.max(1, zoomMul * 0.8) : 1);
  const free = u.state === 'plane' || u.state === 'car' || !u.alive || G.spectate;
  if (free) { G.camYaw = angNorm(G.camYaw - mdx * sens); G.camPitch = clamp(G.camPitch - mdy * sens, -1.4, 0.8); if (u.state === 'car') u.yaw = G.camYaw; }
  else { u.yaw = angNorm(u.yaw - mdx * sens); u.pitch = clamp(u.pitch - mdy * sens, -1.5, 1.45); G.camYaw = u.yaw; G.camPitch = u.pitch; }
  mdx = mdy = 0;
}
function playerInput(first) {
  const u = G.player, I = u.input, k = c => !!keys[c], p = c => first && pressed.has(c);
  const ui = !!G.ui && G.ui !== 'inv';
  I.fwd = ui ? 0 : clamp((k('KeyW') ? 1 : 0) - (k('KeyS') ? 1 : 0) - touchSt.my, -1, 1);
  I.right = ui ? 0 : clamp((k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0) + touchSt.mx, -1, 1);
  I.sprint = k('ShiftLeft') || k('ShiftRight') || touchSt.my < -0.95;
  I.fire = !!mouseBtn[0] && !G.ui; I.firePress = p('M0') && !G.ui; I.ads = !!mouseBtn[2] && !G.ui;
  I.jump = p('Space'); I.crouch = p('KeyC') || p('ControlLeft'); I.prone = p('KeyZ');
  I.reload = p('KeyR'); I.mode = p('KeyB'); I.nade = p('KeyG');
  I.interact = false; I.slot = null; I.use = null;
  if (p('Digit1')) I.slot = 0; if (p('Digit2')) I.slot = 1; if (p('KeyX')) I.slot = -1;
  if (first && wheel && u.inv.guns[0] && u.inv.guns[1]) I.slot = u.inv.active === 0 ? 1 : 0;
  if (p('Digit7')) I.use = 'bandage'; if (p('Digit8')) I.use = 'firstaid'; if (p('Digit9')) I.use = 'medkit'; if (p('Digit0')) I.use = countOf(u, 'drink') ? 'drink' : 'pills';
  if (p('KeyF')) {
    if (u.state === 'plane' || u.state === 'fall' || u.state === 'car') I.interact = true;
    else if (u.state === 'ground') {
      const n = nearbyEntries(u);
      if (n.length) tryPickup(u, n[0]);
      else { const c = nearCar(u); if (c) enterCar(u, c); }
    }
  }
  if (p('KeyV')) { G.tpp = !G.tpp; notice(G.tpp ? '第三人称' : '第一人称', '', 1); }
}
function handleUIKeys() {
  if (pressed.has('Tab') && G.player.alive) openUI('inv');
  if (pressed.has('KeyM')) openUI('map');
  if (pressed.has('Escape') && (G.ui === 'inv' || G.ui === 'map')) closeUI();
}
addEventListener('keydown', e => {
  if (G.state !== 'play') return;
  if ((G.ui === 'inv' && e.code === 'Tab') || (G.ui === 'map' && e.code === 'KeyM') || ((G.ui === 'inv' || G.ui === 'map') && e.code === 'Escape')) { closeUI(); pressed.delete(e.code); }
  else if (G.ui === 'inv' || G.ui === 'map') { if (e.code === 'KeyM') openUI('map'); if (e.code === 'Tab') openUI('inv'); }
});

/* ---------------- 镜头 ---------------- */
const _cam = new V3(), _piv = new V3(), _cd = new V3();
function updateCamera(dt) {
  const me = G.player, u = G.spectate || me;
  G.shake = Math.max(0, (G.shake || 0) - dt * 2); G.camKick = Math.max(0, (G.camKick || 0) - dt * 6);
  let targetZoom = 1; G.adsView = false;
  if (me.state === 'plane' && !G.spectate) {
    fwdOf(G.camYaw, G.camPitch, _cd);
    _cam.copy(G.plane.pos).addScaledVector(_cd, -48); _cam.y += 8;
    camera.position.copy(_cam); camera.lookAt(G.plane.pos);
  } else if (u.state === 'fall' || u.state === 'chute' || u.state === 'car' || G.spectate || !u.alive) {
    const yaw = G.spectate ? (G.spectate.state === 'car' ? G.spectate.car.yaw : G.spectate.yaw) : G.camYaw;
    const pitch = G.spectate ? -0.25 : G.camPitch;
    const dist = u.state === 'car' ? 7.5 : u.state === 'chute' ? 8 : u.state === 'fall' ? 6 : 4;
    _piv.set(u.pos.x, u.pos.y + (u.state === 'car' ? 1.6 : 1.3), u.pos.z);
    fwdOf(yaw, pitch, _cd);
    const back = _v1.copy(_cd).negate();
    const t = rayWorld(_piv, back, dist, false);
    _cam.copy(_piv).addScaledVector(back, Math.max(0.5, t - 0.3));
    camera.position.lerp(_cam, u.state === 'car' ? 1 : clamp(dt * 10, 0, 1));
    camera.lookAt(_v2.copy(_piv).addScaledVector(_cd, 10));
  } else {
    const g = activeGun(me);
    G.adsView = me.ads;
    if (me.ads) targetZoom = g && g.scope ? ITEMS[g.scope].zoom : 1.2;
    eyePos(me, _piv);
    if (G.tpp && !me.ads) {
      rightOf(me.yaw, _v1); _piv.addScaledVector(_v1, 0.55); _piv.y += 0.25;
      fwdOf(me.yaw, me.pitch, _cd); const back = _v2.copy(_cd).negate();
      const t = rayWorld(_piv, back, 2.8, false);
      camera.position.copy(_piv).addScaledVector(back, Math.max(0.3, t - 0.25));
    } else camera.position.copy(_piv);
    camera.rotation.set(me.pitch + G.camKick * 0.012, me.yaw, 0);
  }
  if (G.shake > 0) camera.position.add(_v1.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(G.shake * 0.08));
  if (Math.abs(zoomMul - targetZoom) > 0.01) { zoomMul = lerp(zoomMul, targetZoom, clamp(dt * 16, 0, 1)); if (Math.abs(zoomMul - targetZoom) < 0.02) zoomMul = targetZoom; updateFov(); }
  camera.updateMatrixWorld();
  // 准星目标
  if (me.alive && me.state === 'ground') {
    camera.getWorldDirection(_cd);
    let t = rayWorld(camera.position, _cd, 1200);
    const h = rayUnits(camera.position, _cd, t, me); if (h.u) t = h.t;
    me.aimTarget.copy(camera.position).addScaledVector(_cd, Math.max(t, 2));
  }
}

/* ---------------- 触屏 ---------------- */
function setupTouch() {
  if (!IS_TOUCH) return;
  const T = $('touch');
  const btns = [['M0', '开火', 'big', 24, 150], ['M2', '开镜', '', 124, 230], ['Space', '跳', '', 24, 260], ['KeyC', '蹲', '', 110, 150], ['KeyF', 'F', '', 190, 190], ['KeyR', 'R', '', 24, 340], ['Tab', '包', '', 200, 280], ['KeyM', '图', '', 280, 280], ['Digit8', '药', '', 280, 200], ['Esc', '‖', '', 24, 20]];
  for (const [code, label, cls, right, bottom] of btns) {
    const b = document.createElement('div'); b.className = 'tb ' + cls; b.textContent = label;
    b.style.right = right + 'px'; b.style[code === 'Esc' ? 'top' : 'bottom'] = bottom + 'px';
    b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); if (code === 'Esc') { setPaused(true); return; } if (code[0] === 'M' && code.length === 2) { mouseBtn[+code[1]] = true; pressed.add(code); } else { keys[code] = true; pressed.add(code); } });
    const up = () => { if (code[0] === 'M' && code.length === 2) mouseBtn[+code[1]] = false; else keys[code] = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    T.appendChild(b);
  }
  const st = $('tstick'), knob = st.firstElementChild; let sid = null;
  st.addEventListener('pointerdown', e => { sid = e.pointerId; st.setPointerCapture(sid); });
  st.addEventListener('pointermove', e => { if (e.pointerId !== sid) return; const r = st.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1.1) { x /= l; y /= l; } touchSt.mx = x; touchSt.my = y; knob.style.transform = `translate(${x * 45}px,${y * 45}px)`; });
  const end = () => { sid = null; touchSt.mx = touchSt.my = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  const lk = $('tlook'); let lid = null, lx = 0, ly = 0;
  lk.addEventListener('pointerdown', e => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; lk.setPointerCapture(lid); });
  lk.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; mdx += (e.clientX - lx) * 1.6; mdy += (e.clientY - ly) * 1.6; lx = e.clientX; ly = e.clientY; });
  lk.addEventListener('pointerup', () => lid = null);
}

/* ---------------- 主循环 ---------------- */
const FIXED = 1 / 60;
let acc = 0, lastT = performance.now();
function simStep(dt, first) {
  G.time += dt;
  if (G.plane && !G.plane.gone) updatePlane(G.plane, dt);
  if (G.zone) updateZone(G.zone, dt);
  const me = G.player;
  playerInput(first);
  for (const u of G.units) if (u.bot) botThink(u, dt);
  for (const u of G.units) updateUnit(u, dt);
  for (const c of G.cars) updateCar(c, dt);
  updateBullets(dt); updateNades(dt); updateDrops(dt);
  // 小地图枪声
  if (first) for (const u of G.units) if (u !== me && u.alive && u.fireT > 0 && u.fireT > (activeGun(u) ? GUNS[activeGun(u).id].rate - dt * 1.5 : 0) && u.pos.distanceTo(me.pos) < 250) { (G.shotMarks || (G.shotMarks = [])).push({ x: u.pos.x, z: u.pos.z, t: 1 }); if (G.shotMarks.length > 30) G.shotMarks.shift(); }
  if (me.alive) me.stats.time = G.time;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (G.state === 'play') {
    if (!G.paused) {
      handleUIKeys();
      playerLook();
      acc += dt; let n = 0, first = true;
      while (acc >= FIXED && n < 5) { simStep(FIXED, first); first = false; acc -= FIXED; n++; }
      if (n >= 5) acc = 0;
      for (const u of G.units) animateModel(u, dt);
      updateCamera(dt);
      updateVM(dt, G.player);
      updateItemVisibility(dt);
      glowFx.update(dt); smokeFx.update(dt); updateTracers(dt); updateFlash(dt);
      updateHud(dt);
      const me = G.player;
      if (G.planeLoop) G.planeLoop.set(me.state === 'plane' ? 0.18 : G.plane && !G.plane.gone ? clamp(0.2 - G.plane.pos.distanceTo(camera.position) / 2500, 0, 0.12) : 0, 1);
      if (G.windLoop) G.windLoop.set(me.state === 'fall' ? 0.35 : me.state === 'chute' ? 0.12 : 0, me.state === 'fall' ? me.vel.length() / 40 : 0.5);
    } else mdx = mdy = 0;
    pressed.clear(); wheel = 0;
  } else if (G.state === 'menu') {
    const t = now / 1000, s = G.lobbySpot;
    if (s && G.lobby) {
      const m = G.lobby.model; m.hips.position.y = 0.92 + Math.sin(t * 2) * 0.008; m.arms.rotation.x = -0.25 + Math.sin(t * 1.3) * 0.02; m.head.rotation.y = Math.sin(t * 0.5) * 0.2;
      flatFwd(s.yaw, _v1); rightOf(s.yaw, _v2);
      camera.position.copy(s.pos).addScaledVector(_v1, 3.2).addScaledVector(_v2, -0.9 + Math.sin(t * 0.15) * 0.3); camera.position.y += 1.5;
      camera.lookAt(_v3.copy(s.pos).addScaledVector(_v2, -0.9).setY(s.pos.y + 1.15));
    }
    glowFx.update(dt); smokeFx.update(dt);
    pressed.clear(); wheel = 0;
  } else if (G.state === 'result') {
    const t = now / 1000, u = G.player;
    if (u) { camera.position.set(u.pos.x + Math.sin(t * 0.3) * 5, u.pos.y + 2.2, u.pos.z + Math.cos(t * 0.3) * 5); camera.lookAt(u.pos.x, u.pos.y + 1, u.pos.z); animateModel(u, dt); u.model.root.visible = true; }
  }
  if (W.sky) { W.sky.position.copy(camera.position); W.sky.material.uniforms.t.value = now / 1000; }
  sun.target.position.set(camera.position.x, 0, camera.position.z);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 250);
  renderer.autoClear = false; renderer.clear();
  renderer.render(scene, camera);
  if (G.state === 'play' && VM.group && VM.group.visible) { renderer.clearDepth(); VM.cam.aspect = camera.aspect; VM.cam.fov = 55; VM.cam.updateProjectionMatrix(); renderer.render(VM.scene, VM.cam); }
}

/* ---------------- 启动 ---------------- */
function boot() {
  applyQuality();
  buildWorld(irand(1, 99999));
  pickLobbySpot(); lobbyModel(); buildMenu(); setupTouch();
  $('loading').classList.add('hidden'); $('menu').classList.remove('hidden');
  requestAnimationFrame(frame);
}
addEventListener('pointerdown', () => initAudio(), { once: true });
window.__pg = { renderer, scene, G, W, settings, startGame, toMenu, keys, mouseBtn, pressed, sim(sec) { for (let i = 0; i < sec * 60; i++) { simStep(1 / 60, i % 6 === 0); pressed.clear(); } }, damage, spawnItem, pickupEntry, newGun, activeGun, setActive, addItem };
setTimeout(boot, 30);
