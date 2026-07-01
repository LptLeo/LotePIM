import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoteInsumoItemComponent } from './lote-insumo-item.js';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [LoteInsumoItemComponent, ReactiveFormsModule],
  template: `<app-lote-insumo-item [formGroup]="form"></app-lote-insumo-item>`,
})
class TestWrapperComponent {
  form!: FormGroup;
}

describe('LoteInsumoItemComponent (via Wrapper)', () => {
  let component: TestWrapperComponent;
  let fixture: ComponentFixture<TestWrapperComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestWrapperComponent, LoteInsumoItemComponent, ReactiveFormsModule],
      providers: [FormBuilder, DecimalPipe],
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(TestWrapperComponent);
    component = fixture.componentInstance;

    component.form = fb.group({
      materia_prima_nome: ['Painel LCD'],
      quantidade_necessaria: [1],
      unidade: ['UN'],
      insumo_estoque_id: [0],
      quantidade_consumida: [1],
    });

    fixture.detectChanges();
  });

  it('deve exibir o nome da matéria-prima no template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Painel LCD');
  });
});
