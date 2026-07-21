# Canoas, capacidade e leme

Este documento registra as regras aprovadas para o modulo operacional de canoas
do BoraSport. Ele complementa o motor de agenda e prepara a futura agenda
semanal sem alterar slots e reservas existentes.

## Classes reconhecidas

- `V1`: capacidade 1.
- `OC1`: capacidade 1.
- `V3`: capacidade 3.
- `OC4`: capacidade 4.
- `V6`: capacidade 6.
- `OC6`: capacidade 6.
- `Outro`: capacidade informada pelo clube.

Ao escolher uma classe conhecida, a capacidade operacional e derivada
automaticamente. Para `Outro`, a capacidade informada pelo clube continua sendo
obrigatoria.

`resources.capacity_maxima` permanece como fonte operacional real para lotacao.

## Compatibilidade

Registros antigos de `resources` podem existir sem `vessel_class`. O admin deve
mostrar esses registros como "Classe nao definida" e permitir que o gestor
complete o cadastro. O sistema nao deve classificar canoas legadas sem evidencia.

## Situacao operacional

Cada canoa pode estar em uma das situacoes:

- `disponivel`: pode ser usada em novas publicacoes futuras.
- `manutencao`: preserva historico, mas nao deve ser escolhida em novas
  publicacoes.
- `inativa`: preserva historico e relacoes existentes, mas fica fora da operacao
  ativa.

Nao apagar canoas com historico. A inativacao deve preservar relacoes existentes.

## Regra-padrao de leme

A regra de leme se aplica apenas a embarcacoes coletivas.

- `instrutor`: instrutor ocupa um assento e reduz uma vaga publica.
- `aluno`: aluno reserva normalmente e sera identificado futuramente como leme.
- `definir_treino`: a decisao fica pendente para cada treino publicado.

Para `V1` e `OC1`, a regra de leme nao se aplica.

A regra da canoa e um padrao. A futura agenda podera sobrescrever a decisao
apenas para uma sessao especifica.

## Fora do escopo desta fase

- Grade semanal recorrente.
- Montagem por posicao.
- V1-V6 como escala oficial publicada.
- Associar varias canoas ao mesmo horario.
- Upload de foto da canoa.
- Integracoes externas.
