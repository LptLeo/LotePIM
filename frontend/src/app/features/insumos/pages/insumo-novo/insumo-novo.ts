import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InsumosService, type Turno } from '../../services/insumos.service.js';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-insumo-novo',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './insumo-novo.html',
})
export class InsumoNovo {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);
  private insumosService = inject(InsumosService);
  private router = inject(Router);

  // === ESTADO ===
  salvando = signal(false);
  erro = signal<string | null>(null);
  materiasPrimasExistentes = signal<MateriaPrima[]>([]);

  // === FORMULÁRIO ===
  form = this.fb.nonNullable.group({
    materia_prima_id: [0, [Validators.required, Validators.min(1)]],
    fornecedor: ['', [Validators.required]],
    lote_fabricante: ['', [Validators.required]],
    quantidade_inicial: [0, [Validators.required, Validators.min(0.01)]],
    data_fabricacao: ['', [Validators.required]],
    data_validade: ['', [Validators.required]],
    turno: [this.obterTurnoAtual() as Turno, [Validators.required]],
  });

  constructor() {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    this.form.patchValue({ data_fabricacao: `${ano}-${mes}-${dia}` });

    this.carregarCatalogo();
  }

  // === MÉTODOS PÚBLICOS ===
  public voltarParaLista(): void {
    this.router.navigate(['/app/insumos']);
  }

  public async aoEnviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    try {
      const valoresFormulario = this.form.value;
      const dadosCriacao = {
        materiaPrimaId: Number(valoresFormulario.materia_prima_id),
        fornecedor: valoresFormulario.fornecedor ?? '',
        numero_lote_fornecedor: valoresFormulario.lote_fabricante ?? '',
        quantidade_inicial: Number(valoresFormulario.quantidade_inicial),
        turno: valoresFormulario.turno as Turno,
        data_validade: valoresFormulario.data_validade ?? null,
      };
      await lastValueFrom(this.insumosService.registrarLote(dadosCriacao));
      this.router.navigate(['/app/insumos']);
    } catch (erro) {
      this.erro.set(
        erro instanceof HttpErrorResponse
          ? erro.error?.message || 'Erro ao salvar insumo.'
          : 'Erro ao salvar insumo.',
      );
    } finally {
      this.salvando.set(false);
    }
  }

  // === MÉTODOS PRIVADOS ===
  private async carregarCatalogo(): Promise<void> {
    try {
      const materiasPrimas = await lastValueFrom(
        this.insumosService.obterMateriasPrimas(),
      );
      this.materiasPrimasExistentes.set(materiasPrimas);
    } catch (erro) {
      this.erro.set(
        erro instanceof Error
          ? erro.message
          : 'Falha ao carregar catálogo de matérias-primas.',
      );
    }
  }

  private obterTurnoAtual(): Turno {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 14) return 'manha';
    if (hora >= 14 && hora < 22) return 'tarde';
    return 'noite';
  }
}
