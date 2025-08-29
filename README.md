# library-management-system

📚 Library Management System (C++ Project)

This project implements the core structure of a Library Management System using C++ and various custom data structures.
The system is designed to handle user interactions, library operations, and book records efficiently while ensuring data persistence using file handling.

🔑 Key Modules
1) 👤 User Management

Handles user sign-in with authentication.

Includes forgot password functionality.

Sign-up validation with username and email uniqueness check.

Email & password validation rules applied during registration.

Separate admin sign-in panel for privileged operations.

Implemented using a custom Dynamic Array for user storage.

2) 📖 Activity Management

Tracks all user and admin activities in the system.

Activities include:

Borrowing a book (with book details, genre, date, and time).

Returning a book (recorded with timestamps).

Implemented using a custom Stack, enabling Last-In-First-Out (LIFO) activity tracking.

3) ⏳ Waiting List Management

Maintains a waiting list for each book when it is unavailable.

Ensures fair access by handling requests in First-Come, First-Served (FCFS) order.

Implemented using a custom Queue.

4) 🏛️ Library Management

Core book management operations:

Insertion of books into the system.

Deletion of books.

Book suggestions for users.

Traversing through available books efficiently.

Implemented using a Binary Search Tree (BST) for optimized searching and organization.

5) 💾 Data Persistence (File Handling)

Uses file handling to store and retrieve data.

Ensures that user accounts, book records, activities, and waiting lists are preserved between program runs.

Provides reliability and maintains system continuity.

🚀 Learning Outcomes

Practical implementation of Data Structures (Dynamic Array, Stack, Queue, BST).

Improved understanding of file handling for data storage.

Handling real-world system functionalities such as authentication, book management, and logging activities.

Bridging theoretical data structures with practical system design.

📂 Project Structure

User Management → Dynamic Array

Activity Management → Stack

Waiting List → Queue

Library Management → Binary Search Tree

Data Storage → File Handling

🌟 Additional Highlights

Modular and scalable design.

Focused on real-world scenarios of a library system.

Improves efficiency with optimized searching and data handling.

Ensures fairness in book borrowing via queues.

Maintains a history of user actions using stacks.
