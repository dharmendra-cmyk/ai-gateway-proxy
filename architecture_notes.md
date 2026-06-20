
# Core Infrastructure & Database Reference Architecture

## 1. Local Workflow Orchestration Engine
* **Platform:** n8n (Community Edition)
* **Hosting Environment:** Docker Desktop (Localhost Container Engine)
* **Local Web Address:** http://localhost:5678
* **Process Start Command:** `n8n start`
* **Primary Trigger Layer:** Webhook / On Form Submission Nodes

## 2. Target Data Layer & Multi-Model Architecture (Google Cloud Platform)
To reduce pipeline fragmentation, our target data layer utilizes unified multi-model capabilities.

### Key Pillars of Unified Search (Spanner Graph)
* **Vector Search (Intent):** Semantic retrieval based on conceptual similarity and embeddings.
* **SQL Queries (The Filter):** Structured filters and joins for exact attributes and metadata constraints.
* **Graph Search (Context):** Relational discovery mapping entities and complex network paths (GraphRAG).
* **Interoperability:** Seamless translation between relational and graph models to eliminate traditional data silos.

### Spanner Native AI Functions
We leverage in-database machine learning inference to process classifications natively during the query lifecycle:
* `AI.CLASSIFY`: Categorizes input text based on target labels (ideal for instant routing).
* `AI.IF`: Evaluates natural language conditions to return boolean results for immediate filtering.
* `AI.SCORE`: Assigns numeric ratings based on custom text evaluation criteria.
* `ML.PREDICT`: Natively runs inference against Vertex AI hosted models directly inside SQL strings.

## 3. Speed & Session Tier (Memorystore)
* **Performance:** Provides microsecond latency caching.
* **Compatibility:** Fully compatible with Valkey, Redis, and Memcached.
* **Use Cases:** Manages real-time AI session state, user chat history buffers, and temporary job queues.

## 4. System Integration Layer
* **Ecosystem Middleware:** Open-source integration utilizing Model Context Protocol (MCP) and LangChain for secure LLM tool calling.
