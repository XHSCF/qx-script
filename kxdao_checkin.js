/*
 * 科学刀论坛 DZ X5.0 新版自动签到
 * Quantumult X
 *
 * 流程：
 * 1. 使用本地 Cookie 打开签到页面
 * 2. 自动提取动态 formhash
 * 3. 调用新版签到 API
 *
 * BoxJS / QX 持久化键：
 * kxdao_cookie
 */

const SCRIPT_VERSION = "2026.07.19-v2";
console.log(`[科学刀] 脚本版本：${SCRIPT_VERSION}`);
const COOKIE_KEY = "kxdao_cookie";
const MAX_NETWORK_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 1200;

const PAGE_URL =
  "https://www.kxdao.net/aigeo_sign-checkin.html";

const API_URL =
  "https://www.kxdao.net/plugin.php?id=aigeo_sign:api&action=checkin";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/26.5 Mobile/15E148 Safari/604.1";

const cookie = $prefs.valueForKey(COOKIE_KEY);
let finished = false;

if (!cookie) {
  finish(
    "缺少 Cookie",
    "请先在 BoxJS 填写科学刀完整 Cookie。"
  );
} else {
  getCheckinPage();
}

/**
 * 第一步：访问签到页面，取得动态 formhash
 */
function getCheckinPage() {
  const request = {
    url: PAGE_URL,
    method: "GET",
    headers: {
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Cache-Control": "no-cache",
      "User-Agent": USER_AGENT,
      "Referer": "https://www.kxdao.net/",
      "Cookie": cookie
    }
  };

  fetchWithRetry(request, "签到页").then(
    response => {
      const status = response.statusCode;
      const html = response.body || "";

      console.log(`[科学刀] 签到页面状态码：${status}`);

      if (status === 401 || status === 403) {
        finish(
          "登录状态异常",
          `页面返回 ${status}，Cookie 可能已经失效。`
        );
        return;
      }

      if (status < 200 || status >= 300) {
        finish(
          "签到页响应异常",
          `HTTP ${status}，请稍后再试。`
        );
        return;
      }

      const signedInfo = parseSignedInfo(html);

      if (
        signedInfo ||
        html.includes("今日已签到") ||
        html.includes("今天已签到")
      ) {
        finish(
          "今日已签到",
          signedInfo || "今天已经完成签到，无需重复操作。"
        );
        return;
      }

      /*
       * 新版页面中：
       * var _fh = 'xxxxxxxx';
       */
      const formhashMatch = html.match(
        /var\s+_fh\s*=\s*['"]([^'"]+)['"]/
      );

      if (!formhashMatch || !formhashMatch[1]) {
        /*
         * 如果页面跳到了登录页或未登录页面，
         * 往往无法找到 formhash。
         */
        const loginExpired =
          html.includes("登录") &&
          !html.includes("快速静默签到");

        finish(
          loginExpired ? "Cookie 可能失效" : "获取参数失败",
          loginExpired
            ? "签到页面没有保持登录，请重新抓取 Cookie。"
            : "未在签到页面找到动态 formhash。"
        );

        console.log(`[科学刀] 未找到 formhash，页面长度：${html.length}`);
        return;
      }

      const formhash = formhashMatch[1];

      console.log("[科学刀] 已取得动态 formhash");

      submitCheckin(formhash);
    },
    error => {
      finish(
        "页面请求失败",
        sanitizeText(stringifyError(error), 160)
      );
    }
  );
}

/**
 * 第二步：调用新版签到 API
 */
function submitCheckin(formhash) {
  const request = {
    url: API_URL,
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://www.kxdao.net",
      "Referer": PAGE_URL,
      "User-Agent": USER_AGENT,
      "Cookie": cookie
    },
    body:
      `formhash=${encodeURIComponent(formhash)}` +
      `&source=checkin_page`
  };

  fetchWithRetry(request, "签到接口").then(
    response => {
      const status = response.statusCode;
      const body = response.body || "";

      console.log(`[科学刀] 签到状态码：${status}`);
      console.log(`[科学刀] 签到响应长度：${body.length}`);

      if (status === 401 || status === 403) {
        finish(
          "登录状态异常",
          `接口返回 ${status}，Cookie 可能失效。`
        );
        return;
      }

      let data;

      try {
        data = JSON.parse(body);
      } catch (error) {
        finish(
          "返回格式异常",
          status < 200 || status >= 300
            ? `HTTP ${status}，服务器没有返回可识别内容。`
            : sanitizeText(body, 200) || "接口没有返回内容。"
        );
        return;
      }

      /*
       * 页面 JS 中写明：
       * code === 0 代表签到成功
       */
      if (data.code === 0) {
        const result = data.data || {};

        const streak =
          result.streak !== undefined
            ? `连续 ${result.streak} 天`
            : "";

        const credits =
          result.credits_got !== undefined
            ? `获得 ${result.credits_got} 积分`
            : "";

        const rank =
          result.today_rank !== undefined
            ? `今日第 ${result.today_rank} 位`
            : "";

        const milestone = result.milestone
          ? String(result.milestone)
          : "";

        const details = [
          streak,
          credits,
          rank,
          milestone
        ].filter(Boolean);

        finish(
          "签到成功",
          details.join("，") || "新版签到成功。"
        );
      } else {
        const message =
          data.error ||
          data.message ||
          "签到失败，服务器没有返回具体原因。";

        const alreadySigned =
          String(message).includes("已签到") ||
          String(message).includes("重复");

        finish(
          alreadySigned ? "今日已签到" : "签到失败",
          sanitizeText(message, 180)
        );
      }
    },
    error => {
      finish(
        "接口请求失败",
        sanitizeText(stringifyError(error), 160)
      );
    }
  );
}

/**
 * 从“今日已签到”页面中提取已有签到结果
 */
function parseSignedInfo(html) {
  const descMatch = html.match(
    /连续\s*<strong>(\d+)<\/strong>\s*天[\s\S]*?今日第\s*<strong>(\d+)<\/strong>\s*位[\s\S]*?\+<strong>(\d+)<\/strong>\s*积分/
  );

  if (!descMatch) {
    return "";
  }

  return (
    `连续 ${descMatch[1]} 天，` +
    `今日第 ${descMatch[2]} 位，` +
    `获得 ${descMatch[3]} 积分`
  );
}

function stringifyError(error) {
  try {
    if (error && error.error) {
      return String(error.error);
    }

    return JSON.stringify(error);
  } catch (_) {
    return String(error || "未知错误");
  }
}

function fetchWithRetry(request, label, attempt) {
  const currentAttempt = attempt || 0;

  return $task.fetch(request).then(
    response => {
      const status = Number(response.statusCode || 0);

      if (
        currentAttempt < MAX_NETWORK_RETRIES &&
        (status === 429 || status >= 500)
      ) {
        return waitBeforeRetry(label, currentAttempt, `HTTP ${status}`)
          .then(() => fetchWithRetry(request, label, currentAttempt + 1));
      }

      return response;
    },
    error => {
      if (currentAttempt < MAX_NETWORK_RETRIES) {
        return waitBeforeRetry(label, currentAttempt, "网络错误")
          .then(() => fetchWithRetry(request, label, currentAttempt + 1));
      }

      return Promise.reject(error);
    }
  );
}

function waitBeforeRetry(label, attempt, reason) {
  const delay =
    RETRY_BASE_DELAY_MS * (attempt + 1) +
    Math.floor(Math.random() * 400);

  console.log(
    `[科学刀] ${label}${reason}，${delay}ms 后重试一次`
  );

  return new Promise(resolve => setTimeout(resolve, delay));
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/Basic\s+[A-Za-z0-9+/=._-]+/gi, "Basic <已隐藏>")
    .replace(/(cookie|authorization|token)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2<已隐藏>")
    .slice(0, maxLength || 200);
}

function finish(subtitle, message) {
  if (finished) {
    return;
  }

  finished = true;

  $notify(
    "科学刀签到",
    subtitle,
    message
  );

  $done();
}
