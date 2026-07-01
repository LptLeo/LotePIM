import { Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

let uidCounter = 0;

@Component({
  selector: 'app-text-input-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './text-input-field.html',
})
export class TextInputFieldComponent {
  label = input.required<string>();
  control = input.required<FormControl<string>>();

  type = input<'text' | 'email'>('text');
  placeholder = input('');
  submitted = input(false);
  errorMessage = input('Campo inválido');
  inputId = input(`text-input-${uidCounter++}`);

  public showError(): boolean {
    const ctrl = this.control();
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted());
  }
}
