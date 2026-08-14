import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji,
  outputAlphabetUnicode
} from "./alphabets.js";

var settings = {
  emoji: false,
  unicode: false,
  qr: false
};

const settingsElements = {
  emoji: "#settings-emoji",
  unicode: "#settings-unicode",
  qr: "#settings-qr"
};

for (const setting in settingsElements) {
  const element = document.querySelector(settingsElements[setting]);
  settings[setting] = element.checked;
  element.addEventListener("change", (event) => {
    settings[setting] = element.checked;
    if (element.checked && (setting === "emoji" || setting === "unicode")) {
      const otherSetting = setting === "emoji" ? "unicode" : "emoji";
      settings[otherSetting] = false;
      document.querySelector(settingsElements[otherSetting]).checked = false;
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
const rootURL = window.location.origin;

const qrCodeImage = document.querySelector("#qrcode");
const qrCodeCorrectionLevelContainer = document.querySelector("#qr-correct-level-container");
const qrCodeCorrectionLevelElement = document.querySelector("#qr-correct-level");
qrCodeCorrectionLevelElement.addEventListener("change", updateOutput);

function updateOutput () {
  const input = inputLinkElement.value.trim();
  try {
    const alphabet = settings.unicode
      ? outputAlphabetUnicode
      : settings.emoji ? outputAlphabetEmoji : outputAlphabetASCII;
    const output = compress(input, alphabet);
    const modePrefix = settings.unicode ? "u:" : "";
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
    const ratio = (1 - (symbolCount + modePrefix.length + 6) / inputNormalized.length) * 100;
    if (ratio < -300) {
      outputRatioElement.textContent = `Output is much larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio < 0) {
      outputRatioElement.textContent = `Output is ${Math.floor(-ratio)}% larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio > 0) {
      outputRatioElement.textContent = `Output is ${Math.ceil(ratio)}% smaller than the input`;
      outputRatioElement.style.color = "rgb(15, 190, 15)";
    } else {
      outputRatioElement.textContent = "Output is the same length as the input";
      outputRatioElement.style.color = "gray";
    }
    const outputURL = `${rootURL}#${modePrefix}${output}`;
    outputLinkElement.textContent = outputURL;
    outputLinkElement.href = outputURL;
    outputLinkElement.style.color = "";
    if (settings.qr) {
      const errorCorrection = ["L", "M", "Q", "H"][qrCodeCorrectionLevelElement.value];
      qrCodeImage.style.display = "inline";
      qrCodeCorrectionLevelContainer.style.display = "inline";
      // Uppercase QR URLs remain in the QR alphanumeric mode, reducing QR
      // overhead, while still using whichever host serves this deployment.
      let qrCodeLink = `${rootURL.toUpperCase()}/${compress(input, outputAlphabetQR)}`;
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
    } else {
      outputLinkElement.textContent = "Invalid link";
      outputLinkElement.style.color = "rgb(255, 50, 50)";
      console.error(e);
    }
    qrCodeImage.style.display = "none";
    qrCodeCorrectionLevelContainer.style.display = "none";
    outputRatioElement.style.color = "rgba(255, 255, 255, 0)";
    outputLinkElement.removeAttribute("href");
    queryWarningElement.style.display = "none";
  }
}
inputLinkElement.addEventListener("input", updateOutput);
copyOutputElement.addEventListener("click", async () => {
  if (!outputLinkElement.href) return;
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
    if (payload.startsWith("u:")) {
      payload = payload.slice(2);
      alphabet = outputAlphabetUnicode;
    }
    if (alphabet !== outputAlphabetUnicode) {
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
  }

  if (payload && payload.trim()) {
    try {
      const target = decompress(payload, alphabet);
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
