-- Phase 9 Worker approval RPC. The Worker performs the configured owner-ID
-- check; this function serializes the state/hash check and decision writes.
CREATE OR REPLACE FUNCTION public.review_ai_command_action(
  p_action_id UUID,
  p_agency_id INTEGER,
  p_approver_id TEXT,
  p_decision TEXT,
  p_payload_hash TEXT,
  p_decision_note TEXT DEFAULT ''
)
RETURNS TABLE (
  action_id UUID,
  decision TEXT,
  payload_hash TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_row public.ai_command_actions%ROWTYPE;
  command_row public.ai_commands%ROWTYPE;
  approval_expiry TIMESTAMPTZ;
BEGIN
  IF p_action_id IS NULL OR p_agency_id IS NULL OR p_agency_id <= 0
     OR p_approver_id IS NULL OR length(btrim(p_approver_id)) = 0
     OR p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected')
     OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid command action review';
  END IF;

  SELECT * INTO action_row
  FROM public.ai_command_actions a
  WHERE a.id = p_action_id AND a.agency_id = p_agency_id
  FOR UPDATE;

  IF NOT FOUND OR action_row.status <> 'awaiting_approval'
     OR action_row.payload_hash <> p_payload_hash THEN
    RETURN;
  END IF;

  SELECT * INTO command_row
  FROM public.ai_commands c
  WHERE c.id = action_row.command_id AND c.agency_id = p_agency_id
  FOR UPDATE;

  IF NOT FOUND OR command_row.status <> 'awaiting_approval' THEN
    RETURN;
  END IF;

  approval_expiry := NOW() + INTERVAL '15 minutes';

  INSERT INTO public.ai_approvals
    (action_id, agency_id, approver_id, decision, payload_hash, decision_note, expires_at)
  VALUES
    (p_action_id, p_agency_id, p_approver_id, p_decision, p_payload_hash,
     COALESCE(left(p_decision_note, 1000), ''), approval_expiry);

  UPDATE public.ai_command_actions
  SET status = p_decision, updated_at = NOW()
  WHERE id = p_action_id;

  UPDATE public.ai_commands
  SET status = p_decision, updated_at = NOW()
  WHERE id = command_row.id;

  RETURN QUERY SELECT p_action_id, p_decision, p_payload_hash, approval_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.review_ai_command_action(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_ai_command_action(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.review_ai_command_action(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT)
  IS 'Atomically records a hash-bound owner approval/rejection for an awaiting agency action.';
