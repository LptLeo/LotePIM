import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './select-field.html',
})
export class SelectFieldComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<string>;
  @Input({ required: true }) options: SelectOption[] = [];

  @Input() placeholder = 'Selecione...';
  @Input() submitted = false;
  @Input() errorMessage = 'Selecione uma opção válida';

  showError(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched || this.submitted);
  }
}
