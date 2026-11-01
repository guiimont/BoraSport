# BoraSport — Arquitetura de relançamento

## Objetivo

Transformar o BoraSport de um conjunto funcional construído por etapas em um produto comercial coeso, claro e pronto para piloto.

A entrega deve preservar as regras e os dados já implementados, reduzir complexidade visível, diferenciar papéis e elevar UI, UX, movimento e identidade.

## Princípios aprovados

1. Uma conta única acompanha a pessoa como remador, treinador e gestor.
2. A interface muda conforme o papel e o contexto ativo.
3. Termos culturais nunca substituem clareza funcional.
4. Termos taitianos aparecem como assinatura secundária: português primeiro, termo cultural como identidade.
5. A agenda profissional é a referência de densidade, navegação e acabamento para o restante do produto.
6. Complexidade operacional aparece progressivamente.
7. Mobile é superfície principal durante treino, presença e consulta do remador.
8. Nenhuma tela deve exigir que o usuário entenda a arquitetura interna do sistema.

## Arquitetura de acesso

### Entrada

Após autenticação, o sistema identifica os contextos disponíveis e direciona o usuário:

- somente remador → Área do Remador;
- treinador → Área do Treinador, com acesso ao perfil pessoal;
- gestor ou proprietário → Gestão do Clube, com acesso ao perfil pessoal;
- múltiplos vínculos → seletor de contexto e organização.

O seletor deve mostrar claramente:

- Meu perfil;
- clube ou grupo atual;
- papel exercido;
- ação para trocar de contexto.

## Área do remador

Navegação primária:

1. **Hoje** — próxima atividade, resumo semanal e ação principal;
2. **Atividades** — histórico, Garmin, FIT/GPX/TCX e detalhes;
3. **Evolução** — volume, frequência, distância, tempo e consistência;
4. **Perfil** — identidade, clubes, privacidade, dispositivos e conta.

Comunidade e descoberta entram como superfícies contextuais, não como obrigação no primeiro uso.

A primeira experiência deve funcionar sem vínculo com grupo ou clube.

## Área do treinador

Navegação primária:

1. **Hoje** — sessões, participantes, alertas e presença;
2. **Agenda** — dia, semana, quinzena e mês;
3. **Treinos** — biblioteca, prescrição e publicação;
4. **Remadores** — acompanhamento permitido, presença e feedback.

A tela de sessão é o centro operacional no celular.

O treinador não acessa financeiro, configurações comerciais ou dados privados do atleta.

## Área do gestor e proprietário

Navegação primária:

1. **Visão geral** — operação de hoje, pendências e indicadores;
2. **Agenda** — calendário profissional, recorrências e sessões;
3. **Operação** — bases, canoas, treinos e recursos;
4. **Pessoas** — remadores, treinadores, equipe e convites;
5. **Gestão** — página pública, configurações, planos e financeiro quando validados.

O papel de proprietário possui configurações institucionais e comerciais.
O papel de gestor opera o clube conforme as permissões atribuídas.

## Página pública do clube

Estrutura comercial e operacional:

1. identidade e proposta do clube;
2. próxima atividade;
3. agenda pública;
4. modalidades e níveis;
5. equipe e treinadores;
6. bases e localização;
7. informações para novos remadores;
8. ação de entrar, reservar ou solicitar contato.

A página não deve parecer um formulário de reservas cercado por um cabeçalho.

## Perfil público do remador

Exibe apenas dados autorizados:

- foto e nome;
- apresentação esportiva;
- clubes ou grupos públicos;
- volume e consistência opt-in;
- atividades compartilhadas;
- conquistas validadas;
- controles claros de conexão e privacidade.

E-mail, telefone, peso, coordenadas brutas e identificadores internos nunca são públicos.

## Sistema visual

### Base

Preservar:

- marinho profundo;
- turquesa-lagoa;
- bronze e dourado;
- osso e areia;
- verde e coral apenas como estados funcionais.

### Direção de acabamento

As referências de DropZone e Loja Broxada orientam qualidade, não aparência:

- tokens consistentes;
- hierarquia tipográfica forte;
- seções com identidade própria;
- cartões com função clara;
- microinterações rápidas;
- navegação responsiva;
- estados de foco e acessibilidade;
- movimento com intenção;
- uma assinatura visual reconhecível aplicada em todo o produto.

Não copiar paletas, componentes, textos, código, animações prontas, layouts ou grafismos das marcas.

### Protocolo de referência profissional

DropZone e Loja Broxada são estudos de referência do trabalho do Márcio. O que o BoraSport absorve é o raciocínio de design:

- hierarquia que orienta a próxima ação;
- ritmo consistente entre telas e estados;
- movimento vinculado a função e feedback;
- comportamento responsivo pensado como produto;
- microinterações que confirmam ações;
- acessibilidade, foco visível e redução de movimento;
- coerência entre identidade, interface e animação.

O processo será sempre: identificar a intenção da solução, reinterpretá-la a partir do problema do BoraSport e criar uma execução original. Elementos reconhecíveis, gestos de marca, composição, ativos e implementação dos projetos de referência não serão reproduzidos.

### Assinatura BoraSport

O gesto visual recorrente será inspirado em navegação oceânica e construção de canoas:

- linhas de rota;
- horizonte;
- ondulação;
- amarrações;
- estrelas de navegação;
- proa, remo e canoa como formas abstratas;
- padrões geométricos próprios e documentados.

Cada símbolo precisa ter origem, significado e uso registrados.

## Direção cultural

O BoraSport não deve misturar Maori, havaiano e taitiano como uma estética genérica.

Direção principal:

- linguagem taitiana já adotada pelo produto;
- cultura Va'a como centro;
- referências polinésias mais amplas apenas quando a origem for identificada;
- nenhum símbolo sagrado, tatuagem tradicional ou padrão cultural deve ser usado sem pesquisa e validação;
- evitar decoração folclórica e apropriação superficial.

## Movimento

Criar um sistema de movimento original do BoraSport, derivado da experiência do Va'a:

- **Corrente** — navegação e troca de contexto com deslocamento curto, fluido e previsível;
- **Remada** — confirmação de ações com impulso rápido e retorno controlado;
- **Esteira** — progresso, sincronização e carregamento como rastro contínuo, sem distração;
- **Maré** — expansão e recolhimento de painéis preservando continuidade espacial;
- **Horizonte** — estados ativos e orientação de página por linha, direção e posição;
- mudança de agenda mantendo relação visual entre dia, semana, quinzena e mês;
- feedback tátil e visual curto em reserva, presença e sincronização;
- nenhuma animação puramente decorativa em fluxos operacionais;
- suporte obrigatório a `prefers-reduced-motion`.

O movimento deve reforçar localização, causa e efeito. Ele não reproduzirá as assinaturas visuais ou sequências de animação dos projetos usados como referência.

## Ordem de implementação

### Sprint 1 — Estrutura

- shell único de produto;
- seletor de contexto;
- menus por papel;
- nomes funcionais em português;
- responsividade e estados de navegação;
- página pública de privacidade.

### Sprint 2 — Remador

- Hoje;
- Atividades;
- Evolução;
- Perfil e dispositivos;
- onboarding Garmin preparado.

### Sprint 3 — Treinador e agenda

- agenda profissional como componente central;
- Hoje do treinador;
- sessão móvel;
- presença e feedback.

### Sprint 4 — Gestão e páginas públicas

- visão geral;
- operação;
- pessoas;
- página pública do clube;
- perfil público do remador.

### Sprint 5 — Acabamento e lançamento

- estados vazios, carregamento e erro;
- acessibilidade;
- microinterações;
- teste mobile;
- teste por papel;
- observabilidade;
- piloto controlado.

## Fora do escopo desta repaginação

- inventar regras financeiras;
- automatizar composição de canoas sem validação;
- rankings públicos obrigatórios;
- publicar atividades por padrão;
- simular Garmin antes das credenciais;
- alterar banco sem necessidade comprovada.

## Critério de pronto

Uma pessoa nova deve conseguir responder, sem explicação externa:

1. onde está;
2. qual papel está usando;
3. qual é a próxima ação;
4. onde encontra agenda, atividades e perfil;
5. quais dados são pessoais e quais pertencem à operação do clube.
