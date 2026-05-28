# THE SFM OpenBB Service

Separate FastAPI backend for THE SFM market analysis. This service is designed to run outside Vercel, for example on Render, Railway, Fly.io, or a VPS Docker host.

## Local Run

```bash
cd openbb-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Test Locally

- http://localhost:8000/health
- http://localhost:8000/market/analyze?symbol=AAPL&assetType=stock
- http://localhost:8000/market/history?symbol=AAPL&assetType=stock&period=6m
- http://localhost:8000/market/compare?symbols=AAPL,MSFT,TSLA&assetType=stock
- http://localhost:8000/market/search?q=apple

## Render Deployment

This repository includes a root-level `render.yaml` blueprint for this service.

Blueprint settings:

- Branch: `main`
- Auto Deploy: On (`autoDeployTrigger: commit`)
- Root Directory: `openbb-service`
- Runtime: `Docker`
- Dockerfile Path: `Dockerfile`
- Docker Context: `.`
- Health Check Path: `/health`

If configuring the service manually in the Render dashboard, use the same values above. With `Root Directory` set to `openbb-service`, the Dockerfile path is relative to that directory, so use `Dockerfile` or leave it blank. Do not use `openbb-service/Dockerfile` after setting the root directory.

1. Go to https://render.com
2. New + -> Blueprint, or New + -> Web Service for manual setup
3. Connect GitHub repository
4. Choose the same repository and branch `main`
5. Deploy
6. After deployment, test:
   - `https://YOUR-SERVICE-NAME.onrender.com/health`
7. Copy the Render URL
8. Add it to Vercel environment variables:
   - `OPENBB_SERVICE_URL=https://YOUR-SERVICE-NAME.onrender.com`
9. Redeploy THE SFM on Vercel.

## Vercel Environment Variable

Required Vercel environment variable:

```text
OPENBB_SERVICE_URL=https://the-sfm-openbb-service.onrender.com
```

Steps:

1. Open the Vercel project.
2. Go to Settings.
3. Open Environment Variables.
4. Add `OPENBB_SERVICE_URL`.
5. Choose Production.
6. Save.
7. Redeploy THE SFM.

## Notes

- OpenBB is installed only in this Python service.
- The Next.js app should call its own `/api/market/*` routes, not this service directly from the browser.
- Responses are educational market analysis only and are not financial advice.
