# TenderApps shared access layer — implementation checkpoint

## Approved scope

Shared Firebase Google identity with independent balance/logistics/match entitlements. Initial administrator email was explicitly supplied by the user; resolve and bind its verified Firebase UID using a privileged provisioning operation before granting access. Do not grant access automatically to the first visitor or to all Google users. Keep personal account provisioning outside this public repository.

## Implemented access candidate

`packages/tender-access/server-policy.mjs` provides a server-only authorization policy with injected trusted verification/registry adapters. It requires Google identity, verified email, expected Firebase session issuer/audience, explicit UID/email membership, enabled status and per-app role. Firebase session verification must check revocation. Membership is reread on each request. Registry outages fail closed. Production configuration rejects emulator and bypass settings.

The implementation now includes Firebase Admin adapters, App Check session exchange, an HTTP gateway, a payload-free Google login client, a private manifest packager, and per-account AES-GCM browser case storage. Tests use synthetic identities; they do not prove real Google login or deployed protection. App-scoped logout records a revocation timestamp in the access membership instead of revoking sessions in unrelated Firebase apps.

Browser encryption adopts legacy TenderApps keys only for the explicitly provisioned original owner. It preserves the original plaintext if encrypted storage fails and verifies exact decryption before removing plaintext. Contents are not uploaded to Firestore; the per-account encryption key is served only after authorization and kept in memory. Case encryption needs real-browser validation before release. Existing local-only developer origins are unchanged and are not production-authenticated.

## Cloud preparation (2026-09-14)

With explicit user authority: Blaze billing linked; Functions/Run/Cloud Build/Artifact Registry/App Check/reCAPTCHA APIs enabled; a distinct TenderApps Access Firebase Web App and domain-restricted reCAPTCHA Enterprise key created; Google authorized domains extended only with both TenderApps production domains. A verified existing Google UID was provisioned as the initial administrator for all three apps in server-only tenderAccessMembers. A random case-encryption key was added without printing it. Live Firestore rules were inspected and already deny client access to this collection; no business rules or case data changed.

A dedicated tenderapps-access runtime identity has a custom role containing only firebaseauth.users.get, firebaseauth.users.createSession, firebaseappcheck.appCheckTokens.verify, datastore.entities.get and datastore.entities.update. Firestore IAM operates beyond a collection boundary; the runtime code restricts access to its membership collection, and the principal has no create/delete/list or general Firebase administrator permissions. Runtime configuration caps maxInstances=1 and minInstances=0; this is not a billing cap. No function or Hosting security release has been deployed at this checkpoint.

## Required next integration

1. Validate the implemented adapters and gateway with real Google identity and production App Check.
2. Deploy the gateway before the public bootstrap, after exact-commit CI passes; verify cookies and app-scoped logout.
3. Verify protected HTML, chunks and datasets, and direct/legacy escape-route denial. Existing public repository/history cannot become confidential retroactively.
4. Protect app APIs with the same entitlement checks. Leave Match's development-only API contract unchanged; do not promote development credentials to production.
5. Validate implemented encrypted case preservation and account switching in a real browser. This remains a release gate; do not label unit tests as that evidence.
6. Build local-only emulator adapters isolated from production. Production startup/build checks must reject emulator/bypass configuration.
7. Validate exact release, unauthorized direct routes/assets, owner login, session persistence, signout, revocation, app boundaries and representative saved cases. Human completes Google account chooser. Preserve rollback that does not reopen protected content.

## Live canary checkpoint — 2026-09-14

The gateway is deployed from manifest source 022badaf8da08f813a8f1d12058a6d757fcecf5f. Exact-source CI 34858677892 passed; canonical main checkpoint e1ade52043c351ed0566791f5bda0b8ef6dcbc9d also passed CI 34859540401. Subsequent login diagnostics and the Firebase Auth Google helper CSP correction are in d0fccc9. The payload-free bootstrap is deployed to tenderapps-ai, replacing public app delivery. This is an incomplete live authentication canary, not a verified usable private beta.

The Cloud Function is ACTIVE on Node 22, europe-west1, with the dedicated runtime service account, maximum one instance and 30-second timeout. Its service-level allUsers invoker permits reaching the gateway only; authorization precedes every private manifest read. Invalid-session denial passed all 121 paths on the direct Run endpoint and on both production Hosting domains (363 checks, no failures). Tests do not prove owner login, legitimate asset hydration, case migration or logout.

The initial browser attempt exposed a CSP omission for the installed Firebase Auth SDK's apis.google.com helper. That specific origin was added; the browser then reached Waiting for Google sign-in. Human Google selection remains required. Do not proceed to Match live backend activation until owner login, per-app hydration, preservation and logout checks pass.

The Firebase CLI reported successful Function deployment followed by a missing Artifact Registry cleanup-policy warning/error. No automatic image deletion was enabled. Runtime limits are not spending caps. No billing monitor or baseline registry update has been verified. Services Control creation has returned pending client IDs without a real task ID; do not represent its audit as running or complete.

No business database migration, Firestore rule change, Neon production promotion, or unrelated app deployment occurred. Existing parallel Balance work is preserved. Production app bytes are gated but historical public Git content cannot be made confidential retroactively. Runtime npm audit has two moderate transitive findings in uuid/gaxios; inspected runtime use is uuid.v4 rather than the advisory's affected buffer-writing operations. No high or critical findings were reported at packaging time.

## Verified access canary and controlled release automation — 2026-09-14

The later14665d9 release supersedes the incomplete checkpoint above: actual owner sign-in, all three app hydration,3 Logistics/10 Balance saved cases, an existing Balance result, logout204, and fresh sign-in passed. TenderMatch still uses its labeled pinned snapshot. No live production API is implied.

Controlled production entry: dispatch `deploy-firebase.yml` on canonical `main` with `scope=tenderapps`. A successful prior push-validation run for the exact SHA is mandatory, and the dispatched run repeats ordinary tests/builds. Other products and the old public TenderApps uploader remain excluded. Production runs serialize without cancellation. The workflow uses the existing GitHub secret (never printed) and the deploy identity's resource-level ability to act as the dedicated gateway runtime account.

The release script checks the existing protected profile, publishes only the codebase-qualified gateway, verifies provider runtime bounds/new source generation and direct denial, then publishes the matching payload-free Hosting and verifies both domains by exact public hashes plus protected-path denial. Only the pinned CLI's explicit post-success missing-cleanup-policy exit is classified as a warning; arbitrary errors stop before Hosting. No image cleanup policy or forced deletion is introduced. A failed confidentiality check requires the ordered rollback below; an authenticated owner replay remains a separate release verification.

## Closed rollback procedure

Versioned payload-free fallback: firebase.tenderapps-maintenance.json and apps/tender-access-maintenance/index.html. If the canary fails, disable the gateway first and deploy only this maintenance Hosting target. Never restore the old public app payload as a security rollback. No browser case or business data deletion is part of rollback. Record intentional retained Auth/App Check/IAM/billing resources separately; restoring Hosting alone does not undo them.
