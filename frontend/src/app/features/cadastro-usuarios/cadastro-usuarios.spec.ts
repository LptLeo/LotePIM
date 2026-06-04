import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastroUsuarios } from './cadastro-usuarios';
import { UsuarioService } from '../../core/services/usuario.service.js';
import { ToastService } from '../../core/services/toast.service.js';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('CadastroUsuarios', () => {
  let component: CadastroUsuarios;
  let fixture: ComponentFixture<CadastroUsuarios>;

  let usuarioServiceMock: {
    getAll: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    reativar: jest.Mock;
  };

  let toastServiceMock: {
    success: jest.Mock;
    error: jest.Mock;
    confirm: jest.Mock;
  };

  beforeEach(async () => {
    usuarioServiceMock = {
      getAll: jest.fn().mockReturnValue(of({ itens: [], meta: {} })),
      create: jest.fn(),
      delete: jest.fn(),
      reativar: jest.fn(),
    };

    toastServiceMock = {
      success: jest.fn(),
      error: jest.fn(),
      confirm: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CadastroUsuarios],
      providers: [
        { provide: UsuarioService, useValue: usuarioServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CadastroUsuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deve ser criado corretamente', () => {
    expect(component).toBeTruthy();
  });

  it('Deve iniciar na tela de listagem por padrão', () => {
    expect(component.telaAtiva()).toBe('listagem');
  });

  it('Deve mudar para tela de cadastro ao abrir o formulário', () => {
    component.abrirCadastro();
    expect(component.telaAtiva()).toBe('cadastro');
    expect(component.erroApi()).toBeNull();
  });

  it('Deve limpar erros e voltar para listagem ao cancelar', () => {
    component.telaAtiva.set('cadastro');
    component.erroApi.set('Erro antigo');

    component.voltarParaListagem();

    expect(component.telaAtiva()).toBe('listagem');
    expect(component.erroApi()).toBeNull();
  });

  it('Deve chamar o serviço de criação ao salvar um novo usuário', () => {
    const payload = {
      nome: 'Teste',
      email: 'teste@teste.com',
      perfil: 'operador' as const,
      senha: '123',
      ativo: true,
    };
    usuarioServiceMock.create.mockReturnValue(of({}));

    component.salvarUsuario(payload);

    expect(usuarioServiceMock.create).toHaveBeenCalledWith(payload);
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      'Colaborador cadastrado com sucesso.',
    );
    expect(component.telaAtiva()).toBe('listagem');
  });

  it('Deve exibir mensagem de erro se a criação falhar', () => {
    const payload = {
      nome: 'Teste',
      email: 'teste@teste.com',
      perfil: 'operador' as const,
      senha: '123',
      ativo: true,
    };
    const erroMock = { error: { message: 'E-mail já cadastrado' } };
    usuarioServiceMock.create.mockReturnValue(throwError(() => erroMock));

    component.salvarUsuario(payload);

    expect(component.erroApi()).toBe('E-mail já cadastrado');
    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Falha ao cadastrar colaborador.',
    );
    expect(component.salvando()).toBe(false);
  });

  it('Deve desativar usuário após confirmação do toast', () => {
    const id = 10;
    toastServiceMock.confirm.mockImplementation((msg, callback) => callback());
    usuarioServiceMock.delete.mockReturnValue(of({}));

    component.deativarUsuario(id);

    expect(usuarioServiceMock.delete).toHaveBeenCalledWith(id);
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      'Colaborador desativado com sucesso.',
    );
  });

  it('Deve reativar usuário após confirmação do toast', () => {
    const id = 20;
    toastServiceMock.confirm.mockImplementation((msg, callback) => callback());
    usuarioServiceMock.reativar.mockReturnValue(of({}));

    component.reativarUsuario(id);

    expect(usuarioServiceMock.reativar).toHaveBeenCalledWith(id);
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      'Colaborador reativado com sucesso.',
    );
  });
});
