import { Component, input, output } from '@angular/core';
import { UsuarioPerfil } from '../../../../core/services/usuario.service.js';
import {
  PaginationComponent,
  PaginationMeta,
} from '../../../../shared/components/pagination/pagination.js';
import { SelectOption } from '../../../../shared/components/form-controls/select-field/select-field.js';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.js';
import { UserActionsComponent } from '../../../../shared/components/user-actions/user-actions.js';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [PaginationComponent, StatusBadgeComponent, UserActionsComponent],
  templateUrl: './user-list.html',
})
export class UserListComponent {
  // === INPUTS ===
  usuarios = input.required<UsuarioPerfil[]>();
  paginationMeta = input<PaginationMeta | null>(null);
  carregando = input<boolean>(false);
  erro = input<string | null>(null);

  filtroTermo = input<string>('');
  filtroPerfil = input<string>('todos');
  filtroStatus = input<string>('todos');

  filtroPerfilOptions = input.required<SelectOption[]>();
  filtroStatusOptions = input.required<SelectOption[]>();

  // === OUTPUTS ===
  atualizar = output<void>();
  mudarBusca = output<string>();
  mudarFiltroPerfil = output<string>();
  mudarFiltroStatus = output<string>();
  mudarPagina = output<number>();
  desativar = output<number>();
  reativar = output<number>();
}
