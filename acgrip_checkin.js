
/*
 * Anime字幕论坛（bbs.acgrip.com）DSU 每日签到
 * Quantumult X
 *
 * 使用前：
 * 1. 把论坛完整 Cookie 保存到持久化键：acgrip_cookie
 * 2. 再把本脚本添加到 QX 定时任务
 */

const COOKIE_KEY = "acgrip_cookie";

const PAGE_URL =
  "https://bbs.acgrip.com/dsu_paulsign-sign.html";

const SIGN_URL =
  "https://bbs.acgrip.com/plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=0&inajax=0&mobile=yes";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/26.5 Mobile/15E148 Safari/604.1";

const cookie = $prefs.valueForKey(COOKIE_KEY);

if (!cookie) {
  $notify(
    "Anime字幕论坛签到",
    "缺少 Cookie",
    `请先把论坛完整 Cookie 写入：${COOKIE_KEY}`
  );
  $done();
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

  $task.fetch(request).then(
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
          `[Anime字幕论坛] 签到页片段：${html.slice(0, 1200)}`
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

      console.log(
        `[Anime字幕论坛] 已取得 formhash：${formhash}`
      );

      submitSign(formhash);
    },
    (error) => {
      finish(
        "签到页请求失败",
        stringifyError(error)
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

  $task.fetch(request).then(
    (response) => {
      const status = response.statusCode;
      const html = response.body || "";
      const text = stripHtml(html);

      console.log(
        `[Anime字幕论坛] 签到状态码：${status}`
      );

      console.log(
        `[Anime字幕论坛] 签到返回：${text.slice(0, 500)}`
      );

      if (status === 401 || status === 403) {
        finish(
          "登录状态异常",
          `签到接口返回 ${status}，Cookie 可能已经失效。`
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
          text.slice(0, 250) ||
            `HTTP ${status}，服务器未返回可识别内容。`
        );
      }
    },
    (error) => {
      finish(
        "签到请求失败",
        stringifyError(error)
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

function finish(subtitle, message) {
  $notify(
    "Anime字幕论坛签到",
    subtitle,
    message
  );

  $done();
}
