/*
  Sol Shift: the outpost scene, drawn with SVG shapes in code.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. The realistic look was the team lead's direction; the framing and palette
  came from Pixel, the team's AI designer bot. See AI-USE.md.
  The base, the crew and the ground are written by hand in code. Behind
  them sit two real NASA photos from the Curiosity rover (see BACKDROP
  below): a mountain by day and a sunset at dusk. No generated images are
  used anywhere.

  This file only DRAWS. It never changes the game. js/ui.js looks at the
  game and calls these functions:

    var scene = SolShiftScene.create(svgElement)   build one picture
    scene.drawSky(phase)          "day", "dusk" or "night"
    scene.setDust(on)             dust storm: a brown-out that also dims the base
    scene.setSpaceWeather(k, id)  null, "flare" or "storm" (one soft flash)
    scene.setAlarm(on)            the night alarm: red light on the ground,
                                  one crew member at the door with a torch
    scene.setPanelsDusty(on)      dust on the solar panels
    scene.setGreenhouseLights(on)
    scene.setShield(on)           storm shelter shield over the habitat
    scene.setDishBlinking(on)     a message to Earth is on its way
    scene.setCrewState(state)     "work", "tired", "exhausted", "shelter",
                                  "sleep", "inside", "away"
    scene.setTitleMode(on)        the title screen look (slow drifting dust)
    scene.setCamera(x, y, w, h)   which part of the drawing fills the screen
    scene.describe(text)          the short text alternative for screen readers

  The colors and motion live in css/style.css under "Outpost scene".
  Motion is turned off for people who ask their computer for reduced motion.

  How the realism works (all cheap enough for a phone):
    - Every object is shaded with gradients lit from one side (the Sun is on
      the right), and has a soft shadow where it meets the ground.
    - A long cast shadow points away from the Sun: short by day, long at
      dusk, gone at night (CSS stretches it).
    - The whole base sits in one group that gets a simple color filter at
      dusk, at night and in a dust storm (no blur, so it stays fast).
      Window lights are drawn outside that group, so they stay bright.
    - Haze makes the far land pale; tiny dust motes drift in the air.
    - The drawn ground and the light on the base use colors measured from
      the photos, so the drawing and the photos sit together.

  Layout of the drawing (SVG units, y grows downward):
    sky above y 230, far mountain or hills around y 180 to 250, mid dunes
    around y 260, foreground ground from y 282. The habitat is the hero, a little left
    of the middle. Panels sit behind it on the left; the greenhouse tube
    and the dish sit further back on the right.
*/

var SolShiftScene = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------------
  // BACKDROP: the real NASA photos behind the base.
  // Both were taken by the Curiosity rover in Gale Crater on Mars. They were
  // cropped and faded at the edges by tools/make-backdrops.py; that file
  // says exactly what was done. The credit is kept as NASA gives it, and
  // both photos are listed on the Sources screen (js/ui.js reads this list).
  //   day:  the mountain in the middle of Gale Crater (Mount Sharp). NASA
  //         white-balanced this photo, which turns the sky Earth-blue, so
  //         the sky was removed and the game draws its own. The same photo,
  //         darkened, is the mountain's outline at night.
  //   dusk: a real Mars sunset. The blue glow and the Sun are in the photo.
  // x, y, width, height place each photo in scene units. Set src to "" to
  // go back to the drawn sky and ridges.
  // ---------------------------------------------------------------------
  var BACKDROP = {
    day: {
      src: "images/mars-day-PIA16768.webp",
      title: "Mount Sharp Panorama in White-Balanced Colors (PIA16768)",
      credit: "NASA/JPL-Caltech/MSSS",
      source: "https://science.nasa.gov/photojournal/mount-sharp-panorama-in-white-balanced-colors/",
      change: "We removed the sky, cropped the caption strip and darken it at night.",
      x: 74, y: 175.3, width: 1000, height: 96.7
    },
    dusk: {
      src: "images/mars-dusk-PIA19400.webp",
      title: "Sunset in Mars' Gale Crater (PIA19400)",
      credit: "NASA/JPL-Caltech/MSSS/Texas A&M Univ.",
      source: "https://science.nasa.gov/photojournal/sunset-in-mars-gale-crater/",
      change: "We cropped the bottom and faded the top and left edges.",
      x: 185, y: -268, width: 1000, height: 594.5
    }
  };

  // The daytime Sun's size: from Mars it looks about two-thirds as wide as
  // from Earth (sunSizeFromMars in data/numbers.js). EARTH_SUN_R is the
  // radius an Earth-seen Sun would have at this drawing's scale. At dusk the
  // Sun is the real one in the NASA photo. That photo was taken zoomed in,
  // so its Sun looks larger than the drawn daytime one.
  var EARTH_SUN_R = 9;
  var MARS_SUN_R = EARTH_SUN_R * 0.67;

  // The far ridge outline (a tall mound in the middle, like the mountain
  // in Gale Crater) and everything below it. The shapes reach far past the
  // edges, so any screen shape is covered.
  var RIDGE_FAR = "M-1500 252 L60 252 L170 240 L260 237 L330 228 L400 215 L450 206 L482 203 L520 211 L580 229 L640 236 L740 242 L2500 242 L2500 2500 L-1500 2500 Z";
  var DUNES_MID = "M-1500 268 L60 268 Q190 252 300 263 T500 258 T740 256 L2500 256 L2500 2500 L-1500 2500 Z";
  var GROUND_FG = "M-1500 287 L60 287 Q260 278 400 285 T740 282 L2500 282 L2500 2500 L-1500 2500 Z";
  // A rectangle bigger than any camera view, for skies and overlays.
  var BIG = { x: -1500, y: -2000, width: 4000, height: 4500 };

  // The crew is drawn a little larger than life next to the buildings, so
  // they read clearly on a phone (about 60 px tall on a 375 px screen).
  var CREW_SCALE = 1.15;

  // Make an SVG element with attributes, and add it to a parent.
  function add(parent, tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    parent.appendChild(el);
    return el;
  }

  function group(parent, cls, transform) {
    var attrs = {};
    if (cls) { attrs["class"] = cls; }
    if (transform) { attrs.transform = transform; }
    return add(parent, "g", attrs);
  }

  // A color gradient. dir "down" = top to bottom, "right" = left to right.
  // With box = [x1, y1, x2, y2] it is measured in scene units instead.
  function gradient(defs, id, stops, dir, box) {
    var attrs = { id: id, x1: 0, y1: 0, x2: dir === "right" ? 1 : 0, y2: dir === "right" ? 0 : 1 };
    if (box) {
      attrs = { id: id, x1: box[0], y1: box[1], x2: box[2], y2: box[3], gradientUnits: "userSpaceOnUse" };
    }
    var g = add(defs, "linearGradient", attrs);
    stops.forEach(function (s) {
      add(g, "stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] === undefined ? 1 : s[2] });
    });
  }

  // A round glow that fades out toward its edge.
  function radial(defs, id, color, strength) {
    var g = add(defs, "radialGradient", { id: id, cx: "0.5", cy: "0.5", r: "0.5" });
    add(g, "stop", { offset: "0", "stop-color": color, "stop-opacity": strength });
    add(g, "stop", { offset: "1", "stop-color": color, "stop-opacity": "0" });
  }

  // A simple color filter (no blur, so it is cheap): multiplies red, green
  // and blue by the given amounts. Used to light the base for dusk, night
  // and dust storms.
  function tintFilter(defs, id, r, g, b) {
    var f = add(defs, "filter", { id: id, "color-interpolation-filters": "sRGB" });
    var t = add(f, "feComponentTransfer", {});
    add(t, "feFuncR", { type: "linear", slope: r });
    add(t, "feFuncG", { type: "linear", slope: g });
    add(t, "feFuncB", { type: "linear", slope: b });
  }

  // Ambient occlusion: a soft dark band where an object touches the ground.
  function groundContact(parent, cx, cy, rx) {
    add(parent, "ellipse", { cx: cx, cy: cy, rx: rx, ry: Math.max(1.6, rx * 0.12), "class": "contact-shadow" });
  }

  // A long shadow on the ground pointing away from the Sun (to the left).
  // It starts at the object's right edge (x2) and runs left to x1.
  // CSS makes it short by day, long at dusk and hides it at night.
  function castShadow(parent, x1, x2, y, depth) {
    add(parent, "path", {
      d: "M" + x2 + " " + y + " L" + x1 + " " + (y + depth * 0.4) + " Q" + (x1 - 6) + " " + (y + depth) + " " + (x1 + 8) + " " + (y + depth) + " L" + x2 + " " + (y + depth * 0.6) + " Z",
      "class": "cast-shadow"
    });
  }

  // ---------------------------------------------------------------------
  // Building the picture (once per picture)
  // ---------------------------------------------------------------------

  function create(svgElement) {
    var svg = svgElement;
    // Each picture gets its own id prefix, so two pictures on one page
    // never share (and break) each other's gradients.
    var P = (svg.id || "scene") + "-";
    var lastWeather = null;  // so a solar flash plays once per card, not on every redraw
    var phaseNow = "day";
    var dustNow = false;
    var label;

    svg.textContent = "";
    svg.classList.remove("photo-day", "photo-dusk");

    function addPhoto(b, cls) {
      var img = add(svg, "image", { x: b.x, y: b.y, width: b.width, height: b.height, preserveAspectRatio: "none", "class": cls });
      img.setAttribute("href", b.src);
      return img;
    }
    svg.setAttribute("viewBox", "120 140 560 220");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

    var defs = add(svg, "defs");
    // Skies. Day and night colors are artistic choices, not measurements.
    gradient(defs, P + "sky-day", [["0", "#c99172"], ["0.55", "#e2b08c"], ["1", "#ecc4a2"]], "down", [0, 60, 0, 250]);
    // The dusk sky uses colors measured from the NASA sunset photo, so the
    // photo's faded edges blend into it.
    gradient(defs, P + "sky-dusk", [["0", "#a0a6ae"], ["0.62", "#8c949f"], ["1", "#6b727b"]], "down", [0, -268, 0, 215]);
    gradient(defs, P + "sky-night", [["0", "#070912"], ["1", "#151326"]], "down", [0, 60, 0, 250]);
    gradient(defs, P + "dusk-band", [["0", "#E58A5A", 0], ["0.55", "#E58A5A", 0.6], ["1", "#E58A5A", 0]]);
    // Haze near the horizon: distant land fades into the sky color.
    gradient(defs, P + "haze-day", [["0", "#e7bc98", 0], ["0.5", "#e7bc98", 0.75], ["1", "#e7bc98", 0]]);
    gradient(defs, P + "haze-dusk", [["0", "#6b727b", 0], ["0.5", "#6b727b", 0.5], ["1", "#6b727b", 0]]);
    radial(defs, P + "blue-glow", "#9ccaf5", 0.85);   // the real blue glow around a Mars sunset
    radial(defs, P + "sun-glow", "#fff4dc", 0.55);
    radial(defs, P + "window-light", "#FFC46B", 0.7);
    radial(defs, P + "alarm-light", "#FF6B4A", 0.75);
    radial(defs, P + "gh-glow", "#9be38a", 0.8);
    radial(defs, P + "torch-pool", "#ffe2a0", 0.75);
    gradient(defs, P + "torch-cone", [["0", "#ffe9b8", 0.35], ["1", "#ffe9b8", 0]], "down", [283, 281, 268, 320]);

    // Materials. Light comes from the upper right.
    gradient(defs, P + "fabric", [["0", "#f1ede4"], ["0.45", "#ddd6c8"], ["1", "#9c917f"]]);          // the inflatable module's woven skin
    gradient(defs, P + "fabric-side", [["0", "#000", 0.22], ["0.35", "#000", 0], ["0.8", "#fff", 0.10], ["1", "#fff", 0.18]], "right");
    gradient(defs, P + "dust-low", [["0", "#b98a62", 0], ["0.65", "#b98a62", 0], ["1", "#a8774f", 0.55]]); // dust settles on lower surfaces
    gradient(defs, P + "metal", [["0", "#dfe3e8"], ["0.5", "#a9b0b9"], ["1", "#6f7680"]]);
    gradient(defs, P + "metal-side", [["0", "#7b828c"], ["0.6", "#c6ccd3"], ["1", "#e8ecf0"]], "right");
    gradient(defs, P + "regolith", [["0", "#a8643f"], ["1", "#6d3820"]]);                            // the soil piled over the shelter
    gradient(defs, P + "cells", [["0", "#2b3d5a"], ["0.5", "#18233a"], ["1", "#0f1626"]]);
    gradient(defs, P + "tube", [["0", "#e9f3f2", 0.55], ["0.5", "#bcd6d6", 0.3], ["1", "#8fb0b0", 0.45]]);
    gradient(defs, P + "suit", [["0", "#f7f5f0"], ["0.6", "#e2ded5"], ["1", "#b3ada2"]]);
    gradient(defs, P + "suit-side", [["0", "#000", 0.18], ["0.5", "#000", 0], ["1", "#fff", 0.12]], "right");
    gradient(defs, P + "visor", [["0", "#5a4a2e"], ["0.5", "#2a2a32"], ["1", "#14161c"]]);           // gold-tinted, dark visor
    var hatch = add(defs, "pattern", { id: P + "dust-hatch", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" });
    add(hatch, "rect", { width: 5, height: 5, fill: "#b07a4f", opacity: "0.6" });
    add(hatch, "line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "#7c4a2a", "stroke-width": 2.5 });

    // Lighting for the whole base (cheap color filters, no blur).
    tintFilter(defs, P + "light-dusk", 0.5, 0.53, 0.62);     // cool, like the light in the sunset photo
    tintFilter(defs, P + "photo-night", 0.15, 0.18, 0.34);  // turns the day mountain into a night outline
    tintFilter(defs, P + "light-night", 0.36, 0.35, 0.46);
    tintFilter(defs, P + "light-dust", 0.72, 0.6, 0.48);
    tintFilter(defs, P + "light-dust-night", 0.2, 0.17, 0.15);

    // --- Sky: three layers; CSS fades between them ---
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-night)" }));
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-day)", "class": "sky-layer sky-day" }));
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-dusk)", "class": "sky-layer sky-dusk" }));
    add(svg, "rect", { x: -1500, y: 205, width: 4000, height: 45, fill: "url(#" + P + "dusk-band)", "class": "dusk-band" });

    // Stars in three sizes, spread over the whole sky. The positions come
    // from a fixed recipe, so the sky is the same every visit.
    var stars = group(svg, "stars");
    var sizes = [0.6, 0.95, 1.5];
    var seed = 7;
    function nextStar() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 260; i++) {
      var sx = -500 + nextStar() * 1800;
      var sy = -600 + nextStar() * 830;
      var size = nextStar() < 0.12 ? 2 : (nextStar() < 0.35 ? 1 : 0);
      add(stars, "circle", { cx: sx.toFixed(1), cy: sy.toFixed(1), r: sizes[size],
        "class": "star" + (size === 2 || i % 7 === 0 ? " twinkle t" + (i % 3) : "") });
    }

    // The Sun: a small soft disc (two-thirds of an Earth-seen Sun).
    add(svg, "circle", { cx: 530, cy: 208, r: 62, fill: "url(#" + P + "blue-glow)", "class": "sun-glow" });
    add(svg, "circle", { cx: 590, cy: 168, r: MARS_SUN_R * 3.2, fill: "url(#" + P + "sun-glow)", "class": "sun-halo" });
    add(svg, "circle", { cx: 590, cy: 168, r: 22, "class": "sun-corona" });
    add(svg, "circle", { cx: 590, cy: 168, r: MARS_SUN_R, "class": "sun" });
    var streaks = group(svg, "particle-streaks");
    [[470, 150], [430, 175], [520, 190], [380, 160], [560, 205], [330, 185], [610, 180]].forEach(function (p) {
      add(streaks, "line", { x1: p[0], y1: p[1], x2: p[0] - 34, y2: p[1] + 19, "class": "streak" });
    });

    // --- Land: far ridge (pale with distance), haze, mid dunes, ground ---
    add(svg, "path", { d: RIDGE_FAR, "class": "ridge-far" });
    // The NASA photos (see BACKDROP). They sit in front of the drawn far
    // ridge, which only shows where a photo is missing or fades out.
    if (BACKDROP.day.src) {
      svg.classList.add("photo-day");
      addPhoto(BACKDROP.day, "backdrop backdrop-day");
      addPhoto(BACKDROP.day, "backdrop backdrop-night").setAttribute("filter", "url(#" + P + "photo-night)");
    }
    if (BACKDROP.dusk.src) {
      svg.classList.add("photo-dusk");
      addPhoto(BACKDROP.dusk, "backdrop backdrop-dusk");
    }
    add(svg, "path", { d: RIDGE_FAR, "class": "ridge-dust" });   // dust storms hide the far ridge first
    add(svg, "rect", { x: -1500, y: 196, width: 4000, height: 64, fill: "url(#" + P + "haze-day)", "class": "haze haze-day" });
    add(svg, "rect", { x: -1500, y: 196, width: 4000, height: 64, fill: "url(#" + P + "haze-dusk)", "class": "haze haze-dusk" });
    add(svg, "path", { d: DUNES_MID, "class": "ridge-mid" });
    add(svg, "path", { d: GROUND_FG, "class": "ground" });

    // Ground details: low dune lines, tracks to the door, a power cable,
    // the pump hatch and small rocks. Kept quiet on purpose.
    var details = group(svg, "ground-details");
    ["M110 318 Q220 309 330 316", "M420 324 Q540 314 690 321", "M150 338 Q300 330 450 336", "M480 342 Q600 334 700 339"].forEach(function (d) {
      add(details, "path", { d: d, "class": "dune-line" });
    });
    add(details, "path", { d: "M250 380 Q268 340 296 300", "class": "track" });
    add(details, "path", { d: "M262 380 Q279 342 305 300", "class": "track" });
    add(details, "path", { d: "M238 289 Q262 299 289 295", "class": "cable" });
    add(details, "rect", { x: 260, y: 315, width: 20, height: 6, rx: 2, "class": "hatch" });
    [[176, 326, 7], [338, 330, 5], [452, 320, 6], [520, 338, 8], [640, 327, 6], [600, 348, 9], [150, 346, 8], [420, 352, 7]].forEach(function (r) {
      add(details, "ellipse", { cx: r[0] - r[2] * 0.6, cy: r[1] + 0.6, rx: r[2] * 1.3, ry: r[2] * 0.25, "class": "rock-shadow" });
      add(details, "path", { d: "M" + (r[0] - r[2]) + " " + r[1] + " q" + (r[2] * 0.5) + " " + (-r[2] * 0.9) + " " + r[2] + " " + (-r[2] * 0.85) + " q" + (r[2] * 0.7) + " 0.1 " + r[2] + " " + (r[2] * 0.85) + " Z", "class": "rock-fg" });
      add(details, "path", { d: "M" + (r[0] - r[2] * 0.2) + " " + (r[1] - r[2] * 0.8) + " q" + (r[2] * 0.6) + " 0 " + (r[2] * 0.95) + " " + (r[2] * 0.7), "class": "rock-lit" });
    });

    // Warm window light and the red alarm light spilling onto the ground.
    add(svg, "ellipse", { cx: 385, cy: 304, rx: 160, ry: 30, fill: "url(#" + P + "window-light)", "class": "window-spill" });
    add(svg, "ellipse", { cx: 330, cy: 306, rx: 120, ry: 28, fill: "url(#" + P + "alarm-light)", "class": "alarm-spill" });

    // =================================================================
    // THE BASE. Everything in this group is lit together by one filter.
    // =================================================================
    var base = group(svg, "outpost");

    // Long shadows away from the Sun (CSS sets their length per time of day)
    var shadows = group(base, "cast-shadows");
    castShadow(shadows, 210, 308, 280, 8);    // solar arrays
    castShadow(shadows, 250, 478, 296, 14);   // habitat and berm
    castShadow(shadows, 470, 556, 290, 8);    // greenhouse tube
    castShadow(shadows, 540, 576, 289, 5);    // dish

    // --- Solar arrays: flat panels on low frames, behind the habitat ---
    var panels = group(base, "panels");
    [204, 238, 272].forEach(function (x) {
      groundContact(panels, x + 17, 288.5, 15);
      add(panels, "line", { x1: x + 6, y1: 276, x2: x + 6, y2: 288, "class": "panel-leg" });
      add(panels, "line", { x1: x + 27, y1: 276, x2: x + 27, y2: 288, "class": "panel-leg" });
      add(panels, "line", { x1: x + 6, y1: 284, x2: x + 27, y2: 284, "class": "panel-leg thin" });
      var face = "M" + x + " 280 L" + (x + 6) + " 268 L" + (x + 34) + " 268 L" + (x + 28) + " 280 Z";
      add(panels, "path", { d: face, fill: "url(#" + P + "cells)", "class": "panel" });
      // cell grid: 3 lines across, 1 line along
      [0.25, 0.5, 0.75].forEach(function (f) {
        add(panels, "line", { x1: x + 28 * f, y1: 280, x2: x + 6 + 28 * f, y2: 268, "class": "panel-cell" });
      });
      add(panels, "line", { x1: x + 3, y1: 274, x2: x + 31, y2: 274, "class": "panel-cell" });
      add(panels, "path", { d: face, fill: "url(#" + P + "dust-hatch)", "class": "panel-dust" });
      add(panels, "path", { d: face, "class": "panel-frame" });
      add(panels, "line", { x1: x + 6, y1: 268, x2: x + 34, y2: 268, "class": "panel-edge" });   // thin light top edge
    });

    // --- Greenhouse tube: set back on the right ---
    var gh = group(base, "greenhouse");
    groundContact(gh, 524, 289.5, 34);
    add(gh, "rect", { x: 492, y: 268, width: 64, height: 21, rx: 10, fill: "url(#" + P + "tube)", "class": "gh-glass" });
    [500, 509, 518, 527, 536, 545].forEach(function (x, i) {
      var h = 6 + (i % 2) * 3;
      add(gh, "path", { d: "M" + x + " 288 q-2.5 -" + h + " 0 -" + (h + 2) + " q2.5 " + (h / 2) + " 0 " + (h + 2), "class": "plant" });
    });
    [497, 507, 517, 527, 537, 547].forEach(function (x) {
      add(gh, "line", { x1: x, y1: 269, x2: x, y2: 289, "class": "gh-rib" });   // the tube's ribs
    });
    add(gh, "rect", { x: 492, y: 268, width: 64, height: 21, rx: 10, fill: "url(#" + P + "dust-low)", "class": "dust-coat" });
    add(gh, "rect", { x: 488, y: 271, width: 6, height: 18, rx: 2, fill: "url(#" + P + "metal-side)", "class": "gh-end" });

    // --- Comm dish on a mast: furthest back on the right ---
    var dish = group(base, "dish");
    groundContact(dish, 566, 289.5, 10);
    add(dish, "line", { x1: 566, y1: 289, x2: 559, y2: 289, "class": "dish-mast thin" });
    add(dish, "path", { d: "M560 289 L566 262 L572 289", "class": "dish-mast tripod" });
    add(dish, "path", { d: "M550 256 Q566 270 585 248 Q575 251 566 254 Q557 256 550 256 Z", fill: "url(#" + P + "metal)", "class": "dish-bowl" });
    add(dish, "line", { x1: 567, y1: 257, x2: 575, y2: 247, "class": "dish-feed" });

    // --- The habitat: an inflatable module with a regolith shelter berm ---
    var hab = group(base, "habitat");
    groundContact(hab, 382, 297, 98);
    // airlock: a short metal cylinder on the left end
    add(hab, "rect", { x: 288, y: 262, width: 30, height: 34, rx: 5, fill: "url(#" + P + "metal-side)", "class": "hab-airlock" });
    add(hab, "rect", { x: 294, y: 269, width: 15, height: 27, rx: 3, "class": "hab-door" });
    add(hab, "circle", { cx: 301.5, cy: 276, r: 2.4, "class": "door-port" });
    // the inflatable body, with soft seams
    add(hab, "rect", { x: 312, y: 240, width: 152, height: 56, rx: 26, fill: "url(#" + P + "fabric)", "class": "hab-body" });
    add(hab, "rect", { x: 312, y: 240, width: 152, height: 56, rx: 26, fill: "url(#" + P + "fabric-side)" });
    [338, 364, 390, 416, 442].forEach(function (x) {
      add(hab, "path", { d: "M" + x + " 241 Q" + (x + 2) + " 268 " + x + " 295", "class": "seam" });
    });
    add(hab, "path", { d: "M318 268 Q388 272 458 268", "class": "seam" });
    add(hab, "rect", { x: 312, y: 240, width: 152, height: 56, rx: 26, fill: "url(#" + P + "dust-low)", "class": "dust-coat" });
    // the window strip (its light is drawn separately, see "lights" below)
    add(hab, "rect", { x: 346, y: 251, width: 78, height: 20, rx: 6, "class": "hab-window" });
    add(hab, "rect", { x: 346, y: 251, width: 78, height: 20, rx: 6, "class": "hab-window-frame" });
    // regolith shelter berm piled over the right end (radiation protection)
    add(hab, "path", { d: "M430 297 Q432 254 452 244 Q470 236 482 252 Q494 270 500 297 Z", fill: "url(#" + P + "regolith)", "class": "berm" });
    [[452, 262], [466, 252], [474, 274], [486, 284], [460, 286], [444, 278]].forEach(function (p) {
      add(hab, "circle", { cx: p[0], cy: p[1], r: 1.1, "class": "berm-grain" });
    });
    // roof beacon housing
    add(hab, "rect", { x: 380, y: 233, width: 10, height: 8, rx: 2.5, fill: "url(#" + P + "metal-side)" });

    // Storm shelter shield
    add(base, "path", { d: "M268 298 Q268 196 384 196 Q500 196 500 298", "class": "shield-dome" });

    // --- Crew outside: three astronauts in suits (not real people) ---
    // Each has one color stripe matching a meter: teal, amber, violet.
    var crew = group(base, "crew-outside");
    makeAstronaut(crew, 270, 300, "kneel", "stripe-life", true, P);    // brushing dust off the panels
    makeAstronaut(crew, 470, 300, "carry", "stripe-power", false, P);  // carrying a crate
    makeAstronaut(crew, 542, 300, "point", "stripe-shield", false, P); // pointing at the dish

    // The night watch: one crew member just outside the door, pointing a
    // torch down at the pump hatch. Its light is drawn in "lights" below.
    var watchBody = group(base, "night-watch");
    makeAstronaut(watchBody, 300, 315, "torch", "stripe-life", true, P);

    // =================================================================
    // LIGHTS: drawn after the base so the night filter does not dim them.
    // =================================================================
    var lights = group(svg, "lights");
    add(lights, "rect", { x: 347, y: 252, width: 76, height: 18, rx: 5, "class": "window-glow" });
    // inside the window: three sleeping bags on bunks, seen through the glass
    var bunks = group(lights, "window-crew");
    [[352, "bag-life"], [376, "bag-power"], [400, "bag-shield"]].forEach(function (b, i) {
      var bag = group(bunks, "window-head head-" + (i + 1));
      add(bag, "rect", { x: b[0], y: 262, width: 20, height: 6, rx: 3, "class": "bag " + b[1] });
      add(bag, "ellipse", { cx: b[0] + 3.5, cy: 263, rx: 3.2, ry: 2.4, "class": "bag-hood" });
    });
    add(lights, "line", { x1: 347, y1: 269, x2: 423, y2: 269, "class": "bunk-rail" });
    var z = add(lights, "text", { x: 432, y: 248, "class": "zzz" });
    z.textContent = "z Z";
    add(lights, "circle", { cx: 385, cy: 234, r: 13, "class": "beacon-glow" });
    add(lights, "rect", { x: 382, y: 231, width: 6, height: 4, rx: 1.5, "class": "beacon" });
    add(lights, "ellipse", { cx: 524, cy: 279, rx: 30, ry: 11, fill: "url(#" + P + "gh-glow)", "class": "gh-light" });
    add(lights, "circle", { cx: 575, cy: 246, r: 1.8, "class": "dish-red" });   // small red light, blinks slowly
    var waves = group(lights, "dish-waves");
    [9, 16, 23].forEach(function (r) {
      add(waves, "path", { d: "M" + (582 + r * 0.2) + " " + (238 - r) + " a" + r + " " + r + " 0 0 1 " + r + " " + r, "class": "dish-wave" });
    });
    var watchLight = group(lights, "night-watch");
    add(watchLight, "path", { d: "M283 281 L259 318 L280 320 Z", fill: "url(#" + P + "torch-cone)", "class": "torch-beam" });
    add(watchLight, "ellipse", { cx: 270, cy: 319, rx: 15, ry: 4, fill: "url(#" + P + "torch-pool)", "class": "torch-pool" });

    // Dust motes drifting in the air (they only move when motion is allowed)
    var motes = group(svg, "motes");
    var mseed = 3;
    function nextMote() { mseed = (mseed * 9301 + 49297) % 233280; return mseed / 233280; }
    for (var m = 0; m < 36; m++) {
      add(motes, "circle", { cx: (120 + nextMote() * 580).toFixed(1), cy: (150 + nextMote() * 200).toFixed(1), r: (0.4 + nextMote() * 0.8).toFixed(2), "class": "mote" });
    }

    // Slow drifting dust bands (only move on the title screen).
    var drift = group(svg, "dust-drift");
    add(drift, "ellipse", { cx: 250, cy: 270, rx: 140, ry: 10, "class": "drift" });
    add(drift, "ellipse", { cx: 520, cy: 262, rx: 170, ry: 8, "class": "drift" });

    // --- Weather overlays (on top) ---
    add(svg, "rect", Object.assign({}, BIG, { "class": "dust-haze" }));
    add(svg, "rect", Object.assign({}, BIG, { "class": "storm-haze" }));
    add(svg, "rect", Object.assign({}, BIG, { "class": "flare-flash" }));

    // A darker lip of ground along the bottom, to frame the shot.
    add(svg, "path", { d: "M-1500 352 L120 352 Q300 340 420 347 T700 344 L2500 344 L2500 2500 L-1500 2500 Z", "class": "ground-lip" });

    // The short text alternative for screen readers.
    svg.setAttribute("role", "img");
    label = add(svg, "title", {});

    // ---------------------------------------------------------------------
    // Changing the picture
    // ---------------------------------------------------------------------

    // Turn a CSS class on or off on the whole picture. Most looks are in CSS.
    function flag(name, on) {
      svg.classList.toggle(name, !!on);
    }

    // Light the base for the time of day and the weather, with one filter.
    function applyLighting() {
      var f = "";
      if (phaseNow === "night") { f = dustNow ? "light-dust-night" : "light-night"; }
      else if (dustNow) { f = "light-dust"; }
      else if (phaseNow === "dusk") { f = "light-dusk"; }
      if (f) { base.setAttribute("filter", "url(#" + P + f + ")"); }
      else { base.removeAttribute("filter"); }
    }

    // phase: "day", "dusk" or "night"
    function drawSky(phase) {
      phaseNow = phase;
      flag("is-day", phase === "day");
      flag("is-dusk", phase === "dusk");
      flag("is-night", phase === "night");
      applyLighting();
    }

    function setDust(on) { dustNow = !!on; flag("is-dusty", on); applyLighting(); }
    function setAlarm(on) { flag("is-alarm", on); }
    function setPanelsDusty(on) { flag("panels-dusty", on); }
    function setGreenhouseLights(on) { flag("greenhouse-dark", !on); }
    function setShield(on) { flag("shield-up", on); }
    function setDishBlinking(on) { flag("dish-blinking", on); }
    function setTitleMode(on) { flag("title-mode", on); }

    // Point the camera: show the part of the drawing from (x, y), w wide
    // and h tall. js/ui.js works out these numbers from the screen size.
    function setCamera(x, y, w, h) {
      svg.setAttribute("viewBox", [x, y, w, h].map(function (n) { return n.toFixed(1); }).join(" "));
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    }

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

    // state: what the crew is doing. The CSS shows and hides poses.
    //   "work"       outside, rested
    //   "tired"      outside, slumped
    //   "exhausted"  outside, slumped, one arm up in a big stretch
    //   "shelter"    everyone inside, shield up
    //   "sleep"      inside, asleep (sleeping bags in the window)
    //   "inside"     inside at night, no sleep shown (used when fatigue is off)
    //   "away"       nobody shown outside
    var CREW_STATES = ["work", "tired", "exhausted", "shelter", "sleep", "inside", "away"];
    function setCrewState(state) {
      CREW_STATES.forEach(function (s) { flag("crew-" + s, s === state); });
    }

    function describe(text) {
      label.textContent = text;
      svg.setAttribute("aria-label", text);
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
      setTitleMode: setTitleMode,
      setCamera: setCamera,
      describe: describe
    };
  }

  // ---------------------------------------------------------------------
  // One astronaut in a surface suit, standing on the ground at (x, groundY).
  //   pose:   "kneel" (with a brush), "carry" (a crate), "point" (at the
  //           dish) or "torch" (holding a light). Each pose is a fixed set
  //           of shapes, no moving limbs.
  //   stripe: CSS class for the one color stripe on the suit
  //   faceLeft: true = mirror the figure so it faces left
  // There is no face: the helmet has a dark, gold-tinted visor that
  // reflects the sky. Tiredness shows in posture: slumped, and when
  // exhausted, one arm up in a long stretch.
  // ---------------------------------------------------------------------
  function makeAstronaut(parent, x, groundY, pose, stripe, faceLeft, P) {
    var outer = group(parent, "astronaut pose-" + pose,
      "translate(" + x + " " + groundY + ") scale(" + (faceLeft ? -CREW_SCALE : CREW_SCALE) + " " + CREW_SCALE + ")");
    var body = group(outer, "astro-body");
    var kneel = pose === "kneel";
    var lift = kneel ? 7 : 0;   // a kneeling body sits lower
    var suit = "url(#" + P + "suit)";

    // legs and boots
    if (kneel) {
      add(body, "rect", { x: -2, y: -10, width: 13, height: 5.5, rx: 2.5, fill: suit, "class": "suit" });   // thigh, forward
      add(body, "rect", { x: 7, y: -10, width: 5.5, height: 8, rx: 2.5, fill: suit, "class": "suit" });     // shin, down
      add(body, "rect", { x: 6.5, y: -3, width: 7.5, height: 3, rx: 1.2, "class": "boot" });
      add(body, "rect", { x: -9, y: -6, width: 9, height: 6, rx: 2.5, fill: suit, "class": "suit" });       // knee on the ground
      add(body, "rect", { x: -11, y: -2.6, width: 4, height: 2.6, rx: 1, "class": "boot" });
    } else {
      add(body, "rect", { x: -6.5, y: -15, width: 5.6, height: 12, rx: 2.4, fill: suit, "class": "suit" });
      add(body, "rect", { x: 0.9, y: -15, width: 5.6, height: 12, rx: 2.4, fill: suit, "class": "suit" });
      add(body, "line", { x1: -6, y1: -9, x2: -1.4, y2: -9, "class": "joint" });   // knee rings
      add(body, "line", { x1: 1.4, y1: -9, x2: 6, y2: -9, "class": "joint" });
      add(body, "rect", { x: -7.5, y: -3.6, width: 7, height: 3.6, rx: 1.3, "class": "boot" });
      add(body, "rect", { x: 0.5, y: -3.6, width: 7, height: 3.6, rx: 1.3, "class": "boot" });
    }
    // life-support backpack, torso, chest unit, color stripe, side shading
    add(body, "rect", { x: -13, y: -36 + lift, width: 6.5, height: 21, rx: 2, fill: "url(#" + P + "metal)", "class": "pack" });
    add(body, "rect", { x: -8, y: -34 + lift, width: 16, height: 20, rx: 5, fill: suit, "class": "suit" });
    add(body, "rect", { x: -8, y: -34 + lift, width: 16, height: 20, rx: 5, fill: "url(#" + P + "suit-side)" });
    add(body, "rect", { x: -3.5, y: -29 + lift, width: 8, height: 4.5, rx: 1, "class": "chest-unit" });
    add(body, "rect", { x: -8, y: -32.6 + lift, width: 16, height: 2.2, "class": "stripe " + stripe });
    add(body, "rect", { x: -8, y: -19 + lift, width: 16, height: 5, rx: 2, fill: "url(#" + P + "dust-low)", "class": "dust-coat" });

    // arms (with darker gloves) and props for each pose
    function arm(x1, y1, x2, y2) {
      add(body, "line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": "arm" });
      add(body, "circle", { cx: x2, cy: y2, r: 2.1, "class": "glove" });
    }
    if (pose === "kneel") {
      arm(6, -26 + lift, 16, -19 + lift);
      add(body, "line", { x1: 16, y1: -19 + lift, x2: 26, y2: -27 + lift, "class": "brush-handle" });
      add(body, "rect", { x: 24, y: -32 + lift, width: 7, height: 4, rx: 1, "class": "brush-head", transform: "rotate(-40 27 " + (-30 + lift) + ")" });
    } else if (pose === "carry") {
      add(body, "rect", { x: 5, y: -27, width: 15, height: 12, rx: 1.5, "class": "crate" });
      add(body, "line", { x1: 5, y1: -23, x2: 20, y2: -23, "class": "crate-line" });
      arm(4, -28, 8, -21);
    } else if (pose === "point") {
      arm(5, -29, 16, -42);
      arm(-6, -28, -8, -17);
    } else if (pose === "torch") {
      arm(5, -27, 13, -30);
      add(body, "rect", { x: 12, y: -33, width: 6, height: 4.5, rx: 1, "class": "torch" });
    }
    // the big stretch, shown only when the crew is exhausted
    add(body, "line", { x1: -4, y1: -31 + lift, x2: -9, y2: -50 + lift, "class": "arm arm-stretch" });
    add(body, "circle", { cx: -9, cy: -50 + lift, r: 2.1, "class": "glove arm-stretch" });

    // helmet: white shell, dark gold-tinted visor, and a highlight that
    // takes the color of the sky (set in CSS)
    add(body, "circle", { cx: 0, cy: -41 + lift, r: 7.2, fill: suit, "class": "helmet" });
    add(body, "ellipse", { cx: 1.8, cy: -41 + lift, rx: 5.2, ry: 4.4, fill: "url(#" + P + "visor)", "class": "visor" });
    add(body, "path", { d: "M-1.2 " + (-43.4 + lift) + " Q1.8 " + (-45.6 + lift) + " 5.4 " + (-43.2 + lift), "class": "visor-hl" });
    add(body, "circle", { cx: 4.4, cy: -42.2 + lift, r: 0.9, "class": "visor-dot" });
    return outer;
  }

  return { create: create, BACKDROP: BACKDROP };
})();
