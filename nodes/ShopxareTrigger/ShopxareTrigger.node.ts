import { NodeConnectionTypes } from 'n8n-workflow';
import type { IDataObject, IHookFunctions, IWebhookFunctions, INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';

/** Subscribes to a Shopxare event (REST hook) when the workflow is activated and unsubscribes when it stops. */
export class ShopxareTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopxare Trigger',
		name: 'shopxareTrigger',
		icon: { light: 'file:shopxare.svg', dark: 'file:shopxare.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when something happens in Shopxare',
		defaults: { name: 'Shopxare Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'shopxareApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'conversation.created',
				options: [
					{ name: 'Conversation Closed', value: 'conversation.closed' },
					{ name: 'Conversation Tagged', value: 'conversation.tagged' },
					{ name: 'New Contact', value: 'contact.created' },
					{ name: 'New Conversation', value: 'conversation.created' },
					{ name: 'New Customer Message', value: 'message.received' },
					{ name: 'New Survey Response', value: 'survey.answered' },
					{ name: 'New Team Reply', value: 'message.sent' },
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.hookId) return false;
				const credentials = await this.getCredentials('shopxareApi');
				const list = (await this.helpers.httpRequestWithAuthentication.call(this, 'shopxareApi', {
					method: 'GET', url: `${credentials.baseUrl}/hooks`, json: true,
				})) as { data: Array<{ id: string; target_url: string }> };
				return list.data.some((h) => h.id === data.hookId && h.target_url === this.getNodeWebhookUrl('default'));
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('shopxareApi');
				const hook = (await this.helpers.httpRequestWithAuthentication.call(this, 'shopxareApi', {
					method: 'POST',
					url: `${credentials.baseUrl}/hooks`,
					body: { event: this.getNodeParameter('event') as string, target_url: this.getNodeWebhookUrl('default'), source: 'n8n' },
					json: true,
				})) as { id: string; secret: string };
				const data = this.getWorkflowStaticData('node');
				data.hookId = hook.id;
				data.secret = hook.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.hookId) {
					const credentials = await this.getCredentials('shopxareApi');
					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'shopxareApi', { method: 'DELETE', url: `${credentials.baseUrl}/hooks/${data.hookId}` });
					} catch (error) {
						// Usually already gone on our side; nothing else to clean up.
						this.logger.warn(`Shopxare: could not remove the webhook subscription: ${(error as Error).message}`);
					}
					delete data.hookId;
					delete data.secret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;
		// X-Shopxare-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
		const header = String(req.headers['x-shopxare-signature'] ?? '');
		const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(header);
		const raw = (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ?? JSON.stringify(req.body);
		if (secret) {
			const expected = match ? createHmac('sha256', secret).update(`${match[1]}.${raw}`).digest('hex') : '';
			const fresh = match ? Math.abs(Date.now() / 1000 - Number(match[1])) < 600 : false;
			if (!match || !fresh || !timingSafeEqual(Buffer.from(expected), Buffer.from(match[2]))) {
				const res = this.getResponseObject();
				res.status(401).json({ error: 'invalid signature' });
				return { noWebhookResponse: true };
			}
		}
		return { workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)] };
	}
}
