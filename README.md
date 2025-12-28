# Pixl: Distributed Video Streaming Architecture

Pixl is a full-stack video streaming platform designed to demonstrate the implementation of microservices, distributed systems, and modern media processing workflows. The project serves as a comprehensive reference for building scalable web applications using Spring Boot, Next.js, and specialized data stores.

---

## System Architecture

The platform utilizes a decoupled architecture to handle resource-intensive tasks. The API layer manages metadata and orchestration, while dedicated workers handle video transcoding via FFmpeg. Data is persisted across specialized engines: PostgreSQL for relational metadata, MinIO for object storage, and ClickHouse for high-throughput analytics.

### Core Components

* **API Gateway (Spring Boot 3.x):** Orchestrates chunked uploads, manages video metadata, and serves analytics data.
* **Transcoding Engine:** A distributed worker pool that consumes jobs from RabbitMQ to convert raw uploads into Adaptive Bitrate (ABR) formats.
* **Storage Layer:** Employs S3-compatible storage (MinIO) for binary data and PostgreSQL for structured state management.
* **Analytics Engine:** A column-oriented database (ClickHouse) designed to process large volumes of playback events with minimal latency.

---

## Technical Specifications

### Backend Ecosystem

* **Spring Boot 3.x:** Core application framework.
* **RabbitMQ:** Message broker for asynchronous task distribution.
* **FFmpeg:** Industrial-grade library for multi-quality HLS transcoding.
* **OpenTelemetry:** Standardized instrumentation for distributed tracing and metrics.

### Frontend & Streaming

* **Next.js 14:** React framework utilizing Server Components and optimized routing.
* **HLS.js:** Client-side library enabling Adaptive Bitrate Streaming.
* **WebSockets:** Real-time bidirectional communication for upload and processing updates.

### Observability Stack

* **Prometheus & Grafana:** Infrastructure monitoring and metric visualization.
* **Jaeger:** Distributed tracing to identify bottlenecks across service boundaries.

---

## Operational Workflow

### 1. Ingestion and Processing

The platform implements a chunked upload strategy to ensure reliability for large files. Once an upload is finalized, the system triggers an asynchronous transcoding pipeline.

1. **Chunked Upload:** Files are partitioned into 5MB segments on the client side to allow for resumption and memory efficiency.
2. **Job Queuing:** A transcoding task is published to RabbitMQ.
3. **Transcoding:** Workers extract thumbnails and generate 360p, 480p, 720p, and 1080p versions in HLS format.
4. **Manifest Creation:** An `.m3u8` master playlist is generated to enable the player to switch qualities based on network conditions.

### 2. Analytics Pipeline

To monitor system performance and user engagement, the platform employs a batch-processing event pipeline.

* **Event Collection:** Play, pause, and quality-switch events are captured via the frontend.
* **Batch Ingest:** The API server buffers events and performs batch writes to ClickHouse to optimize disk I/O and query performance.