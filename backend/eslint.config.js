import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Formatação integrada com o Prettier
      'prettier/prettier': 'error',

      // --- REGRAS DE CLEAN CODE & CONVENÇÕES (TypeScript / Geral) ---
      
      // Pega promessas flutuantes sem await (Evita bugs silenciosos de concorrência)
      '@typescript-eslint/no-floating-promises': 'error',

      // Obriga a tratar retornos de promises
      '@typescript-eslint/await-thenable': 'error',

      // Evita variáveis declaradas e não usadas (Mantém o código limpo de lixo)
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],

      // Sugere manter funções com menos de 50 linhas para melhor legibilidade
      'max-lines-per-function': ['warn', { 
        max: 50, 
        skipBlankLines: true, 
        skipComments: true 
      }],

      // Limita a complexidade ciclomática para evitar lógica confusa
      'complexity': ['warn', 10],

      // Evita aninhamento profundo de blocos (Máximo de 3 níveis)
      'max-depth': ['warn', 3],

      // Limita número de parâmetros de uma função (Máximo de 4, preferencialmente <= 3)
      'max-params': ['warn', 4],

      // Evita imports duplicados do mesmo módulo
      'no-duplicate-imports': 'error',

      // Evita deixar console.log esquecidos no código em produção
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Garante uso de const para variáveis que não sofrem reatribuição
      'prefer-const': 'error',

      // Proíbe o uso de var
      'no-var': 'error',

      // Garante uso de aspas simples e regras de clean imports
      'arrow-body-style': ['error', 'as-needed'],

      // Convenções de nomenclatura (PascalCase para Classes/Interfaces/Tipos, camelCase para variáveis/funções)
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          format: null, // permite qualquer formato (ex: snake_case do TypeORM ou campos de DTOs)
        }
      ],
    },
  },
  configPrettier,
];


