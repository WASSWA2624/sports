# cPanel Deployment

This app should be deployed to cPanel as a Node.js application, not as a static export. The build includes dynamic localized routes, a health API route, proxy/middleware behavior, and `next/image`, so a plain HTML export is not the right production target.

## Before You Start

- Your hosting account needs cPanel's `Application Manager` or `Setup Node.js App`.
- Your host needs Node.js `20.9.0` or newer for this Next.js 16 app.
- Your final production URL should be known before you build, because `sitemap.xml`, `robots.txt`, and page metadata use that URL at build time.

If your host only supports PHP or static files, this project will not run there as-is.

## 1. Prepare Production Environment Values

Start from `.env.production.example` and create a local `.env.production` with your real domain:

```env
NEXT_PUBLIC_SITE_URL=https://scores.example.com
SITE_URL=https://scores.example.com
RELEASE_CHANNEL=production
```

Optional provider API keys can stay unset if you are shipping the current in-repo football data experience.

## 2. Build The cPanel Bundle

Install dependencies and create the production artifact:

```bash
npm ci
npm run package:cpanel
```

That command does three things:

1. validates the production URL and Node version
2. runs `next build` with standalone output
3. assembles a deployable bundle in `build/cpanel`

The bundle contains:

- the standalone Next.js server
- traced runtime dependencies
- `public/`
- `.next/static/`
- an `app.js` startup wrapper for cPanel
- `.env.production.example` for reference
- a `tmp/` directory for Passenger restarts
- no copied local `.env` files

## 3. Upload To cPanel

Upload the contents of `build/cpanel/` to the application root directory you want cPanel to run.

Typical examples:

- `~/nodeapps/sports`
- `~/apps/sports`
- a subdomain document root that you attach through cPanel

The important part is that `app.js` ends up in the application root.

## 4. Configure The App In cPanel

In cPanel `Application Manager` or `Setup Node.js App`, use:

- Node.js version: `20.9.0+`
- Application root: the uploaded folder that contains `app.js`
- Application URL: your domain or subdomain
- Application startup file: `app.js`

Environment variables to set in cPanel:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://scores.example.com`
- `SITE_URL=https://scores.example.com`
- `RELEASE_CHANNEL=production`

Optional environment variables:

- `RELEASE_VERSION`
- `RELEASE_NOTES_URL`
- `RELEASE_SUPPORT_OWNER`
- `RELEASE_SUPPORT_CHANNEL`
- provider credentials such as `SPORTSMONKS_API_KEY`

## 5. Restart After Changes

cPanel runs Node.js apps through Passenger. After replacing files or changing environment variables, restart the app from cPanel or update the restart file:

```bash
touch tmp/restart.txt
```

## 6. Smoke Test

After startup, verify:

- `/`
- `/en`
- `/fr`
- `/sw`
- `/api/health`
- `/sitemap.xml`

`/api/health` should return a JSON payload with `status: "ok"`.

## Deployment Notes

- Rebuild if your production domain changes. `robots.txt`, `sitemap.xml`, and canonical metadata are generated from the build-time site URL.
- The prepared standalone bundle already contains the runtime files Next.js traced for the server, so you should not need a full `npm install` on the host just to start the app.
- If your host does not expose Node.js through Application Manager or Setup Node.js App, the practical path is a VPS or a Node-friendly platform instead of shared cPanel-only hosting.

## References

- cPanel Application Manager docs: <https://docs.cpanel.net/cpanel/software/application-manager/102/>
- cPanel support on Passenger-backed applications: <https://support.cpanel.net/hc/en-us/articles/1500004167541-What-is-Application-Manager>
- cPanel restart procedure for Passenger apps: <https://support.cpanel.net/hc/en-us/articles/1500002443862-How-to-restart-an-application-that-s-using-cPanel-s-Application-Manager>
- Next.js self-hosting guide: <https://nextjs.org/docs/app/guides/self-hosting>
