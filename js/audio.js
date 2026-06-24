/* ------------------------------------------------------------------
   Cabin ambience — filtered noise that sounds like the steady hum
   inside an airliner. Pure Web Audio, no files. Great pink-ish noise
   for sleeping. Includes a slow LFO so it gently breathes.
-------------------------------------------------------------------*/
const CabinAudio = (() => {
  let ctx, master, noiseSrc, lfo, started = false, on = false;

  function makeNoiseBuffer(c){
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    // brown/pink-ish noise: integrate white noise for low rumble
    let last = 0;
    for (let i = 0; i < len; i++){
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  function start(){
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = makeNoiseBuffer(ctx);
    noiseSrc.loop = true;

    // low rumble band
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    lp.Q.value = 0.6;

    // remove the very bottom so it isn't muddy
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;

    // gentle resonance ~ engine drone
    const peak = ctx.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = 160;
    peak.gain.value = 6;
    peak.Q.value = 1.2;

    noiseSrc.connect(hp);
    hp.connect(peak);
    peak.connect(lp);
    lp.connect(master);

    // slow breathing of volume
    lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    noiseSrc.start();
    lfo.start();
    started = true;
  }

  function fadeTo(v, t = 1.5){
    if (!ctx) return;
    const g = master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(v, ctx.currentTime + t);
  }

  return {
    toggle(){
      if (!started) start();
      if (ctx && ctx.state === "suspended") ctx.resume();
      on = !on;
      fadeTo(on ? 0.22 : 0.0, on ? 2 : 1);
      return on;
    },
    enable(){
      if (!started) start();
      if (ctx && ctx.state === "suspended") ctx.resume();
      on = true;
      fadeTo(0.22, 2.5);
    },
    stop(){ on = false; fadeTo(0, 1.2); },
    dim(t){ fadeTo(0, t); },
    isOn(){ return on; },
  };
})();
