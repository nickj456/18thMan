-- Add file size limit (10 MB) and allowed MIME types to email-assets bucket
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
where id = 'email-assets';
