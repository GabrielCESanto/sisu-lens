"""Bronze ENEM: microdados 2013–2023 → Parquet com as colunas úteis e o questionário harmonizado.

Uso:  python -m etl.enem              # todos os anos
      python -m etl.enem 2018 2019    # só os anos indicados

O questionário de 2013–2014 tem numeração e escalas diferentes das de 2015+. Aqui tudo é convertido
para uma escala única (ver docs/dicionario.md). Faixa de renda continua como letra A–Q, que nos dois
períodos representa os mesmos múltiplos do salário mínimo.
"""
import json
import sys
import time
from pathlib import Path

from .common import connect, num, sql_str, txt
from .config import BRONZE, PARQUET_OPTS, RAW

ANOS = list(range(2013, 2024))

ESCOLARIDADE = {  # código harmonizado → rótulo
    0: "Nunca estudou", 1: "Fundamental incompleto", 2: "Fundamental completo",
    3: "Médio completo", 4: "Superior completo", 5: "Pós-graduação", 9: "Não sabe",
}
# Letra original → código harmonizado
ESC_2013 = {"A": 0, "B": 1, "C": 1, "D": 2, "E": 3, "F": 3, "G": 4, "H": 5, "I": 9}
ESC_2015 = {"A": 0, "B": 1, "C": 1, "D": 2, "E": 3, "F": 4, "G": 5, "H": 9}
# Quantidade de aparelhos: 0, 1, 2, 3 (= 3 ou mais)
QTD_2013 = {"A": 1, "B": 2, "C": 3, "D": 0}
QTD_2015 = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 3}
ESCOLA_2013 = {"1": "Pública", "2": "Privada"}
ESCOLA_2015 = {"1": "Não respondeu", "2": "Pública", "3": "Privada", "4": "Exterior"}
# Em 2018 o INEP inverteu os códigos 3 e 4 (confirmado no dicionário e na distribuição dos dados).
ESCOLA_2018 = {"1": "Não respondeu", "2": "Pública", "3": "Exterior", "4": "Privada"}


def enem_csv(ano: int) -> Path:
    pasta = RAW / "ENEM" / f"microdados_enem_{ano}" / "DADOS"
    return next(p for p in pasta.iterdir() if p.name.lower() == f"microdados_enem_{ano}.csv")


def _case(col: str, mapa: dict) -> str:
    whens = " ".join(f"when {sql_str(str(k))} then {sql_str(v) if isinstance(v, str) else v}" for k, v in mapa.items())
    return f"case trim({col}) {whens} end"


def _int(col: str) -> str:
    return f"try_cast(trunc({num(col)}) as integer)"


def processar(ano: int) -> dict:
    antigo = ano <= 2014
    origem = enem_csv(ano)
    destino = BRONZE / "enem" / f"enem_{ano}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)

    con = connect()
    con.execute(f"""create view raw as select * from read_csv({sql_str(origem.as_posix())},
        delim=';', header=true, all_varchar=true, encoding='latin-1')""")
    colunas = {r[0] for r in con.execute("describe raw").fetchall()}
    q = {  # papel → coluna original do questionário
        "pai": "Q001", "mae": "Q002",
        "renda": "Q003" if antigo else "Q006",
        "pessoas": "Q004" if antigo else "Q005",
        "computador": "Q010" if antigo else "Q024",
        "celular": "Q016" if antigo else "Q022",
        "internet": "Q017" if antigo else "Q025",
    }
    esc, qtd = (ESC_2013, QTD_2013) if antigo else (ESC_2015, QTD_2015)
    internet = "case trim(Q017) when 'D' then false when '' then null else true end" if antigo \
        else "case trim(Q025) when 'A' then false when 'B' then true end"
    treineiro = "trim(IN_TREINEIRO) = '1'" if "IN_TREINEIRO" in colunas else "NULL::boolean"

    con.execute(f"""copy (select
        {ano}::smallint as ano_enem,
        {num('NU_NOTA_CN')} as nota_cn, {num('NU_NOTA_CH')} as nota_ch, {num('NU_NOTA_LC')} as nota_lc,
        {num('NU_NOTA_MT')} as nota_mt, {num('NU_NOTA_REDACAO')} as nota_rd,
        {_int('TP_FAIXA_ETARIA')}::tinyint as faixa_etaria,
        upper(trim(TP_SEXO)) as sexo,
        {_int('TP_COR_RACA')}::tinyint as cor_raca,
        {_case('TP_ESCOLA', ESCOLA_2013 if antigo else ESCOLA_2018 if ano == 2018 else ESCOLA_2015)} as tipo_escola,
        {_int('TP_ST_CONCLUSAO')}::tinyint as situacao_conclusao,
        {treineiro} as treineiro,
        {_int('CO_MUNICIPIO_PROVA')} as co_municipio_prova,
        {txt('SG_UF_PROVA', False)} as uf_prova,
        {_case(q['pai'], esc)}::tinyint as escolaridade_pai,
        {_case(q['mae'], esc)}::tinyint as escolaridade_mae,
        {'NULL::varchar' if antigo else txt('Q003', False)} as ocupacao_pai,
        {'NULL::varchar' if antigo else txt('Q004', False)} as ocupacao_mae,
        {_int(q['pessoas'])}::tinyint as pessoas_residencia,
        {txt(q['renda'], False)} as renda_faixa,
        {_case(q['celular'], qtd)}::tinyint as celulares,
        {_case(q['computador'], qtd)}::tinyint as computadores,
        {internet} as internet
    from raw) to {sql_str(destino.as_posix())} ({PARQUET_OPTS})""")

    pq = sql_str(destino.as_posix())
    linhas, com_notas, renda_nula = con.execute(f"""select count(*),
        count(*) filter (where nota_cn is not null and nota_ch is not null and nota_lc is not null
                           and nota_mt is not null and nota_rd is not null),
        count(*) filter (where renda_faixa is null) from {pq}""").fetchone()
    return {"ano": ano, "linhas": linhas, "com_5_notas": com_notas, "renda_nula": renda_nula,
            "mb": round(destino.stat().st_size / 1e6, 1)}


def main(anos: list[int]) -> None:
    manifest_path = BRONZE / "enem" / "_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text("utf-8")) if manifest_path.exists() else {}
    for ano in anos:
        t = time.time()
        info = processar(ano)
        info["segundos"] = round(time.time() - t)
        manifest[str(ano)] = info
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")
        print(f"{ano}: {info['linhas']:>10,} linhas | {info['com_5_notas']:>10,} com 5 notas | "
              f"{info['mb']:>6} MB | {info['segundos']}s")


if __name__ == "__main__":
    main([int(a) for a in sys.argv[1:]] or ANOS)
