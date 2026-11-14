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

## Milestone 2 (Nov 15, 2026)

- **Event deck.** An AI assistant wrote 18 new event cards (23 in all) in `data/events.js`, following the team's brief: two choices each, a cost on every choice, plain words for ages 7 to 12.
- **Fatigue switch.** The AI assistant put the crew sleep part of the game behind one switch (`fatigueEnabled` in `data/numbers.js`), so the game also works without it.
- **Balance.** The AI assistant tuned the game-design numbers by running `tools/playtest.js`, which plays 500 games for each robot player, and extended that test to try both choices of every new card.
- **Fact check.** The AI assistant opened NASA's photojournal page PIA16913 and added two verified numbers (Gale Crater night and day air temperatures) to `data/numbers.js`.
- **Docs.** The AI assistant updated `README.md` and added this section.
