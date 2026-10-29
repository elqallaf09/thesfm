import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('native decision timeline contract', () => {
  it('keeps the server target-date field available to all native decision clients', () => {
    expect(read('src/lib/server/mobileDecisions.ts')).toContain('target_date');
    for (const file of [
      'apps/expo-go/src/MobileDecisionsScreen.tsx',
      'apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileDecisionsWorkspace.kt',
      'ios-native/TheSFM/Core/Networking/MobileDecisionsView.swift',
    ]) expect(read(file)).toContain('target_date');
  });

  it('keeps native timeline labels localized instead of routing to a web view', () => {
    for (const file of [
      'apps/expo-go/src/MobileDecisionsScreen.tsx',
      'apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileDecisionsWorkspace.kt',
      'ios-native/TheSFM/Core/Networking/MobileDecisionsView.swift',
    ]) {
      const source = read(file);
      expect(source).toContain('Decision timeline');
      expect(source).toContain('Chronologie des décisions');
    }
  });
});
