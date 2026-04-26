create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  agency_id integer not null references agencies(id),
  client_id integer not null references clients(id),
  created_at timestamptz not null default now(),
  constraint conversations_request_id_key unique (request_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('client', 'admin', 'staff', 'system')),
  sender_id integer not null,
  message text not null,
  attachments jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_createdat
  on messages(conversation_id, created_at);

create index if not exists idx_conversations_request
  on conversations(request_id);

create index if not exists idx_conversations_client
  on conversations(client_id);
