# DEVELOPMENT & DEPLOYMENT WORKFLOW — OrganoClean AI ERP

> How the development workflow works: Your computer + OpenCode → GitHub → Staging → Production.

## Environments

| Environment | Purpose |
|---|---|
| **Your computer + OpenCode** | Write code, inspect files, implement modules and run tests. |
| **GitHub repository** (`MHK-TECH/organoclean-erp`) | Version history, branches, backups of source code and collaboration. |
| **Staging (Cloudflare preview URL)** | Test features, permissions, database migrations and integrations. |
| **Production (Cloudflare)** | Approved, stable OrganoClean ERP. |

Cloudflare supports connecting a GitHub repository to its deployment pipeline, building the project and deploying changes pushed to the configured branch. Preview deployments can help test changes before they reach production.

---

## Step-by-step setup

### 1. Create a private GitHub repository — DONE
- Repository: `MHK-Tech/organoclean-erp` (currently empty).
- Start with a **Private** repository while the code is under development. Make it public later after reviewing secrets, private formulas, configuration and licensing.

### 2. Open the project folder in OpenCode — DONE
- Local project folder: `D:\MyData\My Projects\OC ERP`
- Git initialized and connected to GitHub (`origin` remote added). No separate cloud connection inside OpenCode is needed to edit and commit locally.

### 3. Ask OpenCode to assess the project first
- Master prompt saved at `docs/PLAN_OF_ACTION.md`.
- Instruct OpenCode to inspect the repository, create the assessment and roadmap, and begin with authentication, permissions and audit logging — never generate every module at once.

### 4. Connect GitHub to Cloudflare — DONE (by user)
- Cloudflare dashboard → Workers & Pages → application connected to the repository.
- Configure supported build settings and environment bindings; deploy to a **preview URL** first. Exact settings depend on the Next.js runtime and adapter.

### 5. Keep staging and production separate
- Use a development branch or pull requests for new features; deploy approved commits to production.
- Use separate database bindings and secrets for staging and production.
- **Never test destructive migrations against the live business database.**

---

## Deployment workflow

| Action | Result |
|---|---|
| OpenCode edits code locally | No live deployment yet |
| Run tests and review the changes | Catch errors before publishing |
| Commit and push a development branch | Triggers a preview build if configured |
| Review and merge approved changes | Deploys the production branch if configured |
| Monitor the deployment | Verify health and roll back if necessary |

---

## Branch strategy

- `main` → production (stable, approved commits only).
- `develop` (or feature branches) → staging/preview builds.
- Feature work happens on short-lived branches: `feat/<module>`, `fix/<issue>`.
- Pull requests merge into `main` only after tests pass locally.
