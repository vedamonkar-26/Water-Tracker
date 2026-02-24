const home = document.getElementById("home"),
    tracker = document.getElementById("tracker"),
    about = document.getElementById("about"),
    contact = document.getElementById("contact"),
    loginPage = document.getElementById("loginPage"),
    registerPage = document.getElementById("registerPage"),
    logoutBtn = document.getElementById("logoutBtn");

let chart;

// Helper function for navigating views
function showSection(s) {
    [home, tracker, about, contact, loginPage, registerPage].forEach(sec => sec.style.display = "none");
    s.style.display = "block";
    window.scrollTo(0, 0);
}

// --- INITIAL STATE AND NAVIGATION ---
async function checkLoginStatus() {
    // Attempt to fetch data on load - if successful, the session is active.
    const response = await fetch('tracker_api.php?action=fetch_data', { method: 'GET' });
    const result = await response.json();

    if (result.success) {
        // User is logged in
        loadUserData(result.data);
        showSection(tracker);
        logoutBtn.style.display = "block";
    } else {
        // User is not logged in
        showSection(home);
        logoutBtn.style.display = "none";
    }
}

function requireLogin(s) {
    // If attempting to access tracker, perform server check
    if (s === tracker) {
        checkLoginStatus().then(() => {
            // Check if it's still showing the home screen after check
            if (tracker.style.display !== 'block') {
                alert("Please log in to access the Water Tracker.");
                showSection(loginPage);
            }
        });
    } else {
        showSection(s);
    }
}

document.getElementById("navHome").onclick = () => showSection(home);
document.getElementById("navTracker").onclick = () => requireLogin(tracker);
document.getElementById("navAbout").onclick = () => showSection(about);
document.getElementById("navLogin").onclick = () => showSection(loginPage);
document.getElementById("navRegister").onclick = () => showSection(registerPage);
document.getElementById("heroTracker").onclick = () => requireLogin(tracker);
document.getElementById("navContact").onclick = () => showSection(contact);

// Run initial check on page load
checkLoginStatus();

// --- DATA HANDLER: Loads target and previous usage from server ---
let weeklyTarget = 0;
let previousTotalUsage = null;
const dateDisplay = document.getElementById("dateDisplay");

if (dateDisplay) {
    const today = new Date(),
        days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    dateDisplay.textContent = `📅 ${days[today.getDay()]}, ${today.toLocaleDateString()}`;
}

function loadUserData(data) {
    weeklyTarget = data.target || 0;
    previousTotalUsage = data.last_usage;

    // Update target input field and message
    if (document.getElementById("target")) {
        document.getElementById("target").value = weeklyTarget > 0 ? weeklyTarget : '';
        document.getElementById("profileText").innerText = `Welcome, ${data.user_name || 'User'}! Target: ${weeklyTarget} L.`;
    }
}

// --- REGISTRATION ---
document.getElementById("registerBtn").onclick = async () => {
    const name = document.getElementById("regName").value.trim(),
        email = document.getElementById("regEmail").value.trim(),
        pass = document.getElementById("regPass").value.trim();

    if (name === "" || email === "" || pass === "") {
        alert("⚠️ Please fill out all fields.");
        return;
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passRegex.test(pass)) {
        alert("🔒 Password must be at least 6 characters long and include:\n- 1 uppercase letter\n- 1 lowercase letter\n- 1 number\n- 1 special character (@$!%*?&)");
        return;
    }

    const formData = new FormData();
    formData.append('action', 'register');
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', pass);

    const response = await fetch('auth.php', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();

    alert(result.message);
    if (result.success) {
        showSection(loginPage);
    }
};

// --- LOGIN ---
document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim(),
        pass = document.getElementById("loginPass").value.trim();

    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', email);
    formData.append('password', pass);

    const response = await fetch('auth.php', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();

    alert(result.message);
    if (result.success) {
        loadUserData({ user_name: result.user_name });
        logoutBtn.style.display = "block";
        showSection(tracker);
    }
};

// --- LOGOUT ---
logoutBtn.onclick = async () => {
    const response = await fetch('tracker_api.php?action=logout');
    const result = await response.json();
    
    alert(result.message);
    logoutBtn.style.display = "none";
    weeklyTarget = 0; // Reset client-side state
    showSection(home);
};

// --- SET TARGET (sends to server) ---
async function setManualTarget() {
    const t = Number(document.getElementById("target").value);
    if (t > 0) {
        const formData = new FormData();
        formData.append('action', 'set_target');
        formData.append('target', t);

        const response = await fetch('tracker_api.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            weeklyTarget = t;
            alert(`✅ Weekly target set to ${t} L`);
            // Recalculate if values are already filled
            if(document.getElementById("household").value) calculateWater(); 
        } else {
            alert("❌ Failed to set target: " + result.message);
        }
    } else {
        alert("Please enter a valid target.");
    }
}
window.setManualTarget = setManualTarget; // Expose globally

// --- WATER CALCULATION AND SAVE (sends to server) ---
async function calculateWater() {
    // ... (Your existing calculation logic remains here)
    const ids = ["household", "showers", "duration", "flushes", "laundry", "dishwasher", "brushing", "lawn"];
    const vals = {};
    for (const id of ids) {
        vals[id] = Number(document.getElementById(id).value);
        if (isNaN(vals[id]) || vals[id] < 0) {
            alert("Please enter all valid positive values.");
            return;
        }
    }
    const { household: people, showers, duration, flushes, laundry, dishwasher, brushing, lawn } = vals;

    const showerUse = showers * duration * 9 * people;
    const flushUse = flushes * 6 * people * 7;
    const laundryUse = laundry * 70;
    const dishwasherUse = dishwasher * 15;
    const brushingUse = brushing * 3 * people * 7;
    const lawnUse = lawn * 15;
    const total = Math.round(showerUse + flushUse + laundryUse + dishwasherUse + brushingUse + lawnUse);

    document.getElementById("resultText").innerText = `Estimated Weekly Use: ${total} Liters`;
    document.getElementById("profileText").innerText = `Your household of ${people} people uses approximately ${total} liters per week.`;
    
    // Comparison Logic now uses previousTotalUsage fetched from server
    let msg = "";
    if (previousTotalUsage !== null) {
        const diff = Math.round(total - previousTotalUsage);
        if (total < previousTotalUsage) msg = `🌿 Great job! You used ${Math.abs(diff)} L less than last time.`;
        else if (total > previousTotalUsage) msg = `⚠️ You used ${diff} L more than last time.`;
        else msg = "No change from last time.";
    }
    document.getElementById("compareText").innerText = msg;

    // Progress Bar Logic
    if (weeklyTarget > 0) {
        const prog = Math.min((total / weeklyTarget) * 100, 100);
        document.getElementById("progressText").innerText = `Progress: ${prog.toFixed(1)}% of your target (${weeklyTarget} L)`;

        const progressBar = document.getElementById("progressBar");
        progressBar.style.width = `${prog}%`;

        if (prog < 75) progressBar.style.background = "#1a73e8"; // blue
        else if (prog < 100) progressBar.style.background = "#f6b93b"; // orange
        else progressBar.style.background = "#e74c3c"; // red

        if (total > weeklyTarget) console.log(`Target exceeded: ${total} L`);
    } else {
        document.getElementById("progressText").innerText = "Set a weekly target to track progress.";
    }

    // --- SAVE TO SERVER ---
    const formData = new FormData();
    formData.append('action', 'save_usage');
    formData.append('total_usage', total);

    const saveResponse = await fetch('tracker_api.php', {
        method: 'POST',
        body: formData
    });
    const saveResult = await saveResponse.json();
    if (!saveResult.success) {
        console.error("Failed to save usage data to database:", saveResult.message);
    }
    // Update previous total usage for next calculation
    previousTotalUsage = total; 

    // Save inputs locally for convenience (not required for backend, but nice UX)
    ids.forEach(id => localStorage.setItem(id, document.getElementById(id).value));

    // Chart Update (remains the same)
    const ctx = document.getElementById("waterChart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Showers", "Flushes", "Laundry", "Dishwasher", "Brushing", "Lawn"],
            datasets: [{
                label: "Water Usage (Liters per Week)",
                data: [showerUse, flushUse, laundryUse, dishwasherUse, brushingUse, lawnUse],
                backgroundColor: ["#1a73e8", "#4fc3f7", "#81c784", "#ffb74d", "#ba68c8", "#e57373"]
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // Personalized Tips Generation (remains the same)
    const tipsBox = document.getElementById("tipsBox"), tipsList = document.getElementById("tipsList");
    tipsList.innerHTML = ""; tipsBox.style.display = "block";
    const tips = [];
    if (duration > 8) tips.push("Reduce shower time to save water.");
    if (flushes > 3) tips.push("Try dual-flush or fewer flushes daily.");
    if (laundry > 7) tips.push("Run full laundry loads only.");
    if (dishwasher > 5) tips.push("Use eco mode or full loads.");
    if (brushing > 5) tips.push("Turn off tap while brushing!");
    if (lawn > 30) tips.push("Water early to reduce evaporation.");
    if (weeklyTarget > 0 && total > weeklyTarget) tips.push("You exceeded your target — track more closely next week!");
    if (tips.length === 0) tips.push("Great job! Your usage is balanced.");
    tips.forEach(t => { const li = document.createElement("li"); li.textContent = t; tipsList.appendChild(li); });

    if (tracker.style.display === "block") logoutBtn.style.display = "block";
}
window.calculateWater = calculateWater;



// CONTACT SECTION (unchanged)
function sendMessage() {
    // ... (Your existing sendMessage logic remains the same)
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const msg = document.getElementById("contactMessage").value.trim();

    if (!name || !email || !msg) {
        alert("Please fill all fields before sending.");
        return;
    }

    document.getElementById("contactResponse").innerText = "✅ Message sent successfully! We'll get back to you soon.";
    document.getElementById("contactName").value = "";
    document.getElementById("contactEmail").value = "";
    document.getElementById("contactMessage").value = "";
}
window.sendMessage = sendMessage;
