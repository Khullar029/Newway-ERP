-- ============================================================================
-- Storage — private bucket for content deliverables, client decks, invoice PDFs.
-- Objects are keyed as "<client_id>/<entity>/<filename>" so RLS can check the
-- leading path segment against the caller's client_id.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy attachments_select on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (is_internal() or (storage.foldername(name))[1] = jwt_client_id()::text)
  );

create policy attachments_insert on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and is_internal()
  );

create policy attachments_update on storage.objects for update
  using (bucket_id = 'attachments' and is_internal())
  with check (bucket_id = 'attachments' and is_internal());

create policy attachments_delete on storage.objects for delete
  using (bucket_id = 'attachments' and is_internal());
