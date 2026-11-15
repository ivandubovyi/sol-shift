# Sol Shift

A browser game for NASA Space Apps Challenge 2026, Challenge #3, "Build a Junior Astronaut Mission Trainer".

You run a small Mars base for 30 sols. Keep three meters up: life support, power and shielding. The hidden twist is crew sleep. A Mars day is about 40 minutes longer than an Earth day, so a crew on Earth hours slowly drifts out of step with the Sun, sleeps worse, gets tired, and makes more repair mistakes. Mistakes cost life support.

Made for ages 7 to 12. No account, no download, no server needed.

**AI disclosure:** the code in this repository was written by an AI assistant (Claude, by Anthropic) from the team's spec. See [AI-USE.md](AI-USE.md). There are no AI-generated images. The base, crew and ground are CSS or SVG written in code; the mountain and the sunset behind them are two real NASA photos (credits below).

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

## How to play intro

The first time someone opens the game, three short "How to play" screens come before the start screen: what a sol is, the three meters and the goal, and how choices work. Every screen has Next and Skip, and Escape also skips. The keyboard focus moves to each screen's heading.

- The words are in `data/intro.js`; the code that shows them is `js/intro.js`.
- The game remembers that the intro was seen (in `localStorage`). If the browser blocks that, the intro just shows again next time.
- "How to play" on the start screen and in the footer (also during a game) opens it again.
- `?demo=pump` and `?seed=` skip it, so recordings start straight away.
- Lines with real facts point at verified entries in `data/numbers.js` and show the source link. The tired-crew line has `fatigueOnly: true`, so it disappears when the fatigue switch is off.
- To see the intro again on your own computer as a first-time visitor, clear the site data or run `localStorage.removeItem("solShift.introSeen")` in the browser console.

## Full screen and glass

The outpost scene fills the whole screen; the page never scrolls. Everything else floats over it as "glass": see-through panels with a blur behind them, a thin light border, a soft inner glow and a dark tint so text stays readable over the bright day sky. Browsers without blur get nearly solid panels instead (the `@supports not` rule at the end of `css/style.css`).

- **Phones held upright:** sol and Menu at the top, the three meters in a glass bar under them, the crew chip below that, and the card as a bottom sheet. The camera (`updateCamera()` in `js/ui.js`) keeps the habitat between the top bar and the sheet.
- **Wide screens and phones on their side:** meters top-left, crew chip bottom-left, the card as a panel on the right. Short screens put the meters in one row.
- **Menu:** Mission log (a glass drawer), How to play, Sources, Sound, and Full screen. The Full screen button only appears where the browser supports it (not on iPhone Safari), and the game never needs it.
- **Type:** labels and numbers use `--font-hud`, which is Orbitron, a free font under the SIL Open Font License (`fonts/Orbitron-latin.woff2`, license in `fonts/Orbitron-OFL.txt`, from Google Fonts). The file is inside the project, so nothing is fetched from the internet and the game works offline. If the file is missing, a monospace system font is used. Event text uses the plain system face so young players can read it.
- **Contrast:** the worst case is the brightest day sky during a solar flare flash. Measured over it, glass text is at least 4.5:1 (see the milestone 5 report in AI-USE.md for the numbers).

## The outpost scene

**Realistic look (milestone 7, the team lead's direction).** The base follows real NASA surface-habitat ideas: an inflatable fabric module with a metal airlock, a shelter berm of piled soil (regolith) for radiation protection, flat solar arrays on low frames, a greenhouse tube and a dish on a tripod mast. Everything is shaded from one Sun direction, has a soft contact shadow, and casts a shadow away from the Sun (short by day, long at dusk, none at night). The whole base is lit together by a cheap color filter for dusk, night and dust storms; window lights are drawn outside it so they stay bright. Haze makes the far land pale, dust motes drift in the air, and the daytime Sun is drawn about two-thirds as wide as it would look from Earth (`sunSizeFromMars` in `data/numbers.js`). The crew wear suits with backpacks, gloves and boots, and gold-tinted visors that reflect the sky; there are no faces. Tired crews slump; exhausted crews stretch one arm up.

**Real Mars behind the base (milestone 8, the team lead's direction).** Two photos taken by NASA's Curiosity rover in Gale Crater sit behind the drawn base. The team lead approved downloading them on Nov 14, 2026.

| Used for | NASA photo | Credit | What we changed |
|---|---|---|---|
| Day, and darkened as the mountain's outline at night | [Mount Sharp Panorama in White-Balanced Colors, PIA16768](https://science.nasa.gov/photojournal/mount-sharp-panorama-in-white-balanced-colors/) | NASA/JPL-Caltech/MSSS | Sky removed, caption strip cropped off, far ends faded, shrunk to 76 KB |
| Evening card | [Sunset in Mars' Gale Crater, PIA19400](https://science.nasa.gov/photojournal/sunset-in-mars-gale-crater/) | NASA/JPL-Caltech/MSSS/Texas A&M Univ. | Bottom cropped, top and left edges faded, shrunk to 27 KB |

- **Why the day sky is still drawn.** NASA white-balanced the mountain photo to show the rocks as they would look under Earth's light. That makes its sky blue like Earth's, which is not how Mars looks to the eye. So only the mountain is used, and the game draws its own dusty sky (an artistic choice).
- **The sunset is real.** The blue glow and the Sun at dusk are in the photo, not drawn. That photo was taken zoomed in, so its Sun looks larger than the drawn daytime Sun.
- **Two directions.** The two photos look in different directions from the rover, so the far land changes shape between day and evening.
- **Matching.** The drawn ground and the light on the base at dusk use colors measured from the photos.
- **Rules followed.** NASA and JPL allow their photos to be used without asking, with the credit line, as long as no endorsement is implied. There are no NASA or JPL logos in the game. Both photos are also credited on the Sources screen.
- **To change or remove a photo:** edit `BACKDROP` in `js/scene.js`. With `src` set to `""`, the drawn sky and ridges come back. `tools/make-backdrops.py` records exactly how the two files were made.

The base, crew and ground are drawn in code by `js/scene.js` (SVG shapes, no generated images). `js/ui.js` decides what it should show from the game state; the scene never changes the game. The framing, palette and crew poses follow art direction from Pixel, the team's AI designer bot.

| What happens in the game | What the picture shows |
|---|---|
| Day phase | Warm dusty sky (an artistic choice), the real Mount Sharp behind the base, pale Sun, three astronauts: one brushing the panels, one carrying a crate, one pointing at the dish |
| Evening card | The real NASA photo of a blue Mars sunset behind the base (see `marsSunsetBlue` in `data/numbers.js`) |
| Night | Dark sky, stars in three sizes, the mountain as a dark outline; the only warm light is the habitat windows, spilling onto the ground; sleeping heads with a "z Z" |
| Night card (like the 3 a.m. pump fault) | Red alarm light on the ground, red roof beacon, one crew member at the door with a torch, two still asleep |
| Crew getting tired / very tired (fatigue on) | Astronauts slump; when very tired a small yawn shows in the visor |
| Storm shelter chosen | A shield dome over the habitat, crew inside |
| Real solar flare card | One soft 600 ms flash (never repeated), a bright ring around the Sun, pink-tinted sky |
| Real particle storm card | Same, plus fast streaks across the sky |
| Dust cards | Dust on the panels; dust storms hide the far mountain first, then a light haze |
| Greenhouse lights off | Dark greenhouse, dull plants (at night the greenhouse glows green) |
| A question to Earth is waiting | The dish sends signal waves until the answer arrives; its small red light blinks every 3 s |
| Fatigue switched off | No sleeping, slumping or yawning, and no crew chip |

Choice-driven picture changes are listed per choice in `data/events.js` as `scene: { panelsDusty: 1 }` and so on. They only change the drawing.

Motion: the sky fades between day, sunset and night; stars twinkle slowly; dust drifts on the title screen; new cards slide in; meters slide and show "+5" or "-12"; each new sol shows a "Sol 4" title with its May 2024 space weather date. Anyone whose computer asks for reduced motion gets no movement and no flash. The picture has a short text alternative, and everything it shows is also in the text.

Sound: off by default. Menu, then Sound, turns on short tones made in code. No sound files.

Meters: each has a drawn icon, a sliding bar and a number. When a meter is low it gets a "Low" tag, a striped bar and a lighter red number, so the warning never depends on color alone.

The end screen is a mission report: a stamp, the sol reached, a chart of the three meters over the mission, what used the meter up, and the real science with its source.

## How a sol works

1. **Day.** Sometimes a card appears first: a real solar event from the NASA data, a random event, or an answer from Earth. Then you plan the work day: short shift, full shift or overtime. More work makes more power, life support and shielding, and makes the crew more tired. Each plan shows its chance of a repair mistake.
2. **Night.** Sometimes a night card appears (like the 3 a.m. pump fault). Then bedtime: keep Earth hours (the body clock slips 40 minutes) or shift bedtime to match the Sun (one rough night).
3. Next sol. Survive sol 30 to win. If a meter hits 0, the mission ends and the end screen shows what used it up and the real science behind it.

## The event deck

23 two-choice cards, plus the real solar storm cards from NASA DONKI. Every choice costs something; `tools/playtest.js` checks that. "Fatigue" = yes means the card is about crew sleep and is left out when the fatigue switch is off.

| id | phase | fatigue | choice 1 | choice 2 |
|---|---|---|---|---|
| `pump_fault` | night | yes | Wake the crew and fix it now | Let them sleep. Fix it at sunrise |
| `cannot_sleep` | night | yes | Give them tomorrow morning off | They push through tomorrow |
| `cold_night` | night |  | Turn the heaters up | Heaters low, everyone in sleeping bags |
| `noisy_fan` | night |  | Get up and fix it | Switch the fan off until morning |
| `homesick` | night | yes | Record a video message home | Stay up talking with the crew |
| `battery_hot` | night | yes | Wake someone to cool it down | Shut that battery off until morning |
| `roof_ping` | night |  | Go out and check now | Check it in the morning |
| `power_spike` | night |  | Find the problem now | Turn off everything we can until morning |
| `snoring` | night | yes | Move them to the storage room | Earplugs and hope for the best |
| `dusty_panels` | day |  | Send two crew out to sweep | Leave the dust for now |
| `greenhouse_lights` | day |  | Fix the wiring ourselves now | Ask Earth how to fix it |
| `water_leak` | day |  | Patch it now | Shut the pipe off and ask Earth |
| `dust_storm_coming` | day |  | Fill the batteries: greenhouse lights off today | Keep everything running |
| `airlock_seal` | day |  | Replace the seal now | Tape it and go outside less |
| `rover_stuck` | day |  | Walk out and dig it free | Ask Earth for a driving plan |
| `antenna_drift` | day |  | Climb up and aim it | Use the backup radio |
| `new_sprouts` | day |  | Give them extra light and care | Normal care only |
| `panel_crack` | day |  | Swap in the spare panel | Keep using the cracked one |
| `water_filter` | day |  | Swap the filter ourselves | Ask Earth which filter to use |
| `greenhouse_mold` | day |  | Clean every leaf today | Pull out the moldy plants |
| `shield_corner` | day |  | Go out and glue it down | Ask Earth for a stronger fix |
| `suit_leak` | day |  | Patch the suit | Share the other suits |
| `food_count` | day |  | Recount everything today | Ask Earth to check their list |

Six cards can "Ask Earth": `greenhouse_lights`, `water_leak`, `rover_stuck`, `water_filter`, `shield_corner`, `food_count`. The answer arrives two phases later (about one sol).

## The fatigue switch

Crew sleep is one module that can be switched off. In `data/numbers.js`:

```js
fatigueEnabled: { value: true, ... }
```

Set it to `false` and the game still plays with three meters, the real NASA solar storms and the delayed messages from Earth:

- tiredness and the body clock stop existing (tiredness stays 0)
- the crew face panel and the start screen's sleep sentence are hidden
- the work plan becomes a choice of focus (greenhouse day, solar panel day, shield repair day) instead of how many hours
- bedtime becomes a plain "Night" card
- cards tagged `fatigue: true` never appear
- `?demo=pump` falls back to a normal start, because the pump fault is a sleep card
- the end screen uses the `noFatigue` wording in `data/outcomes.js`

In `js/engine.js` every place that depends on the switch is marked `FATIGUE MODULE`.

## How the code is organized

```
index.html              the page. Loads the data files, then the engine, then the page code
css/style.css           all the styles. Colors are variables at the top
js/engine.js            the game rules. Knows nothing about the web page, so it can be tested in Node
js/ui.js                draws the screen and handles button presses
js/scene.js             the Mars outpost picture: base, crew and ground drawn with SVG in code, NASA photos behind
images/                 the two NASA photos (cropped and shrunk, credits in js/scene.js and on the Sources screen)
fonts/                  the Orbitron font file and its license
js/sound.js             tiny sound effects made in code with Web Audio (off until turned on)
js/intro.js             the How to play screens
data/intro.js           the How to play words
data/numbers.js         EVERY game number, with kind, status and source
data/events.js          the event deck (23 cards) and the two solar event card templates
data/outcomes.js        end screen words for each way to lose, and for winning
data/space-weather.js   real solar events from NASA DONKI, May 2024 (generated, do not edit)
data/donki-raw/         the full, unedited DONKI responses the snapshot came from
tools/playtest.js       headless test: robot players run the real engine in Node
tools/make-space-weather.py   rebuilds data/space-weather.js from data/donki-raw/
tools/make-backdrops.py       how the two NASA photos were cropped (standard-library Python)
tools/record-demo.mjs         records the self-playing demo tour as a video (needs Chrome and ffmpeg)
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

Real facts used, all checked on 2026-11-14 or 2026-11-15:

- Sol length 24.6597 h and Mars sunlight 43% of Earth's: [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
- Earth to Mars message delay, about 4 to 24 minutes each way: [NASA, Space Communications: 7 Things You Need to Know](https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/)
- Gale Crater air: nights about minus 70 C, days about 0 C (Curiosity, Aug 2012 to Feb 2013): [NASA photojournal PIA16913](https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater)
- Surface radiation 0.67 mSv per day (Curiosity RAD, Aug 2012 to Jun 2013): [NASA news release](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/)
- Sleep 5.98 h in step vs 4.91 h out of step with the Mars day (Phoenix team): [Barger et al. 2012, Sleep 35(10)](https://experts.arizona.edu/en/publications/learning-to-live-on-a-mars-day-fatigue-countermeasures-during-the/)
- Mars sunsets look blue near the Sun (Curiosity, 15 April 2015): [NASA JPL news](https://www.jpl.nasa.gov/news/nasas-curiosity-rover-views-serene-sundown-on-mars/). The game's day and night sky colors are artistic choices, not measurements.
- Solar flares and particle events, May 2024: [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), a saved snapshot, not live. Sol 1 replays 1 May 2024. The events were measured near Earth; placing them over a Mars base is a game simplification, and the game says so.

## Balance and testing

```
node tools/playtest.js
```

It:

- forces every event and tries both choices
- checks that no choice is free, with fatigue on and with it off
- checks that every "learn" line and end-screen fact points at a verified number
- checks every event shows up in normal play, solar events land on the right sols, every "Ask Earth" answer arrives two phases later, and demo mode works
- plays 500 seeded games for each robot player, then the same with fatigue off

It prints `ALL CHECKS PASSED` or the failures.

The robot players are simple rule-following bots written in `tools/playtest.js`, not people. Balance was tuned by changing game-design numbers in `data/numbers.js` and re-running the test until the results matched the targets. Results on 2026-11-15 (500 games each, seeds 1 to 500):

| Robot player | Wins | Median losing sol |
|---|---|---|
| Careful (fatigue on) | 412/500 (82%) | 28 |
| Careless: always overtime, never shelters, never fixes the body clock | 0/500 (0%) | 11 |
| Careful, but never fixes the body clock | 147/500 (29%) | 27 |
| Careful (fatigue off) | 482/500 (96%) | 30 |
| Careless (fatigue off) | 0/500 (0%) | 10 |

Targets were: careful about 80%, careless almost always loses around sol 10, careful-but-ignores-the-clock 25 to 35%. Real players will differ from robots, so these numbers are a starting point for playtesting with people.

## The demo video

Open `index.html?demo=video` and the game plays a 30-second tour by itself, with captions: the title, one work day, the evening card, the 3 a.m. pump fault played both ways (with the next morning's result of each), a real solar flare from the DONKI snapshot, a mission report, and a credits card. It presses the real buttons and uses the real rules with seed 3, so the numbers in the captions are read from the game, not typed in. The tour's steps are at the end of `js/ui.js`.

The submitted video was recorded from that page with `tools/record-demo.mjs` (headless Chrome and ffmpeg, 1280x720, no sound). Nobody appears in it and it was not edited afterward.

## Rebuilding the space weather snapshot

See the comment at the top of `tools/make-space-weather.py` for the two download commands, then run:

```
python3 tools/make-space-weather.py
```
