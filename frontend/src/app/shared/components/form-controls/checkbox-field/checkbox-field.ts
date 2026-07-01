import { Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './checkbox-field.html',
})
export class CheckboxFieldComponent {
  label = input.required<string>();
  control = input.required<FormControl<boolean>>();
}
