import { Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { Notificacao, TipoNotificacao } from "../entities/Notificacao.js";
import { Usuario, PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";

export class NotificacaoService {
  private notificacaoRepo: Repository<Notificacao>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.notificacaoRepo = AppDataSource.getRepository(Notificacao);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  async listarPorUsuario(usuarioId: number) {
    return this.notificacaoRepo.find({
      where: { usuario: { id: usuarioId } },
      order: { criado_em: "DESC" }
    });
  }

  async marcarComoLida(id: number, usuarioId: number) {
    const notificacao = await this.notificacaoRepo.findOne({
      where: { id, usuario: { id: usuarioId } }
    });

    if (!notificacao) {
      throw new AppError("Notificação não encontrada.", 404);
    }

    notificacao.lida = true;
    return this.notificacaoRepo.save(notificacao);
  }

  async criarNotificacaoParaPerfis(mensagem: string, tipo: TipoNotificacao, perfis: PerfilUsuario[]) {
    const usuarios = await this.usuarioRepo
      .createQueryBuilder("usuario")
      .where("usuario.perfil IN (:...perfis) AND usuario.ativo = true", { perfis })
      .getMany();

    if (usuarios.length === 0) return;

    const notificacoes = usuarios.map(usuario => {
      const notificacao = new Notificacao();
      notificacao.mensagem = mensagem;
      notificacao.tipo = tipo;
      notificacao.usuario = usuario;
      return notificacao;
    });

    await this.notificacaoRepo.save(notificacoes);
  }

  async criarNotificacaoParaUsuario(mensagem: string, tipo: TipoNotificacao, usuario: Usuario) {
    const notificacao = new Notificacao();
    notificacao.mensagem = mensagem;
    notificacao.tipo = tipo;
    notificacao.usuario = usuario;
    await this.notificacaoRepo.save(notificacao);
  }
}