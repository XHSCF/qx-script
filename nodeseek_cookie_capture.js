if (typeof $request !== 'undefined') {
  const headers = $request.headers || {};
  const cookie = headers.Cookie || headers.cookie || '';

  if (cookie) {
    const ok = $prefs.setValueForKey(cookie, 'nodeseek_cookie');
    $notify('NodeSeek Cookie', ok ? '自动获取成功' : '保存失败', ok ? '已写入本地' : '请检查 QX 权限');
  } else {
    $notify('NodeSeek Cookie', '获取失败', '当前请求头里没有 Cookie');
  }
}

$done({});
