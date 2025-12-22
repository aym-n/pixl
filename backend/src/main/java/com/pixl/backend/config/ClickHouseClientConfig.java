package com.pixl.backend.config;

import com.clickhouse.client.api.Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClickHouseClientConfig {
    
    @Value("${clickhouse.host:localhost}")
    private String host;
    
    @Value("${clickhouse.port:8123}")
    private Integer port;
    
    @Value("${clickhouse.database:analytics}")
    private String database;
    
    @Value("${clickhouse.username:admin}")
    private String username;
    
    @Value("${clickhouse.password:admin123}")
    private String password;
    
    @Bean(name = "clickhouseClient")
    public Client clickhouseClient() {
        String endpoint = String.format("http://%s:%d", host, port);
        
        return new Client.Builder()
            .addEndpoint(endpoint)
            .setUsername(username)
            .setPassword(password)
            .setDefaultDatabase(database)
            .compressClientRequest(false)
            .compressServerResponse(true)
            .build();
    }
}