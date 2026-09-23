# AI Company OS — Backend

Backend próprio para o ERP/CRM do AI Company OS.

## O que já existe

- API REST
- autenticação Master e Cliente com JWT
- empresas e ciclo de vida
- convites de acesso com revogação
- suporte persistente
- tickets numerados
- mensagens
- upload de prints/documentos
- auditoria
- bloqueio de hard delete de empresas
- SQLite para desenvolvimento

## Rodar localmente

```bash
cd server
npm install
MASTER_EMAIL=master@aicompanyos.local MASTER_PASSWORD='ChangeMe123!' JWT_SECRET='troque-esta-chave' npm start
```

API: `http://localhost:3000`

Health: `GET /api/health`

## Importante

O GitHub Pages hospeda somente arquivos estáticos; ele não executa Node/Express no servidor. Portanto, este backend precisa ser hospedado separadamente. O frontend pode continuar no GitHub Pages e chamar a URL pública da API.

A documentação oficial do GitHub confirma que GitHub Pages publica arquivos estáticos e não suporta linguagens server-side.

Para produção, substituir SQLite por PostgreSQL e configurar secrets/armazenamento persistente no provedor escolhido.
