import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './checkbox-field.html',
})
export class CheckboxFieldComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl<boolean>;
}
