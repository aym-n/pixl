package com.pixl.backend.config;

import com.clickhouse.client.api.Client;
import com.clickhouse.client.api.data_formats.ClickHouseBinaryFormatReader;
import com.clickhouse.client.api.query.QueryResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ClickHouseHealthCheck implements CommandLineRunner {

    private final Client clickhouseClient;

    public ClickHouseHealthCheck(@Qualifier("clickhouseClient") Client clickhouseClient) {
        this.clickhouseClient = clickhouseClient;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("🔍 Testing ClickHouse connection...");

            // Simple ping test
            try (QueryResponse response = clickhouseClient.query("SELECT 1").get()) {
                System.out.println("✅ ClickHouse connected successfully!");
            }

            // Test analytics database
            try {
                try (QueryResponse response = clickhouseClient.query("SELECT count() FROM analytics.video_events")
                        .get()) {
                    ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
                    if (reader.hasNext()) {
                        System.out.println("✅ Analytics database is ready with " + reader.next()
                                + " records in video_events table.");
                    } else {
                        System.out.println("⚠️  Analytics database is empty.");
                    }
                }
            } catch (Exception e) {
                System.err.println("⚠️  Analytics database not ready: " + e.getMessage());
                System.out.println("💡 Creating analytics database and tables...");
                createAnalyticsSchema();
            }

        } catch (Exception e) {
            System.err.println("❌ ClickHouse connection failed: " + e.getMessage());
            System.err.println("   - Check if ClickHouse is running: docker ps | grep clickhouse");
            System.err.println("   - Check connection: curl http://localhost:8123/");
            System.err.println("⚠️  Analytics features will be disabled");
            e.printStackTrace();
        }
    }

    private void createAnalyticsSchema() {
        try {
            // Create database
            clickhouseClient.query("CREATE DATABASE IF NOT EXISTS analytics").get();

            // Create video_events table
            String createTableSQL = """
                    CREATE TABLE IF NOT EXISTS analytics.video_events
                    (
                        video_id String,
                        user_id String,
                        event_type Enum('view', 'play', 'pause', 'seek', 'complete', 'quality_change', 'buffer'),
                        timestamp DateTime,
                        video_time Float32,
                        quality String,
                        buffer_duration_ms UInt32,
                        user_agent String,
                        ip_address String,
                        session_id String,
                        event_id UUID DEFAULT generateUUIDv4(),
                        created_date Date DEFAULT toDate(timestamp)
                    )
                    ENGINE = MergeTree()
                    PARTITION BY toYYYYMM(created_date)
                    ORDER BY (video_id, timestamp)
                    SETTINGS index_granularity = 8192
                    """;

            clickhouseClient.query(createTableSQL).get();

            System.out.println("✅ Analytics schema created successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to create analytics schema: " + e.getMessage());
            e.printStackTrace();
        }
    }
}