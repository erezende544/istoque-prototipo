# IS.TOQUE no Figma: protótipo de alta fidelidade

Arquivo no Figma: **https://www.figma.com/design/lzqDPhDmWXvfqF5hGT7hQv**

As telas do `index.html` foram convertidas em camadas editáveis do Figma, não em capturas de tela: frames com auto layout, componentes com variantes, cores ligadas a variáveis, textos ligados a estilos e um protótipo navegável.

## Situação do arquivo e como concluir a geração

A integração com o Figma (MCP) já criou no arquivo:

- as 3 páginas, que é o limite do plano Starter;
- 37 variáveis de cor (coleção “ISTOQUE · Cores”) e 52 estilos de texto;
- 27 ícones, 10 ilustrações e 2 imagens (mascote e textura) como componentes;
- os primeiros componentes da biblioteca: Topbar, Avatar, Botão de ícone e Botão.

O plano Starter com assento View permite **20 chamadas ao MCP por mês**, e essa cota acabou durante a criação dos componentes. O restante (biblioteca completa, logo vetorizada, 47 telas e interações) está empacotado num **plugin de desenvolvimento** que faz o mesmo trabalho dentro do próprio Figma, sem esse limite:

1. Abra o **Figma para desktop**, já que plugins em desenvolvimento só rodam no app.
2. Abra o arquivo acima. Também funciona num arquivo em branco: o plugin cria tudo do zero.
3. Vá em **Plugins → Desenvolvimento → Importar plugin do manifesto…** e escolha `figma/plugin/manifest.json` deste repositório.
4. Rode **Plugins → Desenvolvimento → ISTOQUE · Gerar protótipo**. Leva de um a três minutos e termina com um resumo (telas, componentes, interações).

O plugin aproveita o que já existe no arquivo (variáveis, estilos, ícones e componentes) e só reconstrói as telas. Pode ser rodado de novo sem duplicar nada.

### Para apresentar o protótipo

1. Abra a página **02 · Telas Desktop e Modais** e, na aba *Prototype*, escolha o dispositivo **Desktop (1440 × 1024)**.
2. Clique em ▶ *Present* e escolha um dos fluxos: *Desktop · 1. Acesso*, *2. Aplicativo* ou *3. Mapa de fluxos*.
3. Na página **03 · Telas Mobile**, use um iPhone de 390 px (13, 14 ou 15) com os fluxos *Mobile · 1. Acesso* e *2. Aplicativo*.

## O que o arquivo contém

### 01 · Capa e Design System
- **Capa** com índice das páginas.
- **Logo**: seção ao lado da capa com a logo vetorizada e as variações (detalhes em [Logo](#logo)).
- **Fundamentos**: paleta (amostras ligadas às variáveis) e tipografia (um exemplo por estilo de texto).
- **Ícones** (27), **Ilustrações** (10) e **Imagens** (2).
- **Componentes**: 147 variantes em 25 conjuntos, cada um com descrição e propriedades (Estilo, Tom, Estado, Tipo, Tamanho, Plataforma…).

| Conjunto | Variantes | Conjunto | Variantes |
|---|---|---|---|
| Botão | 22 | Campo | 18 |
| Card de indicador | 10 | Campo de acesso | 9 |
| Badge | 8 | Link | 8 |
| Botão de ícone | 7 | Item de navegação | 7 |
| Item de lista | 6 | Card de fluxo | 6 |
| Avatar | 5 | Aviso | 5 |
| Card de receita | 5 | Aba | 4 |
| Card de perfil | 4 | Segmento | 4 |
| Checkbox | 3 | Cabeçalho do modal | 3 |
| Topbar · Sidebar · Rodapé · Busca | 2 cada | Card de produto · Item de navegação mobile | 2 cada |
| Navegação mobile | 1 | | |

### 02 · Telas Desktop e Modais (1440 px)
| Seção | Frames |
|---|---|
| 1 · Acesso | Login, Login · erro de validação, Cadastro da empresa, Cadastro · erro de validação, Modal · Recuperar acesso, Modal · Recuperação simulada |
| 2 · Visão geral e estoque | Visão geral, Estoque, Estoque · somente estoque baixo, Estoque · busca sem resultado, Produto · detalhe |
| 3 · Movimentações, receitas e reposição | Movimentações, Receitas, Receita · ficha técnica, Reposição, Importação de nota, Importação · revisão da nota |
| 4 · Relatórios, equipe e fluxos | Relatórios, Equipe, Mapa de fluxos |
| 5 · Modais e feedback | Movimentar estoque (vazio e preenchido), Registrar produção (normal, acima da capacidade e concluída), Novo produto, Editar produto, Nova receita, Editar ficha técnica, Novo usuário, Alertas, Toast “Demonstração reiniciada” |

### 03 · Telas Mobile (390 px)
Login, Cadastro, Visão geral, Menu lateral aberto, Estoque, Produto, Movimentações, Modal · Movimentar estoque, Receitas, Receita, Reposição, Relatórios, Equipe, Importação e Mapa de fluxos.

### Protótipo navegável
O plugin liga **422 interações**:

- **Navegação:** a sidebar, a barra inferior do mobile, o menu lateral, os links “Ver todos” e “← Voltar…”, os cards de produto e de receita e os atalhos do mapa de fluxos levam às telas correspondentes.
- **Modais:** abrem como *overlay* sobre a tela, com o fundo escurecido e desfocado como no HTML. “Fechar” e “Cancelar” fecham o overlay. Algumas ações trocam de estado: “Simular recuperação” mostra a recuperação simulada, “Confirmar produção” mostra a produção registrada e clicar na quantidade simula o preenchimento ou o excesso de capacidade.
- **Toast:** “Reiniciar demonstração” mostra o toast, que some sozinho depois de 2,5 s.

As telas mais altas que a janela rolam na apresentação, e a sidebar fica fixa.

## Logo

A logo do app (símbolo de caixa + “ISTOQUE.”) foi vetorizada a partir do próprio `index.html`. As letras são os contornos reais da fonte Poppins Bold embutida no HTML, posicionadas com o mesmo tamanho, espaçamento entre letras (1 px) e linha de base da sidebar. O traço do símbolo virou forma preenchida, então a logo escala sem depender de fonte nem de espessura de traço.

Os arquivos SVG estão em [`figma/logo/`](logo). No Figma, cada versão vira um componente (`Logo/…`) com as cores ligadas às variáveis, na seção **Logo** ao lado da capa.

| Arquivo | Versão | Origem |
|---|---|---|
| `istoque-logo-desktop.svg` | Logo da sidebar desktop: símbolo de 29 px e texto de 25 px, para fundos escuros | HTML |
| `istoque-logo-mobile.svg` | Logo do menu lateral mobile: o mesmo símbolo de 29 px com texto de 22 px | HTML |
| `istoque-simbolo.svg` | Só o símbolo, em âmbar | HTML |
| `istoque-logo-fundo-claro.svg` | Símbolo e texto em teal, ponto em âmbar, para fundos claros | Derivada (não existe no HTML) |

## Fidelidade

Cada tela foi validada antes de virar plugin. A mesma especificação que o plugin desenha no Figma foi renderizada com uma emulação do auto layout do Figma e comparada, pixel a pixel, com capturas do `index.html` original (`pipeline/render.js`):

A mediana ficou em **0,37%** de pixels diferentes.

| Faixa de diferença | Telas |
|---|---|
| até 0,5% dos pixels | 27 das 47: todas as telas mobile (exceto o modal) e Login, Cadastro, Estoque · baixo, Estoque · vazio, Produto, Movimentações, Reposição, Relatórios, Equipe e Importação no desktop |
| 0,5% a 3% | 16: os 13 modais desktop, Receitas, Receita e Mapa de fluxos. Nos modais, a diferença vem do deslocamento sub-pixel da captura do diálogo |
| acima de 3% | 4. Visão geral e Estoque desktop: no Figma a sidebar continua até o fim da página (como fica fixa na rolagem), mas a captura de página inteira do HTML só a mostra na primeira dobra. Toast e modal mobile: frames pequenos, em que poucos pixels de borda e de sub-pixel pesam na porcentagem |

O plugin também passou por:

- **um teste ponta a ponta** com uma simulação estrita da API do Figma (`pipeline/mockfigma.js`), que confere propriedades, enums, tintas, fontes carregadas, regras de auto layout e o formato das interações. Resultado: 47 telas, 147 componentes, 422 interações, nenhum erro e uma segunda execução idempotente;
- **uma checagem de tipos** contra as tipagens oficiais `@figma/plugin-typings`.

No próprio Figma, os quatro primeiros componentes foram montados com a mesma biblioteca e conferidos com 0 divergências de layout.

## Como foi gerado (e como regenerar)

`pipeline/` contém as ferramentas que leram o `index.html` e geraram o plugin:

| Etapa | Script | O que faz |
|---|---|---|
| 1 | `prepare_assets.js` | extrai do `index.html` o bundle JS e as fontes embutidas |
| 2 | `run_extract.js` + `extract.js` | abre o protótipo no Chromium (Playwright) em 32 estados desktop e 15 mobile e serializa geometria, estilos, textos e ícones |
| 3 | `convert.js` | transforma a árvore do DOM em especificação Figma: decide o auto layout simulando o algoritmo do Figma e confere cada posição |
| 4 | `components.js` | detecta padrões repetidos e cria componentes, variantes e overrides (texto, ícone, cor, tamanho) |
| 5 | `links.js` | define as interações do protótipo a partir dos textos e componentes de cada tela |
| 5b | `make_logo.py` | vetoriza a logo (contornos da Poppins Bold, traço do símbolo convertido em forma) e grava os SVGs em `figma/logo/` |
| 6 | `gen_plugin.js` | junta dados, construtor (`lib.js`) e execução (`plugin_main.js`) em `plugin/code.js` |
| 7 | `runmock.js`, `render.js` | teste com a API simulada e validação visual |

```bash
cd figma/pipeline
npm install          # playwright e pngjs
pip install fonttools skia-pathops   # usados por make_logo.py
npm run build        # etapas 1 a 6 + teste com a API simulada
npm run test:visual  # opcional: compara as telas com o index.html
```

`arts.json`, `mascot_pal.png` e `texture_2bit.png` são as ilustrações e imagens já extraídas e otimizadas do `index.html`. As imagens foram reduzidas a paletas pequenas para caber na integração.

## Limitações conhecidas

- Controles nativos, como a seta do `<select>`, o calendário do campo de data e o redimensionador do `<textarea>`, são desenhados com os ícones da biblioteca e não com a aparência do navegador.
- As fontes são Inter e Poppins, disponíveis no Figma pelo Google Fonts.
- O plano Starter limita o arquivo a 3 páginas. Por isso os modais ficam na mesma página das telas desktop, numa seção própria.
