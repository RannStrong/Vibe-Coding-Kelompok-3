/* =========================================================
   UINSI LIBRARY
   FRONTEND
   =========================================================

   Login Service  : http://localhost:3002
   Book Service   : http://localhost:3000
   Borrow Service : http://localhost:3001

   Database:
   MySQL

   Frontend tidak lagi menyimpan data buku/peminjaman
   menggunakan localStorage.

   ========================================================= */


/* =========================================================
   1. CONFIGURATION
   ========================================================= */

const LOGIN_SERVICE_URL = "http://localhost:3002";
const BOOK_SERVICE_URL = "http://localhost:3000";
const BORROW_SERVICE_URL = "http://localhost:3001";

const API_KEY = "12345678";

const MAX_ACTIVE_BORROWS = 3;


/* =========================================================
   2. SESSION STORAGE
   ========================================================= */

const SESSION_KEY = "library_current_session";


function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) {
        return null;
    }

    try {
        const session = JSON.parse(raw);

        if (
            !session ||
            typeof session !== "object" ||
            !session.studentId ||
            !session.name
        ) {
            return null;
        }

        return session;

    } catch (error) {
        console.error("Session tidak valid:", error);
        return null;
    }
}


function saveSession(session) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );
}


function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}


/* =========================================================
   3. HELPER
   ========================================================= */

function normalizeStudentId(studentId) {
    return String(studentId)
        .trim()
        .toUpperCase();
}


function isValidStudentIdFormat(studentId) {
    return /^S\d{3}$/.test(studentId);
}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


/* =========================================================
   4. API HELPER
   ========================================================= */

async function apiRequest(
    url,
    options = {},
    useApiKey = true
) {

    const headers = {
        ...(options.headers || {})
    };


    if (useApiKey) {
        headers["X-API-Key"] = API_KEY;
    }


    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] =
            "application/json";
    }


    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );


    let data;

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }


    if (!response.ok) {

        const message =
            data.message ||
            `Request gagal (${response.status})`;

        throw new Error(message);
    }


    return data;
}


/* =========================================================
   5. DOM REFERENCES
   ========================================================= */


/* ---------- Page ---------- */

const loginPage =
    document.getElementById(
        "login-page"
    );

const dashboardPage =
    document.getElementById(
        "dashboard-page"
    );


/* ---------- Login ---------- */

const loginForm =
    document.getElementById(
        "login-form"
    );

const studentIdInput =
    document.getElementById(
        "student-id"
    );

const studentNameInput =
    document.getElementById(
        "student-name"
    );

const loginError =
    document.getElementById(
        "login-error"
    );


/* ---------- Dashboard ---------- */

const welcomeText =
    document.getElementById(
        "welcome-text"
    );

const logoutBtn =
    document.getElementById(
        "logout-btn"
    );

const actionMessage =
    document.getElementById(
        "action-message"
    );


/* ---------- Summary ---------- */

const summaryTotal =
    document.getElementById(
        "summary-total"
    );

const summaryAvailable =
    document.getElementById(
        "summary-available"
    );

const summaryMine =
    document.getElementById(
        "summary-mine"
    );


/* ---------- Tables ---------- */

const booksTableBody =
    document.getElementById(
        "books-table-body"
    );

const availableBooksTableBody =
    document.getElementById(
        "available-books-table-body"
    );

const borrowedTableBody =
    document.getElementById(
        "borrowed-table-body"
    );

const borrowCountText =
    document.getElementById(
        "borrow-count-text"
    );


/* =========================================================
   6. PAGE NAVIGATION
   ========================================================= */

function activatePage(
    pageToShow,
    pageToHide
) {

    pageToHide.hidden = true;

    pageToHide.classList.remove(
        "page-enter"
    );


    pageToShow.hidden = false;


    pageToShow.classList.remove(
        "page-enter"
    );


    void pageToShow.offsetWidth;


    pageToShow.classList.add(
        "page-enter"
    );
}


function showLoginPage() {

    activatePage(
        loginPage,
        dashboardPage
    );
}


function showDashboardPage() {

    const session =
        getSession();


    if (!session) {

        showLoginPage();

        return;
    }


    activatePage(
        dashboardPage,
        loginPage
    );


    welcomeText.textContent =
        `Signed in as ${session.name} (${session.studentId})`;


    /*
       Ambil semua data terbaru dari API.
    */

    loadDashboard();
}


/* =========================================================
   7. LOGIN
   ========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    const studentId =
        studentIdInput.value.trim();

    const name =
        studentNameInput.value.trim();


    /* ---------- Validasi Student ID ---------- */

    if (!studentId) {

        showLoginError(
            "User ID wajib diisi."
        );

        return;
    }


    if (
        !isValidStudentIdFormat(
            studentId
        )
    ) {

        showLoginError(
            "User ID tidak valid. Gunakan format S001."
        );

        return;
    }


    /* ---------- Validasi Name ---------- */

    if (!name) {

        showLoginError(
            "Name wajib diisi."
        );

        return;
    }


    hideLoginError();


    try {

        const result =
            await apiRequest(
                `${LOGIN_SERVICE_URL}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        studentId:
                            normalizeStudentId(
                                studentId
                            ),

                        name: name
                    })
                },
                false
            );


        /*
           Login berhasil.

           Data berasal dari:
           Login Service → MySQL
        */

        saveSession({

            userId:
                result.data.id,

            username:
                result.data.username,

            studentId:
                result.data.studentId,

            name:
                result.data.nama
        });


        studentIdInput.value = "";

        studentNameInput.value = "";


        showDashboardPage();


    } catch (error) {

        console.error(
            "Login gagal:",
            error
        );


        showLoginError(
            error.message ||
            "Login gagal."
        );
    }
}


/* =========================================================
   8. LOGOUT
   ========================================================= */

function handleLogout() {

    clearSession();

    showLoginPage();
}


/* =========================================================
   9. LOGIN ERROR
   ========================================================= */

function showLoginError(message) {

    loginError.textContent =
        message;

    loginError.hidden =
        false;
}


function hideLoginError() {

    loginError.hidden =
        true;
}


/* =========================================================
   10. BOOK SERVICE
   ========================================================= */


/*
   GET SEMUA BUKU

   Book Service:
   GET /books
*/

async function getBooks() {

    const result =
        await apiRequest(
            `${BOOK_SERVICE_URL}/books`
        );


    return result.data || result;
}


/*
   GET BUKU TERSEDIA

   Book Service:
   GET /books/available
*/

async function getAvailableBooks() {

    const result =
        await apiRequest(
            `${BOOK_SERVICE_URL}/books/available`
        );


    return result.data || result;
}


/* =========================================================
   11. BORROW SERVICE
   ========================================================= */


/*
   GET PEMINJAMAN

   Bisa:
   GET /peminjaman
   atau
   GET /peminjaman?studentId=S002
*/

async function getBorrowings(
    studentId = null
) {

    let url =
        `${BORROW_SERVICE_URL}/peminjaman`;


    if (studentId) {

        url +=
            `?studentId=${encodeURIComponent(
                studentId
            )}`;
    }


    const result =
        await apiRequest(url);


    return result.data || result;
}


/* =========================================================
   12. LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

    const session =
        getSession();


    if (!session) {

        showLoginPage();

        return;
    }


    try {

        /*
           Semua data diambil dari microservice.
        */

        const [
            books,
            availableBooks,
            myBorrowings
        ] = await Promise.all([

            getBooks(),

            getAvailableBooks(),

            getBorrowings(
                session.studentId
            )
        ]);


        /*
           Simpan sementara hanya di memory,
           bukan localStorage.
        */

        renderBooksTable(
            books,
            myBorrowings
        );


        renderAvailableBooksTable(
            availableBooks
        );


        renderBorrowedTable(
            myBorrowings,
            books
        );


        renderSummary(
            books,
            availableBooks,
            myBorrowings
        );


    } catch (error) {

        console.error(
            "Gagal memuat dashboard:",
            error
        );


        showActionMessage(
            error.message ||
            "Gagal mengambil data dari server.",
            "error"
        );
    }
}


/* =========================================================
   13. RENDER BOOK CATALOG
   ========================================================= */

function renderBooksTable(
    books,
    myBorrowings
) {

    booksTableBody.innerHTML =
        "";


    if (!books || books.length === 0) {

        booksTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    Tidak ada buku.
                </td>
            </tr>
        `;

        return;
    }


    /*
       Hitung jumlah buku aktif milik user.
    */

    const activeCount =
        (myBorrowings || [])
            .filter(
                record =>
                    record.status !==
                    "returned"
            )
            .length;


    books.forEach(book => {

        const row =
            document.createElement(
                "tr"
            );


        /* ---------- Judul ---------- */

        const titleCell =
            document.createElement(
                "td"
            );


        titleCell.textContent =
            book.judul;


        /* ---------- Status ---------- */

        const statusCell =
            document.createElement(
                "td"
            );


        const badge =
            document.createElement(
                "span"
            );


        badge.classList.add(
            "status-badge"
        );


        if (
            book.status ===
            "dipinjam"
        ) {

            badge.classList.add(
                "status-borrowed"
            );

            badge.textContent =
                "Borrowed";

        } else {

            badge.classList.add(
                "status-available"
            );

            badge.textContent =
                "Available";
        }


        statusCell.appendChild(
            badge
        );


        /* ---------- Action ---------- */

        const actionCell =
            document.createElement(
                "td"
            );


        const borrowBtn =
            document.createElement(
                "button"
            );


        borrowBtn.textContent =
            "Borrow";


        borrowBtn.classList.add(
            "borrow-btn"
        );


        /*
           Tidak bisa pinjam kalau:
           1. buku sedang dipinjam
           2. user sudah punya 3 buku
        */

        borrowBtn.disabled =
            book.status ===
            "dipinjam" ||
            activeCount >=
            MAX_ACTIVE_BORROWS;


        borrowBtn.addEventListener(
            "click",
            () =>
                handleBorrow(
                    book.id
                )
        );


        actionCell.appendChild(
            borrowBtn
        );


        /* ---------- Row ---------- */

        row.appendChild(
            titleCell
        );

        row.appendChild(
            statusCell
        );

        row.appendChild(
            actionCell
        );


        booksTableBody.appendChild(
            row
        );
    });
}


/* =========================================================
   14. AVAILABLE BOOKS
   ========================================================= */

function renderAvailableBooksTable(
    books
) {

    availableBooksTableBody.innerHTML =
        "";


    if (
        !books ||
        books.length === 0
    ) {

        availableBooksTableBody.innerHTML = `
            <tr class="empty-row">
                <td>
                    Tidak ada buku yang tersedia.
                </td>
            </tr>
        `;

        return;
    }


    books.forEach(book => {

        const row =
            document.createElement(
                "tr"
            );


        const titleCell =
            document.createElement(
                "td"
            );


        titleCell.textContent =
            book.judul;


        row.appendChild(
            titleCell
        );


        availableBooksTableBody.appendChild(
            row
        );
    });
}


/* =========================================================
   15. MY BORROWED BOOKS
   ========================================================= */

function renderBorrowedTable(
    records,
    books
) {

    borrowedTableBody.innerHTML =
        "";


    /*
       Hanya tampilkan peminjaman aktif.
    */

    const activeRecords =
        (records || []).filter(
            record =>
                record.status !==
                "returned"
        );


    if (
        activeRecords.length === 0
    ) {

        borrowedTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    You have no active borrowed books.
                </td>
            </tr>
        `;

    } else {

        activeRecords.forEach(
            record => {

                const row =
                    document.createElement(
                        "tr"
                    );


                /*
                   Cari buku berdasarkan ID.

                   Database:
                   book.id = angka

                   Borrow:
                   record.bookId = angka
                */

                const book =
                    books.find(
                        item =>
                            Number(item.id) ===
                            Number(record.bookId)
                    );


                /* ---------- Title ---------- */

                const titleCell =
                    document.createElement(
                        "td"
                    );


                titleCell.textContent =
                    book
                        ? book.judul
                        : record.title ||
                          "(Buku tidak ditemukan)";


                /* ---------- Borrow Date ---------- */

                const borrowDateCell =
                    document.createElement(
                        "td"
                    );


                borrowDateCell.textContent =
                    formatDate(
                        record.borrowDate
                    );


                /* ---------- Due Date ---------- */

                const dueDateCell =
                    document.createElement(
                        "td"
                    );


                dueDateCell.textContent =
                    formatDate(
                        record.dueDate
                    );


                /* ---------- Return ---------- */

                const actionCell =
                    document.createElement(
                        "td"
                    );


                const returnBtn =
                    document.createElement(
                        "button"
                    );


                returnBtn.textContent =
                    "Return";


                returnBtn.classList.add(
                    "return-btn"
                );


                returnBtn.addEventListener(
                    "click",
                    () =>
                        handleReturn(
                            record.recordId
                        )
                );


                actionCell.appendChild(
                    returnBtn
                );


                /* ---------- Row ---------- */

                row.appendChild(
                    titleCell
                );

                row.appendChild(
                    borrowDateCell
                );

                row.appendChild(
                    dueDateCell
                );

                row.appendChild(
                    actionCell
                );


                borrowedTableBody.appendChild(
                    row
                );
            }
        );
    }


    borrowCountText.textContent =
        `Active borrows: ${activeRecords.length} / ${MAX_ACTIVE_BORROWS}`;
}


/* =========================================================
   16. SUMMARY
   ========================================================= */

function renderSummary(
    books,
    availableBooks,
    myBorrowings
) {

    summaryTotal.textContent =
        books.length;


    summaryAvailable.textContent =
        availableBooks.length;


    const activeCount =
        (myBorrowings || [])
            .filter(
                record =>
                    record.status !==
                    "returned"
            )
            .length;


    summaryMine.textContent =
        activeCount;
}


/* =========================================================
   17. BORROW BOOK
   ========================================================= */

async function handleBorrow(
    bookId
) {

    const session =
        getSession();


    if (!session) {

        showLoginPage();

        return;
    }


    try {

        /*
           Frontend → Borrow Service

           POST /peminjaman
        */

        const result =
            await apiRequest(
                `${BORROW_SERVICE_URL}/peminjaman`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        studentId:
                            session.studentId,

                        bookId:
                            Number(bookId)
                    })
                }
            );


        showActionMessage(
            result.message ||
            "Buku berhasil dipinjam.",
            "success"
        );


        /*
           Ambil ulang data dari server.

           Tidak menggunakan localStorage.
        */

        await loadDashboard();


    } catch (error) {

        console.error(
            "Gagal meminjam buku:",
            error
        );


        showActionMessage(
            error.message ||
            "Gagal meminjam buku.",
            "error"
        );
    }
}


/* =========================================================
   18. RETURN BOOK
   ========================================================= */

async function handleReturn(
    recordId
) {

    const session =
        getSession();


    if (!session) {

        showLoginPage();

        return;
    }


    try {

        /*
           Frontend → Borrow Service

           PATCH /peminjaman/:recordId/kembalikan
        */

        const result =
            await apiRequest(
                `${BORROW_SERVICE_URL}/peminjaman/${encodeURIComponent(
                    recordId
                )}/kembalikan`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        studentId:
                            session.studentId
                    })
                }
            );


        showActionMessage(
            result.message ||
            "Buku berhasil dikembalikan.",
            "success"
        );


        /*
           Ambil data terbaru.
        */

        await loadDashboard();


    } catch (error) {

        console.error(
            "Gagal mengembalikan buku:",
            error
        );


        showActionMessage(
            error.message ||
            "Gagal mengembalikan buku.",
            "error"
        );
    }
}


/* =========================================================
   19. ACTION MESSAGE
   ========================================================= */

function showActionMessage(
    message,
    type = "success"
) {

    actionMessage.textContent =
        message;


    actionMessage.hidden =
        false;


    actionMessage.className =
        `action-message ${type}`;
}


/* =========================================================
   20. INITIALIZE APPLICATION
   ========================================================= */

function init() {

    /*
       Login form
    */

    loginForm.addEventListener(
        "submit",
        handleLogin
    );


    /*
       Logout
    */

    logoutBtn.addEventListener(
        "click",
        handleLogout
    );


    /*
       Cek apakah user masih punya session.
    */

    const session =
        getSession();


    if (session) {

        showDashboardPage();

    } else {

        showLoginPage();
    }
}


/* =========================================================
   21. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);