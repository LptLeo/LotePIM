import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashSenha(senha: string, saltRounds?: number): Promise<string> {
  return bcrypt.hash(senha, saltRounds ?? SALT_ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
