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
This UI relies on existing xyence-web staff session cookies in dev mode.
