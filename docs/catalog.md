# Model and Agent catalog

What the platform may run today, taken from the two catalogs ([how they work](./catalogs.md)). Prices are
USD per million tokens. A Model whose temperature is `fixed` rejects any other value, so an Agent's
temperature is dropped for it.

Kept by hand: adding, changing or removing a Model or an Agent updates this page in the same PR.

## Models

Default Model per provider: openai `gpt-4o-mini`, anthropic `claude-3-5-haiku-20241022`. The data is
`libs/contracts/src/models/catalog.json`.

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

## Agents

Each Agent's Model must be in the table above. The definitions are the JSON files in
`apps/worker/src/agents/`; the versions and hashes are there too, not repeated here.

| Agent          | Kind     | Label                   | Model          | Prompt            | Tools                     | Temperature | Max tokens |
| -------------- | -------- | ----------------------- | -------------- | ----------------- | ------------------------- | ----------- | ---------- |
| `language`     | agent    | Detecting the language  | `gpt-4o-mini`  | `language.md`     | none                      | 0           | default    |
| `session`      | agent    | Summarising the Session | `gpt-4o-mini`  | `session.md`      | none                      | 0           | default    |
| `orchestrator` | agent    | Planning the work       | `gpt-4.1`      | `orchestrator.md` | none                      | 0.2         | default    |
| `output`       | agent    | Writing the answer      | `gpt-4.1`      | `output.md`       | none                      | 0.7         | default    |
| `analyst`      | delegate | Analysing               | `gpt-4.1-mini` | `analyst.md`      | none                      | 0.3         | default    |
| `critic`       | delegate | Reviewing               | `gpt-4.1-mini` | `critic.md`       | none                      | 0.2         | default    |
| `researcher`   | delegate | Researching             | `gpt-4.1-mini` | `researcher.md`   | `web_search`, `web_fetch` | 0.2         | default    |

What the Orchestrator sees of each delegate:

- `analyst`: Works through a question or problem step by step and reports a reasoned conclusion. Give it everything it needs in the task.
- `critic`: Reviews a draft, plan or claim for errors, gaps and weak reasoning, and says how to fix them. Put the work to review in the task.
- `researcher`: Looks things up on the web and reports what current or external sources say, with their URLs. Use it for recent events, facts to check, or anything beyond general knowledge.
