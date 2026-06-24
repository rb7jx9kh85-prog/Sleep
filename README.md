# Window Seat — l'appli pour s'endormir ✈️🌙

Une application web (mobile-first) pour s'endormir comme si on regardait
par le **hublot d'un avion** de nuit. Pas un simple écran blanc : une scène
animée et réaliste, rendue en temps réel sur `<canvas>`.

![concept](https://img.shields.io/badge/sleep-window%20seat-ffcf5c)

## Ce que ça fait

- **Écran d'accueil** « Bonne nuit ! Genève » avec une carte de la Terre la
  nuit (lumières des villes scintillantes, rendue de façon procédurale).
- **Choix du vol** : plusieurs destinations, chacune avec une ambiance
  visuelle différente :
  - 🌃 *Lumières des villes* (Zurich, Milan) — survol de villes éclairées
  - 🌅 *Coucher doré* (Clermont-Ferrand) — nuages orangés au crépuscule
  - 🌌 *Aurores boréales* (Reykjavík) — rideaux verts dans le ciel
  - 🌊 *Traversée océane* (Lisbonne) — reflet de lune sur la mer
  - 🏔️ *Aube sur les sommets* (Innsbruck) — montagnes au lever du jour
- **La vue hublot** (le cœur de l'app) : ciel en dégradé qui s'assombrit
  doucement pendant le vol, étoiles scintillantes, lune avec halo et cratères,
  nuages en parallaxe (plusieurs couches), lumières des villes qui défilent,
  aile de l'avion avec **feu de navigation vert** et **flash stroboscopique**.
- **Cadre de hublot réaliste** : paroi de cabine, encadrement plastique,
  reflet sur la vitre, trou d'aération, et un **store** qu'on peut baisser.
- **Ambiance sonore** : ronronnement de cabine généré en direct (Web Audio,
  aucun fichier) — un bruit type avion idéal pour dormir.
- **Minuteur de sommeil** : 10/20/30/45 min. L'écran s'assombrit en fondu
  très lent et le son décroît, pour s'endormir en douceur.

## Lancer

Aucune dépendance, aucune compilation. Servez le dossier :

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080 (idéalement sur mobile / mode responsive)
```

Ou ouvrez simplement `index.html` dans un navigateur.

## Structure

```
index.html      structure des 3 écrans + cadre du hublot (CSS)
css/styles.css  design, cadre de hublot, store, HUD, feuilles
js/data.js      vols + thèmes d'ambiance (couleurs ciel, nuages, sol…)
js/map.js       carte SATELLITE réelle (Leaflet + Esri World Imagery,
                sans clé API) avec badges aéroports ; repli procédural
                « Terre la nuit » si hors-ligne
js/scene.js     moteur de rendu de la vue hublot (toutes les couches)
js/audio.js     ronronnement de cabine (Web Audio)
js/app.js       navigation, horloge, minuteur, fondu de sommeil
```

Conçu pour l'iPhone (proportions, safe-areas) mais fonctionne sur tout
navigateur récent.
