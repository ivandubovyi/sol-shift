/*
  Sol Shift: headless playtest. Runs the real game rules (js/engine.js) in
  Node.js with no browser, using robot players.

  NOTE: this code file was written by an AI assistant (Claude). See AI-USE.md.

  Run it from the sol-shift folder:
    node tools/playtest.js

  It checks:
    1. every event card can appear, and both of its choices work
    2. no choice is free: each one costs something
    3. real solar event cards appear on the right sols
    4. an "Ask Earth" answer arrives later
    5. demo mode, and losing ends the game with a named cause
    6. balance: 500 seeded games for each robot player
    7. the game still works, and can be won and lost, with fatigue switched off
*/

var path = require("path");
var root = path.join(__dirname, "..");

// Load the data. fatigue = false gives a copy with the fatigue switch off.
function loadData(fatigue) {
  var numbers = JSON.parse(JSON.stringify(require(path.join(root, "data/numbers.js"))));
  numbers.fatigueEnabled.value = fatigue;
  return {
    numbers: numbers,
    events: require(path.join(root, "data/events.js")).events,
    solarCards: require(path.join(root, "data/events.js")).solarCards,
    outcomes: require(path.join(root, "data/outcomes.js")),
    spaceWeather: require(path.join(root, "data/space-weather.js"))
  };
}
var data = loadData(true);
var dataOff = loadData(false);
var E = require(path.join(root, "js/engine.js"));

var failures = 0;
function check(ok, message) {
  console.log((ok ? "PASS " : "FAIL ") + message);
  if (!ok) { failures++; }
}

// ---------------------------------------------------------------------
// Robot players. Each one looks at the current card and returns a choice index.
// ---------------------------------------------------------------------

// Score an event choice: lower is better. Costs to a low meter count more.
function eventScore(game, c) {
  var m = game.meters;
  var s = 0;
  var fx = c.effects || {};
  E.METERS.forEach(function (k) {
    if (fx[k] < 0) { s += -fx[k] * 60 / Math.max(m[k], 1); }
    if (fx[k] > 0) { s -= fx[k] * 30 / Math.max(m[k], 1); }
  });
  if (E.fatigueOn(game)) {
    if (fx.tired > 0) { s += fx.tired * (game.tired + 20) / 60; }
    if (c.extraRiskTomorrow) { s += c.extraRiskTomorrow * 40; }
  }
  if (c.repair) { s += E.mistakeChance(game, 8) * 10 * 60 / Math.max(m.lifeSupport, 1); }
  if (c.askEarth) { s -= 2; }
  return s;
}

function bestEventChoice(game) {
  var scores = game.card.event.choices.map(function (c) { return eventScore(game, c); });
  return scores[0] <= scores[1] ? 0 : 1;
}

// Careless: always works overtime, never fixes the body clock,
// never hides from solar storms, always picks the first choice.
function careless(game) {
  var card = game.card;
  if (card.type === "work") { return game.skipWork ? 0 : 2; }
  if (card.type === "sleep") { return 0; }
  if (card.type === "solar") { return 1; }
  return 0;
}

// Careful: watches the crew's tiredness, the body clock and the meters.
function careful(game) {
  var card = game.card;
  var m = game.meters;
  if (card.type === "message") { return 0; }
  if (card.type === "work") {
    if (game.skipWork) { return 0; }
    if (game.tired >= 45) { return 0; }                                          // short shift
    if ((m.power < 45 || m.lifeSupport < 45 || m.shielding < 45) && game.tired < 25) { return 2; } // overtime
    return 1;                                                                     // full shift
  }
  if (card.type === "sleep") { return game.driftMinutes >= 110 ? 1 : 0; }
  if (card.type === "solar") {
    if (card.solar.kind === "particleStorm") { return 0; }
    return m.shielding < 40 ? 0 : 1;
  }
  return bestEventChoice(game);
}

// Careful in every way except one: never moves bedtime to match the Sun.
function carefulNoClock(game) {
  if (game.card.type === "sleep") { return 0; }
  return careful(game);
}

// Fatigue off: careful works on whichever meter is lowest.
function carefulOff(game) {
  var card = game.card;
  var m = game.meters;
  if (card.type === "work") {
    if (game.skipWork) { return 0; }
    var lowest = E.METERS.reduce(function (a, b) { return m[a] <= m[b] ? a : b; });
    return { lifeSupport: 0, power: 1, shielding: 2 }[lowest];
  }
  if (card.type === "solar") {
    if (card.solar.kind === "particleStorm") { return 0; }
    return m.shielding < 40 ? 0 : 1;
  }
  if (card.type === "event") { return bestEventChoice(game); }
  return 0;
}

// Fatigue off: careless always works the greenhouse, never shelters, picks the first choice.
function carelessOff(game) {
  var card = game.card;
  if (card.type === "solar") { return 1; }
  return 0;
}

function play(gameData, strategy, seed) {
  var game = E.newGame(gameData, { seed: seed });
  var guard = 0;
  while (!game.outcome && guard < 2000) {
    E.choose(game, strategy(game));
    guard++;
  }
  return game;
}

// ---------------------------------------------------------------------
// 1. Every event can appear, and both choices work.
// ---------------------------------------------------------------------
console.log("\n== Events: force each one, try both choices (" + data.events.length + " events) ==");
data.events.forEach(function (ev) {
  [0, 1].forEach(function (choice) {
    var game = E.newGame(data, { seed: 42 });
    game.tired = 30; // so "rest" effects can show
    E.forceEvent(game, ev.id);
    var prompt = E.getPrompt(game);
    var before = JSON.stringify([game.meters, game.tired, game.extraRisk, game.inbox.length, game.hits.length]);
    E.choose(game, choice);
    var after = JSON.stringify([game.meters, game.tired, game.extraRisk, game.inbox.length, game.hits.length]);
    check(prompt.title === ev.title && before !== after,
      ev.id + " [" + ev.phase + (ev.fatigue ? ", fatigue" : "") + "] choice " + choice + " \"" + prompt.choices[choice].label + "\" -> " + prompt.choices[choice].detail);
  });
});

// ---------------------------------------------------------------------
// 2. No free choices.
// ---------------------------------------------------------------------
console.log("\n== No free choices ==");
function costsMeter(c) {
  var fx = c.effects || {};
  return E.METERS.some(function (k) { return fx[k] < 0; }) || !!c.repair;
}
function costsAnything(c) {
  var fx = c.effects || {};
  return costsMeter(c) || fx.tired > 0 || !!c.extraRiskTomorrow;
}
var freeOn = [];
var freeOff = [];
data.events.forEach(function (ev) {
  ev.choices.forEach(function (c, i) {
    if (!costsAnything(c)) { freeOn.push(ev.id + " #" + i); }
    if (!ev.fatigue && !costsMeter(c)) { freeOff.push(ev.id + " #" + i); }
  });
  check(ev.choices.length === 2, ev.id + " has exactly two choices");
  if (ev.learn) {
    var fact = data.numbers[ev.factKey];
    check(!!fact && fact.status === "verified", ev.id + " learn line backed by verified fact " + ev.factKey);
  }
});
Object.keys(data.outcomes).forEach(function (key) {
  var o = data.outcomes[key];
  [o, o.noFatigue].filter(Boolean).forEach(function (w) {
    var fact = data.numbers[w.factKey];
    check(!!fact && fact.status === "verified", "end screen '" + key + "'" + (w === o ? "" : " (fatigue off)") + " cites verified fact " + w.factKey);
  });
});
check(freeOn.length === 0, "fatigue on: every choice costs something " + JSON.stringify(freeOn));
check(freeOff.length === 0, "fatigue off: every untagged choice costs a meter or risks a repair " + JSON.stringify(freeOff));

// And that each one shows up on its own in normal play.
console.log("\n== Events: do they appear in normal play? (300 careful games) ==");
var seen = {};
for (var s = 1; s <= 300; s++) {
  var g = play(data, careful, s);
  Object.keys(g.seenCount).forEach(function (id) { seen[id] = (seen[id] || 0) + g.seenCount[id]; });
}
data.events.forEach(function (ev) { check(seen[ev.id] > 0, ev.id + " appeared " + (seen[ev.id] || 0) + " times"); });
check(seen.solar_flare > 0 && seen.solar_particleStorm > 0,
  "solar cards appeared: flare " + seen.solar_flare + ", particle storm " + seen.solar_particleStorm);

// ---------------------------------------------------------------------
// 3. Real solar events land on the right sols.
// ---------------------------------------------------------------------
console.log("\n== Solar events from the NASA DONKI snapshot ==");
var solarSols = [];
var probe = E.newGame(data, { seed: 1 });
for (var sol = 1; sol <= 30; sol++) {
  var sw = E.solarEventForSol(probe, sol);
  if (sw) { solarSols.push(sol + ":" + (sw.kind === "flare" ? sw.classType : "SEP")); }
}
console.log("  " + solarSols.join("  "));
var sol6 = E.solarEventForSol(probe, 6);
check(sol6 && sol6.classType === "X4.5", "sol 6 replays 6 May 2024, X4.5 flare (strongest that day)");

// ---------------------------------------------------------------------
// 4. Ask Earth: the answer arrives two phases later.
// ---------------------------------------------------------------------
console.log("\n== Communication delay ==");
data.events.filter(function (ev) { return ev.choices.some(function (c) { return c.askEarth; }); }).forEach(function (ev) {
  var ge = E.newGame(data, { seed: 7 });
  E.forceEvent(ge, ev.id);
  var askIndex = ev.choices[0].askEarth ? 0 : 1;
  E.choose(ge, askIndex);
  var sentAt = ge.phaseCount;
  var waited = 0;
  while (ge.card && ge.card.type !== "message" && waited < 12 && !ge.outcome) { E.choose(ge, careful(ge)); waited++; }
  check(ge.card && ge.card.type === "message" && ge.phaseCount - sentAt === 2,
    ev.id + ": Earth's answer arrived " + (ge.phaseCount - sentAt) + " phases later");
});

// ---------------------------------------------------------------------
// 5. Demo mode, and a lost game names its cause.
// ---------------------------------------------------------------------
console.log("\n== Demo mode ==");
var gd = E.newGame(data, { seed: 3, demo: "pump" });
check(E.getPrompt(gd).title === "3 a.m. pump fault", "?demo=pump opens on: " + E.getPrompt(gd).title);
function demoBranch(choice) {
  var g = E.newGame(data, { seed: 3, demo: "pump" });
  E.choose(g, choice);   // pump fault choice
  E.choose(g, 0);        // bedtime: keep Earth hours
  var p = E.getPrompt(g);
  return { title: p.title, full: p.choices[1] && p.choices[1].detail, lifeSupport: g.meters.lifeSupport };
}
var wake = demoBranch(0);
var wait = demoBranch(1);
console.log("  wake crew : life support " + wake.lifeSupport + " | next: " + wake.title + " | full shift: " + wake.full);
console.log("  let sleep : life support " + wait.lifeSupport + " | next: " + wait.title + " | full shift: " + wait.full);
check(wake.title === "Plan the work day" && wait.title === "Plan the work day", "demo: next morning goes straight to the work plan");
check(wake.lifeSupport > wait.lifeSupport, "demo: letting the crew sleep costs life support now");
check(wake.full !== wait.full, "demo: waking the crew changes tomorrow's mistake chance");

var gl = play(data, careless, 11);
check(gl.outcome === "lost" && !!data.outcomes[gl.cause],
  "careless seed 11 lost on sol " + gl.sol + ", end screen: \"" + (gl.cause && data.outcomes[gl.cause].title) + "\"");

// ---------------------------------------------------------------------
// 6. Balance.
// ---------------------------------------------------------------------
var RUNS = 500;
function summary(gameData, strategy, name) {
  var wins = 0;
  var lossSols = [];
  var causes = {};
  for (var seed = 1; seed <= RUNS; seed++) {
    var game = play(gameData, strategy, seed);
    if (game.outcome === "won") { wins++; }
    else { lossSols.push(game.sol); causes[game.cause] = (causes[game.cause] || 0) + 1; }
  }
  lossSols.sort(function (a, b) { return a - b; });
  var median = lossSols.length ? lossSols[Math.floor(lossSols.length / 2)] : "-";
  console.log("  " + name + ": won " + wins + "/" + RUNS + " (" + Math.round(wins / RUNS * 100) + "%), median losing sol " + median +
    ", earliest " + (lossSols.length ? lossSols[0] : "-") + ", causes " + JSON.stringify(causes));
  return { wins: wins, rate: wins / RUNS, median: median };
}
console.log("\n== Balance, fatigue ON (" + RUNS + " seeds each) ==");
var bCareful = summary(data, careful, "careful               ");
var bCareless = summary(data, careless, "careless              ");
var bNoClock = summary(data, carefulNoClock, "careful, ignores clock");
check(bCareful.rate >= 0.72 && bCareful.rate <= 0.88, "careful wins about 80% (target 72 to 88%)");
check(bCareless.rate <= 0.02, "careless almost always loses");
check(bNoClock.rate >= 0.2 && bNoClock.rate <= 0.4, "careful but ignoring the body clock wins about 25 to 35% (accepting 20 to 40%)");

// ---------------------------------------------------------------------
// 7. Fatigue switched off.
// ---------------------------------------------------------------------
console.log("\n== Fatigue OFF ==");
var tiredSeen = 0;
var fatigueCardSeen = 0;
for (var so = 1; so <= 100; so++) {
  var go = play(dataOff, carefulOff, so);
  tiredSeen += go.tired;
  dataOff.events.forEach(function (ev) { if (ev.fatigue && go.seenCount[ev.id]) { fatigueCardSeen++; } });
}
check(tiredSeen === 0, "tiredness stays 0 with fatigue off");
check(fatigueCardSeen === 0, "no fatigue-tagged card appears with fatigue off");
var off = E.newGame(dataOff, { seed: 1 });
check(E.getPrompt(off).choices[0].label === "Greenhouse day", "work card offers focus plans: " +
  E.getPrompt(off).choices.map(function (c) { return c.label; }).join(", "));
var offDemo = E.newGame(dataOff, { seed: 1, demo: "pump" });
check(E.getPrompt(offDemo).title !== "3 a.m. pump fault", "demo=pump falls back to a normal start with fatigue off");
var oCareful = summary(dataOff, carefulOff, "careful (fatigue off) ");
var oCareless = summary(dataOff, carelessOff, "careless (fatigue off)");
check(oCareful.wins > 0 && oCareless.wins < RUNS, "fatigue off: the game can be won and lost");

// ---------------------------------------------------------------------
// 7b. Milestone 4 checks: the evening card's sunset fact, and scene hints.
// ---------------------------------------------------------------------
console.log("\n== Evening card and scene hints ==");
var ge2 = E.newGame(data, { seed: 2 });
E.choose(ge2, 1); // full shift -> evening card
var evening = E.getPrompt(ge2);
check(evening.kind === "sleep" && data.numbers[evening.factKey] && data.numbers[evening.factKey].status === "verified",
  "evening card cites verified fact " + evening.factKey);
var SCENE_KEYS = ["panelsDusty", "greenhouseDark", "dustySky"];
var badScene = [];
data.events.forEach(function (ev) {
  ev.choices.forEach(function (c) {
    Object.keys(c.scene || {}).forEach(function (k) { if (SCENE_KEYS.indexOf(k) === -1) { badScene.push(ev.id + "." + k); } });
  });
});
check(badScene.length === 0, "every scene hint in events.js is a known picture change " + JSON.stringify(badScene));

// ---------------------------------------------------------------------
// 8. The How to play intro.
// ---------------------------------------------------------------------
console.log("\n== How to play intro ==");
var INTRO = require(path.join(root, "data/intro.js"));
var Intro = require(path.join(root, "js/intro.js"));
check(INTRO.screens.length >= 1 && INTRO.screens.length <= 3, "intro has " + INTRO.screens.length + " screens (at most 3)");
INTRO.screens.forEach(function (screen) {
  screen.lines.forEach(function (line) {
    // A line with a number in it is either a game rule or a fact with a verified source.
    if (/\d/.test(line.text) && !line.gameRule) {
      check(!!line.factKeys && line.factKeys.length > 0, "intro '" + screen.id + "': numbered line has a source: " + line.text.slice(0, 50));
    }
    (line.factKeys || []).forEach(function (key) {
      var fact = data.numbers[key];
      check(!!fact && fact.status === "verified", "intro '" + screen.id + "': fact " + key + " is verified");
    });
  });
});
// The sol length in the intro text matches the verified number.
var solHours = data.numbers.solLengthHours.value;
var solText = Math.floor(solHours) + " hours and " + Math.floor((solHours % 1) * 60) + " minutes";
var allText = INTRO.screens.map(function (sc) { return sc.lines.map(function (l) { return l.text; }).join(" "); }).join(" ");
check(allText.indexOf(solText) !== -1, "intro says the sol is \"" + solText + "\" (from solLengthHours " + solHours + ")");
check(/\bsol\b/.test(allText) && /Life support/.test(allText) && /Power/.test(allText) && /Shielding/.test(allText) && /30 sols/.test(allText),
  "intro explains sol, the three meters and the 30-sol goal");
var tiredOn = INTRO.screens.some(function (sc) { return Intro.visibleLines(sc, true).some(function (l) { return /tired/i.test(l.text); }); });
var tiredOff = INTRO.screens.some(function (sc) { return Intro.visibleLines(sc, false).some(function (l) { return /tired/i.test(l.text); }); });
check(tiredOn, "fatigue on: intro has the tired-crew line");
check(!tiredOff, "fatigue off: intro has no tired-crew line");

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"));
process.exitCode = failures === 0 ? 0 : 1;
