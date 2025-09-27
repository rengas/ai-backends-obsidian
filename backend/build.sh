#!/bin/bash

# Build script for AI Backends Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
OUTPUT_DIR="dist"
BINARY_NAME="ai-backends-server"
PLATFORMS=("linux/amd64" "darwin/amd64" "darwin/arm64" "windows/amd64")

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --binary-name)
            BINARY_NAME="$2"
            shift 2
            ;;
        --platform)
            PLATFORMS=("$2")
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --output-dir DIR     Output directory for binaries (default: dist)"
            echo "  --binary-name NAME   Name of the binary (default: ai-backends-server)"
            echo "  --platform PLATFORM  Target platform (default: all platforms)"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "Starting build process..."
print_status "Output directory: $OUTPUT_DIR"
print_status "Binary name: $BINARY_NAME"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Download dependencies
print_status "Downloading Go dependencies..."
go mod download
go mod tidy

# Build for each platform
for platform in "${PLATFORMS[@]}"; do
    platform_split=(${platform//\// })
    GOOS="${platform_split[0]}"
    GOARCH="${platform_split[1]}"
    
    output_name="$BINARY_NAME"
    if [ "$GOOS" = "windows" ]; then
        output_name="$output_name.exe"
    fi
    
    # Create platform-specific directory
    platform_dir="$OUTPUT_DIR/$GOOS-$GOARCH"
    mkdir -p "$platform_dir"
    
    output_path="$platform_dir/$output_name"
    
    print_status "Building for $GOOS/$GOARCH..."
    
    # Set environment variables for cross-compilation
    CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
        -ldflags="-w -s" \
        -o "$output_path" \
        .
    
    if [ $? -eq 0 ]; then
        print_status "Successfully built $output_path"
    else
        print_error "Failed to build for $GOOS/$GOARCH"
        exit 1
    fi
done

print_status "Build completed successfully!"
print_status "Binaries are available in: $OUTPUT_DIR/"

# List built binaries
echo ""
print_status "Built binaries:"
find "$OUTPUT_DIR" -type f -name "$BINARY_NAME*" | while read -r binary; do
    echo "  - $binary"
done
