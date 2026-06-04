import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service.js';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { SseClientService } from './sse-client.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: jest.Mock };
  let sseClientSpy: { iniciar: jest.Mock; fechar: jest.Mock };

  beforeEach(() => {
    routerSpy = { navigate: jest.fn() };
    sseClientSpy = { iniciar: jest.fn(), fechar: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: SseClientService, useValue: sseClientSpy },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve inicializar com token vazio e usuario nulo', () => {
    expect(service.tokenAcesso()).toBe('');
    expect(service.usuario()).toBeNull();
  });

  it('deve limpar a sessao e fechar SSE no logoutLocal', () => {
    service.setSessao('token', { id: 1, nome: 'Teste', perfil: 'operador' });

    service.logoutLocal();

    expect(service.tokenAcesso()).toBe('');
    expect(service.usuario()).toBeNull();
    expect(sseClientSpy.fechar).toHaveBeenCalled();
  });

  it('deve realizar logout via API corretamente', () => {
    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(service.tokenAcesso()).toBe('');
    expect(sseClientSpy.fechar).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
