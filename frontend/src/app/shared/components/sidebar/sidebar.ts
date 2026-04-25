import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { SidebarItemComponent } from './components/sidebar-item/sidebar-item.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, SidebarItemComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
