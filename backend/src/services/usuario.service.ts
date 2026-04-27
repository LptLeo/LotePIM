import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/AppDataSource.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { Lote } from '../entities/Lote.js';
import { Inspecao } from '../entities/Inspecao.js';
import { Produto } from '../entities/Produto.js';
import { CreateUsuarioDto, UpdateUsuarioDto, UpdateSenhaDto } from '../dto/usuario.dto.js';
import { PaginacaoQueryDto, formatarRespostaPaginada, type RespostaPaginada } from '../dto/paginacao.dto.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';

const SALT_ROUNDS = 12;

export type UsuarioSemSenha = Omit<Usuario, 'senha_hash'>;

function omitSenha(usuario: Usuario): UsuarioSemSenha {
  const { senha_hash: _, ...resto } = usuario;
  return resto as UsuarioSemSenha;
}

export class UsuarioService {
  private userRepo = AppDataSource.getRepository(Usuario);

  findAll = async (query: PaginacaoQueryDto & { perfil?: string, ativo?: string }, requisitante: Requisitante): Promise<RespostaPaginada<UsuarioSemSenha>> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);
    
    const { pagina, limite, busca, perfil, ativo } = query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.userRepo.createQueryBuilder("usuario")
      .leftJoinAndSelect("usuario.criadoPor", "criador")
      .skip(skip)
      .take(limite)
      .orderBy("usuario.nome", "ASC");

    if (busca) {
      queryBuilder.andWhere("(usuario.nome ILIKE :busca OR usuario.email ILIKE :busca)", { busca: `%${busca}%` });
    }

    if (perfil && perfil !== 'todos') {
      queryBuilder.andWhere("usuario.perfil = :perfil", { perfil });
    }

    if (ativo && ativo !== 'todos') {
      const isAtivo = ativo === 'ativos';
      queryBuilder.andWhere("usuario.ativo = :isAtivo", { isAtivo });
    }

    const [usuarios, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([usuarios.map(omitSenha), total], query);
  }

  findById = async (id: number, requisitante: Requisitante): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ 
      where: { id },
      relations: ['criadoPor']
    });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    return omitSenha(usuario);
  }

  getStats = async (id: number, requisitante: Requisitante): Promise<any> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    let lotes_produzidos = 0;
    let lotes_inspecionados = 0;
    let produtos_registrados = 0;

    if (usuario.perfil === PerfilUsuario.OPERADOR || usuario.perfil === PerfilUsuario.GESTOR) {
      lotes_produzidos = await AppDataSource.getRepository(Lote).count({ where: { operador: { id } } });
    }

    if (usuario.perfil === PerfilUsuario.INSPETOR || usuario.perfil === PerfilUsuario.GESTOR) {
      lotes_inspecionados = await AppDataSource.getRepository(Inspecao).count({ where: { inspetor: { id } } });
    }

    if (usuario.perfil === PerfilUsuario.GESTOR) {
      produtos_registrados = await AppDataSource.getRepository(Produto).count();
    }

    return {
      lotes_produzidos,
      lotes_inspecionados,
      produtos_registrados
    };
  }

  findByEmail = async (email: string): Promise<UsuarioSemSenha> => {
    const emailUsuario = await this.userRepo.findOneBy({ email });

    if (!emailUsuario) throw new AppError('E-mail não encontrado', 404);

    return omitSenha(emailUsuario);
  }

  create = async (dto: CreateUsuarioDto, requisitante: Requisitante): Promise<UsuarioSemSenha> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const existe = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existe) throw new AppError(`E-mail '${dto.email}' já está em uso`, 409);

    const criador = await this.userRepo.findOneBy({ id: requisitante.id });
    if (!criador) throw new AppError('Criador não encontrado', 404);

    const senha_hash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    const { senha: _, ...dadosSemSenha } = dto;
    const usuario = this.userRepo.create({ 
      ...dadosSemSenha, 
      senha_hash,
      criadoPor: criador 
    });

    const salvo = await this.userRepo.save(usuario);

    return omitSenha(salvo);
  }

  update = async (id: number, dto: UpdateUsuarioDto, requisitante: Requisitante): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    // Segurança Pesada: Um usuário não-gestor jamais pode alterar seu próprio nível de permissão (perfil) ou status
    if (requisitante.perfil !== PerfilUsuario.GESTOR) {
      if ('perfil' in dto) delete dto.perfil;
      if ('ativo' in dto) delete dto.ativo;
    }

    if (dto.email && dto.email !== usuario.email) {
      const existe = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existe) throw new AppError(`E-mail '${dto.email}' já está em uso`, 409);
    }

    Object.assign(usuario, dto);
    const atualizado = await this.userRepo.save(usuario);

    return omitSenha(atualizado);
  }

  updateSenha = async (id: number, dto: UpdateSenhaDto, requisitante: Requisitante): Promise<void> => {
    const usuario = await this.userRepo.createQueryBuilder("usuario")
      .where("usuario.id = :id", { id })
      .addSelect("usuario.senha_hash")
      .getOne();
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    const senhaCorreta = await bcrypt.compare(dto.senha_atual, usuario.senha_hash);
    if (!senhaCorreta) throw new AppError('Senha atual incorreta', 401);

    usuario.senha_hash = await bcrypt.hash(dto.nova_senha, SALT_ROUNDS);
    await this.userRepo.save(usuario);
  }

  delete = async (id: number, requisitante: Requisitante): Promise<void> => {
    const usuario = await this.userRepo.findOne({ where: { id } });

    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    usuario.ativo = false;
    usuario.refresh_token = null; // Limpa o token para impedir renovação automática
    await this.userRepo.save(usuario);
  }

  reactivate = async (id: number, requisitante: Requisitante): Promise<void> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    usuario.ativo = true;
    await this.userRepo.save(usuario);
  }
}