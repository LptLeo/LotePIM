import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-actions',
  standalone: true,
  template: `
    <div class="flex items-center justify-end gap-2">
      @if (ativo() && perfil() !== 'gestor') {
        <button
          (click)="deactivate.emit(id())"
          [class]="buttonClass"
          title="Desativar Colaborador"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 md:w-5 md:h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z"
            />
          </svg>
        </button>
      } @else if (perfil() === 'gestor') {
        <span class="text-[10px] text-[#484847] italic pr-2">Protegido</span>
      } @else {
        <div class="flex items-center gap-2">
          @if (showText()) {
            <span class="text-[10px] text-red-500/40 font-bold uppercase tracking-wider"
              >Desativado</span
            >
          }
          <button
            (click)="reactivate.emit(id())"
            [class]="reactivateButtonClass"
            title="Reativar Colaborador"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4 md:w-5 md:h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M18 7.5V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h1.5m9-10.5h3m0 0v3m0-3-3 3m-3 2.25A2.25 2.25 0 1 1 9 15a2.25 2.25 0 0 1 4.5 0Zm7.5 3v.75A2.25 2.25 0 0 1 18.75 21h-9A2.25 2.25 0 0 1 7.5 18.75V18"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class UserActionsComponent {
  id = input.required<number>();
  ativo = input.required<boolean>();
  perfil = input.required<string>();
  showText = input<boolean>(true);

  deactivate = output<number>();
  reactivate = output<number>();

  public buttonClass =
    'p-1.5 md:p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-all cursor-pointer border border-red-400/10 md:border-red-400/20';
  public reactivateButtonClass =
    'p-1.5 md:p-2 text-[#00E5FF]/60 hover:text-[#00E5FF] hover:bg-[#00E5FF]/10 rounded transition-all cursor-pointer border border-[#00E5FF]/10 md:border-[#00E5FF]/20';
}
