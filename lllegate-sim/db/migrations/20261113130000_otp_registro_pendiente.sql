alter table auth.otp_codigos
  add column datos_registro jsonb not null default '{}'::jsonb;
