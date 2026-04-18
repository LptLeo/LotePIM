import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  
  // Propriedades opcionais caso a tela queira usar títulos diferentes no celular
  @Input() mobileTitle?: string;
  @Input() mobileSubtitle?: string;
}
