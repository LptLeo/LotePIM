import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="text-[11px] font-bold px-2 py-0.5 rounded border transition-all"
      [class.text-[#81ECFF]]="ativo()"
      [class.border-[#81ECFF]/30]="ativo()"
      [class.bg-[#81ECFF]/5]="ativo()"
      [class.text-[#fca5a5]]="!ativo()"
      [class.border-[#fca5a5]/30]="!ativo()"
      [class.bg-[#fca5a5]/5]="!ativo()"
    >
      {{ ativo() ? 'Ativo' : 'Inativo' }}
    </span>
  `,
})
export class StatusBadgeComponent {
  ativo = input.required<boolean>();
}
