import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class ShopxareApi implements ICredentialType {
	name = 'shopxareApi';

	displayName = 'Shopxare API';

	icon: Icon = { light: 'file:shopxare.svg', dark: 'file:shopxare.dark.svg' };

	documentationUrl = 'https://app.shopxare.com/api/v1/openapi.json';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Create one in Shopxare → Settings → API',
		},
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.shopxare.com/api/v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}', Accept: 'application/json' } },
	};

	test: ICredentialTestRequest = {
		request: { baseURL: '={{$credentials.baseUrl}}', url: '/me' },
	};
}
