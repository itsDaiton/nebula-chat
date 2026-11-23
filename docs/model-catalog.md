# Model catalog

The Models the platform may run today, from `libs/contracts/src/models/catalog.json` ([how the catalogs
work](./catalogs.md)). The Agents that use them are in the [Agent catalog](./agent-catalog.md).

Kept by hand: adding, changing or removing a Model updates this page in the same PR.

Prices are USD per million tokens. A Model whose temperature is `fixed` rejects any other value, so an
Agent's temperature is dropped for it. Default Model per provider: openai `gpt-4o-mini`, anthropic
`claude-3-5-haiku-20241022`.

| Model             | Id                           | Provider  | Context window | Max output | Temperature | Input  | Cached input | Output |
| ----------------- | ---------------------------- | --------- | -------------- | ---------- | ----------- | ------ | ------------ | ------ |
| GPT-4o            | `gpt-4o`                     | openai    | 128,000        | 16,384     | yes         | $2.50  | $1.25        | $10.00 |
| GPT-4o mini       | `gpt-4o-mini`                | openai    | 128,000        | 16,384     | yes         | $0.15  | $0.075       | $0.60  |
| GPT-4 Turbo       | `gpt-4-turbo`                | openai    | 128,000        | 4,096      | yes         | $10.00 | $10.00       | $30.00 |
| GPT-4.1           | `gpt-4.1`                    | openai    | 1,047,576      | 32,768     | yes         | $2.00  | $0.50        | $8.00  |
| GPT-4.1 mini      | `gpt-4.1-mini`               | openai    | 1,047,576      | 32,768     | yes         | $0.40  | $0.10        | $1.60  |
| GPT-5             | `gpt-5`                      | openai    | 400,000        | 128,000    | fixed       | $1.25  | $0.125       | $10.00 |
| GPT-5 mini        | `gpt-5-mini`                 | openai    | 400,000        | 128,000    | fixed       | $0.25  | $0.025       | $2.00  |
| GPT-5.6 Luna      | `gpt-5.6-luna`               | openai    | 1,050,000      | 128,000    | fixed       | $0.20  | $0.02        | $1.20  |
| Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` | anthropic | 200,000        | 8,192      | yes         | $3.00  | $0.30        | $15.00 |
| Claude 3.5 Haiku  | `claude-3-5-haiku-20241022`  | anthropic | 200,000        | 8,192      | yes         | $0.80  | $0.08        | $4.00  |
| Claude 3 Opus     | `claude-3-opus-20240229`     | anthropic | 200,000        | 4,096      | yes         | $15.00 | $1.50        | $75.00 |
