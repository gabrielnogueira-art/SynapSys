# SynapSys identity
- [ ] Apply the supplied brand to platform screens and platform login, retaining EBD/client themes.
- [ ] Reuse the supplied symbol, update favicon and page metadata, and verify desktop/mobile display.

# Security remediation
- [x] Restrict system settings to approved users and Master.
- [x] Remove obsolete public branding storage read policy.
- [x] Replace unavailable email-hook CORS import.
- [ ] Enable leaked-password protection: requires Supabase Pro and a change in the owner's external Supabase dashboard.
- [ ] Remediate completed deep-scan permission-helper warnings separately; existing security findings are outside the contracts implementation.

# Centralized contracts
- [x] Add persisted friendly client links, copy portal/login links, and optional login-first entry; preserve legacy links. Six tests passed; desktop/mobile login-first checked with an isolated directory fixture.
- [x] Persist contracts, module configuration and requests in Supabase; provide explicit import of browser-only records.
- [x] Resolve client links and apply persisted branding, including printed reports.
- [x] Manage real contract accounts with server-side authorization and active membership checks.
- [x] Verify permission rules and signed-out desktop/mobile entry flows; confirm seeded contracts/memberships and error-free builds.
- [ ] Validate authenticated save/reload, new-account creation and cross-contract UI end-to-end: external Supabase has no managed test session.