// /api/upload-certificate/route.ts (Simplified version)
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'provider-certificates';

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const serviceName = formData.get('serviceName') as string;

    if (!file || !serviceName) {
      return NextResponse.json(
        { message: 'File and service name are required' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Create safe filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeServiceName = serviceName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileExtension = file.name.split('.').pop() || 'unknown';
    const fileName = `${safeServiceName}_${timestamp}.${fileExtension}`;

    // Get container and blob clients
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    
    const blobClient = containerClient.getBlockBlobClient(fileName);

    // Convert file to buffer and upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await blobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: file.type || 'application/octet-stream',
      },
      metadata: {
        originalName: file.name,
        serviceName: serviceName,
        uploadedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      fileUrl: blobClient.url,
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'Upload failed', error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('fileName');
  const download = searchParams.get('download') === 'true';

  if (!fileName) {
    return NextResponse.json(
      { message: 'File name is required' },
      { status: 400 }
    );
  }

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(fileName);

    const exists = await blobClient.exists();
    if (!exists) {
      return NextResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }

    if (download) {
      // Simple download approach
      const downloadResponse = await blobClient.downloadToBuffer();
      const properties = await blobClient.getProperties();

      return new NextResponse(downloadResponse, {
        headers: {
          'Content-Type': properties.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': downloadResponse.length.toString()
        }
      });
    } else {
      // Return file info
      const properties = await blobClient.getProperties();
      return NextResponse.json({
        fileName: fileName,
        fileUrl: blobClient.url,
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified
      });
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: 'Download failed', error: String(error) },
      { status: 500 }
    );
  }
}