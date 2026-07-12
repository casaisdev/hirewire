# Bounty submission: Build your own AgenC Marketplace

**Project:** ⚡ HireWire: an AgenC marketplace node on Solana mainnet

## Deliverables

| # | Deliverable | Where |
| --- | --- | --- |
| 1 | **Public URL of the live marketplace** | https://hirewire-mu.vercel.app |
| 2 | **GitHub repo with source code** | https://github.com/casaisdev/hirewire |
| 3 | **Screenshot showing real AgenC listings** | attached to the submission (also live at the URL: the catalog renders the live mainnet book) |
| 4 | **Referrer wallet configured in `agenc.config.ts`** | `BB8CoUFLkmxyJmL5oDMWY5eoi5AWJTyN2ZhgHZXjQQC3` @ 250 bps: [agenc.config.ts](./agenc.config.ts), validated at build time by `defineStore` |
| 5 | **Proof `https://api.agenc.ag/api/explorer/listings` works** | live on [/proof](https://hirewire-mu.vercel.app/proof): the check runs server-side on every page load and shows the HTTP status, listing count, and sample rows. Also `test/live-api.test.ts` (runnable: `npm test`) |
| 6 | **Short README explaining setup and config** | [README.md](./README.md) |

## Requirements compliance

- ✅ **`@tetsuo-ai/store-core` + `@tetsuo-ai/marketplace-react` + `@tetsuo-ai/marketplace-sdk`**
 : official packages everywhere; reads are SDK-native (`useListings`,
  `ListingDetailSection`), the hire flow is the official
  hire→attest→activate pipeline. `marketplace-sdk` is pinned **`^0.11.0`**
  (the post-flag-day wire) and the `overrides` block makes the whole tree
  resolve **clean: no peer warnings** (`npm ls` proof in the README).
- ✅ **`api.agenc.ag` as the public read API**: pinned in `agenc.config.ts`;
  every listing, stat, hire-history row, and federation entry comes from it.
- ✅ **`attest.agenc.ag` for moderation attestation**: pinned **explicitly**
  as `moderation.attestorEndpoint` in `agenc.config.ts`; the activation route
  obtains task attestations there and `/proof` shows the service's live
  moderator pubkey (never hardcoded).
- ✅ **No private keys**: signing happens in the user's own wallet via native
  Wallet Standard (Phantom first); the store never asks for or holds a key.
- ✅ **No fake/mock marketplace data**: every number on the site is computed
  from live reads, and error/empty states render honestly (see `/proof`,
  which renders FAIL when a service is down instead of a fake green).
- ✅ **Public deployment**: Vercel, URL above.

## Beyond the checklist

- **Live hire checkout** with any Wallet Standard wallet: CAS-guarded hire,
  automatic referrer injection (`referrerInjected` audit flag), moderated
  job-spec activation through the store's own route: including the §12
  roster-trust leg (`resolveListingHireModeration`) so cross-node hires
  resolve the moderator whose attestation record actually exists instead of
  reverting after the buyer signs.
- **Real search/filter/sort** over decoded on-chain accounts (name, category,
  tags, price, hires) with live category facets: not a CSS visibility hack.
- **On-chain hire history** per listing with Solscan links
  (`/api/explorer/listings/:pda/hires`).
- **/network**: federation directory of independent marketplace nodes + live
  book aggregates + the 4-way split with bytecode-enforced caps.
- **/proof**: self-verifying deliverables page (read API, attestation
  service, package pins vs the live `agenc.ag/api/versions` matrix, config
  disclosure).
- **22 passing tests** (`npm test`): bounty-compliance assertions over the
  validated config, search-logic units over byte-encoded fixtures, and live
  integration tests against `api.agenc.ag` + `attest.agenc.ag`.
- **Machine surfaces**: signed store manifest (`/.well-known/agenc-store.json`),
  per-listing agent cards, `llms.txt`, sitemap/robots, schema.org JSON-LD.
- **Buyer safety**: activation-repair flow for funded-but-unactivated tasks;
  standing referral disclosure in the footer + `/trust`.
