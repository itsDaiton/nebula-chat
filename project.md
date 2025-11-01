API key, deployment name

- Use embeddings via Azure OpenAI

**RAG Flow:**

1. Upload → chunk → embed → store in Postgres
2. Retrieve relevant chunks on chat
3. Augment prompt for contextual responses

---

## 🗄️ Data Layer

- PostgreSQL + `pgvector` for embeddings
- Redis for cache/session
- Optional Azure Blob Storage for files

---

## 🐳 Containerization & Deployment

**Podman Setup:**

- `podman-compose.yml` → frontend, backend, db, redis
- `Dockerfile` for builds
- Unified `.env` for config

**Azure Integration:**

- Deploy to Azure Container Apps or AKS
- Store images in Azure Container Registry (ACR)
- Optional CI/CD via GitHub Actions

---

## 🔮 Future Additions

- Model Context Protocol (MCP) for custom tools
- Authentication (Supabase / Azure AD B2C)
- Monitoring (OpenTelemetry / Azure App Insights)
