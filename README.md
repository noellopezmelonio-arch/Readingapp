# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Local persistence server (optional)

This project includes a minimal Node server at `server/index.js` that persists data to `server/data/db.json` so multiple browser windows (including incognito) can share the same data during local development.

To run it alongside the dev server:

```bash
npm run server    # starts persistence API on http://localhost:4000
npm run dev       # starts Vite dev server
```

The client will automatically try to use `http://localhost:4000` when available and fall back to `localStorage` if not.

Seed users:
- Noel: `noelviajando@gmail.com` / `0306`
- Mauricio: `mauricioglopez@gmail.com` / `1404`

If you want to change the server address, set `VITE_API_URL` in a `.env` file at the project root.
