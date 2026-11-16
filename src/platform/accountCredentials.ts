export function buildCredentialUpdate(email: string, currentEmail: string, password: string, currentPassword: string) {
  const update: { email?: string; password?: string; current_password?: string } = {};
  if (email.trim() !== currentEmail) update.email = email.trim();
  if (password) {
    if (!currentPassword) throw new Error("Informe a senha atual.");
    update.password = password;
    update.current_password = currentPassword;
  }
  if (!update.email && !update.password) throw new Error("Nenhuma alteração informada.");
  return update;
}