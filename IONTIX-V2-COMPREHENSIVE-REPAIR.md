# IONtix V2 — Comprehensive Code Quality & Production Repair

Baseline: `iontix-v2-code-quality-pass4c`

This pass consolidates the lint/type issues reported by the project's latest audit instead of splitting the work across many small downloads.

## Main repairs

- Removed explicit `any` from application code and introduced shared platform/domain types.
- Tightened checkout, dashboard, order, event, finance, and Super Admin data contracts.
- Reworked scanner callback lifecycle to avoid function-before-declaration and unstable effect usage.
- Hardened unknown error handling with `instanceof Error` checks.
- Cleaned role/user/table typing for Super Admin components.
- Replaced the Tailwind CommonJS `require()` pattern with ESM import.
- Fixed React event/dashboard typing and form field typing.
- Preserved Prisma 7 generated-client architecture.
- Kept the Dynamic Form / Sport Template schema foundation intact.

## Verification on the developer machine

Run exactly once, in this order:

```bash
npm install
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
```

Do not run `npm audit fix --force` during this verification pass.

Do not run `prisma migrate dev`, `db push`, or `migrate reset` until the application build is clean and the migration plan for the existing database has been approved.
