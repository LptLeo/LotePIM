import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-item.component.html'
})
export class SidebarItemComponent {
  @Input({ required: true }) link!: string;
  @Input({ required: true }) label!: string;
}
