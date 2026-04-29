import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  callback: () => void;
  primary?: boolean;
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning';
  actions?: ToastAction[];
  autoClose?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toast = signal<ToastMessage | null>(null);
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  success(message: string): void {
    this.show({ message, type: 'success', autoClose: true });
  }

  error(message: string): void {
    this.show({ message, type: 'error', autoClose: true });
  }

  confirm(message: string, onConfirm: () => void, confirmLabel = 'Confirmar'): void {
    this.show({
      message,
      type: 'warning',
      autoClose: false,
      actions: [
        { label: confirmLabel, primary: true, callback: () => { onConfirm(); this.close(); } }
      ]
    });
  }

  close(): void {
    this.toast.set(null);
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private show(message: ToastMessage): void {
    this.toast.set(message);

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (message.autoClose) {
      this.hideTimeout = setTimeout(() => {
        this.toast.set(null);
        this.hideTimeout = null;
      }, 3500);
    }
  }
}
