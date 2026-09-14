import {AccessDenied, APP_IDS} from './server-policy.mjs';

const cookieName = '__session';
export function readSessionCookie(header = '') {
  const matches = header.split(';').map(item => item.trim()).filter(item => item.startsWith(cookieName + '='));
  if (matches.length !== 1) return '';
  const value = matches[0].slice(cookieName.length + 1);
  return /^[A-Za-z0-9._-]{1,8192}$/.test(value) ? value : '';
}

export function createAccessHandler({authorize, sessions, resolveAsset, readAsset, getBrowserAccount}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const cookie = readSessionCookie(req.headers.cookie);
    const origin = req.headers.origin;
    const fetchSite = req.headers['sec-fetch-site'];
    // URL parsing must not normalize traversal into a permitted manifest path.
    const raw = req.url.split('?')[0];
    if (/%|\\|\0|\/\.|\/\//.test(raw)) { res.statusCode = 404; res.end(); return; }
    try {
      if (raw === '/__access/login') {
        if (req.method !== 'POST') throw new AccessDenied(405);
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) throw new AccessDenied(415);
        if (!req.body || Buffer.byteLength(JSON.stringify(req.body)) > 20000) throw new AccessDenied(400);
        const result = await sessions.login({...req.body, origin, fetchSite});
        res.setHeader('Set-Cookie', `${cookieName}=${result.cookie}; Max-Age=${result.maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({apps: result.apps}));
        return;
      }
      if (raw === '/__access/logout') {
        if (req.method !== 'POST') throw new AccessDenied(405);
        await sessions.logout({cookie, origin, fetchSite});
        res.setHeader('Set-Cookie', `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
        res.statusCode = 204; res.end(); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new AccessDenied(405);
      if (raw === '/__access/me') {
        const apps = [];
        for (const app of APP_IDS) {
          try { await authorize(cookie, app); apps.push(app); }
          catch (error) { if (!(error instanceof AccessDenied) || error.status !== 403) throw error; }
        }
        if (!apps.length) throw new AccessDenied();
        res.setHeader('Content-Type', 'application/json');
        const account = getBrowserAccount ? await getBrowserAccount(cookie, apps[0]) : {};
        res.end(JSON.stringify({apps, ...account})); return;
      }
      const entry = resolveAsset(raw);
      if (!entry) throw new AccessDenied(404);
      // The trusted manifest owns app attribution. A request cannot choose its entitlement.
      await authorize(cookie, entry.app);
      const bytes = await readAsset(entry);
      res.setHeader('Content-Type', entry.contentType);
      res.statusCode = 200;
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      const status = error instanceof AccessDenied ? error.status : 503;
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: status === 503 ? 'Service unavailable' : 'Access denied'}));
    }
  };
}
