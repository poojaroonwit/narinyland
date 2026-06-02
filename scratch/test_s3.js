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

async function testConnection() {
  console.log('Testing connection to:', process.env.S3_ENDPOINT);
  console.log('Bucket:', BUCKET);
  
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 5
    });
    
    const response = await s3Client.send(command);
    console.log('Successfully connected!');
    console.log('Files found:', response.Contents?.length || 0);
    if (response.Contents) {
      response.Contents.forEach(obj => console.log(' -', obj.Key));
    }
  } catch (error) {
    console.error('Connection failed!');
    if (error.$metadata) {
      console.error('HTTP Status Code:', error.$metadata.httpStatusCode);
    }
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    // Test if a different bucket name works
    if (BUCKET.includes('lyland')) {
      const alternativeBucket = BUCKET.replace('lyland', 'yland');
      console.log('\nTrying alternative bucket name:', alternativeBucket);
      try {
        const altCommand = new ListObjectsV2Command({
          Bucket: alternativeBucket,
          MaxKeys: 5
        });
        const altResponse = await s3Client.send(altCommand);
        console.log('Alternative bucket successfully connected!');
      } catch (altError) {
        console.log('Alternative bucket also failed.');
      }
    }
  }
}

testConnection();
