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

### 3. Create Configuration File
Create a YAML configuration file at the path specified in settings:
```
summarize:
  provider: "ollama"
  model: "gemma3:4b"
  temperature: 0.3
  stream: true
  maxLength: 500
keywords:
  provider: "lmstudio"
  model: "gemma-3-4b-it"
  temperature: 0.3
  stream: false
  maxKeywords: 5
translate:
  provider: "ollama"
  model: "gemma2:2b"
  temperature: 0.1
  stream: false
  defaultTargetLanguage: "en"
rewrite:
  provider: "openai"
  model: "gpt-4o-mini"
  temperature: 0.3
  stream: true
compose:
  provider: "openai"
  model: "gpt-4o-mini"
  maxLength: 500
  stream: true
```

The `rewrite` section is used by generic Actions like Improve writing, Fix spelling & grammar, Brainstorm, Make shorter, and tone changes.
