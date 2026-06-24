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

  /* ---- flight cards ---- */
  let selected = 0;
  const cardsEl = $("#flightCards");
  function renderCards(){
    cardsEl.innerHTML = "";
    FLIGHTS.forEach((f,i)=>{
      const th = THEMES[f.theme];
      const card = document.createElement("div");
      card.className = "fcard" + (i===selected ? " selected" : "");
      card.innerHTML = `
        <span class="badge">✈ ${f.to}</span>
        <div class="fcity">${f.city}</div>
        <div class="fdur">${f.min} min de vol</div>
        <div class="ftheme">${th.name}</div>`;
      card.addEventListener("click", ()=>{
        selected = i; renderCards(); updateDuration();
      });
      cardsEl.appendChild(card);
    });
  }
  function updateDuration(){
    $("#durLabel").textContent = FLIGHTS[selected].min + " min";
  }

  /* ---- navigation ---- */
  $("#goSelect").addEventListener("click", ()=>{
    renderCards(); updateDuration();
    selectMap.start(); show("select");
  });
  $("#backSelect").addEventListener("click", ()=>{ selectMap.stop(); show("home"); });
  $("#shuffleFlight").addEventListener("click", ()=>{
    selected = Math.floor(Math.random()*FLIGHTS.length);
    renderCards(); updateDuration();
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
    scene.setTheme(th);
    scene.setNight(0);
    scene.start();

    // night progression across the flight (dusk -> deep night)
    flightStart = performance.now();
    flightMs = f.min * 60 * 1000;
    cancelAnimationFrame(nightRaf);
    (function progress(){
      const p = Math.min(1, (performance.now() - flightStart) / flightMs);
      scene.setNight(p);
      const remain = Math.max(0, flightMs - (performance.now()-flightStart));
      const mm = Math.floor(remain/60000), ss = Math.floor(remain%60000/1000);
      $("#hudTime").textContent = `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
      $("#hudSub").textContent = p<0.1?"Décollage":p>0.9?"Approche":"Altitude de croisière";
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
  $("#soundToggle").addEventListener("click",(e)=>{
    e.stopPropagation();
    const on = CabinAudio.toggle();
    $("#soundToggle").style.opacity = on ? "1" : ".4";
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
