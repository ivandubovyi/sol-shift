/*
  Sol Shift: the "How to play" intro screens.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  The words live in data/intro.js. This file only draws them.
  js/ui.js decides WHEN to show the intro and calls SolShiftIntro.open().

  How it behaves:
    - One screen at a time, with "Next" and "Skip".
    - Keyboard: the heading of each screen gets the focus, Escape skips.
    - It remembers that it was seen (localStorage), so it does not nag.
      If the browser blocks localStorage (some file:// pages, private
      windows), the game still works; the intro just shows again next time.
*/

var SolShiftIntro = (function () {
  "use strict";

  var STORAGE_KEY = "solShift.introSeen";
  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------------
  // Remembering that the intro was seen. Wrapped in try/catch because
  // localStorage can throw on file:// pages or in private windows.
  // ---------------------------------------------------------------------

  function wasSeen() {
    try { return window.localStorage.getItem(STORAGE_KEY) === "1"; }
    catch (e) { return false; }
  }

  function markSeen() {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); }
    catch (e) { /* storage blocked: fine, the intro will just show again */ }
  }

  // ---------------------------------------------------------------------
  // Which lines to show. FATIGUE MODULE: lines marked fatigueOnly are
  // left out when the crew sleep part of the game is switched off.
  // (No page code here, so tools/playtest.js can test it in Node.)
  // ---------------------------------------------------------------------

  function visibleLines(screen, fatigueOn) {
    return screen.lines.filter(function (line) { return fatigueOn || !line.fatigueOnly; });
  }

  // ---------------------------------------------------------------------
  // Small drawings, made from SVG shapes in code
  // ---------------------------------------------------------------------

  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text) { el.textContent = text; }
    return el;
  }

  // "sol": two bars. An Earth day (24 h) and a Mars sol (24.66 h), to scale.
  function drawSol(svg, numbers) {
    var solHours = numbers.solLengthHours.value;
    var full = 300; // width of the longer bar, in drawing units
    var earthWidth = full * 24 / solHours;
    svg.setAttribute("viewBox", "0 0 320 96");
    svg.appendChild(svgEl("text", { x: 0, y: 14, "class": "intro-svg-label" }, "Earth day: 24 hours"));
    svg.appendChild(svgEl("rect", { x: 0, y: 20, width: earthWidth, height: 16, rx: 8, "class": "intro-bar-earth" }));
    svg.appendChild(svgEl("text", { x: 0, y: 62, "class": "intro-svg-label" }, "Mars sol: about 24 hours 39 minutes"));
    svg.appendChild(svgEl("rect", { x: 0, y: 68, width: full, height: 16, rx: 8, "class": "intro-bar-mars" }));
  }

  // "meters": the three meters as bars, in the same colors as the game.
  function drawMeters(svg) {
    svg.setAttribute("viewBox", "0 0 320 120");
    var rows = [
      { name: "Life support", cls: "intro-bar-life", width: 260 },
      { name: "Power", cls: "intro-bar-power", width: 190 },
      { name: "Shielding", cls: "intro-bar-shield", width: 120 }
    ];
    rows.forEach(function (row, i) {
      var y = i * 40;
      svg.appendChild(svgEl("text", { x: 0, y: y + 13, "class": "intro-svg-label" }, row.name));
      svg.appendChild(svgEl("rect", { x: 0, y: y + 19, width: 300, height: 12, rx: 6, "class": "intro-bar-track" }));
      svg.appendChild(svgEl("rect", { x: 0, y: y + 19, width: row.width, height: 12, rx: 6, "class": row.cls }));
    });
  }

  // "choices": Earth and Mars with a message line between them.
  function drawChoices(svg) {
    svg.setAttribute("viewBox", "0 0 320 96");
    svg.appendChild(svgEl("circle", { cx: 40, cy: 52, r: 26, "class": "intro-earth" }));
    svg.appendChild(svgEl("text", { x: 40, y: 92, "text-anchor": "middle", "class": "intro-svg-label" }, "Earth"));
    svg.appendChild(svgEl("circle", { cx: 280, cy: 52, r: 18, "class": "intro-mars" }));
    svg.appendChild(svgEl("text", { x: 280, y: 92, "text-anchor": "middle", "class": "intro-svg-label" }, "Mars"));
    svg.appendChild(svgEl("line", { x1: 72, y1: 52, x2: 256, y2: 52, "class": "intro-signal" }));
    svg.appendChild(svgEl("text", { x: 160, y: 40, "text-anchor": "middle", "class": "intro-svg-label" }, "4 to 24 minutes"));
  }

  var DRAWINGS = { sol: drawSol, meters: drawMeters, choices: drawChoices };

  // The Escape-key listener of the intro that is open now (so opening the
  // intro twice never leaves an old listener behind).
  var activeKeyListener = null;

  // ---------------------------------------------------------------------
  // Showing the screens
  // ---------------------------------------------------------------------

  // options = {
  //   intro, numbers     the data (SOL_SHIFT_INTRO, SOL_SHIFT_NUMBERS)
  //   fatigueOn          true or false
  //   sourceLink(key)    returns an <a> element for a verified numbers entry, or null
  //   onClose()          called when the player finishes or skips
  // }
  function open(options) {
    var screens = options.intro.screens;
    var index = 0;
    var box = document.getElementById("intro-screen");

    function close() {
      document.removeEventListener("keydown", onKey);
      activeKeyListener = null;
      markSeen();
      options.onClose();
    }

    function onKey(event) {
      if (event.key === "Escape") { close(); }
    }

    function render() {
      var screen = screens[index];
      var isLast = index === screens.length - 1;

      document.getElementById("intro-step").textContent = "How to play: " + (index + 1) + " of " + screens.length;
      var title = document.getElementById("intro-title");
      title.textContent = screen.title;

      var svg = document.getElementById("intro-art");
      svg.textContent = "";
      DRAWINGS[screen.art](svg, options.numbers);

      var list = document.getElementById("intro-lines");
      list.textContent = "";
      visibleLines(screen, options.fatigueOn).forEach(function (line) {
        var p = document.createElement("p");
        p.textContent = line.text;
        list.appendChild(p);
        (line.factKeys || []).slice(0, 1).forEach(function (key) {
          var link = options.sourceLink(key);
          var src = document.createElement("p");
          src.className = "small muted intro-source";
          if (link) {
            src.appendChild(document.createTextNode("Source: "));
            src.appendChild(link);
          } else {
            src.textContent = "Source pending.";
          }
          list.appendChild(src);
        });
      });

      var next = document.getElementById("intro-next");
      next.textContent = isLast ? "Got it" : "Next";

      // Start each screen at the top, and move keyboard and screen-reader
      // focus to the new heading.
      window.scrollTo(0, 0);
      title.focus({ preventScroll: true });
    }

    document.getElementById("intro-next").onclick = function () {
      if (index < screens.length - 1) { index += 1; render(); }
      else { close(); }
    };
    document.getElementById("intro-skip").onclick = close;
    if (activeKeyListener) { document.removeEventListener("keydown", activeKeyListener); }
    activeKeyListener = onKey;
    document.addEventListener("keydown", onKey);

    box.hidden = false;
    render();
  }

  return { open: open, wasSeen: wasSeen, visibleLines: visibleLines, STORAGE_KEY: STORAGE_KEY };
})();

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SolShiftIntro; }
