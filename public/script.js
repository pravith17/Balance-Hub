let state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null,
    transactions: [],
    pieChartInstance: null
};

let otpState = {
    mode: 'register',
    email: ''
};

// API Base URL
const API_URL = '/api';

// DOM Elements
const app = document.getElementById('app');
const authSection = document.getElementById('auth-section');
const registerSection = document.getElementById('register-section');
const mainLayout = document.getElementById('main-layout');

// UTILS
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getStatusBadge(status) {
    switch(status) {
        case 'CONFIRMED': return '<span class="badge-status bg-success">Confirmed</span>';
        case 'UNCONFIRMED': return '<span class="badge-status bg-warning">Pending</span>';
        case 'DISPUTED': return '<span class="badge-status bg-danger">Disputed</span>';
        case 'SETTLED': return '<span class="badge-status bg-primary">Settled</span>';
        default: return `<span class="badge-status bg-secondary">${status}</span>`;
    }
}

async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API Error');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// INITIALIZATION
function init() {
    setupEventListeners();
    setupThemeToggle();
    checkAuthStatus();
}

function checkAuthStatus() {
    if (state.token && state.user) {
        showView('main-layout');
        loadDashboard();
        updateProfileUI();
        loadNotifications();
    } else {
        showView('auth-section');
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showSubView(viewId) {
    document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    // Update Nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const targetLink = document.querySelector(`.nav-link[data-target="${viewId}"]`);
    if (targetLink) targetLink.classList.add('active');
}

// AUTHENTICATION
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await apiCall('/auth/login', 'POST', { identifier, password });
        if (res.success) {
            state.token = res.token;
            state.user = res.user;
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            showToast('Login successful');
            checkAuthStatus();
        }
    } catch (e) {}
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        firstName: document.getElementById('reg-fn').value,
        lastName: document.getElementById('reg-ln').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        dob: document.getElementById('reg-dob').value,
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value
    };

    try {
        const res = await apiCall('/auth/register', 'POST', payload);
        if (res.success) {
            showToast(res.message || 'OTP sent to your email', 'success');
            otpState.mode = 'register';
            otpState.email = payload.email;
            document.getElementById('otp-title').textContent = 'Verify Email';
            document.getElementById('otp-subtitle').textContent = `Enter the 6-digit code sent to ${payload.email}`;
            document.getElementById('otp-new-password-group').classList.add('hidden');
            document.getElementById('otp-new-password').required = false;
            document.getElementById('otp-form').reset();
            showView('otp-section');
        }
    } catch (e) {}
});

// Forgot Password Form
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        try {
            const res = await apiCall('/auth/forgot-password', 'POST', { email });
            if (res.success) {
                showToast('OTP sent to your email', 'success');
                otpState.mode = 'forgot';
                otpState.email = email;
                document.getElementById('otp-title').textContent = 'Reset Password';
                document.getElementById('otp-subtitle').textContent = `Enter the 6-digit code sent to ${email}`;
                document.getElementById('otp-new-password-group').classList.remove('hidden');
                document.getElementById('otp-new-password').required = true;
                document.getElementById('otp-form').reset();
                showView('otp-section');
            }
        } catch (e) {}
    });
}

// OTP Form
const otpForm = document.getElementById('otp-form');
if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('otp-code').value;
        
        try {
            if (otpState.mode === 'register') {
                const res = await apiCall('/auth/verify-registration', 'POST', { email: otpState.email, otp });
                if (res.success) {
                    showToast('Registration successful!', 'success');
                    state.token = res.token;
                    state.user = res.user;
                    localStorage.setItem('token', res.token);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    checkAuthStatus();
                    otpForm.reset();
                }
            } else if (otpState.mode === 'forgot') {
                const newPassword = document.getElementById('otp-new-password').value;
                const res = await apiCall('/auth/reset-password', 'POST', { email: otpState.email, otp, newPassword });
                if (res.success) {
                    showToast('Password reset successfully! Please log in.', 'success');
                    showView('auth-section');
                    otpForm.reset();
                }
            }
        } catch (e) {}
    });
}

document.getElementById('logout-btn').addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuthStatus();
});

document.getElementById('logout-btn-mobile').addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuthStatus();
});

// NAVIGATION
function setupEventListeners() {
    // Auth Toggles
    const linkReg = document.getElementById('link-register');
    const linkLog = document.getElementById('link-login');
    const linkForgot = document.getElementById('link-forgot-password');
    
    const linkForgotBack = document.getElementById('link-forgot-back');
    const linkOtpBack = document.getElementById('link-otp-back');
    
    if(linkReg) linkReg.addEventListener('click', () => showView('register-section'));
    if(linkLog) linkLog.addEventListener('click', () => showView('auth-section'));
    if(linkForgot) linkForgot.addEventListener('click', (e) => { e.preventDefault(); showView('forgot-password-section'); });
    if(linkForgotBack) linkForgotBack.addEventListener('click', (e) => { e.preventDefault(); showView('auth-section'); });
    if(linkOtpBack) linkOtpBack.addEventListener('click', (e) => { e.preventDefault(); showView('auth-section'); });

    // Auto-generate username suggestion
    const regFn = document.getElementById('reg-fn');
    const regLn = document.getElementById('reg-ln');
    const regUsername = document.getElementById('reg-username');

    const generateUsername = () => {
        if (!regUsername.value || regUsername.dataset.auto === 'true') {
            const first = regFn.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const last = regLn.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (first || last) {
                const rand = Math.floor(10 + Math.random() * 90);
                regUsername.value = `${first}${last ? '_' + last : ''}${rand}`;
                regUsername.dataset.auto = 'true';
            } else {
                regUsername.value = '';
            }
        }
    };
    
    if(regFn && regLn && regUsername) {
        regFn.addEventListener('input', generateUsername);
        regLn.addEventListener('input', generateUsername);
        regUsername.addEventListener('input', () => {
            regUsername.dataset.auto = 'false'; // User manually typed, stop auto-suggesting
        });
    }

    // Sidebar Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            showSubView(target);
            if (target === 'dashboard-view') loadDashboard();
            if (target === 'transactions-view') loadTransactions();
            if (target === 'statements-view') loadStatements();
            if (target === 'profile-view') loadProfile();
        });
    });

    // Modals
    const openLoanModal = () => document.getElementById('modal-new-loan').classList.add('active');
    document.getElementById('btn-new-loan').addEventListener('click', openLoanModal);
    document.getElementById('btn-add-person').addEventListener('click', openLoanModal);

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Chat Actions
    document.getElementById('btn-back-chat').addEventListener('click', () => {
        showSubView('dashboard-view');
        state.currentChatUserId = null;
    });

    document.getElementById('btn-chat-pay').addEventListener('click', () => {
        document.getElementById('loan-type-select').value = 'lent'; // I am sending money
        document.getElementById('search-user-input').value = state.currentChatUserName;
        document.getElementById('selected-user-id').value = state.currentChatUserId;
        openLoanModal();
    });

    document.getElementById('btn-chat-give').addEventListener('click', () => {
        document.getElementById('loan-type-select').value = 'borrowed'; // I am requesting money
        document.getElementById('search-user-input').value = state.currentChatUserName;
        document.getElementById('selected-user-id').value = state.currentChatUserId;
        openLoanModal();
    });

    // Search User Input
    let searchTimeout;
    document.getElementById('search-user-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value;
        const resultsBox = document.getElementById('search-results');
        const extForm = document.getElementById('external-user-form');
        
        if (query.length < 3) {
            resultsBox.classList.add('hidden');
            extForm.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await apiCall(`/users/search?query=${query}`);
                resultsBox.innerHTML = '';
                if (res.data.length > 0) {
                    extForm.classList.add('hidden');
                    resultsBox.classList.remove('hidden');
                    res.data.forEach(u => {
                        const div = document.createElement('div');
                        div.className = 'dropdown-item';
                        div.textContent = `${u.firstName} ${u.lastName} (${u.phone})`;
                        div.onclick = () => {
                            document.getElementById('search-user-input').value = div.textContent;
                            document.getElementById('selected-user-id').value = u._id;
                            resultsBox.classList.add('hidden');
                        };
                        resultsBox.appendChild(div);
                    });
                } else {
                    resultsBox.classList.add('hidden');
                    extForm.classList.remove('hidden');
                    document.getElementById('ext-phone').value = isNaN(query) ? '' : query;
                }
            } catch (err) {}
        }, 500);
    });

    // Add External Contact
    document.getElementById('btn-add-external').addEventListener('click', async () => {
        const payload = {
            firstName: document.getElementById('ext-fn').value,
            lastName: document.getElementById('ext-ln').value,
            phone: document.getElementById('ext-phone').value
        };
        try {
            const res = await apiCall('/users/external', 'POST', payload);
            if (res.success) {
                document.getElementById('search-user-input').value = `${res.data.firstName} ${res.data.lastName}`;
                document.getElementById('selected-user-id').value = res.data._id;
                document.getElementById('external-user-form').classList.add('hidden');
                showToast('External contact added');
            }
        } catch (e) {}
    });

    // Create Loan
    document.getElementById('new-loan-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const direction = document.getElementById('loan-type-select').value;
        const payload = {
            targetUser: document.getElementById('selected-user-id').value,
            amount: parseFloat(document.getElementById('loan-amount').value),
            description: document.getElementById('loan-desc').value,
            direction: direction
        };
        try {
            const res = await apiCall('/transactions', 'POST', payload);
            if (res.success) {
                showToast('Loan request sent');
                document.getElementById('modal-new-loan').classList.remove('active');
                e.target.reset();
                loadTransactions();
                loadDashboard();
                refreshCurrentChat();
            }
        } catch (e) {}
    });
}

// THEME TOGGLE
function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const toggleBtnAuth = document.getElementById('theme-toggle-auth');
    const toggleBtnMobile = document.getElementById('theme-toggle-mobile');
    const toggleBtnTopbar = document.getElementById('theme-toggle-topbar');
    
    const setTheme = (isDark) => {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') setTheme(true);

    const handleToggle = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(!isDark);
    };

    toggleBtn.addEventListener('click', handleToggle);
    toggleBtnAuth.addEventListener('click', handleToggle);
    if (toggleBtnMobile) toggleBtnMobile.addEventListener('click', handleToggle);
    if (toggleBtnTopbar) toggleBtnTopbar.addEventListener('click', handleToggle);
}

// PROFILE UI
function updateProfileUI() {
    if (!state.user) return;
    document.getElementById('topbar-name').textContent = state.user.username;
    if (state.user.profilePhoto) {
        document.getElementById('topbar-avatar').src = state.user.profilePhoto;
    } else {
        document.getElementById('topbar-avatar').src = `https://ui-avatars.com/api/?name=${state.user.firstName}+${state.user.lastName}`;
    }
}

// NOTIFICATIONS
async function loadNotifications() {
    try {
        const res = await apiCall('/notifications');
        const badge = document.getElementById('notif-badge');
        const unreadCount = res.data.filter(n => !n.isRead).length;
        badge.textContent = unreadCount;
        
        // Populate dropdown
        const dropdown = document.getElementById('notif-dropdown');
        dropdown.innerHTML = '';
        res.data.forEach(n => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = `<p class="text-sm ${n.isRead ? 'text-muted' : ''}">${n.message}</p>`;
            if (!n.isRead) {
                div.onclick = async () => {
                    await apiCall(`/notifications/${n._id}/read`, 'PUT');
                    loadNotifications();
                };
            }
            dropdown.appendChild(div);
        });

        document.getElementById('notif-btn').onclick = () => {
            dropdown.classList.toggle('hidden');
        };
    } catch (e) {}
}

// DASHBOARD
async function loadDashboard() {
    try {
        const res = await apiCall('/transactions/dashboard');
        const stats = res.data;
        
        document.getElementById('stat-given').textContent = `₹${stats.totalGiven.toFixed(2)}`;
        document.getElementById('stat-taken').textContent = `₹${stats.totalTaken.toFixed(2)}`;
        document.getElementById('stat-pending-given').textContent = `₹${stats.pendingGiven.toFixed(2)}`;
        document.getElementById('stat-pending-taken').textContent = `₹${stats.pendingTaken.toFixed(2)}`;

        loadContacts();

        renderPieChart(stats.totalGiven, stats.totalTaken);

        // Fetch recent activity
        const txRes = await apiCall('/transactions');
        state.transactions = txRes.data;
        const recentList = document.getElementById('recent-activity-list');
        recentList.innerHTML = '';
        
        txRes.data.slice(0, 5).forEach(tx => {
            const isGiven = tx.fromUser._id === state.user.id;
            const otherUser = isGiven ? tx.toUser : tx.fromUser;
            const actionText = tx.type === 'LOAN' ? (isGiven ? 'Lent to' : 'Borrowed from') : (isGiven ? 'Paid to' : 'Received from');
            
            recentList.innerHTML += `
                <div class="activity-item">
                    <div>
                        <p class="font-bold">${actionText} ${otherUser.firstName}</p>
                        <p class="text-sm text-muted">${formatDate(tx.createdAt)}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold ${isGiven ? 'text-danger' : 'text-success'}">${isGiven ? '-' : '+'}₹${tx.amount.toFixed(2)}</p>
                        ${getStatusBadge(tx.status)}
                    </div>
                </div>
            `;
        });

    } catch (e) {}
}

function renderPieChart(given, taken) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    if (state.pieChartInstance) {
        state.pieChartInstance.destroy();
    }
    
    // Fallback values if both are 0
    if (given === 0 && taken === 0) {
        given = 1; taken = 1; // Just to show the chart
    }

    state.pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Given', 'Taken'],
            datasets: [{
                data: [given, taken],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: 'var(--text-color)' } }
            }
        }
    });
}

// TRANSACTIONS
async function loadTransactions() {
    try {
        const res = await apiCall('/transactions');
        state.transactions = res.data;
        renderTransactionTable(res.data);
    } catch (e) {}
}

function renderTransactionTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';

    transactions.forEach(tx => {
        const isGiven = tx.fromUser._id === state.user.id;
        const otherUser = isGiven ? tx.toUser : tx.fromUser;
        const amIOwner = tx.createdBy === state.user.id;
        
        let actionsHtml = '';
        if (tx.status === 'UNCONFIRMED' && !amIOwner) {
            actionsHtml = `
                <button class="btn btn-sm btn-primary" onclick="confirmTx('${tx._id}')">Confirm</button>
                <button class="btn btn-sm btn-danger" onclick="disputeTx('${tx._id}')">Dispute</button>
            `;
        } else if (tx.status === 'CONFIRMED' && tx.type === 'LOAN') {
            // Only person who owes money (fromUser or toUser depending on loan)
            // A loan means: fromUser lent to toUser. toUser owes money.
            if (tx.toUser._id === state.user.id) {
                actionsHtml = `<button class="btn btn-sm btn-secondary" onclick="openRepayModal('${tx._id}')">Repay</button>`;
            }
        }

        let proofHtml = '';
        if (tx.proofOfPayment) {
            proofHtml = `<div class="mt-1"><a href="${tx.proofOfPayment}" target="_blank" class="btn btn-sm btn-secondary flex-align" style="display:inline-flex; padding:0.25rem 0.5rem;"><span class="material-symbols-outlined mr-1" style="font-size:16px;">image</span> View Proof</a></div>`;
        }

        tbody.innerHTML += `
            <tr>
                <td data-label="Date">${formatDate(tx.createdAt)}</td>
                <td data-label="Transaction">
                    ${isGiven ? 'To: ' : 'From: '} ${otherUser.firstName} ${otherUser.lastName}
                    <div class="text-sm text-muted">${tx.type === 'REPAYMENT' ? '<strong>[Repayment]</strong> ' : ''}${tx.description}</div>
                    ${proofHtml}
                </td>
                <td data-label="Type">${tx.type}</td>
                <td data-label="Amount" class="font-bold ${isGiven ? 'text-danger' : 'text-success'}">${isGiven ? '-' : '+'}₹${tx.amount.toFixed(2)}</td>
                <td data-label="Status">${getStatusBadge(tx.status)}</td>
                <td data-label="Actions">${actionsHtml}</td>
            </tr>
        `;
    });
}

// Transaction Actions
window.confirmTx = async (id) => {
    if(confirm('Are you sure you want to confirm this transaction?')) {
        try {
            await apiCall(`/transactions/${id}/confirm`, 'PUT');
            showToast('Transaction confirmed');
            loadTransactions();
            loadDashboard();
            refreshCurrentChat();
        } catch(e) {}
    }
};

window.disputeTx = async (id) => {
    if(confirm('Are you sure you want to dispute this transaction?')) {
        try {
            await apiCall(`/transactions/${id}/dispute`, 'PUT');
            showToast('Transaction disputed');
            loadTransactions();
            loadDashboard();
            refreshCurrentChat();
        } catch(e) {}
    }
};

window.openRepayModal = (id) => {
    document.getElementById('repay-loan-id').value = id;
    document.getElementById('modal-repay').classList.add('active');
};

document.getElementById('repay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('repay-loan-id').value;
    const amount = document.getElementById('repay-amount').value;
    const proofFile = document.getElementById('repay-proof').files[0];

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('description', 'Partial Repayment');
    if (proofFile) formData.append('proof', proofFile);

    try {
        const res = await apiCall(`/transactions/${id}/repay`, 'POST', formData, true);
        if (res.success) {
            showToast('Repayment submitted');
            document.getElementById('modal-repay').classList.remove('active');
            e.target.reset();
            loadTransactions();
            loadDashboard();
            refreshCurrentChat();
        }
    } catch(e) {}
});

// STATEMENTS & EXPORT
async function loadStatements() {
    await loadTransactions(); // Refresh data
    renderStatementsTable(state.transactions);
}

function renderStatementsTable(transactions) {
    const tbody = document.getElementById('statements-table-body');
    tbody.innerHTML = '';
    transactions.forEach(tx => {
        tbody.innerHTML += `
            <tr>
                <td data-label="Date">${formatDate(tx.createdAt)}</td>
                <td data-label="Description">${tx.description}</td>
                <td data-label="Amount">₹${tx.amount.toFixed(2)}</td>
                <td data-label="Status">${tx.status}</td>
            </tr>
        `;
    });
}

document.getElementById('filter-month').addEventListener('change', (e) => {
    const monthStr = e.target.value; // YYYY-MM
    if (!monthStr) return renderStatementsTable(state.transactions);
    
    const filtered = state.transactions.filter(tx => tx.createdAt.startsWith(monthStr));
    renderStatementsTable(filtered);
});

document.getElementById('filter-status').addEventListener('change', (e) => {
    const status = e.target.value;
    if (!status) return renderStatementsTable(state.transactions);
    
    const filtered = state.transactions.filter(tx => tx.status === status);
    renderStatementsTable(filtered);
});

// EXPORTS
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Statement Report", 14, 15);
    
    // Simple table using text
    let y = 30;
    state.transactions.forEach((tx, i) => {
        if(y > 280) { doc.addPage(); y = 20; }
        doc.text(`${formatDate(tx.createdAt)} - ${tx.description} - ₹${tx.amount} - ${tx.status}`, 14, y);
        y += 10;
    });
    
    doc.save("statement.pdf");
});

document.getElementById('btn-export-excel').addEventListener('click', () => {
    const data = state.transactions.map(tx => ({
        Date: formatDate(tx.createdAt),
        Type: tx.type,
        Description: tx.description,
        Amount: tx.amount,
        Status: tx.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Statements");
    XLSX.writeFile(workbook, "statements.xlsx");
});

// PROFILE
async function loadProfile() {
    try {
        const res = await apiCall('/users/profile');
        const user = res.data;
        
        state.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        updateProfileUI();
        
        document.getElementById('profile-page-name').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profile-page-acc').textContent = `Account: ${user.accountNumber}`;
        document.getElementById('prof-fn').value = user.firstName;
        document.getElementById('prof-ln').value = user.lastName;
        if(user.dob) document.getElementById('prof-dob').value = user.dob.split('T')[0];
        if(user.profilePhoto) document.getElementById('profile-page-avatar').src = user.profilePhoto;
    } catch(e) {}
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('firstName', document.getElementById('prof-fn').value);
    formData.append('lastName', document.getElementById('prof-ln').value);
    formData.append('dob', document.getElementById('prof-dob').value);
    
    const photo = document.getElementById('prof-photo').files[0];
    if (photo) formData.append('profilePhoto', photo);

    try {
        const res = await apiCall('/users/profile', 'PUT', formData, true);
        if (res.success) {
            showToast('Profile updated');
            await loadProfile();
            // Automatically reload the page as requested by user to ensure all instances reflect change
            // Keeping this for profile ONLY, as profile updates are rare and affect global UI
            setTimeout(() => {
                window.location.reload();
            }, 800);
        }
    } catch(e) {}
});

// CHAT & CONTACTS (Google Pay Style)
async function loadContacts() {
    try {
        const res = await apiCall('/transactions/contacts');
        const container = document.getElementById('people-list');
        container.innerHTML = '';
        
        if (res.data.length === 0) {
            container.innerHTML = '<div class="text-center text-muted w-100">No contacts yet. Start transacting!</div>';
            return;
        }

        res.data.forEach(contact => {
            const u = contact.user;
            const bal = contact.netBalance;
            if (!state.contactsMap) state.contactsMap = {};
            state.contactsMap[u._id] = contact;
            
            const div = document.createElement('div');
            div.className = 'person-item';
            div.innerHTML = `
                <img src="${u.profilePhoto || `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}`}" class="person-avatar">
                <span class="person-name">${u.firstName}</span>
            `;
            div.onclick = () => openChat(u, bal);
            container.appendChild(div);
        });
    } catch(e) {}
}

async function openChat(user, netBalance) {
    state.currentChatUserId = user._id;
    state.currentChatUserName = `${user.firstName} ${user.lastName}`;
    
    // Setup Header
    document.getElementById('chat-name').textContent = state.currentChatUserName;
    document.getElementById('chat-phone').textContent = user.phone;
    document.getElementById('chat-avatar').src = user.profilePhoto || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`;
    
    const balEl = document.getElementById('chat-net-balance');
    if (netBalance > 0) {
        balEl.textContent = `They owe you ₹${netBalance}`;
        balEl.className = 'font-bold text-success';
    } else if (netBalance < 0) {
        balEl.textContent = `You owe ₹${Math.abs(netBalance)}`;
        balEl.className = 'font-bold text-danger';
    } else {
        balEl.textContent = 'Settled Up';
        balEl.className = 'font-bold text-muted';
    }

    showSubView('chat-view');
    await loadChatHistory(user._id);
}

async function loadChatHistory(userId) {
    try {
        const res = await apiCall(`/transactions/chat/${userId}`);
        const container = document.getElementById('chat-feed-container');
        container.innerHTML = '';
        
        res.data.forEach(tx => {
            const isMe = tx.fromUser._id === state.user.id;
            
            // Format GPay style text
            let text = '';
            if (tx.type === 'LOAN') {
                text = isMe ? 'Payment to them' : 'Payment to you';
            } else if (tx.type === 'REPAYMENT') {
                text = isMe ? 'You repaid them' : 'They repaid you';
            }

            const isReceived = (!isMe && tx.type === 'LOAN') || (isMe && tx.type === 'REPAYMENT');
            const bubbleClass = isMe ? 'sent' : 'received';
            const icon = tx.status === 'CONFIRMED' ? '<span class="material-symbols-outlined" style="font-size:14px; color:var(--success-color)">check_circle</span>' : '<span class="material-symbols-outlined" style="font-size:14px; color:var(--warning-color)">pending</span>';

            let actionBtnsHtml = '';
            if (tx.status === 'UNCONFIRMED' && tx.createdBy !== state.user.id) {
                actionBtnsHtml = `
                    <div style="margin-top: 10px;">
                        <button class="btn btn-sm btn-primary" onclick="confirmTx('${tx._id}')">Confirm</button>
                        <button class="btn btn-sm btn-danger" onclick="disputeTx('${tx._id}')">Dispute</button>
                    </div>
                `;
            }

            const div = document.createElement('div');
            div.className = `chat-bubble ${bubbleClass}`;
            div.innerHTML = `
                <div>${text}</div>
                <div class="chat-amount">₹${tx.amount}</div>
                <div class="chat-meta">
                    <span style="display:flex; align-items:center; gap:4px;">${icon} ${tx.status === 'CONFIRMED' ? 'Paid' : 'Pending'}</span>
                    <span>${formatDate(tx.createdAt)}</span>
                </div>
                ${actionBtnsHtml}
            `;
            container.appendChild(div);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    } catch(e) {}
}

async function refreshCurrentChat() {
    if (!state.currentChatUserId) return;
    await loadContacts(); // Updates state.contactsMap
    await loadChatHistory(state.currentChatUserId); // Refreshes bubbles
    
    // Update Header Balance
    if (state.contactsMap && state.contactsMap[state.currentChatUserId]) {
        const bal = state.contactsMap[state.currentChatUserId].netBalance;
        const balEl = document.getElementById('chat-net-balance');
        if (bal > 0) {
            balEl.textContent = `They owe you ₹${bal}`;
            balEl.className = 'font-bold text-success';
        } else if (bal < 0) {
            balEl.textContent = `You owe ₹${Math.abs(bal)}`;
            balEl.className = 'font-bold text-danger';
        } else {
            balEl.textContent = 'Settled Up';
            balEl.className = 'font-bold text-muted';
        }
    }
}

// BOOTSTRAP
init();
