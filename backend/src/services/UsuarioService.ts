import type { Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource";
import { Usuario } from "../entities/Usuario.js";

export class UsuarioService {
  private userRepo: Repository<Usuario>

  constructor() {
    this.userRepo = AppDataSource.getRepository(Usuario);
  }

  async getAllUsers() {
    return await this.userRepo.find();
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    return user;
  }

  async getByEmail(email: string) {
    return await this.userRepo.findOneBy({ email });
  }

  async createUser(data: any) {
    const user = await this.getByEmail(data.email)

    if (user) {
      throw new Error("Usuário já cadastrado");
    }

    const newUser = this.userRepo.create(data);

    return await this.userRepo.save(newUser);
  }

  async updateUser(id: string, data: any) {
    const user = await this.getUserById(id);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updatedUser = this.userRepo.merge(user, data);

    return await this.userRepo.save(updatedUser);
  }

  async deleteUser(id: string) {
    const user = await this.getUserById(id);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    await this.userRepo.remove(user);
  }
}