# Prontidao para teste real

O BoraSport so entra em teste com um clube quando o fluxo completo estiver
verificado. Ter uma tela pronta ou conseguir criar uma primeira reserva nao e
criterio suficiente.

## Regras esportivas confirmadas

- usar `canoas` e `composicao das canoas` na linguagem do produto;
- nao usar `guarnicoes` como nome de area ou funcionalidade;
- nao cadastrar lado preferencial do remador;
- nao automatizar a composicao antes de validar criterios com treinadores.
- peso e historico corporal sao estritamente privados: somente o proprio
  remador pode consultar os valores;
- clube, administrador, treinador e outros remadores nunca recebem o peso
  individual;
- futuros calculos podem consumir o peso internamente, mas devem entregar
  somente o resultado operacional aprovado, sem revelar ou permitir deduzir
  medidas individuais.

## Portas de qualidade

| Porta | Evidencia exigida | Estado |
| --- | --- | --- |
| Modelo operacional | Bases, canoas, sessoes e vagas vinculadas ao mesmo clube | Implementado, migration pendente |
| Seguranca | RLS e permissoes administrativas verificadas no Supabase alvo | Pendente |
| Integridade | Canoa de outra base rejeitada no front e no banco | Implementado |
| Reserva | Reserva, lotacao, espera, cancelamento e promocao testados de ponta a ponta | Mecanica e avisos verificados em transacao; E2E autenticado pendente |
| Operacao | Gestor publica e treinador registra presenca pelo celular | Pendente |
| Experiencia | Estados vazios, erros, carregamento e responsividade revisados | Build aprovado; teste em aparelhos pendente |
| Observabilidade | Erros do teste identificaveis sem depender do relato do usuario | Pendente |

## Cenarios obrigatorios

1. Gestor cadastra duas bases e canoas distintas em cada uma.
2. Agenda de uma base exibe somente as canoas daquele local.
3. Tentativa direta de vincular canoa de outra base e rejeitada pelo banco.
4. Sessao publicada mostra base, ponto de encontro, horario e vagas.
5. Varios remadores disputam a ultima vaga sem overbooking.
6. Excedente entra na espera e o primeiro e promovido apos cancelamento.
7. Remador nao acessa dados administrativos de outro usuario ou clube.
8. Treinador registra presenca e falta em tela pequena.

## Regra de liberacao

O teste real com publico externo comeca somente quando todos os cenarios acima
passarem no ambiente conectado ao Supabase e no deploy de preview. Pendencias
devem ser registradas com responsavel, severidade e decisao de bloqueio.
