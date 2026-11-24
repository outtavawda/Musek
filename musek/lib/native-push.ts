import { createSign, sign as cryptoSign } from "node:crypto";
import { connect } from "node:http2";

export type NativePushPlatform = "ios" | "android";

export type NativePushMessage = {
  title: string;
  body: string;
  url: string;
};

export type NativePushResult = {
  delivered: boolean;
  expired: boolean;
};

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

let apnsJwtCache: { value: string; expiresAt: number } | null = null;
let fcmTokenCache: { value: string; expiresAt: number } | null = null;

function apnsProviderToken() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_AUTH_KEY;
  if (!keyId || !teamId || !privateKey) throw new Error("APNs credentials are not configured.");

  if (apnsJwtCache && apnsJwtCache.expiresAt > Date.now() + 60_000) return apnsJwtCache.value;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const unsigned = `${header}.${claims}`;
  const key = privateKey.replace(/\\n/g, "\n");
  const signature = cryptoSign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363"
  });
  const value = `${unsigned}.${base64url(signature)}`;
  apnsJwtCache = { value, expiresAt: Date.now() + 50 * 60 * 1000 };
  return value;
}

async function sendApns(deviceToken: string, message: NativePushMessage): Promise<NativePushResult> {
  const topic = process.env.APNS_BUNDLE_ID || "com.musek.app";
  const host = process.env.APNS_HOST || "https://api.push.apple.com";
  const jwt = apnsProviderToken();
  return await new Promise((resolve, reject) => {
    const client = connect(host);
    let settled = false;
    const finish = (error?: Error, result?: NativePushResult) => {
      if (settled) return;
      settled = true;
      client.close();
      if (error) reject(error);
      else resolve(result!);
    };
    client.once("error", error => finish(error));
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${encodeURIComponent(deviceToken)}`,
      "authorization": `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json"
    });
    let responseStatus = 0;
    let responseBody = "";
    request.on("response", headers => { responseStatus = Number(headers[":status"] || 0); });
    request.setEncoding("utf8");
    request.on("data", chunk => { responseBody += chunk; });
    request.on("end", () => {
      if (responseStatus === 200) return finish(undefined, { delivered: true, expired: false });
      let reason = "";
      try { reason = JSON.parse(responseBody).reason || ""; } catch {}
      const expired = responseStatus === 410 || reason === "Unregistered" || reason === "BadDeviceToken";
      finish(undefined, { delivered: false, expired });
    });
    request.on("error", error => finish(error));
    client.setTimeout(10_000, () => request.close());
    request.end(JSON.stringify({
      aps: { alert: { title: message.title, body: message.body }, sound: "default" },
      url: message.url
    }));
  });
}

async function fcmAccessToken() {
  if (fcmTokenCache && fcmTokenCache.expiresAt > Date.now() + 60_000) return fcmTokenCache.value;
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FCM service account is not configured.");
  const account = JSON.parse(raw) as { project_id?: string; client_email?: string; private_key?: string; token_uri?: string };
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("FCM service account JSON is missing required fields.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(account.private_key.replace(/\\n/g, "\n")))}`;
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !result.access_token) throw new Error("Could not obtain an FCM access token.");
  fcmTokenCache = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number(result.expires_in) || 3600) * 1000
  };
  return result.access_token;
}

async function sendFcm(deviceToken: string, message: NativePushMessage): Promise<NativePushResult> {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FCM service account is not configured.");
  const account = JSON.parse(raw) as { project_id?: string };
  if (!account.project_id) throw new Error("FCM project_id is missing.");
  const accessToken = await fcmAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: message.title, body: message.body },
        data: { url: message.url },
        android: { priority: "HIGH", notification: { sound: "default" } }
      }
    })
  });
  if (response.ok) return { delivered: true, expired: false };
  const error = await response.json().catch(() => null) as {
    error?: { status?: string; details?: Array<{ errorCode?: string }> }
  } | null;
  const codes = error?.error?.details?.map(detail => detail.errorCode) || [];
  const expired = error?.error?.status === "NOT_FOUND" || codes.includes("UNREGISTERED");
  return { delivered: false, expired };
}

export async function deliverNativePush(
  platform: NativePushPlatform,
  deviceToken: string,
  message: NativePushMessage
): Promise<NativePushResult> {
  return platform === "ios"
    ? sendApns(deviceToken, message)
    : sendFcm(deviceToken, message);
}
