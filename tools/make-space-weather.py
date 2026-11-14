"""
Sol Shift: turn the saved NASA DONKI responses into data/space-weather.js.

NOTE: this script was written by an AI assistant (Claude). See AI-USE.md.

Step 1 (already done once, on 2026-11-14) - download the raw data:
  curl -L "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-01&endDate=2024-05-31" \
       -o data/donki-raw/FLR-2024-05-01_2024-05-31.json
  curl -L "https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-05-31&api_key=DEMO_KEY" \
       -o data/donki-raw/SEP-2024-05-01_2024-05-31.json
  (The api.nasa.gov FLR endpoint returned 404 that day, so flares come from
   the CCMC DONKI web service directly. Same database.)

Step 2 - run this script from the sol-shift folder:
  python3 tools/make-space-weather.py

It keeps only X-class flares and all SEP events, and copies their fields
exactly as DONKI gives them. Nothing is invented or rounded.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")

with open(os.path.join(DATA, "donki-raw", "FLR-2024-05-01_2024-05-31.json")) as f:
    all_flares = json.load(f)
with open(os.path.join(DATA, "donki-raw", "SEP-2024-05-01_2024-05-31.json")) as f:
    all_seps = json.load(f)

# Keep the fields the game shows. classType starting with "X" = strongest flares.
flares = [
    {k: x[k] for k in ("flrID", "beginTime", "peakTime", "classType", "link")}
    for x in all_flares
    if x["classType"].startswith("X")
]
seps = [{k: x[k] for k in ("sepID", "eventTime", "link")} for x in all_seps]

snapshot = {
    "source": "NASA DONKI (CCMC)",
    "sourceUrl": "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    "fetchedOn": "2026-11-14",
    "firstDate": "2024-05-01",
    "lastDate": "2024-05-31",
    "flares": flares,
    "particleStorms": seps,
}

HEADER = """/*
  Sol Shift: real space weather snapshot from NASA DONKI.
  GENERATED FILE. Do not edit by hand. Made by tools/make-space-weather.py.

  NOTE: the script that made this file was written by an AI assistant
  (Claude), see AI-USE.md. The DATA was not written by AI: it is copied from
  NASA's DONKI service, unchanged except for keeping fewer fields.

  What it is:
    A SNAPSHOT (not live data) of real solar events recorded in May 2024 by
    NASA's Space Weather Database Of Notifications, Knowledge, Information
    (DONKI), run by the Community Coordinated Modeling Center (CCMC).
    - flares: every X-class solar flare (the strongest class) in the FLR list
    - particleStorms: every solar energetic particle (SEP) event in the SEP list
  The full unedited responses are saved in data/donki-raw/.

  How the game uses it:
    Sol 1 of the mission replays 1 May 2024, sol 2 replays 2 May, and so on.
    The flares were measured from near Earth. Putting that same weather over
    a Mars base is a game simplification, and the game says so on screen.
*/

var SOL_SHIFT_SPACE_WEATHER = """

FOOTER = """;

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SOL_SHIFT_SPACE_WEATHER; }
"""

with open(os.path.join(DATA, "space-weather.js"), "w") as f:
    f.write(HEADER + json.dumps(snapshot, indent=2) + FOOTER)

print("Wrote data/space-weather.js:", len(flares), "X-class flares,", len(seps), "SEP events")
