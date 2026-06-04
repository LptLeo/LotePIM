export const MSG = {
  naoEncontrado: (nome: string) => `${nome} não encontrado(a).`,
  materiaPrimaNaoEncontrada: 'Matéria-prima não encontrada.',
  produtoNaoEncontrado: 'Produto não encontrado.',
  usuarioNaoEncontrado: 'Usuário não encontrado',
  operadorNaoEncontrado: 'Operador não encontrado.',
  inspetorNaoEncontrado: 'Inspetor não encontrado.',
  criadorNaoEncontrado: 'Criador não encontrado.',
  loteNaoEncontrado: 'Lote não encontrado.',
  emailEmUso: (email: string) => `E-mail '${email}' já está em uso`,
  emailNaoEncontrado: 'E-mail não encontrado',
  senhaIncorreta: 'Senha atual incorreta',
  acessoNegado: 'Acesso negado',
} as const;
