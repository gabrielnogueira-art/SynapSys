import { canManageMembership } from './permissions.ts';
function assert(value: boolean) { if (!value) throw new Error('Permission assertion failed'); }
const base = { isMaster: false, activeManager: true, suspended: false, targetIsManager: false, isSelf: false };
Deno.test('Master manages every contract', () => assert(canManageMembership({ ...base, isMaster: true, suspended: true, targetIsManager: true })));
Deno.test('Contract manager cannot promote another manager', () => assert(!canManageMembership({ ...base, targetIsManager: true })));
Deno.test('Contract manager cannot manage another contract', () => assert(!canManageMembership({ ...base, activeManager: false })));
Deno.test('Suspended contract denies manager changes', () => assert(!canManageMembership({ ...base, suspended: true })));
Deno.test('Active manager can manage operational colleagues', () => assert(canManageMembership(base)));
