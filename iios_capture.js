/**
 * iios.fun 登录凭证自动获取
 */

const headers = $request.headers || {};

const authorization =
  headers.Authorization ||
  headers.authorization ||
  "";

const oldAuthorization =
  $prefs.valueForKey("iios_auth") || "";

if (
  authorization &&
  authorization.startsWith("Basic ")
) {
  const success = $prefs.setValueForKey(
    authorization.trim(),
    "iios_auth"
  );

  if (success && authorization !== oldAuthorization) {
    console.log("iios 登录凭证获取成功");

    $notify(
      "iios 自动签到",
      "登录凭证获取成功",
      "以后登录凭证变化时会自动更新"
    );
  }
}

$done({});
