import { 
  S3Client, 
  PutObjectCommand, 
  CopyObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "bexo";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  customKey?: string
): Promise<string> {
  const key = customKey || `attachments/${Date.now()}-${fileName}`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  
  return key;
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (e: any) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

export async function renameObject(oldKey: string, newKey: string): Promise<void> {
  // S3 doesn't have a rename, so we Copy then Delete
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      CopySource: `${R2_BUCKET_NAME}/${oldKey}`,
      Key: newKey,
    })
  );
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: oldKey,
    })
  );
}
