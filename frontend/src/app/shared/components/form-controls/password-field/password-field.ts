import { Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

let uidCounter = 0;

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './password-field.html',
})
export class PasswordFieldComponent {
  label = input.required<string>();
  control = input.required<FormControl<string>>();

  submitted = input(false);
  errorMessage = input('Senha inválida');
  showGenerator = input(false);
  generatorLabel = input('Gerar Senha Segura');
  onGenerate = input<() => void>();
  inputId = input(`password-field-${uidCounter++}`);

  public visible = false;

  public toggleVisibility(): void {
    this.visible = !this.visible;
  }

  public generatePassword(): void {
    this.onGenerate()?.();
  }

  public showError(): boolean {
    const ctrl = this.control();
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched || this.submitted());
  }
}
