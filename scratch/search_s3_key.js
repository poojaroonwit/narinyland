import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

async function searchKey() {
  const targetKeyPart = '4242a359-f15b-4987-91ca-1766bf5f04a4';
  console.log('Searching for key containing:', targetKeyPart);
  
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
    });
    
    const response = await s3Client.send(command);
    const matches = response.Contents?.filter(obj => obj.Key.includes(targetKeyPart)) || [];
    
    if (matches.length > 0) {
      console.log('Found matches:');
      matches.forEach(m => console.log(' -', m.Key));
    } else {
      console.log('No matches found.');
      console.log('First 10 keys in bucket:');
      response.Contents?.slice(0, 10).forEach(m => console.log(' -', m.Key));
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

searchKey();
