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

const COOKIE_KEY = "kxdao_cookie";

const PAGE_URL =
  "https://www.kxdao.net/aigeo_sign-checkin.html";

const API_URL =
  "https://www.kxdao.net/plugin.php?id=aigeo_sign:api&action=checkin";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/26.5 Mobile/15E148 Safari/604.1";

const cookie = $prefs.valueForKey(COOKIE_KEY);

if (!cookie) {
  $notify(
    "科学刀签到",
    "缺少 Cookie",
    "请先在 BoxJS 填写科学刀完整 Cookie。"
  );
  $done();
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

  $task.fetch(request).then(
    response => {
      const status = response.statusCode;
      const html = response.body || "";

      console.log(`[科学刀] 签到页面状态码：${status}`);

      if (status === 401 || status === 403) {
        $notify(
          "科学刀签到",
          "登录状态异常",
          `页面返回 ${status}，Cookie 可能已经失效。`
        );
        $done();
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

        $notify(
          "科学刀签到",
          loginExpired ? "Cookie 可能失效" : "获取参数失败",
          loginExpired
            ? "签到页面没有保持登录，请重新抓取 Cookie。"
            : "未在签到页面找到动态 formhash。"
        );

        console.log(
          `[科学刀] 页面部分内容：${html.slice(0, 500)}`
        );

        $done();
        return;
      }

      const formhash = formhashMatch[1];

      console.log(`[科学刀] 已取得 formhash：${formhash}`);

      submitCheckin(formhash);
    },
    error => {
      $notify(
        "科学刀签到",
        "页面请求失败",
        stringifyError(error)
      );
      $done();
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

  $task.fetch(request).then(
    response => {
      const status = response.statusCode;
      const body = response.body || "";

      console.log(`[科学刀] 签到状态码：${status}`);
      console.log(`[科学刀] 签到返回：${body}`);

      if (status === 401 || status === 403) {
        $notify(
          "科学刀签到",
          "登录状态异常",
          `接口返回 ${status}，Cookie 可能失效。`
        );
        $done();
        return;
      }

      let data;

      try {
        data = JSON.parse(body);
      } catch (error) {
        $notify(
          "科学刀签到",
          "返回格式异常",
          body.slice(0, 200) || "接口没有返回内容。"
        );
        $done();
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

        $notify(
          "科学刀签到",
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

        $notify(
          "科学刀签到",
          alreadySigned ? "今日已签到" : "签到失败",
          String(message)
        );
      }

      $done();
    },
    error => {
      $notify(
        "科学刀签到",
        "接口请求失败",
        stringifyError(error)
      );
      $done();
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
