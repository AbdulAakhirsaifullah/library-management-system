#include <iostream>
#include <fstream>
#include <string>
#include <conio.h>
#include <sstream>
#include <iomanip>
#include <cstdlib>
#include <limits>
#include <vector>
#include <windows.h>

using namespace std;

void clearScreen()
{
#ifdef _WIN32
    system("cls");
#endif
}

void printStyledMessage(const string &message)
{
    for (char ch : message)
    {
        cout << ch;
        cout.flush();
        Sleep(50);
    }
    cout << endl;
}

template <typename T>
class DynamicArray
{
private:
    T *arr;
    int size;
    int capacity;

    void resize()
    {
        T *temp = new T[capacity * 2];
        for (int i = 0; i < size; i++)
        {
            temp[i] = arr[i];
        }
        delete[] arr;
        arr = temp;
        capacity *= 2;
    }

public:
    DynamicArray(int initialCapacity = 4)
    {
        size = 0;
        capacity = initialCapacity;
        arr = new T[capacity];
    }

    ~DynamicArray()
    {
        delete[] arr;
    }

    void push_back(const T &value)
    {
        if (size == capacity)
        {
            resize();
        }
        arr[size++] = value;
    }

    T get(int index) const
    {
        if (index < 0 || index >= size)
        {
            throw out_of_range("Index out of range");
        }
        return arr[index];
    }

    int getSize() const
    {
        return size;
    }
};

class User
{
private:
    string username;
    string email;
    string password;

public:
    User() {}

    User(const string &uname, const string &mail, const string &pass)
        : username(uname), email(mail), password(pass) {}

    string getUsername() const { return username; }

    string getEmail() const { return email; }

    string getPassword() const { return password; }

    string serialize() const
    {
        return username + " " + email + " " + password + "\n";
    }

    static User deserialize(const string &line)
    {
        stringstream ss(line);
        string uname, mail, pass;

        ss >> uname >> mail >> pass;
        return User(uname, mail, pass);
    }
};

class Activity
{
private:
    string username;
    string bookTitle;
    string action;
    string timestamp;
    string genre;
    Activity *next;
    bool saved = false;

public:
    Activity(string username, string action, string bookTitle, string timestamp, string genre)
        : username(username), action(action), bookTitle(bookTitle), timestamp(timestamp), genre(genre)
    {
    }

    string getUsername() const { return username; }

    string getBookTitle() const { return bookTitle; }

    string getAction() const { return action; }

    string getTimestamp() const { return timestamp; }

    string serialize() const
    {
        return username + " " + action + " " + bookTitle + " " + genre + " " + timestamp + "\n";
    }

    void setNext(Activity *nextActivity) { next = nextActivity; }

    Activity *getNext() const { return next; }

    void display() const
    {
        cout << username << " "
             << bookTitle << " "
             << action << " on "
             << timestamp << endl;
    }
};

class ActivityStack
{
private:
    Activity *top;

public:
    ActivityStack() : top(nullptr) {}

    void push(const Activity &activity)
    {
        Activity *newNode = new Activity(activity);
        newNode->setNext(top);
        top = newNode;
        saveToFile(newNode);
    }

    void saveToFile(Activity *newActivity) const
    {
        ifstream inFile("activityLog.txt");
        string existingData;

        // Read the existing file content
        if (inFile.is_open())
        {
            string line;
            while (getline(inFile, line))
            {
                existingData += line + "\n";
            }
            inFile.close();
        }
        else
        {
            cerr << "Error opening file for reading: activityLog.txt" << endl;
        }

        ofstream outFile("activityLog.txt", ios::trunc); // Open with trunc to rewrite
        if (!outFile.is_open())
        {
            cerr << "Error opening file for writing: activityLog.txt" << endl;
            return;
        }

        // Write the new activity data
        outFile << newActivity->serialize();

        // Append the existing data
        outFile << existingData;

        outFile.close();
    }

    void display()
    {
        ifstream inFile("activityLog.txt");
        if (!inFile.is_open())
        {
            cerr << "Error opening file: activityLog.txt" << endl;
            return;
        }

        string line;
        cout << "Activity Log from File:" << endl;

        cout << string(120, '-') << endl;

        while (getline(inFile, line))
        {
            if (line.empty())
                continue;

            stringstream ss(line);
            string user, action, book, bookTitle, genre, timestamp;

            ss >> user >> action >> book >> bookTitle;

            getline(ss, genre, ',');

            if (!genre.empty() && genre[0] == ' ')
                genre.erase(0, 1);

            getline(ss, timestamp);

            if (!timestamp.empty() && timestamp[0] == ' ')
                timestamp.erase(0, 1);

            cout << user << " "
                 << action << " "
                 << bookTitle << " "
                 << genre << " "
                 << timestamp << endl;
        }

        inFile.close();
    }

    ~ActivityStack()
    {
        while (top != nullptr)
        {
            Activity *temp = top;
            top = top->getNext();
            delete temp;
        }
    }
};

class UserManagement
{
private:
    DynamicArray<User> users;
    const string filename = "users.txt";
    const string adminUsername = "Admin";
    const string adminPassword = "admin123";
    string currentUser;

    void loadUsersFromFile()
    {
        ifstream infile(filename);
        string line;
        while (getline(infile, line))
        {
            if (!line.empty())
            {
                users.push_back(User::deserialize(line));
            }
        }
    }

    void saveUsersToFile() const
    {
        ofstream outfile(filename);
        for (int i = 0; i < users.getSize(); i++)
        {
            outfile << users.get(i).serialize();
        }
    }

    bool usernameExists(const string &username) const
    {
        for (int i = 0; i < users.getSize(); i++)
        {
            if (users.get(i).getUsername() == username)
            {
                return true;
            }
        }
        return false;
    }

    bool emialExists(const string &email) const
    {
        for (int i = 0; i < users.getSize(); i++)
        {
            if (users.get(i).getEmail() == email)
            {
                return true;
            }
        }
        return false;
    }

    bool validPassword(const string &password)
    {
        bool hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (char ch : password)
        {
            if (isupper(ch))
                hasUpper = true;
            else if (islower(ch))
                hasLower = true;
            else if (isdigit(ch))
                hasDigit = true;
            else if (ispunct(ch))
                hasSpecial = true;
        }

        if (password.length() < 8 || !hasUpper || !hasLower || !hasDigit || !hasSpecial)
        {
            cout << "Password must contain at least one uppercase letter, one lowercase letter, "
                 << "one digit, one special character, and be at least 8 characters long.\n";
            return false;
        }
        return true;
    }

    bool validEmail(const string &email)
    {
        if (email.find("@gmail.com") == string::npos)
        {
            cout << "Invalid email format. Please enter a valid Gmail address." << endl;
            return false;
        }
        return true;
    }

public:
    UserManagement()
    {
        loadUsersFromFile();
        currentUser = "";
    }

    ~UserManagement()
    {
        saveUsersToFile();
    }

    void signUp()
    {
        string username, email, password;

        while (true)
        {
            cout << "Enter Username: ";
            cin.ignore();
            getline(cin, username);

            if (usernameExists(username))
            {
                cout << "Username already exists. Please choose a different username.\n";
                continue;
            }
            break;
        }

        while (true)
        {
            cout << "Enter Email: ";
            cin >> email;

            if (emialExists(email))
            {
                cout << "Email already exists. Please choose a different email.\n";
                continue;
            }

            if (!validEmail(email))
            {
                continue;
            }

            break;
        }

        while (true)
        {
            cout << "Enter Password: ";
            password = getPassword();

            if (!validPassword(password))
            {
                continue;
            }

            users.push_back(User(username, email, password));
            cout << "User registered successfully.\n";
            saveUsersToFile();
            break;
        }
        currentUser = username;
    }

    void signInAdmin()
    {
        string username, password;
        bool loggedIn = false;

        while (!loggedIn)
        {
            cout << "Enter Admin Username: ";
            cin >> username;
            cout << "Enter Password: ";
            password = getPassword();

            if (username == adminUsername && password == adminPassword)
            {
                printStyledMessage("Signning In...");
                Sleep(1000);
                clearScreen();
                loggedIn = true;
                currentUser = adminUsername;
                return;
            }

            cout << "Invalid admin username or password. Please try again.\n";
        }
    }

    void signInUser()
    {
        string username, password;
        bool loggedIn = false;

        while (!loggedIn)
        {
            cout << "Enter Username: ";
            cin >> username;
            cout << "Enter Password: ";
            password = getPassword();

            for (int i = 0; i < users.getSize(); i++)
            {
                if (users.get(i).getUsername() == username && users.get(i).getPassword() == password)
                {
                    printStyledMessage("Signning In...");
                    Sleep(1000);
                    clearScreen();
                    loggedIn = true;
                    currentUser = username;
                    return;
                }
            }

            cout << "Invalid Username or password.\n";

            string showPasswordChoice;
            while (true)
            {
                cout << "Would you like to see your password? (yes/no): ";
                getline(cin >> ws, showPasswordChoice);

                if (showPasswordChoice == "yes" || showPasswordChoice == "y")
                {
                    clearScreen();
                    cout << "Please enter your username: ";
                    getline(cin, username);

                    cout << "Please enter your email: ";
                    string email;
                    getline(cin, email);

                    bool found = false;
                    for (int i = 0; i < users.getSize(); i++)
                    {
                        if (users.get(i).getUsername() == username && users.get(i).getEmail() == email)
                        {
                            cout << "Your password is: " << users.get(i).getPassword() << endl;
                            found = true;
                            getch();
                            clearScreen();
                            break;
                        }
                    }

                    if (!found)
                    {
                        cout << "Username and email combination not found. Please check and try again.\n";
                    }
                }
                else if (showPasswordChoice == "no" || showPasswordChoice == "n")
                {
                    clearScreen();
                    break;
                }
                else
                {
                    cout << "Invalid input. Please enter 'yes' or 'no'.\n";
                }
            }
        }
    }

    string getPassword()
    {
        string password;
        char ch;
        while ((ch = _getch()) != 13)
        {
            if (ch == 8)
            {
                if (!password.empty())
                {
                    cout << "\b \b";
                    password.pop_back();
                }
            }
            else
            {
                cout << '*';
                password += ch;
            }
        }
        cout << endl;

        return password;
    }

    string getCurrentUser() const
    {
        return currentUser;
    }

    void adminActivityLog(ActivityStack &activityStack)
    {
        activityStack.display();
    }
};

class WaitingNode
{
public:
    string username;
    WaitingNode *next;

    WaitingNode(const string &user)
        : username(user), next(nullptr) {}
};

class WaitingList
{
private:
    WaitingNode *front;
    WaitingNode *rear;

    void saveUsernameToFile(const string &username)
    {
        ofstream file("waiting_list.txt", ios::app);
        if (file.is_open())
        {
            file << username << endl;
            file.close();
        }
        else
        {
            cerr << "Error: Unable to open file for writing." << endl;
        }
    }

public:
    WaitingList() : front(nullptr), rear(nullptr)
    {
        loadFromFile();
    }

    void enqueue(const string &username)
    {
        WaitingNode *newNode = new WaitingNode(username);

        if (rear)
        {
            rear->next = newNode;
        }
        rear = newNode;

        if (!front)
        {
            front = rear;
        }

        saveUsernameToFile(username);
        cout << "User added to waiting list: " << username << endl;
    }

    void loadFromFile()
    {
        ifstream file("waiting_list.txt");
        if (file.is_open())
        {
            string username;
            while (getline(file, username))
            {
                enqueueWithoutSaving(username);
            }
            file.close();
        }
        else
        {
            cerr << "Error: Unable to open file for reading." << endl;
        }
    }

    void enqueueWithoutSaving(const string &username)
    {
        WaitingNode *newNode = new WaitingNode(username);

        if (rear)
        {
            rear->next = newNode;
        }
        rear = newNode;

        if (!front)
        {
            front = rear;
        }
    }

    string dequeue()
    {
        if (!front)
            return "";

        WaitingNode *temp = front;
        string username = front->username;
        front = front->next;

        if (!front)
        {
            rear = nullptr;
        }

        delete temp;
        return username;
    }

    bool isEmpty() const
    {
        return front == nullptr;
    }

    string peek() const
    {
        return front ? front->username : "";
    }

    void display() const
    {
        if (isEmpty())
        {
            cout << "No users in the waiting list." << endl;
            return;
        }

        WaitingNode *current = front;

        cout << "Waiting List: ";
        while (current != nullptr)
        {
            cout << current->username << endl;
            current = current->next;
        }
        cout << endl;
    }

    ~WaitingList()
    {
        while (!isEmpty())
        {
            dequeue();
        }
    }
};

class BookNode
{
public:
    string id;
    string title;
    string author;
    string genre;
    bool available;
    string borrowed_by;
    BookNode *left;
    BookNode *right;
    WaitingList waitingList;
    int borrowCount;

    BookNode(string id, string title, string author, string genre, bool available = true)
        : id(id), title(title), author(author), genre(genre), available(available), borrowed_by(""), left(nullptr), right(nullptr), borrowCount(0)
    {
    }
};

class BookCatalog
{
private:
    BookNode *root;
    ActivityStack activitystack;

    void insert(BookNode *&node, string id, string title, string author, string genre, bool available = true)
    {
        if (node == nullptr)
        {
            node = new BookNode(id, title, author, genre, available);
        }
        else if (id < node->id)
        {
            insert(node->left, id, title, author, genre, available);
        }
        else if (id > node->id)
        {
            insert(node->right, id, title, author, genre, available);
        }
    }

    bool search_book_id_for_uniqness(BookNode *node, string id)
    {
        if (node == nullptr)
        {
            return false;
        }
        if (node->id == id)
        {
            return true;
        }
        if (id < node->id)
        {
            return search_book_id_for_uniqness(node->left, id);
        }
        return search_book_id_for_uniqness(node->right, id);
    }

    void inOrderWithIndex(BookNode *node, int &index) const
    {
        if (node)
        {
            inOrderWithIndex(node->left, index);

            cout << left << setw(5) << index++ << "|"
                 << setw(10) << node->id << "|"
                 << setw(20) << node->title << "|"
                 << setw(20) << node->author << "|"
                 << setw(15) << (node->available ? "Available" : "Borrowed") << "|"
                 << setw(15) << node->genre << endl;

            inOrderWithIndex(node->right, index);
        }
    }

    BookNode *removeBook(BookNode *node, string id)
    {
        if (node == nullptr)
        {
            cout << "Book not found." << endl;
            return node;
        }
        if (id < node->id)
        {
            node->left = removeBook(node->left, id);
        }
        else if (id > node->id)
        {
            node->right = removeBook(node->right, id);
        }
        else
        {
            if (node->left == nullptr && node->right == nullptr)
            {
                cout << "Book of id " << node->id << ", title " << node->title
                     << ", author " << node->author << ", genre " << node->genre
                     << " has been successfully deleted." << endl;
                delete node;
                return nullptr;
            }
            else if (node->left == nullptr)
            {
                BookNode *temp = node->right;
                cout << "Book of id " << node->id << ", title " << node->title
                     << ", author " << node->author << ", genre " << node->genre
                     << " has been successfully deleted." << endl;
                delete node;
                return temp;
            }
            else if (node->right == nullptr)
            {
                BookNode *temp = node->left;
                cout << "Book of id " << node->id << ", title " << node->title
                     << ", author " << node->author << ", genre " << node->genre
                     << " has been successfully deleted." << endl;
                delete node;
                return temp;
            }
            else
            {
                BookNode *successor = node->right;
                while (successor && successor->left != nullptr)
                {
                    successor = successor->left;
                }

                node->id = successor->id;
                node->title = successor->title;
                node->author = successor->author;
                node->available = successor->available;
                node->genre = successor->genre;

                node->right = removeBook(node->right, successor->id);
            }
        }
        return node;
    }

    BookNode *borrow_book_by_id(const string &id, const string &username)
    {

        BookNode *node = search_book_by_id(root, id);

        if (node != nullptr)
        {
            if (node->available)
            {
                node->available = false;
                node->borrowed_by = username;

                save_borrowed_book_to_file(id, node->title, username, node->genre);

                suggestBooksByGenre(node->genre, node->title);

                return node;
            }
            else
            {
                node->waitingList.enqueue(username);
                cout << username << " added to the waiting list for \"" << node->title << "\"." << endl;
            }
        }
        else
        {
            cout << "Book with ID \"" << id << "\" not found." << endl;
        }

        return nullptr;
    }

    BookNode *search_book_by_id(BookNode *node, string id)
    {
        if (node == nullptr || node->id == id)
        {
            return node;
        }
        else if (id < node->id)
        {
            return search_book_by_id(node->left, id);
        }
        else
        {
            return search_book_by_id(node->right, id);
        }
    }

    void return_book(const string &id)
    {
        BookNode *node = search_book_by_id(root, id);
        if (node == nullptr)
        {
            cout << "Book not found." << endl;
            return;
        }

        if (node->available)
        {
            cout << "Book was not borrowed." << endl;
            return;
        }

        node->available = true;
        cout << "Book '" << node->title << "' has been returned." << endl;

        remove_borrowed_book_from_file(id);

        notifyNextUser(node);
    }

    void Return_Book_By_User(const string &id, const string &username)
    {
        BookNode *node = search_book_by_id(root, id);
        if (node == nullptr)
        {
            cout << "Book not found." << endl;
            return;
        }

        if (node->available)
        {
            cout << "Book was not borrowed." << endl;
            return;
        }

        if (node->borrowed_by != username)
        {
            cout << "You cannot return a book you did not borrow." << endl;
            return;
        }

        node->available = true;
        node->borrowed_by = "";
        cout << "Book '" << node->title << "' has been returned." << endl;

        remove_borrowed_book_from_file(id);

        notifyNextUser(node);
    }

    void notifyNextUser(BookNode *node)
    {
        if (!node->waitingList.isEmpty())
        {
            string nextUser = node->waitingList.dequeue();
            cout << "Notifying " << nextUser << " that \"" << node->title << "\" is now available." << endl;
        }
    }

    void save_borrowed_book_to_file(const string &id, const string &title, const string &username, const string &genre)
    {
        ofstream file("borrowed_books.txt", ios::app);

        if (file.is_open())
        {
            file << "Book ID: " << id << ", Title: " << title << ", Genre: " << genre
                 << ", Borrowed by: " << username << endl;
            file.close();
        }
        else
        {
            cout << "Error: Could not open file to log borrowed book." << endl;
        }
    }

    void remove_borrowed_book_from_file(const string &id)
    {
        ifstream inputFile("borrowed_books.txt");
        ofstream tempFile("temp.txt");

        if (inputFile.is_open() && tempFile.is_open())
        {
            string line;
            bool found = false;

            while (getline(inputFile, line))
            {
                if (line.find("Book ID: " + id + ",") == string::npos)
                {
                    tempFile << line << endl;
                }
                else
                {
                    found = true;
                }
            }

            inputFile.close();
            tempFile.close();

            remove("borrowed_books.txt");
            rename("temp.txt", "borrowed_books.txt");
        }
        else
        {
            cout << "Error: Could not open file for returning book." << endl;
        }
    }

    void load_borrowed_books_from_file()
    {
        ifstream file("borrowed_books.txt");

        if (file.is_open())
        {
            string line;
            while (getline(file, line))
            {
                string id, title, username, genre;
                istringstream iss(line);

                iss.ignore(8);
                getline(iss, id, ',');
                iss.ignore(8);
                getline(iss, title, ',');
                iss.ignore(8);
                getline(iss, genre, ',');
                iss.ignore(13);
                getline(iss, username);

                BookNode *node = search_book_by_id(root, id);

                if (node != nullptr)
                {
                    node->available = false;

                    cout << "Book '" << node->title << "' of Genre '" << genre
                         << "' is marked as borrowed by " << username << "." << endl;
                }
            }

            file.close();
        }
        else
        {
            cout << "No borrowed books file found, starting with all books available." << endl;
        }
    }

    void saveToFile(BookNode *node, ofstream &file) const
    {
        if (node)
        {

            file << node->id << "," << node->title << "," << node->author << ","
                 << node->genre << "," << node->available << endl;
            saveToFile(node->left, file);
            saveToFile(node->right, file);
        }
    }

    void loadFromFile()
    {
        ifstream file("book_catalog.txt");

        if (!file.is_open())
        {
            cout << "File not found. Starting with an empty catalog." << endl;
            return;
        }

        string id, title, author, genre, availability;
        while (getline(file, id, ',') && getline(file, title, ',') && getline(file, author, ',') && getline(file, genre, ',') && getline(file, availability))
        {
            insert(root, id, title, author, genre, (availability == "1"));
        }
        file.close();
    }

    void clear(BookNode *node)
    {
        if (node)
        {
            clear(node->left);
            clear(node->right);
            delete node;
        }
    }

public:
    BookCatalog()
    {
        root = nullptr;
        loadFromFile();
        load_borrowed_books_from_file();
    }

    ~BookCatalog()
    {
        saveCatalog();
        clear(root);
    }

    void addBook()
    {
        string id, title, author, genre;
        while (true)
        {
            cout << "Enter book ID: ";
            cin >> id;
            if (search_book_id_for_uniqness(root, id))
            {
                cout << "Book with the same ID already exists." << endl;
            }
            else
            {
                break;
            }
        }
        cout << "Enter book title: ";
        cin.ignore();
        getline(cin, title);
        cout << "Enter book author: ";
        getline(cin, author);
        cout << "Enter book genre: ";
        getline(cin, genre);

        insert(root, id, title, author, genre);
        saveCatalog();
    }

    void removeBookById()
    {
        string id;
        cout << "Enter the ID of the book to remove: ";
        cin >> id;
        root = removeBook(root, id);
        saveCatalog();
    }

    void borrow_book(const string &id, const string &username)
    {
        BookNode *borrowedBook = borrow_book_by_id(id, username);
        if (borrowedBook != nullptr)
        {
            cout << "Book \"" << borrowedBook->title << "\" borrowed successfully by " << username << "." << endl;
        }
        else
        {
            cout << "Failed to borrow the book or added to the waiting list." << endl;
        }
        saveCatalog();
    }

    void displayCatalog() const
    {
        cout << left << setw(5) << "S.No" << "|"
             << setw(10) << "ID" << "|"
             << setw(20) << "Title" << "|"
             << setw(20) << "Author" << "|"
             << setw(15) << "Availability" << "|"
             << setw(15) << "Genre" << endl;
        cout << string(85, '-') << endl;
        int index = 1;
        inOrderWithIndex(root, index);
    }

    void Return_Book(const string &id)
    {
        return_book(id);
        saveCatalog();
    }

    void Return_Book_by_user(const string &id, const string &username)
    {
        Return_Book_By_User(id, username);
        saveCatalog();
    }

    void saveCatalog() const
    {
        ofstream file("book_catalog.txt");
        saveToFile(root, file);
        file.close();
    }

    void find_book()
    {
        string id;
        cout << "Enter the ID of the book: ";
        cin >> id;
        BookNode *foundBook = nullptr;
        foundBook = search_book_by_id(root, id);
        if (foundBook != nullptr)
        {
            cout << "Found book:\nID: " << foundBook->id
                 << "\nTitle: " << foundBook->title
                 << "\nAuthor: " << foundBook->author
                 << "\nAvailability: " << (foundBook->available ? "Available" : "Borrowed")
                 << "\nGenre: " << foundBook->genre << endl;
        }
        else
        {
            cout << "Book not found." << endl;
        }
    }

    void updateBook(const string &bookId)
    {
        BookNode *node = search_book_by_id(root, bookId);
        if (node != nullptr)
        {
            string newTitle, newAuthor, newGenre;
            char choice;

            cout << "What would you like to update?\n";
            cout << "1. Title\n";
            cout << "2. Author\n";
            cout << "3. Genre\n";
            cout << "4. Title and Author\n";
            cout << "5. Title and Genre\n";
            cout << "6. Author and Genre\n";
            cout << "7. Title, Author, and Genre\n";
            cout << "Choose an option (1-7): ";
            cin >> choice;

            if (choice == '1' || choice == '4' || choice == '5' || choice == '7')
            {
                cout << "Previous title: ";
                cout << node->title << endl;
                cout << "Enter new title: ";
                cin.ignore();
                getline(cin, newTitle);
                node->title = newTitle;
            }

            if (choice == '2' || choice == '4' || choice == '6' || choice == '7')
            {
                cout << "Previous author: ";
                cout << node->author << endl;
                cout << "Enter new author: ";
                getline(cin, newAuthor);
                node->author = newAuthor;
            }

            if (choice == '3' || choice == '5' || choice == '6' || choice == '7')
            {
                cout << "Previous genre: ";
                cout << node->genre << endl;
                cout << "Enter new genre: ";
                getline(cin, newGenre);
                node->genre = newGenre;
            }

            cout << "Book information updated successfully.\n";
            saveCatalog();
        }
        else
        {
            cout << "Book not found.\n";
        }
    }

    void load_book_from_file(const string &filename)
    {
        loadFromFile();
    }

    void load_borrowed_books()
    {
        load_borrowed_books_from_file();
    }

    void displayWaitingList(const string &id)
    {
        BookNode *node = search_book_by_id(root, id);
        if (node != nullptr)
        {
            cout << "Waiting List for \"" << id << "\":" << endl;
            if (node->waitingList.isEmpty())
            {
                cout << "No users in the waiting list." << endl;
            }
            else
            {
                node->waitingList.display();
            }
        }
        else
        {
            cout << "Book not found." << endl;
        }
    }

    BookNode *find_book_by_id(const string &id)
    {
        return search_book_by_id(root, id);
    }

    string getBookGenre(const string &id)
    {
        BookNode *book = search_book_by_id(root, id);
        if (book != nullptr)
        {
            return book->genre;
        }
        return "Unknown";
    }

    void inOrderTraversal(BookNode *node, vector<BookNode *> &books)
    {
        if (node == nullptr)
        {
            return;
        }

        inOrderTraversal(node->left, books);
        books.push_back(node);
        inOrderTraversal(node->right, books);
    }

    void suggestBooksByGenre(const string &genre, const string &borrowedTitle)
    {
        vector<BookNode *> books;
        inOrderTraversal(root, books);

        bool suggestionsFound = false;

        for (BookNode *book : books)
        {
            if (book->genre == genre && book->title != borrowedTitle)
            {
                cout << "\nSuggested books in the same genre (" << genre << "):" << endl;
                cout << book->title << endl;
                suggestionsFound = true;
            }
        }

        if (!suggestionsFound)
        {
            cout << "No other books found in the genre \"" << genre << "\"." << endl;
        }
    }
};

class Library_Manager
{
private:
    BookCatalog catalog;
    UserManagement &users;
    ActivityStack activityStack;

    string getCurrentTimestamp() const
    {
        time_t now = time(0);
        char buf[80];
        strftime(buf, sizeof(buf), "%d-%m-%Y %H:%M:%S", localtime(&now));
        return buf;
    }

public:
    Library_Manager(UserManagement &um) : users(um)
    {
        catalog.load_book_from_file("books.txt");
    }

    void add_book()
    {
        catalog.addBook();
    }

    void remove_book_by_id()
    {
        catalog.removeBookById();
    }

    void borrow_book(const string &id, const string &username)
    {
        catalog.borrow_book(id, username);
        activityStack.push(Activity(username, "Borrowed book", id, getCurrentTimestamp(), catalog.getBookGenre(id)));
    }

    void display_catalog()
    {
        catalog.displayCatalog();
    }

    void return_book(const string &id, const string &username)
    {
        catalog.Return_Book(id);
        activityStack.push(Activity(username, "Returned book", id, getCurrentTimestamp(), catalog.getBookGenre(id)));
    }

    void return_book_by_user(const string &id, const string &username)
    {
        catalog.Return_Book_by_user(id, username);
        activityStack.push(Activity(username, "Returned book", id, getCurrentTimestamp(), catalog.getBookGenre(id)));
    }

    void find_book()
    {
        catalog.find_book();
    }

    void update_book(const string &bookId)
    {
        catalog.updateBook(bookId);
    }

    void display_activity_log()
    {
        activityStack.display();
    }

    void displaywaitinglist(const string &id)
    {
        BookNode *node = catalog.find_book_by_id(id);
        if (node != nullptr)
        {
            node->waitingList.display();
        }
        else
        {
            cout << "Book not found." << endl;
        }
    }
};

class Library_Management_System
{
private:
    Library_Manager libraryManager;
    UserManagement users;

public:
    Library_Management_System(UserManagement &um) : users(um), libraryManager(um) {}

    void Main_program()
    {
        while (true)
        {
            int choice;
            clearScreen();
            printStyledMessage("Welcome to Library Management System\nWould you like to signUp or signin!");
            cout << "1) Sign Up" << endl;
            cout << "2) Sign In" << endl;
            cout << "3) Exit" << endl;
            cout << "Enter your choice: ";

            cin >> choice;
            if (cin.fail() || choice < 1 || choice > 3)
            {
                cout << "Invalid choice. Please enter a number between 1 and 3." << endl;
                cin.clear();
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                continue;
            }

            switch (choice)
            {
            case 1:
                clearScreen();
                printStyledMessage("You are currently signing Up");
                users.signUp();
                printStyledMessage("Signning up...");
                clearScreen();
                userMenu();
                break;

            case 2:
                clearScreen();
                signinMenu();
                clearScreen();
                break;

            case 3:
                return;

            default:
                cout << "Invalid choice. Please try again." << endl;
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
        }
    }

    void userMenu()
    {
        while (true)
        {
            string username = users.getCurrentUser();
            cout << "Welcome, " << username << "!" << endl;
            int signup_choice;
            cout << "1) Display book" << endl;
            cout << "2) Borrow book" << endl;
            cout << "3) Return book" << endl;
            cout << "4) Find book" << endl;
            cout << "5) Exit" << endl;
            cout << "Enter your choice: ";

            cin >> signup_choice;
            if (cin.fail() || signup_choice < 1 || signup_choice > 5)
            {
                cout << "Invalid choice. Please enter a number between 1 and 5." << endl;
                cin.clear();
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                continue;
            }

            switch (signup_choice)
            {
            case 1:
                clearScreen();
                printStyledMessage("These are the current books in the library:");
                libraryManager.display_catalog();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            case 2:
            {
                clearScreen();
                printStyledMessage("Excellent choice! Borrow a book and enrich your mind.");
                libraryManager.display_catalog();
                string id;
                cout << "Please enter the ID of the book: ";
                cin >> id;
                libraryManager.borrow_book(id, username);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 3:
            {
                clearScreen();
                printStyledMessage("We hope you enjoyed reading the book!");
                libraryManager.display_catalog();
                string id;
                cout << "Enter the ID of the book you want to return: ";
                cin >> id;
                libraryManager.return_book_by_user(id, username);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 4:
            {
                clearScreen();
                libraryManager.display_catalog();
                libraryManager.find_book();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 5:
                printStyledMessage("Thank you for using our library!");
                printStyledMessage("Goodbye!");
                clearScreen();
                return;
            default:
                cout << "Invalid choice. Please try again." << endl;
            }
        }
    }

    void signinMenu()
    {
        while (true)
        {
            printStyledMessage("Press 1 if you are Admin and 2 if you are a user.");
            int signin_choice;
            cout << "1) Sign In Admin" << endl;
            cout << "2) Sign In User" << endl;
            cout << "3) Back to main menu" << endl;
            cout << "Enter your choice: ";

            cin >> signin_choice;
            if (cin.fail() || signin_choice < 1 || signin_choice > 3)
            {
                cout << "Invalid choice. Please enter a number between 1 and 3." << endl;
                cin.clear();
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                continue;
            }

            if (signin_choice == 1)
            {
                clearScreen();
                users.signInAdmin();
                clearScreen();
                adminMenu();
            }
            else if (signin_choice == 2)
            {
                clearScreen();
                users.signInUser();
                clearScreen();
                userMenu();
            }
            else if (signin_choice == 3)
            {
                printStyledMessage("Signning out...");
                clearScreen();
                return;
            }
            else
            {
                cout << "Invalid choice. Please try again." << endl;
            }
        }
    }

    void adminMenu()
    {
        while (true)
        {
            string username = users.getCurrentUser();
            cout << "Welcome, " << username << "!" << endl;
            int admin_choice;
            cout << "Welcome to the library" << endl;
            cout << "1) Add book" << endl;
            cout << "2) Remove book by ID" << endl;
            cout << "3) Borrow book" << endl;
            cout << "4) Return book" << endl;
            cout << "5) Display catalog" << endl;
            cout << "6) Find book" << endl;
            cout << "7) Update book" << endl;
            cout << "8) Display waiting list" << endl;
            cout << "9) Display activity log" << endl;
            cout << "10) Sign out" << endl;
            cout << "Enter your choice: ";

            cin >> admin_choice;
            if (cin.fail() || admin_choice < 1 || admin_choice > 10)
            {
                cout << "Invalid choice. Please enter a valid choice." << endl;
                cin.clear();
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                continue;
            }

            switch (admin_choice)
            {
            case 1:
                clearScreen();
                printStyledMessage("Great job expanding your library with more books!");
                libraryManager.display_catalog();
                libraryManager.add_book();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            case 2:
                clearScreen();
                printStyledMessage("Nice work refining your library by removing books!");
                libraryManager.display_catalog();
                libraryManager.remove_book_by_id();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            case 3:
            {
                clearScreen();
                printStyledMessage("Excellent choice! Borrow a book and enrich your mind.");
                libraryManager.display_catalog();
                string id;
                cout << "Please enter the ID of the book: ";
                cin >> id;
                libraryManager.borrow_book(id, username);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 4:
            {
                clearScreen();
                printStyledMessage("We hope you enjoyed reading the book!");
                libraryManager.display_catalog();
                string id;
                cout << "Enter the ID of the book you want to return: ";
                cin >> id;
                libraryManager.return_book(id, username);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 5:
            {
                clearScreen();
                printStyledMessage("These are the current books in the library:");
                libraryManager.display_catalog();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 6:
            {
                clearScreen();
                libraryManager.display_catalog();
                libraryManager.find_book();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 7:
            {
                string bookId;
                cout << "Enter the book ID that needs to be updated: ";
                cin >> bookId;
                libraryManager.update_book(bookId);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 8:
            {
                string id;
                cout << "Enter the id of the book to view its waiting list: ";
                cin.ignore();
                getline(cin, id);
                libraryManager.displaywaitinglist(id);
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
            case 9:
                libraryManager.display_activity_log();
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            case 10:
                printStyledMessage("Goodbye!");
                clearScreen();
                return;
            default:
                cout << "Invalid choice. Please try again." << endl;
                cout << "press enter to continue..." << endl;
                getch();
                clearScreen();
                break;
            }
        }
    }
};

int main()
{
    BookCatalog catalog;
    string filename = "books.txt";
    catalog.load_book_from_file(filename);
    catalog.load_borrowed_books();

    UserManagement users;

    Library_Management_System libraryManagementSystem(users);
    libraryManagementSystem.Main_program();

    return 0;
}