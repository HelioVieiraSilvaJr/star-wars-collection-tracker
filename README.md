# Star Wars Collection Tracker

Painel pessoal para acompanhar a coleção Star Wars, oportunidades de compra, wishlist, itens comprados e descartados. A aplicação publicada está em **https://star-wars-collection-hj.web.app/**.

## Arquitetura

```text
ChatGPT / desenvolvedor
        │
        ▼
GitHub (branch main)
        │ push aprovado
        ▼
GitHub Actions + Workload Identity Federation
        │
        ▼
Firebase Hosting ── React/Vite
        │
        ├── Firebase Authentication (Google)
        └── Cloud Firestore (fonte única de verdade)

Monitor futuro / integração administrativa
        │ Bearer token no Secret Manager
        ▼
Cloud Function adminApi ── Firebase Admin SDK ── Firestore
```

- **Firebase Project ID:** `star-wars-collection-hj`
- **Região do Firestore e da API:** `southamerica-east1`
- **Frontend:** React 19 + Vite
- **Banco:** Cloud Firestore em modo Native
- **Autenticação do painel:** Google, restrita ao proprietário pelas regras do Firestore
- **CI/CD:** GitHub Actions autenticado no Google Cloud via OIDC/Workload Identity Federation, sem chave JSON de service account no GitHub

## Firestore

O Firestore é a fonte única de verdade. Cadastrar uma oportunidade **não exige build ou deploy**: o painel escuta a collection em tempo real com `onSnapshot`.

### Collection `opportunities`

Um único registro representa um anúncio acompanhado. As visões do painel são derivadas de `status`:

- `Avaliando`: oportunidade em análise;
- `Wishlist`: item desejado;
- `Comprado`: item que já faz parte da coleção;
- `Descartado`: oportunidade encerrada ou rejeitada.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `title` | string | Nome curto do item ou lote |
| `collection` | string | Série, editora ou conjunto |
| `category` | string | Ex.: `HQ`, `Disney Deluxe Figurine Set`, `Disney Play Set` |
| `platform` | string | Loja, marketplace ou origem |
| `price` | number | Preço em BRL |
| `url` | string | Link do anúncio |
| `condition` | string | Estado de conservação |
| `status` | string | Estado do fluxo descrito acima |
| `notes` | string | Observações e contexto da negociação |
| `discoveredAt` | timestamp | Quando a oportunidade foi descoberta |
| `lastCheckedAt` | timestamp | Última verificação de disponibilidade/preço |
| `createdAt` | timestamp | Criação do registro |
| `updatedAt` | timestamp | Última modificação do registro |
| `acquiredAt` | timestamp/null | Momento em que foi marcado como comprado |

As regras em `firestore.rules` impedem escrita pública e validam os principais campos. O frontend usa somente a configuração pública padrão do Firebase; não contém credenciais administrativas.

## Executar localmente

Requisitos: Node.js 22 e Firebase CLI.

```bash
npm ci
npm run dev
```

Para validar uma alteração:

```bash
npm run lint
npm run build
```

O app local usa o mesmo projeto Firebase. `localhost` precisa constar entre os domínios autorizados do Firebase Authentication para testar o login.

## Deploy automático

O workflow `.github/workflows/deploy-hosting.yml` executa em cada `push` na branch `main`:

1. instala dependências com `npm ci`;
2. executa lint e build;
3. autentica no Google Cloud via GitHub OIDC;
4. publica `dist/` no Hosting existente `star-wars-collection-hj`.

A federação está limitada ao repositório e à branch principal. Não existe service account key no repositório ou nos GitHub Secrets.

Pull requests executam o workflow de validação `.github/workflows/validate.yml`, sem publicar em produção.

### Estado operacional

- O workflow e a federação OIDC estão configurados.
- A primeira execução foi impedida antes de iniciar pelo bloqueio de faturamento da conta GitHub. Depois de regularizar o billing da conta, execute **Actions → Deploy Firebase Hosting → Run workflow** uma vez para confirmar o pipeline.
- Enquanto o bloqueio existir, deploys manuais com a Firebase CLI continuam disponíveis.

## Adicionar oportunidades

### Pelo painel

Entre com a conta Google autorizada, clique em **Nova oportunidade** e preencha os dados. O documento é gravado diretamente no Firestore e aparece em tempo real em todos os dispositivos autenticados.

### Pela API administrativa

A Cloud Function preparada em `functions/index.js` fornece operações administrativas. Consulte [docs/ADMIN_API.md](docs/ADMIN_API.md) para endpoints, autenticação e payloads.

Essa API depende do secret `ADMIN_API_TOKEN` no Google Secret Manager e do plano Blaze para ser publicada. Nunca coloque o token em código, no frontend ou em arquivos versionados.

O projeto Firebase está atualmente sem faturamento. Por isso, o código da API está pronto e validado, mas a função e o secret ainda não podem ser provisionados. Ativar o plano Blaze é o único pré-requisito externo restante para essa etapa.

## Alterar o painel

- Interface e comportamento: `src/App.jsx`
- Estilos: `src/styles.css`
- Configuração pública do Firebase: `src/firebase.js`
- Regras e índices: `firestore.rules` e `firestore.indexes.json`
- API administrativa: `functions/index.js`

Fluxo recomendado: branch → pull request → revisão/aprovação → merge em `main` → deploy automático.

## Configurações e secrets necessários

| Nome | Onde fica | Finalidade |
| --- | --- | --- |
| `ADMIN_API_TOKEN` | Google Secret Manager | Bearer token da API administrativa |
| Workload Identity Provider | Google Cloud IAM | Confiança OIDC do workflow do GitHub |
| Service account de deploy | Google Cloud IAM | Permissão mínima para Firebase Hosting |

Os identificadores públicos do provider e da service account podem aparecer no workflow. Tokens, chaves privadas e service account JSON não podem ser versionados.

## Deploy manual de emergência

```bash
npm ci
npm run build
firebase deploy --only hosting,firestore --project star-wars-collection-hj
```

Para a API, depois de ativar faturamento e cadastrar o secret:

```bash
cd functions && npm ci && cd ..
firebase functions:secrets:set ADMIN_API_TOKEN --project star-wars-collection-hj
firebase deploy --only functions:adminApi --project star-wars-collection-hj
```
