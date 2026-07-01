from pathlib import Path
import re
import shutil

files = [
    Path("src/components/Wakeel.tsx"),
    Path("components/Wakeel.tsx"),
]

new_speak_block = r'''
// ---------- speak ----------
const normalizeArabicSpeechText = (text) => {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/[#*_`~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/د\.ك/g, "دينار كويتي")
    .replace(/د\.إ/g, "درهم")
    .replace(/ر\.س/g, "ريال سعودي")
    .replace(/%/g, " بالمئة ")
    .replace(/\s+/g, " ")
    .trim();
};

const splitForSpeech = (text) => {
  const clean = normalizeArabicSpeechText(text);

  const parts = clean
    .split(/(?<=[.!؟،؛])\s+|\n+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const chunks = [];

  for (const part of parts) {
    if (part.length <= 130) {
      chunks.push(part);
      continue;
    }

    const words = part.split(" ");
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length > 110) {
        if (current.trim()) chunks.push(current.trim());
        current = word;
      } else {
        current = (current + " " + word).trim();
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
    voices.find((v) => /arabic|ar-|saudi|maged|tarik|hoda|naayf/i.test(`${v.name} ${v.lang}`)) ||
    voices.find((v) => /Microsoft|Google/i.test(v.name)) ||
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
      utterance.voice = voice || null;

      // إعدادات أنسب للعربي في Chrome
      utterance.rate = 0.78;
      utterance.pitch = 0.95;
      utterance.volume = 1;

      utterance.onend = () => {
        setTimeout(speakNext, 180);
      };

      utterance.onerror = () => {
        setTimeout(speakNext, 180);
      };

      window.speechSynthesis.speak(utterance);
    };

    // حل مشكلة تقطيع Chrome أثناء قراءة نصوص طويلة
    keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4500);

    setTimeout(speakNext, 120);
  } catch {
    goSleep();
  }
};

'''

for file in files:
    if not file.exists():
        print(f"SKIP missing: {file}")
        continue

    shutil.copyfile(file, Path(str(file) + ".backup-before-arabic-tts-fix"))

    text = file.read_text(encoding="utf-8", errors="replace")

    pattern = r'// ---------- speak ----------.*?(?=// ---------- mic|// ---------- wake|const initialize|const wake|useEffect)'
    new_text, count = re.subn(pattern, new_speak_block + "\n", text, flags=re.S)

    if count == 0:
        print(f"WARNING: speak block not found in {file}")
    else:
        file.write_text(new_text, encoding="utf-8")
        print(f"OK: Arabic TTS fixed in {file}")
