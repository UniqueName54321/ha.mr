import {
  compress, decompress,
  compressBWT, decompressBWT,
  compressBzip2, decompressBzip2,
  compressRUNE, decompressRUNE,
  compressRUNEII, decompressRUNEII,
  compressENUR, decompressENUR,
  selectBestCompression
} from "./compress.js?v=20260814-xkcd1105";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji,
  outputAlphabetUnicode,
  outputAlphabetXKCD1105
} from "./alphabets.js?v=20260814-xkcd1105";

var settings = {
  emoji: false,
  unicode: false,
  xkcd1105: false,
  bwt: false,
  bzip2: false,
  rune: false,
  rune2: false,
  enur: false,
  auto: false,
  payloadOnly: false,
  qr: false
};

const settingsElements = {
  emoji: "#settings-emoji",
  unicode: "#settings-unicode",
  xkcd1105: "#settings-xkcd1105",
  bwt: "#settings-bwt",
  bzip2: "#settings-bzip2",
  rune: "#settings-rune",
  rune2: "#settings-rune2",
  enur: "#settings-enur",
  auto: "#settings-auto",
  payloadOnly: "#settings-payload-only",
  qr: "#settings-qr"
};

for (const setting in settingsElements) {
  const element = document.querySelector(settingsElements[setting]);
  settings[setting] = element.checked;
  element.addEventListener("change", (event) => {
    settings[setting] = element.checked;
    if (element.checked && ["emoji", "unicode", "xkcd1105"].includes(setting)) {
      for (const otherSetting of ["emoji", "unicode", "xkcd1105"]) {
        if (otherSetting === setting) continue;
        settings[otherSetting] = false;
        document.querySelector(settingsElements[otherSetting]).checked = false;
      }
    }
    if (element.checked && ["bwt", "bzip2", "rune", "rune2", "enur", "auto"].includes(setting)) {
      for (const otherSetting of ["bwt", "bzip2", "rune", "rune2", "enur", "auto"]) {
        if (otherSetting === setting) continue;
        settings[otherSetting] = false;
        document.querySelector(settingsElements[otherSetting]).checked = false;
      }
    }
    updateOutput();
  });
}

function countSymbols (string, alphabet) {
  let count = 0;
  while (string) {
    const symbol = alphabet.find(c => string.endsWith(c));
    string = string.slice(0, symbol ? -symbol.length : -1);
    count ++;
  }
  return count;
}

const inputLinkElement = document.querySelector("#input-link");
const outputLinkElement = document.querySelector("#output-link");
const copyOutputElement = document.querySelector("#copy-output");
const outputRatioElement = document.querySelector("#output-ratio");
const queryWarningElement = document.querySelector("#query-warning");
const previewPayloadElement = document.querySelector("#preview-payload");
const previewLinkElement = document.querySelector("#preview-link");
const rootURLInputElement = document.querySelector("#settings-root-url");
// Resolve from this module rather than the page origin so GitHub Pages project
// sites retain their repository path (for example /ha.mr).
rootURLInputElement.value = new URL(".", import.meta.url).href.replace(/\/$/, "");
rootURLInputElement.addEventListener("input", updateOutput);

function getRootURL () {
  let root;
  try {
    root = new URL(rootURLInputElement.value.trim());
  } catch {
    rootURLInputElement.setCustomValidity("Enter a valid root URL.");
    throw new Error("Invalid root URL.");
  }
  if (root.protocol !== "http:" && root.protocol !== "https:") {
    rootURLInputElement.setCustomValidity("Root URL must use HTTP or HTTPS.");
    throw new Error("Root URL must use HTTP or HTTPS.");
  }
  rootURLInputElement.setCustomValidity("");
  root.search = "";
  root.hash = "";
  return root.href.replace(/\/$/, "");
}

function getQRRootURL (rootURL) {
  const root = new URL(rootURL);
  const pathname = Array.from(root.pathname, character => /[a-z]/.test(character)
    ? `%${character.codePointAt(0).toString(16).toUpperCase()}`
    : character).join("");
  return `${root.protocol.toUpperCase()}//${root.host.toUpperCase()}${pathname}`.replace(/\/$/, "");
}

const qrCodeImage = document.querySelector("#qrcode");
const qrCodeCorrectionLevelContainer = document.querySelector("#qr-correct-level-container");
const qrCodeCorrectionLevelElement = document.querySelector("#qr-correct-level");
qrCodeCorrectionLevelElement.addEventListener("change", updateOutput);

function updatePreview () {
  // Do not trim: spaces are valid digits in the all-Unicode alphabet.
  let payload = previewPayloadElement.value;
  previewLinkElement.removeAttribute("href");
  previewLinkElement.style.color = "";

  if (!payload) {
    previewLinkElement.textContent = "Paste a compressed payload to preview it";
    return;
  }

  try {
    let alphabet = outputAlphabetASCII;
    let useBWT = false;
    let useBzip2 = false;
    let useRUNE = false;
    let useRUNEII = false;
    let useENUR = false;
    if (payload.startsWith("xr2:")) {
      payload = payload.slice(4);
      alphabet = outputAlphabetXKCD1105;
      useRUNEII = true;
    } else if (payload.startsWith("xr:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useRUNE = true;
    } else if (payload.startsWith("xz:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useBzip2 = true;
    } else if (payload.startsWith("xb:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useBWT = true;
    } else if (payload.startsWith("xe:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useENUR = true;
    } else if (payload.startsWith("x:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetXKCD1105;
    } else if (payload.startsWith("E:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetQR;
      useENUR = true;
    } else if (payload.startsWith("R2:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetQR;
      useRUNEII = true;
    } else if (payload.startsWith("R:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetQR;
      useRUNE = true;
    } else if (payload.startsWith("Z:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetQR;
      useBzip2 = true;
    } else if (payload.startsWith("B:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetQR;
      useBWT = true;
    } else if (payload.startsWith("eu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useENUR = true;
    } else if (payload.startsWith("e:")) {
      payload = payload.slice(2);
      useENUR = true;
    } else if (payload.startsWith("r2u:")) {
      payload = payload.slice(4);
      alphabet = outputAlphabetUnicode;
      useRUNEII = true;
    } else if (payload.startsWith("r2:")) {
      payload = payload.slice(3);
      useRUNEII = true;
    } else if (payload.startsWith("ru:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useRUNE = true;
    } else if (payload.startsWith("r:")) {
      payload = payload.slice(2);
      useRUNE = true;
    } else if (payload.startsWith("zu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useBzip2 = true;
    } else if (payload.startsWith("z:")) {
      payload = payload.slice(2);
      useBzip2 = true;
    } else if (payload.startsWith("bu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useBWT = true;
    } else if (payload.startsWith("u:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetUnicode;
    } else if (payload.startsWith("b:")) {
      payload = payload.slice(2);
      useBWT = true;
    } else if (Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    if (useBWT && alphabet === outputAlphabetASCII &&
        Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    if (useBzip2 && alphabet === outputAlphabetASCII &&
        Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    if (useRUNE && alphabet === outputAlphabetASCII &&
        Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    if (useRUNEII && alphabet === outputAlphabetASCII &&
        Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    if (useENUR && alphabet === outputAlphabetASCII &&
        Array.from(payload).some(character => !outputAlphabetASCII.includes(character))) {
      alphabet = outputAlphabetEmoji;
    }
    const target = useENUR
      ? decompressENUR(payload, alphabet)
      : useRUNEII
      ? decompressRUNEII(payload, alphabet)
      : useRUNE
      ? decompressRUNE(payload, alphabet)
      : useBzip2
      ? decompressBzip2(payload, alphabet)
      : useBWT ? decompressBWT(payload, alphabet) : decompress(payload, alphabet);
    previewLinkElement.textContent = target;
    previewLinkElement.href = target;
  } catch (error) {
    previewLinkElement.textContent = "Invalid compressed payload";
    previewLinkElement.style.color = "rgb(255, 50, 50)";
  }
}

previewPayloadElement.addEventListener("input", updatePreview);

function getAlgorithmMarker (algorithm, qr = false) {
  if (qr) {
    return { normal: "", bwt: "B:", bzip2: "Z:", rune: "R:", rune2: "R2:", enur: "E:" }[algorithm];
  }
  if (settings.xkcd1105) {
    return { normal: "x:", bwt: "xb:", bzip2: "xz:", rune: "xr:", rune2: "xr2:", enur: "xe:" }[algorithm];
  }
  if (settings.unicode) {
    return { normal: "u:", bwt: "bu:", bzip2: "zu:", rune: "ru:", rune2: "r2u:", enur: "eu:" }[algorithm];
  }
  return { normal: "", bwt: "b:", bzip2: "z:", rune: "r:", rune2: "r2:", enur: "e:" }[algorithm];
}

function updateOutput () {
  const input = inputLinkElement.value.trim();
  try {
    const alphabet = settings.unicode
      ? outputAlphabetUnicode
      : settings.xkcd1105 ? outputAlphabetXKCD1105
      : settings.emoji ? outputAlphabetEmoji : outputAlphabetASCII;
    const rootURL = getRootURL();
    let algorithm = settings.enur ? "enur"
      : settings.rune2 ? "rune2"
        : settings.rune ? "rune"
          : settings.bzip2 ? "bzip2"
            : settings.bwt ? "bwt" : "normal";
    let output;
    if (settings.auto) {
      const best = selectBestCompression(input, alphabet);
      algorithm = best.algorithm;
      output = best.payload;
    } else {
      output = {
        normal: compress,
        bwt: compressBWT,
        bzip2: compressBzip2,
        rune: compressRUNE,
        rune2: compressRUNEII,
        enur: compressENUR
      }[algorithm](input, alphabet);
    }
    const modePrefix = getAlgorithmMarker(algorithm);
    let inputNormalized = input;
    if (input.startsWith("https://")) {
      inputNormalized = input.slice(8);
    } else if (input.startsWith("http://")) {
      inputNormalized = input.slice(7);
    }
    let excessiveParams = false;
    if (URL.canParse("http://" + inputNormalized)) {
      const url = new URL("http://" + inputNormalized);
      if (url.searchParams.size > 1) {
        excessiveParams = true;
      }
    }
    if (excessiveParams) {
      queryWarningElement.style.display = "inline";
    } else {
      queryWarningElement.style.display = "none";
    }
    const symbolCount = settings.unicode ? Array.from(output).length : countSymbols(output, alphabet);
    const rootSymbolCount = settings.payloadOnly ? 0 : Array.from(rootURL).length + 1;
    const ratio = (1 - (symbolCount + modePrefix.length + rootSymbolCount) / inputNormalized.length) * 100;
    if (ratio < 0) {
      outputRatioElement.textContent = `Output is ${Math.floor(-ratio)}% larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio > 0) {
      outputRatioElement.textContent = `Output is ${Math.ceil(ratio)}% smaller than the input`;
      outputRatioElement.style.color = "rgb(15, 190, 15)";
    } else {
      outputRatioElement.textContent = "Output is the same length as the input";
      outputRatioElement.style.color = "gray";
    }
    if (settings.auto) {
      const algorithmName = {
        normal: "semantic compression",
        bwt: "BWT",
        bzip2: "bzip2",
        rune: "RUNE",
        rune2: "RUNE-II",
        enur: "ENUR"
      }[algorithm];
      outputRatioElement.textContent += ` — Auto selected ${algorithmName}`;
    }
    const payload = `${modePrefix}${output}`;
    const outputURL = `${rootURL}#${payload}`;
    outputLinkElement.textContent = settings.payloadOnly ? payload : outputURL;
    outputLinkElement.dataset.copyable = "true";
    if (settings.payloadOnly) {
      outputLinkElement.removeAttribute("href");
    } else {
      outputLinkElement.href = outputURL;
    }
    outputLinkElement.style.color = "";
    if (settings.qr) {
      const errorCorrection = ["L", "M", "Q", "H"][qrCodeCorrectionLevelElement.value];
      qrCodeImage.style.display = "inline";
      qrCodeCorrectionLevelContainer.style.display = "inline";
      // Uppercase QR URLs remain in the QR alphanumeric mode, reducing QR
      // overhead, while still using whichever host serves this deployment.
      let qrAlgorithm = algorithm;
      let qrOutput;
      if (settings.auto) {
        const best = selectBestCompression(input, outputAlphabetQR);
        qrAlgorithm = best.algorithm;
        qrOutput = best.payload;
      } else {
        qrOutput = {
          normal: compress,
          bwt: compressBWT,
          bzip2: compressBzip2,
          rune: compressRUNE,
          rune2: compressRUNEII,
          enur: compressENUR
        }[qrAlgorithm](input, outputAlphabetQR);
      }
      const qrPayload = getAlgorithmMarker(qrAlgorithm, true) + qrOutput;
      let qrCodeLink = `${getQRRootURL(rootURL)}/${qrPayload}`;
      QRCode.toDataURL(qrCodeLink, {
        errorCorrectionLevel: errorCorrection,
        scale: 8
      }, (err, url) => {
        if (err) {
          qrCodeImage.style.display = "none";
          qrCodeCorrectionLevelContainer.style.display = "none";
          return;
        }
        qrCodeImage.src = url;
        qrCodeImage.title = qrCodeLink;
      });
    } else {
      qrCodeImage.style.display = "none";
      qrCodeCorrectionLevelContainer.style.display = "none";
    }
  } catch (e) {
    if (!input.trim()) {
      outputLinkElement.textContent = "Enter a link above to compress";
    } else if (!rootURLInputElement.checkValidity()) {
      outputLinkElement.textContent = "Invalid root URL";
      outputLinkElement.style.color = "rgb(255, 50, 50)";
    } else {
      outputLinkElement.textContent = "Invalid link";
      outputLinkElement.style.color = "rgb(255, 50, 50)";
      console.error(e);
    }
    qrCodeImage.style.display = "none";
    qrCodeCorrectionLevelContainer.style.display = "none";
    outputRatioElement.style.color = "rgba(255, 255, 255, 0)";
    outputLinkElement.removeAttribute("href");
    delete outputLinkElement.dataset.copyable;
    queryWarningElement.style.display = "none";
  }
}
inputLinkElement.addEventListener("input", updateOutput);
copyOutputElement.addEventListener("click", async () => {
  if (!outputLinkElement.dataset.copyable) return;
  const value = outputLinkElement.textContent;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(outputLinkElement);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
  }
  copyOutputElement.textContent = "Copied!";
  window.setTimeout(() => { copyOutputElement.textContent = "Copy"; }, 1400);
});

(() => {
  let payload = null;
  let alphabet = outputAlphabetASCII;
  let useBWT = false;
  let useBzip2 = false;
  let useRUNE = false;
  let useRUNEII = false;
  let useENUR = false;

  // Get hash value of current address bar
  if (window.location.hash) {
    // Decode hash value in case it's non-ASCII
    const fragment = window.location.hash.slice(1);
    try {
      payload = decodeURIComponent(fragment);
    } catch {
      // A raw percent sign is a valid digit in the Unicode alphabet.
      payload = fragment;
    }
    if (payload.startsWith("xr2:")) {
      payload = payload.slice(4);
      alphabet = outputAlphabetXKCD1105;
      useRUNEII = true;
    } else if (payload.startsWith("xr:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useRUNE = true;
    } else if (payload.startsWith("xz:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useBzip2 = true;
    } else if (payload.startsWith("xb:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useBWT = true;
    } else if (payload.startsWith("xe:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetXKCD1105;
      useENUR = true;
    } else if (payload.startsWith("x:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetXKCD1105;
    } else if (payload.startsWith("eu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useENUR = true;
    } else if (payload.startsWith("e:")) {
      payload = payload.slice(2);
      useENUR = true;
    } else if (payload.startsWith("r2u:")) {
      payload = payload.slice(4);
      alphabet = outputAlphabetUnicode;
      useRUNEII = true;
    } else if (payload.startsWith("r2:")) {
      payload = payload.slice(3);
      useRUNEII = true;
    } else if (payload.startsWith("ru:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useRUNE = true;
    } else if (payload.startsWith("r:")) {
      payload = payload.slice(2);
      useRUNE = true;
    } else if (payload.startsWith("zu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useBzip2 = true;
    } else if (payload.startsWith("z:")) {
      payload = payload.slice(2);
      useBzip2 = true;
    } else if (payload.startsWith("bu:")) {
      payload = payload.slice(3);
      alphabet = outputAlphabetUnicode;
      useBWT = true;
    } else if (payload.startsWith("u:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetUnicode;
    } else if (payload.startsWith("b:")) {
      payload = payload.slice(2);
      useBWT = true;
    }
    if (alphabet !== outputAlphabetUnicode && alphabet !== outputAlphabetXKCD1105) {
      // Legacy alphabets never use spaces and older links may contain them.
      payload = payload.replaceAll(" ", "");
      // Legacy links have no mode marker, so retain their original detection.
      const useEmoji = Array.from(payload).some(c => !outputAlphabetASCII.includes(c));
      alphabet = useEmoji ? outputAlphabetEmoji : outputAlphabetASCII;
    }
  } else {
    // If no hash value, we're likely reading a QR code
    // For that, use the path instead
    payload = decodeURIComponent(window.location.pathname.slice(1));
    alphabet = outputAlphabetQR;
    if (payload.startsWith("E:")) {
      payload = payload.slice(2);
      useENUR = true;
    } else if (payload.startsWith("R2:")) {
      payload = payload.slice(3);
      useRUNEII = true;
    } else if (payload.startsWith("R:")) {
      payload = payload.slice(2);
      useRUNE = true;
    } else if (payload.startsWith("B:")) {
      payload = payload.slice(2);
      useBWT = true;
    } else if (payload.startsWith("Z:")) {
      payload = payload.slice(2);
      useBzip2 = true;
    }
  }

  if (payload && payload.trim()) {
    try {
      const target = useENUR
        ? decompressENUR(payload, alphabet)
        : useRUNEII
        ? decompressRUNEII(payload, alphabet)
        : useRUNE
        ? decompressRUNE(payload, alphabet)
        : useBzip2
        ? decompressBzip2(payload, alphabet)
        : useBWT ? decompressBWT(payload, alphabet) : decompress(payload, alphabet);
      window.location.href = target;
      return;
    } catch (e) {
      console.warn(`Redirect failed. Could not decode input.`);
      console.error(e);
    }
  }

  updateOutput();

  document.querySelector("#loader").style.opacity = 0;
  document.querySelector("#content").style.opacity = 1;
  document.querySelector("#content").style.pointerEvents = "auto";

})();
