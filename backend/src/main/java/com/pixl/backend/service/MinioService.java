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

@Service
public class MinioService {
    private final MinioClient minioClient;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @Value("${minio.bucket.videos-original}")
    private String videosOriginalBucket;
    
    @Value("${minio.bucket.videos-transcoded}")
    private String videosTranscodedBucket;
    
    @Value("${minio.bucket.thumbnails}")
    private String thumbnailsBucket;
    
    @Value("${minio.bucket.chunks}")
    private String chunksBucket;

    public void initializeBuckets(){
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

    public void uploadFile(String bucketName, String objectName, InputStream inputStream, long size, String contentType) throws Exception {
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .stream(inputStream, size, -1)
                .contentType(contentType)
                .build()
        );
    }

    /* Upload ByteArray */
    public void uploadFile(String bucketName, String objectName, byte[] data, String contentType) throws Exception {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(data)) {
            uploadFile(bucketName, objectName, inputStream, data.length, contentType);
        }
    }


    public InputStream downloadFile(String bucketName, String objectName) throws Exception {
        return minioClient.getObject(
            GetObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .build()
        );
    }

    /* Dowload ByteArray */
    public byte[] downloadFileAsBytes(String bucketName, String objectName) throws Exception {
        try (InputStream stream = downloadFile(bucketName, objectName)) {
            return stream.readAllBytes();
        }
    }
    

    public void deleteFile(String bucketName, String objectName) throws Exception {
        minioClient.removeObject(
            RemoveObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .build()
        );
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
                    .build()
            );
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
                    .build()
            );
            return stat.size();
        } catch (Exception e) {
            throw new RuntimeException("[MinIO] Error getting size for object: " + objectName + " in bucket: " + bucketName, e);
        }
    }

    public List<String> listFiles(String bucketName, String prefix) throws Exception {
        List<String> files = new ArrayList<>();
        
        Iterable<Result<Item>> results = minioClient.listObjects(
            ListObjectsArgs.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .build()
        );
        
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
                .build()
        );
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
}
