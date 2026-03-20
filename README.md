# ResumeAI Screen — Next-Gen Candidate Intelligence

ResumeAI Screen is a premium, AI-powered resume screening system designed to rank candidates with high precision against a specific job description. Powered by **Google Gemini AI**, it provides deep insights into candidate strengths, gaps, and total fit, allowing recruiters to make data-driven hiring decisions in seconds.

## ✨ Key Features

- **Gemini-Powered Intelligence**: Uses advanced LLM analysis (Gemini 2.5 Flash) to understand context, skills, and experience beyond simple keyword matching.
- **Batch PDF Support**: Upload multiple resumes simultaneously for rapid batch screening.
- **Matte Dark Interface**: A high-contrast, distraction-free matte black UI designed for premium candidate processing.
- **Deep Analytics**:
    - **Match Score (0-100)**: Transparent breakdown of skills, experience, and education.
    - **Skill Match Matrix**: Side-by-side visualization of which JD requirements each candidate fulfills.
    - **Head-to-Head Comparison**: Detailed comparison of the top two candidates.
    - **Skills Radar Map**: Visual representation of the entire candidate pool's skill distribution.
- **AI Interviewer**: Automatically generates tailored interview questions for each candidate to probe their specific gaps.
- **Data Portability**: Export the entire screening report to a standardized CSV file.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (ES6+), Semantic HTML5, Custom CSS3 (Matte Black Design System).
- **AI Engine**: Google Gemini API (`gemini-2.5-flash`).
- **PDF Processing**: `pdf.js` for client-side text extraction.
- **Aesthetics**: Custom-built matte design with high-contrast, rounded white/grey borders.

## 🚀 Getting Started

### Prerequisites

- A modern web browser.
- A **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/)).

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AdityaAyushSingh/AI-Resume-Screener.git
   cd AI-Resume-Screener
   ```

2. **Serve the project**:
   You can open `index.html` directly in your browser, or use a local server for a better experience:
   ```bash
   npx http-server ./ -p 8080
   ```

3. **Access the application**:
   Open `http://localhost:8080` in your browser.

## 📝 Usage

1. **API Key**: Enter your Gemini API key. It is stored locally in your browser's `localStorage` and is never sent to any server except Google's API.
2. **Job Description**: Paste the full JD including skills, experience, and requirements.
3. **Add Candidates**: 
    - Drag and drop PDF resumes into the upload zone (batch upload supported).
    - Or manually add candidate names and paste resume text.
4. **Analyze**: Click "Analyze Candidates" to start the AI intelligence engine.
5. **Review**: Explore the ranks, strengths/gaps, skill matrix, and generated interview questions.

## 🔒 Security & Privacy

- **Client-Side Only**: All resume processing and API calls happen directly in your browser. No resume data or API keys are stored on any backend server.
- **Local Storage**: Your API key is saved in your browser's local cache for convenience and stays on your machine.

---
*Built with ❤️ for modern HR teams.*