package main

import (
	"context"
	"fmt"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/go-chi/chi/v5"

	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rengas/ai-backends-obsidian/config"
	"github.com/rengas/ai-backends-obsidian/models"
	"github.com/rengas/ai-backends-obsidian/utils"

	ollamaPlugin "github.com/firebase/genkit/go/plugins/ollama"
)

// Server represents the main server structure
type Server struct {
	config       *config.Config
	logger       *slog.Logger
	genkit       *genkit.Genkit
	startTime    time.Time
	genkitHelper *utils.GenkitHelper
	httpServer   *http.Server
	chiRouter    *chi.Mux

	ollama *ollamaPlugin.Ollama
}

// NewServer creates a new server instance
func NewServer(cfg *config.Config, logger *slog.Logger) *Server {
	// Initialize Genkit

	return &Server{
		config:       cfg,
		logger:       logger,
		startTime:    time.Now(),
		genkitHelper: utils.NewGenkitHelper(logger),
	}
}

// Start starts the server
func (s *Server) Start() error {
	ctx := context.Background()
	s.ollama = &ollamaPlugin.Ollama{
		ServerAddress: "http://localhost:11434",
		Timeout:       60,
	}

	s.genkit = genkit.Init(ctx, genkit.WithPlugins(s.ollama))
	s.ollama.DefineModel(s.genkit, ollamaPlugin.ModelDefinition{Name: "gemma3:270m"}, nil)

	// This fully initializes the plugin and stops the "Init not called" panic.
	addr := s.config.GetServerAddress()
	s.logger.Info("Starting Genkit flow server", "address", addr)

	s.setupFlows()
	// Create a new Chi router
	s.chiRouter = chi.NewRouter()
	for _, flow := range genkit.ListFlows(s.genkit) {
		s.chiRouter.Post("/"+flow.Name(), genkit.Handler(flow))
	}

	// Create and start the HTTP server with the Chi router as the handler
	s.httpServer = &http.Server{
		Addr:    addr,
		Handler: s.chiRouter,
	}

	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("Failed to start HTTP server", "error", err)
			os.Exit(1)
		}
	}()

	return nil
}

// Stop gracefully shuts down the server
func (s *Server) Stop(ctx context.Context) error {
	s.logger.Info("Shutting down server...")
	s.logger.Info("Server stopped")
	return nil
}

// setupFlows sets up all the Genkit flows
func (s *Server) setupFlows() {
	// Initialize flows for each AI operation
	s.createSummarizeFlow()
}

// createSummarizeFlow creates a flow for text summarization
func (s *Server) createSummarizeFlow() {

	genkit.DefineFlow(s.genkit, "summarize",
		func(ctx context.Context, req models.SummarizeRequest) (*models.SummarizeResponse, error) {
			m := ollamaPlugin.Model(s.genkit, "gemma3:270m")
			if m == nil {
				return nil, fmt.Errorf("failed to lodal model")
			}

			lengthInstruction := ""
			if req.MaxLength > 0 {
				lengthInstruction = fmt.Sprintf(" Summarize in %d words or less.", req.MaxLength)
			}

			promptTemplate := fmt.Sprintf("Summarize the following text%s\nJust return the summary, no other text or explanation.\n\nIf the text is a conversation, do not attempt to answer the questions or be involved in the conversation.\nJust return the summary of the conversation.\n\n<text>\n%s\n</text>:", lengthInstruction, req.Text)

			resp, err := genkit.Generate(ctx, s.genkit,
				ai.WithModel(m),
				ai.WithPrompt(promptTemplate),
				ai.WithConfig(&ai.GenerationCommonConfig{
					Temperature: s.config.Operations.Summarize.Temperature, // Set your desired temperature here
				}),
			)

			if err != nil {
				return nil, fmt.Errorf("failed to generate joke: %w", err)
			}

			return &models.SummarizeResponse{
				Summary: resp.Text(),
			}, nil
		},
	)
}

func main() {
	// Initialize logger with default settings
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	// Load configuration
	cfg, err := config.LoadConfig("config.yaml", logger)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Set log level from config
	level, err := config.ParseLogLevel(cfg.LogLevel)
	if err != nil {
		level = slog.LevelInfo
		logger.Warn("Invalid log level, using default", "level", cfg.LogLevel, "default", "info")
	}

	// Update logger with configured level
	logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))

	// Create server instance
	server := NewServer(cfg, logger)

	// Setup graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server
	if err := server.Start(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	// Wait for interrupt signal
	<-quit
	logger.Info("Received interrupt signal, shutting down...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Stop(ctx); err != nil {
		logger.Error("Server shutdown error", "error", err)
	}

	logger.Info("Server exited")
}
