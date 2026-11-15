## Platform rules
- Supabase is the authoritative store for contracts, memberships and requests; browser storage is only an explicit legacy import source.
- Contract memberships are separate from EBD hierarchical roles; contract access never replaces existing congregation/class RLS.
- Public contract resolution exposes branding and enabled modules only; billing and user directories require authenticated scoped access.
- Client simulation changes presentation only and never grants permissions; database authorization uses the real authenticated identity.