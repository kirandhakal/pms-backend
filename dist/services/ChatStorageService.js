"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatStorageService = exports.ChatStorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const node_http_handler_1 = require("@smithy/node-http-handler");
const errorHandler_1 = require("../middlewares/errorHandler");
// No credentials or signed object URLs are exposed to browser clients.
class ChatStorageService {
    getClient() {
        const { OCI_ACCESS_KEY, OCI_SECRET_KEY, OCI_NAMESPACE, OCI_REGION, OCI_BUCKET } = process.env;
        if (!OCI_ACCESS_KEY || !OCI_SECRET_KEY || !OCI_NAMESPACE || !OCI_REGION || !OCI_BUCKET) {
            throw new errorHandler_1.ApiError("Chat storage is not configured", 503);
        }
        if (!this.client) {
            this.client = new client_s3_1.S3Client({
                region: OCI_REGION,
                endpoint: `https://${OCI_NAMESPACE}.compat.objectstorage.${OCI_REGION}.oraclecloud.com`,
                forcePathStyle: true,
                credentials: { accessKeyId: OCI_ACCESS_KEY, secretAccessKey: OCI_SECRET_KEY },
                requestChecksumCalculation: "WHEN_REQUIRED",
                responseChecksumValidation: "WHEN_REQUIRED",
                requestHandler: new node_http_handler_1.NodeHttpHandler({ connectionTimeout: 5000, requestTimeout: 60000 }),
                maxAttempts: 2,
            });
        }
        return this.client;
    }
    async put(key, body, mimeType, signal) {
        try {
            await this.getClient().send(new client_s3_1.PutObjectCommand({
                Bucket: process.env.OCI_BUCKET, Key: key, Body: body,
                ContentType: mimeType, ContentLength: body.length,
            }), { abortSignal: signal });
        }
        catch (error) {
            if (error instanceof errorHandler_1.ApiError)
                throw error;
            throw new errorHandler_1.ApiError("Unable to upload attachment to storage", 502);
        }
    }
    async get(key) {
        try {
            return await this.getClient().send(new client_s3_1.GetObjectCommand({ Bucket: process.env.OCI_BUCKET, Key: key }));
        }
        catch (error) {
            if (error instanceof errorHandler_1.ApiError)
                throw error;
            throw new errorHandler_1.ApiError("Unable to read attachment from storage", 502);
        }
    }
    async remove(key) {
        try {
            await this.getClient().send(new client_s3_1.DeleteObjectCommand({ Bucket: process.env.OCI_BUCKET, Key: key }));
        }
        catch (error) {
            if (error instanceof errorHandler_1.ApiError)
                throw error;
            throw new errorHandler_1.ApiError("Unable to remove attachment from storage", 502);
        }
    }
}
exports.ChatStorageService = ChatStorageService;
exports.chatStorageService = new ChatStorageService();
