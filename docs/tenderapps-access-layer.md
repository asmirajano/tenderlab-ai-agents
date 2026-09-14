# TenderApps shared access layer — implementation checkpoint

## Approved scope

Shared Firebase Google identity with independent balance/logistics/match entitlements. Initial administrator email was explicitly supplied by the user; resolve and bind its verified Firebase UID using a privileged provisioning operation before granting access. Do not grant access automatically to the first visitor or to all Google users. Keep personal account provisioning outside this public repository.

## Implemented, not deployed

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

## State

Base source: 389b5fafb661c67e8483f0cf87c568b7fea29115, fetched origin/main and deployed release at checkpoint. These additions are uncommitted implementation work, not a production release. Existing production Hosting, databases and app entrypoints were not modified. Blaze billing was separately enabled with explicit user approval. Services Control was requested in App Roadmap to audit the canonical Services registry and monitoring gaps; no monitor is implied by that delegation.
