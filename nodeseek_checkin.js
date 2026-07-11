/*
 * NodeSeek 自动签到
 * Quantumult X
 *
 * random=false：固定领取 5 个鸡腿
 * Cookie 键名：nodeseek_cookie
 * Refract Key 键名：nodeseek_refract_key
 */

const SCRIPT_VERSION = "2026.07.11-v3";
console.log(`[NodeSeek] 脚本版本：${SCRIPT_VERSION}`);
const COOKIE_KEY = "nodeseek_cookie";
const REFRACT_KEY_STORE = "nodeseek_refract_key";

const URL =
  "https://www.nodeseek.com/api/attendance?random=false";

const REFRACT_VERSION = "0.3.34";

// Service Worker 内置的初始 key。
// 若服务器返回 refract-key-update，脚本会自动保存新 key。
const DEFAULT_REFRACT_KEY = "CHICZkKViFoZmVbIH1Y6";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/26.5 Mobile/15E148 Safari/604.1";

const cookie = $prefs.valueForKey(COOKIE_KEY);

if (!cookie) {
  $notify(
    "NodeSeek 签到",
    "缺少 Cookie",
    `请先在 BoxJS 中填写 ${COOKIE_KEY}`
  );
  $done();
} else {
  const savedKey =
    $prefs.valueForKey(REFRACT_KEY_STORE) ||
    DEFAULT_REFRACT_KEY;

  signIn(savedKey, 0);
}

function signIn(refractKey, retryCount) {
  if (retryCount >= 5) {
    finish(
      "签到失败",
      "refract-key 连续更新，已达到最大重试次数。"
    );
    return;
  }

  const method = "POST";
  const body = "";

  const signSource = [
    method,
    URL,
    USER_AGENT,
    body,
    refractKey,
  ].join("\n\n");

  const refractSign = sha1(signSource);

  console.log(
    `[NodeSeek] 第 ${retryCount + 1} 次请求`
  );
  console.log(
    `[NodeSeek] refract-key：${refractKey}`
  );
  console.log(
    `[NodeSeek] refract-sign：${refractSign}`
  );

  const request = {
    url: URL,
    method: method,
    headers: {
      Accept: "*/*",
      "Content-Type": "text/plain;charset=UTF-8",
      Origin: "https://www.nodeseek.com",
      Referer:
        "https://www.nodeseek.com/sw.js?v=0.3.34",
      "User-Agent": USER_AGENT,
      "refract-version": REFRACT_VERSION,
      "refract-key": refractKey,
      "refract-sign": refractSign,
      Cookie: cookie,
    },
    body: body,
  };

  $task.fetch(request).then(
    (response) => {
      const status = response.statusCode;
      const responseBody = response.body || "";
      const headers = normalizeHeaders(
        response.headers || {}
      );

      console.log(
        `[NodeSeek] 状态码：${status}`
      );
      console.log(
        `[NodeSeek] 返回：${responseBody}`
      );

      const updatedKey =
        headers["refract-key-update"];

      if (
        updatedKey &&
        updatedKey !== refractKey
      ) {
        console.log(
          `[NodeSeek] 收到新 refract-key：${updatedKey}`
        );

        $prefs.setValueForKey(
          updatedKey,
          REFRACT_KEY_STORE
        );

        signIn(
          updatedKey,
          retryCount + 1
        );
        return;
      }

      if (
        status === 401 ||
        status === 403
      ) {
        finish(
          "登录状态失效",
          `服务器返回 ${status}，请重新获取 Cookie。`
        );
        return;
      }

      let result;

      try {
        result = JSON.parse(responseBody);
      } catch (_) {
        result = null;
      }

      if (
        result &&
        result.success === true
      ) {
        const gain =
          result.gain !== undefined
            ? result.gain
            : "?";

        const current =
          result.current !== undefined
            ? result.current
            : "?";

        finish(
          "签到成功",
          `获得 ${gain} 个鸡腿，当前共有 ${current} 个鸡腿。`
        );
        return;
      }

      const message =
        result && result.message
          ? String(result.message)
          : responseBody;

      if (
  /已经签到|今日已签到|已完成签到|重复签到|请勿重复操作/.test(message)
) {
  finish(
    "今日已签到",
    message
  );
  return;
}

      finish(
        "签到结果未知",
        message ||
          `HTTP ${status}，服务器没有返回可识别结果。`
      );
    },
    (error) => {
      finish(
        "请求失败",
        stringifyError(error)
      );
    }
  );
}

function normalizeHeaders(headers) {
  const result = {};

  Object.keys(headers).forEach((key) => {
    result[
      String(key).toLowerCase()
    ] = headers[key];
  });

  return result;
}

function stringifyError(error) {
  try {
    if (error && error.error) {
      return String(error.error);
    }

    return JSON.stringify(error);
  } catch (_) {
    return String(
      error || "未知错误"
    );
  }
}

function finish(subtitle, message) {
  $notify(
    "NodeSeek 签到",
    subtitle,
    message
  );

  $done();
}

/*
 * 纯 JavaScript SHA-1
 * 返回小写十六进制
 */
function sha1(message) {
  function rotateLeft(value, bits) {
    return (
      (value << bits) |
      (value >>> (32 - bits))
    );
  }

  function toHex(value) {
    let output = "";

    for (let i = 7; i >= 0; i--) {
      output += (
        (value >>> (i * 4)) &
        0x0f
      ).toString(16);
    }

    return output;
  }

  const utf8 = unescape(
    encodeURIComponent(message)
  );

  const words = [];
  const length = utf8.length;

  for (let i = 0; i < length - 3; i += 4) {
    words.push(
      (utf8.charCodeAt(i) << 24) |
      (utf8.charCodeAt(i + 1) << 16) |
      (utf8.charCodeAt(i + 2) << 8) |
      utf8.charCodeAt(i + 3)
    );
  }

  let tail = 0;

  switch (length % 4) {
    case 0:
      tail = 0x080000000;
      break;
    case 1:
      tail =
        (utf8.charCodeAt(length - 1) << 24) |
        0x0800000;
      break;
    case 2:
      tail =
        (utf8.charCodeAt(length - 2) << 24) |
        (utf8.charCodeAt(length - 1) << 16) |
        0x08000;
      break;
    case 3:
      tail =
        (utf8.charCodeAt(length - 3) << 24) |
        (utf8.charCodeAt(length - 2) << 16) |
        (utf8.charCodeAt(length - 1) << 8) |
        0x80;
      break;
  }

  words.push(tail);

  while (
    words.length % 16 !== 14
  ) {
    words.push(0);
  }

  words.push(length >>> 29);
  words.push((length << 3) & 0xffffffff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Array(80);

  for (
    let block = 0;
    block < words.length;
    block += 16
  ) {
    for (let i = 0; i < 16; i++) {
      w[i] = words[block + i];
    }

    for (let i = 16; i < 80; i++) {
      w[i] = rotateLeft(
        w[i - 3] ^
          w[i - 8] ^
          w[i - 14] ^
          w[i - 16],
        1
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f;
      let k;

      if (i < 20) {
        f =
          (b & c) |
          (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f =
          b ^
          c ^
          d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f =
          (b & c) |
          (b & d) |
          (c & d);
        k = 0x8f1bbcdc;
      } else {
        f =
          b ^
          c ^
          d;
        k = 0xca62c1d6;
      }

      const temp =
        (
          rotateLeft(a, 5) +
          f +
          e +
          k +
          w[i]
        ) & 0xffffffff;

      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) & 0xffffffff;
    h1 = (h1 + b) & 0xffffffff;
    h2 = (h2 + c) & 0xffffffff;
    h3 = (h3 + d) & 0xffffffff;
    h4 = (h4 + e) & 0xffffffff;
  }

  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4)
  ).toLowerCase();
}
