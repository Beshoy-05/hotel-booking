// src/api.js
import axios from "axios";

// ✅ نستخدم /api فقط لأن الـ Proxy في Vite هيتولى الباقي
const API_BASE_URL = "/api/proxy";


// 1. توحيد الاسم: نستخدم API (كابيتال) في كل مكان
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, 
});

// 🛠️ إضافة التوكن تلقائياً لكل الطلبات
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================================================
// 🔐 Auth (المصادقة)
// ==================================================
export const login = (data) => API.post("/Auth/login", data);
export const register = (data) => API.post("/Auth/register", data);
export const forgotPassword = (data) => API.post("/Auth/forgot-password", data);
export const updateProfile = (data) => API.put("/Auth/update-profile", data);
export const googleLogin = (token) => API.post("/Auth/google-login", { token });
export const resetPassword = (data) => API.post("/Auth/reset-password", data);
// ==================================================
// 🏨 Rooms (الغرف)
// ==================================================
export const getRooms = () => API.get("/Rooms");
export const getRoom = (id) => API.get(`/Rooms/${id}`);
export const searchRooms = (params) => API.get('/Rooms/search', { params });
export const addReview = (data) => API.post("/Reviews", data);
export const getReviews = (roomId) => API.get(`/Reviews/${roomId}`);

// (للأدمن فقط)
export const createRoom = (data) => API.post("/Rooms", data, {
  headers: { "Content-Type": "multipart/form-data" } 
});
export const updateRoom = (id, data) => API.put(`/Rooms/${id}`, data, {
  headers: { "Content-Type": "multipart/form-data" }
});
export const deleteRoom = (id) => API.delete(`/Rooms/${id}`);

// ==================================================
// 📅 Bookings (الحجوزات)
// ==================================================
export const createBooking = (data) => API.post("/Bookings", data);
export const myBookings = () => API.get("/Bookings/my-bookings");
export const getBooking = (id) => API.get(`/Bookings/${id}`);
export const cancelBooking = (id) => API.put(`/Bookings/${id}/cancel`);

// ==================================================
// 💳 Payment (الدفع)
// ==================================================
export const checkPaymentStatus = (paymentIntentId) =>
  API.get(`/Payment/status/${encodeURIComponent(paymentIntentId)}`);

export const getPaymentStatus = checkPaymentStatus; // alias
export const createPaymentIntent = (bookingId) => API.post("/Payment/create-payment-intent", { bookingId });
export const confirmPayment = (bookingId) => API.post("/Payment/confirm-payment", { bookingId });
// ==================================================
// 📩 Contact & Messages (التواصل)
// ==================================================
export const sendMessage = (data) => API.post("/Contact/send-message", data);
export const getMessages = () => API.get("/Admin/messages");
export const getMessage = (id) => API.get(`/Admin/messages/${id}`);
export const markMessageRead = (id) => API.put(`/Admin/messages/${id}/mark-read`);
export const deleteMessage = (id) => API.delete(`/Admin/messages/${id}`);

// ==================================================
// 👮‍♂️ Admin Dashboard (لوحة الأدمن)
// ==================================================
export const getUsers = () => API.get("/Admin/users");
export const getUser = (id) => API.get(`/Admin/users/${id}`);
export const assignRole = (id, data) => API.post(`/Admin/users/${id}/assign-role`, data);
export const removeRole = (id) => API.post(`/Admin/users/${id}/remove-role`, {});

export const getAdminBookings = () => API.get("/Admin/bookings");
export const approveBooking = (id) => API.put(`/Admin/bookings/${id}/approve`);
export const rejectBooking = (id) => API.delete(`/Admin/bookings/${id}/reject`); 
export const completeBooking = (id) => API.put(`/Admin/bookings/${id}/complete`);

// ==================================================
// 🛎️ Services (الخدمات)
// ==================================================
export const getServices = () => API.get("/Services");
export const createService = (data) => API.post("/Services", data);
export const deleteService = (id) => API.delete(`/Services/${id}`);
export default API;
// ===============================
// 🛠️ Helper: Extract error message
// ===============================
export function extractError(err) {
  const res = err?.response;

  // Network error or request didn't reach server
  if (!res) return err?.message || "Network error";

  // Server returned JSON with error/message fields
  if (res.data) {
    if (typeof res.data === "string") return res.data;
    if (res.data.error) return res.data.error;
    if (res.data.message) return res.data.message;
    if (res.data.detail) return res.data.detail;
  }

  return `Server error (${res.status})`;
}
