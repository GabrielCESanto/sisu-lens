"""Silver: SISU (edição AAAA-E) × ENEM (ano AAAA-1), ligados pelas 5 notas.

Uso:  python -m etl.silver                 # todas as edições
      python -m etl.silver 2019-2          # só as indicadas

LGPD: esta camada é linha a linha e fica **só local** (data/silver não é publicada; ver docs/lgpd.md).

Regras de ligação:
- chave = as 5 notas × 10 como inteiros (evita comparação entre floats);
- combinação de notas única no ENEM → `match = 'unico'` e o perfil socioeconômico é anexado;
- combinação repetida no ENEM → `match = 'ambiguo'` (perfil nulo; nunca duplica linhas do SISU);
- sem correspondente → `match = 'sem_match'`.
"""
import json
import sys
import time

from .common import connect, sql_str
from .config import BRONZE, PARQUET_OPTS, SILVER, SISU_EDICOES

NOTAS = ["nota_cn", "nota_ch", "nota_lc", "nota_mt", "nota_rd"]
PERFIL = ["faixa_etaria", "cor_raca", "tipo_escola", "situacao_conclusao", "treineiro",
          "escolaridade_pai", "escolaridade_mae", "ocupacao_pai", "ocupacao_mae",
          "pessoas_residencia", "renda_faixa", "celulares", "computadores", "internet"]


def _chave(alias: str) -> str:
    return ", ".join(f"round({alias}.{n} * 10)::int as k_{n.split('_')[1]}" for n in NOTAS)


def processar(chave: str) -> dict:
    ano, ed = map(int, chave.split("-"))
    sisu = BRONZE / "sisu" / f"sisu_{ano}_{ed}.parquet"
    enem = BRONZE / "enem" / f"enem_{ano - 1}.parquet"
    destino = SILVER / "sisu_enem" / f"sisu_enem_{ano}_{ed}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)

    con = connect()
    keys = ", ".join(f"k_{n.split('_')[1]}" for n in NOTAS)
    con.execute(f"""create temp table e as
        select {_chave('x')}, count(*) over (partition by {', '.join(f'round(x.{n} * 10)::int' for n in NOTAS)}) as n_enem,
               {', '.join(f'x.{c}' for c in PERFIL)}
        from {sql_str(enem.as_posix())} x
        where {' and '.join(f'x.{n} is not null' for n in NOTAS)}""")
    con.execute(f"create temp table e1 as select distinct on ({keys}) * from e")
    con.execute(f"""copy (
        select s.*,
               case when e1.n_enem is null then 'sem_match' when e1.n_enem = 1 then 'unico' else 'ambiguo' end as match,
               {', '.join(f'case when e1.n_enem = 1 then e1.{c} end as {c}' for c in PERFIL)}
        from (select *, {_chave('s0')} from {sql_str(sisu.as_posix())} s0) s
        left join e1 using ({keys})
    ) to {sql_str(destino.as_posix())} ({PARQUET_OPTS})""")

    pq = sql_str(destino.as_posix())
    res = dict(con.execute(f"select match, count(distinct candidato_id) from {pq} group by 1").fetchall())
    total = sum(res.values())
    return {"edicao": chave, "candidatos": total, **res,
            "pct_unico": round(100 * res.get("unico", 0) / total, 2),
            "mb": round(destino.stat().st_size / 1e6, 1)}


def main(chaves: list[str]) -> None:
    manifest_path = SILVER / "sisu_enem" / "_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text("utf-8")) if manifest_path.exists() else {}
    for chave in chaves:
        t = time.time()
        info = processar(chave)
        info["segundos"] = round(time.time() - t)
        manifest[chave] = info
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")
        print(f"{chave}: {info['candidatos']:>9,} candidatos | único {info['pct_unico']}% | "
              f"ambíguo {info.get('ambiguo', 0):,} | sem match {info.get('sem_match', 0):,} | {info['segundos']}s")


if __name__ == "__main__":
    main(sys.argv[1:] or list(SISU_EDICOES))
