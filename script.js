// --- Configuration ---
const API_BASE_URL = 'http://localhost:3000/api';

// --- DOM Elements ---
const authModal = document.getElementById("authModal");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const closeModalBtn = document.querySelector(".close-modal");
const loginHeaderBtn = document.getElementById("loginHeaderBtn");
const registerHeaderBtn = document.getElementById("registerHeaderBtn");
const adminLoginHeaderBtn = document.getElementById("adminLoginHeaderBtn");
const getStartedBtn = document.getElementById("getStartedBtn");
const ctaGetStartedBtn = document.getElementById("ctaGetStartedBtn");
const landingPage = document.getElementById("landingPage");
const dashboard = document.getElementById("dashboard");
const loadingSpinner = document.getElementById('loadingSpinner');
const adminNavBtn = document.getElementById('adminNavBtn');

// Modals and Forms
const editBookModal = document.getElementById('editBookModal');
const closeEditBookModalBtn = document.getElementById('closeEditBookModal');
const editBookForm = document.getElementById('editBookForm');
const addBookForm = document.getElementById('addBookForm');
const editUserModal = document.getElementById('editUserModal');
const closeEditUserModalBtn = document.getElementById('closeEditUserModal');
const editUserForm = document.getElementById('editUserForm');

// Confirmation Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');


// --- UI Helper Functions ---

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function showSpinner() { loadingSpinner.classList.remove('hidden'); }
function hideSpinner() { loadingSpinner.classList.add('hidden'); }

function showConfirmModal(title, message, onConfirm) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.style.display = 'flex';

    // Clone and replace the button to remove old event listeners
    const newConfirmYesBtn = confirmYesBtn.cloneNode(true);
    confirmYesBtn.parentNode.replaceChild(newConfirmYesBtn, confirmYesBtn);
    
    newConfirmYesBtn.onclick = () => {
        onConfirm();
        confirmModal.style.display = 'none';
    };
}

// --- API Helper Function ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    showSpinner();
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        const headers = { 'Content-Type': 'application/json' };
        if (user && user.isAdmin) {
            headers['x-user-role'] = 'admin';
            headers['x-admin-username'] = user.username;
        }

        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'An unknown error occurred');
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return true;
        }
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        console.error('API Request Error:', error);
        return null;
    } finally {
        hideSpinner();
    }
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = sessionStorage.getItem("currentUser");
    if (currentUser) {
        showDashboard(JSON.parse(currentUser));
    }

    document.querySelectorAll("nav a, .footer-column a").forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const href = this.getAttribute("href");
            if (href && href.startsWith("#")) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    window.scrollTo({ top: targetElement.offsetTop - 80, behavior: "smooth" });
                }
            }
        });
    });

    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showToast('Edit functionality is coming soon!', 'info');
    });

    confirmNoBtn.addEventListener('click', () => confirmModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == confirmModal) confirmModal.style.display = "none";
    });
});


// --- Auth Modal & Forms ---

[loginHeaderBtn, registerHeaderBtn, getStartedBtn, ctaGetStartedBtn, adminLoginHeaderBtn].forEach(btn => {
    btn.addEventListener("click", () => authModal.style.display = "flex");
});

adminLoginHeaderBtn.addEventListener("click", () => {
    switchTab('login');
    document.getElementById("username").value = "admin";
    document.getElementById("password").value = "admin123";
});

closeModalBtn.addEventListener("click", () => authModal.style.display = "none");
window.addEventListener("click", (event) => {
    if (event.target === authModal) authModal.style.display = "none";
});

loginTab.addEventListener("click", () => switchTab('login'));
registerTab.addEventListener("click", () => switchTab('register'));

function switchTab(tabName) {
    const isLogin = tabName === 'login';
    loginTab.classList.toggle('active', isLogin);
    registerTab.classList.toggle('active', !isLogin);
    loginForm.classList.toggle('active', isLogin);
    registerForm.classList.toggle('active', !isLogin);
}

registerForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        showToast("Passwords do not match!", 'error');
        return;
    }

    const result = await apiRequest('/register', 'POST', { fullName, email, username, password });
    if (result) {
        showToast("Registration successful! Please log in.", 'success');
        registerForm.reset();
        switchTab('login');
    }
});

loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    const result = await apiRequest('/login', 'POST', { username, password });
    if (result && result.data) {
        sessionStorage.setItem("currentUser", JSON.stringify(result.data));
        showDashboard(result.data);
        authModal.style.display = "none";
        loginForm.reset();
    }
});

// --- Dashboard ---

function showDashboard(user) {
    landingPage.style.display = "none";
    dashboard.style.display = "block";

    if (user.isAdmin) {
        adminNavBtn.classList.remove('hidden');
    } else {
        adminNavBtn.classList.add('hidden');
    }

    updateProfileInfo(user.username);
    updateDashboardStats();
    showToast(`Welcome back, ${user.fullName}!`, 'info');
}

async function updateProfileInfo(username) {
    const result = await apiRequest(`/user/${username}`);
    if (result && result.data) {
        const user = result.data;
        document.getElementById("profileName").textContent = user.fullName;
        document.getElementById("profileUsername").textContent = user.username;
        document.getElementById("profileEmail").textContent = user.email;
        document.getElementById("profileDate").textContent = user.joinDate;
        document.getElementById("profileBooks").textContent = user.booksBorrowed;
        
        // Update session storage with the latest user data, preserving isAdmin status
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const updatedUser = { ...currentUser, ...user };
        sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
    }
}


async function updateDashboardStats() {
    const result = await apiRequest('/books');
    if (result && result.data) {
        const books = result.data;
        const totalBooks = books.length;
        const availableBooks = books.filter(b => b.isAvailable).length;
        const issuedBooks = totalBooks - availableBooks;

        document.getElementById('totalBooksStat').textContent = totalBooks;
        document.getElementById('issuedBooksStat').textContent = issuedBooks;
        document.getElementById('availableBooksStat').textContent = availableBooks;
    }
}


// Dashboard Navigation
const navButtons = document.querySelectorAll(".nav-btn");
const contentSections = document.querySelectorAll(".section");

navButtons.forEach((button) => {
    button.addEventListener("click", async function () {
        const targetId = this.getAttribute("data-target");
        navButtons.forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        contentSections.forEach((section) => section.classList.remove("active"));
        document.getElementById(targetId).classList.add("active");

        if (targetId === "overview") await updateDashboardStats();
        if (targetId === "display") await displayAllBooks();
        if (targetId === "admin") await loadAdminPanel();
        if (targetId === "profile") {
            const user = JSON.parse(sessionStorage.getItem('currentUser'));
            await updateProfileInfo(user.username);
            await displayUserBorrowedBooks(user.username);
        }
    });
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    dashboard.style.display = "none";
    landingPage.style.display = "block";
    adminNavBtn.classList.add('hidden');
    showToast("You have been logged out.", 'info');
});


// --- Library Functions ---
document.getElementById("searchBtn").addEventListener("click", async () => {
    const searchTerm = document.getElementById("searchInput").value;
    if (!searchTerm) {
        showToast("Please enter a search term.", "warning");
        return;
    }
    const result = await apiRequest(`/books/search?q=${searchTerm}`);
    if (result) displayBooks(result.data, "searchResults");
});

async function displayAllBooks() {
    const result = await apiRequest('/books');
    if (result) displayBooks(result.data, "allBooks");
}

document.getElementById("issueForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const bookId = document.getElementById("issueBookId").value;
    const memberId = document.getElementById("memberId").value;
    const result = await apiRequest('/issue', 'POST', { bookId, memberId });
    if(result) {
        showToast(result.message, 'success');
        updateDashboardStats();
        this.reset();
    }
});

document.getElementById("returnForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const bookId = document.getElementById("returnBookId").value;
    const memberId = document.getElementById("returnMemberId").value;
    const result = await apiRequest('/return', 'POST', { bookId, memberId });
     if(result) {
        showToast(result.message, 'success');
        updateDashboardStats();
        this.reset();
    }
});

// --- Admin Panel Functions ---
async function loadAdminPanel() {
    const usersResult = await apiRequest('/admin/users');
    if (usersResult && usersResult.data) {
        renderUsersTable(usersResult.data);
    }
    const booksResult = await apiRequest('/books');
    if (booksResult && booksResult.data) {
        renderBooksTable(booksResult.data);
    }
    const logsResult = await apiRequest('/admin/logs');
    if (logsResult && logsResult.data) {
        renderAdminLogsTable(logsResult.data);
    }
    const transactionsResult = await apiRequest('/admin/transactions');
    if (transactionsResult && transactionsResult.data) {
        renderTransactionsTable(transactionsResult.data);
    }
}

addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const book = {
        id: document.getElementById('addBookId').value,
        title: document.getElementById('addBookTitle').value,
        author: document.getElementById('addBookAuthor').value,
        year: document.getElementById('addBookYear').value,
        isAvailable: true
    };
    const result = await apiRequest('/admin/books', 'POST', book);
    if (result) {
        showToast('Book added successfully!', 'success');
        addBookForm.reset();
        loadAdminPanel();
        updateDashboardStats();
    }
});

async function makeUserAdmin(id, username) {
    showConfirmModal('Make Admin', `Are you sure you want to make '${username}' an admin?`, async () => {
        const result = await apiRequest(`/admin/users/${id}/make-admin`, 'PUT');
        if (result) {
            showToast(`User '${username}' is now an admin.`, 'success');
            loadAdminPanel();
        }
    });
}

async function deleteUser(id, username) {
     showConfirmModal('Delete User', `Are you sure you want to delete user '${username}'? This action cannot be undone.`, async () => {
        const result = await apiRequest(`/admin/users/${id}`, 'DELETE');
        if (result) {
            showToast(`User '${username}' has been deleted.`, 'success');
            loadAdminPanel();
        }
    });
}

// --- DOM Rendering ---
function displayBooks(books, containerId) {
    const container = document.getElementById(containerId);
    if (!books || books.length === 0) {
        container.innerHTML = '<p class="info-message">No books found.</p>';
        return;
    }
    let html = '<div class="book-list">';
    books.forEach((book) => {
        const availabilityClass = book.isAvailable ? "status-available" : "status-borrowed";
        const availabilityText = book.isAvailable ? "Available" : "Borrowed";
        html += `
        <div class="book-card">
            <div class="book-title">${book.title}</div>
            <div class="book-info"><strong>ID:</strong> ${book.id}</div>
            <div class="book-info"><strong>Author:</strong> ${book.author}</div>
            <div class="book-info"><strong>Year:</strong> ${book.year}</div>
            <div class="book-info"><strong>Status:</strong> <span class="${availabilityClass}">${availabilityText}</span></div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
}

async function displayUserBorrowedBooks(username) {
    const result = await apiRequest(`/user/${username}/books`);
    const container = document.getElementById('borrowedBooksList');
    
    if (result && result.data && result.data.length > 0) {
        const books = result.data;
        let html = '';
        books.forEach(book => {
            const issueDate = new Date(book.issueDate).toLocaleDateString();
            html += `<div class="borrowed-book-item">
                        <div class="book-icon"><i class="fas fa-book"></i></div>
                        <div class="borrowed-book-details">
                            <div class="title">${book.title}</div>
                            <div class="author">by ${book.author}</div>
                        </div>
                        <div class="issue-date">Issued on: ${issueDate}</div>
                    </div>`;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p class="info-message">No books currently borrowed.</p>';
    }
}

function renderUsersTable(users) {
    const container = document.getElementById('adminUsersTable');
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    let table = `<table><thead><tr><th>Full Name</th><th>Username</th><th>Actions</th></tr></thead><tbody>`;
    users.forEach(user => {
        const isAdmin = user.isAdmin === 1;
        const isCurrentUser = user.username === currentUser.username;
        const fullName = user.fullName.replace(/'/g, "\\'");
        const email = user.email.replace(/'/g, "\\'");
        const username = user.username.replace(/'/g, "\\'");
        let actions = '';
        if (!isCurrentUser) {
             actions += `<button class="btn-action btn-edit" onclick="openEditUserModal(${user.id}, '${fullName}', '${email}', '${username}')" title="Edit User"><i class="fas fa-user-edit"></i></button>`;
            if (!isAdmin) {
                 actions += `<button class="btn-action btn-make-admin" onclick="makeUserAdmin(${user.id}, '${user.username}')" title="Make Admin"><i class="fas fa-user-shield"></i></button>`;
            }
            actions += `<button class="btn-action btn-delete" onclick="deleteUser(${user.id}, '${user.username}')" title="Delete User"><i class="fas fa-trash"></i></button>`;
        } else {
            actions = '<span>(Current User)</span>'
        }
        table += `<tr><td>${user.fullName} ${isAdmin ? '<span class="admin-badge">Admin</span>': ''}</td><td>${user.username}</td><td class="actions-cell">${actions}</td></tr>`;
    });
    table += `</tbody></table>`;
    container.innerHTML = table;
}

function renderBooksTable(books) {
    const container = document.getElementById('adminBooksTable');
    let table = `<table><thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Actions</th></tr></thead><tbody>`;
    books.forEach(book => {
        const title = book.title.replace(/'/g, "\\'"); // Escape single quotes
        const author = book.author.replace(/'/g, "\\'");
        table += `<tr>
            <td>${book.id}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" onclick="openEditModal('${book.id}', '${title}', '${author}', '${book.year}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    table += `</tbody></table>`;
    container.innerHTML = table;
}

function renderAdminLogsTable(logs) {
    const container = document.getElementById('adminLogsTable');
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="info-message">No admin activity recorded yet.</p>';
        return;
    }
    let table = `<table><thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Timestamp</th></tr></thead><tbody>`;
    logs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        table += `<tr>
            <td>${log.adminUsername}</td>
            <td>${log.action.replace('_', ' ')}</td>
            <td>${log.targetType}: ${log.targetId}</td>
            <td>${timestamp}</td>
        </tr>`;
    });
    table += `</tbody></table>`;
    container.innerHTML = table;
}

function renderTransactionsTable(transactions) {
    const container = document.getElementById('adminTransactionsTable');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="info-message">No transactions found.</p>';
        return;
    }
    let table = `<table><thead><tr><th>Book Title</th><th>Issued To</th><th>Issued On</th><th>Returned On</th><th>Status</th></tr></thead><tbody>`;
    transactions.forEach(t => {
        const issueDate = new Date(t.issueDate).toLocaleString();
        const returnDate = t.returnDate ? new Date(t.returnDate).toLocaleString() : '—';
        const status = t.returnDate 
            ? '<span class="status-badge returned">Returned</span>' 
            : '<span class="status-badge issued">Issued</span>';
        
        table += `<tr>
            <td>${t.bookTitle}</td>
            <td>${t.userName}</td>
            <td>${issueDate}</td>
            <td>${returnDate}</td>
            <td>${status}</td>
        </tr>`;
    });
    table += `</tbody></table>`;
    container.innerHTML = table;
}


// --- Modal Functions ---

// Edit Book Modal
function openEditModal(id, title, author, year) {
    document.getElementById('editBookId').value = id;
    document.getElementById('editBookTitle').value = title;
    document.getElementById('editBookAuthor').value = author;
    document.getElementById('editBookYear').value = year;
    editBookModal.style.display = 'flex';
}

closeEditBookModalBtn.addEventListener('click', () => editBookModal.style.display = 'none');
window.addEventListener('click', (event) => {
    if (event.target == editBookModal) editBookModal.style.display = "none";
});

editBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const bookData = {
        title: document.getElementById('editBookTitle').value,
        author: document.getElementById('editBookAuthor').value,
        year: document.getElementById('editBookYear').value
    };
    const result = await apiRequest(`/admin/books/${id}`, 'PUT', bookData);
    if (result) {
        showToast('Book updated successfully!', 'success');
        editBookModal.style.display = 'none';
        loadAdminPanel();
    }
});

async function deleteBook(id) {
    showConfirmModal('Delete Book', `Are you sure you want to delete book ${id}?`, async () => {
        const result = await apiRequest(`/admin/books/${id}`, 'DELETE');
        if (result) {
            showToast('Book deleted successfully!', 'success');
            loadAdminPanel();
            updateDashboardStats();
        }
    });
}

// Edit User Modal
function openEditUserModal(id, fullName, email, username) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserFullName').value = fullName;
    document.getElementById('editUserEmail').value = email;
    document.getElementById('editUserUsername').value = username;
    editUserModal.style.display = 'flex';
}

closeEditUserModalBtn.addEventListener('click', () => editUserModal.style.display = 'none');
window.addEventListener('click', (event) => {
    if (event.target == editUserModal) editUserModal.style.display = "none";
});

editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const userData = {
        fullName: document.getElementById('editUserFullName').value,
        email: document.getElementById('editUserEmail').value,
        username: document.getElementById('editUserUsername').value
    };

    const result = await apiRequest(`/admin/users/${id}`, 'PUT', userData);
    if (result) {
        showToast('User updated successfully!', 'success');
        editUserModal.style.display = 'none';
        loadAdminPanel();
    }
});

