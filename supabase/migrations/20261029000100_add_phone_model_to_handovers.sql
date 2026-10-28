alter table public.handovers
  add column if not exists phone_model text;

alter table public.handovers
  drop constraint if exists handovers_phone_model_length_check,
  add constraint handovers_phone_model_length_check
    check (phone_model is null or char_length(btrim(phone_model)) between 1 and 100) not valid;

alter table public.handovers
  drop constraint if exists handovers_submitted_requires_phone_model_check,
  add constraint handovers_submitted_requires_phone_model_check
    check (status <> 'submitted' or phone_model is not null) not valid;