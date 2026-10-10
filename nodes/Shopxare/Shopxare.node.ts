import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription, JsonObject } from 'n8n-workflow';

/** Actions on Shopxare: contacts, conversations and events. */
export class Shopxare implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopxare',
		name: 'shopxare',
		icon: { light: 'file:shopxare.svg', dark: 'file:shopxare.dark.svg' },
		usableAsTool: true,
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Shopxare contacts and conversations',
		defaults: { name: 'Shopxare' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'shopxareApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'contact',
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				default: 'create',
				options: [
					{ name: 'Create', value: 'create', action: 'Create a contact' },
					{ name: 'Find by Email', value: 'find', action: 'Find a contact by email' },
					{ name: 'Get', value: 'get', action: 'Get a contact' },
					{ name: 'Track Event', value: 'track', action: 'Track an event on a contact' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['conversation'] } },
				default: 'reply',
				options: [
					{ name: 'Get', value: 'get', action: 'Get a conversation' },
					{ name: 'Reply', value: 'reply', action: 'Reply to a conversation' },
					{ name: 'Add Tag', value: 'tag', action: 'Add a tag to a conversation' },
					{ name: 'Update', value: 'update', action: 'Update a conversation' },
				],
			},
			// Contact
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '', displayOptions: { show: { resource: ['contact'], operation: ['create', 'find'] } } },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', displayOptions: { show: { resource: ['contact'], operation: ['create'] } } },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '', displayOptions: { show: { resource: ['contact'], operation: ['create'] } } },
			{ displayName: 'Your Customer ID', name: 'externalId', type: 'string', default: '', description: 'Makes the contact a user linked to your system', displayOptions: { show: { resource: ['contact'], operation: ['create'] } } },
			{ displayName: 'Contact ID', name: 'contactId', type: 'string', required: true, default: '', displayOptions: { show: { resource: ['contact'], operation: ['get', 'track'] } } },
			{ displayName: 'Event Name', name: 'eventName', type: 'string', required: true, default: '', placeholder: 'order_placed', displayOptions: { show: { resource: ['contact'], operation: ['track'] } } },
			{ displayName: 'Details (JSON)', name: 'eventMeta', type: 'json', default: '{}', displayOptions: { show: { resource: ['contact'], operation: ['track'] } } },
			// Conversation
			{ displayName: 'Conversation ID', name: 'conversationId', type: 'string', required: true, default: '', displayOptions: { show: { resource: ['conversation'] } } },
			{ displayName: 'Message', name: 'body', type: 'string', typeOptions: { rows: 4 }, required: true, default: '', displayOptions: { show: { resource: ['conversation'], operation: ['reply'] } } },
			{
				displayName: 'Type', name: 'messageType', type: 'options', default: 'comment', displayOptions: { show: { resource: ['conversation'], operation: ['reply'] } },
				options: [{ name: 'Reply to the Customer', value: 'comment' }, { name: 'Internal Note', value: 'note' }],
			},
			{ displayName: 'Tag Name or ID', name: 'tagId', type: 'options', typeOptions: { loadOptionsMethod: 'getTags' }, required: true, default: '', description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>', displayOptions: { show: { resource: ['conversation'], operation: ['tag'] } } },
			{
				displayName: 'Status', name: 'status', type: 'options', default: '', displayOptions: { show: { resource: ['conversation'], operation: ['update'] } },
				options: [{ name: 'Unchanged', value: '' }, { name: 'Open', value: 'open' }, { name: 'Closed', value: 'closed' }],
			},
			{
				displayName: 'Priority', name: 'priority', type: 'options', default: '', displayOptions: { show: { resource: ['conversation'], operation: ['update'] } },
				options: [{ name: 'Unchanged', value: '' }, { name: 'Normal', value: 'normal' }, { name: 'High', value: 'high' }],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('shopxareApi');
				const res = (await this.helpers.httpRequestWithAuthentication.call(this, 'shopxareApi', { url: `${credentials.baseUrl}/tags`, json: true })) as { data: Array<{ id: number; name: string }> };
				return res.data.map((t) => ({ name: t.name, value: t.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('shopxareApi');
		const call = async (method: IHttpRequestMethods, path: string, body?: IDataObject, qs?: IDataObject) =>
			(await this.helpers.httpRequestWithAuthentication.call(this, 'shopxareApi', { method, url: `${credentials.baseUrl}${path}`, body, qs, json: true })) as IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[] = {};
				if (resource === 'contact') {
					if (operation === 'create') {
						const body: IDataObject = {};
						for (const [param, field] of [['email', 'email'], ['name', 'name'], ['phone', 'phone'], ['externalId', 'external_id']]) {
							const v = this.getNodeParameter(param, i) as string;
							if (v) body[field] = v;
						}
						result = await call('POST', '/contacts', body);
					} else if (operation === 'find') {
						result = ((await call('GET', '/contacts', undefined, { email: this.getNodeParameter('email', i) as string, limit: 10 })).data as IDataObject[]) ?? [];
					} else if (operation === 'get') {
						result = await call('GET', `/contacts/${encodeURIComponent(this.getNodeParameter('contactId', i) as string)}`);
					} else {
						const meta = this.getNodeParameter('eventMeta', i) as string | IDataObject;
						result = await call('POST', `/contacts/${encodeURIComponent(this.getNodeParameter('contactId', i) as string)}/events`, {
							name: this.getNodeParameter('eventName', i) as string,
							meta: typeof meta === 'string' ? JSON.parse(meta || '{}') : meta,
						});
					}
				} else {
					const id = encodeURIComponent(this.getNodeParameter('conversationId', i) as string);
					if (operation === 'get') {
						result = await call('GET', `/conversations/${id}`);
					} else if (operation === 'reply') {
						result = await call('POST', `/conversations/${id}/messages`, { body: this.getNodeParameter('body', i) as string, type: this.getNodeParameter('messageType', i) as string });
					} else if (operation === 'tag') {
						result = await call('POST', `/conversations/${id}/tags`, { add: [Number(this.getNodeParameter('tagId', i))] });
					} else {
						const body: IDataObject = {};
						const status = this.getNodeParameter('status', i) as string;
						const priority = this.getNodeParameter('priority', i) as string;
						if (status) body.status = status;
						if (priority) body.priority = priority;
						result = await call('PATCH', `/conversations/${id}`, body);
					}
				}
				for (const row of Array.isArray(result) ? result : [result]) out.push({ json: row, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}
		return [out];
	}
}
