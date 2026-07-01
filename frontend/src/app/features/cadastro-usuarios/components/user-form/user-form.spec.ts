import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserFormComponent } from './user-form';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfiguracoesGlobaisService } from '../../../../core/services/configuracoes-globais/configuracoes-globais.service.js';
import { signal, Signal } from '@angular/core';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;

  let configServiceMock: {
    config: Signal<{ minLengthSenha: number; tamanhoSenhaGerada: number }>;
  };

  beforeEach(async () => {
    configServiceMock = {
      config: signal({ minLengthSenha: 8, tamanhoSenhaGerada: 12 }),
    };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent, ReactiveFormsModule],
      providers: [{ provide: ConfiguracoesGlobaisService, useValue: configServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('opcoesPerfil', [
      { value: 'operador', label: 'Operador' },
    ]);

    fixture.detectChanges();
  });

  it('Deve iniciar com o formulário inválido', () => {
    expect(component.form.valid).toBe(false);
  });

  it('Deve validar o formato do e-mail', () => {
    const emailControl = component.form.controls.email;

    emailControl.setValue('email-errado');
    expect(emailControl.errors?.['email']).toBeTruthy();

    emailControl.setValue('correto@empresa.com');
    expect(emailControl.errors).toBeNull();
  });

  it('Deve validar se as senhas são iguais', () => {
    component.form.patchValue({
      senha: 'senha123',
      confirmarSenha: 'outra-senha',
    });

    expect(component.form.errors?.['senhasDiferentes']).toBeTruthy();

    component.form.patchValue({ confirmarSenha: 'senha123' });
    expect(component.form.errors).toBeNull();
  });

  it('Deve gerar uma senha aleatória com o tamanho configurado', () => {
    component.gerarSenhaVinculada();

    const senha = component.form.controls.senha.value;
    const confirma = component.form.controls.confirmarSenha.value;

    expect(senha.length).toBe(12);
    expect(senha).toBe(confirma);
    expect(component.form.controls.senha.dirty).toBe(true);
  });

  it('Deve emitir os dados limpos ao enviar um formulário válido', () => {
    const spy = jest.spyOn(component.enviar, 'emit');

    component.form.patchValue({
      nome: '  Carlos Alberto  ',
      email: 'carlos@teste.com',
      perfil: 'operador',
      senha: 'senha-segura-123',
      confirmarSenha: 'senha-segura-123',
      ativo: true,
    });

    component.enviarFormulario();

    expect(spy).toHaveBeenCalledWith({
      nome: 'Carlos Alberto',
      email: 'carlos@teste.com',
      perfil: 'operador',
      senha: 'senha-segura-123',
      ativo: true,
    });
  });

  it('Não deve emitir dados se o formulário for inválido', () => {
    const spy = jest.spyOn(component.enviar, 'emit');
    component.enviarFormulario();
    expect(spy).not.toHaveBeenCalled();
  });
});
