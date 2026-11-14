/*
  Sol Shift: the outpost scene, drawn with SVG shapes in code.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. The art direction (framing, palette, poses) came from Pixel, the
  team's AI designer bot. See AI-USE.md. No image files and no generated
  images are used: every shape below is written by hand in code.

  This file only DRAWS. It never changes the game. js/ui.js looks at the
  game and calls these functions:

    var scene = SolShiftScene.create(svgElement)   build one picture
    scene.drawSky(phase)          "day", "dusk" or "night"
    scene.setDust(on)             dust storm: an ochre haze, far ridge first
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

  Layout of the drawing (SVG units, y grows downward):
    the camera looks at x 120 to 680, y 140 to 360 (the viewBox)
    sky above y 230, far ridge around y 230, mid dunes around y 260,
    foreground ground from y 282. The habitat is the hero, a little left
    of the middle, on a small mound. Panels sit behind it on the left;
    the greenhouse and the dish sit further back on the right.
*/

var SolShiftScene = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // The far ridge outline (a tall mound in the middle, like the mountain
  // in Gale Crater) and everything below it.
  // The shapes reach far past the edges, so any screen shape is covered.
  var RIDGE_FAR = "M-1500 252 L60 252 L170 240 L260 237 L330 228 L400 215 L450 206 L482 203 L520 211 L580 229 L640 236 L740 242 L2500 242 L2500 2500 L-1500 2500 Z";
  var DUNES_MID = "M-1500 268 L60 268 Q190 252 300 263 T500 258 T740 256 L2500 256 L2500 2500 L-1500 2500 Z";
  var GROUND_FG = "M-1500 287 L60 287 Q260 278 400 285 T740 282 L2500 282 L2500 2500 L-1500 2500 Z";
  // A rectangle bigger than any camera view, for skies and overlays.
  var BIG = { x: -1500, y: -2000, width: 4000, height: 4500 };

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

  // A vertical color gradient. With top and bottom given, it is measured
  // in scene units (so a huge sky rectangle still fades between those
  // heights); without them it stretches over the shape it fills.
  function linear(defs, id, stops, top, bottom) {
    var attrs = { id: id, x1: 0, y1: 0, x2: 0, y2: 1 };
    if (top !== undefined) {
      attrs = { id: id, x1: 0, y1: top, x2: 0, y2: bottom, gradientUnits: "userSpaceOnUse" };
    }
    var g = add(defs, "linearGradient", attrs);
    stops.forEach(function (s) { add(g, "stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] === undefined ? 1 : s[2] }); });
  }

  // A round glow that fades out toward its edge.
  function radial(defs, id, color, strength) {
    var g = add(defs, "radialGradient", { id: id, cx: "0.5", cy: "0.5", r: "0.5" });
    add(g, "stop", { offset: "0", "stop-color": color, "stop-opacity": strength });
    add(g, "stop", { offset: "1", "stop-color": color, "stop-opacity": "0" });
  }

  // A soft dark shadow on the ground under an object (25 percent opacity).
  function contactShadow(parent, cx, cy, rx) {
    add(parent, "ellipse", { cx: cx, cy: cy, rx: rx, ry: Math.max(2, rx * 0.16), "class": "contact-shadow" });
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
    var label;

    svg.textContent = "";
    svg.setAttribute("viewBox", "120 140 560 220");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

    var defs = add(svg, "defs");
    // Skies. Day and night colors are artistic choices, not measurements.
    linear(defs, P + "sky-day", [["0", "#E8A87C"], ["1", "#F3C9A1"]], 60, 250);
    linear(defs, P + "sky-dusk", [["0", "#2C2A4A"], ["1", "#8A4F5E"]], 60, 240);
    linear(defs, P + "sky-night", [["0", "#0B0E1A"], ["1", "#1A1630"]], 60, 250);
    linear(defs, P + "dusk-band", [["0", "#E58A5A", 0], ["0.55", "#E58A5A", 0.75], ["1", "#E58A5A", 0]]);
    radial(defs, P + "blue-glow", "#9ccaf5", 0.9);   // the real blue glow around a Mars sunset
    radial(defs, P + "window-light", "#FFC46B", 0.7);
    radial(defs, P + "alarm-light", "#FF6B4A", 0.75);
    radial(defs, P + "gh-glow", "#9be38a", 0.8);
    radial(defs, P + "torch-pool", "#ffe2a0", 0.75);
    // The torch cone: about 35 percent bright at the torch, fading to nothing.
    var cone = add(defs, "linearGradient", { id: P + "torch-cone", gradientUnits: "userSpaceOnUse", x1: 283, y1: 281, x2: 268, y2: 320 });
    add(cone, "stop", { offset: "0", "stop-color": "#ffe9b8", "stop-opacity": "0.35" });
    add(cone, "stop", { offset: "1", "stop-color": "#ffe9b8", "stop-opacity": "0" });
    var hatch = add(defs, "pattern", { id: P + "dust-hatch", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" });
    add(hatch, "rect", { width: 5, height: 5, fill: "#b07a4f", opacity: "0.6" });
    add(hatch, "line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "#7c4a2a", "stroke-width": 2.5 });

    // --- Sky: three layers; CSS fades between them ---
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-night)" }));
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-day)", "class": "sky-layer sky-day" }));
    add(svg, "rect", Object.assign({}, BIG, { fill: "url(#" + P + "sky-dusk)", "class": "sky-layer sky-dusk" }));
    add(svg, "rect", { x: -1500, y: 205, width: 4000, height: 45, fill: "url(#" + P + "dusk-band)", "class": "dusk-band" });

    // Stars in three sizes, spread over the whole sky. The positions come
    // from a fixed recipe, so the sky is the same every visit.
    var stars = group(svg, "stars");
    var sizes = [0.7, 1.1, 1.7];
    var seed = 7;
    function nextStar() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 260; i++) {
      var sx = -500 + nextStar() * 1800;
      var sy = -600 + nextStar() * 830;   // from high up down to y 230
      var size = nextStar() < 0.12 ? 2 : (nextStar() < 0.35 ? 1 : 0);
      add(stars, "circle", { cx: sx.toFixed(1), cy: sy.toFixed(1), r: sizes[size],
        "class": "star" + (size === 2 || i % 7 === 0 ? " twinkle t" + (i % 3) : "") });
    }

    // The Sun. High and pale by day; at dusk it sits low with its blue glow.
    add(svg, "circle", { cx: 530, cy: 208, r: 62, fill: "url(#" + P + "blue-glow)", "class": "sun-glow" });
    add(svg, "circle", { cx: 590, cy: 168, r: 22, "class": "sun-corona" });
    add(svg, "circle", { cx: 590, cy: 168, r: 8, "class": "sun" });
    var streaks = group(svg, "particle-streaks");
    [[470, 150], [430, 175], [520, 190], [380, 160], [560, 205], [330, 185], [610, 180]].forEach(function (p) {
      add(streaks, "line", { x1: p[0], y1: p[1], x2: p[0] - 34, y2: p[1] + 19, "class": "streak" });
    });

    // --- Land: far ridge (pale), dust over the ridge, mid dunes, ground ---
    add(svg, "path", { d: RIDGE_FAR, "class": "ridge-far" });
    add(svg, "path", { d: RIDGE_FAR, "class": "ridge-dust" });   // dust storms hide the far ridge first
    add(svg, "path", { d: DUNES_MID, "class": "ridge-mid" });
    add(svg, "path", { d: GROUND_FG, "class": "ground" });
    add(svg, "ellipse", { cx: 384, cy: 300, rx: 125, ry: 13, "class": "mound" });   // the small rise under the habitat

    // --- Ground details: low dune lines, tracks to the door, a power cable,
    //     small rocks and the pump hatch. Kept quiet on purpose. ---
    var details = group(svg, "ground-details");
    ["M110 318 Q220 309 330 316", "M420 324 Q540 314 690 321", "M150 338 Q300 330 450 336", "M480 342 Q600 334 700 339"].forEach(function (d) {
      add(details, "path", { d: d, "class": "dune-line" });
    });
    // two lines of boot and wheel tracks coming in from the front to the door
    add(details, "path", { d: "M250 380 Q268 340 296 300", "class": "track" });
    add(details, "path", { d: "M262 380 Q279 342 305 300", "class": "track" });
    // power cable from the solar panels to the airlock
    add(details, "path", { d: "M238 289 Q262 299 289 295", "class": "cable" });
    // the pump hatch on the ground beside the door
    add(details, "rect", { x: 260, y: 315, width: 20, height: 6, rx: 2, "class": "hatch" });
    // small rocks, each with a soft shadow
    [[176, 326, 7], [338, 330, 5], [452, 320, 6], [520, 338, 8], [640, 327, 6], [600, 348, 9], [150, 346, 8], [420, 352, 7]].forEach(function (r) {
      contactShadow(details, r[0] + 1, r[1] + 0.5, r[2] * 1.2);
      add(details, "path", { d: "M" + (r[0] - r[2]) + " " + r[1] + " q" + (r[2] * 0.5) + " " + (-r[2] * 0.9) + " " + r[2] + " " + (-r[2] * 0.85) + " q" + (r[2] * 0.7) + " 0.1 " + r[2] + " " + (r[2] * 0.85) + " Z", "class": "rock-fg" });
    });

    // Warm light from the habitat windows, and the red alarm light, spilling onto the ground.
    add(svg, "ellipse", { cx: 385, cy: 304, rx: 160, ry: 30, fill: "url(#" + P + "window-light)", "class": "window-spill" });
    add(svg, "ellipse", { cx: 330, cy: 306, rx: 120, ry: 28, fill: "url(#" + P + "alarm-light)", "class": "alarm-spill" });

    // Slow drifting dust (only moves on the title screen).
    var drift = group(svg, "dust-drift");
    add(drift, "ellipse", { cx: 250, cy: 270, rx: 140, ry: 10, "class": "drift" });
    add(drift, "ellipse", { cx: 520, cy: 262, rx: 170, ry: 8, "class": "drift" });

    // --- Solar panels: behind the habitat, on the left, smaller ---
    var panels = group(svg, "panels");
    [204, 238, 272].forEach(function (x) {
      contactShadow(panels, x + 17, 289, 16);
      add(panels, "line", { x1: x + 17, y1: 271, x2: x + 17, y2: 288, "class": "panel-leg" });
      var face = "M" + x + " 278 L" + (x + 6) + " 262 L" + (x + 33) + " 262 L" + (x + 27) + " 278 Z";
      add(panels, "path", { d: face, "class": "panel" });
      // three cell lines across the panel
      [0.25, 0.5, 0.75].forEach(function (f) {
        add(panels, "line", { x1: x + 27 * f, y1: 278, x2: x + 6 + 27 * f, y2: 262, "class": "panel-cell" });
      });
      add(panels, "path", { d: face, fill: "url(#" + P + "dust-hatch)", "class": "panel-dust" });
      add(panels, "line", { x1: x + 6, y1: 262, x2: x + 33, y2: 262, "class": "panel-edge" });   // thin light top edge
    });

    // --- Greenhouse: set back on the right ---
    var gh = group(svg, "greenhouse");
    contactShadow(gh, 508, 289, 34);
    add(gh, "ellipse", { cx: 508, cy: 276, rx: 26, ry: 14, fill: "url(#" + P + "gh-glow)", "class": "gh-light" });
    var dome = "M478 288 L478 271 Q508 243 538 271 L538 288 Z";
    add(gh, "path", { d: dome, "class": "gh-glass" });
    [486, 495, 504, 513, 522, 530].forEach(function (x, i) {
      var h = 8 + (i % 2) * 4;
      add(gh, "path", { d: "M" + x + " 288 q-3 -" + h + " 0 -" + (h + 3) + " q3 " + (h / 2) + " 0 " + (h + 3), "class": "plant" });
    });
    add(gh, "line", { x1: 508, y1: 251, x2: 508, y2: 288, "class": "gh-frame" });

    // --- Comm dish: furthest back on the right ---
    var dish = group(svg, "dish", "translate(-20 0)");   // pulled in a little so phones see all of it
    contactShadow(dish, 586, 289, 12);
    add(dish, "line", { x1: 586, y1: 288, x2: 586, y2: 257, "class": "dish-mast" });
    add(dish, "path", { d: "M569 254 Q586 268 605 244 Z", "class": "dish-bowl" });
    add(dish, "circle", { cx: 587, cy: 251, r: 2.4, "class": "dish-red" });   // small red light, blinks slowly
    var waves = group(dish, "dish-waves");
    [9, 16, 23].forEach(function (r) {
      add(waves, "path", { d: "M" + (600 + r * 0.2) + " " + (240 - r) + " a" + r + " " + r + " 0 0 1 " + r + " " + r, "class": "dish-wave" });
    });

    // --- Habitat: the hero, slightly left of the middle ---
    var hab = group(svg, "habitat");
    contactShadow(hab, 378, 297, 92);
    add(hab, "rect", { x: 288, y: 262, width: 28, height: 34, rx: 6, "class": "hab-airlock" });
    add(hab, "rect", { x: 295, y: 270, width: 14, height: 26, rx: 3, "class": "hab-door" });
    add(hab, "rect", { x: 310, y: 238, width: 150, height: 58, rx: 28, "class": "hab-body" });
    add(hab, "rect", { x: 314, y: 283, width: 142, height: 5, rx: 2, "class": "hab-band" });
    add(hab, "rect", { x: 335, y: 252, width: 100, height: 25, rx: 12, "class": "hab-window" });
    // Sleeping heads in the window at night
    var heads = group(hab, "window-crew");
    [358, 385, 412].forEach(function (x, i) {
      var head = group(heads, "window-head head-" + (i + 1));
      add(head, "circle", { cx: x, cy: 268, r: 7, "class": "wh-head" });
      add(head, "path", { d: "M" + (x - 4) + " 267 q2 1.6 4 0 M" + (x + 1) + " 267 q2 1.6 4 0", "class": "wh-eyes" });
    });
    var z = add(hab, "text", { x: 430, y: 249, "class": "zzz" });
    z.textContent = "z Z";
    // Warning beacon on the roof
    add(hab, "circle", { cx: 385, cy: 234, r: 13, "class": "beacon-glow" });
    add(hab, "rect", { x: 380, y: 230, width: 10, height: 8, rx: 3, "class": "beacon" });

    // Storm shelter shield
    add(svg, "path", { d: "M268 298 Q268 196 380 196 Q492 196 492 298", "class": "shield-dome" });

    // --- Crew outside: three stylized astronauts (not real people) ---
    // Each has one color stripe matching a meter: teal, amber, violet.
    var crew = group(svg, "crew-outside");
    makeAstronaut(crew, 270, 300, "kneel", "stripe-life", true);    // brushing dust off the panels
    makeAstronaut(crew, 470, 299, "carry", "stripe-power", false);  // carrying a crate
    makeAstronaut(crew, 542, 300, "point", "stripe-shield", false); // pointing at the dish

    // The night watch: one crew member at the door with a torch during an alarm.
    // They stand just in front of the door and point the torch down at the
    // pump hatch on the ground: a soft warm cone that fades out, and a small
    // pool of light where it lands. It stays below the solar panels.
    var watch = group(svg, "night-watch");
    add(watch, "path", { d: "M283 281 L259 318 L280 320 Z", fill: "url(#" + P + "torch-cone)", "class": "torch-beam" });
    add(watch, "ellipse", { cx: 270, cy: 319, rx: 15, ry: 4, fill: "url(#" + P + "torch-pool)", "class": "torch-pool" });
    makeAstronaut(watch, 300, 315, "torch", "stripe-life", true);

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

    // Turn a CSS class on or off on the whole picture. All the looks are in CSS.
    function flag(name, on) {
      svg.classList.toggle(name, !!on);
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
    //   "exhausted"  outside, slumped and yawning
    //   "shelter"    everyone inside, shield up
    //   "sleep"      inside, asleep (heads in the window)
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
  // One astronaut, standing on the ground at (x, groundY).
  //   pose:   "kneel" (with a brush), "carry" (a crate), "point" (at the
  //           dish) or "torch" (holding a light). Each pose is a fixed set
  //           of shapes, no moving limbs.
  //   stripe: CSS class for the one color stripe on the suit
  //   faceLeft: true = mirror the figure so it faces left
  // The helmet has a dark visor with one highlight dot. When the crew is
  // exhausted, a small yawn shows in the visor and the body slumps.
  // ---------------------------------------------------------------------
  // The crew is drawn a little larger than life next to the buildings, so
  // they read clearly on a phone.
  var CREW_SCALE = 1.15;

  function makeAstronaut(parent, x, groundY, pose, stripe, faceLeft) {
    var outer = group(parent, "astronaut pose-" + pose,
      "translate(" + x + " " + groundY + ") scale(" + (faceLeft ? -CREW_SCALE : CREW_SCALE) + " " + CREW_SCALE + ")");
    var body = group(outer, "astro-body");
    var kneel = pose === "kneel";
    var lift = kneel ? 7 : 0;   // a kneeling body sits lower

    // legs
    if (kneel) {
      add(body, "rect", { x: -2, y: -9, width: 13, height: 5.5, rx: 2.5, "class": "suit" });   // thigh, forward
      add(body, "rect", { x: 7, y: -9, width: 5.5, height: 9, rx: 2.5, "class": "suit" });     // shin, down
      add(body, "rect", { x: -9, y: -6, width: 9, height: 6, rx: 2.5, "class": "suit" });      // knee on the ground
    } else {
      add(body, "rect", { x: -7, y: -11, width: 6, height: 11, rx: 2.5, "class": "suit" });
      add(body, "rect", { x: 1, y: -11, width: 6, height: 11, rx: 2.5, "class": "suit" });
    }
    // backpack, body, color stripe
    add(body, "rect", { x: -12.5, y: -30 + lift, width: 5.5, height: 15, rx: 2, "class": "pack" });
    add(body, "rect", { x: -8.5, y: -31 + lift, width: 17, height: 21, rx: 6, "class": "suit" });
    add(body, "rect", { x: -8.5, y: -24 + lift, width: 17, height: 3.2, "class": "stripe " + stripe });

    // arms and props for each pose
    if (pose === "kneel") {
      add(body, "line", { x1: 6, y1: -24 + lift, x2: 17, y2: -17 + lift, "class": "arm" });
      add(body, "line", { x1: 17, y1: -17 + lift, x2: 27, y2: -26 + lift, "class": "brush-handle" });
      add(body, "rect", { x: 25, y: -31 + lift, width: 7, height: 4, rx: 1, "class": "brush-head", transform: "rotate(-40 28 " + (-29 + lift) + ")" });
    } else if (pose === "carry") {
      add(body, "rect", { x: 5, y: -25, width: 15, height: 12, rx: 1.5, "class": "crate" });
      add(body, "line", { x1: 5, y1: -21, x2: 20, y2: -21, "class": "crate-line" });
      add(body, "line", { x1: 4, y1: -26, x2: 9, y2: -19, "class": "arm" });
    } else if (pose === "point") {
      add(body, "line", { x1: 5, y1: -27, x2: 17, y2: -40, "class": "arm" });
      add(body, "line", { x1: -6, y1: -26, x2: -9, y2: -15, "class": "arm" });
    } else if (pose === "torch") {
      add(body, "line", { x1: 5, y1: -25, x2: 13, y2: -29, "class": "arm" });
      add(body, "rect", { x: 12, y: -32, width: 6, height: 4.5, rx: 1, "class": "torch" });
    }

    // helmet, dark visor, highlight dot, and the yawn (shown only when exhausted)
    add(body, "circle", { cx: 0, cy: -39 + lift, r: 9, "class": "helmet" });
    add(body, "ellipse", { cx: 2, cy: -39 + lift, rx: 6, ry: 5, "class": "visor" });
    add(body, "ellipse", { cx: 2.5, cy: -36.6 + lift, rx: 1.6, ry: 2, "class": "visor-yawn" });
    add(body, "circle", { cx: 4.2, cy: -41 + lift, r: 1.3, "class": "visor-dot" });
    return outer;
  }

  return { create: create };
})();
