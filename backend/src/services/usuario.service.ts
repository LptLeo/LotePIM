import type { Repository } from 'typeorm';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { Lote } from '../entities/Lote.js';
import { Inspecao } from '../entities/Inspecao.js';
import { Produto } from '../entities/Produto.js';
import type {
  CriarUsuarioDTO,
  AtualizarUsuarioDTO,
  AtualizarSenhaDTO,
  ListUsuariosQueryDto,
} from '../dto/usuario.dto.js';
import { formatarRespostaPaginada, type RespostaPaginada } from '../dto/paginacao.dto.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import { findOneByOrFail, findOneOrFail } from '../utils/orm.utils.js';
import { hashSenha, verificarSenha } from '../utils/crypto.utils.js';
import { MSG } from '../errors/errorMessages.js';

export type UsuarioSemSenha = Omit<Usuario, 'senha_hash'>;

export interface UsuarioStats {
  lotes_produzidos: number;
  lotes_inspecionados: number;
  produtos_registrados: number;
}

interface UsuarioDependencies {
  usuarioRepo: Repository<Usuario>;
  loteRepo: Repository<Lote>;
  inspecaoRepo: Repository<Inspecao>;
  produtoRepo: Repository<Produto>;
}

export class UsuarioService {
  constructor(private readonly dependencies: UsuarioDependencies) {}

  // === FUNÇÕES PÚBLICAS ===

  public async listar(
    query: ListUsuariosQueryDto,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<UsuarioSemSenha>> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const { pagina, limite, busca, perfil, ativo } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.dependencies.usuarioRepo
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.criadoPor', 'criador')
      .skip(skip)
      .take(limite)
      .orderBy('usuario.nome', 'ASC');

    if (busca) {
      queryBuilder.andWhere('(usuario.nome ILIKE :busca OR usuario.email ILIKE :busca)', {
        busca: `%${busca}%`,
      });
    }

    if (perfil && perfil !== 'todos') {
      queryBuilder.andWhere('usuario.perfil = :perfil', { perfil });
    }

    if (ativo && ativo !== 'todos') {
      const isAtivo = ativo === 'ativos';
      queryBuilder.andWhere('usuario.ativo = :isAtivo', { isAtivo });
    }

    const [usuarios, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada(
      [usuarios.map((u) => this.omitSenha(u)), total],
      query,
    );
  }

  public async buscarPorId(
    id: number,
    requisitante: Requisitante,
  ): Promise<UsuarioSemSenha> {
    const usuario = await findOneOrFail(
      this.dependencies.usuarioRepo,
      { where: { id }, relations: ['criadoPor'] },
      'Usuário',
    );

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    return this.omitSenha(usuario);
  }

  public async obterStats(id: number, requisitante: Requisitante): Promise<UsuarioStats> {
    const usuario = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id },
      'Usuário',
    );

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    let lotesProduzidos = 0;
    let lotesInspecionados = 0;
    let produtosRegistrados = 0;

    if (
      usuario.perfil === PerfilUsuario.OPERADOR ||
      usuario.perfil === PerfilUsuario.GESTOR
    ) {
      lotesProduzidos = await this.dependencies.loteRepo.count({
        where: { operador: { id } },
      });
    }

    if (
      usuario.perfil === PerfilUsuario.INSPETOR ||
      usuario.perfil === PerfilUsuario.GESTOR
    ) {
      lotesInspecionados = await this.dependencies.inspecaoRepo.count({
        where: { inspetor: { id } },
      });
    }

    if (usuario.perfil === PerfilUsuario.GESTOR) {
      produtosRegistrados = await this.dependencies.produtoRepo.count();
    }

    return {
      lotes_produzidos: lotesProduzidos,
      lotes_inspecionados: lotesInspecionados,
      produtos_registrados: produtosRegistrados,
    };
  }

  public async buscarPorEmail(email: string): Promise<UsuarioSemSenha> {
    const usuario = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { email },
      'E-mail',
    );

    return this.omitSenha(usuario);
  }

  public async criar(
    dto: CriarUsuarioDTO,
    requisitante: Requisitante,
  ): Promise<UsuarioSemSenha> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const existe = await this.dependencies.usuarioRepo.findOne({
      where: { email: dto.email },
    });
    if (existe) throw new AppError(MSG.emailEmUso(dto.email), 409);

    const criador = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id: requisitante.id },
      'Criador',
    );

    const senhaHash = await hashSenha(dto.senha);

    const { senha: _, ...dadosSemSenha } = dto;
    const usuario = this.dependencies.usuarioRepo.create({
      ...dadosSemSenha,
      senha_hash: senhaHash,
      criadoPor: criador,
    });

    const salvo = await this.dependencies.usuarioRepo.save(usuario);

    return this.omitSenha(salvo);
  }

  public async atualizar(
    id: number,
    dto: AtualizarUsuarioDTO,
    requisitante: Requisitante,
  ): Promise<UsuarioSemSenha> {
    const usuario = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id },
      'Usuário',
    );

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    if (requisitante.perfil !== PerfilUsuario.GESTOR) {
      if ('perfil' in dto) delete (dto as Record<string, unknown>).perfil;
      if ('ativo' in dto) delete (dto as Record<string, unknown>).ativo;
    }

    if (dto.email && dto.email !== usuario.email) {
      const existe = await this.dependencies.usuarioRepo.findOne({
        where: { email: dto.email },
      });
      if (existe) throw new AppError(MSG.emailEmUso(dto.email), 409);
    }

    Object.assign(usuario, dto);
    const atualizado = await this.dependencies.usuarioRepo.save(usuario);

    return this.omitSenha(atualizado);
  }

  public async atualizarSenha(
    id: number,
    dto: AtualizarSenhaDTO,
    requisitante: Requisitante,
  ): Promise<void> {
    const usuario = await this.dependencies.usuarioRepo
      .createQueryBuilder('usuario')
      .where('usuario.id = :id', { id })
      .addSelect('usuario.senha_hash')
      .getOne();
    if (!usuario) throw new AppError(MSG.usuarioNaoEncontrado, 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    const senhaCorreta = await verificarSenha(dto.senha_atual, usuario.senha_hash);
    if (!senhaCorreta) throw new AppError(MSG.senhaIncorreta, 401);

    usuario.senha_hash = await hashSenha(dto.nova_senha);
    await this.dependencies.usuarioRepo.save(usuario);
  }

  public async desativar(id: number, requisitante: Requisitante): Promise<void> {
    const usuario = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id },
      'Usuário',
    );

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    usuario.ativo = false;
    usuario.refresh_token = null;
    await this.dependencies.usuarioRepo.save(usuario);
  }

  public async reativar(id: number, requisitante: Requisitante): Promise<void> {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const usuario = await findOneByOrFail(
      this.dependencies.usuarioRepo,
      { id },
      'Usuário',
    );

    usuario.ativo = true;
    await this.dependencies.usuarioRepo.save(usuario);
  }

  // === FUNÇÕES AUXILIARES ===

  private omitSenha(usuario: Usuario): UsuarioSemSenha {
    const { senha_hash: _, ...resto } = usuario;
    return resto as UsuarioSemSenha;
  }
}
