"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runQxScript(fileName, options) {
  const settings = options || {};
  const store = Object.assign({}, settings.prefs || {});
  const responses = (settings.responses || []).slice();
  const calls = [];
  const notifications = [];
  let doneResolve;
  let doneCalled = false;

  const donePromise = new Promise(resolve => {
    doneResolve = resolve;
  });

  const context = {
    $prefs: {
      valueForKey(key) {
        return store[key] || "";
      },
      setValueForKey(value, key) {
        store[key] = value;
        return true;
      }
    },
    $request: settings.request || {},
    $task: {
      fetch(request) {
        calls.push(request);
        const response = responses.shift();

        if (response instanceof Error) {
          return Promise.reject(response);
        }

        if (!response) {
          return Promise.reject(new Error("测试响应队列为空"));
        }

        return Promise.resolve(response);
      }
    },
    $notify(title, subtitle, message) {
      notifications.push([title, subtitle, message]);
    },
    $done(value) {
      if (!doneCalled) {
        doneCalled = true;
        doneResolve(value);
      }
    },
    console: {
      log() {}
    },
    setTimeout(callback) {
      callback();
      return 0;
    },
    clearTimeout() {}
  };

  vm.createContext(context);
  const source = fs.readFileSync(
    path.join(ROOT, fileName),
    "utf8"
  );
  new vm.Script(source, { filename: fileName }).runInContext(context);

  await Promise.race([
    donePromise,
    new Promise((_, reject) => {
      global.setTimeout(
        () => reject(new Error(`${fileName} 未调用 $done`)),
        3000
      );
    })
  ]);

  return { calls, notifications, store };
}

async function testNodeSeekRetryAndRandomMode() {
  const result = await runQxScript("nodeseek_checkin.js", {
    prefs: { nodeseek_cookie: "x=1" },
    responses: [
      { statusCode: 503, body: "", headers: {} },
      {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          gain: 8,
          current: 88
        }),
        headers: {}
      }
    ]
  });

  assert(result.calls.length === 2, "NodeSeek 应对 503 重试一次");
  assert(
    result.calls[0].url.includes("random=true"),
    "NodeSeek 应保持随机签到模式"
  );
  assert(
    result.notifications[0][1] === "签到成功",
    "NodeSeek 成功响应应通知签到成功"
  );
}

async function testNodeSeekAlreadySignedHttp500() {
  const chineseResult = await runQxScript("nodeseek_checkin.js", {
    prefs: { nodeseek_cookie: "x=1" },
    responses: [
      {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: "今天已经签到过了"
        }),
        headers: {}
      }
    ]
  });

  assert(
    chineseResult.calls.length === 1,
    "NodeSeek 已签到的 HTTP 500 响应不应重试"
  );
  assert(
    chineseResult.notifications[0][1] === "今日已签到",
    "NodeSeek 应将 HTTP 500 中的已签到正文识别为今日已签到"
  );

  const englishResult = await runQxScript("nodeseek_checkin.js", {
    prefs: { nodeseek_cookie: "x=1" },
    responses: [
      {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: "You have already attended today"
        }),
        headers: {}
      }
    ]
  });

  assert(
    englishResult.calls.length === 1 &&
      englishResult.notifications[0][1] === "今日已签到",
    "NodeSeek 应识别英文已签到提示且不重试"
  );
}

async function testKxdaoAlreadySignedPage() {
  const html =
    "连续 <strong>3</strong> 天 今日第 <strong>9</strong> 位 +<strong>2</strong> 积分";
  const result = await runQxScript("kxdao_checkin.js", {
    prefs: { kxdao_cookie: "x=1" },
    responses: [{ statusCode: 200, body: html, headers: {} }]
  });

  assert(result.calls.length === 1, "已签到页面不应再次提交签到");
  assert(
    result.notifications[0][1] === "今日已签到",
    "科学刀应识别已签到页面"
  );
}

async function testAcgripDynamicFormhash() {
  const result = await runQxScript("acgrip_checkin.js", {
    prefs: { acgrip_cookie: "x=1" },
    responses: [
      {
        statusCode: 200,
        body: '<input name="formhash" value="testhash123">',
        headers: {}
      },
      {
        statusCode: 200,
        body: "恭喜你签到成功!获得随机奖励 活跃度 5",
        headers: {}
      }
    ]
  });

  assert(result.calls.length === 2, "ACGRIP 应先取页面再提交签到");
  assert(
    String(result.calls[1].body).includes("formhash=testhash123"),
    "ACGRIP 应提交动态 formhash"
  );
  assert(
    result.notifications[0][1] === "签到成功",
    "ACGRIP 成功响应应通知签到成功"
  );
}

async function testIiosCaptureHostAllowlist() {
  const rejected = await runQxScript("iios_capture.js", {
    request: {
      url: "https://example.com/api/account",
      headers: { Authorization: "Basic x" }
    }
  });

  assert(!rejected.store.iios_auth, "非 iiOS 域名不得保存凭证");

  const accepted = await runQxScript("iios_capture.js", {
    request: {
      url: "https://www.iios.fun/api/account",
      headers: { Authorization: "Basic x" }
    }
  });

  assert(
    accepted.store.iios_auth === "Basic x",
    "iiOS 域名的 Basic 凭证应保存到本地"
  );
}

function testStaticFiles() {
  [
    "acgrip.boxjs.json",
    "kxdao.boxjs.conf",
    "nodeseek.boxjs.json"
  ].forEach(fileName => {
    JSON.parse(fs.readFileSync(path.join(ROOT, fileName), "utf8"));
  });

  [
    "acgrip_checkin.js",
    "iios_capture.js",
    "iios_checkin.js",
    "kxdao_checkin.js",
    "nodeseek_checkin.js"
  ].forEach(fileName => {
    const source = fs.readFileSync(path.join(ROOT, fileName), "utf8");
    new vm.Script(source, { filename: fileName });
  });
}

function testIiosBase64CacheCodec() {
  const source = fs.readFileSync(
    path.join(ROOT, "iios_checkin.js"),
    "utf8"
  );
  const start = source.indexOf("function bytesToBase64");
  const end = source.indexOf("async function wasmEncrypt");

  assert(start >= 0 && end > start, "应能找到 iiOS Base64 缓存函数");

  const context = {};
  vm.createContext(context);
  new vm.Script(source.slice(start, end)).runInContext(context);

  [1, 2, 3, 4, 31, 128].forEach(length => {
    const bytes = Uint8Array.from(
      Array.from({ length }, (_, index) => (index * 37 + 11) & 0xff)
    );
    const encoded = context.bytesToBase64(bytes);
    const expected = Buffer.from(bytes).toString("base64");
    const decoded = context.base64ToBytes(encoded);

    assert(encoded === expected, `Base64 编码长度 ${length} 不一致`);
    assert(
      Buffer.from(decoded).equals(Buffer.from(bytes)),
      `Base64 解码长度 ${length} 不一致`
    );
  });
}

(async () => {
  testStaticFiles();
  testIiosBase64CacheCodec();
  await testNodeSeekRetryAndRandomMode();
  await testNodeSeekAlreadySignedHttp500();
  await testKxdaoAlreadySignedPage();
  await testAcgripDynamicFormhash();
  await testIiosCaptureHostAllowlist();
  console.log("Quantumult X smoke tests passed");
})().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
