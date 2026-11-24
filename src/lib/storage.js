require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = 'crm-documents';

/**
 * Upload a document file to the Supabase Storage bucket
 * @param {Object} params
 * @param {string} params.dealCode - Deal identifier (e.g., CM-2026-0001)
 * @param {Buffer} params.fileBuffer - Binary buffer of the file
 * @param {string} params.fileName - Original file name
 * @param {string} params.mimeType - MIME type (e.g. application/pdf, image/png)
 * @param {string} [params.subfolder='kyc'] - Subfolder: 'payments', 'kyc', 'invoices', 'deliverables', 'proofs'
 * @returns {Promise<{ path: string, fullPath: string }>}
 */
async function uploadFile({ dealCode, fileBuffer, fileName, mimeType, subfolder = 'kyc' }) {
  // Sanitize file name and prepend timestamp to prevent collisions
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `deals/${dealCode}/${subfolder}/${Date.now()}_${cleanName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload to storage failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: `${BUCKET_NAME}/${data.path}`,
  };
}

/**
 * Generate a temporary signed URL for viewing/downloading sensitive files
 * @param {string} filePath - Path returned during upload (e.g. 'deals/CM-001/kyc/...')
 * @param {number} [expiresIn=3600] - Expiration in seconds (default 1 hour)
 * @returns {Promise<string>} - Signed temporary URL
 */
async function getSignedUrl(filePath, expiresIn = 3600) {
  // If the path contains the bucket name prefix, strip it
  const cleanPath = filePath.startsWith(`${BUCKET_NAME}/`)
    ? filePath.replace(`${BUCKET_NAME}/`, '')
    : filePath;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(cleanPath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function deleteFile(filePath) {
  const cleanPath = filePath.startsWith(`${BUCKET_NAME}/`)
    ? filePath.replace(`${BUCKET_NAME}/`, '')
    : filePath;

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([cleanPath]);
  if (error) {
    throw new Error(`Failed to delete file from storage: ${error.message}`);
  }
  return true;
}

/**
 * Download a file buffer from storage
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
async function downloadFile(filePath) {
  const cleanPath = filePath.startsWith(`${BUCKET_NAME}/`)
    ? filePath.replace(`${BUCKET_NAME}/`, '')
    : filePath;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(cleanPath);
  if (error) {
    throw new Error(`Failed to download file from storage: ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = {
  supabase,
  BUCKET_NAME,
  uploadFile,
  getSignedUrl,
  downloadFile,
  deleteFile,
};
