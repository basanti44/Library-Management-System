const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./library.db', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Database connected successfully.");
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                fullName TEXT,
                email TEXT UNIQUE,
                joinDate TEXT,
                booksBorrowed INTEGER DEFAULT 0,
                isAdmin INTEGER DEFAULT 0
            )
        `, (err) => {
            if (err) {
                console.error("Error creating users table", err);
            } else {
                // Add default admin and user if they don't exist
                const checkUserSql = `SELECT * FROM users WHERE username = ?`;
                db.get(checkUserSql, ['admin'], (err, row) => {
                    if (!row) {
                        const insertAdmin = `INSERT INTO users (username, password, fullName, email, joinDate, isAdmin) VALUES (?, ?, ?, ?, ?, ?)`;
                        db.run(insertAdmin, ['admin', 'admin123', 'System Administrator', 'admin@library.com', 'January 1, 2023', 1]);
                    }
                });
                 db.get(checkUserSql, ['librarian'], (err, row) => {
                    if (!row) {
                        const insertUser = `INSERT INTO users (username, password, fullName, email, joinDate) VALUES (?, ?, ?, ?, ?)`;
                        db.run(insertUser, ['librarian', 'lib123', 'Library Manager', 'librarian@library.com', 'February 15, 2023']);
                    }
                });
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                title TEXT,
                author TEXT,
                year INTEGER,
                isAvailable INTEGER
            )
        `, (err) => {
             if (err) {
                console.error("Error creating books table", err);
             } else {
                const checkBookSql = `SELECT COUNT(*) as count FROM books`;
                db.get(checkBookSql, (err, row) => {
                    if (row.count === 0) {
                        const books = [
                            { id: "B001", title: "Introduction to JavaScript", author: "John Doe", year: 2020, isAvailable: 1 },
                            { id: "B002", title: "CSS Mastery", author: "Jane Smith", year: 2019, isAvailable: 1 },
                            { id: "B003", title: "HTML5 Fundamentals", author: "Mike Johnson", year: 2021, isAvailable: 0 },
                            { id: "B004", title: "Web Development Basics", author: "Sarah Williams", year: 2018, isAvailable: 1 },
                            { id: "B005", title: "Advanced React", author: "David Brown", year: 2022, isAvailable: 1 },
                            { id: "B006", title: "Python for Beginners", author: "Emily Davis", year: 2020, isAvailable: 1 },
                            { id: "B007", title: "Data Structures & Algorithms", author: "Robert Wilson", year: 2019, isAvailable: 0 },
                            { id: "B008", title: "Machine Learning Basics", author: "Maria Garcia", year: 2021, isAvailable: 1 },
                            { id: "B009", title: "Database Management", author: "Laura Chen", year: 2020, isAvailable: 1 },
                            { id: "B010", title: "Cybersecurity Essentials", author: "James Smith", year: 2022, isAvailable: 1 }
                        ];
                        const insertBook = db.prepare('INSERT INTO books (id, title, author, year, isAvailable) VALUES (?, ?, ?, ?, ?)');
                        books.forEach(book => insertBook.run(book.id, book.title, book.author, book.year, book.isAvailable));
                        insertBook.finalize();
                    }
                });
             }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bookId TEXT,
                username TEXT,
                issueDate TEXT,
                returnDate TEXT
            )
        `);

        // New table for admin activity logs
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adminUsername TEXT,
                action TEXT,
                targetType TEXT,
                targetId TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

module.exports = db;

