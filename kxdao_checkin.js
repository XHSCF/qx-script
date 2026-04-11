const COOKIE = 'JWUN_2132_auth=94e4OKjjWib1t8WDoP6phHaubp%2BlchDLUmS7wTJ0GfvPi2ayx3xFigmDT%2BaWVaWbWh%2BFIgvCtGHy0Qj3tVDRbscoqA; JWUN_2132_checkfollow=1; JWUN_2132_lastact=1775905234%09member.php%09logging; JWUN_2132_lastcheckfeed=77582%7C1775905234; JWUN_2132_lip=103.135.100.182%2C1775905166; JWUN_2132_sid=vjGNj9; JWUN_2132_ulastactivity=eeafKcPD%2B5ahaw4pnXCc2%2Ba6xK880%2FJXq%2BDr3XiIVE32PhELR%2FKF; JWUN_2132_lastvisit=1775901574; JWUN_2132_saltkey=dGrRezeG; JWUN_2132_pc_size_c=0; server_name_session=946b190153ff33f10aaa55a7298d7dbf';

const PAGE_URL = 'https://www.kxdao.net/forum.php?forumlist=1&mobile=2';
const SIGN_URL = 'https://www.kxdao.net/plugin.php?id=dsu_amupper&ppersubmit=true&formhash=';

const headers = {
  'Cookie': COOKIE,
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1',
  'Referer': 'https://www.kxdao.net/forum.php?forumlist=1&mobile=2',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function notify(title, sub, msg) {
  $notify(title, sub, msg);
  $done();
}

function getFormhash(html) {
  let m = html.match(/formhash=([0-9a-zA-Z]+)/);
  if (m) return m[1];

  m = html.match(/["']formhash["']\s*[:=]\s*["']([0-9a-zA-Z]+)["']/);
  if (m) return m[1];

  return '';
}

$task.fetch({
  url: PAGE_URL,
  method: 'GET',
  headers
}).then(resp => {
  const html = resp.body || '';
  const formhash = getFormhash(html);

  if (!formhash) {
    notify('科学刀签到', '失败', '没有获取到 formhash，Cookie 可能失效');
    return;
  }

  const url = `${SIGN_URL}${formhash}&mobile=2`;

  return $task.fetch({
    url,
    method: 'GET',
    headers
  });
}).then(resp => {
  if (!resp) return;

  const body = resp.body || '';

  if (body.includes('累计签到') && body.includes('特奖励')) {
    const msgMatch = body.match(/<div class="mbm">([\s\S]*?)<\/div>/);
    const msg = msgMatch ? msgMatch[1].replace(/<[^>]+>/g, '').trim() : '签到成功';
    notify('科学刀签到', '签到成功', msg);
    return;
  }

  if (body.includes('签到完毕') || body.includes('今日已签') || body.includes('已签到')) {
    notify('科学刀签到', '今日已签到', '今天应该已经签过了');
    return;
  }

  if (body.includes('请先登录') || body.includes('登录') || body.includes('log in')) {
    notify('科学刀签到', '失败', 'Cookie 可能已失效');
    return;
  }

  notify('科学刀签到', '结果未知', body.slice(0, 120));
}).catch(err => {
  notify('科学刀签到', '异常', JSON.stringify(err));
});
