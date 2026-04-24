import { Injectable, signal } from '@angular/core';

type ConfigKeys =
  | 'min_length_nome'
  | 'min_length_email_prefix'
  | 'min_length_senha'
  | 'tamanho_senha_gerada';

export interface CadastroUsuarioConfig {
  minLengthNome: number;
  minLengthEmailPrefix: number;
  minLengthSenha: number;
  tamanhoSenhaGerada: number;
}

const DEFAULTS: CadastroUsuarioConfig = {
  minLengthNome: 1,
  minLengthEmailPrefix: 1,
  minLengthSenha: 12,
  tamanhoSenhaGerada: 16,
};

@Injectable({
  providedIn: 'root',
})
export class FormConfigService {
  private readonly keyMap: Record<ConfigKeys, keyof CadastroUsuarioConfig> = {
    min_length_nome: 'minLengthNome',
    min_length_email_prefix: 'minLengthEmailPrefix',
    min_length_senha: 'minLengthSenha',
    tamanho_senha_gerada: 'tamanhoSenhaGerada',
  };

  config = signal<CadastroUsuarioConfig>(this.loadFromCache());

  constructor() {
    window.addEventListener('storage', this.handleStorageChange);
  }

  getValue<K extends keyof CadastroUsuarioConfig>(key: K): number {
    return this.config()[key];
  }

  setValue(cacheKey: ConfigKeys, value: number): void {
    const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULTS[this.keyMap[cacheKey]];
    localStorage.setItem(cacheKey, String(safeValue));
    this.refresh();
  }

  refresh(): void {
    this.config.set(this.loadFromCache());
  }

  private handleStorageChange = (event: StorageEvent): void => {
    if (!event.key) {
      this.refresh();
      return;
    }

    if (event.key in this.keyMap) {
      this.refresh();
    }
  };

  private loadFromCache(): CadastroUsuarioConfig {
    const minLengthNome = this.getNumber('min_length_nome', DEFAULTS.minLengthNome);
    const minLengthEmailPrefix = this.getNumber('min_length_email_prefix', DEFAULTS.minLengthEmailPrefix);
    const minLengthSenha = this.getNumber('min_length_senha', DEFAULTS.minLengthSenha);
    const tamanhoSenhaGerada = this.getNumber('tamanho_senha_gerada', DEFAULTS.tamanhoSenhaGerada);

    return {
      minLengthNome,
      minLengthEmailPrefix,
      minLengthSenha,
      tamanhoSenhaGerada,
    };
  }

  private getNumber(key: ConfigKeys, fallback: number): number {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;

    return Math.floor(parsed);
  }
}
