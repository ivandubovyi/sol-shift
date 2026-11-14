/*
  Sol Shift: words for the end screen.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  One entry per meter that can run out, plus the win.
  "factKey" points at a VERIFIED entry in numbers.js. The end screen shows
  that entry's source link. If the entry is not verified, the end screen
  says "Source pending" instead.
*/

var SOL_SHIFT_OUTCOMES = {

  lifeSupport: {
    title: "Life support ran out",
    text: "The base ran short of air, water and food, so the crew had to leave Mars early. In this game, every repair mistake costs life support, and tired crews make more mistakes. Sleep is a resource too.",
    factKey: "sleepOutOfStepHours",
    factText: "Real research: on the Phoenix Mars Lander team, people slept about 6 hours when their body clocks matched the Mars day, and under 5 hours when they did not."
  },

  power: {
    title: "The power ran out",
    text: "Without electricity, the heaters and air machines stop, so the crew had to leave Mars early. Power comes from solar panels, and the crew has to work to keep them going.",
    factKey: "sunlightVsEarth",
    factText: "Real fact: Mars gets only about 43 percent of the sunlight that Earth gets."
  },

  shielding: {
    title: "The shielding ran out",
    text: "The crew took in too much radiation, so they had to leave Mars early. Working outside during solar storms uses up shielding fast. Hiding in the shelter keeps the crew safe, but no outside work gets done.",
    factKey: "surfaceDoseMsvPerDay",
    factText: "Real fact: even on calm days, the Curiosity rover measured about 0.67 millisieverts of radiation a day on the surface of Mars."
  },

  won: {
    title: "Mission complete",
    text: "Your crew made it through all 30 sols. You kept the base running and kept the crew rested enough to do careful work.",
    factKey: "solDriftMinutes",
    factText: "Real fact: a Mars day is about 40 minutes longer than an Earth day, so living on Mars means looking after your body clock."
  }
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SOL_SHIFT_OUTCOMES; }
