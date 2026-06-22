/**
 * Cloudflare R2 storage client (S3-compatible).
 *
 * Foundation only. Provides upload + signed-URL helpers for generated assets
 * and PDFs. Not used by the PDF gate (which writes to local /output) — wired
 * into the pipeline in later phases.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3: S3Client | null = null;

function getClient(): S3Client {
  if (!s3) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
    }
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3;
}

function bucket(): string {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error("Missing R2_BUCKET");
  return b;
}

export async function uploadObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getDownloadUrl(key: string, expiresInSec = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: expiresInSec }
  );
}
