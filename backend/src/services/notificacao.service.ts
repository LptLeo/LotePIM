import type { Repository } from 'typeorm';
import { Notificacao, TipoNotificacao } from '../entities/Notificacao.js';
import { Usuario, PerfilUsuario } from '../entities/Usuario.js';
import { findOneOrFail } from '../utils/orm.utils.js';

export class NotificacaoService {
  constructor(
    private readonly notificacaoRepo: Repository<Notificacao>,
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  public async listarPorUsuario(usuarioId: number): Promise<Notificacao[]> {
    return this.notificacaoRepo.find({
      where: { usuario: { id: usuarioId } },
      order: { criado_em: 'DESC' },
    });
  }

  public async marcarComoLida(id: number, usuarioId: number): Promise<Notificacao> {
    const notificacao = await this.validarExistenciaNotificacao(id, usuarioId);
    notificacao.lida = true;
    return this.notificacaoRepo.save(notificacao);
  }

  public async criarNotificacaoParaPerfis(
    mensagem: string,
    tipo: TipoNotificacao,
    perfis: PerfilUsuario[],
    metadata?: Notificacao['metadata'],
  ): Promise<void> {
    const usuarios = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .where('usuario.perfil IN (:...perfis) AND usuario.ativo = true', { perfis })
      .getMany();

    if (usuarios.length === 0) return;

    const notificacoes = usuarios.map((usuario) => {
      const notificacao = new Notificacao();
      notificacao.mensagem = mensagem;
      notificacao.tipo = tipo;
      notificacao.usuario = usuario;
      notificacao.metadata = metadata || null;
      return notificacao;
    });

    await this.notificacaoRepo.save(notificacoes);
  }

  public async criarNotificacaoParaUsuario(
    mensagem: string,
    tipo: TipoNotificacao,
    usuario: Usuario,
    metadata?: Notificacao['metadata'],
  ): Promise<void> {
    const notificacao = new Notificacao();
    notificacao.mensagem = mensagem;
    notificacao.tipo = tipo;
    notificacao.usuario = usuario;
    notificacao.metadata = metadata || null;
    await this.notificacaoRepo.save(notificacao);
  }

  // === VALIDADORAS ===

  private validarExistenciaNotificacao(
    id: number,
    usuarioId: number,
  ): Promise<Notificacao> {
    return findOneOrFail(
      this.notificacaoRepo,
      { where: { id, usuario: { id: usuarioId } } },
      'Notificação',
    );
  }
}
