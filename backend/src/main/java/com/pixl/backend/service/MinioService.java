package com.pixl.backend.service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.ListObjectsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.messages.Item;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

@Service
public class MinioService {
    private final MinioClient minioClient;

    private final Tracer tracer;
    private final Counter minioUploadCounter;
    private final Counter minioDownloadCounter;
    private final Counter minioDeleteCounter;

    public MinioService(MinioClient minioClient, Tracer tracer, MeterRegistry meterRegistry) {
        this.minioClient = minioClient;
        this.tracer = tracer;
        this.minioUploadCounter = meterRegistry.counter("minio.upload.total");
        this.minioDownloadCounter = meterRegistry.counter("minio.download.total");
        this.minioDeleteCounter = meterRegistry.counter("minio.delete.total");
    }

    @Value("${minio.bucket.videos-original}")
    private String videosOriginalBucket;

    @Value("${minio.bucket.videos-transcoded}")
    private String videosTranscodedBucket;

    @Value("${minio.bucket.thumbnails}")
    private String thumbnailsBucket;

    @Value("${minio.bucket.chunks}")
    private String chunksBucket;

    public void initializeBuckets() {
        try {
            createBucketIfNotExists(videosOriginalBucket);
            createBucketIfNotExists(videosTranscodedBucket);
            createBucketIfNotExists(thumbnailsBucket);
            createBucketIfNotExists(chunksBucket);
        } catch (Exception e) {
            throw new RuntimeException("[MinIO] Error initializing MinIO buckets", e);
        }
    }

    private void createBucketIfNotExists(String bucketName) throws Exception {
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            System.out.println("[MinIO] Bucket created: " + bucketName);
        }
    }

    public void uploadFile(String bucketName, String objectName, InputStream inputStream,
            long size, String contentType) throws Exception {
        Span span = tracer.spanBuilder("minio-upload").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("bucket", bucketName);
            span.setAttribute("object", objectName);
            span.setAttribute("size", size);
            span.setAttribute("content.type", contentType);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build());

            minioUploadCounter.increment();
            span.addEvent("File uploaded to MinIO");

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    /* Upload ByteArray */
    public void uploadFile(String bucketName, String objectName, byte[] data, String contentType) throws Exception {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(data)) {
            uploadFile(bucketName, objectName, inputStream, data.length, contentType);
        }
    }

    public InputStream downloadFile(String bucketName, String objectName) throws Exception {
        Span span = tracer.spanBuilder("minio-download").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("bucket", bucketName);
            span.setAttribute("object", objectName);

            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());

            minioDownloadCounter.increment();
            span.addEvent("File downloaded from MinIO");

            return stream;
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    /* Dowload ByteArray */
    public byte[] downloadFileAsBytes(String bucketName, String objectName) throws Exception {
        try (InputStream stream = downloadFile(bucketName, objectName)) {
            return stream.readAllBytes();
        }
    }

    public void deleteFile(String bucketName, String objectName) throws Exception {
        Span span = tracer.spanBuilder("minio-delete").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("bucket", bucketName);
            span.setAttribute("object", objectName);

            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());

            minioDeleteCounter.increment();
            span.addEvent("File deleted from MinIO");

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    public void deleteFiles(String bucketName, List<String> objectNames) {
        for (String objectName : objectNames) {
            try {
                deleteFile(bucketName, objectName);
            } catch (Exception e) {
                System.err.println("[MinIO] Error deleting object: " + objectName + " from bucket: " + bucketName);
            }
        }
    }

    public boolean fileExists(String bucketName, String objectName) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public long getFileSize(String bucketName, String objectName) {
        try {
            StatObjectResponse stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            return stat.size();
        } catch (Exception e) {
            throw new RuntimeException(
                    "[MinIO] Error getting size for object: " + objectName + " in bucket: " + bucketName, e);
        }
    }

    public List<String> listFiles(String bucketName, String prefix) throws Exception {
        List<String> files = new ArrayList<>();

        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .prefix(prefix)
                        .build());

        for (Result<Item> result : results) {
            Item item = result.get();
            files.add(item.objectName());
        }

        return files;
    }

    public String getPresignedUrl(String bucketName, String objectName) throws Exception {
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .method(io.minio.http.Method.GET)
                        .expiry(7 * 24 * 60 * 60) // 7 days in seconds
                        .build());
    }

    public void uploadOriginalVideo(String objectName, InputStream inputStream, long size) throws Exception {
        uploadFile(videosOriginalBucket, objectName, inputStream, size, "video/mp4");
    }

    public void uploadChunk(String objectName, byte[] data) throws Exception {
        uploadFile(chunksBucket, objectName, data, "application/octet-stream");
    }

    public byte[] downloadChunk(String objectName) throws Exception {
        return downloadFileAsBytes(chunksBucket, objectName);
    }

    public void deleteChunk(String objectName) throws Exception {
        deleteFile(chunksBucket, objectName);
    }

    public List<String> listChunks(String uploadId) throws Exception {
        return listFiles(chunksBucket, uploadId + "_chunk_");
    }

    public void deleteOriginal(String videoId) {
        try {
            deleteById(videoId, videosOriginalBucket);
            System.out.println("✅ Deleted original video files for videoId=" + videoId);
        } catch (Exception e) {
            System.err.println(
                    "⚠️ Original video files not fully deleted for videoId="
                            + videoId + " | " + e.getMessage());
        }
    }

    public void deleteTranscoded(String videoId) {
        try {
            deleteById(videoId, videosTranscodedBucket);
            System.out.println("✅ Deleted transcoded video files for videoId=" + videoId);
        } catch (Exception e) {
            System.err.println(
                    "⚠️ Transcoded video files not fully deleted for videoId="
                            + videoId + " | " + e.getMessage());
        }
    }

    public void deleteThumbnails(String videoId) {
        try {
            deleteById(videoId, thumbnailsBucket);
            System.out.println("✅ Deleted thumbnail files for videoId=" + videoId);
        } catch (Exception e) {
            System.err.println(
                    "⚠️ Thumbnail files not fully deleted for videoId="
                            + videoId + " | " + e.getMessage());
        }
    }

    public void deleteById(String videoId, String bucketName) throws Exception {
        Iterable<Result<Item>> results;

        try {
            results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(videoId)
                            .recursive(true)
                            .build());
        } catch (Exception e) {
            throw new Exception(
                    "Bucket not accessible: " + bucketName + " | " + e.getMessage(),
                    e);
        }

        boolean foundAny = false;

        for (Result<Item> result : results) {
            Item item;
            try {
                item = result.get();
                foundAny = true;
            } catch (Exception e) {
                System.err.println(
                        "⚠️ Failed to read object metadata in bucket="
                                + bucketName + " | " + e.getMessage());
                continue;
            }

            try {
                deleteFile(bucketName, item.objectName());
                System.out.println(
                        "✅ Deleted file: " + bucketName + "/" + item.objectName());
            } catch (Exception e) {
                System.err.println(
                        "⚠️ Failed to delete file: "
                                + bucketName + "/" + item.objectName()
                                + " | " + e.getMessage());
            }
        }

        if (!foundAny) {
            System.out.println(
                    "ℹ️ No files found for videoId=" + videoId + " in bucket=" + bucketName);
        }
    }

    public void deleteVideoFiles(String videoId) {
        deleteTranscoded(videoId);
        deleteThumbnails(videoId);
        deleteOriginal(videoId);
    }

}
