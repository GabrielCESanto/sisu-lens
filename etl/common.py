"""Funções utilitárias compartilhadas pelas etapas do ETL."""
import duckdb

# O DuckDB não lê cp1252 nativamente; lemos como latin-1 e corrigimos a faixa 0x80–0x9F,
# única região em que as duas codificações divergem (–, “, ”, ‘, ’, …, € etc.).
_C1 = [b for b in range(0x80, 0xA0)]
_C1_FROM = "".join(chr(b) for b in _C1 if bytes([b]).decode("cp1252", errors="ignore"))
_C1_TO = "".join(bytes([b]).decode("cp1252") for b in _C1 if bytes([b]).decode("cp1252", errors="ignore"))


def connect(threads: int | None = None) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    if threads:
        con.execute(f"set threads={threads}")
    con.execute("set preserve_insertion_order=false")
    return con


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def txt(expr: str, cp1252: bool) -> str:
    """Texto limpo: trim, string vazia/'NULL' viram NULL e corrige cp1252 quando preciso."""
    e = f"translate({expr}, {sql_str(_C1_FROM)}, {sql_str(_C1_TO)})" if cp1252 else expr
    return f"nullif(nullif(trim({e}), ''), 'NULL')"


def num(expr: str) -> str:
    """Número com vírgula decimal → DOUBLE (NULL se inválido)."""
    return f"try_cast(replace(nullif(trim({expr}), ''), ',', '.') as double)"


def norm_nome(expr: str) -> str:
    """Caixa alta, sem acento, espaços simples — para municípios e nomes comparáveis entre anos."""
    return f"nullif(regexp_replace(upper(strip_accents(trim({expr}))), '\\s+', ' ', 'g'), '')"
