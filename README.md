# Caderno de Contas

App de controle financeiro pessoal, com dados salvos no Firestore (Firebase).

## 1. Configurar o Firebase

1. Acesse https://console.firebase.google.com e crie um projeto (ou use um existente).
2. No menu lateral, vá em **Compilação > Firestore Database** e clique em **Criar banco de dados** (modo produção).
3. Em **Regras**, cole isto e publique — garante que só quem faz parte de um caderno (household) pode ler/escrever nele:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }

       match /households/{householdId} {
         allow read: if request.auth != null && request.auth.uid in resource.data.members;
         allow create: if request.auth != null
                       && request.resource.data.ownerId == request.auth.uid
                       && request.resource.data.members == [request.auth.uid];
         allow update: if request.auth != null && (
                         request.auth.uid == resource.data.ownerId ||
                         (request.auth.uid in resource.data.members
                          && request.resource.data.members == resource.data.members
                          && request.resource.data.ownerId == resource.data.ownerId) ||
                         (request.resource.data.members.size() == resource.data.members.size() + 1
                          && request.auth.uid in request.resource.data.members
                          && request.resource.data.ownerId == resource.data.ownerId)
                       );
         allow delete: if false;

         match /lancamentos/{docId} {
           allow read, write: if request.auth != null
             && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.members;
         }

         match /dividas/{debtId} {
           allow read, write: if request.auth != null
             && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.members;
         }
       }
     }
   }
   ```

4. Vá em **Build > Authentication > Sign-in method**, ative o provedor **Google** (escolha um e-mail de suporte quando pedir) e em **Settings > Authorized domains** adicione o domínio do seu site publicado (ex: `seusite.netlify.app`), senão o login com Google não funciona nele.
5. Vá em **Configurações do projeto** (ícone de engrenagem) > role até **Seus apps** > clique no ícone `</>` para criar um app Web.
6. Copie o objeto `firebaseConfig` que aparecer e cole em `src/firebase.js`, substituindo os valores de exemplo.

## 2. Rodar localmente (opcional, para testar antes de publicar)

```bash
npm install
npm run dev
```

## 3. Publicar no Netlify

**Opção A — pelo site (mais simples):**
1. Suba esta pasta para um repositório no GitHub.
2. No painel do Netlify, clique em **Add new site > Import an existing project** e conecte o repositório.
3. O Netlify já vai detectar o comando de build (`npm run build`) e a pasta de saída (`dist`) pelo arquivo `netlify.toml`.
4. Clique em **Deploy**.

**Opção B — pela linha de comando:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

## 4. Ligar seu domínio próprio

No painel do site na Netlify, vá em **Domain settings > Add a domain**, digite o domínio que você já possui e siga as instruções para apontar o DNS (a Netlify mostra exatamente quais registros configurar no seu provedor de domínio).
