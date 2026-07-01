import { Entity, Column, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { EntidadeBase } from './base.entity.js';
import { Usuario } from './Usuario.js';

export enum TipoNotificacao {
  SISTEMA = 'sistema',
  ESTOQUE = 'estoque',
  INSPECAO = 'inspecao',
  PRODUTO = 'produto',
}

interface NotificacaoMetadata {
  link?: string;
  idRef?: number;
  filtro?: string;
}

@Entity('notificacao')
export class Notificacao extends EntidadeBase {
  @Column({ type: 'text', nullable: false })
  mensagem!: string;

  @Column({
    type: 'enum',
    enum: TipoNotificacao,
    default: TipoNotificacao.SISTEMA,
    nullable: false,
  })
  tipo!: TipoNotificacao;

  @Column({ type: 'boolean', default: false, nullable: false })
  lida!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: NotificacaoMetadata | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.notificacoes)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Relation<Usuario>;
}
