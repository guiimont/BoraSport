-- Defesa em profundidade: o acesso publico a bases e somente leitura.
revoke insert, update, delete, truncate, references, trigger
on public.company_locations
from anon;
