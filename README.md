


          
# GRMS Automation Tool

## 🚀 Overview

GRMS Automation is a browser automation tool designed to automate interactions with the Garden City University's GRMS portal. It uses AI-powered browser automation to handle tasks like logging in, navigating the interface, and completing online assessments automatically.

## ✨ Features

- **Automated Login**: Securely logs into the GRMS portal with provided credentials
- **Assessment Navigation**: Automatically finds and starts available assessments
- **AI-Powered Quiz Solving**: Uses Google's Gemini AI to analyze and answer quiz questions
- **Multiple-Choice Support**: Handles both single-select and multiple-select questions
- **Robust Error Handling**: Implements fallback strategies and retry mechanisms
- **User-Friendly Interface**: Simple web interface to start automation with your credentials

## 🛠️ Technology Stack

- **Stagehand**: High-level browser automation SDK built on Playwright
- **Google Gemini AI**: AI model for analyzing and answering quiz questions
- **TypeScript/JavaScript**: Core programming languages
- **Express.js**: Backend server for the web interface
- **Electron**: Desktop application wrapper

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Google Generative AI API key

## 🚀 Getting Started

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Edit the `.env` file and add your Google Generative AI API key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Running the Application

Start the application with:

```bash
npm start
```

This will launch both the Express server and the Electron application.

## 💻 Usage

1. Launch the application using `npm start`
2. Enter your GRMS credentials (username and password)
3. Enter your Google Generative AI API key
4. Click "Start Automation"
5. Watch as the automation completes your assessments

## 🔧 Configuration

The application can be configured through the `stagehand.config.ts` file:

- **Model Selection**: Change the AI model used for answering questions
- **Browser Settings**: Configure headless mode, viewport size, etc.
- **Environment**: Run locally or on Browserbase cloud

### Running on Browserbase

To run on Browserbase:

1. Add your API keys to `.env`
2. Change `env: "LOCAL"` to `env: "BROWSERBASE"` in `stagehand.config.ts`

### Using Alternative AI Models

The application is configured to use Google's Gemini AI by default, but you can switch to other models:

#### Using Anthropic Claude:

1. Add your Anthropic API key to `.env`
2. Change `modelName: "google/gemini-2.0-flash"` to `modelName: "claude-3-5-sonnet-latest"` in `stagehand.config.ts`
3. Change `modelClientOptions: { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }` to `modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY }` in `stagehand.config.ts`

## 🏗️ Building for Distribution

Build the application for Windows:

```bash
npm run build:win
```

## 🐳 Docker Support

The application includes a Dockerfile for containerized deployment:

```bash
docker build -t grms-automation .
docker run -p 3132:3132 grms-automation
```

## ⚠️ Disclaimer

This tool is intended for educational purposes only. Please ensure you have permission to use automated tools with the GRMS system before proceeding.

## 📄 License

[MIT License](LICENSE)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

        