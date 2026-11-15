/*
  Sol Shift: the event deck.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  HOW TO ADD AN EVENT: copy one object below, give it a new id, change the
  words and numbers, save, reload the page. Nothing else needs to change.
  Then run "node tools/playtest.js": it tries both choices of every event
  and checks that neither choice is free.

  Every number in an event (how much a choice costs) is a GAME-DESIGN
  PLACEHOLDER, tuned by playtesting. It is not a NASA fact. Real facts go in
  the "learn" line, and each one points at a verified entry in numbers.js
  with "factKey", so the game can show its source. Cards without a "learn"
  line are story only and make no real-world claim.

  Fields:
    id          short unique name, no spaces
    phase       "day" or "night": when the card can appear
    fatigue     true = this card is about crew sleep. It is left out of the
                deck when fatigueEnabled is false in numbers.js.
                A card WITHOUT this tag must cost a meter (or risk a repair,
                or wait for Earth) on BOTH choices, so it still works with
                fatigue switched off.
    clock       Mars clock time shown on the card (just for the story)
    weight      how often it is picked compared with other cards (2 = twice as often as 1)
    minSol      the earliest sol it can appear
    cooldown    sols to wait before the same card can come back
    title       the card's headline
    text        what happened, in plain words for ages 7 to 12
    learn       one real fact connected to the card (optional)
    factKey     the numbers.js entry that backs up "learn" (needed if learn is used)
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
      scene              (optional) how the base picture changes after this
                         choice, for the given number of sols. Only changes
                         the drawing, never the game. Keys:
                           panelsDusty, greenhouseDark, dustySky
*/

var SOL_SHIFT_EVENTS = [

  // =====================================================================
  // NIGHT CARDS
  // =====================================================================

  // The signature event. Wake the crew (fix it now, tired crew tomorrow)
  // or let them sleep (lose some air now).
  {
    id: "pump_fault",
    phase: "night",
    fatigue: true,
    clock: "03:00",
    weight: 3,
    minSol: 2,
    cooldown: 3,
    title: "3 a.m. pump fault",
    text: "3 a.m.: the air pump stopped. One crew member on watch hears the alarm.",
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
    id: "cannot_sleep",
    phase: "night",
    fatigue: true,
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
    id: "cold_night",
    phase: "night",
    clock: "02:00",
    weight: 2,
    minSol: 2,
    cooldown: 4,
    title: "A freezing night",
    text: "Tonight is extra cold outside. The heaters are running and running to keep the base warm.",
    learn: "In its first months on Mars, the Curiosity rover measured the air in Gale Crater. Nights dropped to about minus 70 degrees Celsius (minus 94 Fahrenheit), and days only reached about 0 degrees Celsius.",
    factKey: "galeNightLowC",
    choices: [
      {
        label: "Turn the heaters up",
        effects: { power: -10 },
        log: "The heaters ran hard all night. Warm crew, less power."
      },
      {
        label: "Heaters low, everyone in sleeping bags",
        effects: { lifeSupport: -5, tired: 6 },
        log: "A chilly night. The water pipes froze a little and the crew slept badly."
      }
    ]
  },

  {
    id: "noisy_fan",
    phase: "night",
    clock: "23:30",
    weight: 2,
    minSol: 3,
    cooldown: 4,
    title: "Rattling fan",
    text: "A fan in the sleeping area starts rattling loudly. Fans keep the air moving so it stays fresh.",
    choices: [
      {
        label: "Get up and fix it",
        effects: { power: -2, tired: 6 },
        repair: true,
        log: "Someone got out of bed to fix the fan."
      },
      {
        label: "Switch the fan off until morning",
        effects: { lifeSupport: -6 },
        log: "Quiet night, but the air got stuffy."
      }
    ]
  },

  {
    id: "homesick",
    phase: "night",
    fatigue: true,
    clock: "22:30",
    weight: 1,
    minSol: 5,
    cooldown: 6,
    title: "Missing home",
    text: "One crew member misses their family on Earth and cannot sleep.",
    choices: [
      {
        label: "Record a video message home",
        effects: { power: -5 },
        log: "A video message is on its way to Earth. The big antenna used a lot of power."
      },
      {
        label: "Stay up talking with the crew",
        effects: { tired: 10 },
        log: "The crew talked until late. Everyone feels better, and everyone is tired."
      }
    ]
  },

  {
    id: "battery_hot",
    phase: "night",
    fatigue: true,
    clock: "04:00",
    weight: 2,
    minSol: 4,
    cooldown: 4,
    title: "Warm battery",
    text: "A warning light says one of the big batteries is getting too warm.",
    choices: [
      {
        label: "Wake someone to cool it down",
        effects: { tired: 8 },
        extraRiskTomorrow: 0.1,
        log: "One crew member spent an hour cooling the battery. They are tired now."
      },
      {
        label: "Shut that battery off until morning",
        effects: { power: -10 },
        log: "The battery was switched off. The base lost the power stored in it."
      }
    ]
  },

  {
    id: "roof_ping",
    phase: "night",
    clock: "00:30",
    weight: 1,
    minSol: 4,
    cooldown: 6,
    title: "Ping on the roof",
    text: "Something small just hit the roof with a ping. It might be a tiny rock from space.",
    choices: [
      {
        label: "Go out and check now",
        effects: { shielding: -3, tired: 8 },
        log: "A small dent, now patched. Going out at night used some shielding."
      },
      {
        label: "Check it in the morning",
        effects: { shielding: -7 },
        log: "The dent waited until morning, and dust got under the outer cover."
      }
    ]
  },

  {
    id: "power_spike",
    phase: "night",
    clock: "00:00",
    weight: 2,
    minSol: 5,
    cooldown: 4,
    title: "Midnight flicker",
    text: "The lights flicker at midnight. Something is using too much power.",
    choices: [
      {
        label: "Find the problem now",
        effects: { power: -2, tired: 6 },
        repair: true,
        log: "The crew traced the wires to find the problem."
      },
      {
        label: "Turn off everything we can until morning",
        effects: { power: -4, lifeSupport: -4 },
        scene: { greenhouseDark: 1 },
        log: "Greenhouse lights and extra machines were off all night."
      }
    ]
  },

  {
    id: "snoring",
    phase: "night",
    fatigue: true,
    clock: "01:30",
    weight: 1,
    minSol: 3,
    cooldown: 6,
    title: "Very loud snoring",
    text: "Someone is snoring so loudly that nobody else can sleep.",
    choices: [
      {
        label: "Move them to the storage room",
        effects: { power: -4 },
        log: "The storage room had to be heated for the night. Everyone else slept well."
      },
      {
        label: "Earplugs and hope for the best",
        effects: { tired: 8 },
        log: "The earplugs did not work very well."
      }
    ]
  },

  // =====================================================================
  // DAY CARDS
  // =====================================================================

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
        scene: { panelsDusty: 1 },
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
        scene: { greenhouseDark: 1 },
        askEarth: {
          reply: "Mission control: Swap the fuse behind panel 3, then restart the lights. Your plants should perk up.",
          effects: { lifeSupport: 5 }
        },
        log: "Question sent to Earth. The plants sit in dim light while the crew waits for an answer."
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
    text: "A water pipe in the habitat is dripping. Water is part of life support. It is cleaned and used again and again.",
    choices: [
      {
        label: "Patch it now",
        effects: { lifeSupport: -2, tired: 4 },
        repair: true,
        log: "The crew grabbed the repair kit. A little water spilled while the pipe was open."
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
  },

  {
    id: "dust_storm_coming",
    phase: "day",
    clock: "08:30",
    weight: 2,
    minSol: 4,
    cooldown: 5,
    title: "Dust cloud on the way",
    text: "A big cloud of dust is blowing toward the base. Tomorrow the sky will be dark and the solar panels will make less power.",
    learn: "Mars is farther from the Sun than Earth is, so from Mars the Sun looks only about two-thirds as wide. With a weaker Sun, a dusty sky makes power even harder to collect.",
    factKey: "sunSizeFromMars",
    choices: [
      {
        label: "Fill the batteries: greenhouse lights off today",
        effects: { lifeSupport: -6 },
        scene: { greenhouseDark: 1, dustySky: 1 },
        log: "The batteries are full. The plants had a dim day."
      },
      {
        label: "Keep everything running",
        effects: { power: -12 },
        scene: { dustySky: 1, panelsDusty: 1 },
        log: "The dust arrived and the panels made very little power."
      }
    ]
  },

  {
    id: "airlock_seal",
    phase: "day",
    clock: "10:00",
    weight: 2,
    minSol: 3,
    cooldown: 5,
    title: "Worn airlock seal",
    text: "The rubber seal on the airlock door is wearing out. The airlock is the small room between the inside of the base and the outside.",
    choices: [
      {
        label: "Replace the seal now",
        effects: { power: -2 },
        repair: true,
        log: "The crew started fitting a new seal."
      },
      {
        label: "Tape it and go outside less",
        effects: { shielding: -6 },
        log: "Fewer trips outside, so the outer shield did not get its usual care."
      }
    ]
  },

  {
    id: "rover_stuck",
    phase: "day",
    clock: "13:00",
    weight: 1,
    minSol: 5,
    cooldown: 6,
    title: "Rover stuck in sand",
    text: "The base's rover, a car that drives itself over the ground, is stuck in soft sand. It carries a spare battery.",
    choices: [
      {
        label: "Walk out and dig it free",
        effects: { shielding: -5, tired: 10 },
        log: "The crew dug the rover out by hand. A long walk outside used some shielding."
      },
      {
        label: "Ask Earth for a driving plan",
        effects: { power: -8 },
        askEarth: {
          reply: "Mission control: Rock it backward slowly, then turn left onto the hard ground. The battery is yours again.",
          effects: { power: 6 }
        },
        log: "The rover waits in the sand with the spare battery. A question is on its way to Earth."
      }
    ]
  },

  {
    id: "antenna_drift",
    phase: "day",
    clock: "15:00",
    weight: 1,
    minSol: 4,
    cooldown: 6,
    title: "Antenna off target",
    text: "Wind has nudged the big antenna, so it no longer points straight at Earth.",
    learn: "Messages between Earth and Mars take about 4 to 24 minutes each way, because the planets are so far apart.",
    factKey: "signalDelayMaxMinutes",
    choices: [
      {
        label: "Climb up and aim it",
        effects: { shielding: -2, tired: 6 },
        repair: true,
        log: "The crew climbed up to the antenna."
      },
      {
        label: "Use the backup radio",
        effects: { power: -8 },
        log: "The backup radio works, but it uses a lot of power."
      }
    ]
  },

  {
    id: "new_sprouts",
    phase: "day",
    clock: "10:30",
    weight: 2,
    minSol: 3,
    cooldown: 4,
    title: "New sprouts",
    text: "Tiny green sprouts are coming up in the greenhouse. They need extra light and water to grow strong.",
    choices: [
      {
        label: "Give them extra light and care",
        effects: { lifeSupport: 8, power: -7, tired: 4 },
        log: "The sprouts look great. The extra lights used power."
      },
      {
        label: "Normal care only",
        effects: { lifeSupport: -3 },
        log: "Some of the weaker sprouts did not make it."
      }
    ]
  },

  {
    id: "panel_crack",
    phase: "day",
    clock: "12:00",
    weight: 2,
    minSol: 4,
    cooldown: 5,
    title: "Cracked solar panel",
    text: "One solar panel has a crack across it. It still works, but not very well.",
    choices: [
      {
        label: "Swap in the spare panel",
        effects: { shielding: -2 },
        repair: true,
        log: "The crew went outside with the spare panel."
      },
      {
        label: "Keep using the cracked one",
        effects: { power: -10 },
        log: "The cracked panel made much less power."
      }
    ]
  },

  {
    id: "water_filter",
    phase: "day",
    clock: "09:30",
    weight: 2,
    minSol: 5,
    cooldown: 5,
    title: "Water filter warning",
    text: "The light on the water filter is blinking. The filter cleans used water so the crew can drink it again.",
    choices: [
      {
        label: "Swap the filter ourselves",
        effects: { lifeSupport: -2 },
        repair: true,
        log: "The crew opened the water machine. A little water was lost."
      },
      {
        label: "Ask Earth which filter to use",
        effects: { lifeSupport: -6 },
        askEarth: {
          reply: "Mission control: Use the blue filter, not the white one. Flush the line for two minutes after.",
          effects: { lifeSupport: 4 }
        },
        log: "The water machine is off until Earth answers."
      }
    ]
  },

  {
    id: "greenhouse_mold",
    phase: "day",
    clock: "11:30",
    weight: 1,
    minSol: 6,
    cooldown: 6,
    title: "Fuzzy mold on the plants",
    text: "White fuzzy mold is growing on some greenhouse plants.",
    choices: [
      {
        label: "Clean every leaf today",
        effects: { power: -4, tired: 8 },
        log: "The crew cleaned every leaf by hand, with the fans on high."
      },
      {
        label: "Pull out the moldy plants",
        effects: { lifeSupport: -8 },
        scene: { greenhouseDark: 1 },
        log: "The moldy plants are gone, and so is the food they would have made."
      }
    ]
  },

  {
    id: "shield_corner",
    phase: "day",
    clock: "14:30",
    weight: 2,
    minSol: 4,
    cooldown: 5,
    title: "Shield cover peeling",
    text: "Wind has peeled up a corner of the outer shield cover. The shield keeps radiation out.",
    learn: "Radiation is invisible energy that can harm the body. On calm days, the Curiosity rover measured about 0.67 millisieverts of radiation a day on the surface of Mars.",
    factKey: "surfaceDoseMsvPerDay",
    choices: [
      {
        label: "Go out and glue it down",
        effects: { power: -3, tired: 8 },
        log: "The crew glued the corner down. The glue heater used some power."
      },
      {
        label: "Ask Earth for a stronger fix",
        effects: { shielding: -8 },
        askEarth: {
          reply: "Mission control: Use two layers of the gray tape and press for one minute. It will hold through storms.",
          effects: { shielding: 5 }
        },
        log: "The corner flaps in the wind while the crew waits for Earth."
      }
    ]
  },

  {
    id: "suit_leak",
    phase: "day",
    clock: "08:00",
    weight: 2,
    minSol: 5,
    cooldown: 5,
    title: "Spacesuit leak",
    text: "A spacesuit has a slow air leak. Spacesuits are what the crew wears to go outside.",
    choices: [
      {
        label: "Patch the suit",
        effects: { lifeSupport: -3 },
        repair: true,
        log: "The crew patched the suit and tested it with air from the tanks."
      },
      {
        label: "Share the other suits",
        effects: { shielding: -4, power: -4 },
        log: "Fewer people could go out, so outside work fell behind."
      }
    ]
  },

  {
    id: "food_count",
    phase: "day",
    clock: "16:00",
    weight: 1,
    minSol: 6,
    cooldown: 6,
    title: "The food count is wrong",
    text: "The list says there should be more food in storage than the crew can find.",
    choices: [
      {
        label: "Recount everything today",
        effects: { power: -4, tired: 6 },
        log: "A long day of counting with the storage lights on. Found it: a box on the wrong shelf."
      },
      {
        label: "Ask Earth to check their list",
        effects: { lifeSupport: -5 },
        askEarth: {
          reply: "Mission control: Our list shows three boxes in rack C, not rack B. Look behind the water tanks.",
          effects: { lifeSupport: 4 }
        },
        log: "The crew ate carefully while waiting for Earth's answer."
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
    text: "A real solar flare: class {classType} on {date}, from NASA's records. A flare is a sudden burst of energy from the Sun.",
    learn: "Radiation is invisible energy that can harm the body. A radiation dose is how much of it a body takes in, measured in millisieverts. On calm days, the Curiosity rover measured about 0.67 millisieverts a day on the surface of Mars.",
    factKey: "surfaceDoseMsvPerDay",
    shelterLabel: "Go to the storm shelter",
    workLabel: "Keep working outside",
    hitKey: "flareShieldingHit"
  },

  particleStorm: {
    clock: "08:00",
    title: "Solar particle storm",
    text: "A real solar particle storm on {date}, from NASA's records: very fast particles thrown out by the Sun.",
    learn: "Radiation is invisible energy that can harm the body. A radiation dose is how much of it a body takes in, measured in millisieverts. On calm days, the Curiosity rover measured about 0.67 millisieverts a day on the surface of Mars. In this game, solar storms add extra dose on top of that.",
    factKey: "surfaceDoseMsvPerDay",
    shelterLabel: "Go to the storm shelter",
    workLabel: "Keep working outside",
    hitKey: "particleStormShieldingHit"
  }
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") {
  module.exports = { events: SOL_SHIFT_EVENTS, solarCards: SOL_SHIFT_SOLAR_CARDS };
}
