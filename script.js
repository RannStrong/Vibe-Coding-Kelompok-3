/* =========================================================
   Student Book Borrowing System
   Vanilla JS — sekarang mengambil data BUKU dari BOOK SERVICE
   (bukan localStorage lagi). Login & roster mahasiswa masih
   hardcoded sementara (belum ada Student/Auth Service).

   TODO buat Orang 2 / integrasi: begitu Borrow Service jadi,
   ganti bagian "RECORDS (SEMENTARA localStorage)" di bawah
   supaya baca/tulis lewat Borrow Service, bukan localStorage.

   Sections:
   1. Constants
   2. LocalStorage helpers (session + records saja, buku sudah bukan localStorage)
   3. Book Service API helpers (BARU)
   4. Init
   5. Date helpers
   6. Identity normalization
   7. DOM references
   8. Session
   9. Page / View navigation
   10. Authentication
   11. Book rendering (sumber data: cachedBooks dari Book Service)
   12. Borrowing
   13. Bootstrap
   ========================================================= */

/* ---------- 1. Constants ---------- */

// Ganti kalau alamat/port book-service kamu beda
const BOOK_SERVICE_URL = "http://localhost:3000";

const STORAGE_KEYS = {
  RECORDS: "library_borrow_records",
  SESSION: "library_current_session"
};

const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;

// User ID format: uppercase "S" + tepat 3 digit (mis. S001, S025, S999)
const STUDENT_ID_PATTERN = /^S\d{3}$/;

// Roster mahasiswa — sementara masih hardcoded di frontend karena
// belum ada Student/Auth Service tersendiri di proyek ini.
const VALID_STUDENTS = [
  { studentId: "S001", name: "Randy" },
  { studentId: "S002", name: "Raihan" },
  { studentId: "S003", name: "Elsa" },
  { studentId: "S004", name: "uinsi" }
];

/* ---------- 2. LocalStorage helpers (session + records) ---------- */

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

function getRecords() {
  const data = readStorage(STORAGE_KEYS.RECORDS, []);
  return Array.isArray(data) ? data : [];
}
function saveRecords(records) {
  writeStorage(STORAGE_KEYS.RECORDS, records);
}

function getSession() {
  const data = readStorage(STORAGE_KEYS.SESSION, null);
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

/* ---------- 3. Book Service API helpers (BARU) ----------
   Book Service pakai field Bahasa Indonesia: id, judul, status
   ("tersedia" / "dipinjam"). Kita normalisasi di sini supaya
   sisa kode (yang sebelumnya pakai bookId/title/isBorrowed)
   nggak perlu diubah banyak. */

let cachedBooks = []; // [{ bookId, title, isBorrowed }]

function normalizeBook(serviceBook) {
  return {
    bookId: serviceBook.id,
    title: serviceBook.judul,
    isBorrowed: serviceBook.status === "dipinjam"
  };
}

async function refreshBooksCache() {
  const res = await fetch(`${BOOK_SERVICE_URL}/books`);
  if (!res.ok) throw new Error("Gagal mengambil data buku dari Book Service.");
  const json = await res.json();
  cachedBooks = json.data.map(normalizeBook);
}

async function pinjamBukuDiService(bookId) {
  const res = await fetch(`${BOOK_SERVICE_URL}/books/${bookId}/pinjam`, { method: "PATCH" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal meminjam buku.");
  return normalizeBook(json.data);
}

async function kembalikanBukuDiService(bookId) {
  const res = await fetch(`${BOOK_SERVICE_URL}/books/${bookId}/kembali`, { method: "PATCH" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal mengembalikan buku.");
  return normalizeBook(json.data);
}

/* ---------- 4. Init ---------- */

function initializeData() {
  // Buku sekarang sumbernya Book Service, jadi tidak perlu seed lagi.
  // Records tetap perlu ada sebagai array kosong minimal sekali.
  if (localStorage.getItem(STORAGE_KEYS.RECORDS) === null) {
    saveRecords([]);
  }
}

/* ---------- 5. Date helpers ---------- */

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

/* ---------- 6. Identity normalization ---------- */

function normalizeStudentId(rawId) {
  return rawId.trim().toUpperCase();
}

function isValidStudentIdFormat(rawId) {
  return STUDENT_ID_PATTERN.test(rawId);
}

function findValidStudentById(rawId) {
  const normalizedId = normalizeStudentId(rawId);
  return VALID_STUDENTS.find((s) => s.studentId === normalizedId) || null;
}

function getValidSession() {
  const session = getSession();

  if (!session) {
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

/* ---------- 7. DOM references ---------- */

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

/* ---------- 8. Session ---------- */

async function checkSession() {
  const session = getValidSession();
  if (session) {
    await showDashboardPage();
  } else {
    showLoginPage();
  }
}

/* ---------- 9. Page / View navigation ---------- */

function activatePage(pageToShow, pageToHide) {
  pageToHide.hidden = true;
  pageToHide.classList.remove("page-enter");

  pageToShow.hidden = false;

  pageToShow.classList.remove("page-enter");
  void pageToShow.offsetWidth; // force reflow supaya animasi replay
  pageToShow.classList.add("page-enter");
}

function showLoginPage() {
  activatePage(loginPage, dashboardPage);
}

async function showDashboardPage() {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  activatePage(dashboardPage, loginPage);

  welcomeText.textContent = `Signed in as ${session.name} (${session.studentId})`;

  try {
    await refreshBooksCache();
  } catch (err) {
    showActionMessage(err.message, "error");
  }

  renderBooksTable();
  renderAvailableBooksTable();
  renderBorrowedTable();
  renderSummary();
}

/* ---------- 10. Authentication ---------- */

function handleLogin(event) {
  event.preventDefault();

  const rawStudentId = studentIdInput.value.trim();

  if (!rawStudentId) {
    showLoginError("User ID wajib diisi.");
    return;
  }

  if (!isValidStudentIdFormat(rawStudentId)) {
    showLoginError("User ID tidak valid. Gunakan format S001.");
    return;
  }

  const registeredStudent = findValidStudentById(rawStudentId);
  if (!registeredStudent) {
    showLoginError("User ID tidak terdaftar. Silakan gunakan User ID yang valid.");
    return;
  }

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

/* ---------- 11. Book rendering (dari cachedBooks, hasil Book Service) ---------- */

function renderBooksTable() {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const activeCount = countActiveBorrowsForStudent(session.studentId);

  booksTableBody.innerHTML = "";

  if (cachedBooks.length === 0) {
    booksTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="3">No books in the catalog.</td></tr>';
    return;
  }

  cachedBooks.forEach((book) => {
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
  const availableBooks = cachedBooks.filter((book) => book.isBorrowed === false);

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

  const totalCount = cachedBooks.length;
  const availableCount = cachedBooks.filter((b) => b.isBorrowed === false).length;
  const mineCount = countActiveBorrowsForStudent(session.studentId);

  summaryTotal.textContent = totalCount;
  summaryAvailable.textContent = availableCount;
  summaryMine.textContent = mineCount;
}

/* ---------- 12. Borrowing ---------- */
/* Records (siapa pinjam apa) masih di localStorage SEMENTARA,
   karena Borrow Service belum jadi. Status tersedia/dipinjam buku
   itu sendiri sudah 100% dari Book Service (bukan localStorage). */

function countActiveBorrowsForStudent(studentId) {
  const records = getRecords();
  const normalizedId = normalizeStudentId(studentId);
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
      const book = cachedBooks.find((b) => b.bookId === record.bookId);
      const row = document.createElement("tr");

      const titleCell = document.createElement("td");
      titleCell.textContent = book ? book.title : record.title || "(unknown book)";

      const borrowedCell = document.createElement("td");
      borrowedCell.textContent = formatDate(record.borrowDate);

      const dueCell = document.createElement("td");
      dueCell.textContent = formatDate(record.dueDate);

      const actionCell = document.createElement("td");
      const returnBtn = document.createElement("button");
      returnBtn.textContent = "Return";
      returnBtn.classList.add("return-btn");
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

async function handleBorrow(bookId) {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const book = cachedBooks.find((b) => b.bookId === bookId);

  if (!book || book.isBorrowed) {
    showActionMessage("This book is no longer available.", "error");
    renderBooksTable();
    return;
  }

  const activeCount = countActiveBorrowsForStudent(session.studentId);
  if (activeCount >= MAX_ACTIVE_BORROWS) {
    showActionMessage(
      `You already have ${MAX_ACTIVE_BORROWS} active borrowed books. Maximum reached.`,
      "error"
    );
    return;
  }

  try {
    const updatedBook = await pinjamBukuDiService(bookId);

    const records = getRecords();
    const borrowDate = todayISO();
    const dueDate = addDays(borrowDate, BORROW_PERIOD_DAYS);

    records.push({
      recordId: `R${Date.now()}`,
      studentId: normalizeStudentId(session.studentId),
      bookId: updatedBook.bookId,
      title: updatedBook.title,
      borrowDate,
      dueDate,
      status: "active"
    });
    saveRecords(records);

    showActionMessage(`"${updatedBook.title}" borrowed successfully. Due ${formatDate(dueDate)}.`, "success");

    await refreshBooksCache();
    renderBooksTable();
    renderAvailableBooksTable();
    renderBorrowedTable();
    renderSummary();
  } catch (err) {
    showActionMessage(err.message, "error");
  }
}

async function handleReturn(recordId) {
  const session = getValidSession();
  if (!session) {
    showLoginPage();
    return;
  }

  const records = getRecords();
  const record = records.find((r) => r.recordId === recordId);

  if (!record || record.status === "returned") {
    showActionMessage("This book has already been returned.", "error");
    return;
  }

  if (normalizeStudentId(record.studentId) !== normalizeStudentId(session.studentId)) {
    showActionMessage("You are not authorized to return this book.", "error");
    return;
  }

  try {
    const updatedBook = await kembalikanBukuDiService(record.bookId);

    record.status = "returned";
    saveRecords(records);

    showActionMessage(`"${updatedBook.title}" returned successfully.`, "success");

    await refreshBooksCache();
    renderBooksTable();
    renderAvailableBooksTable();
    renderBorrowedTable();
    renderSummary();
  } catch (err) {
    showActionMessage(err.message, "error");
  }
}

function showActionMessage(message, type) {
  actionMessage.textContent = message;
  actionMessage.className = "action-message " + type;
  actionMessage.hidden = false;
}

/* ---------- 13. Bootstrap ---------- */

function init() {
  initializeData();

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);

  checkSession();
}

document.addEventListener("DOMContentLoaded", init);