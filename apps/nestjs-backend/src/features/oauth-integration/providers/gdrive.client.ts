import { DriveFile } from './types';

const BASE = 'https://www.googleapis.com/drive/v3';

export class GoogleDriveClient {
  constructor(private readonly accessToken: string) {}

  private headers() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    const resp = await fetch(
      `${BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      { headers: this.headers() }
    );
    if (!resp.ok) throw new Error(`Drive API ${resp.status}`);
    const data = (await resp.json()) as { files: DriveFile[] };
    return data.files ?? [];
  }

  async readFile(fileId: string): Promise<string> {
    const meta = await fetch(`${BASE}/files/${fileId}?fields=mimeType`, {
      headers: this.headers(),
    });
    const { mimeType } = (await meta.json()) as { mimeType: string };
    let url: string;
    if (mimeType === 'application/vnd.google-apps.document') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else {
      url = `${BASE}/files/${fileId}?alt=media`;
    }
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Drive read ${resp.status}`);
    return resp.text();
  }
}
