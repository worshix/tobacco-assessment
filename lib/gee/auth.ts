import { createSign } from 'crypto';

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getGEEToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const email = process.env.GEE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GEE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/earthengine',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = `${headerB64}.${payloadB64}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${signingInput}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    throw new Error(`GEE token exchange failed: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };

  return tokenCache.token;
}
