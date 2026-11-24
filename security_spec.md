# Especificação de Segurança Firestore — Frota Pau Brasil

## 1. Invariantes de Dados
1. **Identidade e Verificação**: Todas as operações de leitura e escrita exigem usuário autenticado com `request.auth.token.email_verified == true`.
2. **Isolamento de Propriedade e Admin**:
   - Cada documento operacional (`vehicles`, `documents`, `evidences`, `vehiclePhotos`, `fleetMeta`) possui um campo imutável `ownerId` vinculado ao `request.auth.uid` no momento da criação.
   - Consultas (`allow list`) avaliam diretamente `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()`, sem chamadas `get()` ou `exists()`.
   - Perfis privados (`/users/{userId}`) nunca permitem `list` e restringem `get`/`create`/`update` ao próprio dono ou administrador.
   - A coleção `/admins/{userId}` nunca pode ser escrita por usuários comuns; somente o administrador inicial verificado (`paubrasilabastecimento@gmail.com`) pode criar ou remover administradores.
3. **Integridade Relacional (Master Gate & Atomicidade)**:
   - Documentos (`/documents/{docId}`), evidências (`/evidences/{vehicleId}`) e fotos personalizadas (`/vehiclePhotos/{vehicleId}`) exigem na criação que o veículo pai exista após o batch (`existsAfter(/databases/$(database)/documents/vehicles/$(vehicleId))`) e pertença ao mesmo `ownerId` (`getAfter(...).data.ownerId == incoming().ownerId`).
4. **Esquema Estrito (Anti-Update-Gap & Shadow Fields)**:
   - Todas as coleções possuem validadores dedicados (`isValid[Entity]`) executados em `create` e `update`, exigindo `keys().hasAll(...)` e `keys().hasOnly(...)`, limites de tamanho em todas as strings e regex `^[a-zA-Z0-9_\-]+$` em todos os IDs.
5. **Integridade Temporal**:
   - `createdAt == request.time` na criação (imutável após criação) e `updatedAt == request.time` em toda atualização.

## 2. "Dirty Dozen" — 12 Payloads Adversariais (Todos devem retornar PERMISSION_DENIED)
1. **Ghost Field Injection (`vehicles`)**: Criação de veículo com campo extra não autorizado (`isVerified: true`).
2. **Identity Spoofing (`vehicles`)**: Criação de veículo definindo `ownerId` para o UID de outro usuário (`victim-uid`).
3. **Email Spoofing (`vehicles` / admin)**: Requisição com `email: "paubrasilabastecimento@gmail.com"` mas `email_verified: false`.
4. **ID Poisoning (`vehicles`)**: Criação em `/vehicles/bad$id..with..chars` com ID fora da regex `^[a-zA-Z0-9_\-]+$`.
5. **Resource Exhaustion / 1MB String (`vehicles`)**: Campo `plate` ou `model` excedendo `maxLength` (`plate` com 500 chars).
6. **Orphaned Document (`documents`)**: Criação de documento referenciando `vehicleId` inexistente.
7. **Cross-Tenant Attachment (`evidences`)**: Criação de evidência vinculada a um `vehicleId` pertencente a outro `ownerId`.
8. **Client Timestamp Forgery (`vehicles`)**: Criação com `createdAt` manipulado no cliente diferente de `request.time`.
9. **Immutable Field Tampering (`vehicles` update)**: Tentativa de alterar `ownerId` ou `createdAt` durante `update`.
10. **Self-Assigned Privilege Escalation (`admins`)**: Usuário comum tentando criar `/admins/{seuUid}`.
11. **PII Cross-User Read / Blanket List (`users`)**: Usuário tentando ler `/users/{outroUid}` ou listar `/users`.
12. **Unscoped List Scraping (`vehicles`)**: Query `list` sem filtro de `ownerId` feita por usuário não-admin.
