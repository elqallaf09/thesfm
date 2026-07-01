from pathlib import Path
import re
import shutil

files = [
    Path("src/components/Wakeel.tsx"),
    Path("components/Wakeel.tsx"),
]

new_call_model = '''
  const callModel = async (messages, system, useTools) => {
    const res = await fetch("/api/wakeel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        system,
        useTools,
        name,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "wakeel_api_error");
    }

    return data.reply || data.text || data.message || "";
  };

'''

for file in files:
    if not file.exists():
        print(f"SKIP missing: {file}")
        continue

    backup_candidates = [
        Path(str(file) + ".backup-before-api-wakeel-fix"),
        Path(str(file) + ".backup-before-encoding-fix"),
    ]

    restored = False
    for backup in backup_candidates:
        if backup.exists():
            shutil.copyfile(backup, file)
            print(f"RESTORED: {file} from {backup}")
            restored = True
            break

    text = file.read_text(encoding="utf-8", errors="replace")

    # Replace callModel only; keep the Arabic/UI text untouched.
    pattern = r'\s*const callModel\s*=\s*async\s*\([^)]*\)\s*=>\s*\{.*?\n\s*\};\s*\n\s*const ask\s*=\s*useCallback'
    replacement = "\n" + new_call_model + "\n  const ask = useCallback"

    new_text, count = re.subn(pattern, replacement, text, flags=re.S)

    if count == 0:
        print(f"WARNING: callModel block not replaced in {file}")
    else:
        print(f"FIXED callModel in {file}")

    # Safety cleanup: remove any direct Anthropic references from component.
    new_text = new_text.replace("https://api.anthropic.com/v1/messages", "/api/wakeel")
    new_text = re.sub(r'\s*"x-api-key"\s*:\s*[^,\n]+,?', "", new_text)
    new_text = re.sub(r'\s*"anthropic-version"\s*:\s*"[^"]+",?', "", new_text)
    new_text = new_text.replace("process.env.ANTHROPIC_API_KEY", "")

    file.write_text(new_text, encoding="utf-8")

print("DONE")
