package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config holds the server configuration
type Config struct {
	Port       string `yaml:"port"`
	Host       string `yaml:"host"`
	LogLevel   string `yaml:"logLevel"`
	EnableCors bool   `yaml:"enableCors"`
	Ollama     struct {
		Host string `yaml:"host"`
		Port string `yaml:"port"`
	} `yaml:"ollama"`
	Models struct {
		Default      string   `yaml:"default"`
		Alternatives []string `yaml:"alternatives"`
	} `yaml:"models"`
	Operations struct {
		Summarize struct {
			Model       string  `yaml:"model"`
			Temperature float64 `yaml:"temperature"`
			MaxLength   int     `yaml:"maxLength"`
		} `yaml:"summarize"`
		Keywords struct {
			Model       string  `yaml:"model"`
			Temperature float64 `yaml:"temperature"`
			MaxKeywords int     `yaml:"maxKeywords"`
		} `yaml:"keywords"`
		Translate struct {
			Model                 string  `yaml:"model"`
			Temperature           float64 `yaml:"temperature"`
			DefaultTargetLanguage string  `yaml:"defaultTargetLanguage"`
		} `yaml:"translate"`
		Rewrite struct {
			Model       string  `yaml:"model"`
			Temperature float64 `yaml:"temperature"`
		} `yaml:"rewrite"`
		Compose struct {
			Model       string  `yaml:"model"`
			Temperature float64 `yaml:"temperature"`
			MaxLength   int     `yaml:"maxLength"`
		} `yaml:"compose"`
	} `yaml:"operations"`
}

// LoadConfig loads configuration from file
func LoadConfig(configPath string, logger *slog.Logger) (*Config, error) {
	// Default configuration
	config := &Config{
		Port:       "3000",
		Host:       "localhost",
		LogLevel:   "info",
		EnableCors: true,
	}
	config.Ollama.Host = "localhost"
	config.Ollama.Port = "11434"
	config.Models.Default = "gemma3:4b"
	config.Models.Alternatives = []string{"mistrallite:latest", "llama2:7b"}
	config.Operations.Summarize.Model = "gemma3:4b"
	config.Operations.Summarize.Temperature = 0.3
	config.Operations.Summarize.MaxLength = 100
	config.Operations.Keywords.Model = "mistrallite:latest"
	config.Operations.Keywords.Temperature = 0.3
	config.Operations.Keywords.MaxKeywords = 500
	config.Operations.Translate.Model = "gemma3:4b"
	config.Operations.Translate.Temperature = 0.1
	config.Operations.Translate.DefaultTargetLanguage = "en"
	config.Operations.Rewrite.Model = "gemma3:4b"
	config.Operations.Rewrite.Temperature = 0.3
	config.Operations.Compose.Model = "gemma3:4b"
	config.Operations.Compose.Temperature = 0.3
	config.Operations.Compose.MaxLength = 50

	// If config file exists, load it
	if _, err := os.Stat(configPath); err == nil {
		logger.Info("Loading configuration from", "path", configPath)

		data, err := os.ReadFile(configPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}

		if err := yaml.Unmarshal(data, config); err != nil {
			return nil, fmt.Errorf("failed to parse config file: %w", err)
		}

		logger.Info("Configuration loaded successfully")
	} else {
		logger.Info("Config file not found, using defaults", "path", configPath)
		// Create default config file
		if err := SaveConfig(config, configPath); err != nil {
			logger.Warn("Failed to create default config file", "error", err)
		}
	}

	return config, nil
}

// SaveConfig saves configuration to file
func SaveConfig(config *Config, configPath string) error {
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetServerAddress returns the full server address
func (c *Config) GetServerAddress() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

// GetOllamaAddress returns the full Ollama address
func (c *Config) GetOllamaAddress() string {
	return fmt.Sprintf("%s:%s", c.Ollama.Host, c.Ollama.Port)
}

// ParseLogLevel converts string log level to slog.Level
func ParseLogLevel(level string) (slog.Level, error) {
	switch level {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return slog.LevelInfo, fmt.Errorf("unknown log level: %s", level)
	}
}
