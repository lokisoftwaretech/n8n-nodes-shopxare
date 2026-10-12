# n8n-nodes-shopxare

[n8n](https://n8n.io) community nodes for [Shopxare](https://shopxare.com), the customer messaging platform
(website Messenger, email, Telegram, Are AI agent and help center in one inbox).

- **Shopxare Trigger** — starts a workflow when something happens in Shopxare. It subscribes to the event when the
  workflow is activated and removes the subscription when it is deactivated, and checks the
  `X-Shopxare-Signature` of every delivery. Events: *New Conversation*, *New Customer Message*, *New Team Reply*,
  *Conversation Closed*, *Conversation Tagged*, *New Contact*, *New Survey Response*.
- **Shopxare** — actions on contacts (*Create*, *Find by Email*, *Get*, *Track Event*) and conversations (*Get*,
  *Reply* — to the customer or as an internal note, *Add Tag*, *Update* — close, reopen or change priority).
  The node is also usable as a tool by the **AI Agent** node.

Tested with n8n 2.x (self-hosted).

## Installation

In n8n: **Settings → Community nodes → Install**, enter `n8n-nodes-shopxare`, tick
*I understand the risks…* and click **Install**. See n8n's
[community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

1. In Shopxare, open **Settings → API** and create a token. Give it the scopes your workflows need
   (for the examples below: contacts, conversations, messages and webhooks).
2. In n8n, add a node from this package, open **Credential → Create new credential** and fill in:
   - **API Token** — the token from step 1.
   - **API URL** — keep `https://app.shopxare.com/api/v1`.
3. Click **Save**. n8n tests the connection (`GET /me`) and shows *Connection tested successfully*.

## Usage examples

### 1. Reply to every new conversation automatically

A workflow that answers each new conversation with a short message from the team.

1. Create a new workflow and add **Shopxare Trigger**.
2. Choose the credential from above and set **Event** to **New Conversation**.
3. Add a **Shopxare** node after it:
   - **Resource**: Conversation · **Operation**: Reply
   - **Conversation ID**: `{{ $json.data.conversation.id }}`
   - **Message**: `Hi {{ $json.data.contact.name }}, thanks for writing! We'll get back to you within the hour.`
   - **Type**: Reply to the Customer
4. **Save** and switch the workflow to **Active**. n8n registers the webhook in Shopxare.
5. Open the Messenger on your website and send a message: the reply appears in the chat and in the Shopxare inbox.

Each delivery from the trigger looks like this (the node outputs the body as one item):

```json
{
  "id": "6c1e8b3e-2f43-4d55-9a6b-0b7c2d9e1f10",
  "event": "conversation.created",
  "created_at": "2026-10-12T09:41:00+00:00",
  "workspace": { "id": "01JWORKSPACE0000000000000", "name": "Northwind Outfitters" },
  "data": {
    "conversation": { "object": "conversation", "id": "01JCONVERSATION00000000000", "status": "open", "channel": "widget", "priority": "normal", "tags": [] },
    "contact": { "object": "contact", "id": "01JCONTACT0000000000000000", "name": "Ada Lovelace", "email": "ada@example.com" },
    "message": { "object": "message", "id": 1, "type": "comment", "body": "Hello! Where is my order?", "author": { "type": "contact" } }
  }
}
```

### 2. Create a contact from another app

Add people who sign up elsewhere (a form, a shop, a spreadsheet) as Shopxare contacts.

1. Start a workflow with any trigger that provides an email address — for example **n8n Form Trigger** with the
   fields *Name* and *Email*.
2. Add a **Shopxare** node:
   - **Resource**: Contact · **Operation**: Create
   - **Email**: `{{ $json.Email }}`
   - **Name**: `{{ $json.Name }}`
3. Click **Execute step**. The node returns the new contact, for example:

```json
{ "object": "contact", "id": "01JCONTACT0000000000000001", "type": "lead", "name": "Lucía Romero", "email": "lucia.romero@example.com" }
```

To avoid duplicates, run **Contact → Find by Email** first and branch with an **If** node on whether an `id` came
back.

### 3. Tag VIP conversations

1. **Shopxare Trigger** with **Event** = **New Customer Message**.
2. **If** node: `{{ $json.data.contact.email }}` *ends with* `@your-best-customer.com`.
3. On the *true* branch, a **Shopxare** node: **Conversation → Add Tag**, **Conversation ID**
   `{{ $json.data.conversation.id }}`, **Tag** = *VIP* (tags are loaded from your workspace).

### 4. Use Shopxare as an AI Agent tool

1. Add an **AI Agent** node (with a chat model of your choice).
2. Click **+** under *Tool* and choose **Shopxare Tool**, for example **Contact → Find by Email**.
3. Next to **Email**, click the ✨ button so the field is *Defined automatically by the model*.
4. Ask the agent things like *"Is ada@example.com already a customer?"* — it calls Shopxare and answers from the
   contact it finds.

## Resources

- [Shopxare REST API reference (OpenAPI)](https://app.shopxare.com/api/v1/openapi.json)
- [Shopxare docs](https://shopxare.com/en/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Releasing

Push a version tag (`git tag v1.0.3 && git push --tags`): GitHub Actions builds the nodes and publishes them to npm
with provenance through npm trusted publishing (`.github/workflows/publish.yml`).

## License

MIT
