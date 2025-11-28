// src/pages/BookingForm.jsx
import React, { useEffect, useState } from "react";
import { createBooking, getRoom, extractError } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import { FaCalendarCheck, FaArrowRight, FaArrowLeft, FaExclamationCircle } from "react-icons/fa";

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [roomNumber, setRoomNumber] = useState("");
  const [roomPrice, setRoomPrice] = useState(null);

  const isAuthenticated = () => !!localStorage.getItem("jwt_token");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/signin", { state: { redirect: `/book/${id}` } });
      return;
    }

    async function fetchRoom() {
      try {
        const res = await getRoom(id);
        const data = res?.data || {};
        setRoomNumber(data.number || data.Number || data.roomNumber || "");
        if (data.pricePerNight !== undefined) setRoomPrice(data.pricePerNight);
        if (data.PricePerNight !== undefined) setRoomPrice(data.PricePerNight);
      } catch (err) {
        console.error("Failed to fetch room details", err);
        setMsg({ type: "danger", text: "Could not load room details." });
      }
    }

    if (id) fetchRoom();
  }, [id, navigate]);

  const getTodayString = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString().split("T")[0];
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!startDate || !endDate) {
      return setMsg({ type: "danger", text: "Please select both check-in and check-out dates." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return setMsg({ type: "danger", text: "Check-in date cannot be in the past." });
    }

    if (end <= start) {
      return setMsg({ type: "danger", text: "Check-out must be after check-in." });
    }

    setLoading(true);

    try {
      const res = await createBooking({
        roomId: id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      const data = res?.data || {};
      const bookingId = data.bookingId || data.id || null;
      const paymentIntentId = data.paymentIntentId || data.payment_intent_id || null;
      const totalAmount = data.totalAmount ?? data.total_amount ?? null;

      if (!bookingId) {
        setMsg({ type: "danger", text: "Booking created but server response was unexpected." });
        setLoading(false);
        return;
      }

      navigate(`/payment/${bookingId}`, { state: { bookingId, paymentIntentId, totalAmount } });
    } catch (err) {
      console.error("Booking Error Details:", err?.response || err);

      const status = err?.response?.status;
      if (status === 409) {
        const text = err?.response?.data?.error || "Room already booked for these dates.";
        setMsg({ type: "danger", text });
      } else {
        const text = extractError(err) || "Something went wrong. Please try again.";
        setMsg({ type: "danger", text });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: "80vh", background: "#f8f9fa" }}>
      <div className="bg-white p-5 rounded-4 shadow-lg w-100 position-relative" style={{ maxWidth: "520px" }}>
        <button onClick={() => navigate(-1)} className="btn btn-light position-absolute top-0 start-0 m-3 rounded-circle" title="Go Back">
          <FaArrowLeft />
        </button>

        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-3">
            <FaCalendarCheck size={30} />
          </div>
          <h3 className="fw-bold">Secure Your Stay</h3>
          <p className="text-muted">
            Booking Room <span className="text-primary fw-bold">{roomNumber ? `#${roomNumber}` : "Loading..."}</span>
          </p>
          {roomPrice !== null && <small className="text-secondary">Price / night: {roomPrice}</small>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="fw-bold small mb-1 text-muted">Check-in Date</label>
            <input
              type="date"
              className="form-control bg-light border-0 py-3"
              value={startDate}
              min={getTodayString()}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="fw-bold small mb-1 text-muted">Check-out Date</label>
            <input
              type="date"
              className="form-control bg-light border-0 py-3"
              value={endDate}
              min={startDate || getTodayString()}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm d-flex justify-content-center align-items-center gap-2"
            disabled={loading}
          >
            {loading ? <span>Processing...</span> : <>Confirm Booking <FaArrowRight /></>}
          </button>

          {msg.text && (
            <div className={`alert alert-${msg.type} mt-4 text-center d-flex align-items-center justify-content-center gap-2`}>
              {msg.type === "danger" && <FaExclamationCircle />}
              {msg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
