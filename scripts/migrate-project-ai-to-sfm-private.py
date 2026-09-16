from pathlib import Path
import re

ROOT = Path('.')
ROUTES = [
    'src/app/api/projects/[id]/ai-advisor/route.ts',
    'src/app/api/projects/[id]/expense-analysis/route.ts',
    'src/app/api/projects/[id]/pitch-deck/route.ts',
    'src/app/api/projects/[id]/pitch-deck/export/route.ts',
]


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 exact match, got {count}')
    return text.replace(old, new, 1)


def remove_provider_helpers(text: str, label: str) -> str:
    pattern = r"\nfunction getProvider\(\) \{\n  const gatewayToken = process\.env\.AI_GATEWAY_TOKEN;\n  const anthropicKey = process\.env\.ANTHROPIC_API_KEY;\n  if \(gatewayToken\) \{\n    return createAnthropic\(\{\n      apiKey: gatewayToken,\n      baseURL: 'https://ai-gateway\.vercel\.sh/v1/anthropic',\n    \}\);\n  \}\n  return anthropicKey \? createAnthropic\(\{ apiKey: anthropicKey \}\) : null;\n\}\n\nfunction aiProviderConfigured\(\) \{\n  return Boolean\(process\.env\.AI_GATEWAY_TOKEN \|\| process\.env\.ANTHROPIC_API_KEY\);\n\}\n"
    value, count = re.subn(pattern, '\n', text, count=1)
    if count != 1:
        raise RuntimeError(f'{label}: provider helper block mismatch ({count})')
    return value


def base_imports(text: str, label: str) -> str:
    old = "import { generateText } from 'ai';\nimport { createAnthropic } from '@ai-sdk/anthropic';\n"
    new = "import { randomUUID } from 'node:crypto';\nimport { aiProviderConfigured, generateAssistantReply } from '@/lib/server/aiProvider';\n"
    return one(text, old, new, f'{label} imports')


def private_generation(system: str, tokens: int, fallback: str) -> str:
    return f"""const generation = await generateAssistantReply({{\n      correlationId: randomUUID(),\n      system: {system},\n      messages: [{{ role: 'user', content: prompt }}],\n      maxTokens: {tokens},\n    }});\n    if (!generation) return {fallback};\n    const text = generation.text;"""

# AI advisor
path = ROOT / ROUTES[0]
text = base_imports(path.read_text(), 'ai-advisor')
text = remove_provider_helpers(text, 'ai-advisor')
text = one(text, "  const provider = getProvider();\n  if (!provider) return fallback;\n", "  if (!aiProviderConfigured()) return fallback;\n", 'ai-advisor run prelude')
old = """const { text } = await generateText({\n      model: provider('claude-haiku-4-5-20251001'),\n      system: 'You are a project planning analyst for THE SFM. You produce structured JSON only. You never fabricate missing project data or make guaranteed legal, financial, or success claims.',\n      prompt,\n      maxTokens: 1800,\n    });"""
new = private_generation("'You are the private project planning analyst for THE SFM. Produce structured JSON only. Never fabricate missing project data or make guaranteed legal, financial, or success claims.'", 1800, 'fallback')
text = one(text, old, new, 'ai-advisor generation')
path.write_text(text)

# Expense analysis
path = ROOT / ROUTES[1]
text = base_imports(path.read_text(), 'expense-analysis')
text = remove_provider_helpers(text, 'expense-analysis')
text = one(text, "  const provider = getProvider();\n  if (!provider) return fallback;\n", "  if (!aiProviderConfigured()) return fallback;\n", 'expense run prelude')
old = """const { text } = await generateText({\n      model: provider('claude-haiku-4-5-20251001'),\n      system: 'You are a project expense analyst for THE SFM. Return structured JSON only and never fabricate receipt or budget values.',\n      prompt,\n      maxTokens: 900,\n    });"""
new = private_generation("'You are the private project expense analyst for THE SFM. Return structured JSON only and never fabricate receipt or budget values.'", 900, 'fallback')
text = one(text, old, new, 'expense generation')
path.write_text(text)

# Pitch deck
path = ROOT / ROUTES[2]
text = base_imports(path.read_text(), 'pitch-deck')
text = remove_provider_helpers(text, 'pitch-deck')
text = one(text, "  const provider = getProvider();\n  if (!provider) return { source: 'rules' as DeckSource, deck };\n", "  if (!aiProviderConfigured()) return { source: 'rules' as DeckSource, deck };\n", 'pitch deck run prelude')
old = """const { text } = await generateText({\n      model: provider('claude-haiku-4-5-20251001'),\n      system: 'You are an investor pitch deck editor for THE SFM. You output structured JSON only and never fabricate missing business data.',\n      prompt,\n      maxTokens: 3200,\n    });"""
new = private_generation("'You are the private investor pitch deck editor for THE SFM. Output structured JSON only and never fabricate missing business data.'", 3200, "{ source: 'rules' as DeckSource, deck }")
text = one(text, old, new, 'pitch deck generation')
path.write_text(text)

# Pitch deck export
path = ROOT / ROUTES[3]
text = base_imports(path.read_text(), 'pitch-deck-export')
text = remove_provider_helpers(text, 'pitch-deck-export')
text = one(text, "  const provider = getProvider();\n  if (!provider) return { source: 'rules' as DeckSource, deck };\n", "  if (!aiProviderConfigured()) return { source: 'rules' as DeckSource, deck };\n", 'pitch export run prelude')
old = """const { text } = await generateText({\n      model: provider('claude-haiku-4-5-20251001'),\n      system: 'You are a THE SFM pitch deck editor. Output JSON only and never fabricate missing project data.',\n      prompt,\n      maxTokens: 3200,\n    });"""
new = private_generation("'You are the private THE SFM pitch deck editor. Output JSON only and never fabricate missing project data.'", 3200, "{ source: 'rules' as DeckSource, deck }")
text = one(text, old, new, 'pitch export generation')
path.write_text(text)

# Update AI analyst provider labels without changing translation object keys used by callers.
copy_path = ROOT / 'src/components/ai-analyst/copy.ts'
copy = copy_path.read_text()
replacements = {
    "openAi: 'OpenAI',\n      futureLocal: 'نموذج محلي مستقبلي',": "openAi: 'SFM Private AI',\n      futureLocal: 'نموذج خاص احتياطي',",
    "openAi: 'OpenAI',\n      futureLocal: 'Future local model',": "openAi: 'SFM Private AI',\n      futureLocal: 'Private fallback model',",
    "openAi: 'OpenAI',\n      futureLocal: 'Futur modèle local',": "openAi: 'SFM Private AI',\n      futureLocal: 'Modèle privé de secours',",
}
for old, new in replacements.items():
    if copy.count(old) != 1:
        raise RuntimeError(f'AI analyst copy mismatch for {old!r}: {copy.count(old)}')
    copy = copy.replace(old, new, 1)
copy_path.write_text(copy)

# Replace legacy vendor environment examples with SFM Private AI examples.
env_path = ROOT / '.env.example'
env = env_path.read_text()
old_env = """# OpenAI receipt scanning (server only)\nOPENAI_API_KEY=\nOPENAI_RECEIPT_MODEL=gpt-4.1-mini\nOPENAI_NEWS_TRANSLATION_MODEL=gpt-4.1-mini\nANTHROPIC_API_KEY=\nANTHROPIC_NEWS_TRANSLATION_MODEL=claude-3-5-haiku-latest\nAI_GATEWAY_TOKEN=\n"""
new_env = """# SFM Private AI (server only; self-hosted OpenAI-compatible protocol)\nSFM_AI_BASE_URL=\nSFM_AI_MODEL=sfm-primary\nSFM_AI_API_KEY=\nSFM_AI_TIMEOUT_MS=22000\n# Optional independent text-model failover\nSFM_AI_FALLBACK_BASE_URL=\nSFM_AI_FALLBACK_MODEL=sfm-backup\nSFM_AI_FALLBACK_API_KEY=\n# Optional dedicated multimodal model for receipt/document images\nSFM_AI_VISION_BASE_URL=\nSFM_AI_VISION_MODEL=sfm-vision\nSFM_AI_VISION_API_KEY=\nSFM_AI_VISION_FALLBACK_BASE_URL=\nSFM_AI_VISION_FALLBACK_MODEL=sfm-vision-backup\nSFM_AI_VISION_FALLBACK_API_KEY=\n"""
env = one(env, old_env, new_env, 'env example provider block')
env_path.write_text(env)

# Remove vendor credential names from a live-source explanatory comment so the
# exact-branch audit can distinguish real dependencies from documentation text.
provider_path = ROOT / 'src/lib/server/aiProvider.ts'
provider = provider_path.read_text().replace(
    ' * It does not read OPENAI_API_KEY, ANTHROPIC_API_KEY, or vendor gateway keys.\n',
    ' * It does not read third-party model-vendor credentials.\n',
)
provider_path.write_text(provider)

for route in ROUTES:
    source = (ROOT / route).read_text()
    forbidden = r"@ai-sdk/anthropic|createAnthropic|AI_GATEWAY_TOKEN|ANTHROPIC_API_KEY|generateText\(|claude-haiku"
    if re.search(forbidden, source):
        raise RuntimeError(f'vendor dependency remained in {route}')
    if 'generateAssistantReply' not in source or 'aiProviderConfigured' not in source:
        raise RuntimeError(f'private provider was not installed in {route}')

print('Remaining project AI routes migrated to SFM Private AI.')
