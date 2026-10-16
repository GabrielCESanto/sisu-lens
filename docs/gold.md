# Camada gold

Agregados gerados por [`etl/gold.py`](../etl/gold.py) em `data/gold/`. É o que o site lê e o que pode ser
publicado. Todos os arquivos são Parquet com compressão zstd e grupos de 20 mil linhas, para o navegador
baixar só o trecho da instituição filtrada.

Contagens são de **inscrições** (cada opção de curso) na 1ª chamada / chamada regular. Médias não vêm
prontas: cada tabela traz a soma e a contagem (`soma_x` / `n_x`), para a média continuar certa depois de
qualquer filtro (`sum(soma_x) / sum(n_x)`).

## Grão comum das tabelas fato

| Coluna | Tipo | Descrição |
|---|---|---|
| ano, edicao | int | Edição do SISU (edicao 1 ou 2) |
| co_ies | int | Instituição (código e-MEC); ver `dim_ies` |
| co_campus | int | Câmpus; ver `dim_campus` |
| curso | text | Nome do curso em caixa alta, como na lista do MEC |
| aprovado | bool | Aprovado na chamada |

## Dimensões

| Tabela | Linhas | Colunas |
|---|---|---|
| `dim_ies` | 151 | co_ies, sigla, nome, uf, inscricoes (total no período), **rede** (Federal, Estadual ou Municipal) |
| `dim_campus` | 1.441 | co_ies, co_campus, nome, municipio, uf |
| `dim_municipio` | 5.571 | uf, municipio (normalizado: caixa alta, sem acento), nome_oficial, codigo_ibge, lat, lon |

`rede` é deduzida do nome (contém "federal" ou "municipal"), mais as federais sem "federal" no nome
(CP II, ENCE, UnB, Unilab). As distritais do DF (ESCS, ESGe) entram como estaduais.

## Fatos só com dados do SISU (sem supressão)

A lista do MEC já é pública, então essas tabelas não ocultam grupos pequenos.

| Tabela | Linhas | Tamanho | Colunas além do grão |
|---|---|---|---|
| `fato_inscritos` | 2,7 mi | 84 MB | sexo, faixa_idade, n, soma_idade/n_idade, soma_nota/n_nota (nota do candidato), soma_corte/n_corte (nota de corte), soma_cn, soma_ch, soma_lc, soma_mt, soma_rd / n_provas |
| `fato_geo` | 10,2 mi | 39 MB | uf, municipio (origem do candidato), n |
| `fato_evolucao` | 41 mil | 0,1 MB | **grão reduzido**: ano, co_ies, curso, n. Usada nas páginas Universidades e Cursos, que comparam todas as instituições |

## Fatos com dados do ENEM (com supressão, LGPD)

Em cada célula com menos de 5 inscrições, a categoria vira `Suprimido` e as linhas são reagregadas. Os
totais continuam certos; só a categoria é escondida.

| Tabela | Linhas | Tamanho | Colunas além do grão |
|---|---|---|---|
| `fato_socio` | 5,9 mi | 52 MB | variavel, categoria, n, soma_nota/n_nota |
| `fato_renda_uf` | 2,5 mi | 19 MB | uf (origem), categoria (faixa de renda), n, soma_nota/n_nota |

Valores de `variavel` em `fato_socio`: renda, escolaridade_pai, escolaridade_mae, ocupacao_pai,
ocupacao_mae, celulares, computadores, internet, cor_raca, tipo_escola. Os códigos de cada categoria
estão em [dicionario.md](dicionario.md).

Categorias especiais:

| Categoria | Significado |
|---|---|
| `Sem informação` | Inscrição não ligada a um único participante do ENEM (combinação de notas repetida ou não encontrada) |
| `Não respondeu` | Ligada ao ENEM, mas a pergunta ficou em branco |
| `Suprimido` | Grupo com menos de 5 inscrições, ocultado |

## Faixas de idade

`Menor de 17`, `17 anos` … `25 anos`, `26 a 30`, `31 a 35`, `36 a 40`, `41 a 50`, `51 a 60`, `Mais de 60`.
A idade é ano da edição menos ano de nascimento.
