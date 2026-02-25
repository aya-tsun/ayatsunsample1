// --- Base64 URL encoding for JWT ---
function base64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

// --- JWT ---
export async function signJWT(payload, secret) {
  var encoder = new TextEncoder();
  var header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  var body = base64url(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })
  );
  var data = header + "." + body;

  var key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  var sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  var sigStr = String.fromCharCode.apply(null, new Uint8Array(sig));
  return data + "." + base64url(sigStr);
}

export async function verifyJWT(token, secret) {
  var parts = token.split(".");
  if (parts.length !== 3) return null;

  var encoder = new TextEncoder();
  var data = parts[0] + "." + parts[1];

  var key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  var sigStr = base64urlDecode(parts[2]);
  var sig = new Uint8Array(sigStr.length);
  for (var i = 0; i < sigStr.length; i++) sig[i] = sigStr.charCodeAt(i);

  var valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
  if (!valid) return null;

  var payload = JSON.parse(base64urlDecode(parts[1]));
  if (payload.exp && payload.exp < Date.now() / 1000) return null;

  return payload;
}

// --- Password Hashing (PBKDF2) ---
export async function hashPassword(password) {
  var encoder = new TextEncoder();
  var salt = crypto.getRandomValues(new Uint8Array(16));

  var key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);

  var hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  var saltHex = Array.from(salt)
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");
  var hashHex = Array.from(new Uint8Array(hash))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");

  return saltHex + ":" + hashHex;
}

export async function verifyPassword(password, stored) {
  var parts = stored.split(":");
  var saltHex = parts[0];
  var hashHex = parts[1];
  var encoder = new TextEncoder();
  var salt = new Uint8Array(saltHex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }));

  var key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);

  var hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  var newHashHex = Array.from(new Uint8Array(hash))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");

  return hashHex === newHashHex;
}
