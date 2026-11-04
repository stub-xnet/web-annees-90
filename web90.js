// Pose data-web90 sur <html> ; le style est dans web90.css.
// En mode grossier, le cadre principal ajoute : bandeau, traînée d'étoiles,
// fausses pop-ups, assistant Disquette et sons.
const racine = document.documentElement;
const principal = window === window.top;
const img = (nom) => chrome.runtime.getURL("images/" + nom);
const jouer = (son) => { try { chrome.runtime.sendMessage({ jouer: son }); } catch (e) {} };

let mode = "off";
let demarre = false;

// Sablier jusqu'à la fin du chargement
racine.classList.add("web90-charge");
const finCharge = () => racine.classList.remove("web90-charge");
window.addEventListener("load", finCharge, { once: true });
setTimeout(finCharge, 8000);

function appliquer(nouveau) {
  mode = nouveau;
  if (mode === "off") racine.removeAttribute("data-web90");
  else racine.setAttribute("data-web90", mode);
  if (!principal) return;
  const grossier = mode === "grossier";
  bandeau(grossier);
  disquette(grossier);
  if (grossier && !demarre) {
    demarre = true;
    if (document.readyState === "loading") jouer("modem");
    programmerPopup();
  }
}

function quandBody(fn) {
  if (document.body) fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

// Fond étoilé si le site écrit en clair, nuages sinon
quandBody(() => {
  const c = getComputedStyle(document.body).color.match(/\d+/g) || [0, 0, 0];
  const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  racine.setAttribute("data-web90-fond", lum > 0.55 ? "sombre" : "clair");
});

/* ---------- Bandeau « en construction » ---------- */
function bandeau(visible) {
  const ancien = document.getElementById("web90-bandeau");
  if (!visible) { ancien?.remove(); return; }
  if (ancien || sessionStorage.getItem("web90-ferme")) return;
  quandBody(() => {
    if (document.getElementById("web90-bandeau")) return;
    const b = document.createElement("div");
    b.id = "web90-bandeau";
    const n = String(Math.floor(Math.random() * 999999)).padStart(7, "0");
    b.innerHTML =
      `<span class="web90-chantier">EN CONSTRUCTION</span>` +
      `<img src="${img("chantier.gif")}" alt="">` +
      `<img src="${img("globe.gif")}" alt="">` +
      `<span class="web90-defile"><span>*** Bienvenue sur ma page !!! *** Meilleur affiche avec Netscape Navigator en 800x600 *** ` +
      `Signez mon livre d'or !!! *** Cette page a ete faite avec le Bloc-notes *** Ajoutez-moi a vos favoris !!! ***</span></span>` +
      `<span class="web90-compteur" title="Visiteurs">${[...n].map((d) => `<b>${d}</b>`).join("")}</span>` +
      `<span class="web90-ecrire"><img src="${img("lettre.gif")}" alt="">Ecrivez-moi !</span>` +
      `<button title="Fermer">X</button>`;
    b.querySelector("button").onclick = () => {
      sessionStorage.setItem("web90-ferme", "1");
      b.remove();
    };
    racine.appendChild(b);
  });
}

/* ---------- Traînée d'étoiles derrière la souris ---------- */
const COULEURS = ["#ff0000", "#ffd800", "#00ff00", "#00ffff", "#ff00ff", "#ffffff"];
let derniereEtoile = 0;
if (principal) {
  window.addEventListener("mousemove", (e) => {
    if (mode !== "grossier") return;
    const t = performance.now();
    if (t - derniereEtoile < 35) return;
    derniereEtoile = t;
    const s = document.createElement("span");
    s.className = "web90-etoile";
    s.textContent = Math.random() < 0.5 ? "✦" : "*";
    s.style.left = e.clientX + "px";
    s.style.top = e.clientY + "px";
    s.style.color = COULEURS[Math.floor(Math.random() * COULEURS.length)];
    s.style.setProperty("--dx", (Math.random() * 30 - 15) + "px");
    racine.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }, { passive: true });
}

/* ---------- Sons : clics et envois de formulaire ---------- */
window.addEventListener("mousedown", () => { if (mode === "grossier") jouer("clic"); }, true);
window.addEventListener("submit", () => { if (mode === "grossier") jouer("ding"); }, true);

/* ---------- Fenêtres Windows 95 (pop-ups et assistant) ---------- */
function fenetre(titre, contenu, boutons) {
  const f = document.createElement("div");
  f.className = "web90-fenetre";
  f.innerHTML =
    `<div class="web90-titre"><span>${titre}</span><button class="web90-x">X</button></div>` +
    `<div class="web90-corps">${contenu}</div>` +
    `<div class="web90-boutons">${boutons.map((b, i) => `<button data-i="${i}">${b.texte}</button>`).join("")}</div>`;
  f.style.left = Math.round(40 + Math.random() * Math.max(0, innerWidth - 460)) + "px";
  f.style.top = Math.round(40 + Math.random() * Math.max(0, innerHeight - 320)) + "px";
  f.querySelector(".web90-x").onclick = () => f.remove();
  f.querySelectorAll(".web90-boutons button").forEach((b) => {
    b.onclick = () => { f.remove(); boutons[b.dataset.i].action?.(); };
  });
  // déplacement par la barre de titre
  const barre = f.querySelector(".web90-titre");
  barre.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    const dx = e.clientX - f.offsetLeft, dy = e.clientY - f.offsetTop;
    const bouger = (m) => { f.style.left = m.clientX - dx + "px"; f.style.top = m.clientY - dy + "px"; };
    const lacher = () => { removeEventListener("mousemove", bouger); removeEventListener("mouseup", lacher); };
    addEventListener("mousemove", bouger);
    addEventListener("mouseup", lacher);
    e.preventDefault();
  });
  racine.appendChild(f);
  return f;
}

const POPUPS = [
  { titre: "FELICITATIONS !!!", texte: "Vous etes le <b>1 000 000eme</b> visiteur !!!<br>Cliquez sur OK pour recuperer votre <b>PRIX</b> !!!", ok: "Recuperer" },
  { titre: "Vous avez gagne !!!", texte: "Vous avez gagne un <b>ordinateur Pentium 166 MHz</b> avec lecteur CD-ROM !!!", ok: "Je le veux" },
  { titre: "Attention", texte: "Votre ordinateur fonctionne a <b>12 %</b> de sa vitesse.<br>Telechargez plus de RAM maintenant !!!", ok: "Telecharger" },
  { titre: "Livre d'or", texte: "Vous n'avez pas encore signe mon <b>livre d'or</b> !!!<br>Ca me ferait trop plaisir :-)", ok: "Signer" },
];

function programmerPopup() {
  setTimeout(async () => {
    if (mode !== "grossier" || document.hidden) return programmerPopup();
    const { dernierePopup = 0 } = await chrome.storage.local.get("dernierePopup");
    if (Date.now() - dernierePopup < 8 * 60 * 1000) return;
    chrome.storage.local.set({ dernierePopup: Date.now() });
    const p = POPUPS[Math.floor(Math.random() * POPUPS.length)];
    jouer("popup");
    fenetre(p.titre, `<img src="${img("nouveau.gif")}" alt=""><p>${p.texte}</p>`, [
      { texte: p.ok, action: () => {
        jouer("gagne");
        fenetre("Ha ! Ha !", `<p>C'etait une blague !!! :-P<br>Bienvenue sur le Web !</p>`, [{ texte: "OK" }]);
      } },
      { texte: "Annuler" },
    ]);
  }, 20000 + Math.random() * 40000);
}

/* ---------- Disquette, l'assistant ---------- */
const DISQUETTE_SVG = `
<svg viewBox="0 0 64 72" width="64" height="72" shape-rendering="crispEdges">
  <path d="M4 4h48l8 8v48H4z" fill="#1c2a8c" stroke="#000" stroke-width="2"/>
  <rect x="16" y="4" width="30" height="18" fill="#b8b8b8" stroke="#000" stroke-width="2"/>
  <rect x="34" y="7" width="7" height="12" fill="#1c2a8c"/>
  <rect x="10" y="30" width="44" height="28" fill="#fff" stroke="#000" stroke-width="2"/>
  <g class="web90-yeux">
    <rect x="18" y="35" width="10" height="12" fill="#fff" stroke="#000" stroke-width="2"/>
    <rect x="36" y="35" width="10" height="12" fill="#fff" stroke="#000" stroke-width="2"/>
    <rect class="web90-pupille" x="22" y="40" width="4" height="5" fill="#000"/>
    <rect class="web90-pupille" x="40" y="40" width="4" height="5" fill="#000"/>
  </g>
  <path d="M24 52h16" stroke="#000" stroke-width="2"/>
  <path d="M14 60v8h6M50 60v8h-6" stroke="#000" stroke-width="3" fill="none"/>
</svg>`;

function remarques() {
  const h = location.hostname;
  const r = [
    "On dirait que vous naviguez sur Internet. Voulez-vous de l'aide ?",
    "Astuce : pensez a ajouter cette page a vos Favoris !",
    "Le saviez-vous ? Je peux contenir 1,44 Mo. Enorme !",
    "N'oubliez pas de vous deconnecter, sinon la facture de telephone va exploser !",
    "Cette page serait plus belle avec un GIF anime. Ou dix.",
    "Pensez a defragmenter votre disque dur ce week-end.",
  ];
  if (document.querySelector("form input:not([type=hidden])")) r.push("On dirait que vous remplissez un formulaire ! Voulez-vous que je le remplisse de travers ?");
  if (/youtube|tiktok|netflix|twitch/.test(h)) r.push("De la video ?! En 1997, cette page aurait mis 3 jours a charger.");
  if (/google|bing|duckduckgo/.test(h)) r.push("Vous cherchez quelque chose ? Essayez AltaVista ou Yahoo!");
  if (/mail|gmail|outlook/.test(h)) r.push("Vous avez du courrier !!!");
  if (/facebook|instagram|whatsapp/.test(h)) r.push("Un reseau social ? Moi j'avais une page perso avec un compteur de visiteurs.");
  if (/github|localhost|127\.0\.0\.1/.test(h)) r.push("Vous programmez ? N'oubliez pas les balises <BLINK> et <MARQUEE> !");
  return r;
}

let minuterieDisquette;
function disquette(visible) {
  const ancienne = document.getElementById("web90-disquette");
  if (!visible) { ancienne?.remove(); clearTimeout(minuterieDisquette); return; }
  if (ancienne || sessionStorage.getItem("web90-disquette-ferme")) return;
  quandBody(() => {
    if (document.getElementById("web90-disquette")) return;
    const d = document.createElement("div");
    d.id = "web90-disquette";
    d.innerHTML = `<div class="web90-bulle" hidden><button class="web90-x" title="Fermer">X</button><p></p></div>` +
      `<div class="web90-perso" title="Disquette">${DISQUETTE_SVG}</div>`;
    racine.appendChild(d);
    const bulle = d.querySelector(".web90-bulle"), texte = bulle.querySelector("p");
    const parler = () => {
      const r = remarques();
      texte.textContent = r[Math.floor(Math.random() * r.length)];
      bulle.hidden = false;
      jouer("bulle");
      clearTimeout(minuterieDisquette);
      minuterieDisquette = setTimeout(() => { bulle.hidden = true; minuterieDisquette = setTimeout(parler, 60000 + Math.random() * 60000); }, 9000);
    };
    d.querySelector(".web90-perso").onclick = parler;
    bulle.querySelector(".web90-x").onclick = () => {
      sessionStorage.setItem("web90-disquette-ferme", "1");
      d.remove();
      clearTimeout(minuterieDisquette);
    };
    // les yeux suivent la souris
    addEventListener("mousemove", (e) => {
      const r = d.getBoundingClientRect();
      const dx = Math.max(-2, Math.min(2, (e.clientX - r.left - 32) / 80));
      const dy = Math.max(-2, Math.min(2, (e.clientY - r.top - 40) / 80));
      d.querySelectorAll(".web90-pupille").forEach((p) => p.setAttribute("transform", `translate(${dx - 1},${dy - 1})`));
    }, { passive: true });
    minuterieDisquette = setTimeout(parler, 4000);
  });
}

chrome.storage.local.get("mode", ({ mode = "grossier" }) => appliquer(mode));
chrome.storage.onChanged.addListener((c) => { if (c.mode) appliquer(c.mode.newValue); });
