import { userInfo } from 'node:os'
import { join } from 'node:path'
import type { DesktopDetection } from '../../contracts/index.js'
import type { DesktopProcessTarget } from './process.js'

export const desktopRecordPath = (home = userInfo().homedir): string => join(home, '.dsh', 'anywhere', 'desktop', 'install.json')

/** Standalone plugin always runs in built-in Connector mode; never lock on official Desktop. */
export async function detectDesktop(
  _home = userInfo().homedir, _platform = process.platform,
  _running?: (target: DesktopProcessTarget, platform: NodeJS.Platform) => Promise<boolean>,
): Promise<DesktopDetection> {
  return { status: 'absent', message: '未找到桌面端安装记录，可以通过 Web 完成设置。' }
}
