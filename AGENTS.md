# AGENTS.md

## Cursor Cloud specific instructions

This is a **Mintlify documentation starter kit** — a static documentation site with no backend, no database, and no build step. There are no automated tests, no linter, and no `package.json`.

### Running the dev server

- Start: `mint dev` (from the repo root where `docs.json` lives). Serves at `http://localhost:3000`.
- The CLI requires Node.js >= 19. The `mint` package is installed globally via `npm i -g mint`.
- If the preview fails, run `mint update` to ensure the latest CLI version.

### Project structure

- `docs.json` — Mintlify site configuration (navigation, theme, branding).
- `*.mdx` files — Documentation pages (MDX format).
- `api-reference/openapi.json` — OpenAPI 3.1.0 spec for the sample Plant Store API.
- `error-overlay-extension/` — A standalone Chrome extension (Manifest V3); no dependency on the docs site.

### Notes

- There are no lint, test, or build commands for this repo. The only development action is previewing docs with `mint dev`.
- Content changes to `.mdx` files are hot-reloaded by the dev server automatically.
