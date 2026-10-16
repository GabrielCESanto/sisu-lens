"""Roda o ETL completo: bronze SISU → bronze ENEM → silver → gold → validação contra o TCC.

Uso: python -m etl.pipeline
"""
from . import enem, gold, silver, sisu, validar_tcc
from .config import SISU_EDICOES


def main() -> None:
    sisu.main(list(SISU_EDICOES))
    enem.main(enem.ANOS)
    silver.main(list(SISU_EDICOES))
    gold.main()
    validar_tcc.main()


if __name__ == "__main__":
    main()
