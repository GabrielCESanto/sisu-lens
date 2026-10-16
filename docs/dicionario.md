# Dicionário de dados

## bronze/sisu — `sisu_AAAA_E.parquet` (uma linha por inscrição × opção de curso)

| Coluna | Tipo | Descrição |
|---|---|---|
| candidato_id | int | Sequencial **por edição**; agrupa as opções do mesmo candidato. Não é estável entre edições |
| etapa | texto | `1ª CHAMADA`, `2ª CHAMADA` (só 2014–2015) ou `CHAMADA REGULAR` (2018-1 e 2021-2 em diante). Para contar inscrições use `1ª CHAMADA` ou `CHAMADA REGULAR` |
| sexo | texto | `F` / `M` |
| idade | int | Ano da edição − ano de nascimento (aproximada; nula se fora de 12–90) |
| aprovado | bool | Aprovado na chamada regular para essa opção |
| ano, edicao | int | Edição do SISU (edicao 1 = 1º semestre, 2 = 2º) |
| co_ies, no_ies, sigla_ies, uf_ies | | Instituição (código e-MEC) |
| co_campus, no_campus, uf_campus, municipio_campus | | Câmpus (município normalizado: caixa alta, sem acento) |
| co_curso, no_curso, grau, turno | | Curso |
| periodicidade, tp_cota, qt_vagas | | Só a partir de 2021-2 |
| tp_mod_concorrencia, modalidade | texto | Tipo e descrição da modalidade (ampla concorrência, cotas da Lei 12.711 etc.) |
| percentual_bonus, peso_*, nota_min_*, media_minima | double | Regras do curso |
| uf_candidato, municipio_candidato | texto | Residência declarada (município normalizado) |
| opcao | int | 1ª ou 2ª opção |
| nota_lc, nota_ch, nota_cn, nota_mt, nota_rd | double | Notas do ENEM do ano anterior |
| nota_candidato | double | Nota ponderada usada na concorrência |
| nota_corte | double | Nota de corte. **Nula quando não divulgada** (o TCC preenchia com 0) |
| classificacao | int | Posição na modalidade |
| matricula | texto | Situação da matrícula (ausente em 2017-1) |

## bronze/enem — `enem_AAAA.parquet` (uma linha por participante)

| Coluna | Descrição |
|---|---|
| ano_enem | Ano da prova (usada pelo SISU do ano seguinte) |
| nota_cn, nota_ch, nota_lc, nota_mt, nota_rd | Notas (nulas se ausente/eliminado) |
| faixa_etaria | Código INEP 1–20 (1 = menor de 17, 2 = 17 anos … 11 = 26–30 … 20 = mais de 70); igual em todos os anos |
| sexo, cor_raca | Código INEP de cor/raça: 0 não declarado, 1 branca, 2 preta, 3 parda, 4 amarela, 5 indígena |
| tipo_escola | Pública, Privada, Exterior, Não respondeu |
| treineiro | Só a partir de 2015 |
| co_municipio_prova, uf_prova | Local de prova |
| escolaridade_pai, escolaridade_mae | Escala harmonizada (abaixo) |
| ocupacao_pai, ocupacao_mae | Grupos A–E, F = não sabe. **Nulo em 2013–2014** (a pergunta não existia; o TCC usava "F") |
| pessoas_residencia | 1–20 |
| renda_faixa | Letra A–Q em múltiplos do salário mínimo (abaixo) |
| celulares, computadores | 0, 1, 2, 3 (= 3 ou mais) |
| internet | Tem acesso à internet em casa |

### Escolaridade harmonizada

| Código | Rótulo | 2013–14 (Q001/Q002) | 2015+ (Q001/Q002) |
|---|---|---|---|
| 0 | Nunca estudou | A | A |
| 1 | Fundamental incompleto | B, C | B, C |
| 2 | Fundamental completo | D (médio incompleto) | D |
| 3 | Médio completo | E, F (superior incompleto) | E |
| 4 | Superior completo | G | F |
| 5 | Pós-graduação | H | G |
| 9 | Não sabe | I | H |

### Faixa de renda familiar (igual em todos os anos, em salários mínimos)

A nenhuma · B até 1 · C 1–1,5 · D 1,5–2 · E 2–2,5 · F 2,5–3 · G 3–4 · H 4–5 · I 5–6 · J 6–7 ·
K 7–8 · L 8–9 · M 9–10 · N 10–12 · O 12–15 · P 15–20 · Q acima de 20.

O valor em R$ de cada faixa muda com o salário mínimo do ano (R$ 678 em 2013 … R$ 1.320 em 2023).
Por isso o painel mostra a faixa em salários mínimos, e não em reais.

### Mudanças de origem 2013–14 → 2015+

| Variável | 2013–14 | 2015+ |
|---|---|---|
| Renda | Q003 | Q006 |
| Pessoas na residência | Q004 | Q005 |
| Computador | Q010 (A=1, B=2, C=3+, D=não) | Q024 (A=não, B=1, C=2, D=3, E=4+) |
| Celular | Q016 (idem) | Q022 (idem) |
| Internet | Q017 (D = não tem) | Q025 (A = não, B = sim) |
| Tipo de escola | 1 pública, 2 privada | 1 não respondeu, 2 pública, 3 privada, 4 exterior (**em 2018: 3 exterior, 4 privada**; sem "exterior" a partir de 2021) |
