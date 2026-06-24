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
  let puffWhite, puffTint, nightAmount = 0, running = false;

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
    c.fillStyle = rgb(theme.cloudColor);
    c.fillRect(0,0,s,s);
  }

  /* ---- population ---- */
  function build(){
    stars = [];
    const n = Math.round(180 * (theme.stars || 0));
    for (let i = 0; i < n; i++){
      stars.push({ x:Math.random(), y:Math.random()*0.62,
        s:rand(0.4,1.6), tw:Math.random()*6.28, sp:rand(0.01,0.04) });
    }

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

    groundLights = [];
    if (theme.ground === "cities"){
      for (let i = 0; i < 260; i++){
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

  function drawStars(){
    if (!stars.length) return;
    const base = Math.min(1, 0.25 + nightAmount);
    ctx.save();
    for (const s of stars){
      s.tw += s.sp;
      const a = (0.35 + 0.45*Math.sin(s.tw)) * base;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#eaf0ff";
      ctx.fillRect(s.x*W, s.y*HORIZON(), s.s, s.s);
    }
    ctx.restore();
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
    ctx.clearRect(0,0,W,H);
    drawSky();
    drawStars();
    drawAurora();
    drawMoon();
    drawClouds(0,0);      // far deck (behind horizon haze)
    drawHaze();
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
