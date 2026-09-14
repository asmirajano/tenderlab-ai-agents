// Server-only policy. Never use client-supplied decoded claims as identity.
export const APP_IDS = Object.freeze(['balance', 'logistics', 'match']);
const roles = new Set(['user', 'admin']);

export class AccessDenied extends Error {
  constructor(status = 403) {
    super('Access denied');
    this.status = status;
  }
}

export function assertProductionConfiguration(env) {
  if (env.GCLOUD_PROJECT !== 'tenderlab-ai-agents' ||
      env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST ||
      env.AUTH_BYPASS || env.VITE_AUTH_BYPASS) {
    throw new Error('Unsafe production access configuration');
  }
}

/** Dependencies must be trusted server adapters (Firebase Admin, server registry).
 * Membership is fetched on each request so revocation does not wait for cookie expiry.
 * No email-only bootstrap or implicit administrator is allowed.
 */
export function createAuthorizer({verifySessionCookie, getMembership}) {
  if (typeof verifySessionCookie !== 'function' || typeof getMembership !== 'function') {
    throw new TypeError('Trusted identity and membership adapters are required');
  }
  return async function authorize(cookie, app, {admin = false} = {}) {
    if (!APP_IDS.includes(app)) throw new AccessDenied();
    if (typeof cookie !== 'string' || !cookie || cookie.length > 8192) throw new AccessDenied(401);
    let identity;
    try {
      identity = await verifySessionCookie(cookie, true);
    } catch {
      throw new AccessDenied(401);
    }
    if (!identity || typeof identity.uid !== 'string' || !identity.uid ||
        identity.aud !== 'tenderlab-ai-agents' ||
        identity.iss !== 'https://session.firebase.google.com/tenderlab-ai-agents' ||
        identity.email_verified !== true || typeof identity.email !== 'string' ||
        identity.firebase?.sign_in_provider !== 'google.com') throw new AccessDenied(401);
    let member;
    try { member = await getMembership(identity.uid); }
    catch { throw new AccessDenied(503); }
    const role = member?.apps?.[app];
    if (member?.revokedBefore !== undefined &&
        (!Number.isFinite(member.revokedBefore) || !Number.isFinite(identity.iat) || identity.iat <= member.revokedBefore)) throw new AccessDenied(401);
    if (member?.enabled !== true || member.uid !== identity.uid ||
        typeof member.email !== 'string' ||
        member.email.toLowerCase() !== identity.email.toLowerCase() ||
        !roles.has(role) || (admin && role !== 'admin')) throw new AccessDenied();
    return Object.freeze({uid: identity.uid, app, role});
  };
}
