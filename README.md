# @yundashi/dsh-remote-control（云大师远程控制）

云大师远程控制插件，安装启用后即可在侧边栏点击「云大师远程控制」发起登录与设备配对。

## 默认服务配置

- 默认服务端地址：`https://agent.yundashi.com`
- 支持在插件配置中覆盖 `apiBaseUrl`，或通过环境变量覆盖：
  - `YUNWORK_ANYWHERE_SERVER_URL`
  - `YUNWORK_ANYWHERE_WEB_URL`
  - `YUNWORK_ANYWHERE_RUNTIME_TYPE`（默认 `yunwork`）

## 本地开发与打包

```bash
npm install
npm run build
npm pack --ignore-scripts
```

构建产物输出到 `lib/`（包含 `lib/index.js`、`lib/client.js` 与 `lib/bundled-connector/`），`npm pack --ignore-scripts` 可直接生成零编译分发的 `.tgz` 安装包。
