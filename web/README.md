# SISU Lens · site

React 19 + TypeScript + Vite, gráficos com ECharts e consultas SQL no navegador com
[DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview). Não há servidor de aplicação: o site lê os
Parquet da camada gold por HTTP e o DuckDB baixa só os pedaços necessários (requisições Range).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # checagem de tipos + build em dist/
npm run lint      # oxlint
```

## De onde vêm os dados

- **Desenvolvimento:** o `vite.config.ts` serve `../data/gold` em `/data`. É preciso ter rodado o ETL
  antes (ver o [README principal](../README.md)).
- **Produção:** defina `VITE_DATA_URL` com a URL base dos Parquet (por exemplo, um dataset no Hugging
  Face). Sem ela, o site procura em `data/` ao lado da página.

O motor do DuckDB (~30 MB) vem do jsDelivr e fica no cache do navegador.

## Publicação

O site está no GitHub Pages, servido pelo branch `gh-pages`, que só contém o build e os Parquet da
gold em `data/`. A gold não vai para o `main` e o histórico do código fica limpo. Para republicar:

```bash
npm run build
# copie dist/ e ../data/gold/*.parquet (para data/) numa pasta com um .nojekyll vazio,
# faça um commit único e envie com: git push -f origin gh-pages
```

## Estrutura

| Caminho | O quê |
|---|---|
| `src/lib/db.ts` | Inicia o DuckDB, registra as tabelas e mede o tempo das consultas (rodapé "Desempenho") |
| `src/lib/filtros.ts` | Estado dos filtros e a cláusula `WHERE` comum às tabelas fato |
| `src/lib/useConsulta.ts` | Hook que roda uma SQL e mantém o resultado anterior durante a recarga |
| `src/lib/graficos.ts` | Opções padrão de linha, barras e barra 100% |
| `src/lib/tema.ts`, `src/styles.css` | Tokens de cor (claro e escuro) lidos também pelos gráficos |
| `src/components/` | Barra de filtros, cartão com "ver tabela", seletor com busca, tabela ordenável de queda |
| `src/pages/` | Uma página por aba |
| `public/geo/br-uf.json` | Contorno dos estados para o mapa |

Toda visualização tem a opção "Ver tabela", para nenhum valor ficar só no tooltip.
