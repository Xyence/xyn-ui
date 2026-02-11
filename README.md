# xyn-ui

Mobile-first provisioning UI for Xyn Seed.

## Requirements
- Node.js 18+
- npm / pnpm / yarn

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

## Environment
- `VITE_API_BASE_URL` (default: current origin)
- `VITE_AUTH_MODE` (dev|oidc) default dev

## Notes
This UI relies on existing xyn-api staff session cookies in dev mode.

## Shared Login
- Apps should redirect users to the platform login route:
  - `/auth/login?appId=<appId>&returnTo=<url>`
- Do not implement app-specific provider pickers in individual apps.

## SPA routing fallback
When deploying behind a reverse proxy, ensure all public routes (e.g. `/about`, `/articles`, `/articles/:slug`) resolve to `index.html`. The provided `nginx.conf` already includes:

```
location / {
  try_files $uri /index.html;
}
```

If using a different proxy, replicate that behavior.
