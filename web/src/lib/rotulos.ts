// Rótulos das categorias harmonizadas no ETL (ver docs/dicionario.md).

export const RENDA: Record<string, string> = {
  A: 'Nenhuma renda', B: 'Até 1 SM', C: '1 a 1,5 SM', D: '1,5 a 2 SM', E: '2 a 2,5 SM', F: '2,5 a 3 SM',
  G: '3 a 4 SM', H: '4 a 5 SM', I: '5 a 6 SM', J: '6 a 7 SM', K: '7 a 8 SM', L: '8 a 9 SM',
  M: '9 a 10 SM', N: '10 a 12 SM', O: '12 a 15 SM', P: '15 a 20 SM', Q: 'Mais de 20 SM',
}
export const ORDEM_RENDA = Object.keys(RENDA)

export const ESCOLARIDADE: Record<string, string> = {
  '0': 'Nunca estudou', '1': 'Fundamental incompleto', '2': 'Fundamental completo',
  '3': 'Médio completo', '4': 'Superior completo', '5': 'Pós-graduação', '9': 'Não sabe',
}

// Grupos do questionário do ENEM (Q003/Q004, 2015+), com exemplos do dicionário oficial.
export const OCUPACAO: Record<string, string> = {
  A: 'Grupo 1', B: 'Grupo 2', C: 'Grupo 3', D: 'Grupo 4', E: 'Grupo 5', F: 'Não sabe',
}
export const OCUPACAO_DESCRICAO: Record<string, string> = {
  A: 'Lavrador, agricultor sem empregados, boia-fria, criador de animais, pescador, extrativista',
  B: 'Diarista, empregado doméstico, cuidador, porteiro, carteiro, vendedor, caixa, atendente',
  C: 'Padeiro, costureiro, operador de máquinas, soldador, operário, pedreiro, eletricista',
  D: 'Professor (fundamental/médio), técnico, policial, militar de baixa patente, supervisor',
  E: 'Médico, engenheiro, advogado, juiz, professor universitário, diretor, oficial, empresário',
  F: 'Não sabe',
}

export const QTD: Record<string, string> = { '0': 'Nenhum', '1': '1', '2': '2', '3': '3 ou mais' }

export const COR_RACA: Record<string, string> = {
  '0': 'Não declarado', '1': 'Branca', '2': 'Preta', '3': 'Parda', '4': 'Amarela', '5': 'Indígena', '6': 'Sem informação',
}

export const FAIXAS_IDADE = [
  'Menor de 17', '17 anos', '18 anos', '19 anos', '20 anos', '21 anos', '22 anos', '23 anos', '24 anos', '25 anos',
  '26 a 30', '31 a 35', '36 a 40', '41 a 50', '51 a 60', 'Mais de 60',
]

/** Categorias especiais vindas da camada gold. */
export const SEM_INFO = ['Sem informação', 'Suprimido', 'Não respondeu']

export const rotulo = (mapa: Record<string, string>, k: string) => mapa[k] ?? k
