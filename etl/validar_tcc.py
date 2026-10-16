"""Confere a camada bronze do SISU contra a Tabela 5 do TCC (inscrições na UTFPR-CP, 1ª chamada).

Uso: python -m etl.validar_tcc
"""
from .common import connect
from .config import BRONZE

# Tabela 5 do TCC: (ano, edição) → inscritos na UTFPR - Câmpus Cornélio Procópio
TABELA_5 = {
    (2014, 1): 5083, (2014, 2): 5182, (2015, 1): 4566, (2015, 2): 4757, (2016, 1): 3465,
    (2016, 2): 3580, (2017, 1): 2933, (2017, 2): 3449, (2018, 1): 2424, (2018, 2): 1860,
    (2019, 1): 1987, (2019, 2): 1915, (2020, 1): 1834, (2020, 2): 1245, (2021, 1): 1463,
    (2021, 2): 962, (2022, 1): 1555, (2022, 2): 921, (2023, 1): 1463, (2023, 2): 832,
}
CO_IES_UTFPR = 588
CO_CAMPUS_CP = 220


def main() -> None:
    con = connect()
    rows = con.execute(f"""
        select ano, edicao, count(*) as inscricoes, count(distinct candidato_id) as candidatos
        from '{(BRONZE / 'sisu' / 'sisu_*.parquet').as_posix()}'
        where co_ies = {CO_IES_UTFPR} and co_campus = {CO_CAMPUS_CP}
          and etapa in ('1ª CHAMADA', 'CHAMADA REGULAR')
        group by all order by all""").fetchall()
    ok = 0
    print(f"{'edição':<8}{'TCC':>7}{'bronze':>8}{'dif':>6}{'candidatos':>12}")
    for ano, ed, insc, cand in rows:
        esperado = TABELA_5.get((ano, ed))
        dif = insc - esperado if esperado is not None else None
        ok += dif == 0
        print(f"{ano}-{ed:<3}{esperado or '-':>7}{insc:>8}{dif if dif is not None else '-':>6}{cand:>12}")
    print(f"\n{ok}/{len(TABELA_5)} edições idênticas ao TCC")


if __name__ == "__main__":
    main()
