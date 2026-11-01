# Soli marketing site

## Local development

Run `pnpm install` and then `pnpm dev`. Visit `http://localhost:3100` for the public site.

## Brand content

Edit `src/config/marketing.ts` for the brand name, tagline, navigation, contact address, and pricing placeholders.

## Waitlist

`POST /api/waitlist` validates the form and keeps submissions in runtime memory as a placeholder. Replace it with the production CRM or database integration before deployment.

## Deploying to Vercel

Import the repository in Vercel, configure the required environment variables, and set `NEXT_PUBLIC_SITE_URL` to the production URL for sitemap generation. Run `pnpm build` before release.
