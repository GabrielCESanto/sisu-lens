const LINKEDIN = 'https://www.linkedin.com/in/gabs-dados'

export function Sobre() {
  return (
    <div className="sobre">
      <section className="cartao autor">
        <img src="autor.jpg" alt="Foto de Gabriel Carvalho do Espírito Santo" width={120} height={120} />
        <div>
          <h2>Gabriel Carvalho do Espírito Santo</h2>
          <p>Engenharia de Computação · UTFPR – Câmpus Cornélio Procópio</p>
          <p className="fraco">Orientação: Prof. Dr. Francisco Pereira Junior</p>
          <a className="botao-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            LinkedIn
          </a>
        </div>
      </section>

      <section className="cartao texto">
        <h2 style={{ marginTop: 0 }}>O que é o SISU Lens</h2>
        <p>
          Um painel aberto sobre as inscrições no Sistema de Seleção Unificada (SISU) de 2014 a 2023 e o perfil
          socioeconômico de quem se inscreveu, declarado no ENEM do ano anterior. Qualquer instituição participante do
          SISU pode ser analisada, e as páginas Universidades e Cursos comparam todas de uma vez.
        </p>
        <p>
          Ele nasceu do Trabalho de Conclusão de Curso <i>"Análise de dados: um estudo sobre o número de inscritos na
          UTFPR-CP"</i> (2026), que estudou a queda de candidatos no câmpus Cornélio Procópio da UTFPR. O painel leva a
          mesma análise para o SISU inteiro, com os dados tratados e publicados para quem quiser reaproveitar.
        </p>
        <div className="numeros">
          <div><b>~60 GB</b><span>de arquivos brutos do MEC e do INEP</span></div>
          <div><b>20</b><span>edições do SISU (2014/1 a 2023/2)</span></div>
          <div><b>51,2 mi</b><span>inscrições na 1ª chamada / chamada regular</span></div>
          <div><b>151</b><span>instituições e 1.441 câmpus</span></div>
        </div>
      </section>

      <section className="cartao texto destaque">
        <h2 style={{ marginTop: 0 }}>A ideia central: ligar SISU e ENEM pelas cinco notas</h2>
        <p>
          O SISU diz <b>onde</b> cada pessoa se inscreveu (instituição, câmpus, curso), mas não traz o perfil
          socioeconômico. O ENEM traz o questionário (renda, escolaridade dos pais, tipo de escola…), mas não diz em
          que curso a pessoa se inscreveu depois. Por causa da LGPD, o número de inscrição é mascarado nas duas bases, então
          não existe uma chave em comum.
        </p>
        <div className="ligacao" aria-label="Diagrama: SISU e ENEM ligados pelas cinco notas">
          <div className="base"><b>SISU (MEC)</b><span>instituição, curso, aprovação, notas</span></div>
          <div className="chave">
            <span>CN · CH · LC · MT · Redação</span>
            <small>as 5 notas como chave</small>
          </div>
          <div className="base"><b>ENEM (INEP)</b><span>questionário socioeconômico, notas</span></div>
        </div>
        <p>
          A solução do TCC foi usar a <b>combinação das cinco notas</b> (Ciências da Natureza, Ciências Humanas,
          Linguagens, Matemática e Redação) como chave. Com notas de prova em escala contínua, a chance de duas pessoas
          tirarem exatamente as mesmas cinco notas é mínima: no ENEM 2018, só 16 combinações se repetem entre 3,9 milhões
          de participantes. No TCC a perda na junção foi de cerca de 0,17%. No SISU Lens, mais de 99,5% das inscrições de
          cada edição são ligadas a um único participante; os casos ambíguos aparecem como "Sem informação".
        </p>
      </section>

      <section className="cartao texto">
        <h2 style={{ marginTop: 0 }}>O que o TCC concluiu</h2>
        <ul>
          <li>As inscrições na UTFPR-CP caíram mais de <b>84%</b> entre o semestre de maior e o de menor procura (2014–2023).</li>
          <li>O perfil predominante é masculino, de 17 a 19 anos, vindo principalmente do Paraná e de São Paulo.</li>
          <li>Análise e Desenvolvimento de Sistemas e Engenharia de Software tiveram mais inscrições; Matemática e Engenharia Mecânica, as maiores quedas.</li>
          <li>A maioria dos candidatos vem de famílias com renda de até R$ 3.500, e a distribuição de renda mudou pouco a pouco ao longo dos anos.</li>
          <li>As notas médias ficaram estáveis: a procura caiu sem queda de desempenho.</li>
        </ul>
        <p>
          A queda aconteceu <b>em todos os grupos</b>, em qualquer renda, região ou faixa de nota. Nenhum dos fatores
          estudados explica a redução sozinho. O desafio de atrair candidatos parece depender de fatores econômicos,
          sociais, demográficos ou institucionais fora dessas bases, como a forma como as novas gerações enxergam a
          graduação. O trabalho recomenda manter a divulgação da instituição e investir em permanência estudantil.
        </p>
        <p>
          O SISU Lens mostra que o fenômeno não é só local: somando todas as instituições do SISU, as inscrições
          passaram de 7,3 milhões em 2014 para 2,6 milhões em 2023 (−64%). Parte disso vem de instituições que entraram
          ou saíram do sistema; a página Universidades permite comparar só quem participou nos dois anos.
        </p>
      </section>

      <section className="cartao texto">
        <h2 style={{ marginTop: 0 }}>Como os dados foram extraídos, tratados e publicados</h2>
        <ul>
          <li><b>Extração:</b> listagens da Chamada Regular do SISU (MEC) e microdados do ENEM (INEP), ambos dados abertos.</li>
          <li><b>Tratamento:</b> 20 edições com layouts diferentes padronizadas num só formato (codificação, aspas, nomes de município, linhas corrompidas). O questionário do ENEM 2013–2014 usava outra escala e foi convertido para a de 2015 em diante; a ocupação dos pais não existia nesses anos.</li>
          <li><b>Contagem:</b> o painel conta <b>inscrições</b> (cada opção de curso) na 1ª chamada ou chamada regular, como no TCC. Um candidato pode ter até duas inscrições.</li>
          <li><b>Renda:</b> as faixas estão em salários mínimos, o que permite comparar anos diferentes.</li>
          <li><b>Publicação:</b> os ~60 GB viram arquivos Parquet compactados, e o painel consulta os agregados direto no navegador (DuckDB-WASM), sem servidor.</li>
        </ul>

        <h2>Privacidade (LGPD)</h2>
        <ul>
          <li>Nome, CPF, número de inscrição e data de nascimento nunca saem do processamento.</li>
          <li>Este painel só usa dados agregados. Nenhuma nota individual é publicada.</li>
          <li>Nas informações vindas do ENEM, grupos com menos de 5 inscrições são ocultados ("suprimidos"), para que ninguém seja identificado. Por isso alguns totais socioeconômicos ficam um pouco abaixo do total de inscrições.</li>
        </ul>

        <h2>Limitações conhecidas</h2>
        <ul>
          <li>A idade é aproximada: ano da edição menos o ano de nascimento.</li>
          <li>Em 2015-1, 5 linhas do arquivo original do MEC estão corrompidas e foram descartadas.</li>
          <li>Notas de corte não divulgadas ficam fora das médias (não são tratadas como zero).</li>
          <li>A rede (federal, estadual ou municipal) é deduzida do nome da instituição; as distritais do DF contam como estaduais.</li>
        </ul>
      </section>
    </div>
  )
}
