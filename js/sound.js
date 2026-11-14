/*
  Sol Shift: tiny sound effects, made on the spot with the Web Audio API.

  NOTE: this code file was written by an AI assistant (Claude). See AI-USE.md.

  No sound files and nothing licensed: each sound is a short tone made in
  code. Sound is OFF until the player turns it on with the Sound button.
*/

var SolShiftSound = (function () {
  "use strict";

  var enabled = false;
  var ctx = null;

  // Browsers only allow audio after a click, so we create it on first use.
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return null; }
      ctx = new AC();
    }
    return ctx;
  }

  // Play one tone. freq in hertz, length in seconds, type = wave shape.
  function tone(freq, length, type, delay, volume) {
    var a = audio();
    if (!a) { return; }
    var start = a.currentTime + (delay || 0);
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  // The sounds the game uses.
  var SOUNDS = {
    choice: function () { tone(520, 0.08, "triangle"); },
    alarm: function () { tone(440, 0.18, "square", 0, 0.04); tone(440, 0.18, "square", 0.3, 0.04); },
    message: function () { tone(660, 0.12, "sine"); tone(880, 0.16, "sine", 0.12); },
    flare: function () { tone(300, 0.5, "sawtooth", 0, 0.03); },
    win: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.25, "triangle", i * 0.15); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.3, "triangle", i * 0.18); }); }
  };

  function play(name) {
    if (!enabled || !SOUNDS[name]) { return; }
    try { SOUNDS[name](); } catch (e) { /* no sound on this browser: the game still works */ }
  }

  function setEnabled(on) {
    enabled = !!on;
    if (enabled) { audio(); }
  }

  return { play: play, setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
