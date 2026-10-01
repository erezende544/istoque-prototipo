# IS.TOQUE no Figma: protótipo de alta fidelidade

Arquivo no Figma: **https://www.figma.com/design/lzqDPhDmWXvfqF5hGT7hQv**

As telas do `index.html`, a landing page e a página de planos do site foram convertidas em camadas editáveis do Figma, não em capturas de tela. O arquivo tem frames com auto layout, componentes com variantes, cores ligadas a variáveis, textos ligados a estilos e um protótipo navegável. A landing page e os planos vieram dos PDFs exportados do outro arquivo do Figma (veja [Landing page e planos](#landing-page-e-planos)).

## Situação do arquivo e como concluir a geração

A integração com o Figma (MCP) já criou no arquivo:

- as 3 páginas, que é o limite do plano Starter;
- 37 variáveis de cor (coleção “ISTOQUE · Cores”) e 52 estilos de texto;
- 27 ícones, 10 ilustrações e 2 imagens (mascote e textura) como componentes;
- os primeiros componentes da biblioteca: Topbar, Avatar, Botão de ícone e Botão.

O plano Starter com assento View permite **20 chamadas ao MCP por mês**, e essa cota acabou durante a criação dos componentes. O restante está empacotado num **plugin de desenvolvimento**, que faz o mesmo trabalho dentro do próprio Figma, sem esse limite: biblioteca completa, logo vetorizada, 49 telas e interações.

O plugin tem dois comandos:

| Comando | O que faz | Quando usar |
|---|---|---|
| **Gerar protótipo completo** | Cria a fundação, a biblioteca e todas as telas e liga as interações. Ao rodar de novo, aproveita variáveis, estilos e componentes, mas **reconstrói todas as telas**. | Num arquivo em que o plugin ainda não rodou. |
| **Adicionar ou atualizar landing page e planos** | Cria só a landing page e a página de planos, com as cores, os estilos de texto, as imagens e os componentes que elas usam. Também liga os botões às telas de Login e Cadastro que já estão no arquivo. As demais telas não são tocadas, e a capa e os fundamentos são atualizados com as novas cores e estilos. | Num arquivo em que o protótipo já foi gerado, para não perder edições feitas nas telas. |

Para rodar:

1. Abra o **Figma para desktop**, já que plugins em desenvolvimento só rodam no app.
2. Abra o arquivo acima. Também funciona num arquivo em branco, e nesse caso o plugin cria tudo do zero.
3. Vá em **Plugins → Desenvolvimento → Importar plugin do manifesto…** e escolha `figma/plugin/manifest.json` deste repositório. Se você já tinha importado uma versão anterior, basta substituir os arquivos da pasta do plugin, já que o Figma lê o `code.js` a cada execução. Se os novos arquivos estiverem em outra pasta, importe o `manifest.json` de novo.
4. Rode **Plugins → Desenvolvimento → ISTOQUE · Gerar protótipo** e escolha o comando. O completo leva de um a três minutos e o da landing page, alguns segundos. Os dois terminam com um resumo de telas, componentes e interações.

O plugin pode ser rodado de novo sem duplicar nada.

### Para apresentar o protótipo

1. Abra a página **02 · Telas Desktop e Modais** e, na aba *Prototype*, escolha o dispositivo **Desktop (1440 × 1024)**.
2. Clique em ▶ *Present* e escolha um dos fluxos: *Desktop · 0. Site (landing page)*, *1. Acesso*, *2. Aplicativo* ou *3. Mapa de fluxos*.
3. Na página **03 · Telas Mobile**, use um iPhone de 390 px (13, 14 ou 15) com os fluxos *Mobile · 1. Acesso* e *2. Aplicativo*.

## O que o arquivo contém

### 01 · Capa e Design System
- **Capa** com índice das páginas.
- **Logo**: seção ao lado da capa com a logo vetorizada e as variações (detalhes em [Logo](#logo)).
- **Fundamentos**: paleta (amostras ligadas às 39 variáveis) e tipografia (um exemplo para cada um dos 77 estilos de texto).
- **Ícones** (27), **Ilustrações** (10) e **Imagens** (6: mascote, textura e as 4 ilustrações da landing page).
- **Componentes**: 165 variantes em 33 conjuntos, cada um com descrição e propriedades (Estilo, Tom, Estado, Tipo, Tamanho, Plataforma…).

Componentes do aplicativo (147 variantes em 25 conjuntos):

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

Componentes do site (18 variantes em 8 conjuntos):

| Conjunto | Variantes | Uso |
|---|---|---|
| Site · Botão | 5 (Estilo: Âmbar, Teal, Contorno × Tamanho: Médio, Grande) | botões em pílula com seta |
| Site · Selo | 4 (Tom: Teal, Âmbar, Coral, Translúcido) | selos do hero, dos cards e “Popular” |
| Site · Botão social | 3 (Instagram, Facebook, Twitter) | rodapé |
| Site · Logo | 2 (Cabeçalho, Rodapé) | mascote com “Is.toque” e símbolo “Is” |
| Site · Cabeçalho de seção | 1 | sobretítulo, título e subtítulo das seções |
| Site · Card de funcionalidade | 1 | a ilustração e o tom do selo mudam em cada instância |
| Site · Passo | 1 | os três passos de “Como funciona” |
| Site · Item de plano | 1 | recursos dos planos, com check |

### 02 · Telas Desktop e Modais (1440 px)
| Seção | Frames |
|---|---|
| 0 · Site (landing page e planos) | Landing page, Planos |
| 1 · Acesso | Login, Login · erro de validação, Cadastro da empresa, Cadastro · erro de validação, Modal · Recuperar acesso, Modal · Recuperação simulada |
| 2 · Visão geral e estoque | Visão geral, Estoque, Estoque · somente estoque baixo, Estoque · busca sem resultado, Produto · detalhe |
| 3 · Movimentações, receitas e reposição | Movimentações, Receitas, Receita · ficha técnica, Reposição, Importação de nota, Importação · revisão da nota |
| 4 · Relatórios, equipe e fluxos | Relatórios, Equipe, Mapa de fluxos |
| 5 · Modais e feedback | Movimentar estoque (vazio e preenchido), Registrar produção (normal, acima da capacidade e concluída), Novo produto, Editar produto, Nova receita, Editar ficha técnica, Novo usuário, Alertas, Toast “Demonstração reiniciada” |

A seção do site fica acima das outras. Assim, num arquivo já gerado, ela entra sem empurrar nada de lugar.

### 03 · Telas Mobile (390 px)
Login, Cadastro, Visão geral, Menu lateral aberto, Estoque, Produto, Movimentações, Modal · Movimentar estoque, Receitas, Receita, Reposição, Relatórios, Equipe, Importação e Mapa de fluxos.

### Protótipo navegável
O plugin liga **437 interações**:

- **Navegação:** a sidebar, a barra inferior do mobile, o menu lateral, os links “Ver todos” e “← Voltar…”, os cards de produto e de receita e os atalhos do mapa de fluxos levam às telas correspondentes.
- **Modais:** abrem como *overlay* sobre a tela, com o fundo escurecido e desfocado como no HTML. “Fechar” e “Cancelar” fecham o overlay. Algumas ações trocam de estado: “Simular recuperação” mostra a recuperação simulada, “Confirmar produção” mostra a produção registrada e clicar na quantidade simula o preenchimento ou o excesso de capacidade.
- **Toast:** “Reiniciar demonstração” mostra o toast, que some sozinho depois de 2,5 s.
- **Site:** na landing page, “Home”, “Funcionalidades” e “Contato”, do menu e do rodapé, rolam suavemente até a seção correspondente, e a logo volta ao topo. “Planos” abre a página de planos, “Entrar” leva ao Login, e “Começar Grátis”, “Começar grátis agora” e “Criar minha conta grátis” levam ao Cadastro. Nos planos, “Começar Grátis” e “Assinar Pro” levam ao Cadastro, e “Falar com Vendas” volta para a landing page.

As telas mais altas que a janela rolam na apresentação, e a sidebar fica fixa.

## Landing page e planos

As duas telas foram reconstruídas a partir dos PDFs que o Figma exporta (`istoque-landing-page.pdf` e `Planos.pdf`), já que o arquivo original não pôde ser lido pela integração. Num PDF do Figma, cada texto vem com uma camada de texto invisível, que guarda as letras e suas posições, e com o desenho dos glifos, que guarda a cor. As formas vêm como caminhos vetoriais e as ilustrações como imagens embutidas. O script `pipeline/site/pdfprims.py` lê tudo isso. Depois, `pipeline/site/site_spec.js` monta as telas no mesmo formato das demais:

- **Textos editáveis** em Inter e Poppins, as fontes já usadas no protótipo. A fonte e o peso de cada texto foram identificados pela largura dos caracteres. O espaçamento entre letras, a altura de linha e a caixa alta também vêm do PDF.
- **Auto layout em todas as seções** (cabeçalho, hero, funcionalidades, “Como funciona”, chamada final, rodapé e os três planos). Os espaçamentos foram calculados a partir das medidas do PDF: 120 px de margem nas seções, 64 px entre o título e os cards, 32 px entre os elementos do hero…
- **Componentes do site** (tabela acima), usados como instâncias nas duas telas.
- **Imagens originais:** as quatro ilustrações (1536 × 1024) entram sem recompressão, recortadas como no layout. A logo do cabeçalho reaproveita a imagem do mascote que já existe no arquivo.
- **Efeitos e contornos:** a borda âmbar e a sombra do plano Pro viraram contorno e sombra do Figma (sombra âmbar a 8%, deslocamento de 8 px e desfoque de 24 px). No PDF, essa sombra era uma imagem.

Detalhes que vale saber:

- **Fontes:** os números “01”, “02” e “03” dos passos usavam uma fonte monoespaçada no PDF e foram trocados por Inter, como combinado. Nos demais textos, as fontes do PDF já eram Inter e Poppins.
- **Selo invisível no hero:** no original, o primeiro selo do hero (“Nº1 EM GESTÃO DE ESTOQUE”) tem texto teal sobre o fundo teal da seção, então só aparece o contorno. Foi mantido assim. Para deixá-lo legível, basta trocar o tom da instância para “Translúcido”.
- **Página de planos:** é um frame próprio, como no arquivo original, e não uma seção da landing page. O menu “Planos” leva até ela.
- **Estrela do selo “Focado em Restaurantes”:** é o caractere ★ dentro do próprio texto, como no arquivo original, e não um ícone separado.

## Logo

A logo do app (símbolo de caixa + “ISTOQUE.”) foi vetorizada a partir do próprio `index.html`. As letras são os contornos reais da fonte Poppins Bold embutida no HTML, posicionadas com o mesmo tamanho, espaçamento entre letras (1 px) e linha de base da sidebar. O traço do símbolo virou forma preenchida, então a logo escala sem depender de fonte nem de espessura de traço.

Os arquivos SVG estão em [`figma/logo/`](logo). No Figma, cada versão vira um componente (`Logo/…`) com as cores ligadas às variáveis, na seção **Logo** ao lado da capa. A logo do site (mascote com “Is.toque” e símbolo “Is”) está no componente **Site · Logo**, em texto editável.

| Arquivo | Versão | Origem |
|---|---|---|
| `istoque-logo-desktop.svg` | Logo da sidebar desktop: símbolo de 29 px e texto de 25 px, para fundos escuros | HTML |
| `istoque-logo-mobile.svg` | Logo do menu lateral mobile: o mesmo símbolo de 29 px com texto de 22 px | HTML |
| `istoque-simbolo.svg` | Só o símbolo, em âmbar | HTML |
| `istoque-logo-fundo-claro.svg` | Símbolo e texto em teal, ponto em âmbar, para fundos claros | Derivada (não existe no HTML) |

## Fidelidade

Cada tela foi validada antes de virar plugin. A mesma especificação que o plugin desenha no Figma foi renderizada com uma emulação do auto layout do Figma e comparada, pixel a pixel, com a referência (`pipeline/render.js`). Nas telas do app, a referência são capturas do `index.html`. Na landing page e nos planos, é o próprio PDF rasterizado.

Nas 47 telas do app, a mediana ficou em **0,37%** de pixels diferentes.

| Faixa de diferença | Telas |
|---|---|
| até 0,5% dos pixels | 27 das 47: todas as telas mobile (exceto o modal) e Login, Cadastro, Estoque · baixo, Estoque · vazio, Produto, Movimentações, Reposição, Relatórios, Equipe e Importação no desktop |
| 0,5% a 3% | 16: os 13 modais desktop, Receitas, Receita e Mapa de fluxos. Nos modais, a diferença vem do deslocamento sub-pixel da captura do diálogo |
| acima de 3% | 4. Visão geral e Estoque desktop: no Figma a sidebar continua até o fim da página (como fica fixa na rolagem), mas a captura de página inteira do HTML só a mostra na primeira dobra. Toast e modal mobile: frames pequenos, em que poucos pixels de borda e de sub-pixel pesam na porcentagem |

Na landing page e nos planos houve duas conferências:

- **Geométrica:** antes de gravar as telas, `site_spec.js` refaz o auto layout com as regras do Figma, inclusive o arredondamento da linha de base dos textos, e compara o resultado com o PDF. Foram conferidos 107 textos, botões e cards, e todos ficaram a menos de 0,75 px da posição original.
- **Visual:** a diferença foi de **1,8%** dos pixels na landing page e de **2,7%** nos planos. Ela fica nas bordas das letras, porque o navegador desenha os glifos e posiciona a linha de base de um jeito um pouco diferente do PDF, e nos números dos passos, que mudaram de fonte.

O plugin também passou por:

- **um teste ponta a ponta** com uma simulação estrita da API do Figma (`pipeline/mockfigma.js`), que confere propriedades, enums, tintas, fontes carregadas, regras de auto layout e o formato das interações (inclusive a rolagem até um elemento da própria tela). A sequência testada foi: gerar tudo, gerar de novo, rodar o comando da landing page num arquivo já gerado e rodá-lo num arquivo vazio. Resultado: 49 telas, 165 componentes, 437 interações e nenhum erro. A segunda execução não duplicou nada, e o comando da landing page manteve intactas as 47 telas que já existiam;
- **uma checagem de tipos** contra as tipagens oficiais `@figma/plugin-typings`. Os únicos avisos são falsos positivos de objetos literais em JavaScript, os mesmos da versão anterior.

No próprio Figma, os quatro primeiros componentes foram montados com a mesma biblioteca e conferidos com 0 divergências de layout.

## Como foi gerado (e como regenerar)

`pipeline/` contém as ferramentas que leram o `index.html` e os PDFs e geraram o plugin:

| Etapa | Script | O que faz |
|---|---|---|
| 1 | `prepare_assets.js` | extrai do `index.html` o bundle JS e as fontes embutidas |
| 2 | `run_extract.js` + `extract.js` | abre o protótipo no Chromium (Playwright) em 32 estados desktop e 15 mobile e serializa geometria, estilos, textos e ícones |
| 3 | `convert.js` | transforma a árvore do DOM em especificação Figma: decide o auto layout simulando o algoritmo do Figma e confere cada posição |
| 4 | `components.js` | detecta padrões repetidos e cria componentes, variantes e overrides (texto, ícone, cor, tamanho) |
| 4b | `site/pdfprims.py` | lê os PDFs da landing page e dos planos: textos (fonte, cor, espaçamento), formas, contornos, ícones e imagens. O resultado já está em `site/prims_*.json` e `site/img/` |
| 4c | `site/site_spec.js` | monta a landing page, os planos e os componentes do site, confere cada posição com o PDF e define as interações |
| 5 | `links.js` | define as interações do protótipo a partir dos textos e componentes de cada tela |
| 5b | `make_logo.py` | vetoriza a logo (contornos da Poppins Bold, traço do símbolo convertido em forma) e grava os SVGs em `figma/logo/` |
| 6 | `gen_plugin.js` | junta dados, construtor (`lib.js`) e execução (`plugin_main.js`) em `plugin/code.js` |
| 7 | `runmock.js`, `render.js` | teste com a API simulada e validação visual |

```bash
cd figma/pipeline
npm install          # playwright, pngjs e as fontes Inter e Poppins (@fontsource)
pip install fonttools skia-pathops pymupdf   # usados por make_logo.py e site/pdfprims.py
npm run build        # etapas 1 a 6 + teste com a API simulada
npm run test:visual  # opcional: compara as telas com as referências
```

Para extrair de novo a landing page (opcional, os dados já estão no repositório), coloque os PDFs em `pipeline/site/` e rode:

```bash
python3 site/pdfprims.py site/istoque-landing-page.pdf site/prims_landing.json --altura 3335 --imagens site/extraidas --referencia ref/desktop/landing.png
python3 site/pdfprims.py site/Planos.pdf site/prims_planos.json --referencia ref/desktop/planos.png
```

As imagens extraídas saem com o número do objeto no PDF (`xref1506.jpeg` é o hero; `xref1514`, `xref1500` e `xref1494`, os cards, como indicado em `site_spec.js`).

`arts.json`, `mascot_pal.png` e `texture_2bit.png` são as ilustrações e imagens já extraídas e otimizadas do `index.html`. As imagens foram reduzidas a paletas pequenas para caber na integração.

## Limitações conhecidas

- Controles nativos, como a seta do `<select>`, o calendário do campo de data e o redimensionador do `<textarea>`, são desenhados com os ícones da biblioteca e não com a aparência do navegador.
- As fontes são Inter e Poppins, disponíveis no Figma pelo Google Fonts.
- O plano Starter limita o arquivo a 3 páginas. Por isso os modais e o site ficam na mesma página das telas desktop, em seções próprias.
- A landing page e os planos existem só em desktop (1440 px), como nos PDFs.
