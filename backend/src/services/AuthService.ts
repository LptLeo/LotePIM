import type { Repository } from "typeorm";
import { Usuario } from "../entities/Usuario.js";
import { AppDataSource } from "../config/AppDataSource.js";
import { AppError } from "../errors/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { LoginDTO } from "../dto/LoginDTO.js";
import type { CreateUsuarioDto } from "../dto/usuario.dto.js";

export class AuthService {
  private userRepo: Repository<Usuario>

  constructor() {
    this.userRepo = AppDataSource.getRepository(Usuario);
  }

  async login(dados: LoginDTO) {
    const usuario = await this.userRepo.findOneBy({ email: dados.email });

    if (!usuario) throw new AppError('E-mail ou senha incorretos.', 404);

    if (!usuario.ativo) throw new AppError("Este usuário está desativado. Entre em contato com o administrador.", 403);

    const senhaValida = await bcrypt.compare(dados.senha, usuario.senha_hash);

    if (!senhaValida) throw new AppError("E-mail ou senha incorretos.", 401);

    const secret = process.env.JWT_SECRET!

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil
      },
      secret,
      { expiresIn: "8h" }
    );

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      token
    }
  }

  async register(dados: CreateUsuarioDto) {
    const usuario = await this.userRepo.findOneBy({ email: dados.email });

    if (usuario) throw new AppError("E-mail já cadastrado.", 409);

    const senha_hash = await bcrypt.hash(dados.senha, 10);

    const { senha: _, ...dadosSemSenha } = dados;

    const usuarioCriado = this.userRepo.create({ ...dadosSemSenha, senha_hash, ativo: true });

    await this.userRepo.save(usuarioCriado);

    const secret = process.env.JWT_SECRET!

    const token = jwt.sign(
      {
        id: usuarioCriado.id,
        nome: usuarioCriado.nome,
        perfil: usuarioCriado.perfil
      },
      secret,
      { expiresIn: "8h" }
    );

    return {
      usuario: {
        id: usuarioCriado.id,
        nome: usuarioCriado.nome,
        email: usuarioCriado.email
      },
      token
    }
  }
}