# AI Backends Server

This is the Golang backend server for the AI Backends Obsidian plugin. It provides AI functionality using Firebase Genkit flows and embedded Ollama.

## Features

- **AI Operations**: Summarize, keywords extraction, rewrite, compose, translate
- **Genkit Flows**: Built on Firebase Genkit for AI-powered workflows
- **Embedded Ollama**: Direct integration with Ollama using Go package
- **Flow Server**: Genkit's built-in flow server for HTTP endpoints
- **Structured Logging**: Using Go's built-in `slog` package
- **Cross-platform**: Builds for Windows, macOS, and Linux
- **Configuration**: YAML-based configuration system
- **Health Monitoring**: Built-in health checks and monitoring

## Architecture

This server uses Firebase Genkit's flow architecture:

- **Flows**: Each AI operation is implemented as a Genkit flow
- **Flow Server**: Genkit automatically exposes flows as HTTP endpoints
- **Models**: Structured request/response models for type safety
- **Configuration**: Centralized configuration management
- **Logging**: Structured logging with Go's `slog`

## Quick Start

### Prerequisites

- Go 1.23 or higher
- Git

### Build

#### Linux/macOS
```bash
chmod +x build.sh
./build.sh
```

#### Windows
```cmd
build.bat
```

### Run

```bash
# Run with default configuration
./dist/linux-amd64/ai-backends-server

# The server will start on http://localhost:3000
```

## Configuration

The server uses a YAML configuration file. Default configuration is created at `config/config.yaml` on first run.

### Configuration Options

```yaml
# Server settings
port: "3000"
host: "localhost"
logLevel: "info"  # debug, info, warn, error
enableCors: true

# Ollama settings
ollama:
  host: "localhost"
  port: "11434"
  
# Model settings
models:
  default: "gemma3:4b"
  alternatives:
    - "mistrallite:latest"
    - "llama2:7b"
```

### Log Levels

The server supports the following log levels:
- `debug` - Detailed debugging information
- `info` - General information (default)
- `warn` - Warning messages
- `error` - Error messages

## API Endpoints

Genkit automatically exposes flows as HTTP endpoints:

### Health Check
```
POST /health
Content-Type: application/json

{
  "includeDetails": true
}
```

### AI Operations

#### Summarize
```
POST /summarize
Content-Type: application/json

{
  "text": "Text to summarize",
  "config": {
    "model": "gemma3:4b",
    "temperature": 0.3,
    "stream": false
  },
  "maxLength": 100
}
```

#### Keywords
```
POST /keywords
Content-Type: application/json

{
  "text": "Text to analyze",
  "config": {
    "model": "mistrallite:latest",
    "temperature": 0.3,
    "stream": false
  },
  "maxKeywords": 500
}
```

#### Rewrite
```
POST /rewrite
Content-Type: application/json

{
  "text": "Text to rewrite",
  "config": {
    "model": "gemma3:4b",
    "temperature": 0.3,
    "stream": false
  },
  "tone": "professional"
}
```

#### Compose
```
POST /compose
Content-Type: application/json

{
  "text": "Context text",
  "config": {
    "model": "gemma3:4b",
    "temperature": 0.3,
    "stream": false
  },
  "prompt": "Write about...",
  "maxLength": 50
}
```

#### Translate
```
POST /translate
Content-Type: application/json

{
  "text": "Text to translate",
  "config": {
    "model": "gemma3:4b",
    "temperature": 0.1,
    "stream": false
  },
  "targetLanguage": "en"
}
```

## Genkit Flow Server

Genkit automatically provides:

- **Flow Discovery**: `/` endpoint lists all available flows
- **Flow Execution**: Each flow is exposed as a POST endpoint
- **Flow UI**: Built-in UI for testing flows (usually at `/`)
- **Monitoring**: Built-in flow execution monitoring

## Logging

The server uses Go's built-in `slog` package for structured logging:

### Example Log Output
```
time=2025-01-23T06:03:19.123Z level=INFO msg="Starting Genkit flow server" address=localhost:3000 logLevel=info ollamaAddress=localhost:11434
time=2025-01-23T06:03:19.456Z level=INFO msg="Starting flow" flow=summarize request="{text:\"Hello world\" config:{model:gemma3:4b temperature:0.3 stream:false} maxLength:100}"
time=2025-01-23T06:03:19.789Z level=INFO msg="Flow completed successfully" flow=summarize duration=12.345ms
```

### Log Configuration
- Log level is configurable via `config.yaml`
- Structured logging with key-value pairs
- Automatic timestamp and level formatting
- Contextual information in log messages

## Development

### Project Structure

```
backend/
├── main.go              # Main server application with Genkit flows
├── config/
│   └── config.go        # Configuration management
├── models/
│   ├── requests.go      # Request models for flows
│   └── responses.go     # Response models for flows
├── utils/
│   └── genkit_helpers.go # Genkit utility functions
├── config.yaml          # Default configuration
├── go.mod              # Go module file
├── build.sh            # Build script (Linux/macOS)
├── build.bat           # Build script (Windows)
└── README.md           # This file
```

### Running in Development Mode

```bash
# Run with debug logging
go run main.go

# Genkit will automatically start the flow server
# Visit http://localhost:3000 to see the flow UI
```

### Flow Development

Each AI operation is implemented as a Genkit flow:

```go
genkit.DefineFlow(s.genkit, "summarize",
    genkit.FlowInput[models.SummarizeRequest](),
    genkit.FlowOutput[models.SummarizeResponse](),
    func(ctx context.Context, req models.SummarizeRequest) (*models.SummarizeResponse, error) {
        // Flow implementation with structured logging
        s.logger.Info("Processing summarization request", "textLength", len(req.Text))
        return response, nil
    },
)
```

## Testing

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Test individual flows
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "config": {"model": "gemma3:4b"}, "maxLength": 50}'
```

## Benefits of Using slog

- **Standard Library**: No external dependencies for logging
- **Structured Logging**: Built-in support for key-value pairs
- **Performance**: Optimized for high-performance logging
- **Flexibility**: Easy to customize handlers and formatting
- **Context Awareness**: Built-in support for contextual logging
- **Level Control**: Fine-grained log level management

## Next Steps

This implementation provides the foundation for:

1. **Ollama Integration**: Replace placeholder implementations with actual Ollama calls
2. **Model Management**: Add model downloading and management
3. **Streaming**: Implement streaming responses for real-time AI operations
4. **Error Handling**: Add comprehensive error handling and recovery
5. **Performance**: Optimize flow execution and resource management

## License

This project is licensed under the MIT License.
