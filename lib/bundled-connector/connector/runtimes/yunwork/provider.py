"""云大师的独立发现、资源声明与优先排序，不替换 DSH Provider。"""
from dataclasses import replace

from connector.core import runtime_owner
from connector.runtime_protocol import RuntimeResourceClaim, RuntimeSourceKey
from connector.runtime_protocol.filesystem import filesystem_resource_key
from connector.runtimes.dsh import discovery, provider_config
from connector.runtimes.dsh.provider import DshProvider


async def discover(values):
    """发现云大师类型，连接探测由独立 Bridge 执行。"""
    return await discovery.discover(values, runtime_type="yunwork")


async def probe(values):
    """只连接云大师 Bridge，不回退到原版 DSH。"""
    return await discovery.probe(values, runtime_type="yunwork")


class YunworkProvider(DshProvider):
    """复用 DSH 执行能力，以独立类型、Router、状态与资源标识隔离。"""

    def __init__(self, discoverer=None, prober=None):
        """选择独立发现器，同时允许注入离线探测用于验证。"""
        super().__init__(discoverer=discoverer or discover, prober=prober or probe)
        self._last_values["dshHome"] = str(runtime_owner.system_home() / ".yunwork")

    @property
    def runtime(self):
        return "yunwork"

    @property
    def runtime_type(self):
        return "yunwork"

    @property
    def display_name(self):
        return provider_config.runtime_display_name("yunwork")

    @property
    def description(self):
        return "云大师 AI Agent"

    @property
    def recommended(self):
        return True

    @property
    def recommendation_rank(self):
        return 0

    async def discover(self):
        descriptor = await super().discover()
        return replace(descriptor, recommended=True, recommendation_rank=0)

    def _config_schema(self):
        schema = super()._config_schema()
        properties = schema.schema["properties"]
        properties["dshHome"] = {**properties["dshHome"], "title": "云大师数据目录",
            "description": "可选的云大师独立数据目录；连接固定使用 ~/.agents-anywhere/yunwork-bridge。"}
        return replace(schema, defaults={**schema.defaults, "dshHome": self._last_values.get("dshHome", str(runtime_owner.system_home() / ".yunwork"))})

    async def validate_config(self, values):
        """为实例补齐独立数据目录，同时沿用 DSH 的配置校验。"""
        return await super().validate_config({"dshHome": str(runtime_owner.system_home() / ".yunwork"), **values})

    def resource_claims(self, config):
        """独立声明资源，避免占用 DSH Bridge 或合并会话来源。"""
        endpoint = str(provider_config.endpoint_path("yunwork"))
        home = str(provider_config.dsh_home(dict(config.values)))
        return (
            RuntimeResourceClaim(kind="dsh_home", key=filesystem_resource_key(home), label="云大师数据目录"),
            RuntimeResourceClaim(kind="yunwork_bridge_endpoint", key=filesystem_resource_key(endpoint), label="云大师 Bridge"),
        )

    def session_source_key(self, config):
        return RuntimeSourceKey(kind="yunwork_bridge_endpoint", key=filesystem_resource_key(str(provider_config.endpoint_path("yunwork"))))
