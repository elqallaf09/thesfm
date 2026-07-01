from pathlib import Path

files = [
    Path("src/components/Wakeel.tsx"),
    Path("components/Wakeel.tsx"),
    Path("app/api/wakeel/route.ts"),
    Path("src/lib/supabase/portfolio.ts"),
    Path("lib/supabase/portfolio.ts"),
]

def fix_mojibake(text: str) -> str:
    try:
        return text.encode("cp1252").decode("utf-8")
    except Exception:
        return text

for p in files:
    if p.exists():
        original = p.read_text(encoding="utf-8", errors="replace")
        fixed = fix_mojibake(original)
        if fixed != original:
            backup = p.with_suffix(p.suffix + ".backup-before-encoding-fix")
            backup.write_text(original, encoding="utf-8")
            p.write_text(fixed, encoding="utf-8")
            print(f"FIXED: {p}")
        else:
            print(f"OK/no change: {p}")
    else:
        print(f"SKIP missing: {p}")
