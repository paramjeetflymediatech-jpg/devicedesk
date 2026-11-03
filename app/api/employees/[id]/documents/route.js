import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db.js';
import { checkAuth, uploadFile, isSafeExtension } from '../../../utils/storageManager.js';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDbConnection();

    const [rows] = await db.query('SELECT id, name, documents FROM employees WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    let docs = [];
    if (rows[0].documents) {
      try {
        docs = typeof rows[0].documents === 'string' ? JSON.parse(rows[0].documents) : rows[0].documents;
      } catch (e) {
        docs = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(docs) ? docs : []
    });
  } catch (err) {
    console.error('Fetch Employee Documents API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await checkAuth(request);
    const db = await getDbConnection();

    const [rows] = await db.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const employee = rows[0];
    let existingDocs = [];
    if (employee.documents) {
      try {
        existingDocs = typeof employee.documents === 'string' ? JSON.parse(employee.documents) : employee.documents;
      } catch (e) {
        existingDocs = [];
      }
    }
    if (!Array.isArray(existingDocs)) existingDocs = [];

    const contentType = request.headers.get('content-type') || '';
    let docData = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const name = formData.get('name') || (file ? file.name : 'Untitled Document');
      const type = formData.get('type') || 'Other';
      const uploadedBy = formData.get('uploadedBy') || (user?.name || 'Admin');

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      if (!isSafeExtension(file.name)) {
        return NextResponse.json({ success: false, error: `File type rejected: "${file.name}" is not an allowed extension.` }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (buffer.length > 100 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'File size exceeds 100MB limit' }, { status: 400 });
      }

      const uploadResult = await uploadFile(buffer, file.name, 'employee_documents');
      let finalUrl = uploadResult;
      if (typeof uploadResult === 'string') {
        if (!uploadResult.startsWith('http://') && !uploadResult.startsWith('https://') && !uploadResult.startsWith('/')) {
          const baseUrl = process.env.WHM_SFTP_BASE_URL || 'https://storage.flymediatech.com/uploads';
          const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          finalUrl = `${cleanBaseUrl}/${uploadResult}`;
        }
        finalUrl = finalUrl.replace(/(https?:\/\/storage\.flymediatech\.com\/uploads\/)+/g, 'https://storage.flymediatech.com/uploads/');
      }

      const sizeStr = buffer.length > 1024 * 1024 
        ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.max(1, Math.round(buffer.length / 1024))} KB`;

      docData = {
        name: String(name).trim(),
        type: String(type).trim(),
        fileUrl: finalUrl,
        fileName: file.name,
        fileSize: sizeStr,
        uploadedBy
      };
    } else {
      const body = await request.json();
      const { name, type, fileUrl, fileName, fileSize, uploadedBy } = body;

      if (!fileUrl) {
        return NextResponse.json({ success: false, error: 'File URL is required' }, { status: 400 });
      }

      docData = {
        name: (name || fileName || 'Document').trim(),
        type: (type || 'Other').trim(),
        fileUrl,
        fileName: fileName || 'file',
        fileSize: fileSize || 'N/A',
        uploadedBy: uploadedBy || (user?.name || 'Admin')
      };
    }

    const newDoc = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: docData.name,
      type: docData.type,
      fileUrl: docData.fileUrl,
      fileName: docData.fileName,
      fileSize: docData.fileSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: docData.uploadedBy
    };

    const updatedDocs = [newDoc, ...existingDocs];
    const docsJson = JSON.stringify(updatedDocs);

    // Also update resume_url / id_proof_url if matching category
    let extraUpdate = '';
    const extraParams = [];
    const lowerType = (docData.type || '').toLowerCase();
    if (lowerType.includes('resume') || lowerType.includes('cv')) {
      extraUpdate += ', resume_url = ?';
      extraParams.push(docData.fileUrl);
    } else if (lowerType.includes('id proof') || lowerType.includes('government id') || lowerType.includes('aadhaar') || lowerType.includes('passport')) {
      extraUpdate += ', id_proof_url = ?';
      extraParams.push(docData.fileUrl);
    }

    await db.execute(
      `UPDATE employees SET documents = ? ${extraUpdate} WHERE id = ?`,
      [docsJson, ...extraParams, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document: newDoc,
      documents: updatedDocs
    });
  } catch (err) {
    console.error('Upload Employee Document API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let docId = searchParams.get('docId');

    if (!docId) {
      try {
        const body = await request.json();
        docId = body.docId;
      } catch (e) {}
    }

    if (!docId) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows] = await db.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const employee = rows[0];
    let existingDocs = [];
    if (employee.documents) {
      try {
        existingDocs = typeof employee.documents === 'string' ? JSON.parse(employee.documents) : employee.documents;
      } catch (e) {
        existingDocs = [];
      }
    }
    if (!Array.isArray(existingDocs)) existingDocs = [];

    const updatedDocs = existingDocs.filter(d => String(d.id) !== String(docId));
    const docsJson = JSON.stringify(updatedDocs);

    await db.execute(
      'UPDATE employees SET documents = ? WHERE id = ?',
      [docsJson, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Document removed successfully',
      documents: updatedDocs
    });
  } catch (err) {
    console.error('Delete Employee Document API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

