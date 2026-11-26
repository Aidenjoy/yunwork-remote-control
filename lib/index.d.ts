import { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
interface Config {
  runtimeType?: 'dsh' | 'yunwork';
  dshHome?: string;
  apiBaseUrl?: string;
  stateRoot?: string;
  connectorSourceDir?: string;
  uvPath?: string;
}
declare const Config: z<Config>;
declare const name = "yundashi-remote-control";
declare function apply(ctx: Context, config: Config): void;
export { Config, apply, name };
//# sourceMappingURL=index.d.ts.map