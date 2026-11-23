-- Atomic text-chat append path. The Worker calls this RPC rather than
-- downloading and re-uploading the complete app_data JSON document.
-- Apply after the existing chat fast-path migrations.

CREATE TABLE IF NOT EXISTS public.helped_chat_send_requests (
  app_id text NOT NULL,
  send_token text NOT NULL,
  record_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app_id, send_token)
);
ALTER TABLE public.helped_chat_send_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.helped_chat_send_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.helped_chat_send_requests TO service_role;

CREATE OR REPLACE FUNCTION public.sync_query_tables_on_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_messages JSONB;
  v_new_messages JSONB;
  v_old_count INTEGER;
  v_is_append BOOLEAN := TRUE;
  v_index INTEGER;
BEGIN
  -- The atomic append RPC updates both chat indexes itself in this same
  -- transaction, so avoid scanning the full JSON history in this trigger.
  IF current_setting('helped.chat_append_fastpath', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    PERFORM public.refresh_helped_query_tables(NEW.id);
    RETURN NEW;
  END IF;

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
    SELECT NEW.id, COALESCE(public.helped_try_int(item->>'id'), ordinality::INTEGER),
      public.helped_try_int(item->>'clientId'), public.helped_try_int(item->>'agencyId'),
      item->>'conversationType', item->>'senderRole',
      public.helped_try_timestamptz(item->>'createdAt'), item
    FROM JSONB_ARRAY_ELEMENTS(v_new_messages) WITH ORDINALITY AS messages(item, ordinality)
    WHERE ordinality > v_old_count
    ON CONFLICT (app_id, record_id) DO UPDATE SET
      client_id = EXCLUDED.client_id, agency_id = EXCLUDED.agency_id,
      conversation_type = EXCLUDED.conversation_type, sender_role = EXCLUDED.sender_role,
      created_at = EXCLUDED.created_at, payload = EXCLUDED.payload, row_updated_at = NOW();
  ELSE
    DELETE FROM public.helped_query_chat_messages WHERE app_id = NEW.id;
    INSERT INTO public.helped_query_chat_messages (
      app_id, record_id, client_id, agency_id, conversation_type,
      sender_role, created_at, payload
    )
    SELECT NEW.id, COALESCE(public.helped_try_int(item->>'id'), ordinality::INTEGER),
      public.helped_try_int(item->>'clientId'), public.helped_try_int(item->>'agencyId'),
      item->>'conversationType', item->>'senderRole',
      public.helped_try_timestamptz(item->>'createdAt'), item
    FROM JSONB_ARRAY_ELEMENTS(v_new_messages) WITH ORDINALITY AS messages(item, ordinality);
  END IF;

  INSERT INTO public.helped_query_meta (app_id, refreshed_at, source_updated_at, source_bytes)
  VALUES (NEW.id, NOW(), NEW.updated_at, PG_COLUMN_SIZE(NEW.data))
  ON CONFLICT (app_id) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at,
    source_updated_at = EXCLUDED.source_updated_at, source_bytes = EXCLUDED.source_bytes;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_helped_chat_message(p_app_id text, p_message jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB;
  v_message JSONB;
  v_existing JSONB;
  v_send_token TEXT;
  v_existing_id INTEGER;
  v_next_id INTEGER;
BEGIN
  IF p_message IS NULL OR JSONB_TYPEOF(p_message) <> 'object' THEN
    RAISE EXCEPTION 'Chat message must be a JSON object';
  END IF;

  SELECT data INTO v_data
  FROM public.app_data
  WHERE id = p_app_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'App data row not found';
  END IF;
  IF JSONB_TYPEOF(COALESCE(v_data->'chatMessages', '[]'::JSONB)) <> 'array' THEN
    RAISE EXCEPTION 'Chat messages are not stored as an array';
  END IF;

  IF p_message->>'senderRole' = 'agency' THEN
    IF JSONB_TYPEOF(COALESCE(v_data->'clients', '[]'::JSONB)) <> 'array' THEN
      RAISE EXCEPTION 'Client records are unavailable';
    END IF;
    IF NOT EXISTS (
       SELECT 1 FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_data->'clients', '[]'::JSONB)) AS clients(item)
       WHERE public.helped_try_int(item->>'id') = public.helped_try_int(p_message->>'clientId')
    ) THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
  END IF;

  v_send_token := p_message->>'_sendToken';
  IF v_send_token IS NOT NULL THEN
    SELECT record_id INTO v_existing_id
    FROM public.helped_chat_send_requests
    WHERE app_id = p_app_id AND send_token = v_send_token;
    IF FOUND THEN
      SELECT payload INTO v_existing FROM public.helped_query_chat_messages
      WHERE app_id = p_app_id AND record_id = v_existing_id;
      IF FOUND THEN RETURN v_existing; END IF;
    END IF;
  END IF;

  v_next_id := GREATEST(
    COALESCE(public.helped_try_int(v_data #>> '{counters,chatMessages}'), 1),
    COALESCE((SELECT MAX(record_id) + 1 FROM public.helped_query_chat_messages WHERE app_id = p_app_id), 1)
  );
  v_message := (p_message - 'id' - '_sendToken') || JSONB_BUILD_OBJECT('id', v_next_id);

  PERFORM set_config('helped.chat_append_fastpath', 'on', true);
  UPDATE public.app_data
  SET data = jsonb_set(
    jsonb_set(COALESCE(data, '{}'::JSONB), '{chatMessages}',
      COALESCE(data->'chatMessages', '[]'::JSONB) || JSONB_BUILD_ARRAY(v_message), true),
    '{counters}', COALESCE(data->'counters', '{}'::JSONB) || JSONB_BUILD_OBJECT('chatMessages', v_next_id + 1), true)
  WHERE id = p_app_id;

  INSERT INTO public.helped_query_chat_messages (
    app_id, record_id, client_id, agency_id, conversation_type,
    sender_role, created_at, payload
  ) VALUES (
    p_app_id, v_next_id,
    public.helped_try_int(v_message->>'clientId'),
    public.helped_try_int(v_message->>'agencyId'),
    v_message->>'conversationType', v_message->>'senderRole',
    public.helped_try_timestamptz(v_message->>'createdAt'), v_message
  ) ON CONFLICT (app_id, record_id) DO UPDATE SET
    client_id = EXCLUDED.client_id, agency_id = EXCLUDED.agency_id,
    conversation_type = EXCLUDED.conversation_type, sender_role = EXCLUDED.sender_role,
    created_at = EXCLUDED.created_at, payload = EXCLUDED.payload, row_updated_at = NOW();

  INSERT INTO public.helped_query_meta (app_id, refreshed_at, source_updated_at, source_bytes)
  SELECT id, NOW(), updated_at, PG_COLUMN_SIZE(data) FROM public.app_data WHERE id = p_app_id
  ON CONFLICT (app_id) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at,
    source_updated_at = EXCLUDED.source_updated_at, source_bytes = EXCLUDED.source_bytes;

  IF v_send_token IS NOT NULL THEN
    INSERT INTO public.helped_chat_send_requests (app_id, send_token, record_id)
    VALUES (p_app_id, v_send_token, v_next_id)
    ON CONFLICT (app_id, send_token) DO NOTHING;
  END IF;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.append_helped_chat_message(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_helped_chat_message(text, jsonb) TO service_role;
