require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'crm-documents';

async function initializeStorage() {
  console.log('Connecting to Supabase Storage...');
  console.log(`Target URL: ${supabaseUrl}`);

  // List existing buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  console.log('Existing buckets:', buckets.map((b) => b.name));

  const bucketExists = buckets.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Creating bucket "${BUCKET_NAME}" (private)...`);
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB per file
      allowedMimeTypes: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (createError) {
      console.error(`Failed to create bucket: ${createError.message}`);
      process.exit(1);
    }
    console.log(`Bucket "${BUCKET_NAME}" created successfully!`);
  } else {
    console.log(`Bucket "${BUCKET_NAME}" already exists and is ready to use.`);
  }

  // Test uploading and deleting a tiny health-check file
  console.log('Testing upload & signed URL generation...');
  const testPath = `_health_check/test-${Date.now()}.txt`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testPath, Buffer.from('CorporateMart CRM storage connection verified!'), {
      contentType: 'text/plain',
      upsert: true,
    });

  if (uploadError) {
    console.error('Test upload failed:', uploadError.message);
    process.exit(1);
  }

  // Test signed URL
  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(testPath, 60);

  if (signError) {
    console.error('Signed URL test failed:', signError.message);
    process.exit(1);
  }

  console.log('Signed URL test generated successfully!');

  // Cleanup test file
  await supabase.storage.from(BUCKET_NAME).remove([testPath]);
  console.log('Cleaned up test file.');
  console.log('ALL STORAGE CHECKS PASSED SUCCESSFULLY! Ready for production.');
}

initializeStorage().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
