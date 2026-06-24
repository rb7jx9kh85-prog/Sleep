/* ------------------------------------------------------------------
   The window view — an animated, layered, "ultra realistic" scene of
   the sky seen from an airliner window. Pure canvas.

   Layers (back -> front):
     sky gradient + horizon glow -> stars -> aurora -> moon ->
     atmospheric horizon haze -> distant cloud deck -> ground
     (city lights / ocean glitter / mountains) -> mid clouds ->
     foreground wisps -> wing silhouette with nav + strobe lights
-------------------------------------------------------------------*/
function Scene(canvas){
  const ctx = canvas.getContext("2d");
  let W, H, dpr, raf, t = 0;
  let theme, stars = [], clouds = [], groundLights = [], ridges = [];
  let mwStars = [], seaPuffs = [];
  let strike = 0, strikeX = 0.5, nextStrike = 3;
  let shoot = null, nextShoot = 8;
  let puffWhite, puffTint, puffWhiteSea, nightAmount = 0, running = false;

  const lerp = (a,b,k)=>a+(b-a)*k;
  const rand = (a,b)=>a+Math.random()*(b-a);
  const rgb = (c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];

  /* ---- soft cloud puff sprite (rendered once) ---- */
  function buildPuff(){
    const s = 256;
    puffWhite = document.createElement("canvas");
    puffWhite.width = puffWhite.height = s;
    const c = puffWhite.getContext("2d");
    // a billow: several overlapping soft blobs
    const blobs = 7;
    for (let i = 0; i < blobs; i++){
      const bx = s/2 + rand(-s*0.22,s*0.22);
      const by = s/2 + rand(-s*0.12,s*0.12);
      const r = rand(s*0.18,s*0.34);
      const g = c.createRadialGradient(bx,by,0,bx,by,r);
      g.addColorStop(0,"rgba(255,255,255,0.5)");
      g.addColorStop(0.5,"rgba(255,255,255,0.22)");
      g.addColorStop(1,"rgba(255,255,255,0)");
      c.fillStyle = g;
      c.beginPath(); c.arc(bx,by,r,0,6.283); c.fill();
    }
  }

  function tintPuff(){
    const s = puffWhite.width;
    puffTint = document.createElement("canvas");
    puffTint.width = puffTint.height = s;
    const c = puffTint.getContext("2d");
    c.drawImage(puffWhite,0,0);
    c.globalCompositeOperation = "source-in";
    // vertical light gradient gives the cloud volume (lit top, shaded base)
    const top = mix(theme.cloudColor, [255,255,255], 0.32);
    const bot = mix(theme.cloudColor, [0,0,0], 0.45);
    const g = c.createLinearGradient(0,0,0,s);
    g.addColorStop(0, rgb(top));
    g.addColorStop(0.55, rgb(theme.cloudColor));
    g.addColorStop(1, rgb(bot));
    c.fillStyle = g;
    c.fillRect(0,0,s,s);
  }

  /* ---- population ---- */
  function build(){
    stars = [];
    const n = Math.round(240 * (theme.stars || 0));
    const palette = [[234,240,255],[255,240,214],[210,224,255],[255,255,255]];
    for (let i = 0; i < n; i++){
      const bright = Math.random() < 0.10;
      stars.push({ x:Math.random(), y:Math.random()*0.62,
        s:bright ? rand(1.6,2.6) : rand(0.4,1.5),
        tw:Math.random()*6.28, sp:rand(0.01,0.04),
        col:palette[Math.floor(Math.random()*palette.length)], bright });
    }
    shoot = null; nextShoot = rand(6,14);

    clouds = [];
    // cloud deck near & below the horizon
    const deck = Math.round(26 * (0.4 + theme.cloudDensity));
    for (let i = 0; i < deck; i++){
      clouds.push(newCloud(rand(0.5,0.86), rand(0.18,0.55), 0));
    }
    // mid clouds
    for (let i = 0; i < 6 + theme.cloudDensity*8; i++){
      clouds.push(newCloud(rand(0.46,0.66), rand(0.5,1.0), 1));
    }
    // high wisps
    for (let i = 0; i < 4; i++){
      clouds.push(newCloud(rand(0.2,0.42), rand(0.3,0.6), 2));
    }
    clouds.sort((a,b)=>a.layer-b.layer);

    // milky way band of dense faint stars along a diagonal
    mwStars = [];
    if (theme.milkyway){
      const n = Math.round(420 * theme.milkyway);
      for (let i = 0; i < n; i++){
        const u = Math.random();                 // position along the band
        const spread = Math.pow(Math.random(),2) * 0.11 * (Math.random()<.5?1:-1);
        // band running from lower-left to upper-right
        const bx = u;
        const by = 0.55 - u*0.45 + spread;
        mwStars.push({ x:bx, y:Math.max(0,by), s:rand(0.4,1.4), tw:Math.random()*6.28, sp:rand(0.01,0.03) });
      }
    }

    // sea of clouds (daytime deck / storm deck) filling below the horizon
    seaPuffs = [];
    if (theme.cloudSea){
      for (let i = 0; i < 38; i++){
        seaPuffs.push({ x:Math.random()*1.5-0.25, row:Math.random(),
          scale:rand(1.6,3.2), speed:rand(0.008,0.02), tw:Math.random()*6.28 });
      }
    }

    strike = 0; nextStrike = rand(2,6);

    groundLights = [];
    const cityCount = Math.round(260 * (theme.groundDensity || 1));
    if (theme.ground === "cities"){
      for (let i = 0; i < cityCount; i++){
        const depth = Math.random();            // 0 = near horizon, 1 = near bottom
        groundLights.push({
          x: Math.random()*1.4 - 0.2,
          depth,
          warm: Math.random() < 0.82,
          tw: Math.random()*6.28,
          cluster: Math.random()<0.5 ? rand(0.6,1) : rand(0.1,0.4),
        });
      }
    }

    ridges = [];
    if (theme.ground === "mountains"){
      for (let layer = 0; layer < 3; layer++){
        const pts = [];
        let y = rand(0.2,0.45);
        for (let x = -0.1; x <= 1.2; x += 0.06){
          y += rand(-0.05,0.05);
          y = Math.max(0.1, Math.min(0.6, y));
          pts.push({x, y: y + layer*0.12});
        }
        ridges.push(pts);
      }
    }
    if (theme.ground === "desert"){
      for (let layer = 0; layer < 2; layer++){
        const pts = [];
        let y = rand(0.55,0.7);
        for (let x = -0.1; x <= 1.2; x += 0.12){
          y += rand(-0.04,0.04);
          y = Math.max(0.4, Math.min(0.85, y));
          pts.push({x, y: y + layer*0.1});
        }
        ridges.push(pts);
      }
    }
  }

  function newCloud(yBase, sizeMul, layer){
    const speed = [0.006,0.014,0.022][layer];
    return {
      x: Math.random()*1.4 - 0.2,
      y: yBase + rand(-0.04,0.04),
      scale: (layer===2?rand(0.7,1.3):rand(1.2,2.6)) * sizeMul,
      layer,
      speed: speed * rand(0.8,1.2),
      alpha: [0.95,0.8,0.4][layer] * (theme.cloudAlpha||0.5),
      squash: layer===0?rand(0.35,0.5):rand(0.45,0.65),
    };
  }

  /* ---- sizing ---- */
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  const HORIZON = ()=>H*0.6;

  /* ---- draw passes ---- */
  function drawSky(){
    const top = mix(theme.skyTop, [2,4,10], nightAmount*0.7);
    const midC = mix(theme.skyMid, [6,10,24], nightAmount*0.8);
    const horC = mix(theme.skyHorizon, [10,16,34], nightAmount);

    const g = ctx.createLinearGradient(0,0,0,HORIZON());
    g.addColorStop(0, rgb(top));
    g.addColorStop(0.6, rgb(midC));
    g.addColorStop(1, rgb(horC));
    ctx.fillStyle = g; ctx.fillRect(0,0,W,HORIZON()+2);

    // sun/moon horizon glow
    const gs = (theme.glowStrength||0) * (1 - nightAmount*0.65);
    if (gs > 0.02){
      const gx = (theme.glowX ?? 0.5) * W;
      const gy = HORIZON();
      const rad = ctx.createRadialGradient(gx,gy,0,gx,gy,H*0.7);
      rad.addColorStop(0, rgb(theme.glow, 0.85*gs));
      rad.addColorStop(0.4, rgb(theme.glow, 0.3*gs));
      rad.addColorStop(1, rgb(theme.glow, 0));
      ctx.fillStyle = rad; ctx.fillRect(0,0,W,HORIZON()+2);
    }
  }

  function drawMilkyWay(){
    if (!theme.milkyway || !mwStars.length) return;
    const base = Math.min(1, 0.3 + nightAmount);
    // faint nebula glow along the band
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createLinearGradient(0, HORIZON()*0.55, W, 0);
    grad.addColorStop(0, "rgba(60,40,90,0)");
    grad.addColorStop(0.5, `rgba(120,110,170,${0.10*base})`);
    grad.addColorStop(1, "rgba(40,60,110,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON()*0.55+60); ctx.lineTo(0, HORIZON()*0.55-60);
    ctx.lineTo(W, -60); ctx.lineTo(W, 60); ctx.closePath();
    ctx.fill();
    // dense dust stars
    for (const s of mwStars){
      s.tw += s.sp;
      const a = (0.25 + 0.4*Math.sin(s.tw)) * base;
      ctx.globalAlpha = a;
      ctx.fillStyle = Math.random()<0.04 ? "#fff7e6" : "#dfe6ff";
      ctx.fillRect(s.x*W, s.y*HORIZON(), s.s, s.s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawLightning(){
    if (!theme.storm) return;
    if (strike <= 0.01) return;
    const gx = strikeX*W, gy = HORIZON()*0.7;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(gx,gy,0,gx,gy,H*0.6);
    g.addColorStop(0, `rgba(200,220,255,${0.7*strike})`);
    g.addColorStop(0.3, `rgba(160,190,255,${0.25*strike})`);
    g.addColorStop(1, "rgba(160,190,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  function drawStars(){
    if (!stars.length) return;
    const base = Math.min(1, 0.25 + nightAmount);
    ctx.save();
    for (const s of stars){
      s.tw += s.sp;
      const a = (0.35 + 0.45*Math.sin(s.tw)) * base;
      if (a <= 0.02) continue;
      const x = s.x*W, y = s.y*HORIZON(), col = s.col || [234,240,255];
      if (s.bright){
        // soft glow + a faint diffraction cross for the brightest stars
        const gl = ctx.createRadialGradient(x,y,0,x,y,s.s*5);
        gl.addColorStop(0, rgb(col, 0.5*a));
        gl.addColorStop(1, rgb(col, 0));
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(x,y,s.s*5,0,6.283); ctx.fill();
        ctx.strokeStyle = rgb(col, 0.25*a); ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x-s.s*4,y); ctx.lineTo(x+s.s*4,y);
        ctx.moveTo(x,y-s.s*4); ctx.lineTo(x,y+s.s*4); ctx.stroke();
      }
      ctx.fillStyle = rgb(col, a);
      ctx.beginPath(); ctx.arc(x,y,s.s*0.6,0,6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawShooting(){
    if (nightAmount < 0.4) return;
    nextShoot -= 0.016;
    if (!shoot && nextShoot <= 0){
      shoot = { x:rand(0.1,0.7), y:rand(0.05,0.35), len:rand(80,160),
                vx:rand(3,6), vy:rand(1.2,2.4), life:1 };
      nextShoot = rand(7,18);
    }
    if (!shoot) return;
    shoot.x += shoot.vx/W; shoot.y += shoot.vy/W; shoot.life -= 0.02;
    if (shoot.life <= 0){ shoot = null; return; }
    const x = shoot.x*W, y = shoot.y*HORIZON();
    const tailX = x - shoot.vx*shoot.len*0.12, tailY = y - shoot.vy*shoot.len*0.12;
    const g = ctx.createLinearGradient(tailX,tailY,x,y);
    g.addColorStop(0,"rgba(255,255,255,0)");
    g.addColorStop(1,`rgba(255,255,255,${0.9*shoot.life})`);
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tailX,tailY); ctx.lineTo(x,y); ctx.stroke();
  }

  function drawAirglow(){
    // thin luminous band of atmosphere right on the horizon
    const hy = HORIZON();
    const c = mix(theme.glow || theme.skyHorizon, [255,255,255], 0.2);
    const g = ctx.createLinearGradient(0,hy-18,0,hy+4);
    g.addColorStop(0, rgb(c,0));
    g.addColorStop(1, rgb(c, 0.22 * (theme.glowStrength ? 1 : 0.5) * (1 - nightAmount*0.4)));
    ctx.fillStyle = g; ctx.fillRect(0,hy-18,W,22);
  }

  function drawAurora(){
    if (!theme.aurora) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cols = [[60,220,150],[80,140,255],[150,90,220]];
    for (let b = 0; b < 3; b++){
      const col = cols[b];
      ctx.beginPath();
      const baseY = HORIZON()*(0.28 + b*0.1);
      for (let x = 0; x <= W; x += 12){
        const k = x / W;
        const y = baseY
          + Math.sin(k*6 + t*0.4 + b)*28
          + Math.sin(k*13 - t*0.25 + b*2)*14;
        x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      const grad = ctx.createLinearGradient(0,baseY-60,0,baseY+140);
      grad.addColorStop(0, rgb(col,0));
      grad.addColorStop(0.5, rgb(col,0.16 + 0.06*Math.sin(t*0.6+b)));
      grad.addColorStop(1, rgb(col,0));
      ctx.lineTo(W,HORIZON()); ctx.lineTo(0,HORIZON()); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.restore();
  }

  function drawMoon(){
    const m = theme.moon;
    if (!m) return;
    const x = m.x*W, y = m.y*HORIZON(), r = m.r;
    // glow
    const glow = ctx.createRadialGradient(x,y,0,x,y,r*6*(m.glow||1));
    glow.addColorStop(0,"rgba(220,230,255,0.5)");
    glow.addColorStop(0.3,"rgba(200,215,255,0.14)");
    glow.addColorStop(1,"rgba(200,215,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x,y,r*6*(m.glow||1),0,6.283); ctx.fill();
    // disc
    const disc = ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.2,x,y,r);
    disc.addColorStop(0,"#fdfdf6");
    disc.addColorStop(1,"#cfd6e6");
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fill();
    // craters
    ctx.fillStyle = "rgba(150,160,180,0.35)";
    [[0.3,-0.2,0.18],[-0.25,0.25,0.22],[0.1,0.35,0.12],[-0.4,-0.1,0.1]].forEach(([dx,dy,cr])=>{
      ctx.beginPath(); ctx.arc(x+dx*r,y+dy*r,cr*r,0,6.283); ctx.fill();
    });
  }

  function drawHaze(){
    const hy = HORIZON();
    const c = mix(theme.skyHorizon,[12,18,36],nightAmount);
    const g = ctx.createLinearGradient(0,hy-50,0,hy+30);
    g.addColorStop(0, rgb(c,0));
    g.addColorStop(0.7, rgb(c,0.55));
    g.addColorStop(1, rgb(c,0.9));
    ctx.fillStyle = g; ctx.fillRect(0,hy-50,W,80);
  }

  function drawGround(){
    const hy = HORIZON();
    // base ground/earth shadow below horizon
    const gc = theme.ground==="snow" ? [30,40,60]
             : theme.ground==="ocean" ? [6,12,28]
             : [8,12,22];
    const g = ctx.createLinearGradient(0,hy,0,H);
    g.addColorStop(0, rgb(mix(gc,[4,6,12],nightAmount),1));
    g.addColorStop(1, rgb([2,4,9],1));
    ctx.fillStyle = g; ctx.fillRect(0,hy,W,H-hy);

    if (theme.ground === "cities") drawCities(hy);
    if (theme.ground === "ocean")  drawOcean(hy);
    if (theme.ground === "mountains") drawMountains(hy);
    if (theme.ground === "snow")   drawSnow(hy);
    if (theme.ground === "desert") drawDesert(hy);
    if (theme.cloudSea) drawCloudSea(hy);
  }

  function drawDesert(hy){
    ridges.forEach((pts,idx)=>{
      ctx.beginPath();
      ctx.moveTo(-10,H);
      pts.forEach(p=> ctx.lineTo(p.x*W, hy + p.y*(H-hy)));
      ctx.lineTo(W+10,H); ctx.closePath();
      const warm = idx===0 ? [60,40,40] : [40,28,34];
      const g = ctx.createLinearGradient(0,hy,0,H);
      g.addColorStop(0, rgb(mix(warm,[20,14,18],nightAmount)));
      g.addColorStop(1, rgb([10,7,10]));
      ctx.fillStyle = g; ctx.fill();
    });
  }

  function drawCloudSea(hy){
    // a soft floor of clouds just below the horizon
    for (const p of seaPuffs){
      p.x -= p.speed * 0.016;
      if (p.x < -0.3) p.x += 1.6;
      p.tw += 0.01;
      const w = 320 * p.scale;
      const h = w * 0.42;
      const py = hy + 6 + p.row * (H-hy) * 0.55 + Math.sin(p.tw)*4;
      // brighten with lightning if a storm
      const lift = theme.storm ? strike*0.4 : 0;
      ctx.globalAlpha = Math.min(1, (theme.cloudAlpha||0.7) + lift);
      ctx.drawImage(puffTint, p.x*W - w/2, py - h/2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawCities(hy){
    const groundH = H - hy;
    for (const l of groundLights){
      l.x -= (0.02 + l.depth*0.06) * 0.016 * (0.6 + l.cluster);
      if (l.x < -0.25) l.x += 1.6;
      l.tw += 0.05;
      // perspective: depth 0 (far) near horizon small, depth 1 near bottom large
      const py = hy + Math.pow(l.depth,1.4)*groundH;
      const px = (0.5 + (l.x-0.5)*(0.4 + l.depth*1.4)) * W;
      const size = (0.5 + l.depth*2.2) * l.cluster;
      const a = (0.45 + 0.4*Math.sin(l.tw)) * (0.4 + l.depth*0.6);
      const col = l.warm ? "255,205,120" : "180,210,255";
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.beginPath(); ctx.arc(px,py,size,0,6.283); ctx.fill();
      if (l.depth > 0.5){
        const halo = ctx.createRadialGradient(px,py,0,px,py,size*5);
        halo.addColorStop(0,`rgba(${col},${a*0.4})`);
        halo.addColorStop(1,`rgba(${col},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(px,py,size*5,0,6.283); ctx.fill();
      }
    }
  }

  function drawOcean(hy){
    const m = theme.moon;
    if (!m) return;
    const mx = m.x*W;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 60; i++){
      const yy = hy + (i/60)*(H-hy);
      const spread = 4 + (i/60)*70;
      const x = mx + Math.sin(t*1.5 + i*0.7)*spread;
      const a = (0.06 + 0.06*Math.sin(t*2+i)) * (1 - i/60);
      ctx.fillStyle = `rgba(200,215,255,${a})`;
      ctx.fillRect(x-spread*0.4, yy, spread*0.8, 2);
    }
    ctx.restore();
  }

  function drawMountains(hy){
    ridges.forEach((pts,idx)=>{
      ctx.beginPath();
      ctx.moveTo(-10,H);
      pts.forEach(p=> ctx.lineTo(p.x*W, hy + p.y*(H-hy)*0.5));
      ctx.lineTo(W+10,H); ctx.closePath();
      const shade = 18 + idx*12;
      ctx.fillStyle = `rgb(${shade},${shade+6},${shade+18})`;
      ctx.fill();
    });
  }

  function drawSnow(hy){
    ctx.fillStyle = "rgba(180,200,235,0.06)";
    ctx.fillRect(0,hy,W,H-hy);
  }

  function drawClouds(layerMin, layerMax){
    for (const c of clouds){
      if (c.layer < layerMin || c.layer > layerMax) continue;
      c.x -= c.speed * 0.016;
      if (c.x < -0.35) c.x += 1.7;
      const w = 230 * c.scale, h = 230 * c.scale * c.squash;
      const px = c.x*W, py = c.y < 0.6 ? c.y*H : HORIZON()*0.95 + (c.y-0.6)*H*0.4;
      // tint shifts a touch with glow for sunset realism
      ctx.globalAlpha = c.alpha * (1 - nightAmount*0.3);
      ctx.drawImage(puffTint, px - w/2, py - h/2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawWing(){
    const baseY = H*1.02;
    ctx.save();
    // wing root bottom-left sweeping up to the right tip
    ctx.beginPath();
    ctx.moveTo(-20, H+20);
    ctx.lineTo(-20, H*0.86);
    ctx.quadraticCurveTo(W*0.18, H*0.8, W*0.86, H*0.52);
    ctx.lineTo(W*0.9, H*0.55);
    ctx.quadraticCurveTo(W*0.3, H*0.9, W*0.5, H+20);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0,H*0.5,0,H);
    wg.addColorStop(0,"#10141d");
    wg.addColorStop(1,"#05070c");
    ctx.fillStyle = wg; ctx.fill();
    // faint top edge highlight (moon/sky reflection on metal)
    ctx.strokeStyle = "rgba(150,175,220,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W*0.18, H*0.795);
    ctx.quadraticCurveTo(W*0.5, H*0.66, W*0.86, H*0.52);
    ctx.stroke();

    if (theme.wingLights){
      // green nav light at tip
      const tx = W*0.87, ty = H*0.525;
      const navOn = 0.7 + 0.3*Math.sin(t*3);
      const ng = ctx.createRadialGradient(tx,ty,0,tx,ty,16);
      ng.addColorStop(0,`rgba(80,255,120,${0.9*navOn})`);
      ng.addColorStop(1,"rgba(80,255,120,0)");
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(tx,ty,16,0,6.283); ctx.fill();
      ctx.fillStyle = `rgba(180,255,200,${navOn})`;
      ctx.beginPath(); ctx.arc(tx,ty,2.2,0,6.283); ctx.fill();

      // white strobe — quick double flash on a cycle
      const cyc = t % 2.4;
      const strobe = (cyc < 0.08 || (cyc > 0.18 && cyc < 0.26)) ? 1 : 0;
      if (strobe){
        const sg = ctx.createRadialGradient(tx,ty,0,tx,ty,40);
        sg.addColorStop(0,"rgba(255,255,255,0.95)");
        sg.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(tx,ty,40,0,6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- loop ---- */
  function frame(){
    if (!running) return;
    t += 0.016;
    // storm lightning timing
    if (theme && theme.storm){
      nextStrike -= 0.016;
      if (nextStrike <= 0){
        strike = 1;
        strikeX = rand(0.2, 0.8);
        nextStrike = rand(3, 9);
      }
      // decay with an occasional flicker
      strike *= 0.9;
      if (strike > 0.05 && strike < 0.5 && Math.random() < 0.15) strike = Math.min(1, strike + 0.6);
    }

    ctx.clearRect(0,0,W,H);
    drawSky();
    drawMilkyWay();
    drawStars();
    drawShooting();
    drawAurora();
    drawMoon();
    drawLightning();      // back-lights the cloud deck below
    drawClouds(0,0);      // far deck (behind horizon haze)
    drawHaze();
    drawAirglow();
    drawGround();
    drawClouds(1,1);      // mid
    drawClouds(2,2);      // high wisps foreground
    drawWing();
    raf = requestAnimationFrame(frame);
  }

  return {
    setTheme(th){
      theme = th;
      buildPuff();
      tintPuff();
      build();
    },
    start(){
      resize(); running = true;
      window.addEventListener("resize", resize);
      cancelAnimationFrame(raf); frame();
    },
    stop(){ running = false; cancelAnimationFrame(raf); },
    setNight(k){ nightAmount = Math.max(0, Math.min(1, k)); },
  };
}
