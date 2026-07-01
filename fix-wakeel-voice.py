from pathlib import Path
import re
import shutil

files = [
    Path("src/components/Wakeel.tsx"),
    Path("components/Wakeel.tsx"),
]

new_speak_block = r'''
// ---------- speak ----------
const browserSpeak = (text) => {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) {
    goSleep();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(String(text));

    // صوت عربي قدر الإمكان
    utterance.lang = "ar-SA";

    // تحسين جودة الصوت الافتراضي
    utterance.rate = 0.88;   // السرعة: أقل = أهدأ
    utterance.pitch = 0.82;  // النبرة: أقل = أعمق
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices?.() || [];

    const preferredVoice =
      voices.find((v) => /ar|arabic|saudi|arabia/i.test(`${v.lang} ${v.name}`)) ||
      voices.find((v) => /Microsoft|Google/i.test(v.name)) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      if (preferredVoice.lang) utterance.lang = preferredVoice.lang;
    }

    utterance.onstart = () => {
      setStat("speaking");
    };

    utterance.onend = () => {
      goSleep();
    };

    utterance.onerror = () => {
      goSleep();
    };

    // Chrome أحياناً يحتاج تأخير بسيط
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 80);
  } catch {
    goSleep();
  }
};

'''

for file in files:
    if not file.exists():
        print(f"SKIP missing: {file}")
        continue

    shutil.copyfile(file, Path(str(file) + ".backup-before-voice-greeting"))

    text = file.read_text(encoding="utf-8", errors="replace")

    # استبدال بلوك speak بين التعليقات إن وجد
    pattern = r'// ---------- speak ----------.*?(?=// ---------- mic|// ---------- wake|const initialize|const wake|useEffect)'
    new_text, count = re.subn(pattern, new_speak_block + "\n", text, flags=re.S)

    if count == 0:
        print(f"WARNING: speak block not found in {file}. No voice block replaced.")
        new_text = text

    # إضافة الترحيب بعد تشغيل المايك/الوكيل
    greeting = 'setTimeout(() => browserSpeak("هلا يا سيدي. أنا وكيل، جاهز لخدمتك."), 300);'

    if "هلا يا سيدي. أنا وكيل، جاهز لخدمتك." not in new_text:
        # نحاول إضافتها بعد أول setStat("sleeping") أو setStat("standby")
        new_text, gcount = re.subn(
            r'(setStat\("sleeping"\);\s*)',
            r'\1\n      ' + greeting + '\n',
            new_text,
            count=1
        )

        if gcount == 0:
            new_text, gcount = re.subn(
                r'(setStat\("standby"\);\s*)',
                r'\1\n      ' + greeting + '\n',
                new_text,
                count=1
            )

        if gcount == 0:
            print(f"WARNING: could not auto-add greeting in {file}.")
        else:
            print(f"OK: greeting added in {file}")
    else:
        print(f"OK: greeting already exists in {file}")

    file.write_text(new_text, encoding="utf-8")
    print(f"OK: voice patched in {file}")
