import type { Repository } from 'typeorm';
import type { StringValue } from 'ms';
import jwt from 'jsonwebtoken';
import { Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';
import { hashSenha, verificarSenha } from '../utils/crypto.utils.js';
import { findOneOrFail } from '../utils/orm.utils.js';
import type { LoginDTO } from '../dto/login.dto.js';

export class AuthService {
  private usuarioRepo: Repository<Usuario>;

  constructor(usuarioRepo: Repository<Usuario>) {
    this.usuarioRepo = usuarioRepo;
  }

  public async login(dados: LoginDTO) {
    const usuario = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.senha_hash')
      .where('usuario.email = :email', { email: dados.email })
      .getOne();

    if (!usuario) throw new AppError('E-mail ou senha incorretos.', 401);

    if (!usuario.ativo)
      throw new AppError(
        'Este usuário está desativado. Entre em contato com o administrador.',
        403,
      );

    const senhaValida = await verificarSenha(dados.senha, usuario.senha_hash);

    if (!senhaValida) throw new AppError('E-mail ou senha incorretos.', 401);

    return this.gerarERegistrarTokens(usuario);
  }

  public async refresh(token: string) {
    if (!token) throw new AppError('Refresh token não fornecido.', 401);

    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number };

      const usuario = await findOneOrFail(
        this.usuarioRepo,
        {
          where: { id: decoded.id },
          select: ['id', 'nome', 'email', 'perfil', 'ativo', 'refresh_token'],
        },
        'Usuário',
        401,
      );

      if (!usuario.ativo || !usuario.refresh_token) {
        throw new AppError('Sessão inválida ou usuário desativado.', 401);
      }

      const tokenValido = await verificarSenha(token, usuario.refresh_token);
      if (!tokenValido) throw new AppError('Token de atualização inválido.', 401);

      return await this.gerarERegistrarTokens(usuario);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Token de atualização expirado ou inválido.', 401);
    }
  }

  public async logout(usuarioId: number) {
    await this.usuarioRepo.update(usuarioId, { refresh_token: null });
  }

  private async gerarERegistrarTokens(usuario: Usuario) {
    const tokenAcesso = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRATION as StringValue },
    );

    const tokenAtualizacao = jwt.sign({ id: usuario.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRATION as StringValue,
    });

    const hash = await hashSenha(tokenAtualizacao, env.JWT_SALT);
    await this.usuarioRepo.update(usuario.id, { refresh_token: hash });

    return { tokenAcesso, tokenAtualizacao };
  }
}
