create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_conversation_status') then
    create type support_conversation_status as enum (
      'OPEN',
      'WAITING_CLIENT',
      'WAITING_SUPPORT',
      'RESOLVED',
      'CLOSED'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_inquiry_category') then
    create type support_inquiry_category as enum (
      'Booking Concern',
      'Payment Concern',
      'Contract Concern',
      'Maid Replacement',
      'Technical Support',
      'General Inquiry'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_priority_level') then
    create type support_priority_level as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  end if;
end $$;

create table if not exists support_conversations (
  id bigserial primary key,
  client_id integer not null references clients(id) on delete cascade,
  agency_id integer not null references agencies(id),
  conversation_type text not null default 'support' check (conversation_type in ('support', 'agency')),
  agency_name text,
  subject text not null,
  description text not null default '',
  status support_conversation_status not null default 'OPEN',
  category support_inquiry_category not null default 'General Inquiry',
  priority support_priority_level not null default 'MEDIUM',
  assigned_admin_id integer references agency_admins(id) on delete set null,
  unread_client integer not null default 0,
  unread_admin integer not null default 0,
  last_message_preview text not null default '',
  last_message_at timestamptz not null default now(),
  client_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_conversations_scope_key unique (client_id, agency_id, conversation_type)
);

create index if not exists idx_support_conversations_agency_status_updated
  on support_conversations(agency_id, status, updated_at desc);

create index if not exists idx_support_conversations_client_updated
  on support_conversations(client_id, updated_at desc);

create table if not exists support_messages (
  id bigserial primary key,
  conversation_id bigint not null references support_conversations(id) on delete cascade,
  client_id integer not null references clients(id) on delete cascade,
  agency_id integer not null references agencies(id),
  conversation_type text not null default 'support' check (conversation_type in ('support', 'agency')),
  sender_role text not null check (sender_role in ('client', 'agency')),
  sender_name text not null,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_conversation_created
  on support_messages(conversation_id, created_at asc);

create table if not exists support_notifications (
  id bigserial primary key,
  conversation_id bigint not null references support_conversations(id) on delete cascade,
  message_id bigint references support_messages(id) on delete cascade,
  client_id integer not null references clients(id) on delete cascade,
  agency_id integer not null references agencies(id),
  recipient_type text not null check (recipient_type in ('client', 'admin')),
  recipient_admin_id integer references agency_admins(id) on delete cascade,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_notifications_recipient
  on support_notifications(recipient_type, agency_id, client_id, created_at desc);

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
