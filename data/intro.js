/*
  Sol Shift: the "How to play" intro text.

  NOTE: this code file was written by an AI assistant (Claude) from the team's
  spec. See AI-USE.md.

  At most 3 screens, one idea each, written for ages 7 to 12.
  The page code that shows these screens is js/intro.js.

  Each screen has:
    id      short name
    title   the heading (the keyboard focus jumps here)
    art     which small drawing to show: "sol", "meters" or "choices"
            (drawn with SVG in js/intro.js, no image files)
    lines   the sentences. Each line is { text, ... } and can also have:
      factKeys     numbers.js entries that back up a real-world fact in this
                   line. They must be "verified". The screen shows their
                   source link under the line.
      gameRule     true = this line is a rule of the game, not a real-world
                   fact (for example "30 sols"). No source needed.
      fatigueOnly  true = only shown when fatigueEnabled is true in numbers.js
*/

var SOL_SHIFT_INTRO = {
  screens: [
    {
      id: "sol",
      title: "Welcome to your Mars base",
      art: "sol",
      lines: [
        { text: "You are in charge of a small base on Mars." },
        {
          text: "A day on Mars is called a sol. One sol is about 24 hours and 39 minutes long. That is about 40 minutes longer than a day on Earth.",
          factKeys: ["solLengthHours", "solDriftMinutes"]
        },
        { text: "Your goal: keep the base running for 30 sols, until the next ship arrives.", gameRule: true }
      ]
    },
    {
      id: "meters",
      title: "Keep three things from running out",
      art: "meters",
      lines: [
        { text: "Life support is air, water and food." },
        { text: "Power is electricity from the solar panels." },
        { text: "Shielding protects the crew from radiation, invisible energy from the Sun and space that can harm the body." },
        { text: "If any one of them runs out, the mission ends.", gameRule: true }
      ]
    },
    {
      id: "choices",
      title: "Every choice costs something",
      art: "choices",
      lines: [
        { text: "Each sol has a day and a night. Things go wrong, and you choose what to do.", gameRule: true },
        { text: "No choice is free. Each one costs something, so pick the cost you can afford.", gameRule: true },
        {
          text: "You can ask Earth for help, but messages take about 4 to 24 minutes each way, so the answer comes later.",
          factKeys: ["signalDelayMinMinutes", "signalDelayMaxMinutes"]
        },
        { text: "Watch your crew. A tired crew makes more mistakes.", gameRule: true, fatigueOnly: true }
      ]
    }
  ]
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SOL_SHIFT_INTRO; }
