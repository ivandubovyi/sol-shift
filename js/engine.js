/*
  Sol Shift: the game rules (the "engine").

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  This file knows nothing about the web page. It only keeps track of the
  game state and changes it when the player picks a choice. That makes it
  easy to test: tools/playtest.js runs this same file in Node.js with no
  browser at all.

  The big idea:
    - The game is a list of CARDS shown one at a time.
    - Each card has a few choices. The player picks one with choose().
    - At the start of each phase (day or night) we build a small queue:
        1. messages from Earth that have arrived
        2. maybe an event card (a real solar event, or a random one)
        3. the phase's main card: "work" in the day, "sleep" at night
    - When the main card is answered, the phase ends and the next one starts.

  All numbers come from data/numbers.js. All event words come from
  data/events.js. This file holds rules only.

  THE FATIGUE SWITCH: fatigueEnabled in data/numbers.js turns the crew sleep
  part of the game on or off. Every place that depends on it is marked
  "FATIGUE MODULE" below, so it is easy to find, change or remove.
*/

var SolShiftEngine = (function () {
  "use strict";

  // The three meters the player can see. If any reaches 0, the mission ends.
  var METERS = ["lifeSupport", "power", "shielding"];

  var METER_NAMES = {
    lifeSupport: "Life support",
    power: "Power",
    shielding: "Shielding"
  };

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  // Read a number from numbers.js by its key, for example num(game, "meterMax").
  function num(game, key) {
    var entry = game.data.numbers[key];
    if (!entry) { throw new Error("Missing number in data/numbers.js: " + key); }
    return entry.value;
  }

  // Keep a value between a low and a high limit.
  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  // A random number generator we can repeat. The same seed always gives the
  // same game, which helps testing and recording the demo.
  // (This is the well-known "mulberry32" method.)
  function nextRandom(game) {
    game.rngState = (game.rngState + 0x6D2B79F5) | 0;
    var t = game.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // a number from 0 up to 1
  }

  // Turn 0.234 into "23%".
  function percent(chance) {
    return Math.round(chance * 100) + "%";
  }

  // Turn 158 minutes into "2 h 38 min".
  function formatMinutes(minutes) {
    var m = Math.round(minutes);
    var h = Math.floor(m / 60);
    var rest = m % 60;
    if (h === 0) { return rest + " min"; }
    return h + " h " + rest + " min";
  }

  // Fill words like {date} in a text with values from an object.
  function fillTemplate(text, values) {
    return text.replace(/\{(\w+)\}/g, function (whole, key) {
      return values[key] !== undefined ? values[key] : whole;
    });
  }

  // Add a line to the mission log, newest first.
  function addLog(game, text) {
    game.log.unshift({ sol: game.sol, phase: game.phase, text: text });
  }

  // ---------------------------------------------------------------------
  // Meters and the hidden crew tiredness
  // ---------------------------------------------------------------------

  // Change one meter, keep it between 0 and the max, and remember big hits
  // so the end screen can explain what went wrong.
  function changeMeter(game, meter, amount, reason) {
    var before = game.meters[meter];
    game.meters[meter] = clamp(before + amount, 0, num(game, "meterMax"));
    if (amount < 0) {
      game.hits.push({ meter: meter, amount: amount, reason: reason, sol: game.sol });
    }
  }

  // FATIGUE MODULE: is the crew sleep part of the game switched on?
  function fatigueOn(game) {
    return num(game, "fatigueEnabled") === true;
  }

  // Tiredness is hidden: 0 = fully rested, 100 = exhausted.
  // FATIGUE MODULE: with fatigue off, tiredness never changes and stays 0,
  // so mistake chances stay at the base rate and work output stays full.
  function changeTired(game, amount) {
    if (!fatigueOn(game)) { return; }
    game.tired = clamp(game.tired + amount, 0, 100);
  }

  // Apply an "effects" object like { power: -10, tired: 5 }.
  function applyEffects(game, effects, reason) {
    if (!effects) { return; }
    Object.keys(effects).forEach(function (key) {
      if (key === "tired") {
        changeTired(game, effects.tired);
      } else if (METERS.indexOf(key) !== -1) {
        changeMeter(game, key, effects[key], reason);
      }
    });
  }

  // Describe effects for a button, for example "Power -14, Shielding -3".
  // Tiredness is hidden, so it is described in words instead of a number.
  function describeEffects(game, effects) {
    if (!effects) { return []; }
    var parts = [];
    METERS.forEach(function (meter) {
      if (effects[meter]) {
        var sign = effects[meter] > 0 ? "+" : "";
        parts.push(METER_NAMES[meter] + " " + sign + effects[meter]);
      }
    });
    if (fatigueOn(game)) { // FATIGUE MODULE
      if (effects.tired > 0) { parts.push("Crew gets more tired"); }
      if (effects.tired < 0) { parts.push("Crew gets some rest"); }
    }
    return parts;
  }

  // How far the crew's body clock is from the Sun, from 0 (in step) to 1 (fully out of step).
  function outOfStep(game) {
    return clamp(game.driftMinutes / num(game, "fullyOutOfStepMinutes"), 0, 1);
  }

  // The chance that a repair goes wrong right now.
  // hours = how long the crew works (8 = a normal shift).
  function mistakeChance(game, hours) {
    var chance = num(game, "baseMistakeChance")
      + num(game, "tiredMistakeWeight") * (game.tired / 100)
      + num(game, "clockMistakeWeight") * outOfStep(game);
    chance = chance * (hours / 8) + game.extraRisk;
    return clamp(chance, 0, num(game, "maxMistakeChance"));
  }

  // How much work a tired crew gets done: 1 when rested, lower when tired.
  function workOutput(game) {
    return 1 - num(game, "tiredWorkLoss") * (game.tired / 100);
  }

  // Roll the dice for a repair. Returns true if it went wrong.
  function rollRepair(game, hours, reason) {
    var chance = mistakeChance(game, hours);
    if (nextRandom(game) < chance) {
      changeMeter(game, "lifeSupport", -num(game, "mistakeLifeSupportCost"), reason);
      return true;
    }
    return false;
  }

  // Kid-readable crew status. Used by the web page to pick the face and words.
  function crewStatus(game) {
    var t = game.tired;
    if (t < 30) { return { level: 0, text: "The crew is rested and sharp." }; }
    if (t < 55) { return { level: 1, text: "The crew is getting tired. Mistakes are a little more likely." }; }
    if (t < 80) { return { level: 2, text: "The crew is very tired. Mistakes are more likely." }; }
    return { level: 3, text: "The crew is exhausted. Mistakes are very likely." };
  }

  // ---------------------------------------------------------------------
  // Real space weather (NASA DONKI snapshot)
  // ---------------------------------------------------------------------

  // Sol 1 replays the first date in the snapshot, sol 2 the next day, and so on.
  function dateForSol(game, sol) {
    var first = new Date(game.data.spaceWeather.firstDate + "T00:00:00Z");
    var d = new Date(first.getTime() + (sol - 1) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10); // "2024-05-06"
  }

  // "2024-05-06" becomes "6 May 2024".
  function prettyDate(isoDate) {
    var months = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];
    var parts = isoDate.split("-");
    return Number(parts[2]) + " " + months[Number(parts[1]) - 1] + " " + parts[0];
  }

  // Find the strongest real solar event on this sol's date, or null.
  // A particle storm counts as stronger than a flare.
  function solarEventForSol(game, sol) {
    var date = dateForSol(game, sol);
    var sw = game.data.spaceWeather;
    var storm = sw.particleStorms.filter(function (s) { return s.eventTime.slice(0, 10) === date; })[0];
    if (storm) {
      return { kind: "particleStorm", date: date, time: storm.eventTime.slice(11, 16), id: storm.sepID, link: storm.link };
    }
    var flares = sw.flares.filter(function (f) { return f.peakTime.slice(0, 10) === date; });
    if (flares.length === 0) { return null; }
    // Pick the biggest flare of the day. "X4.5" -> 4.5
    flares.sort(function (a, b) { return parseFloat(b.classType.slice(1)) - parseFloat(a.classType.slice(1)); });
    var f = flares[0];
    return { kind: "flare", date: date, time: f.peakTime.slice(11, 16), classType: f.classType, id: f.flrID, link: f.link };
  }

  // Build a card for a real solar event.
  function makeSolarCard(game, solar) {
    var template = game.data.solarCards[solar.kind];
    var values = { date: prettyDate(solar.date), time: solar.time, classType: solar.classType };
    return {
      type: "solar",
      solar: solar,
      clock: template.clock,
      title: template.title,
      text: fillTemplate(template.text, values),
      learn: template.learn,
      factKey: template.factKey,
      template: template
    };
  }

  // ---------------------------------------------------------------------
  // Random events
  // ---------------------------------------------------------------------

  // Pick a random event for this phase, or null.
  function pickRandomEvent(game, phase) {
    var chanceKey = phase === "day" ? "dayEventChance" : "nightEventChance";
    if (nextRandom(game) >= num(game, chanceKey)) { return null; }

    // Which events are allowed right now?
    var allowed = game.data.events.filter(function (ev) {
      if (ev.phase !== phase) { return false; }
      if (ev.fatigue && !fatigueOn(game)) { return false; } // FATIGUE MODULE: sleep cards only when fatigue is on
      if (game.sol < ev.minSol) { return false; }
      var last = game.lastSeen[ev.id];
      if (last !== undefined && game.sol - last < ev.cooldown) { return false; }
      return true;
    });
    if (allowed.length === 0) { return null; }

    // Weighted pick: an event with weight 3 is three times as likely as weight 1.
    var total = allowed.reduce(function (sum, ev) { return sum + ev.weight; }, 0);
    var roll = nextRandom(game) * total;
    for (var i = 0; i < allowed.length; i++) {
      roll -= allowed[i].weight;
      if (roll < 0) { return allowed[i]; }
    }
    return allowed[allowed.length - 1];
  }

  function makeEventCard(ev) {
    return {
      type: "event",
      event: ev,
      clock: ev.clock,
      title: ev.title,
      text: ev.text,
      learn: ev.learn,
      factKey: ev.factKey
    };
  }

  function findEvent(game, id) {
    var ev = game.data.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) { throw new Error("No event with id " + id); }
    return ev;
  }

  // ---------------------------------------------------------------------
  // Starting a game and moving through phases
  // ---------------------------------------------------------------------

  // data = { numbers, events, solarCards, outcomes, spaceWeather }
  // options = { seed: number, demo: "pump" or undefined }
  function newGame(data, options) {
    options = options || {};
    var seed = options.seed !== undefined ? options.seed : Date.now();
    var game = {
      data: data,
      seed: seed,
      rngState: seed | 0,
      sol: 1,
      phase: "day",          // "day" or "night"
      phaseCount: 0,         // how many phases have passed (used for Earth's reply delay)
      meters: {},
      tired: 0,              // hidden crew tiredness, 0 to 100
      driftMinutes: 0,       // how far the crew's body clock is from the Sun
      extraRisk: 0,          // extra repair mistake chance for the next work day
      skipWork: false,       // true after choosing the storm shelter
      quietPhases: 0,        // phases with no random event cards (used by demo mode)
      inbox: [],             // questions sent to Earth, waiting for answers
      queue: [],             // cards still to show in this phase
      card: null,            // the card on screen now
      lastSeen: {},          // event id -> sol it last appeared
      seenCount: {},         // event id -> how many times it appeared
      log: [],
      hits: [],              // every time a meter went down, and why
      history: [],           // meters at the end of each sol
      outcome: null,         // null while playing, then "won" or "lost"
      cause: null            // which meter ran out
    };
    METERS.forEach(function (m) { game.meters[m] = num(game, "meterStart"); });

    if (options.demo === "pump" && fatigueOn(game)) { // the pump fault is a FATIGUE MODULE card
      startPumpDemo(game);
    } else {
      addLog(game, "Sol 1. The crew wakes up in the new Mars base.");
      startPhase(game);
    }
    return game;
  }

  // Demo shortcut for the 30-second video: jump straight to the 3 a.m. pump fault.
  // Sol 3 night is chosen because sol 4 has no real solar event, so the next
  // morning goes straight to the work plan and shows the higher mistake chance.
  function startPumpDemo(game) {
    game.sol = 3;
    game.phase = "night";
    game.phaseCount = 5;
    game.tired = 25;
    game.driftMinutes = 80;
    game.quietPhases = 1; // no random event card on the next morning
    addLog(game, "Demo mode: starting at the night of sol 3.");
    game.queue = [makeEventCard(findEvent(game, "pump_fault")), { type: "sleep" }];
    noteSeen(game, game.queue[0]);
    showNextCard(game);
  }

  // Build the queue of cards for the phase that is starting.
  function startPhase(game) {
    game.queue = [];

    // 1. Answers from Earth that have arrived.
    var arrived = game.inbox.filter(function (msg) { return msg.arrivesAt <= game.phaseCount; });
    game.inbox = game.inbox.filter(function (msg) { return msg.arrivesAt > game.phaseCount; });
    arrived.forEach(function (msg) {
      game.queue.push({ type: "message", title: "Message from Earth", text: msg.reply, effects: msg.effects, sentSol: msg.sentSol });
    });

    // 2. An event card. In the day, a real solar event comes first if there is one.
    var quiet = game.quietPhases > 0;
    if (quiet) { game.quietPhases -= 1; }
    if (quiet) {
      // demo mode: skip random events this phase
    } else if (game.phase === "day") {
      var solar = solarEventForSol(game, game.sol);
      if (solar) {
        game.queue.push(makeSolarCard(game, solar));
      } else {
        var dayEvent = pickRandomEvent(game, "day");
        if (dayEvent) { game.queue.push(makeEventCard(dayEvent)); }
      }
    } else {
      var nightEvent = pickRandomEvent(game, "night");
      if (nightEvent) { game.queue.push(makeEventCard(nightEvent)); }
    }

    // 3. The main card for this phase.
    game.queue.push({ type: game.phase === "day" ? "work" : "sleep" });

    game.queue.forEach(function (card) { noteSeen(game, card); });
    showNextCard(game);
  }

  // Remember when an event appeared (for cooldowns and for testing).
  function noteSeen(game, card) {
    var id = null;
    if (card.type === "event") { id = card.event.id; }
    if (card.type === "solar") { id = "solar_" + card.solar.kind; }
    if (!id) { return; }
    game.lastSeen[id] = game.sol;
    game.seenCount[id] = (game.seenCount[id] || 0) + 1;
  }

  function showNextCard(game) {
    game.card = game.queue.shift() || null;
  }

  // Move from day to night, or from night to the next sol.
  function endPhase(game) {
    game.phaseCount += 1;
    if (game.phase === "day") {
      game.phase = "night";
    } else {
      game.history.push({ sol: game.sol, meters: Object.assign({}, game.meters), tired: game.tired });
      game.sol += 1;
      if (game.sol > num(game, "missionLengthSols")) {
        game.sol = num(game, "missionLengthSols");
        game.outcome = "won";
        game.card = null;
        addLog(game, "Sol 30 is done. The mission is complete.");
        return;
      }
      game.phase = "day";
      addLog(game, "Sol " + game.sol + " begins.");
    }
    startPhase(game);
  }

  // If any meter is at 0, the mission is lost. Returns true if the game ended.
  function checkForLoss(game) {
    var empty = METERS.filter(function (m) { return game.meters[m] <= 0; });
    if (empty.length === 0) { return false; }
    game.outcome = "lost";
    game.cause = empty[0];
    game.card = null;
    addLog(game, METER_NAMES[game.cause] + " ran out on sol " + game.sol + ".");
    return true;
  }

  // ---------------------------------------------------------------------
  // What the player sees: the current card turned into words and buttons
  // ---------------------------------------------------------------------

  // The three work plans the player can pick from.
  // FATIGUE MODULE: with fatigue on, the plans are about HOW LONG to work
  // (longer = more done, more tired). With fatigue off, they are about WHAT
  // to work on, because longer shifts would have no cost.
  function workPlans(game) {
    if (fatigueOn(game)) {
      return [num(game, "workPlanShort"), num(game, "workPlanFull"), num(game, "workPlanOvertime")];
    }
    return [num(game, "focusPlanGreenhouse"), num(game, "focusPlanPanels"), num(game, "focusPlanShield")]
      .map(function (plan) { return Object.assign({ hours: 8, tired: 0 }, plan); });
  }

  // Returns { kind, clock, title, text, learn, factKey, choices: [{ label, detail }] }
  // or null when the game is over.
  function getPrompt(game) {
    var card = game.card;
    if (!card) { return null; }

    if (card.type === "work") {
      if (game.skipWork) {
        return {
          kind: "work", clock: "08:00", title: "Shelter day",
          text: "The crew stays inside the storm shelter. They can tend the indoor greenhouse, but nobody goes outside, so nobody takes in extra radiation.",
          choices: [{ label: "Wait out the storm", detail: "Life support +" + num(game, "shelterLifeSupport") + " from indoor work. No outside work, so no power or shielding gets made. The crew rests a little." }]
        };
      }
      return {
        kind: "work", clock: "08:00", title: "Plan the work day",
        text: fatigueOn(game)
          ? "How long should the crew work today? More work keeps the base running. It also makes the crew more tired."
          : "What should the crew work on today? Each job helps one part of the base the most.",
        choices: workPlans(game).map(function (plan) {
          var output = workOutput(game);
          var parts = describeEffects(game, {
            power: Math.round(plan.power * output),
            lifeSupport: Math.round(plan.lifeSupport * output),
            shielding: Math.round(plan.shielding * output)
          });
          return {
            label: fatigueOn(game) ? plan.label + " (" + plan.hours + " hours)" : plan.label,
            detail: "Makes " + parts.join(", ") + ". Chance of a repair mistake: " + percent(mistakeChance(game, plan.hours)) + "."
          };
        })
      };
    }

    if (card.type === "sleep") {
      // FATIGUE MODULE: with fatigue off there is no bedtime choice, just the night.
      if (!fatigueOn(game)) {
        return {
          kind: "sleep", clock: "22:00", title: "Night",
          text: "The Sun has set and the crew goes to sleep. Mars nights are very cold, so the heaters use power.",
          choices: [{ label: "Good night", detail: "Power -" + num(game, "nightPowerUse") + " for the heaters." }]
        };
      }
      var drift = num(game, "solDriftMinutes");
      return {
        kind: "sleep", clock: "22:00", title: "Bedtime",
        text: "A Mars day (a sol) is about 40 minutes longer than an Earth day. If the crew keeps Earth hours, their body clocks slip away from the Sun, and they sleep worse. " + (game.driftMinutes < 1
          ? "Right now their body clocks match the Sun."
          : "Right now they are " + formatMinutes(game.driftMinutes) + " out of step."),
        choices: [
          { label: "Keep Earth hours", detail: "Body clock slips " + Math.round(drift) + " more minutes. No cost tonight." },
          { label: "Shift bedtime to match the Sun", detail: "Body clock back in step. One rough night: the crew gets more tired tonight." }
        ]
      };
    }

    if (card.type === "message") {
      return {
        kind: "message", clock: null, title: card.title,
        text: card.text,
        note: "You asked on sol " + card.sentSol + ". Each message takes 4 to 24 minutes to cross space, and mission control needed time to work out the answer.",
        choices: [{ label: "Do what Earth says", detail: describeEffects(game, card.effects).join(", ") || "No meter changes." }]
      };
    }

    if (card.type === "solar") {
      var hit = num(game, card.template.hitKey);
      return {
        kind: "solar", clock: card.clock, title: card.title, text: card.text,
        learn: card.learn, factKey: card.factKey,
        note: "Real event from a NASA DONKI snapshot (May 2024, not live). Putting it over a Mars base is part of the game.",
        sourceLink: card.solar.link,
        choices: [
          { label: card.template.shelterLabel, detail: "Only indoor work today. No power or shielding gets made." },
          { label: card.template.workLabel, detail: "Shielding -" + hit + ". The work day goes on as normal." }
        ]
      };
    }

    // A normal event card.
    var ev = card.event;
    return {
      kind: "event", clock: card.clock, title: card.title, text: card.text,
      learn: card.learn, factKey: card.factKey,
      choices: ev.choices.map(function (c) {
        var parts = describeEffects(game, c.effects);
        if (c.repair) { parts.push("Repair now: " + percent(mistakeChance(game, 8)) + " chance of a mistake (Life support -" + num(game, "mistakeLifeSupportCost") + ")"); }
        if (c.extraRiskTomorrow) { parts.push("Tomorrow's repair mistake chance +" + percent(c.extraRiskTomorrow)); }
        if (c.askEarth) { parts.push("Earth's answer comes in about " + num(game, "earthReplyPhases") / 2 + " sol"); }
        return { label: c.label, detail: parts.join(". ") + "." };
      })
    };
  }

  // ---------------------------------------------------------------------
  // The player picks a choice
  // ---------------------------------------------------------------------

  function choose(game, index) {
    var card = game.card;
    if (!card || game.outcome) { return; }

    if (card.type === "work") {
      doWorkDay(game, index);
      if (!checkForLoss(game)) { endPhase(game); }
      return;
    }

    if (card.type === "sleep") {
      doNight(game, index);
      if (!checkForLoss(game)) { endPhase(game); }
      return;
    }

    if (card.type === "message") {
      applyEffects(game, card.effects, "Earth's fix");
      addLog(game, "The crew followed Earth's instructions.");
    } else if (card.type === "solar") {
      doSolarChoice(game, card, index);
    } else if (card.type === "event") {
      doEventChoice(game, card.event, index);
    }

    if (!checkForLoss(game)) { showNextCard(game); }
  }

  function doEventChoice(game, ev, index) {
    var c = ev.choices[index];
    applyEffects(game, c.effects, ev.title);
    if (c.log) { addLog(game, c.log); }
    if (c.repair) {
      var wentWrong = rollRepair(game, 8, ev.title + " (repair mistake)");
      addLog(game, wentWrong
        ? "The repair went wrong. Life support -" + num(game, "mistakeLifeSupportCost") + "."
        : "The repair worked.");
    }
    if (c.extraRiskTomorrow) { game.extraRisk += c.extraRiskTomorrow; }
    if (c.skipWork) { game.skipWork = true; }
    if (c.askEarth) {
      game.inbox.push({
        arrivesAt: game.phaseCount + num(game, "earthReplyPhases"),
        sentSol: game.sol,
        reply: c.askEarth.reply,
        effects: c.askEarth.effects
      });
    }
  }

  function doSolarChoice(game, card, index) {
    if (index === 0) {
      game.skipWork = true;
      addLog(game, "Everyone went into the storm shelter.");
    } else {
      var hit = num(game, card.template.hitKey);
      changeMeter(game, "shielding", -hit, card.title + " (worked outside)");
      addLog(game, "The crew kept working through the solar event. Shielding -" + hit + ".");
    }
  }

  function doWorkDay(game, index) {
    if (game.skipWork) {
      changeTired(game, -num(game, "shelterRest"));
      changeMeter(game, "lifeSupport", num(game, "shelterLifeSupport"), "");
      addLog(game, "A quiet day in the shelter. The crew tended the indoor greenhouse.");
    } else {
      var plan = workPlans(game)[index];
      // Roll for a mistake BEFORE the crew gets more tired: the chance shown on the button is the one used.
      var wentWrong = rollRepair(game, plan.hours, "Repair mistake on a " + plan.label.toLowerCase());
      // A tired crew gets less done. output = 1 means full work, 0.6 means 60 percent.
      var output = workOutput(game);
      changeMeter(game, "power", Math.round(plan.power * output), "");
      changeMeter(game, "lifeSupport", Math.round(plan.lifeSupport * output), "");
      changeMeter(game, "shielding", Math.round(plan.shielding * output), "");
      changeTired(game, plan.tired);
      addLog(game, plan.label + " done." + (wentWrong
        ? " Someone made a repair mistake. Life support -" + num(game, "mistakeLifeSupportCost") + "."
        : ""));
    }

    // Everyday use, whether the crew worked or not.
    changeMeter(game, "power", -num(game, "dayPowerUse"), "Daily power use");
    changeMeter(game, "lifeSupport", -num(game, "dailyLifeSupportUse"), "Daily air, water and food");
    changeMeter(game, "shielding", -num(game, "dailyShieldingWear"), "Everyday radiation");
    if (game.meters.power < num(game, "lowPowerLine")) {
      changeMeter(game, "lifeSupport", -num(game, "lowPowerLifeSupportLoss"), "Low power slowed the air machines");
      addLog(game, "Power is low, so the air machines slowed down.");
    }

    game.extraRisk = 0;
    game.skipWork = false;
  }

  function doNight(game, index) {
    if (!fatigueOn(game)) { // FATIGUE MODULE: no body clock, no bedtime choice
      changeMeter(game, "power", -num(game, "nightPowerUse"), "Heaters at night");
      return;
    }
    if (index === 0) {
      game.driftMinutes += num(game, "solDriftMinutes");
    } else {
      game.driftMinutes = 0;
      changeTired(game, num(game, "resetClockTiredness"));
      addLog(game, "Bedtime moved to match the Sun. A rough night, but the body clock is back in step.");
    }
    // Sleep. Out-of-step crews get less rest (the Phoenix study number).
    var rest = num(game, "nightRest") * (1 - num(game, "outOfStepRestLoss") * outOfStep(game));
    changeTired(game, -rest);
    changeMeter(game, "power", -num(game, "nightPowerUse"), "Heaters at night");
  }

  // Everything the web page and the tests need.
  return {
    METERS: METERS,
    METER_NAMES: METER_NAMES,
    newGame: newGame,
    getPrompt: getPrompt,
    choose: choose,
    crewStatus: crewStatus,
    fatigueOn: fatigueOn,
    workPlans: workPlans,
    mistakeChance: mistakeChance,
    outOfStep: outOfStep,
    formatMinutes: formatMinutes,
    dateForSol: dateForSol,
    prettyDate: prettyDate,
    solarEventForSol: solarEventForSol,
    // For tests only: put a chosen event card on screen right now.
    forceEvent: function (game, id) {
      var card = makeEventCard(findEvent(game, id));
      if (game.card) { game.queue.unshift(game.card); }
      noteSeen(game, card);
      game.card = card;
    }
  };
})();

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SolShiftEngine; }
