/* =========================================================
   Student Book Borrowing System - Prototype
   Vanilla JS + localStorage only. No backend, no framework.

   Sections in this file:
   1. Constants
   2. LocalStorage helpers
   3. Seed data / initialization
   4. Date helpers
   5. Identity normalization
   6. DOM references
   7. Session
   8. Page / View navigation
   9. Authentication
   10. Book rendering
   11. Borrowing
   12. Bootstrap
   ========================================================= */

/* ---------- 1. Constants ---------- */

const STORAGE_KEYS = {
  BOOKS: "library_books",
  STUDENTS: "library_students",
  RECORDS: "library_borrow_records",
  SESSION: "library_current_session",
  // Not one of the 4 "application data" keys, but a small marker used
  // only to run the one-time presentation reset below exactly once.
  VERSION: "library_data_version"
};

// Bumping this string triggers the one-time presentation reset in
// initializeData() below (clears old borrow history + un-borrows all
// books) the next time the app loads. It only fires once per value -
// it does NOT wipe data on every refresh, so a live demo's borrow /
// return actions survive a page refresh.
const DATA_VERSION = "presentation-v1";

const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;

// User ID format: uppercase "S" followed by exactly 3 digits (e.g. S001, S025, S999).
const STUDENT_ID_PATTERN = /^S\d{3}$/;

const SEED_BOOKS = [
  { bookId: "B001", title: "Introduction to Algorithms", isBorrowed: false },
  { bookId: "B002", title: "Clean Code", isBorrowed: false },
  { bookId: "B003", title: "Database System Concepts", isBorrowed: false },
  { bookId: "B004", title: "Computer Networking", isBorrowed: false },
  { bookId: "B005", title: "Operating System Concepts", isBorrowed: false },
  { bookId: "B006", title: "Software Engineering", isBorrowed: false }
];

// The authoritative roster of students allowed to log in - for this
// presentation build, exactly these 3 accounts. Login is only
// permitted for a studentId that exists in this list - no new student
// is ever created at login time, and no other id/name pair works.
const VALID_STUDENTS = [
  { studentId: "S001", name: "Randy" },
  { studentId: "S002", name: "Raihan" },
  { studentId: "S003", name: "Elsa" }
];

/* ---------- 2. LocalStorage helpers ---------- */

function readStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBooks() {
  const data = readStorage(STORAGE_KEYS.BOOKS, []);
  // Guard against corrupt/malformed data (valid JSON but wrong shape,
  // e.g. an object or string instead of an array) - never let a bad
  // shape propagate into .filter()/.find() calls elsewhere and crash.
  return Array.isArray(data) ? data : [];
}
function saveBooks(books) {
  writeStorage(STORAGE_KEYS.BOOKS, books);
}

function getStudents() {
  const data = readStorage(STORAGE_KEYS.STUDENTS, []);
  return Array.isArray(data) ? data : [];
}
function saveStudents(students) {
  writeStorage(STORAGE_KEYS.STUDENTS, students);
}

function getRecords() {
  const data = readStorage(STORAGE_KEYS.RECORDS, []);
  return Array.isArray(data) ? data : [];
}
function saveRecords(records) {
  writeStorage(STORAGE_KEYS.RECORDS, records);
}

function getSession() {
  const data = readStorage(STORAGE_KEYS.SESSION, null);
  // A valid session must be a plain object, not an array/string/number.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data;
}
function saveSession(session) {
  writeStorage(STORAGE_KEYS.SESSION, session);
}
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

/* ---------- 7b. Roster lookup helpers ----------
   VALID_STUDENTS (a hardcoded constant, not localStorage) is the single
   authoritative source of truth for "who is allowed to log in". This
   guarantees that stale/legacy student records left over in
   localStorage from a previous version of the app can never grant
   login access, no matter what ends up stored under library_students. */

function findValidStudentById(rawId) {
  const normalizedId = normalizeStudentId(rawId);
  return VALID_STUDENTS.find((s) => s.studentId === normalizedId) || null;
}

/* Validates the current session against VALID_STUDENTS. Returns a
   clean { studentId, name } object (taken from the roster itself, not
   from whatever was stored) if - and only if - the session is
   well-formed, its studentId exists on the roster, and its name
   matches that student's registered name. Any other case (missing
   session, malformed JSON, unknown studentId, mismatched name) clears
   the bad session and returns null. */
function getValidSession() {
  const session = getSession();

  if (!session) {
    // Either nothing was stored, or it was corrupt/malformed JSON that
    // readStorage() already caught, or it parsed into something that
    // isn't a plain object. Nothing to clear beyond what getSession()
    // already guards against, but clear defensively in case a
    // malformed-but-non-null value slipped through.
    clearSession();
    return null;
  }

  if (typeof session.studentId !== "string" || typeof session.name !== "string") {
    clearSession();
    return null;
  }

  const validStudent = findValidStudentById(session.studentId);
  if (!validStudent) {
    clearSession();
    return null;
  }

  if (session.name.trim().toLowerCase() !== validStudent.name.toLowerCase()) {
    clearSession();
    return null;
  }

  return { studentId: validStudent.studentId, name: validStudent.name };
}

/* ---------- 3. Seed data / initialization ---------- */

function initializeData() {
  // Seed the book catalog only once (first run ever, or after
  // localStorage is cleared). The catalog itself (titles, ids) is
  // never wiped - only borrow status is touched, and only by the
  // one-time reset below.
  if (localStorage.getItem(STORAGE_KEYS.BOOKS) === null) {
    saveBooks(SEED_BOOKS);
  }

  // Always overwrite library_students with VALID_STUDENTS (not just on
  // first run). VALID_STUDENTS is the authoritative roster; this keeps
  // localStorage in sync with it and purges any stale/legacy students
  // (e.g. an old "S999") left over from a previous version of the app
  // so they can never be mistaken for a valid, registered student.
  saveStudents(VALID_STUDENTS);

  // One-time presentation reset, gated by DATA_VERSION. This block only
  // runs the first time this exact DATA_VERSION is seen in this browser
  // (e.g. right after deploying this build). It clears stale borrow
  // history from older versions and makes sure no book is stuck
  // "Borrowed" because of that old history. On every later
  // load/refresh - including ones that happen *during* the demo, after
  // Randy has borrowed a book - storedVersion already matches
  // DATA_VERSION, so this block is skipped and nothing gets wiped.
  const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
  if (storedVersion !== DATA_VERSION) {
    // Clear all old borrow history.
    saveRecords([]);

    // Un-borrow every book so nothing is stuck "Borrowed" from history
    // that no longer exists. The catalog itself (titles/ids) is kept.
    const books = getBooks().map((book) => ({ ...book, isBorrowed: false }));
    saveBooks(books);

    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
  } else if (localStorage.getItem(STORAGE_KEYS.RECORDS) === null) {
    // Same version already initialized before, but the records key is
    // missing entirely (e.g. manually deleted) - make sure it exists
    // as an empty list rather than leaving it undefined.
    saveRecords([]);
  }
}

/* ---------- 4. Date helpers ---------- */

function todayISO() {
  return new Date().toISOString();
}

function addDays(isoDateString, days) {
  const date = new Date(isoDateString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatDate(isoDateString) {
  const date = new Date(isoDateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* ---------- 5. Identity normalization ----------
   A student ID must always resolve to the same identity regardless of
   case or stray whitespace, otherwise "S001" and "s001" would be treated
   as two different students and each would get their own borrow quota.
   Every place that stores or compares a studentId goes through this. */

function normalizeStudentId(rawId) {
  return rawId.trim().toUpperCase();
}

/* User ID must be exactly "S" + 3 digits, uppercase (e.g. S001).
   Checked against the raw, un-normalized input so that a lowercase
   "s001" is correctly rejected as an invalid format, not silently
   accepted and upper-cased. */
function isValidStudentIdFormat(rawId) {
  return STUDENT_ID_PATTERN.test(rawId);
}

/* ---------- 6. DOM references ---------- */

const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");

const loginForm = document.getElementById("login-form");
const studentIdInput = document.getElementById("student-id");
const studentNameInput = document.getElementById("student-name");
const loginError = document.getElementById("login-error");

const welcomeText = document.getElementById("welcome-text");
const logoutBtn = document.getElementById("logout-btn");
const actionMessage = document.getElementById("action-message");

const summaryTotal = document.getElementById("summary-total");
const summaryAvailable = document.getElementById("summary-available");
const summaryMine = document.getElementById("summary-mine");

const booksTableBody = document.getElementById("books-table-body");
const availableBooksTableBody = document.getElementById("available-books-table-body");
const borrowedTableBody = document.getElementById("borrowed-table-body");
const borrowCountText = document.getElementById("borrow-count-text");

/* ---------- 7. Session ---------- */

function checkSession() {
  // getValidSession() clears any missing/corrupt/unknown-student/
  // mismatched-name session as a side effect, so only a genuinely
  // valid session ever leads to the dashboard.
  const session = getValidSession();
  if (session) {
    showDashboardPage();
  } else {
    showLoginPage();
  }
}

/* ---------- 8. Page / View navigation ----------
   Only index.html exists, so "navigating" means toggling which page
   container is visible, with a single fade/slide transition on the
   page that becomes active. */

function activatePage(pageToShow, pageToHide) {
  pageToHide.hidden = true;
  pageToHide.classList.remove("page-enter");

  pageToShow.hidden = false;

  // Restart the animation every time this page becomes active, even if
  // it was shown before (e.g. logging in again after logging out).
  pageToShow.classList.remove("page-enter");
  void pageToShow.offsetWidth; // force reflow so the animation replays
  pageToShow.classList.add("page-enter");
}

function showLoginPage() {
  activatePage(loginPage, dashboardPage);
}

function showDashboardPage() {
  // Re-validate before ever showing the dashboard. This makes
  // showDashboardPage() safe to call from anywhere (not just after
  // login) without risking a dashboard render for an invalid session.
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  activatePage(dashboardPage, loginPage);

  welcomeText.textContent = `Signed in as ${session.name} (${session.studentId})`;

  renderBooksTable();
  renderAvailableBooksTable();
  renderBorrowedTable();
  renderSummary();
}

/* ---------- 9. Authentication ---------- */

function handleLogin(event) {
  event.preventDefault();

  const rawStudentId = studentIdInput.value.trim();

  // 1. User ID must not be empty.
  if (!rawStudentId) {
    showLoginError("User ID wajib diisi.");
    return;
  }

  // 2. User ID must follow the required format: "S" + exactly 3 digits.
  if (!isValidStudentIdFormat(rawStudentId)) {
    showLoginError("User ID tidak valid. Gunakan format S001.");
    return;
  }

  // 3. User ID must belong to a registered student - no auto-registration.
  //    Format alone is not enough: e.g. "S999" has a valid format but is
  //    rejected here if it isn't in the roster. Lookup goes against
  //    VALID_STUDENTS directly (the authoritative roster), not whatever
  //    happens to be sitting in localStorage, so a leftover legacy
  //    student from an older version of the app can never log in.
  const registeredStudent = findValidStudentById(rawStudentId);

  if (!registeredStudent) {
    showLoginError("User ID tidak terdaftar. Silakan gunakan User ID yang valid.");
    return;
  }

  // 4. The typed Name must match the registered student's own name.
  //    Without this check, anyone who simply knows a valid, registered
  //    Student ID (e.g. "S001") could sign in as that student - the ID
  //    would effectively be usable by anyone, not just its real owner.
  const rawStudentName = studentNameInput.value.trim();
  if (!rawStudentName) {
    showLoginError("Name wajib diisi.");
    return;
  }
  if (rawStudentName.toLowerCase() !== registeredStudent.name.toLowerCase()) {
    showLoginError("User ID dan Name tidak cocok. Periksa kembali data kamu.");
    return;
  }

  hideLoginError();

  // Session uses the registered student's own name, not whatever was
  // typed in the Name field - identity comes from the roster, not the form.
  saveSession({ studentId: registeredStudent.studentId, name: registeredStudent.name });

  studentIdInput.value = "";
  studentNameInput.value = "";

  showDashboardPage();
}

function handleLogout() {
  clearSession();
  showLoginPage();
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function hideLoginError() {
  loginError.hidden = true;
}

/* ---------- 10. Book rendering ---------- */

function renderBooksTable() {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const books = getBooks();
  const activeCount = countActiveBorrowsForStudent(session.studentId);

  booksTableBody.innerHTML = "";

  if (books.length === 0) {
    booksTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="3">No books in the catalog.</td></tr>';
    return;
  }

  books.forEach((book) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = book.title;

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.classList.add("status-badge");
    if (book.isBorrowed) {
      badge.classList.add("status-borrowed");
      badge.textContent = "Borrowed";
    } else {
      badge.classList.add("status-available");
      badge.textContent = "Available";
    }
    statusCell.appendChild(badge);

    const actionCell = document.createElement("td");
    const borrowBtn = document.createElement("button");
    borrowBtn.textContent = "Borrow";
    borrowBtn.classList.add("borrow-btn");
    borrowBtn.disabled = book.isBorrowed || activeCount >= MAX_ACTIVE_BORROWS;
    borrowBtn.addEventListener("click", () => handleBorrow(book.bookId));
    actionCell.appendChild(borrowBtn);

    row.appendChild(titleCell);
    row.appendChild(statusCell);
    row.appendChild(actionCell);
    booksTableBody.appendChild(row);
  });
}

function renderAvailableBooksTable() {
  const books = getBooks();
  const availableBooks = books.filter((book) => book.isBorrowed === false);

  availableBooksTableBody.innerHTML = "";

  if (availableBooks.length === 0) {
    availableBooksTableBody.innerHTML =
      '<tr class="empty-row"><td>No books are currently available.</td></tr>';
    return;
  }

  availableBooks.forEach((book) => {
    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    titleCell.textContent = book.title;
    row.appendChild(titleCell);
    availableBooksTableBody.appendChild(row);
  });
}

function renderSummary() {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const books = getBooks();

  const totalCount = books.length;
  const availableCount = books.filter((b) => b.isBorrowed === false).length;
  const mineCount = countActiveBorrowsForStudent(session.studentId);

  summaryTotal.textContent = totalCount;
  summaryAvailable.textContent = availableCount;
  summaryMine.textContent = mineCount;
}

/* ---------- 11. Borrowing ---------- */

function countActiveBorrowsForStudent(studentId) {
  const records = getRecords();
  const normalizedId = normalizeStudentId(studentId);
  // Treat a record as active whenever it is NOT explicitly "returned",
  // rather than requiring an exact "active" match. This way, a record
  // with a missing/inconsistent status field still counts against the
  // student's quota instead of silently slipping through the check.
  return records.filter(
    (r) => normalizeStudentId(r.studentId) === normalizedId && r.status !== "returned"
  ).length;
}

function renderBorrowedTable() {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const records = getRecords();
  const books = getBooks();

  const sessionId = normalizeStudentId(session.studentId);
  const activeRecords = records.filter(
    (r) => normalizeStudentId(r.studentId) === sessionId && r.status !== "returned"
  );

  borrowedTableBody.innerHTML = "";

  if (activeRecords.length === 0) {
    borrowedTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="4">You have no active borrowed books.</td></tr>';
  } else {
    activeRecords.forEach((record) => {
      const book = books.find((b) => b.bookId === record.bookId);
      const row = document.createElement("tr");

      const titleCell = document.createElement("td");
      titleCell.textContent = book ? book.title : "(unknown book)";

      const borrowedCell = document.createElement("td");
      borrowedCell.textContent = formatDate(record.borrowDate);

      const dueCell = document.createElement("td");
      dueCell.textContent = formatDate(record.dueDate);

      const actionCell = document.createElement("td");
      const returnBtn = document.createElement("button");
      returnBtn.textContent = "Return";
      returnBtn.classList.add("secondary-btn");
      returnBtn.addEventListener("click", () => handleReturn(record.recordId));
      actionCell.appendChild(returnBtn);

      row.appendChild(titleCell);
      row.appendChild(borrowedCell);
      row.appendChild(dueCell);
      row.appendChild(actionCell);
      borrowedTableBody.appendChild(row);
    });
  }

  borrowCountText.textContent = `Active borrows: ${activeRecords.length} / ${MAX_ACTIVE_BORROWS}`;
}

function handleBorrow(bookId) {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const books = getBooks();
  const records = getRecords();

  const book = books.find((b) => b.bookId === bookId);

  // Rule: a borrowed book cannot be borrowed by another student.
  if (!book || book.isBorrowed) {
    showActionMessage("This book is no longer available.", "error");
    renderBooksTable();
    return;
  }

  // Rule: a student can have a maximum of 3 active borrowed books.
  const activeCount = countActiveBorrowsForStudent(session.studentId);
  if (activeCount >= MAX_ACTIVE_BORROWS) {
    showActionMessage(
      `You already have ${MAX_ACTIVE_BORROWS} active borrowed books. Maximum reached.`,
      "error"
    );
    return;
  }

  // All validations passed: create the borrow record.
  const borrowDate = todayISO();
  const dueDate = addDays(borrowDate, BORROW_PERIOD_DAYS);

  records.push({
    recordId: `R${Date.now()}`,
    studentId: normalizeStudentId(session.studentId),
    bookId: book.bookId,
    borrowDate,
    dueDate,
    status: "active"
  });
  saveRecords(records);

  // Rule: a borrowed book cannot be borrowed by another student
  // (enforced going forward via this flag).
  book.isBorrowed = true;
  saveBooks(books);

  showActionMessage(`"${book.title}" borrowed successfully. Due ${formatDate(dueDate)}.`, "success");

  renderBooksTable();
  renderAvailableBooksTable();
  renderBorrowedTable();
  renderSummary();
}

function handleReturn(recordId) {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const records = getRecords();
  const books = getBooks();

  const record = records.find((r) => r.recordId === recordId);
  if (!record || record.status === "returned") {
    showActionMessage("This book has already been returned.", "error");
    return;
  }

  // Ownership check: a student may only return a book that they
  // themselves borrowed. Without this, any signed-in student could
  // return - and free up - a book borrowed by someone else just by
  // knowing/guessing its recordId.
  if (normalizeStudentId(record.studentId) !== normalizeStudentId(session.studentId)) {
    showActionMessage("You are not authorized to return this book.", "error");
    return;
  }

  // Mark the record as returned.
  record.status = "returned";
  saveRecords(records);

  // Make the book available again.
  const book = books.find((b) => b.bookId === record.bookId);
  if (book) {
    book.isBorrowed = false;
    saveBooks(books);
  }

  showActionMessage(`"${book ? book.title : "Book"}" returned successfully.`, "success");

  renderBooksTable();
  renderAvailableBooksTable();
  renderBorrowedTable();
  renderSummary();
}

function showActionMessage(message, type) {
  actionMessage.textContent = message;
  actionMessage.className = "action-message " + type;
  actionMessage.hidden = false;
}

/* ---------- 12. Bootstrap ---------- */

function init() {
  initializeData();

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);

  checkSession();
}

document.addEventListener("DOMContentLoaded", init);