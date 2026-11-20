# End-to-end checks in CI

After every push to the main branch, GitHub CI deploys the commit to the sandbox. Then it runs the 52 browser checks (`npm run e2e`) against the sandbox. A red result means the commit broke something.

The job needs two GitHub secrets. Without them, the job ends with a warning and does nothing. The other CI jobs run as before.

## Set it up once

1. Open `dash.cloudflare.com` and sign in with the community Google account.
2. Open **My Profile**, then **API Tokens**, then **Create Token**.
3. Pick the template **Edit Cloudflare Workers**. Press **Use template**.
4. Under **Permissions**, check that the list has **Account, D1, Edit**. If it does not, press **Add more** and add it.
5. Under **Account Resources**, pick the community account only.
6. Under **Zone Resources**, pick **All zones** (the template needs this field, and the site uses no zone).
7. Press **Continue to summary**, then **Create Token**.
8. Copy the token. Cloudflare shows it once. Save it in the password manager.
9. Open **Account Home**. Next to the account name, open the menu and press **Copy account ID**.
10. Open the repository on GitHub, then **Settings**, **Secrets and variables**, **Actions**, **New repository secret**.
11. Make the secret `CLOUDFLARE_API_TOKEN`. Paste the token.
12. Make the secret `CLOUDFLARE_ACCOUNT_ID`. Paste the account ID.
13. Tell Claude "I added the secrets". Claude starts one run and reads the result.

Never paste the token in a chat or a file. If the token reaches a chat or a public place, delete it on Cloudflare the same day and make a new one.

## What the token can do

The token can change anything in the Cloudflare account. This includes the real site and its database. The job uses it only on the sandbox. Only a push to the main branch can run the job, and a pull request cannot read the secret. Protect the GitHub login with two-step verification.

To stop the access, delete the two secrets on GitHub and delete the token on Cloudflare.

## When a run fails

1. Open the failed run on GitHub. Open the step **npm run e2e**.
2. Find the line that starts with `FAIL`.
3. Run `npm run e2e` on a PC with Chrome. Compare the result.
4. A check that fails only in CI is a flaky test. Fix it the same day.
