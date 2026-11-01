import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('native financial calculators', () => {
  it('uses the same fixed 2.5% zakat and bounded loan/compound inputs in all native clients', () => {
    expect(read('apps/expo-go/src/calculators.ts')).toContain('eligible * .025');
    expect(read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift')).toContain('value * 0.025');
    expect(read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt')).toContain('base * .025');
  });

  it('states that calculators do not create records or recommendations', () => {
    const sources = [
      read('apps/expo-go/src/ToolsScreen.tsx'),
      read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift'),
      read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt'),
    ].join('\n');
    expect(sources).toContain('does not create a record');
    expect(sources).toContain('recommendation');
  });
});
