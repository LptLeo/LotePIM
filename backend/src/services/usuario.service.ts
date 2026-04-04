import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/AppDataSource.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { CreateUsuarioDto, UpdateUsuarioDto, UpdateSenhaDto } from '../dto/usuario.dto.js';
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

  findAll = async (requisitante: Requisitante): Promise<UsuarioSemSenha[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);
    const usuarios = await this.userRepo.find({ order: { nome: 'ASC' } });

    return usuarios.map(omitSenha);
  }

  findById = async (id: number, requisitante: Requisitante): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

    return omitSenha(usuario);
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

    const senha_hash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    const { senha: _, ...dadosSemSenha } = dto;
    const usuario = this.userRepo.create({ ...dadosSemSenha, senha_hash });

    const salvo = await this.userRepo.save(usuario);

    return omitSenha(salvo);
  }

  update = async (id: number, dto: UpdateUsuarioDto, requisitante: Requisitante): Promise<UsuarioSemSenha> => {
    const usuario = await this.userRepo.findOne({ where: { id } });
    if (!usuario) throw new AppError('Usuário não encontrado', 404);

    verificaPermissao(requisitante, [PerfilUsuario.GESTOR], id);

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
    await this.userRepo.save(usuario);
  }
}