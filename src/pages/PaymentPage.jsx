// src/pages/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
// ✅ Import getBooking
import { createPaymentIntent, confirmPayment, getBooking } from "../api"; 
import Swal from "sweetalert2";
import { 
  FaLock, FaCreditCard, FaCheckCircle, FaShieldAlt, 
  FaCalendarAlt, FaBed, FaArrowLeft, FaMoon, 
  FaWifi, FaCoffee, FaTv, FaSwimmingPool, FaConciergeBell 
} from "react-icons/fa";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = loadStripe(STRIPE_KEY);

// --- Helper: Service Icons ---
const getServiceIcon = (name) => {
  if (!name) return <FaConciergeBell />;
  const n = name.toLowerCase();
  if (n.includes("wifi")) return <FaWifi />;
  if (n.includes("bed")) return <FaBed />;
  if (n.includes("coffee") || n.includes("breakfast")) return <FaCoffee />;
  if (n.includes("tv")) return <FaTv />;
  if (n.includes("pool")) return <FaSwimmingPool />;
  return <FaConciergeBell />;
};

// --- Helper: Safe Image Src ---
const safeImageSrc = (room) => {
    const raw = room?.imageUrl || room?.image || null;
    // Fallback to a high-quality luxury room image if missing
    if (!raw) return "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"; 
    if (raw.startsWith("http")) return raw;
    return `https://hotel-booking.runasp.net${raw}`;
};

// --- Component: Checkout Form ---
const CheckoutForm = ({ clientSecret, onSuccess, bookingId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cardStyle = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": { color: "#aab7c4" }
      },
      invalid: { color: "#fa755a", iconColor: "#fa755a" }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) return;

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: { name: "Hotel Guest" },
      },
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      if (result.paymentIntent.status === "succeeded") {
        try {
            await confirmPayment(bookingId); 
            onSuccess(); 
        } catch (err) {
            console.error(err);
            setError("Payment succeeded but failed to confirm with server.");
            setLoading(false);
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-4">
        <label className="form-label fw-bold text-muted small text-uppercase">Card Information</label>
        <div className="p-3 border rounded-3 bg-white shadow-sm input-group-card">
            <CardElement options={cardStyle} />
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 small py-2 rounded-3 border-0 bg-danger bg-opacity-10 text-danger">
            <FaCheckCircle className="flex-shrink-0" /> {error}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={!stripe || loading} 
        className="btn btn-primary w-100 py-3 rounded-3 shadow-sm fw-bold d-flex justify-content-center align-items-center gap-2 hover-scale"
        style={{background: 'linear-gradient(135deg, #0b2545 0%, #1e40af 100%)', border: 'none'}}
      >
        {loading ? (
          <> <span className="spinner-border spinner-border-sm"></span> Processing... </>
        ) : (
          <> <FaLock size={14} /> Pay Securely </>
        )}
      </button>
      
      <div className="text-center mt-3">
        <small className="text-muted d-flex justify-content-center align-items-center gap-1" style={{fontSize: '0.75rem'}}>
            <FaShieldAlt className="text-success"/> 256-bit SSL Encrypted Payment
        </small>
      </div>
    </form>
  );
};

// --- Main Page ---
export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [clientSecret, setClientSecret] = useState(null);
  const [bd, setBd] = useState(null); // bd = Booking Details
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function initPage() {
      try {
        setLoading(true);
        
        // 1. Get Booking Data
        try {
            const bookingRes = await getBooking(bookingId);
            setBd(bookingRes.data);
        } catch (e) {
            console.warn("Could not fetch booking details", e);
        }

        // 2. Init Payment
        const res = await createPaymentIntent(bookingId); 
        if (res.data && res.data.clientSecret) {
            setClientSecret(res.data.clientSecret);
        } else {
            setErrorMsg("Failed to initialize payment gateway.");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Error connecting to payment server.");
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) initPage();
  }, [bookingId]);

  // Calculate Nights
  const getNights = () => {
      if(!bd) return 0;
      const start = new Date(bd.startDate);
      const end = new Date(bd.endDate);
      const diff = end - start;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="payment-page bg-light d-flex align-items-center justify-content-center py-5" style={{minHeight: '100vh'}}>
      
      {loading ? (
          <div className="text-center">
              <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div>
              <p className="mt-3 text-muted fw-bold">Loading Booking...</p>
          </div>
      ) : errorMsg ? (
          <div className="card shadow-sm border-0 p-5 text-center" style={{maxWidth: 500}}>
              <div className="text-danger mb-3" style={{fontSize: '3rem'}}>⚠️</div>
              <h4 className="fw-bold text-dark">Error</h4>
              <p className="text-muted">{errorMsg}</p>
              <button onClick={() => navigate(-1)} className="btn btn-outline-secondary mt-3">Go Back</button>
          </div>
      ) : (
        <div className="container" style={{maxWidth: '1100px'}}>
            <div className="row g-0 rounded-4 overflow-hidden shadow-lg bg-white" style={{minHeight: '600px'}}>
                
                {/* 🔵 LEFT: Room Summary with Real Data */}
                <div className="col-lg-5 bg-primary text-white p-0 position-relative d-flex flex-column justify-content-between">
                    
                    {/* Background Image Overlay */}
                    <div 
                        className="position-absolute top-0 start-0 w-100 h-100" 
                        style={{
                            backgroundImage: `url(${safeImageSrc(bd?.room)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.4,
                            mixBlendMode: 'overlay' // Stunning overlay effect
                        }}
                    ></div>
                    
                    {/* Top Content */}
                    <div className="p-5 position-relative z-1">
                        <button onClick={() => navigate(-1)} className="btn btn-sm btn-outline-light border-0 mb-4 ps-0 hover-back">
                            <FaArrowLeft className="me-2"/> Back
                        </button>

                        <div className="mb-4">
                            <span className="badge bg-white text-primary px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm">
                                ROOM {bd?.room?.number}
                            </span>
                            <h2 className="fw-bold mb-1">{bd?.room?.type || "Standard"} Suite</h2>
                            <p className="opacity-75">Cairo View • Premium Stays</p>
                        </div>

                        {/* Amenities List (Real Data) */}
                        <div className="d-flex flex-wrap gap-2 mb-4">
                            {bd?.room?.services && bd.room.services.length > 0 ? (
                                bd.room.services.slice(0, 4).map(s => (
                                    <span key={s.id} className="badge bg-black bg-opacity-25 border border-white border-opacity-25 fw-normal d-flex align-items-center gap-2 px-3 py-2">
                                        {getServiceIcon(s.name)} {s.name}
                                    </span>
                                ))
                            ) : (
                                <span className="small opacity-75">All Standard Amenities Included</span>
                            )}
                        </div>
                    </div>

                    {/* Bottom Content (Price & Dates) */}
                    <div className="p-5 bg-black bg-opacity-25 position-relative z-1 backdrop-blur">
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <small className="text-uppercase opacity-50 fw-bold" style={{fontSize:'0.7rem'}}>Check-in</small>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <FaCalendarAlt className="text-warning"/> 
                                    <span className="fw-bold">{new Date(bd?.startDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="col-6">
                                <small className="text-uppercase opacity-50 fw-bold" style={{fontSize:'0.7rem'}}>Check-out</small>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <FaCalendarAlt className="text-warning"/> 
                                    <span className="fw-bold">{new Date(bd?.endDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-end border-top border-white border-opacity-25 pt-4">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <FaMoon className="text-warning"/> 
                                    <span>{getNights()} Nights</span>
                                </div>
                                <small className="opacity-50">Total Price (Inc. Taxes)</small>
                            </div>
                            <div className="text-end">
                                <h2 className="fw-bold mb-0 text-warning">{bd?.totalAmount ? bd.totalAmount.toLocaleString() : 0} <span className="fs-6 text-white">EGP</span></h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ⚪ RIGHT: Payment Form (Stripe) */}
                <div className="col-lg-7 p-5 bg-white d-flex flex-column justify-content-center">
                    <div className="mb-4">
                        <h3 className="fw-bold text-dark">Payment Details</h3>
                        <p className="text-muted">Complete your purchase by providing your payment details.</p>
                    </div>

                    {clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <CheckoutForm 
                                clientSecret={clientSecret} 
                                bookingId={bookingId} 
                                onSuccess={() => {
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Payment Successful!',
                                        text: 'Your stay is confirmed. We look forward to seeing you!',
                                        confirmButtonColor: '#0b2545',
                                        confirmButtonText: 'View My Bookings'
                                    }).then(() => {
                                        navigate("/my-bookings");
                                    });
                                }} 
                            />
                        </Elements>
                    )}
                </div>

            </div>
        </div>
      )}

      {/* 🎨 Styles */}
      <style>{`
        .input-group-card:focus-within { border-color: #1e40af !important; box-shadow: 0 0 0 4px rgba(30, 64, 175, 0.1) !important; }
        .hover-scale:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .hover-back:hover { text-decoration: underline; }
        .backdrop-blur { backdrop-filter: blur(10px); }
      `}</style>
    </div>
  );
}