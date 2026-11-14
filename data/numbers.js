/*
  Sol Shift: every game number lives here.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md. The real-world numbers were checked against the source
  pages listed with each one.

  Why a .js file and not a .json file?
  Browsers block fetch() of local .json files when you open index.html by
  double-clicking it. A .js file loaded with a <script> tag works everywhere.
  The data below is plain JSON-style data assigned to one variable, so it
  reads like a JSON file.

  Every entry has:
    value   the number the game uses
    unit    what the number measures
    kind    "real-world"  a fact about Mars, space or people
            "game-design" a balance choice that makes the game play well.
                          It is NOT a claim about the real world.
    status  "verified"    a real-world number checked on the source page
            "placeholder" not checked against any source. Every game-design
                          number is a placeholder: it gets tuned by playtesting.
    source  a URL, or null for game-design numbers
    note    plain words about where the number came from
    label, display   (real-world numbers only) the words the Sources screen shows
*/

var SOL_SHIFT_NUMBERS = {

  // =====================================================================
  // REAL-WORLD NUMBERS (kind "real-world")
  // =====================================================================

  solLengthHours: {
    value: 24.6597, unit: "hours", kind: "real-world", status: "verified",
    source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    display: "about 24 hours, 39 minutes and 35 seconds",
    label: "Length of one Mars day (a sol)",
    note: "NASA NSSDC Mars Fact Sheet, 'Length of day (hrs) 24.6597'. That is 24 h 39 min 35 s. Checked 2026-11-14."
  },

  solDriftMinutes: {
    value: 39.6, unit: "minutes per sol", kind: "real-world", status: "verified",
    source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    display: "about 40 minutes",
    label: "How much longer a sol is than an Earth day",
    note: "Arithmetic from solLengthHours: (24.6597 - 24) x 60 = 39.6 minutes."
  },

  sunlightVsEarth: {
    value: 0.431, unit: "fraction of Earth's sunlight", kind: "real-world", status: "verified",
    source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    display: "about 43 percent of the sunlight Earth gets",
    label: "Sunlight at Mars compared with Earth",
    note: "NASA NSSDC Mars Fact Sheet: solar irradiance 586.2 W/m2 at Mars vs 1361.0 at Earth, ratio 0.431 (about 43 percent). Checked 2026-11-14."
  },

  signalDelayMinMinutes: {
    value: 4, unit: "minutes one way", kind: "real-world", status: "verified",
    source: "https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/",
    display: "about 4 minutes each way",
    label: "Shortest message delay, Earth to Mars",
    note: "NASA, 'Space Communications: 7 Things You Need to Know': about four minutes at Mars' closest approach. Checked 2026-11-14."
  },

  signalDelayMaxMinutes: {
    value: 24, unit: "minutes one way", kind: "real-world", status: "verified",
    source: "https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/",
    display: "about 24 minutes each way",
    label: "Longest message delay, Earth to Mars",
    note: "Same NASA page: around 24 minutes when the planets are farthest apart. Checked 2026-11-14."
  },

  surfaceDoseMsvPerDay: {
    value: 0.67, unit: "millisieverts per day", kind: "real-world", status: "verified",
    source: "https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/",
    display: "about 0.67 millisieverts a day (Curiosity rover, 2012 to 2013)",
    label: "Radiation dose at the surface of Mars",
    note: "Curiosity's RAD instrument measured an average of 0.67 millisieverts per day at Gale Crater, August 2012 to June 2013 (NASA news release). Checked 2026-11-14."
  },

  sleepInStepHours: {
    value: 5.98, unit: "hours", kind: "real-world", status: "verified",
    source: "https://experts.arizona.edu/en/publications/learning-to-live-on-a-mars-day-fatigue-countermeasures-during-the/",
    display: "about 6 hours (5.98)",
    label: "Sleep when the body clock matched the Mars day",
    note: "Barger et al. 2012, Sleep 35(10). Phoenix Mars Lander team on Earth working Mars time: 5.98 h main sleep when in step. Checked in the abstract 2026-11-14."
  },

  sleepOutOfStepHours: {
    value: 4.91, unit: "hours", kind: "real-world", status: "verified",
    source: "https://experts.arizona.edu/en/publications/learning-to-live-on-a-mars-day-fatigue-countermeasures-during-the/",
    display: "under 5 hours (4.91)",
    label: "Sleep when the body clock was out of step",
    note: "Same study: 4.91 h main sleep when out of step. Checked in the abstract 2026-11-14."
  },

  galeNightLowC: {
    value: -70, unit: "degrees Celsius", kind: "real-world", status: "verified",
    source: "https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater",
    display: "about minus 70 degrees Celsius (minus 94 Fahrenheit)",
    label: "Night air temperature at Gale Crater, Mars",
    note: "NASA photojournal PIA16913, 'Steady Temperatures at Mars' Gale Crater': lows about minus 94 F (minus 70 C), mid-August 2012 to late February 2013, Curiosity REMS. Checked 2026-11-15."
  },

  galeDayHighC: {
    value: 0, unit: "degrees Celsius", kind: "real-world", status: "verified",
    source: "https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater",
    display: "about 0 degrees Celsius (32 Fahrenheit)",
    label: "Daytime air temperature at Gale Crater, Mars",
    note: "Same NASA page: daily highs about 32 F (0 C), same period. Checked 2026-11-15."
  },

  marsSunsetBlue: {
    value: "blue near the Sun", unit: "sky color at sunset", kind: "real-world", status: "verified",
    source: "https://www.jpl.nasa.gov/news/nasas-curiosity-rover-views-serene-sundown-on-mars/",
    display: "blue near the Sun, because fine dust lets blue light through more easily (Curiosity, 15 April 2015)",
    label: "Color of a Mars sunset",
    note: "NASA JPL news: 'The sun dips to a Martian horizon in a blue-tinged sky' and 'Martian sunsets make the blue near the sun's part of the sky much more prominent'. NASA Science PIA19400 explains that fine dust lets blue light through more efficiently. Curiosity Mastcam, sol 956 (15 April 2015). Checked 2026-11-15. The game's day and night sky colors are artistic choices, not measurements."
  },

  sunSizeFromMars: {
    value: 0.67, unit: "times as wide as the Sun looks from Earth", kind: "real-world", status: "verified",
    source: "https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/",
    display: "about two-thirds as wide as it looks from Earth",
    label: "How big the Sun looks from Mars",
    note: "NASA Science, 'What Do Sunrises and Sunsets Look Like on Mars?': the Sun 'appears only about two-thirds the size we see when we watch sunsets here on Earth', because Mars is farther from the Sun. Checked 2026-11-15. The game draws its Sun at this size compared with an Earth-sized Sun of the same drawing scale."
  },

  // Derived from the two sleep numbers above: 1 - 4.91 / 5.98 = 0.179.
  // The game uses it as "how much less rest a fully out-of-step crew gets".
  // Using a lab sleep number as a game rest number is a game simplification.
  outOfStepRestLoss: {
    value: 0.18, unit: "fraction", kind: "real-world", status: "verified",
    source: "https://experts.arizona.edu/en/publications/learning-to-live-on-a-mars-day-fatigue-countermeasures-during-the/",
    display: "about 18 percent less sleep",
    label: "Rest lost when the body clock is out of step",
    note: "Arithmetic: 1 - 4.91 / 5.98 = 0.18 (about 18 percent less sleep)."
  },

  // =====================================================================
  // GAME-DESIGN NUMBERS (kind "game-design", status "placeholder")
  // These are balance choices, tuned by playtesting. Not NASA facts.
  // =====================================================================

  // ---------- THE FATIGUE SWITCH ----------
  // true  = the full game: hidden crew tiredness, body clock drift, bedtime
  //         choices, short/full/overtime shifts, and the sleep event cards.
  // false = the same game without any of that: three meters, real NASA solar
  //         storms, messages from Earth, and "focus" work plans instead.
  // Everything that depends on it is marked "FATIGUE MODULE" in js/engine.js,
  // and the sleep cards in data/events.js have fatigue: true.
  fatigueEnabled: {
    value: true, unit: "on or off", kind: "game-design", status: "placeholder", source: null,
    note: "Turns the crew sleep part of the game on or off."
  },

  missionLengthSols: {
    value: 30, unit: "sols", kind: "game-design", status: "placeholder", source: null,
    note: "Survive this many sols to win. From the team's spec."
  },

  meterStart: {
    value: 100, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Every meter starts full."
  },

  meterMax: {
    value: 100, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "No meter can go above this."
  },

  lowMeterWarning: {
    value: 25, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Below this a meter turns red on screen."
  },

  // ---------- What the base uses every sol ----------

  dayPowerUse: {
    value: 4, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Power used in the day phase."
  },

  nightPowerUse: {
    value: 6, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Power used in the night phase. Heaters work harder at night."
  },

  dailyLifeSupportUse: {
    value: 6, unit: "points per sol", kind: "game-design", status: "placeholder", source: null,
    note: "Air, water and food the crew uses each sol."
  },

  dailyShieldingWear: {
    value: 3, unit: "points per sol", kind: "game-design", status: "placeholder", source: null,
    note: "Shielding used up by the everyday radiation at the surface."
  },

  lowPowerLine: {
    value: 20, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "If power ends the day below this, life support runs short."
  },

  lowPowerLifeSupportLoss: {
    value: 4, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Extra life support lost on a sol when power is low."
  },

  // ---------- Work plans for the day phase ----------
  // hours: how long the crew works. tired: how much tiredness it adds.

  workPlanShort: {
    value: { label: "Short shift", hours: 4, power: 6, lifeSupport: 5, shielding: 2, tired: 8 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Less work, less tiredness."
  },

  workPlanFull: {
    value: { label: "Full shift", hours: 8, power: 11, lifeSupport: 8, shielding: 3, tired: 15 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "A normal day. Breaks about even."
  },

  workPlanOvertime: {
    value: { label: "Overtime", hours: 11, power: 14, lifeSupport: 9, shielding: 4, tired: 26 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Gets more done, makes the crew much more tired."
  },

  // ---------- Work plans used when fatigueEnabled is false ----------
  // With no tiredness, longer shifts would have no cost. So instead the crew
  // picks what to focus on, and each focus helps one meter most.

  focusPlanGreenhouse: {
    value: { label: "Greenhouse day", lifeSupport: 12, power: 4, shielding: 1 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Grow food and clean air."
  },

  focusPlanPanels: {
    value: { label: "Solar panel day", lifeSupport: 3, power: 18, shielding: 1 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Clean and fix the solar panels."
  },

  focusPlanShield: {
    value: { label: "Shield repair day", lifeSupport: 3, power: 4, shielding: 9 },
    unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Repair the outer radiation shield."
  },

  // ---------- Sleep and the body clock ----------

  nightRest: {
    value: 20, unit: "points of tiredness removed", kind: "game-design", status: "placeholder", source: null,
    note: "How much one night of sleep removes when the body clock matches the Sun."
  },

  fullyOutOfStepMinutes: {
    value: 360, unit: "minutes", kind: "game-design", status: "placeholder", source: null,
    note: "At this much drift, the sleep penalty is at full size. About 9 sols of drift."
  },

  resetClockTiredness: {
    value: 8, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Moving the crew's sleep back to match the Sun costs one rough night."
  },

  shelterRest: {
    value: 6, unit: "points of tiredness removed", kind: "game-design", status: "placeholder", source: null,
    note: "A day in the storm shelter is a quiet day, so the crew rests a little."
  },

  shelterLifeSupport: {
    value: 5, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "In the shelter the crew can still tend the indoor greenhouse and air machines. They cannot clean panels or fix the outer shield."
  },

  // ---------- Repair mistakes ----------
  // Chance of a mistake =
  //   (baseMistakeChance
  //      + tiredMistakeWeight * (tiredness / 100)
  //      + clockMistakeWeight * (how out of step, 0 to 1))
  //   * (hours worked / 8)        <- only for the daily work roll
  //   + extra risk left from the night before (for example the 3 a.m. pump fault)

  baseMistakeChance: {
    value: 0.05, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "Mistake chance for a rested crew whose body clock matches the Sun."
  },

  tiredMistakeWeight: {
    value: 0.5, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "How much tiredness adds to the mistake chance."
  },

  clockMistakeWeight: {
    value: 0.25, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "How much an out-of-step body clock adds to the mistake chance."
  },

  tiredWorkLoss: {
    value: 0.4, unit: "fraction", kind: "game-design", status: "placeholder", source: null,
    note: "An exhausted crew (tiredness 100) gets this much less done. A crew at tiredness 50 loses half of it."
  },

  maxMistakeChance: {
    value: 0.9, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "The mistake chance never goes above this."
  },

  mistakeLifeSupportCost: {
    value: 12, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Life support lost when a repair goes wrong."
  },

  // ---------- Events ----------

  dayEventChance: {
    value: 0.35, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "Chance of a random event card in a day phase with no solar event."
  },

  nightEventChance: {
    value: 0.3, unit: "chance (0 to 1)", kind: "game-design", status: "placeholder", source: null,
    note: "Chance of a random event card in a night phase."
  },

  flareShieldingHit: {
    value: 8, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Shielding lost if the crew keeps working through an X-class flare day."
  },

  particleStormShieldingHit: {
    value: 25, unit: "points", kind: "game-design", status: "placeholder", source: null,
    note: "Shielding lost if the crew keeps working through a solar particle storm day."
  },

  earthReplyPhases: {
    value: 2, unit: "phases (one day or one night each)", kind: "game-design", status: "placeholder", source: null,
    note: "How long until Earth's answer arrives. The signal itself takes 4 to 24 minutes each way; the rest is mission control working out the fix. That split is a game simplification."
  }
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SOL_SHIFT_NUMBERS; }
