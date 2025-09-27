package models

import "time"

// BaseResponse contains common fields for all AI responses
type BaseResponse struct {
	Success   bool      `json:"success"`
	Timestamp time.Time `json:"timestamp"`
	Model     string    `json:"model"`
	Provider  string    `json:"provider"`
	Duration  int64     `json:"duration,omitempty"` // in milliseconds
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	BaseResponse
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
	Code    string `json:"code,omitempty"`
}

// SuccessResponse represents a successful response
type SuccessResponse struct {
	BaseResponse
	Data interface{} `json:"data"`
}

// SummarizeResponse represents a summarization response
type SummarizeResponse struct {
	SuccessResponse
	Summary string `json:"summary"`
}

// KeywordsResponse represents a keyword extraction response
type KeywordsResponse struct {
	SuccessResponse
	Keywords []Keyword `json:"keywords"`
}

// Keyword represents a single keyword with relevance score
type Keyword struct {
	Word      string  `json:"word"`
	Relevance float64 `json:"relevance"`
	Category  string  `json:"category,omitempty"`
	Position  int     `json:"position,omitempty"`
}

// TranslateResponse represents a translation response
type TranslateResponse struct {
	SuccessResponse
	Translation    string  `json:"translation"`
	SourceLanguage string  `json:"sourceLanguage"`
	TargetLanguage string  `json:"targetLanguage"`
	Confidence     float64 `json:"confidence,omitempty"`
}

// RewriteResponse represents a text rewriting response
type RewriteResponse struct {
	SuccessResponse
	RewrittenText string `json:"rewrittenText"`
	Changes       string `json:"changes,omitempty"`
	Explanation   string `json:"explanation,omitempty"`
}

// ComposeResponse represents a text composition response
type ComposeResponse struct {
	SuccessResponse
	ComposedText string `json:"composedText"`
	WordsCount   int    `json:"wordsCount"`
	Characters   int    `json:"characters"`
}

// StreamResponse represents a streaming response chunk
type StreamResponse struct {
	Type        string      `json:"type"` // "chunk", "error", "complete"
	Data        interface{} `json:"data,omitempty"`
	Error       string      `json:"error,omitempty"`
	ChunkID     int         `json:"chunkId,omitempty"`
	TotalChunks int         `json:"totalChunks,omitempty"`
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
	Uptime    int64     `json:"uptime"` // in seconds
	Ollama    struct {
		Status  string `json:"status"`
		Version string `json:"version,omitempty"`
		Models  int    `json:"models,omitempty"`
		Message string `json:"message,omitempty"`
	} `json:"ollama"`
}
