alter table public.conductores_detalles
  add column color text
    check (color is null or char_length(btrim(color)) between 1 and 40);
