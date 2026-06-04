import { Login } from './login';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  let authServiceMock: { login: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { login: jest.fn() };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deve iniciar com o formulário inválido', () => {
    expect(component.loginForm.valid).toBe(false);

    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });

    expect(component.loginForm.valid).toBe(true);
  });

  it('Deve chamar o authService.login quando o formulário for válido', () => {
    const credentials = {
      email: 'teste@email.com',
      senha: 'senha123',
    };

    component.loginForm.patchValue(credentials);

    authServiceMock.login.mockReturnValue(of({ tokenAcesso: 'example' }));

    component.login();

    expect(authServiceMock.login).toHaveBeenCalledWith(credentials);
    expect(component.isLoading()).toBe(false);
    expect(component.loginForm.getRawValue().email).toBe('');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('Deve exibir mensagem no erro quando o login falhar', () => {
    const erroMock = { status: 401, error: { message: 'E-mail ou senha incorretos.' } };
    authServiceMock.login.mockReturnValue(throwError(() => erroMock));

    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('E-mail ou senha incorretos.');
  });

  it('Deve exibir mensagem no erro quando o login falhar em conectar-se', () => {
    const erroMock = {
      status: 0,
      error: {
        message: 'Erro de conexão. Verifique sua internet ou se o servidor está online.',
      },
    };
    authServiceMock.login.mockReturnValue(throwError(() => erroMock)); // Simulando erro vindo do servidor

    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Erro de conexão. Verifique sua internet ou se o servidor está online.',
    );
  });

  it('Deve limpar a mensagem de erro quando o usuário digitar nos inputs', () => {
    component.errorMessage.set('Erro');

    // Simulando a digitação real no campo para disparar o evento (input) do HTML
    const input = fixture.nativeElement.querySelector('#usuario') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('');
  });

  it('Deve desabilitar o botão quando o formulário for inválido ou estiver carregando', () => {
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    fixture.detectChanges();
    expect(botao.disabled).toBe(true);

    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.isLoading.set(true);
    fixture.detectChanges();

    expect(botao.disabled).toBe(true);

    component.isLoading.set(false);
    fixture.detectChanges();

    expect(botao.disabled).toBe(false);
  });

  it('Deve exibir a mensagem "o email é obrigatório" quando o campo é tocado e está vazio', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('');
    emailControl?.markAsTouched();

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('O email é obrigatório');
  });

  it('Não deve exibir a mensagem "o email é obrigatório" quando o campo está intocado ou contendo algo', () => {
    const emailControl = component.loginForm.get('email');
    const compiled = fixture.nativeElement as HTMLElement;

    emailControl?.setValue('');
    emailControl?.markAsUntouched();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('O email é obrigatório');

    emailControl?.setValue('teste@email.com');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('O email é obrigatório');
  });

  it('Deve aplicar a classe de borda vermelha apenas quando o campo for inválido e tocado', () => {
    const emailInput = fixture.nativeElement.querySelector(
      '#usuario',
    ) as HTMLInputElement;
    const emailControl = component.loginForm.get('email');

    fixture.detectChanges();
    expect(emailInput.classList).not.toContain('border-red-500');

    emailControl?.setValue('');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(emailInput.classList).toContain('border-red-500');

    emailControl?.setValue('teste@email.com');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(emailInput.classList).not.toContain('border-red-500');
  });

  it('Deve exibir mensagem de erro genérica quando o backend não envia uma mensagem específica', () => {
    const erroSemMensagem = { status: 500, error: {} };
    authServiceMock.login.mockReturnValue(throwError(() => erroSemMensagem));

    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    expect(component.errorMessage()).toBe('Ocorreu um erro inesperado ao fazer login.');
  });

  it('Deve dar um return vazio se o formulário for inválido', () => {
    component.loginForm.patchValue({ email: '', senha: '' });
    authServiceMock.login.mockClear();

    component.login();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });
});
