## Platform rules
- Supabase is the authoritative store for contracts, memberships and requests; browser storage is only an explicit legacy import source.
- Contract memberships are separate from EBD hierarchical roles; contract access never replaces existing congregation/class RLS.
- Public contract resolution exposes branding and enabled modules only; billing and user directories require authenticated scoped access.
- Client simulation changes presentation only and never grants permissions; database authorization uses the real authenticated identity.
- Public branding is projected into a separate read-only directory table; private-schema triggers synchronize it without exposing commercial fields.
- Linked ministry and contract branding synchronize bidirectionally through depth-guarded triggers so either editor updates the same identity.
- Real contract accounts are provisioned only through authenticated administrative edge functions; church managers additionally receive the linked ministry role.