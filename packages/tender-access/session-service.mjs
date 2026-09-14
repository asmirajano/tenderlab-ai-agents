import {AccessDenied, APP_IDS} from './server-policy.mjs';

export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const PRODUCTION_ORIGINS = Object.freeze([
  'https://tenderapps-ai.web.app', 'https://tenderapps-ai.firebaseapp.com',
]);

export function requireMutationOrigin(origin, fetchSite) {
  if (!PRODUCTION_ORIGINS.includes(origin) ||
      (fetchSite && fetchSite !== 'same-origin')) throw new AccessDenied();
}

export function createSessionService({auth, verifyAppCheck, getMembership, revokeAppSessions, expectedAppId, now = Date.now}) {
  if (!expectedAppId || !auth || typeof verifyAppCheck !== 'function' || typeof getMembership !== 'function') {
    throw new TypeError('Session service requires explicit trusted adapters');
  }
  return {
    async login({idToken, appCheckToken, origin, fetchSite}) {
      requireMutationOrigin(origin, fetchSite);
      if (typeof idToken !== 'string' || idToken.length > 8192 || !idToken ||
          typeof appCheckToken !== 'string' || appCheckToken.length > 8192 || !appCheckToken) throw new AccessDenied(401);
      let identity;
      try {
        const proof = await verifyAppCheck(appCheckToken, {consume: true});
        if (proof.appId !== expectedAppId || proof.alreadyConsumed) throw new AccessDenied();
        identity = await auth.verifyIdToken(idToken, true);
      } catch { throw new AccessDenied(401); }
      const nowSeconds = Math.floor(now() / 1000);
      if (identity.aud !== 'tenderlab-ai-agents' ||
          identity.iss !== 'https://securetoken.google.com/tenderlab-ai-agents' ||
          identity.firebase?.sign_in_provider !== 'google.com' || identity.email_verified !== true ||
          !Number.isInteger(identity.auth_time) || nowSeconds - identity.auth_time > 300 ||
          identity.auth_time > nowSeconds + 30 || typeof identity.uid !== 'string' || !identity.uid) {
        throw new AccessDenied(401);
      }
      const membership = await getMembership(identity.uid);
      if (!membership || membership.enabled !== true || membership.uid !== identity.uid ||
          typeof membership.email !== 'string' || typeof identity.email !== 'string' ||
          membership.email.toLowerCase() !== identity.email.toLowerCase()) throw new AccessDenied();
      const apps = APP_IDS.filter(app => ['user', 'admin'].includes(membership.apps?.[app]));
      if (!apps.length) throw new AccessDenied();
      const cookie = await auth.createSessionCookie(idToken, {expiresIn: SESSION_LIFETIME_MS});
      return {cookie, maxAge: SESSION_LIFETIME_MS / 1000, apps};
    },
    async logout({cookie, origin, fetchSite}) {
      requireMutationOrigin(origin, fetchSite);
      // Expired or invalid credentials can still have their local cookie cleared.
      let identity;
      try { identity = await auth.verifySessionCookie(cookie, true); } catch { return; }
      // Do not report server-wide signout success if revocation itself fails.
      if (typeof revokeAppSessions !== 'function') throw new Error('App-scoped revocation required');
      await revokeAppSessions(identity.uid, Math.floor(now() / 1000));
    },
  };
}
