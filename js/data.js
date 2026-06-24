/* ------------------------------------------------------------------
   Flight & scenery data
   Each flight references a "theme" that drives the realistic window
   scene (sky colours, clouds, stars, aurora, milky way, lightning,
   city lights below...). nightFrom/nightTo control how the sky shifts
   over the course of the flight (e.g. daytime themes stay bright).
-------------------------------------------------------------------*/

const THEMES = {
  /* ---------- short / European ---------- */
  cityNight: {
    name: "Lumières des villes",
    skyTop:[6,11,28], skyMid:[16,26,58], skyHorizon:[42,50,92],
    glow:[120,110,180], glowStrength:0.25,
    stars:1, moon:{x:0.74,y:0.2,r:24,glow:1},
    cloudColor:[40,48,78], cloudDensity:0.45, cloudAlpha:0.5,
    ground:"cities", wingLights:1, nightFrom:0.15, nightTo:1,
  },
  goldenDusk: {
    name: "Coucher doré",
    skyTop:[22,28,64], skyMid:[120,70,96], skyHorizon:[250,150,78],
    glow:[255,170,90], glowStrength:0.9, glowX:0.3,
    stars:0.35, moon:0,
    cloudColor:[255,168,110], cloudDensity:0.75, cloudAlpha:0.7,
    ground:"haze", wingLights:1, nightFrom:0, nightTo:0.85,
  },
  aurora: {
    name: "Aurores boréales",
    skyTop:[3,7,20], skyMid:[8,16,38], skyHorizon:[14,26,48],
    glow:[40,120,110], glowStrength:0.2,
    stars:1, moon:{x:0.2,y:0.16,r:18,glow:.7}, aurora:1,
    cloudColor:[26,34,56], cloudDensity:0.25, cloudAlpha:0.4,
    ground:"snow", wingLights:1, nightFrom:0.3, nightTo:1,
  },
  oceanMoon: {
    name: "Traversée océane",
    skyTop:[5,10,26], skyMid:[12,22,50], skyHorizon:[30,44,80],
    glow:[150,170,220], glowStrength:0.3, glowX:0.7,
    stars:1, moon:{x:0.7,y:0.22,r:30,glow:1.3},
    cloudColor:[34,44,72], cloudDensity:0.35, cloudAlpha:0.45,
    ground:"ocean", wingLights:1, nightFrom:0.1, nightTo:1,
  },
  dawnPeaks: {
    name: "Aube sur les sommets",
    skyTop:[30,36,78], skyMid:[150,110,140], skyHorizon:[255,190,165],
    glow:[255,200,170], glowStrength:0.8, glowX:0.5,
    stars:0.25, moon:0,
    cloudColor:[255,205,195], cloudDensity:0.6, cloudAlpha:0.62,
    ground:"mountains", wingLights:1, nightFrom:0, nightTo:0.4,
  },

  /* ---------- long-haul / transatlantic / world ---------- */
  transAtlantic: {
    name: "Nuit transatlantique",
    skyTop:[2,5,16], skyMid:[6,12,30], skyHorizon:[16,26,50],
    glow:[120,140,200], glowStrength:0.15, glowX:0.65,
    stars:1, milkyway:1, moon:{x:0.68,y:0.18,r:26,glow:1.2},
    cloudColor:[26,34,58], cloudDensity:0.3, cloudAlpha:0.4,
    ground:"ocean", wingLights:1, nightFrom:0.5, nightTo:1,
  },
  milkyOcean: {
    name: "Voie lactée",
    skyTop:[2,4,14], skyMid:[5,9,24], skyHorizon:[10,18,38],
    glow:[80,90,150], glowStrength:0.1,
    stars:1, milkyway:1.3, moon:0,
    cloudColor:[20,28,48], cloudDensity:0.18, cloudAlpha:0.35,
    ground:"ocean", wingLights:1, nightFrom:0.6, nightTo:1,
  },
  bigCityApproach: {
    name: "Approche de la mégapole",
    skyTop:[8,12,30], skyMid:[20,28,60], skyHorizon:[60,60,100],
    glow:[200,150,120], glowStrength:0.4, glowX:0.5,
    stars:0.7, moon:0,
    cloudColor:[44,50,80], cloudDensity:0.3, cloudAlpha:0.45,
    ground:"cities", groundDensity:2.0, wingLights:1, nightFrom:0.3, nightTo:1,
  },
  desertDusk: {
    name: "Désert au crépuscule",
    skyTop:[28,22,52], skyMid:[150,80,80], skyHorizon:[240,140,80],
    glow:[255,150,80], glowStrength:0.85, glowX:0.55,
    stars:0.4, moon:0,
    cloudColor:[230,160,120], cloudDensity:0.4, cloudAlpha:0.5,
    ground:"desert", wingLights:1, nightFrom:0.1, nightTo:0.9,
  },
  highClouds: {
    name: "Au-dessus des nuages",
    skyTop:[40,90,190], skyMid:[110,160,230], skyHorizon:[200,225,250],
    glow:[255,250,235], glowStrength:0.7, glowX:0.5,
    stars:0, moon:0,
    cloudColor:[245,248,255], cloudDensity:1.0, cloudAlpha:0.85,
    ground:"haze", cloudSea:1, wingLights:1, nightFrom:0, nightTo:0.12,
  },
  stormFront: {
    name: "Orages lointains",
    skyTop:[6,8,18], skyMid:[16,18,32], skyHorizon:[28,30,46],
    glow:[120,130,160], glowStrength:0.12,
    stars:0.5, moon:0, storm:1,
    cloudColor:[30,32,44], cloudDensity:1.0, cloudAlpha:0.8,
    ground:"haze", cloudSea:1, wingLights:1, nightFrom:0.4, nightTo:1,
  },
  tropicalDawn: {
    name: "Aube tropicale",
    skyTop:[20,40,90], skyMid:[120,130,170], skyHorizon:[255,180,160],
    glow:[255,200,180], glowStrength:0.75, glowX:0.6,
    stars:0.2, moon:0,
    cloudColor:[255,210,200], cloudDensity:0.55, cloudAlpha:0.6,
    ground:"ocean", wingLights:1, nightFrom:0, nightTo:0.35,
  },
  // ultra-long red-eye: starts in deep starry night, ends in sunrise
  redEye: {
    name: "Vol de nuit → lever de soleil",
    skyTop:[26,34,82], skyMid:[150,110,140], skyHorizon:[255,180,120],
    glow:[255,180,110], glowStrength:1.0, glowX:0.62,
    stars:1, milkyway:1, moon:0,
    cloudColor:[255,195,160], cloudDensity:0.45, cloudAlpha:0.55,
    ground:"ocean", wingLights:1, nightFrom:1, nightTo:0.05,
  },
};

/* duration in minutes. Mixed short-haul + long-haul transatlantic + world. */
const FLIGHTS = [
  /* — Europe (courts) — */
  { from:"GVA", to:"ZRH", city:"Zurich",            min:33,  theme:"cityNight",   region:"Europe" },
  { from:"GVA", to:"CFE", city:"Clermont-Ferrand",  min:33,  theme:"goldenDusk",  region:"Europe" },
  { from:"GVA", to:"MXP", city:"Milan",             min:42,  theme:"cityNight",   region:"Europe" },
  { from:"GVA", to:"INN", city:"Innsbruck",         min:38,  theme:"dawnPeaks",   region:"Europe" },
  { from:"GVA", to:"CDG", city:"Paris",             min:60,  theme:"cityNight",   region:"Europe" },
  { from:"GVA", to:"BCN", city:"Barcelone",         min:90,  theme:"goldenDusk",  region:"Europe" },
  { from:"GVA", to:"LIS", city:"Lisbonne",          min:120, theme:"oceanMoon",   region:"Europe" },
  { from:"GVA", to:"ATH", city:"Athènes",           min:150, theme:"oceanMoon",   region:"Europe" },

  /* — Grand Nord — */
  { from:"GVA", to:"KEF", city:"Reykjavík",         min:200, theme:"aurora",      region:"Grand Nord" },
  { from:"GVA", to:"OSL", city:"Oslo",              min:150, theme:"aurora",      region:"Grand Nord" },
  { from:"GVA", to:"TOS", city:"Tromsø",            min:240, theme:"aurora",      region:"Grand Nord" },

  /* — Transatlantique (6 h – 8 h) — */
  { from:"GVA", to:"DXB", city:"Dubaï",             min:360, theme:"desertDusk",    region:"Transatlantique" },
  { from:"GVA", to:"YUL", city:"Montréal",          min:450, theme:"transAtlantic", region:"Transatlantique" },
  { from:"GVA", to:"BOS", city:"Boston",            min:460, theme:"transAtlantic", region:"Transatlantique" },
  { from:"GVA", to:"JFK", city:"New York",          min:480, theme:"redEye",        region:"Transatlantique" },
  { from:"GVA", to:"MLE", city:"Maldives",          min:540, theme:"tropicalDawn",  region:"Transatlantique" },

  /* — Ultra long-courrier (9 h et +) — */
  { from:"GVA", to:"GRU", city:"São Paulo",         min:540, theme:"milkyOcean",     region:"Ultra long-courrier" },
  { from:"GVA", to:"LAX", city:"Los Angeles",       min:660, theme:"bigCityApproach",region:"Ultra long-courrier" },
  { from:"GVA", to:"BKK", city:"Bangkok",           min:660, theme:"tropicalDawn",   region:"Ultra long-courrier" },
  { from:"GVA", to:"JNB", city:"Johannesburg",      min:660, theme:"redEye",         region:"Ultra long-courrier" },
  { from:"GVA", to:"HKG", city:"Hong Kong",         min:690, theme:"milkyOcean",     region:"Ultra long-courrier" },
  { from:"GVA", to:"CPT", city:"Le Cap",            min:720, theme:"milkyOcean",     region:"Ultra long-courrier" },
  { from:"GVA", to:"HND", city:"Tokyo",             min:720, theme:"highClouds",     region:"Ultra long-courrier" },
  { from:"GVA", to:"SIN", city:"Singapour",         min:780, theme:"stormFront",     region:"Ultra long-courrier" },
  { from:"GVA", to:"SCL", city:"Santiago",          min:900, theme:"redEye",         region:"Ultra long-courrier" },
  { from:"GVA", to:"SYD", city:"Sydney",            min:1290,theme:"milkyOcean",     region:"Ultra long-courrier" },
  { from:"GVA", to:"AKL", city:"Auckland",          min:1410,theme:"redEye",         region:"Ultra long-courrier" },
];

const HOME_CITY = "Genève";

/* "8 h 30", "1 h 30" or "45 min" */
function fmtDuration(min){
  if (min < 60) return min + " min";
  const h = Math.floor(min/60), m = min%60;
  return m ? `${h} h ${String(m).padStart(2,"0")}` : `${h} h`;
}
