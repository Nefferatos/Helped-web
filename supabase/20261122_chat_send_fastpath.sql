-- Keep customer support chat saves from rebuilding every dashboard query index.
-- Normal chat appends update only the new chat rows; non-chat app_data changes
-- retain the existing full refresh behavior.

CREATE OR REPLACE FUNCTION public.sync_query_tables_on_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_messages JSONB;
  v_new_messages JSONB;
  v_old_count    INTEGER;
  v_is_append    BOOLEAN := TRUE;
  v_index        INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    PERFORM public.refresh_helped_query_tables(NEW.id);
    RETURN NEW;
  END IF;

  -- Only take the fast path when chatMessages (and optionally its counter)
  -- are the sole JSON changes. All other changes use the established refresh.
  IF (OLD.data - 'chatMessages' - 'counters')
       IS DISTINCT FROM (NEW.data - 'chatMessages' - 'counters')
     OR (COALESCE(OLD.data->'counters', '{}'::JSONB) - 'chatMessages')
       IS DISTINCT FROM (COALESCE(NEW.data->'counters', '{}'::JSONB) - 'chatMessages')
     OR OLD.data->'chatMessages' IS NOT DISTINCT FROM NEW.data->'chatMessages' THEN
    PERFORM public.refresh_helped_query_tables(NEW.id);
    RETURN NEW;
  END IF;

  v_old_messages := COALESCE(OLD.data->'chatMessages', '[]'::JSONB);
  v_new_messages := COALESCE(NEW.data->'chatMessages', '[]'::JSONB);

  IF JSONB_TYPEOF(v_old_messages) <> 'array' OR JSONB_TYPEOF(v_new_messages) <> 'array' THEN
    PERFORM public.refresh_helped_query_tables(NEW.id);
    RETURN NEW;
  END IF;

  v_old_count := JSONB_ARRAY_LENGTH(v_old_messages);

  -- Appends are the normal send path. If any existing message changed or the
  -- array was truncated/reordered, rebuild just this app's chat index instead.
  IF JSONB_ARRAY_LENGTH(v_new_messages) < v_old_count THEN
    v_is_append := FALSE;
  ELSIF v_old_count > 0 THEN
    FOR v_index IN 0..(v_old_count - 1) LOOP
      IF v_old_messages->v_index IS DISTINCT FROM v_new_messages->v_index THEN
        v_is_append := FALSE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_is_append THEN
    INSERT INTO public.helped_query_chat_messages (
      app_id, record_id, client_id, agency_id, conversation_type,
      sender_role, created_at, payload
    )
    SELECT
      NEW.id,
      COALESCE(public.helped_try_int(item->>'id'), (ordinality)::INTEGER),
      public.helped_try_int(item->>'clientId'),
      public.helped_try_int(item->>'agencyId'),
      item->>'conversationType',
      item->>'senderRole',
      public.helped_try_timestamptz(item->>'createdAt'),
      item
    FROM JSONB_ARRAY_ELEMENTS(v_new_messages) WITH ORDINALITY AS messages(item, ordinality)
    WHERE ordinality > v_old_count
    ON CONFLICT (app_id, record_id) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      agency_id = EXCLUDED.agency_id,
      conversation_type = EXCLUDED.conversation_type,
      sender_role = EXCLUDED.sender_role,
      created_at = EXCLUDED.created_at,
      payload = EXCLUDED.payload,
      row_updated_at = NOW();
  ELSE
    DELETE FROM public.helped_query_chat_messages WHERE app_id = NEW.id;

    INSERT INTO public.helped_query_chat_messages (
      app_id, record_id, client_id, agency_id, conversation_type,
      sender_role, created_at, payload
    )
    SELECT
      NEW.id,
      COALESCE(public.helped_try_int(item->>'id'), (ordinality)::INTEGER),
      public.helped_try_int(item->>'clientId'),
      public.helped_try_int(item->>'agencyId'),
      item->>'conversationType',
      item->>'senderRole',
      public.helped_try_timestamptz(item->>'createdAt'),
      item
    FROM JSONB_ARRAY_ELEMENTS(v_new_messages) WITH ORDINALITY AS messages(item, ordinality);
  END IF;

  -- Keep metadata current without touching the other denormalized indexes.
  INSERT INTO public.helped_query_meta (app_id, refreshed_at, source_updated_at, source_bytes)
  VALUES (NEW.id, NOW(), NEW.updated_at, PG_COLUMN_SIZE(NEW.data))
  ON CONFLICT (app_id) DO UPDATE SET
    refreshed_at = EXCLUDED.refreshed_at,
    source_updated_at = EXCLUDED.source_updated_at,
    source_bytes = EXCLUDED.source_bytes;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_query_tables_on_save() TO service_role;
