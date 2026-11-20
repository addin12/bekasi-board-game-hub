# Secrets: where each one lives and what its loss breaks

This page answers audit finding H2. It lists names only. Never write a value in this file, in git, or in chat.

## Where the values are

| Place | What it holds | Protect it by |
|---|---|---|
| Cloudflare Worker secrets | The live values. Cloudflare cannot show a value again after you set it. | Two-step verification on the Cloudflare login. |
| `.dev.vars` on this PC | Local development values, plus the Google and Gmail values. | Git ignores it. |
| `.dev.vars.production` and `.dev.vars.staging` on this PC | The **complete** set for each site, saved by `node scripts/rotate-secrets.mjs --env <site>`. | Git ignores it. **Copy each file into a password manager.** |
| A password manager (owner) | A copy of the two files above, the Google client JSON, the Gmail app password, and the recovery codes of both accounts. | A strong master password and its own two-step verification. |

Without the copy in a password manager, a lost PC takes the secrets with it. The site keeps running, but you must make new secrets.

## Each secret

| Name | Used for | If you lose it | How to replace it |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Signs the sign-in session cookie. | Everybody signs in again. Nothing else breaks. | `node scripts/rotate-secrets.mjs --env production` |
| `PASSCODE_KEY` | Keys the hash of the member passcode. | The stored passcode stops working. An admin sets a new one in Admin, Site. | The same command. Then set the passcode again. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Sign phone notifications. | Every phone must turn notifications on again in Settings. | The same command. |
| `BGG_TOKEN` | Reads game data from BoardGameGeek. | The site cannot add new games from BGG. | Make a token at boardgamegeek.com/applications. Put it in `.dev.vars`, then run the rotate command. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google". | Google sign-in stops. | In the Google console, open the OAuth client and add a new secret. Put both values in `.dev.vars`, then run the rotate command. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Sign-in codes and the free-plan alert email. | Email codes and alert emails stop. | Make a new app password at myaccount.google.com/apppasswords. Put it in `.dev.vars`, then run the rotate command. Revoke the old one. |
| `BETTER_AUTH_URL` | The public address of the site. | Not a secret. | It is in the rotate script. |
| `CSP_MODE`, `R2_FREE_BYTES` | Optional switches. | Nothing breaks. | `wrangler secret put <NAME>` |

## Rotating

A rotation makes new secrets for one site, saves the complete set in its ignored file, and sets them on Cloudflare:

```
node scripts/rotate-secrets.mjs --env staging
node scripts/rotate-secrets.mjs --env production
```

Effect: everybody signs in again, the member passcode must be set again, and every phone turns notifications on again. Rotate when a secret may have leaked, when someone who knew a secret leaves, and at least once a year.

## The two accounts

- **Cloudflare** (bekasibgcom@gmail.com) and **Google** (the same address) control the site. Turn on two-step verification on both. Save the recovery codes in the password manager.
- If the owner of these accounts is not available, nobody can fix the site. Decide who else holds the recovery codes.

## Rules

- No secret in git. The CI job `secret-scan` checks every push, and Git ignores `.dev.vars*`.
- One credential for one job. Do not reuse the Gmail password or the Google secret for another app.
- If a secret reaches a chat, a screenshot, or a public place, rotate it the same day.
