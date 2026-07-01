import { Component, input, output } from '@angular/core';
import type { AutocompleteSugestao } from '../../rastreabilidade.js';

@Component({
  selector: 'app-rastreabilidade-busca',
  standalone: true,
  templateUrl: './rastreabilidade-busca.component.html',
})
export class RastreabilidadeBuscaComponent {
  // === INPUTS ===
  public termo = input('');
  public sugestoes = input<AutocompleteSugestao[]>([]);
  public mostrandoDropdown = input(false);
  public buscandoSugestoes = input(false);
  public buscando = input(false);
  public erro = input<string | null>(null);

  // === OUTPUTS ===
  public mudancaEntrada = output<Event>();
  public focado = output<void>();
  public desfocado = output<void>();
  public buscaSubmetida = output<void>();
  public limpar = output<void>();
  public sugestaoSelecionada = output<AutocompleteSugestao>();

  // === MÉTODOS ===
  public aoDigitar(event: Event): void {
    this.mudancaEntrada.emit(event);
  }

  public aoFocar(): void {
    this.focado.emit();
  }

  public aoDesfocar(): void {
    this.desfocado.emit();
  }

  public aoBuscar(): void {
    this.buscaSubmetida.emit();
  }

  public aoLimpar(): void {
    this.limpar.emit();
  }

  public aoSelecionar(sug: AutocompleteSugestao): void {
    this.sugestaoSelecionada.emit(sug);
  }
}
