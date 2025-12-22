package com.pixl.backend.service;

import com.clickhouse.client.api.Client;
import com.clickhouse.client.api.data_formats.ClickHouseBinaryFormatReader;
import com.clickhouse.client.api.query.QueryResponse;
import com.clickhouse.client.api.query.QuerySettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class AnalyticsQueryService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsQueryService.class);
    private final Client clickhouseClient;
    private static final long TIMEOUT_SEC = 3;

    public AnalyticsQueryService(@Qualifier("clickhouseClient") Client clickhouseClient) {
        this.clickhouseClient = clickhouseClient;
    }

    /**
     * Get total views across all videos
     */
    public long getTotalViews() {
        String sql = "SELECT count() as total FROM analytics.video_events WHERE event_type = 'view'";
        return executeSingleLongQuery(sql, Collections.emptyMap());
    }

    /**
     * Get views over time (last 7 days)
     */
    public List<Map<String, Object>> getViewsOverTime(String videoId) {
        String sql = """
            SELECT toDate(timestamp) as date, count() as views
            FROM analytics.video_events
            WHERE video_id = {vid:String} AND event_type = 'view'
                AND timestamp >= now() - INTERVAL 7 DAY
            GROUP BY date ORDER BY date
            """;

        Map<String, Object> params = Map.of("vid", videoId);
        List<Map<String, Object>> timeline = new ArrayList<>();

        try (QueryResponse response = clickhouseClient.query(sql, params, new QuerySettings())
                .get(TIMEOUT_SEC, TimeUnit.SECONDS)) {
            
            ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
            while (reader.hasNext()) {
                reader.next();
                Map<String, Object> item = new HashMap<>();
                // toDate in ClickHouse can be read as a String or LocalDate
                item.put("date", reader.getString("date"));
                item.put("views", reader.getLong("views"));
                timeline.add(item);
            }
        } catch (Exception e) {
            log.error("Failed to get views over time for video: {}", videoId, e);
        }
        return timeline;
    }

    /**
     * Get views for a specific video using parameterized query
     */
    public long getVideoViews(String videoId) {
        String sql = "SELECT count() as views FROM analytics.video_events WHERE video_id = {vid:String} AND event_type = 'view'";
        Map<String, Object> params = Map.of("vid", videoId);
        return executeSingleLongQuery(sql, params);
    }

    /**
     * Get average watch time for a video
     */
    public Map<String, Object> getVideoWatchStats(String videoId) {
        String sql = """
            SELECT
                count() as total_plays,
                avg(video_time) as avg_watch_time,
                countIf(event_type = 'complete') as completions,
                countIf(event_type = 'complete') * 100.0 / count() as completion_rate
            FROM analytics.video_events
            WHERE video_id = {vid:String} AND event_type IN ('play', 'complete')
            GROUP BY video_id
            """;

        Map<String, Object> params = Map.of("vid", videoId);

        try (QueryResponse response = clickhouseClient.query(sql, params, new QuerySettings())
                .get(TIMEOUT_SEC, TimeUnit.SECONDS)) {
            
            ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
            if (reader.hasNext()) {
                reader.next();
                Map<String, Object> stats = new HashMap<>();
                stats.put("totalPlays", reader.getLong("total_plays"));
                stats.put("avgWatchTime", reader.getDouble("avg_watch_time"));
                stats.put("completions", reader.getLong("completions"));
                stats.put("completionRate", reader.getDouble("completion_rate"));
                return stats;
            }
        } catch (Exception e) {
            log.error("Failed to get watch stats for video: {}", videoId, e);
        }
        return Map.of("totalPlays", 0L, "avgWatchTime", 0.0, "completions", 0L, "completionRate", 0.0);
    }

    /**
     * Get quality distribution using reader and params
     */
    public List<Map<String, Object>> getQualityDistribution(String videoId) {
        String sql = """
            SELECT quality, count() as count
            FROM analytics.video_events
            WHERE video_id = {vid:String} AND quality != '' AND event_type = 'play'
            GROUP BY quality ORDER BY count DESC
            """;

        Map<String, Object> params = Map.of("vid", videoId);
        List<Map<String, Object>> distribution = new ArrayList<>();

        try (QueryResponse response = clickhouseClient.query(sql, params, new QuerySettings())
                .get(TIMEOUT_SEC, TimeUnit.SECONDS)) {
            
            ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
            while (reader.hasNext()) {
                reader.next();
                Map<String, Object> item = new HashMap<>();
                item.put("quality", reader.getString("quality"));
                item.put("count", reader.getLong("count"));
                distribution.add(item);
            }
        } catch (Exception e) {
            log.error("Failed to get quality distribution for video: {}", videoId, e);
        }
        return distribution;
    }

    /**
     * Get top videos by views
     */
    public List<Map<String, Object>> getTopVideos(int limit) {
        String sql = """
            SELECT video_id, count() as views, uniq(session_id) as unique_viewers
            FROM analytics.video_events
            WHERE event_type = 'view'
            GROUP BY video_id ORDER BY views DESC LIMIT {lim:Int32}
            """;

        Map<String, Object> params = Map.of("lim", limit);
        List<Map<String, Object>> topVideos = new ArrayList<>();

        try (QueryResponse response = clickhouseClient.query(sql, params, new QuerySettings())
                .get(TIMEOUT_SEC, TimeUnit.SECONDS)) {
            
            ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
            while (reader.hasNext()) {
                reader.next();
                Map<String, Object> item = new HashMap<>();
                item.put("videoId", reader.getString("video_id"));
                item.put("views", reader.getLong("views"));
                item.put("uniqueViewers", reader.getLong("unique_viewers"));
                topVideos.add(item);
            }
        } catch (Exception e) {
            log.error("Failed to get top videos", e);
        }
        return topVideos;
    }

    /**
     * Get real-time statistics (helper method used for multiple queries)
     */
    public Map<String, Object> getRealtimeStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("viewsLastHour", executeSingleLongQuery(
            "SELECT count() as val FROM analytics.video_events WHERE event_type = 'view' AND timestamp >= now() - INTERVAL 1 HOUR", 
            Collections.emptyMap()));
            
        stats.put("activeSessions", executeSingleLongQuery(
            "SELECT uniq(session_id) as val FROM analytics.video_events WHERE timestamp >= now() - INTERVAL 5 MINUTE", 
            Collections.emptyMap()));
            
        stats.put("eventsToday", executeSingleLongQuery(
            "SELECT count() as val FROM analytics.video_events WHERE toDate(timestamp) = today()", 
            Collections.emptyMap()));
            
        return stats;
    }

    /**
     * Shared helper to execute queries returning a single long value
     */
    private long executeSingleLongQuery(String sql, Map<String, Object> params) {
        try (QueryResponse response = clickhouseClient.query(sql, params, new QuerySettings())
                .get(TIMEOUT_SEC, TimeUnit.SECONDS)) {
            
            ClickHouseBinaryFormatReader reader = clickhouseClient.newBinaryFormatReader(response);
            if (reader.hasNext()) {
                reader.next();
                // Assumes the first column is the long value we need
                return reader.getLong(1); 
            }
        } catch (Exception e) {
            log.error("Query failed: {}", sql, e);
        }
        return 0L;
    }
}