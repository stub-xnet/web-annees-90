// Sons synthétisés (aucun fichier audio) : clic, ding, modem, démarrage, pop-up, bulle.
const ctx = new AudioContext();
const maitre = ctx.createGain();
maitre.gain.value = 0.35;
maitre.connect(ctx.destination);

function ton(freq, debut, duree, { type = "sine", vol = 0.3, vers } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, debut);
  if (vers) o.frequency.exponentialRampToValueAtTime(vers, debut + duree);
  g.gain.setValueAtTime(vol, debut);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  o.connect(g).connect(maitre);
  o.start(debut);
  o.stop(debut + duree + 0.02);
}

function bruit(debut, duree, { vol = 0.2, filtre = 2000, q = 1 } = {}) {
  const n = Math.floor(ctx.sampleRate * duree);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf;
  f.type = "bandpass"; f.frequency.value = filtre; f.Q.value = q;
  g.gain.setValueAtTime(vol, debut);
  g.gain.linearRampToValueAtTime(0.0001, debut + duree);
  s.connect(f).connect(g).connect(maitre);
  s.start(debut);
}

const SONS = {
  clic(t) { bruit(t, 0.025, { vol: 0.5, filtre: 3500, q: 2 }); },
  bulle(t) { ton(600, t, 0.12, { vers: 1200, vol: 0.2 }); },
  ding(t) {
    ton(1047, t, 0.9, { vol: 0.25 }); ton(2094, t, 0.5, { vol: 0.08 });
    ton(1568, t + 0.12, 1.0, { vol: 0.2 });
  },
  popup(t) {
    ton(784, t, 0.18, { type: "square", vol: 0.08 });
    ton(523, t + 0.16, 0.35, { type: "square", vol: 0.08 });
  },
  gagne(t) {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(f, t + i * 0.1, 0.25, { type: "square", vol: 0.07 }));
  },
  demarrage(t) {
    // nappe montante : accord qui s'ouvre puis petite cloche
    [262, 330, 392, 494, 587].forEach((f, i) => {
      ton(f, t + i * 0.18, 3.2 - i * 0.18, { type: "triangle", vol: 0.12 });
      ton(f * 1.005, t + i * 0.18, 3.2 - i * 0.18, { type: "sine", vol: 0.08 });
    });
    ton(1568, t + 1.0, 1.6, { vol: 0.12 }); ton(2093, t + 1.15, 1.5, { vol: 0.08 });
  },
  modem(t) {
    // numérotation, tonalité de réponse puis grésillement de connexion
    const touches = [[697, 1209], [770, 1336], [852, 1477], [697, 1336], [941, 1336], [770, 1209]];
    touches.forEach(([a, b], i) => { ton(a, t + i * 0.11, 0.08, { vol: 0.08 }); ton(b, t + i * 0.11, 0.08, { vol: 0.08 }); });
    let u = t + 0.8;
    ton(2100, u, 0.7, { vol: 0.07 }); u += 0.75;
    ton(1200, u, 0.25, { type: "square", vol: 0.04 }); ton(2400, u, 0.25, { type: "square", vol: 0.03 }); u += 0.25;
    for (let i = 0; i < 14; i++) {
      bruit(u, 0.09, { vol: 0.12, filtre: 800 + Math.random() * 2500, q: 4 });
      ton(900 + Math.random() * 1800, u, 0.08, { type: "sawtooth", vol: 0.025 });
      u += 0.08;
    }
    bruit(u, 0.6, { vol: 0.1, filtre: 1800, q: 0.7 });
  },
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.cible !== "sons" || !SONS[msg.son]) return;
  ctx.resume().then(() => SONS[msg.son](ctx.currentTime + 0.02));
});
