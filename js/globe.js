/* ------------------------------------------------------------------
   "Survol de la Terre" — a dotted, slowly turning globe with the
   great-circle flight route drawn over it and a little plane flying
   along the arc. Pure canvas, orthographic projection.

   Used as the boarding animation (GVA -> destination) before the
   window view, and as a relaxing loop from the home screen.
-------------------------------------------------------------------*/

/* very rough continent outlines [lng, lat] — enough for a readable
   dotted Earth (this is a stylised globe, not a survey map) */
const CONTINENTS = [
  // North America
  [[-168,65],[-150,70],[-95,72],[-80,63],[-64,60],[-55,50],[-70,42],[-81,25],[-97,18],[-110,23],[-124,34],[-130,48],[-140,60],[-168,65]],
  // Greenland
  [[-55,60],[-45,60],[-20,70],[-30,82],[-50,80],[-58,70],[-55,60]],
  // South America
  [[-80,8],[-60,10],[-50,0],[-35,-8],[-40,-23],[-58,-35],[-68,-52],[-75,-45],[-70,-20],[-80,8]],
  // Europe
  [[-10,36],[0,44],[-5,50],[2,58],[12,65],[28,70],[40,66],[40,48],[28,40],[14,38],[0,38],[-10,36]],
  // Africa
  [[-16,28],[10,34],[24,32],[34,30],[44,12],[51,12],[40,-5],[40,-22],[25,-34],[12,-18],[8,4],[-8,6],[-16,28]],
  // Asia
  [[40,48],[60,60],[90,72],[140,72],[170,66],[145,55],[140,45],[122,40],[120,22],[105,8],[95,6],[80,8],[72,20],[60,25],[44,38],[40,48]],
  // India peninsula
  [[70,24],[80,28],[88,22],[80,8],[74,16],[70,24]],
  // Australia
  [[114,-22],[130,-12],[142,-12],[150,-25],[146,-38],[134,-35],[122,-34],[114,-22]],
];

function Globe(canvas){
  const ctx = canvas.getContext("2d");
  let W,H,dpr,raf,t=0,running=false;
  let land=[], stars=[];
  let lon0=0, lat0=18, spin=0;
  let route=null, p=0, loop=false, onDone=null, done=false;
  let startMs=0; const DUR=7000;   // ms for the plane to cross the arc
  const R = ()=> Math.min(W,H)*0.36;
  const D2R = Math.PI/180;
  const rand=(a,b)=>a+Math.random()*(b-a);

  function pointInPoly(lng,lat,poly){
    let inside=false;
    for (let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
      if (((yi>lat)!==(yj>lat)) && (lng < (xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
  }
  function buildLand(){
    land=[];
    for (let lat=-84; lat<=84; lat+=3.2){
      for (let lng=-180; lng<180; lng+=3.2){
        for (const poly of CONTINENTS){
          if (pointInPoly(lng,lat,poly)){ land.push([lng,lat]); break; }
        }
      }
    }
    stars=[];
    for (let i=0;i<140;i++) stars.push({x:Math.random(),y:Math.random(),s:rand(0.4,1.4),tw:Math.random()*6.28});
  }

  // unit vector from lat/lng
  function vec(lat,lng){
    const a=lat*D2R, b=lng*D2R;
    return [Math.cos(a)*Math.cos(b), Math.cos(a)*Math.sin(b), Math.sin(a)];
  }
  // project lat/lng -> screen; returns {x,y,vis}
  function project(lat,lng,rmul=1){
    const φ=lat*D2R, λ=(lng-lon0)*D2R, φ0=lat0*D2R;
    const cosc = Math.sin(φ0)*Math.sin(φ)+Math.cos(φ0)*Math.cos(φ)*Math.cos(λ);
    const r=R()*rmul;
    const x=r*Math.cos(φ)*Math.sin(λ);
    const y=r*(Math.cos(φ0)*Math.sin(φ)-Math.sin(φ0)*Math.cos(φ)*Math.cos(λ));
    return { x:W/2+x, y:H/2-y, vis:cosc>0, cosc };
  }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=canvas.clientWidth; H=canvas.clientHeight;
    canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function draw(){
    if(!running) return;
    t+=0.016;
    ctx.clearRect(0,0,W,H);

    // space + stars
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#040814"); bg.addColorStop(1,"#02040b");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{ s.tw+=0.03; ctx.globalAlpha=0.3+0.4*Math.sin(s.tw);
      ctx.fillStyle="#cfe0ff"; ctx.fillRect(s.x*W,s.y*H,s.s,s.s); });
    ctx.globalAlpha=1;

    // slow turn
    lon0 += loop ? 0.18 : 0.05;

    const cx=W/2, cy=H/2, r=R();
    // atmosphere glow
    const atm=ctx.createRadialGradient(cx,cy,r*0.85,cx,cy,r*1.28);
    atm.addColorStop(0,"rgba(90,150,255,0)");
    atm.addColorStop(0.6,"rgba(90,150,255,0.18)");
    atm.addColorStop(1,"rgba(90,150,255,0)");
    ctx.fillStyle=atm; ctx.beginPath(); ctx.arc(cx,cy,r*1.28,0,6.283); ctx.fill();

    // ocean sphere
    const oce=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);
    oce.addColorStop(0,"#15406e"); oce.addColorStop(0.7,"#0d2748"); oce.addColorStop(1,"#081a30");
    ctx.fillStyle=oce; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283); ctx.fill();

    // graticule (faint)
    ctx.strokeStyle="rgba(120,160,220,0.10)"; ctx.lineWidth=1;
    for (let lat=-60;lat<=60;lat+=30){
      ctx.beginPath(); let first=true;
      for (let lng=-180;lng<=180;lng+=6){ const q=project(lat,lng); if(!q.vis){first=true;continue;}
        first?(ctx.moveTo(q.x,q.y),first=false):ctx.lineTo(q.x,q.y);} ctx.stroke();
    }
    for (let lng=-180;lng<180;lng+=30){
      ctx.beginPath(); let first=true;
      for (let lat=-84;lat<=84;lat+=6){ const q=project(lat,lng); if(!q.vis){first=true;continue;}
        first?(ctx.moveTo(q.x,q.y),first=false):ctx.lineTo(q.x,q.y);} ctx.stroke();
    }

    // land dots
    for (const [lng,lat] of land){
      const q=project(lat,lng); if(!q.vis) continue;
      const a=0.35+0.6*q.cosc;
      ctx.fillStyle=`rgba(126,196,140,${a})`;
      const sz=1.3+1.3*q.cosc;
      ctx.fillRect(q.x-sz/2,q.y-sz/2,sz,sz);
    }

    // route arc + plane
    if (route){
      // time-based progress (independent of framerate)
      const el = performance.now()-startMs;
      if (loop){ p = Math.min(1, (el % (DUR+2200))/DUR); }
      else { p = Math.min(1, el/DUR); }

      const v1=vec(route.from[0],route.from[1]);
      const v2=vec(route.to[0],route.to[1]);
      let dot=v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2];
      dot=Math.max(-1,Math.min(1,dot));
      const ω=Math.acos(dot), sinω=Math.sin(ω)||1e-6;
      const at=(f)=>{
        const k1=Math.sin((1-f)*ω)/sinω, k2=Math.sin(f*ω)/sinω;
        let x=k1*v1[0]+k2*v2[0], y=k1*v1[1]+k2*v2[1], z=k1*v1[2]+k2*v2[2];
        const m=Math.hypot(x,y,z); x/=m;y/=m;z/=m;
        const lat=Math.asin(z)/D2R, lng=Math.atan2(y,x)/D2R;
        const rmul=1+0.16*Math.sin(Math.PI*f);
        return project(lat,lng,rmul);
      };
      // full faint arc
      ctx.strokeStyle="rgba(255,207,92,0.25)"; ctx.lineWidth=1.5;
      ctx.beginPath(); let first=true;
      for (let f=0;f<=1.0001;f+=0.02){ const q=at(f); if(!q.vis){first=true;continue;}
        first?(ctx.moveTo(q.x,q.y),first=false):ctx.lineTo(q.x,q.y);} ctx.stroke();
      // travelled (bright) up to p
      ctx.strokeStyle="rgba(255,207,92,0.95)"; ctx.lineWidth=2.4; ctx.lineCap="round";
      ctx.beginPath(); first=true;
      for (let f=0;f<=p+0.0001;f+=0.02){ const q=at(f); if(!q.vis){first=true;continue;}
        first?(ctx.moveTo(q.x,q.y),first=false):ctx.lineTo(q.x,q.y);} ctx.stroke();

      // endpoints
      const drawDot=(c,code,col)=>{ const q=project(c[0],c[1]); if(!q.vis) return;
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(q.x,q.y,3.5,0,6.283); ctx.fill();
        ctx.fillStyle="rgba(255,255,255,.9)"; ctx.font="600 11px Inter,sans-serif";
        ctx.fillText(code,q.x+6,q.y-6); };
      drawDot(route.from,route.fromCode||"GVA","#ffffff");
      drawDot(route.to,route.toCode||"",  "#ffcf5c");

      // the plane
      const cur=at(Math.min(p,1)), nxt=at(Math.min(p+0.02,1));
      if (cur.vis){
        const ang=Math.atan2(nxt.y-cur.y,nxt.x-cur.x);
        ctx.save(); ctx.translate(cur.x,cur.y); ctx.rotate(ang);
        ctx.fillStyle="#fff";
        ctx.beginPath();
        ctx.moveTo(9,0); ctx.lineTo(-6,5); ctx.lineTo(-3,0); ctx.lineTo(-6,-5); ctx.closePath();
        ctx.fill();
        // glow
        ctx.shadowColor="rgba(255,255,255,.8)"; ctx.shadowBlur=8; ctx.fill();
        ctx.restore();
      }

      // fire the boarding callback once the plane lands
      if (!loop && p>=1 && !done){ done=true; onDone&&onDone(); }
    }

    raf=requestAnimationFrame(draw);
  }

  return {
    start(opts){
      resize(); if(!land.length) buildLand();
      route = (opts.from&&opts.to) ? {from:opts.from,to:opts.to,fromCode:opts.fromCode,toCode:opts.toCode} : null;
      loop = !!opts.loop; onDone = opts.onDone||null; p=0; done=false; startMs=performance.now();
      if (route){
        lat0 = Math.max(-35,Math.min(60,(route.from[0]+route.to[0])/2 + 8));
        lon0 = (route.from[1]+route.to[1])/2;
      }
      running=true; window.addEventListener("resize",resize);
      cancelAnimationFrame(raf); draw();
    },
    stop(){ running=false; cancelAnimationFrame(raf); },
  };
}
