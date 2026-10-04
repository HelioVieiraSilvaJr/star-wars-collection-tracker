# API administrativa

A função `adminApi` foi desenhada para monitoramentos confiáveis adicionarem e atualizarem oportunidades sem expor credenciais do Firebase no cliente.

## Segurança

- HTTPS obrigatório.
- Autenticação por `Authorization: Bearer <ADMIN_API_TOKEN>`.
- O token fica no Google Secret Manager e só é disponibilizado à função durante a execução.
- Comparação do token em tempo constante.
- Sem CORS; navegadores não podem chamar a API a partir de outras origens.
- Limite de três instâncias para conter consumo inesperado.
- Firebase Admin SDK existe apenas no backend.

O endpoint `/health` é público e não acessa dados. Todos os outros endpoints exigem autenticação.

## URL

Depois do primeiro deploy, obtenha a URL exata com:

```bash
firebase functions:list --project star-wars-collection-hj
```

O formato esperado para a região configurada é:

```text
https://southamerica-east1-star-wars-collection-hj.cloudfunctions.net/adminApi
```

## Endpoints

| Método | Caminho | Operação |
| --- | --- | --- |
| `GET` | `/health` | Verifica se a API está ativa |
| `GET` | `/opportunities` | Lista oportunidades; aceita `status` e `category` |
| `GET` | `/collection` | Lista itens com status `Comprado` |
| `POST` | `/opportunities` | Cria uma oportunidade |
| `PATCH` | `/opportunities/:id` | Atualiza campos e a data de verificação |
| `DELETE` | `/opportunities/:id` | Remove um registro |

## Exemplo: criar oportunidade

```bash
curl -X POST "$ADMIN_API_URL/opportunities" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Disney Deluxe Figurine Set — exemplo",
    "collection": "Disney Store",
    "category": "Disney Deluxe Figurine Set",
    "platform": "Mercado Livre",
    "price": 399.90,
    "url": "https://exemplo.invalid/anuncio",
    "condition": "Novo",
    "status": "Avaliando",
    "notes": "Encontrado pelo monitor automático"
  }'
```

## Exemplo: atualizar preço e verificação

```bash
curl -X PATCH "$ADMIN_API_URL/opportunities/DOCUMENT_ID" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 349.90,
    "lastCheckedAt": "2026-10-04T18:00:00.000Z",
    "notes": "Preço reduzido"
  }'
```

## Integração futura com ChatGPT

O integrador deverá receber, fora da conversa e por um mecanismo seguro, somente:

- a URL da função;
- o valor do secret `ADMIN_API_TOKEN`.

Se a integração oferecer um cofre de secrets, armazene o token nele e configure uma chamada HTTP com o header `Authorization`. Não cole o token em prompts, issues, commits ou arquivos do repositório.
