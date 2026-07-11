const AUTHORIZATION =
      $prefs.valueForKey("iios_auth") || "",
    COOKIE = "",
    WASM_URL = "https://www.iios.fun/static/media/web_wasm_bg.534e8f19399f44e1496d.wasm",
    API_URL = "https://www.iios.fun/api/task",
    UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1";

let wasm,
    WASM_VECTOR_LEN = 0,
    cachedUint8Memory0 = null,
    cachedDataViewMemory0 = null;

const cachedTextDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
});

cachedTextDecoder.decode();

const cachedTextEncoder = new TextEncoder();

if (!("encodeInto" in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (text, view) {
        const bytes = cachedTextEncoder.encode(text);
        view.set(bytes);

        return {
            read: text.length,
            written: bytes.length
        };
    };
}

let heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heapNext = heap.length;

function getObject(index) {
    return heap[index];
}

function addHeapObject(object) {
    if (heapNext === heap.length) {
        heap.push(heap.length + 1);
    }

    const index = heapNext;

    heapNext = heap[index];
    heap[index] = object;

    return index;
}

function dropObject(index) {
    if (index < 132) {
        return;
    }

    heap[index] = heapNext;
    heapNext = index;
}

function takeObject(index) {
    const object = getObject(index);

    dropObject(index);

    return object;
}

function isLikeNone(value) {
    return value === undefined || value === null;
}

function getUint8ArrayMemory0() {
    if (
        cachedUint8Memory0 === null ||
        cachedUint8Memory0.byteLength === 0 ||
        cachedUint8Memory0.buffer !== wasm.memory.buffer
    ) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }

    return cachedUint8Memory0;
}

function getDataViewMemory0() {
    if (
        cachedDataViewMemory0 === null ||
        cachedDataViewMemory0.buffer !== wasm.memory.buffer
    ) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }

    return cachedDataViewMemory0;
}

function getStringFromWasm0(pointer, length) {
    pointer >>>= 0;

    return cachedTextDecoder.decode(
        getUint8ArrayMemory0().subarray(pointer, pointer + length)
    );
}

function getArrayU8FromWasm0(pointer, length) {
    pointer >>>= 0;

    return getUint8ArrayMemory0().subarray(
        pointer,
        pointer + length
    );
}

function passStringToWasm0(text, malloc, realloc) {
    if (realloc === undefined) {
        const bytes = cachedTextEncoder.encode(text);
        const pointer = malloc(bytes.length, 1) >>> 0;

        getUint8ArrayMemory0()
            .subarray(pointer, pointer + bytes.length)
            .set(bytes);

        WASM_VECTOR_LEN = bytes.length;

        return pointer;
    }

    let length = text.length;
    let pointer = malloc(length, 1) >>> 0;

    const memory = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < length; offset++) {
        const code = text.charCodeAt(offset);

        if (code > 127) {
            break;
        }

        memory[pointer + offset] = code;
    }

    if (offset !== length) {
        if (offset !== 0) {
            text = text.slice(offset);
        }

        pointer = realloc(
            pointer,
            length,
            length = offset + text.length * 3,
            1
        ) >>> 0;

        const view = getUint8ArrayMemory0().subarray(
            pointer + offset,
            pointer + length
        );

        const result = cachedTextEncoder.encodeInto(text, view);

        offset += result.written;

        pointer = realloc(
            pointer,
            length,
            offset,
            1
        ) >>> 0;
    }

    WASM_VECTOR_LEN = offset;

    return pointer;
}

function debugString(value) {
    const type = typeof value;

    if (
        type === "number" ||
        type === "boolean" ||
        value == null
    ) {
        return `${value}`;
    }

    if (type === "string") {
        return `"${value}"`;
    }

    if (type === "symbol") {
        return value.description == null
            ? "Symbol"
            : `Symbol(${value.description})`;
    }

    if (type === "function") {
        return value.name
            ? `Function(${value.name})`
            : "Function";
    }

    if (Array.isArray(value)) {
        return `[${value.map(debugString).join(", ")}]`;
    }

    const tag = Object.prototype.toString.call(value);
    const match = /\[object ([^\]]+)\]/.exec(tag);

    if (!match) {
        return tag;
    }

    if (match[1] === "Object") {
        try {
            return `Object(${JSON.stringify(value)})`;
        } catch (_) {
            return "Object";
        }
    }

    if (value instanceof Error) {
        return `${value.name}: ${value.message}\n${value.stack || ""}`;
    }

    return match[1];
}

function handleError(fn, args) {
    try {
        return fn.apply(this, args);
    } catch (error) {
        wasm.f54(addHeapObject(error));
    }
}

function makeMutClosure(arg0, arg1, destructor, fn) {
    const state = {
        a: arg0,
        b: arg1,
        count: 1,
        destructor
    };

    const real = (...args) => {
        state.count++;

        const a = state.a;

        state.a = 0;

        try {
            return fn(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };

    real._wbg_cb_unref = () => {
        if (--state.count === 0) {
            state.destructor(state.a, state.b);
            state.a = 0;
        }
    };

    return real;
}

function closureInvokeMut(a, b, value) {
    wasm.f51(a, b, addHeapObject(value));
}

const ROOT =
    typeof globalThis !== "undefined"
        ? globalThis
        : Function("return this")();

const browserGlobal = {
    crypto,
    location: {
        host: "www.iios.fun"
    },
    navigator: {
        userAgent: UA
    },
    queueMicrotask
};

function getImports() {
    const imports = {
        wbg: {}
    };

    const w = imports.wbg;

    w.f39 = (returnPointer, index) => {
        const pointer = passStringToWasm0(
            debugString(getObject(index)),
            wasm.f56,
            wasm.f55
        );

        const length = WASM_VECTOR_LEN;

        getDataViewMemory0().setInt32(
            returnPointer + 4,
            length,
            true
        );

        getDataViewMemory0().setInt32(
            returnPointer,
            pointer,
            true
        );
    };

    w.f41 = index =>
        typeof getObject(index) === "function";

    w.f40 = index =>
        typeof getObject(index) === "object" &&
        getObject(index) !== null;

    w.f21 = index =>
        typeof getObject(index) === "string";

    w.f26 = index =>
        getObject(index) === undefined;

    w.f38 = (returnPointer, index) => {
        const value = getObject(index);

        const number =
            typeof value === "number"
                ? value
                : undefined;

        getDataViewMemory0().setFloat64(
            returnPointer + 8,
            isLikeNone(number) ? 0 : number,
            true
        );

        getDataViewMemory0().setInt32(
            returnPointer,
            !isLikeNone(number),
            true
        );
    };

    w.f37 = (returnPointer, index) => {
        const value = getObject(index);

        const string =
            typeof value === "string"
                ? value
                : undefined;

        const pointer = isLikeNone(string)
            ? 0
            : passStringToWasm0(
                string,
                wasm.f56,
                wasm.f55
            );

        const length = WASM_VECTOR_LEN;

        getDataViewMemory0().setInt32(
            returnPointer + 4,
            length,
            true
        );

        getDataViewMemory0().setInt32(
            returnPointer,
            pointer,
            true
        );
    };

    w.f36 = (pointer, length) => {
        throw new Error(
            getStringFromWasm0(pointer, length)
        );
    };

    w.f44 = index =>
        getObject(index)._wbg_cb_unref();

    w.f33 = function () {
        return handleError(
            (a, b, c) =>
                addHeapObject(
                    getObject(a).call(
                        getObject(b),
                        getObject(c)
                    )
                ),
            arguments
        );
    };

    w.f28 = function () {
        return handleError(
            (a, b) =>
                addHeapObject(
                    getObject(a).call(getObject(b))
                ),
            arguments
        );
    };

    w.f17 = index =>
        addHeapObject(getObject(index).crypto);

    w.f5 = function () {
        return handleError(
            index =>
                addHeapObject(
                    getObject(index).crypto
                ),
            arguments
        );
    };

    w.f10 = function () {
        return handleError(
            (a, b, c, pointer, length) =>
                addHeapObject(
                    getObject(a).decrypt(
                        getObject(b),
                        getObject(c),
                        getArrayU8FromWasm0(
                            pointer,
                            length
                        )
                    )
                ),
            arguments
        );
    };

    w.f16 = function () {
        return handleError(
            (a, b) =>
                getObject(a).getRandomValues(
                    getObject(b)
                ),
            arguments
        );
    };

    w.f25 = function () {
        return handleError(
            (a, b) =>
                addHeapObject(
                    Reflect.get(
                        getObject(a),
                        getObject(b)
                    )
                ),
            arguments
        );
    };

    w.f49 = function () {
        return handleError(
            (returnPointer, index) => {
                const pointer = passStringToWasm0(
                    getObject(index).host,
                    wasm.f56,
                    wasm.f55
                );

                const length = WASM_VECTOR_LEN;

                getDataViewMemory0().setInt32(
                    returnPointer + 4,
                    length,
                    true
                );

                getDataViewMemory0().setInt32(
                    returnPointer,
                    pointer,
                    true
                );
            },
            arguments
        );
    };

    w.f9 = function () {
        return handleError(
            (
                a,
                p1,
                l1,
                b,
                p2,
                l2,
                extractable,
                usages
            ) =>
                addHeapObject(
                    getObject(a).importKey(
                        getStringFromWasm0(p1, l1),
                        getObject(b),
                        getStringFromWasm0(p2, l2),
                        extractable !== 0,
                        getObject(usages)
                    )
                ),
            arguments
        );
    };

    w.f48 = index => {
        const object = getObject(index);

        return (
            object === browserGlobal ||
            object === ROOT
        );
    };

    w.f12 = index =>
        getObject(index).length;

    w.f1 = index =>
        addHeapObject(getObject(index).location);

    w.f23 = index =>
        addHeapObject(getObject(index).msCrypto);

    w.f0 = index =>
        addHeapObject(getObject(index).navigator);

    w.f2 = () =>
        addHeapObject({});

    w.f11 = index =>
        addHeapObject(
            new Uint8Array(getObject(index))
        );

    w.f13 = (a, b) => {
        const state = {
            a,
            b
        };

        const promise = new Promise(
            (resolve, reject) => {
                const savedA = state.a;

                state.a = 0;

                try {
                    wasm.f53(
                        savedA,
                        state.b,
                        addHeapObject(resolve),
                        addHeapObject(reject)
                    );
                } finally {
                    state.a = savedA;
                }
            }
        );

        state.a = 0;
        state.b = 0;

        return addHeapObject(promise);
    };

    w.f7 = (pointer, length) =>
        addHeapObject(
            new Uint8Array(
                getArrayU8FromWasm0(
                    pointer,
                    length
                )
            )
        );

    w.f27 = (pointer, length) =>
        addHeapObject(
            new Function(
                getStringFromWasm0(
                    pointer,
                    length
                )
            )
        );

    w.f24 = length =>
        addHeapObject(
            new Uint8Array(length >>> 0)
        );

    w.f20 = index =>
        addHeapObject(getObject(index).node);

    w.f3 = () =>
        Date.now();

    w.f8 = (a, b) =>
        addHeapObject(
            Array.of(
                getObject(a),
                getObject(b)
            )
        );

    w.f18 = index =>
        addHeapObject(getObject(index).process);

    w.f35 = (pointer, length, index) =>
        Uint8Array.prototype.set.call(
            getArrayU8FromWasm0(
                pointer,
                length
            ),
            getObject(index)
        );

    w.f42 = index =>
        addHeapObject(
            getObject(index).queueMicrotask
        );

    w.f46 = index =>
        queueMicrotask(getObject(index));

    w.f14 = function () {
        return handleError(
            (a, b) =>
                getObject(a).randomFillSync(
                    takeObject(b)
                ),
            arguments
        );
    };

    w.f22 = function () {
        return handleError(
            () =>
                addHeapObject(
                    typeof module !== "undefined"
                        ? module.require
                        : undefined
                ),
            arguments
        );
    };

    w.f43 = index =>
        addHeapObject(
            Promise.resolve(getObject(index))
        );

    w.f4 = (a, b, c) => {
        getObject(a)[takeObject(b)] =
            takeObject(c);
    };

    w.f34 = function () {
        return handleError(
            (a, b, c) =>
                Reflect.set(
                    getObject(a),
                    getObject(b),
                    getObject(c)
                ),
            arguments
        );
    };

    w.f29 = () => 0;

    w.f30 = () =>
        addHeapObject(browserGlobal);

    w.f32 = () =>
        addHeapObject(browserGlobal);

    w.f31 = () =>
        addHeapObject(browserGlobal);

    w.f15 = (index, start, end) =>
        addHeapObject(
            getObject(index).subarray(
                start >>> 0,
                end >>> 0
            )
        );

    w.f6 = index =>
        addHeapObject(getObject(index).subtle);

    w.f47 = (a, b, c) =>
        addHeapObject(
            getObject(a).then(
                getObject(b),
                getObject(c)
            )
        );

    w.f45 = (a, b) =>
        addHeapObject(
            getObject(a).then(getObject(b))
        );

    w.f50 = function () {
        return handleError(
            (returnPointer, index) => {
                const pointer =
                    passStringToWasm0(
                        getObject(index).userAgent,
                        wasm.f56,
                        wasm.f55
                    );

                const length = WASM_VECTOR_LEN;

                getDataViewMemory0().setInt32(
                    returnPointer + 4,
                    length,
                    true
                );

                getDataViewMemory0().setInt32(
                    returnPointer,
                    pointer,
                    true
                );
            },
            arguments
        );
    };

    w.f19 = index =>
        addHeapObject(getObject(index).versions);

    w.f57 = (pointer, length) =>
        addHeapObject(
            getStringFromWasm0(
                pointer,
                length
            )
        );

    w.f58 = (pointer, length) =>
        addHeapObject(
            getArrayU8FromWasm0(
                pointer,
                length
            )
        );

    w.f59 = (a, b) =>
        addHeapObject(
            makeMutClosure(
                a,
                b,
                wasm.f52,
                closureInvokeMut
            )
        );

    w.f60 = index =>
        addHeapObject(getObject(index));

    w.f61 = index => {
        takeObject(index);
    };

    return imports;
}

function toUint8Array(bodyBytes) {
    if (bodyBytes instanceof ArrayBuffer) {
        return new Uint8Array(bodyBytes);
    }

    if (ArrayBuffer.isView(bodyBytes)) {
        return new Uint8Array(
            bodyBytes.buffer,
            bodyBytes.byteOffset,
            bodyBytes.byteLength
        );
    }

    if (Array.isArray(bodyBytes)) {
        return new Uint8Array(bodyBytes);
    }

    if (
        bodyBytes &&
        bodyBytes.buffer instanceof ArrayBuffer
    ) {
        return new Uint8Array(bodyBytes.buffer);
    }

    throw new Error(
        `无法识别 WASM 数据：${
            Object.prototype.toString.call(
                bodyBytes
            )
        }`
    );
}

async function loadWasm() {
    const response = await $task.fetch({
        url: WASM_URL,
        method: "GET",
        headers: {
            Accept: "application/wasm,*/*"
        }
    });

    if (
        response.statusCode !== 200 ||
        !response.bodyBytes
    ) {
        throw new Error(
            `WASM 下载失败：HTTP ${
                response.statusCode
            }，bodyBytes=${
                typeof response.bodyBytes
            }`
        );
    }

    const bytes = toUint8Array(
        response.bodyBytes
    );

    const result =
        await WebAssembly.instantiate(
            bytes,
            getImports()
        );

    wasm = result.instance.exports;

    cachedUint8Memory0 = null;
    cachedDataViewMemory0 = null;
}

async function wasmEncrypt(config) {
    return takeObject(
        wasm.e(addHeapObject(config))
    );
}

async function wasmDecrypt(response) {
    return takeObject(
        wasm.d(addHeapObject(response))
    );
}

function normalizeHeaders(headers) {
    const output = {};

    for (const key of Object.keys(headers || {})) {
        const value = headers[key];

        output[key] = value;
        output[key.toLowerCase()] = value;
    }

    return output;
}

function formatError(error) {
    if (!error) {
        return "未知错误";
    }

    return (
        error.stack ||
        error.message ||
        String(error)
    );
}

function finish(title, message, detail) {
    const text = [
        title,
        message,
        detail
    ].filter(Boolean).join("\n");

    console.log(text);

    $notify(
        "iios 自动签到",
        title,
        [message, detail]
            .filter(Boolean)
            .join("\n")
    );

    $done();
}

(async () => {
    if (
        !AUTHORIZATION.startsWith("Basic ") ||
        AUTHORIZATION.includes("在这里粘贴")
    ) {
        throw new Error(
            "请先把脚本顶部的 AUTHORIZATION 替换为抓包里的完整值"
        );
    }

    console.log("1/4 下载并加载 WASM……");

    await loadWasm();

    console.log(
        "2/4 生成动态签名和加密请求体……"
    );

    const timestamp = Date.now();

    const config = {
        baseURL: "/api",
        url: "/task",
        method: "POST",
        data: JSON.stringify({
            type: 2,
            webapp: false
        }),
        timeout: 120000,
        headers: {
            "Content-Type": "text/plain",
            "X-Timestamp": timestamp,
            Authorization: AUTHORIZATION
        }
    };

    const encrypted =
        await wasmEncrypt(config);

    if (
        !encrypted ||
        !encrypted.s ||
        !encrypted.d
    ) {
        throw new Error(
            `WASM 输出异常：${
                JSON.stringify(encrypted)
            }`
        );
    }

    console.log(
        `X-Timestamp: ${timestamp}`
    );

    console.log(
        `X-Signature: ${encrypted.s}`
    );

    console.log(
        `加密请求体: ${encrypted.d}`
    );

    console.log("3/4 提交签到请求……");

    const requestHeaders = {
        "Content-Type": "text/plain",
        Accept:
            "application/json, text/plain, */*",
        "X-Timestamp": String(timestamp),
        "X-Signature": encrypted.s,
        Authorization: AUTHORIZATION,
        Origin: "https://www.iios.fun",
        Referer: "https://www.iios.fun/",
        "User-Agent": UA
    };

    if (COOKIE.trim()) {
        requestHeaders.Cookie = COOKIE.trim();
    }

    const response = await $task.fetch({
        url: API_URL,
        method: "POST",
        headers: requestHeaders,
        body: encrypted.d
    });

    console.log(
        `HTTP 状态码: ${response.statusCode}`
    );

    console.log(
        `加密响应体: ${response.body}`
    );

    console.log(
        "4/4 解密服务器响应……"
    );

    const responseHeaders =
        normalizeHeaders(
            response.headers || {}
        );

    let plaintext;

    try {
        const decrypted =
            await wasmDecrypt({
                data: response.body,
                status: response.statusCode,
                headers: responseHeaders,
                config
            });

        plaintext =
            decrypted && decrypted.d;
    } catch (error) {
        console.log(
            `响应解密失败：${
                formatError(error)
            }`
        );
    }

    if (plaintext) {
        console.log(
            `解密结果: ${plaintext}`
        );

        let parsed;

        try {
            parsed = JSON.parse(plaintext);
        } catch (_) {
            parsed = null;
        }

        const message =
            parsed &&
            (parsed.message || parsed.msg)
                ? parsed.message || parsed.msg
                : parsed &&
                  parsed.result &&
                  parsed.result.points != null
                ? `签到成功，获得 ${
                    parsed.result.points
                } 积分`
                : plaintext;

        finish(
            response.statusCode === 200
                ? "请求完成"
                : `HTTP ${
                    response.statusCode
                }`,
            message,
            "把完整 Logs 截图发回来"
        );
    } else {
        finish(
            `HTTP ${response.statusCode}`,
            "请求已返回，但暂时无法解密",
            `原始响应：${response.body}`
        );
    }
})().catch(error => {
    finish(
        "运行失败",
        formatError(error),
        "把完整 Logs 截图发回来"
    );
});
