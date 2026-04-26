# Full-Stack Setup

The app runs as a full-stack church system with:

- Frontend: [index.html](/C:/Users/reatp/OneDrive/Desktop/cog-system/index.html)
- Backend: [server.js](/C:/Users/reatp/OneDrive/Desktop/cog-system/server.js)
- Docker runtime: [Dockerfile](/C:/Users/reatp/OneDrive/Desktop/cog-system/Dockerfile)
- Environment template: [.env.example](/C:/Users/reatp/OneDrive/Desktop/cog-system/.env.example)
- Local JSON seed storage: [data/app-state.json](/C:/Users/reatp/OneDrive/Desktop/cog-system/data/app-state.json)

## What is already included

- Full frontend + backend API flow
- Role-based authentication and team access
- Audit logs
- Attendance, visitors, finance, reports, budgets, and activity management
- Server persistence beyond browser `localStorage`
- Optional SQLite storage through Node's built-in `node:sqlite`
- Public-deployment-aware startup for Railway, Render, Docker, and other Node hosts

## Local run

1. Open a terminal in `C:\Users\reatp\OneDrive\Desktop\cog-system`
2. Optional but recommended: copy `.env.example` to `.env` and adjust any local settings you want to override.
3. Run `npm start`
4. Open `http://127.0.0.1:3000`

The server now auto-loads a local `.env` file when one exists, while still letting platform-provided environment variables win on Railway, Render, Docker, and other hosts.
The included `.env.example` is local-first on purpose, so it defaults to `json` storage in the workspace. If you want local SQLite on Windows, prefer `SQLITE_STATE_FILE` in `LocalAppData` instead of storing the SQLite file inside a synced OneDrive folder.

If you prefer one click on Windows, run [start-app.bat](/C:/Users/reatp/OneDrive/Desktop/cog-system/start-app.bat). It starts the local server in a new terminal window and opens the app in your default browser when the health check is ready.

## Storage modes

- `STORAGE_PROVIDER=json`
  Good for the simplest setup. Best when the app writes to a mounted `data` folder.
- `STORAGE_PROVIDER=sqlite`
  Recommended for public hosting. It keeps the app state in a single SQLite file and handles frequent updates more cleanly.

For local Windows development, SQLite is usually safest when `SQLITE_STATE_FILE` points to a non-synced folder such as `LocalAppData`. Keeping SQLite files inside synced folders can trigger file locking or disk I/O errors.

When SQLite starts for the first time, the server seeds from the JSON state file if one already exists.

## Public deployment

### Best first online host: Railway

Railway is the easiest first public deployment for this project because the app can run directly from the included Dockerfile and Railway volumes can persist church data.

Recommended Railway setup:

1. Push this project to GitHub.
2. Create a new Railway project and connect the repository.
3. Add a public domain to the web service.
4. Add a volume and mount it at `/app/data`.
5. Set these service variables:
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `STORAGE_PROVIDER=sqlite`
   - `APP_DATA_DIR=/app/data`
6. Set the healthcheck path to `/api/health`.
7. Deploy the service.

The included Dockerfile already defaults to `APP_DATA_DIR=/app/data`, `HOST=0.0.0.0`, and `STORAGE_PROVIDER=sqlite`, so Railway only needs a mounted volume plus the normal deploy flow.

### Render alternative

Render also works well with this project, especially through the included Dockerfile.

Recommended Render setup:

1. Push this project to GitHub.
2. Create a new Web Service on Render.
3. Choose the `Docker` runtime so Render builds from [Dockerfile](/C:/Users/reatp/OneDrive/Desktop/cog-system/Dockerfile).
4. Attach a persistent disk mounted at `/app/data`.
5. Set these environment variables:
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `STORAGE_PROVIDER=sqlite`
   - `APP_DATA_DIR=/app/data`
6. Set the health check path to `/api/health`.
7. Deploy the service and attach a custom domain if needed.

## Environment values

- `NODE_ENV`
  Use `production` on a public deployment.
- `HOST`
  Use `0.0.0.0` on hosted platforms.
- `PORT`
  Server port. Platforms like Railway inject this automatically.
- `PUBLIC_BASE_URL`
  Optional explicit public URL. If blank, the server can infer it on Railway or Render.
- `STORAGE_PROVIDER`
  `json` or `sqlite`.
- `APP_DATA_DIR`
  Preferred shared storage folder. Public Docker deployments should usually use `/app/data`.
- `JSON_STATE_FILE`
  Optional explicit JSON state file path.
- `SQLITE_STATE_FILE`
  Optional explicit SQLite file path.
- `CORS_ORIGIN`
  Optional explicit frontend origin.
- `MAX_REQUEST_BODY_BYTES`
  Request size cap for profile images and data import/export.

## Online go-live checklist

1. Open the public site URL.
2. Confirm `/api/health` returns `ok: true`.
3. Log in as `admin` and change the default password.
4. Create the first real `Finance` and `Secretary` accounts.
5. Run a backup from `Settings`.
6. Add the church's custom domain if needed.
7. Keep only one replica while using file-based storage on a mounted disk/volume.

## Current login flow

- First-time setup can still use the default access and signup flow.
- After setup, login is handled through the backend user system.
- Admins manage team accounts in `Settings`.
- Role visibility is enforced in the UI so each worker sees only the sections they should use.
