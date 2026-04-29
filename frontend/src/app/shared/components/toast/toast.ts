import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service.js';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
})
export class ToastComponent implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  private routerSub?: Subscription;

  ngOnInit(): void {
    // Fecha o toast automaticamente ao mudar de rota
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.toastService.close();
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  /**
   * Fecha o toast ao clicar em qualquer lugar fora do container do toast.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.toastService.toast()) return;

    // Ignora o clique se ele foi o que disparou a abertura do toast 
    // (o elemento elementRef.nativeElement ainda não estaria renderizado ou visível se fosse síncrono)
    const toastContainer = this.elementRef.nativeElement.querySelector('div');
    if (!toastContainer) return;

    const clickedInside = toastContainer.contains(event.target as Node);
    if (!clickedInside) {
      this.toastService.close();
    }
  }
}
