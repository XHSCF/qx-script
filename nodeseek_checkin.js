const COOKIE_KEY = 'nodeseek_cookie';
const REFRACT_KEY_STORE = 'nodeseek_refract_key';
const DEFAULT_REFRACT_KEY = 'CHICZkKViFoZmVbIH1Y6';
const REFRACT_VERSION = '0.3.33';

const CHECKIN_URL = 'https://www.nodeseek.com/api/attendance?random=true';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1';

function notify(title, sub, msg) {
  $notify(title, sub, String(msg || ''));
  $done();
}

function read(key, fallback = '') {
  return $prefs.valueForKey(key) || fallback;
}

function write(key, value) {
  return $prefs.setValueForKey(String(value), key);
}

function parseJson(text) {
  try {
    return JSON.parse(text || '{}');
  } catch (e) {
    return {};
  }
}

/**
 * Pure JS SHA-1
 * returns hex string
 */
function sha1(msg) {
  function rotateLeft(n, s) {
    return (n << s) | (n >>> (32 - s));
  }

  function cvtHex(val) {
    let str = '';
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  }

  const utf8 = unescape(encodeURIComponent(msg));
  const msgLen = utf8.length;

  const wordArray = [];
  for (let i = 0; i < msgLen - 3; i += 4) {
    const j = (utf8.charCodeAt(i) << 24) |
              (utf8.charCodeAt(i + 1) << 16) |
              (utf8.charCodeAt(i + 2) << 8) |
              utf8.charCodeAt(i + 3);
    wordArray.push(j);
  }

  let i;
  switch (msgLen % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = (utf8.charCodeAt(msgLen - 1) << 24) | 0x0800000;
      break;
    case 2:
      i = (utf8.charCodeAt(msgLen - 2) << 24) |
          (utf8.charCodeAt(msgLen - 1) << 16) |
          0x08000;
      break;
    case 3:
      i = (utf8.charCodeAt(msgLen - 3) << 24) |
          (utf8.charCodeAt(msgLen - 2) << 16) |
          (utf8.charCodeAt(msgLen - 1) << 8) |
          0x80;
      break;
  }
  wordArray.push(i);

  while ((wordArray.length % 16) !== 14) {
    wordArray.push(0);
  }

  wordArray.push(msgLen >>> 29);
  wordArray.push((msgLen << 3) & 0x0ffffffff);

  const W = new Array(80);
  let H0 = 0x67452301;
  let H1 = 0xEFCDAB89;
  let H2 = 0x98BADCFE;
  let H3 = 0x10325476;
  let H4 = 0xC3D2E1F0;

  for (let blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
    for (let i = 0; i < 16; i++) W[i] = wordArray[blockstart + i];
    for (let i = 16; i < 80; i++) {
      W[i] = rotateLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    }

    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;

    for (let i = 0; i < 80; i++) {
      let temp;
      if (i <= 19) {
        temp = ((B & C) | (~B & D)) + 0x5A827999;
      } else if (i <= 39) {
        temp = (B ^ C ^ D) + 0x6ED9EBA1;
      } else if (i <= 59) {
        temp = ((B & C) | (B & D) | (C & D)) + 0x8F1BBCDC;
      } else {
        temp = (B ^ C ^ D) + 0xCA62C1D6;
      }

      temp = (rotateLeft(A, 5) + temp + E + W[i]) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotateLeft(B, 30) & 0x0ffffffff;
      B = A;
      A = temp;
    }

    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff;
  }

  return (cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4)).toLowerCase();
}

function buildSign(method, url, ua, body, refractKey) {
  const cleanUrl = url.split('#')[0];
  const payload = [method, cleanUrl, ua || '', body || '', refractKey].join('\n\n');
  return sha1(payload);
}

function fetchQX(options) {
  return $task.fetch(options).then(resp => ({
    status: resp.statusCode || resp.status,
    headers: resp.headers || {},
    body: resp.body || ''
  }));
}

(function main() {
  const cookie = read(COOKIE_KEY, '').trim();
  let refractKey = read(REFRACT_KEY_STORE, DEFAULT_REFRACT_KEY).trim() || DEFAULT_REFRACT_KEY;

  if (!cookie) {
    notify('NodeSeek 签到', '失败', '本地没有读取到 Cookie');
    return;
  }

  const method = 'POST';
  const body = '';
  const sign = buildSign(method, CHECKIN_URL, USER_AGENT, body, refractKey);

  const headers = {
    'Content-Type': 'text/plain;charset=UTF-8',
    'Accept': '*/*',
    'Origin': 'https://www.nodeseek.com',
    'Referer': `https://www.nodeseek.com/sw.js?v=${REFRACT_VERSION}`,
    'User-Agent': USER_AGENT,
    'refract-version': REFRACT_VERSION,
    'refract-key': refractKey,
    'refract-sign': sign,
    'Cookie': cookie
  };

  fetchQX({
    url: CHECKIN_URL,
    method,
    headers,
    body
  }).then(resp => {
    const data = parseJson(resp.body);

    const updatedKey =
      resp.headers['refract-key-update'] ||
      resp.headers['Refract-Key-Update'] ||
      resp.headers['REFRACT-KEY-UPDATE'];

    if (updatedKey) {
      write(REFRACT_KEY_STORE, updatedKey);
      refractKey = updatedKey;
    }

    if (resp.status === 200 && data.success === true) {
      const gain = typeof data.gain !== 'undefined' ? `，收益 ${data.gain}` : '';
      const current = typeof data.current !== 'undefined' ? `，当前 ${data.current}` : '';
      notify('NodeSeek 签到', '成功', `${data.message || '签到成功'}${gain}${current}`);
      return;
    }

    if (resp.status === 200 && data.message) {
      notify('NodeSeek 签到', '返回消息', data.message);
      return;
    }

    if (resp.status === 403) {
      notify('NodeSeek 签到', '失败', '403 Forbidden，可能是 Cookie 或 refractKey 已失效');
      return;
    }

    notify('NodeSeek 签到', `失败 ${resp.status}`, resp.body || '未知返回');
  }).catch(err => {
    notify('NodeSeek 签到', '异常', err && err.message ? err.message : JSON.stringify(err));
  });
})();
