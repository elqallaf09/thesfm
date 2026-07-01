from pathlib import Path
import re
import shutil

files = [
    Path("src/components/Wakeel.tsx"),
    Path("components/Wakeel.tsx"),
]

new_helpers_and_speak = r'''
const normalizeArabicSpeechText = (text) => {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/[#*_`~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/د\.ك/g, " دينار كويتي ")
    .replace(/د\.إ/g, " درهم ")
    .replace(/ر\.س/g, " ريال سعودي ")
    .replace(/%/g, " بالمئة ")
    .replace(/\bAI\b/g, "الذكاء الاصطناعي")
    .replace(/\bETF\b/g, "صندوق متداول")
    .replace(/\s+/g, " ")
    .trim();
};

const splitForSpeech = (text) => {
  const clean = normalizeArabicSpeechText(text);

  const roughParts = clean
    .split(/(?<=[.!؟،؛:])\s+|\n+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const chunks = [];

  for (const part of roughParts) {
    if (part.length <= 90) {
      chunks.push(part);
      continue;
    }

    const words = part.split(" ");
    let current = "";

    for (const word of words) {
      const next = (current + " " + word).trim();
      if (next.length > 75) {
        if (current.trim()) chunks.push(current.trim());
        current = word;
      } else {
        current = next;
      }
    }

    if (current.trim()) chunks.push(current.trim());
  }

  return chunks;
};

const pickArabicVoice = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices?.() || [];

  return (
    voices.find((v) => v.lang === "ar-SA") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("ar")) ||
    voices.find((v) => /arabic|saudi|maged|tarik|hoda|naayf/i.test(`${v.name} ${v.lang}`)) ||
    voices[0] ||
    null
  );
};

const browserSpeak = (text) => {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) {
    goSleep();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const chunks = splitForSpeech(text);
    const voice = pickArabicVoice();

    if (!chunks.length) {
      goSleep();
      return;
    }

    setStat("speaking");

    let index = 0;
    let keepAliveTimer = null;

    const speakNext = () => {
      if (index >= chunks.length) {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        goSleep();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      index += 1;

      utterance.lang = voice?.lang || "ar-SA";
      if (voice) utterance.voice = voice;

      utterance.rate = 0.72;
      utterance.pitch = 0.92;
      utterance.volume = 1;

      utterance.onend = () => {
        setTimeout(speakNext, 260);
      };

      utterance.onerror = () => {
        setTimeout(speakNext, 260);
      };

      window.speechSynthesis.speak(utterance);
    };

    keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 3500);

    setTimeout(speakNext, 180);
  } catch {
    goSleep();
  }
};

'''

def replace_function_block(text, function_name):
    start = text.find(f"const {function_name} =")
    if start == -1:
        return text, 0

    brace_start = text.find("{", start)
    if brace_start == -1:
        return text, 0

    depth = 0
    i = brace_start
    while i < len(text):
        char = text[i]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = i + 1

                # include trailing semicolon
                if end < len(text) and text[end] == ";":
                    end += 1

                return text[:start] + new_helpers_and_speak + text[end:], 1
        i += 1

    return text, 0

for file in files:
    if not file.exists():
        print(f"SKIP missing: {file}")
        continue

    shutil.copyfile(file, Path(str(file) + ".backup-before-browserSpeak-replace"))

    text = file.read_text(encoding="utf-8", errors="replace")

    # remove old helper functions if they exist, to avoid duplicate names
    for helper in ["normalizeArabicSpeechText", "splitForSpeech", "pickArabicVoice"]:
        pattern = rf'\n?const {helper}\s*=\s*\([^)]*\)\s*=>\s*\{{.*?\n\}};\s*'
        text = re.sub(pattern, "\n", text, flags=re.S)

    new_text, count = replace_function_block(text, "browserSpeak")

    if count == 0:
        print(f"ERROR: browserSpeak function not found in {file}")
    else:
        file.write_text(new_text, encoding="utf-8")
        print(f"OK: replaced browserSpeak in {file}")
