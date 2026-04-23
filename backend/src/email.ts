export const sendClientConfirmationCodeEmail = async (
  _to: string,
  _code: string
) => {
  // Disabled: replaced with Supabase email verification.
  return { ok: false as const, error: 'disabled' as const }
}
