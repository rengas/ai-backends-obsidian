package models

// BaseRequest contains common fields for all AI requests
type BaseRequest struct {
	Text   string `json:"text"`
	Config struct {
		Provider    string  `json:"provider"`
		Model       string  `json:"model"`
		Temperature float64 `json:"temperature"`
		Stream      bool    `json:"stream"`
	} `json:"config,omitempty"`
}

// SummarizeRequest represents a summarization request
type SummarizeRequest struct {
	BaseRequest
	MaxLength int `json:"maxLength"`
}

// KeywordsRequest represents a keyword extraction request
type KeywordsRequest struct {
	BaseRequest
	MaxKeywords int `json:"maxKeywords"`
}

// TranslateRequest represents a translation request
type TranslateRequest struct {
	BaseRequest
	TargetLanguage string `json:"targetLanguage"`
	SourceLanguage string `json:"sourceLanguage,omitempty"`
}

// RewriteRequest represents a text rewriting request
type RewriteRequest struct {
	BaseRequest
	Tone    string `json:"tone,omitempty"`
	Style   string `json:"style,omitempty"`
	Purpose string `json:"purpose,omitempty"`
}

// ComposeRequest represents a text composition request
type ComposeRequest struct {
	BaseRequest
	Prompt    string `json:"prompt,omitempty"`
	MaxLength int    `json:"maxLength"`
	Style     string `json:"style,omitempty"`
	Tone      string `json:"tone,omitempty"`
}

// HealthRequest represents a health check request
type HealthRequest struct {
	IncludeDetails bool `json:"includeDetails,omitempty"`
}
