# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

## [Unreleased]

### Added

- Painel responsivo para cadastrar, filtrar e acompanhar oportunidades de colecionáveis Star Wars em tempo real.
- Status de avaliação, wishlist, compra e descarte, com métricas de itens, radar e valor investido.
- Integração com Firebase Authentication, Cloud Firestore e Hosting, com acesso restrito à conta do proprietário.
- Carga inicial com as oportunidades recuperadas das conversas sobre coleções DeAgostini e Panini.
- Pipeline de CI/CD do GitHub Actions com autenticação OIDC sem chave privada para publicar a branch `main` no Firebase Hosting.
- API administrativa autenticada, preparada como Cloud Function para monitoramentos atualizarem o Firestore sem credenciais no frontend.
- Campos de categoria, data de descoberta e última verificação para oportunidades de HQs e figuras Disney.

### Changed

- Firestore consolidado como fonte única de verdade; novas oportunidades aparecem em tempo real sem deploy do frontend.

### Security

- Regras do Firestore validam o formato das oportunidades e mantêm leitura e escrita limitadas ao proprietário.
- API administrativa usa secret do Google Secret Manager e comparação de token em tempo constante.
- Deploy do GitHub usa identidade federada restrita ao repositório e à branch principal, sem credencial persistente.
