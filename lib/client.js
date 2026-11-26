window.__ModuleLoader__.load({
	id: "@yundashi/dsh-remote-control",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/locales.ts
		/** Source-text keys keep the existing Chinese copy and the English catalog aligned.
		* Registered with DSH locale; no separate language preference is stored here. */
		const LOCALE_NS = "yundashi-remote-control.next";
		const en = {
			"本机连接被占用，无法启动。": "The local connection is in use and cannot start.",
			"请退出其他正在运行的 DSH，再点击“尝试重启”。如果只开了一个 DSH，请检查是否重复启用了插件。": "Quit other running DSH instances, then click Try restarting. If only one DSH is open, check whether the plugin is enabled more than once.",
			"本机连接启动失败：访问权限不足。": "The local connection could not start: permission denied.",
			"请检查 DSH 数据目录的读写权限，以及系统是否允许 DSH 使用本机网络，再尝试重启。": "Check read/write access to the DSH data directory and permission to use the local network, then try restarting.",
			"本机连接启动失败：无法保存连接信息。": "The local connection could not start: unable to save connection information.",
			"请释放磁盘空间后，再尝试重启。": "Free up disk space, then try restarting.",
			"DSH 数据目录所在磁盘为只读。请恢复写入权限后，再尝试重启。": "The disk containing the DSH data directory is read-only. Restore write access, then try restarting.",
			"本机连接未能启动。": "The local connection could not start.",
			"请先尝试重启连接。如果仍然失败，请展开运行日志中的失败记录，查看错误详情。": "Try restarting the connection. If it still fails, expand the failed entry in runtime logs for details.",
			"本机连接服务尚未就绪。": "The local connection service is not ready yet.",
			"如果此状态持续出现，请在 DSH 中重新加载插件，或退出并重新打开 DSH。": "If this persists, reload the plugin in DSH, or quit and reopen DSH.",
			"请输入有效的 HTTP 或 HTTPS 服务器地址，不要包含账号、密码或页面路径。": "Enter a valid HTTP or HTTPS server address without a username, password or page path.",
			"无法连接服务器，请检查地址和网络后重试。": "Unable to connect to the server. Check the address and network, then try again.",
			"该地址未返回正常的云大师远程控制服务，请检查后端地址。": "This address did not return a valid Yundashi Remote Control service. Check the backend address.",
			"连接服务器超时，请检查地址和网络后重试。": "The server connection timed out. Check the address and network, then try again.",
			"Connector 日志分页参数无效。": "Invalid Connector log pagination parameters.",
			"运行日志查询参数无效。": "Invalid runtime log query parameters.",
			"登录已失效，请重新登录。": "Your session has expired. Sign in again.",
			"服务请求失败（HTTP {status}），请重试。": "The service request failed (HTTP {status}). Try again.",
			"授权服务没有返回有效凭据。": "The authorization service did not return valid credentials.",
			"无法确认当前账号。": "Unable to verify the current account.",
			"设备响应无效。": "Invalid device response.",
			"设备列表响应无效，请重试。": "Invalid device list response. Try again.",
			"设备注册没有返回有效凭据。": "Device registration did not return valid credentials.",
			"无法恢复设备凭据。": "Unable to restore device credentials.",
			"本机设备已被删除，请重新配置以恢复连接。": "This device has been deleted. Set it up again to restore the connection.",
			"本机设备已断开连接，是否重新连接？": "This device has been disconnected. Reconnect?",
			"设备归属与当前账号不一致。": "The device belongs to a different account.",
			"本机设备记录已变化，请重新打开插件。": "The local device record has changed. Reopen the plugin.",
			"注册设备的账号不一致。": "The registered device belongs to a different account.",
			"Connector 配置格式无效。": "Invalid Connector settings format.",
			"包含不支持的 Connector 配置项。": "The settings contain unsupported Connector options.",
			"uv 路径无效。": "Invalid uv path.",
			"代理地址无效，请填写完整地址，例如 http://127.0.0.1:7890。": "Invalid proxy address. Enter a full address, such as http://127.0.0.1:7890.",
			"请填写 uv 可执行文件的绝对路径，或留空自动查找。": "Enter the absolute path to the uv executable, or leave it blank for automatic detection.",
			"请选择列表中的 PyPI 镜像。": "Select a PyPI mirror from the list.",
			"请选择列表中的 Python 下载镜像。": "Select a Python download mirror from the list.",
			"同步间隔必须是 1–3600 之间的整数。": "The sync interval must be an integer between 1 and 3600.",
			"无法打开目录，请检查本机文件管理器是否可用。": "Unable to open the folder. Check that a local file manager is available.",
			"无法读取本机 Connector 记录，请检查文件格式与访问权限。": "Unable to read the local Connector record. Check the file format and permissions.",
			"正在等待登录授权…": "Waiting for sign-in authorization…",
			"本次登录已超时，请回到插件重试。": "Sign-in timed out. Return to the plugin and try again.",
			"你已取消授权，可以回到插件重新开始。": "Authorization was cancelled. Return to the plugin to start again.",
			"未找到桌面端安装记录，可以通过 Web 完成设置。": "No Desktop installation was found. You can finish setup on the web.",
			"桌面端安装记录无效，请打开一次云大师桌面端后重试。": "The Desktop installation record is invalid. Open Yundashi Desktop once, then try again.",
			"桌面端启动参数无效，请打开一次云大师桌面端后重试。": "The Desktop launch arguments are invalid. Open Yundashi Desktop once, then try again.",
			"已发现云大师桌面端，请由桌面端管理本机设备。": "Yundashi Desktop was found. Use it to manage this device.",
			"云大师桌面端未运行，可以在插件中管理本机设备。": "Yundashi Desktop is not running. Manage this device in the plugin.",
			"云大师桌面端正在运行，请由桌面端管理本机设备。": "Yundashi Desktop is running. Use it to manage this device.",
			"无法确认云大师桌面端是否正在运行，请检查进程查询权限后重试。": "Cannot determine whether Yundashi Desktop is running. Check process inspection permissions and try again.",
			"桌面端已不在原安装位置，可以通过 Web 继续连接本机设备。": "Desktop is no longer at its installation path. Continue connecting this device on the web.",
			"无法读取或验证桌面端安装记录，请检查文件格式与访问权限。": "Unable to read or verify the Desktop installation record. Check the file format and permissions.",
			"本机设备连接已失效，请在插件中恢复连接。": "This device’s connection has expired. Restore it in the plugin.",
			"当前已有其他 Connector 在运行，请先结束对应的 Connector 进程，然后重试。": "Another Connector is running. Stop that Connector process, then try again.",
			"未找到内部 Connector 源码，请重新构建插件或配置 connectorSourceDir。": "Bundled Connector source was not found. Rebuild the plugin or configure connectorSourceDir.",
			"未找到可用的 uv，请安装 uv，或在插件配置中指定 uvPath。": "No usable uv installation was found. Install uv or set uvPath in the plugin settings.",
			"Connector 输入连接已关闭。": "The Connector input connection has closed.",
			"Connector 进程启动失败，请检查 uv 和源码运行环境。": "The Connector process failed to start. Check uv and the source runtime environment.",
			"Connector 已退出（{code}）。请在日志页切换到 Connector 查看原因。": "Connector exited ({code}). Select Connector on the logs tab for details.",
			"终止": "terminated",
			"Connector 尚未运行，请返回插件重试。": "Connector is not running yet. Return to the plugin and try again.",
			"Connector 同步状态文件无效，请查看启动前诊断。": "The Connector sync state file is invalid. Check pre-startup diagnostics.",
			"Connector 运行失败，请查看启动前诊断。": "The Connector runtime failed. Check pre-startup diagnostics.",
			"Connector 同步状态文件无效。终端输出中列出了文件路径；请在“设置 → 维护”中打开数据目录，移走该文件后重新启动 Connector。": "The Connector sync state file is invalid. The terminal output lists its path. Open the data folder from Settings → Maintenance, move that file away, then restart the Connector.",
			"Connector 连接失败，详情见下方错误信息和终端输出。": "The Connector failed to connect. See the error details and terminal output below.",
			"Connector 未启动。": "Connector has not started.",
			"Connector 响应超时，请检查 Python 依赖安装和网络连接。": "Connector timed out. Check Python dependency installation and the network connection.",
			"Connector 返回了过大的消息。": "Connector returned a message that is too large.",
			"Connector 操作失败，请检查本机运行环境后重试。": "The Connector operation failed. Check the local runtime environment, then try again.",
			"Connector 返回了无效的协议消息。": "Connector returned an invalid protocol message.",
			"手机连接二维码响应无效，请重试。": "Invalid mobile connection QR code response. Try again.",
			"请选择确认或拒绝连接。": "Choose to confirm or reject the connection.",
			"手机连接状态已变化，请刷新后重试。": "The phone connection status has changed. Refresh and try again.",
			"二维码已失效，请重新生成。": "The QR code is no longer valid. Generate a new one.",
			"手机连接状态无效，请重试。": "Invalid phone connection status. Try again.",
			"正在检查本机…": "Checking this device…",
			"登录后，将为这台电脑建立连接。": "Sign in to connect this computer.",
			"插件已关闭。": "The plugin has closed.",
			"无法打开云大师桌面端：{detail}": "Unable to open Yundashi Desktop: {detail}",
			"正在开始另一次登录，请稍候。": "Another sign-in is starting. Please wait.",
			"请选择云端或自建服务器。": "Choose the cloud service or a self-hosted server.",
			"请在浏览器登录并授权。": "Sign in and authorize access in your browser.",
			"账号发生变化，请重新登录。": "The account has changed. Sign in again.",
			"请先完成登录。": "Sign in first.",
			"登录成功，正在连接本机设备…": "Signed in. Connecting this device…",
			"正在启动本机连接，首次准备运行环境可能需要几分钟…": "Starting the local connection. Initial environment setup may take a few minutes…",
			"设备已上线，正在继续 Web 引导…": "The device is online. Continuing web setup…",
			"设备暂未上线，请检查网络后在插件中重试。": "The device is not online yet. Check the network, then try again in the plugin.",
			"本机连接已中断，正在检查设备状态…": "The local connection was interrupted. Checking device status…",
			"账号登录已失效，请重新登录后恢复设备连接。": "Your session has expired. Sign in again to restore the device connection.",
			"账号登录已失效，请重新登录。": "Your account session has expired. Sign in again.",
			"本机设备凭据已失效，且账号登录已过期，请重新登录后恢复连接。": "The device credential is no longer valid and your account session has expired. Sign in again to restore the connection.",
			"账号登录已过期，同步不受影响；手机连接等账号功能需要重新登录。": "Your account session has expired. Sync continues; sign in again to use account features such as mobile connection.",
			"账号登录已过期，请重新登录。": "Your account session has expired. Sign in again.",
			"{detail}（{seconds} 秒后自动重试）": "{detail} (retrying automatically in {seconds} s)",
			"暂时无法确认设备状态，请检查网络后重试。": "Unable to verify device status. Check the network and try again.",
			"设备状态已变化，请重新打开插件。": "The device status has changed. Reopen the plugin.",
			"设备状态已变化，请先重新检查。": "The device status has changed. Check it again first.",
			"正在重新创建设备…": "Recreating the device…",
			"正在恢复设备连接…": "Restoring the device connection…",
			"正在启动本机连接…": "Starting the local connection…",
			"本机设备已连接。": "This device is connected.",
			"恢复连接失败，请检查设备状态后重试。": "Unable to restore the connection. Check device status and try again.",
			"请先在“登录和连接”中登录。": "Sign in on the Sign in and connect tab first.",
			"不支持的 Connector 操作。": "Unsupported Connector operation.",
			"Connector 已停止。": "Connector has stopped.",
			"请先在“登录和连接”中恢复设备连接。": "Restore the device connection on the Sign in and connect tab first.",
			"正在检查本机设备…": "Checking the local device…",
			"正在启动 Connector…": "Starting Connector…",
			"连接正在进行，请完成或取消后再保存设置。": "A connection is in progress. Complete or cancel it before saving settings.",
			"不支持的目录。": "Unsupported folder.",
			"重置参数无效。": "Invalid reset parameter.",
			"无法撤销设备连接。{detail}": "Unable to revoke the device connection. {detail}",
			"已恢复出厂设置，请重新登录。": "Factory reset complete. Sign in again.",
			"依赖环境已清空，下次连接时会重新安装。": "Dependencies cleared. They will be reinstalled on the next connection.",
			"可以重新开始连接。": "You can start connecting again.",
			"已退出登录，本机连接已停止。": "Signed out. The local connection has stopped.",
			"本机管理锁已失效，连接已停止。请重新加载插件。": "The local management lock is no longer valid. The connection has stopped. Reload the plugin.",
			"无法连接服务，请检查网络和连接地址。": "Unable to connect to the service. Check the network and connection address.",
			"连接失败，请重试。": "Connection failed. Try again.",
			"本机连接已关闭。": "The local connection has closed.",
			"请重新加载插件后再试。": "Reload the plugin and try again.",
			"本机连接已就绪": "The local connection is ready",
			"打开面板": "Open panel",
			"正在读取连接设置…": "Loading connection settings…",
			"已安装 Agents Anywhere 桌面端。请打开桌面端管理连接设置。": "Agents Anywhere Desktop is installed. Open it to manage connection settings.",
			"云大师桌面端正在运行。请在桌面端管理连接设置。": "Yundashi Desktop is running. Manage connection settings there.",
			"locale.code": "en",
			"手机连接": "Mobile connection",
			"远程控制": "Remote Control",
			"云大师远程控制": "Yundashi Remote Control",
			"{brand}远程控制": "{brand} Remote Control",
			"登录{brand}远程控制": "Sign in to {brand} Remote Control",
			"下载 Agents Anywhere 桌面端": "Download Agents Anywhere Desktop",
			"加入内测交流群": "Join the beta community",
			"去 GitHub 点 Star": "Star on GitHub",
			"登录和连接": "Sign in and connect",
			"设置": "Settings",
			"运行日志": "Runtime logs",
			"暂时无法检查本机 Connector 状态，请稍后重试。": "Unable to check the local Connector. Try again later.",
			"已安装 Agents Anywhere 桌面端。请打开桌面端完成连接设置。": "Agents Anywhere Desktop is installed. Open it to finish setting up your connection.",
			"云大师桌面端正在运行。请在桌面端完成连接设置。": "Yundashi Desktop is running. Finish setting up your connection there.",
			"正在检查连接方式…": "Checking connection options…",
			"关闭远程控制": "Close Remote Control",
			"连接管理": "Connection management",
			"重新检查": "Check again",
			"打开云大师桌面端": "Open Yundashi Desktop",
			"在所有设备间访问你的 Agent、会话和工作空间。": "Access your agents, sessions and workspaces across devices.",
			"Agents Anywhere 相关链接": "Agents Anywhere links",
			"状态暂不可用": "Status unavailable",
			"正在启动": "Starting",
			"正在检查": "Checking",
			"设备已删除": "Device deleted",
			"已断开": "Disconnected",
			"运行异常": "Error",
			"运行中": "Running",
			"未运行": "Stopped",
			"重新配置": "Set up again",
			"重新连接": "Reconnect",
			"重新登录": "Sign in again",
			"账号信息": "Account information",
			"{name}的头像": "Avatar for {name}",
			"正在处理…": "Working…",
			"浏览器没有打开？点击继续登录": "Browser did not open? Continue signing in",
			"浏览器没有打开？点击继续配置": "Browser did not open? Continue setup",
			"打开 Web": "Open web app",
			"正在退出…": "Signing out…",
			"退出登录": "Sign out",
			"关闭退出登录确认": "Close sign-out confirmation",
			"退出登录后，本机连接将停止。确定要退出登录吗？": "Signing out will stop the local connection. Are you sure you want to sign out?",
			"确认退出": "Confirm sign out",
			"日志来源": "Log source",
			"全部": "All",
			"插件": "Plugin",
			"启动前诊断": "Pre-startup diagnostics",
			"查看启动前诊断": "View pre-startup diagnostics",
			"当前启动失败": "Current startup failures",
			"当前启动失败与本地进程引导输出 · 独立于统一运行日志": "Current startup failures and local bootstrap output · Separate from unified runtime logs",
			"启动失败详情读取失败，请刷新重试。": "Unable to read startup failure details. Refresh to try again.",
			"运行日志读取失败。请点击“刷新”重试。": "Unable to read runtime logs. Click Refresh to try again.",
			"最近 200 条记录 · 点击查看详情": "Latest 200 entries · Click for details",
			"插件、Bridge 与 Connector 统一运行日志 · 点击查看详情": "Unified Plugin, Bridge, and Connector runtime logs · Click for details",
			"继续刷新": "Resume updates",
			"暂停刷新": "Pause updates",
			"刷新": "Refresh",
			"已暂停": "Paused",
			"每 2 秒刷新": "Updates every 2 seconds",
			"{status} · 更新于 {time}": "{status} · Updated at {time}",
			"{status} · 已显示 {count} 条": "{status} · Showing {count} entries",
			"加载更早的 200 条": "Load 200 earlier entries",
			"统一运行日志服务尚未就绪。Connector 启动并建立本机 RPC 连接后，插件、Bridge 与 Connector 日志将在此统一展示。": "Unified runtime logs are not ready yet. Plugin, Bridge, and Connector logs will appear here once Connector starts and establishes the local RPC connection.",
			"尚未读取到日志": "No logs loaded yet",
			"正在读取运行日志…": "Loading runtime logs…",
			"暂无运行记录。连接启动或收到请求后，日志会显示在这里。": "No runtime entries yet. Logs will appear when the connection starts or receives a request.",
			"运行日志记录": "Runtime log entries",
			"成功": "Success",
			"失败": "Failed",
			"进行中": "In progress",
			"提示": "Notice",
			"记录": "Info",
			"本机连接状态": "Local connection status",
			"正在重试…": "Retrying…",
			"尝试重启": "Try restarting",
			"查看运行日志": "View runtime logs",
			"Connector 日志读取失败，请重试。": "Unable to read Connector logs. Try again.",
			"Connector 日志": "Connector logs",
			"本地进程引导与 uv 启动输出 · 独立于统一运行日志": "Local process bootstrap and uv startup output · Separate from unified runtime logs",
			"最多保留 10,000 行 · 每次加载 200 行 · 向上滚动查看更早记录": "Up to 10,000 lines · Loads 200 at a time · Scroll up for earlier entries",
			"正在读取…": "Loading…",
			"已暂停刷新": "Updates paused",
			"{status} · 已显示 {count} 行": "{status} · Showing {count} lines",
			"Connector 终端输出": "Connector terminal output",
			"加载更早的 200 行": "Load 200 earlier lines",
			"暂无 Connector 日志。启动后，环境准备和运行输出会显示在这里。": "No Connector logs yet. Environment setup and runtime output will appear here after startup.",
			"暂无启动前诊断输出。uv 引导与 Connector 进程拉起输出会显示在这里。": "No pre-startup diagnostic output yet. uv bootstrap and Connector launch output will appear here.",
			"手机连接失败，请重试。": "Unable to connect the phone. Try again.",
			"暂时无法读取手机连接状态。": "Unable to read the phone connection status.",
			"一台手机": "A phone",
			"{name}请求连接此账号": "{name} wants to connect to this account",
			"已确认，正在完成手机登录…": "Approved. Finishing sign-in on your phone…",
			"手机已连接": "Phone connected",
			"已拒绝此次连接": "Connection rejected",
			"二维码已过期": "QR code expired",
			"使用手机端扫描二维码": "Scan the QR code with the mobile app",
			"收起二维码": "Hide QR code",
			"手机连接二维码": "Mobile connection QR code",
			"有效至 {time}": "Valid until {time}",
			"拒绝连接": "Reject connection",
			"确认连接": "Confirm connection",
			"连接另一台手机": "Connect another phone",
			"重新生成二维码": "Generate a new QR code",
			"已检测到桌面端，请在桌面端继续连接。": "Desktop detected. Continue connecting in the desktop app.",
			"云大师桌面端正在运行，请在桌面端继续连接。": "Yundashi Desktop is running. Continue connecting there.",
			"已登录为 {name}": "Signed in as {name}",
			"已打开登录页面，完成登录后将自动返回。": "The sign-in page is open. You will return automatically after signing in.",
			"正在连接…": "Connecting…",
			"登录 Agents Anywhere Cloud": "Sign in to Agents Anywhere Cloud",
			"连接到自定义远程控制服务实例": "Connect to your own remote control server",
			"输入服务器地址，例如 https://your-server.com": "Enter a server address, e.g. https://your-server.com",
			"连接服务器": "Connect to server",
			"浏览器没有打开？点击继续": "Browser did not open? Click to continue",
			"取消本次连接": "Cancel connection",
			"请重启桌面端，以加载连接器管理接口。": "Restart Desktop to load Connector management.",
			"此设备": "This device",
			"尚未连接": "Not connected",
			"服务器": "Server",
			"前往恢复连接": "Restore connection",
			"前往登录": "Sign in",
			"停止 Connector": "Stop Connector",
			"重启 Connector": "Restart Connector",
			"启动 Connector": "Start Connector",
			"运行环境": "Environment",
			"uv 路径": "uv path",
			"网络": "Network",
			"Connector 网络": "Connector network",
			"上传很慢或一直同步失败时，可以换成直连": "If uploads are very slow or sync keeps failing, try a direct connection",
			"跟随系统": "Follow system",
			"直连": "Direct",
			"自定义代理": "Custom proxy",
			"代理地址": "Proxy address",
			"留空使用内置 uv": "Leave blank to use bundled uv",
			"当前路径：": "Current path: ",
			"未找到 uv": "uv not found",
			"Python 下载镜像": "Python download mirror",
			"PyPI 镜像": "PyPI mirror",
			"同步设置": "Sync settings",
			"同步间隔": "Sync interval",
			"用于定时扫描的 Agent；本地会话消息实时同步": "For agents that use periodic scanning; local session messages sync in real time",
			"{count} 秒": "{count} seconds",
			"设置已保存": "Settings saved",
			"正在保存…": "Saving…",
			"保存并重启": "Save and restart",
			"保存设置": "Save settings",
			"维护": "Maintenance",
			"打开数据目录": "Open data folder",
			"打开日志目录": "Open logs folder",
			"恢复出厂设置": "Factory reset",
			"重装依赖环境": "Reinstall dependencies",
			"正在重装依赖环境…": "Reinstalling dependencies…",
			"将停止 Connector，删除本插件的 Python 依赖环境并重新下载安装，可能需要几分钟。登录状态、设备连接和设置会保留。": "This will stop Connector, delete this plugin’s Python dependency environment and download it again, which can take a few minutes. Your sign-in, device connection and settings will be kept.",
			"我了解需要重新下载依赖": "I understand the dependencies will be downloaded again",
			"关闭重装依赖环境确认": "Close reinstall confirmation",
			"确认重装": "Reinstall",
			"如果依赖下载反复失败，可以切换下方的 PyPI 镜像，或在“维护”中重装依赖环境。": "If dependency downloads keep failing, switch the PyPI mirror below or reinstall dependencies under Maintenance.",
			"当前环境不支持打开本机目录。": "Opening local folders is not supported in this environment.",
			"无法撤销连接": "Unable to revoke connection",
			"服务端撤销失败，本地数据尚未清理。可以取消后重试，或仅清理本地数据；原设备凭据在服务端可能仍有效。": "Server revocation failed. Local data has not been cleared. Cancel to retry, or clear local data only; the original device credentials may still be valid on the server.",
			"将撤销当前设备凭据、停止 Connector，并清除本插件的本地连接数据。本地会话和共享的设备记录会保留。": "This will revoke the device credentials, stop Connector and clear this plugin’s local connection data. Local sessions and shared device records will be kept.",
			"我了解恢复出厂设置的影响": "I understand the effects of a factory reset",
			"取消": "Cancel",
			"关闭恢复出厂设置确认": "Close factory reset confirmation",
			"仅清理本地数据": "Clear local data only",
			"确认恢复出厂设置": "Confirm factory reset",
			"读取插件状态失败。": "Unable to read plugin status.",
			"操作失败，请重试。": "Operation failed. Try again.",
			"官方源": "Official source",
			"默认 PyPI": "Default PyPI",
			"清华大学": "Tsinghua University",
			"中国科学技术大学": "University of Science and Technology of China",
			"北京外国语大学": "Beijing Foreign Studies University",
			"阿里云": "Alibaba Cloud",
			"腾讯云": "Tencent Cloud",
			"华为云": "Huawei Cloud",
			"插件连接暂不可用，请重试。": "The plugin connection is unavailable. Try again."
		};
		const zh = {
			...Object.fromEntries(Object.keys(en).map((key) => [key, key])),
			"locale.code": "zh-CN"
		};
		/** Translate known wire messages only at render time, so stored failures change
		* language too. Older Hosts send plain strings; preserve unknown diagnostics
		* and user-provided names/paths instead of guessing or translating log output. */
		function translateMessage(t, message) {
			if (!message) return "";
			if (Object.hasOwn(en, message)) return t(message);
			const retry = /^(.+)（(\d+) 秒后自动重试）$/s.exec(message);
			if (retry) return t("{detail}（{seconds} 秒后自动重试）", {
				detail: translateMessage(t, retry[1]),
				seconds: retry[2]
			});
			const http = /^服务请求失败（HTTP (\d+)），请重试。$/.exec(message);
			if (http) return t("服务请求失败（HTTP {status}），请重试。", { status: http[1] });
			const exit = /^Connector 已退出（(.+)）。请在日志页切换到 Connector 查看原因。$/.exec(message);
			if (exit) return t("Connector 已退出（{code}）。请在日志页切换到 Connector 查看原因。", { code: exit[1] === "终止" ? t("终止") : exit[1] });
			for (const [prefix, key] of [["无法撤销设备连接。", "无法撤销设备连接。{detail}"], ["无法打开 Agents Anywhere 桌面端：", "无法打开云大师桌面端：{detail}"]]) if (message.startsWith(prefix)) return t(key, { detail: translateMessage(t, message.slice(prefix.length)) });
			return message;
		}
		// src/contracts/index.ts
		const HOST_NAMESPACE = "yundashiRemoteControl";
		// src/client/api/host.ts
		function createHostApi(rpc) {
			const call = async (method, args = {}) => {
				const result = await rpc.call("/api", `${HOST_NAMESPACE}/${method}`, { args });
				if (!result.ok) throw new Error(result.error?.message ?? "插件连接暂不可用，请重试。");
				return result.value;
			};
			return {
				restartBridge: () => call("restartBridge"),
				readRuntimeLogs: (query) => call("readRuntimeLogs", query ? { query } : {}),
				readBridgeLogs: () => call("readBridgeLogs"),
				readConnectorLogs: (query) => call("readConnectorLogs", query ? { query } : {}),
				readStartupDiagnostics: () => call("readStartupDiagnostics"),
				inspect: () => call("inspect"),
				openDesktop: () => call("openDesktop"),
				begin: (input) => call("begin", input ? { input } : {}),
				cancel: () => call("cancel"),
				logout: () => call("logout"),
				recoverDevice: (action) => call("recoverDevice", { action }),
				controlConnector: (action) => call("controlConnector", { action }),
				saveConnectorSettings: (settings) => call("saveConnectorSettings", { settings }),
				openConnectorFolder: (folder) => call("openConnectorFolder", { folder }),
				resetConnector: (forceLocal) => call("resetConnector", { forceLocal }),
				resetConnectorEnvironment: () => call("resetConnectorEnvironment"),
				createMobileLogin: () => call("createMobileLogin"),
				inspectMobileLogin: (id) => call("inspectMobileLogin", { id }),
				confirmMobileLogin: (id, approved) => call("confirmMobileLogin", {
					id,
					approved
				})
			};
		}
		// node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const mergeClasses = (...classes) => classes.filter((className, index, array) => {
			return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
		}).join(" ").trim();
		// node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		// node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
		// node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toPascalCase = (string) => {
			const camelCase = toCamelCase(string);
			return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
		};
		// node_modules/lucide-react/dist/esm/defaultAttributes.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		var defaultAttributes = {
			xmlns: "http://www.w3.org/2000/svg",
			width: 24,
			height: 24,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		// node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const hasA11yProp = (props) => {
			for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
			return false;
		};
		// node_modules/lucide-react/dist/esm/context.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const LucideContext = (0, react.createContext)({});
		const useLucideContext = () => (0, react.useContext)(LucideContext);
		// node_modules/lucide-react/dist/esm/Icon.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Icon = (0, react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
			const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
			const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
			return (0, react.createElement)("svg", {
				ref,
				...defaultAttributes,
				width: size ?? contextSize ?? defaultAttributes.width,
				height: size ?? contextSize ?? defaultAttributes.height,
				stroke: color ?? contextColor,
				strokeWidth: calculatedStrokeWidth,
				className: mergeClasses("lucide", contextClass, className),
				...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
				...rest
			}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
		});
		// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const createLucideIcon = (iconName, iconNode) => {
			const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
				ref,
				iconNode,
				className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
				...props
			}));
			Component.displayName = toPascalCase(iconName);
			return Component;
		};
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronDown = createLucideIcon("chevron-down", [["path", {
			d: "m6 9 6 6 6-6",
			key: "qrunsl"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Cloud = createLucideIcon("cloud", [["path", {
			d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",
			key: "p7xjir"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const FolderOpen = createLucideIcon("folder-open", [["path", {
			d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
			key: "usdka0"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Globe = createLucideIcon("globe", [
			["circle", {
				cx: "12",
				cy: "12",
				r: "10",
				key: "1mglay"
			}],
			["path", {
				d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
				key: "13o1zl"
			}],
			["path", {
				d: "M2 12h20",
				key: "9i4pu4"
			}]
		]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PackageX = createLucideIcon("package-x", [
			["path", {
				d: "M12 22V12",
				key: "d0xqtd"
			}],
			["path", {
				d: "m16.5 14.5 5 5",
				key: "ozpm51"
			}],
			["path", {
				d: "m16.5 19.5 5-5",
				key: "syf6b9"
			}],
			["path", {
				d: "M21 10.5V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.13-.074",
				key: "isw6gs"
			}],
			["path", {
				d: "M3.29 7 12 12l8.71-5",
				key: "19ckod"
			}],
			["path", {
				d: "m7.5 4.27 8.997 5.148",
				key: "9yrvtv"
			}]
		]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Power = createLucideIcon("power", [["path", {
			d: "M12 2v10",
			key: "mnfbl"
		}], ["path", {
			d: "M18.4 6.6a9 9 0 1 1-12.77.04",
			key: "obofu9"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const RotateCw = createLucideIcon("rotate-cw", [["path", {
			d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
			key: "1p45f6"
		}], ["path", {
			d: "M21 3v5h-5",
			key: "1q7to0"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Smartphone = createLucideIcon("smartphone", [["rect", {
			width: "14",
			height: "20",
			x: "5",
			y: "2",
			rx: "2",
			ry: "2",
			key: "1yt0o3"
		}], ["path", {
			d: "M12 18h.01",
			key: "mhygvu"
		}]]);
		/**
		* @license lucide-react v1.41.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const User = createLucideIcon("user", [["path", {
			d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
			key: "975kel"
		}], ["circle", {
			cx: "12",
			cy: "7",
			r: "4",
			key: "17ys0d"
		}]]);
		// node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		// \0dsh-css:src/client/features/onboarding/section.module.css.mjs
		const tagId$6 = "@yundashi/dsh-remote-control/src/client/features/onboarding/section.module.css";
		const css$6 = ".slB6la_section{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);flex-direction:column;gap:28px;display:flex}.slB6la_form{flex-direction:column;gap:32px;min-width:0;padding-top:12px;display:flex}.slB6la_status{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-s-14);overflow-wrap:anywhere;justify-content:center;align-items:flex-start;gap:8px;margin:0;display:flex}.slB6la_status .slB6la_stateDot{flex-shrink:0;margin-top:6px}.slB6la_section .slB6la_loginButton,.slB6la_section .slB6la_secondaryButton{white-space:normal;border-radius:8px;gap:8px;width:100%;height:40px}.slB6la_section .slB6la_secondaryButton{color:var(--dsw-alias-label-secondary)}.slB6la_error{color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-s-14);overflow-wrap:anywhere;margin:0}.slB6la_link{color:var(--dsw-alias-label-primary);text-underline-offset:3px;text-decoration:underline}.slB6la_separator{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-s-14);align-items:center;gap:8px;margin:0;display:flex}.slB6la_separator:before,.slB6la_separator:after{content:\"\";background:var(--dsw-alias-border-l2);flex:1;height:1px}.slB6la_fields{flex-direction:column;gap:16px;min-width:0;display:flex}.slB6la_field{font:var(--dsw-font-s-14);font-weight:500}.slB6la_section .slB6la_input{box-sizing:border-box;border-radius:12px;gap:8px;width:100%;min-width:0;height:44px;padding:0 12px}.slB6la_input:has(input[aria-invalid=true]){border-color:var(--dsw-alias-state-error-primary)}.slB6la_hint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);text-align:center;margin:0}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$6;
				style.textContent = css$6;
				document.head.appendChild(style);
			} else if (style.textContent !== css$6) style.textContent = css$6;
		}
		var section_module_css_default = {
			"fields": "slB6la_fields",
			"status": "slB6la_status",
			"field": "slB6la_field",
			"error": "slB6la_error",
			"form": "slB6la_form",
			"input": "slB6la_input",
			"loginButton": "slB6la_loginButton",
			"hint": "slB6la_hint",
			"link": "slB6la_link",
			"section": "slB6la_section",
			"separator": "slB6la_separator",
			"secondaryButton": "slB6la_secondaryButton",
			"stateDot": "slB6la_stateDot"
		};
		// src/client/features/onboarding/section.tsx
		function OnboardingSection({ t, host, state: panel }) {
			const { snapshot, busy, run, refresh, clearError } = panel;
			const brandName = snapshot?.brand?.shortName || snapshot?.brand?.productName || "云大师";
			const error = panel.error ?? panel.readError;
			const [link, setLink] = (0, react.useState)(null);
			const [serverUrl, setServerUrl] = (0, react.useState)("");
			const [showServer, setShowServer] = (0, react.useState)(false);
			const [loginTarget, setLoginTarget] = (0, react.useState)("cloud");
			(0, react.useId)();
			const errorId = (0, react.useId)();
			const begin = (target) => {
				run(async () => {
					setLoginTarget(target);
					setLink(null);
					const result = await host.begin(target === "cloud" ? { target } : {
						target,
						serverUrl
					});
					setLink(result.url);
					window.open(result.url, "_blank", "noopener,noreferrer");
				});
			};
			const detected = snapshot?.desktop.status;
			const unavailable = busy || detected !== "absent";
			const primaryBusy = busy && loginTarget !== "server";
			const connecting = snapshot?.stage === "authorizing" || snapshot?.stage === "starting" || snapshot?.stage === "pairing";
			const failed = Boolean(error || snapshot?.stage === "error" || detected === "error");
			const state = failed ? "error" : !snapshot || busy || connecting ? "ongoing" : snapshot.stage === "ready" ? "done" : "warning";
			const statusMessage = error ?? (detected === "installed" ? t("云大师桌面端正在运行，请在桌面端继续连接。") : detected === "error" ? snapshot?.desktop.message : snapshot?.account && snapshot.stage === "ready" ? t("已登录为 {name}", { name: snapshot.account.displayName }) : snapshot?.stage === "authorizing" ? t("已打开登录页面，完成登录后将自动返回。") : connecting || snapshot?.stage === "error" ? snapshot?.message : null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: section_module_css_default.section,
				"aria-busy": busy,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						className: section_module_css_default.loginButton,
						icon: primaryBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Cloud, { size: 16 }),
						disabled: unavailable,
						onClick: () => begin("cloud"),
						children: primaryBusy ? t("正在连接…") : t("登录{brand}远程控制", { brand: brandName })
					}),
					null,
					statusMessage ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						id: errorId,
						className: clsx(section_module_css_default.status, failed && section_module_css_default.error),
						role: failed ? "alert" : "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state,
							className: section_module_css_default.stateDot
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: translateMessage(t, statusMessage) })]
					}) : null,
					link ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: section_module_css_default.hint,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: section_module_css_default.link,
							href: link,
							target: "_blank",
							rel: "noreferrer",
							children: t("浏览器没有打开？点击继续")
						})
					}) : null,
					connecting ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						className: section_module_css_default.secondaryButton,
						disabled: busy,
						onClick: () => void run(async () => {
							await host.cancel();
							setLink(null);
						}),
						children: t("取消本次连接")
					}) : null,
					failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						className: section_module_css_default.secondaryButton,
						disabled: busy,
						onClick: () => void run(refresh),
						children: t("重新检查")
					}) : null
				]
			});
		}
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
		// \0dsh-css:src/client/features/onboarding/account-panel.module.css.mjs
		const tagId$5 = "@yundashi/dsh-remote-control/src/client/features/onboarding/account-panel.module.css";
		const css$5 = ".w3_oja_panel{min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);flex-direction:column;gap:24px;display:flex}.w3_oja_profile{border:1px solid var(--dsw-alias-border-l2);border-radius:16px;align-items:center;gap:16px;padding:16px;display:flex}.w3_oja_avatar{background:var(--dsw-alias-bg-layer-1);width:52px;height:52px;color:var(--dsw-alias-label-secondary);border-radius:50%;flex:0 0 52px;place-items:center;display:grid;overflow:hidden}.w3_oja_avatar img{object-fit:cover;width:100%;height:100%;display:block}.w3_oja_identity{min-width:0}.w3_oja_name{font:var(--dsw-font-l-20);overflow-wrap:anywhere;margin:0;font-weight:600}.w3_oja_secondary,.w3_oja_server{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere;margin:4px 0 0}.w3_oja_server{color:var(--dsw-alias-label-tertiary)}.w3_oja_connector{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 16px;display:flex}.w3_oja_indicator{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;display:inline-flex}.w3_oja_detail{width:100%;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere;margin:0}.w3_oja_actions{flex-direction:column;gap:8px;display:flex}.w3_oja_panel .w3_oja_recover{margin-left:auto}.w3_oja_panel .w3_oja_button{border-radius:8px;gap:8px;width:100%;height:40px}.w3_oja_error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$5;
				style.textContent = css$5;
				document.head.appendChild(style);
			} else if (style.textContent !== css$5) style.textContent = css$5;
		}
		var account_panel_module_css_default = {
			"profile": "w3_oja_profile",
			"identity": "w3_oja_identity",
			"server": "w3_oja_server",
			"detail": "w3_oja_detail",
			"actions": "w3_oja_actions",
			"recover": "w3_oja_recover",
			"name": "w3_oja_name",
			"panel": "w3_oja_panel",
			"connector": "w3_oja_connector",
			"button": "w3_oja_button",
			"error": "w3_oja_error",
			"secondary": "w3_oja_secondary",
			"avatar": "w3_oja_avatar",
			"indicator": "w3_oja_indicator"
		};
		// \0dsh-css:src/client/features/onboarding/mobile-connection.module.css.mjs
		const tagId$4 = "@yundashi/dsh-remote-control/src/client/features/onboarding/mobile-connection.module.css";
		const css$4 = ".KV--Pq_connection{flex-direction:column;gap:16px;min-width:0;display:flex}.KV--Pq_connection .KV--Pq_button{border-radius:8px;gap:8px;width:100%;height:40px}.KV--Pq_content{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;align-items:center;gap:12px;padding:16px 0;display:flex}.KV--Pq_qr{border-radius:12px;width:min(256px,100%);height:auto;display:block}.KV--Pq_status{text-align:center;overflow-wrap:anywhere;justify-content:center;align-items:center;gap:8px;margin:0;display:flex}.KV--Pq_hint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);margin:0}.KV--Pq_actions{flex-wrap:wrap;justify-content:center;gap:8px;display:flex}.KV--Pq_error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$4;
				style.textContent = css$4;
				document.head.appendChild(style);
			} else if (style.textContent !== css$4) style.textContent = css$4;
		}
		var mobile_connection_module_css_default = {
			"connection": "KV--Pq_connection",
			"button": "KV--Pq_button",
			"status": "KV--Pq_status",
			"content": "KV--Pq_content",
			"actions": "KV--Pq_actions",
			"qr": "KV--Pq_qr",
			"hint": "KV--Pq_hint",
			"error": "KV--Pq_error"
		};
		// src/client/features/onboarding/mobile-connection.tsx
		function MobileConnection({ t, host, disabled }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [qr, setQr] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const revision = (0, react.useRef)(0);
			const working = (0, react.useRef)(false);
			const alive = (0, react.useRef)(true);
			const id = (0, react.useId)();
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
					revision.current++;
				};
			}, []);
			const run = async (action) => {
				if (working.current || disabled) return;
				working.current = true;
				const version = ++revision.current;
				setBusy(true);
				setError(null);
				try {
					const next = await action();
					if (alive.current && revision.current === version) setQr(next);
				} catch (error) {
					if (alive.current && revision.current === version) setError(error instanceof Error ? error.message : "手机连接失败，请重试。");
				} finally {
					working.current = false;
					if (alive.current) setBusy(false);
				}
			};
			const generate = () => {
				setQr(null);
				run(() => host.createMobileLogin());
			};
			const status = qr?.status;
			(0, react.useEffect)(() => {
				if (!expanded || busy || disabled || !qr || ![
					"pending_scan",
					"pending_web_confirm",
					"approved"
				].includes(qr.status)) return;
				let stopped = false;
				let timer;
				const version = revision.current;
				const poll = async () => {
					try {
						const next = await host.inspectMobileLogin(qr.id);
						if (!stopped && version === revision.current) {
							setQr(next);
							setError(null);
						}
					} catch (error) {
						if (!stopped && version === revision.current) setError(error instanceof Error ? error.message : "暂时无法读取手机连接状态。");
					}
					if (!stopped && version === revision.current) timer = setTimeout(() => void poll(), 1600);
				};
				const expiry = setTimeout(() => {
					stopped = true;
					clearTimeout(timer);
					setQr((current) => current?.id === qr.id ? {
						...current,
						status: "expired",
						qrImage: null
					} : current);
				}, Math.max(0, Date.parse(qr.expiresAt) - Date.now()));
				poll();
				return () => {
					stopped = true;
					clearTimeout(timer);
					clearTimeout(expiry);
				};
			}, [
				host,
				expanded,
				busy,
				disabled,
				qr?.id,
				status
			]);
			const message = status === "pending_web_confirm" ? t("{name}请求连接此账号", { name: qr?.deviceName || t("一台手机") }) : status === "approved" ? t("已确认，正在完成手机登录…") : status === "consumed" ? t("手机已连接") : status === "rejected" ? t("已拒绝此次连接") : status === "expired" ? t("二维码已过期") : t("使用手机端扫描二维码");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mobile_connection_module_css_default.connection,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					className: mobile_connection_module_css_default.button,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Smartphone, { size: 16 }),
					disabled: disabled || busy,
					"aria-expanded": expanded,
					"aria-controls": id,
					onClick: () => {
						if (expanded) {
							setExpanded(false);
							revision.current++;
						} else {
							setExpanded(true);
							generate();
						}
					},
					children: expanded ? t("收起二维码") : t("手机连接")
				}), expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id,
					className: mobile_connection_module_css_default.content,
					"aria-busy": busy,
					children: [
						busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: mobile_connection_module_css_default.status,
							role: "status",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }), t("正在处理…")]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							qr?.qrImage && status === "pending_scan" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: mobile_connection_module_css_default.qr,
								src: qr.qrImage,
								width: 256,
								height: 256,
								alt: t("手机连接二维码")
							}) : null,
							qr ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: mobile_connection_module_css_default.status,
								role: "status",
								"aria-live": "polite",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status === "consumed" ? "done" : status === "pending_scan" || status === "approved" ? "ongoing" : "warning" }), message]
							}) : null,
							status === "pending_scan" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: mobile_connection_module_css_default.hint,
								children: t("有效至 {time}", { time: new Date(qr.expiresAt).toLocaleTimeString(t("locale.code"), {
									hour: "2-digit",
									minute: "2-digit"
								}) })
							}) : null,
							status === "pending_web_confirm" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: mobile_connection_module_css_default.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									disabled,
									onClick: () => void run(() => host.confirmMobileLogin(qr.id, false)),
									children: t("拒绝连接")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									disabled,
									onClick: () => void run(() => host.confirmMobileLogin(qr.id, true)),
									children: t("确认连接")
								})]
							}) : null
						] }),
						error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: mobile_connection_module_css_default.error,
							role: "alert",
							children: translateMessage(t, error)
						}) : null,
						!busy && (!qr || status === "expired" || status === "rejected" || status === "consumed" || error) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							disabled,
							onClick: generate,
							children: status === "consumed" ? t("连接另一台手机") : t("重新生成二维码")
						}) : null
					]
				}) : null]
			});
		}
		// src/client/features/onboarding/account-panel.tsx
		function connectorStatus(snapshot, readError, t) {
			if (readError) return {
				label: t("状态暂不可用"),
				state: "warning",
				detail: readError
			};
			if (snapshot.stage === "pairing" || snapshot.stage === "starting" || snapshot.stage === "authorizing") return {
				label: t("正在启动"),
				state: "ongoing",
				detail: snapshot.message
			};
			if (snapshot.deviceRecovery) {
				const recovery = snapshot.deviceRecovery;
				return {
					label: recovery.status === "checking" ? t("正在检查") : recovery.status === "deleted" ? t("设备已删除") : t("已断开"),
					state: recovery.status === "checking" ? "ongoing" : "warning",
					detail: recovery.message
				};
			}
			if (snapshot.stage === "error") return {
				label: t("运行异常"),
				state: "error",
				detail: snapshot.message
			};
			if (snapshot.connector?.lastError) return {
				label: t("运行异常"),
				state: "error",
				detail: snapshot.connector.lastError
			};
			const expired = snapshot.accountExpired ? { detail: snapshot.connectorRunning ? "账号登录已过期，同步不受影响；手机连接等账号功能需要重新登录。" : "账号登录已过期，请重新登录。" } : {};
			return snapshot.connectorRunning ? {
				label: t("运行中"),
				state: "done",
				...expired
			} : {
				label: t("未运行"),
				state: "warning",
				...expired
			};
		}
		function AccountPanel({ t, host, state, snapshot, account }) {
			const [failedAvatar, setFailedAvatar] = (0, react.useState)(null);
			const [loggingOut, setLoggingOut] = (0, react.useState)(false);
			const [confirmLogout, setConfirmLogout] = (0, react.useState)(false);
			const [loginUrl, setLoginUrl] = (0, react.useState)(null);
			const [onboardingUrl, setOnboardingUrl] = (0, react.useState)(null);
			const status = connectorStatus(snapshot, state.readError, t);
			const recovery = snapshot.deviceRecovery;
			const relogin = recovery?.status === "login_required" || !recovery && Boolean(snapshot.accountExpired);
			const recoveryLabel = relogin ? t("重新登录") : recovery?.status === "deleted" ? t("重新配置") : recovery?.status === "disconnected" ? t("重新连接") : t("重新检查");
			const avatar = account.avatar && account.avatar !== failedAvatar ? account.avatar : null;
			const webAppUrl = snapshot.webAppUrl || resolveWebAppUrl(snapshot.settings.apiBaseUrl);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: account_panel_module_css_default.panel,
				"aria-busy": state.busy,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: account_panel_module_css_default.profile,
						"aria-label": t("账号信息"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: account_panel_module_css_default.avatar,
							children: avatar ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: avatar,
								alt: t("{name}的头像", { name: account.displayName }),
								onError: () => setFailedAvatar(avatar)
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(User, {
								size: 28,
								strokeWidth: 1.5
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: account_panel_module_css_default.identity,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: account_panel_module_css_default.name,
									children: account.displayName
								}),
								account.email ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: account_panel_module_css_default.secondary,
									children: account.email
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: account_panel_module_css_default.server,
									children: snapshot.settings.apiBaseUrl
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: account_panel_module_css_default.connector,
						role: "status",
						"aria-live": "polite",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Connector" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: account_panel_module_css_default.indicator,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.state }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: status.label })]
							}),
							status.detail ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: account_panel_module_css_default.detail,
								children: translateMessage(t, status.detail)
							}) : null,
							relogin || recovery && recovery.status !== "checking" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: account_panel_module_css_default.recover,
								disabled: state.busy || Boolean(state.readError),
								onClick: () => void state.run(async () => {
									setOnboardingUrl(null);
									if (relogin) {
										const result = await host.begin();
										setLoginUrl(result.url);
										window.open(result.url, "_blank", "noopener,noreferrer");
									} else if (recovery) {
										const result = await host.recoverDevice(recovery.status === "deleted" ? "recreate" : recovery.status === "disconnected" ? "reconnect" : "check");
										if (result?.url) {
											setOnboardingUrl(result.url);
											window.open(result.url, "_blank", "noopener,noreferrer");
										}
									}
								}),
								children: state.busy && !loggingOut ? t("正在处理…") : recoveryLabel
							}) : null,
							loginUrl && snapshot.stage === "authorizing" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: account_panel_module_css_default.detail,
								href: loginUrl,
								target: "_blank",
								rel: "noreferrer",
								children: t("浏览器没有打开？点击继续登录")
							}) : null,
							onboardingUrl && snapshot.stage === "ready" && !recovery ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: account_panel_module_css_default.detail,
								href: onboardingUrl,
								target: "_blank",
								rel: "noreferrer",
								children: t("浏览器没有打开？点击继续配置")
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: account_panel_module_css_default.actions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								className: account_panel_module_css_default.button,
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Globe, {
									size: 16,
									strokeWidth: 1.5
								}),
								disabled: state.busy,
								onClick: () => window.open(webAppUrl, "_blank", "noopener,noreferrer"),
								children: t("打开 Web")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MobileConnection, {
								t,
								host,
								disabled: state.busy || Boolean(state.readError) || Boolean(snapshot.accountExpired)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								className: account_panel_module_css_default.button,
								disabled: state.busy,
								"aria-haspopup": "dialog",
								onClick: () => {
									state.clearError();
									setConfirmLogout(true);
								},
								children: loggingOut ? t("正在退出…") : t("退出登录")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: confirmLogout,
						title: t("退出登录"),
						closeLabel: t("关闭退出登录确认"),
						description: t("退出登录后，本机连接将停止。确定要退出登录吗？"),
						onClose: () => {
							if (!state.busy) setConfirmLogout(false);
						},
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							"data-modal-autofocus": true,
							disabled: state.busy,
							onClick: () => setConfirmLogout(false),
							children: t("取消")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: state.busy,
							onClick: () => void state.run(async () => {
								setLoggingOut(true);
								try {
									await host.logout();
									setConfirmLogout(false);
								} finally {
									setLoggingOut(false);
								}
							}),
							children: loggingOut ? t("正在退出…") : t("确认退出")
						})] }),
						children: state.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: account_panel_module_css_default.error,
							role: "alert",
							children: translateMessage(t, state.error)
						}) : null
					}),
					state.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: account_panel_module_css_default.error,
						role: "alert",
						children: translateMessage(t, state.error)
					}) : null
				]
			});
		}
		// src/client/features/onboarding/state.ts
		/** Shared by the official modal heading, login form, and signed-in panel. */
		function useOnboardingState(host, active) {
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [readError, setReadError] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const running = (0, react.useRef)(false);
			const activeRuns = (0, react.useRef)(0);
			const request = (0, react.useRef)(0);
			const prepareOpen = (0, react.useCallback)(() => {
				request.current++;
				setSnapshot(null);
				setReadError(null);
				setError(null);
			}, []);
			const refresh = (0, react.useCallback)(async () => {
				const id = ++request.current;
				const next = await host.inspect();
				if (id === request.current) {
					setSnapshot(next);
					setReadError(null);
				}
			}, [host]);
			(0, react.useEffect)(() => {
				if (!active) return;
				let stopped = false;
				let timer;
				const poll = async () => {
					try {
						await refresh();
					} catch (error) {
						if (!stopped) setReadError(error instanceof Error ? error.message : "读取插件状态失败。");
					}
					if (!stopped) timer = setTimeout(() => void poll(), 1500);
				};
				poll();
				return () => {
					stopped = true;
					request.current++;
					clearTimeout(timer);
				};
			}, [active, refresh]);
			const run = async (action, options) => {
				if (running.current && !options?.interrupt) return false;
				running.current = true;
				activeRuns.current++;
				setBusy(true);
				setError(null);
				try {
					await action();
					await refresh();
					return true;
				} catch (error) {
					setError(error instanceof Error ? error.message : "操作失败，请重试。");
					return false;
				} finally {
					activeRuns.current = Math.max(0, activeRuns.current - 1);
					const stillRunning = activeRuns.current > 0;
					running.current = stillRunning;
					setBusy(stillRunning);
				}
			};
			const runBackground = async (action) => {
				setError(null);
				try {
					await action();
					return true;
				} catch (error) {
					setError(error instanceof Error ? error.message : "操作失败，请重试。");
					return false;
				}
			};
			return {
				snapshot,
				error,
				readError,
				busy,
				run,
				runBackground,
				refresh,
				prepareOpen,
				clearError: () => setError(null)
			};
		}
		// \0dsh-css:src/client/features/onboarding/entry.module.css.mjs
		const tagId$3 = "@yundashi/dsh-remote-control/src/client/features/onboarding/entry.module.css";
		const css$3 = "@font-face{font-family:AA Caveat;src:url(\"data:font/woff2;base64,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\")format(\"woff2\");font-style:normal;font-weight:400 700;font-display:swap}._0mJWUG_trigger{width:calc(100% + 4px);min-width:0;margin:4px -2px;display:flex}._0mJWUG_trigger ._0mJWUG_button{width:100%;height:42px;font:var(--dsw-font-s-14);border-radius:12px;justify-content:flex-start;gap:8px;padding:0 10px 0 8px}._0mJWUG_rail{width:36px;margin:8px 0 10px}._0mJWUG_rail ._0mJWUG_button{border-radius:50%;justify-content:center;height:36px;padding:0}._0mJWUG_label{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}._0mJWUG_dialog._0mJWUG_wordmarkDialog{width:min(560px,100%)}._0mJWUG_dialog._0mJWUG_accountDialog{width:min(480px,100%)}._0mJWUG_dialog._0mJWUG_logsDialog{width:min(820px,100%)}._0mJWUG_dialog._0mJWUG_wordmarkDialog,._0mJWUG_dialog._0mJWUG_accountDialog{max-height:calc(100dvh - 48px)}._0mJWUG_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;margin-bottom:24px;padding-bottom:16px;display:flex}._0mJWUG_tabs>button{white-space:nowrap;border-radius:8px;flex:1}._0mJWUG_loginDescription{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-s-14);margin:0 0 24px}._0mJWUG_placeholder{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-s-14);margin:0;padding:20px 0}._0mJWUG_dialog ._0mJWUG_dialogContent{box-sizing:border-box;overscroll-behavior:contain;min-height:0;padding:16px 16px 12px;overflow-y:auto}._0mJWUG_dialog h2{min-width:0;font:var(--dsw-font-xl-24);letter-spacing:-.025em;overflow-wrap:anywhere;font-weight:600}._0mJWUG_wordmarkDialog h2{letter-spacing:0;white-space:nowrap;font-family:AA Caveat,Snell Roundhand,cursive;font-size:20px;font-weight:500;line-height:1}._0mJWUG_dialogContent>p{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-s-14)}._0mJWUG_trigger :focus-visible,._0mJWUG_dialog button:focus-visible,._0mJWUG_dialog a:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}@media (width<=480px){._0mJWUG_dialog ._0mJWUG_dialogContent{padding:8px 0}._0mJWUG_dialog:not(._0mJWUG_wordmarkDialog) h2{font:var(--dsw-font-l-20);font-weight:600}}._0mJWUG_homeLinks{border-top:1px solid var(--dsw-alias-border-l2);flex-wrap:wrap;gap:8px;margin-top:24px;padding-top:16px;display:flex}._0mJWUG_homeLinks>button{font:var(--dsw-font-s-14);flex:auto}._0mJWUG_homeLinks>button:first-child{flex-basis:100%}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$3;
				style.textContent = css$3;
				document.head.appendChild(style);
			} else if (style.textContent !== css$3) style.textContent = css$3;
		}
		var entry_module_css_default = {
			"loginDescription": "_0mJWUG_loginDescription",
			"accountDialog": "_0mJWUG_accountDialog",
			"logsDialog": "_0mJWUG_logsDialog",
			"label": "_0mJWUG_label",
			"homeLinks": "_0mJWUG_homeLinks",
			"tabs": "_0mJWUG_tabs",
			"dialogContent": "_0mJWUG_dialogContent",
			"trigger": "_0mJWUG_trigger",
			"wordmarkDialog": "_0mJWUG_wordmarkDialog",
			"dialog": "_0mJWUG_dialog",
			"rail": "_0mJWUG_rail",
			"placeholder": "_0mJWUG_placeholder",
			"button": "_0mJWUG_button"
		};
		// src/contracts/connector.ts
		const PYTHON_MIRRORS = [{
			id: "default",
			label: "官方源",
			url: ""
		}, {
			id: "npmmirror",
			label: "npmmirror",
			url: "https://registry.npmmirror.com/-/binary/python-build-standalone"
		}];
		const SYNC_INTERVALS = [
			15,
			30,
			60,
			300
		];
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
		// \0dsh-css:src/client/features/onboarding/settings-panel.module.css.mjs
		const tagId$2 = "@yundashi/dsh-remote-control/src/client/features/onboarding/settings-panel.module.css";
		const css$2 = ".S2Uphq_panel{min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);flex-direction:column;gap:24px;display:flex}.S2Uphq_section{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:14px;min-width:0;padding-bottom:24px;display:flex}.S2Uphq_section:last-child{border-bottom:0;padding-bottom:0}.S2Uphq_section h3{font:var(--dsw-font-s-14);margin:0;font-weight:600}.S2Uphq_row{justify-content:space-between;align-items:center;gap:12px;min-width:0;display:flex}.S2Uphq_row>div:first-child{min-width:0}.S2Uphq_row>button{flex-shrink:0}.S2Uphq_status{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;display:inline-flex}.S2Uphq_details{font:var(--dsw-font-xs-13);grid-template-columns:106px minmax(0,1fr);gap:10px 16px;margin:0;display:grid}.S2Uphq_details dt{color:var(--dsw-alias-label-secondary)}.S2Uphq_details dd{overflow-wrap:anywhere;margin:0}.S2Uphq_form{flex-direction:column;gap:24px;display:flex}.S2Uphq_hint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere;margin:4px 0 0}.S2Uphq_panel .S2Uphq_input{box-sizing:border-box;width:100%}.S2Uphq_field{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}.S2Uphq_actions{flex-wrap:wrap;gap:8px;display:flex}.S2Uphq_save{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:12px;display:flex}.S2Uphq_path{overflow-wrap:anywhere;user-select:text}.S2Uphq_panel .S2Uphq_danger,.S2Uphq_error{color:var(--dsw-alias-state-error-primary)}.S2Uphq_error{overflow-wrap:anywhere;margin:0}@media (width<=480px){.S2Uphq_row{flex-wrap:wrap}.S2Uphq_details{grid-template-columns:90px minmax(0,1fr);gap:10px}}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$2;
				style.textContent = css$2;
				document.head.appendChild(style);
			} else if (style.textContent !== css$2) style.textContent = css$2;
		}
		var settings_panel_module_css_default = {
			"save": "S2Uphq_save",
			"error": "S2Uphq_error",
			"status": "S2Uphq_status",
			"form": "S2Uphq_form",
			"danger": "S2Uphq_danger",
			"path": "S2Uphq_path",
			"panel": "S2Uphq_panel",
			"section": "S2Uphq_section",
			"field": "S2Uphq_field",
			"actions": "S2Uphq_actions",
			"row": "S2Uphq_row",
			"hint": "S2Uphq_hint",
			"details": "S2Uphq_details",
			"input": "S2Uphq_input"
		};
		// src/client/features/onboarding/settings-panel.tsx
		function Choice({ label, value, options, disabled, onChange }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: open && !disabled,
				items: options,
				selectedId: value,
				align: "end",
				onClose: () => setOpen(false),
				onSelect: (id) => {
					onChange(id);
					setOpen(false);
				},
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					"aria-label": label,
					"aria-haspopup": "menu",
					"aria-expanded": open && !disabled,
					disabled,
					onClick: () => setOpen((value) => !value),
					children: [options.find((option) => option.id === value)?.label ?? value, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, { size: 14 })]
				})
			});
		}
		function SettingsPanel({ t, host, state, snapshot, onConnection }) {
			const management = snapshot.connector;
			const [draft, setDraft] = (0, react.useState)(management?.settings);
			const [saved, setSaved] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			const [customProxy, setCustomProxy] = (0, react.useState)(false);
			const [stopping, setStopping] = (0, react.useState)(false);
			const [openingFolder, setOpeningFolder] = (0, react.useState)(null);
			const [reset, setReset] = (0, react.useState)(null);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const [reinstall, setReinstall] = (0, react.useState)(false);
			const [reinstallAcknowledged, setReinstallAcknowledged] = (0, react.useState)(false);
			const [reinstalling, setReinstalling] = (0, react.useState)(false);
			const id = (0, react.useId)();
			const signature = JSON.stringify(management?.settings);
			(0, react.useEffect)(() => {
				setDraft(management?.settings);
			}, [signature]);
			if (!management || !draft) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: settings_panel_module_css_default.hint,
				role: "status",
				children: t("请重启桌面端，以加载连接器管理接口。")
			});
			const connecting = [
				"authorizing",
				"pairing",
				"starting"
			].includes(snapshot.stage);
			const busy = state.busy || connecting || Boolean(state.readError);
			const status = connectorStatus(snapshot, state.readError, t);
			const dirty = JSON.stringify(draft) !== signature;
			const mirror = PYPI_MIRRORS.find((mirror) => mirror.url === draft.uvPypiIndexUrl)?.id ?? "default";
			const proxyChoice = draft.connectorProxy === "direct" ? "direct" : draft.connectorProxy || customProxy ? "custom" : "system";
			const update = (key, value) => {
				setDraft({
					...draft,
					[key]: value
				});
				setSaved(false);
				state.clearError();
			};
			const openFolder = (folder) => {
				setOpeningFolder(folder);
				state.runBackground(() => host.openConnectorFolder(folder)).finally(() => setOpeningFolder(null));
			};
			const confirmReset = async () => {
				const force = reset === "force";
				let revokeFailed = false;
				if (await state.run(async () => {
					try {
						await host.resetConnector(force);
					} catch (error) {
						revokeFailed = error instanceof Error && error.message.startsWith("无法撤销设备连接");
						throw error;
					}
				})) {
					setReset(null);
					onConnection();
				} else if (!force && revokeFailed) {
					setReset("force");
					setAcknowledged(false);
				}
			};
			const confirmReinstall = () => {
				setReinstall(false);
				setReinstalling(true);
				state.run(() => host.resetConnectorEnvironment(), { interrupt: true }).finally(() => setReinstalling(false));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: settings_panel_module_css_default.panel,
				"aria-busy": state.busy,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_panel_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_panel_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: management.deviceName || t("此设备") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: settings_panel_module_css_default.status,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.state }), status.label]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
								className: settings_panel_module_css_default.details,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Connector ID" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: snapshot.connectorId ?? t("尚未连接") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("服务器") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: snapshot.settings.apiBaseUrl })
								]
							}),
							status.detail ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: settings_panel_module_css_default.hint,
								role: "status",
								children: translateMessage(t, status.detail)
							}) : null,
							snapshot.stage === "error" && !snapshot.deviceRecovery ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: settings_panel_module_css_default.hint,
								children: t("如果依赖下载反复失败，可以切换下方的 PyPI 镜像，或在“维护”中重装依赖环境。")
							}) : null,
							!snapshot.account || snapshot.deviceRecovery ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: onConnection,
								children: snapshot.account ? t("前往恢复连接") : t("前往登录")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_panel_module_css_default.actions,
								children: snapshot.connectorRunning ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Power, { size: 14 }),
									disabled: stopping || Boolean(state.readError),
									onClick: () => {
										setStopping(true);
										state.run(() => host.controlConnector("stop"), { interrupt: true }).finally(() => setStopping(false));
									},
									children: t("停止 Connector")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RotateCw, { size: 14 }),
									disabled: busy,
									onClick: () => void state.run(() => host.controlConnector("restart")),
									children: t("重启 Connector")
								})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Power, { size: 14 }),
									disabled: busy,
									onClick: () => void state.run(() => host.controlConnector("start")),
									children: t("启动 Connector")
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: settings_panel_module_css_default.form,
						onSubmit: (event) => {
							event.preventDefault();
							if (!busy && dirty) {
								setSaving(true);
								state.run(() => host.saveConnectorSettings(draft)).then((success) => {
									if (success) setSaved(true);
								}).finally(() => setSaving(false));
							}
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_panel_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("运行环境") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: settings_panel_module_css_default.field,
										htmlFor: `${id}-uv`,
										children: t("uv 路径")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: `${id}-uv`,
										className: settings_panel_module_css_default.input,
										disabled: busy,
										value: draft.uvPath,
										spellCheck: false,
										placeholder: t("留空使用内置 uv"),
										autoComplete: "off",
										onChange: (event) => update("uvPath", event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: settings_panel_module_css_default.hint,
										children: [t("当前路径："), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: settings_panel_module_css_default.path,
											children: management.resolvedUvPath || t("未找到 uv")
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_panel_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("Python 下载镜像") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Choice, {
											label: t("Python 下载镜像"),
											value: PYTHON_MIRRORS.find((item) => item.url === draft.uvPythonInstallMirror)?.id ?? "default",
											disabled: busy,
											options: PYTHON_MIRRORS.map(({ id, label }) => ({
												id,
												label: translateMessage(t, label)
											})),
											onChange: (id) => update("uvPythonInstallMirror", PYTHON_MIRRORS.find((item) => item.id === id).url)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_panel_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("PyPI 镜像") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Choice, {
											label: t("PyPI 镜像"),
											value: mirror,
											disabled: busy,
											options: PYPI_MIRRORS.map(({ id, label }) => ({
												id,
												label: translateMessage(t, label)
											})),
											onChange: (id) => update("uvPypiIndexUrl", PYPI_MIRRORS.find((mirror) => mirror.id === id).url)
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_panel_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("网络") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_panel_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("Connector 网络") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: settings_panel_module_css_default.hint,
											children: t("上传很慢或一直同步失败时，可以换成直连")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Choice, {
											label: t("Connector 网络"),
											disabled: busy,
											value: proxyChoice,
											options: [
												{
													id: "system",
													label: t("跟随系统")
												},
												{
													id: "direct",
													label: t("直连")
												},
												{
													id: "custom",
													label: t("自定义代理")
												}
											],
											onChange: (id) => {
												setCustomProxy(id === "custom");
												if (id !== "custom") update("connectorProxy", id === "direct" ? "direct" : "");
												else if (draft.connectorProxy === "direct") update("connectorProxy", "");
											}
										})]
									}),
									proxyChoice === "custom" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: settings_panel_module_css_default.field,
										htmlFor: `${id}-proxy`,
										children: t("代理地址")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: `${id}-proxy`,
										className: settings_panel_module_css_default.input,
										disabled: busy,
										value: draft.connectorProxy,
										spellCheck: false,
										placeholder: "http://127.0.0.1:7890",
										autoComplete: "off",
										onChange: (event) => update("connectorProxy", event.target.value)
									})] }) : null
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_panel_module_css_default.section,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("同步设置") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_panel_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("同步间隔") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: settings_panel_module_css_default.hint,
											children: t("用于定时扫描的 Agent；本地会话消息实时同步")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Choice, {
											label: t("同步间隔"),
											disabled: busy,
											value: String(draft.syncIntervalSeconds),
											options: [.../* @__PURE__ */ new Set([...SYNC_INTERVALS, draft.syncIntervalSeconds])].sort((a, b) => a - b).map((value) => ({
												id: String(value),
												label: t("{count} 秒", { count: value })
											})),
											onChange: (value) => update("syncIntervalSeconds", Number(value))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_panel_module_css_default.save,
										children: [saved && !dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: settings_panel_module_css_default.hint,
											role: "status",
											children: t("设置已保存")
										}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											type: "submit",
											variant: "primary",
											disabled: busy || !dirty,
											children: saving ? t("正在保存…") : snapshot.connectorRunning ? t("保存并重启") : t("保存设置")
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_panel_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("维护") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_panel_module_css_default.actions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderOpen, { size: 14 }),
										disabled: openingFolder !== null || !management.canOpenFolders,
										onClick: () => openFolder("data"),
										children: t("打开数据目录")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderOpen, { size: 14 }),
										disabled: openingFolder !== null || !management.canOpenFolders,
										onClick: () => openFolder("logs"),
										children: t("打开日志目录")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PackageX, { size: 14 }),
										disabled: reinstalling || Boolean(state.readError),
										onClick: () => {
											setReinstall(true);
											setReinstallAcknowledged(false);
											state.clearError();
										},
										children: reinstalling ? t("正在重装依赖环境…") : t("重装依赖环境")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										className: settings_panel_module_css_default.danger,
										disabled: busy,
										onClick: () => {
											setReset("normal");
											setAcknowledged(false);
											state.clearError();
										},
										children: t("恢复出厂设置")
									})
								]
							}),
							!management.canOpenFolders ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: settings_panel_module_css_default.hint,
								children: t("当前环境不支持打开本机目录。")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
								open: reinstall,
								title: t("重装依赖环境"),
								description: t("将停止 Connector，删除本插件的 Python 依赖环境并重新下载安装，可能需要几分钟。登录状态、设备连接和设置会保留。"),
								acknowledgeLabel: t("我了解需要重新下载依赖"),
								acknowledged: reinstallAcknowledged,
								onAcknowledgedChange: setReinstallAcknowledged,
								cancelLabel: t("取消"),
								closeLabel: t("关闭重装依赖环境确认"),
								confirmLabel: t("确认重装"),
								disabled: reinstalling,
								onCancel: () => setReinstall(false),
								onConfirm: confirmReinstall
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
								open: reset !== null,
								title: reset === "force" ? t("无法撤销连接") : t("恢复出厂设置"),
								description: reset === "force" ? t("服务端撤销失败，本地数据尚未清理。可以取消后重试，或仅清理本地数据；原设备凭据在服务端可能仍有效。") : t("将撤销当前设备凭据、停止 Connector，并清除本插件的本地连接数据。本地会话和共享的设备记录会保留。"),
								acknowledgeLabel: t("我了解恢复出厂设置的影响"),
								acknowledged,
								onAcknowledgedChange: setAcknowledged,
								cancelLabel: t("取消"),
								closeLabel: t("关闭恢复出厂设置确认"),
								confirmLabel: reset === "force" ? t("仅清理本地数据") : t("确认恢复出厂设置"),
								disabled: state.busy,
								onCancel: () => {
									if (!state.busy) {
										setReset(null);
										state.clearError();
									}
								},
								onConfirm: () => void confirmReset()
							})
						]
					}),
					state.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_panel_module_css_default.error,
						role: "alert",
						children: translateMessage(t, state.error)
					}) : null
				]
			});
		}
		// \0dsh-css:src/client/features/onboarding/bridge-status.module.css.mjs
		const tagId$1 = "@yundashi/dsh-remote-control/src/client/features/onboarding/bridge-status.module.css";
		const css$1 = ".Dnelga_notice{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);border-radius:10px;margin:12px 0 16px;padding:12px 14px}.Dnelga_notice[data-failed=true]{border-color:var(--dsw-alias-state-error-primary)}.Dnelga_notice strong{font-weight:600}.Dnelga_notice p{color:var(--dsw-alias-label-secondary);margin:6px 0 0;line-height:1.6}.Dnelga_actions{flex-wrap:wrap;gap:8px;margin-top:10px;display:flex}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId$1;
				style.textContent = css$1;
				document.head.appendChild(style);
			} else if (style.textContent !== css$1) style.textContent = css$1;
		}
		var bridge_status_module_css_default = {
			"notice": "Dnelga_notice",
			"actions": "Dnelga_actions"
		};
		// src/client/features/onboarding/bridge-status.tsx
		function BridgeStatusNotice({ t, status, busy, error, onRestart, onLogs }) {
			if (!status || status.state === "ready") return null;
			const failed = status.state === "failed" || status.state === "unavailable";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: bridge_status_module_css_default.notice,
				"data-failed": failed,
				"aria-label": t("本机连接状态"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: failed ? "alert" : "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: translateMessage(t, status.message) }), status.hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: translateMessage(t, status.hint) }) : null]
					}),
					failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: bridge_status_module_css_default.actions,
						children: [status.canRetry ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: busy,
							onClick: onRestart,
							children: busy ? t("正在重试…") : t("尝试重启")
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: onLogs,
							children: t("查看运行日志")
						})]
					}) : null,
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						children: translateMessage(t, error)
					}) : null
				]
			});
		}
		// \0dsh-css:src/client/features/onboarding/bridge-logs-panel.module.css.mjs
		const tagId = "@yundashi/dsh-remote-control/src/client/features/onboarding/bridge-logs-panel.module.css";
		const css = ".t4ew4W_panel{min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13)}.t4ew4W_toolbar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;display:flex}.t4ew4W_toolbar h3{font:var(--dsw-font-s-14);margin:0 0 4px;font-weight:600}.t4ew4W_toolbar p,.t4ew4W_status{color:var(--dsw-alias-label-secondary);margin:0}.t4ew4W_actions{gap:4px;display:flex}.t4ew4W_status{margin:12px 0}.t4ew4W_entries{overscroll-behavior:contain;user-select:text;min-height:180px;max-height:52dvh;margin:0;padding:0;list-style:none;overflow:auto}.t4ew4W_entries:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.t4ew4W_entry{border-top:1px solid var(--dsw-alias-border-l2)}.t4ew4W_summary{cursor:pointer;white-space:nowrap;grid-template-columns:12px 78px 68px 44px minmax(0,1fr) 48px;align-items:center;gap:8px;min-height:38px;list-style:none;display:grid}.t4ew4W_summary::-webkit-details-marker{display:none}.t4ew4W_summary:before{content:\"›\";color:var(--dsw-alias-label-secondary);text-align:center}details[open]>.t4ew4W_summary:before{transform:rotate(90deg)}.t4ew4W_summary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;border-radius:4px}.t4ew4W_summary time{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:11px}.t4ew4W_sourceBadge{border:1px solid var(--dsw-alias-border-l2);text-align:center;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;border-radius:4px;padding:1px 6px;font-size:11px;display:inline-block;overflow:hidden}.t4ew4W_levelBadge{color:var(--dsw-alias-label-secondary);text-align:center;font:11px ui-monospace,SFMono-Regular,Consolas,monospace}.t4ew4W_levelBadge[data-level=error]{color:var(--dsw-alias-state-error-primary);font-weight:600}.t4ew4W_summary code{text-overflow:ellipsis;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;overflow:hidden}.t4ew4W_outcome{text-align:right;color:var(--dsw-alias-label-secondary);font-size:12px}.t4ew4W_entry[data-outcome=failure] .t4ew4W_outcome,.t4ew4W_error{color:var(--dsw-alias-state-error-primary)}.t4ew4W_entry[data-outcome=success] .t4ew4W_outcome{color:var(--dsw-alias-label-primary)}.t4ew4W_detail{padding:0 10px 12px 22px}.t4ew4W_detail p{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:11px}.t4ew4W_entry pre{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);margin:8px 0 0;font:11px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.t4ew4W_exception{color:var(--dsw-alias-state-error-primary)!important}.t4ew4W_empty{color:var(--dsw-alias-label-secondary);padding:24px 0;line-height:1.7}.t4ew4W_unavailable{color:var(--dsw-alias-label-secondary);flex-direction:column;align-items:flex-start;gap:10px;padding:16px 0;line-height:1.7;display:flex}.t4ew4W_unavailable p{margin:0}.t4ew4W_loadOlder{padding:8px 0}.t4ew4W_sources{flex-wrap:wrap;gap:8px;margin-bottom:16px;display:flex}.t4ew4W_startupFailures{user-select:text;margin:0 0 16px;padding:0;list-style:none}.t4ew4W_terminal{overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l2);user-select:text;border-radius:8px;height:52dvh;min-height:180px;padding:12px;overflow:auto}.t4ew4W_terminalLine{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.t4ew4W_terminalLine time{color:var(--dsw-alias-label-secondary)}.t4ew4W_terminal:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}";
		if (typeof document !== "undefined") {
			let style = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
			if (style === null) {
				style = document.createElement("style");
				style.dataset.plugin = "@yundashi/dsh-remote-control";
				style.dataset.pluginCss = tagId;
				style.textContent = css;
				document.head.appendChild(style);
			} else if (style.textContent !== css) style.textContent = css;
		}
		var bridge_logs_panel_module_css_default = {
			"startupFailures": "t4ew4W_startupFailures",
			"outcome": "t4ew4W_outcome",
			"empty": "t4ew4W_empty",
			"status": "t4ew4W_status",
			"sourceBadge": "t4ew4W_sourceBadge",
			"terminal": "t4ew4W_terminal",
			"entries": "t4ew4W_entries",
			"levelBadge": "t4ew4W_levelBadge",
			"loadOlder": "t4ew4W_loadOlder",
			"toolbar": "t4ew4W_toolbar",
			"unavailable": "t4ew4W_unavailable",
			"exception": "t4ew4W_exception",
			"actions": "t4ew4W_actions",
			"error": "t4ew4W_error",
			"detail": "t4ew4W_detail",
			"panel": "t4ew4W_panel",
			"summary": "t4ew4W_summary",
			"entry": "t4ew4W_entry",
			"sources": "t4ew4W_sources",
			"terminalLine": "t4ew4W_terminalLine"
		};
		// src/client/features/onboarding/connector-logs-panel.tsx
		function ConnectorLogsPanel({ t, host }) {
			const [entries, setEntries] = (0, react.useState)([]);
			const [older, setOlder] = (0, react.useState)(false);
			const [paused, setPaused] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [failures, setFailures] = (0, react.useState)([]);
			const [diagnosticError, setDiagnosticError] = (0, react.useState)(false);
			const viewport = (0, react.useRef)(null);
			const current = (0, react.useRef)([]);
			const loading = (0, react.useRef)(false);
			const generation = (0, react.useRef)(0);
			const initialized = (0, react.useRef)(false);
			const scroll = (0, react.useRef)(null);
			const refresh = (0, react.useCallback)(async (mode = "latest") => {
				if (loading.current) return;
				loading.current = true;
				setBusy(true);
				const version = generation.current;
				const diagnosticTask = host.readStartupDiagnostics().then((value) => {
					if (version === generation.current) {
						setFailures(value);
						setDiagnosticError(false);
					}
				}, () => {
					if (version === generation.current) setDiagnosticError(true);
				});
				const previous = current.current;
				const query = mode === "older" && previous.length ? { before: previous[0].id } : initialized.current && previous.length ? { after: previous.at(-1).id } : {};
				try {
					let page = await host.readConnectorLogs(query);
					if (version !== generation.current) return;
					const reset = initialized.current && (page.newestId === null || previous.length > 0 && page.newestId < previous.at(-1).id);
					if (reset && page.newestId !== null) page = await host.readConnectorLogs();
					if (version !== generation.current) return;
					const element = viewport.current;
					if (mode === "older" && element && !reset) scroll.current = {
						height: element.scrollHeight,
						top: element.scrollTop
					};
					else if (!initialized.current || reset || element && element.scrollHeight - element.clientHeight - element.scrollTop < 48) scroll.current = "bottom";
					const merged = reset || !initialized.current ? page.entries : mode === "older" ? [...page.entries, ...previous] : [...previous, ...page.entries];
					const next = [...new Map(merged.map((entry) => [entry.id, entry])).values()].filter((entry) => page.oldestId !== null && entry.id >= page.oldestId).slice(-1e4);
					current.current = next;
					initialized.current = true;
					setEntries(next);
					setOlder(page.oldestId !== null && next.length > 0 && next[0].id > page.oldestId);
					setError(null);
				} catch {
					if (version === generation.current) setError("Connector 日志读取失败，请重试。");
				} finally {
					await diagnosticTask;
					if (version === generation.current) {
						loading.current = false;
						setBusy(false);
					}
				}
			}, [host]);
			(0, react.useLayoutEffect)(() => {
				const element = viewport.current;
				if (element && scroll.current) element.scrollTop = scroll.current === "bottom" ? element.scrollHeight : scroll.current.top + element.scrollHeight - scroll.current.height;
				scroll.current = null;
			}, [entries]);
			(0, react.useEffect)(() => {
				loading.current = false;
				refresh();
				return () => {
					generation.current++;
				};
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (paused) return;
				const timer = setInterval(() => {
					if (document.visibilityState !== "hidden") refresh();
				}, 2e3);
				return () => clearInterval(timer);
			}, [paused, refresh]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: bridge_logs_panel_module_css_default.panel,
				"aria-label": t("启动前诊断"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: bridge_logs_panel_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("启动前诊断") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("当前启动失败与本地进程引导输出 · 独立于统一运行日志") })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: bridge_logs_panel_module_css_default.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								onClick: () => setPaused((value) => !value),
								children: paused ? t("继续刷新") : t("暂停刷新")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy,
								onClick: () => void refresh(),
								children: t("刷新")
							})]
						})]
					}),
					diagnosticError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.error,
						role: "alert",
						children: t("启动失败详情读取失败，请刷新重试。")
					}) : null,
					failures.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"aria-label": t("当前启动失败"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("当前启动失败") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: bridge_logs_panel_module_css_default.startupFailures,
							children: failures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: bridge_logs_panel_module_css_default.entry,
								"data-outcome": "failure",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
									className: bridge_logs_panel_module_css_default.summary,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
											dateTime: failure.time,
											children: new Date(failure.time).toLocaleTimeString(t("locale.code"))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.sourceBadge,
											children: failure.source === "plugin" ? t("插件") : "Bridge"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.levelBadge,
											"data-level": "error",
											children: "ERROR"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: failure.event }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.outcome,
											children: t("失败")
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: bridge_logs_panel_module_css_default.detail,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: translateMessage(t, failure.message) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: failure.details })]
								})] })
							}, `${failure.source}:${failure.time}`))
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.status,
						role: "status",
						children: busy ? t("正在读取…") : t("{status} · 已显示 {count} 行", {
							status: paused ? t("已暂停刷新") : t("每 2 秒刷新"),
							count: entries.length
						})
					}),
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.error,
						role: "alert",
						children: translateMessage(t, error)
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: viewport,
						className: bridge_logs_panel_module_css_default.terminal,
						tabIndex: 0,
						"aria-label": t("Connector 终端输出"),
						onScroll: (event) => {
							if (event.currentTarget.scrollTop <= 24 && older) refresh("older");
						},
						children: [
							older ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								disabled: busy,
								onClick: () => void refresh("older"),
								children: t("加载更早的 200 行")
							}) : null,
							!entries.length && !busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: bridge_logs_panel_module_css_default.empty,
								children: t("暂无启动前诊断输出。uv 引导与 Connector 进程拉起输出会显示在这里。")
							}) : null,
							entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: bridge_logs_panel_module_css_default.terminalLine,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
										dateTime: entry.time,
										children: new Date(entry.time).toLocaleTimeString(t("locale.code"))
									}),
									" ",
									entry.text
								]
							}, entry.id))
						]
					})
				]
			});
		}
		// src/client/features/onboarding/bridge-logs-panel.tsx
		function BridgeLogsPanel({ t, host }) {
			const [view, setView] = (0, react.useState)("all");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: bridge_logs_panel_module_css_default.sources,
				role: "group",
				"aria-label": t("日志来源"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: view === "all" ? "primary" : "outline",
						"aria-pressed": view === "all",
						onClick: () => setView("all"),
						children: t("全部")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: view === "plugin" ? "primary" : "outline",
						"aria-pressed": view === "plugin",
						onClick: () => setView("plugin"),
						children: t("插件")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: view === "bridge" ? "primary" : "outline",
						"aria-pressed": view === "bridge",
						onClick: () => setView("bridge"),
						children: "Bridge"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: view === "connector" ? "primary" : "outline",
						"aria-pressed": view === "connector",
						onClick: () => setView("connector"),
						children: "Connector"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: view === "bootstrap" ? "primary" : "outline",
						"aria-pressed": view === "bootstrap",
						onClick: () => setView("bootstrap"),
						children: t("启动前诊断")
					})
				]
			}), view === "bootstrap" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectorLogsPanel, {
				t,
				host
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UnifiedRuntimeLogView, {
				t,
				host,
				source: view,
				onOpenBootstrap: () => setView("bootstrap")
			})] });
		}
		function mergeBySeq(entries) {
			const map = /* @__PURE__ */ new Map();
			for (const entry of entries) map.set(entry.seq, entry);
			return [...map.values()].sort((a, b) => a.seq - b.seq).slice(-1e4);
		}
		function UnifiedRuntimeLogView({ t, host, source, onOpenBootstrap }) {
			const [entries, setEntries] = (0, react.useState)([]);
			const [pageMeta, setPageMeta] = (0, react.useState)(null);
			const [older, setOlder] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [paused, setPaused] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const current = (0, react.useRef)([]);
			const olderRef = (0, react.useRef)(false);
			const lastSeqRef = (0, react.useRef)(0);
			const initialized = (0, react.useRef)(false);
			const loading = (0, react.useRef)(false);
			const generation = (0, react.useRef)(0);
			const filterSource = source === "all" ? null : source;
			const refresh = (0, react.useCallback)(async (mode = "latest") => {
				if (loading.current && mode !== "reset") return;
				if (mode === "older" && (!initialized.current || current.current.length === 0 || !olderRef.current)) return;
				loading.current = true;
				setBusy(true);
				const version = generation.current;
				const previous = mode === "reset" ? [] : current.current;
				const query = mode === "older" && previous.length > 0 ? {
					source: filterSource,
					beforeSeq: previous[0].seq,
					limit: 200
				} : initialized.current && mode === "latest" && previous.length > 0 ? {
					source: filterSource,
					afterSeq: previous.at(-1).seq,
					limit: 200
				} : {
					source: filterSource,
					limit: 200
				};
				try {
					let page = await host.readRuntimeLogs(query);
					if (version !== generation.current) return;
					if (!page.available) {
						current.current = [];
						olderRef.current = false;
						lastSeqRef.current = 0;
						initialized.current = false;
						setEntries([]);
						setOlder(false);
						setPageMeta({
							available: false,
							updatedAt: page.updatedAt,
							logsPath: page.logsPath
						});
						setError(null);
						return;
					}
					const nextLastSeq = page.lastSeq ?? 0;
					const seqRegressed = initialized.current && (nextLastSeq < lastSeqRef.current || previous.length > 0 && nextLastSeq < previous.at(-1).seq);
					if (seqRegressed) {
						page = await host.readRuntimeLogs({
							source: filterSource,
							limit: 200
						});
						if (version !== generation.current) return;
					}
					const isInitialOrReset = !initialized.current || mode === "reset" || seqRegressed || previous.length === 0;
					const merged = isInitialOrReset ? mergeBySeq(page.items) : mode === "older" ? mergeBySeq([...page.items, ...previous]) : mergeBySeq([...previous, ...page.items]);
					const nextOlder = isInitialOrReset || mode === "older" ? page.hasMoreBefore : olderRef.current || merged.length > 0 && previous.length > 0 && merged[0].seq > previous[0].seq;
					current.current = merged;
					olderRef.current = nextOlder;
					lastSeqRef.current = page.lastSeq ?? 0;
					initialized.current = true;
					setEntries(merged);
					setOlder(nextOlder);
					setPageMeta({
						available: true,
						updatedAt: page.updatedAt,
						logsPath: page.logsPath
					});
					setError(null);
				} catch {
					if (version === generation.current) setError("运行日志读取失败。请点击“刷新”重试。");
				} finally {
					if (version === generation.current) {
						loading.current = false;
						setBusy(false);
					}
				}
			}, [host, filterSource]);
			(0, react.useEffect)(() => {
				generation.current++;
				loading.current = false;
				current.current = [];
				olderRef.current = false;
				lastSeqRef.current = 0;
				initialized.current = false;
				setEntries([]);
				setOlder(false);
				setPageMeta(null);
				setError(null);
				refresh("reset");
				return () => {
					generation.current++;
				};
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (paused) return;
				const timer = setInterval(() => {
					if (document.visibilityState !== "hidden") refresh("latest");
				}, 2e3);
				return () => clearInterval(timer);
			}, [paused, refresh]);
			const sourceLabel = (entrySource) => entrySource === "plugin" ? t("插件") : entrySource === "bridge" ? "Bridge" : "Connector";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: bridge_logs_panel_module_css_default.panel,
				"aria-label": t("运行日志"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: bridge_logs_panel_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("运行日志") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("插件、Bridge 与 Connector 统一运行日志 · 点击查看详情") })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: bridge_logs_panel_module_css_default.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								onClick: () => setPaused((value) => !value),
								children: paused ? t("继续刷新") : t("暂停刷新")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy,
								onClick: () => void refresh("latest"),
								children: t("刷新")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.status,
						role: "status",
						children: pageMeta ? `${t("{status} · 更新于 {time}", {
							status: paused ? t("已暂停") : t("每 2 秒刷新"),
							time: new Date(pageMeta.updatedAt).toLocaleTimeString(t("locale.code"))
						})} · ${t("{status} · 已显示 {count} 条", {
							status: source === "all" ? t("全部") : sourceLabel(source),
							count: entries.length
						})}` : error ? t("尚未读取到日志") : t("正在读取运行日志…")
					}),
					error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.error,
						role: "alert",
						children: translateMessage(t, error)
					}) : null,
					pageMeta && !pageMeta.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: bridge_logs_panel_module_css_default.unavailable,
						role: "status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("统一运行日志服务尚未就绪。Connector 启动并建立本机 RPC 连接后，插件、Bridge 与 Connector 日志将在此统一展示。") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: onOpenBootstrap,
							children: t("查看启动前诊断")
						})]
					}) : null,
					pageMeta?.available && entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: bridge_logs_panel_module_css_default.empty,
						children: t("暂无运行记录。连接启动或收到请求后，日志会显示在这里。")
					}) : null,
					pageMeta?.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: bridge_logs_panel_module_css_default.entries,
						"aria-label": t("运行日志记录"),
						tabIndex: 0,
						children: [...entries].reverse().map((entry) => {
							const outcome = entry.outcome ?? (entry.level === "error" ? "failure" : "info");
							const label = {
								success: t("成功"),
								failure: t("失败"),
								pending: t("进行中"),
								info: entry.level === "warn" ? t("提示") : t("记录")
							}[outcome];
							const srcLabel = sourceLabel(entry.source);
							const headline = entry.method ? entry.message && entry.message !== entry.method ? `${entry.method} · ${entry.message}` : entry.method : entry.message;
							const detailText = Boolean(entry.details && entry.details !== "{}") ? entry.message ? `${entry.message}\n${entry.details}` : entry.details : entry.message;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: bridge_logs_panel_module_css_default.entry,
								"data-outcome": outcome,
								"data-source": entry.source,
								"data-level": entry.level,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
									className: bridge_logs_panel_module_css_default.summary,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
											dateTime: entry.time,
											children: new Date(entry.time).toLocaleTimeString(t("locale.code"))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.sourceBadge,
											"data-source": entry.source,
											children: srcLabel
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.levelBadge,
											"data-level": entry.level,
											children: entry.level.toUpperCase()
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											title: headline,
											children: headline
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bridge_logs_panel_module_css_default.outcome,
											children: label
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: bridge_logs_panel_module_css_default.detail,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
											"#",
											entry.seq,
											" · ",
											srcLabel,
											" · ",
											entry.name,
											" · ",
											entry.level.toUpperCase()
										] }),
										detailText ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: detailText }) : null,
										entry.exception ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
											className: bridge_logs_panel_module_css_default.exception,
											children: entry.exception
										}) : null
									]
								})] })
							}, entry.seq);
						})
					}), older ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: bridge_logs_panel_module_css_default.loadOlder,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							disabled: busy,
							onClick: () => void refresh("older"),
							children: t("加载更早的 200 条")
						})
					}) : null] }) : null
				]
			});
		}
		// src/client/features/onboarding/entry.tsx
		const tabs = [
			"connection",
			"settings",
			"logs"
		];
		const tabLabels = {
			connection: "登录和连接",
			settings: "设置",
			logs: "运行日志"
		};
		/** Match the portal stack without treating another plugin's idle popover as a modal. */
		function activeModalDialog(panel) {
			const document = panel.ownerDocument;
			const view = document.defaultView;
			return Array.from(document.querySelectorAll("[role=\"dialog\"]")).findLast((dialog) => {
				if (dialog === panel) return true;
				if (dialog.getAttribute("aria-modal") === "false" || dialog.closest("[hidden], [inert]")) return false;
				const visibility = view.getComputedStyle(dialog).visibility;
				if (visibility === "hidden" || visibility === "collapse") return false;
				for (let element = dialog; element; element = element.parentElement) if (view.getComputedStyle(element).display === "none") return false;
				return true;
			}) ?? panel;
		}
		function ConnectionEntry({ wide, host, t, renderTrigger }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [tab, setTab] = (0, react.useState)("connection");
			const tabId = (0, react.useId)();
			const state = useOnboardingState(host, open);
			const snapshot = state.snapshot;
			const brandName = snapshot?.brand?.shortName || snapshot?.brand?.productName || "云大师";
			const standalone = snapshot?.desktop.status === "absent";
			const ownershipError = standalone && snapshot?.ownership && snapshot.ownership.status !== "owned" ? snapshot.ownership.message || t("暂时无法检查本机 Connector 状态，请稍后重试。") : null;
			const showLogin = standalone && !snapshot.account && tab === "connection";
			const detectionError = snapshot?.desktop.status === "error" ? snapshot.desktop.message : !snapshot ? state.readError : null;
			const detectionMessage = detectionError ?? (snapshot?.desktop.status === "installed" ? t("云大师桌面端正在运行。请在桌面端完成连接设置。") : t("正在检查连接方式…"));
			const trigger = (0, react.useRef)(null);
			const content = (0, react.useRef)(null);
			const close = (0, react.useCallback)(() => {
				const dialog = content.current?.closest("[role=\"dialog\"]");
				if (dialog && activeModalDialog(dialog) !== dialog) return;
				setOpen(false);
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				const dialog = content.current?.closest("[role=\"dialog\"]");
				if (!dialog) return;
				const appRoot = document.getElementById("root");
				const wasInert = appRoot?.hasAttribute("inert") ?? false;
				appRoot?.setAttribute("inert", "");
				const activeDialog = () => activeModalDialog(dialog);
				const focusable = () => Array.from(activeDialog().querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex=\"0\"]")).filter((element) => {
					const collapsed = element.closest("details:not([open])");
					return element.tabIndex >= 0 && !element.closest("[hidden], [inert]") && (!collapsed || element === collapsed.querySelector("summary"));
				});
				focusable()[0]?.focus();
				const onKeyDown = (event) => {
					if (event.key !== "Tab") return;
					const targets = focusable();
					const first = targets[0];
					const last = targets.at(-1);
					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last?.focus();
					} else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first?.focus();
					}
				};
				let lastFocus = null;
				const onFocus = (event) => {
					if (event.target instanceof HTMLElement && dialog.contains(event.target)) lastFocus = event.target;
				};
				const observer = new MutationObserver(() => {
					const wasCovered = dialog.hasAttribute("inert");
					const covered = activeDialog() !== dialog;
					if (wasCovered === covered) return;
					dialog.toggleAttribute("inert", covered);
					if (wasCovered && !covered && lastFocus?.isConnected) lastFocus.focus();
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: [
						"hidden",
						"inert",
						"aria-modal",
						"class",
						"style"
					]
				});
				document.addEventListener("focusin", onFocus);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					observer.disconnect();
					dialog.removeAttribute("inert");
					document.removeEventListener("focusin", onFocus);
					document.removeEventListener("keydown", onKeyDown);
					appRoot?.toggleAttribute("inert", wasInert);
					if (trigger.current?.isConnected) trigger.current.focus();
				};
			}, [open]);
			const openPanel = (event) => {
				trigger.current = event?.currentTarget ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
				state.prepareOpen();
				setTab("connection");
				setOpen(true);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [renderTrigger ? renderTrigger(openPanel) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("云大师远程控制"),
				disabled: wide || open,
				delayMs: 500,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: clsx(entry_module_css_default.trigger, !wide && entry_module_css_default.rail),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						className: entry_module_css_default.button,
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Smartphone, {
							size: 16,
							strokeWidth: 1.5
						}),
						"aria-label": t("云大师远程控制"),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						onClick: openPanel,
						children: wide ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: entry_module_css_default.label,
							children: t("云大师远程控制")
						}) : null
					})
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: close,
				title: t("{brand}远程控制", { brand: brandName }),
				closeLabel: t("关闭远程控制"),
				className: clsx(entry_module_css_default.dialog, entry_module_css_default.accountDialog, tab === "logs" && entry_module_css_default.logsDialog),
				contentClassName: clsx(entry_module_css_default.dialogContent),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: content,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: entry_module_css_default.tabs,
							role: "tablist",
							"aria-label": t("连接管理"),
							children: tabs.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: tab === value ? "outline" : "ghost",
								role: "tab",
								id: `${tabId}-${value}`,
								"aria-selected": tab === value,
								"aria-controls": `${tabId}-panel`,
								tabIndex: tab === value ? 0 : -1,
								onClick: () => setTab(value),
								onKeyDown: (event) => {
									if (![
										"ArrowLeft",
										"ArrowRight",
										"Home",
										"End"
									].includes(event.key)) return;
									event.preventDefault();
									const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.indexOf(value) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
									const next = tabs[index];
									setTab(next);
									document.getElementById(`${tabId}-${next}`)?.focus();
								},
								children: t(tabLabels[value])
							}, value))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BridgeStatusNotice, {
							t,
							status: snapshot?.bridge,
							busy: state.busy,
							error: state.error,
							onRestart: () => void state.run(() => host.restartBridge()),
							onLogs: () => setTab("logs")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							id: `${tabId}-panel`,
							role: "tabpanel",
							"aria-labelledby": `${tabId}-${tab}`,
							children: tab === "logs" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BridgeLogsPanel, {
								t,
								host
							}) : ownershipError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: entry_module_css_default.placeholder,
								role: "alert",
								children: translateMessage(t, ownershipError)
							}) : !standalone ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: entry_module_css_default.placeholder,
									role: detectionError ? "alert" : "status",
									children: translateMessage(t, detectionMessage)
								}),
								state.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: entry_module_css_default.placeholder,
									role: "alert",
									children: translateMessage(t, state.error)
								}) : null,
								detectionError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									disabled: state.busy,
									onClick: () => void state.run(state.refresh),
									children: t("重新检查")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									disabled: state.busy,
									onClick: () => void state.run(() => host.openDesktop()),
									children: t("打开云大师桌面端")
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: tab === "settings" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsPanel, {
								t,
								host,
								state,
								snapshot,
								onConnection: () => setTab("connection")
							}) : snapshot.account ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountPanel, {
								t,
								host,
								state,
								snapshot,
								account: snapshot.account
							}, `${snapshot.settings.apiBaseUrl}:${snapshot.account.userId}`) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [showLogin ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: entry_module_css_default.loginDescription,
								children: t("在所有设备间访问你的 Agent、会话和工作空间。")
							}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OnboardingSection, {
								t,
								host,
								state
							})] }) })
						})
					]
				})
			})] });
		}
		// src/client/selection.ts
		/** Official selection observable; independent of whether the connection modal is open. */
		function reportSelection(ctx, rpc) {
			ctx.inject(["sessions"], (scope) => {
				const { list } = scope.get("sessions");
				const clientId = crypto.randomUUID();
				let revision = 0;
				const send = (current) => {
					rpc.call("/api", `${HOST_NAMESPACE}/selection`, { args: { input: {
						clientId,
						revision: ++revision,
						current
					} } }).catch(() => void 0);
				};
				const report = () => send(list.getSnapshot().current ?? null);
				scope.effect(() => {
					report();
					const unsubscribe = list.subscribe(report);
					const timer = setInterval(report, 15e3);
					return () => {
						clearInterval(timer);
						unsubscribe();
						send(null);
					};
				}, "yundashiRemoteRuntime.selection");
			});
		}
		// src/client/plugin-settings.tsx
		const PACKAGE = "@yundashi/dsh-remote-control";
		function registerPluginSettings(slots, host) {
			const settings = slots.inject("plugins.bundle.config", () => slots.register({
				name: "plugins.bundle.config",
				key: PACKAGE,
				locale: LOCALE_NS,
				inject: () => ({ host })
			}, PluginSettings));
			const actions = slots.inject("plugins.detail.actions", () => slots.register({
				name: "plugins.detail.actions",
				id: "yundashi-remote-control-panel",
				order: 20,
				locale: LOCALE_NS,
				inject: () => ({ host })
			}, PluginActions));
			return () => {
				actions();
				settings();
			};
		}
		function PluginActions({ host, t, subject }) {
			if (subject.kind !== "bundle" || subject.pkg?.name !== PACKAGE || !subject.pkg.enabled) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectionEntry, {
				t,
				host,
				wide: true,
				renderTrigger: (open) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					onClick: open,
					children: t("打开面板")
				})
			});
		}
		function PluginSettings({ host, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectionEntry, {
				t,
				host,
				wide: true,
				renderTrigger: (open) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectionSettings, {
					t,
					host,
					onConnection: open
				})
			});
		}
		function ConnectionSettings({ host, t, onConnection }) {
			const state = useOnboardingState(host, true);
			const snapshot = state.snapshot;
			if (!snapshot || state.readError || snapshot.desktop.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				role: state.readError || snapshot?.desktop.status === "error" ? "alert" : "status",
				children: translateMessage(t, state.readError ?? (snapshot?.desktop.status === "error" ? snapshot.desktop.message : "正在读取连接设置…"))
			}), state.readError || snapshot?.desktop.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: state.busy,
				onClick: () => {
					state.run(state.refresh);
				},
				children: t("重新检查")
			}) : null] });
			if (snapshot.desktop.status === "installed") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("云大师桌面端正在运行。请在桌面端管理连接设置。") }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: state.busy,
					onClick: () => {
						state.run(() => host.openDesktop());
					},
					children: t("打开云大师桌面端")
				}),
				state.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "alert",
					children: translateMessage(t, state.error)
				}) : null
			] });
			if (snapshot.ownership && snapshot.ownership.status !== "owned") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				role: "alert",
				children: translateMessage(t, snapshot.ownership.message || "暂时无法检查本机 Connector 状态，请稍后重试。")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsPanel, {
				t,
				host,
				state,
				snapshot,
				onConnection
			});
		}
		// src/client/index.tsx
		const inject = [
			"slots",
			"connection",
			"locale"
		];
		function apply(ctx) {
			const services = ctx;
			ctx.effect(() => services.locale.register(LOCALE_NS, {
				zh,
				en
			}), "yundashiRemoteControl.locale");
			const t = services.locale.bind(LOCALE_NS);
			const host = createHostApi(services.connection.rpc);
			reportSelection(ctx, services.connection.rpc);
			ctx.effect(() => registerPluginSettings(services.slots, host), "yundashiRemoteControl.plugin-settings");
			ctx.effect(() => services.slots.inject("sidebar.footer.action", () => services.slots.register({
				name: "sidebar.footer.action",
				id: "yundashi-remote-control",
				order: 26,
				locale: LOCALE_NS,
				label: () => t("云大师远程控制"),
				inject: () => ({ host })
			}, ConnectionEntry)), "yundashiRemoteControl.sidebar");
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map