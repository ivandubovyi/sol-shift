# Sol Shift

A browser game for NASA Space Apps Challenge 2026, Challenge #3, "Build a Junior Astronaut Mission Trainer".

You run a small Mars base for 30 sols. Keep three meters up: life support, power and shielding. The hidden twist is crew sleep. A Mars day is about 40 minutes longer than an Earth day, so a crew on Earth hours slowly drifts out of step with the Sun, sleeps worse, gets tired, and makes more repair mistakes. Mistakes cost life support.

Made for ages 7 to 12. No account, no download, no server needed.

**AI disclosure:** the code in this repository was written by an AI assistant (Claude, by Anthropic) from the team's spec. See [AI-USE.md](AI-USE.md). There are no AI-generated images; every shape is CSS or SVG written in code.

## How to open it

Double-click `index.html`. That is all.

If your browser blocks local files for some reason, run this in the `sol-shift` folder and open http://localhost:8000:

```
python3 -m http.server 8000
```

Useful web addresses:

| Address | What it does |
|---|---|
| `index.html` | Normal game |
| `index.html?demo=pump` | Starts right at the 3 a.m. pump fault (night of sol 3). Made for the 30-second demo video. |
| `index.html?seed=42` | The same seed always plays the same game. Good for testing and for recording. |
| `index.html?demo=pump&seed=42` | Both together. |

## How a sol works

1. **Day.** Sometimes a card appears first: a real solar event from the NASA data, a random event, or an answer from Earth. Then you plan the work day: short shift, full shift or overtime. More work makes more power, life support and shielding, and makes the crew more tired. Each plan shows its chance of a repair mistake.
2. **Night.** Sometimes a night card appears (like the 3 a.m. pump fault). Then bedtime: keep Earth hours (the body clock slips 40 minutes) or shift bedtime to match the Sun (one rough night).
3. Next sol. Survive sol 30 to win. If a meter hits 0, the mission ends and the end screen shows what used it up and the real science behind it.

## How the code is organized

```
index.html              the page. Loads the data files, then the engine, then the page code
css/style.css           all the styles. Colors are variables at the top
js/engine.js            the game rules. Knows nothing about the web page, so it can be tested in Node
js/ui.js                draws the screen and handles button presses
data/numbers.js         EVERY game number, with kind, status and source
data/events.js          the event deck (5 cards) and the two solar event card templates
data/outcomes.js        end screen words for each way to lose, and for winning
data/space-weather.js   real solar events from NASA DONKI, May 2024 (generated, do not edit)
data/donki-raw/         the full, unedited DONKI responses the snapshot came from
tools/playtest.js       headless test: robot players run the real engine in Node
tools/make-space-weather.py   rebuilds data/space-weather.js from data/donki-raw/
AI-USE.md               how AI was used, as the Space Apps rules require
```

The data files are `.js`, not `.json`, on purpose. Browsers block loading `.json` files when you open a page by double-clicking it. Each data file is JSON-style data assigned to one variable, so it reads like JSON.

## How to add an event

Open `data/events.js`, copy one event object, and change it:

```js
{
  id: "radio_static",               // unique, no spaces
  phase: "day",                     // "day" or "night"
  clock: "10:00",                   // Mars time shown on the card
  weight: 2,                        // how often it is picked
  minSol: 3,                        // earliest sol it can appear
  cooldown: 3,                      // sols before it can come back
  title: "Radio static",
  text: "The radio to Earth is full of static.",
  choices: [
    { label: "Climb up and fix the antenna", effects: { tired: 8 }, repair: true, log: "..." },
    { label: "Wait for it to clear",          effects: { power: -5 },             log: "..." }
  ]
}
```

Save and reload. Nothing else needs to change. The fields are explained at the top of `data/events.js`. Choices can also use `extraRiskTomorrow`, `askEarth` (a delayed answer from mission control) and `skipWork`.

If an event teaches a real fact, put it in `learn` and point `factKey` at a **verified** entry in `data/numbers.js`. The game then shows that entry's source link. Never put a fact in `learn` that is not backed by a verified entry.

## Numbers and sources

Every entry in `data/numbers.js` has:

- `kind`: `"real-world"` (a fact) or `"game-design"` (a balance choice)
- `status`: `"verified"` (checked on the source page) or `"placeholder"` (not checked)
- `source`: a URL, or `null` for game-design numbers

All real-world numbers are verified. All game-design numbers are placeholders: they are tuned by playtesting and are not NASA facts. The in-game Sources screen lists only verified facts.

Real facts used, all checked on 2026-11-14:

- Sol length 24.6597 h and Mars sunlight 43% of Earth's: [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
- Earth to Mars message delay, about 4 to 24 minutes each way: [NASA, Space Communications: 7 Things You Need to Know](https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/)
- Surface radiation 0.67 mSv per day (Curiosity RAD, Aug 2012 to Jun 2013): [NASA news release](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/)
- Sleep 5.98 h in step vs 4.91 h out of step with the Mars day (Phoenix team): [Barger et al. 2012, Sleep 35(10)](https://experts.arizona.edu/en/publications/learning-to-live-on-a-mars-day-fatigue-countermeasures-during-the/)
- Solar flares and particle events, May 2024: [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), a saved snapshot, not live. Sol 1 replays 1 May 2024. The events were measured near Earth; placing them over a Mars base is a game simplification, and the game says so.

## Testing

```
node tools/playtest.js
```

It forces each event and tries both choices, checks that every event shows up in normal play, checks the solar events land on the right sols, checks that an answer from Earth arrives two phases later, checks demo mode, and plays 500 games each with a careful robot, a careless robot, and a careful robot that never fixes the body clock. It prints `ALL CHECKS PASSED` or the failures.

## Rebuilding the space weather snapshot

See the comment at the top of `tools/make-space-weather.py` for the two download commands, then run:

```
python3 tools/make-space-weather.py
```
