begin;
create extension if not exists pgtap;
select plan(4);
-- Run after `supabase db reset`; fixture IDs are resolved instead of hard-coded.
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('app_metadata', json_build_object('role','Client','client_id',(select id from public.clients where name='Nidhi Seeds')))::text, true);
select results_eq('select name from public.clients order by name', $$values ('Nidhi Seeds')$$, 'client reads only its client row');
select is((select count(*) from public.tasks), 6::bigint, 'client cannot read other client tasks');
select is((select count(*) from public.contacts), 0::bigint, 'client has no other-client contacts');
select isnt((select count(*) from public.clients), 16::bigint, 'client isolation prevents full CRM access');
select * from finish(); rollback;
