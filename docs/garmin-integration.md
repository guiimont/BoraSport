# Integração Garmin Connect

## Estado

- solicitação enviada em 09/09/2026;
- programa solicitado: Garmin Connect Developer Program;
- API solicitada: Activity API;
- estado atual: aguardando análise da Garmin;
- integração desativada em produção.

## Objetivo do primeiro ciclo

O remador conecta sua conta Garmin uma vez. Após sincronizar o relógio com o
Garmin Connect, a atividade de va'a entra automaticamente no histórico pessoal
do BoraSport, sem preenchimento ou upload manual.

## Fundação existente

`activity_records` já suporta origem externa por `provider` e `external_id`, com
unicidade por usuário. O parser FIT, GPX e TCX já está ativo. A integração Garmin
deverá reutilizar esse núcleo, sem criar um histórico esportivo paralelo.

## Configuração preparada

As credenciais são exclusivamente server-side:

- `GARMIN_INTEGRATION_ENABLED`;
- `GARMIN_CLIENT_ID`;
- `GARMIN_CLIENT_SECRET`;
- `GARMIN_OAUTH_AUTHORIZE_URL`;
- `GARMIN_OAUTH_TOKEN_URL`;
- `GARMIN_WEBHOOK_SECRET`.

Nenhuma variável Garmin pode usar o prefixo `NEXT_PUBLIC_`.

## Portas antes de ativar

1. Receber aprovação e documentação oficial.
2. Confirmar endpoints, escopos, assinatura de eventos e ciclo dos tokens.
3. Implementar OAuth 2.0 e revogação.
4. Persistir tokens de forma cifrada e inacessível ao cliente.
5. Validar assinatura antes de aceitar eventos.
6. Garantir idempotência por usuário, provider e atividade externa.
7. Testar conexão, sincronização, duplicidade, revogação e exclusão.
8. Somente então definir `GARMIN_INTEGRATION_ENABLED=true`.

Não criar callback, webhook ou conexão simulada antes de conhecer o contrato
oficial liberado no portal da Garmin.
