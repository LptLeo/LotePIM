import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/AppDataSource.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { CreateUsuarioDto, UpdateUsuarioDto, UpdateSenhaDto } from '../dto/usuario.dto.js';
import { AppError } from '../errors/AppError.js';

const SALT_ROUNDS = 12;

export type UsuarioSemSenha = Omit<Usuario, 'senha_hash'>;

function omitSenha(usuario: Usuario): UsuarioSemSenha {
  const { senha_hash: _, ...resto } = usuario;
  return resto as UsuarioSemSenha;
}

export class UsuarioService {
  private userRepo = AppDataSource.getRepository(Usuario);

  private verificaPermissao(id: number, requisitante: { id: number, perfil: PerfilUsuario }, verificar: { proprio?: boolean, gestor?: boolean }) {
    const requisitanteProprio = id === requisitante.id;
    const requisitanteGestor = requisitante.perfil === PerfilUsuario.GESTOR;

    if (verificar.proprio && verificar.gestor) {
      if (!requisitanteProprio && !requisitanteGestor) {
        throw new AppError('Acesso negado: apenas o próprio usuário ou um gestor podem realizar esta ação', 403);
      }

      return;
    }

    if (verificar.gestor && !requisitanteGestor) {
      throw new AppError('Acesso negado: apenas gestores podem realizar esta ação', 403);
    }
  }

  findAll = async (requisitante: { id: number, perfil: PerfilUsuario }): Promise<UsuarioSemSenha[]> => {
    this.verificaPermissao(0, requisitante, { gestor: true });
    const usuarios = await this.userRepo.find({ order: { nome: 'ASC' } });

    return usuarios.map(omitSenha);
  }

  findById = async (id: number, requisitante: { id: number, perfil: PerfilUsuario }): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    this.verificaPermissao(id, requisitante, { proprio: true, gestor: true });

    return omitSenha(usuario);
  }

  findByEmail = async (email: string): Promise<UsuarioSemSenha> => {
    const emailUsuario = await this.userRepo.findOneBy({ email });

    if (!emailUsuario) throw new AppError('E-mail não encontrado', 404);

    return omitSenha(emailUsuario);
  }

  create = async (dto: CreateUsuarioDto, requisitante: { id: number, perfil: PerfilUsuario }): Promise<UsuarioSemSenha> => {
    this.verificaPermissao(0, requisitante, { gestor: true });

    const existe = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existe) throw new AppError(`E-mail '${dto.email}' já está em uso`, 409);

    const senha_hash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    const { senha: _, ...dadosSemSenha } = dto;
    const usuario = this.userRepo.create({ ...dadosSemSenha, senha_hash });

    const salvo = await this.userRepo.save(usuario);

    return omitSenha(salvo);
  }

  update = async (id: number, dto: UpdateUsuarioDto, requisitante: { id: number, perfil: PerfilUsuario }): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    this.verificaPermissao(id, requisitante, { proprio: true, gestor: true });

    if (dto.email && dto.email !== usuario.email) {
      const existe = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existe) throw new AppError(`E-mail '${dto.email}' já está em uso`, 409);
    }

    Object.assign(usuario, dto);
    const atualizado = await this.userRepo.save(usuario);

    return omitSenha(atualizado);
  }

  updateSenha = async (id: number, dto: UpdateSenhaDto, requisitante: { id: number, perfil: PerfilUsuario }): Promise<void> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    this.verificaPermissao(id, requisitante, { proprio: true, gestor: true });

    const senhaCorreta = await bcrypt.compare(dto.senha_atual, usuario.senha_hash);
    if (!senhaCorreta) throw new AppError('Senha atual incorreta', 401);

    usuario.senha_hash = await bcrypt.hash(dto.nova_senha, SALT_ROUNDS);
    await this.userRepo.save(usuario);
  }

  delete = async (id: number, requisitante: { id: number, perfil: PerfilUsuario }): Promise<void> => {
    const usuario = await this.userRepo.findOne({ where: { id } });

    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    this.verificaPermissao(id, requisitante, { gestor: true });

    usuario.ativo = false;
    await this.userRepo.save(usuario);
  }
}