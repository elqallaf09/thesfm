import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('native private business project documents', () => {
  it('uses the owner-scoped mobile endpoint instead of exposing a stored path in Expo', () => {
    const screen = read('apps/expo-go/src/RecordsScreen.tsx');
    expect(screen).toContain("const supportsPrivateDocuments = product === 'business' && resource.id === 'documents';");
    expect(screen).toContain("Private project document from your website account.");
    expect(screen).toContain('void openAttachment(item)');
  });

  it('keeps the SwiftUI client on the product-scoped endpoint and accepts only HTTPS URLs', () => {
    const source = read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift');
    expect(source).toContain('if product == "business", resource.id == "documents"');
    expect(source).toContain('result.attachment.url.scheme == "https", result.attachment.url.host != nil');
    expect(source).toContain('"/api/mobile/\\(product)/records/\\(resource.id)/attachment?recordId=\\(recordId)"');
  });

  it('keeps Android document access native and scoped to the signed-in product', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    expect(activity).toContain('"/api/mobile/$productId/records/$resourceId/attachment?recordId=${URLEncoder.encode(recordId, "UTF-8")}"');
    expect(activity).toContain('productId == "business" && resourceId == "documents"');
    expect(activity).toContain('"View document"');
  });
});
