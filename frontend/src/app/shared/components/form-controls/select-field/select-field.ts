import { Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

let uidCounter = 0;

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './select-field.html',
})
export class SelectFieldComponent {
  label = input.required<string>();
  control = input.required<FormControl<string>>();
  options = input.required<SelectOption[]>();

  placeholder = input('Selecione...');
  submitted = input(false);
  errorMessage = input('Selecione uma opção válida');
  inputId = input(`select-field-${uidCounter++}`);

  public showError(): boolean {
    const ctrl = this.control();
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted());
  }
}
