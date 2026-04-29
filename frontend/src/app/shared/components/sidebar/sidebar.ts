import { Component, inject } from '@angular/core';
import { Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service.js";
import { SidebarItemComponent } from './components/sidebar-item/sidebar-item.component.js';

@Component({
  selector: 'app-sidebar',
  imports: [SidebarItemComponent],
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
