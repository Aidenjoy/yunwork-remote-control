import { randomBytes } from 'node:crypto'
import type { DesktopLaunch } from '../../contracts/index.js'

/** Registered by the packaged Desktop app; also carries its OAuth callback. */
export const DESKTOP_PROTOCOL = 'yundashi-remote-control'

export interface DesktopLaunchTarget {
  executablePath: string
  launchArgs: string[]
  packaged: boolean
}

export type DesktopLauncher = (target: DesktopLaunchTarget, url: string) => Promise<void>

/** 24 base64url characters, inside the range the Desktop entry validates. */
export function newDesktopFlowId(): string {
  return randomBytes(18).toString('base64url')
}

export function desktopOnboardingUrl(flowId: string): string {
  const params = new URLSearchParams({ source: 'dsh-plugin', flowId })
  return `${DESKTOP_PROTOCOL}://onboarding?${params.toString()}`
}

export const launchDesktop: DesktopLauncher = async () => {
  throw new Error('独立插件模式请直接使用内置远程控制完成连接。')
}

export function launchResult(flowId: string): DesktopLaunch {
  return { flowId, url: desktopOnboardingUrl(flowId) }
}
