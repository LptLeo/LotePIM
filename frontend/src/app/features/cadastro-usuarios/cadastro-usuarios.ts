import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FormConfigService } from '../../core/services/form-config.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateUsuarioPayload, UsuarioPerfil, UsuarioService } from '../../core/services/usuario.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { CheckboxFieldComponent } from '../../shared/components/form-controls/checkbox-field/checkbox-field';
import { PasswordFieldComponent } from '../../shared/components/form-controls/password-field/password-field';
import { SelectFieldComponent, SelectOption } from '../../shared/components/form-controls/select-field/select-field';
import { TextInputFieldComponent } from '../../shared/components/form-controls/text-input-field/text-input-field';
import { cadastroUsuarioPayloadSchema } from './schemas/cadastro-usuario.schema';

@Component({
  selector: 'app-cadastro-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    TextInputFieldComponent,
    SelectFieldComponent,
    PasswordFieldComponent,
    CheckboxFieldComponent,
  ],
  templateUrl: './cadastro-usuarios.html',
})
export class CadastroUsuarios {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private formConfigService = inject(FormConfigService);
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);

  config = this.formConfigService.config;
  telaAtiva = signal<'listagem' | 'cadastro'>('listagem');
  submitted = signal(false);
  salvando = signal(false);
  erroApi = signal<string | null>(null);
  zodErrors = signal<Record<string, string>>({});

  carregandoLista = signal(false);
  erroLista = signal<string | null>(null);
  cadastrados = signal<UsuarioPerfil[]>([]);

  filtroTermo = signal('');
  filtroPerfil = signal<'operador' | 'inspetor' | 'gestor'>('operador');
  filtroStatus = signal<'ativos' | 'inativos'>('ativos');

  cadastradosFiltrados = computed(() => {
    const termo = this.filtroTermo().trim().toLowerCase();
    const perfil = this.filtroPerfil();
    const status = this.filtroStatus();

    return this.cadastrados().filter((u) => {
      const termoOk =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo);

      const perfilOk = u.perfil === perfil;

      const statusOk = status === 'ativos' ? u.ativo : !u.ativo;

      return termoOk && perfilOk && statusOk;
    });
  });

  roleOptions: SelectOption[] = [
    { value: 'operador', label: 'Operador' },
    { value: 'inspetor', label: 'Inspetor' },
    { value: 'gestor', label: 'Gestor' },
  ];

  filtroPerfilOptions: SelectOption[] = [
    { value: 'operador', label: 'Operador' },
    { value: 'inspetor', label: 'Inspetor' },
    { value: 'gestor', label: 'Gestor' },
  ];

  filtroStatusOptions: SelectOption[] = [
    { value: 'ativos', label: 'Ativos' },
    { value: 'inativos', label: 'Inativos' },
  ];

  form = this.fb.nonNullable.group(
    {
      nome: ['', [this.minTrimmedLengthValidator(this.config().minLengthNome)]],
      email: ['', [Validators.required, Validators.email, this.emailPrefixLengthValidator(this.config().minLengthEmailPrefix)]],
      perfil: ['operador'],
      senha: ['', [Validators.required, Validators.minLength(this.config().minLengthSenha)]],
      confirmarSenha: ['', [Validators.required]],
      ativo: [true],
    },
    { validators: [this.passwordsMatchValidator()] },
  );

  constructor() {
    if (this.authService.usuario()?.perfil !== 'gestor') {
      this.router.navigate(['/app/dashboard']);
      return;
    }

    this.loadCadastrados();

    effect(() => {
      const cfg = this.config();

      this.form.controls.nome.setValidators([this.minTrimmedLengthValidator(cfg.minLengthNome)]);
      this.form.controls.email.setValidators([
        Validators.required,
        Validators.email,
        this.emailPrefixLengthValidator(cfg.minLengthEmailPrefix),
      ]);
      this.form.controls.senha.setValidators([Validators.required, Validators.minLength(cfg.minLengthSenha)]);

      this.form.controls.nome.updateValueAndValidity({ emitEvent: false });
      this.form.controls.email.updateValueAndValidity({ emitEvent: false });
      this.form.controls.senha.updateValueAndValidity({ emitEvent: false });
    });
  }

  abrirCadastro(): void {
    this.erroApi.set(null);
    this.telaAtiva.set('cadastro');
  }

  voltarParaListagem(): void {
    this.erroApi.set(null);
    this.submitted.set(false);
    this.zodErrors.set({});
    this.form.reset({
      nome: '',
      email: '',
      perfil: 'operador',
      senha: '',
      confirmarSenha: '',
      ativo: true,
    });
    this.telaAtiva.set('listagem');
  }

  loadCadastrados(): void {
    this.erroLista.set(null);
    this.carregandoLista.set(true);

    this.usuarioService
      .getAll()
      .pipe(finalize(() => this.carregandoLista.set(false)))
      .subscribe({
        next: (usuarios) => this.cadastrados.set(usuarios),
        error: (err) => {
          this.erroLista.set(err?.error?.message ?? 'Não foi possível carregar a lista de usuários.');
        },
      });
  }

  setFiltroTermo(value: string): void {
    this.filtroTermo.set(value);
  }

  setFiltroPerfil(value: string): void {
    const allowed = new Set(['operador', 'inspetor', 'gestor']);
    if (allowed.has(value)) {
      this.filtroPerfil.set(value as any);
    }
  }

  setFiltroStatus(value: string): void {
    const allowed = new Set(['ativos', 'inativos']);
    if (allowed.has(value)) {
      this.filtroStatus.set(value as any);
    }
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.erroApi.set(null);
    this.zodErrors.set({});

    if (this.form.invalid) return;

    const payload = this.toPayload();
    const validation = cadastroUsuarioPayloadSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string') fieldErrors[path] = issue.message;
      }
      this.zodErrors.set(fieldErrors);
      return;
    }

    this.salvando.set(true);
    this.usuarioService
      .create(validation.data)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (usuarioCriado) => {
          this.cadastrados.set([usuarioCriado, ...this.cadastrados()]);
          this.form.reset({
            nome: '',
            email: '',
            perfil: 'operador',
            senha: '',
            confirmarSenha: '',
            ativo: true,
          });
          this.submitted.set(false);
          this.zodErrors.set({});
          this.toastService.success('Colaborador cadastrado com sucesso.');
          this.telaAtiva.set('listagem');
        },
        error: (err) => {
          this.erroApi.set(err?.error?.message ?? 'Não foi possível cadastrar o colaborador.');
          this.toastService.error('Falha ao cadastrar colaborador.');
        },
      });
  }

  generateSecurePassword(): void {
    const chars = {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lower: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-={}[]:;,.?',
    };

    const all = `${chars.upper}${chars.lower}${chars.numbers}${chars.symbols}`;
    const size = this.config().tamanhoSenhaGerada;

    const required = [
      this.pick(chars.upper),
      this.pick(chars.lower),
      this.pick(chars.numbers),
      this.pick(chars.symbols),
    ];

    while (required.length < size) {
      required.push(this.pick(all));
    }

    const generated = required.sort(() => Math.random() - 0.5).join('');
    this.form.controls.senha.setValue(generated);
    this.form.controls.confirmarSenha.setValue(generated);
    this.form.controls.senha.markAsDirty();
    this.form.controls.confirmarSenha.markAsDirty();
  }

  getError(controlName: keyof typeof this.form.controls): string {
    const zodError = this.zodErrors()[controlName];
    if (zodError) return zodError;

    const control = this.form.controls[controlName];
    if (!control.errors) return '';

    if (controlName === 'nome' && control.errors['minTrimmedLength']) {
      return `Nome deve ter no mínimo ${this.config().minLengthNome} caractere(s), desconsiderando espaços.`;
    }
    if (controlName === 'email' && control.errors['required']) return 'E-mail é obrigatório.';
    if (controlName === 'email' && control.errors['email']) return 'E-mail inválido.';
    if (controlName === 'email' && control.errors['emailPrefixMin']) {
      return `O prefixo do e-mail deve ter pelo menos ${this.config().minLengthEmailPrefix} caractere(s).`;
    }
    if (controlName === 'senha' && control.errors['required']) return 'Senha é obrigatória.';
    if (controlName === 'senha' && control.errors['minlength']) {
      return `Senha deve ter no mínimo ${this.config().minLengthSenha} caracteres.`;
    }
    if (controlName === 'confirmarSenha' && control.errors['required']) return 'Confirmação de senha é obrigatória.';
    if (controlName === 'confirmarSenha' && this.form.errors?.['passwordMismatch']) {
      return 'As senhas não coincidem.';
    }
    return 'Campo inválido.';
  }

  getConfirmPasswordControlError(): string {
    if (this.form.controls.confirmarSenha.errors?.['required']) {
      return this.getError('confirmarSenha');
    }
    if (this.form.errors?.['passwordMismatch']) {
      return 'As senhas não coincidem.';
    }
    return this.getError('confirmarSenha');
  }

  private toPayload(): CreateUsuarioPayload {
    const raw = this.form.getRawValue();
    return {
      nome: raw.nome.trim(),
      email: raw.email.trim().toLowerCase(),
      perfil: raw.perfil as CreateUsuarioPayload['perfil'],
      senha: raw.senha,
      ativo: raw.ativo,
    };
  }

  private minTrimmedLengthValidator(min: number): ValidatorFn {
    return (control): ValidationErrors | null => {
      const value = String(control.value ?? '').replace(/\s+/g, '');
      return value.length >= min ? null : { minTrimmedLength: true };
    };
  }

  private emailPrefixLengthValidator(min: number): ValidatorFn {
    return (control): ValidationErrors | null => {
      const value = String(control.value ?? '');
      if (!value.includes('@')) return null;

      const [prefix] = value.split('@');
      return prefix.length >= min ? null : { emailPrefixMin: true };
    };
  }

  private passwordsMatchValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const senha = control.get('senha')?.value;
      const confirmarSenha = control.get('confirmarSenha')?.value;
      return senha === confirmarSenha ? null : { passwordMismatch: true };
    };
  }

  private pick(chars: string): string {
    const randomIndex = Math.floor(Math.random() * chars.length);
    return chars[randomIndex];
  }
}
