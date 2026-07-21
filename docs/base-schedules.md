# Grade-base de horários

Este documento registra a decisão de domínio da Grade-base do BoraSport.

## Papel da Grade-base

A Grade-base é o modelo operacional recorrente do clube. Ela organiza dia da
semana, horário, turma, treinador e canoas usadas normalmente.

Ela não publica vagas na agenda pública por si só. O fluxo futuro permanece:

Grade-base -> sessão publicada -> reservas -> escalação -> visualização da canoa.

## Regras confirmadas

- Um horário recorrente pertence a uma `company`.
- Um horário recorrente pode usar uma ou várias canoas.
- A mesma canoa não pode aparecer duas vezes no mesmo horário.
- A mesma canoa não pode ser usada em horários ativos sobrepostos no mesmo dia.
- Horários adjacentes, sem sobreposição, podem usar a mesma canoa.
- A duração do horário entra no cálculo de conflito.
- Canoas em manutenção ou inativas não podem ser adicionadas a novos horários.
- Se uma canoa já vinculada mudar de situação depois, o vínculo histórico é
  preservado e a interface deve apresentar alerta operacional.
- A capacidade pública do horário é a soma das vagas públicas das canoas
  vinculadas.
- A vaga pública de cada canoa usa `resources.capacity_maxima` e a
  `default_steerer_policy` operacional já aprovada.

## Fora do escopo desta fase

- Publicação semanal.
- Reservas.
- Participantes.
- Escalação.
- Posições V1-V6.
- Copiar semana anterior.
- Notificações.
