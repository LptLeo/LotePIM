import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html',
  host: {
    class: 'block w-full',
  },
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input.required<string>();
  mobileTitle = input<string>();
  mobileSubtitle = input<string>();
}
