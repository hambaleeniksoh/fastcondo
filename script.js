// ========================================
// 1. ประกาศตัวแปรสำหรับเก็บข้อมูลคอนโด
// ========================================

let condos = [];
let visibleCondos = [];


// ========================================
// 2. เชื่อมต่อ JavaScript กับ HTML
// ========================================

// ระบบค้นหา
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const searchMessage = document.getElementById("searchMessage");
const priceFilter = document.getElementById("priceFilter");

// พื้นที่แสดงคอนโด
const condoResults = document.getElementById("condoResults");

// รายละเอียดคอนโด
const condoDetail = document.getElementById("condoDetail");
const detailName = document.getElementById("detailName");
const detailLocation = document.getElementById("detailLocation");
const detailPrice = document.getElementById("detailPrice");
const closeDetailButton = document.getElementById("closeDetailButton");

// รายการโปรด
const favoritesMessage = document.getElementById("favoritesMessage");
const favoritesResults = document.getElementById("favoritesResults");

// ฟอร์มเพิ่มคอนโด
const addCondoForm = document.getElementById("addCondoForm");
const condoNameInput = document.getElementById("condoNameInput");
const condoLocationInput = document.getElementById("condoLocationInput");
const condoPriceInput = document.getElementById("condoPriceInput");
const addCondoMessage = document.getElementById("addCondoMessage");

// ฟอร์มแก้ไขคอนโด
const editCondoSection = document.getElementById("editCondoSection");
const editCondoForm = document.getElementById("editCondoForm");
const editCondoId = document.getElementById("editCondoId");
const editCondoName = document.getElementById("editCondoName");
const editCondoLocation = document.getElementById("editCondoLocation");
const editCondoPrice = document.getElementById("editCondoPrice");
const editCondoMessage = document.getElementById("editCondoMessage");
const cancelEditButton = document.getElementById("cancelEditButton");

// หน้าต่างยืนยันการลบ
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const deleteCondoName = document.getElementById("deleteCondoName");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const deleteMessage = document.getElementById("deleteMessage");

// เก็บข้อมูลคอนโดที่กำลังรอยืนยันการลบ
let condoToDelete = null;


// ========================================
// เครื่องมือกลางสำหรับจัดการ API Error
// ========================================

// อ่าน Response Body แบบปลอดภัย ป้องกัน JSON ว่างหรือ JSON ผิดรูปแบบ
async function readApiResponse(response) {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    // ถ้า Backend ไม่ได้ส่ง JSON ให้เก็บข้อความที่ได้รับไว้
    return { message: responseText };
  }
}

// สร้าง Error เมื่อ Backend ตอบ HTTP Status ที่ไม่สำเร็จ
function createApiError(response, result, fallbackMessage) {
  let message = "";

  // ถ้า Backend ส่ง message มา ให้ใช้ข้อความนั้นก่อน
  if (
    result &&
    typeof result.message === "string" &&
    result.message.trim() !== ""
  ) {
    message = result.message;

  } else if (response.status === 400) {
    message = "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง";

  } else if (response.status === 404) {
    message = "ไม่พบข้อมูลคอนโดที่ต้องการ";

  } else if (response.status >= 500) {
    message = "Server เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง";

  } else {
    message = fallbackMessage;
  }

  const error = new Error(message);
  error.name = "ApiError";
  error.status = response.status;

  return error;
}

// แปลง Error ให้เป็นข้อความภาษาไทยที่เหมาะกับผู้ใช้
function getUserErrorMessage(error, fallbackMessage) {
  // Network Error: Browser ติดต่อ Backend ไม่ได้
  if (error instanceof TypeError) {
    return "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า Server ทำงานอยู่";
  }

  // API Error: Backend ตอบกลับด้วย HTTP Status ที่ไม่สำเร็จ
  if (error.name === "ApiError") {
    return error.message;
  }

  return error.message || fallbackMessage;
}


// ========================================
// 3. กำหนดข้อความ HTML Validation เป็นภาษาไทย
// ========================================

function setupThaiValidation(input) {

  // ตรวจสอบว่ามี Input นี้อยู่ใน HTML
  if (!input) return;

  // เมื่อ Browser ตรวจพบข้อมูลไม่ถูกต้อง
  input.addEventListener("invalid", function () {

    if (input.validity.valueMissing) {
      input.setCustomValidity("กรุณากรอกค่าเช่าต่อเดือน");

    } else if (input.validity.rangeUnderflow) {
      input.setCustomValidity("ค่าเช่าต้องไม่น้อยกว่า 1 บาท");

    } else if (input.validity.stepMismatch) {
      input.setCustomValidity("กรุณากรอกราคาเป็นจำนวนเต็ม");
    }
  });

  // ล้างข้อความเดิมเมื่อผู้ใช้เริ่มแก้ไขข้อมูล
  input.addEventListener("input", function () {
    input.setCustomValidity("");
  });
}

// ใช้กับช่องราคาในฟอร์มเพิ่มและแก้ไข
setupThaiValidation(condoPriceInput);
setupThaiValidation(editCondoPrice);


// ========================================
// 4. โหลดรายการโปรดจาก localStorage
// ========================================

function loadFavorites() {
  try {
    const savedFavorites = localStorage.getItem("fastcondoFavorites");

    const parsedFavorites = savedFavorites
      ? JSON.parse(savedFavorites)
      : [];

    return Array.isArray(parsedFavorites) ? parsedFavorites : [];

  } catch (error) {
    console.error("ไม่สามารถโหลดรายการโปรดได้:", error);
    return [];
  }
}

let favoriteIds = loadFavorites();


// ========================================
// 5. ตรวจสอบรายการโปรด
// ========================================

function isFavorite(condoId) {
  return favoriteIds.some(function (id) {
    return String(id) === String(condoId);
  });
}


// ========================================
// 6. บันทึกรายการโปรด
// ========================================

function saveFavorites() {
  try {
    localStorage.setItem(
      "fastcondoFavorites",
      JSON.stringify(favoriteIds)
    );

  } catch (error) {
    console.error("ไม่สามารถบันทึกรายการโปรดได้:", error);
  }
}


// ========================================
// 7. เพิ่มหรือลบรายการโปรด
// ========================================

function toggleFavorite(condoId) {

  if (isFavorite(condoId)) {

    favoriteIds = favoriteIds.filter(function (id) {
      return String(id) !== String(condoId);
    });

  } else {
    favoriteIds.push(condoId);
  }

  saveFavorites();

  renderCondos(visibleCondos);
  renderFavorites();
}


// ========================================
// 8. แสดงรายการคอนโด
// ========================================

function renderCondos(condosToShow) {

  condoResults.replaceChildren();

  if (condosToShow.length === 0) {

    const message = document.createElement("p");
    message.textContent = "ไม่พบคอนโดที่ตรงกับเงื่อนไข";

    condoResults.appendChild(message);
    return;
  }

  condosToShow.forEach(function (condo) {

    const card = document.createElement("div");
    card.className = "listing-card";
    card.style.cursor = "pointer";

    // ชื่อคอนโด
    const title = document.createElement("h2");
    title.textContent = condo.name;

    // ทำเล
    const location = document.createElement("p");
    location.textContent = "ทำเล: " + condo.location;

    // ราคา
    const price = document.createElement("p");
    price.textContent =
      "ราคาเช่า: " +
      Number(condo.price).toLocaleString("th-TH") +
      " บาท/เดือน";

    // ปุ่มรายการโปรด
    const favoriteButton = document.createElement("button");

    favoriteButton.textContent = isFavorite(condo.id)
      ? "❤️ บันทึกแล้ว"
      : "♡ เพิ่มรายการโปรด";

    favoriteButton.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleFavorite(condo.id);
    });

    // ปุ่มแก้ไขคอนโด
    const editButton = document.createElement("button");
    editButton.textContent = "แก้ไข";

    editButton.addEventListener("click", function (event) {
      event.stopPropagation();
      editCondo(condo);
    });

    // ปุ่มลบคอนโด
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "ลบ";
        deleteButton.addEventListener("click", function (event) {
      event.stopPropagation();
      deleteCondo(condo);
    });

    // คลิกการ์ดเพื่อดูรายละเอียด
    card.addEventListener("click", function () {
      showCondoDetail(condo);
    });

    card.append(
      title,
      location,
      price,
      favoriteButton,
      editButton,
      deleteButton
    );

    condoResults.appendChild(card);
  });
}


// ========================================
// 9. เปิดฟอร์มแก้ไขข้อมูลคอนโด
// ========================================

function editCondo(condo) {

  editCondoId.value = condo.id;
  editCondoName.value = condo.name;
  editCondoLocation.value = condo.location;
  editCondoPrice.value = condo.price;

  editCondoMessage.textContent = "";

  editCondoSection.hidden = false;

  editCondoSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ========================================
// 10. บันทึกการแก้ไขข้อมูลคอนโด
// PUT /api/condos/:id
// ========================================

editCondoForm.addEventListener("submit", async function (event) {

  event.preventDefault();

  const id = editCondoId.value;
  const name = editCondoName.value.trim();
  const location = editCondoLocation.value.trim();
  const price = Number(editCondoPrice.value);

  // ตรวจสอบข้อมูลก่อนส่งไป Backend
  if (!name || !location || editCondoPrice.value.trim() === "") {
    editCondoMessage.textContent =
      "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    return;
  }

  if (!Number.isSafeInteger(price) || price <= 0) {
    editCondoMessage.textContent =
      "ราคาต้องเป็นจำนวนเต็มมากกว่า 0 บาท";
    return;
  }

  // เก็บปุ่ม Submit และข้อความเดิม
  const submitButton =
    event.submitter ||
    editCondoForm.querySelector('button[type="submit"]');

  const originalButtonText = submitButton
    ? submitButton.textContent
    : "";

  // Loading State
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "กำลังบันทึก...";
  }

  editCondoMessage.textContent = "กำลังบันทึกข้อมูล...";

  try {

    // ส่ง PUT Request ไปยัง Backend
    const response = await fetch(
      "/api/condos/" + id,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name: name,
          location: location,
          price: price
        })
      }
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw createApiError(
        response,
        result,
        "แก้ไขข้อมูลไม่สำเร็จ"
      );
    }

    editCondoSection.hidden = true;
    editCondoForm.reset();
    editCondoMessage.textContent = "";

    await loadCondos();
    searchCondos();

    const updatedCondo = condos.find(function (item) {
      return String(item.id) === String(id);
    });

    if (updatedCondo) {
      showCondoDetail(updatedCondo);
    }

  } catch (error) {

    console.error("แก้ไขคอนโดไม่สำเร็จ:", error);

    editCondoMessage.textContent = getUserErrorMessage(
      error,
      "เกิดข้อผิดพลาดในการแก้ไข กรุณาลองใหม่"
    );

  } finally {

    // คืนค่าปุ่มให้กดได้อีกครั้ง
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});


// ========================================
// 11. ยกเลิกการแก้ไข
// ========================================

cancelEditButton.addEventListener("click", function () {

  editCondoSection.hidden = true;
  editCondoForm.reset();
  editCondoMessage.textContent = "";
});


// ========================================
// 12. ระบบหน้าต่างยืนยันการลบ
// ========================================

// เปิดหน้าต่างยืนยันการลบ
function deleteCondo(condo) {

  condoToDelete = condo;

  deleteCondoName.textContent = condo.name;
  deleteMessage.textContent = "";

  deleteConfirmModal.hidden = false;
}


// ปิดหน้าต่างยืนยันการลบ
function closeDeleteModal() {

  deleteConfirmModal.hidden = true;

  condoToDelete = null;

  deleteMessage.textContent = "";
}


// ปุ่มยกเลิกการลบ
cancelDeleteButton.addEventListener("click", function () {
  closeDeleteModal();
});


// ปุ่มยืนยันการลบ
confirmDeleteButton.addEventListener("click", async function () {

  if (!condoToDelete) {
    return;
  }

  const condo = condoToDelete;

  // ป้องกันการกดปุ่มซ้ำ
  confirmDeleteButton.disabled = true;
  deleteMessage.textContent = "กำลังลบข้อมูล...";

  try {

    const response = await fetch(
      "/api/condos/" + condo.id,
      {
        method: "DELETE"
      }
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw createApiError(
        response,
        result,
        "ลบข้อมูลไม่สำเร็จ"
      );
    }

    // ลบ ID ออกจากรายการโปรด
    favoriteIds = favoriteIds.filter(function (id) {
      return String(id) !== String(condo.id);
    });

    saveFavorites();

    // ปิดรายละเอียด ถ้ากำลังแสดงคอนโดที่ถูกลบ
    if (detailName.textContent === condo.name) {
      condoDetail.hidden = true;
    }

    closeDeleteModal();

    await loadCondos();
    searchCondos();

  } catch (error) {

    console.error("ลบคอนโดไม่สำเร็จ:", error);

    deleteMessage.textContent = getUserErrorMessage(
      error,
      "เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่"
    );

  } finally {

    confirmDeleteButton.disabled = false;
  }
});


// ========================================
// 13. แสดงรายละเอียดคอนโด
// ========================================

function showCondoDetail(condo) {

  detailName.textContent = condo.name;

  detailLocation.textContent =
    "ทำเล: " + condo.location;

  detailPrice.textContent =
    "ราคาเช่า: " +
    Number(condo.price).toLocaleString("th-TH") +
    " บาท/เดือน";

  condoDetail.hidden = false;

  condoDetail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
// ========================================
// 14. ค้นหาและกรองราคาคอนโด
// ========================================

function searchCondos() {

  const keyword = searchInput.value.trim().toLowerCase();
  const selectedPrice = priceFilter.value;

  const results = condos.filter(function (condo) {

    const matchesKeyword =
      keyword === "" ||
      condo.name.toLowerCase().includes(keyword) ||
      condo.location.toLowerCase().includes(keyword) ||
      String(condo.price).includes(keyword);

    let matchesPrice = true;

    if (selectedPrice === "10000") {
      matchesPrice = condo.price <= 10000;

    } else if (selectedPrice === "15000") {
      matchesPrice =
        condo.price > 10000 &&
        condo.price <= 15000;

    } else if (selectedPrice === "above15000") {
      matchesPrice = condo.price > 15000;
    }

    return matchesKeyword && matchesPrice;
  });

  visibleCondos = results;

  if (results.length === 0) {

    searchMessage.textContent =
      "ไม่พบคอนโดที่ตรงกับเงื่อนไข";

  } else {

    searchMessage.textContent =
      "พบคอนโด " + results.length + " รายการ";
  }

  renderCondos(results);
}


// ========================================
// 15. แสดงรายการคอนโดโปรด
// ========================================

function renderFavorites() {

  favoritesResults.replaceChildren();

  const favoriteCondos = condos.filter(function (condo) {
    return isFavorite(condo.id);
  });

  if (favoriteCondos.length === 0) {

    favoritesMessage.textContent = "คุณยังไม่มีคอนโดโปรด";
    return;
  }

  favoritesMessage.textContent =
    "คอนโดโปรด " + favoriteCondos.length + " รายการ";

  favoriteCondos.forEach(function (condo) {

    const card = document.createElement("div");
    card.className = "listing-card";

    const title = document.createElement("h3");
    title.textContent = condo.name;

    const location = document.createElement("p");
    location.textContent = "ทำเล: " + condo.location;

    const price = document.createElement("p");
    price.textContent =
      "ราคาเช่า: " +
      Number(condo.price).toLocaleString("th-TH") +
      " บาท/เดือน";

    const removeButton = document.createElement("button");
    removeButton.textContent = "ลบออกจากรายการโปรด";

    removeButton.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleFavorite(condo.id);
    });

    card.style.cursor = "pointer";

    card.addEventListener("click", function () {
      showCondoDetail(condo);
    });

    card.append(title, location, price, removeButton);

    favoritesResults.appendChild(card);
  });
}


// ========================================
// 16. ตั้งค่าปุ่มค้นหา
// ========================================

searchButton.addEventListener("click", searchCondos);

searchInput.addEventListener("keydown", function (event) {

  if (event.key === "Enter") {
    searchCondos();
  }
});

priceFilter.addEventListener("change", searchCondos);


// ========================================
// 17. ตั้งค่าปุ่มปิดรายละเอียด
// ========================================

closeDetailButton.addEventListener("click", function () {
  condoDetail.hidden = true;
});


// ========================================
// 18. โหลดข้อมูลคอนโดจาก Backend
// GET /api/condos
// ========================================

async function loadCondos() {

  try {

    const response = await fetch("/api/condos");

    if (!response.ok) {
      const result = await readApiResponse(response);

      throw createApiError(
        response,
        result,
        "ไม่สามารถโหลดข้อมูลคอนโดได้"
      );
    }

    const data = await readApiResponse(response);

    if (!Array.isArray(data)) {
      throw new Error("รูปแบบข้อมูลคอนโดไม่ถูกต้อง");
    }

    condos = data;

    // ตรวจสอบรายการโปรดกับข้อมูลที่มีอยู่จริง
    favoriteIds = favoriteIds.filter(function (id) {

      return condos.some(function (condo) {
        return String(condo.id) === String(id);
      });
    });

    saveFavorites();

    visibleCondos = [...condos];

    renderCondos(visibleCondos);
    renderFavorites();

    searchMessage.textContent =
      "โหลดข้อมูลคอนโดสำเร็จ " + condos.length + " รายการ";

    console.log("โหลดข้อมูลคอนโดสำเร็จ:", condos);

  } catch (error) {

    console.error("โหลดข้อมูลคอนโดไม่สำเร็จ:", error);

    searchMessage.textContent = getUserErrorMessage(
      error,
      "ไม่สามารถโหลดข้อมูลคอนโดได้"
    );
  }
}


// ========================================
// 19. เพิ่มคอนโดใหม่
// POST /api/condos
// ========================================

addCondoForm.addEventListener("submit", async function (event) {

  event.preventDefault();

  const name = condoNameInput.value.trim();
  const location = condoLocationInput.value.trim();
  const price = Number(condoPriceInput.value);

  // ตรวจสอบข้อมูลก่อนส่งไป Backend
  if (
    !name ||
    !location ||
    condoPriceInput.value.trim() === ""
  ) {
    addCondoMessage.textContent =
      "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    return;
  }

  if (!Number.isSafeInteger(price) || price <= 0) {
    addCondoMessage.textContent =
      "ค่าเช่าต้องเป็นจำนวนเต็มมากกว่า 0 บาท";
    return;
  }

  // เก็บปุ่มที่ผู้ใช้กด Submit
  const submitButton =
    event.submitter ||
    addCondoForm.querySelector('button[type="submit"]');

  // เก็บข้อความเดิมของปุ่มไว้สำหรับคืนค่าภายหลัง
  const originalButtonText = submitButton
    ? submitButton.textContent
    : "";

  // Loading State
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "กำลังบันทึก...";
  }

  addCondoMessage.textContent = "กำลังบันทึกคอนโด...";

  try {

    // ส่ง POST Request ไปยัง Backend
    const response = await fetch("/api/condos", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        name: name,
        location: location,
        price: price
      })
    });

    const result = await readApiResponse(response);

    // ตรวจสอบ HTTP Response
    if (!response.ok) {
      throw createApiError(
        response,
        result,
        "ไม่สามารถบันทึกคอนโดได้"
      );
    }

    addCondoMessage.textContent =
      result.message || "บันทึกคอนโดสำเร็จ";

    addCondoForm.reset();

    // โหลดข้อมูลล่าสุดจาก Backend
    await loadCondos();

  } catch (error) {

    console.error("เกิดข้อผิดพลาดในการบันทึกคอนโด:", error);

    addCondoMessage.textContent = getUserErrorMessage(
      error,
      "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่"
    );

  } finally {

    // ทำงานเสมอ ไม่ว่าจะสำเร็จหรือเกิดข้อผิดพลาด
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});


// ========================================
// 20. เริ่มต้นระบบ
// ========================================

loadCondos();
