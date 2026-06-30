import json, sys, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')
base='http://127.0.0.1:4311'
paths=['/thesfm-trader-own/app/styles.css?v=probe','/thesfm-trader-own/app/app.js?v=probe','/api/trader/status','/api/trader/scanner/results?market=US']
for path in paths:
    url=base+path
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            body=r.read(500).decode('utf-8','replace')
            print(json.dumps({'url':url,'status':r.status,'contentType':r.headers.get('content-type'),'bodyPreview':body[:240]},ensure_ascii=False))
    except urllib.error.HTTPError as e:
        body=e.read(500).decode('utf-8','replace')
        print(json.dumps({'url':url,'status':e.code,'contentType':e.headers.get('content-type'),'bodyPreview':body[:240]},ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'url':url,'error':str(e)},ensure_ascii=False))
