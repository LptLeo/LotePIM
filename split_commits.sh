#!/bin/bash
set -e

# Stage tudo
git add .
git stash push -m "All changes ready for split"

# 1. chore/config-animations
git checkout -B chore/config-animations develop
git checkout stash@{0} -- frontend/src/app/app.config.ts frontend/package.json frontend/package-lock.json frontend/src/styles.css 2>/dev/null || true
git commit -m "chore(core): adiciona suporte a @angular/animations e atualiza dependências globais" || true

# 2. feature/rastreabilidade
git checkout feature/rastreabilidade
git checkout stash@{0} -- frontend/src/app/features/rastreabilidade/ backend/src/services/rastreabilidade.service.ts backend/src/controllers/rastreabilidade.controller.ts backend/src/routes/rastreabilidade.routes.ts 2>/dev/null || true
git commit -m "feat(rastreabilidade): implementa interface de busca e visualização em árvore com suporte a autocomplete" || true

# 3. feature/dashboard
git checkout feature/dashboard
git checkout stash@{0} -- frontend/src/app/features/dashboard/ 2>/dev/null || true
git commit -m "feat(dashboard): refatora painel principal usando Signals e rxResource" || true

# 4. feature/lote
git checkout feature/lote
git checkout stash@{0} -- frontend/src/app/features/lote/ frontend/src/app/shared/models/lote.models.ts backend/src/controllers/lote.controller.ts backend/src/services/lote.service.ts backend/src/routes/lote.routes.ts backend/src/dto/lote.dto.ts backend/src/entities/Lote.ts 2>/dev/null || true
git commit -m "fix(lotes): corrige formatação de data (dd/mm/yyyy) e validação de quantidade inicial" || true

# 5. feature/produto
git checkout feature/produto
git checkout stash@{0} -- frontend/src/app/features/produtos/ backend/src/controllers/produto.controller.ts backend/src/services/produto.service.ts backend/src/routes/produto.routes.ts backend/src/dto/produto.dto.ts backend/src/entities/Produto.ts 2>/dev/null || true
git commit -m "feat(produto): ajusta layout e corrige validações do formulário" || true

# 6. feature/insumoLote (Tudo que sobrou no stash)
git checkout feature/insumoLote
git reset --hard HEAD
git stash apply --index stash@{0}

# Remove do stage (e da working tree) os arquivos que JÁ FORAM commitados nas outras branches
FILES_TO_REMOVE="frontend/src/app/app.config.ts frontend/package.json frontend/package-lock.json frontend/src/styles.css frontend/src/app/features/rastreabilidade/ backend/src/services/rastreabilidade.service.ts backend/src/controllers/rastreabilidade.controller.ts backend/src/routes/rastreabilidade.routes.ts frontend/src/app/features/dashboard/ frontend/src/app/features/lote/ frontend/src/app/shared/models/lote.models.ts backend/src/controllers/lote.controller.ts backend/src/services/lote.service.ts backend/src/routes/lote.routes.ts backend/src/dto/lote.dto.ts backend/src/entities/Lote.ts frontend/src/app/features/produtos/ backend/src/controllers/produto.controller.ts backend/src/services/produto.service.ts backend/src/routes/produto.routes.ts backend/src/dto/produto.dto.ts backend/src/entities/Produto.ts"

for f in $FILES_TO_REMOVE; do
  git reset HEAD "$f" 2>/dev/null || true
  git checkout -- "$f" 2>/dev/null || true
  git clean -fd "$f" 2>/dev/null || true
done

git commit -m "refactor(insumos): reestrutura arquitetura para MateriaPrima e InsumoEstoque com nova interface de gestão" || true

