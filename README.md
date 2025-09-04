# AI Backends Plugin for Obsidian

This plugin integrates with aibackends.com to provide AI-powered text analysis features directly within Obsidian. Transform your notes with intelligent summarization and keyword extraction using various AI providers.

## Features

- **Text Summarization**: Generate concise summaries of selected text using configurable AI models
- **Keyword Extraction**: Extract relevant keywords and topics from your content
- **Writing Actions**: Improve description, improve writing, fix spelling & grammar, brainstorm, make shorter, change tone, and translate
- **Multiple AI Providers**: Support for OpenAI, Anthropic, Ollama, and other providers through aibackends.com
- **Flexible Configuration**: Use YAML configuration files to customize AI settings per operation
- **Context Menu Integration**: Right-click on selected text for quick access to AI features
- **Command Palette**: Access AI functions through Obsidian's command palette

## Setup

### 1. Install the Plugin

1. Download the latest release or clone this repository
2. Place the plugin files in your `.obsidian/plugins/ai-backends-obsidian/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

### 2. Configure API Settings

1. Go to Settings → AI Backends Plugin
2. Set your **API URL** (typically `http://localhost:3000` if running aibackends locally)
3. Set the **Configuration File Path** (e.g., `ai-config/config.yaml`)

### 3. Create Your Configuration File

Upon installation, the plugin automatically creates a directory named `ai-backends` in your vault's root, containing a `config.example.yaml` file.

1.  **Copy the Example File**: Create a copy of `ai-backends/config.example.yaml` and rename it to `config.yaml` (or any other name you prefer) in the same directory.
2.  **Update Settings Path**: In Obsidian, go to `Settings` → `AI Backends` and set the **Configuration File Path** to point to your new file (e.g., `ai-backends/config.yaml`).
3.  **Customize Your Configuration**: Open your new `config.yaml` file and customize the AI provider, model, and other settings for each operation.

Here is the default configuration from `config.example.yaml`:
```yaml
summarize:
  provider: "ollama"
  model: "gemma3:4b"
  temperature: 0.3
  stream: true
  maxLength: 100
keywords:
  provider: "ollama"
  model: "mistrallite:latest"
  temperature: 0.3
  stream: false
  maxKeywords: 500
translate:
  provider: "ollama"
  model: "gemma3:4b"
  temperature: 0.1
  stream: true
  defaultTargetLanguage: "ta"
rewrite:
  provider: "ollama"
  model: "gemma3:4b"
  stream: true
compose:
  provider: "ollama"
  model: "gemma3:4b"
  maxLength: 50
```

The `rewrite` section is used by generic Actions like Improve writing, Fix spelling & grammar, Brainstorm, Make shorter, and tone changes.
