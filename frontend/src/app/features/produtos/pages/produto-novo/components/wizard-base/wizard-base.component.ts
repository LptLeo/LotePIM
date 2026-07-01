import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-wizard-base',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './wizard-base.component.html',
})
export class WizardBaseComponent {
  // === INPUTS ===
  public formBase = input.required<FormGroup>();
  public skuPreview = input('');
  public categoriasExistentes = input<string[]>([]);

  // === OUTPUTS ===
  public cancelar = output<void>();
  public salvarSemReceita = output<void>();
  public proximo = output<void>();

  // === MÉTODOS ===
  public aoCancelar(): void {
    this.cancelar.emit();
  }

  public aoSalvarSemReceita(): void {
    this.salvarSemReceita.emit();
  }

  public aoProximo(): void {
    this.proximo.emit();
  }
}
