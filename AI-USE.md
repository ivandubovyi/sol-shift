# How AI was used in Sol Shift

The NASA Space Apps rules allow AI ("SI") tools but ask teams to say how they were used, and to mark AI-generated code and data in descriptive text and metadata. This file is that record. It should be kept up to date as the project changes.

## Tools

- **Claude (by Anthropic)**, used through Claude Code. The team lead runs several Claude assistants with different jobs (planning, research, coding). All of them are the same AI tool.

## What AI did

- **Brainstorming and planning (before the event, Nov 11, 2026).** AI assistants listed and compared possible project ideas for the Philadelphia event, recommended Sol Shift for Challenge #3, and wrote a plan for the game. No code or assets were made before the event.
- **Research (Nov 11 and Nov 14).** An AI assistant found sources for the real-world numbers (Mars day length, radiation, sleep studies) and read the official challenge page and guides.
- **Code (Nov 14, milestone 1).** An AI assistant wrote all of the code in this repository from the team's spec: `index.html`, `css/style.css`, `js/engine.js`, `js/ui.js`, every file in `data/` except the NASA data itself, and everything in `tools/`. It also wrote this file and `README.md`. Each code file says so in a comment at the top, and `index.html` says so in its metadata.
- **Fact checks (Nov 14).** The AI assistant opened the NASA and journal pages for each real-world number used in the game and recorded the link next to the number in `data/numbers.js`.
- **Data download (Nov 14).** The AI assistant downloaded the solar event data from NASA DONKI. The data itself is NASA's, copied without changes except for keeping fewer fields (see `tools/make-space-weather.py` and `data/donki-raw/`).
- **Testing.** The AI assistant wrote `tools/playtest.js`, which plays the game with robot players, and played the game in a browser.

## What AI did not do

- No AI-generated images, audio or video are used. All shapes are CSS or SVG written in code. No NASA logos or branding.
- No numbers were presented as NASA facts unless they were checked on the source page. Balance numbers are labeled "game-design" in `data/numbers.js`.

## What the team lead decided

- Picked Sol Shift as the project.
- Approved building milestone 1.

<!-- Team lead: add every later decision you make yourself here (for example balance changes, event ideas, wording, what to cut), and anything you write or change by hand. Keep it factual. -->

## Milestone 2 (Nov 14, 2026)

- **Event deck.** An AI assistant wrote 18 new event cards (23 in all) in `data/events.js`, following the team's brief: two choices each, a cost on every choice, plain words for ages 7 to 12.
- **Fatigue switch.** The AI assistant put the crew sleep part of the game behind one switch (`fatigueEnabled` in `data/numbers.js`), so the game also works without it.
- **Balance.** The AI assistant tuned the game-design numbers by running `tools/playtest.js`, which plays 500 games for each robot player, and extended that test to try both choices of every new card.
- **Fact check.** The AI assistant opened NASA's photojournal page PIA16913 and added two verified numbers (Gale Crater night and day air temperatures) to `data/numbers.js`.
- **Docs.** The AI assistant updated `README.md` and added this section.

## Milestone 3 (Nov 14, 2026)

- **How to play intro.** An AI assistant wrote the three intro screens: the words in `data/intro.js` and the code in `js/intro.js`. It also connected them to the start screen and footer in `index.html` and `js/ui.js`, and added the styles in `css/style.css`. The small drawings are SVG shapes written in code. No images were generated.
- **Tests and docs.** The AI assistant added intro checks to `tools/playtest.js` and an intro section to `README.md`.

## Milestone 4 (Nov 14, 2026)

- **Look and feel.** An AI assistant redesigned the game screen around a Mars outpost picture. It wrote `js/scene.js` (the picture, drawn with SVG shapes in code) and `js/sound.js` (short tones made in code, off by default). It also rewrote `css/style.css` and updated `index.html` and `js/ui.js` for the gauges, the sol title, the card animations and the mission report end screen.
- **No generated images or sounds.** There are no image files, no AI-generated pictures, no sound files and no NASA logos. Every shape and tone is written in code.
- **Fact check.** The AI assistant opened a NASA JPL news page and a NASA Science page about Curiosity's blue sunset, and added a verified `marsSunsetBlue` entry to `data/numbers.js`, used on the evening card.
- **Game rules unchanged.** No balance numbers were changed. The evening card's clock label and its new fact line are wording changes only.
- **Tests and docs.** The AI assistant added checks to `tools/playtest.js` and a scene section to `README.md`.

## Milestone 5 (Nov 14, 2026)

- **Who decided what.** The full-screen layout and the "glass, futuristic" look for the meters and panels were the team lead's direction. The scene composition, palette, crew poses and polish came from Pixel, the team's AI designer bot. An AI assistant (Claude) wrote all of the code.
- **Code.** The AI assistant rewrote `js/scene.js` (closer camera, three land bands, a larger habitat, bigger astronauts with poses, night lighting, a night watch with a torch), `css/style.css` (full-screen layout, glass panels, system-font HUD type) and `index.html`, and updated `js/ui.js` (camera framing, menu, mission log drawer, full screen button). It shortened the text of the 3 a.m. pump fault card so it fits on a phone.
- **No downloads, no generated images.** No fonts, images or sounds are downloaded or generated. Everything is drawn in code with system fonts.
- **Game rules unchanged.** No balance numbers were changed; `tools/playtest.js` gives the same results as before.

## Milestone 6 (Nov 14, 2026)

- **Visual fixes.** An AI assistant (Claude) changed the code for three fixes the team asked for: the night-watch torch is now a soft warm cone aimed at a pump hatch on the ground, the empty ground got quiet detail (dune lines, tracks to the door, a power cable, small rocks, a darker front edge) and a lower horizon on wide screens, and the crew is drawn a little larger with a closer phone camera. All drawn in code; no images or fonts were added. No balance numbers were changed.

## Milestone 7 (Nov 14, 2026)

- **Realistic look.** The move from a cartoon look to a realistic Mars was the team lead's direction. An AI assistant (Claude) redrew the scene in code: a NASA-style inflatable habitat with a regolith berm, flat solar arrays, a greenhouse tube and a dish on a mast, one-direction lighting with cast and contact shadows, distance haze, drifting dust motes, a dust-storm brown-out, and suited crew with reflective visors and no faces. All of the art is code-drawn SVG and CSS. No images were downloaded or generated, and no fonts were added.
- **Research.** The AI assistant read NASA pages and checked file sizes (without downloading) for possible NASA photo backdrops, and added a verified fact about how big the Sun looks from Mars. A `BACKDROP` setting in `js/scene.js` is ready for a photo if the team approves one.
- **Game rules unchanged.** No balance numbers were changed.

## Milestone 8 (Nov 14, 2026)

- **Real Mars photos.** The team lead asked for the game to feel like the real world and approved three downloads personally on Nov 14, 2026: two NASA photos and one font. An AI assistant (Claude) downloaded them from the official pages, looked at each file, and wired them in.
  - `images/mars-day-PIA16768.webp` is from "Mount Sharp Panorama in White-Balanced Colors" (PIA16768), credit NASA/JPL-Caltech/MSSS. The AI assistant removed the sky (NASA's white-balancing makes it Earth-blue), cropped off the caption strip and faded the far ends. The game darkens the same photo for the night outline.
  - `images/mars-dusk-PIA19400.webp` is from "Sunset in Mars' Gale Crater" (PIA19400), credit NASA/JPL-Caltech/MSSS/Texas A&M Univ. The AI assistant cropped the bottom and faded the top and left edges.
  - Both are real photographs, not AI-generated. No pixels were painted or generated. `tools/make-backdrops.py` (written by the AI assistant) records the exact steps. No NASA or JPL logos are used.
- **Font.** `fonts/Orbitron-latin.woff2` is the Orbitron font from Google Fonts (SIL Open Font License 1.1, license text in `fonts/Orbitron-OFL.txt`). It is used for labels and numbers only.
- **Matching pass.** The AI assistant changed the drawn ground colors and the dusk lighting to colors measured from the photos, hid the drawn Sun and far ridge where a photo replaces them, put spaces in the sol counter ("1 / 30") so it reads clearly in the new font, and added the photo credits to the Sources screen and `README.md`.
- **Image rules check.** The AI assistant read the JPL Image Use Policy and NASA's Images and Media page: the photos may be used without prior permission, with the credit line, and without implying endorsement.
- **This replaces two earlier statements.** "All shapes are CSS or SVG written in code" and "No fonts, images or sounds are downloaded" were true when written. From this milestone the game also contains the two NASA photos and the one font listed above. There are still no AI-generated images, audio or video.
- **Dates corrected.** The headings for milestones 2 to 7 above first said Nov 15, 2026 by mistake. They were corrected to Nov 14, 2026, the date of every commit in the git history. No other words in those entries were changed.
- **Game rules unchanged.** No balance numbers were changed.
