import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../../shared/components/sidebar/sidebar.js';
import { Header } from '../../../shared/components/header/header.js';
import { Footer } from '../../../shared/components/footer/footer.js';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header, Footer],
  templateUrl: './main-layout.html',
})
export class MainLayout { }
