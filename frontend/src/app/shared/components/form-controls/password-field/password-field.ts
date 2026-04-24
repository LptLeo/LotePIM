import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-field.html',
})
export class PasswordFieldComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<string>;

  @Input() submitted = false;
  @Input() errorMessage = 'Senha inválida';
  @Input() showGenerator = false;
  @Input() generatorLabel = 'Gerar Senha Segura';
  @Input() onGenerate?: () => void;

  visible = false;

  toggleVisibility(): void {
    this.visible = !this.visible;
  }

  generatePassword(): void {
    this.onGenerate?.();
  }

  showError(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched || this.submitted);
  }
}
