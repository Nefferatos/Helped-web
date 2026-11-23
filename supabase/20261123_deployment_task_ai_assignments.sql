-- Add the separate durable Make outbox route used for staff-triggered AI
-- assignment of open, unassigned deployment checklist tasks.

ALTER TABLE public.make_webhook_deliveries
  DROP CONSTRAINT IF EXISTS make_webhook_deliveries_hook_key_check;

ALTER TABLE public.make_webhook_deliveries
  ADD CONSTRAINT make_webhook_deliveries_hook_key_check
    CHECK (hook_key IN (
      'applicant_intake', 'fdw_event', 'maid_referral_sheet', 'placement_milestone',
      'contractor_arrival', 'interview_scheduled', 'rolling_arrival_report',
      'deployment_task_event', 'deployment_task_assignment', 'marketing_campaign_event'
    ));
