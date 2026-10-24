# Diagrams

Architecture and flows are drawn in [Mermaid](https://mermaid.js.org), inside the Markdown that explains
them. GitHub renders it, it diffs as text, and an agent can read and edit it like code. No exported images
(PNG, SVG, Excalidraw files): a picture nobody can diff goes stale unnoticed.

- **Where it goes.** System-level views (deployment, workspace packages, data model, Redis keyspace, flows
  that cross apps) in [docs/architecture.md](../architecture.md). A feature's own flows beside its prose
  in a topic doc (`docs/auth.md`, `docs/logging.md`). An ADR may draw the decision it records. A package
  `AGENTS.md` links to a diagram rather than copying it.
- **Which kind.** `flowchart` for structure and pipelines, `sequenceDiagram` for a request or job that crosses
  processes, `erDiagram` for the schema, `stateDiagram-v2` for a lifecycle (an identity, a Run's states).
- **What it shows.** What the code does today. A proposed design stays in its ADR, labelled as proposed;
  a known shortfall goes under `docs/architecture.md` → Known gaps, not into a diagram as if it worked.
- **How it reads.** One question per diagram and about 15 nodes at most; split rather than grow. Name real
  things (routes, files, Redis keys, events, env vars) so a reader can grep from the diagram to the code.
  Prose around it says what the diagram cannot: why, limits, failure paths.
- **Keep it true.** A change to a drawn flow updates the diagram in the same PR (see
  the root AGENTS.md "Keep docs true" rule).
- **Check it renders** before pushing: `npx -y @mermaid-js/mermaid-cli -i docs/<file>.md -o /tmp/<file>.md`
  renders every block in the file and fails on a syntax error.
