/* ------------------------------------------------------------------
   Night-earth map background (home + select screens).
   Procedural "view from orbit at night": dark land, glowing city
   light clusters, oceans, faint clouds. Slow drift for life.
-------------------------------------------------------------------*/
function NightMap(canvas){
  const ctx = canvas.getContext("2d");
  let W, H, dpr, raf;
  let clusters = [], stars = [], t = 0;

  function rand(a, b){ return a + Math.random() * (b - a); }

  function build(){
    clusters = [];
    // a handful of big metropolitan glows + scattered towns
    const big = 7;
    for (let i = 0; i < big; i++){
      const cx = rand(0.12, 0.88), cy = rand(0.18, 0.86);
      const count = rand(40, 90) | 0;
      const spread = rand(0.05, 0.12);
      for (let j = 0; j < count; j++){
        const a = Math.random() * Math.PI * 2;
        const d = Math.pow(Math.random(), 1.6) * spread;
        clusters.push({
          x: cx + Math.cos(a) * d,
          y: cy + Math.sin(a) * d * 0.8,
          s: rand(0.6, 2.2),
          tw: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.75,
        });
      }
    }
    // sparse rural lights
    for (let i = 0; i < 120; i++){
      clusters.push({ x:Math.random(), y:rand(0.15,1), s:rand(0.4,1), tw:Math.random()*6.28, warm:Math.random()<0.7 });
    }
    // upper-atmosphere stars (over the ocean/space portion)
    stars = [];
    for (let i = 0; i < 60; i++){
      stars.push({ x:Math.random(), y:rand(0,0.4), s:rand(0.4,1.3), tw:Math.random()*6.28 });
    }
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function landBlob(cx, cy, r, seed){
    ctx.beginPath();
    const pts = 14;
    for (let i = 0; i <= pts; i++){
      const a = (i / pts) * Math.PI * 2;
      const n = 1 + 0.32 * Math.sin(a * 3 + seed) + 0.18 * Math.sin(a * 5 + seed * 2);
      const x = cx + Math.cos(a) * r * n;
      const y = cy + Math.sin(a) * r * n * 0.82;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function draw(){
    t += 0.016;
    const drift = Math.sin(t * 0.05) * 6;

    // deep space / ocean gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1430");
    g.addColorStop(0.35, "#0a1a38");
    g.addColorStop(1, "#06101f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // landmasses (dark olive/green, very dim) — abstract continents
    ctx.save();
    ctx.translate(drift, 0);
    const lands = [
      [0.5,0.55,0.42,1.0],[0.2,0.3,0.18,2.3],[0.82,0.7,0.22,4.1],
      [0.35,0.85,0.2,5.5],[0.7,0.35,0.16,3.2],
    ];
    lands.forEach(([x,y,r,s])=>{
      landBlob(x*W, y*H, r*Math.min(W,H), s);
      const lg = ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,r*Math.min(W,H)*1.3);
      lg.addColorStop(0,"#10241c");
      lg.addColorStop(1,"#0a1722");
      ctx.fillStyle = lg; ctx.fill();
    });
    ctx.restore();

    // stars above
    stars.forEach(s=>{
      s.tw += 0.03;
      const a = 0.4 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#cfe0ff";
      ctx.fillRect(s.x*W, s.y*H, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    // city lights
    ctx.save();
    ctx.translate(drift, 0);
    clusters.forEach(c=>{
      c.tw += 0.05;
      const a = 0.55 + 0.45 * Math.sin(c.tw);
      const x = c.x * W, y = c.y * H;
      const col = c.warm ? "255,210,130" : "180,210,255";
      ctx.beginPath();
      ctx.fillStyle = `rgba(${col},${0.9*a})`;
      ctx.arc(x, y, c.s, 0, 6.283); ctx.fill();
      // soft halo
      const halo = ctx.createRadialGradient(x,y,0,x,y,c.s*4);
      halo.addColorStop(0,`rgba(${col},${0.25*a})`);
      halo.addColorStop(1,`rgba(${col},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x,y,c.s*4,0,6.283); ctx.fill();
    });
    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  return {
    start(){ resize(); build(); cancelAnimationFrame(raf); draw();
      window.addEventListener("resize", resize); },
    stop(){ cancelAnimationFrame(raf); },
  };
}
