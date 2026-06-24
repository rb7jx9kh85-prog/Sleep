/* ------------------------------------------------------------------
   Map background for the home & select screens.

   Primary: a REAL satellite map (Esri World Imagery — free, no API
   key) via Leaflet, darkened for a night mood, with glowing airport
   badges. On the select screen the badges are tappable to pick a
   flight and the map flies to the chosen route.

   Fallback: if Leaflet/tiles are unavailable (offline), a procedural
   "earth at night" canvas is drawn instead, so the app still looks
   good with no network.
-------------------------------------------------------------------*/

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function makeMap(el, opts){
  opts = Object.assign({ interactive:false, onSelect:null, zoom:4 }, opts || {});
  if (window.L) {
    try { return leafletMap(el, opts); }
    catch(e){ /* fall through to canvas */ }
  }
  return canvasMap(el);
}

/* =============== Leaflet satellite map =============== */
function leafletMap(el, opts){
  el.classList.add("sat");
  const map = L.map(el, {
    zoomControl:false, attributionControl:false,
    dragging:opts.interactive, scrollWheelZoom:false, doubleClickZoom:false,
    boxZoom:false, keyboard:false, tap:false, inertia:true,
    minZoom:2, maxZoom:9, worldCopyJump:true,
  }).setView(HOME_COORD, opts.zoom);

  L.tileLayer(ESRI_IMAGERY, { maxZoom:9, crossOrigin:true }).addTo(map);

  const markers = {};   // flight index -> marker
  let homeMarker = null;
  let selectedIdx = -1;

  function badge(code, kind){
    return L.divIcon({
      className:"",
      html:`<div class="ap-badge ${kind||""}">✈ ${code}</div>`,
      iconSize:[0,0], iconAnchor:[0,0],
    });
  }

  function addMarkers(){
    // home
    homeMarker = L.marker(HOME_COORD, {
      icon:L.divIcon({className:"", html:`<div class="ap-badge home">GVA</div>`, iconSize:[0,0], iconAnchor:[0,0]}),
      interactive:false, keyboard:false,
    }).addTo(map);
    // destinations
    FLIGHTS.forEach((f,i)=>{
      const c = AIRPORTS[f.to]; if (!c) return;
      const m = L.marker(c, { icon:badge(f.to), interactive:!!opts.interactive, keyboard:false }).addTo(map);
      if (opts.interactive && opts.onSelect){
        m.on("click", ()=> opts.onSelect(i));
      }
      markers[i] = m;
    });
  }

  function setSelected(i){
    if (markers[selectedIdx]) markers[selectedIdx].setIcon(badge(FLIGHTS[selectedIdx].to));
    selectedIdx = i;
    if (markers[i]) markers[i].setIcon(badge(FLIGHTS[i].to, "selected"));
  }

  return {
    start(){
      if (!homeMarker) addMarkers();
      setTimeout(()=> map.invalidateSize(), 60);
    },
    stop(){},
    select(i){
      setSelected(i);
      const c = AIRPORTS[FLIGHTS[i].to]; if (!c) return;
      // frame both Geneva and the destination
      const b = L.latLngBounds([HOME_COORD, c]).pad(0.45);
      map.flyToBounds(b, { duration:1.1, maxZoom:6 });
    },
    focusRegion(region){
      const pts = [HOME_COORD];
      FLIGHTS.forEach(f=>{ if (f.region===region && AIRPORTS[f.to]) pts.push(AIRPORTS[f.to]); });
      if (pts.length > 1) map.flyToBounds(L.latLngBounds(pts).pad(0.3), { duration:1.1, maxZoom:6 });
    },
    isReal:true,
  };
}

/* =============== procedural fallback =============== */
function canvasMap(el){
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let W,H,dpr,raf,clusters=[],stars=[],t=0;
  const rand=(a,b)=>a+Math.random()*(b-a);

  function build(){
    clusters=[];
    for (let i=0;i<7;i++){
      const cx=rand(0.12,0.88), cy=rand(0.18,0.86), count=rand(40,90)|0, spread=rand(0.05,0.12);
      for (let j=0;j<count;j++){
        const a=Math.random()*6.283, d=Math.pow(Math.random(),1.6)*spread;
        clusters.push({x:cx+Math.cos(a)*d, y:cy+Math.sin(a)*d*0.8, s:rand(0.6,2.2), tw:Math.random()*6.28, warm:Math.random()<0.75});
      }
    }
    for (let i=0;i<120;i++) clusters.push({x:Math.random(),y:rand(0.15,1),s:rand(0.4,1),tw:Math.random()*6.28,warm:Math.random()<0.7});
    stars=[];
    for (let i=0;i<60;i++) stars.push({x:Math.random(),y:rand(0,0.4),s:rand(0.4,1.3),tw:Math.random()*6.28});
  }
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=canvas.clientWidth; H=canvas.clientHeight;
    canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function landBlob(cx,cy,r,seed){
    ctx.beginPath();
    for (let i=0;i<=14;i++){
      const a=(i/14)*6.283, n=1+0.32*Math.sin(a*3+seed)+0.18*Math.sin(a*5+seed*2);
      const x=cx+Math.cos(a)*r*n, y=cy+Math.sin(a)*r*n*0.82;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function draw(){
    t+=0.016; const drift=Math.sin(t*0.05)*6;
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0a1430"); g.addColorStop(0.35,"#0a1a38"); g.addColorStop(1,"#06101f");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.translate(drift,0);
    [[0.5,0.55,0.42,1],[0.2,0.3,0.18,2.3],[0.82,0.7,0.22,4.1],[0.35,0.85,0.2,5.5],[0.7,0.35,0.16,3.2]].forEach(([x,y,r,s])=>{
      landBlob(x*W,y*H,r*Math.min(W,H),s);
      const lg=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,r*Math.min(W,H)*1.3);
      lg.addColorStop(0,"#10241c"); lg.addColorStop(1,"#0a1722"); ctx.fillStyle=lg; ctx.fill();
    });
    ctx.restore();
    stars.forEach(s=>{ s.tw+=0.03; ctx.globalAlpha=0.4+0.4*Math.sin(s.tw); ctx.fillStyle="#cfe0ff"; ctx.fillRect(s.x*W,s.y*H,s.s,s.s); });
    ctx.globalAlpha=1;
    ctx.save(); ctx.translate(drift,0);
    clusters.forEach(c=>{
      c.tw+=0.05; const a=0.55+0.45*Math.sin(c.tw), x=c.x*W, y=c.y*H, col=c.warm?"255,210,130":"180,210,255";
      ctx.beginPath(); ctx.fillStyle=`rgba(${col},${0.9*a})`; ctx.arc(x,y,c.s,0,6.283); ctx.fill();
      const halo=ctx.createRadialGradient(x,y,0,x,y,c.s*4);
      halo.addColorStop(0,`rgba(${col},${0.25*a})`); halo.addColorStop(1,`rgba(${col},0)`);
      ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(x,y,c.s*4,0,6.283); ctx.fill();
    });
    ctx.restore();
    raf=requestAnimationFrame(draw);
  }
  return {
    start(){ resize(); if(!clusters.length) build(); cancelAnimationFrame(raf); draw(); window.addEventListener("resize",resize); },
    stop(){ cancelAnimationFrame(raf); },
    select(){}, focusRegion(){}, isReal:false,
  };
}
