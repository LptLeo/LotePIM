import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-input-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './text-input-field.html',
})
export class TextInputFieldComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<string>;

  @Input() type: 'text' | 'email' = 'text';
  @Input() placeholder = '';
  @Input() submitted = false;
  @Input() errorMessage = 'Campo inválido';

  showError(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched || this.submitted);
  }
}
