-- A adicao do valor fica isolada porque o PostgreSQL exige commit antes que
-- um novo valor de enum seja usado por indices, funcoes e politicas.
alter type public.booking_status add value if not exists 'waitlisted';
