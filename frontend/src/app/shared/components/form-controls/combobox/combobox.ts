import {
  Component,
  input,
  signal,
  computed,
  ElementRef,
  HostListener,
  inject,
  forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

let uidCounter = 0;

@Component({
  selector: 'app-combobox',
  standalone: true,
  templateUrl: './combobox.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ComboboxComponent),
      multi: true,
    },
  ],
})
export class ComboboxComponent implements ControlValueAccessor {
  // === INPUTS ===
  opcoes = input<string[]>([]);
  placeholder = input('Digite ou selecione...');
  inputId = input(`combobox-${uidCounter++}`);

  // === INJEÇÃO ===
  private elementRef = inject(ElementRef);

  // === ESTADO INTERNO ===
  aberto = signal(false);
  filtro = signal('');
  indiceSelecionado = signal(0);
  valorInterno = '';

  // === CALLBACKS CVA ===
  private onChange?: (value: string) => void;
  private onTouched?: () => void;

  // === COMPUTED ===
  opcoesFiltradas = computed(() => {
    const texto = this.filtro().toLowerCase().trim();
    if (!texto) return this.opcoes();
    return this.opcoes().filter((o) => o.toLowerCase().includes(texto));
  });

  dropdownVazio = computed(
    () =>
      this.aberto() && this.opcoesFiltradas().length === 0 && this.filtro().length > 0,
  );

  // === MÉTODOS PÚBLICOS ===
  abrir(): void {
    this.aberto.set(true);
    this.indiceSelecionado.set(0);
  }

  fechar(): void {
    this.aberto.set(false);
  }

  aoDigitar(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.valorInterno = valor;
    this.filtro.set(valor);
    this.onChange?.(valor);
    this.abrir();
  }

  selecionar(valor: string): void {
    this.valorInterno = valor;
    this.filtro.set('');
    this.onChange?.(valor);
    this.onTouched?.();
    this.fechar();
  }

  aoTecla(event: KeyboardEvent): void {
    const opcoes = this.opcoesFiltradas();

    switch (event.key) {
      case 'ArrowDown':
        this.indiceSelecionado.update((i) => Math.min(i + 1, opcoes.length - 1));
        event.preventDefault();
        break;

      case 'ArrowUp':
        this.indiceSelecionado.update((i) => Math.max(i - 1, 0));
        event.preventDefault();
        break;

      case 'Enter': {
        const opcao = opcoes[this.indiceSelecionado()];
        if (opcao) this.selecionar(opcao);
        event.preventDefault();
        break;
      }

      case 'Escape':
        this.fechar();
        event.preventDefault();
        break;
    }
  }

  aoBlur(): void {
    this.onTouched?.();
  }

  // === HOST LISTENER: FECHAR AO CLICAR FORA ===
  @HostListener('document:click', ['$event'])
  aoClickFora(event: MouseEvent): void {
    if (this.aberto() && !this.elementRef.nativeElement.contains(event.target)) {
      this.fechar();
      this.onTouched?.();
    }
  }

  // === CONTROL VALUE ACCESSOR ===
  writeValue(value: string): void {
    this.valorInterno = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Opcional: setDisabledState pode ser adicionado futuramente
}
