# zerofill.tech

Public site for ZeroFill Tech (Las Vegas): free e-waste pickup, certified data destruction (PURGE), refurbished tech.

Single static page, no build step. Hosted on GitHub Pages, domain at Porkbun.

## Files
- `index.html` — the whole site (CSS + JS embedded). Edit the `CONFIG` block at the bottom to set phone / email / form endpoint.
- `CNAME` — custom domain for GitHub Pages (`zerofill.tech`).
- `.nojekyll` — tells Pages to serve files as-is.

## Edit the contact details
Open `index.html`, find `const CONFIG`, fill in:
- `CONTACT_PHONE` — E.164, e.g. `"+17025550100"`. Shows a "Text us" link. Leave `""` to hide.
- `CONTACT_EMAIL` — defaults to `hello@zerofill.tech` (set up free email forwarding at Porkbun: Domain Management -> Email Forwarding).
- `FORM_ENDPOINT` — optional. Create a free form at https://formspree.io, paste the URL. Requests then arrive by email with no backend. Leave `""` and the form opens the visitor's mail app pre-filled instead.

## DNS at Porkbun (one time)
Domain Management -> zerofill.tech -> DNS. Delete the default parking records, add:

| Type  | Host | Answer                      |
|-------|------|-----------------------------|
| A     |      | 185.199.108.153             |
| A     |      | 185.199.109.153             |
| A     |      | 185.199.110.153             |
| A     |      | 185.199.111.153             |
| CNAME | www  | the-whetherman.github.io    |

Then GitHub -> repo Settings -> Pages -> Custom domain `zerofill.tech` -> tick "Enforce HTTPS" once the check passes (can take up to an hour).

## Business repo
Internal docs, tracker and notes live in the private `ewaste-recovery` repo. Nothing sensitive belongs here — this repo is public.
