##AI Middleware Error Log Analyzer:
  A full-stack web application that analyzes log files using AI. It masks sensitive data before sending to AI, categorizes errors, and caches results to reduce API costs.

##What it does
  +Upload log files or paste raw log data for analysis
  +Automatically masks sensitive data (passwords, emails, IPs, API keys) before sending to AI
  +Uses AI models to:
    *Identify root causes
    *Suggest fixes
    *Rate overall system health
  +Implements SHA-256 caching to avoid repeated API calls for identical logs
  +Supports multiple AI providers: OpenAI, Gemini, Anthropic, OpenRouter

##Tech Stack
  Frontend: React (Vite), Axios, Recharts
  Backend: Node.js, Express.js
  Database: MongoDB, Redis (caching layer)
  Security: JWT Authentication, bcrypt, AES-256 encryption, Helmet, Rate limiting

##How to Run Locally
  Backend:
  cd backend
  npm install
  .env   # fill in your values
  npm start

  ##Required
  .env required values
  MONGODB_URI=mongodb://localhost:27017/ai_log_analyzer
  JWT_SECRET=your_secret_key_min_32_chars
  ENCRYPTION_KEY=exactly_32_characters_here

  Frontend:
  cd frontend
  npm install
  npm run dev


##Getting a Free API Key:
  Step1: Go to openrouter.ai
  Step2: Sign up → API Keys → Create key
  Step3: Save it in Profile → API Keys inside the app

##Live Demo:

  Frontend: https://error-log-analyzer.vercel.app
  Backend: https://errorloganalyzer.onrender.com/api/health

Contact Email:srinidhi.ps2022cce@sece.ac.in
