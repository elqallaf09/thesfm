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

1. Go to https://render.com
2. New + -> Web Service
3. Connect GitHub repository
4. Choose the same repository
5. Set:
   - Name: `the-sfm-openbb-service`
   - Root Directory: `openbb-service`
   - Environment: `Docker`
   - Dockerfile Path: `openbb-service/Dockerfile`
6. Deploy
7. After deployment, test:
   - `https://YOUR-SERVICE-NAME.onrender.com/health`
8. Copy the Render URL
9. Add it to Vercel environment variables:
   - `OPENBB_SERVICE_URL=https://YOUR-SERVICE-NAME.onrender.com`
10. Redeploy THE SFM on Vercel.

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
