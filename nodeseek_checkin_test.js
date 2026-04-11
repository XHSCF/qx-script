const COOKIE = 'session=ed87a0ef31309648e46ad96ffd1bb811; smac=1775913351-BwByuVVprQu-OLIRgp-5dfWrPnxzr58YBmydf4BGeCs; fog=5b02b8185cba6cf60b66ff4c577d8fdac1c5f21c4f9a75647637ec7d61de07ee; hmti_=1775913201-ZNvanE7NyqkTzfu3T1V3HhTxr3uy0hNa7BCE34Tg1c8m; cf_clearance=wlcdz2zKW6AdIybdUD3UV.0Hqy2.rst.4CQJ9nK4Igw-1775913196-1.2.1.1-WViBvxPlb60vD6_mhPuwKRmqx4r8SJvNJwBEmHVUxs_UjNtmWsWnctBYF0.lgx5M929dQRknzAZN.gSB7DP6X2QICLfLVLhbct4plO2qZqOgJCqwOKLttpnNlcddvgluqnTBgIV5B517A_JMeCju6u_m1twaOL_ebDKr0fHP2AlsmBPu1Gqs87NlegYuqF2Srn0aEaQ2NKnKOnd6CNynTgyLxoKoL42IawpK96ezS8UDzROBVR7xi.z2hv1oacfMJolo76yILcpkQPVXMBa0RkUKHDKLeLUF7mo86VRoxYTHrHLzlMH.EowXzEYY7eYgshxn2tG35_HZjCPu0jy7IQ; colorscheme=light';
const REFRACT_VERSION = '0.3.33';
const REFRACT_KEY = '53827cc7ebdaaf3ab3ea4e54778fea8250f82fc3ddbd2df3c7df2427cf6e46a6-1775913330196';
const REFRACT_SIGN = '8a0876aed18ad21da041fc19d1321656e7c01e08';

const url = 'https://www.nodeseek.com/api/attendance?random=true';

const headers = {
  'Content-Type': 'text/plain;charset=UTF-8',
  'Accept': '*/*',
  'Origin': 'https://www.nodeseek.com',
  'Referer': 'https://www.nodeseek.com/sw.js?v=0.3.33',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1',
  'refract-version': REFRACT_VERSION,
  'refract-key': REFRACT_KEY,
  'refract-sign': REFRACT_SIGN,
  'Cookie': COOKIE
};

$task.fetch({
  url,
  method: 'POST',
  headers,
  body: ''
}).then(resp => {
  let data = {};
  try {
    data = JSON.parse(resp.body || '{}');
  } catch (e) {}

  if (data.success === true) {
    $notify('NodeSeek 签到测试', '成功', data.message || '签到成功');
  } else if (data.message) {
    $notify('NodeSeek 签到测试', '返回消息', data.message);
  } else {
    $notify('NodeSeek 签到测试', '失败', resp.body || '未知返回');
  }
  $done();
}).catch(err => {
  $notify('NodeSeek 签到测试', '异常', JSON.stringify(err));
  $done();
});
