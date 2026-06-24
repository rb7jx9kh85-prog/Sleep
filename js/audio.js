/* ------------------------------------------------------------------
   Ambient soundscapes — 100% generated with the Web Audio API.
   No MP3, no files: each "scape" is shaped noise looping forever,
   so there is never an audible loop seam. Great for sleeping.

     cabin  — airliner engine drone + low rumble (default)
     white  — soft pink/white noise
     rain   — gentle rain hiss with a slow patter
     wind   — airflow whoosh sweeping slowly

   API: enable() · setScape(name) · setVolume(0..1) · toggle()
        · stop() · dim(seconds) · isOn()
-------------------------------------------------------------------*/
const CabinAudio = (() => {
  let ctx, master, analyser, started = false, muted = false;
  let userVol = 0.65;           // 0..1 from the volume slider
  let scape = "cabin";
  const branches = {};          // name -> { gain, nodes... }

  function whiteBuffer(c, seconds = 5){
    const len = c.sampleRate * seconds;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function brownBuffer(c, seconds = 5){
    const len = c.sampleRate * seconds;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++){
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  function src(buffer){
    const s = ctx.createBufferSource();
    s.buffer = buffer; s.loop = true; s.start();
    return s;
  }
  function filt(type, freq, q){
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  function gain(v){ const g = ctx.createGain(); g.gain.value = v; return g; }

  function build(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    master.connect(analyser);

    const white = whiteBuffer(ctx);
    const brown = brownBuffer(ctx);

    /* ---- cabin: engine rumble + audible airflow hiss ---- */
    {
      const g = gain(0);
      // low engine rumble
      const n = src(brown);
      const hp = filt("highpass", 60);
      const peak = filt("peaking", 150, 1.0); peak.gain.value = 6;
      const lp = filt("lowpass", 420, 0.6);
      const rg = gain(0.7);
      n.connect(hp); hp.connect(peak); peak.connect(lp); lp.connect(rg); rg.connect(g);
      // broadband airflow hiss — this is what makes it audible on phone speakers
      const h = src(white);
      const hbp = filt("bandpass", 1700, 0.5);
      const hg = gain(0.22);
      h.connect(hbp); hbp.connect(hg); hg.connect(g);
      g.connect(master);
      // slow breathing
      const lfo = ctx.createOscillator(); const lg = gain(0.05);
      lfo.frequency.value = 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      branches.cabin = { gain: g, base: 0.7 };
    }

    /* ---- white / pink noise ---- */
    {
      const g = gain(0);
      const n = src(white);
      const hp = filt("highpass", 80);
      const lp = filt("lowpass", 6500, 0.4);   // tilt toward pink = softer
      n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      branches.white = { gain: g, base: 0.22 };
    }

    /* ---- rain ---- */
    {
      const g = gain(0);
      const n = src(white);
      const hp = filt("highpass", 1100);
      const lp = filt("lowpass", 7000);
      n.connect(hp); hp.connect(lp); lp.connect(g);
      // gentle patter: tremolo on the gain
      const trem = ctx.createOscillator(); const tg = gain(0.10);
      trem.type = "sine"; trem.frequency.value = 2.3; trem.connect(tg); tg.connect(g.gain); trem.start();
      // a touch of low rumble under the rain
      const r = src(brown); const rlp = filt("lowpass", 220); const rg = gain(0.25);
      r.connect(rlp); rlp.connect(rg); rg.connect(g);
      g.connect(master);
      branches.rain = { gain: g, base: 0.5 };
    }

    /* ---- wind / airflow ---- */
    {
      const g = gain(0);
      const n = src(white);
      const bp = filt("bandpass", 500, 0.8);
      n.connect(bp); bp.connect(g); g.connect(master);
      // slow filter sweep = whoosh
      const sweep = ctx.createOscillator(); const sg = gain(260);
      sweep.frequency.value = 0.05; sweep.connect(sg); sg.connect(bp.frequency); sweep.start();
      branches.wind = { gain: g, base: 0.6 };
    }

    started = true;

    // belt & braces: keep trying to resume on any user gesture (autoplay)
    const resume = ()=>{ if (ctx && ctx.state === "suspended") ctx.resume(); };
    ["pointerdown","touchstart","click","keydown"].forEach(ev=>
      document.addEventListener(ev, resume, { passive:true }));
  }

  function ramp(param, v, t = 1.2){
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(v, ctx.currentTime + t);
  }
  function applyScape(t = 1.5){
    for (const name in branches){
      ramp(branches[name].gain.gain, name === scape ? branches[name].base : 0, t);
    }
  }
  function masterTarget(){ return muted ? 0 : userVol; }

  return {
    enable(){
      if (!started) build();
      if (ctx && ctx.state === "suspended") ctx.resume();
      muted = false;
      applyScape(2);
      ramp(master.gain, masterTarget(), 2.5);
    },
    setScape(name){
      if (!branches[name]) return;
      scape = name;
      if (!started) return;
      applyScape(1.4);
    },
    setVolume(v){
      userVol = Math.max(0, Math.min(1, v));
      muted = userVol === 0;
      if (started) ramp(master.gain, masterTarget(), 0.3);
    },
    toggle(){
      if (!started) build();
      if (ctx && ctx.state === "suspended") ctx.resume();
      muted = !muted;
      ramp(master.gain, masterTarget(), muted ? 1 : 1.5);
      return !muted;
    },
    stop(){ if (started) ramp(master.gain, 0, 1.2); },
    dim(t){ if (started) ramp(master.gain, 0, t); },
    isOn(){ return started && !muted; },
    current(){ return scape; },
    volume(){ return userVol; },
    level(){
      if (!analyser) return 0;
      const a = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(a);
      let s = 0; for (const v of a){ const x = (v-128)/128; s += x*x; }
      return Math.sqrt(s / a.length);
    },
  };
})();
