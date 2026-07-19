
/*
 * Anime字幕论坛（bbs.acgrip.com）DSU 每日签到
 * Quantumult X
 *
 * 使用前：
 * 1. 把论坛完整 Cookie 保存到持久化键：acgrip_cookie
 * 2. 再把本脚本添加到 QX 定时任务
 */

const SCRIPT_VERSION = "2026.07.19-v2";
console.log(`[Anime字幕论坛] 脚本版本：${SCRIPT_VERSION}`);
const COOKIE_KEY = "acgrip_cookie";
const MAX_NETWORK_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 1200;

const PAGE_URL =
  "https://bbs.acgrip.com/dsu_paulsign-sign.html";

const SIGN_URL =
  "https://bbs.acgrip.com/plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=0&inajax=0&mobile=yes";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/26.5 Mobile/15E148 Safari/604.1";

const cookie = $prefs.valueForKey(COOKIE_KEY);
let finished = false;

if (!cookie) {
  finish(
    "缺少 Cookie",
    `请先把论坛完整 Cookie 写入：${COOKIE_KEY}`
  );
} else {
  fetchSignPage();
}

function fetchSignPage() {
  const request = {
    url: PAGE_URL,
    method: "GET",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Cache-Control": "no-cache",
      Referer: "https://bbs.acgrip.com/",
      "User-Agent": USER_AGENT,
      Cookie: cookie,
    },
  };

  fetchWithRetry(request, "签到页").then(
    (response) => {
      const status = response.statusCode;
      const html = response.body || "";

      console.log(`[Anime字幕论坛] 签到页状态码：${status}`);

      if (status === 401 || status === 403) {
        finish(
          "登录状态异常",
          `签到页返回 ${status}，Cookie 可能已经失效。`
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

      if (
        html.includes("您今天已经签到过了") ||
        html.includes("今日已签到") ||
        html.includes("今天已签到")
      ) {
        finish(
          "今日已签到",
          "今天已经完成签到，无需重复操作。"
        );
        return;
      }

      const formhash =
        matchOne(
          html,
          /name=["']formhash["'][^>]*value=["']([^"']+)["']/i
        ) ||
        matchOne(
          html,
          /formhash=([a-zA-Z0-9]+)/i
        ) ||
        matchOne(
          html,
          /var\s+formhash\s*=\s*["']([^"']+)["']/i
        );

      if (!formhash) {
        const likelyLoggedOut =
          html.includes("登录") &&
          !html.includes("开始签到") &&
          !html.includes("每日签到");

        console.log(
          `[Anime字幕论坛] 未找到 formhash，页面长度：${html.length}`
        );

        finish(
          likelyLoggedOut
            ? "Cookie 可能失效"
            : "获取 formhash 失败",
          likelyLoggedOut
            ? "签到页没有保持登录，请重新抓取 Cookie。"
            : "页面结构可能发生变化，请查看日志。"
        );
        return;
      }

      console.log("[Anime字幕论坛] 已取得动态 formhash");

      submitSign(formhash);
    },
    (error) => {
      finish(
        "签到页请求失败",
        sanitizeText(stringifyError(error), 160)
      );
    }
  );
}

function submitSign(formhash) {
  const body = [
    `formhash=${encodeURIComponent(formhash)}`,
    "qdxq=kx",
    "qdmode=3",
    "todaysay=",
    "fastreply=0",
  ].join("&");

  const request = {
    url: SIGN_URL,
    method: "POST",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Content-Type":
        "application/x-www-form-urlencoded",
      Origin: "https://bbs.acgrip.com",
      Referer: PAGE_URL,
      "User-Agent": USER_AGENT,
      Cookie: cookie,
    },
    body,
  };

  fetchWithRetry(request, "签到接口").then(
    (response) => {
      const status = response.statusCode;
      const html = response.body || "";
      const text = stripHtml(html);

      console.log(
        `[Anime字幕论坛] 签到状态码：${status}`
      );

      console.log(
        `[Anime字幕论坛] 签到响应长度：${html.length}`
      );

      if (status === 401 || status === 403) {
        finish(
          "登录状态异常",
          `签到接口返回 ${status}，Cookie 可能已经失效。`
        );
        return;
      }

      if (status < 200 || status >= 300) {
        finish(
          "签到接口响应异常",
          `HTTP ${status}，请稍后再试。`
        );
        return;
      }

      const successMatch = html.match(
        /恭喜你签到成功!获得随机奖励\s*活跃度\s*(\d+)/i
      );

      if (successMatch) {
        finish(
          "签到成功",
          `获得活跃度 ${successMatch[1]}`
        );
        return;
      }

      if (
        html.includes("您今天已经签到过了") ||
        html.includes("今日已签到") ||
        html.includes("今天已签到") ||
        html.includes("已经签到")
      ) {
        finish(
          "今日已签到",
          "今天已经完成签到，无需重复操作。"
        );
        return;
      }

      const loginError =
        html.includes("请先登录") ||
        html.includes("需要先登录") ||
        html.includes("您还没有登录");

      const formhashError =
        html.includes("您的请求来路不正确") ||
        html.includes("非法请求");

      if (loginError) {
        finish(
          "Cookie 可能失效",
          "服务器要求重新登录。"
        );
      } else if (formhashError) {
        finish(
          "签到参数失效",
          "formhash 校验失败，请重新运行。"
        );
      } else {
        finish(
          "签到结果未知",
          sanitizeText(text, 250) ||
            `HTTP ${status}，服务器未返回可识别内容。`
        );
      }
    },
    (error) => {
      finish(
        "签到请求失败",
        sanitizeText(stringifyError(error), 160)
      );
    }
  );
}

function matchOne(text, regex) {
  const match = text.match(regex);
  return match && match[1]
    ? match[1]
    : "";
}

function stripHtml(html) {
  return String(html)
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
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
    `[Anime字幕论坛] ${label}${reason}，${delay}ms 后重试一次`
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
    "Anime字幕论坛签到",
    subtitle,
    message
  );

  $done();
}
