import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InsumosService } from '../../services/insumos.service.js';
import { LoteFeatureService } from '../../../lote/services/lote.service.js';
import { MateriaPrima } from '../../../../shared/models/lote.models.js';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-insumo-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insumo-novo.html',
})
export class InsumoNovo implements OnInit {
  private fb = inject(FormBuilder);
  private insumosService = inject(InsumosService);
  private loteFeatureService = inject(LoteFeatureService);
  private router = inject(Router);

  salvando = signal(false);
  erro = signal<string | null>(null);

  materiasPrimasExistentes = signal<MateriaPrima[]>([]);

  form = this.fb.nonNullable.group({
    materia_prima_id: [0, [Validators.required, Validators.min(1)]],
    fornecedor: ['', [Validators.required]],
    lote_fabricante: ['', [Validators.required]],
    quantidade_inicial: [0, [Validators.required, Validators.min(0.01)]],
    data_fabricacao: ['', [Validators.required]],
    data_validade: ['', [Validators.required]],
  });

  ngOnInit() {
    // Inicializar com data de hoje se vazio (horário local)
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    this.form.patchValue({ data_fabricacao: `${ano}-${mes}-${dia}` });

    // Carregar catálogo
    this.insumosService.getMateriasPrimas().subscribe({
      next: (mp: MateriaPrima[]) => this.materiasPrimasExistentes.set(mp),
      error: (e: any) => console.error("Falha ao carregar catálogo:", e)
    });
  }

  voltarParaLista() {
    this.router.navigate(['/app/insumos']);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    const raw = this.form.value;
    const payload = {
      materia_prima_id: Number(raw.materia_prima_id),
      fornecedor: raw.fornecedor,
      lote_fabricante: raw.lote_fabricante,
      quantidade_inicial: Number(raw.quantidade_inicial),
      data_fabricacao: raw.data_fabricacao,
      data_validade: raw.data_validade,
    };

    this.insumosService.create(payload as any)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/app/insumos']),
        error: (err) => {
           console.error(err);
           this.erro.set(err.error?.message || "Erro ao salvar insumo.");
        }
      });
  }
}
