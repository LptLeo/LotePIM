import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-item.component.html',
})
export class SidebarItemComponent {
  link = input.required<string>();
  label = input.required<string>();
}
