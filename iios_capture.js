/**
 * iios.fun 登录凭证自动获取
 */

const SCRIPT_VERSION = "2026.07.19-v2";
console.log(`[iios] 抓取脚本版本：${SCRIPT_VERSION}`);

const headers = $request.headers || {};
const requestUrl = String($request.url || "");
const isIiosRequest =
  /^https:\/\/www\.iios\.fun(?:\/|$)/i.test(requestUrl);

const authorization =
  headers.Authorization ||
  headers.authorization ||
  "";

const oldAuthorization =
  $prefs.valueForKey("iios_auth") || "";

if (!isIiosRequest) {
  console.log("iios：忽略非 www.iios.fun 请求");
} else if (
  authorization &&
  /^Basic\s+\S+/i.test(authorization.trim())
) {
  const normalizedAuthorization = authorization.trim();

  const success = $prefs.setValueForKey(
    normalizedAuthorization,
    "iios_auth"
  );

  if (success && normalizedAuthorization !== oldAuthorization) {
    console.log("iios 登录凭证获取成功");

    $notify(
      "iios 自动签到",
      "登录凭证获取成功",
      "以后登录凭证变化时会自动更新"
    );
  }
} else {
  console.log("iios：当前请求没有可保存的 Basic 登录凭证");
}

$done({});
