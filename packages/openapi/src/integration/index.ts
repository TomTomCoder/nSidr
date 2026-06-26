export interface IIntegration {
  id: string;
  spaceId: string;
  provider: 'GMAIL' | 'GCALENDAR' | 'GDRIVE' | 'GCHAT' | 'GMEET' | 'SLACK';
  scopes: string[];
  userId: string;
  isActive: boolean;
  tokenExpiry: string | null; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface IIntegrationCreate {
  provider: IIntegration['provider'];
  spaceId: string;
}

export interface IIntegrationList {
  integrations: IIntegration[];
}

export interface IIntegrationAuthorizeResponse {
  url: string;
  state: string;
}
