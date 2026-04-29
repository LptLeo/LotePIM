import { Component, EventEmitter, Input, OnInit, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-nova-mp-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nova-mp-modal.component.html',
})
export class NovaMpModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() salvando = false;
  @Input() erro: string | null = null;
  @Input() categorias: string[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  formMp = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', Validators.required],
    unidade_medida: ['UN', Validators.required]
  });

  ngOnInit() {
    this.formMp.reset({ unidade_medida: 'UN' });
  }

  // Se usar getter
  get skuPreviewMp(): string {
    const nome = this.formMp.controls.nome.value;
    if (!nome || nome.length < 2) return 'MP-...';

    const base = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12);

    return `MP-${base}`;
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    if (this.formMp.invalid) return;
    this.save.emit(this.formMp.getRawValue());
  }
}
