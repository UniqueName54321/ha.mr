import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji,
  outputAlphabetUnicode,
  outputAlphabetXKCD1105
} from "./alphabets.js";

const input = process.argv[2]?.trim();
const alphabetName = process.argv[3]?.trim() || "ascii";
const rootURL = (process.env.HAMR_ROOT_URL || "http://shrt.beep8.xyz").replace(/\/$/, "");
if (!input) {
  console.error(`Usage: hamr <link> [ascii|qr|emoji|unicode|xkcd1105]`);
  process.exit(1);
}

let payload = "";
if (input.toLowerCase().startsWith("http://shrt.beep8.xyz")) {
  payload = input.slice(12);
} else if (input.toLowerCase().startsWith("https://shrt.beep8.xyz")) {
  payload = input.slice(13);
} else if (input.toLowerCase().startsWith("shrt.beep8.xyz")) {
  payload = input.slice(5);
}

if (payload) {
  const isQRCode = input[0] === "/";
  payload = payload.slice(1);
  const useUnicode = payload.startsWith("u:");
  if (useUnicode) payload = payload.slice(2);
  const useXKCD1105 = payload.startsWith("x:");
  if (useXKCD1105) payload = payload.slice(2);
  const useEmoji = Array.from(payload).some(c => !outputAlphabetASCII.includes(c));
  if (isQRCode) console.log(decompress(payload, outputAlphabetQR));
  else if (useUnicode) console.log(decompress(payload, outputAlphabetUnicode));
  else if (useXKCD1105) console.log(decompress(payload, outputAlphabetXKCD1105));
  else console.log(decompress(payload, useEmoji ? outputAlphabetEmoji : outputAlphabetASCII));
  process.exit(0);
}

let alphabet = outputAlphabetASCII;
if (alphabetName === "qr") alphabet = outputAlphabetQR;
else if (alphabetName === "emoji") alphabet = outputAlphabetEmoji;
else if (alphabetName === "unicode") alphabet = outputAlphabetUnicode;
else if (alphabetName === "xkcd1105") alphabet = outputAlphabetXKCD1105;
else if (alphabetName !== "ascii") {
  console.error(`Unknown alphabet "${alphabetName}".`);
  console.error("Select one of: ascii, qr, emoji, unicode, xkcd1105");
  process.exit(2);
}

if (alphabetName === "qr") {
  console.log(rootURL.toUpperCase() + "/" + compress(input, alphabet));
} else {
  const modePrefix = alphabetName === "unicode" ? "u:"
    : alphabetName === "xkcd1105" ? "x:" : "";
  console.log(rootURL + "#" + modePrefix + compress(input, alphabet));
}
