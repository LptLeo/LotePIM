import { Component } from '@angular/core';
import { Sidebar } from "../../shared/components/sidebar/sidebar";
import { Header } from "../../shared/components/header/header";

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, Header],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard { }
