from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import case
from flask_cors import CORS
from textblob import TextBlob
import os
from datetime import datetime
import random

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Ensure NLTK corpora are downloaded for TextBlob (Required for Vercel/Production)
import nltk
try:
    nltk.data.find('corpora/punkt')
    nltk.data.find('corpora/brown')
except LookupError:
    nltk.download('punkt')
    nltk.download('brown')
    nltk.download('wordnet')
    nltk.download('punkt_tab')

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='citizen') # citizen or official

class Complaint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False) # Auto-detected sector
    priority = db.Column(db.String(20), nullable=False) # High, Medium, Low
    pincode = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), default='Submitted')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    cluster_id = db.Column(db.String(50), nullable=True) # For grouping
    
    user = db.relationship('User', backref=db.backref('complaints', lazy=True))

# --- AI Logic Helper Functions ---

def detect_sector(text):
    text = text.lower()
    if any(word in text for word in ['road', 'pothole', 'traffic', 'street']):
        return 'Roads'
    elif any(word in text for word in ['electricity', 'power', 'light', 'current']):
        return 'Electricity'
    elif any(word in text for word in ['water', 'pipe', 'leak', 'drainage']):
        return 'Water'
    elif any(word in text for word in ['health', 'hospital', 'doctor', 'medicine']):
        return 'Health'
    elif any(word in text for word in ['school', 'teacher', 'education', 'book']):
        return 'Education'
    elif any(word in text for word in ['police', 'crime', 'theft', 'safety']):
        return 'Law & Order'
    else:
        return 'Welfare'

def detect_priority(text, category):
    text = text.lower()
    sentiment = TextBlob(text).sentiment.polarity
    
    # High priority keywords
    emergency_keywords = ['danger', 'accident', 'fire', 'emergency', 'attack', 'severe', 'urgent', 'died', 'blood']
    
    if any(word in text for word in emergency_keywords) or category == 'Law & Order':
        return 'High'
    elif sentiment < -0.3: # Very negative sentiment might indicate frustration/urgency
        return 'High'
    elif category in ['Electricity', 'Water', 'Health']:
        return 'Medium'
    else:
        return 'Low'

def generate_cluster_id(pincode, category):
    # Simple clustering logic: Pincode + Sector
    return f"{pincode}-{category}"

# --- Routes ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/welfare')
def welfare():
    return render_template('welfare.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/admin')
def admin_dashboard():
    return render_template('admin.html')

# API: Register User
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    # In prod, hash password!
    new_user = User(name=data['name'], email=data['email'], password=data['password'])
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user_id': new_user.id}), 201
    except:
        return jsonify({'message': 'Email already exists'}), 400

# API: Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'Citizen')  # Default name if not provided

    user = User.query.filter_by(email=email).first()

    if user:
        if user.password == password:
            return jsonify({'message': 'Login successful', 'user_id': user.id, 'role': user.role, 'name': user.name})
        else:
            return jsonify({'message': 'Invalid password'}), 401
    else:
        # Auto-register new user
        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'Account created successfully', 'user_id': new_user.id, 'role': new_user.role, 'name': new_user.name})

# API: Submit Complaint
@app.route('/api/complaint', methods=['POST'])
def submit_complaint():
    data = request.json
    user_id = data.get('user_id')
    description = data.get('description')
    pincode = data.get('pincode')
    
    # AI Logic
    sector = detect_sector(description)
    priority = detect_priority(description, sector)
    cluster_id = generate_cluster_id(pincode, sector)
    
    new_complaint = Complaint(
        user_id=user_id,
        description=description,
        category=sector,
        priority=priority,
        pincode=pincode,
        cluster_id=cluster_id
    )
    
    db.session.add(new_complaint)
    db.session.commit()
    
    return jsonify({
        'message': 'Complaint submitted successfully',
        'complaint_id': new_complaint.id,
        'sector': sector,
        'priority': priority
    }), 201

# API: Get User Complaints
@app.route('/api/my-complaints/<int:user_id>', methods=['GET'])
def get_user_complaints(user_id):
    complaints = Complaint.query.filter_by(user_id=user_id).order_by(Complaint.created_at.desc()).all()
    result = []
    for c in complaints:
        result.append({
            'id': c.id,
            'description': c.description,
            'category': c.category,
            'priority': c.priority,
            'status': c.status,
            'date': c.created_at.strftime('%Y-%m-%d')
        })
    return jsonify(result)

# API: Track Complaint by ID
@app.route('/api/complaint/<int:id>', methods=['GET'])
def track_complaint(id):
    c = Complaint.query.get(id)
    if c:
        return jsonify({
            'id': c.id,
            'description': c.description,
            'category': c.category,
            'priority': c.priority,
            'status': c.status,
            'date': c.created_at.strftime('%Y-%m-%d'),
            'pincode': c.pincode
        })
    return jsonify({'message': 'Complaint not found'}), 404

# API: Admin Stats
@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    # Basic Counters
    total = Complaint.query.count()
    high = Complaint.query.filter_by(priority='High').count()
    pending = Complaint.query.filter_by(status='Submitted').count()
    resolved = Complaint.query.filter_by(status='Resolved').count()
    processing = Complaint.query.filter_by(status='In Progress').count()
    
    # Recent complaints
    recent_objs = Complaint.query.order_by(Complaint.created_at.desc()).limit(10).all()
    recent = []
    for c in recent_objs:
        recent.append({
            'id': c.id,
            'category': c.category,
            'pincode': c.pincode,
            'priority': c.priority,
            'status': c.status
        })
    
    # Clustering Logic (Merge "same" complaints by Topic/Cluster)
    # Group by cluster_id and count
    from sqlalchemy import func
    clusters_query = db.session.query(
        Complaint.cluster_id, 
        Complaint.category, 
        Complaint.pincode,
        func.count(Complaint.id).label('total'),
        func.sum(case((Complaint.status == 'Resolved', 1), else_=0)).label('resolved'),
        func.sum(case((Complaint.status == 'In Progress', 1), else_=0)).label('processing')
    ).group_by(Complaint.cluster_id).order_by(func.count(Complaint.id).desc()).limit(5).all()

    clusters = []
    for c in clusters_query:
        # Note: c is a tuple result
        clusters.append({
            'topic': f"{c.category} Issue in {c.pincode}",
            'total': c.total,
            'resolved': int(c.resolved) if c.resolved else 0,
            'processing': int(c.processing) if c.processing else 0
        })
        
    return jsonify({
        'total': total,
        'high': high,
        'pending': pending, 
        'resolved': resolved,
        'processing': processing,
        'recent_complaints': recent,
        'clusters': clusters
    })


@app.route('/api/translate', methods=['POST'])
def translate_text():
    data = request.json
    text = data.get('text', '')
    target_lang = data.get('target_lang', 'en')

    # Simple mock translation logic for the demo
    # In a real app, this would call Google Translate API or similar
    translations_mock = {
        'ta': "இது ஒரு மாதிரி மொழிபெயர்ப்பு: ",
        'hi': "यह एक नमूना अनुवाद है: ",
        'te': "ఇది ఒక నమూనా అనువాదం: ",
        'ml': "ഇതൊരു മാതൃകാ വിവർത്തനമാണ്: "
    }
    
    prefix = translations_mock.get(target_lang, "Translated: ")
    
    # For common keywords, provide a better feel
    keywords = {
        'pothole': {'ta': 'குழி', 'hi': 'गड्ढा', 'te': 'గుంత', 'ml': 'കുഴി'},
        'road': {'ta': 'சாலை', 'hi': 'सड़क', 'te': 'రోడ్డు', 'ml': 'റോഡ്'},
        'water': {'ta': 'தண்ணீர்', 'hi': 'पानी', 'te': 'నీరు', 'ml': 'വെള്ളം'},
        'power': {'ta': 'மின்சாரம்', 'hi': 'बिजली', 'te': 'విద్యుత్', 'ml': 'വൈദ്യുതി'}
    }
    
    translated_content = text
    for word, trans_map in keywords.items():
        if word in text.lower():
            translated_content = translated_content.replace(word, trans_map.get(target_lang, word))
            translated_content = translated_content.replace(word.capitalize(), trans_map.get(target_lang, word).capitalize())

    return jsonify({
        'translation': f"{prefix} {translated_content}"
    })

# API: Chatbot
@app.route('/api/chat', methods=['POST'])
def chatbot():
    data = request.json
    message = data.get('message', '').lower()
    
    response = "I didn't understand that. You can ask me to 'track complaint [ID]', 'file a grievance', or ask about 'welfare schemes'."
    
    if 'track' in message or 'status' in message:
        # Extract ID if present (naive approach)
        import re
        match = re.search(r'\d+', message)
        if match:
            complaint_id = match.group()
            complaint = Complaint.query.get(complaint_id)
            if complaint:
                response = f"Complaint #{complaint_id} is currently '{complaint.status}'. It is handled by the {complaint.category} department."
            else:
                response = f"I couldn't find a complaint with ID #{complaint_id}."
        else:
            response = "Please provide your Complaint ID so I can track it for you."
            
    elif 'file' in message or 'complaint' in message or 'grievance' in message:
        response = "You can file a grievance by visiting the Dashboard. Click the 'File a Grievance' button to get started."
        
    elif 'welfare' in message or 'scheme' in message:
        response = "We have several welfare schemes active: 1. PM Awas Yojana (Housing)\n2. Ayushman Bharat (Health)\n3. PM Kisan (Farmers). Visit the Welfare page for more."
        
    elif 'hello' in message or 'hi' in message or 'hey' in message:
        response = "Hello! 👋 I am your AI assistant. How can I help you today?"

    elif 'thank' in message or 'thx' in message:
        response = "You're welcome! 😊 Happy to help."

    elif 'ok' in message or 'okay' in message or 'k ' in message or message == 'k':
        response = "Okay! 👍 Is there anything else?"

    elif 'bye' in message or 'goodbye' in message:
        response = "Goodbye! 👋 Have a great day!"
        
    return jsonify({'response': response})

# Initialize DB
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
