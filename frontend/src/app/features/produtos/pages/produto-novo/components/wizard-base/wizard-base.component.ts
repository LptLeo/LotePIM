import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-wizard-base',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wizard-base.component.html',
})
export class WizardBaseComponent {
  @Input() formBase!: FormGroup;
  @Input() skuPreview: string = '';
  @Input() categoriasExistentes: string[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() saveSemReceita = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  onCancel() {
    this.cancel.emit();
  }

  onSaveSemReceita() {
    this.saveSemReceita.emit();
  }

  onNext() {
    this.next.emit();
  }
}
