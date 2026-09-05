# StripeFlow — Cloudflare Pages + Supabase

StripeFlow is now prepared for this production architecture:

- **Cloudflare Pages** → hosts the web app
- **Cloudflare Pages Function** → exposes runtime configuration without committing credentials
- **Supabase Auth** → login
- **Supabase PostgreSQL** → persistent StripeFlow state
- **Browser localStorage** → short-lived UI cache only; Supabase is the source of truth

## 1. Supabase

Create a Supabase project and open **SQL Editor**.

Run:

`supabase/stripeflow_schema.sql`

Then create the users in **Authentication → Users**. The app intentionally has no public sign-up page.

The default shared workspace ID is:

`00000000-0000-0000-0000-000000000001`

## 2. Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages.

No special build command is required for the standalone StripeFlow page. The important files are served directly from the repository root:

- `/stripeflow/` → StripeFlow entry point
- `/stripe-saas.html` → existing StripeFlow application
- `/stripeflow-cloud-sync.js` → Supabase sync/auth layer
- `/functions/stripeflow-config.js` → Cloudflare runtime configuration endpoint

## 3. Cloudflare environment variables

In Cloudflare Pages → Settings → Environment variables, add these for **Production** (and Preview if you want previews to work):

- `STRIPEFLOW_SUPABASE_URL` = your Supabase project URL
- `STRIPEFLOW_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable/anon key
- `STRIPEFLOW_WORKSPACE_ID` = `00000000-0000-0000-0000-000000000001`

The publishable/anon key is designed for browser use; database security comes from Supabase Row Level Security. Never put a Supabase `service_role` key in the browser or Cloudflare public configuration endpoint.

## 4. Production URL

After deployment, open:

`https://YOUR-CLOUDFLARE-DOMAIN/stripeflow/`

The trailing slash is intentional because this is the static `stripeflow/index.html` entry point.

## 5. Refresh behavior

The selected Dashboard/Nahid/Linkon/Shorikul/Settings section is persisted by the existing StripeFlow navigation patch.

The complete tracker state is synchronized to Supabase. On refresh, the app restores the selected section and loads the latest cloud state instead of relying on the old browser-only localStorage data.

## 6. Important security note

The current SQL policy allows any authenticated user in this Supabase project to access the StripeFlow state row. For a dedicated StripeFlow Supabase project with only the intended users, this is acceptable for the first production deployment. If the same Supabase project will host unrelated applications, replace the broad authenticated policies with workspace-membership policies before production use.
