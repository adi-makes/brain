# Security notes for the auth foundation

## Cookies and sessions

The Next.js server uses `@supabase/ssr`. Session cookies are `SameSite=Lax` and `Secure` in production. The maintained Supabase browser client reads the session cookie, so it is not marked `HttpOnly`. A cross-site script could read it. The content security policy does not allow third-party scripts. Do not add one.

The proxy calls `auth.getUser()`, which checks the user with the Auth server, and refreshes the cookie. It does not trust a decoded access token by itself.

`/account` is the protected page. A missing session redirects to `/sign-in?next=/account`. `next` must be a same-origin path. Protocol-relative URLs and backslashes are discarded.

Sign-in, sign-up, and sign-out are server actions. They reject a request whose `Origin` host does not match the `Host` header.

## What is public

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are embedded in the browser. The anon key cannot bypass row-level security. `SUPABASE_SERVICE_ROLE_KEY` bypasses it. The frontend source must not mention that variable. The Next.js app does not create a service-role client.

## CORS

The FastAPI process allows credentialed browser calls only from `FRONTEND_ORIGIN`, default `http://127.0.0.1:3000`. Methods are the ordinary verbs. Headers are `authorization`, `content-type`, and `x-request-id`. There is no `*` origin.

## Rate limits

Supabase Auth already limits sign-in, sign-up, token refresh, and verification on the hosted project. The local `config.toml` records the same limits for tests. This phase does not add a second limiter in the Next.js process. When product writes exist, put a per-user limit in front of mutation routes and keep the Auth limits. Do not store the limiter state in the browser.

## Logging

Do not log `Authorization`, cookies, access tokens, refresh tokens, or the service-role key. Auth action errors returned to the page are generic. The API's unhandled-error response stays generic as well.

## Headers

The Next.js app sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a content security policy. Production builds also send `Strict-Transport-Security`. The script policy still allows inline scripts because the App Router emits them. A nonce-based policy is a later hardening step, not part of this foundation.
