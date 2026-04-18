import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',

})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input() tooltip?: string;
  @Input() trackingClass: string = 'tracking-[1px]';
}
