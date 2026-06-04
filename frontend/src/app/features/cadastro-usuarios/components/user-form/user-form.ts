import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
    ReactiveFormsModule,
    TextInputFieldComponent,
    SelectFieldComponent,
    CheckboxFieldComponent,
    PasswordFieldComponent,
  ],
  templateUrl: './user-form.html',
})
export class UserFormComponent {
  private fb = inject(FormBuilder);
  private configuracoesGlobais = inject(ConfiguracoesGlobaisService);

  // --- Inputs recebidos do componente pai ---
  salvando = input<boolean>(false);
  roleOptions = input.required<SelectOption[]>();

  // --- Outputs emitidos para o componente pai ---
  onSubmit = output<CreateUsuarioPayload>();
  onCancel = output<void>();

  // --- Estado local do formulário ---
  config = this.configuracoesGlobais.config;
  submitted = signal(false);

  // Criação do formulário diretamente aqui (mais simples e isolado)
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
  ) as FormGroup<UserFormControls>; // Validação de formulario inteiro.

  // Ação de clique no botão Cadastrar
  enviarFormulario(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      return; // Se tem erro, não faz nada
    }

    const valores = this.form.getRawValue();
    const payload: CreateUsuarioPayload = {
      nome: valores.nome.trim(),
      email: valores.email.trim().toLowerCase(),
      perfil: valores.perfil as 'operador' | 'inspetor' | 'gestor',
      senha: valores.senha,
      ativo: valores.ativo,
    };

    // Entrega o payload prontinho para a tela principal salvar na API
    this.onSubmit.emit(payload);
  }

  // Lógica de gerar senha segura (feita diretamente aqui)
  gerarSenhaVinculada = this.gerarSenhaAleatoria.bind(this);

  gerarSenhaAleatoria(): void {
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

  // --- Utilitários simples para exibir mensagens de erro ---

  obterErro(campo: keyof UserFormControls): string {
    const controle = this.form.controls[campo];
    if (!controle || !controle.errors) return '';

    if (controle.errors['required']) return 'Este campo é obrigatório.';
    if (controle.errors['email']) return 'Digite um e-mail válido.';
    if (controle.errors['minlength']) {
      return `Mínimo de ${controle.errors['minlength'].requiredLength} caracteres.`;
    }

    return 'Campo inválido.';
  }

  obterErroConfirmarSenha(): string {
    const controle = this.form.controls.confirmarSenha;
    if (controle.errors?.['required']) return 'Confirme a senha.';
    if (this.form.errors?.['senhasDiferentes']) return 'As senhas não são iguais.';
    return '';
  }

  // Validador customizado simples
  private validarSenhasIguais(group: AbstractControl): ValidationErrors | null {
    const senha = group.get('senha')?.value;
    const confirmarSenha = group.get('confirmarSenha')?.value;
    return senha === confirmarSenha ? null : { senhasDiferentes: true };
  }
}
