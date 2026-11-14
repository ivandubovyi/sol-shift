/*
  Sol Shift: the event deck.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  HOW TO ADD AN EVENT: copy one object below, give it a new id, change the
  words and numbers, save, reload the page. Nothing else needs to change.

  Every number in an event (how much a choice costs) is a GAME-DESIGN
  PLACEHOLDER, tuned by playtesting. It is not a NASA fact. Real facts go in
  the "learn" line, and each one points at a verified entry in numbers.js
  with "factKey", so the game can show its source.

  Fields:
    id          short unique name, no spaces
    phase       "day" or "night": when the card can appear
    clock       Mars clock time shown on the card (just for the story)
    weight      how often it is picked compared with other cards (2 = twice as often as 1)
    minSol      the earliest sol it can appear
    cooldown    sols to wait before the same card can come back
    title       the card's headline
    text        what happened, in plain words for ages 7 to 12
    learn       one real fact connected to the card (optional)
    factKey     the numbers.js entry that backs up "learn" (optional)
    choices     exactly two. Each choice can have:
      label              the button text
      effects            meter changes: power, lifeSupport, shielding, and
                         tired (the hidden crew tiredness, 0 to 100)
      repair             true = the crew attempts a repair now. It can go
                         wrong, and tired crews go wrong more often.
      extraRiskTomorrow  adds to tomorrow's repair mistake chance (0.2 = +20%)
      askEarth           send a question to mission control. The answer
                         arrives later. { reply: "...", effects: {...} }
      skipWork           true = the crew does no work today (storm shelter)
      log                what the mission log says after the choice
*/

var SOL_SHIFT_EVENTS = [

  // The signature event. Wake the crew (fix it now, tired crew tomorrow)
  // or let them sleep (lose some air now).
  {
    id: "pump_fault",
    phase: "night",
    clock: "03:00",
    weight: 3,
    minSol: 2,
    cooldown: 3,
    title: "3 a.m. pump fault",
    text: "An alarm goes off at 3 in the morning. The pump that keeps fresh air moving through the base has stopped. The crew is fast asleep.",
    learn: "People on the Phoenix Mars Lander team lived on Mars time. When their body clocks matched the Mars day they slept about 6 hours. When their body clocks were out of step, they slept under 5.",
    factKey: "sleepOutOfStepHours",
    choices: [
      {
        label: "Wake the crew and fix it now",
        effects: { tired: 15 },
        extraRiskTomorrow: 0.2,
        log: "The crew fixed the pump in the dark. They are groggy, so tomorrow's repairs are riskier."
      },
      {
        label: "Let them sleep. Fix it at sunrise",
        effects: { lifeSupport: -12 },
        log: "The crew slept. The base lost some air before the pump was fixed in the morning."
      }
    ]
  },

  {
    id: "dusty_panels",
    phase: "day",
    clock: "09:00",
    weight: 2,
    minSol: 2,
    cooldown: 3,
    title: "Dusty solar panels",
    text: "Red dust has settled on the solar panels. Dusty panels make less electricity.",
    learn: "Mars gets only about 43 percent of the sunlight Earth gets, so every bit of dust on a panel matters.",
    factKey: "sunlightVsEarth",
    choices: [
      {
        label: "Send two crew out to sweep",
        effects: { tired: 10, shielding: -3 },
        log: "The panels are clean. The sweepers are tired, and time outside used up some shielding."
      },
      {
        label: "Leave the dust for now",
        effects: { power: -14 },
        log: "The panels stayed dusty. The base made less power today."
      }
    ]
  },

  {
    id: "greenhouse_lights",
    phase: "day",
    clock: "11:00",
    weight: 2,
    minSol: 3,
    cooldown: 4,
    title: "Greenhouse lights flicker",
    text: "The lights in the greenhouse keep flickering. The plants need light to grow food and help clean the air.",
    learn: "A message between Earth and Mars takes about 4 to 24 minutes each way, depending on where the two planets are. The crew cannot just call and get an answer right away.",
    factKey: "signalDelayMaxMinutes",
    choices: [
      {
        label: "Fix the wiring ourselves now",
        effects: { power: -2 },
        repair: true,
        log: "The crew opened the light panel and went to work."
      },
      {
        label: "Ask Earth how to fix it",
        effects: { lifeSupport: -5 },
        askEarth: {
          reply: "Mission control: Swap the fuse behind panel 3, then restart the lights. Your plants should perk up.",
          effects: { lifeSupport: 5 }
        },
        log: "Question sent to Earth. The plants sit in dim light while the crew waits for an answer."
      }
    ]
  },

  {
    id: "cannot_sleep",
    phase: "night",
    clock: "01:00",
    weight: 2,
    minSol: 3,
    cooldown: 3,
    title: "Wide awake at 1 a.m.",
    text: "One crew member cannot fall asleep. Their body clock thinks it is still evening.",
    learn: "A Mars day, called a sol, is about 24 hours and 40 minutes long. A body clock set to Earth time slips about 40 minutes every sol.",
    factKey: "solDriftMinutes",
    choices: [
      {
        label: "Give them tomorrow morning off",
        effects: { power: -6, tired: -3 },
        log: "One crew member slept in. Less work got done, but they will be sharper."
      },
      {
        label: "They push through tomorrow",
        effects: { tired: 10 },
        extraRiskTomorrow: 0.1,
        log: "No sleep-in. A very tired crew member is on shift tomorrow."
      }
    ]
  },

  {
    id: "water_leak",
    phase: "day",
    clock: "14:00",
    weight: 2,
    minSol: 4,
    cooldown: 4,
    title: "Dripping water pipe",
    text: "A water pipe in the habitat is dripping. Water is part of life support. It is recycled again and again.",
    choices: [
      {
        label: "Patch it now",
        effects: { tired: 4 },
        repair: true,
        log: "The crew grabbed the repair kit."
      },
      {
        label: "Shut the pipe off and ask Earth",
        effects: { lifeSupport: -8 },
        askEarth: {
          reply: "Mission control: The spare pipe is in storage bin 12. Here are the steps to fit it.",
          effects: { lifeSupport: 4 }
        },
        log: "Pipe shut off. Some water was lost. A question is on its way to Earth."
      }
    ]
  }
];

/*
  Solar event cards. These are NOT random: they appear on the sols where the
  real NASA DONKI snapshot (data/space-weather.js) has an event on that date.
  Words in {curly brackets} are filled in from the DONKI record.
*/
var SOL_SHIFT_SOLAR_CARDS = {

  flare: {
    clock: "08:00",
    title: "Solar flare warning",
    text: "NASA's space weather records show a class {classType} solar flare on {date}, peaking at {time} UTC. A solar flare is a sudden burst of energy from the Sun. X is the strongest class.",
    learn: "Radiation is invisible energy that can harm the body. A radiation dose is how much of it a body takes in, measured in millisieverts. On calm days, the Curiosity rover measured about 0.67 millisieverts a day on the surface of Mars.",
    factKey: "surfaceDoseMsvPerDay",
    shelterLabel: "Everyone into the storm shelter today",
    workLabel: "Keep working outside",
    hitKey: "flareShieldingHit"
  },

  particleStorm: {
    clock: "08:00",
    title: "Solar particle storm",
    text: "NASA's space weather records show a solar energetic particle event on {date} at {time} UTC. That is a storm of very fast particles thrown out by the Sun.",
    learn: "Radiation is invisible energy that can harm the body. A radiation dose is how much of it a body takes in, measured in millisieverts. On calm days, the Curiosity rover measured about 0.67 millisieverts a day on the surface of Mars. In this game, solar storms add extra dose on top of that.",
    factKey: "surfaceDoseMsvPerDay",
    shelterLabel: "Everyone into the storm shelter today",
    workLabel: "Keep working outside",
    hitKey: "particleStormShieldingHit"
  }
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") {
  module.exports = { events: SOL_SHIFT_EVENTS, solarCards: SOL_SHIFT_SOLAR_CARDS };
}
