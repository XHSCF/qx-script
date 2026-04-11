if (typeof $request !== 'undefined') {
  const headers = $request.headers || {};
  const url = $request.url || '';
  const cookie = headers.Cookie || headers.cookie || '';

  if (cookie) {
    const ok = $prefs.setValueForKey(cookie, 'nodeseek_cookie');
    $notify(
      'NodeSeek Cookie',
      ok ? '自动获取成功' : '保存失败',
      `命中请求：${url}`
    );
  } else {
    $notify(
      'NodeSeek Cookie',
      '脚本已触发但没拿到 Cookie',
      `命中请求：${url}`
    );
  }
}

$done({});
