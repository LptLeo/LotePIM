import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['.angular/**', 'coverage/**', 'dist/**'],
  },
  
  // Configurações recomendadas do ESLint e TypeScript
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  
  // Configurações recomendadas do Angular para TypeScript (injetando restrição de arquivos .ts)
  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  
  {
    files: ['**/*.ts'],
    processor: angular.processInlineTemplates,
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Integração com o Prettier para erros de formatação
      'prettier/prettier': 'error',

      // --- REGRAS DE CLEAN CODE & CONVENÇÕES (Frontend / TypeScript) ---
      
      // Evita variáveis declaradas e não usadas
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],

      // Garante uso de const para variáveis que não sofrem reatribuição
      'prefer-const': 'error',

      // Proíbe declarações var
      'no-var': 'error',

      // Limita a complexidade ciclomática para manter funções simples
      'complexity': ['warn', 10],

      // Limita o aninhamento profundo de blocos (Máximo de 3 níveis)
      'max-depth': ['warn', 3],

      // Limita o número de parâmetros em funções (Máximo de 4)
      'max-params': ['warn', 4],

      // Evita deixar console.log perdidos
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Evita imports duplicados
      'no-duplicate-imports': 'error',

      // Angular-specific selector checks
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  
  // Configurações recomendadas do Angular para Templates HTML (injetando restrição de arquivos .html)
  ...angular.configs.templateRecommended.map((config) => ({
    ...config,
    files: ['**/*.html'],
  })),
  ...angular.configs.templateAccessibility.map((config) => ({
    ...config,
    files: ['**/*.html'],
  })),
  
  {
    files: ['**/*.html'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Formatação de templates HTML integrada com o Prettier (Angular parser)
      'prettier/prettier': ['error', { parser: 'angular' }],
      
      // Clean Code no HTML: Força o uso do novo control flow do Angular (@if, @for) ao invés de *ngIf/*ngFor
      '@angular-eslint/template/prefer-control-flow': 'error',
      
      // Acessibilidade: avisar (warn) em vez de dar erro, e desativar avisos de teclado em divs clicáveis para evitar ruídos
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
    },
  },
  
  // Desativa regras de formatação do ESLint que conflitam com o Prettier
  configPrettier,
];



