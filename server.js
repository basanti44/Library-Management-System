const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database.js");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'frontend' directory
app.use(express.static('frontend'));

// --- Helper function for logging admin actions ---
const logAdminAction = (adminUsername, action, targetType, targetId) => {
    const sql = `INSERT INTO admin_logs (adminUsername, action, targetType, targetId) VALUES (?, ?, ?, ?)`;
    db.run(sql, [adminUsername, action, targetType, targetId], (err) => {
        if (err) {
            console.error("Failed to log admin action:", err.message);
        }
    });
};

// --- Middleware for Admin Auth ---
const checkAdmin = (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    const adminUsername = req.headers['x-admin-username'];

    if (userRole === 'admin' && adminUsername) {
        req.adminUsername = adminUsername; // Attach username to the request object
        next();
    } else {
        res.status(403).json({ "error": "Forbidden: Admin access required or admin user not identified." });
    }
};


// --- API Endpoints ---

// User Registration
app.post("/api/register", (req, res) => {
    const { fullName, email, username, password } = req.body;
    const joinDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const insert = 'INSERT INTO users (fullName, email, username, password, joinDate) VALUES (?,?,?,?,?)';

    db.run(insert, [fullName, email, username, password, joinDate], function(err) {
        if (err) {
            res.status(400).json({ "error": "Username or email already exists." });
            return;
        }
        res.json({ "message": "success", "data": { id: this.lastID } });
    });
});

// User Login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id, username, fullName, email, joinDate, booksBorrowed, isAdmin FROM users WHERE username = ? AND password = ?";
    db.get(sql, [username, password], (err, user) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (user) {
            res.json({ "message": "success", "data": user });
        } else {
            res.status(401).json({ "error": "Invalid username or password" });
        }
    });
});

// Get All Books (Public)
app.get("/api/books", (req, res) => {
    const sql = "SELECT * FROM books ORDER BY title";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

// Search Books (Public)
app.get("/api/books/search", (req, res) => {
    const query = req.query.q.toLowerCase();
    const sql = "SELECT * FROM books WHERE lower(title) LIKE ? OR lower(id) LIKE ?";
    const params = [`%${query}%`, `%${query}%`];
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

// Issue a Book
app.post("/api/issue", (req, res) => {
    const { bookId, memberId } = req.body;

    db.serialize(() => {
        db.get("SELECT * FROM books WHERE id = ? AND isAvailable = 1", [bookId], (err, book) => {
            if (err) return res.status(500).json({ "error": err.message });
            if (!book) return res.status(400).json({ "error": "Book not found or already issued." });

            const updateBook = "UPDATE books SET isAvailable = 0 WHERE id = ?";
            db.run(updateBook, [bookId], function(err) {
                if (err) return res.status(500).json({ "error": err.message });

                const addTransaction = "INSERT INTO transactions (bookId, username, issueDate) VALUES (?,?,?)";
                db.run(addTransaction, [bookId, memberId, new Date().toISOString()], function(err) {
                     if (err) return res.status(500).json({ "error": err.message });

                    const updateUser = "UPDATE users SET booksBorrowed = booksBorrowed + 1 WHERE username = ?";
                    db.run(updateUser, [memberId], (err) => {
                         if (err) return res.status(500).json({ "error": err.message });
                         res.json({ "message": "Book issued successfully." });
                    });
                });
            });
        });
    });
});


// Return a Book
app.post("/api/return", (req, res) => {
    const { bookId, memberId } = req.body;

     db.serialize(() => {
        db.get("SELECT * FROM books WHERE id = ? AND isAvailable = 0", [bookId], (err, book) => {
            if (err) return res.status(500).json({ "error": err.message });
            if (!book) return res.status(400).json({ "error": "Book not found or was not issued." });

            const updateBook = "UPDATE books SET isAvailable = 1 WHERE id = ?";
            db.run(updateBook, [bookId], function(err) {
                if (err) return res.status(500).json({ "error": err.message });

                const updateTransaction = "UPDATE transactions SET returnDate = ? WHERE bookId = ? AND username = ? AND returnDate IS NULL";
                db.run(updateTransaction, [new Date().toISOString(), bookId, memberId], function(err) {
                    if (err) return res.status(500).json({ "error": err.message });
                    
                    const updateUser = "UPDATE users SET booksBorrowed = booksBorrowed - 1 WHERE username = ? AND booksBorrowed > 0";
                    db.run(updateUser, [memberId], (err) => {
                        if (err) return res.status(500).json({ "error": err.message });
                        res.json({ "message": "Book returned successfully." });
                    });
                });
            });
        });
    });
});

// Get User Profile
app.get("/api/user/:username", (req, res) => {
    const sql = "SELECT id, username, fullName, email, joinDate, booksBorrowed, isAdmin FROM users WHERE username = ?";
    db.get(sql, [req.params.username], (err, user) => {
        if (err) return res.status(400).json({ "error": err.message });
        if (user) {
            res.json({ "message": "success", "data": user });
        } else {
            res.status(404).json({ "error": "User not found" });
        }
    });
});

// Get books borrowed by a user
app.get("/api/user/:username/books", (req, res) => {
    const sql = `
        SELECT b.id, b.title, b.author, t.issueDate 
        FROM books b
        JOIN transactions t ON b.id = t.bookId
        WHERE t.username = ? AND t.returnDate IS NULL
    `;
    db.all(sql, [req.params.username], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

// --- ADMIN ENDPOINTS ---

// Get all users (Admin only)
app.get("/api/admin/users", checkAdmin, (req, res) => {
    const sql = "SELECT id, username, fullName, email, joinDate, booksBorrowed, isAdmin FROM users ORDER BY fullName";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

// Get admin logs (Admin only)
app.get("/api/admin/logs", checkAdmin, (req, res) => {
    const sql = "SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 50";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

// Get all transactions (Admin only)
app.get("/api/admin/transactions", checkAdmin, (req, res) => {
    const sql = `
        SELECT 
            t.id,
            b.title as bookTitle,
            u.fullName as userName,
            t.issueDate,
            t.returnDate
        FROM transactions t
        JOIN books b ON t.bookId = b.id
        JOIN users u ON t.username = u.username
        ORDER BY t.issueDate DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

// Add a new book (Admin only)
app.post("/api/admin/books", checkAdmin, (req, res) => {
    const { id, title, author, year, isAvailable } = req.body;
    const sql = `INSERT INTO books (id, title, author, year, isAvailable) VALUES (?,?,?,?,?)`;
    db.run(sql, [id, title, author, year, isAvailable ? 1 : 0], function(err) {
        if (err) return res.status(400).json({ "error": "Book ID already exists." });
        logAdminAction(req.adminUsername, 'ADD_BOOK', 'book', id);
        res.status(201).json({ "message": "success", "data": { id: this.lastID } });
    });
});

// Update a book (Admin only)
app.put("/api/admin/books/:id", checkAdmin, (req, res) => {
    const { title, author, year } = req.body;
    const sql = `UPDATE books SET title = ?, author = ?, year = ? WHERE id = ?`;
    db.run(sql, [title, author, year, req.params.id], function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        logAdminAction(req.adminUsername, 'UPDATE_BOOK', 'book', req.params.id);
        res.json({ "message": "Book updated successfully.", "changes": this.changes });
    });
});

// Delete a book (Admin only)
app.delete("/api/admin/books/:id", checkAdmin, (req, res) => {
    const sql = 'DELETE FROM books WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ "error": "Book not found."});
        logAdminAction(req.adminUsername, 'DELETE_BOOK', 'book', req.params.id);
        res.json({ "message": "Book deleted successfully.", changes: this.changes });
    });
});

// Update a user (Admin only)
app.put("/api/admin/users/:id", checkAdmin, (req, res) => {
    const { fullName, email, username } = req.body;
    const sql = `UPDATE users SET fullName = ?, email = ?, username = ? WHERE id = ?`;
    db.run(sql, [fullName, email, username, req.params.id], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.status(400).json({ "error": "Username or email already in use." });
            }
            return res.status(400).json({ "error": err.message });
        }
        logAdminAction(req.adminUsername, 'UPDATE_USER', 'user', req.params.id);
        res.json({ "message": "User updated successfully.", "changes": this.changes });
    });
});


// Make a user an admin (Admin only)
app.put("/api/admin/users/:id/make-admin", checkAdmin, (req, res) => {
    const sql = `UPDATE users SET isAdmin = 1 WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        logAdminAction(req.adminUsername, 'MAKE_ADMIN', 'user', req.params.id);
        res.json({ "message": "User updated to admin." });
    });
});

// Delete a user (Admin only)
app.delete("/api/admin/users/:id", checkAdmin, (req, res) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ "error": "User not found."});
        logAdminAction(req.adminUsername, 'DELETE_USER', 'user', req.params.id);
        res.json({ "message": "User deleted successfully." });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

