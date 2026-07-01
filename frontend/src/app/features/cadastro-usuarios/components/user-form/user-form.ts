import { Component, inject, input, output, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { TextInputFieldComponent } from '../../../../shared/components/form-controls/text-input-field/text-input-field.js';
import {
  SelectFieldComponent,
  SelectOption,
} from '../../../../shared/components/form-controls/select-field/select-field.js';
import { CheckboxFieldComponent } from '../../../../shared/components/form-controls/checkbox-field/checkbox-field.js';
import { PasswordFieldComponent } from '../../../../shared/components/form-controls/password-field/password-field.js';
import { ConfiguracoesGlobaisService } from '../../../../core/services/configuracoes-globais/configuracoes-globais.service.js';
import { CreateUsuarioPayload } from '../../../../core/services/usuario.service.js';

export interface UserFormControls {
  nome: FormControl<string>;
  email: FormControl<string>;
  perfil: FormControl<string>;
  senha: FormControl<string>;
  confirmarSenha: FormControl<string>;
  ativo: FormControl<boolean>;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TextInputFieldComponent,
    SelectFieldComponent,
    CheckboxFieldComponent,
    PasswordFieldComponent,
  ],
  templateUrl: './user-form.html',
})
export class UserFormComponent {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);
  private configuracoesGlobais = inject(ConfiguracoesGlobaisService);

  // === INPUTS ===
  salvando = input<boolean>(false);
  opcoesPerfil = input.required<SelectOption[]>();

  // === OUTPUTS ===
  enviar = output<CreateUsuarioPayload>();
  cancelar = output<void>();

  // === ESTADO DO FORMULÁRIO ===
  config = this.configuracoesGlobais.config;
  enviado = signal(false);

  form: FormGroup<UserFormControls> = this.fb.nonNullable.group(
    {
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      perfil: ['operador', [Validators.required]],
      senha: [
        '',
        [Validators.required, Validators.minLength(this.config().minLengthSenha)],
      ],
      confirmarSenha: ['', [Validators.required]],
      ativo: [true],
    },
    { validators: [this.validarSenhasIguais] },
  ) as FormGroup<UserFormControls>;

  // === MÉTODOS PÚBLICOS ===
  public enviarFormulario(): void {
    this.enviado.set(true);

    if (this.form.invalid) {
      return;
    }

    const valores = this.form.getRawValue();
    const payload: CreateUsuarioPayload = {
      nome: valores.nome.trim(),
      email: valores.email.trim().toLowerCase(),
      perfil: valores.perfil as 'operador' | 'inspetor' | 'gestor',
      senha: valores.senha,
      ativo: valores.ativo,
    };

    this.enviar.emit(payload);
  }

  gerarSenhaVinculada = this.gerarSenhaAleatoria.bind(this);

  // === VALIDAÇÃO E ERROS ===
  public obterErro(campo: keyof UserFormControls): string {
    const controle = this.form.controls[campo];
    if (!controle || !controle.errors) return '';

    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Digite um e-mail válido.';
    if (controle.errors['minlength']) {
      return `Mínimo de ${controle.errors['minlength'].requiredLength} caracteres.`;
    }

    return 'Campo inválido.';
  }

  public obterErroConfirmarSenha(): string {
    const controle = this.form.controls.confirmarSenha;
    if (controle.errors?.['required']) return 'Confirme a senha.';
    if (this.form.errors?.['senhasDiferentes']) return 'As senhas não são iguais.';
    return '';
  }

  private validarSenhasIguais(group: AbstractControl): ValidationErrors | null {
    const senha = group.get('senha')?.value;
    const confirmarSenha = group.get('confirmarSenha')?.value;
    return senha === confirmarSenha ? null : { senhasDiferentes: true };
  }

  // === MÉTODOS PRIVADOS ===
  private gerarSenhaAleatoria(): void {
    const caracteres =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let senhaGerada = '';
    const tamanho = this.config().tamanhoSenhaGerada || 12;

    for (let i = 0; i < tamanho; i++) {
      const index = Math.floor(Math.random() * caracteres.length);
      senhaGerada += caracteres.charAt(index);
    }

    this.form.controls.senha.setValue(senhaGerada);
    this.form.controls.confirmarSenha.setValue(senhaGerada);
    this.form.controls.senha.markAsDirty();
    this.form.controls.confirmarSenha.markAsDirty();
  }
}
