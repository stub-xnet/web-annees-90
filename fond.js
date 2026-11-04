const ORDRE = ["grossier", "leger", "off"];
const BADGE = { grossier: "90", leger: "½", off: "" };
let dernierModem = 0;

async function reglages() {
  const { mode = "grossier", sons = true } = await chrome.storage.local.get(["mode", "sons"]);
  return { mode, sons };
}

async function afficher(mode) {
  await chrome.action.setBadgeText({ text: BADGE[mode] });
  await chrome.action.setBadgeBackgroundColor({ color: "#000080" });
}

async function menus() {
  const { sons } = await reglages();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "sons", title: "Sons années 90", type: "checkbox", checked: sons, contexts: ["action"] });
}

// Les sons sont joués par une page cachée de l'extension (pas bloquée par l'autoplay).
async function jouer(son) {
  const { mode, sons } = await reglages();
  if (mode !== "grossier" || !sons) return;
  if (son === "modem") {
    if (Date.now() - dernierModem < 20000) return;
    dernierModem = Date.now();
  }
  const ouvertes = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!ouvertes.length) {
    try {
      await chrome.offscreen.createDocument({ url: "sons.html", reasons: ["AUDIO_PLAYBACK"], justification: "Sons rétro" });
    } catch (e) { /* déjà en cours de création */ }
  }
  chrome.runtime.sendMessage({ cible: "sons", son }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(async () => {
  const { mode } = await chrome.storage.local.get("mode");
  if (!mode) await chrome.storage.local.set({ mode: "grossier", sons: true });
  afficher(mode || "grossier");
  menus();
});

chrome.runtime.onStartup.addListener(async () => {
  const { mode } = await reglages();
  afficher(mode);
  menus();
  jouer("demarrage");
});

chrome.action.onClicked.addListener(async () => {
  const { mode } = await reglages();
  const suivant = ORDRE[(ORDRE.indexOf(mode) + 1) % ORDRE.length];
  await chrome.storage.local.set({ mode: suivant });
  afficher(suivant);
  if (suivant === "grossier") jouer("demarrage");
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "sons") chrome.storage.local.set({ sons: info.checked });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.jouer) jouer(msg.jouer);
});
