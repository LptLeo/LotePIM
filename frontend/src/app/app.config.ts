import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
  LOCALE_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { routes } from './app.routes.js';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor.js';
import { AuthService } from './core/services/auth.service.js';
import { ConfiguracoesGlobaisService } from './core/services/configuracoes-globais/configuracoes-globais.service.js';

registerLocaleData(localePt, 'pt-BR');

export function inicializarApp(authService: AuthService) {
  return () => authService.inicializarSessao();
}

export function carregarConfiguracoesGlobais(configService: ConfiguracoesGlobaisService) {
  return () => configService.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR',
    },
    {
      provide: APP_INITIALIZER,
      useFactory: carregarConfiguracoesGlobais,
      deps: [ConfiguracoesGlobaisService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: inicializarApp,
      deps: [AuthService],
      multi: true,
    },
  ],
};
