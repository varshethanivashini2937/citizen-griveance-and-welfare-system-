# CitizenConnect: AI-Powered Grievance & Welfare System

**CitizenConnect** is an intelligent governance platform designed to bridge the gap between citizens and administration. Built for the **HackElite Hackathon**, it leverages AI to streamline grievance reporting, prioritize urgent issues, and provide accessible support in multiple regional languages.

## 🚀 Live Prototype
[Insert Vercel Deployment Link Here]

## ✨ Key Features
- **AI-Powered Grievance Submission**: Automatically detects the category (Roads, Electricity, Water, etc.) and assigns a priority level based on the description provided.
- **Voice-to-Ticket Interface**: Full support for voice input, allowing citizens to speak their concerns rather than typing.
- **Dynamic Multi-Language Support**: Seamlessly switch between English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), and Malayalam (മലയാളം).
- **Intelligent Tracking & Dashboard**: Real-time visibility into complaint status (Submitted, Assigned, In Progress, Resolved) with a visual timeline.
- **AI Chatbot Assistant**: A dedicated AI assistant to help citizens navigate the system and answer common queries.
- **Admin Insights**: A centralized dashboard for administrators to monitor grievance statistics, priority clusters, and resolution performance.

## 🛠️ Technology Stack
- **Backend**: Flask (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Intelligence**: TextBlob for Sentiment & Priority Analysis
- **Frontend**: Responsive HTML5, Vanilla CSS3 (Glassmorphism design), and JavaScript
- **Deployment**: Vercel

## 📝 Step-by-Step Usage Guide

### 1. Registration & Login
- Navigate to the **Login** page.
- Enter your **Full Name**, **Email**, and a **Password**.
- The system features auto-registration; if your email is new, it will create an account and log you in instantly.

### 2. Filing a Grievance
- Go to the **Dashboard**.
- Select your preferred language from the dropdown in the navbar.
- Enter the **Location Pincode**.
- In the **Complaint Description**, either type your issue or click the **🎤 Record** button to use voice input.
- Click **Submit Grievance**. Notice how the system automatically identifies the **Sector** and displays the **Priority** in the history list.

### 3. Tracking Status
- Each complaint is assigned a unique **Complaint ID**.
- Use the **Track Grievance** section on the dashboard to enter your ID and see a live visual timeline of the progress.

### 4. Exploring Welfare Schemes
- Navigate to the **Welfare** tab to view curated government schemes.
- All scheme details are accurately translated into your selected language.

### 5. Interacting with the AI Bot
- Click the floating **Robot Icon** at the bottom right.
- You can type or use voice to talk to the AI assistant.

## 🏆 HackElite Submission Details
- **Team Name**: [Insert Team Name]
- **Problem Statement**: [Insert Problem Statement]
- **Solution Type**: Software (Web Application)

## 🏆 Credits & Attributions
- **Natural Language Processing**: [TextBlob](https://textblob.readthedocs.io/)
- **ORM & Database**: [SQLAlchemy](https://www.sqlalchemy.org/)
- **Icons**: [FontAwesome](https://fontawesome.com/)
- **Typography**: [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)
- **Deployment**: [Vercel](https://vercel.com/)
- **Framework**: [Flask](https://flask.palletsprojects.com/)

---
*Created with ❤️ for HackElite.*
