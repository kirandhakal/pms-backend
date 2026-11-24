import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { ApiError } from "../middlewares/errorHandler";

// No credentials or signed object URLs are exposed to browser clients.
export class ChatStorageService {
    private client?: S3Client;
    private getClient(): S3Client {
        const { OCI_ACCESS_KEY, OCI_SECRET_KEY, OCI_NAMESPACE, OCI_REGION, OCI_BUCKET } = process.env;
        if (!OCI_ACCESS_KEY || !OCI_SECRET_KEY || !OCI_NAMESPACE || !OCI_REGION || !OCI_BUCKET) {
            throw new ApiError("Chat storage is not configured", 503);
        }
        if (!this.client) {
            this.client = new S3Client({
                region: OCI_REGION,
                endpoint: `https://${OCI_NAMESPACE}.compat.objectstorage.${OCI_REGION}.oraclecloud.com`,
                forcePathStyle: true,
                credentials: { accessKeyId: OCI_ACCESS_KEY, secretAccessKey: OCI_SECRET_KEY },
                requestChecksumCalculation: "WHEN_REQUIRED",
                responseChecksumValidation: "WHEN_REQUIRED",
                requestHandler: new NodeHttpHandler({ connectionTimeout: 5000, requestTimeout: 60000 }),
                maxAttempts: 2,
            });
        }
        return this.client;
    }
    async put(key: string, body: Buffer, mimeType: string, signal?: AbortSignal): Promise<void> {
        try {
            await this.getClient().send(new PutObjectCommand({
                Bucket: process.env.OCI_BUCKET, Key: key, Body: body,
                ContentType: mimeType, ContentLength: body.length,
            }), { abortSignal: signal });
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError("Unable to upload attachment to storage", 502);
        }
    }
    async get(key: string) {
        try {
            return await this.getClient().send(new GetObjectCommand({ Bucket: process.env.OCI_BUCKET, Key: key }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError("Unable to read attachment from storage", 502);
        }
    }
    async remove(key: string): Promise<void> {
        try {
            await this.getClient().send(new DeleteObjectCommand({ Bucket: process.env.OCI_BUCKET, Key: key }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError("Unable to remove attachment from storage", 502);
        }
    }
}
export const chatStorageService = new ChatStorageService();
