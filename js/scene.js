/*
  Sol Shift: the outpost scene, drawn with SVG shapes in code.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md. No image files and no generated images are used:
  every shape below is written by hand in code.

  This file only DRAWS. It never changes the game. js/ui.js looks at the
  game and calls these functions:

    var scene = SolShiftScene.create(svgElement)   build one picture
    scene.drawSky(phase)          "day", "dusk" or "night"
    scene.setDust(on)             dusty, dim sky
    scene.setSpaceWeather(k, id)  null, "flare" or "storm" (one soft flash)
    scene.setAlarm(on)            the 3 a.m. alarm glow
    scene.setPanelsDusty(on)      dust on the solar panels
    scene.setGreenhouseLights(on)
    scene.setShield(on)           storm shelter shield over the habitat
    scene.setDishBlinking(on)     a message to Earth is on its way
    scene.setCrewState(state)     "work", "tired", "exhausted", "shelter",
                                  "sleep", "awake", "inside", "away"
    scene.describe(text)          the short text alternative for screen readers

  The title screen and the game each have their own picture, so create()
  can be called more than once.

  The look of each part (colors, motion) lives in css/style.css under
  "Outpost scene". Motion is turned off for people who ask their computer
  for reduced motion.
*/

var SolShiftScene = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // The outline of the far mountain and everything below it.
  var RIDGE_FAR = "M0 230 L120 210 L230 160 L300 140 L360 150 L430 185 L520 200 L620 190 L700 205 L800 200 L800 360 L0 360 Z";

  // Make an SVG element with attributes, and add it to a parent.
  function add(parent, tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    parent.appendChild(el);
    return el;
  }

  function group(parent, cls) {
    return add(parent, "g", cls ? { "class": cls } : {});
  }

  // A vertical color gradient, used for the skies.
  function gradient(defs, id, stops) {
    var g = add(defs, "linearGradient", { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
    stops.forEach(function (s) { add(g, "stop", { offset: s[0], "stop-color": s[1] }); });
  }

  // ---------------------------------------------------------------------
  // Building the picture (once)
  // ---------------------------------------------------------------------

  function create(svgElement) {
    var svg = svgElement;
    // Each picture gets its own id prefix, so two pictures on one page
    // never share (and break) each other's color gradients.
    var P = (svg.id || "scene") + "-";
    var parts = {};          // named pieces of the picture, so we can change them later
    var lastWeather = null;  // so a solar flash plays once per card, not on every redraw
    svg.textContent = "";
    svg.setAttribute("viewBox", "0 0 800 360");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

    var defs = add(svg, "defs");
    // Day: dusty, rust-tinted sky. (An artistic choice, not a measured color.)
    gradient(defs, P + "sky-day-grad", [["0", "#b9805a"], ["0.6", "#d9a678"], ["1", "#e8c49a"]]);
    // Dusk: dark above, with the real Mars blue glow near the setting Sun.
    gradient(defs, P + "sky-dusk-grad", [["0", "#1b2034"], ["0.5", "#363c58"], ["1", "#5d5a6e"]]);
    gradient(defs, P + "sky-night-grad", [["0", "#05070f"], ["1", "#151a2c"]]);
    gradient(defs, P + "ground-grad", [["0", "#9c4f2e"], ["1", "#5e2a19"]]);
    var blue = add(defs, "radialGradient", { id: P + "sunset-blue", cx: "0.5", cy: "0.5", r: "0.5" });
    add(blue, "stop", { offset: "0", "stop-color": "#cfe6ff", "stop-opacity": "0.95" });
    add(blue, "stop", { offset: "0.35", "stop-color": "#7fb0e0", "stop-opacity": "0.75" });
    add(blue, "stop", { offset: "1", "stop-color": "#7fb0e0", "stop-opacity": "0" });
    var amber = add(defs, "radialGradient", { id: P + "alarm-grad", cx: "0.53", cy: "0.68", r: "0.55" });
    add(amber, "stop", { offset: "0", "stop-color": "#ffb547", "stop-opacity": "0.7" });
    add(amber, "stop", { offset: "1", "stop-color": "#ffb547", "stop-opacity": "0" });
    var hatch = add(defs, "pattern", { id: P + "dust-hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" });
    add(hatch, "rect", { width: 6, height: 6, fill: "#b07a4f", opacity: "0.55" });
    add(hatch, "line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "#7c4a2a", "stroke-width": 3 });

    // --- Sky layers: all three are drawn, and CSS fades between them ---
    parts.root = svg;
    add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, fill: "url(#" + P + "sky-night-grad)" });
    parts.skyDay = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, fill: "url(#" + P + "sky-day-grad)", "class": "sky-layer sky-day" });
    parts.skyDusk = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, fill: "url(#" + P + "sky-dusk-grad)", "class": "sky-layer sky-dusk" });

    // Stars (night only). Fixed positions, so the sky looks the same every visit.
    parts.stars = group(svg, "stars");
    var starSpots = [[40, 30], [95, 70], [150, 25], [210, 90], [260, 40], [330, 20], [390, 75], [450, 35],
      [520, 60], [580, 22], [640, 85], [700, 40], [760, 70], [120, 130], [300, 120], [480, 140], [660, 125], [740, 15]];
    starSpots.forEach(function (p, i) {
      add(parts.stars, "circle", { cx: p[0], cy: p[1], r: i % 3 === 0 ? 1.8 : 1.1, "class": "star" });
    });

    // The Sun: high in the day, low on the right at dusk with a blue glow.
    parts.sunGlow = add(svg, "circle", { cx: 640, cy: 200, r: 110, fill: "url(#" + P + "sunset-blue)", "class": "sun-glow" });
    // During a real solar event the Sun gets a bright ring, and a particle
    // storm draws fast streaks across the sky.
    parts.corona = add(svg, "circle", { cx: 640, cy: 70, r: 34, "class": "sun-corona" });
    parts.sun = add(svg, "circle", { cx: 640, cy: 70, r: 14, "class": "sun" });
    parts.streaks = group(svg, "particle-streaks");
    [[520, 40], [470, 95], [560, 130], [400, 60], [610, 160], [330, 110], [700, 120]].forEach(function (p) {
      add(parts.streaks, "line", { x1: p[0], y1: p[1], x2: p[0] - 46, y2: p[1] + 26, "class": "streak" });
    });

    // Far mountain (a big mound like the one in the middle of Gale Crater) and dunes.
    add(svg, "path", { d: RIDGE_FAR, "class": "ridge-far" });
    add(svg, "path", { d: "M0 262 Q120 236 240 252 T480 248 T800 244 L800 360 L0 360 Z", "class": "ridge-near" });
    add(svg, "rect", { x: 0, y: 282, width: 800, height: 78, fill: "url(#" + P + "ground-grad)" });
    // A few rocks
    [[60, 318, 14], [250, 330, 9], [700, 322, 12], [470, 340, 7]].forEach(function (r) {
      add(svg, "ellipse", { cx: r[0], cy: r[1], rx: r[2], ry: r[2] * 0.55, "class": "rock" });
    });
    // A dark layer over the land that fades in at dusk and night.
    add(svg, "path", { d: RIDGE_FAR, "class": "land-shade" });

    // --- Solar panels (left) ---
    parts.panels = group(svg, "panels");
    [70, 140, 210].forEach(function (x) {
      add(parts.panels, "line", { x1: x + 26, y1: 262, x2: x + 26, y2: 290, "class": "panel-leg" });
      add(parts.panels, "path", { d: "M" + x + " 262 L" + (x + 12) + " 228 L" + (x + 62) + " 228 L" + (x + 52) + " 262 Z", "class": "panel" });
      add(parts.panels, "path", { d: "M" + x + " 262 L" + (x + 12) + " 228 L" + (x + 62) + " 228 L" + (x + 52) + " 262 Z", fill: "url(#" + P + "dust-hatch)", "class": "panel-dust" });
      add(parts.panels, "line", { x1: x + 6, y1: 245, x2: x + 57, y2: 245, "class": "panel-line" });
    });

    // --- Habitat (middle): a long module with a round top and a window ---
    parts.habitat = group(svg, "habitat");
    add(parts.habitat, "rect", { x: 330, y: 214, width: 190, height: 76, rx: 34, "class": "hab-body" });
    add(parts.habitat, "rect", { x: 300, y: 248, width: 36, height: 42, rx: 8, "class": "hab-airlock" });
    add(parts.habitat, "rect", { x: 309, y: 258, width: 18, height: 32, rx: 4, "class": "hab-door" });
    parts.window = add(parts.habitat, "rect", { x: 368, y: 236, width: 116, height: 32, rx: 14, "class": "hab-window" });
    // Crew heads seen through the window at night
    parts.windowCrew = group(parts.habitat, "window-crew");
    [395, 426, 457].forEach(function (x, i) {
      var head = group(parts.windowCrew, "window-head");
      add(head, "circle", { cx: x, cy: 256, r: 9, "class": "wh-face" });
      add(head, "path", { d: "M" + (x - 5) + " 254 q2.5 2 5 0 M" + (x + 1) + " 254 q2.5 2 5 0", "class": "wh-eyes-closed" });
      add(head, "circle", { cx: x - 3, cy: 254, r: 1.6, "class": "wh-eyes-open" });
      add(head, "circle", { cx: x + 3, cy: 254, r: 1.6, "class": "wh-eyes-open" });
      if (i === 1) { add(parts.windowCrew, "text", { x: x + 10, y: 236, "class": "zzz" }).textContent = "z z"; }
    });
    // Warning beacon on the roof: glows amber during a night alarm.
    add(parts.habitat, "circle", { cx: 425, cy: 212, r: 16, "class": "beacon-glow" });
    add(parts.habitat, "rect", { x: 419, y: 204, width: 12, height: 10, rx: 4, "class": "beacon" });
    parts.alert = add(parts.habitat, "text", { x: 452, y: 222, "text-anchor": "middle", "class": "alert-mark" });
    parts.alert.textContent = "!";

    // Storm shelter shield: a dome of light over the habitat.
    parts.shield = add(svg, "path", { d: "M286 292 Q286 170 425 170 Q564 170 564 292", "class": "shield-dome" });

    // --- Greenhouse (right of the habitat) ---
    parts.greenhouse = group(svg, "greenhouse");
    add(parts.greenhouse, "path", { d: "M560 290 L560 258 Q610 214 660 258 L660 290 Z", "class": "gh-glass" });
    parts.ghLight = add(parts.greenhouse, "path", { d: "M560 290 L560 258 Q610 214 660 258 L660 290 Z", "class": "gh-light" });
    [578, 596, 614, 632, 648].forEach(function (x, i) {
      add(parts.greenhouse, "path", { d: "M" + x + " 290 q-6 -" + (12 + (i % 2) * 6) + " 0 -" + (18 + (i % 2) * 6) + " q6 " + (6 + (i % 2) * 3) + " 0 " + (18 + (i % 2) * 6), "class": "plant" });
    });
    add(parts.greenhouse, "path", { d: "M610 222 L610 290", "class": "gh-frame" });

    // --- Comm dish (far right) ---
    parts.dish = group(svg, "dish");
    add(parts.dish, "line", { x1: 730, y1: 290, x2: 730, y2: 236, "class": "dish-mast" });
    add(parts.dish, "path", { d: "M704 228 Q730 252 760 214 Z", "class": "dish-bowl" });
    parts.dishLight = add(parts.dish, "circle", { cx: 731, cy: 222, r: 4, "class": "dish-light" });
    parts.dishWaves = group(parts.dish, "dish-waves");
    [14, 24, 34].forEach(function (r) {
      add(parts.dishWaves, "path", { d: "M" + (744 + r * 0.3) + " " + (205 - r) + " a" + r + " " + r + " 0 0 1 " + r + " " + r, "class": "dish-wave" });
    });

    // --- Crew outside (3 stylized astronauts, not real people) ---
    parts.crew = group(svg, "crew-outside");
    parts.crewMembers = [
      makeAstronaut(parts.crew, 250, 292),  // near the panels
      makeAstronaut(parts.crew, 545, 292),  // by the greenhouse
      makeAstronaut(parts.crew, 680, 292)   // near the dish
    ];

    // --- Weather and alarm overlays (on top of everything) ---
    parts.dust = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, "class": "dust-haze" });
    parts.storm = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, "class": "storm-haze" });
    parts.flash = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, "class": "flare-flash" });
    parts.alarm = add(svg, "rect", { x: 0, y: 0, width: 800, height: 360, fill: "url(#" + P + "alarm-grad)", "class": "alarm-glow" });

    // The short text alternative for screen readers.
    svg.setAttribute("role", "img");
    parts.label = add(svg, "title", {});

    // ---------------------------------------------------------------------
    // Changing the picture
    // ---------------------------------------------------------------------

    // Turn a CSS class on or off on the whole picture. All the looks are in CSS.
    function flag(name, on) {
      if (svg) { svg.classList.toggle(name, !!on); }
    }

    // phase: "day", "dusk" or "night"
    function drawSky(phase) {
      flag("is-day", phase === "day");
      flag("is-dusk", phase === "dusk");
      flag("is-night", phase === "night");
    }

    function setDust(on) { flag("is-dusty", on); }
    function setAlarm(on) { flag("is-alarm", on); }
    function setPanelsDusty(on) { flag("panels-dusty", on); }
    function setGreenhouseLights(on) { flag("greenhouse-dark", !on); }
    function setShield(on) { flag("shield-up", on); }
    function setDishBlinking(on) { flag("dish-blinking", on); }

    // kind: null, "flare" or "storm". The soft flash plays once when a new
    // solar card appears (id tells cards apart). Never a strobe.
    function setSpaceWeather(kind, id) {
      flag("is-flare", kind === "flare");
      flag("is-storm", kind === "storm");
      if (kind && id !== lastWeather) {
        svg.classList.remove("flash-now");
        void svg.getBoundingClientRect(); // restart the CSS animation
        svg.classList.add("flash-now");
      }
      if (!kind) { svg.classList.remove("flash-now"); }
      lastWeather = kind ? id : null;
    }

    // state: what the crew is doing. The CSS shows and hides faces and poses.
    //   "work"       outside, rested
    //   "tired"      outside, slumped
    //   "exhausted"  outside, slumped and yawning
    //   "shelter"    everyone inside the shield
    //   "sleep"      inside, asleep (seen through the window)
    //   "awake"      inside at night, woken by an alarm
    //   "inside"     inside at night, no sleep shown (used when fatigue is off)
    var CREW_STATES = ["work", "tired", "exhausted", "shelter", "sleep", "awake", "inside", "away"];
    function setCrewState(state) {
      CREW_STATES.forEach(function (s) { flag("crew-" + s, s === state); });
    }

    function describe(text) {
      if (parts.label) { parts.label.textContent = text; }
      if (svg) { svg.setAttribute("aria-label", text); }
    }

    return {
      drawSky: drawSky,
      setDust: setDust,
      setSpaceWeather: setSpaceWeather,
      setAlarm: setAlarm,
      setPanelsDusty: setPanelsDusty,
      setGreenhouseLights: setGreenhouseLights,
      setShield: setShield,
      setDishBlinking: setDishBlinking,
      setCrewState: setCrewState,
      describe: describe
    };
  }

  // One astronaut: a round helmet with a face, a suit body, a backpack.
  // The face changes with the crew state (rested, tired, yawning).
  function makeAstronaut(parent, x, groundY) {
    var g = group(parent, "astronaut");
    g.setAttribute("transform", "translate(" + x + " " + groundY + ")");
    var body = group(g, "astro-body");
    add(body, "rect", { x: -9, y: -28, width: 18, height: 22, rx: 7, "class": "suit" });     // body
    add(body, "rect", { x: -13, y: -27, width: 6, height: 15, rx: 3, "class": "pack" });     // backpack
    add(body, "rect", { x: -8, y: -8, width: 6, height: 8, rx: 2, "class": "suit" });        // legs
    add(body, "rect", { x: 2, y: -8, width: 6, height: 8, rx: 2, "class": "suit" });
    add(body, "circle", { cx: 0, cy: -38, r: 11, "class": "helmet" });                      // helmet
    add(body, "circle", { cx: 1, cy: -38, r: 7.5, "class": "astro-face" });                  // face in the visor
    add(body, "circle", { cx: -1.5, cy: -39.5, r: 1.2, "class": "eye eye-open" });
    add(body, "circle", { cx: 3.5, cy: -39.5, r: 1.2, "class": "eye eye-open" });
    add(body, "path", { d: "M-3.5 -39.5 h3.5 M2 -39.5 h3.5", "class": "eye-closed" });
    add(body, "path", { d: "M-1.5 -35 q2.5 2 5 0", "class": "mouth-smile" });
    add(body, "ellipse", { cx: 1, cy: -34.5, rx: 1.8, ry: 2.4, "class": "mouth-yawn" });
    return g;
  }

  return { create: create };
})();
