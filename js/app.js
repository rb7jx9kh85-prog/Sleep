/* ------------------------------------------------------------------
   App wiring — navigation, clock, flight selection, the window
   experience, sleep timer and the gentle fade to sleep.
-------------------------------------------------------------------*/
(function(){
  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];

  const screens = {
    home:   $("#screen-home"),
    select: $("#screen-select"),
    window: $("#screen-window"),
  };
  function show(name){
    Object.values(screens).forEach(s=>s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  /* ---- clocks ---- */
  function tick(){
    const d = new Date();
    const s = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    $("#clock-home").textContent = s;
    $("#clock-select").textContent = s;
    const h = d.getHours();
    $("#greet").textContent =
      h >= 22 || h < 5 ? "Bonne nuit !" :
      h < 12 ? "Bon matin !" :
      h < 18 ? "Bon après-midi !" : "Bonne soirée !";
  }
  tick(); setInterval(tick, 10000);

  $("#home-city").textContent = HOME_CITY;

  /* ---- maps ---- */
  const homeMap   = NightMap($("#homeMap"));
  const selectMap = NightMap($("#selectMap"));
  homeMap.start();

  /* ---- subtle first-class / "act as if" flavour ---- */
  const QUOTES = [
    "Premier rang ce soir. Comme dans la vie.",
    "Le sommeil, ce sont des intérêts composés.",
    "Les loups dorment avant la chasse.",
    "Repose-toi. Demain, tu signes.",
    "Ferme les yeux — le deal attendra le réveil.",
    "L'altitude, ça se mérite.",
    "Dors comme si tu avais déjà réussi.",
    "Le seul vol qui compte mène à tes objectifs.",
  ];
  let quoteTimer = null;
  function setQuote(){
    const q = $("#durQuote"); if (!q) return;
    q.style.opacity = "0";
    setTimeout(()=>{ q.textContent = "« " + QUOTES[Math.floor(Math.random()*QUOTES.length)] + " »";
      q.style.opacity = ".85"; }, 300);
  }

  /* ---- region filter ---- */
  const REGIONS = ["Europe","Grand Nord","Transatlantique","Ultra long-courrier"];
  let activeRegion = "Europe";
  const regionRow = $("#regionRow");
  function renderRegions(){
    regionRow.innerHTML = "";
    REGIONS.forEach(r=>{
      const b = document.createElement("button");
      b.className = "rchip" + (r===activeRegion ? " active" : "");
      b.textContent = r;
      b.addEventListener("click", ()=>{
        activeRegion = r;
        // jump selection to first flight of this region
        selected = FLIGHTS.findIndex(f=>f.region===r);
        setDuration(FLIGHTS[selected].min);
        renderRegions(); renderCards();
      });
      regionRow.appendChild(b);
    });
  }

  /* ---- flight cards ---- */
  let selected = 0;
  const cardsEl = $("#flightCards");
  function renderCards(){
    cardsEl.innerHTML = "";
    FLIGHTS.forEach((f,i)=>{
      if (f.region !== activeRegion) return;
      const th = THEMES[f.theme];
      const card = document.createElement("div");
      card.className = "fcard" + (i===selected ? " selected" : "");
      card.innerHTML = `
        <span class="badge">✈ ${f.to}</span>
        <div class="fcity">${f.city}</div>
        <div class="fdur">${fmtDuration(f.min)} de vol</div>
        <div class="ftheme">${th.name}</div>`;
      card.addEventListener("click", ()=>{
        selected = i; setDuration(f.min); renderCards();
      });
      cardsEl.appendChild(card);
    });
  }

  /* ---- duration counter dial ---- */
  const DUR_MIN = 15, DUR_MAX = 1440;   // 15 min .. 24 h
  const CIRC = 540.35;
  let durationMin = 45;
  const dialFill = $("#dialFill");
  function stepFor(m){ return m < 120 ? 15 : m < 360 ? 30 : 60; }
  function setDuration(m){
    durationMin = Math.max(DUR_MIN, Math.min(DUR_MAX, Math.round(m)));
    const big = $("#durBig"), unit = $("#durUnit");
    if (durationMin < 60){
      big.textContent = durationMin; big.classList.remove("compact");
      unit.textContent = "minutes";
    } else {
      const h = Math.floor(durationMin/60), mm = durationMin%60;
      big.textContent = mm ? `${h} h ${String(mm).padStart(2,"0")}` : `${h} h`;
      big.classList.add("compact");
      unit.textContent = "de vol";
    }
    const frac = (durationMin - DUR_MIN) / (DUR_MAX - DUR_MIN);
    dialFill.style.strokeDashoffset = CIRC * (1 - frac);
    setQuote();
  }
  $("#durMinus").addEventListener("click", ()=> setDuration(durationMin - stepFor(durationMin-1)));
  $("#durPlus").addEventListener("click",  ()=> setDuration(durationMin + stepFor(durationMin)));

  /* ---- navigation ---- */
  $("#goSelect").addEventListener("click", ()=>{
    renderRegions(); renderCards(); setDuration(FLIGHTS[selected].min);
    selectMap.start(); show("select");
    clearInterval(quoteTimer); quoteTimer = setInterval(setQuote, 7000);
  });
  $("#backSelect").addEventListener("click", ()=>{
    selectMap.stop(); clearInterval(quoteTimer); show("home");
  });
  $("#shuffleFlight").addEventListener("click", ()=>{
    selected = Math.floor(Math.random()*FLIGHTS.length);
    activeRegion = FLIGHTS[selected].region;
    setDuration(FLIGHTS[selected].min);
    renderRegions(); renderCards();
  });

  /* ---- the window experience ---- */
  const scene = Scene($("#scene"));
  const winScreen = screens.window;
  let flightTimer = null, nightRaf = null, flightStart = 0, flightMs = 0;
  let sleepMin = 30; // default sleep timer

  function startFlight(){
    const f = FLIGHTS[selected];
    const th = THEMES[f.theme];
    $("#hudFrom").textContent = f.from;
    $("#hudTo").textContent   = f.to;
    const nFrom = th.nightFrom ?? 0, nTo = th.nightTo ?? 1;
    scene.setTheme(th);
    scene.setNight(nFrom);
    scene.start();

    // sky progression across the chosen flight length (per-theme range)
    flightStart = performance.now();
    flightMs = durationMin * 60 * 1000;
    cancelAnimationFrame(nightRaf);
    (function progress(){
      const p = Math.min(1, (performance.now() - flightStart) / flightMs);
      scene.setNight(nFrom + (nTo - nFrom) * p);
      const remain = Math.max(0, flightMs - (performance.now()-flightStart));
      const h = Math.floor(remain/3600000);
      const mm = Math.floor(remain%3600000/60000), ss = Math.floor(remain%60000/1000);
      $("#hudTime").textContent = h > 0
        ? `${h}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
        : `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
      $("#hudSub").textContent = p<0.05?"Décollage":p>0.95?"Approche":"Altitude de croisière";
      nightRaf = requestAnimationFrame(progress);
    })();

    CabinAudio.enable();
    show("window");
    resetSleepTimer();
  }
  $("#bookFlight").addEventListener("click", startFlight);

  function leaveWindow(){
    scene.stop();
    cancelAnimationFrame(nightRaf);
    clearTimeout(flightTimer);
    CabinAudio.stop();
    $("#sleepFade").classList.remove("on","instant");
    winScreen.classList.remove("shade-down");
    $("#hud").classList.remove("hidden");
    show("home");
  }
  $("#exitWindow").addEventListener("click", leaveWindow);

  /* ---- HUD toggle on tap ---- */
  $("#scene").addEventListener("click", ()=>{
    $("#hud").classList.toggle("hidden");
  });
  $("#tapHint") && (()=>{})();

  /* ---- window shade ---- */
  $("#shadeBtn").addEventListener("click", (e)=>{
    e.stopPropagation();
    const down = winScreen.classList.toggle("shade-down");
    $("#shadeBtn").textContent = down ? "Lever le store" : "Baisser le store";
  });

  /* ---- sound ---- */
  const soundSheet = $("#soundSheet");
  $("#soundToggle").addEventListener("click",(e)=>{
    e.stopPropagation();
    soundSheet.classList.add("open");
  });
  $("#closeSound").addEventListener("click", ()=> soundSheet.classList.remove("open"));
  $$("#soundOpts button").forEach(b=>{
    b.addEventListener("click", ()=>{
      $$("#soundOpts button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      CabinAudio.setScape(b.dataset.s);
    });
  });
  $("#volSlider").addEventListener("input", (e)=>{
    CabinAudio.setVolume(e.target.value / 100);
    $("#soundToggle").style.opacity = +e.target.value > 0 ? "1" : ".4";
  });

  /* ---- sleep timer ---- */
  const sheet = $("#timerSheet");
  $("#timerBtn").addEventListener("click",(e)=>{ e.stopPropagation(); openSheet(); });
  $("#closeTimer").addEventListener("click", closeSheet);
  function openSheet(){ markTimer(); sheet.classList.add("open"); }
  function closeSheet(){ sheet.classList.remove("open"); }
  function markTimer(){
    $$("#timerOpts button").forEach(b=>
      b.classList.toggle("active", +b.dataset.min === sleepMin));
  }
  $$("#timerOpts button").forEach(b=>{
    b.addEventListener("click", ()=>{
      sleepMin = +b.dataset.min;
      markTimer(); resetSleepTimer(); closeSheet();
    });
  });

  function resetSleepTimer(){
    clearTimeout(flightTimer);
    $("#sleepFade").classList.remove("on");
    if (sleepMin > 0){
      flightTimer = setTimeout(beginSleep, sleepMin*60*1000);
    }
  }
  function beginSleep(){
    // long, gentle fade to black + audio fade — drift off
    $("#hud").classList.add("hidden");
    $("#sleepFade").classList.add("on");
    CabinAudio.dim(8);
    setTimeout(leaveWindow, 8200);
  }

  // keep screen from sleeping on supported browsers (best effort)
  let wakeLock = null;
  async function requestWake(){
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
    catch(_){}
  }
  document.addEventListener("visibilitychange", ()=>{
    if (document.visibilityState === "visible") requestWake();
  });
  $("#bookFlight").addEventListener("click", requestWake);

})();
