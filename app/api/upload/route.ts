import { NextResponse } from 'next/server';
import { deleteFile, uploadFile } from '@/lib/storage';
import { isSafeStorageKey, normalizeUploadFolder, validateUploadFile } from '@/lib/upload-validation';
import { requireAdminRequest } from '@/lib/security';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorField, getErrorMessage } from '@/lib/errors';

// POST /api/upload
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = normalizeUploadFolder(formData.get('folder') as string | null);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validationError = validateUploadFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(
      buffer,
      file.name,
      file.type,
      folder,
      access.configId
    );

    return NextResponse.json({
      key: result.key,
      url: result.url,
      originalName: file.name,
      size: file.size,
      contentType: file.type,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Upload error:', {
      message: getErrorMessage(error),
      name: getErrorField(error, 'name'),
      code: getErrorField(error, 'Code') || getErrorField(error, 'code'),
      providerStatus: (getErrorField(error, '$metadata') as { httpStatusCode?: number } | undefined)?.httpStatusCode,
    });
    return NextResponse.json({
      error: 'Failed to upload file',
      detail: getErrorMessage(error),
    }, { status: 500 });
  }
}

// DELETE /api/upload
export async function DELETE(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    const body = await request.json();
    const { key } = body;

    if (!isSafeStorageKey(key)) {
      return NextResponse.json({ error: 'Storage key is required' }, { status: 400 });
    }

    await deleteFile(key);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete error:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
