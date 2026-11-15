export function canManageMembership(input: {
  isMaster: boolean;
  activeManager: boolean;
  suspended: boolean;
  targetIsManager: boolean;
  isSelf: boolean;
}) {
  if (input.isMaster) return true;
  return input.activeManager && !input.suspended && !input.targetIsManager && !input.isSelf;
}
