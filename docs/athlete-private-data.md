# Dados privados do remador

## Decisao aprovada

O peso do remador nao e dado do clube. O valor e informado pelo proprio usuario
no cadastro por convite ou no perfil e permanece visivel somente para ele.

Administradores, treinadores, profissionais, outros remadores e paginas publicas
nao podem consultar o peso nem o historico de medidas.

## Uso pelo produto

O BoraSport podera usar o valor internamente em calculos esportivos futuros,
desde que:

- a regra do calculo seja validada com treinadores antes da implementacao;
- o resultado entregue ao clube nao revele pesos individuais;
- o resultado nao permita deduzir com facilidade a medida de um remador;
- nenhuma consulta administrativa receba a tabela de medidas ou seus campos.

O sistema nao automatiza a composicao das canoas nesta etapa. A coleta privada
prepara a base para um futuro apoio ao treinador, sem transformar uma hipotese
esportiva em regra definitiva.

## Implementacao

- `athlete_body_measurements` mantem o historico individual.
- RLS permite leitura, inclusao e exclusao apenas quando `auth.uid() = user_id`.
- `anon` nao possui acesso.
- O perfil compartilhado (`profiles`) nao contem peso.
- A interface administrativa nao consulta medidas corporais.
- O transporte durante a confirmacao do cadastro usa cookie `HttpOnly`, removido
  depois que o registro privado e persistido.

## Lista de espera

As notificacoes internas de entrada e promocao da lista ficam em
`user_notifications`. Cada usuario le somente os proprios avisos. A aplicacao
nao concede insercao direta: os avisos sao criados pelo gatilho interno do fluxo
de reservas.
