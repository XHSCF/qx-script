# qx-script

个人使用的 Quantumult X 自动签到脚本。账号 Cookie、Authorization 等登录凭证只保存在 Quantumult X 本地，不应写入本仓库或公开日志。

## 脚本

| 网站 | 脚本 | 本地持久化键 | 当前方式 |
| --- | --- | --- | --- |
| NodeSeek | `nodeseek_checkin.js` | `nodeseek_cookie`、`nodeseek_refract_key` | `random=true`，随机获取鸡腿 |
| 科学刀 | `kxdao_checkin.js` | `kxdao_cookie` | 动态获取 `formhash` 后签到 |
| Anime字幕论坛 / ACGRIP | `acgrip_checkin.js` | `acgrip_cookie` | 动态获取 `formhash` 后签到 |
| iiOS | `iios_capture.js`、`iios_checkin.js` | `iios_auth`、`iios_wasm_cache_v1` | 自动抓取 Basic 凭证并执行加密签到 |

`APNs.list` 是 Quantumult X 的 Apple APNs 分流规则，与签到脚本相互独立。

## 分流规则

`Proxy.list` 是基于 ConnersHua/RuleGo 的个人精简版全球代理规则。它删除了已经交给独立 Telegram、OpenAI/ChatGPT、YouTube、X/Twitter、GitHub、Apple 和 Streaming 策略处理的不必要重复，并清理了源列表内部的完全重复项。`google`、Fastly 等通用宽规则继续作为后置兜底。

Quantumult X 远程分流示例：

```ini
https://raw.githubusercontent.com/XHSCF/qx-script/main/Proxy.list, tag=全球加速, force-policy=全球加速, update-interval=604800, opt-parser=true, enabled=true
```

`Streaming.list` 是基于 ddgksf2013/Filter 的个人精简版国际流媒体规则。它删除了已经交给独立 YouTube、TikTok 策略处理的重复项，并保留 Apple TV、Apple Music TV、哔哩哔哩国际版及 TikTok 补充规则。这里与 Apple、国内影音的部分交叉是有意的，应让本规则排在它们之前。

```ini
https://raw.githubusercontent.com/XHSCF/qx-script/main/Streaming.list, tag=国际媒体, force-policy=国际媒体, update-interval=604800, opt-parser=true, enabled=true
```

## 安装

### NodeSeek、科学刀和 ACGRIP

可以导入对应的 BoxJS 配置：

- `https://raw.githubusercontent.com/XHSCF/qx-script/main/nodeseek.boxjs.json`
- `https://raw.githubusercontent.com/XHSCF/qx-script/main/kxdao.boxjs.conf`
- `https://raw.githubusercontent.com/XHSCF/qx-script/main/acgrip.boxjs.json`

在 BoxJS 中填写网站已登录请求的完整 Cookie，但不要包含 `Cookie:` 字样。Cookie 只会写入 Quantumult X 本地存储。

### iiOS 凭证抓取

将下面的规则加入 Quantumult X，并确保 MITM 证书已经安装和信任：

```ini
[rewrite_local]
^https:\/\/www\.iios\.fun\/api\/ url script-request-header https://raw.githubusercontent.com/XHSCF/qx-script/main/iios_capture.js

[mitm]
hostname = %APPEND% www.iios.fun
```

随后登录 `https://www.iios.fun` 并进入获取积分页面。抓取脚本只接受 `www.iios.fun` 的 Basic Authorization，并将其保存为本地键 `iios_auth`。

## 定时任务示例

建议错开几分钟运行，减少同一时刻的网络竞争。时间可以按自己的需要修改：

```ini
[task_local]
50 7 * * * https://raw.githubusercontent.com/XHSCF/qx-script/main/nodeseek_checkin.js, tag=NodeSeek签到, enabled=true
52 7 * * * https://raw.githubusercontent.com/XHSCF/qx-script/main/kxdao_checkin.js, tag=科学刀签到, enabled=true
54 7 * * * https://raw.githubusercontent.com/XHSCF/qx-script/main/acgrip_checkin.js, tag=ACGRIP签到, enabled=true
56 7 * * * https://raw.githubusercontent.com/XHSCF/qx-script/main/iios_checkin.js, tag=iiOS签到, enabled=true
```

## 稳定性设计

- 网络错误、HTTP 429 和 5xx 最多自动重试一次，并加入短暂随机延迟。
- HTTP 401/403 会直接提示重新获取登录凭证，不进行无意义重试。
- 所有脚本都避免在日志中输出完整 Cookie、Authorization、动态 `formhash` 或接口原文。
- NodeSeek 会自动保存服务器下发的新 `refract-key`，最多连续更新 5 次。
- 科学刀会在提交前识别“今日已签到”页面，重复执行不会误报缺少 `formhash`。
- iiOS 会校验官方 WASM 的 SHA-256，并缓存一份校验通过的版本；临时下载失败时可以使用本地缓存。

## 失效后的恢复

| 提示 | 处理方式 |
| --- | --- |
| 缺少 Cookie / 401 / 403 / 登录状态失效 | 重新登录对应网站并更新 BoxJS 中的 Cookie |
| iiOS 登录凭证失效 | 打开 iiOS 网站重新登录，再进入获取积分页面触发抓取 |
| 找不到 `formhash` | 先确认网页仍保持登录；若已登录，通常代表页面结构发生变化，需要更新脚本解析规则 |
| WASM SHA-256 不匹配 | 不要直接关闭校验；确认 iiOS 官方页面已经更换 WASM 后，再同时更新脚本中的 WASM URL 和校验值 |
| HTTP 429 / 5xx | 脚本会自动重试一次；仍失败时等待网站恢复，不要高频重复运行 |
| 返回格式异常 / 无法解密 | 保存已脱敏的状态码、时间和提示信息，再根据最新网页请求更新脚本 |

## 本地检查

仓库内提供了不含真实凭证的 Quantumult X 模拟冒烟测试，覆盖 NodeSeek 503 重试与随机模式、科学刀重复签到、ACGRIP 动态 `formhash` 和 iiOS 抓取域名白名单：

```bash
node tests/qx_smoke_test.js
```

更新单个脚本后，也可以使用 Node.js 执行语法检查：

```bash
node --check nodeseek_checkin.js
node --check kxdao_checkin.js
node --check acgrip_checkin.js
node --check iios_capture.js
node --check iios_checkin.js
```

## 提醒

仅供个人学习和个人自动化使用。不要把 Cookie、Authorization、Token、手机号、设备标识或包含这些信息的 HAR 文件提交到公开仓库。
