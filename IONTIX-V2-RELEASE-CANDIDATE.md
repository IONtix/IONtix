# IONtix V2 — Release Candidate Repair

This package consolidates the current repair baseline into one verification candidate.

Fixes in this candidate include:
- Prisma 7 configuration and generated client compatibility
- Dynamic/strict platform type contracts
- Checkout discriminated-union response typing
- Legacy Role string compatibility through relation-based Role typing
- Event payload normalization for JSON and numeric fields
- Order/addon/dashboard transaction typing
- Super Admin role typing
- React purity issue in RecentTransactions (removed Date.now() from render)
- Duplicate import cleanup for next/image and shared platform types
- Event form compatibility types for categories/custom fields/addons
- Missing Layers import in training event form

Verification order on a local machine:
1. npm install
2. npx prisma validate
3. npx prisma generate
4. npx tsc --noEmit
5. npm run lint
6. npm run build

Do not run database migration/reset commands yet.
Do not run npm audit fix --force yet.
