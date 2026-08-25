# IONtix V2 — Database Foundation Next Step

This package contains the IONtix V2 domain-schema refactor.

## Important

- Do NOT run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` yet.
- This schema is designed as the target domain model; the production/database migration must be generated only after the existing database state has been inspected and mapped.
- `prisma/seed.ts` now targets the Prisma 7 generated client and seeds the initial RBAC and sport catalog.
- Set `IONTIX_SEED_ADMIN_EMAIL` and `IONTIX_SEED_ADMIN_PASSWORD` before any real seed operation.

## Verification order on the user's machine

```bash
npm install
npx prisma validate
npx prisma generate
```

Do not run the migration commands until the migration plan is explicitly approved.
