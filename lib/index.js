import { createRequire } from "node:module";
import { access, appendFile, chmod, copyFile, cp, link, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import path, { basename, delimiter, dirname, isAbsolute, join, relative, sep } from "node:path";
import { format, promisify, stripVTControlCharacters } from "node:util";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import fs, { constants, existsSync, readFileSync, rmSync, watch } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { setImmediate, setTimeout as setTimeout$1 } from "node:timers/promises";
import { execFile, spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { DeadlineExceededError, Mesh, MeshCallClient, MeshCallError, Router, dependency, meta, mutates, query, service, stream, z as z$1 } from "meshcall";
import { createServer as createServer$1 } from "node:http";
import { foldSessionTitle } from "@deepseek-ai/dsh-session-title";
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { SessionLogOffset } from "@deepseek-ai/dsh-session";
import { parseCommand } from "@deepseek-ai/dsh-commands";
// src/host/dsh-runtime/types.ts
function record(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function json(value) {
	return JSON.parse(JSON.stringify(value));
}
/** Normalize wire content without mutating native events or streaming buffers. */
function wellFormedJson(value) {
	if (typeof value === "string") return wellFormedString(value);
	if (Array.isArray(value)) return value.map(wellFormedJson);
	if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [wellFormedString(key), wellFormedJson(item)]));
	return value;
}
function wellFormedString(value) {
	return value.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�");
}
// src/host/dsh-runtime/errors.ts
const codes = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,
	UNSUPPORTED_OPERATION: -32001,
	SESSION_NOT_FOUND: -32002,
	REQUEST_TIMEOUT: -32006,
	DSH_SERVICE_UNAVAILABLE: -32007,
	SESSION_ARCHIVED: -32014,
	PERSISTENCE_ERROR: -32008,
	PROTOCOL_VERSION_MISMATCH: -32009,
	NOT_INITIALIZED: -32012,
	FRAME_TOO_LARGE: -32013
};
var BridgeError = class extends Error {
	code;
	retryable;
	constructor(code, message, retryable = false) {
		super(message);
		this.code = code;
		this.retryable = retryable;
	}
	toJSON() {
		return {
			code: codes[this.code],
			message: this.message,
			data: {
				code: this.code,
				retryable: this.retryable
			}
		};
	}
};
/** Only thrown before any native creation intent or message admission. */
var CreationNotStartedError = class extends BridgeError {
	constructor(error) {
		super(error.code, error.message, error.retryable);
	}
};
function publicError(error) {
	if (error instanceof BridgeError) return error;
	const nativeCode = record(error).code;
	if (record(error).isDSHRemoteError === true) {
		if (nativeCode === "session/attachment-invalid") {
			const reason = record(record(error).details).reason;
			return new BridgeError("INVALID_PARAMS", reason === "MODEL_DOES_NOT_SUPPORT_IMAGES" ? "The selected DSH model does not support images. Choose an image-capable model." : "DSH rejected the attachment. Check its format, contents and size limits.");
		}
		if (nativeCode === "session/model-unavailable") return new BridgeError("INVALID_PARAMS", "DSH could not apply the selected provider, model or effort. Refresh and choose an available model.");
		if (typeof nativeCode === "string" && nativeCode.startsWith("agent-preset/")) return new BridgeError("INVALID_PARAMS", "DSH could not load the selected Agent mode. Refresh the Runtime configuration.");
		return new BridgeError("DSH_SERVICE_UNAVAILABLE", "DSH could not complete this operation. Refresh the session state and retry.", true);
	}
	if (nativeCode === "SESSION_QUERY_SESSION_NOT_FOUND") return new BridgeError("SESSION_NOT_FOUND", "The DSH session no longer exists.");
	if (error instanceof Error && error.name === "AbortError") return new BridgeError("REQUEST_TIMEOUT", "The request was cancelled or timed out.", true);
	if (nativeCode === "SESSION_QUERY_PERSISTENCE_FAILED") return new BridgeError("PERSISTENCE_ERROR", "DSH could not safely read this session. Check the Bridge logs page.", true);
	return new BridgeError("INTERNAL_ERROR", "DSH could not complete this request. Check the Bridge logs page and retry.", true);
}
// src/host/dsh-runtime/diagnostics.ts
const quiet = {
	write() {},
	async flush() {}
};
/** Native parser exceptions may quote a whole event. Keep codes and stack locations,
* never exception messages, source lines, request bodies, tokens or event payloads. */
function errorDetails(error, depth = 0) {
	const value = record(error);
	const code = typeof value.code === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(value.code) ? value.code : void 0;
	const stack = error instanceof Error ? error.stack?.split("\n").filter((line) => /^\s+at .+:\d+:\d+\)?$/.test(line)).slice(0, 12).map((line) => line.trim()) : void 0;
	const gap = error instanceof Error ? error.message.match(/^corrupt session log: seq gap in committed region at line (\d+) \(expected (\d+), got (\d+)\)$/) : null;
	return {
		errorType: error instanceof Error ? error.name : typeof error,
		...code ? { errorCode: code } : {},
		...error instanceof BridgeError ? {
			bridgeCode: error.code,
			retryable: error.retryable
		} : {},
		...stack?.length ? { stack } : {},
		...gap ? {
			reason: "sequence_gap",
			line: Number(gap[1]),
			expectedSeq: Number(gap[2]),
			actualSeq: Number(gap[3])
		} : {},
		...value.cause && depth < 3 ? { cause: errorDetails(value.cause, depth + 1) } : {}
	};
}
/** Business diagnostics depend on an injected output, never on a path or RPC connection. */
var RuntimeDiagnostics = class RuntimeDiagnostics {
	output;
	fields;
	name;
	constructor(output = quiet, fields = {}, name = "dsh-bridge") {
		this.output = output;
		this.fields = fields;
		this.name = name;
	}
	bind(fields) {
		return new RuntimeDiagnostics(this.output, {
			...this.fields,
			...fields
		}, this.name);
	}
	log(level, event, fields = {}, error) {
		const details = {
			...this.fields,
			...fields,
			...error === void 0 ? {} : errorDetails(error)
		};
		const serialized = JSON.stringify(details);
		try {
			this.output.write({
				time: (/* @__PURE__ */ new Date()).toISOString(),
				level,
				name: this.name,
				message: event.slice(0, 16e3),
				details: serialized.length <= 16e3 ? serialized : JSON.stringify({
					truncated: true,
					summary: serialized.slice(0, 12e3)
				})
			});
		} catch {}
	}
	async measure(event, fields, action) {
		const start = performance.now();
		this.log("debug", `${event}.started`, fields);
		try {
			const value = await action();
			this.log("debug", `${event}.completed`, {
				...fields,
				elapsedMs: Math.round(performance.now() - start)
			});
			return value;
		} catch (error) {
			this.log("error", `${event}.failed`, {
				...fields,
				elapsedMs: Math.round(performance.now() - start)
			}, error);
			throw error;
		}
	}
	async flush() {
		await this.output.flush();
	}
};
/** The same injected output receives framework access logs and per-call loggers. */
var RuntimeRpcLogger = class RuntimeRpcLogger {
	diagnostics;
	fields;
	constructor(diagnostics, fields = {}) {
		this.diagnostics = diagnostics;
		this.fields = fields;
	}
	bind(context) {
		const safe = {};
		for (const [key, value] of Object.entries(context)) if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") safe[key] = value;
		return new RuntimeRpcLogger(this.diagnostics, {
			...this.fields,
			...safe
		});
	}
	log(level, message, ...args) {
		if (this.fields.service === "aa.local.v2.Logs") return;
		const safe = args.map((value) => value instanceof Error ? errorDetails(value) : value);
		this.diagnostics.log(level === "warning" ? "warn" : level, format(message, ...safe), this.fields);
	}
	debug(message, ...args) {
		this.log("debug", message, ...args);
	}
	info(message, ...args) {
		this.log("info", message, ...args);
	}
	warning(message, ...args) {
		this.log("warning", message, ...args);
	}
	error(message, ...args) {
		this.log("error", message, ...args);
	}
};
const quietDiagnostics = new RuntimeDiagnostics();
// src/host/onboarding/diagnostics.ts
/** Pre-startup and installation diagnostics are kept locally and also forwarded to the central Logs output when provided. */
function onboardingDiagnostics(sink, directory, secondary) {
	let pending = Promise.resolve();
	let queued = 0;
	return new RuntimeDiagnostics({
		write(entry) {
			try {
				sink[entry.level]("event=%s %s", entry.message, entry.details);
			} catch {}
			try {
				secondary?.write(entry);
			} catch {}
			if (queued >= 256) return;
			queued++;
			pending = pending.then(async () => {
				await mkdir(directory, {
					recursive: true,
					mode: 448
				});
				const path = join(directory, "onboarding.jsonl");
				if (await stat(path).then((value) => value.size, () => 0) > 2097152) await rename(path, join(directory, "onboarding.previous.jsonl"));
				await appendFile(path, JSON.stringify(entry) + "\n", { mode: 384 });
			}).catch(() => void 0).finally(() => {
				queued--;
			});
		},
		async flush() {
			await Promise.all([pending, secondary?.flush() ?? Promise.resolve()]);
		}
	}, {}, "yundashi-remote-control");
}
// src/host/dsh-runtime/log-output.ts
/** Retain unacknowledged entries with stable IDs; only Connector persists them. */
var RpcLogOutput = class {
	capacity;
	source;
	producer = randomUUID();
	sequence = 0;
	pending = [];
	dropped = 0;
	client;
	sending;
	constructor(capacity = 512, source = "bridge") {
		this.capacity = capacity;
		this.source = source;
	}
	connect(client) {
		this.client = client;
	}
	write(entry) {
		if (this.pending.length >= this.capacity) {
			this.dropped++;
			return;
		}
		const defaultName = this.source === "plugin" ? "dsh-plugin" : "dsh-bridge";
		this.pending.push({
			...entry,
			name: entry.name || defaultName,
			producer: this.producer,
			eventId: String(++this.sequence)
		});
	}
	flush(fallbackClient) {
		return this.sending ??= this.send(fallbackClient).finally(() => {
			this.sending = void 0;
		});
	}
	async send(fallbackClient) {
		const client = this.client ?? fallbackClient;
		if (!client) return;
		if (this.dropped && this.pending.length < this.capacity) {
			const count = this.dropped;
			this.dropped = 0;
			this.write({
				time: (/* @__PURE__ */ new Date()).toISOString(),
				level: "warn",
				name: this.source === "plugin" ? "dsh-plugin" : "dsh-bridge",
				message: "diagnostics.dropped",
				details: JSON.stringify({ droppedLogEntries: count })
			});
		}
		const count = this.pending.length;
		for (let sent = 0; sent < count && (this.client ?? fallbackClient) === client; sent += 64) {
			const batch = this.pending.slice(0, Math.min(64, count - sent));
			try {
				await client.write(batch, { timeoutMs: 1e3 });
			} catch {
				return;
			}
			this.pending.splice(0, batch.length);
		}
	}
};
// src/host/dsh-runtime/startup-status.ts
/** The raw exception must never cross the management gateway. Keep the same safe
* error context used by runtime diagnostics, even when the log directory is unwritable. */
function startupFailureDiagnostic(error, source, event, status) {
	return {
		time: (/* @__PURE__ */ new Date()).toISOString(),
		source,
		event,
		message: status.message,
		details: JSON.stringify({
			code: status.code,
			...errorDetails(error)
		})
	};
}
/** Public guidance never includes raw exceptions, paths or endpoint credentials. */
function startupFailure(error) {
	const value = record(error);
	const cause = record(value.cause);
	const code = typeof value.code === "string" ? value.code : typeof cause.code === "string" ? cause.code : void 0;
	const message = error instanceof Error ? error.message : "";
	if (code === "MANAGER_LOCK_HELD" || code === "EADDRINUSE" || /Another DSH bridge owns|另一个插件实例正在管理/.test(message)) return {
		state: "failed",
		code: "BRIDGE_IN_USE",
		canRetry: true,
		message: "本机连接被占用，无法启动。",
		hint: "请退出其他正在运行的 DSH，再点击“尝试重启”。如果只开了一个 DSH，请检查是否重复启用了插件。"
	};
	if (code === "EACCES" || code === "EPERM") return {
		state: "failed",
		code,
		canRetry: true,
		message: "本机连接启动失败：访问权限不足。",
		hint: "请检查 DSH 数据目录的读写权限，以及系统是否允许 DSH 使用本机网络，再尝试重启。"
	};
	if (code === "ENOSPC" || code === "EROFS") return {
		state: "failed",
		code,
		canRetry: true,
		message: "本机连接启动失败：无法保存连接信息。",
		hint: code === "ENOSPC" ? "请释放磁盘空间后，再尝试重启。" : "DSH 数据目录所在磁盘为只读。请恢复写入权限后，再尝试重启。"
	};
	return {
		state: "failed",
		code: "BRIDGE_START_FAILED",
		canRetry: true,
		message: "本机连接未能启动。",
		hint: "请先尝试重启连接。如果仍然失败，请展开运行日志中的失败记录，查看错误详情。"
	};
}
const unavailableBridge = {
	state: "unavailable",
	message: "本机连接服务尚未就绪。",
	hint: "如果此状态持续出现，请在 DSH 中重新加载插件，或退出并重新打开 DSH。",
	canRetry: false
};
// src/contracts/index.ts
const HOST_NAMESPACE = "yundashiRemoteControl";
const OAUTH_CLIENT_ID = "agents-anywhere-dsh-plugin";
// src/contracts/web-address.ts
/** The backend is already normalized by Host; both runtimes use the same Web routing convention. */
function resolveOAuthWebOrigin(apiBaseUrl, webUrlOverride) {
	if (typeof webUrlOverride === "string" && webUrlOverride.trim() !== "") return new URL(webUrlOverride.trim()).origin;
	const url = new URL(apiBaseUrl);
	if ([
		"127.0.0.1",
		"localhost",
		"[::1]"
	].includes(url.hostname) && url.port === "8000") url.port = "5174";
	return url.origin;
}
function resolveWebAppUrl(apiBaseUrl, webUrlOverride) {
	return `${resolveOAuthWebOrigin(apiBaseUrl, webUrlOverride)}/#/`;
}
function resolveOnboardingUrl(apiBaseUrl, connectorId, flowId, webUrlOverride) {
	const url = new URL(`${resolveOAuthWebOrigin(apiBaseUrl, webUrlOverride)}/`);
	url.hash = `/onboarding?${new URLSearchParams({
		source: "dsh-plugin",
		connectorId,
		flowId
	})}`;
	return url.href;
}
// src/host/account/server.ts
const API_NAMESPACE = "/api/v2";
/** Match Desktop's origin-only server input, including bare hosts and /api/v2. */
function normalizeServerOrigin(value) {
	try {
		const input = value.trim();
		if (!input) throw new Error();
		const url = new URL(input.includes("://") ? input : `https://${input}`);
		const pathname = url.pathname.replace(/\/+$/, "");
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || pathname && pathname !== API_NAMESPACE) throw new Error();
		return url.origin;
	} catch {
		throw new Error("请输入有效的 HTTP 或 HTTPS 服务器地址，不要包含账号、密码或页面路径。");
	}
}
/** Check the selected backend before replacing any active account or connection. */
async function checkServer(apiBaseUrl, fetcher = fetch, timeoutMs = 1e4) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetcher(`${apiBaseUrl}${API_NAMESPACE}/health`, {
			headers: { accept: "application/json" },
			credentials: "omit",
			redirect: "error",
			signal: controller.signal
		});
		if (!response.ok) throw new Error("无法连接服务器，请检查地址和网络后重试。");
		const payload = await response.json().catch(() => null);
		if (!payload || typeof payload !== "object" || !("status" in payload) || payload.status !== "ok") throw new Error("该地址未返回正常的远程控制服务，请检查后端地址。");
	} catch (error) {
		if (controller.signal.aborted) throw new Error("连接服务器超时，请检查地址和网络后重试。");
		if (error instanceof TypeError) throw new Error("无法连接服务器，请检查地址和网络后重试。");
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}
// src/host/config.ts
function probeYunworkContract() {
	const resourcesPath = process.resourcesPath;
	const candidates = [
		process.env["YUNWORK_RUNTIME"],
		typeof resourcesPath === "string" ? join(resourcesPath, "yunwork-runtime.json") : void 0,
		typeof resourcesPath === "string" ? join(resourcesPath, "app.asar.unpacked", "yunwork-runtime.json") : void 0,
		join(dirname(process.execPath), "resources", "yunwork-runtime.json")
	].filter((p) => typeof p === "string" && p.trim() !== "");
	let parsed;
	for (const file of candidates) {
		if (!existsSync(file)) continue;
		try {
			const raw = JSON.parse(readFileSync(file, "utf8"));
			if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
				parsed = raw;
				break;
			}
		} catch {}
	}
	const runtimeType = process.env["YUNWORK_ANYWHERE_RUNTIME_TYPE"]?.trim() || (typeof parsed?.["anywhereRuntimeType"] === "string" ? parsed["anywhereRuntimeType"].trim() : "") || (parsed !== void 0 ? "yunwork" : "");
	const serverUrl = process.env["YUNWORK_ANYWHERE_SERVER_URL"]?.trim() || (typeof parsed?.["anywhereServerUrl"] === "string" ? parsed["anywhereServerUrl"].trim() : "");
	const webUrl = process.env["YUNWORK_ANYWHERE_WEB_URL"]?.trim() || (typeof parsed?.["anywhereWebUrl"] === "string" ? parsed["anywhereWebUrl"].trim() : "");
	const productName = typeof parsed?.["productName"] === "string" ? parsed["productName"].trim() : void 0;
	const shortName = typeof parsed?.["shortName"] === "string" ? parsed["shortName"].trim() : void 0;
	if (parsed === void 0 && runtimeType === "" && serverUrl === "" && webUrl === "") return void 0;
	return {
		runtimeType: runtimeType || "yunwork",
		...serverUrl !== "" ? { serverUrl } : {},
		...webUrl !== "" ? { webUrl } : {},
		...productName !== void 0 && productName !== "" ? { productName } : {},
		...shortName !== void 0 && shortName !== "" ? { shortName } : {}
	};
}
const Config = z.object({
	runtimeType: z.union([z.const("dsh"), z.const("yunwork")]),
	dshHome: z.string(),
	apiBaseUrl: z.string(),
	stateRoot: z.string(),
	connectorSourceDir: z.string(),
	uvPath: z.string()
});
/** Explicit profile selection wins; packaged metadata supplies the default. */
function runtimeType(config) {
	return config.runtimeType ?? probeYunworkContract()?.runtimeType ?? "yunwork";
}
function effectiveDshHome(dshHome) {
	const configured = dshHome ?? process.env["DSH_HOME"];
	if (typeof configured === "string" && configured.trim() !== "" && isAbsolute(configured)) return configured.trim();
	return join(userInfo().homedir, ".dsh");
}
function stateRoot(config) {
	if (config.stateRoot !== void 0) return config.stateRoot;
	return join(effectiveDshHome(config.dshHome), "anywhere", "dsh-bridge-next");
}
/** Match Connector's DSH_HOME scope and keep DSH/YunWork rendezvous distinct. */
function bridgeDirectory(config = {}) {
	return join(effectiveDshHome(config.dshHome), "anywhere", "dsh-bridge");
}
/**
* Where plugins before 2.0.3 published the endpoint. Connectors before 2.0.3 look only here, so
* the bridge mirrors its endpoint to this directory; it is resolved exactly as those plugins did.
*/
function legacyBridgeDirectory(config) {
	if (runtimeType(config) === "yunwork") return void 0;
	const home = config.dshHome ?? process.env["DSH_HOME"] ?? join(homedir(), ".dsh");
	return isAbsolute(home) ? join(home, "agents-anywhere", "bridge") : void 0;
}
function resolveConfig(config) {
	if (config.dshHome !== void 0 && !isAbsolute(config.dshHome)) throw new Error("DSH_HOME 必须是绝对路径。");
	const contract = probeYunworkContract();
	const selectedRuntimeType = config.runtimeType ?? contract?.runtimeType ?? "yunwork";
	const root = stateRoot(config);
	const connectorSourceDir = config.connectorSourceDir ?? fileURLToPath(new URL("./bundled-connector/", import.meta.url));
	if (!isAbsolute(root) || !isAbsolute(connectorSourceDir)) throw new Error("数据目录和 Connector 源码目录必须是绝对路径。");
	return {
		dshHome: effectiveDshHome(config.dshHome),
		runtimeType: selectedRuntimeType,
		stateRoot: root,
		...config.stateRoot === void 0 && selectedRuntimeType === "dsh" && root === join(userInfo().homedir, ".agents-anywhere", "dsh-bridge-next") ? { legacyStateRoot: join(userInfo().homedir, ".agentsanywhere", "dsh-bridge-next") } : {},
		connectorSourceDir,
		apiBaseUrl: normalizeServerOrigin(config.apiBaseUrl ?? contract?.serverUrl ?? "https://agent.yundashi.com"),
		uvPath: config.uvPath ?? process.env["UV_PATH"] ?? "uv",
		anywhereWebUrl: contract?.webUrl ?? "https://agent.yundashi.com",
		productName: contract?.productName ?? "云大师 Agent",
		shortName: contract?.shortName ?? "云大师"
	};
}
// src/host/account/api.ts
/** Only display fields cross the public RPC boundary; avatars follow the server's data-image contract. */
function publicProfile(user) {
	return {
		userId: user.userId,
		displayName: user.displayName?.trim() || user.userId,
		email: typeof user.email === "string" ? user.email : null,
		avatar: typeof user.avatar === "string" && user.avatar.length <= 262144 && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(user.avatar) ? user.avatar : null
	};
}
var ApiError = class extends Error {
	status;
	constructor(status) {
		super(status === 401 ? "登录已失效，请重新登录。" : `服务请求失败（HTTP ${status}），请重试。`);
		this.status = status;
	}
};
const RETRY_DELAYS_MS = [500, 1500];
/** The request never left: repeating it cannot do anything twice. */
const NOT_SENT = /* @__PURE__ */ new Set([
	"ECONNREFUSED",
	"EAI_AGAIN",
	"ENOTFOUND",
	"EHOSTUNREACH",
	"ENETUNREACH",
	"UND_ERR_CONNECT_TIMEOUT"
]);
/** The connection failed at an unknown point, so the request may have been processed. */
const MAYBE_SENT = /* @__PURE__ */ new Set([
	"ECONNRESET",
	"EPIPE",
	"ETIMEDOUT",
	"UND_ERR_SOCKET",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT"
]);
function canRetry(error, method) {
	const cause = error?.cause;
	const code = typeof cause?.code === "string" ? cause.code : "";
	if (NOT_SENT.has(code)) return true;
	if (code === "ECONNRESET" && typeof cause?.message === "string" && cause.message.includes("before secure TLS connection")) return true;
	return (method === void 0 || method === "GET") && MAYBE_SENT.has(code);
}
var AccountApi = class {
	baseUrl;
	fetcher;
	constructor(baseUrl, fetcher = fetch) {
		this.baseUrl = baseUrl;
		this.fetcher = fetcher;
	}
	async request(path, options, signal) {
		for (let attempt = 0;; attempt += 1) try {
			return await this.attempt(path, options, signal);
		} catch (error) {
			signal?.throwIfAborted();
			const wait = RETRY_DELAYS_MS[attempt];
			if (wait === void 0 || !canRetry(error, options.method)) throw error;
			await setTimeout$1(wait, void 0, signal ? { signal } : {});
		}
	}
	async attempt(path, options, signal) {
		const timeout = AbortSignal.timeout(2e4);
		try {
			const response = await this.fetcher(`${this.baseUrl}/api/v2${path}`, {
				...options,
				redirect: "error",
				signal: signal ? AbortSignal.any([signal, timeout]) : timeout
			});
			if (!response.ok) throw new ApiError(response.status);
			return await response.json();
		} catch (error) {
			signal?.throwIfAborted();
			if (timeout.aborted) throw new Error("连接服务器超时，请检查地址和网络后重试。", { cause: error });
			throw error;
		}
	}
	async exchange(code, verifier, redirectUri, signal) {
		const token = await this.request("/oauth/token", {
			method: "POST",
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: OAUTH_CLIENT_ID,
				code,
				code_verifier: verifier,
				redirect_uri: redirectUri
			})
		}, signal);
		if (!token.access_token || !Number.isFinite(token.expires_in)) throw new Error("授权服务没有返回有效凭据。");
		return {
			...await this.me(token.access_token, signal),
			apiBaseUrl: this.baseUrl,
			accessToken: token.access_token,
			expiresAt: Date.now() + token.expires_in * 1e3
		};
	}
	async me(token, signal) {
		const user = await this.request("/auth/me", { headers: this.auth(token) }, signal);
		if (!user.userId) throw new Error("无法确认当前账号。");
		return publicProfile(user);
	}
	async device(token, id, signal) {
		const result = await this.request(`/connectors/${encodeURIComponent(id)}`, { headers: this.auth(token) }, signal);
		if (result.connector?.id !== id) throw new Error("设备响应无效。");
		return result.connector;
	}
	async devices(token, signal) {
		const result = await this.request("/connectors", { headers: this.auth(token) }, signal);
		if (!Array.isArray(result.connectors) || result.connectors.some((device) => !device || typeof device.id !== "string" || !device.id || typeof device.userId !== "string" || typeof device.name !== "string")) throw new Error("设备列表响应无效，请重试。");
		return result.connectors;
	}
	async register(token, name, installationId, signal) {
		const result = await this.request("/connectors", {
			method: "POST",
			headers: {
				...this.auth(token),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name,
				connectorKind: "cli",
				installationId
			})
		}, signal);
		if (!result.connector?.id || !result.connectorToken) throw new Error("设备注册没有返回有效凭据。");
		return result;
	}
	async verifyConnector(id, token, signal) {
		try {
			await this.request("/connector/auth", {
				method: "POST",
				headers: { Authorization: `Connector ${id}:${token}` }
			}, signal);
			return true;
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return false;
			throw error;
		}
	}
	async renewConnector(token, id, signal) {
		const result = await this.request(`/connectors/${encodeURIComponent(id)}/revoke`, {
			method: "POST",
			headers: this.auth(token)
		}, signal);
		if (result.connector?.id !== id || !result.connectorToken) throw new Error("无法恢复设备凭据。");
		return result.connectorToken;
	}
	createMobileQr(token, signal) {
		return this.request("/auth/mobile-login/qr", {
			method: "POST",
			headers: this.auth(token)
		}, signal);
	}
	mobileStatus(token, loginToken, signal) {
		return this.request("/auth/mobile-login/status", {
			method: "POST",
			headers: {
				...this.auth(token),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ loginToken })
		}, signal);
	}
	confirmMobile(token, loginToken, approved, signal) {
		return this.request("/auth/mobile-login/confirm", {
			method: "POST",
			headers: {
				...this.auth(token),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				loginToken,
				approved
			})
		}, signal);
	}
	auth(token) {
		return { Authorization: `Bearer ${token}` };
	}
};
// src/host/account/device-name.ts
const runFile$1 = promisify(execFile);
async function systemDeviceName() {
	if (process.platform === "darwin") try {
		const { stdout } = await runFile$1("/usr/sbin/scutil", ["--get", "ComputerName"], {
			encoding: "utf8",
			timeout: 1500,
			windowsHide: true
		});
		if (stdout.trim()) return stdout.trim();
	} catch {}
	if (process.platform === "win32") {
		const name = process.env["COMPUTERNAME"]?.trim();
		if (name) return name;
	}
	return hostname().trim().replace(/\.local$/i, "") || "本机设备";
}
// src/host/storage/files.ts
function hasCode(error, code) {
	return error instanceof Error && "code" in error && error.code === code;
}
async function readJson$1(path) {
	try {
		const text = await readFile(path, "utf8");
		try {
			return JSON.parse(text);
		} catch {
			throw new Error("本地状态文件格式无效，请检查插件数据目录。");
		}
	} catch (error) {
		if (hasCode(error, "ENOENT")) return null;
		throw error;
	}
}
/** The manager lock serializes writers; rename publishes a complete file. */
async function writeJson(path, value) {
	await mkdir(dirname(path), {
		recursive: true,
		mode: 448
	});
	const temporary = `${path}.${randomUUID()}.tmp`;
	const file = await open(temporary, "wx", 384);
	try {
		try {
			await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
			await file.sync();
		} finally {
			await file.close();
		}
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true });
	}
}
const LOCK_RECORD = ".manager-lock.json";
const LOCK_PROBE_TIMEOUT_MS = 1e3;
const LOCK_WATCH_INTERVAL_MS = 5e3;
const LOCK_PUBLISH_ATTEMPTS = 5;
const LOCK_UNREADABLE_GRACE_MS = 50;
const LOCK_UNREADABLE_RETRIES = 10;
/** Where the owner of a directory publishes its lease. */
function managerLockRecordPath(lockPath) {
	return join(dirname(lockPath), LOCK_RECORD);
}
var ManagerLockHeldError = class extends Error {
	code = "MANAGER_LOCK_HELD";
	pid;
	constructor(owner) {
		super(`另一个插件实例正在管理本机设备（进程 ${owner.pid}）。请关闭该实例后重试。`);
		this.name = "ManagerLockHeldError";
		this.pid = owner.pid;
	}
};
/**
* Ownership of a data directory. The owner listens on a loopback port the OS
* picked and publishes `{port, pid, token}` in the directory; a contender
* connects to that port and expects the token back. No port range is assumed,
* so an excluded or reserved range can never refuse the lock (#144, #164); the
* OS frees the port even after SIGKILL, so a dead owner's record is taken over
* once the probe fails, never on the strength of a pid alone.
*
* Two contenders taking over the same dead record can both publish within a
* few milliseconds of each other. The owner therefore re-reads its record
* periodically and reports `onCompromised` if it was replaced, which bounds
* that window to one interval.
*/
async function acquireManagerLock(path, onCompromised, options = {}) {
	await mkdir(dirname(path), {
		recursive: true,
		mode: 448
	});
	const record = managerLockRecordPath(path);
	const token = randomBytes(24).toString("base64url");
	const lease = createServer((socket) => {
		socket.on("error", () => socket.destroy());
		socket.end(`${token}\n`);
	});
	await new Promise((resolve, reject) => {
		lease.once("error", reject);
		lease.listen({
			host: "127.0.0.1",
			port: 0,
			exclusive: true
		}, () => {
			lease.off("error", reject);
			resolve();
		});
	});
	lease.unref();
	const closeLease = () => new Promise((resolve, reject) => lease.close((error) => error ? reject(error) : resolve()));
	const ours = {
		version: 1,
		port: lease.address().port,
		pid: process.pid,
		token,
		startedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	try {
		await publishLockRecord(record, ours);
	} catch (error) {
		await closeLease().catch(() => void 0);
		throw error;
	}
	let released = false;
	const lost = () => {
		if (!released) onCompromised?.();
	};
	lease.on("error", lost);
	lease.on("close", lost);
	const watch = setInterval(() => {
		readLockRecord(record).then((current) => {
			if (!released && current !== "unreadable" && current?.token !== token) lost();
		}, () => void 0);
	}, options.watchIntervalMs ?? LOCK_WATCH_INTERVAL_MS);
	watch.unref();
	return async () => {
		if (released) return;
		released = true;
		clearInterval(watch);
		if (lease.listening) await closeLease();
		const current = await readLockRecord(record).catch(() => null);
		if (current !== "unreadable" && current?.token === token) await rm(record, { force: true });
	};
}
async function publishLockRecord(record, ours) {
	for (let attempt = 1;; attempt++) {
		if (!await createLockRecord(record, ours)) {
			const current = await readLockRecordSettled(record);
			if (current !== null && current !== "unreadable" && current.token !== ours.token && await lockOwnerAlive(current)) throw new ManagerLockHeldError(current);
			await writeJson(record, ours);
		}
		const published = await readLockRecordSettled(record);
		if (published !== null && published !== "unreadable" && published.token === ours.token) return;
		if (published !== null && published !== "unreadable" && await lockOwnerAlive(published)) throw new ManagerLockHeldError(published);
		if (attempt >= LOCK_PUBLISH_ATTEMPTS) throw new Error("无法登记本机管理记录，请稍后重试。");
	}
}
/** Exclusive creation: the first writer wins outright. */
async function createLockRecord(record, ours) {
	let file;
	try {
		file = await open(record, "wx", 384);
	} catch (error) {
		if (hasCode(error, "EEXIST")) return false;
		throw error;
	}
	try {
		await file.writeFile(`${JSON.stringify(ours, null, 2)}\n`);
		await file.sync();
	} finally {
		await file.close();
	}
	return true;
}
async function readLockRecord(record) {
	let text;
	try {
		text = await readFile(record, "utf8");
	} catch (error) {
		if (hasCode(error, "ENOENT")) return null;
		throw error;
	}
	try {
		const value = JSON.parse(text);
		if (value && value.version === 1 && Number.isInteger(value.port) && value.port > 0 && value.port < 65536 && Number.isInteger(value.pid) && typeof value.token === "string" && value.token.length > 0) return value;
	} catch {}
	return "unreadable";
}
/** Like readLockRecord, but waits out a record that is still being written. */
async function readLockRecordSettled(record) {
	let current = await readLockRecord(record);
	for (let retry = 0; current === "unreadable" && retry < LOCK_UNREADABLE_RETRIES; retry++) {
		await setTimeout$1(LOCK_UNREADABLE_GRACE_MS);
		current = await readLockRecord(record);
	}
	return current;
}
/** Whether the process named by a record still holds its lease: it must answer with the record's token. */
function lockOwnerAlive(owner) {
	return new Promise((resolve) => {
		const socket = createConnection({
			host: "127.0.0.1",
			port: owner.port
		});
		let received = "";
		let settled = false;
		const done = (alive) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(alive);
		};
		socket.setEncoding("utf8");
		socket.setTimeout(LOCK_PROBE_TIMEOUT_MS, () => done(false));
		socket.on("data", (chunk) => {
			received += chunk;
			const newline = received.indexOf("\n");
			if (newline >= 0) done(received.slice(0, newline) === owner.token);
			else if (received.length > 512) done(false);
		});
		socket.on("end", () => done(received.trim() === owner.token));
		socket.on("error", () => done(false));
	});
}
// src/host/desktop/local-runtime.ts
const localRuntimePath = (home = userInfo().homedir) => {
	const dshHome = process.env["DSH_HOME"]?.trim() || path.join(home, ".dsh");
	return path.join(dshHome, "anywhere", "connector-runtime.json");
};
function object(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
function readJson(file) {
	try {
		const value = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
		if (!object(value)) throw new Error("Invalid local Connector record.");
		return value;
	} catch (error) {
		if (error.code === "ENOENT") return void 0;
		throw new Error("无法读取本机 Connector 记录，请检查文件格式与访问权限。", { cause: error });
	}
}
function ids(value) {
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) throw new Error("Invalid local Connector IDs.");
	return [...new Set(value.map((id) => id.trim()))];
}
function validateOwner(value) {
	if (!object(value) || !Number.isSafeInteger(value.pid) || Number(value.pid) <= 0 || typeof value.kind !== "string" || typeof value.instanceId !== "string" || !value.instanceId || typeof value.startedAt !== "string" || value.childPid !== void 0 && (!Number.isSafeInteger(value.childPid) || Number(value.childPid) <= 0) || [value.processStartedAt, value.childStartedAt].some((v) => v !== void 0 && typeof v !== "string")) throw new Error("Invalid local Connector owner.");
	return value;
}
function readLocalState(file) {
	const value = readJson(file);
	if (!value) return {
		version: 2,
		connectorIds: []
	};
	if (value.version === void 0 && Number.isSafeInteger(value.pid) && typeof value.kind === "string") {
		const runtime = validateOwner({
			...value,
			instanceId: `legacy-${value.pid}`,
			startedAt: value.startedAt ?? ""
		});
		return {
			version: 2,
			connectorIds: typeof value.connectorId === "string" && value.connectorId ? [value.connectorId] : [],
			runtime
		};
	}
	if (value.version !== 2) throw new Error("Unsupported local Connector record version.");
	if (value.runtime !== void 0) validateOwner(value.runtime);
	return {
		...value,
		version: 2,
		connectorIds: ids(value.connectorIds)
	};
}
/** Standalone plugin reads only its isolated runtime file; never fall back to ~/.agentsanywhere. */
function readMachineStateFile(file) {
	return readLocalState(file);
}
// src/host/desktop/machine-state.ts
const machineStatePath = localRuntimePath;
function localMachineRegistry(home = userInfo().homedir) {
	return { readConnectorIds: () => readLocalConnectorIds(home) };
}
async function readLocalConnectorIds(home = userInfo().homedir) {
	return readMachineStateFile(machineStatePath(home)).connectorIds;
}
// src/host/account/binding.ts
var DeviceRecoveryRequired = class extends Error {
	connectorId;
	reason;
	constructor(connectorId, reason) {
		super(reason === "deleted" ? "本机设备已被删除，请重新配置以恢复连接。" : "本机设备已断开连接，是否重新连接？");
		this.connectorId = connectorId;
		this.reason = reason;
	}
};
function bindingPath(root, account) {
	const key = createHash("sha256").update(`${account.apiBaseUrl}\n${account.userId}`).digest("hex");
	return join(root, "bindings", `${key}.json`);
}
/** Loading an identity for display never renews credentials or contacts the server. */
async function readBoundDevice(root, account) {
	const binding = await readJson$1(bindingPath(root, account));
	return binding?.connectorId && binding.connectorToken ? binding : null;
}
/** Process maintenance stays on the existing device, independent of the shared discovery order. */
async function verifyBoundDevice(binding, account, api, signal) {
	let device;
	try {
		device = await api.device(account.accessToken, binding.connectorId, signal);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) throw new DeviceRecoveryRequired(binding.connectorId, "deleted");
		throw error;
	}
	signal.throwIfAborted();
	if (device.userId !== account.userId) throw new Error("设备归属与当前账号不一致。");
	if (!await api.verifyConnector(binding.connectorId, binding.connectorToken, signal)) throw new DeviceRecoveryRequired(binding.connectorId, "disconnected");
	return {
		...binding,
		name: device.name
	};
}
async function ensureBinding(root, account, api, signal, options = {}) {
	const path = bindingPath(root, account);
	let binding = await readJson$1(path);
	const localIds = await (options.machineState ?? localMachineRegistry()).readConnectorIds();
	const candidates = [.../* @__PURE__ */ new Set([...localIds, ...binding?.connectorId ? [binding.connectorId] : []])];
	const devices = await api.devices(account.accessToken, signal);
	signal.throwIfAborted();
	const owned = new Map(devices.filter((device) => device.userId === account.userId).map((device) => [device.id, device]));
	if (binding?.replacesConnectorId) {
		if (!options.renew) throw new DeviceRecoveryRequired(binding.replacesConnectorId, "deleted");
		binding = {
			installationId: randomUUID(),
			name: binding.name,
			replacesConnectorId: binding.replacesConnectorId
		};
	} else if (binding?.connectorId && !owned.has(binding.connectorId)) {
		if (!options.renew) throw new DeviceRecoveryRequired(binding.connectorId, "deleted");
		binding = {
			installationId: randomUUID(),
			name: binding.name,
			replacesConnectorId: binding.connectorId
		};
	}
	let verified = false;
	if (binding?.connectorId) {
		verified = Boolean(binding.connectorToken && await api.verifyConnector(binding.connectorId, binding.connectorToken, signal));
		if (!verified) throw new DeviceRecoveryRequired(binding.connectorId, "disconnected");
	}
	const matchedId = !options.renew && binding?.connectorId ? binding.connectorId : candidates.find((id) => owned.has(id));
	if (matchedId) {
		const device = owned.get(matchedId);
		const cached = binding?.connectorId === matchedId ? binding : null;
		const connectorToken = cached?.connectorToken && verified ? cached.connectorToken : await api.renewConnector(account.accessToken, matchedId, signal);
		signal.throwIfAborted();
		const complete = {
			installationId: cached?.installationId ?? randomUUID(),
			name: device.name,
			connectorId: matchedId,
			connectorToken
		};
		await writeJson(path, complete);
		return complete;
	}
	binding ??= {
		installationId: randomUUID(),
		name: await systemDeviceName()
	};
	return registerBinding(path, binding, account, api, signal);
}
/** Explicit recovery always targets this binding, never another shared Desktop ID. */
async function recoverBinding(root, account, api, signal, id, action) {
	const path = bindingPath(root, account);
	const binding = await readJson$1(path);
	if (!binding || binding.connectorId !== id && binding.replacesConnectorId !== id) throw new Error("本机设备记录已变化，请重新打开插件。");
	let device;
	try {
		device = await api.device(account.accessToken, id, signal);
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 404) throw error;
	}
	signal.throwIfAborted();
	if (device && device.userId !== account.userId) throw new Error("设备归属与当前账号不一致。");
	if (action === "reconnect") {
		if (!device) throw new DeviceRecoveryRequired(id, "deleted");
		let connectorToken;
		try {
			connectorToken = binding.connectorToken && await api.verifyConnector(id, binding.connectorToken, signal) ? binding.connectorToken : await api.renewConnector(account.accessToken, id, signal);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) throw new DeviceRecoveryRequired(id, "deleted");
			throw error;
		}
		const complete = {
			installationId: binding.installationId,
			name: device.name,
			connectorId: id,
			connectorToken
		};
		await writeJson(path, complete);
		signal.throwIfAborted();
		return complete;
	}
	if (device) throw new DeviceRecoveryRequired(id, "disconnected");
	return registerBinding(path, binding.replacesConnectorId === id ? binding : {
		installationId: randomUUID(),
		name: await systemDeviceName(),
		replacesConnectorId: id
	}, account, api, signal);
}
async function registerBinding(path, binding, account, api, signal) {
	await writeJson(path, binding);
	signal.throwIfAborted();
	let created;
	try {
		created = await api.register(account.accessToken, binding.name, binding.installationId, signal);
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 409) throw error;
		binding = {
			...binding,
			installationId: randomUUID()
		};
		await writeJson(path, binding);
		signal.throwIfAborted();
		created = await api.register(account.accessToken, binding.name, binding.installationId, signal);
	}
	if (created.connector.userId !== account.userId) throw new Error("注册设备的账号不一致。");
	const complete = {
		installationId: binding.installationId,
		name: binding.name,
		connectorId: created.connector.id,
		connectorToken: created.connectorToken
	};
	await writeJson(path, complete);
	return complete;
}
// src/host/meshcall-guard.ts
const GUARDED = Symbol.for("agents-anywhere.meshcall.call-result-guard");
/**
* meshcall 0.3.0 creates a unary or client-stream call's result promise before
* it writes the call.open frame, and awaits that promise only once the write
* completes. A write waits for the socket, so a busy Connector can hold it for
* seconds. If the caller's signal aborts (SyncFeed.close) or the local deadline
* fires (`timeoutMs`) in that window, the result rejects while nobody holds it.
* Node reports an unhandled rejection, and DSH's fail-loud exits the whole Host
* (#499, #517), although the call site would have received and handled it.
*
* Marking the promise handled at registration closes the window: the call site
* still awaits the same promise and receives the same error. Idempotent; a
* meshcall without this method needs no guard.
*/
function guardMeshCallResults() {
	const prototype = MeshCallClient.prototype;
	const registerCall = prototype.registerCall;
	if (prototype[GUARDED] || typeof registerCall !== "function") return;
	prototype.registerCall = function(...args) {
		const registered = registerCall.apply(this, args);
		registered?.result?.catch(() => void 0);
		return registered;
	};
	prototype[GUARDED] = true;
}
// src/contracts/connector.ts
const DEFAULT_CONNECTOR_SETTINGS = {
	uvPath: "",
	uvPypiIndexUrl: "",
	uvPythonInstallMirror: "",
	connectorProxy: "",
	syncIntervalSeconds: 30
};
const PYTHON_MIRRORS = [{
	id: "default",
	label: "官方源",
	url: ""
}, {
	id: "npmmirror",
	label: "npmmirror",
	url: "https://registry.npmmirror.com/-/binary/python-build-standalone"
}];
const PYPI_MIRRORS = [
	{
		id: "default",
		label: "默认 PyPI",
		url: ""
	},
	{
		id: "tsinghua",
		label: "清华大学",
		url: "https://pypi.tuna.tsinghua.edu.cn/simple"
	},
	{
		id: "ustc",
		label: "中国科学技术大学",
		url: "https://mirrors.ustc.edu.cn/pypi/simple"
	},
	{
		id: "bfsu",
		label: "北京外国语大学",
		url: "https://mirrors.bfsu.edu.cn/pypi/web/simple"
	},
	{
		id: "aliyun",
		label: "阿里云",
		url: "https://mirrors.aliyun.com/pypi/simple"
	},
	{
		id: "tencent",
		label: "腾讯云",
		url: "https://mirrors.cloud.tencent.com/pypi/simple"
	},
	{
		id: "huawei",
		label: "华为云",
		url: "https://repo.huaweicloud.com/repository/pypi/simple"
	}
];
// src/host/generated/connector-control.ts
const ConnectorStateSchema = {
	"$defs": { "DeviceSettings": {
		"description": "User-chosen device settings the server handed over (docs/api/device-settings.md).",
		"properties": { "confirmQuitOnShutdown": {
			"default": false,
			"title": "Confirmquitonshutdown",
			"type": "boolean"
		} },
		"title": "DeviceSettings",
		"type": "object"
	} },
	"properties": {
		"status": {
			"enum": [
				"running",
				"expired credential",
				"error",
				"stopped"
			],
			"title": "Status",
			"type": "string"
		},
		"running": {
			"title": "Running",
			"type": "boolean"
		},
		"pairing": {
			"title": "Pairing",
			"type": "boolean"
		},
		"authFailed": {
			"title": "Authfailed",
			"type": "boolean"
		},
		"lastError": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Lasterror"
		},
		"configPath": {
			"title": "Configpath",
			"type": "string"
		},
		"runtimePath": {
			"title": "Runtimepath",
			"type": "string"
		},
		"hasConfig": {
			"title": "Hasconfig",
			"type": "boolean"
		},
		"deviceSettings": {
			"anyOf": [{ "$ref": "#/$defs/DeviceSettings" }, { "type": "null" }],
			"default": null
		}
	},
	"required": [
		"status",
		"running",
		"pairing",
		"authFailed",
		"configPath",
		"runtimePath",
		"hasConfig"
	],
	"title": "ConnectorState",
	"type": "object"
};
const ConnectorPathsSchema = {
	"properties": {
		"configPath": {
			"title": "Configpath",
			"type": "string"
		},
		"configDir": {
			"title": "Configdir",
			"type": "string"
		},
		"runtimePath": {
			"title": "Runtimepath",
			"type": "string"
		}
	},
	"required": [
		"configPath",
		"configDir",
		"runtimePath"
	],
	"title": "ConnectorPaths",
	"type": "object"
};
const ConnectorSettingsSchema = {
	"properties": {
		"serverUrl": {
			"default": "",
			"title": "Serverurl",
			"type": "string"
		},
		"connectorId": {
			"default": "",
			"title": "Connectorid",
			"type": "string"
		},
		"connectorToken": {
			"default": "",
			"title": "Connectortoken",
			"type": "string"
		},
		"heartbeatSeconds": {
			"default": 20,
			"title": "Heartbeatseconds",
			"type": "number"
		},
		"reconnectSeconds": {
			"default": 3,
			"title": "Reconnectseconds",
			"type": "number"
		},
		"syncExistingOnConnect": {
			"default": true,
			"title": "Syncexistingonconnect",
			"type": "boolean"
		},
		"syncIntervalSeconds": {
			"default": 30,
			"title": "Syncintervalseconds",
			"type": "number"
		},
		"statePath": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Statepath"
		}
	},
	"title": "ConnectorSettings",
	"type": "object"
};
const PairingStatusSchema = {
	"$defs": { "ConnectorSettings": {
		"properties": {
			"serverUrl": {
				"default": "",
				"title": "Serverurl",
				"type": "string"
			},
			"connectorId": {
				"default": "",
				"title": "Connectorid",
				"type": "string"
			},
			"connectorToken": {
				"default": "",
				"title": "Connectortoken",
				"type": "string"
			},
			"heartbeatSeconds": {
				"default": 20,
				"title": "Heartbeatseconds",
				"type": "number"
			},
			"reconnectSeconds": {
				"default": 3,
				"title": "Reconnectseconds",
				"type": "number"
			},
			"syncExistingOnConnect": {
				"default": true,
				"title": "Syncexistingonconnect",
				"type": "boolean"
			},
			"syncIntervalSeconds": {
				"default": 30,
				"title": "Syncintervalseconds",
				"type": "number"
			},
			"statePath": {
				"anyOf": [{ "type": "string" }, { "type": "null" }],
				"default": null,
				"title": "Statepath"
			}
		},
		"title": "ConnectorSettings",
		"type": "object"
	} },
	"properties": {
		"status": {
			"enum": [
				"starting",
				"waiting",
				"claimed",
				"expired",
				"consumed",
				"cancelled",
				"error"
			],
			"title": "Status",
			"type": "string"
		},
		"serverUrl": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Serverurl"
		},
		"pairingId": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Pairingid"
		},
		"code": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Code"
		},
		"config": {
			"anyOf": [{ "$ref": "#/$defs/ConnectorSettings" }, { "type": "null" }],
			"default": null
		},
		"error": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Error"
		}
	},
	"required": ["status"],
	"title": "PairingStatus",
	"type": "object"
};
const ControlEventSchema = {
	"$defs": {
		"ConnectorSettings": {
			"properties": {
				"serverUrl": {
					"default": "",
					"title": "Serverurl",
					"type": "string"
				},
				"connectorId": {
					"default": "",
					"title": "Connectorid",
					"type": "string"
				},
				"connectorToken": {
					"default": "",
					"title": "Connectortoken",
					"type": "string"
				},
				"heartbeatSeconds": {
					"default": 20,
					"title": "Heartbeatseconds",
					"type": "number"
				},
				"reconnectSeconds": {
					"default": 3,
					"title": "Reconnectseconds",
					"type": "number"
				},
				"syncExistingOnConnect": {
					"default": true,
					"title": "Syncexistingonconnect",
					"type": "boolean"
				},
				"syncIntervalSeconds": {
					"default": 30,
					"title": "Syncintervalseconds",
					"type": "number"
				},
				"statePath": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Statepath"
				}
			},
			"title": "ConnectorSettings",
			"type": "object"
		},
		"ConnectorState": {
			"properties": {
				"status": {
					"enum": [
						"running",
						"expired credential",
						"error",
						"stopped"
					],
					"title": "Status",
					"type": "string"
				},
				"running": {
					"title": "Running",
					"type": "boolean"
				},
				"pairing": {
					"title": "Pairing",
					"type": "boolean"
				},
				"authFailed": {
					"title": "Authfailed",
					"type": "boolean"
				},
				"lastError": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Lasterror"
				},
				"configPath": {
					"title": "Configpath",
					"type": "string"
				},
				"runtimePath": {
					"title": "Runtimepath",
					"type": "string"
				},
				"hasConfig": {
					"title": "Hasconfig",
					"type": "boolean"
				},
				"deviceSettings": {
					"anyOf": [{ "$ref": "#/$defs/DeviceSettings" }, { "type": "null" }],
					"default": null
				}
			},
			"required": [
				"status",
				"running",
				"pairing",
				"authFailed",
				"configPath",
				"runtimePath",
				"hasConfig"
			],
			"title": "ConnectorState",
			"type": "object"
		},
		"DeviceSettings": {
			"description": "User-chosen device settings the server handed over (docs/api/device-settings.md).",
			"properties": { "confirmQuitOnShutdown": {
				"default": false,
				"title": "Confirmquitonshutdown",
				"type": "boolean"
			} },
			"title": "DeviceSettings",
			"type": "object"
		},
		"PairingStatus": {
			"properties": {
				"status": {
					"enum": [
						"starting",
						"waiting",
						"claimed",
						"expired",
						"consumed",
						"cancelled",
						"error"
					],
					"title": "Status",
					"type": "string"
				},
				"serverUrl": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Serverurl"
				},
				"pairingId": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Pairingid"
				},
				"code": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Code"
				},
				"config": {
					"anyOf": [{ "$ref": "#/$defs/ConnectorSettings" }, { "type": "null" }],
					"default": null
				},
				"error": {
					"anyOf": [{ "type": "string" }, { "type": "null" }],
					"default": null,
					"title": "Error"
				}
			},
			"required": ["status"],
			"title": "PairingStatus",
			"type": "object"
		}
	},
	"description": "One change, in order: ``seq`` grows by one per event of this process.",
	"properties": {
		"seq": {
			"title": "Seq",
			"type": "integer"
		},
		"kind": {
			"enum": ["state", "pairing"],
			"title": "Kind",
			"type": "string"
		},
		"state": {
			"anyOf": [{ "$ref": "#/$defs/ConnectorState" }, { "type": "null" }],
			"default": null
		},
		"pairing": {
			"anyOf": [{ "$ref": "#/$defs/PairingStatus" }, { "type": "null" }],
			"default": null
		}
	},
	"required": ["seq", "kind"],
	"title": "ControlEvent",
	"type": "object"
};
/**
* Configure, start and stop this Connector, and follow its state.
*/
var ControlServiceClient = class ControlServiceClient {
	rpc;
	constructor(rpc) {
		this.rpc = rpc;
	}
	withOptions(options) {
		return new ControlServiceClient(this.rpc.withOptions(options));
	}
	/**
	* The runtime's status and the last error it reported.
	*/
	getState(options) {
		return this.rpc.unary("aa.local.v2.Control", "getState", {}, {
			idempotent: true,
			...options,
			responseSchema: ConnectorStateSchema
		});
	}
	/**
	* Where this Connector keeps its configuration and the machine runtime record.
	*/
	getPaths(options) {
		return this.rpc.unary("aa.local.v2.Control", "getPaths", {}, {
			idempotent: true,
			...options,
			responseSchema: ConnectorPathsSchema
		});
	}
	/**
	* Reserve the machine for this Connector; fails with connector_already_running.
	*/
	acquireOwnership(options) {
		return this.rpc.unary("aa.local.v2.Control", "acquireOwnership", {}, {
			...options,
			responseSchema: ConnectorStateSchema
		});
	}
	/**
	* The saved configuration, or the defaults when none is saved.
	*/
	getConfig(options) {
		return this.rpc.unary("aa.local.v2.Control", "getConfig", {}, {
			idempotent: true,
			...options,
			responseSchema: ConnectorSettingsSchema
		});
	}
	/**
	* Validate and save the configuration; claims the machine first.
	*/
	saveConfig(config, options) {
		return this.rpc.unary("aa.local.v2.Control", "saveConfig", { config }, {
			...options,
			responseSchema: ConnectorSettingsSchema
		});
	}
	/**
	* Start the runtime with the given or the saved configuration.
	*/
	start(config = null, options) {
		return this.rpc.unary("aa.local.v2.Control", "start", { config }, {
			...options,
			responseSchema: ConnectorStateSchema
		});
	}
	/**
	* Stop the runtime; the machine stays reserved for this process.
	*/
	stop(options) {
		return this.rpc.unary("aa.local.v2.Control", "stop", {}, {
			...options,
			responseSchema: ConnectorStateSchema
		});
	}
	/**
	* Stop, then start with the given or the saved configuration.
	*/
	restart(config = null, options) {
		return this.rpc.unary("aa.local.v2.Control", "restart", { config }, {
			...options,
			responseSchema: ConnectorStateSchema
		});
	}
	/**
	* Start a pairing against server; progress arrives as pairing events.
	*/
	startPairing(server = null, resolveTimeout = 10, timeout = 600, pollInterval = 2, options) {
		return this.rpc.unary("aa.local.v2.Control", "startPairing", {
			server,
			resolveTimeout,
			timeout,
			pollInterval
		}, {
			...options,
			responseSchema: PairingStatusSchema
		});
	}
	/**
	* Cancel the pairing in progress, if any.
	*/
	cancelPairing(options) {
		return this.rpc.unary("aa.local.v2.Control", "cancelPairing", {}, {
			...options,
			responseSchema: PairingStatusSchema
		});
	}
	/**
	* State and pairing events after since; read getState for the current state.
	*/
	events(since = null, options) {
		return this.rpc.serverStream("aa.local.v2.Control", "events", { since }, {
			idempotent: true,
			...options,
			itemSchema: ControlEventSchema
		});
	}
};
// src/host/generated/connector-logs.ts
const LogReceiptSchema = {
	"properties": { "accepted": {
		"title": "Accepted",
		"type": "integer"
	} },
	"required": ["accepted"],
	"title": "LogReceipt",
	"type": "object"
};
const LogPageSchema = {
	"$defs": { "LogEntry": {
		"properties": {
			"time": {
				"maxLength": 80,
				"title": "Time",
				"type": "string"
			},
			"level": {
				"maxLength": 20,
				"title": "Level",
				"type": "string"
			},
			"name": {
				"maxLength": 200,
				"title": "Name",
				"type": "string"
			},
			"message": {
				"maxLength": 16e3,
				"title": "Message",
				"type": "string"
			},
			"exception": {
				"anyOf": [{
					"maxLength": 16e3,
					"type": "string"
				}, { "type": "null" }],
				"default": null,
				"title": "Exception"
			},
			"details": {
				"anyOf": [{
					"maxLength": 16e3,
					"type": "string"
				}, { "type": "null" }],
				"default": null,
				"title": "Details"
			},
			"seq": {
				"title": "Seq",
				"type": "integer"
			},
			"source": {
				"default": "connector",
				"enum": ["connector", "bridge"],
				"title": "Source",
				"type": "string"
			},
			"gapBefore": {
				"default": false,
				"title": "Gapbefore",
				"type": "boolean"
			}
		},
		"required": [
			"time",
			"level",
			"name",
			"message",
			"seq"
		],
		"title": "LogEntry",
		"type": "object"
	} },
	"properties": {
		"items": {
			"items": { "$ref": "#/$defs/LogEntry" },
			"title": "Items",
			"type": "array"
		},
		"firstSeq": {
			"anyOf": [{ "type": "integer" }, { "type": "null" }],
			"title": "Firstseq"
		},
		"lastSeq": {
			"anyOf": [{ "type": "integer" }, { "type": "null" }],
			"title": "Lastseq"
		},
		"total": {
			"title": "Total",
			"type": "integer"
		},
		"hasMoreBefore": {
			"title": "Hasmorebefore",
			"type": "boolean"
		},
		"hasMoreAfter": {
			"title": "Hasmoreafter",
			"type": "boolean"
		}
	},
	"required": [
		"items",
		"firstSeq",
		"lastSeq",
		"total",
		"hasMoreBefore",
		"hasMoreAfter"
	],
	"title": "LogPage",
	"type": "object"
};
const LogEntrySchema = {
	"properties": {
		"time": {
			"maxLength": 80,
			"title": "Time",
			"type": "string"
		},
		"level": {
			"maxLength": 20,
			"title": "Level",
			"type": "string"
		},
		"name": {
			"maxLength": 200,
			"title": "Name",
			"type": "string"
		},
		"message": {
			"maxLength": 16e3,
			"title": "Message",
			"type": "string"
		},
		"exception": {
			"anyOf": [{
				"maxLength": 16e3,
				"type": "string"
			}, { "type": "null" }],
			"default": null,
			"title": "Exception"
		},
		"details": {
			"anyOf": [{
				"maxLength": 16e3,
				"type": "string"
			}, { "type": "null" }],
			"default": null,
			"title": "Details"
		},
		"seq": {
			"title": "Seq",
			"type": "integer"
		},
		"source": {
			"default": "connector",
			"enum": ["connector", "bridge"],
			"title": "Source",
			"type": "string"
		},
		"gapBefore": {
			"default": false,
			"title": "Gapbefore",
			"type": "boolean"
		}
	},
	"required": [
		"time",
		"level",
		"name",
		"message",
		"seq"
	],
	"title": "LogEntry",
	"type": "object"
};
/**
* Write, read and follow Connector-owned persistent runtime logs.
*/
var LogsServiceClient = class LogsServiceClient {
	rpc;
	constructor(rpc) {
		this.rpc = rpc;
	}
	withOptions(options) {
		return new LogsServiceClient(this.rpc.withOptions(options));
	}
	/**
	* Commit a Bridge batch; stable producer/eventId pairs deduplicate retries.
	*/
	write(entries, options) {
		return this.rpc.unary("aa.local.v2.Logs", "write", { entries }, {
			...options,
			responseSchema: LogReceiptSchema
		});
	}
	/**
	* Read a bounded page of persisted runtime records.
	*/
	read(source = null, beforeSeq = null, afterSeq = null, limit = 200, options) {
		return this.rpc.unary("aa.local.v2.Logs", "read", {
			source,
			beforeSeq,
			afterSeq,
			limit
		}, {
			idempotent: true,
			...options,
			responseSchema: LogPageSchema
		});
	}
	/**
	* Clear runtime records without resetting their sequence; host only.
	*/
	clear(options) {
		return this.rpc.unary("aa.local.v2.Logs", "clear", {}, {
			...options,
			responseSchema: LogPageSchema
		});
	}
	/**
	* Replay persisted history then follow new records, marking retention gaps.
	*/
	tail(since = null, source = null, options) {
		return this.rpc.serverStream("aa.local.v2.Logs", "tail", {
			since,
			source
		}, {
			idempotent: true,
			...options,
			itemSchema: LogEntrySchema
		});
	}
};
// src/host/dsh-runtime/log-reader.ts
function resolveEntrySource(entry) {
	const rawSource = entry.source;
	if (rawSource === "plugin" || entry.name === "dsh-plugin" || entry.name.startsWith("dsh-plugin.") || entry.name === "yundashi-remote-control" || entry.name.startsWith("yundashi-remote-control.")) return "plugin";
	if (rawSource === "connector") return "connector";
	if (rawSource === "bridge" || entry.name === "dsh-bridge" || entry.name.startsWith("dsh-bridge.")) return "bridge";
	return "connector";
}
function parseStructuredEntry(entry) {
	const event = entry.message;
	const eventName = event.match(/^[A-Za-z][\w.-]*/)?.[0] ?? event;
	let parsed;
	if (entry.details) try {
		parsed = record(JSON.parse(entry.details));
	} catch {}
	const tail = event.slice(eventName.length).trim();
	if (tail.startsWith("{")) try {
		parsed = {
			...parsed ?? {},
			...record(JSON.parse(tail))
		};
	} catch {}
	const rawLevel = entry.level.toLowerCase();
	const level = rawLevel === "warning" || rawLevel === "warn" ? "warn" : rawLevel === "error" || rawLevel === "critical" ? "error" : rawLevel === "debug" || rawLevel === "trace" ? "debug" : "info";
	return {
		level,
		method: typeof parsed?.method === "string" ? parsed.method : eventName.replace(/\.(started|completed|failed)$/, ""),
		outcome: level === "error" || eventName.endsWith(".failed") || eventName.endsWith("_failed") || eventName === "rpc.rejected" ? "failure" : eventName.endsWith(".started") ? "pending" : eventName.endsWith(".completed") || eventName === "bridge.listening" || eventName === "bridge.connected" ? "success" : "info",
		details: parsed && Object.keys(parsed).length > 0 ? JSON.stringify(parsed, null, 2) : entry.details && entry.details !== "{}" ? entry.details : null
	};
}
/** Adapt the central service to the existing plugin UI contract. No local file reads. */
function readBridgeLogs(page) {
	return {
		entries: page.items.map((entry) => {
			const parsed = parseStructuredEntry(entry);
			return {
				id: String(entry.seq),
				time: entry.time,
				method: parsed.method,
				outcome: parsed.outcome,
				level: parsed.level,
				event: entry.message,
				details: parsed.details ?? "{}"
			};
		}),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function toRuntimeLogPage(page, available = true, logsPath = null) {
	return {
		available,
		items: page.items.map((entry) => {
			const parsed = parseStructuredEntry(entry);
			return {
				seq: entry.seq,
				time: entry.time,
				source: resolveEntrySource(entry),
				level: parsed.level,
				name: entry.name,
				message: entry.message,
				details: parsed.details,
				exception: entry.exception ?? null,
				method: parsed.method,
				outcome: parsed.outcome
			};
		}),
		firstSeq: page.firstSeq ?? null,
		lastSeq: page.lastSeq ?? null,
		total: page.total,
		hasMoreBefore: page.hasMoreBefore,
		hasMoreAfter: page.hasMoreAfter,
		logsPath,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function validateRuntimeLogQuery(query) {
	return {
		source: query?.source === "plugin" || query?.source === "bridge" || query?.source === "connector" ? query.source : null,
		beforeSeq: typeof query?.beforeSeq === "number" && Number.isSafeInteger(query.beforeSeq) && query.beforeSeq > 0 ? query.beforeSeq : null,
		afterSeq: typeof query?.afterSeq === "number" && Number.isSafeInteger(query.afterSeq) && query.afterSeq >= 0 ? query.afterSeq : null,
		limit: typeof query?.limit === "number" && Number.isSafeInteger(query.limit) ? Math.max(1, Math.min(500, query.limit)) : 200
	};
}
async function readRuntimeLogPage(client, query, logsPath = null) {
	const normalized = validateRuntimeLogQuery(query);
	if (normalized.source === null || normalized.source === "connector") return toRuntimeLogPage(await client.read(normalized.source, normalized.beforeSeq, normalized.afterSeq, normalized.limit, { timeoutMs: 3e3 }), true, logsPath);
	const collected = [];
	const forward = normalized.afterSeq !== null;
	let beforeSeq = forward ? null : normalized.beforeSeq;
	let afterSeq = forward ? normalized.afterSeq : null;
	let hasMoreBefore = false;
	let hasMoreAfter = false;
	let rawFirstSeq = null;
	let rawLastSeq = null;
	for (let step = 0; step < 5; step++) {
		const page = await client.read("bridge", beforeSeq, afterSeq, normalized.limit, { timeoutMs: 3e3 });
		const matching = toRuntimeLogPage(page, true, logsPath).items.filter((item) => item.source === normalized.source);
		if (step === 0) {
			hasMoreBefore = page.hasMoreBefore;
			hasMoreAfter = page.hasMoreAfter;
			rawFirstSeq = page.firstSeq ?? null;
			rawLastSeq = page.lastSeq ?? null;
		}
		if (forward) {
			collected.push(...matching);
			hasMoreAfter = page.hasMoreAfter;
			rawLastSeq = page.lastSeq ?? rawLastSeq;
			if (collected.length >= normalized.limit || !page.hasMoreAfter || page.lastSeq === null) break;
			afterSeq = page.lastSeq;
		} else {
			collected.unshift(...matching);
			hasMoreBefore = page.hasMoreBefore;
			rawFirstSeq = page.firstSeq ?? rawFirstSeq;
			if (collected.length >= normalized.limit || !page.hasMoreBefore || page.firstSeq === null) break;
			beforeSeq = page.firstSeq;
		}
	}
	let items = collected;
	if (items.length > normalized.limit) {
		if (forward) {
			items = items.slice(0, normalized.limit);
			hasMoreAfter = true;
		} else {
			items = items.slice(items.length - normalized.limit);
			hasMoreBefore = true;
		}
	}
	return {
		available: true,
		items,
		firstSeq: items[0]?.seq ?? rawFirstSeq,
		lastSeq: items[items.length - 1]?.seq ?? rawLastSeq,
		total: items.length,
		hasMoreBefore,
		hasMoreAfter,
		logsPath,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function readConnectorRuntimeLogs(page) {
	return {
		entries: page.items.map((entry) => ({
			id: entry.seq,
			time: entry.time,
			text: `${entry.level} | ${entry.name} | ${entry.message}${entry.exception ? "\n" + entry.exception : ""}`
		})),
		hasMore: page.hasMoreBefore,
		oldestId: page.firstSeq ?? null,
		newestId: page.lastSeq ?? null
	};
}
// src/host/connector/environment.ts
/** Host-side locale detection also works before a Client connects or in headless mode. */
async function systemLanguages() {
	const languages = [Intl.DateTimeFormat().resolvedOptions().locale];
	const locale = process.env["LC_ALL"] || process.env["LC_MESSAGES"] || process.env["LANG"];
	if (locale) languages.push(locale);
	languages.push(...(process.env["LANGUAGE"] ?? "").split(":").filter(Boolean));
	if (process.platform === "darwin") try {
		const { stdout } = await promisify(execFile)("/usr/bin/defaults", [
			"read",
			"-g",
			"AppleLanguages"
		], {
			encoding: "utf8",
			timeout: 1500,
			windowsHide: true
		});
		languages.push(...stdout.match(/[a-z]{2,3}(?:[-_][a-z0-9]+)*/gi) ?? []);
	} catch {}
	return languages;
}
const PYPI_SIMPLE = "https://pypi.org/simple";
/**
* The chosen PyPI mirror is uv's first index and the official PyPI its
* fallback: uv takes each package from the first index that has it, so a
* mirror that filters large wheels (TUNA, USTC and BFSU carry no
* openai-codex) still installs. Every index is set explicitly, because the
* bundled project and the inherited environment may declare others; an
* inherited `UV_INDEX` is dropped when no mirror is chosen. Desktop applies
* the same rule (desktop-workbench/electron/connector-supervisor.ts).
*/
function withPackageIndexes(environment, pypiIndexUrl) {
	const mirror = pypiIndexUrl.trim().replace(/\/+$/, "");
	const { UV_INDEX: _inherited, ...rest } = environment;
	return {
		...rest,
		UV_DEFAULT_INDEX: PYPI_SIMPLE,
		UV_INDEX_URL: PYPI_SIMPLE,
		...mirror && mirror !== PYPI_SIMPLE ? { UV_INDEX: mirror } : {},
		PIP_INDEX_URL: mirror || PYPI_SIMPLE
	};
}
/**
* Some package managers unpack the bundled uv without its executable bit. Restore
* it in place, or use a private copy when the install directory is read-only.
*/
async function ensureExecutable(file, fallbackDirectory, setMode = chmod) {
	try {
		await access(file, constants.X_OK);
		return file;
	} catch {
		await access(file, constants.F_OK);
	}
	try {
		await setMode(file, 493);
		await access(file, constants.X_OK);
		return file;
	} catch {}
	const target = join(fallbackDirectory, basename(file));
	await mkdir(fallbackDirectory, { recursive: true });
	const partial = `${target}.${process.pid}`;
	await copyFile(file, partial);
	await chmod(partial, 493);
	await rename(partial, target);
	return target;
}
async function resolveUv(config, settings) {
	const command = settings.uvPath || config.uvPath;
	if (!settings.uvPath && config.uvPath === "uv") try {
		const provider = createRequire(import.meta.url).resolve("@dataiku/uv/package.json");
		const binaryPackage = createRequire(provider).resolve(`@dataiku/uv-${process.platform}-${process.arch}/package.json`);
		return await ensureExecutable(join(dirname(binaryPackage), "bin", process.platform === "win32" ? "uv.exe" : "uv"), join(config.stateRoot, "bin"));
	} catch {}
	const home = userInfo().homedir;
	const paths = [
		...(process.env["PATH"] ?? process.env["Path"] ?? "").split(delimiter).filter(Boolean),
		join(home, ".local", "bin"),
		join(home, ".cargo", "bin"),
		...process.platform === "darwin" ? ["/opt/homebrew/bin", "/usr/local/bin"] : []
	];
	const names = process.platform === "win32" && !command.endsWith(".exe") ? [command, `${command}.exe`] : [command];
	const candidates = isAbsolute(command) ? [command] : paths.flatMap((path) => names.map((name) => join(path, name)));
	for (const candidate of new Set(candidates)) try {
		await access(candidate, constants.X_OK);
		return candidate;
	} catch {}
	return null;
}
function canOpenFolders() {
	return process.platform === "darwin" || process.platform === "win32" || Boolean(process.env["DISPLAY"] || process.env["WAYLAND_DISPLAY"]);
}
/** Called only for a Host-owned directory selected by the user, never a client-supplied path. */
async function openFolder(path) {
	if (!canOpenFolders()) throw new Error("当前环境不支持打开本机目录。");
	await mkdir(path, {
		recursive: true,
		mode: 448
	});
	const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer.exe" : "xdg-open";
	try {
		if (process.platform === "win32") await launchDetached(command, [path]);
		else await promisify(execFile)(command, [path], {
			timeout: 5e3,
			windowsHide: true
		});
	} catch {
		throw new Error("无法打开目录，请检查本机文件管理器是否可用。");
	}
}
/** Starts a process without waiting for it: resolves once it launched, ignoring its exit code. */
function launchDetached(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			detached: true,
			stdio: "ignore",
			windowsHide: true
		});
		child.once("error", reject);
		child.once("spawn", () => {
			child.unref();
			resolve();
		});
	});
}
// src/host/connector/logs.ts
const MAX_CONNECTOR_LINES = 1e4;
const MAX_LINE = 4096;
const filename = "connector-output.json";
function sanitizeConnectorLine(text, secrets = []) {
	let safe = stripVTControlCharacters(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
	for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) safe = safe.split(secret).join("[REDACTED]").split(encodeURIComponent(secret)).join("[REDACTED]");
	return safe.replace(/(\b(?:Bearer|Basic)\s+)[^\s,"'}]+/gi, "$1[REDACTED]").replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@").replace(/([?&](?:token|access_token|authToken|connectorToken|key|api_key|password|secret)=)[^\s&#]+/gi, "$1[REDACTED]").replace(/((?:authorization|bearer|password|secret|(?:access[_-]?|connector|auth|refresh[_-]?)?token|api[_-]?key)["']?\s*[:=]?\s*["']?)[^\s,"'}]+/gi, "$1[REDACTED]");
}
async function entriesAt(directory) {
	const saved = await readJson$1(join(directory, filename));
	if (!Array.isArray(saved)) return [];
	return saved.filter((entry) => Number.isSafeInteger(entry?.id) && typeof entry.time === "string" && typeof entry.text === "string").slice(-1e4);
}
async function readConnectorLogs(directory, query = {}) {
	if (!query || typeof query !== "object" || Array.isArray(query) || Object.keys(query).some((key) => key !== "before" && key !== "after") || [query.before, query.after].some((value) => value !== void 0 && (!Number.isSafeInteger(value) || value < 0)) || query.before !== void 0 && query.after !== void 0) throw new Error("Connector 日志分页参数无效。");
	const entries = await entriesAt(directory);
	const candidates = entries.filter((entry) => (query.before === void 0 || entry.id < query.before) && (query.after === void 0 || entry.id > query.after));
	return {
		entries: query.after === void 0 ? candidates.slice(-200) : candidates.slice(0, 200),
		hasMore: candidates.length > 200,
		oldestId: entries[0]?.id ?? null,
		newestId: entries.at(-1)?.id ?? null
	};
}
/** One writer per manager lease. Atomic snapshots retain at most 10k terminal lines across restarts. */
var ConnectorLogs = class {
	directory;
	entries = [];
	ready;
	writes = Promise.resolve();
	timer;
	remainder = "";
	secrets = [];
	sequence = 0;
	dirty = false;
	constructor(directory) {
		this.directory = directory;
		this.ready = entriesAt(directory).catch(() => []).then((entries) => {
			this.entries = entries;
			this.sequence = Math.max(Date.now() * 1e3, entries.at(-1)?.id ?? 0);
		});
	}
	setSecrets(secrets) {
		this.secrets = secrets.filter(Boolean);
	}
	async startSession(secrets) {
		await this.flush();
		this.entries = await entriesAt(this.directory).catch(() => []);
		this.sequence = Math.max(Date.now() * 1e3, this.entries.at(-1)?.id ?? 0);
		this.setSecrets(secrets);
	}
	record(event) {
		this.append(`[process] ${event}`);
	}
	output(chunk) {
		this.remainder += chunk;
		const lines = this.remainder.split(/\r\n|[\r\n]/);
		this.remainder = lines.pop() ?? "";
		for (const line of lines) if (line) this.append(line);
		if (this.remainder.length > MAX_LINE * 4) this.remainder = "[overlong output omitted]";
	}
	finish() {
		if (this.remainder) this.append(this.remainder);
		this.remainder = "";
	}
	append(text) {
		const time = (/* @__PURE__ */ new Date()).toISOString();
		const safe = sanitizeConnectorLine(text, this.secrets);
		const line = safe.length > MAX_LINE ? safe.slice(0, MAX_LINE) + "…" : safe;
		this.ready = this.ready.then(() => {
			this.entries.push({
				id: ++this.sequence,
				time,
				text: line
			});
			if (this.entries.length > 1e4) this.entries.splice(0, this.entries.length - MAX_CONNECTOR_LINES);
			this.dirty = true;
		});
		if (!this.timer) {
			this.timer = setTimeout(() => {
				this.timer = void 0;
				this.flush().catch(() => void 0);
			}, 100);
			this.timer.unref();
		}
	}
	async flush() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		await this.ready;
		if (this.dirty) this.writes = this.writes.catch(() => void 0).then(async () => {
			await this.ready;
			if (!this.dirty) return;
			this.dirty = false;
			try {
				await writeJson(join(this.directory, filename), [...this.entries]);
			} catch (error) {
				this.dirty = true;
				throw error;
			}
		});
		await this.writes;
	}
};
// src/host/connector/project.ts
/** uv 识别项目根所需的两项，也是副本是否完整的判据。 */
const REQUIRED = [["pyproject.toml"], ["connector", "cli.py"]];
async function complete(directory) {
	try {
		for (const parts of REQUIRED) await access(join(directory, ...parts));
		return true;
	} catch {
		return false;
	}
}
async function listFiles(root, current = root) {
	const found = [];
	for (const entry of (await readdir(current, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
		const path = join(current, entry.name);
		if (entry.isDirectory()) found.push(...await listFiles(root, path));
		else if (entry.isFile()) found.push(path);
	}
	return found;
}
/** 负载内容寻址：内容变了才重新镜像，同一份负载已解析出的 uv.lock 得以跨启动复用。 */
async function payloadDigest(source) {
	const hash = createHash("sha256");
	for (const file of await listFiles(source)) hash.update(relative(source, file)).update("\0").update(await readFile(file)).update("\0");
	return hash.digest("hex").slice(0, 16);
}
/**
* 把打包内的 Connector 项目镜像到插件自己的数据目录，返回可写副本的路径。
*
* uv 在项目目录里写 uv.lock，而插件包目录不能当项目目录用：asar 归档不可写，共享
* 安装的 /Applications 对普通用户不可写，在已签名的 macOS 包里落文件还会直接废掉
* code signature。副本先落到同级的临时目录再 rename 就位，因此一次启动要么复用一份
* 完整副本，要么发布一份完整副本；uv.lock 随后就留在这份副本里。
*/
async function materializeConnectorProject(config) {
	const source = config.connectorSourceDir;
	if (!await complete(source)) throw new Error("未找到内部 Connector 源码，请重新构建插件或配置 connectorSourceDir。");
	const root = join(config.stateRoot, "connector-source");
	const target = join(root, await payloadDigest(source));
	if (!await complete(target)) {
		await mkdir(root, {
			recursive: true,
			mode: 448
		});
		const staging = await mkdtemp(`${target}.partial-`);
		try {
			await cp(source, staging, {
				recursive: true,
				dereference: true
			});
			if (!await complete(staging)) throw new Error("内部 Connector 源码不完整。");
			try {
				await rename(staging, target);
			} catch (error) {
				if (!await complete(target)) throw error;
			}
		} finally {
			await rm(staging, {
				recursive: true,
				force: true
			});
		}
	}
	return target;
}
// src/host/connector/process.ts
function deriveLogsPath(value) {
	if (typeof value.logsPath === "string" && value.logsPath) return value.logsPath;
	if (typeof value.runtimePath === "string" && value.runtimePath) return join(dirname(value.runtimePath), "logs");
	return null;
}
const runFile = promisify(execFile);
/** The ready line (`connector.ready`) is a few hundred bytes; anything larger is a protocol error. */
const MAX_READY_BYTES = 65536;
/** The Router is already serving when it writes the ready line; a wedged handshake must not hang startup. */
const CONTROL_CONNECT_TIMEOUT_MS = 1e4;
/**
* The first request waits out uv's initial dependency installation, not a Python launch: the
* Connector project pulls roughly 235 MiB of wheels, which needs a quarter of an hour on a
* 300 KB/s link. A stalled install still fails long before this budget, because uv gives up on
* its own read timeout below and its exit rejects every pending request; the caller may abort
* the start signal at any point. So this only bounds an installation that is making progress.
*/
const FIRST_REQUEST_TIMEOUT = 36e5;
/** Bounds a transfer that stopped producing bytes, which uv can see and this process cannot. */
const UV_READ_TIMEOUT_SECONDS = "60";
/** Reclaiming the cache is housekeeping, so it may not outlast the failure that asked for it. */
const CACHE_PRUNE_TIMEOUT = 6e4;
/**
* uv unpacks a download into a temporary directory inside its cache and only commits the entry
* once it is whole, so a child killed mid-download orphans that directory for good: the reporter
* of #112 accumulated 57 of them, 2.44 GiB, over four days of retries. Pruning drops exactly those
* dangling entries and keeps every archive that did finish, so the next attempt still starts from
* whatever the last one managed to download.
*/
const pruneUvCache = (command) => runFile(command, ["cache", "prune"], {
	timeout: CACHE_PRUNE_TIMEOUT,
	windowsHide: true
});
function parseRendezvous$1(line) {
	let value;
	try {
		value = JSON.parse(line);
	} catch {
		return;
	}
	const endpoint = value.endpoint && typeof value.endpoint === "object" ? value.endpoint : {};
	const local = typeof endpoint.unixPath === "string" ? { unixPath: endpoint.unixPath } : typeof endpoint.pipe === "string" ? { pipe: endpoint.pipe } : void 0;
	if (value.kind !== "connector.ready" || value.version !== 1 || !local || !Number.isSafeInteger(value.pid) || typeof value.instanceId !== "string" || typeof value.key !== "string" || !value.key.startsWith("mk_")) return void 0;
	return {
		kind: "connector.ready",
		version: 1,
		instanceId: value.instanceId,
		pid: value.pid,
		endpoint: local,
		key: value.key
	};
}
var ConnectorCredentialError = class extends Error {
	constructor() {
		super("本机设备连接已失效，请在插件中恢复连接。");
	}
};
var ConnectorOwnershipError = class extends Error {
	code = "connector_already_running";
	constructor() {
		super("当前已有其他 Connector 在运行，请先结束对应的 Connector 进程，然后重试。");
	}
};
/** The Router's application error for a lost ownership race becomes the onboarding signal. */
function connectorFailure(error) {
	return error instanceof MeshCallError && error.code === "connector_already_running" ? new ConnectorOwnershipError() : error;
}
/** Owns only the child it spawns; DSH Agent operations are served by the plugin runtime. */
var SourceConnector = class {
	config;
	launch;
	settings;
	firstRequestTimeoutMs;
	prune;
	child = null;
	mesh = null;
	control = null;
	logsClient = null;
	cachedLogsPath = null;
	readyBuffer = "";
	ready = null;
	readyWaiter = null;
	events = null;
	failure = null;
	stopping = null;
	state = {
		running: false,
		authFailed: false
	};
	listeners = /* @__PURE__ */ new Set();
	closed = /* @__PURE__ */ new WeakSet();
	logs;
	logOutput;
	diagnostics;
	/** 可写的项目副本；uv 只在这个目录里写 uv.lock，绝不碰插件包目录。 */
	projectDir = null;
	constructor(config, launch = spawn, settings = () => DEFAULT_CONNECTOR_SETTINGS, firstRequestTimeoutMs = FIRST_REQUEST_TIMEOUT, prune = pruneUvCache, diagnostics, logOutput) {
		this.config = config;
		this.launch = launch;
		this.settings = settings;
		this.firstRequestTimeoutMs = firstRequestTimeoutMs;
		this.prune = prune;
		this.logs = new ConnectorLogs(join(config.stateRoot, "logs"));
		this.logOutput = logOutput ?? new RpcLogOutput(512, "plugin");
		this.diagnostics = diagnostics ?? new RuntimeDiagnostics(this.logOutput, {}, "dsh-plugin");
	}
	get alive() {
		return this.child !== null && this.child.exitCode === null && this.child.signalCode === null;
	}
	get running() {
		return this.alive && this.state.running && !this.state.authFailed;
	}
	get lastError() {
		return this.failure?.message ?? null;
	}
	get logsPath() {
		return this.cachedLogsPath;
	}
	hasRuntimeLogs() {
		return this.logsClient !== null;
	}
	onState(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	async resolveLogsPath() {
		if (this.cachedLogsPath) return this.cachedLogsPath;
		if (!this.control) return null;
		try {
			const resolved = deriveLogsPath(await this.control.getPaths({ timeoutMs: 3e3 }));
			if (resolved) this.cachedLogsPath = resolved;
		} catch {}
		return this.cachedLogsPath;
	}
	async readRuntimeLogs(query) {
		const client = this.logsClient;
		if (!client) return {
			available: false,
			items: [],
			firstSeq: null,
			lastSeq: null,
			total: 0,
			hasMoreBefore: false,
			hasMoreAfter: false,
			logsPath: this.cachedLogsPath,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await this.logOutput.flush();
		return readRuntimeLogPage(client, query, this.cachedLogsPath);
	}
	updateState(value) {
		if (!value || typeof value !== "object") return;
		const state = value;
		if (!state.running && !state.authFailed && typeof state.lastError === "string" && state.lastError && !this.stopping) {
			const invalidState = /^(invalid|unsupported) connector sync state file:/.test(state.lastError);
			const code = invalidState ? "CONNECTOR_SYNC_STATE_INVALID" : "CONNECTOR_RUNTIME_FAILED";
			if (this.failure?.code !== code) {
				this.failure = Object.assign(/* @__PURE__ */ new Error(invalidState ? "Connector 同步状态文件无效，请查看启动前诊断。" : "Connector 运行失败，请查看启动前诊断。"), { code });
				this.logs.output(`[connector] ${state.lastError}\n`);
				this.diagnostics.log("error", "connector.runtime_failed", {}, this.failure);
			}
		}
		const resolvedLogsPath = deriveLogsPath(state);
		if (resolvedLogsPath) this.cachedLogsPath = resolvedLogsPath;
		if (typeof state.running !== "boolean" || typeof state.authFailed !== "boolean") return;
		if (state.running === this.state.running && state.authFailed === this.state.authFailed) return;
		this.state = {
			running: state.running,
			authFailed: state.authFailed
		};
		this.logs.record(state.authFailed ? "auth_failed" : state.running ? "running" : "stopped");
		this.diagnostics.log(state.authFailed ? "warn" : "info", "connector.state_changed", {
			running: state.running,
			authFailed: state.authFailed
		});
		for (const listener of this.listeners) listener({ ...this.state });
	}
	async prepare(settings = this.settings()) {
		this.projectDir = await materializeConnectorProject(this.config);
		try {
			const executable = await resolveUv(this.config, settings);
			if (!executable) throw new Error("uv unavailable");
			await runFile(executable, ["--version"], {
				timeout: 1e4,
				windowsHide: true
			});
		} catch {
			throw new Error("未找到可用的 uv，请安装 uv，或在插件配置中指定 uvPath。");
		}
	}
	async start(binding, apiBaseUrl, signal) {
		if (this.stopping) await this.stopping;
		if (this.running) return;
		if (this.alive) await this.stop();
		signal.throwIfAborted();
		const dataDir = join(this.config.stateRoot, "connector");
		const configPath = join(dataDir, "connector.json");
		const settings = this.settings();
		await mkdir(dataDir, {
			recursive: true,
			mode: 448
		});
		await writeJson(configPath, {
			serverUrl: apiBaseUrl,
			connectorId: binding.connectorId,
			connectorToken: binding.connectorToken,
			statePath: join(dataDir, `${binding.connectorId}.sqlite3`),
			heartbeatSeconds: 20,
			reconnectSeconds: 3,
			syncIntervalSeconds: settings.syncIntervalSeconds,
			syncExistingOnConnect: true
		});
		signal.throwIfAborted();
		this.failure = null;
		this.readyBuffer = "";
		this.ready = null;
		this.updateState({
			running: false,
			authFailed: false
		});
		await this.logs.startSession([binding.connectorToken]);
		this.logs.record("starting");
		this.diagnostics.log("info", "connector.starting", {
			connectorId: binding.connectorId,
			apiBaseUrl
		});
		const command = await resolveUv(this.config, settings) ?? (settings.uvPath || this.config.uvPath);
		signal.throwIfAborted();
		const projectDir = this.projectDir ??= await materializeConnectorProject(this.config);
		signal.throwIfAborted();
		const venvDir = join(this.config.stateRoot, "connector-venv");
		const venvPython = process.platform === "win32" ? join(venvDir, "Scripts", "python.exe") : join(venvDir, "bin", "python");
		if (existsSync(venvDir) && !existsSync(venvPython)) rmSync(venvDir, {
			recursive: true,
			force: true
		});
		const child = this.launch(command, [
			"run",
			"--directory",
			projectDir,
			"anywhere-cli",
			"rpc",
			"--config",
			configPath
		], {
			cwd: projectDir,
			windowsHide: true,
			detached: process.platform !== "win32",
			env: withPackageIndexes({
				...process.env,
				...typeof process.env["NO_PROXY"] === "string" ? { NO_PROXY: process.env["NO_PROXY"].replaceAll("[::1]", "::1") } : {},
				...typeof process.env["no_proxy"] === "string" ? { no_proxy: process.env["no_proxy"].replaceAll("[::1]", "::1") } : {},
				AA_CONNECTOR_OWNER_KIND: "dsh-plugin",
				AA_CONNECTOR_PROXY: settings.connectorProxy || void 0,
				...this.config.dshHome ? { DSH_HOME: this.config.dshHome } : {},
				...this.config.runtimeType ? { YUNWORK_ANYWHERE_RUNTIME_TYPE: this.config.runtimeType } : {},
				...this.config.productName ? { YUNWORK_PRODUCT_NAME: this.config.productName } : {},
				...this.config.shortName ? { YUNWORK_SHORT_NAME: this.config.shortName } : {},
				AGENT_CONNECTOR_DATA_DIR: dataDir,
				UV_PROJECT_ENVIRONMENT: join(this.config.stateRoot, "connector-venv"),
				PYTHONDONTWRITEBYTECODE: "1",
				PYTHONUNBUFFERED: "1",
				UV_HTTP_TIMEOUT: process.env["UV_HTTP_TIMEOUT"] || UV_READ_TIMEOUT_SECONDS,
				UV_PYTHON_INSTALL_MIRROR: settings.uvPythonInstallMirror || "https://github.com/astral-sh/python-build-standalone/releases/download"
			}, settings.uvPypiIndexUrl)
		});
		this.child = child;
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			if (this.child === child) this.receive(chunk);
		});
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk) => {
			this.logs.output(chunk);
		});
		child.stdin.on("error", () => {
			if (this.child === child) this.fail(/* @__PURE__ */ new Error("Connector 输入连接已关闭。"));
		});
		child.on("error", () => {
			if (this.child === child) this.fail(/* @__PURE__ */ new Error("Connector 进程启动失败，请检查 uv 和源码运行环境。"));
		});
		child.on("close", (code) => {
			this.closed.add(child);
			this.logs.finish();
			this.logs.record(`exited (${code ?? "signal"})`);
			this.diagnostics.log(this.stopping ? "info" : "warn", "connector.exited", { exitCode: code ?? "signal" });
			this.logs.flush().catch(() => void 0);
			if (this.child === child) {
				this.child = null;
				this.releaseControl();
				this.fail(/* @__PURE__ */ new Error(`Connector 已退出（${code ?? "终止"}）。请在日志页切换到 Connector 查看原因。`), !this.stopping);
			}
		});
		const abort = () => {
			this.stop();
		};
		signal.addEventListener("abort", abort, { once: true });
		try {
			signal.throwIfAborted();
			await this.connect(signal);
			const control = this.control;
			this.updateState(await control.getState({ timeoutMs: this.firstRequestTimeoutMs }));
			signal.throwIfAborted();
			this.updateState(await control.start(void 0, { timeoutMs: this.firstRequestTimeoutMs }));
			signal.throwIfAborted();
			this.watchEvents();
		} catch (error) {
			await this.stop();
			try {
				await this.prune(command);
			} catch {}
			throw connectorFailure(error);
		} finally {
			signal.removeEventListener("abort", abort);
		}
	}
	async assertHealthy() {
		if (this.state.authFailed) throw new ConnectorCredentialError();
		if (this.failure) throw this.failure;
		let state;
		try {
			state = await this.requireControl().getState({ timeoutMs: 15e3 });
		} catch (error) {
			if (error instanceof DeadlineExceededError) return;
			throw error;
		}
		this.updateState(state);
		if (state.authFailed) throw new ConnectorCredentialError();
		if (this.failure) throw this.failure;
		if (!state.running) throw new Error("Connector 尚未运行，请返回插件重试。");
	}
	stop() {
		if (this.stopping) return this.stopping;
		this.stopping = this.stopChild().finally(async () => {
			await this.logs.flush();
			this.failure = null;
			this.stopping = null;
		});
		return this.stopping;
	}
	/**
	* A half-downloaded or broken install survives every restart, because uv reuses whatever the
	* environment and the project copy already hold. Only the plugin-owned pieces go: the venv and
	* the materialized project with its uv.lock. The uv cache is the user's and shared with other
	* projects, so it is only pruned of the dangling entries an interrupted download left behind.
	*/
	async resetEnvironment() {
		await this.stop();
		this.projectDir = null;
		for (const name of ["connector-venv", "connector-source"]) await rm(join(this.config.stateRoot, name), {
			recursive: true,
			force: true,
			maxRetries: 5
		});
		const executable = await resolveUv(this.config, this.settings()).catch(() => null);
		if (executable) try {
			await this.prune(executable);
		} catch {}
		this.diagnostics.log("info", "connector.environment_reset", {});
	}
	async stopChild() {
		const child = this.child;
		this.events?.abort();
		this.events = null;
		if (!child) {
			await this.releaseControl();
			return;
		}
		try {
			await this.logOutput.flush();
		} catch {}
		try {
			await this.control?.stop({ timeoutMs: 3e3 });
		} catch {}
		child.stdin.end();
		const ended = new Promise((resolve) => {
			if (this.closed.has(child) || child.exitCode !== null || child.signalCode !== null) resolve();
			else child.once("close", () => resolve());
		});
		await Promise.race([ended, setTimeout$1(1e3)]);
		if (!this.closed.has(child)) await this.terminate(child, false);
		await Promise.race([ended, setTimeout$1(3e3)]);
		if (!this.closed.has(child)) await this.terminate(child, true);
		await ended;
		if (this.child === child) this.child = null;
		await this.releaseControl();
	}
	/** Close the Mesh a crashed Connector left behind; its reconnect loop never ends on its own. */
	async releaseControl() {
		const mesh = this.mesh;
		this.mesh = null;
		this.control = null;
		this.logsClient = null;
		this.logOutput.connect(void 0);
		await mesh?.close().catch(() => void 0);
	}
	async terminate(child, force) {
		if (!child.pid) return;
		if (process.platform === "win32") {
			if (force) try {
				await runFile("taskkill", [
					"/PID",
					String(child.pid),
					"/T",
					"/F"
				], {
					windowsHide: true,
					timeout: 5e3
				});
			} catch {}
			else child.kill();
		} else try {
			process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
		} catch {}
	}
	requireControl() {
		if (!this.control) throw this.failure ?? /* @__PURE__ */ new Error("Connector 未启动。");
		return this.control;
	}
	/** Wait for the ready line, then connect to the Connector's Router. */
	async connect(signal) {
		signal.throwIfAborted();
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.readyWaiter = null;
				reject(/* @__PURE__ */ new Error("Connector 响应超时，请检查 Python 依赖安装和网络连接。"));
			}, this.firstRequestTimeoutMs);
			this.readyWaiter = {
				resolve,
				reject,
				timer
			};
			signal.addEventListener("abort", () => reject(signal.reason), { once: true });
			if (this.ready) {
				this.readyWaiter = null;
				clearTimeout(timer);
				resolve();
			}
		});
		const ready = this.ready;
		const router = new Router(ready.endpoint);
		const rpcLogger = new RuntimeRpcLogger(this.diagnostics);
		guardMeshCallResults();
		const mesh = new Mesh(router, {
			token: ready.key,
			peerId: `dsh-plugin-${ready.instanceId}`,
			logger: rpcLogger
		});
		const connecting = mesh.connect();
		let timer;
		try {
			await Promise.race([connecting, new Promise((_, reject) => {
				timer = setTimeout(() => reject(/* @__PURE__ */ new Error("Connector 控制通道连接超时。")), CONTROL_CONNECT_TIMEOUT_MS);
				timer.unref();
			})]);
		} catch (error) {
			connecting.catch(() => void 0);
			await mesh.close().catch(() => void 0);
			throw error;
		} finally {
			if (timer) clearTimeout(timer);
		}
		if (signal.aborted) {
			await mesh.close().catch(() => void 0);
			throw signal.reason instanceof Error ? signal.reason : /* @__PURE__ */ new Error("Connector 启动已取消。");
		}
		this.mesh = mesh;
		this.control = new ControlServiceClient(mesh);
		this.logsClient = new LogsServiceClient(mesh);
		this.logOutput.connect(this.logsClient);
		this.diagnostics.log("info", "connector.control_connected", {
			instanceId: ready.instanceId,
			pid: ready.pid
		});
		this.logOutput.flush();
	}
	/** Follow state changes; a dropped stream resumes after the last seq. */
	watchEvents() {
		const controller = new AbortController();
		this.events = controller;
		const run = async () => {
			let since = null;
			let backoff = 500;
			while (!controller.signal.aborted) try {
				const stream = this.requireControl().events(since, { signal: controller.signal });
				for await (const event of stream) {
					since = event.seq;
					if (event.kind === "state" && event.state) this.updateState(event.state);
					backoff = 500;
				}
				if (!controller.signal.aborted) throw new Error("Connector 事件流已结束。");
			} catch (error) {
				if (controller.signal.aborted || this.stopping) return;
				if (error instanceof MeshCallError && error.code === "connector_error") return;
				await setTimeout$1(backoff);
				backoff = Math.min(backoff * 2, 5e3);
			}
		};
		run();
	}
	receive(chunk) {
		if (this.ready) return;
		this.readyBuffer += chunk;
		if (this.readyBuffer.length > MAX_READY_BYTES) {
			this.fail(/* @__PURE__ */ new Error("Connector 返回了过大的消息。"));
			return;
		}
		const newline = this.readyBuffer.indexOf("\n");
		if (newline < 0) return;
		const line = this.readyBuffer.slice(0, newline);
		this.readyBuffer = this.readyBuffer.slice(newline + 1);
		const ready = parseRendezvous$1(line);
		if (!ready) {
			this.fail(/* @__PURE__ */ new Error("Connector 返回了无效的启动消息。"));
			return;
		}
		this.ready = ready;
		const waiter = this.readyWaiter;
		this.readyWaiter = null;
		if (waiter) {
			clearTimeout(waiter.timer);
			waiter.resolve();
		}
		if (this.readyBuffer.trim()) this.fail(/* @__PURE__ */ new Error("Connector 在启动后仍向 stdout 写入了数据。"));
	}
	fail(error, report = true) {
		this.failure = error;
		if (report) {
			this.logs.record("process_error");
			this.diagnostics.log("error", "connector.process_failed", {}, error);
		}
		this.updateState({
			...this.state,
			running: false
		});
		const waiter = this.readyWaiter;
		this.readyWaiter = null;
		if (waiter) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
		}
	}
};
// src/host/desktop/detect.ts
/** Standalone plugin always runs in built-in Connector mode; never lock on official Desktop. */
async function detectDesktop(_home = userInfo().homedir, _platform = process.platform, _running) {
	return {
		status: "absent",
		message: "未找到桌面端安装记录，可以通过 Web 完成设置。"
	};
}
// src/host/desktop/launch.ts
/** Registered by the packaged Desktop app; also carries its OAuth callback. */
const DESKTOP_PROTOCOL = "yundashi-remote-control";
/** 24 base64url characters, inside the range the Desktop entry validates. */
function newDesktopFlowId() {
	return randomBytes(18).toString("base64url");
}
function desktopOnboardingUrl(flowId) {
	const params = new URLSearchParams({
		source: "dsh-plugin",
		flowId
	});
	return `${DESKTOP_PROTOCOL}://onboarding?${params.toString()}`;
}
const launchDesktop = async () => {
	throw new Error("独立插件模式请直接使用内置远程控制完成连接。");
};
// src/host/storage/migration.ts
const receipt = ".legacy-state-migrated.json";
/** Caller holds the destination manager lease until the manager stops. */
async function migrateStateRoot(target, source) {
	if (!source) return;
	const migrated = await readJson$1(join(target, receipt));
	if (migrated !== null) {
		if (migrated.version !== 1) throw new Error("数据目录迁移记录版本无效。");
		return;
	}
	let sourceExists = true;
	try {
		await lstat(source);
	} catch (error) {
		if (!hasCode(error, "ENOENT")) throw error;
		sourceExists = false;
	}
	if (sourceExists) {
		const release = await acquireManagerLock(join(source, "manager.lock"));
		try {
			await copyMissing(source, target, source, target);
		} finally {
			await release();
		}
	}
	await writeJson(join(target, receipt), { version: 1 });
}
async function copyMissing(source, target, oldRoot, newRoot) {
	const entry = await lstat(source);
	let existing;
	try {
		existing = await lstat(target);
	} catch (error) {
		if (!hasCode(error, "ENOENT")) throw error;
	}
	if (entry.isDirectory()) {
		if (existing && !existing.isDirectory()) throw new Error(`迁移目录冲突：${target}`);
		await mkdir(target, {
			recursive: true,
			mode: 448
		});
		for (const name of await readdir(source)) {
			if (source === oldRoot && [
				"connector-venv",
				"manager.lock",
				receipt
			].includes(name)) continue;
			await copyMissing(join(source, name), join(target, name), oldRoot, newRoot);
		}
		return;
	}
	if (existing) {
		if (!existing.isFile() || !entry.isFile()) throw new Error(`迁移文件冲突：${target}`);
		return;
	}
	if (!entry.isFile()) throw new Error(`无法迁移非普通文件：${source}`);
	const temporary = `${target}.${randomUUID()}.tmp`;
	try {
		if (relative(oldRoot, source) === join("connector", "connector.json")) {
			const config = await readJson$1(source);
			if (!config || Array.isArray(config) || typeof config !== "object") throw new Error("旧 Connector 配置格式无效。");
			for (const key of ["statePath", "attachmentsRoot"]) {
				const value = config[key];
				if (typeof value !== "string" || !isAbsolute(value)) continue;
				const suffix = relative(oldRoot, value);
				if (suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix)) config[key] = join(newRoot, suffix);
			}
			await writeJson(temporary, config);
		} else {
			await copyFile(source, temporary);
			const file = await open(temporary, "r+");
			try {
				await file.chmod(384);
				await file.sync();
			} finally {
				await file.close();
			}
		}
		try {
			await link(temporary, target);
		} catch (error) {
			if (!hasCode(error, "EEXIST")) throw error;
		}
	} finally {
		await rm(temporary, { force: true });
	}
}
// src/host/onboarding/loopback.ts
var LoopbackFlow = class {
	onCode;
	onCancel;
	id = randomUUID();
	state = randomBytes(32).toString("base64url");
	verifier = randomBytes(48).toString("base64url");
	progressPath = `/onboarding/${randomBytes(32).toString("base64url")}`;
	server = createServer$1((req, res) => this.handle(req, res));
	origin = "";
	consumed = false;
	progress = {
		stage: "authorizing",
		message: "正在等待登录授权…"
	};
	expiry;
	shutdown;
	constructor(onCode, onCancel) {
		this.onCode = onCode;
		this.onCancel = onCancel;
	}
	get redirectUri() {
		return `${this.origin}/oauth/callback`;
	}
	get progressUrl() {
		return `${this.origin}${this.progressPath}`;
	}
	async listen(timeoutMs = 6e5) {
		await new Promise((resolve, reject) => {
			const fail = (error) => reject(error);
			this.server.once("error", fail);
			this.server.listen(0, "127.0.0.1", () => {
				this.server.off("error", fail);
				resolve();
			});
		});
		this.origin = `http://127.0.0.1:${this.server.address().port}`;
		this.expiry = setTimeout(() => this.onCancel("本次登录已超时，请回到插件重试。"), timeoutMs);
		this.expiry.unref();
	}
	authorizationUrl(webBaseUrl) {
		const url = new URL(`${webBaseUrl}/`);
		url.hash = `/plugin-oauth?${new URLSearchParams({
			response_type: "code",
			client_id: OAUTH_CLIENT_ID,
			redirect_uri: this.redirectUri,
			code_challenge: createHash("sha256").update(this.verifier).digest("base64url"),
			code_challenge_method: "S256",
			scope: "profile",
			state: this.state
		})}`;
		return url.href;
	}
	update(progress) {
		this.progress = progress;
		if (progress.stage === "ready" || progress.stage === "error") {
			clearTimeout(this.expiry);
			clearTimeout(this.shutdown);
			this.shutdown = setTimeout(() => {
				this.close();
			}, 6e4);
			this.shutdown.unref();
		}
	}
	async close() {
		clearTimeout(this.expiry);
		clearTimeout(this.shutdown);
		this.server.closeAllConnections();
		if (this.server.listening) await new Promise((resolve) => this.server.close(() => resolve()));
	}
	handle(req, res) {
		res.setHeader("Cache-Control", "no-store");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader("X-Content-Type-Options", "nosniff");
		if (req.headers.host !== new URL(this.origin).host) {
			res.writeHead(403).end();
			return;
		}
		if (req.method !== "GET") {
			res.writeHead(405, { Allow: "GET" }).end();
			return;
		}
		let url;
		try {
			url = new URL(req.url ?? "/", this.origin);
		} catch {
			res.writeHead(400).end();
			return;
		}
		if (url.pathname === "/oauth/callback") {
			const incoming = Buffer.from(url.searchParams.get("state") ?? "");
			const expected = Buffer.from(this.state);
			if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) {
				res.writeHead(400).end("Invalid OAuth state");
				return;
			}
			if (this.consumed) {
				res.writeHead(409).end("OAuth callback already consumed");
				return;
			}
			if (!url.searchParams.get("code") && !url.searchParams.get("error")) {
				res.writeHead(400).end("Missing authorization code");
				return;
			}
			this.consumed = true;
			res.writeHead(303, { Location: this.progressUrl }).end();
			if (url.searchParams.get("error")) this.onCancel("你已取消授权，可以回到插件重新开始。");
			else this.onCode(url.searchParams.get("code"));
			return;
		}
		if (url.pathname === `${this.progressPath}/status`) {
			res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(this.progress));
			return;
		}
		if (url.pathname === this.progressPath) {
			const nonce = randomBytes(16).toString("base64");
			res.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`);
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(progressHtml(nonce, `${this.progressPath}/status`));
			return;
		}
		res.writeHead(404).end();
	}
};
function progressHtml(nonce, statusPath) {
	return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>连接设备 · 云大师远程控制</title>
<style nonce="${nonce}">
:root{color-scheme:light dark;--background:#fff;--foreground:#0a0a0a;--muted:#737373}
@media(prefers-color-scheme:dark){:root{--background:#0a0a0a;--foreground:#fafafa;--muted:#a1a1a1}}
*{box-sizing:border-box}
body{margin:0;min-height:100svh;display:grid;place-items:center;background:var(--background);color:var(--foreground);font-family:"Geist","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
main{width:100%;max-width:1200px;padding:32px 24px;text-align:center}
.heading{display:flex;align-items:center;justify-content:center;gap:.32em;font-size:clamp(28px,5.1vw,76px)}
h1{margin:0;font-size:inherit;font-weight:500;letter-spacing:-.055em;line-height:1.18}
.spinner{width:.56em;height:.56em;flex:none;color:var(--muted);animation:spin 1s linear infinite}
p{margin:28px 0 0;font-size:17px;line-height:1.85;color:var(--muted)}
#error{max-width:560px;margin-inline:auto;color:#ef4444;font-size:14px}
main[data-state="error"] .spinner{animation-play-state:paused;opacity:.45}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:599px){p{font-size:15px;margin-top:26px}}
@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
</style>
<main aria-busy="true" aria-labelledby="title">
  <div class="heading">
    <!-- Static markup of shadcn Spinner's Lucide Loader2 icon. -->
    <svg data-slot="spinner" class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    <h1 id="title">正在连接你的设备</h1>
  </div>
  <p id="status" role="status">这可能需要几分钟时间</p>
  <p id="error" role="alert" hidden></p>
</main>
<script nonce="${nonce}">
let failures=0;
function showError(message){
  const main=document.querySelector('main');
  main.setAttribute('aria-busy','false');
  main.dataset.state='error';
  const error=document.getElementById('error');
  error.textContent=message;
  error.hidden=false;
}
async function tick(){
  try{
    const response=await fetch(${JSON.stringify(statusPath)},{cache:'no-store'});
    if(!response.ok)throw new Error();
    const result=await response.json();
    failures=0;
    if(result.stage==='ready'&&result.redirectUrl){location.replace(result.redirectUrl);return}
    if(result.stage==='error'){showError(result.message||'连接失败，请回到插件重试。');return}
  }catch{
    if(++failures>=5){showError('本机连接已关闭，请回到插件重试。');return}
  }
  setTimeout(tick,800);
}
tick();
<\/script></html>`;
}
// src/host/connector/settings.ts
const RETIRED_SETTINGS = [
	"autoStart",
	"heartbeatSeconds",
	"reconnectSeconds",
	"syncExistingOnConnect"
];
function defaultPypiIndexUrl(languages) {
	return languages.some((language) => /^zh(?:[-_]|$)/i.test(language.trim())) ? PYPI_MIRRORS.find((mirror) => mirror.id === "aliyun").url : "";
}
function defaultPythonMirror(languages) {
	return languages.some((language) => /^zh(?:[-_]|$)/i.test(language.trim())) ? PYTHON_MIRRORS[1].url : "";
}
function validateConnectorSettings(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Connector 配置格式无效。");
	const fields = value;
	if (Object.keys(fields).some((key) => !Object.hasOwn(DEFAULT_CONNECTOR_SETTINGS, key))) throw new Error("包含不支持的 Connector 配置项。");
	const settings = {
		...DEFAULT_CONNECTOR_SETTINGS,
		...fields
	};
	if (typeof settings.uvPath !== "string" || settings.uvPath.length > 4096 || /[\r\n\0]/.test(settings.uvPath)) throw new Error("uv 路径无效。");
	settings.uvPath = settings.uvPath.trim();
	if (settings.uvPath && !isAbsolute(settings.uvPath)) throw new Error("请填写 uv 可执行文件的绝对路径，或留空自动查找。");
	if (!PYPI_MIRRORS.some((mirror) => mirror.url === settings.uvPypiIndexUrl)) throw new Error("请选择列表中的 PyPI 镜像。");
	if (!PYTHON_MIRRORS.some((mirror) => mirror.url === settings.uvPythonInstallMirror)) throw new Error("请选择列表中的 Python 下载镜像。");
	if (typeof settings.connectorProxy !== "string") throw new Error("代理地址无效，请填写完整地址，例如 http://127.0.0.1:7890。");
	settings.connectorProxy = settings.connectorProxy.trim();
	if (settings.connectorProxy && settings.connectorProxy !== "direct" && !/^(?:https?|socks5h?):\/\/[^\s/]+/i.test(settings.connectorProxy)) throw new Error("代理地址无效，请填写完整地址，例如 http://127.0.0.1:7890。");
	if (!Number.isInteger(settings.syncIntervalSeconds) || settings.syncIntervalSeconds < 1 || settings.syncIntervalSeconds > 3600) throw new Error("同步间隔必须是 1–3600 之间的整数。");
	return settings;
}
var ConnectorSettingsStore = class {
	readLanguages;
	current;
	path;
	constructor(config, readLanguages = systemLanguages) {
		this.readLanguages = readLanguages;
		this.current = { ...DEFAULT_CONNECTOR_SETTINGS };
		this.path = join(config.stateRoot, "connector-settings.json");
	}
	get() {
		return { ...this.current };
	}
	async load() {
		const saved = await readJson$1(this.path);
		if (saved === null || typeof saved === "object" && !Array.isArray(saved)) {
			const fields = { ...saved ?? {} };
			const migrating = RETIRED_SETTINGS.some((key) => Object.hasOwn(fields, key));
			for (const key of RETIRED_SETTINGS) delete fields[key];
			const needsMirror = !Object.hasOwn(fields, "uvPypiIndexUrl");
			const needsPythonMirror = !Object.hasOwn(fields, "uvPythonInstallMirror");
			const languages = needsMirror || needsPythonMirror ? await this.readLanguages() : [];
			if (needsPythonMirror) fields["uvPythonInstallMirror"] = defaultPythonMirror(languages);
			if (needsMirror) fields["uvPypiIndexUrl"] = defaultPypiIndexUrl(languages);
			this.current = validateConnectorSettings(fields);
			if (migrating || needsMirror || needsPythonMirror) await writeJson(this.path, this.current);
		} else this.current = validateConnectorSettings(saved);
	}
	async reset() {
		const languages = await this.readLanguages();
		await this.save({
			...DEFAULT_CONNECTOR_SETTINGS,
			uvPypiIndexUrl: defaultPypiIndexUrl(languages),
			uvPythonInstallMirror: defaultPythonMirror(languages)
		});
	}
	async save(value) {
		const settings = validateConnectorSettings(value);
		await writeJson(this.path, settings);
		this.current = settings;
	}
};
// src/host/account/mobile.ts
const QRCode = createRequire(import.meta.url)("qrcode");
const statuses = /* @__PURE__ */ new Set([
	"pending_scan",
	"pending_web_confirm",
	"approved",
	"consumed",
	"rejected",
	"expired"
]);
const finished = /* @__PURE__ */ new Set([
	"consumed",
	"rejected",
	"expired"
]);
/** Ephemeral, account-bound QR flow. No phone or user credentials are persisted. */
var MobileLogin = class {
	session = null;
	controller = null;
	operations = Promise.resolve();
	clear() {
		this.controller?.abort();
		this.session?.controller.abort();
		this.controller = null;
		this.session = null;
	}
	create(account, api) {
		this.clear();
		const controller = new AbortController();
		this.controller = controller;
		return this.serial(async () => {
			controller.signal.throwIfAborted();
			const requestedAt = Date.now();
			const qr = await api.createMobileQr(account.accessToken, controller.signal);
			controller.signal.throwIfAborted();
			const ttl = Date.parse(qr.expiresAt) - Date.parse(qr.serverTime);
			if (qr.userId !== account.userId || typeof qr.loginToken !== "string" || !qr.loginToken || qr.loginToken.length > 4096 || !Number.isFinite(ttl) || ttl <= 0 || ttl > 18e5) throw new Error("手机连接二维码响应无效，请重试。");
			const payload = JSON.stringify({
				type: "agents-anywhere.mobile-login",
				version: 1,
				webUrl: account.apiBaseUrl,
				userId: qr.userId,
				loginToken: qr.loginToken,
				expiresAt: qr.expiresAt
			});
			const qrImage = await QRCode.toDataURL(payload, {
				errorCorrectionLevel: "M",
				margin: 4,
				width: 320
			});
			controller.signal.throwIfAborted();
			const deadline = requestedAt + ttl;
			this.session = {
				account,
				api,
				token: qr.loginToken,
				deadline,
				controller,
				snapshot: {
					id: randomUUID(),
					status: "pending_scan",
					qrImage,
					expiresAt: new Date(deadline).toISOString(),
					deviceName: null
				}
			};
			return { ...this.session.snapshot };
		});
	}
	inspect(id, account) {
		return this.serial(async () => {
			const session = this.require(id, account);
			if (!finished.has(session.snapshot.status)) {
				const status = await session.api.mobileStatus(account.accessToken, session.token, session.controller.signal);
				this.apply(session, status);
			}
			return { ...session.snapshot };
		});
	}
	confirm(id, approved, account) {
		return this.serial(async () => {
			if (typeof approved !== "boolean") throw new Error("请选择确认或拒绝连接。");
			const session = this.require(id, account);
			if (session.snapshot.status !== "pending_web_confirm") throw new Error("手机连接状态已变化，请刷新后重试。");
			const status = await session.api.confirmMobile(account.accessToken, session.token, approved, session.controller.signal);
			this.apply(session, status);
			return { ...session.snapshot };
		});
	}
	require(id, account) {
		const session = this.session;
		if (!session || session.snapshot.id !== id || session.account.userId !== account.userId || session.account.apiBaseUrl !== account.apiBaseUrl || session.account.accessToken !== account.accessToken) throw new Error("二维码已失效，请重新生成。");
		if (Date.now() >= session.deadline && !finished.has(session.snapshot.status)) session.snapshot = {
			...session.snapshot,
			status: "expired",
			qrImage: null
		};
		return session;
	}
	apply(session, status) {
		session.controller.signal.throwIfAborted();
		if (this.session !== session) throw new Error("二维码已失效，请重新生成。");
		if (!statuses.has(status.status) || status.userId && status.userId !== session.account.userId) throw new Error("手机连接状态无效，请重试。");
		session.snapshot = {
			...session.snapshot,
			status: status.status,
			qrImage: status.status === "pending_scan" ? session.snapshot.qrImage : null,
			deviceName: typeof status.deviceName === "string" ? status.deviceName.slice(0, 200) : null
		};
	}
	serial(action) {
		const work = this.operations.then(action);
		this.operations = work.catch(() => void 0);
		return work;
	}
};
// src/host/onboarding/manager.ts
const RESUME_RETRY_DELAYS_MS = [
	5e3,
	15e3,
	3e4,
	6e4,
	3e5
];
/** Account tokens this close to expiry are treated as expired, matching the login check. */
const ACCOUNT_EXPIRY_MARGIN_MS = 3e4;
/** The account token no longer works, and the device credential cannot carry the connection alone. */
var AccountLoginRequired = class extends Error {
	connectorId;
	constructor(connectorId, message = "账号登录已失效，请重新登录。") {
		super(message);
		this.connectorId = connectorId;
	}
};
var OnboardingManager = class {
	config;
	dependencies;
	connectionFailure = null;
	startupDiagnostic() {
		return this.connectionFailure ? { ...this.connectionFailure } : null;
	}
	/** Connection-phase failures only; earlier errors are answered by the call that raised them. */
	recordConnectionFailure(error) {
		const status = startupFailure(error);
		const invalidState = error instanceof Error && "code" in error && error.code === "CONNECTOR_SYNC_STATE_INVALID";
		this.connectionFailure = startupFailureDiagnostic(error, "plugin", "connector.start_failed", {
			...status,
			code: invalidState ? "CONNECTOR_SYNC_STATE_INVALID" : "CONNECTOR_START_FAILED",
			message: invalidState ? "Connector 同步状态文件无效。终端输出中列出了文件路径；请在“设置 → 维护”中打开数据目录，移走该文件后重新启动 Connector。" : "Connector 连接失败，详情见下方错误信息和终端输出。"
		});
		this.diagnostics.log("error", "connector.start_failed", {}, error);
	}
	settings;
	account = null;
	binding = null;
	recovery = null;
	recoveryCheck = null;
	recoveryController = null;
	unsubscribeConnector;
	desktop = {
		status: "absent",
		message: "正在检查本机…"
	};
	stage = "idle";
	message = "登录后，将为这台电脑建立连接。";
	flow = null;
	controller = null;
	work = null;
	beginning = null;
	profileRefresh = null;
	profileCheckedAt = 0;
	profileController = new AbortController();
	releaseLock = null;
	initialized = null;
	disposed = false;
	operations = Promise.resolve();
	connector;
	detect;
	launchDesktop;
	apiFactory;
	connectorSettings;
	mobile = new MobileLogin();
	logOutput;
	diagnostics;
	roleCheck = null;
	roleTimer = null;
	resolvedUvPath = null;
	resuming = null;
	resumeController = null;
	constructor(config, dependencies = {}) {
		this.config = config;
		this.dependencies = dependencies;
		this.settings = { apiBaseUrl: config.apiBaseUrl };
		this.connectorSettings = new ConnectorSettingsStore(config, dependencies.systemLanguages);
		this.logOutput = dependencies.logOutput ?? new RpcLogOutput(512, "plugin");
		this.diagnostics = dependencies.diagnostics ?? new RuntimeDiagnostics(this.logOutput, {}, "yundashi-remote-control");
		this.connector = dependencies.connector ?? new SourceConnector(config, void 0, () => this.connectorSettings.get(), void 0, void 0, this.diagnostics, this.logOutput);
		this.detect = dependencies.detect ?? detectDesktop;
		this.launchDesktop = dependencies.launchDesktop ?? launchDesktop;
		this.apiFactory = dependencies.api ?? ((base) => new AccountApi(base));
		this.unsubscribeConnector = this.connector.onState((state) => {
			if (state.authFailed && this.binding && this.account && !this.disposed) this.checkDeviceRecovery(this.binding.connectorId);
		});
	}
	hasRuntimeLogs() {
		return this.connector.hasRuntimeLogs?.() ?? false;
	}
	get logsPath() {
		return this.connector.logsPath ?? null;
	}
	get pluginLogOutput() {
		return this.logOutput;
	}
	async readRuntimeLogs(query) {
		if (this.connector.readRuntimeLogs && this.connector.hasRuntimeLogs?.()) return this.connector.readRuntimeLogs(query);
		return {
			available: false,
			items: [],
			firstSeq: null,
			lastSeq: null,
			total: 0,
			hasMoreBefore: false,
			hasMoreAfter: false,
			logsPath: this.connector.logsPath ?? null,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	}
	initialize() {
		this.initialized ??= this.load();
		return this.initialized;
	}
	async load() {
		this.releaseLock = await acquireManagerLock(join(this.config.stateRoot, "manager.lock"), () => this.loseOwnership());
		try {
			await migrateStateRoot(this.config.stateRoot, this.config.legacyStateRoot);
			await this.refreshRole();
			await this.connectorSettings.load();
			this.resolvedUvPath = await resolveUv(this.config, this.connectorSettings.get());
			const settings = await readJson$1(join(this.config.stateRoot, "settings.json"));
			if (settings) {
				this.settings = this.validateSettings(settings);
				if (Object.keys(settings).length !== 1 || settings.apiBaseUrl !== this.settings.apiBaseUrl) await writeJson(join(this.config.stateRoot, "settings.json"), this.settings);
			}
			this.account = await readJson$1(join(this.config.stateRoot, "account.json"));
			if (!settings && this.account) {
				this.settings = this.validateSettings({ apiBaseUrl: this.account.apiBaseUrl });
				await writeJson(join(this.config.stateRoot, "settings.json"), this.settings);
			}
			if (this.account?.apiBaseUrl !== this.settings.apiBaseUrl) this.account = null;
			if (this.account) this.binding = await readBoundDevice(this.config.stateRoot, this.account);
			this.roleTimer = setInterval(() => {
				const wasBlocked = this.desktop.status !== "absent";
				this.refreshRole().then(() => {
					if (wasBlocked && !this.disposed && this.desktop.status === "absent" && this.account) this.resume();
				}).catch((error) => this.setProgress("error", safeMessage(error)));
			}, this.dependencies.rolePollIntervalMs ?? 1500);
			this.roleTimer.unref();
		} catch (error) {
			await this.releaseLock?.();
			this.releaseLock = null;
			throw error;
		}
	}
	/**
	* Starts a previously authorized device without user interaction; fresh
	* installs stay idle. It never opens a login page: the device credential
	* carries the connection when the account token has expired, and failures
	* that may pass (network not ready at boot, server restarting) are retried
	* with backoff until one attempt succeeds or the user takes over.
	*/
	resume() {
		this.resuming ??= this.resumeLoop().finally(() => {
			this.resuming = null;
		});
		return this.resuming;
	}
	async resumeLoop() {
		await this.initialize();
		const controller = new AbortController();
		this.resumeController = controller;
		const delays = this.dependencies.resumeRetryDelaysMs ?? RESUME_RETRY_DELAYS_MS;
		try {
			for (let attempt = 0;; attempt += 1) {
				if (controller.signal.aborted || this.disposed || !this.account || this.desktop.status !== "absent") return;
				try {
					await this.serial(async () => {
						if (controller.signal.aborted || this.connector.running) return;
						await this.requireStandalone();
						if (!this.account || this.recovery) return;
						await (this.dependencies.checkServer ?? checkServer)(this.settings.apiBaseUrl);
						await this.connector.prepare();
						if (controller.signal.aborted) return;
						await this.startConnector();
					});
					return;
				} catch (error) {
					if (controller.signal.aborted || this.disposed || this.desktop.status !== "absent" || this.recovery) return;
					if (!canRetryResume(error)) {
						this.setProgress("error", safeMessage(error));
						return;
					}
					const wait = delays[Math.min(attempt, delays.length - 1)] ?? RESUME_RETRY_DELAYS_MS[0];
					this.diagnostics.log("warn", "onboarding.resume_retry", {
						attempt: attempt + 1,
						delayMs: wait
					}, error);
					this.setProgress("error", `${safeMessage(error)}（${Math.ceil(wait / 1e3)} 秒后自动重试）`);
					try {
						await setTimeout$1(wait, void 0, { signal: controller.signal });
					} catch {
						return;
					}
				}
			}
		} finally {
			if (this.resumeController === controller) this.resumeController = null;
		}
	}
	/** A user action takes over from automatic startup; a pending retry must not undo it. */
	stopResume() {
		this.resumeController?.abort();
		this.resumeController = null;
	}
	unavailableSnapshot(message) {
		return {
			...this.snapshot(),
			stage: "error",
			message,
			ownership: {
				status: "error",
				message
			}
		};
	}
	async inspect() {
		await this.initialize();
		await this.refreshRole();
		if (this.desktop.status === "absent") this.refreshProfile();
		else this.mobile.clear();
		return this.snapshot();
	}
	/**
	* Hand this machine over to the Desktop app. The plugin never manages the
	* account, the device or the Connector once Desktop is installed; it only
	* publishes its DSH runtime endpoint and opens the Desktop onboarding entry.
	* Every request starts a new flow, and the URL carries no credentials and no
	* caller-supplied path or command.
	*/
	async openDesktop() {
		await this.initialize();
		if (this.disposed) throw new Error("插件已关闭。");
		await this.refreshRole();
		if (this.desktop.status !== "installed") throw new Error(this.desktop.message);
		const flowId = newDesktopFlowId();
		const url = desktopOnboardingUrl(flowId);
		try {
			await this.launchDesktop({
				executablePath: this.desktop.executablePath,
				launchArgs: this.desktop.launchArgs,
				packaged: this.desktop.packaged
			}, url);
		} catch (error) {
			throw new Error(`无法打开云大师桌面端：${error instanceof Error ? error.message : String(error)}`);
		}
		return {
			flowId,
			url
		};
	}
	refreshProfile() {
		const account = this.account;
		if (this.disposed || !account || this.accountExpired(account) || this.profileRefresh || Date.now() - this.profileCheckedAt < 6e4) return;
		this.profileCheckedAt = Date.now();
		this.profileRefresh = this.apiFactory(account.apiBaseUrl).me(account.accessToken, this.profileController.signal).then((user) => this.serial(async () => {
			if (this.disposed || this.account !== account || user.userId !== account.userId) return;
			this.account = {
				...account,
				...publicProfile(user)
			};
			await writeJson(join(this.config.stateRoot, "account.json"), this.account);
		})).catch((error) => error instanceof ApiError && error.status === 401 ? this.serial(() => this.markAccountExpired(account)).catch(() => void 0) : void 0).finally(() => {
			this.profileRefresh = null;
		});
	}
	begin(input) {
		this.stopResume();
		const key = JSON.stringify(input ?? null);
		if (this.beginning) return this.beginning.key === key ? this.beginning.promise : Promise.reject(/* @__PURE__ */ new Error("正在开始另一次登录，请稍候。"));
		const promise = this.serial(() => this.startFlow(input)).finally(() => {
			this.beginning = null;
		});
		this.beginning = {
			key,
			promise
		};
		return promise;
	}
	async startFlow(input) {
		await this.initialize();
		if (this.disposed) throw new Error("插件已关闭。");
		if (input && input.target !== "cloud" && input.target !== "server") throw new Error("请选择云端或自建服务器。");
		const next = this.validateSettings({ apiBaseUrl: input?.target === "cloud" ? this.config.apiBaseUrl : input?.target === "server" ? input.serverUrl : this.settings.apiBaseUrl });
		await this.requireStandalone();
		await (this.dependencies.checkServer ?? checkServer)(next.apiBaseUrl);
		if (this.disposed) throw new Error("插件已关闭。");
		await this.connector.prepare();
		if (this.disposed) throw new Error("插件已关闭。");
		await this.requireStandalone();
		if (next.apiBaseUrl !== this.settings.apiBaseUrl) await this.logoutFlow();
		else await this.cancelFlow();
		await writeJson(join(this.config.stateRoot, "settings.json"), next);
		this.settings = next;
		const controller = new AbortController();
		this.controller = controller;
		const flow = new LoopbackFlow((code) => this.launch(flow, controller, code), (message) => {
			controller.abort();
			this.setProgress("error", message);
		});
		this.flow = flow;
		await flow.listen();
		this.setProgress("authorizing", "请在浏览器登录并授权。");
		if (this.account && this.account.expiresAt > Date.now() + 3e4) try {
			const user = await this.apiFactory(this.settings.apiBaseUrl).me(this.account.accessToken, controller.signal);
			controller.signal.throwIfAborted();
			if (user.userId !== this.account.userId) throw new Error("账号发生变化，请重新登录。");
			this.account = {
				...this.account,
				...publicProfile(user)
			};
			this.profileCheckedAt = Date.now();
			await writeJson(join(this.config.stateRoot, "account.json"), this.account);
			await this.requireStandalone();
			controller.signal.throwIfAborted();
			this.launch(flow, controller);
			return { url: flow.progressUrl };
		} catch (error) {
			if (this.desktop.status !== "absent") throw new Error(this.desktop.message);
			if (!(error instanceof ApiError) || error.status !== 401) {
				this.setProgress("error", safeMessage(error));
				throw error;
			}
			await this.markAccountExpired(this.account);
		}
		return { url: flow.authorizationUrl(resolveOAuthWebOrigin(this.settings.apiBaseUrl, this.config.anywhereWebUrl)) };
	}
	launch(flow, controller, code) {
		this.work = this.connect(flow, controller.signal, code).catch(async (error) => {
			if (this.flow === flow && !controller.signal.aborted) await this.connectionFailed(error);
			await this.connector.stop();
		});
	}
	async connect(flow, signal, code) {
		await this.requireStandalone();
		signal.throwIfAborted();
		const api = this.apiFactory(this.settings.apiBaseUrl);
		if (code) {
			this.mobile.clear();
			const account = await api.exchange(code, flow.verifier, flow.redirectUri, signal);
			signal.throwIfAborted();
			if (this.account?.userId !== account.userId) await this.connector.stop();
			this.account = account;
			this.profileCheckedAt = Date.now();
			await writeJson(join(this.config.stateRoot, "account.json"), account);
		}
		const account = this.account;
		if (!account) throw new Error("请先完成登录。");
		signal.throwIfAborted();
		this.setProgress("pairing", "登录成功，正在连接本机设备…");
		const previousId = this.binding?.connectorId;
		this.binding = await ensureBinding(this.config.stateRoot, account, api, signal, {
			...this.dependencies.machineState ? { machineState: this.dependencies.machineState } : {},
			renew: Boolean(code)
		});
		if (previousId && previousId !== this.binding.connectorId) await this.connector.stop();
		this.recovery = null;
		await this.requireStandalone();
		signal.throwIfAborted();
		this.setProgress("starting", "正在启动本机连接，首次准备运行环境可能需要几分钟…");
		await this.connector.start(this.binding, this.settings.apiBaseUrl, signal);
		await this.waitOnline(api, account, this.binding.connectorId, signal);
		signal.throwIfAborted();
		const redirectUrl = resolveOnboardingUrl(this.settings.apiBaseUrl, this.binding.connectorId, flow.id, this.config.anywhereWebUrl);
		this.stage = "ready";
		this.message = "设备已上线，正在继续 Web 引导…";
		flow.update({
			stage: "ready",
			message: this.message,
			redirectUrl
		});
	}
	async waitOnline(api, account, id, signal) {
		const deadline = Date.now() + (this.dependencies.onlineTimeoutMs ?? 12e4);
		for (;;) {
			signal.throwIfAborted();
			await this.connector.assertHealthy();
			try {
				const device = await api.device(account.accessToken, id, signal);
				if (device.userId !== account.userId) throw new Error("设备归属与当前账号不一致。");
				if (device.status === "online") break;
			} catch (error) {
				if (!(error instanceof ApiError) || error.status < 500) throw error;
			}
			if (Date.now() >= deadline) throw new Error("设备暂未上线，请检查网络后在插件中重试。");
			await setTimeout$1(this.dependencies.pollIntervalMs ?? 1e3, void 0, { signal });
		}
	}
	setRecovery(connectorId, status, message) {
		this.recovery = {
			connectorId,
			status,
			message
		};
		this.setProgress("error", message);
	}
	checkDeviceRecovery(id) {
		if (this.recoveryCheck) return this.recoveryCheck;
		const account = this.account;
		if (!account || this.disposed) return Promise.resolve();
		const controller = new AbortController();
		this.recoveryController = controller;
		this.setRecovery(id, "checking", "本机连接已中断，正在检查设备状态…");
		const task = (async () => {
			try {
				const device = await this.apiFactory(account.apiBaseUrl).device(account.accessToken, id, controller.signal);
				controller.signal.throwIfAborted();
				if (device.userId !== account.userId) throw new Error("设备归属与当前账号不一致。");
				this.setRecovery(id, "disconnected", new DeviceRecoveryRequired(id, "disconnected").message);
			} catch (error) {
				if (controller.signal.aborted || this.disposed) return;
				if (error instanceof ApiError && error.status === 404) this.setRecovery(id, "deleted", new DeviceRecoveryRequired(id, "deleted").message);
				else if (error instanceof ApiError && error.status === 401) {
					await this.markAccountExpired(account);
					this.setRecovery(id, "login_required", "账号登录已失效，请重新登录后恢复设备连接。");
				} else this.setRecovery(id, "unavailable", "暂时无法确认设备状态，请检查网络后重试。");
			}
		})().finally(() => {
			if (this.recoveryCheck === task) {
				this.recoveryCheck = null;
				this.recoveryController = null;
			}
		});
		this.recoveryCheck = task;
		return task;
	}
	async connectionFailed(error) {
		this.recordConnectionFailure(error);
		if (error instanceof DeviceRecoveryRequired) this.setRecovery(error.connectorId, error.reason, error.message);
		else if (error instanceof AccountLoginRequired && error.connectorId) this.setRecovery(error.connectorId, "login_required", error.message);
		else if (error instanceof ConnectorCredentialError && this.binding) await this.checkDeviceRecovery(this.binding.connectorId);
		else if (error instanceof ApiError && error.status === 401 && this.binding) this.setRecovery(this.binding.connectorId, "login_required", "账号登录已失效，请重新登录后恢复设备连接。");
		else if (!this.recovery) this.setProgress("error", safeMessage(error));
	}
	recoverDevice(action) {
		this.stopResume();
		return this.serial(async () => {
			await this.initialize();
			if (this.disposed) throw new Error("插件已关闭。");
			await this.requireStandalone();
			const recovery = this.recovery, account = this.account;
			if (!recovery || !account) throw new Error("设备状态已变化，请重新打开插件。");
			if (action === "check") {
				await this.checkDeviceRecovery(recovery.connectorId);
				return null;
			}
			if ((action !== "reconnect" || recovery.status !== "disconnected") && (action !== "recreate" || recovery.status !== "deleted")) throw new Error("设备状态已变化，请先重新检查。");
			await this.cancelFlow();
			const controller = new AbortController();
			this.controller = controller;
			try {
				await this.connector.prepare();
				await this.connector.stop();
				await this.requireStandalone();
				controller.signal.throwIfAborted();
				this.setProgress("pairing", action === "recreate" ? "正在重新创建设备…" : "正在恢复设备连接…");
				this.binding = await recoverBinding(this.config.stateRoot, account, this.apiFactory(account.apiBaseUrl), controller.signal, recovery.connectorId, action);
				this.recovery = null;
				await this.requireStandalone();
				controller.signal.throwIfAborted();
				this.setProgress("starting", "正在启动本机连接…");
				await this.connector.start(this.binding, account.apiBaseUrl, controller.signal);
				await this.waitOnline(this.apiFactory(account.apiBaseUrl), account, this.binding.connectorId, controller.signal);
				controller.signal.throwIfAborted();
				this.setProgress("ready", "本机设备已连接。");
				if (action === "recreate") return { url: resolveOnboardingUrl(account.apiBaseUrl, this.binding.connectorId, randomUUID()) };
			} catch (error) {
				if (!controller.signal.aborted) {
					if (error instanceof DeviceRecoveryRequired || error instanceof ConnectorCredentialError) await this.connectionFailed(error);
					else {
						this.recordConnectionFailure(error);
						this.setRecovery(this.binding?.connectorId ?? recovery.connectorId, error instanceof ApiError && error.status === 401 ? "login_required" : "unavailable", error instanceof ApiError && error.status === 401 ? "账号登录已失效，请重新登录后恢复设备连接。" : "恢复连接失败，请检查设备状态后重试。");
					}
				}
				await this.connector.stop();
			} finally {
				if (this.controller === controller) this.controller = null;
			}
			return null;
		});
	}
	cancel() {
		this.stopResume();
		return this.serial(() => this.cancelFlow());
	}
	async requireStandalone() {
		await this.initialize();
		if (this.disposed) throw new Error("插件已关闭。");
		if (this.roleCheck) await this.roleCheck;
		await this.refreshRole();
		if (this.disposed) throw new Error("插件已关闭。");
		if (this.desktop.status !== "absent") {
			this.mobile.clear();
			throw new Error(this.desktop.message);
		}
	}
	requireAccount() {
		const account = this.requireSignedIn();
		if (account.expiresAt <= Date.now()) throw new Error("登录已失效，请重新登录。");
		return account;
	}
	/** Connector control needs a signed-in device, not a live account token. */
	requireSignedIn() {
		if (!this.account) throw new Error("请先在“登录和连接”中登录。");
		return this.account;
	}
	accountExpired(account) {
		return account.expiresAt <= Date.now() + ACCOUNT_EXPIRY_MARGIN_MS;
	}
	/** The server rejected this token: remember it, so the next start goes straight to the device credential. */
	async markAccountExpired(account) {
		if (this.account?.userId !== account.userId || this.account.apiBaseUrl !== account.apiBaseUrl || this.account.expiresAt === 0) return;
		this.account = {
			...this.account,
			expiresAt: 0
		};
		await writeJson(join(this.config.stateRoot, "account.json"), this.account);
	}
	controlConnector(action) {
		this.stopResume();
		if (action === "stop" && !this.disposed && this.desktop.status === "absent") this.controller?.abort();
		return this.serial(async () => {
			await this.requireStandalone();
			if (![
				"start",
				"stop",
				"restart"
			].includes(action)) throw new Error("不支持的 Connector 操作。");
			await this.cancelFlow();
			if (action === "stop") {
				await this.connector.stop();
				this.setProgress("idle", "Connector 已停止。");
			} else {
				if (this.recovery) throw new Error("请先在“登录和连接”中恢复设备连接。");
				this.requireSignedIn();
				await this.connector.prepare();
				if (action === "restart") await this.connector.stop();
				if (!this.connector.running) await this.startConnector();
			}
			return null;
		});
	}
	async startConnector() {
		await this.requireStandalone();
		if (this.disposed) throw new Error("插件已关闭。");
		const account = this.requireSignedIn();
		const controller = new AbortController();
		this.controller = controller;
		try {
			let viaAccount = !this.accountExpired(account);
			if (viaAccount) try {
				await this.startWithAccount(account, controller.signal);
			} catch (error) {
				if (controller.signal.aborted || !(error instanceof ApiError) || error.status !== 401) throw error;
				await this.markAccountExpired(account);
				viaAccount = false;
			}
			if (!viaAccount) await this.startWithDevice(account, controller.signal);
			this.setProgress("ready", "本机设备已连接。");
		} catch (error) {
			if (!controller.signal.aborted) {
				await this.connectionFailed(error);
				await this.connector.stop();
				throw error;
			}
			await this.connector.stop();
			if (this.desktop.status !== "absent") throw new Error(this.desktop.message);
		} finally {
			if (this.controller === controller) this.controller = null;
		}
	}
	async startWithAccount(account, signal) {
		const api = this.apiFactory(account.apiBaseUrl);
		this.setProgress("pairing", "正在检查本机设备…");
		this.binding = this.binding ? await verifyBoundDevice(this.binding, account, api, signal) : await ensureBinding(this.config.stateRoot, account, api, signal, { ...this.dependencies.machineState ? { machineState: this.dependencies.machineState } : {} });
		await this.requireStandalone();
		signal.throwIfAborted();
		if (this.disposed) throw new Error("插件已关闭。");
		this.setProgress("starting", "正在启动 Connector…");
		await this.connector.start(this.binding, account.apiBaseUrl, signal);
		await this.waitOnline(api, account, this.binding.connectorId, signal);
	}
	/**
	* The Connector authenticates with its own device credential, which outlives
	* the 7-day account token. Synchronization keeps running; only account
	* features (profile, device management, mobile pairing) wait for a new login.
	*/
	async startWithDevice(account, signal) {
		const binding = this.binding ?? await readBoundDevice(this.config.stateRoot, account);
		if (!binding) throw new AccountLoginRequired(null);
		this.setProgress("pairing", "正在检查本机设备…");
		if (!await this.apiFactory(account.apiBaseUrl).verifyConnector(binding.connectorId, binding.connectorToken, signal)) throw new AccountLoginRequired(binding.connectorId, "本机设备凭据已失效，且账号登录已过期，请重新登录后恢复连接。");
		this.binding = binding;
		await this.requireStandalone();
		signal.throwIfAborted();
		if (this.disposed) throw new Error("插件已关闭。");
		this.setProgress("starting", "正在启动 Connector…");
		await this.connector.start(binding, account.apiBaseUrl, signal);
		await this.connector.assertHealthy();
	}
	saveConnectorSettings(input) {
		return this.serial(async () => {
			await this.requireStandalone();
			if (this.stage === "authorizing" || this.stage === "pairing" || this.stage === "starting") throw new Error("连接正在进行，请完成或取消后再保存设置。");
			const next = validateConnectorSettings(input);
			const previous = this.connectorSettings.get();
			if (JSON.stringify(next) === JSON.stringify(previous)) return null;
			const restart = this.connector.running;
			if (restart) this.requireSignedIn();
			if (restart || next.uvPath !== previous.uvPath) await this.connector.prepare(next);
			if (this.disposed) throw new Error("插件已关闭。");
			await this.connectorSettings.save(next);
			this.resolvedUvPath = await resolveUv(this.config, next);
			if (restart) {
				await this.cancelFlow();
				await this.connector.stop();
				await this.startConnector();
			}
			return null;
		});
	}
	async openConnectorFolder(folder, fallbackLogsPath) {
		await this.requireStandalone();
		if (folder !== "data" && folder !== "logs") throw new Error("不支持的目录。");
		if (folder === "data") {
			await (this.dependencies.openFolder ?? openFolder)(join(this.config.stateRoot, "connector"));
			return null;
		}
		const logsPath = await this.connector.resolveLogsPath?.() ?? this.connector.logsPath ?? fallbackLogsPath ?? null;
		if (!logsPath) throw new Error("Connector 尚未就绪，暂未获取到日志目录。");
		await (this.dependencies.openFolder ?? openFolder)(logsPath);
		return null;
	}
	resetConnector(forceLocal) {
		this.stopResume();
		return this.serial(async () => {
			await this.requireStandalone();
			if (typeof forceLocal !== "boolean") throw new Error("重置参数无效。");
			if (this.binding && this.account && !forceLocal) try {
				await this.apiFactory(this.account.apiBaseUrl).renewConnector(this.account.accessToken, this.binding.connectorId, this.profileController.signal);
			} catch (error) {
				if (!(error instanceof ApiError) || error.status !== 404) throw new Error(`无法撤销设备连接。${safeMessage(error)}`);
			}
			await this.cancelFlow();
			this.mobile.clear();
			await this.connector.stop();
			this.account = null;
			this.binding = null;
			this.recovery = null;
			this.profileCheckedAt = 0;
			for (const path of [
				"account.json",
				"settings.json",
				"bindings",
				"connector",
				"logs"
			]) await rm(join(this.config.stateRoot, path), {
				force: true,
				recursive: true
			});
			this.settings = { apiBaseUrl: this.config.apiBaseUrl };
			await this.connectorSettings.reset();
			this.resolvedUvPath = await resolveUv(this.config, this.connectorSettings.get());
			this.setProgress("idle", "已恢复出厂设置，请重新登录。");
			return null;
		});
	}
	/** Rebuilds the Connector's dependency environment; account, device binding and settings stay. */
	resetConnectorEnvironment() {
		this.stopResume();
		if (!this.disposed && this.desktop.status === "absent") this.controller?.abort();
		return this.serial(async () => {
			await this.requireStandalone();
			await this.cancelFlow();
			await this.connector.resetEnvironment();
			if (this.recovery || !this.account) {
				this.setProgress("idle", "依赖环境已清空，下次连接时会重新安装。");
				return null;
			}
			await this.connector.prepare();
			await this.startConnector();
			return null;
		});
	}
	createMobileLogin() {
		return this.serial(async () => {
			await this.requireStandalone();
			const account = this.requireAccount();
			return this.mobile.create(account, this.apiFactory(account.apiBaseUrl));
		});
	}
	async inspectMobileLogin(id) {
		await this.requireStandalone();
		return this.mobile.inspect(id, this.requireAccount());
	}
	async confirmMobileLogin(id, approved) {
		await this.requireStandalone();
		return this.mobile.confirm(id, approved, this.requireAccount());
	}
	async cancelFlow() {
		this.recoveryController?.abort();
		this.recoveryCheck = null;
		this.recoveryController = null;
		this.controller?.abort();
		if (this.work) await this.work;
		this.work = null;
		this.controller = null;
		if (this.flow) await this.flow.close();
		this.flow = null;
		if (this.stage !== "ready" && !this.recovery) this.setProgress("idle", "可以重新开始连接。");
	}
	logout() {
		this.stopResume();
		this.mobile.clear();
		return this.serial(async () => {
			await this.initialize();
			if (this.disposed) throw new Error("插件已关闭。");
			await this.logoutFlow();
		});
	}
	async logoutFlow() {
		this.mobile.clear();
		await this.cancelFlow();
		await this.connector.stop();
		this.account = null;
		this.profileCheckedAt = 0;
		this.binding = null;
		this.recovery = null;
		await rm(join(this.config.stateRoot, "account.json"), { force: true });
		this.setProgress("idle", "已退出登录，本机连接已停止。");
	}
	async dispose() {
		this.disposed = true;
		this.stopResume();
		if (this.roleTimer) clearInterval(this.roleTimer);
		this.roleTimer = null;
		this.mobile.clear();
		this.unsubscribeConnector();
		this.controller?.abort();
		this.profileController.abort();
		await this.profileRefresh;
		await this.roleCheck;
		await this.serial(async () => {
			await this.initialized?.catch(() => void 0);
			try {
				await this.cancelFlow();
				await this.connector.stop();
			} finally {
				await this.releaseLock?.();
				this.releaseLock = null;
			}
		});
	}
	loseOwnership() {
		this.disposed = true;
		this.stopResume();
		if (this.roleTimer) clearInterval(this.roleTimer);
		this.roleTimer = null;
		this.mobile.clear();
		this.controller?.abort();
		this.profileController.abort();
		this.releaseLock = null;
		const report = () => this.setProgress("error", "本机管理锁已失效，连接已停止。请重新加载插件。");
		this.serial(async () => {
			try {
				await this.cancelFlow();
				await this.connector.stop();
			} finally {
				report();
			}
		}).catch(report);
	}
	refreshRole() {
		if (this.disposed) return Promise.resolve();
		this.roleCheck ??= (async () => {
			const desktop = await this.detect();
			if (this.disposed) return;
			this.desktop = desktop;
			if (desktop.status === "absent") return;
			this.controller?.abort();
			this.recoveryController?.abort();
			this.mobile.clear();
			const shouldStopConnector = this.connector.running || Boolean(this.controller) || this.stage === "starting";
			const wasActive = shouldStopConnector || Boolean(this.flow) || this.stage !== "idle";
			if (shouldStopConnector) await this.connector.stop();
			const flow = this.flow;
			this.flow = null;
			if (flow) await flow.close();
			if (wasActive || this.message !== desktop.message) this.setProgress("idle", desktop.message);
		})().finally(() => {
			this.roleCheck = null;
		});
		return this.roleCheck;
	}
	validateSettings(settings) {
		return { apiBaseUrl: normalizeServerOrigin(settings.apiBaseUrl) };
	}
	serial(action) {
		const operation = this.operations.then(action);
		this.operations = operation.catch(() => void 0);
		return operation;
	}
	setProgress(stage, message) {
		if (stage === "ready" || stage === "idle" && !this.account) this.connectionFailure = null;
		const changed = this.stage !== stage || this.message !== message;
		this.stage = stage;
		this.message = message;
		if (changed) this.diagnostics.log(stage === "error" ? "warn" : "info", "onboarding.stage", { stage });
		this.flow?.update({
			stage,
			message
		});
	}
	snapshot() {
		return {
			...Boolean(this.config.productName || this.config.shortName || this.config.anywhereWebUrl) ? { brand: {
				...this.config.productName ? { productName: this.config.productName } : {},
				...this.config.shortName ? { shortName: this.config.shortName } : {}
			} } : {},
			desktop: this.desktop,
			settings: { ...this.settings },
			stage: this.stage,
			message: this.message,
			account: this.account ? publicProfile(this.account) : null,
			accountExpired: Boolean(this.account && this.accountExpired(this.account)),
			webAppUrl: resolveWebAppUrl(this.settings.apiBaseUrl, this.config.anywhereWebUrl),
			connectorId: this.binding?.connectorId ?? null,
			connectorRunning: this.connector.running,
			flowId: this.flow?.id ?? null,
			deviceRecovery: this.recovery ? { ...this.recovery } : null,
			connector: {
				settings: this.connectorSettings.get(),
				resolvedUvPath: this.resolvedUvPath,
				dataPath: join(this.config.stateRoot, "connector"),
				logsPath: this.connector.logsPath ?? "",
				canOpenFolders: canOpenFolders(),
				deviceName: this.binding?.name ?? null,
				lastError: this.connector.lastError ?? null
			}
		};
	}
};
/** Only failures that can pass on their own are retried; everything else waits for the user. */
function canRetryResume(error) {
	if (error instanceof ApiError) return error.status >= 500 || error.status === 408 || error.status === 429;
	if (error instanceof DeviceRecoveryRequired || error instanceof ConnectorCredentialError || error instanceof AccountLoginRequired || error instanceof ConnectorOwnershipError) return false;
	if (error instanceof Error && "code" in error && error.code === "CONNECTOR_SYNC_STATE_INVALID") return false;
	return !(error instanceof Error && error.message === "插件已关闭。");
}
function safeMessage(error) {
	if (error instanceof TypeError) return "无法连接服务，请检查网络和连接地址。";
	return error instanceof Error ? error.message : "连接失败，请重试。";
}
// src/host/rpc/service.ts
var __runInitializers$1 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$1 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Uses the rc.1 public Typert Gateway; no Desktop IPC or DSH Agent services. */
let OnboardingService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _inspect_decorators;
	let _restartBridge_decorators;
	let _openDesktop_decorators;
	let _readRuntimeLogs_decorators;
	let _readBridgeLogs_decorators;
	let _readConnectorLogs_decorators;
	let _readStartupDiagnostics_decorators;
	let _begin_decorators;
	let _cancel_decorators;
	let _logout_decorators;
	let _recoverDevice_decorators;
	let _controlConnector_decorators;
	let _saveConnectorSettings_decorators;
	let _openConnectorFolder_decorators;
	let _resetConnector_decorators;
	let _resetConnectorEnvironment_decorators;
	let _createMobileLogin_decorators;
	let _inspectMobileLogin_decorators;
	let _confirmMobileLogin_decorators;
	let _selection_decorators;
	return class OnboardingService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_inspect_decorators = [Remote("inspect")];
			_restartBridge_decorators = [Remote("restartBridge")];
			_openDesktop_decorators = [Remote("openDesktop")];
			_readRuntimeLogs_decorators = [Remote("readRuntimeLogs")];
			_readBridgeLogs_decorators = [Remote("readBridgeLogs")];
			_readConnectorLogs_decorators = [Remote("readConnectorLogs")];
			_readStartupDiagnostics_decorators = [Remote("readStartupDiagnostics")];
			_begin_decorators = [Remote("begin")];
			_cancel_decorators = [Remote("cancel")];
			_logout_decorators = [Remote("logout")];
			_recoverDevice_decorators = [Remote("recoverDevice")];
			_controlConnector_decorators = [Remote("controlConnector")];
			_saveConnectorSettings_decorators = [Remote("saveConnectorSettings")];
			_openConnectorFolder_decorators = [Remote("openConnectorFolder")];
			_resetConnector_decorators = [Remote("resetConnector")];
			_resetConnectorEnvironment_decorators = [Remote("resetConnectorEnvironment")];
			_createMobileLogin_decorators = [Remote("createMobileLogin")];
			_inspectMobileLogin_decorators = [Remote("inspectMobileLogin")];
			_confirmMobileLogin_decorators = [Remote("confirmMobileLogin")];
			_selection_decorators = [Remote("selection")];
			__esDecorate$1(this, null, _inspect_decorators, {
				kind: "method",
				name: "inspect",
				static: false,
				private: false,
				access: {
					has: (obj) => "inspect" in obj,
					get: (obj) => obj.inspect
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _restartBridge_decorators, {
				kind: "method",
				name: "restartBridge",
				static: false,
				private: false,
				access: {
					has: (obj) => "restartBridge" in obj,
					get: (obj) => obj.restartBridge
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _openDesktop_decorators, {
				kind: "method",
				name: "openDesktop",
				static: false,
				private: false,
				access: {
					has: (obj) => "openDesktop" in obj,
					get: (obj) => obj.openDesktop
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _readRuntimeLogs_decorators, {
				kind: "method",
				name: "readRuntimeLogs",
				static: false,
				private: false,
				access: {
					has: (obj) => "readRuntimeLogs" in obj,
					get: (obj) => obj.readRuntimeLogs
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _readBridgeLogs_decorators, {
				kind: "method",
				name: "readBridgeLogs",
				static: false,
				private: false,
				access: {
					has: (obj) => "readBridgeLogs" in obj,
					get: (obj) => obj.readBridgeLogs
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _readConnectorLogs_decorators, {
				kind: "method",
				name: "readConnectorLogs",
				static: false,
				private: false,
				access: {
					has: (obj) => "readConnectorLogs" in obj,
					get: (obj) => obj.readConnectorLogs
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _readStartupDiagnostics_decorators, {
				kind: "method",
				name: "readStartupDiagnostics",
				static: false,
				private: false,
				access: {
					has: (obj) => "readStartupDiagnostics" in obj,
					get: (obj) => obj.readStartupDiagnostics
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _begin_decorators, {
				kind: "method",
				name: "begin",
				static: false,
				private: false,
				access: {
					has: (obj) => "begin" in obj,
					get: (obj) => obj.begin
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _cancel_decorators, {
				kind: "method",
				name: "cancel",
				static: false,
				private: false,
				access: {
					has: (obj) => "cancel" in obj,
					get: (obj) => obj.cancel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _logout_decorators, {
				kind: "method",
				name: "logout",
				static: false,
				private: false,
				access: {
					has: (obj) => "logout" in obj,
					get: (obj) => obj.logout
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _recoverDevice_decorators, {
				kind: "method",
				name: "recoverDevice",
				static: false,
				private: false,
				access: {
					has: (obj) => "recoverDevice" in obj,
					get: (obj) => obj.recoverDevice
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _controlConnector_decorators, {
				kind: "method",
				name: "controlConnector",
				static: false,
				private: false,
				access: {
					has: (obj) => "controlConnector" in obj,
					get: (obj) => obj.controlConnector
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _saveConnectorSettings_decorators, {
				kind: "method",
				name: "saveConnectorSettings",
				static: false,
				private: false,
				access: {
					has: (obj) => "saveConnectorSettings" in obj,
					get: (obj) => obj.saveConnectorSettings
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _openConnectorFolder_decorators, {
				kind: "method",
				name: "openConnectorFolder",
				static: false,
				private: false,
				access: {
					has: (obj) => "openConnectorFolder" in obj,
					get: (obj) => obj.openConnectorFolder
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _resetConnector_decorators, {
				kind: "method",
				name: "resetConnector",
				static: false,
				private: false,
				access: {
					has: (obj) => "resetConnector" in obj,
					get: (obj) => obj.resetConnector
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _resetConnectorEnvironment_decorators, {
				kind: "method",
				name: "resetConnectorEnvironment",
				static: false,
				private: false,
				access: {
					has: (obj) => "resetConnectorEnvironment" in obj,
					get: (obj) => obj.resetConnectorEnvironment
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _createMobileLogin_decorators, {
				kind: "method",
				name: "createMobileLogin",
				static: false,
				private: false,
				access: {
					has: (obj) => "createMobileLogin" in obj,
					get: (obj) => obj.createMobileLogin
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _inspectMobileLogin_decorators, {
				kind: "method",
				name: "inspectMobileLogin",
				static: false,
				private: false,
				access: {
					has: (obj) => "inspectMobileLogin" in obj,
					get: (obj) => obj.inspectMobileLogin
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _confirmMobileLogin_decorators, {
				kind: "method",
				name: "confirmMobileLogin",
				static: false,
				private: false,
				access: {
					has: (obj) => "confirmMobileLogin" in obj,
					get: (obj) => obj.confirmMobileLogin
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _selection_decorators, {
				kind: "method",
				name: "selection",
				static: false,
				private: false,
				access: {
					has: (obj) => "selection" in obj,
					get: (obj) => obj.selection
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static Config = Config;
		manager = __runInitializers$1(this, _instanceExtraInitializers);
		makeManager;
		managerFailure = null;
		managerFailureSnapshot = null;
		recovery;
		disposed = false;
		pluginLogOutput = new RpcLogOutput(512, "plugin");
		diagnostics;
		logsDirectory;
		constructor(ctx, config) {
			super(ctx, HOST_NAMESPACE);
			this.logsDirectory = join(stateRoot(config), "logs");
			this.diagnostics = onboardingDiagnostics(ctx.logger("yundashi-remote-control"), this.logsDirectory, this.pluginLogOutput);
			this.makeManager = () => new OnboardingManager(resolveConfig(config), {
				diagnostics: this.diagnostics,
				logOutput: this.pluginLogOutput
			});
			this.manager = this.makeManager();
			ctx.effect(() => async () => {
				this.disposed = true;
				await this.recovery;
				await this.manager.dispose();
				await this.diagnostics.flush();
			}, "yundashiRemoteControl.dispose");
		}
		async [Service.init]() {
			try {
				await this.manager.initialize();
				this.managerFailure = null;
				this.managerFailureSnapshot = null;
			} catch (error) {
				this.managerFailure = startupFailure(error);
				this.managerFailureSnapshot = startupFailureDiagnostic(error, "plugin", "onboarding.start_failed", this.managerFailure);
				this.diagnostics.log("error", "onboarding.start_failed", { code: this.managerFailure.code }, error);
				return;
			}
			this.manager.resume().catch(() => void 0);
		}
		async inspect() {
			if (this.managerFailure) return {
				...this.manager.unavailableSnapshot(this.managerFailure.message),
				bridge: this.managerFailure
			};
			const snapshot = await this.manager.inspect();
			const runtime = this.ctx.get("yundashiRemoteRuntime");
			const logsPath = snapshot.connector.logsPath || runtime?.logsPath || "";
			return {
				...snapshot,
				connector: {
					...snapshot.connector,
					logsPath
				},
				bridge: runtime?.status() ?? unavailableBridge
			};
		}
		restartBridge() {
			if (this.recovery) return this.recovery;
			this.recovery = (async () => {
				if (this.managerFailure) {
					await this.manager.dispose();
					if (this.disposed) return unavailableBridge;
					this.manager = this.makeManager();
					await this[Service.init]();
					if (this.managerFailure) return this.managerFailure;
				}
				return this.ctx.get("yundashiRemoteRuntime")?.restart() ?? unavailableBridge;
			})().finally(() => {
				this.recovery = void 0;
			});
			return this.recovery;
		}
		openDesktop() {
			return this.manager.openDesktop();
		}
		async readRuntimeLogs(query) {
			const runtime = this.ctx.get("yundashiRemoteRuntime");
			if (this.manager.hasRuntimeLogs()) return this.manager.readRuntimeLogs(query);
			if (runtime?.hasLogConnection()) return runtime.readRuntimeLogs(query, this.pluginLogOutput);
			return {
				available: false,
				items: [],
				firstSeq: null,
				lastSeq: null,
				total: 0,
				hasMoreBefore: false,
				hasMoreAfter: false,
				logsPath: this.manager.logsPath ?? runtime?.logsPath ?? null,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
		}
		async readBridgeLogs() {
			const runtime = this.ctx.get("yundashiRemoteRuntime");
			if (runtime?.hasLogConnection()) return runtime.readBridgeLogs();
			if (this.manager.hasRuntimeLogs()) {
				const page = await this.manager.readRuntimeLogs({ source: "bridge" });
				return {
					entries: page.items.map((item) => ({
						id: String(item.seq),
						time: item.time,
						level: item.level,
						event: item.message,
						details: item.details ?? "{}",
						...item.method ? { method: item.method } : {},
						...item.outcome ? { outcome: item.outcome } : {}
					})),
					updatedAt: page.updatedAt
				};
			}
			return {
				entries: [],
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
		}
		readConnectorLogs(query) {
			return readConnectorLogs(this.logsDirectory, query);
		}
		async readStartupDiagnostics() {
			const bridgeFailure = this.ctx.get("yundashiRemoteRuntime")?.startupDiagnostic();
			return [
				this.managerFailureSnapshot,
				this.manager.startupDiagnostic(),
				bridgeFailure
			].filter((entry) => Boolean(entry)).map((entry) => ({ ...entry }));
		}
		begin(input) {
			return this.manager.begin(input);
		}
		async cancel() {
			await this.manager.cancel();
			return null;
		}
		async logout() {
			await this.manager.logout();
			return null;
		}
		recoverDevice(action) {
			return this.manager.recoverDevice(action);
		}
		controlConnector(action) {
			return this.manager.controlConnector(action);
		}
		saveConnectorSettings(settings) {
			return this.manager.saveConnectorSettings(settings);
		}
		openConnectorFolder(folder) {
			return this.manager.openConnectorFolder(folder, this.ctx.get("yundashiRemoteRuntime")?.logsPath);
		}
		resetConnector(forceLocal) {
			return this.manager.resetConnector(forceLocal);
		}
		resetConnectorEnvironment() {
			return this.manager.resetConnectorEnvironment();
		}
		createMobileLogin() {
			return this.manager.createMobileLogin();
		}
		inspectMobileLogin(id) {
			return this.manager.inspectMobileLogin(id);
		}
		confirmMobileLogin(id, approved) {
			return this.manager.confirmMobileLogin(id, approved);
		}
		async selection(input) {
			this.ctx.get("yundashiRemoteRuntime")?.native.presence.report(input.clientId, input.revision, input.current);
			return null;
		}
	};
})();
// src/host/generated/dsh-sync.ts
const IngestResultSchema = {
	"properties": { "ok": {
		"default": true,
		"title": "Ok",
		"type": "boolean"
	} },
	"title": "IngestResult",
	"type": "object"
};
const CheckpointResultSchema = {
	"properties": { "checkpoint": {
		"anyOf": [{
			"additionalProperties": true,
			"type": "object"
		}, { "type": "null" }],
		"default": null,
		"title": "Checkpoint"
	} },
	"title": "CheckpointResult",
	"type": "object"
};
const SnapshotResultSchema = {
	"description": "``accepted`` is false for a permanently refused capture (the session is quarantined).",
	"properties": {
		"accepted": {
			"title": "Accepted",
			"type": "boolean"
		},
		"quarantined": {
			"default": false,
			"title": "Quarantined",
			"type": "boolean"
		},
		"reason": {
			"anyOf": [{ "type": "string" }, { "type": "null" }],
			"default": null,
			"title": "Reason"
		}
	},
	"required": ["accepted"],
	"title": "SnapshotResult",
	"type": "object"
};
/**
* Event batches and checkpoints from the DSH plugin.
*/
var SyncServiceClient = class SyncServiceClient {
	rpc;
	constructor(rpc) {
		this.rpc = rpc;
	}
	withOptions(options) {
		return new SyncServiceClient(this.rpc.withOptions(options));
	}
	/**
	* Ingest one batch of a subscription; returning is its acknowledgement.
	*/
	ingestBatch(batch, options) {
		return this.rpc.unary("aa.dsh.v2.Sync", "ingestBatch", { batch }, {
			idempotent: true,
			...options,
			responseSchema: IngestResultSchema
		});
	}
	/**
	* The checkpoint the Connector stored for one native session.
	*/
	loadCheckpoint(subscriptionId, externalSessionId, options) {
		return this.rpc.unary("aa.dsh.v2.Sync", "loadCheckpoint", {
			subscriptionId,
			externalSessionId
		}, {
			idempotent: true,
			...options,
			responseSchema: CheckpointResultSchema
		});
	}
	/**
	* Store a checkpoint; withheld for a quarantined session.
	*/
	saveCheckpoint(subscriptionId, externalSessionId, checkpoint, options) {
		return this.rpc.unary("aa.dsh.v2.Sync", "saveCheckpoint", {
			subscriptionId,
			externalSessionId,
			checkpoint
		}, {
			idempotent: true,
			...options,
			responseSchema: IngestResultSchema
		});
	}
	/**
	* Drop a checkpoint; the next baseline is a full capture.
	*/
	deleteCheckpoint(subscriptionId, externalSessionId, options) {
		return this.rpc.unary("aa.dsh.v2.Sync", "deleteCheckpoint", {
			subscriptionId,
			externalSessionId
		}, {
			idempotent: true,
			...options,
			responseSchema: IngestResultSchema
		});
	}
	/**
	* Assemble a paged snapshot; the call returning means it was stored or quarantined.
	*/
	ingestSnapshot(request, items, options) {
		return this.rpc.clientStream("aa.dsh.v2.Sync", "ingestSnapshot", { request }, items, {
			idempotent: true,
			...options,
			responseSchema: SnapshotResultSchema
		});
	}
};
// src/host/dsh-runtime/action-cards.ts
/**
* DSH 0.2.3 offers action cards (for example, enabling an official plugin) through a fenced block whose language is
* `action-card`, written at the end of an answer. DSH's chat hides the block and shows the card below the answer.
* AA has no card surface, so synced answers drop these blocks instead of showing their JSON.
*
* The scan mirrors `actionCardFences` of `@deepseek-ai/dsh-action-cards` (0.2.3-alpha.2), with which the DSH Host
* reads cards, so exactly the blocks DSH treats as cards disappear. It is copied rather than imported: older DSH
* runtimes neither ship that export nor write these blocks.
*/
/** Language of a block that offers a card, matched after lowercasing as DSH does. */
const ACTION_CARD_FENCE = "action-card";
/** Up to three spaces, optionally the marker of the list item the fence starts, then the fence and its info string. */
const OPENING = /^( {0,3})((?:[-+*]|\d{1,9}[.)]) {1,4})?(`{3,}|~{3,})(.*)$/u;
/** Lowercased leading letters, digits, `_` and `-` of an info string's first word. */
function languageOf(info) {
	return info.trim().replace(/[^\w-][\s\S]*$/u, "").toLowerCase();
}
/** The fence a line opens, or undefined when the line opens none. */
function opened(line) {
	const opening = OPENING.exec(line);
	if (opening === null) return void 0;
	const indent = String(opening[1]);
	const item = opening[2];
	const marker = String(opening[3]);
	const info = String(opening[4]);
	if (marker.startsWith("`") && info.includes("`")) return void 0;
	const closingIndent = (item === void 0 ? 0 : indent.length + item.length) + 3;
	return {
		closing: new RegExp(`^ {0,${String(closingIndent)}}${marker.charAt(0)}{${String(marker.length)},}[ \\t]*$`, "u"),
		card: languageOf(info) === ACTION_CARD_FENCE
	};
}
/**
* Answer text without its `action-card` blocks, opening and closing lines included. A fence opens with at least
* three backticks or tildes after at most three spaces, optionally after the marker of the list item it starts, and
* closes at a line of the same character at least as long. An unclosed card block runs to the end of the text, so a
* streaming answer never shows the card JSON. Blocks in block quotes, indented four or more spaces, or inside
* another fence are kept, as DSH does not read them.
* @param text - one text block of an assistant message.
* @returns the text itself when it has no card block; otherwise the remaining lines, trailing whitespace removed.
*/
function withoutActionCards(text) {
	if (!/action-card/iu.test(text)) return text;
	const kept = [];
	let fence;
	let removed = false;
	for (const part of text.split(/(?<=\n)/u)) {
		const line = part.replace(/\r?\n$/u, "");
		if (fence === void 0) {
			fence = opened(line);
			if (fence?.card) removed = true;
			else kept.push(part);
		} else {
			if (!fence.card) kept.push(part);
			if (fence.closing.test(line)) fence = void 0;
		}
	}
	return removed ? kept.join("").trimEnd() : text;
}
// src/host/dsh-runtime/identity.ts
function digest(value) {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
function sessionId(namespace, externalId) {
	const prefix = `aa_${digest(namespace).slice(0, 16)}_`;
	if (externalId.startsWith(prefix) && /^[\w-]{1,128}$/.test(externalId.slice(prefix.length))) return externalId.slice(prefix.length);
	return `sess_dsh_${digest(`${namespace}:dsh:${externalId}`).slice(0, 24)}`;
}
function nativeSessionId(namespace, platformId) {
	if (!/^[\w-]{1,128}$/.test(platformId)) throw new Error("Invalid platform session identity");
	return `aa_${digest(namespace).slice(0, 16)}_${platformId}`;
}
function itemId(externalId, kind, businessId) {
	return `dsh_${digest(`${externalId}\0${kind}\0${businessId}`)}`;
}
function userMessageId(externalId, clientId) {
	return `aa.${digest(externalId).slice(0, 16)}.${Buffer.from(clientId).toString("base64url")}`;
}
function clientMessageId(externalId, nativeId) {
	const prefix = `aa.${digest(externalId).slice(0, 16)}.`;
	if (!nativeId.startsWith(prefix)) return;
	const value = Buffer.from(nativeId.slice(prefix.length), "base64url").toString("utf8");
	if (value && userMessageId(externalId, value) === nativeId) return value;
}
function canonicalJson(value) {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (value !== null && typeof value === "object") return `{${Object.keys(value).sort((a, b) => {
		const aa = Array.from(a, (c) => c.codePointAt(0));
		const bb = Array.from(b, (c) => c.codePointAt(0));
		for (let i = 0; i < Math.min(aa.length, bb.length); i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
		return aa.length - bb.length;
	}).map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
	if (typeof value === "number") {
		let text = JSON.stringify(value);
		if (text.includes(".") && Math.abs(value) < 1e-4 && value !== 0) text = value.toExponential();
		return text.replace(/e([+-]?)(\d+)$/, (_, sign, exponent) => `e${sign || "+"}${exponent.padStart(2, "0")}`);
	}
	return JSON.stringify(value);
}
function wireValue(value) {
	if (value !== null && typeof value === "object" && typeof value.toJSON === "function") value = value.toJSON();
	if (value === void 0 || typeof value === "function" || typeof value === "symbol") return void 0;
	if (value === null || typeof value === "boolean" || typeof value === "string") return value;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (Array.isArray(value)) return value.map((item) => wireValue(item) ?? null);
	if (typeof value === "object") {
		const result = {};
		for (const [key, item] of Object.entries(value)) {
			const normalized = wireValue(item);
			if (normalized !== void 0) result[key] = normalized;
		}
		return result;
	}
}
function contentHash(item) {
	return `sha256:${digest(canonicalJson({
		type: item.type,
		status: item.status,
		role: item.role ?? null,
		content: wireValue(item.content) ?? {}
	}))}`;
}
// src/host/dsh-runtime/attachments.ts
const IMAGE_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif"
];
/** lstat, so a symbolic link counts as present and is then refused by the staging checks. */
async function exists(path) {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if (record(error).code === "ENOENT") return false;
		throw error;
	}
}
/** The Bridge accepts opaque staging IDs, never caller-selected filesystem paths. */
function parseAttachments(value) {
	if (value == null) return [];
	if (!Array.isArray(value)) throw new BridgeError("INVALID_PARAMS", "Attachments must be an array.");
	const files = /* @__PURE__ */ new Set(), uploads = /* @__PURE__ */ new Set();
	return value.map((raw) => {
		const item = record(raw);
		if (typeof item.mediaType !== "string" || !/^[-\w.+]+\/[-\w.+]+$/.test(item.mediaType)) throw new BridgeError("INVALID_PARAMS", "Invalid attachment media type.");
		if (typeof item.fileId !== "string" || !/^file_[\w-]{1,128}$/.test(item.fileId) || typeof item.uploadId !== "string" || !/^[a-f0-9]{32}$/.test(item.uploadId) || typeof item.name !== "string" || !item.name || item.name.length > 1024 || typeof item.size !== "number" || !Number.isSafeInteger(item.size) || item.size < 0 || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256) || files.has(item.fileId) || uploads.has(item.uploadId)) throw new BridgeError("INVALID_PARAMS", "Invalid or duplicate attachment.");
		files.add(item.fileId);
		uploads.add(item.uploadId);
		return {
			fileId: item.fileId,
			uploadId: item.uploadId,
			name: item.name,
			mediaType: item.mediaType,
			size: item.size,
			sha256: item.sha256
		};
	});
}
function attachmentReferences(images) {
	return images.map(({ uploadId: _, ...reference }) => reference);
}
function attachmentFingerprint(text, images) {
	return digest(canonicalJson({
		text,
		attachments: attachmentReferences(images).map((image) => ({ ...image }))
	}));
}
function receiptKey(event) {
	if (event.type !== "user/message") return;
	const source = record(event.data.source);
	return typeof source.rpcId === "string" ? source.rpcId : event.data.id;
}
/** AA file references survive Host restarts; DSH owns the actual attachment objects. */
var RuntimeAttachments = class {
	root;
	legacyStaging;
	staging;
	/**
	* `legacyStaging` is where Connectors before 2.0.3 stage uploads: next to the legacy endpoint
	* under DSH_HOME. It is only searched for upload IDs that are not in `staging`.
	*/
	constructor(root, legacyStaging) {
		this.root = root;
		this.legacyStaging = legacyStaging;
		this.staging = join(root, "staging");
	}
	async initialize() {
		await mkdir(this.staging, {
			recursive: true,
			mode: 448
		});
	}
	/** The resolved staging directory holding `uploadId`; the primary one unless only the legacy one has it. */
	async stagingRoot(primary, uploadId) {
		if (!this.legacyStaging || await exists(join(primary, uploadId))) return primary;
		let legacy;
		try {
			legacy = await realpath(this.legacyStaging);
		} catch (error) {
			if (record(error).code === "ENOENT") return primary;
			throw error;
		}
		return await exists(join(legacy, uploadId)) ? legacy : primary;
	}
	async readReceipts(id) {
		return await readJson$1(join(this.root, "receipts", `${digest(id)}.json`)) ?? {};
	}
	/** Called under NativeRuntime's per-session write queue, before official prompt admission. */
	async remember(id, requestId, receipt) {
		const receipts = await this.readReceipts(id);
		receipts[requestId] = receipt;
		await writeJson(join(this.root, "receipts", `${digest(id)}.json`), receipts);
	}
	async prepare(images, store, signal, upload) {
		const imageFiles = images.filter((image) => IMAGE_MIME_TYPES.includes(image.mediaType));
		if (imageFiles.length !== images.length && !upload) throw new BridgeError("UNSUPPORTED_OPERATION", "File attachments require DSH 0.1.5-rc.1 or later. Update DSH and restart the plugin.");
		const limits = store.imageLimits;
		if (imageFiles.length > limits.maxImagesPerMessage || imageFiles.some((image) => image.size > limits.maxImageBytes) || imageFiles.reduce((total, image) => total + image.size, 0) > limits.maxMessageImageBytes) throw new BridgeError("INVALID_PARAMS", "Images exceed the DSH attachment size or count limits.");
		const primary = await realpath(this.staging);
		const parts = [];
		for (const image of images) {
			signal.throwIfAborted();
			const root = await this.stagingRoot(primary, image.uploadId);
			const path = join(root, image.uploadId);
			if ((await lstat(path)).isSymbolicLink()) throw new BridgeError("INVALID_PARAMS", "Attachment staging cannot use symbolic links.");
			if (dirname(await realpath(path)) !== root) throw new BridgeError("INVALID_PARAMS", "Invalid attachment staging location.");
			const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
			try {
				const stat = await file.stat();
				if (!stat.isFile() || stat.size !== image.size) throw new BridgeError("INVALID_PARAMS", "Staged attachment size does not match its upload.");
				if (IMAGE_MIME_TYPES.includes(image.mediaType)) {
					const data = await file.readFile();
					if (data.length !== image.size || createHash("sha256").update(data).digest("hex") !== image.sha256) throw new BridgeError("INVALID_PARAMS", "Staged attachment content does not match its upload.");
					parts.push({
						type: "image",
						name: image.name,
						mediaType: image.mediaType,
						data: data.toString("base64")
					});
				} else {
					const data = async function* () {
						const hash = createHash("sha256");
						let bytes = 0;
						for await (const chunk of file.createReadStream({
							autoClose: false,
							highWaterMark: 65536
						})) {
							signal.throwIfAborted();
							bytes += chunk.length;
							if (bytes > image.size) throw new BridgeError("INVALID_PARAMS", "Staged attachment size does not match its upload.");
							hash.update(chunk);
							yield chunk;
						}
						signal.throwIfAborted();
						if (bytes !== image.size || hash.digest("hex") !== image.sha256) throw new BridgeError("INVALID_PARAMS", "Staged attachment content does not match its upload.");
					};
					const result = await upload.service.uploadStream({
						sessionId: upload.sessionId,
						name: image.name,
						data: data(),
						signal
					});
					parts.push({
						type: "file",
						receiptId: result.receiptId
					});
				}
			} finally {
				await file.close();
			}
		}
		signal.throwIfAborted();
		return parts;
	}
};
// src/host/dsh-runtime/tools.ts
function toolContent(name, rawArguments) {
	let input = typeof rawArguments === "string" ? rawArguments : json(rawArguments ?? {});
	if (typeof rawArguments === "string") try {
		input = JSON.parse(rawArguments);
	} catch {}
	const args = record(input);
	const content = {
		kind: "tool_call",
		title: name,
		toolName: name,
		input
	};
	if (name === "bash" || name === "pwsh") {
		content.kind = "command";
		if (typeof args.command === "string") content.command = args.command;
	} else if (name === "web_search") {
		content.kind = "web_search";
		if (typeof args.query === "string") content.query = args.query;
	} else if (name === "ask_user_question" || name === "exit_plan_mode") {
		content.kind = "input_request";
		content.readOnly = true;
	} else if (name.startsWith("mcp__")) {
		content.kind = "mcp";
		content.name = name;
	} else {
		const action = {
			subagent: "invoke",
			subagent_fork: "spawn",
			send_message: "send_input",
			wait_agent: "wait",
			interrupt_agent: "close",
			list_agents: "unknown"
		};
		if (action[name]) {
			content.kind = "agent_call";
			content.action = action[name];
			if (typeof args.target === "string") content.targetIds = [args.target];
		}
	}
	return content;
}
function resultContent(blocks) {
	const values = Array.isArray(blocks) ? blocks : [];
	return {
		output: values.map((block) => {
			const value = record(block);
			if (value.type === "image") return "[图片暂不支持跨设备预览]";
			return typeof value.text === "string" ? value.text : "";
		}).filter(Boolean).join("\n"),
		result: json(values)
	};
}
function enrichToolResult(content, meta) {
	const result = { ...content };
	if (meta !== void 0) result.dshResultMeta = json(meta);
	if (content.isError === true) return result;
	const writeStatus = content.toolName === "write" && typeof content.output === "string" ? /^<path>[\s\S]*<\/path>\r?\n<type>file<\/type>\r?\n<content>\r?\n(Created|Updated) file\r?\n<\/content>$/.exec(content.output.trim())?.[1] : void 0;
	const input = record(content.input);
	if (writeStatus === "Created" && typeof input.file_path === "string" && input.file_path.trim() && typeof input.content === "string") {
		result.kind = "file_change";
		result.changes = [{
			path: input.file_path,
			kind: "add",
			diff: diffLines(input.content, "+"),
			contextual: false
		}];
		return result;
	}
	const diffs = record(meta).diffs;
	if ([
		"write",
		"edit",
		"str_replace_editor"
	].includes(String(content.toolName)) && Array.isArray(diffs) && diffs.length && diffs.every((diff) => {
		const d = record(diff);
		return typeof d.path === "string" && (d.oldText === null || typeof d.oldText === "string") && typeof d.newText === "string";
	})) {
		result.kind = "file_change";
		result.changes = diffs.map((diff) => {
			const d = record(diff);
			return {
				path: d.path,
				kind: writeStatus === "Updated" ? "update" : d.oldText === null ? "add" : "update",
				diff: [diffLines(d.oldText, "-"), diffLines(d.newText, "+")].filter(Boolean).join("\n"),
				contextual: true
			};
		});
	}
	return result;
}
function diffLines(text, prefix) {
	if (!text) return "";
	return text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").map((line) => `${prefix}${line}`).join("\n");
}
function parentToolItem(externalId, callId) {
	return itemId(externalId, "tool", callId);
}
// src/host/dsh-runtime/history.ts
/** rc.7 uses tool-role messages; retain the nested result shape for older logs. */
function readToolResult(value) {
	const message = record(value);
	const result = typeof message.toolCallId === "string" ? message : record(Array.isArray(message.content) ? message.content[0] : void 0);
	if (typeof result.toolCallId !== "string" || !result.toolCallId || !Array.isArray(result.content)) throw new Error("Invalid DSH tool result message.");
	return {
		callId: result.toolCallId,
		content: result.content,
		isError: result.isError === true
	};
}
/** One deterministic projector shared by snapshots and the live event feed. */
function createProjection(externalId, platformId, fingerprint = false) {
	const historyHash = fingerprint ? createHash("sha256").update(JSON.stringify([externalId, platformId])) : void 0;
	let throughSeq = -1;
	const changed = /* @__PURE__ */ new Map();
	const removed = /* @__PURE__ */ new Set();
	const items = /* @__PURE__ */ new Map();
	const steps = /* @__PURE__ */ new Map();
	const drafts = /* @__PURE__ */ new Map();
	const pendingDrafts = /* @__PURE__ */ new Map();
	function flushDrafts() {
		for (const [key, values] of pendingDrafts) for (const [index, value] of values) block(value.block, key, index, value.event, "assistant", "running", value.seq);
		pendingDrafts.clear();
	}
	let turnId = null;
	let turnStart = -1;
	let nextOrder = 0;
	const needsHash = /* @__PURE__ */ new Set();
	function flushHashes() {
		for (const id of needsHash) {
			const item = items.get(id);
			if (item) {
				item.content = wellFormedJson(item.content);
				item.contentHash = contentHash(item);
			}
		}
		needsHash.clear();
	}
	function put(kind, key, event, type, status, role, content, _index = 0, anchor = Number(event.seq)) {
		const id = itemId(externalId, kind, key);
		const previous = items.get(id);
		const value = {
			id,
			sessionId: platformId,
			type,
			status,
			role,
			turnId: previous ? previous.turnId : turnId,
			orderSeq: previous?.orderSeq ?? ++nextOrder,
			revision: Number(event.seq) + 1,
			contentHash: "",
			content,
			source: {
				runtime: "dsh",
				sessionId: externalId,
				itemId: key,
				itemType: event.type,
				seq: previous?.source.seq ?? anchor,
				lastSeq: Number(event.seq),
				time: event.time
			}
		};
		needsHash.add(id);
		items.set(id, value);
		changed.set(id, value);
		removed.delete(id);
		return value;
	}
	function tool(callId, name, args, event, index = 0, anchor) {
		const id = itemId(externalId, "tool", callId);
		const old = items.get(id);
		return put("tool", callId, event, "tool", old?.status ?? "running", "assistant", {
			...old?.content,
			...toolContent(name, args),
			callId
		}, index, anchor);
	}
	function result(callId, blocks, failed, event, meta, error) {
		const previous = items.get(itemId(externalId, "tool", callId));
		put("tool", callId, event, "tool", failed ? "failed" : "done", "assistant", enrichToolResult({
			...previous?.content ?? toolContent("tool", {}),
			callId,
			isError: failed,
			...error !== void 0 ? { error: json(error) } : {},
			...resultContent(blocks)
		}, meta));
	}
	function block(block, key, index, event, role, status, anchor) {
		switch (block.type) {
			case "text": {
				const text = role === "assistant" ? withoutActionCards(block.text) : block.text;
				if (text !== block.text && !text.trim()) {
					remove(itemId(externalId, "message", `${key}:${index}`));
					return;
				}
				return put("message", `${key}:${index}`, event, role === "system" ? "system" : "message", status, role, {
					kind: role === "system" ? "notice" : "markdown",
					format: "markdown",
					text
				}, index, anchor);
			}
			case "reasoning": return put("reasoning", `${key}:${index}`, event, "system", status, "assistant", {
				kind: "reasoning",
				text: block.text
			}, index, anchor);
			case "image": return put("image", `${key}:${index}`, event, "message", status, role, {
				kind: "text",
				format: "text",
				text: "[图片暂不支持跨设备预览]",
				dshAttachment: json(block.attachment)
			}, index, anchor);
			case "tool-call": return tool(block.id, block.name, block.arguments, event, index, anchor);
			case "tool-result":
				result(block.toolCallId, block.content, block.isError === true, event);
				return;
		}
	}
	function remove(id) {
		if (items.delete(id)) {
			changed.delete(id);
			removed.add(id);
		}
	}
	function apply(event, receipt, transient = false) {
		if (!transient && Number(event.seq) <= throughSeq) return;
		if (!transient && throughSeq >= 0 && Number(event.seq) !== throughSeq + 1) throw new Error("DSH event sequence gap");
		if (!transient) historyHash?.update(canonicalJson(json({
			event,
			receipt: receipt ?? null
		}))).update("\n");
		if (!transient) throughSeq = Number(event.seq);
		if (event.type !== "assistant/chunk") flushDrafts();
		const data = record(event.data);
		const eventType = event.type;
		const stepKey = `${String(data.turn)}:${String(data.step)}`;
		if (event.type === "turn/start") {
			turnStart = Number(event.seq);
			turnId = itemId(externalId, "turn", String(turnStart));
			put("turn.start", String(turnStart), event, "turn.start", "done", "system", {
				kind: "turn_start",
				turn: event.data.turn
			});
		} else if (event.type === "turn/end") {
			const reason = event.data.reason;
			const status = reason.kind === "error" ? "failed" : ["aborted", "interrupted"].includes(reason.kind) ? "interrupted" : "done";
			for (const [id, item] of items) {
				if (item.turnId !== turnId || item.status !== "running") continue;
				const closed = {
					...item,
					status: status === "done" ? "interrupted" : status,
					revision: Number(event.seq) + 1,
					source: {
						...item.source,
						lastSeq: Number(event.seq)
					}
				};
				needsHash.add(id);
				items.set(id, closed);
				changed.set(id, closed);
			}
			put("turn.end", String(turnStart), event, "turn.end", status, "system", {
				kind: "turn_end",
				reason: json(reason)
			});
			turnId = null;
		} else if (event.type === "step/start") steps.set(stepKey, Number(event.seq));
		else if (event.type === "user/message") {
			const message = event.data;
			if (message.source.kind !== "user") return;
			const rpcId = record(message.source).rpcId;
			const clientId = (typeof rpcId === "string" ? clientMessageId(externalId, rpcId) : void 0) ?? clientMessageId(externalId, message.id);
			const role = "user";
			if (receipt?.platformId === platformId && receipt.attachments.length) {
				const item = put("message", `${message.id}:0`, event, "message", "done", role, {
					kind: "markdown",
					format: "markdown",
					text: message.content.filter((value) => value.type === "text").map((value) => value.text).join("\n"),
					attachments: receipt.attachments.map((attachment) => ({ ...attachment }))
				});
				item.source = {
					...item.source,
					messageSource: json(message.source),
					...clientId ? { clientMessageId: clientId } : {}
				};
				return;
			}
			message.content.forEach((value, i) => {
				const item = block(value, message.id, i, event, role, "done");
				if (item) item.source = {
					...item.source,
					messageSource: json(message.source),
					...clientId ? { clientMessageId: clientId } : {}
				};
			});
		} else if (event.type === "assistant/chunk") {
			const key = `${turnStart}:${steps.get(stepKey) ?? stepKey}`;
			const values = drafts.get(key) ?? /* @__PURE__ */ new Map();
			drafts.set(key, values);
			const chunk = event.data.chunk;
			if (!("index" in chunk)) return;
			const previous = values.get(chunk.index);
			let value = previous?.block;
			if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") {
				const type = chunk.type === "text-delta" ? "text" : "reasoning";
				value = {
					type,
					text: (value?.type === type ? value.text : "") + chunk.text
				};
			} else if (chunk.type === "tool-call-delta") {
				const old = value?.type === "tool-call" ? value : void 0;
				value = {
					type: "tool-call",
					id: chunk.id,
					name: chunk.name ?? old?.name ?? "tool",
					arguments: (old?.arguments ?? "") + (chunk.argumentsDelta ?? "")
				};
			} else if (chunk.type === "block-end") value = chunk.block;
			if (value) {
				const anchor = previous?.seq ?? Number(event.seq);
				values.set(chunk.index, {
					block: value,
					seq: anchor,
					event
				});
				const pending = pendingDrafts.get(key) ?? /* @__PURE__ */ new Map();
				pending.set(chunk.index, {
					block: value,
					seq: anchor,
					event
				});
				pendingDrafts.set(key, pending);
			}
		} else if (event.type === "assistant/attempt") {
			const key = `${turnStart}:${steps.get(stepKey) ?? stepKey}`;
			for (const [index, value] of drafts.get(key) ?? []) remove(itemId(externalId, value.block.type === "tool-call" ? "tool" : value.block.type === "reasoning" ? "reasoning" : "message", value.block.type === "tool-call" ? value.block.id : `${key}:${index}`));
			drafts.delete(key);
		} else if (event.type === "assistant/message") {
			const key = `${turnStart}:${steps.get(stepKey) ?? stepKey}`;
			const values = drafts.get(key);
			const finalCalls = new Set(event.data.message.content.flatMap((b) => b.type === "tool-call" ? [b.id] : []));
			for (const [index, value] of values ?? []) {
				if (value.block.type === "tool-call" && !finalCalls.has(value.block.id)) remove(itemId(externalId, "tool", value.block.id));
				if (index >= event.data.message.content.length && value.block.type !== "tool-call") remove(itemId(externalId, value.block.type === "reasoning" ? "reasoning" : value.block.type === "image" ? "image" : "message", `${key}:${index}`));
			}
			event.data.message.content.forEach((value, i) => {
				const item = block(value, key, i, event, "assistant", event.data.interrupted ? "interrupted" : "done", values?.get(i)?.seq);
				if (item) item.source = {
					...item.source,
					messageId: event.data.message.id,
					provider: event.data.message.source.provider,
					model: event.data.message.source.model
				};
			});
			drafts.delete(key);
		} else if (event.type === "tool/call") tool(event.data.callId, event.data.name, event.data.arguments, event);
		else if (event.type === "tool/result") {
			const value = readToolResult(event.data.message);
			result(value.callId, value.content, value.isError || Boolean(event.data.error), event, event.data.meta, event.data.error);
		} else if (eventType === "tool/ptc-dispatch-start" || eventType === "tool/ptc-dispatch" || eventType === "tool/code-dispatch-start" || eventType === "tool/code-dispatch") {
			if (typeof data.subCallId !== "string" || typeof data.name !== "string") return;
			const item = tool(data.subCallId, data.name, data.arguments, event);
			item.content.parentItemId = parentToolItem(externalId, String(data.parentCallId));
			item.content.rootCallId = String(data.rootCallId);
			if (eventType === "tool/ptc-dispatch" || eventType === "tool/code-dispatch") result(data.subCallId, data.content, data.isError === true || Boolean(data.error), event, void 0, data.error);
		} else if (eventType === "approval/asked" || eventType === "approval/decided") {
			const key = String(data.id);
			put("approval", key, event, "tool", "done", "system", {
				...items.get(itemId(externalId, "approval", key))?.content,
				kind: "permission",
				title: "工具授权记录",
				readOnly: true,
				...json(data)
			});
		} else if (String(event.type).startsWith("compaction/")) put("event", String(event.seq), event, "marker", "done", "system", {
			kind: "compact",
			title: "上下文压缩",
			eventType: event.type,
			details: json(event.data)
		});
	}
	return {
		apply,
		stream(turn, step, chunk, time, cursor) {
			if (throughSeq > cursor) return;
			apply({
				type: "assistant/chunk",
				seq: throughSeq,
				time,
				data: {
					turn,
					step,
					chunk
				}
			}, void 0, true);
		},
		get throughSeq() {
			return throughSeq;
		},
		get historyHash() {
			return historyHash?.copy().digest("hex");
		},
		get settled() {
			return turnId === null && drafts.size === 0;
		},
		get dirty() {
			return pendingDrafts.size > 0 || changed.size > 0 || removed.size > 0;
		},
		snapshot: () => {
			flushDrafts();
			flushHashes();
			return [...items.values()].sort((a, b) => a.orderSeq - b.orderSeq || a.id.localeCompare(b.id));
		},
		drain() {
			flushDrafts();
			flushHashes();
			const delta = {
				items: [...changed.values()],
				removed: [...removed]
			};
			changed.clear();
			removed.clear();
			return delta;
		}
	};
}
/** Bound replay slices so timers, control RPC and cancellation can run between them. */
async function replayHistory(projection, snapshot, signal, throughSeq = Infinity) {
	let deadline = performance.now() + 5;
	for (let index = 0; index < snapshot.events.length; index++) {
		if (index % 128 === 0 && performance.now() >= deadline) {
			await setImmediate(void 0, { signal });
			deadline = performance.now() + 5;
		}
		signal?.throwIfAborted();
		const event = snapshot.events[index];
		if (Number(event.seq) > throughSeq) break;
		projection.apply(event, snapshot.attachmentReceipts?.[receiptKey(event) ?? ""]);
	}
}
async function projectHistoryAsync(snapshot, platformId, signal) {
	const projection = createProjection(snapshot.session.id, platformId);
	await replayHistory(projection, snapshot, signal);
	return projection.snapshot();
}
// src/host/dsh-runtime/json-size.ts
/** Measure JSON payloads without allocating a serialized copy. Payloads are plain JSON. */
function jsonBytes(value) {
	const seen = /* @__PURE__ */ new Set();
	function stringBytes(text) {
		let bytes = Buffer.byteLength(text) + 2;
		for (const match of text.matchAll(/[\u0000-\u001f"\\]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g)) {
			const char = match[0];
			bytes += [
				"\"",
				"\\",
				"\b",
				"\f",
				"\n",
				"\r",
				"	"
			].includes(char) ? 1 : char.charCodeAt(0) < 32 ? 5 : 3;
		}
		return bytes;
	}
	function size(input) {
		if (input === null || input === void 0) return 4;
		if (typeof input === "string") return stringBytes(input);
		if (typeof input === "boolean") return input ? 4 : 5;
		if (typeof input === "number") return Number.isFinite(input) ? String(Object.is(input, -0) ? 0 : input).length : 4;
		if (typeof input !== "object") throw new TypeError("Expected JSON data");
		if (seen.has(input)) throw new TypeError("Cyclic JSON data");
		seen.add(input);
		let bytes = 2, count = 0;
		if (Array.isArray(input)) for (const entry of input) {
			bytes += size(entry);
			count++;
		}
		else for (const [key, entry] of Object.entries(input)) {
			if (entry === void 0) continue;
			bytes += stringBytes(key) + 1 + size(entry);
			count++;
		}
		seen.delete(input);
		return bytes + Math.max(0, count - 1);
	}
	return size(value);
}
// src/host/dsh-runtime/capabilities.ts
const unsupported = [
	"session.send_message",
	"session.interrupt",
	"session.steer",
	"session.interaction.approval",
	"catalog.model",
	"catalog.permission",
	"catalog.effort",
	"session.commands",
	"runtime.attachment"
];
function capabilities(sessionId, writable = false, userQuestions = false, controls = {}) {
	const enabled = /* @__PURE__ */ new Set([
		"runtime.config",
		...writable ? ["session.send_message", "session.interrupt"] : [],
		...userQuestions || controls.approval || writable ? ["session.interaction.approval"] : [],
		...controls.model ? ["catalog.model"] : [],
		...controls.effort ? ["catalog.effort"] : [],
		...controls.permission ? ["catalog.permission"] : [],
		...controls.commands?.available ? ["session.commands"] : [],
		...writable && controls.attachments ? ["runtime.attachment"] : []
	]);
	return {
		runtime: "dsh",
		revision: 7,
		...sessionId ? { sessionId } : {},
		capabilities: [
			"runtime.config",
			...unsupported,
			"session.planning"
		].map((capabilityId) => ({
			capabilityId,
			runtime: "dsh",
			scope: sessionId ? "session" : "runtime",
			supported: enabled.has(capabilityId),
			available: enabled.has(capabilityId),
			allowed: enabled.has(capabilityId),
			...capabilityId === "runtime.attachment" && !controls.files ? { metadata: { allowedMimeTypes: [...IMAGE_MIME_TYPES] } } : {},
			...enabled.has(capabilityId) ? {} : { unavailableReason: "This DSH capability is not available." },
			...capabilityId === "session.commands" && controls.commands ? {
				supported: controls.commands.supported,
				available: controls.commands.available,
				allowed: controls.commands.available,
				unavailableReason: controls.commands.reason ?? null,
				metadata: { catalogRevision: controls.commands.catalogRevision }
			} : {}
		})),
		metadata: {
			readOnly: !writable,
			attachments: writable && Boolean(controls.attachments),
			userQuestions,
			approval: Boolean(controls.approval)
		}
	};
}
// src/host/dsh-runtime/selections.ts
function modelSelectionId(selection) {
	return `dsh:model:${Buffer.from(JSON.stringify([
		selection.provider,
		selection.model,
		selection.reasoningEffort ?? null
	])).toString("base64url")}`;
}
function permissionSelectionId(preset) {
	return `dsh:permission:${Buffer.from(preset).toString("base64url")}`;
}
function decode(value, prefix) {
	const body = value.slice(prefix.length);
	if (!value.startsWith(prefix) || !/^[\w-]+$/.test(body) || body.length > 16384) throw new BridgeError("INVALID_PARAMS", "Invalid DSH selection ID.");
	const text = Buffer.from(body, "base64url").toString("utf8");
	if (Buffer.from(text).toString("base64url") !== body) throw new BridgeError("INVALID_PARAMS", "Invalid DSH selection encoding.");
	return text;
}
function decodeModelSelection(value) {
	let parts;
	try {
		parts = JSON.parse(decode(value, "dsh:model:"));
	} catch {
		throw new BridgeError("INVALID_PARAMS", "Invalid DSH model selection.");
	}
	if (!Array.isArray(parts) || parts.length !== 3 || !nonempty(parts[0]) || !nonempty(parts[1]) || parts[2] !== null && !nonempty(parts[2])) throw new BridgeError("INVALID_PARAMS", "A DSH model selection must identify provider, model and effort.");
	const selection = {
		provider: parts[0],
		model: parts[1],
		...parts[2] === null ? {} : { reasoningEffort: parts[2] }
	};
	if (modelSelectionId(selection) !== value) throw new BridgeError("INVALID_PARAMS", "DSH model selection must use canonical encoding.");
	return selection;
}
function decodePermissionSelection(value) {
	const preset = decode(value, "dsh:permission:");
	if (!preset || preset === "custom" || preset.trim() !== preset || /[\r\n]/u.test(preset)) throw new BridgeError("INVALID_PARAMS", "Choose a switchable DSH permission preset.");
	return preset;
}
function parseSelections(value) {
	if (value === void 0) return {};
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new BridgeError("INVALID_PARAMS", "Selections must be an object.");
	const selection = {};
	for (const [key, item] of Object.entries(value)) {
		if (!["model", "permission"].includes(key) || !nonempty(item)) throw new BridgeError("INVALID_PARAMS", "A configuration change requires a concrete selection ID.");
		if (key === "model") {
			decodeModelSelection(item);
			selection.model = item;
		} else {
			decodePermissionSelection(item);
			selection.permission = item;
		}
	}
	return selection;
}
function nonempty(value) {
	return typeof value === "string" && value.length > 0;
}
// src/host/dsh-runtime/visibility.ts
/** User-role context injections do not establish a user-created conversation. */
function isUserMessage(event) {
	return event.type === "user/message" && event.data.source.kind === "user";
}
/** AA imports conversations after the first human message, independent of UI selection. */
function sessionVisible(session, archived) {
	return session.origin !== "subagent" && !archived.has(session.id) && session.hasUserMessage;
}
var ClientPresence = class {
	changed;
	clients = /* @__PURE__ */ new Map();
	timer;
	constructor(changed) {
		this.changed = changed;
		this.timer = setInterval(() => {
			let changed = false;
			for (const [id, client] of this.clients) if (client.expires <= Date.now()) {
				this.clients.delete(id);
				changed = true;
			}
			if (changed) this.changed();
		}, 15e3);
		this.timer.unref();
	}
	report(id, revision, current) {
		if (!id || id.length > 128 || !Number.isSafeInteger(revision) || revision < 0 || current !== null && (typeof current !== "string" || current.length > 512)) throw new Error("Invalid client presence");
		const previous = this.clients.get(id);
		if (previous && revision < previous.revision) return;
		this.clients.set(id, {
			revision,
			current,
			expires: Date.now() + 45e3
		});
		if (!previous || previous.current !== current) this.changed();
	}
	selected() {
		return new Set([...this.clients.values()].flatMap((c) => c.current ? [c.current] : []));
	}
	close() {
		clearInterval(this.timer);
		this.clients.clear();
	}
};
/** The official query includes persisted sessions; absence from memory is not archival. */
var NativeSessionSource = class {
	ctx;
	diagnostics;
	archived;
	withUserMessages = /* @__PURE__ */ new Set();
	/** Log identity of a read that found no user message; a changed log invalidates it. */
	emptyLogs = /* @__PURE__ */ new Map();
	failedReads = /* @__PURE__ */ new Set();
	records = /* @__PURE__ */ new Map();
	revisions = /* @__PURE__ */ new Map();
	initialized = false;
	refreshing;
	logs = /* @__PURE__ */ new Map();
	reads = /* @__PURE__ */ new Map();
	closed = false;
	async initialize(signal) {
		if (!this.initialized) await this.refresh(signal);
		signal?.throwIfAborted();
	}
	evict(id) {
		const cached = this.logs.get(id);
		if (!cached) return;
		this.logs.delete(id);
		cached.observation[Symbol.dispose]();
	}
	release(id) {
		this.evict(id);
	}
	get retainedLogCount() {
		return this.logs.size;
	}
	trimLogs(max = 8) {
		while (this.logs.size > max) {
			const oldest = this.logs.keys().next().value;
			if (oldest === void 0) break;
			this.evict(oldest);
		}
	}
	close() {
		this.closed = true;
		for (const id of this.logs.keys()) this.evict(id);
	}
	/** Borrow an immutable SDK cut: no corpus preflight, replay clone or JSON round trip. */
	async readLog(id) {
		const pending = this.reads.get(id);
		if (pending) return pending;
		const task = this.loadLog(id);
		this.reads.set(id, task);
		try {
			return await task;
		} finally {
			if (this.reads.get(id) === task) this.reads.delete(id);
		}
	}
	async loadLog(id) {
		const revision = await this.freshRevisionOf(id);
		let cached = this.logs.get(id);
		if (cached && cached.revision !== revision) {
			this.evict(id);
			cached = void 0;
		}
		if (cached) {
			this.logs.delete(id);
			this.logs.set(id, cached);
		}
		let observation = cached?.observation;
		if (!observation) observation = await this.ctx.sessionQuery.observeSession(id, { projectionMode: "none" });
		try {
			const actualRevision = observation.source === "live" ? `live:${observation.cursor}` : revision;
			const log = {
				...actualRevision === void 0 ? {} : { bridgeRevision: actualRevision },
				session: observation.header,
				inheritedEventCount: observation.inheritedEventCount,
				events: [...observation.events]
			};
			if (!cached && !this.closed && actualRevision !== void 0) {
				this.logs.delete(id);
				this.logs.set(id, {
					revision: actualRevision,
					observation: observation.retain()
				});
				this.trimLogs();
			}
			return log;
		} finally {
			if (!cached) observation[Symbol.dispose]();
		}
	}
	constructor(ctx, diagnostics = quietDiagnostics) {
		this.ctx = ctx;
		this.diagnostics = diagnostics;
		this.archived = new Set(ctx.workspaceRegistry.archivedSessionIds);
	}
	observe(session, event) {
		this.evict(session.id);
		this.retry(session.id);
		this.records.set(session.id, {
			header: session.header,
			live: true,
			persisted: this.records.get(session.id)?.persisted ?? false
		});
		if (event ? isUserMessage(event) : session.snapshotEvents().some(isUserMessage)) {
			this.withUserMessages.add(session.id);
			this.emptyLogs.delete(session.id);
		}
	}
	async refresh(signal) {
		this.refreshing ??= this.refreshRecords().finally(() => {
			this.refreshing = void 0;
		});
		await this.refreshing;
		signal?.throwIfAborted();
	}
	async refreshRecords(signal) {
		const previous = new Map(this.records);
		const entries = await this.diagnostics.measure("inventory.query", {}, () => this.ctx.sessionQuery.listSessions(signal));
		signal?.throwIfAborted();
		this.revisions.clear();
		for (const id of this.logs.keys()) this.evict(id);
		this.failedReads.clear();
		const listed = new Set(entries.map((entry) => entry.header.id));
		for (const [id, entry] of previous) if (this.records.get(id) === entry && !listed.has(id) && !this.ctx.sessions.get(id)) {
			this.records.delete(id);
			this.withUserMessages.delete(id);
			this.emptyLogs.delete(id);
		}
		for (const entry of entries) {
			const current = this.records.get(entry.header.id);
			if (!current || current === previous.get(entry.header.id)) this.records.set(entry.header.id, entry);
		}
		this.archived = new Set(this.ctx.workspaceRegistry.archivedSessionIds);
		this.initialized = true;
	}
	/** Identity of one log as observed by the last inventory; absent when it is not persisted. */
	revisionOf(id) {
		const live = this.ctx.sessions.get(id);
		if (live !== void 0) return `live:${Number(live.seq) - 1}`;
		return this.revisions.get(id);
	}
	/** Fresh identity of one log, including work that happened after the last inventory. */
	async freshRevisionOf(id) {
		const live = this.ctx.sessions.get(id);
		if (live !== void 0) return `live:${Number(live.seq) - 1}`;
		try {
			const snapshot = await this.ctx.get("sessionPersistence")?.stat(id);
			if (!snapshot) {
				this.revisions.delete(id);
				return;
			}
			const revision = String(snapshot.revision);
			this.revisions.set(id, revision);
			return revision;
		} catch {
			this.revisions.delete(id);
			return;
		}
	}
	candidates() {
		return [.../* @__PURE__ */ new Set([...this.records.keys(), ...this.archived])];
	}
	retry(id) {
		this.failedReads.delete(id);
	}
	markReadFailed(id) {
		this.failedReads.add(id);
		this.diagnostics.log("warn", "session.read_unavailable", {
			sessionId: id,
			reason: "read_failed"
		});
	}
	async visible(id) {
		const live = this.ctx.sessions.get(id);
		const header = live?.header ?? this.records.get(id)?.header;
		if (!header || header.origin === "subagent" || this.archived.has(id)) return false;
		if (this.failedReads.has(id)) return false;
		if (!this.withUserMessages.has(id)) {
			if (!live && this.records.get(id)?.persisted === false) return false;
			const revision = await this.freshRevisionOf(id);
			if (revision === void 0 || this.emptyLogs.get(id) !== revision) {
				let events;
				try {
					events = live?.snapshotEvents() ?? (await this.diagnostics.measure("session.visibility_read", { sessionId: id }, () => this.readLog(id))).events;
				} catch (error) {
					if (error instanceof Error && error.name === "AbortError") throw error;
					this.markReadFailed(id);
					return false;
				}
				if (events.some(isUserMessage)) {
					this.withUserMessages.add(id);
					this.emptyLogs.delete(id);
				} else if (revision !== void 0) {
					this.emptyLogs.set(id, revision);
					this.evict(id);
				}
			}
		}
		return sessionVisible({
			id,
			...header.origin ? { origin: header.origin } : {},
			hasUserMessage: this.withUserMessages.has(id)
		}, this.archived);
	}
	async state(id) {
		const observedAt = (/* @__PURE__ */ new Date()).toISOString();
		if (this.archived.has(id)) return {
			availability: "archived",
			reason: "archived_in_dsh",
			observedAt
		};
		if (!this.records.has(id) && !this.ctx.sessions.get(id)) return {
			availability: "missing",
			reason: "not_found_in_dsh",
			observedAt
		};
		return await this.visible(id) ? {
			availability: "available",
			reason: null,
			observedAt
		} : {
			availability: "unavailable",
			reason: this.failedReads.has(id) ? "read_failed" : "not_visible_in_dsh",
			observedAt
		};
	}
	async requireAvailable(id) {
		const state = await this.state(id);
		if (state.availability === "archived") throw new BridgeError("SESSION_ARCHIVED", "该会话已在 DeepSeek Harness 客户端中归档，请取消归档后继续。");
		if (state.reason === "read_failed") throw new BridgeError("PERSISTENCE_ERROR", "DSH could not read this session. Check the Bridge logs page and retry after repairing its native history.", true);
		if (state.availability !== "available") throw new BridgeError("SESSION_NOT_FOUND", "The session is not visible in DSH.");
	}
};
// src/host/dsh-runtime/interaction-stream.ts
/** Connection renamed its local owner from operator to browserPeer in 0.2.1. */
function interactionPeer(connection) {
	const peer = connection.browserPeer ?? connection.operator;
	if (!peer) throw new Error("DSH Connection does not provide a local owner Peer.");
	return peer;
}
/** Older Gateways omit uplink and peer; current ones require an explicit owner. */
function openInteractionEvents(wireStream, signal, peer) {
	const open = wireStream.open;
	const args = ["$events", { args: {} }];
	if (open.length === 5) {
		if (!peer) throw new Error("DSH interaction stream requires a local owner Peer.");
		args.push((async function* () {})(), peer, signal);
	} else if (open.length === 3) args.push(signal);
	else throw new Error("Unsupported DSH interaction stream signature.");
	return Reflect.apply(open, wireStream, args);
}
/** A local consumer of the official Remote stream, not a replacement answer provider. */
var InteractionStream = class {
	clientId;
	activeContext;
	dispose;
	get available() {
		return this.clientId !== void 0;
	}
	constructor(ctx, receive, changed, service = "userQuestions", diagnostics = quietDiagnostics) {
		const scope = ctx.inject([
			"typertGateway",
			"connection",
			service
		], (ready) => {
			const abort = new AbortController();
			const run = async () => {
				let failed = false;
				while (!abort.signal.aborted) {
					try {
						const stream = await openInteractionEvents(ready.typertGateway.wireStream, abort.signal, interactionPeer(ready.connection));
						for await (const value of stream) {
							if (abort.signal.aborted) break;
							const frame = record(value);
							if (frame.type === "ready" && typeof frame.clientId === "string") {
								if (failed) diagnostics.log("info", "interaction.stream_recovered", { service });
								failed = false;
								const wasAvailable = this.available;
								this.clientId = frame.clientId;
								this.activeContext = ready;
								if (!wasAvailable) changed();
							} else await receive(frame);
						}
					} catch (error) {
						if (!abort.signal.aborted && !failed) diagnostics.log("warn", "interaction.stream_failed", {
							service,
							openArity: ready.typertGateway.wireStream.open.length
						}, error);
						failed = true;
					} finally {
						const wasAvailable = this.available;
						this.clientId = void 0;
						this.activeContext = void 0;
						if (wasAvailable) changed();
					}
					try {
						await setTimeout$1(500, void 0, { signal: abort.signal });
					} catch {
						break;
					}
				}
			};
			ready.effect(() => {
				const task = run();
				return async () => {
					abort.abort();
					await task;
				};
			}, "dsh: interaction Remote stream");
		});
		this.dispose = async () => {
			await scope.dispose();
		};
	}
	async reply(eventId, outcome) {
		const ctx = this.activeContext, clientId = this.clientId;
		if (!ctx || !clientId) throw new Error("DSH 交互连接暂不可用，请稍后重试。");
		const rpcId = randomUUID();
		const handler = ctx.connection.createSharedFetchHandler("/api");
		const request = new Request("http://127.0.0.1/api/$events/result", {
			method: "POST",
			headers: { "content-type": "application/json" },
			signal: AbortSignal.timeout(15e3),
			body: JSON.stringify({
				type: "client-request",
				rpcId,
				method: "$events/result",
				payload: { args: {
					clientId,
					eventId,
					outcome
				} }
			})
		});
		const response = await Reflect.apply(handler.fetch, handler, [request, interactionPeer(ctx.connection)]);
		const envelope = record(await response.json());
		if (!response.ok || envelope.type !== "server-response" || envelope.rpcId !== rpcId || record(envelope.result).ok !== true) throw new Error("DSH 未接收回答，请稍后重试。");
	}
	async close() {
		await this.dispose();
	}
};
// src/host/dsh-runtime/approvals.ts
/** Decisions flow through the official pending request; a grant always applies once. */
var UserApprovals = class {
	visible;
	changed;
	entries = /* @__PURE__ */ new Map();
	stream;
	get available() {
		return this.stream.available;
	}
	constructor(ctx, visible, changed, diagnostics) {
		this.visible = visible;
		this.changed = changed;
		this.stream = new InteractionStream(ctx, (frame) => this.receive(frame), () => changed(), "approval", diagnostics);
	}
	async receive(frame) {
		if (frame.type === "cancel" && typeof frame.eventId === "string") {
			const entry = this.entries.get(frame.eventId);
			if (entry) {
				entry.withdrawn = true;
				this.update(entry, "closed");
			}
			return;
		}
		if (frame.type !== "waterfall" || typeof frame.eventId !== "string" || this.entries.has(frame.eventId)) return;
		const request = record(frame.request);
		let accepted = false;
		try {
			accepted = frame.event === "approval/request" && typeof frame.agentId === "string" && typeof request.toolName === "string" && await this.visible(frame.agentId);
		} catch {}
		if (!accepted) {
			await this.stream.reply(frame.eventId, { kind: "next" });
			return;
		}
		const entry = {
			eventId: frame.eventId,
			agentId: frame.agentId,
			toolName: request.toolName,
			...typeof request.reason === "string" ? { reason: request.reason } : {},
			...typeof request.callId === "string" ? { callId: request.callId } : {},
			status: "open",
			withdrawn: false,
			revision: 1
		};
		this.entries.set(entry.eventId, entry);
		this.changed(entry.agentId);
	}
	pending(entry) {
		return entry.status === "open" || entry.status === "responding";
	}
	update(entry, status) {
		if (entry.status === status) return;
		entry.status = status;
		entry.revision++;
		this.changed(entry.agentId);
		const closed = [...this.entries.values()].filter((value) => !this.pending(value));
		for (const old of closed.slice(0, Math.max(0, closed.length - 128))) this.entries.delete(old.eventId);
	}
	find(namespace, id, noticeId) {
		return [...this.entries.values()].find((entry) => entry.agentId === id && itemId(sessionId(namespace, id), "approval", entry.eventId) === noticeId);
	}
	owns(namespace, id, noticeId) {
		return this.find(namespace, id, noticeId) !== void 0;
	}
	waiting(id) {
		return [...this.entries.values()].some((entry) => entry.agentId === id && this.pending(entry));
	}
	notices(namespace, id) {
		const platformId = sessionId(namespace, id);
		return [...this.entries.values()].filter((entry) => entry.agentId === id).map((entry) => {
			const pending = this.pending(entry);
			return {
				noticeId: itemId(platformId, "approval", entry.eventId),
				sessionId: platformId,
				runtime: "dsh",
				type: "interaction",
				interactionType: "approval",
				title: `请求批准：${entry.toolName}`,
				message: entry.reason ?? "此操作需要你的批准。允许仅对本次请求生效。",
				severity: "warning",
				status: entry.status,
				revision: entry.revision,
				responseRequired: pending,
				blocking: pending ? {
					scope: "session",
					targetId: platformId
				} : null,
				source: {
					runtime: "dsh",
					component: "dsh.approval"
				},
				context: {
					toolName: entry.toolName,
					...entry.callId ? { callId: entry.callId } : {}
				},
				metadata: { eventId: entry.eventId },
				actions: pending ? [{
					actionId: "allow-once",
					label: "允许一次",
					style: "primary"
				}, {
					actionId: "reject",
					label: "拒绝",
					style: "secondary"
				}] : []
			};
		});
	}
	async respond(namespace, id, noticeId, actionId) {
		const entry = this.find(namespace, id, noticeId);
		const stale = {
			ok: false,
			code: "dsh_approval_not_pending",
			message: "这个权限请求已处理或已失效。"
		};
		if (!entry || entry.status !== "open" || !await this.visible(id)) return stale;
		if (actionId !== "allow-once" && actionId !== "reject") return {
			ok: false,
			code: "dsh_approval_invalid_action",
			message: "未知的批准操作。"
		};
		if (entry.status !== "open") return stale;
		this.update(entry, "responding");
		try {
			await this.stream.reply(entry.eventId, {
				kind: "result",
				value: actionId === "allow-once" ? "allowed-once" : "rejected"
			});
			if (entry.withdrawn) return stale;
			this.update(entry, "resolved");
			return {
				ok: true,
				result: {
					resolved: true,
					noticeId,
					sessionId: sessionId(namespace, id)
				}
			};
		} catch {
			if (!entry.withdrawn) this.update(entry, "open");
			return {
				ok: false,
				code: "dsh_approval_unavailable",
				message: "DSH 未接收批准结果，请稍后重试。"
			};
		}
	}
	observe(id, event) {
		if (event.type !== "turn/end") return;
		for (const entry of this.entries.values()) if (entry.agentId === id && this.pending(entry)) {
			entry.withdrawn = true;
			this.update(entry, "expired");
		}
	}
	async close() {
		await this.stream.close();
	}
};
// src/host/dsh-runtime/question-form.ts
function invalid(message) {
	throw new BridgeError("INVALID_PARAMS", message);
}
/** The plugin's notices are Chinese, so a question's localized copy is read in that language. */
function chinese(value) {
	const text = record(value);
	for (const locale of [
		"zh-CN",
		"zh-Hans",
		"zh"
	]) {
		const candidate = text[locale];
		if (typeof candidate === "string" && candidate.trim()) return candidate;
	}
}
/** The existing inputRequest v1 contract; DSH option labels never become wire IDs. */
var QuestionForm = class {
	questions;
	constructor(value) {
		if (!Array.isArray(value) || !value.length) invalid("DSH returned no questions.");
		const ids = /* @__PURE__ */ new Set();
		this.questions = value.map((raw) => {
			const q = record(raw);
			if (typeof q.id !== "string" || !q.id || ids.has(q.id) || typeof q.question !== "string" || !q.question.trim()) invalid("Unsupported DSH question definition.");
			ids.add(q.id);
			if (q.multiSelect != null && typeof q.multiSelect !== "boolean") invalid("Invalid DSH selection mode.");
			const options = q.options ?? [];
			if (!Array.isArray(options)) invalid("Invalid DSH options.");
			const labels = /* @__PURE__ */ new Set();
			for (const option of options) {
				const o = record(option);
				if (typeof o.label !== "string" || !o.label || labels.has(o.label) || o.description != null && typeof o.description !== "string") invalid("Invalid DSH option.");
				labels.add(o.label);
			}
			const intent = q.intent == null ? void 0 : record(q.intent);
			let kept;
			let view;
			if (intent?.kind === "plan-review") {
				if (typeof intent.approve !== "string" || !labels.has(intent.approve) || typeof q.detail !== "string" || !q.detail.trim() || q.multiSelect === true) invalid("Invalid DSH plan review.");
				kept = {
					kind: "plan-review",
					approve: intent.approve
				};
			} else if (intent?.kind === "approval") {
				const actions = [
					intent.approve,
					intent.reject,
					...intent.always == null ? [] : [intent.always]
				];
				if (actions.some((label) => typeof label !== "string" || !labels.has(label)) || new Set(actions).size !== labels.size || q.multiSelect === true) invalid("Invalid DSH approval question.");
				kept = {
					kind: "approval",
					approve: intent.approve,
					reject: intent.reject,
					...intent.always == null ? {} : { always: intent.always }
				};
				const display = record(intent.display), subject = record(intent.subject);
				const question = chinese(display.question), detail = chinese(display.detail) ?? q.detail;
				const name = typeof subject.name === "string" ? subject.name.trim() : "";
				const shown = /* @__PURE__ */ new Map([[kept.approve, chinese(display.approve) ?? kept.approve], [kept.reject, "拒绝"]]);
				if (kept.always !== void 0) shown.set(kept.always, "始终允许");
				view = {
					header: typeof q.header === "string" && q.header ? q.header : name ? `授权请求 · ${name}` : "授权请求",
					...question ? { prompt: typeof detail === "string" && detail ? `${question}\n\n${detail}` : question } : {},
					labels: shown
				};
			} else if (intent) invalid("Unsupported DSH question intent.");
			return {
				id: q.id,
				question: q.question,
				...kept ? { intent: kept } : {},
				...view ? { view } : {},
				...typeof q.header === "string" ? { header: q.header } : {},
				...typeof q.detail === "string" ? { detail: q.detail } : {},
				multiSelect: q.multiSelect === true,
				options
			};
		});
	}
	get hasPlanReview() {
		return this.questions.some((question) => question.intent?.kind === "plan-review");
	}
	input() {
		const questions = this.questions.map((q) => {
			const review = q.intent?.kind === "plan-review" ? q.intent : void 0;
			const header = q.view?.header ?? (q.header || (review ? "计划审批" : void 0));
			return {
				id: q.id,
				prompt: q.view?.prompt ?? (q.detail ? `${q.question}\n\n${q.detail}` : q.question),
				...header ? { header } : {},
				...review ? { intent: {
					kind: "plan-review",
					approveOptionId: `o_${q.options.findIndex((option) => option.label === review.approve)}`
				} } : {},
				multiple: q.multiSelect === true,
				allowCustom: q.intent?.kind !== "approval",
				options: (q.options ?? []).map((o, i) => ({
					id: `o_${i}`,
					label: q.view?.labels.get(o.label) ?? o.label,
					...o.description ? { description: o.description } : {}
				}))
			};
		});
		return {
			required: true,
			schema: {
				type: "object",
				required: ["answers"],
				additionalProperties: false,
				properties: { answers: {
					type: "object",
					required: questions.map((q) => q.id),
					additionalProperties: false,
					properties: Object.fromEntries(questions.map((q) => [q.id, {
						type: "object",
						additionalProperties: false,
						properties: {
							optionIds: {
								type: "array",
								uniqueItems: true,
								items: {
									type: "string",
									enum: q.options.map((o) => o.id)
								},
								...!q.multiple ? { maxItems: 1 } : {}
							},
							...q.allowCustom ? { customText: { type: "string" } } : {}
						}
					}]))
				} }
			},
			uiSchema: {
				component: "inputRequest",
				version: 1,
				questions
			}
		};
	}
	answer(input) {
		const answers = record(record(input).answers);
		if (Object.keys(answers).length !== this.questions.length || Object.keys(answers).some((id) => !this.questions.some((q) => q.id === id))) invalid("请回答所有问题。");
		return { answers: this.questions.map((q) => {
			const a = record(Object.hasOwn(answers, q.id) ? answers[q.id] : void 0);
			if (Object.keys(a).some((key) => key !== "optionIds" && key !== "customText")) invalid("答案包含未知字段。");
			const optionIds = a.optionIds ?? [];
			if (!Array.isArray(optionIds) || optionIds.some((id) => typeof id !== "string") || new Set(optionIds).size !== optionIds.length) invalid("请选择有效选项。");
			if (a.customText != null && typeof a.customText !== "string") invalid("自填答案必须是文本。");
			const custom = typeof a.customText === "string" ? a.customText.trim() : "";
			if (custom && q.intent?.kind === "approval") invalid("这个问题只能从给出的选项中选择。");
			if (!optionIds.length && !custom) invalid("请回答所有问题。");
			if (!q.multiSelect && (optionIds.length > 1 || optionIds.length > 0 && custom)) invalid("单选问题请选择一个选项，或填写自定义答案。");
			const options = new Map((q.options ?? []).map((o, i) => [`o_${i}`, o.label]));
			const selected = optionIds.map((id) => {
				if (!options.has(id)) invalid("答案包含未知选项。");
				return options.get(id);
			});
			return {
				id: q.id,
				selected,
				...custom ? { custom } : {}
			};
		}) };
	}
};
// src/host/dsh-runtime/questions.ts
/** Only runtime-owned questions are retained. Connector/modal lifetimes never own the wait. */
var UserQuestions = class {
	visible;
	changed;
	entries = /* @__PURE__ */ new Map();
	stream;
	get available() {
		return this.stream.available;
	}
	constructor(ctx, visible, changed, diagnostics) {
		this.visible = visible;
		this.changed = changed;
		this.stream = new InteractionStream(ctx, (frame) => this.receive(frame), () => this.changed(), "userQuestions", diagnostics);
	}
	async receive(frame) {
		if (frame.type === "cancel" && typeof frame.eventId === "string") {
			const entry = this.entries.get(frame.eventId);
			if (entry) {
				entry.withdrawn = true;
				this.update(entry, "closed");
			}
			return;
		}
		if (frame.type !== "waterfall" || typeof frame.eventId !== "string") return;
		if (this.entries.has(frame.eventId)) return;
		let form;
		try {
			if (frame.event === "user-questions/request" && typeof frame.agentId === "string" && await this.visible(frame.agentId)) form = new QuestionForm(frame.request?.questions);
		} catch {}
		if (!form) {
			await this.stream.reply(frame.eventId, { kind: "next" });
			return;
		}
		const planCallId = (frame.request?.questions)?.find((q) => q.intent?.kind === "plan-review")?.intent?.callId;
		const entry = {
			...planCallId ? { planCallId } : {},
			eventId: frame.eventId,
			agentId: frame.agentId,
			form,
			status: "open",
			withdrawn: false,
			revision: 1
		};
		this.entries.set(entry.eventId, entry);
		this.changed(entry.agentId);
	}
	update(entry, status) {
		if (entry.status === status) return;
		entry.status = status;
		entry.revision++;
		this.changed(entry.agentId);
		const closed = [...this.entries.values()].filter((e) => !this.pending(e));
		for (const old of closed.slice(0, Math.max(0, closed.length - 128))) this.entries.delete(old.eventId);
	}
	pending(entry) {
		return entry.status === "open" || entry.status === "responding";
	}
	waiting(id) {
		return [...this.entries.values()].some((e) => e.agentId === id && this.pending(e));
	}
	notices(namespace, id) {
		const platformId = sessionId(namespace, id);
		return [...this.entries.values()].filter((e) => e.agentId === id).map((e) => {
			const pending = this.pending(e);
			return {
				noticeId: itemId(platformId, "question", e.eventId),
				sessionId: platformId,
				runtime: "dsh",
				type: "interaction",
				interactionType: "input_request",
				title: e.form.hasPlanReview ? "请审阅计划" : "需要你的回答",
				severity: "info",
				status: e.status,
				revision: e.revision,
				responseRequired: pending,
				blocking: pending ? {
					scope: "session",
					targetId: platformId
				} : null,
				source: {
					runtime: "dsh",
					component: e.form.hasPlanReview ? "dsh.plan_review" : "dsh.ask_user_question"
				},
				context: {},
				metadata: {
					eventId: e.eventId,
					...e.form.hasPlanReview ? { planningReview: (() => {
						const q = e.form.questions.find((q) => q.intent?.kind === "plan-review");
						return {
							markdown: q.detail,
							questionId: q.id,
							...e.planCallId ? { callId: e.planCallId } : {},
							approveOptionId: `o_${q.options.findIndex((o) => o.label === q.intent.approve)}`
						};
					})() } : {}
				},
				actions: pending ? [{
					actionId: "submit",
					label: "提交回答",
					style: "primary",
					input: e.form.input()
				}, {
					actionId: "cancel",
					label: "取消",
					style: "secondary"
				}] : []
			};
		});
	}
	async respond(namespace, id, noticeId, actionId, input) {
		const entry = [...this.entries.values()].find((e) => e.agentId === id && itemId(sessionId(namespace, id), "question", e.eventId) === noticeId);
		if (!entry || entry.status !== "open" || !await this.visible(id)) return {
			ok: false,
			code: "dsh_question_not_pending",
			message: "这个问题已处理或已失效。"
		};
		let outcome;
		if (actionId === "submit") outcome = {
			kind: "result",
			value: entry.form.answer(input)
		};
		else if (actionId === "cancel") outcome = {
			kind: "rejected",
			error: {
				name: "UserQuestionError",
				code: "ASK_CANCELLED",
				message: "用户取消了问答。"
			}
		};
		else return {
			ok: false,
			code: "dsh_question_invalid_action",
			message: "未知的问答操作。"
		};
		if (entry.status !== "open") return {
			ok: false,
			code: "dsh_question_not_pending",
			message: "这个问题正在处理。"
		};
		this.update(entry, "responding");
		try {
			await this.stream.reply(entry.eventId, outcome);
			if (entry.withdrawn) return {
				ok: false,
				code: "dsh_question_not_pending",
				message: "这个问题已在其他客户端处理或已失效。"
			};
			this.update(entry, actionId === "cancel" ? "cancelled" : "resolved");
			return {
				ok: true,
				result: {
					resolved: true,
					noticeId,
					sessionId: sessionId(namespace, id)
				}
			};
		} catch (error) {
			if (!entry.withdrawn) this.update(entry, "open");
			return {
				ok: false,
				code: "dsh_question_unavailable",
				message: error instanceof Error ? error.message : "DSH 问答暂不可用。"
			};
		}
	}
	observe(id, event) {
		if (event.type !== "turn/end") return;
		for (const entry of this.entries.values()) if (entry.agentId === id && entry.status === "open") this.update(entry, "expired");
	}
	async close() {
		await this.stream.close();
	}
};
// src/host/dsh-runtime/catalogs.ts
/** Model and permission directories never read DSH's remembered selections; only the Agent mode default follows DSH. */
var RuntimeCatalogs = class {
	ctx;
	changed;
	generation = 0;
	loadedAt = 0;
	pending;
	cached;
	fingerprint = "";
	permissionFingerprint = "";
	permissionRevision = 0;
	constructor(ctx, changed) {
		this.ctx = ctx;
		this.changed = changed;
	}
	invalidate() {
		this.loadedAt = 0;
		this.generation++;
		this.changed();
	}
	models(force = false) {
		if (this.pending) return this.pending;
		if (!force && this.cached && Date.now() - this.loadedAt < 5e3) return Promise.resolve(this.cached);
		const generation = this.generation;
		const pending = this.readModels().then((catalog) => {
			const fingerprint = JSON.stringify({
				models: catalog.models,
				metadata: catalog.metadata
			});
			const changed = fingerprint !== this.fingerprint;
			catalog.revision = changed ? Math.max(Date.now(), (this.cached?.revision ?? 0) + 1) : this.cached.revision;
			this.fingerprint = fingerprint;
			this.cached = catalog;
			if (generation === this.generation) this.loadedAt = Date.now();
			if (changed) this.changed();
			return catalog;
		}).finally(() => {
			if (this.pending === pending) this.pending = void 0;
		});
		this.pending = pending;
		return pending;
	}
	async readModels() {
		const llm = this.ctx.get("llm");
		if (!llm) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH model service is unavailable.");
		const providers = llm.listProviders();
		const failures = [];
		const models = (await Promise.all(providers.map(async (provider) => {
			try {
				const models = await llm.listModels(provider.id);
				return await Promise.all(models.map(async (model) => {
					const selection = {
						provider: provider.id,
						model: model.id
					};
					const entry = {
						id: modelSelectionId(selection),
						title: model.name || model.id,
						selectionId: modelSelectionId(selection),
						enabled: true,
						...model.description ? { description: model.description } : {},
						reasoningItems: [],
						metadata: {
							provider: provider.id,
							providerName: provider.name || provider.id,
							model: model.id,
							modelName: model.name || model.id,
							reasoningEffort: null
						}
					};
					try {
						entry.reasoningItems = ((await llm.resolveModelInfo(provider.id, model.id)).reasoning?.efforts ?? []).map((effort) => ({
							id: effort.id,
							title: effort.name || effort.id,
							enabled: true,
							selectionId: modelSelectionId({
								...selection,
								reasoningEffort: effort.id
							}),
							...effort.description ? { description: effort.description } : {}
						}));
					} catch {
						entry.enabled = false;
						entry.disabledReason = "DSH could not read this model’s capabilities.";
					}
					return entry;
				}));
			} catch {
				const message = "DSH could not load this provider’s models. Refresh to retry.";
				failures.push({
					provider: provider.id,
					name: provider.name,
					message
				});
				return (this.cached?.models.filter((item) => item.metadata.provider === provider.id) ?? []).map((item) => ({
					...item,
					enabled: false,
					disabledReason: message
				}));
			}
		}))).flat();
		labelModels(models);
		return {
			runtime: "dsh",
			revision: 0,
			models,
			metadata: {
				failures,
				routableProviders: providers.map((provider) => provider.id)
			}
		};
	}
	permissions() {
		const service = this.ctx.get("permissionPresets");
		if (!service) throw new BridgeError("UNSUPPORTED_OPERATION", "This DSH deployment does not provide permission presets.");
		const permissions = service.catalog().options.map((option) => {
			const preset = option.value;
			return {
				id: permissionSelectionId(preset),
				title: preset === "auto" ? "Auto review" : option.name,
				selectionId: permissionSelectionId(preset),
				description: option.description,
				enabled: true,
				metadata: { preset }
			};
		});
		const fingerprint = JSON.stringify(permissions);
		if (fingerprint !== this.permissionFingerprint) {
			this.permissionFingerprint = fingerprint;
			this.permissionRevision = Math.max(Date.now(), this.permissionRevision + 1);
		}
		return {
			runtime: "dsh",
			revision: this.permissionRevision,
			permissions
		};
	}
	async agentPresets() {
		const service = this.ctx.get("agentPresets");
		if (!service) throw new BridgeError("UNSUPPORTED_OPERATION", "This DSH deployment does not provide Agent presets.");
		const presets = (await service.list()).map((preset) => ({
			id: preset.id,
			name: preset.name || preset.id,
			description: preset.description,
			enabled: !preset.broken,
			disabledReason: preset.broken
		}));
		const initial = presets.some((preset) => preset.id === service.defaultId && preset.enabled) ? service.defaultId : void 0;
		return {
			runtime: "dsh",
			revision: 3,
			presets,
			configField: {
				type: "string",
				minLength: 1,
				title: "新会话默认模式",
				description: "仅用于以后创建的会话，已有会话保持原模式。",
				...initial ? { default: initial } : {},
				enum: presets.map((preset) => preset.id)
			},
			uiField: {
				component: "select",
				options: presets.map((preset) => ({
					value: preset.id,
					label: preset.name,
					description: preset.description,
					disabled: !preset.enabled,
					disabledReason: preset.disabledReason
				}))
			}
		};
	}
};
/** Label the full directory before search/pagination so filtering cannot change identities or labels. */
function labelModels(models) {
	for (const item of models) {
		const { provider, providerName, model, modelName } = item.metadata;
		const sameName = models.filter((candidate) => candidate.metadata.modelName === modelName);
		const multipleProviders = sameName.some((candidate) => candidate.metadata.provider !== provider);
		const duplicateProviderName = sameName.some((candidate) => candidate.metadata.provider !== provider && candidate.metadata.providerName === providerName);
		const duplicateModelName = sameName.some((candidate) => candidate.metadata.provider === provider && candidate.metadata.model !== model);
		const routeLabel = duplicateProviderName ? `${providerName} / ${provider}` : providerName;
		item.title = `${modelName}${multipleProviders ? `（${routeLabel}）` : ""}${duplicateModelName ? ` [${model}]` : ""}`;
	}
}
// src/host/dsh-runtime/configuration.ts
/** Official configuration writes are immediate; the Agent owns their execution timing. */
var RuntimeConfiguration = class {
	ctx;
	constructor(ctx) {
		this.ctx = ctx;
	}
	get canSelectModel() {
		return Boolean(this.ctx.get("sessionController") && this.ctx.get("llm"));
	}
	get canSelectPermission() {
		return Boolean(this.ctx.get("sessionController") && this.ctx.get("permissionPresets") && this.ctx.get("commands"));
	}
	controller() {
		const controller = this.ctx.get("sessionController");
		if (!controller) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH Session Controller is required for configuration and messaging.");
		return controller;
	}
	async agent(id) {
		const found = await this.controller().resolveAgent(id);
		if ("error" in found) throw new BridgeError("DSH_SERVICE_UNAVAILABLE", "DSH could not activate this session. Retry when the session is available.", true);
		return found.agent;
	}
	async validate(selections, initial = false) {
		if (initial && !selections.model) throw new BridgeError("INVALID_PARAMS", "Choose a model in AA before creating a DSH session.");
		if (initial && this.ctx.get("permissionPresets") && !selections.permission) throw new BridgeError("INVALID_PARAMS", "Choose permissions in AA before creating a DSH session.");
		if (selections.model) {
			if (!this.canSelectModel) this.controller();
			const selection = decodeModelSelection(selections.model);
			try {
				await this.ctx.get("llm").resolveCallConfig({
					provider: selection.provider,
					model: selection.model,
					...selection.reasoningEffort ? { reasoningEffort: ReasoningEffortId(selection.reasoningEffort) } : {}
				});
			} catch {
				throw new BridgeError("INVALID_PARAMS", "DSH rejected this provider, model or effort. Refresh the model list and select an available combination.");
			}
		}
		if (selections.permission) {
			const preset = decodePermissionSelection(selections.permission);
			const service = this.ctx.get("permissionPresets");
			if (!service || !service.names.includes(preset)) throw new BridgeError("INVALID_PARAMS", "This DSH permission preset is unavailable. Refresh the permission list.");
			if (!initial && !this.canSelectPermission) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH does not provide the live permission command.");
		}
	}
	async validatePreset(id) {
		if (typeof id !== "string" || !id || id.length > 256) throw new BridgeError("INVALID_PARAMS", "Choose a default Agent mode in the AA Runtime configuration.");
		const presets = this.ctx.get("agentPresets");
		if (!presets) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH Agent presets are unavailable.");
		const preset = (await presets.list()).find((preset) => preset.id === id);
		if (!preset || preset.broken) throw new BridgeError("INVALID_PARAMS", "The configured Agent mode is missing or cannot be loaded. Choose another mode in AA Runtime configuration.");
		return preset.id;
	}
	async apply(agent, selections, initial, signal) {
		signal.throwIfAborted();
		if (selections.model) {
			const requested = decodeModelSelection(selections.model);
			const current = this.ctx.get("sessionProjections").snapshot(agent.session, ["modelSelection"]).values.modelSelection?.next;
			if (!current || modelSelectionId(current) !== selections.model) await this.controller().selectModel({
				sessionId: agent.id,
				...requested
			});
		}
		if (selections.permission) {
			const preset = decodePermissionSelection(selections.permission);
			if (initial) this.ctx.get("permissionPresets").set(agent.session, preset);
			else if (this.ctx.get("permissionPresets").current(agent.session) !== preset) {
				const commands = this.ctx.get("commands");
				if (!commands?.find(agent, "permission")) throw new BridgeError("UNSUPPORTED_OPERATION", "This Agent does not provide the permission command.");
				if ((await commands.execute(agent, `/permission ${preset}`, [], signal))?.result.kind !== "success") throw new BridgeError("DSH_SERVICE_UNAVAILABLE", "DSH could not apply this permission preset. Refresh the current session state.", true);
			}
		}
		await this.ctx.sessions.flush(agent.session);
	}
	/** Official projections work for cold sessions too, without resuming their Agent. */
	async state(id, snapshot) {
		const live = this.ctx.sessions.get(id);
		const log = snapshot ?? (live ? void 0 : await this.ctx.sessionQuery.readSession(id));
		const projections = this.ctx.get("sessionProjections");
		const projected = projections && (live ? projections.snapshot(live, [
			"modelSelection",
			"permissions",
			"agentPreset"
		]) : projections.restore({}, log.events, SessionLogOffset(0), log.session, log.inheritedEventCount).snapshot);
		const events = live?.snapshotEvents() ?? log.events;
		const header = live?.header ?? log.session;
		const rawModel = projected?.values.modelSelection?.next;
		const lastUsed = projected?.values.modelSelection?.lastUsed;
		const request = record(record(events.findLast((event) => event.type === "request/header")?.data).header).config;
		const model = rawModel ?? modelFromRecord(request);
		const permission = projected?.values.permissions?.currentValue;
		const presetEvent = events.findLast((event) => event.type === "agent-preset/selected");
		const agentPreset = projected?.values.agentPreset ?? (presetEvent?.type === "agent-preset/selected" ? presetEvent.data.agentPreset : header.agentPreset);
		return {
			selections: {
				...model ? { model: modelSelectionId(model) } : {},
				...permission ? { permission: permissionSelectionId(permission) } : {}
			},
			metadata: {
				configurationSeq: Number(projected?.asOfSeq ?? events.at(-1)?.seq ?? -1),
				agentPreset: agentPreset ?? null,
				cwd: header.cwd ?? null,
				...model ? { modelSelection: model } : {},
				...permission ? { permissionPreset: {
					id: permission,
					name: this.ctx.get("permissionPresets")?.optionOf(permission).name ?? permission,
					selectable: permission !== "custom"
				} } : {},
				...lastUsed ? { lastUsedModel: lastUsed } : {},
				...permission === "custom" ? { permission: {
					id: "custom",
					name: "Custom",
					selectable: false
				} } : {}
			}
		};
	}
};
function modelFromRecord(value) {
	const model = record(value);
	if (typeof model.provider !== "string" || typeof model.model !== "string") return;
	return {
		provider: model.provider,
		model: model.model,
		...typeof model.reasoningEffort === "string" ? { reasoningEffort: model.reasoningEffort } : {}
	};
}
// src/host/dsh-runtime/commands.ts
const ONLINE_STATUSES = [
	"idle",
	"running",
	"waiting",
	"pending",
	"stopping",
	"waiting_approval",
	"error",
	"blocked"
];
/** Native compatibility catalog. AA routes plan through its shared Planning use cases. */
var RuntimeCommands = class {
	ctx;
	configuration;
	source;
	changed;
	instance = randomUUID();
	revision = 0;
	unwatch;
	constructor(ctx, configuration, source, changed) {
		this.ctx = ctx;
		this.configuration = configuration;
		this.source = source;
		this.changed = changed;
		this.unwatch = ctx.on("commands/change", () => this.invalidate(), { global: true });
	}
	invalidate() {
		this.revision++;
		this.changed();
	}
	close() {
		this.unwatch();
	}
	async capability(id) {
		const catalogRevision = `${this.instance}:${this.revision}`;
		const supported = Boolean(this.ctx.get("commands") && this.ctx.get("sessionController"));
		if (!supported) return {
			supported: false,
			available: false,
			catalogRevision,
			reason: "DSH commands registry and Session Controller are required."
		};
		if (id) {
			const state = await this.source.state(id);
			if (state.availability !== "available") return {
				supported,
				available: false,
				catalogRevision,
				reason: `DSH commands are unavailable for this session (${state.reason ?? state.availability}).`
			};
		}
		return {
			supported,
			available: true,
			catalogRevision
		};
	}
	registry() {
		const registry = this.ctx.get("commands");
		if (!registry || !this.ctx.get("sessionController")) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH commands registry and Session Controller are required.");
		return registry;
	}
	async agent(id, signal) {
		signal.throwIfAborted();
		const agent = await this.configuration.agent(id);
		signal.throwIfAborted();
		if (agent.id !== id || agent.session.id !== id) throw new BridgeError("INVALID_PARAMS", "DSH resolved a different session Agent.");
		await this.source.requireAvailable(id);
		signal.throwIfAborted();
		return agent;
	}
	async list(id, params, signal) {
		const registry = this.registry();
		if (params.query !== void 0 && params.query !== null && typeof params.query !== "string") throw new BridgeError("INVALID_PARAMS", "The command query must be a string.");
		const limit = params.limit ?? 50;
		if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > 1e3) throw new BridgeError("INVALID_PARAMS", "The command limit must be an integer between 1 and 1000.");
		const query = typeof params.query === "string" ? params.query.toLocaleLowerCase() : "";
		const agent = await this.agent(id, signal);
		return { commands: registry.list(agent).filter((item) => item.name === "compact" || item.name === "plan" && Boolean(this.ctx.get("planMode"))).filter((item) => `${item.name} ${item.description} ${item.input?.hint ?? ""}`.toLocaleLowerCase().includes(query)).slice(0, limit).map((item) => ({
			id: item.name,
			title: item.name,
			description: item.description,
			aliases: [],
			scope: "session",
			enabled: true,
			acceptsArgs: item.input !== void 0,
			...item.input ? { argsSchema: {
				type: "string",
				description: item.input.hint
			} } : {},
			metadata: {
				...item.definitionId ? { definitionId: item.definitionId } : {},
				...item.input ? { input: item.input } : {},
				attachmentsAvailable: false,
				ui: {
					kind: "execute",
					...item.input ? { argumentHint: item.input.hint } : {},
					acceptsMultiline: true,
					allowedStatuses: [...ONLINE_STATUSES]
				}
			}
		})) };
	}
	async execute(id, params, signal) {
		const registry = this.registry();
		const command = typeof params.command === "string" ? params.command : "";
		const fail = (code, message) => ({
			command,
			ok: false,
			code,
			message,
			result: {}
		});
		if (!command || parseCommand(`/${command}`)?.name !== command) return fail("invalid_command", "Use the native command name from the catalog.");
		if (command !== "compact" && !(command === "plan" && Boolean(this.ctx.get("planMode")))) return fail("unknown_command", "This DSH command is not available in AA.");
		const args = params.args === void 0 ? [] : params.args;
		if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) return fail("invalid_command", "Command arguments must be strings.");
		if (params.attachments !== void 0 && (!Array.isArray(params.attachments) || params.attachments.length)) return fail("command_attachments_unsupported", "AA command attachments are unavailable. Keep attachments in the draft.");
		let line;
		if (params.raw !== void 0 && params.raw !== null) {
			if (typeof params.raw !== "string") return fail("invalid_command", "The raw command must be a string.");
			line = params.raw;
		} else {
			if (args.length > 1) return fail("invalid_command", "Provide exact raw input for multiple command arguments.");
			line = `/${command}${args.length ? ` ${args[0]}` : ""}`;
		}
		const parsed = parseCommand(line);
		if (!parsed || parsed.name !== command) return fail("invalid_command", "The raw command must invoke the requested native command name.");
		const agent = await this.agent(id, signal);
		signal.throwIfAborted();
		try {
			const execution = await registry.execute(agent, line, [], signal);
			if (!execution) return fail("unknown_command", "This native DSH command is not registered for this Agent. Refresh the command menu.");
			const result = execution.result;
			return {
				command,
				ok: result.kind === "success",
				...result.kind === "error" ? { code: "command_error" } : {},
				...result.text !== void 0 ? { message: result.text } : {},
				result: {
					commandId: execution.commandId,
					kind: result.kind,
					...result.text !== void 0 ? { text: result.text } : {},
					...result.kind === "success" && result.sourceEventSeq !== void 0 ? { sourceEventSeq: Number(result.sourceEventSeq) } : {},
					executionState: result.kind === "success" ? "accepted" : "completed"
				}
			};
		} catch {
			return {
				command,
				ok: false,
				code: signal.aborted ? "command_outcome_unknown" : "command_failed",
				message: "DSH command execution could not be confirmed. Refresh session state before deciding whether to submit again.",
				result: {
					executionState: "unknown",
					retryable: false
				}
			};
		}
	}
};
// src/host/dsh-runtime/planning.ts
var RuntimePlanning = class {
	ctx;
	configuration;
	constructor(ctx, configuration) {
		this.ctx = ctx;
		this.configuration = configuration;
	}
	service() {
		const value = this.ctx.get("planMode");
		return value && typeof value.get === "function" && typeof value.set === "function" ? value : void 0;
	}
	async read(id) {
		const service = this.service();
		if (!service) return { available: false };
		return {
			available: true,
			...service.get(await this.configuration.agent(id))
		};
	}
	async set(id, active) {
		const service = this.service();
		if (!service) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH Plan service is not composed; enable the native plan-mode plugin.");
		const agent = await this.configuration.agent(id);
		const outcome = service.set(agent, active);
		await this.ctx.sessions.flush(agent.session);
		return {
			outcome,
			...service.get(agent)
		};
	}
};
// src/host/dsh-runtime/creation-intents.ts
/** Retry bookkeeping only. Model, permission and mode facts remain in official DSH session storage. */
var CreationIntents = class {
	directory;
	constructor(directory) {
		this.directory = directory;
	}
	async read(id) {
		const value = await readJson$1(this.path(id));
		if (value && (typeof value.requestId !== "string" || !/^[a-f0-9]{64}$/.test(value.fingerprint))) throw new Error("Invalid DSH creation receipt");
		return value;
	}
	write(id, intent) {
		return writeJson(this.path(id), intent);
	}
	path(id) {
		return join(this.directory, `${digest(id)}.json`);
	}
};
// src/host/dsh-runtime/turn-outcome.ts
/** Card action that asks DSH to continue a failed turn instead of resending the message. */
const CONTINUE_ACTION = "continue";
/** Card identity of the turn closed by the `turn/end` at `endSeq`. */
function turnOutcomeNoticeId(platformId, endSeq) {
	return itemId(platformId, "turn-outcome", String(endSeq));
}
/** Prompt identity that continues the turn closed at `endSeq`; DSH admits it once. */
function continuationRequestId(externalId, endSeq) {
	return userMessageId(externalId, `continue:${endSeq}`);
}
/** Reasons that end a turn on the user's request or by bookkeeping, never by surprise. */
const SILENT_REASONS = /* @__PURE__ */ new Set([
	"aborted",
	"interrupted",
	"forked"
]);
function visibleOutput(event) {
	if (event.type === "tool/call") return true;
	if (event.type !== "assistant/message") return false;
	return event.data.message.content.some((block) => block.type === "tool-call" || block.type === "image" || block.type === "text" && block.text.trim().length > 0);
}
/** Outcome of the turn closed at `endIndex`, or undefined when it needs no notice. */
function outcomeAt(events, endIndex) {
	const end = events[endIndex];
	if (end?.type !== "turn/end") return void 0;
	const reason = end.data.reason;
	if (SILENT_REASONS.has(reason.kind)) return void 0;
	let steps = 0, replied = false;
	for (let index = endIndex - 1; index >= 0; index--) {
		const event = events[index];
		if (event.type === "turn/start" || event.type === "turn/end") break;
		if (event.type === "step/start") steps++;
		if (visibleOutput(event)) replied = true;
	}
	const base = {
		endSeq: Number(end.seq),
		reason: reason.kind,
		steps
	};
	if (reason.kind === "error") {
		const failure = record(reason.error);
		return {
			...base,
			kind: "failed",
			error: {
				code: typeof failure.code === "string" && failure.code ? failure.code : "UNKNOWN",
				message: typeof failure.message === "string" ? failure.message : ""
			}
		};
	}
	return replied ? void 0 : {
		...base,
		kind: "no_reply"
	};
}
/** Outcome of the turn closed by the `turn/end` at `endSeq`. */
function turnOutcome(events, endSeq) {
	return outcomeAt(events, events.findLastIndex((event) => Number(event.seq) === endSeq));
}
/**
* Outcome of the latest turn that ended before `beforeSeq` (default: the whole
* log), when no turn has started since. A started turn replaces the notice.
*/
function latestTurnOutcome(events, beforeSeq = Infinity) {
	for (let index = events.length - 1; index >= 0; index--) {
		const event = events[index];
		if (Number(event.seq) >= beforeSeq) continue;
		if (event.type === "turn/start") return void 0;
		if (event.type === "turn/end") return outcomeAt(events, index);
	}
}
/**
* A non-blocking error card, like Codex's failed-turn notice: the turn is
* already over, so the composer stays usable and the next turn closes it.
* A failure DSH can continue offers to do so without resending the message.
*/
function turnOutcomeNotice(namespace, externalId, outcome, status = "open") {
	const platformId = sessionId(namespace, externalId);
	const failed = outcome.kind === "failed";
	const continuable = status === "open" && outcome.continuable === true;
	return {
		noticeId: turnOutcomeNoticeId(platformId, outcome.endSeq),
		sessionId: platformId,
		runtime: "dsh",
		type: "interaction",
		interactionType: "execution_error",
		title: failed ? "本轮执行失败" : "本轮没有回复",
		message: failed ? outcome.error?.message || "本轮执行失败，没有生成回复。" : outcome.steps === 0 ? "本轮已结束，但没有调用模型，也没有生成回复。可以重新发送这条消息。" : "本轮已结束，但模型没有生成任何回复。可以重新发送或换个说法再试。",
		severity: failed ? "error" : "warning",
		status,
		responseRequired: false,
		blocking: null,
		actions: continuable ? [{
			actionId: CONTINUE_ACTION,
			label: "继续",
			style: "primary"
		}] : [],
		source: {
			runtime: "dsh",
			component: "dsh.turn"
		},
		context: {
			kind: "execution_error",
			outcome: outcome.kind,
			turnEndReason: outcome.reason,
			steps: outcome.steps,
			...outcome.error ? { error: outcome.error } : {}
		},
		metadata: {
			source: failed ? "dsh.turn.failed" : "dsh.turn.no_reply",
			turnEndSeq: outcome.endSeq
		}
	};
}
/** Last terminal turn outcome, which decides a cold session's status. */
function lastTurnEndKind(events) {
	const last = events.findLast((event) => event.type === "turn/end");
	return last?.type === "turn/end" ? last.data.reason.kind : void 0;
}
/** Whether DSH already admitted the prompt with this request identity. */
function admitted(events, requestId) {
	const matches = (message) => message.id === requestId || record(message.source).rpcId === requestId;
	return events.some((event) => event.type === "user/message" ? matches(event.data) : event.type === "agent/inbox/spliced" && event.data.inserted.some(matches));
}
/** All native interpretation stays in the Host; observers never await transport work. */
var NativeRuntime = class {
	ctx;
	diagnostics;
	presence;
	questions;
	approvals;
	listeners = /* @__PURE__ */ new Set();
	source;
	catalogs;
	configuration;
	planning;
	commands;
	writes = /* @__PURE__ */ new Map();
	closed = false;
	creations;
	attachments;
	facts = /* @__PURE__ */ new Map();
	constructor(ctx, creationDirectory, diagnostics = new RuntimeDiagnostics(), legacyAttachmentStaging) {
		this.ctx = ctx;
		this.diagnostics = diagnostics;
		this.creations = new CreationIntents(creationDirectory);
		this.attachments = new RuntimeAttachments(join(dirname(creationDirectory), "attachments"), legacyAttachmentStaging);
		this.catalogs = new RuntimeCatalogs(ctx, () => this.emit({
			type: "catalogs",
			catalogType: "model"
		}));
		this.configuration = new RuntimeConfiguration(ctx);
		this.planning = new RuntimePlanning(ctx, this.configuration);
		this.source = new NativeSessionSource(ctx, diagnostics);
		this.commands = new RuntimeCommands(ctx, this.configuration, this.source, () => this.emit({ type: "commands" }));
		ctx.on("llm/adapters-updated", () => this.catalogs.invalidate(), { global: true });
		ctx.on("permission-presets/catalog-changed", () => this.emit({
			type: "catalogs",
			catalogType: "permission"
		}), { global: true });
		for (const key of [
			"sessionController",
			"permissionPresets",
			"commands",
			"agentPresets",
			"attachments",
			"fileUploads"
		]) ctx.inject([key], (child) => {
			if (key === "commands" || key === "sessionController") this.commands.invalidate();
			this.emit({ type: "capabilities" });
			child.effect(() => () => {
				if (key === "commands" || key === "sessionController") this.commands.invalidate();
				this.emit({ type: "capabilities" });
			}, "runtime.configuration-capabilities");
		});
		this.presence = new ClientPresence(() => {});
		this.approvals = new UserApprovals(ctx, (id) => this.visible(id), (id) => this.emit(id ? {
			type: "approval",
			id
		} : { type: "capabilities" }), this.diagnostics);
		this.questions = new UserQuestions(ctx, (id) => this.visible(id), (id) => this.emit(id ? {
			type: "question",
			id
		} : { type: "capabilities" }), this.diagnostics);
		ctx.on("session/created", (session) => {
			this.source.observe(session);
			this.emit({
				type: "session",
				id: session.id
			});
		}, { global: true });
		ctx.on("session/event", (session, event) => {
			this.source.observe(session, event);
			this.questions.observe(session.id, event);
			this.approvals.observe(session.id, event);
			this.emit({
				type: "event",
				id: session.id,
				event
			});
		}, { global: true });
		ctx.on("session/disposed", (session) => {
			this.source.release(session.id);
			this.emit({
				type: "session",
				id: session.id
			});
		}, { global: true });
		const attempts = /* @__PURE__ */ new Map();
		ctx.on("agent/assistant-stream", ({ agent, frame }) => {
			if (frame.type === "start") attempts.set(agent.id, frame);
			else {
				const attempt = attempts.get(agent.id);
				if (attempt?.attemptId !== frame.attemptId) return;
				if (frame.type === "chunk") this.emit({
					type: "stream",
					id: agent.id,
					turn: attempt.turn,
					step: attempt.step,
					chunk: frame.chunk,
					time: frame.time,
					throughSeq: Number(agent.session.seq) - 1
				});
				else {
					attempts.delete(agent.id);
					if (frame.outcome.kind === "abandoned") this.emit({
						type: "refresh",
						id: agent.id,
						interrupted: true
					});
				}
			}
		}, { global: true });
		ctx.on("agent/status", ({ agent }) => this.emit({
			type: "status",
			id: agent.id
		}), { global: true });
		ctx.on("domain/changed", (change) => {
			if (change.domain !== "workspace") return;
			if (change.table === "" && change.operation === "put") {
				const ids = record(change.value).archivedSessionIds;
				if (Array.isArray(ids)) {
					const next = new Set(ids.filter((id) => typeof id === "string"));
					if (next.size !== this.source.archived.size || [...next].some((id) => !this.source.archived.has(id))) {
						this.source.archived = next;
						this.emit({ type: "visibility" });
					}
				}
			}
		});
	}
	watch(callback) {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}
	refresh(id) {
		this.source.retry(id);
		this.emit({
			type: "refresh",
			id
		});
	}
	emit(change) {
		for (const listener of this.listeners) try {
			listener(change);
		} catch {}
	}
	workspaces() {
		return this.ctx.workspaceRegistry.list().map((w) => ({
			id: w.id,
			title: w.title,
			path: w.path,
			sessionIds: [...w.sessionIds]
		}));
	}
	status(id) {
		return this.ctx.get("agents")?.get(id)?.status;
	}
	async capabilities(platformId, id) {
		let model = false;
		let catalog;
		if (this.configuration.canSelectModel) try {
			catalog = await this.catalogs.models();
			model = catalog.metadata.routableProviders.length > 0;
		} catch (error) {
			this.diagnostics.log("error", "capabilities.model_catalog_failed", {}, error);
		}
		const effort = Boolean(catalog?.models.some((item) => item.enabled && item.reasoningItems.some((option) => option.enabled)));
		const result = capabilities(platformId, Boolean(this.ctx.get("sessionController")), this.questions.available, {
			model,
			effort,
			approval: this.approvals.available,
			attachments: Boolean(this.ctx.get("attachments")),
			files: Boolean(this.ctx.get("fileUploads")),
			permission: this.configuration.canSelectPermission && (!id || !this.ctx.get("agents")?.get(id) || Boolean(this.ctx.get("commands").find(this.ctx.get("agents").get(id), "permission"))),
			commands: await this.commands.capability(id)
		});
		const planning = Boolean(this.planning.service());
		Object.assign(result.capabilities.find((item) => item.capabilityId === "session.planning"), {
			capabilityId: "session.planning",
			scope: platformId ? "session" : "runtime",
			...platformId ? { sessionId: platformId } : {},
			runtime: "dsh",
			version: "1",
			supported: false,
			available: false,
			allowed: true,
			metadata: {
				nativePlanningAvailable: planning,
				contentStreaming: "native_delta"
			}
		});
		return {
			...result,
			metadata: {
				...result.metadata,
				...catalog ? { modelCatalogFailures: catalog.metadata.failures } : {}
			}
		};
	}
	candidates() {
		return this.source.candidates();
	}
	async inventory(signal, visit) {
		await this.source.initialize(signal);
		const result = [];
		const entries = [...this.source.records.values()];
		const loaded = (entry) => this.ctx.sessions.get(entry.header.id) !== void 0;
		for (const entry of [...entries.filter(loaded), ...entries.filter((entry) => !loaded(entry))]) {
			signal?.throwIfAborted();
			if (await this.visible(entry.header.id)) {
				result.push(entry);
				await visit?.(entry);
			}
		}
		this.diagnostics.log("info", "inventory.completed", {
			candidates: this.source.records.size,
			visible: result.length,
			archived: this.source.archived.size
		});
		return result;
	}
	visible(id) {
		return this.source.visible(id);
	}
	/** Resolve the startup inventory once; native events maintain it afterwards. */
	async ensureKnown(id, signal) {
		if (this.source.records.has(id) || this.ctx.sessions.get(id) !== void 0) return;
		await this.source.initialize(signal);
	}
	get retainedFactCount() {
		return this.facts.size;
	}
	/**
	* Read the configuration facts of one session.
	*
	* Replaying a large session log is expensive and owned by DSH, so facts derived
	* from an unchanged log are reused. The key is the log identity, never wall time,
	* and nothing but the derived facts is retained.
	*/
	async stateFacts(id, snapshot) {
		const revision = snapshot?.bridgeRevision ?? await this.source.freshRevisionOf(id);
		if (revision !== void 0) {
			const cached = this.facts.get(id);
			if (cached !== void 0 && cached.revision === revision) {
				this.facts.delete(id);
				this.facts.set(id, cached);
				return cached.value;
			}
		}
		const live = this.ctx.sessions.get(id);
		const log = snapshot ?? (live !== void 0 ? void 0 : await this.source.readLog(id));
		const configuration = await this.configuration.state(id, log);
		const events = live?.snapshotEvents() ?? log.events;
		const value = {
			configuration,
			lastTurnEndKind: lastTurnEndKind(events),
			turnOutcome: latestTurnOutcome(events)
		};
		const actualRevision = log && "bridgeRevision" in log && typeof log.bridgeRevision === "string" ? log.bridgeRevision : revision;
		if (actualRevision !== void 0) {
			this.facts.delete(id);
			this.facts.set(id, {
				revision: actualRevision,
				value
			});
			while (this.facts.size > 128) {
				const oldest = this.facts.keys().next().value;
				if (oldest === void 0) break;
				this.facts.delete(oldest);
			}
		}
		return value;
	}
	async read(id) {
		await this.source.requireAvailable(id);
		let snapshot;
		try {
			snapshot = await this.diagnostics.measure("session.read", { sessionId: id }, async () => ({
				...await this.source.readLog(id),
				attachmentReceipts: await this.attachments.readReceipts(id)
			}));
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) this.source.markReadFailed(id);
			throw error;
		}
		await this.source.requireAvailable(id);
		return snapshot;
	}
	async send(id, text, requestId, cwd, create = false, selections = {}, agentPreset, signal = new AbortController().signal, images = [], platformId, planningIntent = false) {
		if (!text.trim() && !images.length && !planningIntent || text.length > 1e6 || !requestId || requestId.length > 512) throw new BridgeError("INVALID_PARAMS", "A text message and stable client message ID are required.");
		await this.write(id, signal, async () => {
			await this.source.initialize(signal);
			if (!create || this.source.archived.has(id)) await this.source.requireAvailable(id);
			const live = this.ctx.get("agents")?.get(id);
			const exists = live || !create || this.source.records.has(id);
			const log = live ? {
				session: live.session.header,
				events: live.session.snapshotEvents()
			} : exists ? await this.source.readLog(id) : void 0;
			if (create && log && (log.session.origin === "subagent" || this.source.archived.has(id))) throw new BridgeError("SESSION_NOT_FOUND", "The session is not visible in DSH.");
			if (!create && !await this.visible(id)) throw new BridgeError("SESSION_NOT_FOUND", "The session is not visible in DSH.");
			const messageId = userMessageId(id, requestId);
			const receipt = (await this.attachments.readReceipts(id))[messageId];
			if (receipt && (receipt.fingerprint !== attachmentFingerprint(text, images) || receipt.platformId !== platformId)) throw new BridgeError("INVALID_PARAMS", "This message ID was already used with different attachments.");
			let path;
			let fingerprint;
			const intent = create ? await this.creations.read(id) : null;
			if (create) {
				if (!cwd || !isAbsolute(cwd)) throw new BridgeError("INVALID_PARAMS", "Choose an absolute workspace directory.");
				try {
					path = await realpath(cwd);
					if (!(await stat(path)).isDirectory()) throw new Error("not a directory");
				} catch {
					throw new BridgeError("INVALID_PARAMS", "The workspace must be an accessible directory on the DSH device.");
				}
				fingerprint = digest(canonicalJson({
					requestId,
					content: text,
					planningIntent,
					cwd: path,
					agentPreset: agentPreset ?? null,
					model: selections.model ?? null,
					permission: selections.permission ?? null,
					...images.length ? { attachments: attachmentReferences(images).map((image) => ({ ...image })) } : {}
				}));
				if (intent && (intent.requestId !== requestId || intent.fingerprint !== fingerprint)) throw new BridgeError("INVALID_PARAMS", "This session was created with different initialization parameters.");
				if (log && log.session.cwd !== path) throw new BridgeError("INVALID_PARAMS", "The session already uses a different workspace.");
			}
			if (log !== void 0 && admitted(log.events, messageId)) {
				if (images.length && !receipt) throw new BridgeError("INVALID_PARAMS", "This message ID was already accepted without attachments.");
				return;
			}
			const store = this.ctx.get("attachments");
			if (images.length && (!store || !platformId)) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH attachments are unavailable.");
			let preset;
			try {
				await this.configuration.validate(selections, create);
				if (create) preset = await this.configuration.validatePreset(agentPreset);
			} catch (error) {
				if (create && !log && !intent && error instanceof BridgeError) throw new CreationNotStartedError(error);
				throw error;
			}
			if (create) {
				if (log?.events.some((event) => event.type === "turn/start")) throw new BridgeError("INVALID_PARAMS", "This session has already started. Continue it with a new message.");
				if (!intent) await this.creations.write(id, {
					requestId,
					fingerprint
				});
				await this.configuration.controller().create({
					sessionId: id,
					cwd: path,
					agentPreset: preset
				});
				await (await this.ctx.workspaceRegistry.create(path)).attachSession(id);
			}
			const agent = await this.configuration.agent(id);
			await this.configuration.apply(agent, selections, create, signal);
			if (planningIntent) {
				await this.planning.set(id, true);
				if (!text.trim() && !images.length) return;
			}
			if (this.source.archived.has(id)) await this.source.requireAvailable(id);
			if (this.closed || !create && !await this.visible(id)) throw new BridgeError("SESSION_NOT_FOUND", "The session is no longer visible in DSH.");
			const imageParts = images.length ? await this.attachments.prepare(images, store, signal, this.ctx.get("fileUploads") ? {
				service: this.ctx.get("fileUploads"),
				sessionId: id
			} : void 0) : [];
			if (images.length && !receipt) await this.attachments.remember(id, messageId, {
				platformId,
				fingerprint: attachmentFingerprint(text, images),
				attachments: attachmentReferences(images)
			});
			await this.configuration.controller().prompt({
				sessionId: id,
				requestId: messageId,
				mode: "queue",
				content: [...text ? [{
					type: "text",
					text
				}] : [], ...imageParts]
			}, signal);
			await this.ctx.sessions.flush(agent.session);
		});
	}
	/**
	* Whether DSH would continue the failed turn closed at `endSeq` with an empty
	* prompt. DSH 0.2.2-rc.3 reports that turn as its `conversationContinuation`
	* projection; older DSH has none, so its failed turns never offer to continue.
	*/
	async continuable(id, endSeq, signal = new AbortController().signal) {
		const controller = this.ctx.get("sessionController");
		if (typeof controller?.projections !== "function") return false;
		try {
			const value = await controller.projections({ sessionId: id }, signal);
			return value?.kind === "sequenced" && value.values.conversationContinuation === endSeq;
		} catch (error) {
			this.diagnostics.log("warn", "session.continuation_unavailable", { sessionId: id }, error);
			return false;
		}
	}
	/**
	* Continue the failed turn behind an error card with DSH's empty prompt. Only
	* the latest turn's card qualifies and DSH still decides whether its failure
	* can continue; the request identity makes a repeated response a no-op.
	*/
	async continueTurn(namespace, id, noticeId, signal) {
		const platformId = sessionId(namespace, id);
		const unavailable = {
			ok: false,
			code: "dsh_continue_unavailable",
			message: "这一轮已无法继续生成，请重新发送消息。"
		};
		try {
			return await this.write(id, signal, async () => {
				if (!await this.visible(id)) throw new BridgeError("SESSION_NOT_FOUND", "The session is not visible in DSH.");
				const events = this.ctx.sessions.get(id)?.snapshotEvents() ?? (await this.source.readLog(id)).events;
				const end = events.findLast((event) => event.type === "turn/end" && turnOutcomeNoticeId(platformId, Number(event.seq)) === noticeId);
				if (!end) return unavailable;
				const endSeq = Number(end.seq);
				const requestId = continuationRequestId(id, endSeq);
				const accepted = {
					ok: true,
					result: {
						resolved: true,
						noticeId,
						sessionId: platformId
					}
				};
				if (admitted(events, requestId)) return accepted;
				const outcome = latestTurnOutcome(events);
				if (outcome?.kind !== "failed" || outcome.endSeq !== endSeq) return unavailable;
				const agent = await this.configuration.agent(id);
				try {
					await this.configuration.controller().prompt({
						sessionId: id,
						requestId,
						mode: "queue",
						content: []
					}, signal);
				} catch (error) {
					if (record(error).isDSHRemoteError === true && record(error).code === "session/agent-busy") return unavailable;
					throw error;
				}
				await this.ctx.sessions.flush(agent.session);
				return accepted;
			});
		} catch (error) {
			const failure = publicError(error);
			return {
				ok: false,
				code: failure.code,
				message: failure.message
			};
		}
	}
	async updateSelections(id, selections, signal) {
		return this.write(id, signal, async () => {
			await this.source.initialize(signal);
			await this.source.requireAvailable(id);
			await this.configuration.validate(selections);
			const agent = await this.configuration.agent(id);
			try {
				await this.configuration.apply(agent, selections, false, signal);
			} finally {
				this.emit({
					type: "status",
					id
				});
			}
			return this.configuration.state(id);
		});
	}
	/** Hold admission only; no operation waits for an Agent turn to finish. */
	async write(id, signal, operation) {
		const task = (this.writes.get(id) ?? Promise.resolve()).catch(() => void 0).then(() => {
			signal.throwIfAborted();
			if (this.closed) throw new BridgeError("DSH_SERVICE_UNAVAILABLE", "DSH bridge is closing.", true);
			return operation();
		});
		this.writes.set(id, task);
		try {
			return await task;
		} finally {
			if (this.writes.get(id) === task) this.writes.delete(id);
		}
	}
	async interrupt(id) {
		await this.source.requireAvailable(id);
		this.ctx.get("agents")?.get(id)?.cancel({ kind: "user" });
	}
	async close() {
		this.closed = true;
		this.presence.close();
		this.source.close();
		this.commands.close();
		await this.questions.close();
		await this.approvals.close();
		this.listeners.clear();
		await Promise.allSettled([...this.writes.values()]);
		this.facts.clear();
	}
};
// src/host/dsh-runtime/plan-draft.ts
function partialString(raw) {
	const match = /"plan"\s*:\s*"/.exec(raw);
	if (!match) return void 0;
	const start = match.index + match[0].length - 1;
	let escape = false;
	for (let i = start + 1; i < raw.length; i++) {
		if (raw[i] === "\"" && !escape) try {
			return JSON.parse(raw.slice(start, i + 1));
		} catch {
			return;
		}
		escape = raw[i] === "\\" && !escape;
	}
	for (let trim = 0; trim < 7 && trim < raw.length - start; trim++) try {
		return JSON.parse(`${raw.slice(start, raw.length - trim)}"`).replace(/[\uD800-\uDBFF]$/, "");
	} catch {}
}
var PlanDrafts = class {
	calls = /* @__PURE__ */ new Map();
	reset(session) {
		for (const key of this.calls.keys()) if (key.startsWith(`${session}:`)) this.calls.delete(key);
	}
	observe(session, turn, step, chunk) {
		if (!("index" in chunk)) return void 0;
		const key = `${session}:${turn}:${step}:${chunk.index}`;
		if (chunk.type === "block-start") {
			const start = chunk;
			this.calls.set(key, {
				id: start.id ?? key,
				name: start.name ?? "",
				args: ""
			});
			return;
		}
		if (chunk.type !== "tool-call-delta" && chunk.type !== "block-end") return void 0;
		const old = this.calls.get(key);
		if (old?.closed) return void 0;
		let call;
		if (chunk.type === "block-end") {
			if (chunk.block.type !== "tool-call") return void 0;
			call = {
				id: chunk.block.id,
				name: chunk.block.name,
				args: chunk.block.arguments,
				closed: true
			};
		} else {
			const same = !old || !chunk.id || old.id === chunk.id;
			call = {
				id: chunk.id ?? old?.id ?? key,
				name: chunk.name ?? (same ? old?.name : "") ?? "",
				args: (same ? old?.args ?? "" : "") + (chunk.argumentsDelta ?? "")
			};
		}
		if (call.args.length > 4194304) {
			this.calls.delete(key);
			return;
		}
		this.calls.set(key, call);
		if (this.calls.size > 128) this.calls.delete(this.calls.keys().next().value);
		const text = call.name === "exit_plan_mode" ? partialString(call.args) : void 0;
		return text === void 0 ? void 0 : {
			kind: "draft",
			nativeId: call.id,
			text
		};
	}
};
// src/host/dsh-runtime/sync.ts
function matchesCheckpoint(value, projection) {
	const checkpoint = record(value);
	return checkpoint.version === 1 && checkpoint.projectionVersion === 3 && checkpoint.settled === true && projection.settled && checkpoint.throughSeq === projection.throughSeq && checkpoint.historyHash === projection.historyHash;
}
const MAX_BUFFER = 1e4;
const MAX_QUEUED_BYTES = 16777216;
const MAX_BYTES = 6291456;
/** Per-session changes that only say "reread this fact"; one queued copy suffices. */
const SESSION_INVALIDATIONS = /* @__PURE__ */ new Set([
	"session",
	"status",
	"question",
	"approval"
]);
/** Events with notifications or side effects that a recalibrating baseline does not repeat. */
const RETAINED_EVENTS = /* @__PURE__ */ new Set([
	"turn/end",
	"plan/mode",
	"model/selection",
	"agent-preset/selected"
]);
var SyncTransportError = class extends Error {};
/** The Connector's code for a Server it cannot reach; see contracts/dsh-bridge/2.0. */
const BACKEND_UNAVAILABLE = "backend_unavailable";
const BATCH_RETRY_BASE_MS = 1e3;
const BATCH_RETRY_MAX_MS = 3e4;
/** One ordered subscription. A batch's delivery call returns only after the Connector ingested it. */
var SyncFeed = class {
	native;
	namespace;
	id;
	transport;
	failed;
	durableCheckpoints;
	planDrafts = new PlanDrafts();
	batchSeq = 0;
	queue = [];
	queuedInvalidations = /* @__PURE__ */ new Set();
	queuedBytes = 0;
	lastQueued = /* @__PURE__ */ new Map();
	projections = /* @__PURE__ */ new Map();
	published = /* @__PURE__ */ new Map();
	sourceAvailability = /* @__PURE__ */ new Map();
	failedSessions = /* @__PURE__ */ new Map();
	wake;
	closed = false;
	unwatch;
	abort = new AbortController();
	lastSentAt = -Infinity;
	bufferedOperations;
	bufferedBytes = 0;
	checkpointDirty = /* @__PURE__ */ new Set();
	get retainedProjectionCount() {
		return this.projections.size;
	}
	constructor(native, namespace, id, transport, failed, durableCheckpoints = false) {
		this.native = native;
		this.namespace = namespace;
		this.id = id;
		this.transport = transport;
		this.failed = failed;
		this.durableCheckpoints = durableCheckpoints;
		this.unwatch = native.watch((change) => {
			if (this.closed) return;
			const invalidation = !("id" in change) ? change.type === "catalogs" ? `catalogs:${change.catalogType}` : change.type : SESSION_INVALIDATIONS.has(change.type) ? `${change.type}:${change.id}` : void 0;
			if (invalidation !== void 0) {
				if (this.queuedInvalidations.has(invalidation)) return;
				this.queuedInvalidations.add(invalidation);
			}
			let bytes;
			try {
				bytes = jsonBytes(change);
			} catch (error) {
				this.native.diagnostics.log("error", "sync.event_failed", {
					streamId: this.id,
					sessionId: "id" in change ? change.id : void 0
				}, error);
				if (!("id" in change)) return;
				change = {
					type: "refresh",
					id: change.id
				};
				bytes = jsonBytes(change);
			}
			this.queuedBytes += bytes;
			if (change.type === "stream" && this.coalesceStream(change)) return;
			if (this.queue.length >= MAX_BUFFER || this.queuedBytes > MAX_QUEUED_BYTES) {
				if (!this.compactQueue()) {
					this.fail(/* @__PURE__ */ new Error("DSH event buffer full; resubscribe for a fresh baseline"));
					return;
				}
			}
			const queued = change.type === "stream" ? { ...change } : change;
			this.queue.push(queued);
			if ("id" in queued) this.lastQueued.set(queued.id, queued);
			this.wake?.();
			this.wake = void 0;
		});
	}
	/**
	* Merges a chunk into the session's last queued change when that is a delta of
	* the same block. Projections and plan drafts concatenate these deltas, so one
	* merged chunk yields the same result while a long reply stays one queue entry.
	*/
	coalesceStream(change) {
		const previous = this.lastQueued.get(change.id);
		if (previous?.type !== "stream" || previous.turn !== change.turn || previous.step !== change.step || previous.throughSeq !== change.throughSeq) return false;
		const merged = mergeChunks(previous.chunk, change.chunk);
		if (!merged) return false;
		previous.chunk = merged;
		previous.time = change.time;
		return true;
	}
	/**
	* Keeps the feed alive when native changes outpace delivery (for example a
	* running Agent while the startup scan uploads a long history). The sessions
	* holding most of the queue give their changes up for one recalibration;
	* events whose notifications a baseline does not repeat stay queued after it.
	*/
	compactQueue() {
		const sessions = /* @__PURE__ */ new Map();
		const kinds = /* @__PURE__ */ new Map();
		let length = this.queue.length, bytes = 0;
		for (const change of this.queue) {
			const size = jsonBytes(change);
			bytes += size;
			kinds.set(change.type, (kinds.get(change.type) ?? 0) + 1);
			if (!("id" in change)) continue;
			const session = sessions.get(change.id) ?? {
				count: 0,
				bytes: 0
			};
			session.count++;
			session.bytes += size;
			sessions.set(change.id, session);
		}
		if (length < MAX_BUFFER && bytes <= MAX_QUEUED_BYTES) {
			this.queuedBytes = bytes;
			return true;
		}
		const byCount = length >= MAX_BUFFER;
		const collapsed = /* @__PURE__ */ new Set();
		for (const [id, session] of [...sessions].sort(([, a], [, b]) => byCount ? b.count - a.count : b.bytes - a.bytes)) {
			if (length <= MAX_BUFFER / 2 && bytes <= MAX_QUEUED_BYTES / 2) break;
			collapsed.add(id);
			length -= session.count - 1;
			bytes -= session.bytes;
		}
		if (!collapsed.size) return false;
		const kept = [], tails = /* @__PURE__ */ new Map();
		const interrupted = /* @__PURE__ */ new Set();
		for (const change of this.queue) {
			if (!("id" in change) || !collapsed.has(change.id)) {
				kept.push(change);
				continue;
			}
			if (change.type === "refresh" && change.interrupted) interrupted.add(change.id);
			if (change.type === "event" && RETAINED_EVENTS.has(change.event.type)) tails.set(change.id, [...tails.get(change.id) ?? [], change]);
		}
		for (const id of collapsed) {
			for (const type of SESSION_INVALIDATIONS) this.queuedInvalidations.delete(`${type}:${id}`);
			const refresh = {
				type: "refresh",
				id,
				resume: true,
				...interrupted.has(id) ? { interrupted: true } : {}
			};
			kept.push(refresh, ...tails.get(id) ?? []);
			this.lastQueued.set(id, kept.at(-1));
		}
		this.native.diagnostics.log("warn", "sync.queue_compacted", {
			streamId: this.id,
			queuedEvents: this.queue.length,
			remainingEvents: kept.length,
			sessions: collapsed.size,
			kinds: [...kinds].map(([type, count]) => `${type}:${count}`).join(",")
		});
		this.queue = kept;
		this.queuedBytes = kept.reduce((total, change) => total + jsonBytes(change), 0);
		return this.queue.length < MAX_BUFFER && this.queuedBytes <= MAX_QUEUED_BYTES;
	}
	start() {
		this.native.diagnostics.log("info", "sync.started", { streamId: this.id });
		this.run().catch((error) => {
			if (!this.closed) this.fail(error);
		});
	}
	fail(error) {
		this.native.diagnostics.log("error", "sync.failed", {
			streamId: this.id,
			batchSeq: this.batchSeq,
			queuedEvents: this.queue.length
		}, error);
		this.close();
		this.failed(error);
	}
	close() {
		if (this.closed) return;
		this.native.diagnostics.log("info", "sync.stopped", {
			streamId: this.id,
			batchSeq: this.batchSeq
		});
		this.closed = true;
		this.abort.abort();
		this.unwatch();
		this.wake?.();
		this.wake = void 0;
		this.queue = [];
		this.queuedBytes = 0;
		this.projections.clear();
		this.queuedInvalidations.clear();
		this.lastQueued.clear();
		this.failedSessions.clear();
		this.bufferedOperations = void 0;
		this.bufferedBytes = 0;
	}
	async send(operations) {
		this.abort.signal.throwIfAborted();
		if (this.bufferedOperations) {
			const bytes = jsonBytes(operations);
			if (this.bufferedOperations.length && this.bufferedBytes + bytes > MAX_BYTES) await this.flushOperations();
			this.abort.signal.throwIfAborted();
			for (const operation of operations) {
				const previous = this.bufferedOperations.at(-1);
				if (previous?.kind === "notifications" && operation.kind === "notifications") previous.notifications.push(...operation.notifications);
				else this.bufferedOperations.push(operation);
			}
			this.bufferedBytes += bytes;
			return;
		}
		await this.transmit(operations);
	}
	async flushOperations() {
		const operations = this.bufferedOperations?.splice(0) ?? [];
		this.bufferedBytes = 0;
		if (operations.length) await this.transmit(operations);
	}
	async transmit(operations) {
		while (performance.now() - this.lastSentAt < 34) await setTimeout$1(Math.ceil(34 - (performance.now() - this.lastSentAt)), void 0, { signal: this.abort.signal });
		this.abort.signal.throwIfAborted();
		const batch = {
			subscriptionId: this.id,
			batchSeq: ++this.batchSeq,
			projectionVersion: 3,
			operations
		};
		if (jsonBytes(batch) > MAX_BYTES) throw new Error("DSH sync batch exceeds the transport limit");
		this.lastSentAt = performance.now();
		this.native.diagnostics.log("debug", "sync.batch", {
			streamId: this.id,
			batchSeq: batch.batchSeq,
			operations: operations.length,
			kinds: operations.map((op) => op.kind).join(",")
		});
		for (let attempt = 0;; attempt += 1) try {
			await this.transport.ingestBatch(batch, this.abort.signal, attempt);
			break;
		} catch (error) {
			if (this.closed || !(error instanceof MeshCallError) || error.code !== BACKEND_UNAVAILABLE) throw new SyncTransportError("DSH event delivery failed", { cause: error });
			this.native.diagnostics.log("warn", "sync.batch_retry", {
				streamId: this.id,
				batchSeq: batch.batchSeq,
				attempt: attempt + 1
			}, error);
			await setTimeout$1(Math.min(BATCH_RETRY_BASE_MS * 2 ** attempt, BATCH_RETRY_MAX_MS), void 0, { signal: this.abort.signal });
		}
		this.native.diagnostics.log("debug", "sync.ack", {
			streamId: this.id,
			batchSeq: batch.batchSeq,
			elapsedMs: Math.round(performance.now() - this.lastSentAt)
		});
	}
	async notification(method, params) {
		await this.send([{
			kind: "notifications",
			notifications: [{
				method,
				params
			}]
		}]);
	}
	async items(id, items) {
		let page = [], bytes = 0;
		const sendPage = async () => {
			await this.send([{
				kind: "notifications",
				notifications: page.map((item) => ({
					method: "timeline.itemUpsert",
					params: {
						sessionId: item.sessionId,
						externalSessionId: id,
						item
					}
				}))
			}]);
		};
		for (const item of contentItems(items)) {
			const size = jsonBytes(item);
			if (size > MAX_BYTES) throw new Error("A DSH Timeline item exceeds the transport limit");
			if (page.length && (bytes + size > MAX_BYTES || page.length >= 250)) {
				if (!await this.native.visible(id)) return;
				await sendPage();
				page = [];
				bytes = 0;
			}
			page.push(item);
			bytes += size;
		}
		if (page.length && await this.native.visible(id)) await sendPage();
	}
	/** Snapshot pages for one capture, bounded like the old snapshot.items frames. */
	async *pages(items, captureId) {
		let page = [], bytes = 0;
		for (const item of items) {
			const size = jsonBytes(item);
			if (size > MAX_BYTES) throw new Error("A DSH Timeline item exceeds the transport limit");
			if (page.length && (bytes + size > MAX_BYTES || page.length >= 250)) {
				yield {
					captureId,
					items: page
				};
				page = [];
				bytes = 0;
			}
			page.push(item);
			bytes += size;
		}
		if (page.length) yield {
			captureId,
			items: page
		};
	}
	async baseline(id, restore = false) {
		await this.sessionOperation(id, "snapshot", () => this.publishBaseline(id, restore));
	}
	async publishBaseline(id, restore) {
		if (!await this.native.visible(id)) {
			await this.unavailable(id);
			return;
		}
		const start = performance.now();
		let log;
		try {
			log = await this.native.read(id);
		} catch (error) {
			if (this.closed || error instanceof Error && error.name === "AbortError") throw error;
			await this.unavailable(id);
			return;
		}
		const platformId = sessionId(this.namespace, id);
		try {
			const projection = createProjection(id, platformId, this.durableCheckpoints);
			let resumed = false;
			if (restore && this.durableCheckpoints) {
				const checkpoint = record(await this.delivery(() => this.transport.loadCheckpoint(id)) ?? {});
				if (Number.isSafeInteger(checkpoint.throughSeq) && Number(checkpoint.throughSeq) >= -1) {
					await replayHistory(projection, log, this.abort.signal, Number(checkpoint.throughSeq));
					resumed = matchesCheckpoint(checkpoint, projection);
					if (resumed) projection.drain();
				}
			}
			await replayHistory(projection, log, this.abort.signal);
			const title = log.events.findLast((event) => event.type === "session/title");
			const meta = {
				externalSessionId: id,
				title: title?.type === "session/title" ? title.data.title : null,
				sourceState: await this.native.source.state(id),
				cwd: log.session.cwd ?? null,
				lastActivityAt: new Date(log.events.at(-1)?.time ?? log.session.createdAt).toISOString()
			};
			if (resumed) {
				const delta = projection.drain();
				if (!delta.removed.length && await this.native.visible(id)) {
					this.projections.delete(id);
					this.projections.set(id, projection);
					this.published.set(id, platformId);
					this.sourceAvailability.set(id, "available");
					await this.notification("session.meta.upsert", {
						sessionId: platformId,
						...meta
					});
					await this.items(id, delta.items);
					this.checkpointDirty.add(id);
					await this.notices(id);
					await this.state(id, log);
					this.native.diagnostics.log("info", "sync.checkpoint_restored", {
						streamId: this.id,
						sessionId: id
					});
					return;
				}
			}
			if (!await this.native.visible(id)) return;
			this.native.diagnostics.log("debug", "snapshot.started", {
				streamId: this.id,
				sessionId: id
			});
			const snapshotItems = contentItems(projection.snapshot());
			if (this.bufferedOperations?.length) await this.flushOperations();
			const captureId = randomUUID();
			const result = await this.delivery(() => this.transport.ingestSnapshot({
				captureId,
				subscriptionId: this.id,
				sessionId: platformId,
				meta,
				throughSeq: projection.throughSeq
			}, this.pages(snapshotItems, captureId), this.abort.signal));
			if (!result.accepted) {
				this.failedSessions.set(id, {
					availability: "unavailable",
					reason: result.reason ?? "sync_failed",
					observedAt: (/* @__PURE__ */ new Date()).toISOString()
				});
				this.native.diagnostics.log("warn", "snapshot.quarantined", {
					streamId: this.id,
					sessionId: id,
					reason: result.reason ?? void 0
				});
				return;
			}
			this.failedSessions.delete(id);
			projection.drain();
			this.projections.delete(id);
			this.projections.set(id, projection);
			this.checkpointDirty.add(id);
			this.published.set(id, platformId);
			this.sourceAvailability.set(id, "available");
			await this.notices(id);
			await this.state(id, log);
			this.native.diagnostics.log("info", "snapshot.completed", {
				streamId: this.id,
				sessionId: id,
				items: snapshotItems.length,
				elapsedMs: Math.round(performance.now() - start)
			});
		} finally {
			this.native.source.release(id);
		}
	}
	async notices(id) {
		for (const notice of [...this.native.questions.notices(this.namespace, id), ...this.native.approvals.notices(this.namespace, id)]) await this.notification("notice.upsert", notice);
	}
	/**
	* A turn that failed or ended without a reply opens an error card; the next
	* turn closes the previous one. Both read the live log, so a card the Bridge
	* opened before a restart is still closed.
	*/
	async outcomeNotice(id, event) {
		const events = this.native.ctx.sessions.get(id)?.snapshotEvents();
		if (!events) return void 0;
		if (event.type === "turn/start") {
			const previous = latestTurnOutcome(events, Number(event.seq));
			return previous && turnOutcomeNotice(this.namespace, id, previous, "closed");
		}
		const outcome = turnOutcome(events, Number(event.seq));
		if (!outcome) return void 0;
		this.native.diagnostics.log("warn", outcome.kind === "failed" ? "turn.failed" : "turn.no_reply", {
			streamId: this.id,
			sessionId: id,
			reason: outcome.reason,
			steps: outcome.steps,
			...outcome.error ? { code: outcome.error.code } : {}
		});
		const continuable = outcome.kind === "failed" && await this.native.continuable(id, outcome.endSeq);
		return turnOutcomeNotice(this.namespace, id, {
			...outcome,
			continuable
		});
	}
	async state(id, snapshot) {
		if (!this.published.has(id) || !await this.native.visible(id)) return;
		const log = this.native.ctx.sessions.get(id);
		const pending = /* @__PURE__ */ new Set();
		for (const e of log?.snapshotEvents() ?? []) {
			if (String(e.type) === "approval/asked") pending.add(String(record(e.data).id));
			if (String(e.type) === "approval/decided") pending.delete(String(record(e.data).id));
		}
		const last = log?.snapshotEvents().findLast((e) => e.type === "turn/end");
		const status = pending.size || this.native.questions.waiting(id) || this.native.approvals.waiting(id) ? "waiting_approval" : this.native.status(id) ?? (last?.type === "turn/end" && last.data.reason.kind === "error" ? "error" : "idle");
		let configuration;
		try {
			configuration = await this.native.diagnostics.measure("session.configuration_read", { sessionId: id }, async () => (await this.native.stateFacts(id, snapshot)).configuration);
		} catch (error) {
			if (this.closed || error instanceof Error && error.name === "AbortError") throw error;
			this.native.source.markReadFailed(id);
			await this.unavailable(id);
			return;
		}
		await this.notification("session.state.updated", {
			sessionId: this.published.get(id),
			externalSessionId: id,
			status,
			...configuration
		});
	}
	async reconcile() {
		for (const id of this.native.candidates()) await this.sessionOperation(id, "visibility", async () => {
			if (!await this.native.visible(id)) await this.unavailable(id);
		});
		for (const id of this.native.candidates()) if (!this.published.has(id)) await this.baseline(id);
	}
	async unavailable(id) {
		if (this.bufferedOperations?.length) await this.flushOperations();
		const source = await this.sourceState(id);
		if (this.sourceAvailability.has(id) && this.sourceAvailability.get(id) !== source.availability) {
			await this.notification("session.source.updated", {
				sessionId: sessionId(this.namespace, id),
				externalSessionId: id,
				...source,
				observationOrigin: "event"
			});
			this.sourceAvailability.set(id, source.availability);
		}
		if (this.durableCheckpoints) await this.delivery(() => this.transport.deleteCheckpoint(id));
		this.published.delete(id);
		this.projections.delete(id);
	}
	async sourceState(id) {
		const source = await this.native.source.state(id);
		return source.availability === "available" ? this.failedSessions.get(id) ?? source : source;
	}
	/**
	* A delivery failure (network, Server 5xx, deadline) fails the whole feed so
	* the Connector resubscribes and recalibrates. Only durable refusals are
	* reported through the call's own result and isolated per session.
	*/
	async delivery(operation) {
		try {
			return await operation();
		} catch (error) {
			if (this.closed || error instanceof SyncTransportError || error instanceof Error && error.name === "AbortError") throw error;
			throw new SyncTransportError("DSH event delivery failed", { cause: error });
		}
	}
	async sessionOperation(id, phase, operation) {
		try {
			await operation();
		} catch (error) {
			if (this.closed || error instanceof SyncTransportError || error instanceof Error && error.name === "AbortError") throw error;
			this.native.diagnostics.log("error", "sync.session_failed", {
				streamId: this.id,
				sessionId: id,
				phase
			}, error);
			this.failedSessions.set(id, {
				availability: "unavailable",
				reason: "sync_failed",
				observedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			await this.unavailable(id);
		}
	}
	async runtimeOperation(phase, operation) {
		try {
			await operation();
		} catch (error) {
			if (this.closed || error instanceof SyncTransportError || error instanceof Error && error.name === "AbortError") throw error;
			this.native.diagnostics.log("error", "sync.runtime_update_failed", {
				streamId: this.id,
				phase
			}, error);
		}
	}
	/**
	* Delivers the queued changes of individual sessions while the startup scan
	* still runs, so a session someone is working in streams after its own
	* baseline instead of after the whole inventory (#504). A session that has
	* no baseline yet gets one first; runtime-wide changes and visibility
	* reconciliation wait for the end of the scan.
	*/
	async liveChanges() {
		const live = this.queue.filter((change) => "id" in change);
		if (!live.length) return;
		this.queue = this.queue.filter((change) => !("id" in change));
		const ids = new Set(live.map((change) => change.id));
		for (const id of ids) {
			this.lastQueued.delete(id);
			for (const kind of SESSION_INVALIDATIONS) this.queuedInvalidations.delete(`${kind}:${id}`);
		}
		this.queuedBytes = this.queue.reduce((total, change) => total + jsonBytes(change), 0);
		const imported = live.filter((change) => this.published.has(change.id));
		const pending = live.filter((change) => !this.published.has(change.id));
		let reconcile = await this.deliverLive(imported);
		for (const id of new Set(pending.map((change) => change.id))) if (!this.published.has(id) && await this.native.visible(id)) await this.baseline(id, true);
		if (await this.deliverLive(pending)) reconcile = true;
		if (reconcile && !this.queuedInvalidations.has("visibility")) {
			this.queuedInvalidations.add("visibility");
			this.queue.push({ type: "visibility" });
		}
	}
	async deliverLive(changes) {
		if (!changes.length) return false;
		this.bufferedOperations = [];
		const reconcile = await this.changes(changes, false);
		await this.flushOperations();
		this.bufferedOperations = void 0;
		return reconcile;
	}
	/** Applies changes; returns whether a visibility reconciliation is still due when `reconcileNow` is false. */
	async changes(changes, reconcileNow = true) {
		const touched = /* @__PURE__ */ new Set(), statuses = /* @__PURE__ */ new Set(), capabilities = /* @__PURE__ */ new Set();
		const ended = [];
		const outcomes = [];
		let reconcile = false, runtimeCapabilities = false, allSessionCapabilities = false;
		for (const change of changes) {
			if (change.type === "capabilities" || change.type === "commands") {
				runtimeCapabilities = true;
				allSessionCapabilities = true;
				continue;
			}
			if (change.type === "catalogs") {
				if (change.catalogType === "model" && this.native.ctx.get("llm")) await this.runtimeOperation("models", async () => this.notification("catalog.model.update", { ...await this.native.catalogs.models() }));
				if (change.catalogType === "permission" && this.native.ctx.get("permissionPresets")) await this.runtimeOperation("permissions", async () => this.notification("catalog.permission.update", this.native.catalogs.permissions()));
				if (change.catalogType === "model") runtimeCapabilities = true;
				continue;
			}
			if (change.type === "visibility") {
				reconcile = true;
				continue;
			}
			const { id } = change;
			await this.sessionOperation(id, change.type, async () => {
				if (!await this.native.visible(id)) {
					if (this.published.has(id)) reconcile = true;
					return;
				}
				if (change.type === "refresh") {
					if (change.interrupted) {
						this.planDrafts.reset(id);
						await this.notification("planning.observed", {
							sessionId: sessionId(this.namespace, id),
							externalSessionId: id,
							kind: "interrupted"
						});
					}
					await this.baseline(id, change.resume === true && (this.projections.get(id)?.settled ?? true));
					return;
				}
				if (!this.published.has(id)) await this.baseline(id);
				if (!this.published.has(id)) return;
				if (change.type === "question" || change.type === "approval") await this.notices(id);
				if (change.type === "stream") {
					const mode = await this.native.planning.read(id);
					if ("active" in mode && mode.active === false) await this.notification("planning.observed", {
						sessionId: sessionId(this.namespace, id),
						externalSessionId: id,
						kind: "execution"
					});
					const draft = this.planDrafts.observe(id, change.turn, change.step, change.chunk);
					if (draft) await this.notification("planning.observed", {
						sessionId: sessionId(this.namespace, id),
						externalSessionId: id,
						...draft
					});
					const projection = this.projections.get(id);
					if (!projection) return;
					this.projections.delete(id);
					this.projections.set(id, projection);
					projection.stream(change.turn, change.step, change.chunk, change.time, change.throughSeq);
					touched.add(id);
					return;
				}
				if (change.type === "event") {
					const rawEvent = change.event;
					if (rawEvent.type === "plan/mode" && typeof rawEvent.data.active === "boolean") await this.notification("planning.observed", {
						sessionId: sessionId(this.namespace, id),
						externalSessionId: id,
						kind: "mode",
						mode: rawEvent.data.active ? "plan" : "normal"
					});
					if (["model/selection", "agent-preset/selected"].includes(change.event.type)) capabilities.add(id);
					if (change.event.type === "turn/end") {
						this.planDrafts.reset(id);
						await this.notification("planning.observed", {
							sessionId: sessionId(this.namespace, id),
							externalSessionId: id,
							kind: "interrupted"
						});
					}
					if (change.event.type === "turn/end") ended.push([id, {
						sessionId: this.published.get(id),
						externalSessionId: id,
						sourceObservedAt: new Date(change.event.time).toISOString(),
						outcome: change.event.data.reason.kind === "error" ? "failed" : ["aborted", "interrupted"].includes(change.event.data.reason.kind) ? "interrupted" : "completed"
					}]);
					if (change.event.type === "turn/start" || change.event.type === "turn/end") {
						const notice = await this.outcomeNotice(id, change.event);
						if (notice) outcomes.push([id, notice]);
					}
					if ([
						"turn/start",
						"turn/end",
						"approval/asked",
						"approval/decided",
						"model/selection",
						"request/header",
						"permission/preset",
						"sandbox/mode",
						"approval/policy",
						"agent-preset/selected"
					].includes(change.event.type)) statuses.add(id);
					const projection = this.projections.get(id);
					if (!projection) {
						await this.baseline(id, true);
						return;
					}
					this.projections.delete(id);
					this.projections.set(id, projection);
					if (Number(change.event.seq) <= projection.throughSeq) return;
					const key = receiptKey(change.event);
					const receipt = key ? (await this.native.attachments.readReceipts(id))[key] : void 0;
					try {
						projection.apply(change.event, receipt);
					} catch {
						await this.baseline(id);
						return;
					}
					touched.add(id);
					this.checkpointDirty.add(id);
					if (change.event.type === "session/title") await this.notification("session.meta.upsert", {
						sessionId: this.published.get(id),
						externalSessionId: id,
						title: change.event.data.title
					});
				} else statuses.add(id);
			});
		}
		for (const id of touched) await this.sessionOperation(id, "timeline", async () => {
			const delta = this.projections.get(id)?.drain();
			if (!delta || !await this.native.visible(id)) return;
			if (delta.removed.length) await this.baseline(id);
			else await this.items(id, delta.items);
		});
		for (const [id, params] of ended) await this.sessionOperation(id, "turnEnded", async () => {
			if (this.published.has(id) && await this.native.visible(id)) await this.notification("session.turnEnded", params);
		});
		for (const [id, notice] of outcomes) await this.sessionOperation(id, "turnOutcome", async () => {
			if (this.published.has(id) && await this.native.visible(id)) await this.notification("notice.upsert", notice);
		});
		for (const id of statuses) await this.sessionOperation(id, "state", () => this.state(id));
		if (runtimeCapabilities) await this.runtimeOperation("capabilities", async () => this.notification("runtime.capability.updated", await this.native.capabilities()));
		if (allSessionCapabilities) for (const id of this.published.keys()) capabilities.add(id);
		for (const id of capabilities) await this.sessionOperation(id, "capabilities", async () => {
			if (this.published.has(id)) await this.notification("session.capability.updated", await this.native.capabilities(this.published.get(id), id));
		});
		if (!reconcileNow) return reconcile;
		if (reconcile) await this.reconcile();
		return false;
	}
	async run() {
		await this.notification("session.inventory.begin", { scanToken: this.id });
		await this.native.inventory(this.abort.signal, async (entry) => {
			if (!this.published.has(entry.header.id)) await this.baseline(entry.header.id, true);
			await this.liveChanges();
			await this.rememberCheckpoints();
			this.trimProjections();
		});
		this.bufferedOperations = [];
		await this.changes(this.takeChanges());
		const sessions = [];
		for (const id of this.native.candidates()) sessions.push({
			sessionId: sessionId(this.namespace, id),
			externalSessionId: id,
			sourceState: await this.sourceState(id)
		});
		await this.notification("session.inventory.complete", {
			scanToken: this.id,
			complete: true,
			sessions
		});
		await this.flushOperations();
		await this.rememberCheckpoints();
		this.trimProjections();
		this.bufferedOperations = void 0;
		this.native.diagnostics.log("info", "sync.inventory_completed", {
			streamId: this.id,
			sessions: this.published.size
		});
		while (!this.closed) {
			if (!this.queue.length) await new Promise((resolve) => {
				this.wake = resolve;
			});
			if (this.closed) break;
			await setTimeout$1(34, void 0, { signal: this.abort.signal });
			this.bufferedOperations = [];
			await this.changes(this.takeChanges());
			await this.flushOperations();
			await this.rememberCheckpoints();
			this.trimProjections();
			this.bufferedOperations = void 0;
		}
	}
	async rememberCheckpoints() {
		if (!this.durableCheckpoints) {
			this.checkpointDirty.clear();
			return;
		}
		for (const id of this.checkpointDirty) {
			const projection = this.projections.get(id);
			if (!projection || !this.published.has(id) || this.failedSessions.has(id)) continue;
			const checkpoint = {
				version: 1,
				projectionVersion: 3,
				throughSeq: projection.throughSeq,
				historyHash: projection.historyHash,
				settled: projection.settled
			};
			await this.transport.saveCheckpoint(id, checkpoint);
		}
		this.checkpointDirty.clear();
	}
	/**
	* Only a committed durable checkpoint lets baseline(id, true) resume an evicted
	* session with a delta; without one, eviction would re-upload its whole history.
	* Running or interactive sessions keep their projection for continuous streaming.
	*/
	canEvictProjection(id, projection) {
		if (!this.durableCheckpoints || this.checkpointDirty.has(id) || this.failedSessions.has(id)) return false;
		if (!projection.settled || projection.dirty || this.native.status(id) === "running") return false;
		return !this.native.questions.waiting(id) && !this.native.approvals.waiting(id);
	}
	trimProjections(maxRetained = 8) {
		for (const [id, projection] of this.projections) if (!this.native.ctx.sessions.get(id) && this.canEvictProjection(id, projection)) this.projections.delete(id);
		if (this.projections.size <= maxRetained) return;
		for (const [id, projection] of this.projections) {
			if (this.projections.size <= maxRetained) break;
			if (this.canEvictProjection(id, projection)) this.projections.delete(id);
		}
	}
	takeChanges() {
		this.queuedBytes = 0;
		this.queuedInvalidations.clear();
		this.lastQueued.clear();
		return this.queue.splice(0);
	}
};
/** One chunk with the effect of applying `a` then `b`, or undefined when they are not deltas of one block. */
function mergeChunks(a, b) {
	if (!("index" in a) || !("index" in b) || a.index !== b.index) return void 0;
	if (a.type === "text-delta" && b.type === "text-delta" || a.type === "reasoning-delta" && b.type === "reasoning-delta") return {
		...a,
		text: a.text + b.text
	};
	if (a.type === "tool-call-delta" && b.type === "tool-call-delta" && a.id === b.id) {
		const name = b.name ?? a.name;
		return {
			...a,
			...name === void 0 ? {} : { name },
			argumentsDelta: a.argumentsDelta + b.argumentsDelta
		};
	}
}
function contentItems(items) {
	return items.filter((item) => item.type !== "turn.start" && item.type !== "turn.end");
}
// src/host/dsh-runtime/router.ts
const PAGE_LIFETIME = 12e4;
function integer(value, fallback, max) {
	if (value === void 0 || value === null) return fallback;
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > max) throw new BridgeError("INVALID_PARAMS", `The limit must be an integer between 1 and ${max}.`);
	return value;
}
/** Per-namespace cursors are temporary captures, not a second persisted session store. */
var RuntimeRouter = class {
	reader;
	namespace;
	pageLifetimeMs;
	feed;
	inventory;
	history;
	constructor(reader, namespace, pageLifetimeMs = PAGE_LIFETIME) {
		this.reader = reader;
		this.namespace = namespace;
		this.pageLifetimeMs = pageLifetimeMs;
	}
	closing = new AbortController();
	/** Aborted once this router is torn down; open sync streams end with it. */
	get closed() {
		return this.closing.signal;
	}
	get hasInventoryPage() {
		return this.inventory !== void 0;
	}
	get hasHistoryPage() {
		return this.history !== void 0;
	}
	/** End the event feed. Paged reads belong to RPC callers, so a resubscription keeps their cursors. */
	close() {
		this.feed?.close();
		this.feed = void 0;
	}
	clearInventory() {
		if (!this.inventory) return;
		if (this.inventory.timer) clearTimeout(this.inventory.timer);
		this.inventory = void 0;
	}
	clearHistory() {
		if (!this.history) return;
		if (this.history.timer) clearTimeout(this.history.timer);
		this.history = void 0;
	}
	retainInventory(page) {
		if (page.timer) clearTimeout(page.timer);
		page.expires = Date.now() + this.pageLifetimeMs;
		page.timer = setTimeout(() => {
			if (this.inventory === page) this.clearInventory();
		}, this.pageLifetimeMs);
		page.timer.unref?.();
		this.inventory = page;
	}
	retainHistory(page) {
		if (page.timer) clearTimeout(page.timer);
		page.expires = Date.now() + this.pageLifetimeMs;
		page.timer = setTimeout(() => {
			if (this.history === page) this.clearHistory();
		}, this.pageLifetimeMs);
		page.timer.unref?.();
		this.history = page;
	}
	/** Stop this namespace for good: open streams end instead of waiting for drain. */
	shutdown() {
		this.close();
		this.clearInventory();
		this.clearHistory();
		this.closing.abort();
	}
	/** Replace this namespace's event feed; `failed` reports why a running feed stopped. */
	subscribe(subscriptionId, durableCheckpoints, transport, failed) {
		if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Event sync is unavailable.");
		this.close();
		const feed = new SyncFeed(this.reader.native, this.namespace, subscriptionId, transport, (error) => {
			if (this.feed !== feed) return;
			this.feed = void 0;
			failed(error);
		}, durableCheckpoints);
		this.feed = feed;
		return feed;
	}
	unsubscribe(feed) {
		if (this.feed === feed) this.close();
	}
	async request(method, params, signal) {
		signal.throwIfAborted();
		switch (method) {
			case "getPlanning":
			case "setPlanning": {
				const native = this.reader.native;
				if (!native) return { available: false };
				if (method === "getPlanning" && !params.externalSessionId && !params.sessionId) return { available: Boolean(native.planning.service()) };
				const id = await this.resolve(params, signal);
				if (method === "getPlanning") return native.planning.read(id);
				if (typeof params.active !== "boolean") throw new BridgeError("INVALID_PARAMS", "A planning mode is required.");
				return native.planning.set(id, params.active);
			}
			case "refreshSync": {
				const id = await this.resolve(params, signal, true);
				if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Event sync is unavailable.");
				this.reader.native.refresh(id);
				return { accepted: true };
			}
			case "createAndStartSession":
			case "startTurn": {
				const native = this.reader.native;
				if (!native) throw new BridgeError("UNSUPPORTED_OPERATION", "Text messaging is unavailable.");
				const attachments = parseAttachments(params.attachments);
				if (typeof params.sessionId !== "string" || !params.sessionId || typeof params.content !== "string" || typeof params.clientMessageId !== "string") throw new BridgeError("INVALID_PARAMS", "Session ID, text and clientMessageId are required.");
				const create = method === "createAndStartSession";
				const id = create ? nativeSessionId(this.namespace, params.sessionId) : await this.resolve(params, signal, true);
				try {
					await native.send(id, params.content, params.clientMessageId, typeof params.cwd === "string" ? params.cwd : void 0, create, parseSelections(params.selections), typeof params.agentPreset === "string" ? params.agentPreset : void 0, signal, attachments, params.sessionId, params.planningIntent === true);
				} catch (error) {
					const failure = publicError(error);
					const sourceState = await native.source.state(id);
					const configuration = native.ctx.sessions.get(id) ? await native.configuration.state(id).catch(() => void 0) : void 0;
					return {
						ok: false,
						code: failure.code === "SESSION_ARCHIVED" ? "session_archived" : failure.code === "SESSION_NOT_FOUND" ? "session_unavailable" : failure.code,
						message: failure.message,
						result: {
							sessionId: params.sessionId,
							externalSessionId: id,
							sourceState,
							...error instanceof CreationNotStartedError ? {
								created: false,
								messageAccepted: false
							} : configuration ? {
								configuration,
								created: create
							} : {}
						}
					};
				}
				return {
					accepted: true,
					sessionId: sessionId(this.namespace, id),
					externalSessionId: id
				};
			}
			case "listModels": {
				if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Model catalog is unavailable.");
				const catalog = await this.reader.native.catalogs.models(true);
				const query = typeof params.query === "string" ? params.query.toLocaleLowerCase() : "";
				return {
					...catalog,
					models: catalog.models.filter((item) => `${item.title} ${item.metadata.providerName} ${item.metadata.model}`.toLocaleLowerCase().includes(query)).slice(0, integer(params.limit, 1e3, 1e4))
				};
			}
			case "listPermissions":
				if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Permission catalog is unavailable.");
				return this.reader.native.catalogs.permissions();
			case "listAgentPresets":
				if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Agent modes are unavailable.");
				return this.reader.native.catalogs.agentPresets();
			case "updateSelections": {
				const native = this.reader.native;
				if (!native) throw new BridgeError("UNSUPPORTED_OPERATION", "Configuration changes are unavailable.");
				const id = await this.resolve(params, signal);
				const selections = parseSelections(params.selections);
				if (!Object.keys(selections).length) throw new BridgeError("INVALID_PARAMS", "Choose a configuration to change.");
				try {
					await native.updateSelections(id, selections, signal);
				} catch (error) {
					const failure = publicError(error);
					return {
						ok: false,
						code: failure.code,
						message: failure.message,
						result: { state: await this.request("getSessionState", params, new AbortController().signal).catch(() => null) }
					};
				}
				return {
					ok: true,
					result: { state: await this.request("getSessionState", params, signal) }
				};
			}
			case "interruptSession": {
				if (!this.reader.native) throw new BridgeError("UNSUPPORTED_OPERATION", "Interrupt is unavailable.");
				const id = await this.resolve(params, signal);
				await this.reader.native.interrupt(id);
				return {
					accepted: true,
					sessionId: sessionId(this.namespace, id),
					externalSessionId: id
				};
			}
			case "ping": return { ok: true };
			case "getRuntimeConfig": return {
				runtime: "dsh",
				revision: 2,
				values: {},
				metadata: {
					readOnly: !this.reader.native?.ctx.get("agents"),
					storageMode: "dsh-native"
				}
			};
			case "listWorkspaces": return { workspaces: this.reader.native?.workspaces() ?? [] };
			case "getRuntimeCapabilities": return this.reader.native?.capabilities() ?? capabilities();
			case "listSessions": return this.list(params, signal);
			case "getSessionSnapshot": return this.snapshot(params, signal);
			case "getSessionState": {
				const id = await this.resolve(params, signal, true);
				const native = this.reader.native;
				if (!native) {
					const log = await this.reader.query.readSession(id);
					const liveStatus = this.reader.status(id);
					return {
						runtime: "dsh",
						sessionId: sessionId(this.namespace, id),
						externalSessionId: id,
						status: liveStatus ?? (lastTurnEndKind(log.events) === "error" ? "error" : "idle"),
						selections: {},
						metadata: {
							readOnly: true,
							attached: liveStatus !== void 0
						}
					};
				}
				await native.ensureKnown(id, signal);
				const sourceState = await native.source.state(id);
				if (sourceState.availability !== "available") return {
					runtime: "dsh",
					sessionId: sessionId(this.namespace, id),
					externalSessionId: id,
					status: "blocked",
					selections: {},
					sourceState,
					metadata: {
						readOnly: true,
						attached: false
					}
				};
				const facts = await native.stateFacts(id);
				signal.throwIfAborted();
				const liveStatus = this.reader.status(id);
				return {
					runtime: "dsh",
					sessionId: sessionId(this.namespace, id),
					externalSessionId: id,
					sourceState,
					status: native.questions.waiting(id) || native.approvals.waiting(id) ? "waiting_approval" : liveStatus ?? (facts.lastTurnEndKind === "error" ? "error" : "idle"),
					selections: facts.configuration.selections,
					metadata: {
						...facts.configuration.metadata,
						readOnly: !native.ctx.get("sessionController"),
						attached: liveStatus !== void 0
					}
				};
			}
			case "getSessionNotices": {
				const id = await this.resolve(params, signal);
				const native = this.reader.native;
				return { notices: [
					...native?.questions.notices(this.namespace, id) ?? [],
					...native?.approvals.notices(this.namespace, id) ?? [],
					...native ? await this.turnOutcomeNotices(native, id) : []
				] };
			}
			case "respondInteraction": {
				const id = await this.resolve(params, signal);
				if (!this.reader.native || typeof params.noticeId !== "string" || typeof params.actionId !== "string") throw new BridgeError("INVALID_PARAMS", "A question and action are required.");
				if (this.reader.native.approvals.owns(this.namespace, id, params.noticeId)) return this.reader.native.approvals.respond(this.namespace, id, params.noticeId, params.actionId);
				if (params.actionId === "continue") return this.reader.native.continueTurn(this.namespace, id, params.noticeId, signal);
				return this.reader.native.questions.respond(this.namespace, id, params.noticeId, params.actionId, params.inputData);
			}
			case "getSessionCapabilities": {
				const id = await this.resolve(params, signal, true);
				await this.reader.native?.ensureKnown(id, signal);
				return this.reader.native?.capabilities(sessionId(this.namespace, id), id) ?? capabilities(sessionId(this.namespace, id));
			}
			case "listCommands":
			case "executeCommand": {
				const native = this.reader.native;
				if (!native) throw new BridgeError("UNSUPPORTED_OPERATION", "DSH native commands are unavailable.");
				const id = await this.resolve(params, signal);
				return method === "listCommands" ? native.commands.list(id, params, signal) : native.commands.execute(id, params, signal);
			}
			default: throw new BridgeError("METHOD_NOT_FOUND", "The DSH runtime does not support this method.");
		}
	}
	/** The open error card of the latest turn; reading it must never fail the other notices. */
	async turnOutcomeNotices(native, id) {
		try {
			const outcome = (await native.stateFacts(id)).turnOutcome;
			if (!outcome) return [];
			const continuable = outcome.kind === "failed" && await native.continuable(id, outcome.endSeq);
			return [turnOutcomeNotice(this.namespace, id, {
				...outcome,
				continuable
			})];
		} catch (error) {
			native.diagnostics.log("warn", "session.turn_outcome_unavailable", { sessionId: id }, error);
			return [];
		}
	}
	async resolve(params, signal, includeUnavailable = false) {
		const externalId = params.externalSessionId;
		if (typeof externalId === "string" && externalId) {
			if (params.sessionId !== void 0 && params.sessionId !== sessionId(this.namespace, externalId)) throw new BridgeError("INVALID_PARAMS", "The session does not belong to this runtime namespace.");
			if (this.reader.native && !includeUnavailable) {
				await this.reader.native.ensureKnown(externalId, signal);
				this.reader.native.source.retry(externalId);
				await this.reader.native.source.requireAvailable(externalId);
			}
			return externalId;
		}
		if (typeof params.sessionId !== "string" || !params.sessionId) throw new BridgeError("INVALID_PARAMS", "A session identity is required.");
		if (this.reader.native) await this.reader.native.source.initialize(signal);
		const id = (this.reader.native ? this.reader.native.candidates() : (await this.reader.query.listSessions(signal)).map((item) => item.header.id)).find((id) => sessionId(this.namespace, id) === params.sessionId);
		if (!id) throw new BridgeError("SESSION_NOT_FOUND", "The DSH session is not visible.");
		if (this.reader.native && !includeUnavailable) {
			this.reader.native.source.retry(id);
			await this.reader.native.source.requireAvailable(id);
		}
		return id;
	}
	offset(cursor, page) {
		if (page && page.expires < Date.now()) {
			if (this.inventory === page) this.clearInventory();
			if (this.history === page) this.clearHistory();
			page = void 0;
		}
		if (typeof cursor !== "string" || !page) throw new BridgeError("INVALID_PARAMS", "The read cursor expired. Start a new read.");
		const [id, offset] = cursor.split(":");
		const index = Number(offset);
		if (id !== page.id || !/^\d+$/.test(offset ?? "") || !Number.isSafeInteger(index) || index < 1 || index >= page.values.length) throw new BridgeError("INVALID_PARAMS", "The read cursor is invalid.");
		return index;
	}
	async list(params, signal) {
		const limit = integer(params.limit, 100, 1e3);
		let offset = 0;
		let page;
		if (params.cursor != null) {
			offset = this.offset(params.cursor, this.inventory);
			page = this.inventory;
		} else {
			this.clearInventory();
			page = {
				id: randomUUID(),
				values: await this.reader.query.listSessions(signal),
				expires: Date.now() + this.pageLifetimeMs
			};
		}
		const slice = page.values.slice(offset, offset + limit);
		const records = [];
		for (const entry of slice) if (!this.reader.native || await this.reader.native.visible(entry.header.id)) records.push(entry);
		const titles = await this.reader.query.readTitleSnapshots(records.map((item) => item.header.id), signal);
		const titleById = new Map(titles.map((title) => [title.sessionId, title]));
		const sessions = records.map((item) => {
			const title = titleById.get(item.header.id);
			return {
				runtime: "dsh",
				sessionId: sessionId(this.namespace, item.header.id),
				externalSessionId: item.header.id,
				title: title?.status === "fulfilled" ? title.value.title?.title ?? null : null,
				cwd: item.header.cwd ?? null,
				orderingTime: new Date(item.header.createdAt).toISOString(),
				metadata: {
					live: item.live,
					persisted: item.persisted,
					parentSession: item.header.parentSession ?? null,
					origin: item.header.origin ?? null,
					readOnly: !this.reader.native?.ctx.get("agents"),
					...title?.status === "rejected" ? { titleReadFailed: true } : {},
					sync: {
						requires_timeline_sync: true,
						changed: true
					}
				}
			};
		});
		const next = offset + slice.length;
		const nextCursor = next < page.values.length ? `${page.id}:${next}` : null;
		if (nextCursor === null) {
			if (this.inventory === page) this.clearInventory();
		} else this.retainInventory(page);
		return {
			sessions,
			nextCursor
		};
	}
	async snapshot(params, signal) {
		let offset = 0;
		let page;
		if (params.cursor != null) {
			if (this.reader.native && this.history && !await this.reader.native.visible(this.history.externalId)) {
				this.clearHistory();
				throw new BridgeError("SESSION_NOT_FOUND", "The session is no longer visible in DSH.");
			}
			offset = this.offset(params.cursor, this.history);
			if (params.sessionId !== this.history.platformId || params.externalSessionId != null && params.externalSessionId !== this.history.externalId) throw new BridgeError("INVALID_PARAMS", "The cursor belongs to a different session.");
			page = this.history;
		} else {
			this.clearHistory();
			const id = await this.resolve(params, signal);
			try {
				const log = this.reader.native ? await this.reader.native.read(id) : await this.reader.query.readSession(id);
				signal.throwIfAborted();
				const platformId = sessionId(this.namespace, id);
				const all = await projectHistoryAsync(log, platformId, signal);
				const limit = integer(params.limit, Math.max(all.length, 1), 1e6);
				const values = all.slice(-limit);
				const seq = Number(log.events.at(-1)?.seq ?? -1);
				page = {
					id: randomUUID(),
					values,
					expires: Date.now() + this.pageLifetimeMs,
					externalId: id,
					platformId,
					watermark: {
						seq,
						revision: `projection-2:${seq}`
					},
					truncated: values.length < all.length
				};
			} finally {
				this.reader.native?.source.release(id);
			}
		}
		const items = [];
		let bytes = 0;
		for (const item of page.values.slice(offset, offset + 1e3)) {
			const size = jsonBytes(item) + 1;
			if (size > 7340032) {
				if (this.history === page) this.clearHistory();
				throw new BridgeError("FRAME_TOO_LARGE", "One DSH history item exceeds the transport limit.");
			}
			if (bytes + size > 7340032) break;
			bytes += size;
			items.push(item);
		}
		const next = offset + items.length;
		const nextCursor = next < page.values.length ? `${page.id}:${next}` : null;
		if (nextCursor === null) {
			if (this.history === page) this.clearHistory();
		} else this.retainHistory(page);
		return {
			sessionId: page.platformId,
			externalSessionId: page.externalId,
			runtime: "dsh",
			items,
			complete: offset === 0 && nextCursor === null && !page.truncated,
			snapshotComplete: !page.truncated,
			nextCursor,
			watermark: page.watermark,
			metadata: {
				projectionVersion: 3,
				totalItems: page.values.length,
				readOnly: !this.reader.native?.ctx.get("agents")
			}
		};
	}
};
// src/host/dsh-runtime/bridge-service.ts
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const BRIDGE_SERVICE = "aa.dsh.v2.Bridge";
const callScope = dependency((namespace, context) => {
	if (typeof namespace !== "string" || !namespace || namespace.length > 512) throw new MeshCallError("INVALID_PARAMS", "A runtime namespace is required.");
	return {
		namespace,
		logger: context.logger
	};
}, { inject: [meta("aa-session-namespace")] });
function packageVersion(specifier) {
	try {
		return String(createRequire(import.meta.url)(specifier).version) || "unknown";
	} catch {
		return "unknown";
	}
}
/** DSH packages share one release version and the Host resolves this peer to its own copy. */
const RUNTIME_VERSION = packageVersion("@deepseek-ai/dsh-typert-protocol/package.json");
const BRIDGE_VERSION = packageVersion("@yundashi/dsh-remote-control/package.json");
const REGISTERED_SCHEMAS = Symbol.for("agents-anywhere.dsh-bridge.registered-schemas");
const { payload, syncRequest, syncEvent } = registerSchemas();
/**
* Named schemas live in zod's process-wide registry, and DSH imports this module
* again when the plugin is reloaded. Some zod versions refuse a repeated id, which
* would leave the plugin unable to load until DSH restarts, so a new import first
* takes back what the previous one registered.
*/
function registerSchemas() {
	const shared = globalThis;
	for (const schema of shared[REGISTERED_SCHEMAS] ?? []) z$1.globalRegistry.remove(schema);
	const schemas = {
		payload: z$1.looseObject({}).meta({ id: "BridgePayload" }),
		syncRequest: z$1.object({
			subscriptionId: z$1.string().min(1).max(128),
			checkpointVersion: z$1.int().optional()
		}).meta({ id: "BridgeSyncRequest" }),
		syncEvent: z$1.object({
			kind: z$1.literal("subscribed"),
			projectionVersion: z$1.int(),
			checkpointVersion: z$1.int().optional()
		}).meta({ id: "BridgeSyncEvent" })
	};
	shared[REGISTERED_SCHEMAS] = Object.values(schemas);
	return schemas;
}
/** A plugin error as a MeshCall application error: the code is the 1.0 error name. */
function bridgeFailure(error) {
	if (error instanceof MeshCallError) return error;
	const failure = publicError(error);
	return new MeshCallError(failure.code, failure.message, { retryable: failure.retryable });
}
/** `aa.dsh.v2.Bridge`: the DSH session runtime as the Connector calls it through the local Router. */
let BridgeService = (() => {
	let _classDecorators = [service(BRIDGE_SERVICE, { description: "DeepSeek Harness sessions for the Agents Anywhere Connector on this machine." })];
	let _classDescriptor;
	let _classExtraInitializers = [];
	let _classThis;
	let _instanceExtraInitializers = [];
	let _initialize_decorators;
	let _ping_decorators;
	let _getRuntimeConfig_decorators;
	let _getRuntimeCapabilities_decorators;
	let _listWorkspaces_decorators;
	let _listSessions_decorators;
	let _getSessionSnapshot_decorators;
	let _getPlanning_decorators;
	let _setPlanning_decorators;
	let _getSessionState_decorators;
	let _getSessionNotices_decorators;
	let _getSessionCapabilities_decorators;
	let _listCommands_decorators;
	let _listModels_decorators;
	let _listPermissions_decorators;
	let _listAgentPresets_decorators;
	let _createAndStartSession_decorators;
	let _startTurn_decorators;
	let _interruptSession_decorators;
	let _updateSelections_decorators;
	let _respondInteraction_decorators;
	let _executeCommand_decorators;
	let _refreshSync_decorators;
	let _sync_decorators;
	var BridgeService = class {
		static {
			_classThis = this;
		}
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
			_initialize_decorators = [query({
				description: "Identify the bridge and the features this DSH offers; checks the protocol major.",
				request: payload,
				response: payload
			})];
			_ping_decorators = [query({
				description: "Answer while the bridge is serving.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getRuntimeConfig_decorators = [query({
				description: "The runtime configuration the plugin applies.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getRuntimeCapabilities_decorators = [query({
				description: "Runtime-wide capabilities.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listWorkspaces_decorators = [query({
				description: "Workspaces DSH knows.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listSessions_decorators = [query({
				description: "One page of the session inventory; pass nextCursor to continue.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getSessionSnapshot_decorators = [query({
				description: "One page of a session timeline snapshot.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getPlanning_decorators = [query({
				description: "Native planning state.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_setPlanning_decorators = [mutates({
				description: "Select native planning mode.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getSessionState_decorators = [query({
				description: "Status, selections and source state of a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getSessionNotices_decorators = [query({
				description: "Open questions and approvals of a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_getSessionCapabilities_decorators = [query({
				description: "Capabilities of one session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listCommands_decorators = [query({
				description: "Native commands available in a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listModels_decorators = [query({
				description: "The model catalog.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listPermissions_decorators = [query({
				description: "The permission catalog.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_listAgentPresets_decorators = [query({
				description: "Agent modes and the default for new sessions.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_createAndStartSession_decorators = [mutates({
				description: "Create a session and send its first message.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_startTurn_decorators = [mutates({
				description: "Send a message to an existing session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_interruptSession_decorators = [mutates({
				description: "Interrupt the running turn of a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_updateSelections_decorators = [mutates({
				description: "Change model, effort or permission selections of a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_respondInteraction_decorators = [mutates({
				description: "Answer a question or approval notice.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_executeCommand_decorators = [mutates({
				description: "Run a native command in a session.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_refreshSync_decorators = [mutates({
				description: "Capture one session again, for example after it was quarantined.",
				request: payload,
				response: payload,
				inject: [callScope]
			})];
			_sync_decorators = [stream({
				description: "Run the event feed of the caller namespace while this call stays open; batches arrive through aa.dsh.v2.Sync.ingestBatch.",
				request: syncRequest,
				outputItem: syncEvent,
				inject: [callScope]
			})];
			__esDecorate(this, null, _initialize_decorators, {
				kind: "method",
				name: "initialize",
				static: false,
				private: false,
				access: {
					has: (obj) => "initialize" in obj,
					get: (obj) => obj.initialize
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _ping_decorators, {
				kind: "method",
				name: "ping",
				static: false,
				private: false,
				access: {
					has: (obj) => "ping" in obj,
					get: (obj) => obj.ping
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getRuntimeConfig_decorators, {
				kind: "method",
				name: "getRuntimeConfig",
				static: false,
				private: false,
				access: {
					has: (obj) => "getRuntimeConfig" in obj,
					get: (obj) => obj.getRuntimeConfig
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getRuntimeCapabilities_decorators, {
				kind: "method",
				name: "getRuntimeCapabilities",
				static: false,
				private: false,
				access: {
					has: (obj) => "getRuntimeCapabilities" in obj,
					get: (obj) => obj.getRuntimeCapabilities
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listWorkspaces_decorators, {
				kind: "method",
				name: "listWorkspaces",
				static: false,
				private: false,
				access: {
					has: (obj) => "listWorkspaces" in obj,
					get: (obj) => obj.listWorkspaces
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listSessions_decorators, {
				kind: "method",
				name: "listSessions",
				static: false,
				private: false,
				access: {
					has: (obj) => "listSessions" in obj,
					get: (obj) => obj.listSessions
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getSessionSnapshot_decorators, {
				kind: "method",
				name: "getSessionSnapshot",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSessionSnapshot" in obj,
					get: (obj) => obj.getSessionSnapshot
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getPlanning_decorators, {
				kind: "method",
				name: "getPlanning",
				static: false,
				private: false,
				access: {
					has: (obj) => "getPlanning" in obj,
					get: (obj) => obj.getPlanning
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setPlanning_decorators, {
				kind: "method",
				name: "setPlanning",
				static: false,
				private: false,
				access: {
					has: (obj) => "setPlanning" in obj,
					get: (obj) => obj.setPlanning
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getSessionState_decorators, {
				kind: "method",
				name: "getSessionState",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSessionState" in obj,
					get: (obj) => obj.getSessionState
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getSessionNotices_decorators, {
				kind: "method",
				name: "getSessionNotices",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSessionNotices" in obj,
					get: (obj) => obj.getSessionNotices
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getSessionCapabilities_decorators, {
				kind: "method",
				name: "getSessionCapabilities",
				static: false,
				private: false,
				access: {
					has: (obj) => "getSessionCapabilities" in obj,
					get: (obj) => obj.getSessionCapabilities
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listCommands_decorators, {
				kind: "method",
				name: "listCommands",
				static: false,
				private: false,
				access: {
					has: (obj) => "listCommands" in obj,
					get: (obj) => obj.listCommands
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listModels_decorators, {
				kind: "method",
				name: "listModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "listModels" in obj,
					get: (obj) => obj.listModels
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listPermissions_decorators, {
				kind: "method",
				name: "listPermissions",
				static: false,
				private: false,
				access: {
					has: (obj) => "listPermissions" in obj,
					get: (obj) => obj.listPermissions
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listAgentPresets_decorators, {
				kind: "method",
				name: "listAgentPresets",
				static: false,
				private: false,
				access: {
					has: (obj) => "listAgentPresets" in obj,
					get: (obj) => obj.listAgentPresets
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _createAndStartSession_decorators, {
				kind: "method",
				name: "createAndStartSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "createAndStartSession" in obj,
					get: (obj) => obj.createAndStartSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _startTurn_decorators, {
				kind: "method",
				name: "startTurn",
				static: false,
				private: false,
				access: {
					has: (obj) => "startTurn" in obj,
					get: (obj) => obj.startTurn
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _interruptSession_decorators, {
				kind: "method",
				name: "interruptSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "interruptSession" in obj,
					get: (obj) => obj.interruptSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _updateSelections_decorators, {
				kind: "method",
				name: "updateSelections",
				static: false,
				private: false,
				access: {
					has: (obj) => "updateSelections" in obj,
					get: (obj) => obj.updateSelections
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _respondInteraction_decorators, {
				kind: "method",
				name: "respondInteraction",
				static: false,
				private: false,
				access: {
					has: (obj) => "respondInteraction" in obj,
					get: (obj) => obj.respondInteraction
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _executeCommand_decorators, {
				kind: "method",
				name: "executeCommand",
				static: false,
				private: false,
				access: {
					has: (obj) => "executeCommand" in obj,
					get: (obj) => obj.executeCommand
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _refreshSync_decorators, {
				kind: "method",
				name: "refreshSync",
				static: false,
				private: false,
				access: {
					has: (obj) => "refreshSync" in obj,
					get: (obj) => obj.refreshSync
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _sync_decorators, {
				kind: "method",
				name: "sync",
				static: false,
				private: false,
				access: {
					has: (obj) => "sync" in obj,
					get: (obj) => obj.sync
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, {
				kind: "class",
				name: _classThis.name,
				metadata: _metadata
			}, null, _classExtraInitializers);
			BridgeService = _classThis = _classDescriptor.value;
			if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
			__runInitializers(_classThis, _classExtraInitializers);
		}
		backend = __runInitializers(this, _instanceExtraInitializers);
		routers = /* @__PURE__ */ new Map();
		constructor(backend) {
			this.backend = backend;
		}
		routerFor(namespace) {
			let current = this.routers.get(namespace);
			if (!current) this.routers.set(namespace, current = new RuntimeRouter(this.backend.reader, namespace));
			return current;
		}
		async forward(method, request, call, context) {
			try {
				return record(await this.routerFor(call.namespace).request(method, request, context.signal));
			} catch (error) {
				call.logger.warning("rpc.rejected %s", JSON.stringify(errorDetails(error)));
				throw bridgeFailure(error);
			}
		}
		close() {
			for (const router of this.routers.values()) router.shutdown();
			this.routers.clear();
		}
		async initialize(request) {
			if (typeof request.protocolVersion !== "string" || !request.protocolVersion.startsWith("2.") || request.runtime !== "dsh") throw new MeshCallError("PROTOCOL_VERSION_MISMATCH", "The bridge requires DSH protocol 2.x.");
			const reader = this.backend.reader;
			return {
				identity: {
					runtime: "dsh",
					runtimeVersion: RUNTIME_VERSION,
					bridgeVersion: BRIDGE_VERSION,
					protocolVersion: "2.0",
					displayName: "DeepSeek Harness"
				},
				storage: {
					mode: "dsh-native",
					sameSessionWriterLimit: 1,
					crossProcessWriterExclusion: false
				},
				features: {
					attachments: Boolean(reader.native?.ctx.get("sessionController") && reader.native.ctx.get("attachments")),
					sessionDiscovery: true,
					timelineSuffixRead: false,
					approval: reader.native?.approvals.available ?? false,
					userQuestions: reader.native?.questions.available ?? false,
					readOnly: !reader.native?.ctx.get("sessionController"),
					snapshotPagination: true,
					syncMode: reader.native ? "events" : "polling",
					projectionVersion: 3
				}
			};
		}
		async ping(request, call, context) {
			return this.forward("ping", request, call, context);
		}
		async getRuntimeConfig(request, call, context) {
			return this.forward("getRuntimeConfig", request, call, context);
		}
		async getRuntimeCapabilities(request, call, context) {
			return this.forward("getRuntimeCapabilities", request, call, context);
		}
		async listWorkspaces(request, call, context) {
			return this.forward("listWorkspaces", request, call, context);
		}
		async listSessions(request, call, context) {
			return this.forward("listSessions", request, call, context);
		}
		async getSessionSnapshot(request, call, context) {
			return this.forward("getSessionSnapshot", request, call, context);
		}
		async getPlanning(request, call, context) {
			return this.forward("getPlanning", request, call, context);
		}
		async setPlanning(request, call, context) {
			return this.forward("setPlanning", request, call, context);
		}
		async getSessionState(request, call, context) {
			return this.forward("getSessionState", request, call, context);
		}
		async getSessionNotices(request, call, context) {
			return this.forward("getSessionNotices", request, call, context);
		}
		async getSessionCapabilities(request, call, context) {
			return this.forward("getSessionCapabilities", request, call, context);
		}
		async listCommands(request, call, context) {
			return this.forward("listCommands", request, call, context);
		}
		async listModels(request, call, context) {
			return this.forward("listModels", request, call, context);
		}
		async listPermissions(request, call, context) {
			return this.forward("listPermissions", request, call, context);
		}
		async listAgentPresets(request, call, context) {
			return this.forward("listAgentPresets", request, call, context);
		}
		async createAndStartSession(request, call, context) {
			return this.forward("createAndStartSession", request, call, context);
		}
		async startTurn(request, call, context) {
			return this.forward("startTurn", request, call, context);
		}
		async interruptSession(request, call, context) {
			return this.forward("interruptSession", request, call, context);
		}
		async updateSelections(request, call, context) {
			return this.forward("updateSelections", request, call, context);
		}
		async respondInteraction(request, call, context) {
			return this.forward("respondInteraction", request, call, context);
		}
		async executeCommand(request, call, context) {
			return this.forward("executeCommand", request, call, context);
		}
		async refreshSync(request, call, context) {
			return this.forward("refreshSync", request, call, context);
		}
		async *sync(request, call, context) {
			const router = this.routerFor(call.namespace);
			let failure;
			let stopped = () => void 0;
			const ended = new Promise((resolve) => {
				stopped = resolve;
			});
			const feed = router.subscribe(request.subscriptionId, request.checkpointVersion === 1, this.backend.transportFor(request.subscriptionId), (error) => {
				call.logger.bind({ subscriptionId: request.subscriptionId }).error("bridge.sync_failed %s", JSON.stringify(errorDetails(error)));
				failure = error;
				stopped();
			});
			const onAbort = () => stopped();
			context.signal.addEventListener("abort", onAbort, { once: true });
			router.closed.addEventListener("abort", onAbort, { once: true });
			try {
				yield {
					kind: "subscribed",
					projectionVersion: 3,
					...request.checkpointVersion === 1 ? { checkpointVersion: 1 } : {}
				};
				feed.start();
				await ended;
				if (failure !== void 0) throw bridgeFailure(failure instanceof BridgeError ? failure : new BridgeError("INTERNAL_ERROR", "DSH event sync stopped; resubscribe.", true));
			} finally {
				context.signal.removeEventListener("abort", onAbort);
				router.closed.removeEventListener("abort", onAbort);
				router.unsubscribe(feed);
			}
		}
	};
	return _classThis;
})();
// src/host/dsh-runtime/connection.ts
function parseRendezvous(text) {
	let value;
	try {
		value = record(JSON.parse(text));
	} catch {
		return;
	}
	const endpoint = record(value.endpoint);
	const local = typeof endpoint.unixPath === "string" && endpoint.unixPath ? { unixPath: endpoint.unixPath } : typeof endpoint.pipe === "string" && endpoint.pipe ? { pipe: endpoint.pipe } : void 0;
	if (value.version !== 2 || value.protocol !== "meshcall" || !local || typeof value.instanceId !== "string" || !value.instanceId || typeof value.key !== "string" || !value.key.startsWith("mk_") || typeof value.pid !== "number") return void 0;
	return {
		version: 2,
		protocol: "meshcall",
		instanceId: value.instanceId,
		pid: value.pid,
		endpoint: local,
		key: value.key
	};
}
/**
* The Connector's `aa.dsh.v2.Sync`, one call per batch or checkpoint.
* It is the plugin's half of a subscription: the SyncFeed sends batches here.
*/
var ConnectorSync = class {
	client;
	subscriptionId;
	constructor(client, subscriptionId) {
		this.client = client;
		this.subscriptionId = subscriptionId;
	}
	async ingestBatch(batch, signal, attempt = 0) {
		const key = `dsh-${batch.subscriptionId}-${batch.batchSeq}`.slice(0, 120);
		await this.client.ingestBatch(batch, {
			signal,
			idempotencyKey: attempt ? `${key}-${attempt}` : key
		});
	}
	async loadCheckpoint(externalSessionId) {
		return (await this.client.loadCheckpoint(this.subscriptionId, externalSessionId)).checkpoint ?? null;
	}
	async saveCheckpoint(externalSessionId, checkpoint) {
		await this.client.saveCheckpoint(this.subscriptionId, externalSessionId, checkpoint);
	}
	async deleteCheckpoint(externalSessionId) {
		await this.client.deleteCheckpoint(this.subscriptionId, externalSessionId);
	}
	async ingestSnapshot(request, pages, signal) {
		return this.client.ingestSnapshot(request, pages, { signal });
	}
};
/**
* Serves `aa.dsh.v2.Bridge` on the Router of whichever Connector currently
* publishes the rendezvous, and follows it when that Connector is replaced.
* The manager lock keeps a second plugin instance from registering beside us,
* which would split the Connector's calls between two DSH processes.
*/
var BridgeConnection = class {
	rendezvousPath;
	diagnostics;
	pollMs;
	logOutput;
	service;
	link;
	releaseLease;
	startTask;
	checking;
	recheck = false;
	timer;
	watcher;
	lastFailure;
	closed = false;
	closeTask;
	constructor(rendezvousPath, reader, diagnostics = reader.native?.diagnostics ?? quietDiagnostics, pollMs = 1e3, logOutput) {
		this.rendezvousPath = rendezvousPath;
		this.diagnostics = diagnostics;
		this.pollMs = pollMs;
		this.logOutput = logOutput;
		this.service = new BridgeService({
			reader,
			diagnostics,
			transportFor: (subscriptionId) => new ConnectorSync(this.requireLink().sync, subscriptionId)
		});
	}
	cachedLogsPath = null;
	/** The Connector this plugin serves right now, if any. */
	get connectorInstance() {
		return this.link?.rendezvous.instanceId;
	}
	get logsPath() {
		return this.cachedLogsPath;
	}
	async readRuntimeLogs(query, extraOutput) {
		const link = this.requireLink();
		await this.logOutput?.flush();
		await extraOutput?.flush(link.logs);
		return readRuntimeLogPage(link.logs, query, this.logsPath);
	}
	async readLogs(source = null, before, after, limit = 200, extraOutput) {
		const link = this.requireLink();
		await this.logOutput?.flush();
		await extraOutput?.flush(link.logs);
		return link.logs.read(source, before ?? null, after ?? null, limit, { timeoutMs: 3e3 });
	}
	start() {
		if (!this.startTask) {
			const task = this.open();
			this.startTask = task;
			task.catch(() => {
				if (!this.closed && this.startTask === task) this.startTask = void 0;
			});
		}
		return this.startTask;
	}
	requireLink() {
		if (!this.link) throw new Error("No Connector is serving DSH sync");
		return this.link;
	}
	async open() {
		if (this.closed) throw new Error("DSH bridge is closed");
		this.releaseLease = await acquireManagerLock(this.rendezvousPath, () => {
			this.diagnostics.log("error", "bridge.lease_lost", {});
			this.close();
		});
		if (this.closed) {
			await this.releaseLease();
			return;
		}
		this.timer = setInterval(() => this.check(), this.pollMs);
		this.timer.unref();
		try {
			const name = basename(this.rendezvousPath);
			this.watcher = watch(dirname(this.rendezvousPath), (_event, file) => {
				if (!file || String(file) === name) this.check();
			});
			this.watcher.on("error", () => {
				this.watcher?.close();
				this.watcher = void 0;
			});
		} catch {}
		this.check();
		await this.checking;
	}
	/** Serialised: one reconciliation at a time, and one more if asked meanwhile. */
	check() {
		if (this.closed) return;
		if (this.checking) {
			this.recheck = true;
			return;
		}
		this.checking = this.reconcile().catch((error) => {
			this.failed("bridge.reconcile_failed", error);
		}).finally(() => {
			this.checking = void 0;
			if (this.recheck && !this.closed) {
				this.recheck = false;
				this.check();
			}
		});
	}
	async reconcile() {
		let rendezvous;
		try {
			rendezvous = parseRendezvous(await readFile(this.rendezvousPath, "utf8"));
		} catch (error) {
			if (record(error).code !== "ENOENT") this.failed("bridge.rendezvous_unreadable", error);
		}
		const current = this.link?.rendezvous;
		if (current && rendezvous && current.instanceId === rendezvous.instanceId && current.key === rendezvous.key) {
			await this.logOutput?.flush();
			return;
		}
		if (this.link) await this.disconnect();
		if (!rendezvous || this.closed) return;
		const router = new Router("unixPath" in rendezvous.endpoint ? { unixPath: rendezvous.endpoint.unixPath } : { pipe: rendezvous.endpoint.pipe });
		const rpcLogger = new RuntimeRpcLogger(this.diagnostics);
		guardMeshCallResults();
		const mesh = new Mesh(router, {
			token: rendezvous.key,
			peerId: `dsh-bridge-${randomUUID()}`,
			logger: rpcLogger
		});
		mesh.mount(this.service, { instanceId: `dsh-bridge-${randomUUID()}` });
		let server;
		try {
			server = await mesh.startServing({
				logLevel: "debug",
				logger: rpcLogger
			});
		} catch (error) {
			await mesh.close().catch(() => void 0);
			this.failed("bridge.connector_unreachable", error, { connector: rendezvous.instanceId });
			return;
		}
		if (this.closed) {
			await mesh.close();
			return;
		}
		this.link = {
			rendezvous,
			mesh,
			server,
			sync: new SyncServiceClient(mesh),
			logs: new LogsServiceClient(mesh)
		};
		this.cachedLogsPath = join(dirname(dirname(this.rendezvousPath)), "logs");
		this.logOutput?.connect(this.link.logs);
		this.lastFailure = void 0;
		this.diagnostics.log("info", "bridge.connected", {
			connector: rendezvous.instanceId,
			connectorPid: rendezvous.pid
		});
		await this.logOutput?.flush();
	}
	failed(event, error, details = {}) {
		const key = `${event}:${error instanceof Error ? error.message : String(error)}`;
		if (key === this.lastFailure) return;
		this.lastFailure = key;
		this.diagnostics.log("warn", event, details, error);
	}
	async disconnect() {
		const link = this.link;
		if (!link) return;
		this.service.close();
		this.diagnostics.log("info", "bridge.disconnected", { connector: link.rendezvous.instanceId });
		await this.logOutput?.flush();
		this.logOutput?.connect(void 0);
		this.link = void 0;
		await link.server.close({
			drain: true,
			drainTimeoutMs: 1e3
		}).catch(() => void 0);
		await link.mesh.close().catch(() => void 0);
	}
	close() {
		return this.closeTask ??= this.closing();
	}
	async closing() {
		if (this.closed) return;
		this.closed = true;
		if (this.timer) clearInterval(this.timer);
		this.watcher?.close();
		await this.startTask?.catch(() => void 0);
		await this.checking;
		await this.disconnect();
		const release = this.releaseLease;
		this.releaseLease = void 0;
		await release?.();
	}
};
// src/host/dsh-runtime/index.ts
/** Independent of OAuth, the modal, and Desktop installation detection. */
var DshRuntimeService = class extends Service {
	static inject = [
		"sessions",
		"sessionQuery",
		"workspaceRegistry"
	];
	static Config = Config;
	server;
	makeServer;
	restartTask;
	disposed = false;
	currentStatus = {
		state: "starting",
		message: "正在启动本机连接…",
		hint: "",
		canRetry: false
	};
	status() {
		return { ...this.currentStatus };
	}
	startupFailureSnapshot = null;
	startupDiagnostic() {
		return this.startupFailureSnapshot && { ...this.startupFailureSnapshot };
	}
	diagnostics;
	logOutput = new RpcLogOutput();
	native;
	constructor(ctx, config) {
		super(ctx, "yundashiRemoteRuntime");
		const bridge = bridgeDirectory(config);
		const legacy = legacyBridgeDirectory(config);
		this.diagnostics = new RuntimeDiagnostics(this.logOutput);
		this.native = new NativeRuntime(ctx, join(bridge, "create-intents"), this.diagnostics, legacy && join(legacy, "attachments", "staging"));
		this.makeServer = () => new BridgeConnection(join(bridge, "connector.json"), {
			native: this.native,
			query: {
				listSessions: (signal) => this.native.inventory(signal),
				readSession: (id) => this.native.read(id),
				readTitleSnapshots: async (ids, signal) => {
					const results = [];
					for (const id of new Set(ids)) {
						signal?.throwIfAborted();
						try {
							const log = await this.native.source.readLog(id);
							const title = foldSessionTitle(log.events);
							results.push({
								sessionId: id,
								status: "fulfilled",
								value: {
									session: log.session,
									...title ? { title } : {}
								}
							});
						} catch (reason) {
							results.push({
								sessionId: id,
								status: "rejected",
								reason
							});
						}
					}
					signal?.throwIfAborted();
					return results;
				}
			},
			status: (id) => this.native.status(id)
		}, this.diagnostics, 1e3, this.logOutput);
		this.server = this.makeServer();
		ctx.effect(() => async () => {
			this.disposed = true;
			await this.restartTask;
			try {
				await this.native.close();
			} finally {
				await this.server.close();
				await this.diagnostics.flush();
			}
		}, "yundashiRemoteRuntime.close");
	}
	async [Service.init]() {
		await this.restart();
	}
	hasLogConnection() {
		return Boolean(this.server.connectorInstance);
	}
	get logsPath() {
		return this.server.logsPath;
	}
	async readRuntimeLogs(query, extraOutput) {
		if (!this.hasLogConnection()) return {
			available: false,
			items: [],
			firstSeq: null,
			lastSeq: null,
			total: 0,
			hasMoreBefore: false,
			hasMoreAfter: false,
			logsPath: this.server.logsPath,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		return this.server.readRuntimeLogs(query, extraOutput);
	}
	async readBridgeLogs() {
		if (!this.hasLogConnection()) return {
			entries: [],
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		return readBridgeLogs(await this.server.readLogs("bridge"));
	}
	async readConnectorLogs(query) {
		return readConnectorRuntimeLogs(await this.server.readLogs("connector", query?.before, query?.after));
	}
	restart() {
		if (this.restartTask) return this.restartTask;
		if (this.disposed) return Promise.resolve({
			state: "unavailable",
			message: "本机连接已关闭。",
			hint: "请重新加载插件后再试。",
			canRetry: false
		});
		this.currentStatus = {
			state: "starting",
			message: "正在启动本机连接…",
			hint: "",
			canRetry: false
		};
		this.restartTask = (async () => {
			try {
				await this.server.close();
				if (this.disposed) return this.status();
				this.server = this.makeServer();
				await this.native.attachments.initialize();
				await this.server.start();
				this.currentStatus = {
					state: "ready",
					message: "本机连接已就绪",
					hint: "",
					canRetry: false
				};
				this.startupFailureSnapshot = null;
			} catch (error) {
				this.currentStatus = startupFailure(error);
				this.startupFailureSnapshot = startupFailureDiagnostic(error, "bridge", "bridge.restart_failed", this.currentStatus);
				this.diagnostics.log("error", "bridge.restart_failed", { code: this.currentStatus.code }, error);
			}
			return this.status();
		})().finally(() => {
			this.restartTask = void 0;
		});
		return this.restartTask;
	}
};
// src/host/index.ts
const name = "yundashi-remote-control";
function apply(ctx, config) {
	guardMeshCallResults();
	ctx.plugin(DshRuntimeService, config);
	ctx.plugin(OnboardingService, config);
}
export { Config, apply, name };

//# sourceMappingURL=index.js.map