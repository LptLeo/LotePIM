import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  host: {
    class: 'flex-1 flex flex-col min-w-0'
  }
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input() tooltip?: string;
  @Input() trackingClass: string = 'tracking-[1px]';
}
