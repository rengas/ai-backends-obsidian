package utils

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/rengas/ai-backends-obsidian/models"
)

// GenkitHelper provides utility functions for Genkit operations
type GenkitHelper struct {
	logger *slog.Logger
}

// NewGenkitHelper creates a new Genkit helper instance
func NewGenkitHelper(logger *slog.Logger) *GenkitHelper {
	return &GenkitHelper{
		logger: logger,
	}
}

// CreateBaseResponse creates a standardized base response for Genkit flows
func (gh *GenkitHelper) CreateBaseResponse(model, provider string, startTime time.Time) models.BaseResponse {
	return models.BaseResponse{
		Success:   true,
		Timestamp: time.Now().UTC(),
		Model:     model,
		Provider:  provider,
		Duration:  time.Since(startTime).Milliseconds(),
	}
}

// CreateErrorResponse creates a standardized error response for Genkit flows
func (gh *GenkitHelper) CreateErrorResponse(model, provider, error, details string) models.ErrorResponse {
	return models.ErrorResponse{
		BaseResponse: models.BaseResponse{
			Success:   false,
			Timestamp: time.Now().UTC(),
			Model:     model,
			Provider:  provider,
		},
		Error:   error,
		Details: details,
		Code:    "FLOW_ERROR",
	}
}

// LogFlowStart logs the start of a Genkit flow
func (gh *GenkitHelper) LogFlowStart(flowName string, req interface{}) {
	gh.logger.Info("Starting flow", "flow", flowName, "request", req)
}

// LogFlowEnd logs the end of a Genkit flow
func (gh *GenkitHelper) LogFlowEnd(flowName string, duration time.Duration, err error) {
	if err != nil {
		gh.logger.Error("Flow failed", "flow", flowName, "duration", duration, "error", err)
	} else {
		gh.logger.Info("Flow completed successfully", "flow", flowName, "duration", duration)
	}
}

// ValidateRequest validates a base request
func (gh *GenkitHelper) ValidateRequest(req models.BaseRequest) error {
	if req.Text == "" {
		gh.logger.Error("text is required")
		return fmt.Errorf("text is required")
	}
	if req.Config.Model == "" {
		gh.logger.Error("model is required")
		return fmt.Errorf("model is required")
	}
	return nil
}

// GetModelFromRequest extracts model information from request with fallbacks
func (gh *GenkitHelper) GetModelFromRequest(req models.BaseRequest, defaultModel string) string {
	if req.Config.Model != "" {
		return req.Config.Model
	}
	return defaultModel
}

// GetProviderFromRequest extracts provider information from request with fallbacks
func (gh *GenkitHelper) GetProviderFromRequest(req models.BaseRequest, defaultProvider string) string {
	if req.Config.Provider != "" {
		return req.Config.Provider
	}
	return defaultProvider
}

// ContextWithTimeout creates a context with timeout for Genkit flows
func (gh *GenkitHelper) ContextWithTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, timeout)
}

// StandardFlowWrapper provides a wrapper for standard Genkit flow patterns
func (gh *GenkitHelper) StandardFlowWrapper(
	flowName string,
	req interface{},
	defaultModel, defaultProvider string,
	flowFunc func(ctx context.Context, req interface{}) (interface{}, error),
) (interface{}, error) {
	startTime := time.Now()
	gh.LogFlowStart(flowName, req)

	// Validate base request if applicable
	if baseReq, ok := req.(models.BaseRequest); ok {
		if err := gh.ValidateRequest(baseReq); err != nil {
			gh.LogFlowEnd(flowName, time.Since(startTime), err)
			return nil, err
		}
	}

	// Create context with timeout
	ctx, cancel := gh.ContextWithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Execute the flow function
	result, err := flowFunc(ctx, req)
	gh.LogFlowEnd(flowName, time.Since(startTime), err)

	return result, err
}
