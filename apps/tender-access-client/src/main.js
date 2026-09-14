import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, inMemoryPersistence, setPersistence} from 'firebase/auth';
import {initializeAppCheck, ReCaptchaEnterpriseProvider, getLimitedUseToken} from 'firebase/app-check';
import './style.css';

const app = initializeApp({apiKey: 'AIzaSyCtrmtw_VTU_gpIiokn0yonLiEMdgmGJms',
  authDomain: 'tenderlab-ai-agents.firebaseapp.com', projectId: 'tenderlab-ai-agents',
  appId: '1:398180283651:web:57dd419ed20dbfc5322536'});
const auth = getAuth(app);
const status = document.getElementById('status');
const signin = document.getElementById('signin');
const signout = document.getElementById('signout');
const links = document.getElementById('apps');
const destinations = {balance: ['TenderBalance', '/balance-sheet-review'],
  logistics: ['Tender Logistics', '/landed-cost'], match: ['TenderMatch', '/tendermatch']};
const allowedOrigins = ['https://tenderapps-ai.web.app', 'https://tenderapps-ai.firebaseapp.com'];
let appCheck;

function showApps(apps) {
  links.replaceChildren();
  for (const id of apps) {
    if (!Object.hasOwn(destinations, id)) continue;
    const a = document.createElement('a');
    [a.textContent, a.href] = destinations[id]; links.append(a);
  }
  signin.hidden = true; signout.hidden = false;
  status.textContent = 'Choose an authorized application.';
}

signin.addEventListener('click', async () => {
  signin.disabled = true; status.textContent = 'Waiting for Google sign-in…';
  try {
    if (!allowedOrigins.includes(location.origin)) throw new Error('This entry requires the approved production origin.');
    await setPersistence(auth, inMemoryPersistence);
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    appCheck ??= initializeAppCheck(app, {provider: new ReCaptchaEnterpriseProvider('6LeqQ7stAAAAAP2ml64TYG399UGU7l9RnaNWUmzn'), isTokenAutoRefreshEnabled: false});
    const proof = await getLimitedUseToken(appCheck);
    const response = await fetch('/__access/login', {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idToken: await result.user.getIdToken(), appCheckToken: proof.token})});
    if (!response.ok) throw new Error(response.status === 403 ? 'This account is not authorized.' : 'Sign-in could not establish a secure session.');
    const data = await response.json(); await signOut(auth); showApps(data.apps);
  } catch (error) {
    await signOut(auth).catch(() => {});
    status.textContent = error.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled.' : 'Access could not be established. Please retry or contact the administrator.';
  } finally { signin.disabled = false; }
});

signout.addEventListener('click', async () => {
  signout.disabled = true;
  try {
    const response = await fetch('/__access/logout', {method: 'POST', credentials: 'same-origin'});
    if (!response.ok) throw new Error('Logout unavailable');
    await signOut(auth); const channel = new BroadcastChannel('tenderapps-access'); channel.postMessage('logout'); channel.close();
    links.replaceChildren(); signout.hidden = true; signin.hidden = false;
    status.textContent = 'Signed out.';
  } catch { status.textContent = 'Sign-out could not be confirmed. Please retry.'; }
  finally { signout.disabled = false; }
});

if (allowedOrigins.includes(location.origin)) {
  fetch('/__access/me', {cache: 'no-store', credentials: 'same-origin'}).then(async response => {
    if (response.ok) showApps((await response.json()).apps);
  }).catch(() => { status.textContent = 'Service unavailable. Please retry.'; });
} else { signin.disabled = true; status.textContent = 'Production sign-in is disabled on this origin. Use the isolated development environment.'; }
