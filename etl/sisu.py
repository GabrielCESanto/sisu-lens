"""Bronze SISU: CSVs da Chamada Regular (2014-1 a 2023-2) → Parquet padronizado e sem dados pessoais.

Uso:  python -m etl.sisu                 # todas as edições
      python -m etl.sisu 2019-2 2020-1   # só as edições indicadas

LGPD: nome, CPF, inscrição no ENEM e data de nascimento são lidos apenas para montar
`candidato_id` (um número sequencial por edição, não reversível) e `idade`; nenhum deles
é gravado no Parquet.
"""
import json
import sys
import time

from .common import connect, norm_nome, num, sql_str, txt
from .config import BRONZE, PARQUET_OPTS, SISU_EDICOES, sisu_csv

# Coluna canônica → nomes possíveis nas diferentes edições (o primeiro presente é usado).
SINONIMOS = {
    "ano": ["nu_ano", "NU_ANO", "ANO"],
    "edicao": ["nu_edicao", "NU_EDICAO", "EDICAO"],
    "etapa": ["ds_etapa", "DS_ETAPA"],
    "co_ies": ["cod_ies", "CO_IES", "CODIGO_IES"],
    "no_ies": ["ies", "NO_IES", "NOME_IES"],
    "sigla_ies": ["sigla_ies", "SIGLA_IES"],
    "uf_ies": ["uf_ies", "SG_UF_IES", "UF_IES"],
    "co_campus": ["cod_campus", "CO_CAMPUS", "CODIGO_CAMPUS"],
    "no_campus": ["campus", "NO_CAMPUS", "NOME_CAMPUS"],
    "uf_campus": ["uf_campus", "SG_UF_CAMPUS", "UF_CAMPUS"],
    "municipio_campus": ["municipio_campus", "NO_MUNUCIPIO_CAMPUS", "MUNICIPIO_CAMPUS"],
    "co_curso": ["codigo_curso", "codigo_ies_curso", "CO_IES_CURSO", "CODIGO_CURSO"],
    "no_curso": ["nome_curso", "NO_CURSO", "NOME_CURSO"],
    "grau": ["grau", "DS_GRAU", "GRAU"],
    "turno": ["turno", "DS_TURNO", "TURNO"],
    "periodicidade": ["DS_PERIODICIDADE"],
    "tp_cota": ["TP_COTA"],
    "tp_mod_concorrencia": ["tp_modalidade", "TP_MOD_CONCORRENCIA", "TIPO_MOD_CONCORRENCIA"],
    "modalidade": ["ds_modalidade", "DS_MOD_CONCORRENCIA", "MOD_CONCORRENCIA"],
    "qt_vagas": ["QT_VAGAS_CONCORRENCIA"],
    "percentual_bonus": ["qt_bonus_perc", "NU_PERCENTUAL_BONUS", "PERCENTUAL_BONUS"],
    "peso_lc": ["nu_peso_l", "NU_PESO_L", "PESO_L"],
    "peso_ch": ["nu_peso_ch", "NU_PESO_CH", "PESO_CH"],
    "peso_cn": ["nu_peso_cn", "NU_PESO_CN", "PESO_CN"],
    "peso_mt": ["nu_peso_m", "NU_PESO_M", "PESO_M"],
    "peso_rd": ["nu_peso_r", "NU_PESO_R", "PESO_R"],
    "nota_min_lc": ["nota_minima_l", "NOTA_MINIMA_L"],
    "nota_min_ch": ["nota_minima_ch", "NOTA_MINIMA_CH"],
    "nota_min_cn": ["nota_minima_cn", "NOTA_MINIMA_CN"],
    "nota_min_mt": ["nota_minima_m", "NOTA_MINIMA_M"],
    "nota_min_rd": ["nota_minima_r", "NOTA_MINIMA_R"],
    "media_minima": ["media_minima", "MEDIA_MINIMA"],
    "sexo": ["tp_sexo", "TP_SEXO", "SEXO"],
    "uf_candidato": ["uf_origem", "SG_UF_CANDIDATO", "UF_CANDIDATO"],
    "municipio_candidato": ["municipio_candidato", "MUNICIPIO_CANDIDATO"],
    "opcao": ["st_opcao", "ST_OPCAO", "OPCAO"],
    "nota_lc": ["nu_nota_l", "NU_NOTA_L", "NOTA_L"],
    "nota_ch": ["nu_nota_ch", "NU_NOTA_CH", "NOTA_CH"],
    "nota_cn": ["nu_nota_cn", "NU_NOTA_CN", "NOTA_CN"],
    "nota_mt": ["nu_nota_m", "NU_NOTA_M", "NOTA_M"],
    "nota_rd": ["nu_nota_r", "NU_NOTA_R", "NOTA_R"],
    "nota_candidato": ["nota_concorrencia", "NU_NOTA_CANDIDATO", "NOTA_CANDIDATO"],
    "nota_corte": ["nu_notacorte", "NU_NOTACORTE", "NOTA_CORTE"],
    "classificacao": ["nu_classificacao", "NU_CLASSIFICACAO", "CLASSIFICACAO"],
    "aprovado": ["st_aprovado", "ST_APROVADO", "APROVADO"],
    "matricula": ["ds_matricula", "ST_MATRICULA", "MATRICULA", "st_matricula"],
    # Dados pessoais: usados só em memória (candidato_id e idade), nunca gravados.
    "_cpf": ["cpf", "NU_CPF", "CPF"],
    "_inscricao": ["co_inscricao_enem", "CO_INSCRICAO_ENEM", "INSCRICAO_ENEM"],
    "_nome": ["no_inscrito", "NO_INSCRITO", "INSCRITO"],
    "_nascimento": ["dt_nascimento", "DT_NASCIMENTO", "DATA_NASCIMENTO"],
}

INTEIROS = {"ano", "edicao", "co_ies", "co_campus", "co_curso", "opcao", "classificacao", "qt_vagas"}
DECIMAIS = {c for c in SINONIMOS if c.startswith(("peso_", "nota_", "media_"))} | {"percentual_bonus"}
NOMES_NORMALIZADOS = {"municipio_campus", "municipio_candidato"}


def _expr(col: str, colunas: set[str], cp1252: bool) -> str:
    origem = next((c for c in SINONIMOS[col] if c in colunas), None)
    if origem is None:  # coluna inexistente nesta edição: nulo, mas com o mesmo tipo das demais
        return "NULL::integer" if col in INTEIROS else "NULL::double" if col in DECIMAIS else "NULL::varchar"
    ref = f'"{origem}"'
    if col in INTEIROS:
        return f"try_cast(trunc({num(ref)}) as integer)"
    if col in DECIMAIS:
        return num(ref)
    if col in NOMES_NORMALIZADOS:
        return norm_nome(txt(ref, cp1252))
    return txt(ref, cp1252)


def _ano_nascimento(d: str, ano: str) -> str:
    """Aceita 'AAAA', 'DD/MM/AAAA', 'DD/MM/AA' e 'AAAA-MM-DD'; AA é resolvido pelo ano da edição."""
    return f"""case
        when regexp_matches({d}, '^\\d{{4}}$') then {d}::int
        when regexp_matches({d}, '^\\d{{4}}-\\d{{2}}-\\d{{2}}') then left({d}, 4)::int
        when regexp_matches({d}, '^\\d{{1,2}}/\\d{{1,2}}/\\d{{4}}') then left(split_part({d}, '/', 3), 4)::int
        when regexp_matches({d}, '^\\d{{1,2}}/\\d{{1,2}}/\\d{{2}}$') then
            case when split_part({d}, '/', 3)::int > {ano} % 100
                 then 1900 + split_part({d}, '/', 3)::int else 2000 + split_part({d}, '/', 3)::int end
    end"""


def processar(chave: str) -> dict:
    encoding, delim = SISU_EDICOES[chave]
    cp1252 = encoding == "cp1252"
    origem = sisu_csv(chave)
    destino = BRONZE / "sisu" / f"sisu_{chave.replace('-', '_')}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)

    con = connect()
    con.execute(f"""create view raw as select * from read_csv({sql_str(origem.as_posix())},
        delim={sql_str(delim)}, quote='"', escape='"', header=true, all_varchar=true,
        encoding={sql_str('latin-1' if cp1252 else 'utf-8')},
        ignore_errors=true, store_rejects=true)""")
    colunas = {r[0] for r in con.execute("describe raw").fetchall()}

    sel = {c: _expr(c, colunas, cp1252) for c in SINONIMOS}
    con.execute(f"create temp table t as select {', '.join(f'{e} as {c}' for c, e in sel.items())} from raw")
    # Linhas malformadas na origem (ex.: dois registros colados em 2015-1) são descartadas, mas contadas.
    rejeitadas = con.execute("select count(distinct line) from reject_errors").fetchone()[0]

    etapa = """case when upper(etapa) like '%REGULAR%' then 'CHAMADA REGULAR'
                    when regexp_matches(etapa, '^\\s*1') then '1ª CHAMADA'
                    when regexp_matches(etapa, '^\\s*2') then '2ª CHAMADA'
                    else upper(etapa) end"""
    publicas = [c for c in SINONIMOS if not c.startswith("_") and c not in ("etapa", "sexo", "aprovado")]
    con.execute(f"""copy (
        with b as (select *, {_ano_nascimento('_nascimento', 'ano')} as _ano_nasc from t)
        select
            dense_rank() over (order by hash(_cpf, _inscricao, _nome, _nascimento)) as candidato_id,
            {etapa} as etapa,
            upper(sexo) as sexo,
            case when ano - _ano_nasc between 12 and 90 then (ano - _ano_nasc)::tinyint end as idade,
            upper(aprovado) in ('S', 'SIM') as aprovado,
            {', '.join(publicas)}
        from b
    ) to {sql_str(destino.as_posix())} ({PARQUET_OPTS})""")

    pq = sql_str(destino.as_posix())
    linhas, candidatos, sem_idade = con.execute(
        f"select count(*), count(distinct candidato_id), count(*) filter (where idade is null) from {pq}").fetchone()
    etapas = dict(con.execute(f"select etapa, count(*) from {pq} group by 1 order by 1").fetchall())
    ausentes = [c for c, e in sel.items() if e.startswith("NULL::")]
    return {"edicao": chave, "linhas": linhas, "rejeitadas": rejeitadas, "candidatos": candidatos, "sem_idade": sem_idade,
            "etapas": etapas, "colunas_ausentes": ausentes, "mb": round(destino.stat().st_size / 1e6, 1)}


def main(chaves: list[str]) -> None:
    manifest_path = BRONZE / "sisu" / "_manifest.json"
    manifest = json.loads(manifest_path.read_text("utf-8")) if manifest_path.exists() else {}
    for chave in chaves:
        t = time.time()
        info = processar(chave)
        info["segundos"] = round(time.time() - t)
        manifest[chave] = info
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")
        print(f"{chave}: {info['linhas']:>10,} linhas | {info['rejeitadas']} rejeitadas | {info['candidatos']:>9,} candidatos | "
              f"{info['mb']:>6} MB | {info['segundos']}s | etapas={info['etapas']} | ausentes={info['colunas_ausentes']}")


if __name__ == "__main__":
    main(sys.argv[1:] or list(SISU_EDICOES))
