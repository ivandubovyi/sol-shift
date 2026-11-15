// Sol Shift: record the self-playing demo tour (index.html?demo=video) as picture frames.
//
// NOTE: this script was written by an AI assistant (Claude). See AI-USE.md.
//
// It needs Node 22 or newer, Google Chrome and ffmpeg. Nobody appears in the
// video and there is no sound: the game plays by itself with captions.
//
// 1. Start Chrome without a window, listening for this script:
//      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
//        --remote-debugging-port=9333 --user-data-dir=/tmp/sol-shift-chrome about:blank
// 2. Record about 30 seconds of frames (give the full address of index.html):
//      node tools/record-demo.mjs 9333 /tmp/sol-shift-frames "file:///full/path/to/index.html?demo=video" 30
//    This also writes list.txt, which tells ffmpeg how long each frame was on screen.
// 3. Turn the frames into a 1280x720 mp4 (the first half second is skipped while the page loads):
//      cd /tmp/sol-shift-frames
//      ffmpeg -f concat -safe 0 -i list.txt -ss 0.45 -t 29.9 -vf "fps=30,format=yuv420p" \
//        -c:v libx264 -preset slow -crf 18 -movflags +faststart -an sol-shift-demo-30s.mp4
// 4. Close that Chrome when done.
import fs from "node:fs";
const [port, dir, url, seconds] = process.argv.slice(2);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find(t => t.type === "page").webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const frames = []; const errors = []; let loadedAt = null;
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === "Page.screencastFrame") {
    const n = frames.length;
    fs.writeFileSync(`${dir}/f${String(n).padStart(5, "0")}.jpg`, Buffer.from(msg.params.data, "base64"));
    frames.push({ n, t: msg.params.metadata.timestamp });
    send("Page.screencastFrameAck", { sessionId: msg.params.sessionId });
  }
  if (msg.method === "Page.loadEventFired") loadedAt = msg.params.timestamp;
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
};
await new Promise(r => ws.onopen = r);
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "about:blank" });
await new Promise(r => setTimeout(r, 500));
const wall0 = Date.now();
await send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
frames.length = 0; loadedAt = null;
await send("Page.navigate", { url });
const start = Date.now();
while (Date.now() - start < (+seconds + 1.5) * 1000) {
  await new Promise(r => setTimeout(r, 250));
  const done = await send("Runtime.evaluate", { expression: "document.body && document.body.getAttribute('data-demo-done')", returnByValue: true });
  if (done.result && done.result.result && done.result.result.value === "yes") break;
}
await new Promise(r => setTimeout(r, 300));
await send("Page.stopScreencast");
// list.txt: one line per frame with how long it stayed on screen.
let listText = "";
frames.forEach((f, i) => {
  const name = `f${String(f.n).padStart(5, "0")}.jpg`;
  const seconds = i + 1 < frames.length ? frames[i + 1].t - f.t : 0.04;
  listText += `file '${name}'\nduration ${seconds.toFixed(5)}\n`;
});
if (frames.length) listText += `file 'f${String(frames.at(-1).n).padStart(5, "0")}.jpg'\n`;
fs.writeFileSync(`${dir}/list.txt`, listText);
fs.writeFileSync(`${dir}/frames.json`, JSON.stringify({ frames, errors, wallSeconds: (Date.now() - start) / 1000 }));
console.log(JSON.stringify({ frames: frames.length, first: frames[0]?.t, last: frames.at(-1)?.t, span: frames.length ? frames.at(-1).t - frames[0].t : 0, errors, wallSeconds: (Date.now() - start) / 1000 }));
ws.close(); process.exit(0);
