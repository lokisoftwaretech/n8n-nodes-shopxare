# n8n-nodes-shopxare

[n8n](https://n8n.io) community nodes for Shopxare.

- **Shopxare Trigger** — subscribes to an event when the workflow is activated (and removes the subscription when
  it is deactivated). Checks the `X-Shopxare-Signature` of every delivery. Events: new conversation, new customer
  message, new team reply, conversation closed, conversation tagged, new contact, new survey response.
- **Shopxare** — contacts (create, find by email, get, track event) and conversations (get, reply or note, add tag,
  close / reopen / prioritize).

## Install (self-hosted n8n)

Settings → Community nodes → Install → `n8n-nodes-shopxare`. Then add a **Shopxare API** credential with a token
from Shopxare → Settings → API.

## Releasing

Push a version tag (`git tag v1.0.2 && git push --tags`): GitHub Actions builds the nodes and publishes them to npm
with provenance through npm trusted publishing (`.github/workflows/publish.yml`).

## License

MIT
