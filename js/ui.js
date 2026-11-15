/*
  Sol Shift: the web page code. Draws the game and handles button presses.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  The rules live in js/engine.js. This file only:
    1. starts a game when the player presses Start
    2. draws the meters, the crew, the card and the log
    3. tells the outpost picture (js/scene.js) what to show
    4. calls SolShiftEngine.choose() when a choice button is pressed
    5. shows the end screen (the mission report) and the sources screen

  Layout: the scene fills the whole screen and every panel floats over it
  as glass (see css/style.css). updateCamera() below points the scene's
  camera so the habitat and crew stay in the part of the screen that is
  not covered by panels: above the bottom sheet on phones, left of the
  side panel on wide screens.

  Useful web addresses (for testing and for the demo video):
    index.html?demo=pump    start right at the 3 a.m. pump fault
    index.html?demo=video   plays a 30-second tour by itself, with captions
                            (used to record the demo video, see the end of this file)
    index.html?seed=123     the same seed always plays the same game
*/

(function () {
  "use strict";

  var E = SolShiftEngine;

  // All the data files, gathered into one object for the engine.
  var DATA = {
    numbers: SOL_SHIFT_NUMBERS,
    events: SOL_SHIFT_EVENTS,
    solarCards: SOL_SHIFT_SOLAR_CARDS,
    outcomes: SOL_SHIFT_OUTCOMES,
    spaceWeather: SOL_SHIFT_SPACE_WEATHER
  };

  var game = null;           // the current game, or null before Start
  var screenBeforeSources = "start-screen";
  var scene = SolShiftScene.create(document.getElementById("scene")); // the full-screen picture (js/scene.js)
  var currentScreen = "start-screen";
  var sceneMemory = {};      // picture changes left by a choice: { panelsDusty: lastSol, ... }
  var nightEventPhase = -1;  // the phase number in which a night card was shown (keeps the sky dark)
  var lastTitleSol = null;   // the sol whose title card was shown last
  var lastMeters = null;     // meter values at the last redraw, to show "+5" or "-12"
  var lastCardKey = "";      // to play the card entrance and sounds once per new card

  // Does this person want less motion? (A setting in their computer.)
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Short way to find an element by its id.
  function $(id) { return document.getElementById(id); }

  // Read options from the web address, like ?demo=pump&seed=5
  var params = new URLSearchParams(window.location.search);
  var demo = params.get("demo");
  var seedParam = params.get("seed");

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------

  var SCREENS = ["start-screen", "intro-screen", "game-screen", "end-screen", "sources-screen"];

  function showScreen(id) {
    SCREENS.forEach(function (s) { $(s).hidden = (s !== id); });
    currentScreen = id;
    closeMenu();
    closeLog();
    if (id !== "game-screen") { document.body.classList.remove("is-night"); }
    document.body.setAttribute("data-screen", id);
    // Before a game starts, the picture is the base at night (the title look).
    if (id === "start-screen" || (!game && id !== "game-screen")) { showTitleScene(); }
    scene.setTitleMode(id === "start-screen");
    updateCamera();
  }

  // The title look: the base at night, windows glowing, crew asleep.
  function showTitleScene() {
    scene.drawSky("night");
    scene.setCrewState("sleep");
    scene.setAlarm(false);
    scene.setSpaceWeather(null, null);
    scene.setShield(false);
    scene.setDust(false);
    scene.setPanelsDusty(false);
    scene.setGreenhouseLights(true);
    scene.setDishBlinking(false);
    scene.describe("A small Mars base at night, its windows glowing.");
  }

  // ---------------------------------------------------------------------
  // The camera: which part of the drawing fills the screen.
  // The drawing's main spot is the habitat (about x 395, y 268 in scene
  // units). We choose how many scene units fit across the screen, and
  // where on the screen the habitat should appear.
  // ---------------------------------------------------------------------

  // Wide screens (and phones turned sideways) put the card on the right.
  var SIDE_LAYOUT = "(min-width: 760px) and (orientation: landscape)";

  function updateCamera() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (!w || !h) { return; }   // the window has no size yet (for example while it is being resized)
    var side = window.matchMedia(SIDE_LAYOUT).matches;
    var units, fx, fy;   // units across the screen; where the habitat sits (0 to 1)

    if (currentScreen === "game-screen") {
      if (side) {
        var panel = $("card").offsetWidth + 24;          // the side card and its margin
        var openWidth = Math.max(w - panel, w * 0.45);   // the part of the screen left for the picture
        units = 400 * w / openWidth;
        fx = (openWidth / 2) / w;
        fy = 0.66;   // a lower horizon: more sky, less empty ground
      } else {
        // Phones: the habitat sits between the top HUD and the bottom sheet.
        units = 345;   // close enough that the crew is about 58 px tall on a 375 px phone
        var top = $("crew-panel").hidden ? $("meters").getBoundingClientRect().bottom : $("crew-panel").getBoundingClientRect().bottom;
        var sheetTop = $("card").getBoundingClientRect().top;
        var middle = top + (sheetTop - top) * 0.58;
        fx = 0.5;
        fy = Math.min(0.6, Math.max(0.2, middle / h));
      }
    } else {
      // Title and other screens: the habitat in the middle, between the
      // title at the top and the buttons at the bottom.
      units = side ? 640 : 345;
      fx = 0.5;
      fy = 0.5;
    }

    var scale = w / units;      // screen pixels per scene unit
    var viewW = units;
    var viewH = h / scale;
    var focusX = side ? 395 : 405;   // phones: centred between the panels and the dish
    if (!isFinite(fy) || !isFinite(units)) { return; }   // panels not measured yet: keep the old camera
    scene.setCamera(focusX - fx * viewW, 268 - fy * viewH, viewW, viewH);
  }

  window.addEventListener("resize", updateCamera);

  function startGame(options) {
    game = E.newGame(DATA, options);
    sceneMemory = {};
    nightEventPhase = -1;
    lastTitleSol = null;
    lastMeters = null;
    lastCardKey = "";
    buildGauges();
    showScreen("game-screen");
    render();
  }

  // ---------------------------------------------------------------------
  // Drawing the game screen
  // ---------------------------------------------------------------------

  function render() {
    if (game.outcome) { renderEnd(); return; }
    renderTopbar();
    renderMeters();
    renderCrew();
    renderScene();
    renderCard();
    renderLog();
    showSolTitle();
    updateCamera();   // the card height may have changed
  }

  function renderTopbar() {
    var total = DATA.numbers.missionLengthSols.value;
    $("sol-chip").textContent = game.sol + " / " + total;   // spaces keep "1 / 30" readable in the HUD font
    $("sol-box").setAttribute("aria-label", "Sol " + game.sol + " of " + total + ", " + (game.phase === "day" ? "day" : "night"));
    $("phase-chip").textContent = game.phase === "day" ? "Day" : "Night";
    document.body.classList.toggle("is-night", game.phase === "night");
  }

  // The three gauges are built once per game, then only updated, so the
  // bars can slide smoothly to their new values.
  var GAUGE_HELP = {
    lifeSupport: "Air, water and food",
    power: "Electricity from solar panels",
    shielding: "Protection from radiation"
  };

  // A small drawn icon for each gauge (SVG paths written by hand).
  var GAUGE_ICONS = {
    lifeSupport: "M12 2.5C12 2.5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5z",  // a water drop
    power: "M13.5 2 4.5 13.5h6.5L10 22l9.5-12H13z",                                    // a lightning bolt
    shielding: "M12 2 4 5.5v6c0 5 3.4 9 8 10.5 4.6-1.5 8-5.5 8-10.5v-6z"                // a shield
  };

  function buildGauges() {
    var box = $("meters");
    box.textContent = "";
    E.METERS.forEach(function (key) {
      var row = document.createElement("div");
      row.className = "gauge pill gauge-" + key;
      row.id = "gauge-" + key;
      row.innerHTML =
        '<div class="gauge-top">' +
          '<svg class="gauge-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + GAUGE_ICONS[key] + '"/></svg>' +
          '<span class="gauge-name"></span><span class="gauge-low">Low</span>' +
        '</div>' +
        '<div class="gauge-row"><span class="gauge-value"></span>' +
          '<div class="gauge-bar" role="meter" aria-valuemin="0"><div class="gauge-fill"></div></div>' +
        '</div>' +
        '<div class="gauge-help visually-hidden"></div>' +
        '<span class="gauge-delta" aria-hidden="true"></span>';
      row.querySelector(".gauge-name").textContent = E.METER_NAMES[key];
      row.querySelector(".gauge-help").textContent = GAUGE_HELP[key];
      row.querySelector(".gauge-bar").setAttribute("aria-label", E.METER_NAMES[key]);
      box.appendChild(row);
    });
  }

  function renderMeters() {
    var low = DATA.numbers.lowMeterWarning.value;
    var max = DATA.numbers.meterMax.value;

    E.METERS.forEach(function (key) {
      var value = game.meters[key];
      var row = $("gauge-" + key);
      var isLow = value < low;
      // Danger is shown three ways, not only by color: a red striped bar,
      // a "Low" tag, and "Running low!" in the help line.
      row.classList.toggle("is-low", isLow);
      row.querySelector(".gauge-value").textContent = value;
      row.querySelector(".gauge-fill").style.width = (value / max * 100) + "%";
      var bar = row.querySelector(".gauge-bar");
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(value));
      bar.setAttribute("aria-valuetext", value + " of " + max + (isLow ? ", running low" : ""));
      row.querySelector(".gauge-help").textContent = GAUGE_HELP[key] + (isLow ? ". Running low!" : "");

      // Show how much it changed since the last screen, like "-12".
      if (lastMeters && lastMeters[key] !== value) {
        var diff = value - lastMeters[key];
        var delta = row.querySelector(".gauge-delta");
        delta.textContent = (diff > 0 ? "+" : "") + diff;
        delta.className = "gauge-delta " + (diff > 0 ? "up" : "down");
        void delta.offsetWidth; // restart the little animation
        delta.classList.add("show");
        row.classList.remove("bump");
        void row.offsetWidth;
        row.classList.add("bump");
      }
    });
    lastMeters = Object.assign({}, game.meters);
  }

  // Short crew lines for the corner of the picture. FATIGUE MODULE.
  var MOOD_SHORT = ["Crew rested", "Crew getting tired", "Crew very tired: more mistakes", "Crew exhausted: many mistakes"];

  function renderCrew() {
    // FATIGUE MODULE: no crew mood when the sleep part of the game is switched off.
    $("crew-panel").hidden = !E.fatigueOn(game);
    if (!E.fatigueOn(game)) { return; }
    var status = E.crewStatus(game);
    drawFace($("crew-face"), status.level);
    $("crew-face").setAttribute("aria-label", status.text);
    $("crew-text").textContent = MOOD_SHORT[status.level];
    $("crew-panel").setAttribute("data-level", status.level);

    var drift = game.driftMinutes;
    $("clock-text").textContent = drift < 1
      ? "Body clock in step with the Sun"
      : "Body clock " + E.formatMinutes(drift) + " off the Sun";
  }

  // Draw a simple face. level 0 = rested, 3 = exhausted.
  // Built from SVG shapes in code, so there are no image files.
  function drawFace(svg, level) {
    var ns = "http://www.w3.org/2000/svg";
    svg.textContent = "";
    function add(tag, attrs) {
      var el = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      svg.appendChild(el);
      return el;
    }
    svg.setAttribute("data-level", level);
    add("circle", { cx: 50, cy: 50, r: 44, "class": "face-head" });

    // Eyes: open circles when rested, lower lids as the crew gets tired, closed lines when exhausted.
    [35, 65].forEach(function (x) {
      if (level === 3) {
        add("path", { d: "M" + (x - 8) + " 42 Q " + x + " 47 " + (x + 8) + " 42", "class": "face-line" });
      } else {
        add("circle", { cx: x, cy: 40, r: 6, "class": "face-eye" });
        if (level >= 1) {
          // eyelid covering the top of the eye
          var lidY = level === 1 ? 37 : 40;
          add("rect", { x: x - 8, y: 31, width: 16, height: lidY - 31, "class": "face-lid" });
          add("line", { x1: x - 8, y1: lidY, x2: x + 8, y2: lidY, "class": "face-line" });
        }
      }
      if (level >= 2) {
        // bags under the eyes
        add("path", { d: "M" + (x - 7) + " 52 Q " + x + " 56 " + (x + 7) + " 52", "class": "face-line thin" });
      }
    });

    // Mouth: smile, flat, frown, open yawn.
    var mouths = [
      "M35 66 Q 50 78 65 66",
      "M36 70 L 64 70",
      "M36 74 Q 50 66 64 74",
      null
    ];
    if (mouths[level]) {
      add("path", { d: mouths[level], "class": "face-line" });
    } else {
      add("ellipse", { cx: 50, cy: 72, rx: 8, ry: 10, "class": "face-yawn" });
    }
  }

  // ---------------------------------------------------------------------
  // The outpost picture. It shows what the game state says. All the
  // drawing is in js/scene.js; here we only decide WHAT to show.
  // ---------------------------------------------------------------------

  // Remember picture changes from a choice (the "scene" field in events.js).
  function rememberScene(choice) {
    if (!choice || !choice.scene) { return; }
    Object.keys(choice.scene).forEach(function (key) {
      sceneMemory[key] = game.sol + choice.scene[key]; // lasts until the end of that sol
    });
  }

  function remembered(key) {
    return sceneMemory[key] !== undefined && game.sol <= sceneMemory[key];
  }

  function renderScene() {
    var card = game.card;
    var type = card ? card.type : null;
    var fatigue = E.fatigueOn(game);
    var night = game.phase === "night";

    // Sky: day; the evening card shows the blue Mars sunset; night cards are dark.
    if (night && type === "event") { nightEventPhase = game.phaseCount; }
    var sky = !night ? "day" : (nightEventPhase === game.phaseCount ? "night" : "dusk");
    scene.drawSky(sky);

    // Alarm glow for night trouble (like the 3 a.m. pump fault).
    var alarm = night && type === "event";
    scene.setAlarm(alarm);

    // Real solar events: a soft flash once, then a tinted sky while the card is up.
    var weather = type === "solar" ? (card.solar.kind === "flare" ? "flare" : "storm") : null;
    scene.setSpaceWeather(weather, weather ? card.solar.id : null);

    var showingEvent = type === "event" ? card.event.id : null;
    var shelter = !night && game.skipWork;
    scene.setShield(shelter);
    scene.setDust(remembered("dustySky") || showingEvent === "dust_storm_coming");
    scene.setPanelsDusty(remembered("panelsDusty") || showingEvent === "dusty_panels");
    scene.setGreenhouseLights(!remembered("greenhouseDark") && showingEvent !== "greenhouse_lights");
    scene.setDishBlinking(game.inbox.length > 0);

    // The crew. FATIGUE MODULE: with fatigue off there is no sleeping or yawning.
    var crew;
    if (night) {
      // At night the crew is asleep, even while an alarm rings (the card asks
      // whether to wake them). FATIGUE MODULE: with fatigue off, just "inside".
      crew = !fatigue ? "inside" : "sleep";
    } else if (shelter) {
      crew = "shelter";
    } else if (!fatigue) {
      crew = "work";
    } else {
      var level = E.crewStatus(game).level;
      // level 0 rested, 1 getting tired, 2 very tired, 3 exhausted (see crewStatus in engine.js)
      crew = level >= 2 ? "exhausted" : (level === 1 ? "tired" : "work");
    }
    scene.setCrewState(crew);

    // A short text alternative. Everything here is also said in the text on screen.
    var words = {
      day: "Mars base in the dusty daylight",
      dusk: "Mars base at sunset, with a blue glow near the Sun",
      night: "Mars base at night"
    }[sky];
    var crewWords = {
      work: "The crew is working outside.",
      tired: "The crew looks tired.",
      exhausted: "The crew is yawning and very tired.",
      shelter: "The crew is inside the storm shelter.",
      sleep: "The crew is asleep.",
      awake: "The crew is awake inside.",
      inside: "The crew is inside."
    }[crew];
    scene.describe(words + ". " + crewWords + (weather ? " A solar storm lights up the sky." : "") +
      (game.inbox.length ? " The dish is sending a message to Earth." : ""));
  }

  // A big "Sol 4" title over the picture at the start of each new sol.
  function showSolTitle() {
    if (game.phase !== "day" || game.sol === lastTitleSol) { return; }
    lastTitleSol = game.sol;
    var box = $("sol-title");
    $("sol-title-num").textContent = "Sol " + game.sol;
    $("sol-title-sub").textContent = "Space weather replay: " + E.prettyDate(E.dateForSol(game, game.sol));
    box.classList.remove("show");
    void box.offsetWidth;
    box.classList.add("show");
  }

  function renderCard() {
    var prompt = E.getPrompt(game);
    if (!prompt) { return; }

    // "08:00" becomes "08:00 Mars time"; words like "Evening" stay as they are.
    var clock = prompt.clock ? (/^\d/.test(prompt.clock) ? prompt.clock + " Mars time" : prompt.clock) : "Incoming message";
    if (prompt.kind === "solar") { clock = "Space weather alert"; }
    $("card-clock").textContent = clock;
    $("card-title").textContent = prompt.title;
    $("card-text").textContent = prompt.text;
    $("card").className = "glass card card-" + prompt.kind;

    // A new card slides in, and some cards make a sound (if sound is on).
    var key = game.sol + "/" + game.phaseCount + "/" + prompt.title;
    if (key !== lastCardKey) {
      lastCardKey = key;
      // "Real science" starts open on wide screens and folded on phones,
      // so on a phone the choices fit on one screen. It stays a real
      // <details>, so anyone can open it (and reach the source link).
      $("card-learn").open = window.matchMedia("(min-width: 900px)").matches;
      $("card").classList.add("card-enter");
      if (game.card && game.card.type === "event" && game.phase === "night") { SolShiftSound.play("alarm"); }
      if (prompt.kind === "message") { SolShiftSound.play("message"); }
      if (prompt.kind === "solar") { SolShiftSound.play("flare"); }
    }

    // A small note under the text (used for messages and real solar events).
    var note = $("card-note");
    note.hidden = !prompt.note;
    note.textContent = "";
    if (prompt.note) {
      note.appendChild(document.createTextNode(prompt.note + " "));
      if (prompt.sourceLink) {
        note.appendChild(makeLink(prompt.sourceLink, "See the DONKI record."));
      }
    }

    // "Real science" box with a source link from numbers.js.
    var learn = $("card-learn");
    learn.hidden = !prompt.learn;
    if (prompt.learn) {
      $("card-learn-text").textContent = prompt.learn;
      fillSource($("card-learn-source"), prompt.factKey);
    }

    // Choice buttons.
    var box = $("choices");
    box.textContent = "";
    prompt.choices.forEach(function (choice, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-choice";
      var label = document.createElement("span");
      label.className = "choice-label";
      label.textContent = choice.label;
      var detail = document.createElement("span");
      detail.className = "choice-detail";
      detail.textContent = choice.detail;
      btn.appendChild(label);
      btn.appendChild(detail);
      btn.addEventListener("click", function () {
        // Remember how this choice changes the picture (events.js "scene").
        if (game.card && game.card.type === "event") { rememberScene(game.card.event.choices[index]); }
        SolShiftSound.play("choice");
        E.choose(game, index);
        render();
        // Start the new card at its top, and put keyboard focus on its first button.
        if (!game.outcome) {
          $("card").scrollTop = 0;
          var first = document.querySelector("#choices button");
          if (first) { first.focus({ preventScroll: true }); }
        }
      });
      box.appendChild(btn);
    });
  }

  function renderLog() {
    var list = $("log");
    list.textContent = "";
    game.log.slice(0, 8).forEach(function (entry) {
      var li = document.createElement("li");
      var tag = document.createElement("span");
      tag.className = "log-tag";
      tag.textContent = "Sol " + entry.sol + (entry.phase === "night" ? ", night" : "");
      li.appendChild(tag);
      li.appendChild(document.createTextNode(entry.text));
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------
  // Sources: only VERIFIED numbers get a link. Anything else says so.
  // ---------------------------------------------------------------------

  function makeLink(url, text) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = text;
    return a;
  }

  function fillSource(el, factKey) {
    el.textContent = "";
    var entry = factKey ? DATA.numbers[factKey] : null;
    if (entry && entry.status === "verified" && entry.source) {
      el.appendChild(document.createTextNode("Source: "));
      el.appendChild(makeLink(entry.source, sourceName(entry.source)));
    } else {
      el.textContent = "Source pending.";
    }
  }

  // A short readable name for a source link.
  function sourceName(url) {
    if (url.indexOf("nssdc.gsfc.nasa.gov") !== -1) { return "NASA Mars Fact Sheet"; }
    if (url.indexOf("experts.arizona.edu") !== -1) { return "Barger et al. 2012, Sleep (Phoenix Mars Lander team study)"; }
    if (url.indexOf("space-communications") !== -1) { return "NASA, Space Communications: 7 Things You Need to Know"; }
    if (url.indexOf("nasa-rover-results") !== -1) { return "NASA news release on Curiosity's radiation measurements"; }
    if (url.indexOf("serene-sundown") !== -1) { return "NASA JPL, Curiosity rover views serene sundown on Mars"; }
    if (url.indexOf("steady-temperatures") !== -1) { return "NASA photojournal, Steady temperatures at Mars' Gale Crater"; }
    if (url.indexOf("what-does-a-sunrise-sunset") !== -1) { return "NASA Science, What do sunrises and sunsets look like on Mars?"; }
    return url;
  }

  function renderSources() {
    var list = $("source-list");
    list.textContent = "";
    Object.keys(DATA.numbers).forEach(function (key) {
      var entry = DATA.numbers[key];
      if (entry.kind !== "real-world" || entry.status !== "verified") { return; }
      var li = document.createElement("li");
      var strong = document.createElement("strong");
      strong.textContent = entry.label + ": ";
      li.appendChild(strong);
      li.appendChild(document.createTextNode((entry.display || entry.value + " " + entry.unit) + ". "));
      li.appendChild(makeLink(entry.source, sourceName(entry.source)));
      list.appendChild(li);
    });

    // The NASA photos behind the base, with NASA's credit lines.
    var photos = $("photo-list");
    photos.textContent = "";
    ["day", "dusk"].forEach(function (phase) {
      var b = SolShiftScene.BACKDROP[phase];
      if (!b.src) { return; }
      var item = document.createElement("li");
      var name = document.createElement("strong");
      name.textContent = (phase === "day" ? "Day and night: " : "Sunset: ");
      item.appendChild(name);
      item.appendChild(makeLink(b.source, b.title));
      // (one credit already ends with a period: "Univ.")
      item.appendChild(document.createTextNode(". Credit: " + b.credit + (/\.$/.test(b.credit) ? " " : ". ") + b.change));
      photos.appendChild(item);
    });

    var sw = DATA.spaceWeather;
    var p = $("donki-text");
    p.textContent = "";
    p.appendChild(document.createTextNode(
      "The solar flares and particle storms are real events from NASA's space weather database, DONKI, " +
      "from " + E.prettyDate(sw.firstDate) + " to " + E.prettyDate(sw.lastDate) + ". " +
      "This is a saved snapshot (" + sw.flares.length + " X-class flares and " + sw.particleStorms.length +
      " particle events), fetched on " + sw.fetchedOn + ". It is not live. Sol 1 replays 1 May 2024, sol 2 replays 2 May, and so on. " +
      "These events were measured from near Earth. Putting them over a Mars base is part of the game. "
    ));
    p.appendChild(makeLink(sw.sourceUrl, "NASA DONKI"));
  }

  // ---------------------------------------------------------------------
  // How to play (the intro). The screens are drawn by js/intro.js.
  // ---------------------------------------------------------------------

  function openIntro() {
    var visible = SCREENS.filter(function (s) { return !$(s).hidden; })[0] || "start-screen";
    var returnTo = (visible === "intro-screen" || visible === "sources-screen") ? "start-screen" : visible;
    showScreen("intro-screen");
    SolShiftIntro.open({
      intro: SOL_SHIFT_INTRO,
      numbers: DATA.numbers,
      fatigueOn: DATA.numbers.fatigueEnabled.value === true,
      sourceLink: function (key) {
        var entry = DATA.numbers[key];
        if (!entry || entry.status !== "verified" || !entry.source) { return null; }
        return makeLink(entry.source, sourceName(entry.source));
      },
      onClose: function () {
        showScreen(returnTo);
        // Put keyboard focus somewhere sensible after the intro closes.
        var target = returnTo === "game-screen" ? document.querySelector("#choices button") : $("start-button");
        if (target) { target.focus(); }
      }
    });
  }

  function openSources() {
    var visible = SCREENS.filter(function (s) { return !$(s).hidden; })[0];
    if (visible !== "sources-screen") { screenBeforeSources = visible; }
    renderSources();
    showScreen("sources-screen");
  }

  // ---------------------------------------------------------------------
  // End screen
  // ---------------------------------------------------------------------

  function renderEnd() {
    var key = game.outcome === "won" ? "won" : game.cause;
    var words = DATA.outcomes[key];
    // FATIGUE MODULE: use the no-sleep wording when fatigue is switched off.
    if (!E.fatigueOn(game) && words.noFatigue) {
      words = Object.assign({ title: words.title }, words.noFatigue);
    }
    var total = DATA.numbers.missionLengthSols.value;
    $("end-stamp").textContent = game.outcome === "won" ? "Success" : "Crew sent home early";
    $("end-stamp").className = "stamp " + (game.outcome === "won" ? "stamp-won" : "stamp-lost");
    $("end-sol").textContent = game.outcome === "won"
      ? "All " + total + " sols survived"
      : "Mission ended on sol " + game.sol + " of " + total;
    drawReportChart();
    // The picture behind the report: the mission is over, so the sky calms down.
    scene.setSpaceWeather(null, null);
    scene.setAlarm(false);
    scene.drawSky("dusk");
    scene.setCrewState(game.outcome === "won" ? "sleep" : "away");
    scene.describe(game.outcome === "won" ? "The Mars base at sunset, the crew safe inside." : "The Mars base at sunset, empty.");
    SolShiftSound.play(game.outcome === "won" ? "win" : "lose");
    $("end-title").textContent = words.title;
    $("end-text").textContent = words.text;
    $("end-fact").textContent = words.factText;
    fillSource($("end-source"), words.factKey);

    // The biggest losses of the meter that ran out, added up by reason.
    var box = $("end-hits-box");
    var list = $("end-hits");
    list.textContent = "";
    if (game.outcome === "won") {
      box.hidden = true;
    } else {
      box.hidden = false;
      var totals = {};
      game.hits.forEach(function (h) {
        if (h.meter !== game.cause) { return; }
        totals[h.reason] = (totals[h.reason] || 0) + h.amount;
      });
      Object.keys(totals)
        .sort(function (a, b) { return totals[a] - totals[b]; })
        .slice(0, 3)
        .forEach(function (reason) {
          var li = document.createElement("li");
          li.textContent = reason + ": " + totals[reason];
          list.appendChild(li);
        });
    }
    showScreen("end-screen");
  }

  // The mission report chart: the three meters at the end of every sol.
  function drawReportChart() {
    var svg = $("end-chart");
    var ns = "http://www.w3.org/2000/svg";
    svg.textContent = "";
    var total = DATA.numbers.missionLengthSols.value;
    var max = DATA.numbers.meterMax.value;
    var points = game.history.map(function (h) { return { sol: h.sol, meters: h.meters }; });
    points.push({ sol: game.sol, meters: game.meters }); // where it ended
    function x(sol) { return 8 + (sol - 1) / (total - 1) * 284; }
    function y(v) { return 108 - v / max * 100; }
    function add(tag, attrs) {
      var el = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      svg.appendChild(el);
      return el;
    }
    add("line", { x1: 8, y1: 108, x2: 292, y2: 108, "class": "chart-axis" });
    add("line", { x1: 8, y1: y(DATA.numbers.lowMeterWarning.value), x2: 292, y2: y(DATA.numbers.lowMeterWarning.value), "class": "chart-low" });
    E.METERS.forEach(function (key) {
      var d = points.map(function (p, i) { return (i ? "L" : "M") + x(p.sol).toFixed(1) + " " + y(p.meters[key]).toFixed(1); }).join(" ");
      add("path", { d: d, "class": "chart-line chart-" + key });
    });
    var end = game.meters;
    var summary = "Meters at the end of each sol. At the end: life support " + end.lifeSupport +
      ", power " + end.power + ", shielding " + end.shielding + ".";
    svg.setAttribute("aria-label", summary);
    $("end-chart-caption").textContent = summary;
  }

  // ---------------------------------------------------------------------
  // Buttons
  // ---------------------------------------------------------------------

  function seedOption() {
    return seedParam !== null ? Number(seedParam) : Date.now();
  }

  $("start-button").addEventListener("click", function () {
    startGame({ seed: seedOption() });
  });

  $("again-button").addEventListener("click", function () {
    startGame({ seed: Date.now() });
  });

  document.querySelectorAll("[data-open-sources]").forEach(function (btn) {
    btn.addEventListener("click", openSources);
  });

  document.querySelectorAll("[data-open-intro]").forEach(function (btn) {
    btn.addEventListener("click", openIntro);
  });

  $("sources-back").addEventListener("click", function () {
    showScreen(screenBeforeSources);
  });

  // Sound button: off by default. The button says what state sound is in.
  $("sound-button").addEventListener("click", function () {
    var on = !SolShiftSound.isEnabled();
    SolShiftSound.setEnabled(on);
    this.textContent = on ? "Sound on" : "Sound off";
    this.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) { SolShiftSound.play("choice"); }
  });

  // ---------------------------------------------------------------------
  // Menu, mission log drawer and full screen
  // ---------------------------------------------------------------------

  function closeMenu() {
    $("menu").hidden = true;
    $("menu-button").setAttribute("aria-expanded", "false");
  }

  function closeLog() {
    $("log-drawer").hidden = true;
    $("log-button").setAttribute("aria-expanded", "false");
  }

  $("menu-button").addEventListener("click", function () {
    var open = $("menu").hidden;
    $("menu").hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { $("menu").querySelector("button").focus(); }
  });

  $("log-button").addEventListener("click", function () {
    closeMenu();
    $("log-drawer").hidden = false;
    this.setAttribute("aria-expanded", "true");
    $("log-close").focus();
  });

  $("log-close").addEventListener("click", function () {
    closeLog();
    $("menu-button").focus();
  });

  // Escape closes the menu and the log (the intro handles its own Escape).
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") { return; }
    if (!$("menu").hidden) { closeMenu(); $("menu-button").focus(); }
    if (!$("log-drawer").hidden) { closeLog(); $("menu-button").focus(); }
  });

  // Clicking outside the menu closes it.
  document.addEventListener("click", function (event) {
    if (!$("menu").hidden && !$("menu").contains(event.target) && event.target !== $("menu-button")) { closeMenu(); }
  });

  // Full screen button: only shown where the browser supports it (not on
  // iPhone Safari). The game never needs it.
  var fullscreenButtons = document.querySelectorAll("[data-fullscreen]");
  function updateFullscreenLabels() {
    var on = !!document.fullscreenElement;
    fullscreenButtons.forEach(function (b) { b.textContent = on ? "Exit full screen" : "Full screen"; });
  }
  if (document.fullscreenEnabled) {
    fullscreenButtons.forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        if (document.fullscreenElement) { document.exitFullscreen(); }
        else { document.documentElement.requestFullscreen().catch(function () { /* the browser said no: the game still works */ }); }
      });
    });
    document.addEventListener("fullscreenchange", function () { updateFullscreenLabels(); updateCamera(); });
  }

  // ---------------------------------------------------------------------
  // Demo video (index.html?demo=video): the game plays a short tour by
  // itself, with captions, so it can be recorded. About 30 seconds.
  // It presses the real buttons and uses the real rules. Nothing here
  // changes how the game plays for a person.
  // ---------------------------------------------------------------------

  // Play the current game forward without drawing, until stop(game) is true.
  // pick(prompt) says which choice to press each time.
  function fastForward(pick, stop) {
    var guard = 0;
    while (!game.outcome && !stop(game) && guard < 500) {
      var prompt = E.getPrompt(game);
      E.choose(game, Math.min(pick(prompt), prompt.choices.length - 1));
      guard += 1;
    }
    lastMeters = null;   // no "+5" pop-ups for the part nobody saw
    render();
  }

  function runDemoVideo() {
    document.body.classList.add("demo-video");
    var caption = document.createElement("p");
    caption.className = "demo-caption";
    caption.setAttribute("aria-live", "polite");
    document.body.appendChild(caption);

    function say(text) { caption.textContent = text; }
    function choice(index) { return document.querySelectorAll("#choices button")[index]; }
    // Light up a choice for a moment, then press it, so a viewer sees which one was picked.
    // after() runs right after the press.
    function press(index, after) {
      var button = choice(index);
      if (!button) { return; }
      button.classList.add("demo-press");
      window.setTimeout(function () {
        button.click();
        if (document.activeElement) { document.activeElement.blur(); }
        if (after) { after(); }
      }, 450);
    }
    // After the pump fault comes the bedtime card. The tour skips past it
    // (keeping Earth hours) to the next morning, where the result shows.
    function skipToMorning() {
      E.choose(game, 0);
      render();
    }
    // The chance of a repair mistake on a full shift, read from the card on screen.
    function fullShiftMistake() {
      var found = /(\d+)%/.exec(E.getPrompt(game).choices[1].detail);
      return found ? found[1] + "%" : "higher";
    }

    var sw = DATA.spaceWeather;
    var day = SolShiftScene.BACKDROP.day;
    var dusk = SolShiftScene.BACKDROP.dusk;

    // The tour: [seconds from the start, what to do].
    var steps = [
      [0, function () { say("Sol Shift: a game about living on Mars time."); }],
      [2.2, function () {
        startGame({ seed: 3 });
        say("Each sol, you plan the crew's work. Every choice costs something.");
      }],
      [5.0, function () { press(1); }],   // Full shift
      [5.5, function () { say("A Mars day is about 40 minutes longer than an Earth day, so body clocks drift."); }],
      [8.4, function () {
        startGame({ seed: 3, demo: "pump" });
        say("3 a.m. The air pump stops. Way 1: wake the crew and fix it now.");
      }],
      [10.6, function () {
        press(0, function () {
          skipToMorning();
          say("Next morning: a full shift now has a " + fullShiftMistake() + " chance of a repair mistake.");
        });
      }],
      [13.6, function () {
        startGame({ seed: 3, demo: "pump" });
        say("Way 2: let them sleep and fix it at sunrise.");
      }],
      [15.4, function () {
        press(1, function () {
          skipToMorning();
          say("Next morning: only " + fullShiftMistake() + ". But life support fell to " + game.meters.lifeSupport + ".");
        });
      }],
      [18.2, function () {
        startGame({ seed: 3 });
        fastForward(
          function (prompt) { return prompt.kind === "work" || prompt.kind === "sleep" ? 1 : 0; },
          function (g) { return g.card && g.card.type === "solar"; }
        );
        say("The solar storms are real: NASA DONKI records from May 2024 (saved, not live).");
      }],
      [21.4, function () { press(0); }],   // Everyone into the storm shelter
      [21.9, function () { say("Shelter the crew and lose a work day, or keep working and lose shielding."); }],
      [24.0, function () {
        fastForward(function () { return 0; }, function () { return false; });
        say("Run out of air, power or shielding and the mission ends early. The report shows why.");
      }],
      [26.2, function () {
        caption.hidden = true;
        var credits = document.createElement("div");
        credits.className = "glass demo-credits";
        [["Sol Shift", "demo-credits-title"],
         ["Solar storms: NASA DONKI, " + E.prettyDate(sw.firstDate) + " to " + E.prettyDate(sw.lastDate) + " (saved snapshot)."],
         ["Mars photos from the Curiosity rover: " + day.credit],
         ["and " + dusk.credit],
         ["Sleep facts: Barger et al. 2012, Phoenix Mars Lander team study."],
         ["Code written with AI help (Claude). No AI-generated images."],
         ["NASA and JPL do not endorse this game.", "demo-credits-small"]].forEach(function (line) {
          var p = document.createElement("p");
          p.textContent = line[0];
          if (line[1]) { p.className = line[1]; }
          credits.appendChild(p);
        });
        document.body.appendChild(credits);
      }],
      [30, function () { document.body.setAttribute("data-demo-done", "yes"); }]
    ];
    steps.forEach(function (step) { window.setTimeout(step[1], step[0] * 1000); });
  }

  // The picture starts with the title look.
  showTitleScene();
  updateCamera();

  // What to show first:
  //   ?demo=pump      straight into the pump fault (no intro, for the demo video)
  //   ?demo=video     the 30-second tour that plays by itself
  //   ?seed=...       the start screen (no intro, for testing and recording)
  //   first visit     the How to play intro
  //   later visits    the start screen
  if (demo === "pump") {
    startGame({ seed: seedOption(), demo: "pump" });
  } else if (demo === "video") {
    runDemoVideo();
  } else if (seedParam === null && !SolShiftIntro.wasSeen()) {
    openIntro();
  }
})();
