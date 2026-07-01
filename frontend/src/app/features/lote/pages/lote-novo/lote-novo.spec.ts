import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoteNovo } from './lote-novo.js';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoteFeatureService } from '../../services/lote.service.js';
import { of } from 'rxjs';

type JestFn = ReturnType<typeof jest.fn>;

type MockRouter = Pick<Router, 'navigate'>;
type MockLoteService = Pick<
  LoteFeatureService,
  'listarProdutos' | 'obterInsumosDisponiveis' | 'criarLote'
>;

describe('LoteNovo Component', () => {
  let component: LoteNovo;
  let fixture: ComponentFixture<LoteNovo>;
  let mockRouter: MockRouter & { navigate: JestFn };
  let mockLoteService: MockLoteService & {
    listarProdutos: JestFn;
    obterInsumosDisponiveis: JestFn;
    criarLote: JestFn;
  };
  let mockActivatedRoute: {
    snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };
  };

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockLoteService = {
      listarProdutos: jest.fn().mockReturnValue(of([])),
      obterInsumosDisponiveis: jest.fn().mockReturnValue(of([])),
      criarLote: jest.fn(),
    };
    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    await TestBed.configureTestingModule({
      imports: [LoteNovo, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: LoteFeatureService, useValue: mockLoteService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoteNovo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve pré-selecionar o produto se produtoId vier nos query params', () => {
    mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ produtoId: '42' });
    const cmp = TestBed.createComponent(LoteNovo).componentInstance;
    expect(cmp.form.controls.produto_id.value).toBe(42);
  });

  describe('Validação com Zod', () => {
    it('deve mostrar erro se o formulário estiver vazio ao submeter', () => {
      component.onSubmit();
      expect(component.erro()).toBe(
        'Existem erros no formulário. Por favor, corrija-os.',
      );
      expect(component.fieldErrors()['produto_id']).toBeDefined();
    });

    it('deve validar que quantidade_planejada deve ser positiva', () => {
      component.form.patchValue({
        produto_id: 1,
        quantidade_planejada: -5,
        turno: 'manha',
        data_producao: '2026-01-01',
      });

      component.onSubmit();
      expect(component.fieldErrors()['quantidade_planejada']).toBe(
        'A quantidade deve ser maior que zero.',
      );
    });
  });

  describe('Criação de Lote', () => {
    it('deve chamar o serviço se os dados forem válidos', async () => {
      // Mock de produtos carregados
      (component.produtosResource as unknown as { set: (v: unknown[]) => void }).set([
        { id: 1, nome: 'Teste', receita: [] },
      ]);

      component.form.patchValue({
        produto_id: 1,
        quantidade_planejada: 100,
        turno: 'manha',
        data_producao: '2026-01-01',
        sem_validade: true,
      });

      // Simula adição de um consumo no FormArray usando a estrutura correta
      const fb = TestBed.inject(FormBuilder);
      component.consumosArray.push(
        fb.nonNullable.group({
          materia_prima_id: 1,
          materia_prima_nome: 'Insumo',
          quantidade_necessaria: 1,
          unidade: 'KG',
          insumo_estoque_id: 10,
          quantidade_consumida: 1,
        }),
      );

      mockLoteService.criarLote.mockReturnValue(of({ id: 99 }));

      await component.onSubmit();

      expect(mockLoteService.criarLote).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/lote', 99]);
    });
  });

  it('deve recalcular quantidade consumida sem casas decimais para unidade UN', async () => {
    const fb = TestBed.inject(FormBuilder);

    // 1. Limpar e adicionar item de teste
    component.consumosArray.clear();
    component.consumosArray.push(
      fb.nonNullable.group({
        materia_prima_id: 1,
        materia_prima_nome: 'Tampa',
        quantidade_necessaria: 1.8,
        unidade: 'UN',
        insumo_estoque_id: 10,
        quantidade_consumida: 1,
      }),
    );

    // 2. Alterar valor do controle que dispara o Signal
    component.form.controls.quantidade_planejada.setValue(3);

    // 3. Forçar detecção de mudanças para processar toSignal e Effect
    fixture.detectChanges();
    await fixture.whenStable();

    // 4. Validar resultado: Math.floor(1.8 * 3) = Math.floor(5.4) = 5
    expect(component.consumosArray.at(0).get('quantidade_consumida')?.value).toBe(5);
  });
});
