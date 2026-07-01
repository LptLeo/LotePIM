import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-produto-filter-button',
  standalone: true,
  templateUrl: './produto-filter-button.html',
})
export class ProdutoFilterButtonComponent {
  // === INPUTS ===
  public valor = input.required<string>();
  public rotulo = input.required<string>();
  public contagem = input.required<number | string>();
  public ativo = input.required<boolean>();
  public ehAlerta = input(false);

  // === OUTPUTS ===
  public acao = output<string>();
}
