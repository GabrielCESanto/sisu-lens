"""Configuração central do ETL do SISU Lens."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Pasta com os dados brutos (CSVs originais do INEP/MEC). Pode ser trocada por variável de ambiente.
RAW = Path(os.environ.get("SISU_LENS_RAW", ROOT.parent / "Gerador de base de dados" / "DADOS"))
DATA = ROOT / "data"
BRONZE = DATA / "bronze"
SILVER = DATA / "silver"
GOLD = DATA / "gold"

PARQUET_OPTS = "format parquet, compression zstd, compression_level 9"

# Edições do SISU: codificação e delimitador de cada CSV (levantados no TCC, Tabela 4).
SISU_EDICOES = {
    "2014-1": ("utf-8", "|"), "2014-2": ("utf-8", "|"),
    "2015-1": ("utf-8", "|"), "2015-2": ("utf-8", "|"),
    "2016-1": ("utf-8", "|"), "2016-2": ("utf-8", "|"),
    "2017-1": ("cp1252", "|"), "2017-2": ("utf-8", ";"),
    "2018-1": ("cp1252", "|"), "2018-2": ("utf-8", ";"),
    "2019-1": ("utf-8", ";"), "2019-2": ("utf-8", ";"),
    "2020-1": ("utf-8", ";"), "2020-2": ("utf-8", ";"),
    "2021-1": ("utf-8", ";"), "2021-2": ("cp1252", "|"),
    "2022-1": ("cp1252", "|"), "2022-2": ("cp1252", "|"),
    "2023-1": ("cp1252", "|"), "2023-2": ("cp1252", "|"),
}


def sisu_csv(chave: str) -> Path:
    return RAW / "SISU" / f"ListagemChamadaRegular_{chave}" / f"ListagemChamadaRegular_{chave}.csv"
