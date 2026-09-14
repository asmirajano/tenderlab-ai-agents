import {getApps, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getAppCheck} from 'firebase-admin/app-check';
import {getFirestore} from 'firebase-admin/firestore';
import {assertProductionConfiguration, createAuthorizer} from './server-policy.mjs';
import {createSessionService} from './session-service.mjs';

export function createFirebaseAdapters(env = process.env) {
  assertProductionConfiguration(env);
  if (!env.TENDER_ACCESS_APP_ID) throw new Error('Access application identity required');
  const app = getApps().find(candidate => candidate.name === 'tender-access') ??
    initializeApp({projectId: 'tenderlab-ai-agents'}, 'tender-access');
  const auth = getAuth(app);
  const store = getFirestore(app);
  const getMembership = async uid => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return null;
    const snapshot = await store.collection('tenderAccessMembers').doc(uid).get();
    return snapshot.exists ? snapshot.data() : null;
  };
  const authorize = createAuthorizer({verifySessionCookie: (cookie, revoked) => auth.verifySessionCookie(cookie, revoked), getMembership});
  return {
    authorize,
    getBrowserAccount: async (cookie, appId) => {
      const principal = await authorize(cookie, appId);
      const member = await getMembership(principal.uid);
      if (!/^[a-f0-9]{64}$/.test(member?.caseKey ?? '')) throw new Error('Case-vault provisioning required');
      return {uid: principal.uid, caseKey: member.caseKey, adoptLegacy: member.adoptLegacy === true};
    },
    sessions: createSessionService({auth, getMembership, expectedAppId: env.TENDER_ACCESS_APP_ID,
      revokeAppSessions: (uid, revokedBefore) => store.collection('tenderAccessMembers').doc(uid).update({revokedBefore}),
      verifyAppCheck: (token, options) => getAppCheck(app).verifyToken(token, options)}),
  };
}
