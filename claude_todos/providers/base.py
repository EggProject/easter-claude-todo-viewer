from dataclasses import dataclass, field

@dataclass
class ProviderResult:
    structured: dict
    raw_response: str
    exact_request: dict
    provider: str
    model: str
    duration_seconds: float = 0.0
    usage: dict = field(default_factory=dict)
    remote_id: str = ''
    metadata: dict = field(default_factory=dict)
