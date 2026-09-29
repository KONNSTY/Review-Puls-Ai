# Security checklist

| Threat               | Control                                                     | Verification                        | Residual risk                          |
| -------------------- | ----------------------------------------------------------- | ----------------------------------- | -------------------------------------- |
| IDOR / tenant leak   | every repository write/read includes verified shop context  | negative integration test pending   | live DB test required                  |
| OAuth/session abuse  | official Shopify library, App Bridge session tokens         | template + live install pending     | external auth                          |
| Webhook spoof/replay | raw-body HMAC, provider event unique key                    | HMAC unit test; live replay pending | provider contract                      |
| Token leakage        | AES-GCM envelope encryption; server-only env                | code review                         | key rotation runbook pending           |
| Prompt injection     | review is explicitly untrusted; strict server prompt/schema | prompt unit test                    | model behavior requires contract tests |
| PII leakage          | pre-request regex scrub and output check                    | PII unit test                       | advanced address detection pending     |
| CSV injection        | formula-leading cells prefixed with apostrophe              | CSV unit test                       | spreadsheet viewer policy              |
| XSS                  | React/Polaris rendering; no raw HTML                        | code review                         | browser security scan pending          |
| SSRF                 | no arbitrary provider URL from user data                    | adapter boundary                    | provider URLs require allowlist        |
| Cost abuse           | server quota reservation, max tokens, timeout               | DB concurrency test pending         | valid plan sync required               |
