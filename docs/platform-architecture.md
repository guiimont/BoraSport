# Arquitetura de produto: remador e organizacoes

## Decisao aprovada

O BoraSport e uma unica plataforma de va'a com dois ambientes conectados:

- **Meu Va'a**, experiencia pessoal e comunitaria do remador;
- **Organizacao**, ambiente operacional de clubes e grupos.

Nao serao criados dois aplicativos, duas contas ou dois perfis esportivos. A
mesma pessoa pode remar individualmente, participar de grupos e manter vinculo
com um ou mais clubes.

## Tipos de organizacao

### Grupo

Coletivo informal de remadores, como o Kardume Nui. Um grupo pode organizar
remadas, reunir participantes, manter agenda e compartilhar atividades sem
exigir estrutura de escola ou clube.

Um grupo nao exige base operacional, patrimonio, professor, planos,
mensalidades ou composicao de canoa coletiva.

### Clube

Organizacao operacional que pode manter bases, agenda, profissionais,
remadores, canoas, equipamentos, presencas, planos e financeiro.

Grupo e clube compartilham identidade, membros, agenda e atividades quando
aplicavel, mas possuem capacidades diferentes. Um grupo podera evoluir para
clube sem recriar contas ou perder historico.

## Atividade como nucleo comum

`Atividade` e o registro esportivo central da plataforma. Ela pertence ao
remador e pode, mediante contexto e permissao, relacionar-se com grupo, clube,
sessao publicada, professor, base, canoa ou evento.

Uma atividade pode ser criada por importacao FIT, GPX ou TCX, integracao
autorizada, registro manual simplificado ou realizacao de uma sessao publicada.

Prescricao e realizacao nao sao o mesmo registro:

- o **treino** descreve o que o professor planejou;
- a **sessao** publica quando e onde esse treino podera acontecer;
- a **atividade** registra o que o remador efetivamente realizou.

## Publicacao de treino e presenca

O professor cria ou reutiliza um treino e o vincula a uma sessao da agenda. Ao
publicar a sessao, o treino fica disponivel no perfil do clube para consulta
voluntaria.

**Nao enviar notificacao automatica ao aluno apenas porque um treino foi
publicado.** O remador acessa o perfil do clube e consulta a agenda quando
quiser.

A presenca podera ser confirmada por inscricao ou reserva, check-in, atividade
importada e vinculada a sessao, ou confirmacao do treinador. Reserva representa
intencao e nao deve ser tratada automaticamente como prova de presenca.

A vinculacao de uma atividade importada a uma sessao precisa de criterios
auditaveis e possibilidade de correcao.

## Navegacao do remador

O primeiro nivel deve ter no maximo quatro destinos:

1. **Inicio**: resumo pessoal e feed comunitario;
2. **Remadas**: historico, calendario, estatisticas e importacoes;
3. **Explorar**: remadores, grupos, clubes, eventos e rankings;
4. **Perfil**: identidade, privacidade, conexoes e integracoes.

Registrar ou importar atividade e uma acao contextual destacada, nao um quinto
modulo permanente.

## Navegacao do clube

O primeiro nivel deve ter quatro areas:

1. **Hoje**: agenda imediata, alertas, pendencias e acoes frequentes;
2. **Operacao**: agenda, treinos, bases, canoas e equipamentos;
3. **Pessoas**: remadores, profissionais, equipe, turmas e convites;
4. **Gestao**: planos, financeiro, relatorios e configuracoes.

As rotas atuais podem ser preservadas durante a migracao. O agrupamento visual
nao exige apagar funcionalidades nem alterar URLs de uma vez.

## Navegacao do grupo

O grupo deve expor apenas capacidades que possui:

1. **Inicio**;
2. **Agenda**;
3. **Pessoas**;
4. **Atividades**.

Recursos de clube nao devem aparecer desabilitados para um grupo. Eles ficam
ausentes ate que a organizacao mude de tipo ou habilite a capacidade aplicavel.

## Importacao e integracoes

Ordem aprovada de evolucao:

1. upload e leitura de FIT, GPX e TCX;
2. integracao autorizada com Strava;
3. integracao direta com Garmin Connect apos aprovacao do programa;
4. outros provedores conforme demanda comprovada.

O registro manual continua disponivel como contingencia e deve solicitar apenas
o minimo necessario.

## Privacidade

- peso e historico corporal permanecem estritamente privados;
- compartilhar atividade, rota, fotos ou estatisticas exige controles claros;
- rankings devem ser voluntarios;
- inicio e fim de rotas precisam suportar ocultacao;
- integracoes externas devem permitir conectar, revogar e excluir dados.

## Sequencia de implementacao

### Fundacao

- diferenciar grupo e clube no modelo de organizacao;
- consolidar `activity_records` como nucleo esportivo independente do tenant;
- manter vinculos opcionais com organizacao e sessao;
- definir permissoes e RLS antes de expor dados comunitarios;
- agrupar a navegacao administrativa sem remover rotas existentes.

### Captura esportiva

- registro manual simplificado;
- upload FIT, GPX e TCX;
- processamento, deduplicacao e revisao antes de publicar;
- vinculacao assistida entre atividade e sessao;
- historico pessoal.

### Comunidade inicial

- perfil do remador;
- grupos;
- feed de atividades com privacidade;
- conexoes;
- fotos;
- rankings voluntarios.

### Expansao

- Strava e Garmin Connect;
- eventos e desafios;
- videos;
- disponibilidade e reserva de canoas para visitantes;
- pagamentos e oportunidades do ecossistema.

## Limites da decisao

Esta arquitetura nao aprova silenciosamente criterios de ranking, algoritmo de
composicao de canoas, correspondencia automatica definitiva entre arquivo e
sessao, regras de cobranca, moderacao ou compartilhamento publico por padrao.
Esses comportamentos exigem validacao propria.
