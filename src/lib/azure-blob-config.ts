// lib/azure-blob-config.ts
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

export class AzureBlobService {
  private containerName: string;

  constructor() {
    // Don't initialize client here — do it lazily so build doesn't fail
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'provider-certificates';
  }

  // Lazily create the BlobServiceClient at call time, not at build time
  private getClient(): BlobServiceClient {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (!accountName || !accountKey) {
      throw new Error('Azure Storage credentials not configured');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; requestId: string }> {
    const containerClient = this.getClient().getContainerClient(this.containerName);

    await containerClient.createIfNotExists();

    const blobClient = containerClient.getBlockBlobClient(fileName);

    const uploadResponse = await blobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: `attachment; filename="${fileName}"`
      },
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString()
      }
    });

    return {
      url: blobClient.url,
      requestId: uploadResponse.requestId || 'unknown'
    };
  }

  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const containerClient = this.getClient().getContainerClient(this.containerName);
      const blobClient = containerClient.getBlockBlobClient(fileName);

      await blobClient.delete();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async getFileStream(fileName: string): Promise<{ stream: NodeJS.ReadableStream; properties: any } | null> {
    try {
      const containerClient = this.getClient().getContainerClient(this.containerName);
      const blobClient = containerClient.getBlockBlobClient(fileName);

      const exists = await blobClient.exists();
      if (!exists) return null;

      const downloadResponse = await blobClient.download();
      const properties = await blobClient.getProperties();

      return {
        stream: downloadResponse.readableStreamBody as NodeJS.ReadableStream,
        properties
      };
    } catch (error) {
      console.error('Error getting file stream:', error);
      return null;
    }
  }

  generateSasUrl(fileName: string, expiryHours: number = 1): string {
    const containerClient = this.getClient().getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(fileName);
    return blobClient.url;
  }
}

// Safe to instantiate — constructor no longer throws
export const azureBlobService = new AzureBlobService();