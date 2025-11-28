// src/pages/RoomDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
// ✅ Ensure addReview and getReviews are exported from api.js
import { getRoom, addReview, getReviews } from "../api";
import Swal from "sweetalert2";
import { 
  FaBed, FaWifi, FaCoffee, FaCheck, FaArrowLeft, 
  FaConciergeBell, FaStar, FaUserCircle, FaSwimmingPool, FaTv, FaBath, FaCheckCircle 
} from "react-icons/fa";

// ==========================================
// 1. MAIN COMPONENT (Default Export)
// ==========================================
export default function RoomDetails() {
  const { id } = useParams();
  
  // Room Data State
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- Helper: Dynamic Icon ---
  const getServiceIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes("wifi")) return <FaWifi />;
    if (n.includes("bed") || n.includes("sleep")) return <FaBed />;
    if (n.includes("bath") || n.includes("shower")) return <FaBath />;
    if (n.includes("coffee") || n.includes("breakfast")) return <FaCoffee />;
    if (n.includes("tv")) return <FaTv />;
    if (n.includes("pool")) return <FaSwimmingPool />;
    return <FaCheck />;
  };

  // --- Helper: Safe Image ---
  const safeImageSrc = (r) => {
    const raw = r?.imageUrl || r?.image || null;
    if (!raw) return "https://placehold.co/600x400?text=No+Image";
    if (raw.startsWith("http")) return raw;
    return `https://hotel-booking.runasp.net${raw}`;
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // 1. Get Room Details
        const res = await getRoom(id);
        if (mounted) setRoom(res.data);

        // 2. Get Reviews
        const revRes = await getReviews(id);
        if (mounted) setReviews(revRes.data || []);

      } catch (e) {
        setErr("Failed to load room details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (id) load();
    return () => (mounted = false);
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("jwt_token");
    if (!token) return Swal.fire("Login Required", "Please login to leave a review.", "warning");

    setSubmittingReview(true);
    try {
        await addReview({ roomId: id, rating: newRating, comment: newComment });
        
        const user = JSON.parse(localStorage.getItem("user"));
        setReviews(prev => [{
            id: Date.now(), 
            userName: user?.fullName || "Me",
            rating: newRating,
            comment: newComment,
            date: new Date().toISOString()
        }, ...prev]);

        setNewComment("");
        setNewRating(5);
        Swal.fire("Thanks!", "Your review has been posted.", "success");
    } catch (err) {
        // Handle common error: user didn't book room (if backend checks)
        Swal.fire("Error", "Unable to post review. You may need to book this room first.", "error");
    } finally {
        setSubmittingReview(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (err || !room) return <div className="container py-5 text-center text-danger"><h3>{err || "Room not found"}</h3></div>;

  return (
    <div className="container py-5">
      <Link to="/rooms" className="text-decoration-none text-muted mb-4 d-inline-block fw-bold hover-scale">
        <FaArrowLeft className="me-2"/> Back to Rooms
      </Link>
      
      <div className="row g-5">
        
        {/* Left: Image & Title */}
        <div className="col-lg-7">
          <div className="rounded-4 overflow-hidden shadow-lg position-relative room-hero-image" style={{ minHeight: "450px" }}>
             <img 
               src={safeImageSrc(room)} 
               alt="Room" 
               className="w-100 h-100 object-fit-cover transition-transform"
               onError={(e) => e.target.src="https://placehold.co/600x400?text=No+Image"} 
             />
             <div className="position-absolute bottom-0 start-0 p-4 bg-gradient-dark text-white w-100" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'}}>
                <div className="d-flex align-items-end justify-content-between">
                    <div>
                        <span className="badge bg-warning text-dark mb-2">PREMIUM</span>
                        <h1 className="fw-bold mb-0 display-6">Room {room.number}</h1>
                        <p className="mb-0 opacity-75">{room.type} Suite • Cairo View</p>
                    </div>
                    <div className="text-end">
                        <div className="d-flex align-items-center gap-1 text-warning">
                            <FaStar /> <span className="fw-bold text-white">4.9</span> <span className="small opacity-75 text-white">({reviews.length} reviews)</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* Reviews Section (Desktop) */}
          <div className="mt-5 d-none d-lg-block">
             <ReviewsSection 
                reviews={reviews} 
                handleSubmitReview={handleSubmitReview} 
                newRating={newRating} 
                setNewRating={setNewRating} 
                newComment={newComment} 
                setNewComment={setNewComment} 
                submittingReview={submittingReview} 
             />
          </div>
        </div>

        {/* Right: Info & Booking */}
        <div className="col-lg-5">
          <div className="p-4 bg-white rounded-4 shadow-sm border sticky-top" style={{top: '100px'}}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <span className="d-block text-muted small text-uppercase fw-bold">Price per night</span>
                    <h2 className="fw-bold text-primary mb-0">{room.pricePerNight} <small className="fs-6 text-dark">EGP</small></h2>
                </div>
                <div className="text-end">
                    <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">Available Now</span>
                </div>
            </div>
            
            <hr className="my-4 text-muted opacity-10" />
            
            <h6 className="fw-bold mb-3 text-dark">About this room</h6>
            <p className="text-muted lh-lg mb-4" style={{fontSize: '0.95rem'}}>
              {room.description || "Experience luxury and comfort in this beautifully designed room. Perfect for relaxation after a long day of travel. Featuring modern decor, high-speed amenities, and a breathtaking view."}
            </p>

            {/* Amenities */}
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaConciergeBell className="text-primary"/> Amenities
            </h6>
            
            <div className="d-flex flex-wrap gap-2 mb-5">
              {room.services && room.services.length > 0 ? (
                room.services.map((service) => (
                  <span key={service.id} className="badge bg-light text-secondary border fw-normal py-2 px-3 d-flex align-items-center gap-2">
                    <span className="text-primary">{getServiceIcon(service.name)}</span>
                    {service.name}
                  </span>
                ))
              ) : (
                <span className="text-muted small fst-italic">Standard amenities included.</span>
              )}
            </div>

            <Link to={`/book/${room.id}`} className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm hover-scale transition">
              Book This Room Now
            </Link>
            
            <div className="text-center mt-3">
                <small className="text-muted">No credit card required for reservation</small>
            </div>
          </div>
        </div>

        {/* Reviews Section (Mobile) */}
        <div className="col-12 d-lg-none">
             <ReviewsSection 
                reviews={reviews} 
                handleSubmitReview={handleSubmitReview} 
                newRating={newRating} 
                setNewRating={setNewRating} 
                newComment={newComment} 
                setNewComment={setNewComment} 
                submittingReview={submittingReview} 
             />
        </div>

      </div>
      
      <style>{`
        .hover-scale:hover { transform: translateY(-2px); }
        .transition { transition: all 0.3s ease; }
        .room-hero-image img { transition: transform 0.5s ease; }
        .room-hero-image:hover img { transform: scale(1.03); }
      `}</style>
    </div>
  );
}

// ==========================================
// 2. SUB-COMPONENT: REVIEWS SECTION
// ==========================================
const ReviewsSection = ({ reviews, handleSubmitReview, newRating, setNewRating, newComment, setNewComment, submittingReview }) => {
    
    // Calculate Rating Breakdown
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
        : "0.0";
    
    const getPercentage = (star) => {
        if (totalReviews === 0) return 0;
        const count = reviews.filter(r => r.rating === star).length;
        return (count / totalReviews) * 100;
    };

    return (
        <div className="pt-5 mt-5 border-top">
            <div className="row g-5">
                
                {/* 📊 LEFT: Rating Summary & Form */}
                <div className="col-lg-4">
                    <div className="sticky-top" style={{top: '100px'}}>
                        
                        {/* Summary Card */}
                        <div className="bg-white p-4 rounded-4 shadow-sm border mb-4 text-center text-lg-start">
                            <h4 className="fw-bold text-dark mb-1">Guest Reviews</h4>
                            <div className="d-flex align-items-center justify-content-center justify-content-lg-start gap-3 mb-4">
                                <h1 className="fw-bold text-dark display-4 mb-0">{averageRating}</h1>
                                <div>
                                    <div className="d-flex text-warning mb-1">
                                        {[...Array(5)].map((_, i) => (
                                            <FaStar key={i} size={18} className={i < Math.round(averageRating) ? "" : "text-light-gray opacity-25"} />
                                        ))}
                                    </div>
                                    <small className="text-muted fw-bold">{totalReviews} verified reviews</small>
                                </div>
                            </div>

                            {/* Rating Bars */}
                            <div className="d-flex flex-column gap-2 mb-4">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <div key={star} className="d-flex align-items-center gap-2" style={{fontSize: '0.8rem'}}>
                                        <span className="fw-bold text-muted" style={{width: '10px'}}>{star}</span>
                                        <div className="progress flex-grow-1" style={{height: '6px', backgroundColor: '#f1f5f9'}}>
                                            <div 
                                                className="progress-bar bg-warning rounded-pill" 
                                                role="progressbar" 
                                                style={{width: `${getPercentage(star)}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Review Form */}
                        <div className="bg-primary bg-opacity-10 p-4 rounded-4 border border-primary border-opacity-10">
                            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                <FaCheckCircle /> Write a Review
                            </h6>
                            <form onSubmit={handleSubmitReview}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase" style={{fontSize:'0.65rem'}}>Your Rating</label>
                                    <div className="d-flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <FaStar 
                                                key={star} 
                                                size={28} 
                                                className={`cursor-pointer transition-all hover-scale ${star <= newRating ? "text-warning drop-shadow" : "text-white opacity-50"}`}
                                                onClick={() => setNewRating(star)}
                                                style={{filter: star <= newRating ? 'drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3))' : 'none'}}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase" style={{fontSize:'0.65rem'}}>Your Experience</label>
                                    <textarea 
                                        className="form-control border-0 shadow-sm" 
                                        rows="4" 
                                        placeholder="What did you like about your stay?" 
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        required
                                        style={{resize: 'none'}}
                                    ></textarea>
                                </div>

                                <button className="btn btn-primary w-100 fw-bold rounded-pill py-2 shadow-sm" disabled={submittingReview}>
                                    {submittingReview ? "Posting..." : "Submit Review"}
                                </button>
                            </form>
                        </div>

                    </div>
                </div>

                {/* 💬 RIGHT: Reviews List */}
                <div className="col-lg-8">
                    <h5 className="fw-bold mb-4">Recent Feedback</h5>
                    
                    {reviews.length === 0 ? (
                        <div className="text-center py-5 bg-light rounded-4 border border-dashed">
                            <div className="mb-3 text-muted opacity-25" style={{fontSize: '3rem'}}>💬</div>
                            <h6 className="fw-bold text-muted">No reviews yet</h6>
                            <p className="small text-muted mb-0">Be the first to share your experience with us!</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="card border-0 shadow-sm rounded-4 hover-shadow transition">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <div 
                                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" 
                                                    style={{
                                                        width: '45px', 
                                                        height: '45px', 
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        fontSize: '1.1rem'
                                                    }}
                                                >
                                                    {rev.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h6 className="fw-bold mb-0 text-dark">{rev.userName}</h6>
                                                    <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                                        {new Date(rev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="bg-light px-3 py-1 rounded-pill d-flex align-items-center gap-1 border">
                                                <FaStar className="text-warning" size={12} />
                                                <span className="fw-bold small">{rev.rating}.0</span>
                                            </div>
                                        </div>
                                        
                                        <p className="mb-0 text-secondary" style={{lineHeight: '1.6', fontSize: '0.95rem'}}>
                                            "{rev.comment}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
            
            <style>{`
                .hover-scale:hover { transform: scale(1.1); }
                .hover-shadow:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.08) !important; transform: translateY(-2px); }
                .transition { transition: all 0.3s ease; }
                .border-dashed { border-style: dashed !important; }
            `}</style>
        </div>
    );
};