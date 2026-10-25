import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('native business teams', () => {
  it('keeps the server boundary user-scoped, MFA-gated and constrained to known RPC actions', () => {
    const source = read('src/lib/server/mobileTeams.ts');
    expect(source).toContain('mobileAccess(request)');
    expect(source).toContain('viewerId: access.userId');
    expect(source).toContain("'sfm_team_action'");
    expect(source).toContain("'sfm_team_task'");
    expect(source).toContain("'task_status'");
    expect(source).not.toContain('service_role');
  });

  it('uses the protected mobile endpoint in Expo, SwiftUI and Compose instead of a WebView', () => {
    expect(read('apps/expo-go/src/TeamsScreen.tsx')).toContain("'/api/mobile/business/teams'");
    expect(read('ios-native/TheSFM/Core/Networking/MobileTeamsView.swift')).toContain('"/api/mobile/business/teams"');
    expect(read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt')).toContain('"/api/mobile/business/teams"');
  });

  it('keeps owner and task controls scoped to the authenticated viewer in every native client', () => {
    const expo = read('apps/expo-go/src/TeamsScreen.tsx');
    const swift = read('ios-native/TheSFM/Core/Networking/MobileTeamsView.swift');
    const android = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    expect(expo).toContain('detail.team.owner_id === detail.viewerId');
    expect(expo).toContain('assigneeId');
    expect(swift).toContain('let viewerId: String');
    expect(swift).toContain('assigneeId: String?');
    expect(android).toContain('val viewerId = current.optString("viewerId")');
    expect(android).toContain('teamInvitationTeamId');
  });
});
