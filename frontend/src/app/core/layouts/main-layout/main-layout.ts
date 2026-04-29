import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Header } from '../../../shared/components/header/header';
import { Footer } from '../../../shared/components/footer/footer';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header, Footer],
  templateUrl: './main-layout.html',
})
export class MainLayout { }
