/*
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

var SOL_SHIFT_SPACE_WEATHER = {
  "source": "NASA DONKI (CCMC)",
  "sourceUrl": "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
  "fetchedOn": "2026-11-14",
  "firstDate": "2024-05-01",
  "lastDate": "2024-05-31",
  "flares": [
    {
      "flrID": "2024-05-03T02:11:00-FLR-001",
      "beginTime": "2024-05-03T02:11Z",
      "peakTime": "2024-05-03T02:22Z",
      "classType": "X1.6",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30403/-1"
    },
    {
      "flrID": "2024-05-05T05:47:00-FLR-001",
      "beginTime": "2024-05-05T05:47Z",
      "peakTime": "2024-05-05T06:01Z",
      "classType": "X1.3",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30457/-1"
    },
    {
      "flrID": "2024-05-05T11:41:00-FLR-001",
      "beginTime": "2024-05-05T11:41Z",
      "peakTime": "2024-05-05T11:54Z",
      "classType": "X1.2",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30461/-1"
    },
    {
      "flrID": "2024-05-06T05:38:00-FLR-001",
      "beginTime": "2024-05-06T05:38Z",
      "peakTime": "2024-05-06T06:35Z",
      "classType": "X4.5",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30484/-1"
    },
    {
      "flrID": "2024-05-08T01:33:00-FLR-001",
      "beginTime": "2024-05-08T01:33Z",
      "peakTime": "2024-05-08T01:41Z",
      "classType": "X1.0",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30548/-1"
    },
    {
      "flrID": "2024-05-08T04:37:00-FLR-001",
      "beginTime": "2024-05-08T04:37Z",
      "peakTime": "2024-05-08T05:09Z",
      "classType": "X1.0",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30551/-1"
    },
    {
      "flrID": "2024-05-08T21:08:00-FLR-001",
      "beginTime": "2024-05-08T21:08Z",
      "peakTime": "2024-05-08T21:40Z",
      "classType": "X1.0",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30601/-1"
    },
    {
      "flrID": "2024-05-09T08:45:00-FLR-001",
      "beginTime": "2024-05-09T08:45Z",
      "peakTime": "2024-05-09T09:13Z",
      "classType": "X2.2",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30605/-1"
    },
    {
      "flrID": "2024-05-09T17:23:00-FLR-001",
      "beginTime": "2024-05-09T17:23Z",
      "peakTime": "2024-05-09T17:44Z",
      "classType": "X1.1",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30634/-1"
    },
    {
      "flrID": "2024-05-10T06:27:00-FLR-001",
      "beginTime": "2024-05-10T06:27Z",
      "peakTime": "2024-05-10T06:54Z",
      "classType": "X3.9",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30666/-1"
    },
    {
      "flrID": "2024-05-11T01:10:00-FLR-001",
      "beginTime": "2024-05-11T01:10Z",
      "peakTime": "2024-05-11T01:23Z",
      "classType": "X5.8",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1"
    },
    {
      "flrID": "2024-05-11T11:15:00-FLR-001",
      "beginTime": "2024-05-11T11:15Z",
      "peakTime": "2024-05-11T11:44Z",
      "classType": "X1.5",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30722/-1"
    },
    {
      "flrID": "2024-05-12T16:11:00-FLR-001",
      "beginTime": "2024-05-12T16:11Z",
      "peakTime": "2024-05-12T16:26Z",
      "classType": "X1.0",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30760/-1"
    },
    {
      "flrID": "2024-05-14T02:03:00-FLR-001",
      "beginTime": "2024-05-14T02:03Z",
      "peakTime": "2024-05-14T02:09Z",
      "classType": "X1.7",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30832/-1"
    },
    {
      "flrID": "2024-05-14T12:40:00-FLR-001",
      "beginTime": "2024-05-14T12:40Z",
      "peakTime": "2024-05-14T12:55Z",
      "classType": "X1.2",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30837/-1"
    },
    {
      "flrID": "2024-05-14T16:46:00-FLR-001",
      "beginTime": "2024-05-14T16:46Z",
      "peakTime": "2024-05-14T16:51Z",
      "classType": "X8.7",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30849/-1"
    },
    {
      "flrID": "2024-05-15T08:18:00-FLR-001",
      "beginTime": "2024-05-15T08:18Z",
      "peakTime": "2024-05-15T08:37Z",
      "classType": "X3.4",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30879/-1"
    },
    {
      "flrID": "2024-05-15T14:20:00-FLR-001",
      "beginTime": "2024-05-15T14:20Z",
      "peakTime": "2024-05-15T14:38Z",
      "classType": "X2.9",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30900/-1"
    },
    {
      "flrID": "2024-05-27T06:49:00-FLR-001",
      "beginTime": "2024-05-27T06:49Z",
      "peakTime": "2024-05-27T07:08Z",
      "classType": "X2.8",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/31158/-1"
    },
    {
      "flrID": "2024-05-29T14:11:00-FLR-001",
      "beginTime": "2024-05-29T14:11Z",
      "peakTime": "2024-05-29T14:37Z",
      "classType": "X1.4",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/31185/-1"
    },
    {
      "flrID": "2024-05-31T21:52:00-FLR-001",
      "beginTime": "2024-05-31T21:52Z",
      "peakTime": "2024-05-31T22:03Z",
      "classType": "X1.1",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/31248/-1"
    }
  ],
  "particleStorms": [
    {
      "sepID": "2024-05-09T13:59:00-SEP-001",
      "eventTime": "2024-05-09T13:59Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1"
    },
    {
      "sepID": "2024-05-09T14:25:00-SEP-001",
      "eventTime": "2024-05-09T14:25Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30610/-1"
    },
    {
      "sepID": "2024-05-10T12:59:00-SEP-001",
      "eventTime": "2024-05-10T12:59Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30675/-1"
    },
    {
      "sepID": "2024-05-10T13:02:00-SEP-001",
      "eventTime": "2024-05-10T13:02Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30676/-1"
    },
    {
      "sepID": "2024-05-10T13:35:00-SEP-001",
      "eventTime": "2024-05-10T13:35Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30677/-1"
    },
    {
      "sepID": "2024-05-10T14:50:00-SEP-001",
      "eventTime": "2024-05-10T14:50Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30684/-1"
    },
    {
      "sepID": "2024-05-11T02:10:00-SEP-001",
      "eventTime": "2024-05-11T02:10Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1"
    },
    {
      "sepID": "2024-05-11T04:07:00-SEP-001",
      "eventTime": "2024-05-11T04:07Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30717/-1"
    },
    {
      "sepID": "2024-05-13T12:44:00-SEP-001",
      "eventTime": "2024-05-13T12:44Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30811/-1"
    },
    {
      "sepID": "2024-05-13T13:10:00-SEP-001",
      "eventTime": "2024-05-13T13:10Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30807/-1"
    },
    {
      "sepID": "2024-05-13T14:00:00-SEP-001",
      "eventTime": "2024-05-13T14:00Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30817/-1"
    },
    {
      "sepID": "2024-05-13T16:19:00-SEP-001",
      "eventTime": "2024-05-13T16:19Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30820/-1"
    },
    {
      "sepID": "2024-05-13T18:07:00-SEP-001",
      "eventTime": "2024-05-13T18:07Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30824/-1"
    },
    {
      "sepID": "2024-05-13T18:07:00-SEP-002",
      "eventTime": "2024-05-13T18:07Z",
      "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30825/-1"
    }
  ]
};

// Let Node.js load this file too (used by tools/playtest.js). Browsers ignore this.
if (typeof module !== "undefined") { module.exports = SOL_SHIFT_SPACE_WEATHER; }
