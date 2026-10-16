"""Anonymous emulator checks; no credentials, financial writes or signing keys."""
import json
import os
import re
from pathlib import Path
import subprocess
import time
import xml.etree.ElementTree as ET

product = os.environ['SFM_PRODUCT']
assert product in ('finance', 'investor', 'business')
package = f'com.thesfm.{product}'
output = Path('artifacts/android-runtime')
output.mkdir(parents=True, exist_ok=True)


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=45)


def visible(stage):
    for _ in range(20):
        try:
            adb('shell', 'uiautomator', 'dump', '/sdcard/sfm-runtime.xml')
            xml = adb('shell', 'cat', '/sdcard/sfm-runtime.xml')
            root = ET.fromstring(xml)
            nodes = [n for n in root.iter('node') if n.attrib.get('package') == package]
            bounds = [list(map(int, re.findall(r'\d+', n.attrib.get('bounds', '')))) for n in root.iter('node')]
            bounds = [b for b in bounds if len(b) == 4]
            width = max((b[2] for b in bounds), default=0)
            height = max((b[3] for b in bounds), default=0)
            if (stage == 'portrait' and width >= height) or (stage == 'landscape' and width <= height):
                time.sleep(1)
                continue
            if nodes and any(n.attrib.get('text') or n.attrib.get('content-desc') for n in nodes):
                (output / f'{stage}.xml').write_text(xml)
                return
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(1)
    raise AssertionError(f'No accessible application content: {stage}')


report = {'product': product, 'package': package, 'signer': 'DEBUG TEST CERTIFICATE ONLY',
          'physical_device': False, 'authenticated_flows': 'NOT_TESTED', 'checks': []}
try:
    apk = 'apps/expo-go/android/app/build/outputs/apk/release/app-release.apk'
    adb('install', '-r', apk)
    adb('logcat', '-c')
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0')
    for rotation, stage in [('0', 'portrait'), ('1', 'landscape')]:
        adb('shell', 'settings', 'put', 'system', 'user_rotation', rotation)
        adb('shell', 'am', 'start', '-W', '-n', f'{package}/.MainActivity')
        visible(stage)
        report['checks'].append(stage)
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-W', '-n', f'{package}/.MainActivity')
    visible('cold-relaunch')
    report['checks'].append('cold-relaunch')
    package_info = adb('shell', 'dumpsys', 'package', package)
    assert 'versionName=0.2.1' in package_info
    assert 'ALLOW_BACKUP' not in package_info
    crash_log = adb('logcat', '-d', '-b', 'crash')
    assert f'Process: {package},' not in crash_log, 'Application native/JS crash'
    report['checks'].extend(['version', 'backup-disabled', 'no-process-crash'])
    report['status'] = 'PASS'
finally:
    (output / 'result.json').write_text(json.dumps(report, indent=2))
    # Anonymous test process logs only. Never run this against a real account.
    (output / 'crash.log').write_text(adb('logcat', '-d', '-b', 'crash'))
print(json.dumps(report, indent=2))
