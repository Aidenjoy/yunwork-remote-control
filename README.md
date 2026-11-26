# @yundashi/dsh-remote-control（云大师远程控制）

云大师远程控制插件，安装后即可在侧边栏「云大师远程控制」发起登录与设备配对。

## 本地开发与构建

```bash
npm install
npm run build
```

构建产物输出到 `lib/`（包含 `lib/index.js`、`lib/client.js` 与 `lib/bundled-connector/`）。

## 服务端地址配置

默认线上地址为 `https://agent.yundashi.com`。若需覆盖，可在插件配置中设置或使用环境变量：

- `YUNWORK_ANYWHERE_SERVER_URL`
- `YUNWORK_ANYWHERE_WEB_URL`
- `YUNWORK_ANYWHERE_RUNTIME_TYPE`（默认 `yunwork`）

## 校验与打包

```bash
npx tsc --noEmit
npm run build
node scripts/check-build.ts
npm pack --ignore-scripts
```
