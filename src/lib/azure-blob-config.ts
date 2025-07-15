// lib/azure-blob-config.ts
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

export class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'provider-certificates';

    if (!accountName || !accountKey) {
      throw new Error('Azure Storage credentials not configured');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
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
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    // Ensure container exists (no access means private)
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
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
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
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
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
    // For private containers, you might want to generate SAS URLs
    // This requires additional configuration with SAS tokens
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(fileName);
    
    // For now, return the direct URL (works if container is public)
    return blobClient.url;
  }
}

export const azureBlobService = new AzureBlobService();