import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Insumos } from './insumos.js';
import { InsumosService } from './services/insumos.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Insumos Component', () => {
  let component: Insumos;
  let fixture: ComponentFixture<Insumos>;
  let mockInsumosService: jest.Mocked<Partial<InsumosService>>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockInsumosService = {
      listar: jest.fn().mockReturnValue(of({ itens: [], meta: {} })),
      listarMateriasPrimasPaginado: jest
        .fn()
        .mockReturnValue(of({ itens: [], meta: {} })),
      obterMateriasPrimas: jest.fn().mockReturnValue(of([])),
      obterCategorias: jest.fn().mockReturnValue(of([])),
      obterContagem: jest
        .fn()
        .mockReturnValue(of({ total: 0, comSaldo: 0, esgotados: 0 })),
    };

    mockAuthService = {
      usuario: signal({ id: 1, perfil: 'gestor' }),
    };

    await TestBed.configureTestingModule({
      imports: [Insumos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InsumosService, useValue: mockInsumosService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Insumos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve trocar a aba ativa ao chamar definirAba e atualizar o estado', () => {
    component.definirAba('catalogo');
    expect(component.state.abaAtiva()).toBe('catalogo');
    expect(component.state.termoPesquisa()).toBe('');
  });

  it('deve delegar a limpeza de filtros para o InsumosStateService', () => {
    component.state.filtroEsgotado.set(true);
    component.state.filtroFornecedor.set('Fornecedor XPTO');
    component.state.ordenarPor.set('menor_estoque');
    component.state.paginaAtualEstoque.set(3);

    component.state.limparFiltrosEstoque();

    expect(component.state.filtroEsgotado()).toBe(false);
    expect(component.state.filtroFornecedor()).toBe('');
    expect(component.state.ordenarPor()).toBe('mais_recente');
    expect(component.state.paginaAtualEstoque()).toBe(1);
  });
});
