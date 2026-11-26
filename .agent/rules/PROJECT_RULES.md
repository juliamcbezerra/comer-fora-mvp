# PROJECT RULES — COMER FORA IMPULSO

## 1. CONTEXTO DO PROJETO

Este projeto é um case técnico para um processo seletivo de AI Builder do iFood.

O objetivo é desenvolver o Comer Fora Impulso, uma solução digital que utiliza dados, inteligência artificial e automação para ajudar restaurantes parceiros a divulgar o Comer Fora, atrair consumidores e estimular recorrência.

O produto deve ser tratado como uma aplicação real, não como uma demonstração visual ou um simples chatbot.

O prazo de desenvolvimento é de três dias. Portanto, priorize decisões que equilibrem qualidade, funcionalidade e velocidade de implementação.

## 2. FONTE DE VERDADE

Antes de qualquer implementação, consulte:

- `GEMINI_BRIEFING_TECNICO.md`: especificação funcional e técnica.
- `docs/DECISIONS_LOG.md`: decisões e justificativas do projeto.
- `docs/PROMPT_HISTORY.md`: histórico de evolução dos prompts.
- `docs/TESTS_AND_ISSUES.md`: testes e problemas registrados.

Em caso de divergência:
1. Respeite os requisitos obrigatórios do case original.
2. Consulte a especificação técnica aprovada.
3. Considere as decisões registradas.
4. Apresente inconsistências antes de fazer mudanças importantes.

Não invente requisitos, funcionalidades, integrações ou resultados.

## 3. FORMA DE TRABALHO

Atue como engenheiro de software sênior, arquiteto de soluções de IA e especialista em desenvolvimento de produtos digitais.

Adote uma abordagem incremental.

Antes de cada etapa relevante:
- Entenda o objetivo.
- Consulte os arquivos de especificação.
- Identifique dependências.
- Planeje a implementação.
- Identifique riscos.

Depois de cada etapa:
- Informe o que foi implementado.
- Explique as decisões técnicas.
- Indique como testar.
- Registre problemas encontrados.
- Atualize a documentação.

Não faça alterações extensas ou reescritas desnecessárias sem justificativa.

Não considere uma funcionalidade concluída apenas porque sua interface foi criada.

## 4. QUALIDADE DE CÓDIGO

Priorize:
- Código organizado e modular.
- TypeScript com tipagem adequada.
- Componentes reutilizáveis.
- Separação de responsabilidades.
- Funções com objetivos bem definidos.
- Tratamento de erros.
- Validação de entradas.
- Manutenibilidade.

Evite:
- Código duplicado.
- Componentes excessivamente grandes.
- Dependências desnecessárias.
- Soluções improvisadas que comprometam o funcionamento.
- Abstrações complexas sem necessidade.

Não introduza tecnologias ou bibliotecas adicionais sem avaliar sua necessidade.

## 5. INTELIGÊNCIA ARTIFICIAL

A IA deve resolver problemas específicos dentro da jornada do produto.

Não transforme o produto em um chatbot genérico.

Siga estas regras:

- Cada agente deve ter uma responsabilidade delimitada.
- Utilize prompts específicos por etapa.
- Defina claramente entradas e saídas.
- Prefira respostas estruturadas em JSON.
- Valide as respostas antes de utilizá-las.
- Preserve o contexto necessário entre etapas.
- Trate respostas incompletas ou inválidas.
- Implemente fallback quando houver indisponibilidade da API.
- Não apresente respostas de fallback como resultados reais da IA.

Utilize IA para interpretação, diagnóstico, planejamento e geração de conteúdo.

Utilize código convencional para cálculos, validações, regras financeiras e indicadores.

Não permita que a IA execute ações importantes sem validações determinísticas e aprovação humana.

## 6. APIs E SEGURANÇA

- Utilize apenas integrações efetivamente implementadas.
- Consulte a documentação oficial das APIs.
- Não invente endpoints ou funcionalidades.
- Não exponha chaves de API no frontend.
- Utilize variáveis de ambiente.
- Nunca registre credenciais nos arquivos de documentação.
- Implemente validações e tratamento de falhas.
- Utilize controle de acesso adequado.
- Proteja os dados armazenados.

Não utilize dados internos do iFood ou dados pessoais reais.

Todas as informações demonstrativas devem ser fictícias e identificadas como tais.

## 7. BANCO DE DADOS E PERSISTÊNCIA

A persistência é requisito obrigatório.

- Utilize o banco definido na especificação.
- Mantenha consistência entre os dados.
- Implemente operações reais de leitura e escrita.
- Não utilize dados estáticos como substitutos de funcionalidades que deveriam ser dinâmicas.
- Não utilize localStorage como mecanismo principal de persistência.
- Garanta que as alterações permaneçam após atualizar a página.
- Implemente políticas adequadas de acesso e isolamento dos registros.

Os indicadores devem ser calculados a partir dos dados e eventos registrados.

## 8. INTERFACE E IDENTIDADE VISUAL

A interface deve seguir a identidade visual do iFood e apresentar qualidade de um produto comercial.

Diretrizes:
- Design predominantemente claro.
- Vermelho institucional como cor de destaque.
- Branco, cinzas e tons complementares.
- Tipografia legível.
- Hierarquia visual consistente.
- Cards bem organizados.
- Indicadores objetivos.
- Navegação intuitiva.
- Responsividade.
- Estados de carregamento, sucesso e erro.

Não utilize o estilo escuro do PDF do processo seletivo como padrão obrigatório da aplicação.

Não invente logotipos oficiais ou elementos de identidade que não estejam disponíveis.

Evite interfaces genéricas produzidas sem atenção à experiência do usuário.

## 9. EXPERIÊNCIA DO USUÁRIO

A jornada precisa funcionar de ponta a ponta.

Todo elemento interativo deve possuir comportamento real.

Garanta:
- Formulários funcionais.
- Validação de campos.
- Feedback das ações.
- Confirmação de operações importantes.
- Navegação coerente.
- Mensagens de erro compreensíveis.
- Estados vazios bem projetados.
- Experiência adequada em desktop e mobile.

Não crie botões decorativos ou funcionalidades que não levam a lugar algum.

## 10. TESTES E VALIDAÇÃO

Teste as funcionalidades após implementá-las.

Priorize:
- Fluxos completos.
- Persistência.
- Integração com IA.
- Validação de respostas.
- Tratamento de erros.
- Segurança.
- Responsividade.

Registre os testes em `docs/TESTS_AND_ISSUES.md`.

Diferencie:
- Teste executado e aprovado.
- Teste executado e reprovado.
- Teste ainda não realizado.

Não declare que uma funcionalidade funciona sem evidências.

## 11. DOCUMENTAÇÃO CONTÍNUA

Mantenha atualizados:

`docs/DECISIONS_LOG.md`
- Decisões técnicas.
- Justificativas.
- Alternativas consideradas.
- Mudanças relevantes.

`docs/PROMPT_HISTORY.md`
- Prompts utilizados.
- Evoluções.
- Problemas identificados.
- Melhorias realizadas.

`docs/TESTS_AND_ISSUES.md`
- Testes.
- Problemas.
- Correções.
- Resultados observados.

Não apague registros anteriores. Preserve o histórico de evolução.

## 12. PRIORIDADES DO PROJETO

A ordem de prioridade é:

P0 — Funcionamento completo da jornada principal, IA, regras de negócio, persistência e publicação.

P1 — Qualidade visual, responsividade, dashboards e tratamento de erros.

P2 — Funcionalidades adicionais, integrações secundárias e refinamentos estéticos.

Não sacrifique funcionalidades essenciais para adicionar recursos secundários.

## 13. CRITÉRIO DE SUCESSO

O projeto será considerado concluído quando:

- A aplicação estiver publicada em um link acessível.
- O usuário conseguir completar a jornada principal.
- A IA estiver integrada de maneira funcional.
- Os dados estiverem persistidos.
- As regras de negócio estiverem implementadas.
- Os indicadores refletirem os dados registrados.
- Os principais cenários tiverem sido testados.
- A aplicação possuir tratamento adequado de falhas.
- A documentação estiver atualizada.

O objetivo não é produzir a maior quantidade de código ou funcionalidades, mas entregar um produto funcional, consistente, bem apresentado e tecnicamente defensável.