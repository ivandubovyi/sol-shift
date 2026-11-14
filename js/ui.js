/*
  Sol Shift: the web page code. Draws the game and handles button presses.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  The rules live in js/engine.js. This file only:
    1. starts a game when the player presses Start
    2. draws the meters, the crew, the card and the log
    3. calls SolShiftEngine.choose() when a choice button is pressed
    4. shows the end screen and the sources screen

  Useful web addresses (for testing and for the demo video):
    index.html?demo=pump    start right at the 3 a.m. pump fault
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

  // Short way to find an element by its id.
  function $(id) { return document.getElementById(id); }

  // Read options from the web address, like ?demo=pump&seed=5
  var params = new URLSearchParams(window.location.search);
  var demo = params.get("demo");
  var seedParam = params.get("seed");

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------

  var SCREENS = ["start-screen", "game-screen", "end-screen", "sources-screen"];

  function showScreen(id) {
    SCREENS.forEach(function (s) { $(s).hidden = (s !== id); });
    $("topbar-status").hidden = (id !== "game-screen");
    if (id !== "game-screen") { document.body.classList.remove("is-night"); }
    window.scrollTo(0, 0);
  }

  function startGame(options) {
    game = E.newGame(DATA, options);
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
    renderCard();
    renderLog();
  }

  function renderTopbar() {
    var total = DATA.numbers.missionLengthSols.value;
    $("sol-chip").textContent = "Sol " + game.sol + " of " + total;
    $("phase-chip").textContent = game.phase === "day" ? "Day" : "Night";
    document.body.classList.toggle("is-night", game.phase === "night");
  }

  function renderMeters() {
    var box = $("meters");
    box.textContent = "";
    var low = DATA.numbers.lowMeterWarning.value;
    var max = DATA.numbers.meterMax.value;
    var help = {
      lifeSupport: "Air, water and food",
      power: "Electricity from solar panels",
      shielding: "Protection from radiation"
    };

    E.METERS.forEach(function (key) {
      var value = game.meters[key];
      var row = document.createElement("div");
      row.className = "meter meter-" + key + (value < low ? " is-low" : "");

      var top = document.createElement("div");
      top.className = "meter-top";
      var name = document.createElement("span");
      name.className = "meter-name";
      name.textContent = E.METER_NAMES[key];
      var num = document.createElement("span");
      num.className = "meter-value";
      num.textContent = value;
      top.appendChild(name);
      top.appendChild(num);

      var bar = document.createElement("div");
      bar.className = "meter-bar";
      bar.setAttribute("role", "meter");
      bar.setAttribute("aria-label", E.METER_NAMES[key]);
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(value));
      var fill = document.createElement("div");
      fill.className = "meter-fill";
      fill.style.width = (value / max * 100) + "%";
      bar.appendChild(fill);

      var sub = document.createElement("div");
      sub.className = "meter-help small muted";
      sub.textContent = help[key] + (value < low ? ". Running low!" : "");

      row.appendChild(top);
      row.appendChild(bar);
      row.appendChild(sub);
      box.appendChild(row);
    });
  }

  function renderCrew() {
    // FATIGUE MODULE: no crew panel when the sleep part of the game is switched off.
    $("crew-panel").hidden = !E.fatigueOn(game);
    if (!E.fatigueOn(game)) { return; }
    var status = E.crewStatus(game);
    drawFace($("crew-face"), status.level);
    $("crew-face").setAttribute("aria-label", status.text);
    $("crew-text").textContent = status.text;

    var drift = game.driftMinutes;
    $("clock-text").textContent = drift < 1
      ? "Body clock: in step with the Sun."
      : "Body clock: " + E.formatMinutes(drift) + " out of step with the Sun. Out-of-step crews sleep worse.";
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

  function renderCard() {
    var prompt = E.getPrompt(game);
    if (!prompt) { return; }

    var clock = prompt.clock ? prompt.clock + " Mars time" : "Incoming message";
    if (prompt.kind === "solar") { clock = "Space weather alert"; }
    $("card-clock").textContent = clock;
    $("card-title").textContent = prompt.title;
    $("card-text").textContent = prompt.text;
    $("card").className = "panel card card-" + prompt.kind;

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
        E.choose(game, index);
        render();
        $("card").scrollIntoView({ block: "nearest" });
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
    $("end-sol").textContent = game.outcome === "won"
      ? "All 30 sols"
      : "Mission ended on sol " + game.sol;
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

  $("sources-back").addEventListener("click", function () {
    showScreen(screenBeforeSources);
  });

  // FATIGUE MODULE: hide the crew sentence on the start screen when fatigue is off.
  $("intro-fatigue").hidden = DATA.numbers.fatigueEnabled.value !== true;

  // Demo shortcut: index.html?demo=pump skips the start screen.
  if (demo === "pump") {
    startGame({ seed: seedOption(), demo: "pump" });
  }
})();
