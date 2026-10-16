"""Gold: agregados que alimentam o painel (e que podem ser publicados).

Uso: python -m etl.gold

Grão comum ("filtros") de todas as tabelas fato, espelhando os segmentadores do Power BI do TCC:
    ano, edicao, co_ies, co_campus, curso, aprovado
Contagens são de **inscrições** (opções de curso) da 1ª chamada / chamada regular, como no TCC.

LGPD (docs/lgpd.md):
- tabelas só com dados do SISU (inscritos, geo) não têm supressão: a lista do MEC já é pública;
- tabelas com dados do ENEM (socio, renda_uf) têm supressão: em cada célula com menos de
  K_MIN inscrições, a categoria vira 'Suprimido'. Totais continuam corretos.
- nenhuma tabela traz nota individual: só somas e contagens para calcular médias.
"""
import time

from .common import connect, norm_nome, sql_str
from .config import DATA, GOLD, PARQUET_OPTS, SILVER

K_MIN = 5
FILTROS = "ano, edicao, co_ies, co_campus, curso, aprovado"
# Grupos de linhas pequenos permitem que o navegador baixe só o pedaço da IES filtrada.
GOLD_OPTS = PARQUET_OPTS + ", row_group_size 20000"

FAIXA_IDADE = """case
    when idade is null then null
    when idade < 17 then 'Menor de 17'
    when idade <= 25 then idade::varchar || ' anos'
    when idade <= 30 then '26 a 30'
    when idade <= 35 then '31 a 35'
    when idade <= 40 then '36 a 40'
    when idade <= 50 then '41 a 50'
    when idade <= 60 then '51 a 60'
    else 'Mais de 60' end"""

# Rede (dependência administrativa) da IES. O SISU não traz esse campo: vem do nome, mais as
# federais sem "federal" no nome. As distritais do DF (ESCS, ESGe) entram como estaduais.
FEDERAIS_SEM_NOME = "'CP II', 'ENCE', 'UNB', 'UNILAB'"
REDE = f"""case
    when upper(nome) like '%FEDERAL%' or sigla in ({FEDERAIS_SEM_NOME}) then 'Federal'
    when upper(nome) like '%MUNICIPAL%' then 'Municipal'
    else 'Estadual' end"""

# variável do painel → expressão categórica na silver
SOCIO = {
    "renda": "renda_faixa",
    "escolaridade_pai": "escolaridade_pai::varchar",
    "escolaridade_mae": "escolaridade_mae::varchar",
    "ocupacao_pai": "ocupacao_pai",
    "ocupacao_mae": "ocupacao_mae",
    "celulares": "celulares::varchar",
    "computadores": "computadores::varchar",
    "internet": "case internet when true then 'Sim' when false then 'Não' end",
    "cor_raca": "cor_raca::varchar",
    "tipo_escola": "tipo_escola",
}


def _copy(con, sql: str, nome: str) -> None:
    destino = GOLD / f"{nome}.parquet"
    con.execute(f"copy ({sql}) to {sql_str(destino.as_posix())} ({GOLD_OPTS})")
    n = con.execute(f"select count(*) from {sql_str(destino.as_posix())}").fetchone()[0]
    print(f"  {nome:<16} {n:>10,} linhas  {destino.stat().st_size / 1e6:>7.1f} MB")


def _suprimir(sql_contagem: str, chaves: str) -> str:
    """Troca por 'Suprimido' as categorias de células com menos de K_MIN e reagrega."""
    return f"""
        with c as ({sql_contagem})
        select {chaves}, case when n < {K_MIN} then 'Suprimido' else categoria end as categoria,
               sum(n)::int as n, sum(soma_nota) as soma_nota, sum(n_nota)::int as n_nota
        from c group by all"""


def main() -> None:
    GOLD.mkdir(parents=True, exist_ok=True)
    t = time.time()
    con = connect()
    silver = sql_str((SILVER / "sisu_enem" / "sisu_enem_*.parquet").as_posix())
    con.execute(f"""create temp table base as
        select ano, edicao, co_ies, co_campus, upper(trim(no_curso)) as curso, aprovado,
               sexo, idade, {FAIXA_IDADE} as faixa_idade, uf_candidato, municipio_candidato,
               nota_candidato, nota_corte, nota_cn, nota_ch, nota_lc, nota_mt, nota_rd,
               match, {', '.join(f'{e} as {v}' for v, e in SOCIO.items())}
        from {silver}
        where etapa in ('1ª CHAMADA', 'CHAMADA REGULAR')""")

    # ---- dimensões -------------------------------------------------------------------------
    _copy(con, f"""with i as (
                       select co_ies, arg_max(sigla_ies, ano * 10 + edicao) as sigla, arg_max(no_ies, ano * 10 + edicao) as nome,
                              arg_max(uf_ies, ano * 10 + edicao) as uf, count(*)::int as inscricoes
                       from {silver} where etapa in ('1ª CHAMADA', 'CHAMADA REGULAR') group by 1)
                   select *, {REDE} as rede from i order by inscricoes desc""", "dim_ies")
    _copy(con, f"""select co_ies, co_campus, arg_max(no_campus, ano * 10 + edicao) as nome,
                          arg_max(municipio_campus, ano * 10 + edicao) as municipio, arg_max(uf_campus, ano * 10 + edicao) as uf
                   from {silver} group by all order by co_ies, co_campus""", "dim_campus")
    ref = DATA / "ref"
    _copy(con, f"""select e.uf, {norm_nome('m.nome')} as municipio, m.nome as nome_oficial, m.codigo_ibge,
                          m.latitude as lat, m.longitude as lon
                   from read_csv({sql_str((ref / 'municipios.csv').as_posix())}) m
                   join read_csv({sql_str((ref / 'estados.csv').as_posix())}) e using (codigo_uf)""", "dim_municipio")

    # ---- fatos só-SISU (sem supressão) -------------------------------------------------------
    _copy(con, f"""select {FILTROS}, sexo, faixa_idade,
                          count(*)::int as n,
                          sum(idade)::int as soma_idade, count(idade)::int as n_idade,
                          sum(nota_candidato) as soma_nota, count(nota_candidato)::int as n_nota,
                          sum(nota_corte) as soma_corte, count(nota_corte)::int as n_corte,
                          sum(nota_cn) as soma_cn, sum(nota_ch) as soma_ch, sum(nota_lc) as soma_lc,
                          sum(nota_mt) as soma_mt, sum(nota_rd) as soma_rd, count(nota_mt)::int as n_provas
                   from base group by all order by co_ies, co_campus, ano, edicao""", "fato_inscritos")
    _copy(con, f"""select {FILTROS}, uf_candidato as uf, municipio_candidato as municipio, count(*)::int as n
                   from base group by all order by co_ies, co_campus, ano, edicao""", "fato_geo")
    # Versão enxuta para as páginas que comparam todas as IES/cursos (o navegador não baixa a fato_inscritos inteira)
    _copy(con, """select ano, co_ies, curso, count(*)::int as n
                  from base group by all order by co_ies, curso, ano""", "fato_evolucao")

    # ---- fatos com ENEM (com supressão) ------------------------------------------------------
    partes = [f"""select {FILTROS}, '{v}' as variavel,
                         case when match <> 'unico' then 'Sem informação' else coalesce({v}, 'Não respondeu') end as categoria,
                         count(*) as n, sum(nota_candidato) as soma_nota, count(nota_candidato) as n_nota
                  from base group by all""" for v in SOCIO]
    _copy(con, _suprimir(" union all ".join(partes), f"{FILTROS}, variavel") + " order by co_ies, co_campus, ano, edicao",
          "fato_socio")
    _copy(con, _suprimir(f"""select {FILTROS}, uf_candidato as uf,
                                    case when match <> 'unico' then 'Sem informação' else coalesce(renda, 'Não respondeu') end as categoria,
                                    count(*) as n, sum(nota_candidato) as soma_nota, count(nota_candidato) as n_nota
                             from base group by all""", f"{FILTROS}, uf") + " order by co_ies, co_campus, ano, edicao",
          "fato_renda_uf")

    # ---- qualidade ---------------------------------------------------------------------------
    sem_coord = con.execute(f"""select count(*) from base b anti join {sql_str((GOLD / 'dim_municipio.parquet').as_posix())} m
                                on b.uf_candidato = m.uf and b.municipio_candidato = m.municipio""").fetchone()[0]
    total = con.execute("select count(*) from base").fetchone()[0]
    print(f"  inscrições sem coordenada de município: {sem_coord:,} de {total:,} ({100 * sem_coord / total:.2f}%)")
    print(f"gold pronto em {time.time() - t:.0f}s")


if __name__ == "__main__":
    main()
