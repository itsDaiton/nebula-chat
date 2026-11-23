# Agent catalog

The Agents the worker may run today, from the JSON files in `apps/worker/src/agents/` ([how the catalogs
work](./catalogs.md)). Their versions and hashes are in those files, not repeated here. Each Agent's Model must
be in the [Model catalog](./model-catalog.md).

Kept by hand: adding, changing or removing an Agent (its JSON or its prompt) updates this page in the same PR.

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
