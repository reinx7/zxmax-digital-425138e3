# Integração Evopay - Guia de Implementação

## Visão Geral

Este documento descreve a integração do gateway de pagamento **Evopay** no projeto zxmax-digital, substituindo a integração anterior com AbacatePay.

## Arquitetura

### Componentes Alterados

1. **Supabase Function**: `create-evopay-checkout`
   - Localização: `/supabase/functions/create-evopay-checkout/index.ts`
   - Responsabilidade: Criar transações Pix via API da Evopay

2. **Frontend**: `StoreView.tsx`
   - Localização: `/src/components/StoreView.tsx`
   - Responsabilidade: Invocar a função Supabase e exibir QR code

## Configuração Necessária

### 1. Variáveis de Ambiente

Adicione a seguinte variável de ambiente no Supabase:

```bash
EVOPAY_API_KEY=sua_chave_api_evopay_aqui
```

**Como obter a chave API:**
1. Acesse https://processamento.evopay.cash/
2. Faça login em sua conta
3. Navegue até Configurações > Chaves de API
4. Copie sua chave de API

### 2. Configuração no Supabase

1. Acesse o painel do Supabase do seu projeto
2. Vá para **Edge Functions** > **create-evopay-checkout**
3. Configure a variável de ambiente `EVOPAY_API_KEY`

## Fluxo de Pagamento

```
1. Usuário clica em "Comprar"
   ↓
2. Frontend invoca `create-evopay-checkout`
   ↓
3. Supabase Function cria transação Pix na Evopay
   ↓
4. Evopay retorna QR code e ID da transação
   ↓
5. Frontend exibe QR code para o usuário
   ↓
6. Usuário escaneia e paga via Pix
   ↓
7. Evopay envia callback para confirmar pagamento
```

## API da Evopay

### Endpoint Principal

**POST** `https://pix.evopay.cash/v1/pix`

### Parâmetros de Requisição

```json
{
  "amount": 150.50,
  "callbackUrl": "https://seu-site.com/callback",
  "payerName": "João Silva",
  "payerEmail": "joao@email.com",
  "payerDocument": "12345678909"
}
```

### Resposta

```json
{
  "id": "transaction_id_123",
  "status": "PENDING",
  "amount": 150.50,
  "taxAmount": 0.10,
  "amountWithTax": 150.40,
  "qrCodeText": "00020126580014br.gov.bcb.pix...",
  "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUgAAAKQAAAC...",
  "qrCodeUrl": "https://pix.evopay.cash/v1/pix/qr-code/transaction_id_123"
}
```

## Verificação de Transação

### Endpoint

**GET** `https://pix.evopay.cash/v1/pix?id=TRANSACTION_ID`

### Headers

```
API-Key: sua_chave_api
```

### Resposta

```json
{
  "id": "transaction_id_123",
  "status": "COMPLETED",
  "amount": 150.50,
  "type": "DEPOSIT",
  "qrCodeText": "00020126580014br.gov.bcb.pix...",
  "payerName": "João Silva",
  "payerCPF": "12345678909"
}
```

## Possíveis Status

- **PENDING**: Aguardando pagamento
- **COMPLETED**: Pagamento realizado com sucesso
- **CANCELED**: Transação cancelada ou erro no processamento

## Callback de Pagamento

Quando um pagamento é confirmado, a Evopay envia uma requisição POST para a `callbackUrl` configurada.

### Exemplo de Payload

```json
{
  "id": "transaction_id_123",
  "status": "COMPLETED",
  "amount": 150.50,
  "payerName": "João Silva",
  "payerCPF": "12345678909"
}
```

## Implementação do Callback (Opcional)

Para processar callbacks automaticamente, crie uma nova Supabase Function:

```typescript
// supabase/functions/evopay-callback/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, status, amount, payerName } = await req.json();
    
    console.log("Evopay callback received:", { id, status, amount, payerName });
    
    if (status === "COMPLETED") {
      // Atualizar banco de dados com confirmação de pagamento
      // Entregar produto ao usuário
      // Enviar email de confirmação
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

## Testes

### Ambiente de Testes

A Evopay oferece um ambiente de testes. Para usar:

1. Crie uma conta de teste em https://docs.evopay.cash/
2. Use a chave de API de teste
3. As transações não serão cobradas

### Teste Manual

1. Acesse seu site em desenvolvimento
2. Tente fazer uma compra
3. Verifique se o QR code é exibido
4. Escaneie o QR code com um app Pix
5. Confirme o pagamento

## Troubleshooting

### Erro: "EVOPAY_API_KEY não configurada"

**Solução**: Verifique se a variável de ambiente está configurada no Supabase.

### Erro: "Dados incompletos para checkout"

**Solução**: Certifique-se de que `productName`, `priceInCents` e `buyerEmail` estão sendo enviados.

### Erro: "Nenhuma informação de pagamento retornada"

**Solução**: Verifique se a chave de API é válida e se a conta Evopay está ativa.

## Referências

- [Documentação Evopay](https://docs.evopay.cash/)
- [API Evopay Pix](https://pix.evopay.cash/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Próximos Passos

1. ✅ Implementar função Supabase para criar transações
2. ✅ Atualizar frontend para usar nova função
3. ⏳ Implementar callback para confirmar pagamentos
4. ⏳ Atualizar banco de dados quando pagamento for confirmado
5. ⏳ Enviar email de confirmação ao usuário
6. ⏳ Testar fluxo completo em produção

## Suporte

Para dúvidas sobre a integração:
- Documentação Evopay: https://docs.evopay.cash/
- Suporte Evopay: https://evopay.cash/
