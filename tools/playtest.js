/*
  Sol Shift: headless playtest. Runs the real game rules (js/engine.js) in
  Node.js with no browser, using robot players.

  NOTE: this code file was written by an AI assistant (Claude). See AI-USE.md.

  Run it from the sol-shift folder:
    node tools/playtest.js

  It checks:
    1. every event card can appear, and both of its choices work
    2. real solar event cards appear on the right sols
    3. an "Ask Earth" answer arrives later
    4. losing ends the game and names the cause
    5. a careful robot player gets further than a careless one
*/

var path = require("path");
var root = path.join(__dirname, "..");

var data = {
  numbers: require(path.join(root, "data/numbers.js")),
  events: require(path.join(root, "data/events.js")).events,
  solarCards: require(path.join(root, "data/events.js")).solarCards,
  outcomes: require(path.join(root, "data/outcomes.js")),
  spaceWeather: require(path.join(root, "data/space-weather.js"))
};
var E = require(path.join(root, "js/engine.js"));

var failures = 0;
function check(ok, message) {
  console.log((ok ? "PASS " : "FAIL ") + message);
  if (!ok) { failures++; }
}

// ---------------------------------------------------------------------
// Robot players. Each one looks at the current card and returns a choice index.
// ---------------------------------------------------------------------

// Careless: always works overtime, never fixes the body clock,
// never hides from solar storms, always picks the first choice.
function careless(game) {
  var card = game.card;
  if (card.type === "work") { return game.skipWork ? 0 : 2; }
  if (card.type === "sleep") { return 0; }
  if (card.type === "solar") { return 1; }
  return 0;
}

// Careful: watches the crew's tiredness and the meters.
function careful(game) {
  var card = game.card;
  var m = game.meters;
  if (card.type === "message") { return 0; }
  if (card.type === "work") {
    if (game.skipWork) { return 0; }
    if (game.tired >= 50) { return 0; }                                         // short shift
    if ((m.power < 45 || m.lifeSupport < 45 || m.shielding < 45) && game.tired < 30) { return 2; } // overtime
    return 1;                                                                    // full shift
  }
  if (card.type === "sleep") { return game.driftMinutes >= 110 ? 1 : 0; }
  if (card.type === "solar") {
    if (card.solar.kind === "particleStorm") { return 0; }
    return m.shielding < 40 ? 0 : 1;
  }
  // Events: pick the choice that hurts the weakest meter least.
  var scores = card.event.choices.map(function (c) {
    var s = 0;
    var fx = c.effects || {};
    E.METERS.forEach(function (k) { if (fx[k] < 0) { s += -fx[k] * 60 / Math.max(m[k], 1); } });
    if (fx.tired > 0) { s += fx.tired * (game.tired + 20) / 60; }
    if (c.extraRiskTomorrow) { s += c.extraRiskTomorrow * 40; }
    if (c.repair) { s += E.mistakeChance(game, 8) * 10 * 60 / Math.max(m.lifeSupport, 1); }
    if (c.askEarth) { s -= 2; }
    return s;
  });
  return scores[0] <= scores[1] ? 0 : 1;
}

function play(strategy, seed) {
  var game = E.newGame(data, { seed: seed });
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
console.log("\n== Events: force each one, try both choices ==");
data.events.forEach(function (ev) {
  [0, 1].forEach(function (choice) {
    var game = E.newGame(data, { seed: 42 });
    E.forceEvent(game, ev.id);
    var prompt = E.getPrompt(game);
    var before = JSON.stringify([game.meters, game.tired, game.extraRisk, game.inbox.length]);
    E.choose(game, choice);
    var after = JSON.stringify([game.meters, game.tired, game.extraRisk, game.inbox.length]);
    check(prompt.title === ev.title && before !== after,
      ev.id + " choice " + choice + " (\"" + prompt.choices[choice].label + "\"): " + before + " -> " + after);
  });
});

// And that each one shows up on its own in normal play.
console.log("\n== Events: do they appear in normal play? (200 careful games) ==");
var seen = {};
for (var s = 1; s <= 200; s++) {
  var g = play(careful, s);
  Object.keys(g.seenCount).forEach(function (id) { seen[id] = (seen[id] || 0) + g.seenCount[id]; });
}
data.events.forEach(function (ev) { check(seen[ev.id] > 0, ev.id + " appeared " + (seen[ev.id] || 0) + " times"); });
check(seen.solar_flare > 0 && seen.solar_particleStorm > 0,
  "solar cards appeared: flare " + seen.solar_flare + ", particle storm " + seen.solar_particleStorm);

// ---------------------------------------------------------------------
// 2. Real solar events land on the right sols.
// ---------------------------------------------------------------------
console.log("\n== Solar events from the NASA DONKI snapshot ==");
var solarSols = [];
var probe = E.newGame(data, { seed: 1 });
for (var sol = 1; sol <= 30; sol++) {
  var sw = E.solarEventForSol(probe, sol);
  if (sw) { solarSols.push("sol " + sol + " = " + sw.date + " " + (sw.kind === "flare" ? sw.classType + " flare" : "particle storm")); }
}
console.log("  " + solarSols.join("\n  "));
var sol6 = E.solarEventForSol(probe, 6);
check(sol6 && sol6.classType === "X4.5", "sol 6 replays 6 May 2024, X4.5 flare (strongest that day)");

// ---------------------------------------------------------------------
// 3. Ask Earth: the answer arrives two phases later.
// ---------------------------------------------------------------------
console.log("\n== Communication delay ==");
var ge = E.newGame(data, { seed: 7 });
E.forceEvent(ge, "greenhouse_lights");
E.choose(ge, 1);              // ask Earth (day phase of sol 1)
var sentAt = ge.phaseCount;
var waited = 0;
while (ge.card.type !== "message" && waited < 10 && !ge.outcome) { E.choose(ge, careful(ge)); waited++; }
check(ge.card && ge.card.type === "message", "Earth's answer arrived " + (ge.phaseCount - sentAt) + " phases later: \"" + (ge.card && ge.card.text) + "\"");

// ---------------------------------------------------------------------
// 4. Demo mode starts on the pump fault.
// ---------------------------------------------------------------------
console.log("\n== Demo mode ==");
var gd = E.newGame(data, { seed: 3, demo: "pump" });
check(E.getPrompt(gd).title === "3 a.m. pump fault", "?demo=pump opens on: " + E.getPrompt(gd).title);

// Both branches of the demo, side by side: what does the next morning look like?
function demoBranch(choice) {
  var g = E.newGame(data, { seed: 3, demo: "pump" });
  E.choose(g, choice);   // pump fault choice
  E.choose(g, 0);        // bedtime: keep Earth hours
  var p = E.getPrompt(g);
  return { title: p.title, full: p.choices[1] && p.choices[1].detail, lifeSupport: g.meters.lifeSupport, crew: E.crewStatus(g).text };
}
var wake = demoBranch(0);
var wait = demoBranch(1);
console.log("  wake crew : life support " + wake.lifeSupport + " | " + wake.crew + " | next card: " + wake.title + " | full shift: " + wake.full);
console.log("  let sleep : life support " + wait.lifeSupport + " | " + wait.crew + " | next card: " + wait.title + " | full shift: " + wait.full);
check(wake.title === "Plan the work day" && wait.title === "Plan the work day", "demo: next morning goes straight to the work plan");
check(wake.lifeSupport > wait.lifeSupport, "demo: letting the crew sleep costs life support now");
check(wake.full !== wait.full, "demo: waking the crew changes tomorrow's mistake chance");

// Fatigue has to change outcomes, not just decorate them.
// Same careful player, but it never moves bedtime to match the Sun.
function carefulNoClock(game) {
  if (game.card.type === "sleep") { return 0; }
  return careful(game);
}

// ---------------------------------------------------------------------
// 5. Careful vs careless over many games.
// ---------------------------------------------------------------------
function summary(strategy, name) {
  var runs = 500;
  var wins = 0;
  var lossSols = [];
  var causes = {};
  for (var seed = 1; seed <= runs; seed++) {
    var game = play(strategy, seed);
    if (game.outcome === "won") { wins++; }
    else { lossSols.push(game.sol); causes[game.cause] = (causes[game.cause] || 0) + 1; }
  }
  lossSols.sort(function (a, b) { return a - b; });
  var median = lossSols.length ? lossSols[Math.floor(lossSols.length / 2)] : "-";
  console.log("  " + name + ": won " + wins + "/" + runs + ", median losing sol " + median +
    ", earliest " + (lossSols[0] || "-") + ", causes " + JSON.stringify(causes));
  return { wins: wins, median: median };
}
console.log("\n== Balance (500 seeds each) ==");
var c1 = summary(careful, "careful ");
var c2 = summary(careless, "careless");
var c3 = summary(carefulNoClock, "careful, never fixes body clock");
check(c1.wins > c2.wins, "careful player wins more often than careless");

// One full loss, printed like the end screen.
console.log("\n== One careless game, end to end ==");
var gl = play(careless, 11);
console.log("  outcome: " + gl.outcome + " on sol " + gl.sol + ", cause: " + gl.cause);
console.log("  end screen title: " + (gl.outcome === "lost" ? data.outcomes[gl.cause].title : data.outcomes.won.title));
console.log("  last log lines:\n    " + gl.log.slice(0, 6).map(function (l) { return "[sol " + l.sol + " " + l.phase + "] " + l.text; }).join("\n    "));
check(gl.outcome === "lost" && !!data.outcomes[gl.cause], "a lost game names its cause");

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"));
process.exitCode = failures === 0 ? 0 : 1;
