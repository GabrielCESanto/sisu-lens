# Decisões de privacidade (LGPD)

## Por que existe risco

Os CSVs da Chamada Regular do SISU, publicados pelo MEC, trazem nome, CPF parcial, inscrição
mascarada e data de nascimento dos candidatos. Os microdados do ENEM, publicados pelo INEP, são
anonimizados, mas trazem as 5 notas e o questionário socioeconômico (renda, escolaridade dos pais etc.).

Como as 5 notas identificam um participante quase sempre (em 2018, só 16 combinações se repetiam
entre 3,9 milhões de participantes), **uma base linha a linha SISU × ENEM permitiria descobrir a
renda e o perfil familiar de uma pessoa identificada pelo nome**. É exatamente o que o INEP evita
ao anonimizar os microdados.

## Regras do projeto

| Camada | Onde fica | Conteúdo |
|---|---|---|
| CSVs brutos | só local | arquivos originais |
| bronze/sisu | local; publicável | sem nome, CPF, inscrição e data de nascimento. `idade` em anos e `candidato_id` sequencial por edição, sem relação com documentos |
| bronze/enem | local; publicável | só as colunas usadas, todas já públicas no INEP |
| silver (SISU × ENEM) | **só local, nunca publicado** | junção linha a linha pelas 5 notas |
| gold | Hugging Face e site | agregados. Grupos com menos de 5 pessoas são suprimidos |

## Notas individuais no bronze do SISU (decidido em 2026-10-12)

Se o bronze do SISU fosse publicado **com as 5 notas individuais**, qualquer pessoa poderia refazer a
junção com o ENEM público. As fontes oficiais já permitem isso hoje, mas publicar os dois arquivos
lado a lado facilitaria. Decisão: o bronze do SISU será publicado **sem as notas individuais**. O
painel só usa somas e contagens, que ficam na camada gold.

O bronze local continua com as notas, porque a camada silver precisa delas para a junção.

## Detalhes de implementação

- `candidato_id` é um `dense_rank` sobre um hash de (CPF mascarado, inscrição, nome, nascimento),
  calculado em memória **por edição**. Não é estável entre edições e não pode ser revertido.
- `idade` = ano da edição − ano de nascimento (valores fora de 12–90 viram nulo).
- A supressão de grupos pequenos é aplicada na geração da camada gold, antes de qualquer publicação.
