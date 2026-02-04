
// DOM Elements
const chatWindow = document.getElementById('chatbot');

// Voice Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
}

// --- Toggle Chat ---
function toggleChat() {
    const chat = document.getElementById('chatbot-container');
    if (chat.style.display === 'flex') {
        chat.style.display = 'none';
        chat.classList.remove('active');
    } else {
        chat.style.display = 'flex';
        chat.classList.add('active');
    }
}

// --- Voice Input ---
function startVoiceInput(targetInputId) {
    if (!recognition) {
        alert("Voice recognition not supported in this browser.");
        return;
    }

    const btn = document.querySelector(`[onclick="startVoiceInput('${targetInputId}')"]`);
    btn.innerHTML = '🎤 Listening...';
    btn.style.color = 'var(--danger)';

    recognition.start();

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById(targetInputId).value = text;

        // If it's the description field, trigger sector detection preview if possible
        if (targetInputId === 'complaint-desc') {
            analyzeText(text);
        }
    };

    recognition.onend = () => {
        btn.innerHTML = '🎤 Record';
        btn.style.color = '';
    };

    recognition.onerror = (event) => {
        console.error(event.error);
        btn.innerHTML = '🎤 Error';
        setTimeout(() => btn.innerHTML = '🎤 Record', 2000);
    };
}

// --- AI Text Analysis Simulation (Frontend Preview) ---
function analyzeText(text) {
    const keywords = {
        'Roads': ['road', 'pothole', 'street'],
        'Electricity': ['power', 'light', 'shock'],
        'Water': ['water', 'pipe', 'leak'],
        'Health': ['hospital', 'sick', 'doctor'],
        'Law & Order': ['theft', 'crime', 'police']
    };

    let detectedSector = 'Welfare';
    text = text.toLowerCase();

    for (const [sector, words] of Object.entries(keywords)) {
        if (words.some(w => text.includes(w))) {
            detectedSector = sector;
            break;
        }
    }

    // Highlight UI
    document.querySelectorAll('.sector-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.sector === detectedSector) {
            el.classList.add('active');
        }
    });
}

// --- API Calls ---

async function submitComplaint(event) {
    event.preventDefault();

    const token = localStorage.getItem('user_id');
    if (!token) {
        alert("Please login first!");
        window.location.href = '/login';
        return;
    }

    const desc = document.getElementById('complaint-desc').value;
    const pincode = document.getElementById('pincode').value;

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Analyzing & Submitting...';

    try {
        const res = await fetch('/api/complaint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: token,
                description: desc,
                pincode: pincode
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`Complaint Registered! ID: ${data.complaint_id}\nSector: ${data.sector}\nPriority: ${data.priority}`);
            window.location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Submit Grievance';
    }
}

async function login(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('role', data.role);
        localStorage.setItem('name', data.name);

        if (data.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/dashboard';
        }
    } else {
        alert(data.message);
    }
}

async function loadUserComplaints() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    const res = await fetch(`/api/my-complaints/${userId}`);
    const data = await res.json();

    const list = document.getElementById('complaint-list');
    if (!list) return;

    // Get current language translations
    const lang = document.querySelector('select[onchange*="changeLanguage"]')?.value || 'en';
    const t = translations[lang] || translations['en'];

    // Helper to translate category
    const translateCategory = (cat) => {
        const map = {
            'Roads': t.sector_roads || 'Roads',
            'Electricity': t.sector_electricity || 'Electricity',
            'Water': t.sector_water || 'Water',
            'Health': t.sector_health || 'Health',
            'Education': t.sector_education || 'Education',
            'Law & Order': t.sector_police || 'Police',
            'Welfare': t.sector_welfare || 'Welfare',
            'Other': t.sector_other || 'Other'
        };
        return map[cat] || cat;
    };

    // Helper to translate priority
    const translatePriority = (p) => {
        const map = {
            'High': t.priority_high || 'High',
            'Medium': t.priority_medium || 'Medium',
            'Low': t.priority_low || 'Low'
        };
        return map[p] || p;
    };

    // Helper to translate status
    const translateStatus = (s) => {
        const map = {
            'Submitted': t.status_submitted || 'Submitted',
            'Assigned': t.status_assigned || 'Assigned',
            'In Progress': t.status_in_progress || 'In Progress',
            'Resolved': t.status_resolved || 'Resolved'
        };
        return map[s] || s;
    };

    list.innerHTML = data.map(c => `
        <div class="glass-card mb-4" style="padding: 20px; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span class="status-badge status-${c.priority}">${translatePriority(c.priority)} ${t.priority_label || 'Priority'}</span>
                <span class="status-badge status-${c.status}">${translateStatus(c.status)}</span>
            </div>
            <h4 style="margin-bottom:5px;">${translateCategory(c.category)}</h4>
            <div id="desc-container-${c.id}">
                <p style="margin-bottom: 10px;">${c.description}</p>
                ${lang !== 'en' ? `<button onclick="translateDescription('${c.description.replace(/'/g, "\\'")}', 'desc-text-${c.id}')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; margin-bottom:10px;"><i class="fas fa-language"></i> Translate</button><p id="desc-text-${c.id}" style="font-size:0.9rem; font-style:italic; border-left:2px solid var(--primary); padding-left:10px; display:none; margin-bottom:10px;"></p>` : ''}
            </div>
            <small style="color:var(--text-secondary); display:block; margin-top:10px;">${t.id_label || 'ID'}: ${c.id} • ${c.date}</small>
        </div>
    `).join('');
}


// --- Chatbot Logic ---
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add User Message
    addChatMessage(message, 'user-msg');
    input.value = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        // Add Bot Response
        addChatMessage(data.response, 'bot-msg');
    } catch (err) {
        addChatMessage("Sorry, I'm having trouble connecting right now.", 'bot-msg');
    }
}

function addChatMessage(text, className) {
    const container = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${className}`;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Bind Enter key for chat
const chatInput = document.getElementById('chat-input');
if (chatInput) {
    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });
}

// Bind Send Button
const sendBtn = document.querySelector('.chatbot-footer .btn-primary');
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}


async function trackComplaint() {
    const id = document.getElementById('track-id').value;
    if (!id) return;

    const resultDiv = document.getElementById('track-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>Searching...</p>';

    try {
        const res = await fetch(`/api/complaint/${id}`);
        const data = await res.json();

        if (res.ok) {
            // Get current language translations
            const lang = document.querySelector('select[onchange*="changeLanguage"]')?.value || 'en';
            const t = translations[lang] || translations['en'];

            // Helper to translate category (reused from loadUserComplaints logic or extracted)
            const translateCategory = (cat) => {
                const map = {
                    'Roads': t.sector_roads || 'Roads',
                    'Electricity': t.sector_electricity || 'Electricity',
                    'Water': t.sector_water || 'Water',
                    'Health': t.sector_health || 'Health',
                    'Education': t.sector_education || 'Education',
                    'Law & Order': t.sector_police || 'Police',
                    'Welfare': t.sector_welfare || 'Welfare',
                    'Other': t.sector_other || 'Other'
                };
                return map[cat] || cat;
            };

            const translatePriority = (p) => {
                const map = { 'High': t.priority_high || 'High', 'Medium': t.priority_medium || 'Medium', 'Low': t.priority_low || 'Low' };
                return map[p] || p;
            };

            const translateStatus = (s) => {
                const map = { 'Submitted': t.status_submitted || 'Submitted', 'Assigned': t.status_assigned || 'Assigned', 'In Progress': t.status_in_progress || 'In Progress', 'Resolved': t.status_resolved || 'Resolved' };
                return map[s] || s;
            };

            // Determine active steps
            const stages = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
            let currentStageIndex = stages.indexOf(data.status);
            if (currentStageIndex === -1) currentStageIndex = 0;

            const timelineHtml = `
                <div class="timeline">
                    ${stages.map((stage, index) => `
                        <div class="timeline-step ${index <= currentStageIndex ? 'active' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-text">${translateStatus(stage)}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            resultDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <strong>${t.id_label || 'ID'}: #${data.id}</strong>
                    <span class="status-badge status-${data.status}">${translateStatus(data.status)}</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:15px;">
                    ${translateCategory(data.category)} • ${translatePriority(data.priority)} ${t.priority_label || 'Priority'}
                </div>
                <div id="tracked-desc-container">
                    <p style="font-size:0.95rem; margin-bottom: 20px;">${data.description}</p>
                    ${lang !== 'en' ? `<button onclick="translateDescription('${data.description}', 'tracked-desc-text')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; margin-bottom:15px;"><i class="fas fa-language"></i> Translate Description</button><p id="tracked-desc-text" style="font-size:0.95rem; font-style:italic; border-left:3px solid var(--primary); padding-left:10px; display:none;"></p>` : ''}
                </div>
                ${timelineHtml}
            `;
        } else {
            resultDiv.innerHTML = `<p style="color:var(--danger);">Complaint not found.</p>`;
        }
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<p style="color:var(--danger);">Error tracking complaint.</p>`;
    }
}

async function translateDescription(text, targetId) {
    const el = document.getElementById(targetId);
    el.innerText = "Translating...";
    el.style.display = 'block';

    const lang = document.querySelector('select[onchange*="changeLanguage"]')?.value || 'en';

    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target_lang: lang })
        });
        const data = await res.json();
        el.innerText = data.translation;
    } catch (err) {
        el.innerText = "Translation failed.";
    }
}

// --- Language Switcher ---
const translations = {
    'en': {
        'nav_home': 'Home',
        'nav_welfare': 'Welfare Schemes',
        'nav_login': 'Login',
        'welfare_title': 'Government Welfare Schemes',
        'scheme_1_title': 'Pradhan Mantri Awas Yojana',
        'scheme_1_desc': 'Affordable housing for all citizens. Apply for subsidies on home loans and construction.',
        'scheme_2_desc': 'Free medical coverage up to ₹5 Lakhs per family per year.',
        'scheme_3_desc': 'Income support of ₹6,000 per year for all landholding farmer families.',
        'scheme_4_desc': 'A pension scheme for citizens of India focused on the unorganized sector workers.',
        'hero_title': 'Your Voice,<br>Our Action.',
        'hero_subtitle': 'An intelligent governance platform bridging the gap between citizens and administration.',
        'hero_badge': '● Live: Intelligent Grievance System',
        'hero_headline': 'Your Voice,<br>Powerfully Heard.',
        'hero_subtext': 'An AI-powered platform connecting citizens with governance. File complaints via voice, track real-time status, and see rapid resolution.',
        'hero_btn_file': 'File a Grievance',
        'hero_btn_track': 'Track Status',
        'card_voice_title': 'Voice-to-Ticket',
        'card_voice_desc': 'Just speak your concern. Our AI transcribes, categorizes, and assigns it instantly.',
        'card_auto_title': 'Auto-Prioritization',
        'card_auto_desc': 'Urgent issues like "electricity failure" are automatically flagged as High Priority.',
        'nav_file': 'File Grievance',
        'nav_track': 'Track Status',
        'nav_dash': 'Dashboard',
        'btn_file_grievance': 'File a Grievance',
        'btn_how_it_works': 'How it Works',
        'login_welcome': 'Welcome Back',
        'email_label': 'Email Address',
        'password_label': 'Password',
        'login_btn': 'Login / Signup',
        'login_footer': "Don't have an account? No worries, we'll create one if it doesn't exist.",
        'dash_logout': 'Logout',
        'dash_title_prefix': 'Dashboard of',
        'dash_file_grievance': 'File New Grievance',
        'dash_track_title': 'Track Grievance',
        'dash_pincode': 'Location Pincode',
        'dash_desc': 'Complaint Description',
        'dash_type_speak': '(Type or Speak)',
        'dash_detected_sector': 'Detected Sector (Auto-Selected)',
        'dash_attachment': 'Attachment (Optional)',
        'dash_submit_btn': 'Submit Grievance',
        'dash_history_title': 'Your Complaints',
        'dash_record_btn': '🎤 Record',
        'dash_loading': 'Loading your history...',
        'pincode_placeholder': 'e.g. 600001',
        'desc_placeholder': 'Describe your issue... e.g., "There is a huge pothole on Main Street causing accidents."',
        'track_placeholder': 'Enter Complaint ID',
        'sector_roads': 'Roads',
        'sector_electricity': 'Electricity',
        'sector_water': 'Water',
        'sector_health': 'Health',
        'sector_education': 'Education',
        'sector_police': 'Police',
        'sector_welfare': 'Welfare',
        'sector_other': 'Other',
        'name_label': 'Full Name',
        'chat_welcome': 'Hello! I am your grievance assistant. How can I help you today? You can speak to me as well!',
        'chat_input_placeholder': 'Type here...',
        'priority_high': 'High',
        'priority_medium': 'Medium',
        'priority_low': 'Low',
        'priority_label': 'Priority',
        'status_submitted': 'Submitted',
        'status_assigned': 'Assigned',
        'status_in_progress': 'In Progress',
        'status_resolved': 'Resolved',
        'id_label': 'ID'
    },
    'ta': {
        'nav_home': 'முகப்பு',
        'nav_welfare': 'நலத்திட்டங்கள்',
        'nav_login': 'உள்நுழைய',
        'nav_file': 'புகார் அளிக்க',
        'nav_track': 'நிலை அறிய',
        'nav_dash': 'முகப்பு',
        'welfare_title': 'அரசு நலத்திட்டங்கள்',
        'hero_badge': '● நேரலை: குறைதீர்க்கும் தளம்',
        'hero_headline': 'உங்கள் குரல்,<br>வலிமையாக ஒலிக்கும்.',
        'hero_subtext': 'குடிமக்களை அரசாங்கத்துடன் இணைக்கும் தளம். உங்கள் புகார்களை குரல் வழி பதிவு செய்யுங்கள்.',
        'hero_btn_file': 'புகார் அளிக்க',
        'hero_btn_track': 'நிலை அறிய',
        'card_voice_title': 'குரல் வழி பதிவு',
        'card_voice_desc': 'உங்கள் குறையை பேசுங்கள். எங்கள் AI அதை தானாகவே பதிவு செய்யும்.',
        'card_auto_title': 'தானியங்கி முன்னுரிமை',
        'card_auto_desc': 'மின்சார தடை, விபத்து போன்ற அவசர புகார்கள் முன்னுரிமை பெறும்.',
        'scheme_1_title': 'பிரதான் மந்திரி ஆவாஸ் யோஜனா',
        'scheme_1_desc': 'அனைத்து குடிமக்களுக்கும் மலிவு விலை வீடு. வீட்டுக் கடன்களுக்கான மானியம் பெறலாம்.',
        'scheme_2_desc': 'ஆண்டுக்கு ஒரு குடும்பத்திற்கு ₹5 லட்சம் வரை இலவச மருத்துவ காப்பீடு.',
        'scheme_3_desc': 'விவசாயக் குடும்பங்களுக்கு ஆண்டுக்கு ₹6,000 நிதியுதவி.',
        'scheme_4_desc': 'அமைப்புசாரா தொழிலாளர்களுக்கான ஓய்வூதியத் திட்டம்.',
        'btn_file_grievance': 'குறை தீர்க்க',
        'btn_how_it_works': 'எப்படி வேலை செய்கிறது',
        'login_welcome': 'மீண்டும் வருக',
        'email_label': 'மின்னஞ்சல் முகவரி',
        'password_label': 'கடவுச்சொல்',
        'name_label': 'முழு பெயர்',
        'login_btn': 'உள்நுழைக / பதிவு செய்க',
        'login_footer': 'கணக்கு இல்லையா? கவலை வேண்டாம், நாங்கள் புதிய ஒன்றை உருவாக்குவோம்.',
        'dash_title_prefix': 'டாஷ்போர்டு - ',
        'dash_logout': 'வெளியேறு',
        'dash_file_grievance': 'புதிய குறையை பதிவு செய்க',
        'dash_pincode': 'பின்கோடு',
        'dash_desc': 'குறை விளக்கம்',
        'dash_type_speak': '(தட்டச்சு செய்யவும் அல்லது பேசவும்)',
        'dash_detected_sector': 'கண்டறியப்பட்ட பிரிவு (தானியங்கி)',
        'dash_attachment': 'இணைப்பு (விருப்பத் தேர்வு)',
        'dash_submit_btn': 'குறையை சமர்ப்பிக்கவும்',
        'dash_track_title': 'புகார் கண்காணிக்க',
        'dash_history_title': 'உங்கள் புகார்கள்',
        'dash_record_btn': '🎤 பதிவு செய்',
        'dash_loading': 'உங்கள் வரலாறு ஏற்றப்படுகிறது...',
        'pincode_placeholder': 'எ.கா. 600001',
        'desc_placeholder': 'உங்கள் பிரச்சனையை விவரிக்கவும்... எ.கா., "முக்கிய சாலையில் பெரிய குழி உள்ளது, விபத்துகளை ஏற்படுத்துகிறது."',
        'track_placeholder': 'புகார் எண் உள்ளிடவும்',
        'sector_roads': 'சாலைகள்',
        'sector_electricity': 'மின்சாரம்',
        'sector_water': 'தண்ணீர்',
        'sector_health': 'சுகாதாரம்',
        'sector_education': 'கல்வி',
        'sector_police': 'காவல்துறை',
        'sector_welfare': 'நலன்',
        'sector_other': 'மற்றவை',
        'chat_welcome': 'வணக்கம்! நான் உங்கள் குறைதீர் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்? நீங்கள் என்னிடம் பேசலாம்!',
        'chat_input_placeholder': 'இங்கே தட்டச்சு செய்க...',
        'priority_high': 'உயர்',
        'priority_medium': 'நடுத்தர',
        'priority_low': 'குறைந்த',
        'priority_label': 'முன்னுரிமை',
        'status_submitted': 'சமர்ப்பிக்கப்பட்டது',
        'status_assigned': 'ஒதுக்கப்பட்டது',
        'status_in_progress': 'நடைபெறுகிறது',
        'status_resolved': 'தீர்க்கப்பட்டது',
        'id_label': 'எண்'
    },
    'hi': {
        'nav_home': 'होम',
        'nav_welfare': 'कल्याण योजनाएं',
        'nav_login': 'लॉगिन',
        'nav_file': 'शिकायत दर्ज करें',
        'nav_track': 'स्थिति देखें',
        'nav_dash': 'डैशबोर्ड',
        'welfare_title': 'सरकारी कल्याण योजनाएं',
        'hero_badge': '● लाइव: शिकायत निवारण प्रणाली',
        'hero_headline': 'आपकी आवाज़,<br>सशक्त प्रभाव।',
        'hero_subtext': 'नागरिकों को सरकार से जोड़ने वाला AI मंच। बोलकर शिकायत दर्ज करें।',
        'hero_btn_file': 'शिकायत दर्ज करें',
        'hero_btn_track': 'स्थिति देखें',
        'card_voice_title': 'वॉयस-टू-टिकट',
        'card_voice_desc': 'बस अपनी समस्या बोलें। हमारा AI इसे तुरंत असाइन करता है।',
        'card_auto_title': 'स्वतः प्राथमिकता',
        'card_auto_desc': 'बिजली गुल जैसी आपात समस्याओं को उच्च प्राथमिकता मिलती है।',
        'scheme_1_title': 'प्रधानमंत्री आवास योजना',
        'scheme_1_desc': 'सभी नागरिकों के लिए किफायती आवास। गृह ऋण पर सब्सिडी।',
        'scheme_2_desc': 'प्रति परिवार ₹5 लाख तक का मुफ्त चिकित्सा कवरेज।',
        'scheme_3_desc': 'किसान परिवारों के लिए प्रति वर्ष ₹6,000 की सहायता।',
        'scheme_4_desc': 'असंगठित क्षेत्र के श्रमिकों के लिए पेंशन योजना।',
        'hero_title': 'आपकी आवाज़,<br>हमारी कार्रवाई।',
        'hero_subtitle': 'नागरिकों और प्रशासन के बीच की दूरी को पाटने वाला मंच।',
        'btn_file_grievance': 'शिकायत दर्ज करें',
        'btn_how_it_works': 'यह कैसे काम करता है',
        'login_welcome': 'वापसी पर स्वागत है',
        'email_label': 'ईमेल पता',
        'password_label': 'पासवर्ड',
        'name_label': 'पूरा नाम',
        'login_btn': 'लॉगिन / साइनअप',
        'login_footer': 'खाता नहीं है? चिंता न करें, हम नया बना देंगे।',
        'dash_title_prefix': 'डैशबोर्ड - ',
        'dash_logout': 'लॉग आउट',
        'dash_file_grievance': 'नई शिकायत दर्ज करें',
        'dash_track_title': 'शिकायत ट्रैक करें',
        'dash_pincode': 'पिन कोड',
        'dash_desc': 'शिकायत का विवरण',
        'dash_type_speak': '(टाइप करें या बोलें)',
        'dash_detected_sector': 'पता लगाया गया क्षेत्र (स्वत: चयनित)',
        'dash_attachment': 'संलग्नक (वैकल्पिक)',
        'dash_submit_btn': 'शिकायत जमा करें',
        'dash_history_title': 'आपकी शिकायतें',
        'dash_record_btn': '🎤 रिकॉर्ड',
        'dash_loading': 'आपका इतिहास लोड हो रहा है...',
        'pincode_placeholder': 'जैसे 110001',
        'desc_placeholder': 'अपनी समस्या बताएं... जैसे, "मुख्य सड़क पर गड्ढा है।"',
        'track_placeholder': 'शिकायत आईडी दर्ज करें',
        'sector_roads': 'सड़कें',
        'sector_electricity': 'बिजली',
        'sector_water': 'पानी',
        'sector_health': 'स्वास्थ्य',
        'sector_education': 'शिक्षा',
        'sector_police': 'पुलिस',
        'sector_welfare': 'कल्याण',
        'sector_other': 'अन्य',
        'chat_welcome': 'नमस्ते! मैं आपका शिकायत सहायक हूँ। आज कैसे मदद कर सकता हूँ?',
        'chat_input_placeholder': 'यहाँ टाइप करें...',
        'priority_high': 'उच्च',
        'priority_medium': 'मध्यम',
        'priority_low': 'निम्न',
        'priority_label': 'प्राथमिकता',
        'status_submitted': 'जमा किया',
        'status_assigned': 'सौंपा गया',
        'status_in_progress': 'प्रगति में',
        'status_resolved': 'हल किया',
        'id_label': 'आईडी'
    },
    'te': {
        'nav_home': 'హోమ్',
        'nav_welfare': 'సంక్షేమ పథకాలు',
        'nav_login': 'లాగిన్',
        'nav_file': 'ఫిర్యాదు చేయండి',
        'nav_track': 'స్థితి చూడండి',
        'nav_dash': 'డ్యాష్‌బోర్డ్',
        'welfare_title': 'ప్రభుత్వ సంక్షేమ పథకాలు',
        'hero_badge': '● ప్రత్యక్షం: ఫిర్యాదు వ్యవస్థ',
        'hero_headline': 'మీ గొంతు,<br>బలంగా వినబడుతుంది.',
        'hero_subtext': 'పౌరులను ప్రభుత్వంతో అనుసంధానించే AI వేదిక. వాయిస్ ద్వారా ఫిర్యాదు చేయండి.',
        'hero_btn_file': 'ఫిర్యాదు చేయండి',
        'hero_btn_track': 'స్థితి చూడండి',
        'card_voice_title': 'వాయిస్-టు-టికెట్',
        'card_voice_desc': 'మీ సమస్యను చెప్పండి. మా AI దాన్ని వెంటనే నమోదు చేస్తుంది.',
        'card_auto_title': 'ఆటో ప్రాధాన్యత',
        'card_auto_desc': 'కరెంట్ పోవటం వంటి అత్యవసర సమస్యలకు అధిక ప్రాధాన్యత.',
        'scheme_1_title': 'ప్రధాన మంత్రి ఆవాస్ యోజన',
        'scheme_1_desc': 'అందరికీ అందుబాటులో గృహాలు. రుణాలపై సబ్సిడీ.',
        'scheme_2_desc': 'కుటుంబానికి ₹5 లక్షల వరకు ఉచిత వైద్య బీమా.',
        'scheme_3_desc': 'రైతు కుటుంబాలకు సంవత్సరానికి ₹6,000 సహాయం.',
        'scheme_4_desc': 'అసంఘటిత కార్మికులకు పెన్షన్ పథకం.',
        'hero_title': 'మీ గొంతు,<br>మా చర్య.',
        'hero_subtitle': 'పౌరులు మరియు పాలన మధ్య అంతరాన్ని తగ్గించే వేదిక.',
        'btn_file_grievance': 'ఫిర్యాదు చేయండి',
        'btn_how_it_works': 'ఇది ఎలా పనిచేస్తుంది',
        'login_welcome': 'తిరిగి స్వాగతం',
        'email_label': 'ఇమెయిల్ చిరునామా',
        'password_label': 'పాస్‌వర్డ్',
        'name_label': 'పూర్తి పేరు',
        'login_btn': 'లాగిన్ / సైనప్',
        'login_footer': 'ఖాతా లేదా? చింతించకండి, మేము కొత్తది సృష్టిస్తాము.',
        'dash_title_prefix': 'డ్యాష్‌బోర్డ్ - ',
        'dash_logout': 'లాగ్ అవుట్',
        'dash_file_grievance': 'కొత్త ఫిర్యాదు నమోదు',
        'dash_track_title': 'ఫిర్యాదు ట్రాక్ చేయండి',
        'dash_pincode': 'పిన్ కోడ్',
        'dash_desc': 'ఫిర్యాదు వివరణ',
        'dash_type_speak': '(టైప్ చేయండి లేదా మాట్లాడండి)',
        'dash_detected_sector': 'గుర్తించిన విభాగం (ఆటో)',
        'dash_attachment': 'అటాచ్‌మెంట్ (ఐచ్ఛికం)',
        'dash_submit_btn': 'ఫిర్యాదు సమర్పించండి',
        'dash_history_title': 'మీ ఫిర్యాదులు',
        'dash_record_btn': '🎤 రికార్డ్',
        'dash_loading': 'మీ చరిత్ర లోడ్ అవుతోంది...',
        'pincode_placeholder': 'ఉదా. 500001',
        'desc_placeholder': 'మీ సమస్యను వివరించండి... ఉదా., "మెయిన్ రోడ్‌లో గుంట ఉంది."',
        'track_placeholder': 'ఫిర్యాదు ID నమోదు చేయండి',
        'sector_roads': 'రోడ్లు',
        'sector_electricity': 'విద్యుత్',
        'sector_water': 'నీరు',
        'sector_health': 'ఆరోగ్యం',
        'sector_education': 'విద్య',
        'sector_police': 'పోలీసులు',
        'sector_welfare': 'సంక్షేమం',
        'sector_other': 'ఇతరాలు',
        'chat_welcome': 'నమస్కారం! నేను మీ ఫిర్యాదు సహాయకుడిని. నేను ఎలా సహాయం చేయగలను?',
        'chat_input_placeholder': 'ఇక్కడ టైప్ చేయండి...',
        'priority_high': 'అధిక',
        'priority_medium': 'మధ్యస్థ',
        'priority_low': 'తక్కువ',
        'priority_label': 'ప్రాధాన్యత',
        'status_submitted': 'సమర్పించబడింది',
        'status_assigned': 'కేటాయించబడింది',
        'status_in_progress': 'పురోగతిలో ఉంది',
        'status_resolved': 'పరిష్కరించబడింది',
        'id_label': 'ID'
    },
    'ml': {
        'nav_home': 'ഹോം',
        'nav_welfare': 'ക്ഷേമ പദ്ധതികൾ',
        'nav_login': 'ലോഗിൻ',
        'nav_file': 'പരാതി നൽകുക',
        'nav_track': 'സ്റ്റാറ്റസ് കാണുക',
        'nav_dash': 'ഡാഷ്‌ബോർഡ്',
        'welfare_title': 'സർക്കാർ ക്ഷേമ പദ്ധതികൾ',
        'hero_badge': '● തത്സമയം: പരാതി പരിഹാര സംവിധാനം',
        'hero_headline': 'നിങ്ങളുടെ ശബ്ദം,<br>ശക്തമായി കേൾക്കുന്നു.',
        'hero_subtext': 'പൗരന്മാരെ സർക്കാരുമായി ബന്ധിപ്പിക്കുന്ന AI വേദി. ശബ്ദത്തിലൂടെ പരാതി നൽകുക.',
        'hero_btn_file': 'പരാതി നൽകുക',
        'hero_btn_track': 'സ്റ്റാറ്റസ് കാണുക',
        'card_voice_title': 'വോയിസ്-ടു-ടിക്കറ്റ്',
        'card_voice_desc': 'നിങ്ങളുടെ പ്രശ്നം പറയുക. ഞങ്ങളുടെ AI അത് രേഖപ്പെടുത്തുന്നു.',
        'card_auto_title': 'ഓട്ടോ പ്രയോറിറ്റി',
        'card_auto_desc': 'വൈദ്യുതി തടസ്സം പോലുള്ള അടിയന്തിര പ്രശ്നങ്ങൾക്ക് മുൻഗണന.',
        'scheme_1_title': 'പ്രധാനമന്ത്രി ആവാസ് യോജന',
        'scheme_1_desc': 'എല്ലാവർക്കും താങ്ങാവുന്ന ഭവനം. വായ്പയ്ക്ക് സബ്സിഡി.',
        'scheme_2_desc': 'കുടുംബത്തിന് പ്രതിവർഷം ₹5 ലക്ഷം വരെ സൗജന്യ ചികിത്സ.',
        'scheme_3_desc': 'കർഷക കുടുംബങ്ങൾക്ക് വർഷം ₹6,000 ധനസഹായം.',
        'scheme_4_desc': 'അസംഘടിത തൊഴിലാളികൾക്കുള്ള പെൻഷൻ പദ്ധതി.',
        'hero_title': 'നിങ്ങളുടെ ശബ്ദം,<br>ഞങ്ങളുടെ നടപടി.',
        'hero_subtitle': 'പൗരന്മാരും ഭരണകൂടവും തമ്മിലുള്ള വിടവ് നികത്തുന്ന വേദി.',
        'btn_file_grievance': 'പരാതി നൽകുക',
        'btn_how_it_works': 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു',
        'login_welcome': 'തിരികെ സ്വാഗതം',
        'email_label': 'ഇമെയിൽ വിലാസം',
        'password_label': 'പാസ്‌വേഡ്',
        'name_label': 'മുഴുവൻ പേര്',
        'login_btn': 'ലോഗിൻ / സൈനപ്പ്',
        'login_footer': 'അക്കൗണ്ട് ഇല്ലേ? വിഷമിക്കേണ്ട, ഞങ്ങൾ പുതിയത് ഉണ്ടാക്കും.',
        'dash_title_prefix': 'ഡാഷ്‌ബോർഡ് - ',
        'dash_logout': 'ലോഗ് ഔട്ട്',
        'dash_file_grievance': 'പുതിയ പരാതി നൽകുക',
        'dash_track_title': 'പരാതി ട്രാക്ക് ചെയ്യുക',
        'dash_pincode': 'പിൻ കോഡ്',
        'dash_desc': 'പരാതി വിവരണം',
        'dash_type_speak': '(ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക)',
        'dash_detected_sector': 'കണ്ടെത്തിയ വിഭാഗം (ഓട്ടോ)',
        'dash_attachment': 'അറ്റാച്ച്മെന്റ് (ഐച്ഛികം)',
        'dash_submit_btn': 'പരാതി സമർപ്പിക്കുക',
        'dash_history_title': 'നിങ്ങളുടെ പരാതികൾ',
        'dash_record_btn': '🎤 റെക്കോർഡ്',
        'dash_loading': 'നിങ്ങളുടെ ചരിത്രം ലോഡ് ചെയ്യുന്നു...',
        'pincode_placeholder': 'ഉദാ. 695001',
        'desc_placeholder': 'നിങ്ങളുടെ പ്രശ്നം വിവരിക്കുക... ഉദാ., "പ്രധാന റോഡിൽ കുഴി ഉണ്ട്."',
        'track_placeholder': 'പരാതി ID നൽകുക',
        'sector_roads': 'റോഡുകൾ',
        'sector_electricity': 'വൈദ്യുതി',
        'sector_water': 'വെള്ളം',
        'sector_health': 'ആരോഗ്യം',
        'sector_education': 'വിദ്യാഭ്യാസം',
        'sector_police': 'പോലീസ്',
        'sector_welfare': 'ക്ഷേമം',
        'sector_other': 'മറ്റുള്ളവ',
        'dash_title_prefix': 'ഡാഷ്‌ബോർഡ് - ',
        'chat_welcome': 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ പരാതി സഹായിയാണ്. എനിക്ക് എങ്ങനെ സഹായിക്കാനാകും?',
        'chat_input_placeholder': 'ഇവിടെ ടൈപ്പ് ചെയ്യുക...',
        'priority_high': 'ഉയർന്നത്',
        'priority_medium': 'ഇടത്തരം',
        'priority_low': 'കുറഞ്ഞത്',
        'priority_label': 'മുൻഗണന',
        'status_submitted': 'സമർപ്പിച്ചു',
        'status_assigned': 'ഏൽപ്പിച്ചു',
        'status_in_progress': 'നടന്നുകൊണ്ടിരിക്കുന്നു',
        'status_resolved': 'പരിഹരിച്ചു',
        'id_label': 'ഐഡി'
    }
};

function changeLanguage(lang) {
    const selectedData = translations[lang];
    if (!selectedData) return;

    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (selectedData[key]) {
            // Check if it's text or HTML content we want to replace
            if (el.children.length > 0 && el.tagName !== 'BUTTON') {
                // If element has children (like the Hero title with <br>), try to preserve structure if possible
                el.innerHTML = selectedData[key];
            } else {
                el.innerText = selectedData[key];
            }
        }
    });

    // Translate placeholders
    document.querySelectorAll('[data-placeholder]').forEach(el => {
        const key = el.getAttribute('data-placeholder');
        if (selectedData[key]) {
            el.placeholder = selectedData[key];
        }
    });

    // Re-render complaints if on dashboard to apply new language
    if (window.location.pathname.includes('dashboard')) {
        loadUserComplaints();
    }

    // Re-render admin dashboard if on admin page
    if (window.location.pathname.includes('admin')) {
        location.reload(); // Simple reload to re-run the DOMContentLoaded script with new language
    }
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if on dashboard to load complaints
    if (window.location.pathname.includes('dashboard')) {
        loadUserComplaints();
        const userName = localStorage.getItem('name');
        if (userName && document.getElementById('user-name')) {
            document.getElementById('user-name').innerText = userName;
        }
    }

    // Add particle effect
    createParticles();
});

function createParticles() {
    const container = document.querySelector('.particles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const div = document.createElement('div');
        div.className = 'particle';
        div.style.left = Math.random() * 100 + '%';
        div.style.animationDuration = (Math.random() * 10 + 5) + 's';
        div.style.width = div.style.height = (Math.random() * 10 + 5) + 'px';
        container.appendChild(div);
    }
}
