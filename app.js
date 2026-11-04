const STORAGE_KEY = "cottage_bookings_v1";

const COTTAGES = [
  { id: "c1", name: "Уютный", description: "Небольшой тёплый дом для тихого выезда вдвоём.", capacity: 2, pricePerNight: 3500, x: 24, y: 72, initiallyBusy: false, amenities: ["wifi", "parking"], floors: 1 },
  { id: "c2", name: "Тихий", description: "Одноэтажный домик для спокойных выходных с мангалом.", capacity: 3, pricePerNight: 4200, x: 42, y: 73, initiallyBusy: false, amenities: ["wifi", "mangal", "parking"], floors: 1 },
  { id: "c3", name: "Семейный", description: "Два этажа, баня и место для семейного вечера.", capacity: 5, pricePerNight: 6000, x: 58, y: 62, initiallyBusy: false, amenities: ["wifi", "banya", "mangal", "parking", "boiler"], floors: 2 },
  { id: "c4", name: "Сосновый", description: "Светлый дом среди сосен для большой компании.", capacity: 6, pricePerNight: 7000, x: 70, y: 54, initiallyBusy: false, amenities: ["wifi", "banya", "mangal", "parking", "boiler"], floors: 2 },
  { id: "c5", name: "Усадьба", description: "Просторная территория, бассейн и всё для долгого отдыха.", capacity: 8, pricePerNight: 9500, x: 82, y: 38, initiallyBusy: false, amenities: ["wifi", "banya", "mangal", "parking", "pool", "boiler"], floors: 2 },
  { id: "c6", name: "Панорама", description: "Большой дом с бассейном и видом на озёрную кромку.", capacity: 7, pricePerNight: 8800, x: 84, y: 65, initiallyBusy: false, amenities: ["wifi", "banya", "mangal", "parking", "pool", "boiler"], floors: 2 },
  { id: "c7", name: "Лесной", description: "Дом в тени деревьев — сейчас занят другим гостем.", capacity: 4, pricePerNight: 5000, x: 64, y: 19, initiallyBusy: true, amenities: ["wifi", "mangal", "parking"], floors: 1 },
  { id: "c8", name: "Озёрный", description: "Двухэтажный дом у воды — сейчас занят другим гостем.", capacity: 5, pricePerNight: 7500, x: 59, y: 78, initiallyBusy: true, amenities: ["wifi", "banya", "mangal", "parking", "boiler"], floors: 2 }
];

const AMENITIES = {
  wifi: ["📶", "Wi-Fi"], banya: ["♨️", "Баня"], mangal: ["🔥", "Мангал"],
  parking: ["🚗", "Парковка"], pool: ["🏊", "Бассейн"], boiler: ["♨", "Котельная"]
};

const state = { selectedId: null, filters: { minCapacity: 0, maxPrice: 0 }, ownBookings: [] };
const elements = {
  mapHouses: document.querySelector("#map-houses"), cottageList: document.querySelector("#cottage-list"), cottageCard: document.querySelector("#cottage-card"),
  bookingForm: document.querySelector("#booking-form"), guests: document.querySelector("#guests"), nights: document.querySelector("#nights"),
  calculationText: document.querySelector("#calculation-text"), calculationTotal: document.querySelector("#calculation-total"), bookingsList: document.querySelector("#bookings-list"),
  liveMessage: document.querySelector("#live-message"), bookingCount: document.querySelector("#booking-count"), submit: document.querySelector("#submit-booking"),
  capacityFilter: document.querySelector("#capacity-filter"), priceFilter: document.querySelector("#price-filter")
};

const formatCurrency = value => new Intl.NumberFormat("ru-RU").format(value) + " ₽";
const calculateTotal = (pricePerNight, nights) => pricePerNight * nights;
const cottageById = id => COTTAGES.find(cottage => cottage.id === id);
const ownBookingFor = cottageId => state.ownBookings.find(booking => booking.cottageId === cottageId);
const isBusy = cottage => cottage.initiallyBusy || Boolean(ownBookingFor(cottage.id));
const visibleCottages = () => COTTAGES.filter(cottage => {
  const capacityMatch = cottage.capacity >= state.filters.minCapacity;
  const priceMatch = !state.filters.maxPrice || cottage.pricePerNight <= state.filters.maxPrice;
  return capacityMatch && priceMatch;
});

function setMessage(message) {
  elements.liveMessage.textContent = message;
  if (message) window.setTimeout(() => { if (elements.liveMessage.textContent === message) elements.liveMessage.textContent = ""; }, 5000);
}

function readBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const valid = Array.isArray(parsed) && parsed.every(booking => {
      return booking && typeof booking.id === "string" && typeof booking.cottageId === "string" && cottageById(booking.cottageId) &&
        typeof booking.cottageName === "string" && Number.isInteger(booking.guests) && booking.guests >= 1 &&
        Number.isInteger(booking.nights) && booking.nights >= 1 && booking.nights <= 30 && Number.isFinite(booking.total) && typeof booking.createdAt === "string";
    });
    if (!valid) throw new Error("invalid structure");
    return parsed;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    setMessage("Не удалось прочитать сохранённые брони, данные сброшены");
    return [];
  }
}

function persistBookings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ownBookings)); }

function renderMap() {
  const visible = new Set(visibleCottages().map(cottage => cottage.id));
  elements.mapHouses.innerHTML = COTTAGES.map(cottage => {
    if (!visible.has(cottage.id)) return "";
    const busy = isBusy(cottage);
    const selected = state.selectedId === cottage.id && !busy;
    const status = busy ? "Занят" : selected ? "Выбран" : "Свободен";
    return `<button class="map-house ${busy ? "busy" : selected ? "selected" : ""}" style="left:${cottage.x}%;top:${cottage.y}%" data-cottage-id="${cottage.id}" type="button" ${busy ? "aria-disabled=\"true\"" : ""} aria-label="${cottage.name}, ${status}" title="${cottage.name} — ${status}"><span class="house-icon" aria-hidden="true">🏠</span><span>${cottage.name}</span><span class="house-status">${status}</span></button>`;
  }).join("");
  elements.mapHouses.querySelectorAll(".map-house").forEach(button => button.addEventListener("click", () => selectCottage(button.dataset.cottageId)));
}

function amenityMarkup(keys, className = "amenity") {
  return keys.map(key => `<span class="${className}">${AMENITIES[key][0]} ${AMENITIES[key][1]}</span>`).join("");
}

function renderList() {
  const cottages = visibleCottages();
  if (!cottages.length) {
    elements.cottageList.innerHTML = `<p class="empty-result">Ничего не найдено. Измените фильтры.</p>`;
    return;
  }
  elements.cottageList.innerHTML = cottages.map(cottage => {
    const busy = isBusy(cottage);
    const selected = state.selectedId === cottage.id && !busy;
    const status = busy ? "Занят" : selected ? "Выбран" : "Свободен";
    return `<article class="cottage-row ${busy ? "is-busy" : ""} ${selected ? "is-selected" : ""}">
      <div class="row-name"><strong>${cottage.name}</strong><small>${cottage.floors} этаж · до ${cottage.capacity} гостей</small></div>
      <span class="row-meta">до ${cottage.capacity} гостей</span>
      <strong class="row-price">${formatCurrency(cottage.pricePerNight)}<small>/ночь</small></strong>
      <div class="amenity-list">${amenityMarkup(cottage.amenities)}</div>
      <span class="status ${busy ? "busy" : selected ? "selected" : ""}">${status}</span>
      <button class="outline-button" type="button" data-select-id="${cottage.id}" ${busy ? "disabled aria-label=\"${cottage.name} занят\"" : "aria-label=\"Выбрать дом ${cottage.name}\""}>${busy ? "Недоступен" : selected ? "Выбран" : "Выбрать"}</button>
    </article>`;
  }).join("");
  elements.cottageList.querySelectorAll("[data-select-id]").forEach(button => button.addEventListener("click", () => selectCottage(button.dataset.selectId, button)));
}

function renderCard() {
  const cottage = cottageById(state.selectedId);
  if (!cottage || isBusy(cottage)) {
    elements.cottageCard.className = "cottage-card empty-card";
    elements.cottageCard.innerHTML = `<p class="section-number">03 / детали</p><h2 id="card-title">Домик не выбран</h2><p>Выберите свободный домик на схеме или в списке, чтобы увидеть подробности и рассчитать поездку.</p>`;
    elements.submit.disabled = true;
    elements.guests.value = ""; elements.nights.value = "";
    elements.guests.max = "8";
    updateCalculation();
    return;
  }
  elements.cottageCard.className = "cottage-card";
  elements.cottageCard.innerHTML = `<p class="section-number">03 / детали</p><h2 id="card-title">${cottage.name}</h2><p>${cottage.description}</p>
    <div class="card-info"><span>⌂ до ${cottage.capacity} гостей</span><span>↕ ${cottage.floors} ${cottage.floors === 1 ? "этаж" : "этажа"}</span><span>◷ ${formatCurrency(cottage.pricePerNight)} / ночь</span></div>
    <div class="card-amenities">${amenityMarkup(cottage.amenities, "card-amenity")}</div>`;
  elements.submit.disabled = false;
  elements.guests.max = String(cottage.capacity);
  document.querySelector("#guests-hint").textContent = `От 1 до ${cottage.capacity} гостей`;
  updateCalculation();
}

function renderBookings() {
  elements.bookingCount.textContent = String(state.ownBookings.length);
  if (!state.ownBookings.length) {
    elements.bookingsList.innerHTML = `<p class="booking-empty">Здесь появятся ваши брони. Выберите домик выше, чтобы начать.</p>`;
    return;
  }
  elements.bookingsList.innerHTML = state.ownBookings.map(booking => `<article class="booking-entry"><div class="booking-entry-main"><strong>${booking.cottageName}</strong><span>${booking.guests} ${pluralize(booking.guests, "гость", "гостя", "гостей")} · ${booking.nights} ${pluralize(booking.nights, "ночь", "ночи", "ночей")} · ${formatCurrency(booking.total)}</span></div><button class="cancel-button" type="button" data-cancel-id="${booking.id}">Отменить</button></article>`).join("");
  elements.bookingsList.querySelectorAll("[data-cancel-id]").forEach(button => button.addEventListener("click", () => cancelBooking(button.dataset.cancelId)));
}

function pluralize(number, one, few, many) {
  const mod10 = number % 10, mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function updateCalculation() {
  const cottage = cottageById(state.selectedId);
  const nights = Number(elements.nights.value);
  if (!cottage) { elements.calculationText.textContent = "Выберите дом, чтобы увидеть расчёт"; elements.calculationTotal.textContent = ""; return; }
  elements.calculationText.textContent = `${formatCurrency(cottage.pricePerNight)} × ${Number.isFinite(nights) && nights > 0 ? nights : "—"} ночи`;
  elements.calculationTotal.textContent = Number.isInteger(nights) && nights > 0 ? formatCurrency(calculateTotal(cottage.pricePerNight, nights)) : "";
}

function clearErrors() { ["guests", "nights"].forEach(name => { document.querySelector(`#${name}`).removeAttribute("aria-invalid"); document.querySelector(`#${name}-error`).textContent = ""; }); }
function validateForm() {
  clearErrors();
  const cottage = cottageById(state.selectedId);
  if (!cottage) { setMessage("Сначала выберите дом"); return null; }
  const values = { guests: elements.guests.value.trim(), nights: elements.nights.value.trim() };
  const errors = {};
  if (!values.guests || !/^\d+$/.test(values.guests) || Number(values.guests) < 1 || Number(values.guests) > cottage.capacity) errors.guests = `Укажите целое число от 1 до ${cottage.capacity}`;
  if (!values.nights || !/^\d+$/.test(values.nights) || Number(values.nights) < 1 || Number(values.nights) > 30) errors.nights = "Укажите целое число от 1 до 30";
  Object.entries(errors).forEach(([name, message]) => { document.querySelector(`#${name}`).setAttribute("aria-invalid", "true"); document.querySelector(`#${name}-error`).textContent = message; });
  if (Object.keys(errors).length) { setMessage("Проверьте поля формы"); document.querySelector(`#${Object.keys(errors)[0]}`).focus(); return null; }
  return { cottage, guests: Number(values.guests), nights: Number(values.nights) };
}

function selectCottage(id, focusTarget = null) {
  const cottage = cottageById(id);
  if (!cottage) return;
  if (isBusy(cottage)) { setMessage("Этот дом занят и недоступен для выбора"); return; }
  state.selectedId = state.selectedId === id ? null : id;
  render();
  if (state.selectedId) { document.querySelector("#cottage-card")?.focus?.(); document.querySelector("#booking-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  else if (focusTarget) focusTarget.focus();
}

function render() { renderMap(); renderList(); renderCard(); renderBookings(); }

elements.capacityFilter.addEventListener("change", event => { state.filters.minCapacity = Number(event.target.value); applyFilters(); });
elements.priceFilter.addEventListener("change", event => { state.filters.maxPrice = Number(event.target.value); applyFilters(); });
document.querySelector("#reset-filters").addEventListener("click", () => { state.filters = { minCapacity: 0, maxPrice: 0 }; elements.capacityFilter.value = "0"; elements.priceFilter.value = "0"; applyFilters(); });
function applyFilters() {
  if (state.selectedId && !visibleCottages().some(cottage => cottage.id === state.selectedId)) { state.selectedId = null; setMessage("Выбранный дом больше не подходит фильтрам, выбор снят"); }
  render();
}
elements.guests.addEventListener("input", updateCalculation); elements.nights.addEventListener("input", updateCalculation);
elements.bookingForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = validateForm();
  if (!data || isBusy(data.cottage)) { if (data) setMessage("Этот дом уже занят"); return; }
  elements.submit.disabled = true;
  const booking = { id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, cottageId: data.cottage.id, cottageName: data.cottage.name, guests: data.guests, nights: data.nights, total: calculateTotal(data.cottage.pricePerNight, data.nights), createdAt: new Date().toISOString() };
  state.ownBookings = [...state.ownBookings, booking]; persistBookings(); state.selectedId = null; elements.bookingForm.reset(); clearErrors(); render(); setMessage(`Бронь дома «${booking.cottageName}» сохранена`); document.querySelector("#bookings")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
document.querySelector("#clear-bookings").addEventListener("click", () => {
  if (!state.ownBookings.length) { setMessage("У вас пока нет броней"); return; }
  if (!window.confirm("Очистить все ваши брони? Изначально занятые дома не изменятся.")) return;
  state.ownBookings = []; persistBookings(); state.selectedId = null; render(); setMessage("Ваши брони очищены");
});
function cancelBooking(id) { const booking = state.ownBookings.find(item => item.id === id); if (!booking) return; state.ownBookings = state.ownBookings.filter(item => item.id !== id); persistBookings(); render(); setMessage(`Бронь дома «${booking.cottageName}» отменена`); }

state.ownBookings = readBookings();
render();

export { COTTAGES, calculateTotal };
