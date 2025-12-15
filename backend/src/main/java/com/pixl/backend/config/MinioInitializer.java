package com.pixl.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.pixl.backend.service.MinioService;

@Component
public class MinioInitializer implements CommandLineRunner{
    private final MinioService minioService;

    public MinioInitializer(MinioService minioService) {
        this.minioService = minioService;
    }

    @Override
    public void run(String... args) throws Exception {
        minioService.initializeBuckets();
    }

}
