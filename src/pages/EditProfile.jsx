// src/pages/EditProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../api"; // تأكد من إضافتها في api.js
import { FaUser, FaEnvelope, FaPhone, FaSave, FaArrowLeft } from "react-icons/fa";
import Swal from "sweetalert2";

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: ""
  });

  // 🛠️ دالة فك التوكن (نفس المستخدمة في SignIn)
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) { return null; }
  };

  // تحميل البيانات الحالية
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        setFormData({
          fullName: user.fullName || user.name || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || user.phone || ""
        });
      } else {
        navigate("/signin");
      }
    } catch (e) {
      navigate("/signin");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. إرسال البيانات للسيرفر
      const res = await updateProfile(formData);
      
      // 2. السيرفر بيرد بتوكن جديد فيه البيانات المعدلة
      const newToken = res.data.token;
      
      if (newToken) {
        // تحديث التوكن في المتصفح
        localStorage.setItem("jwt_token", newToken);

        // استخراج البيانات الجديدة من التوكن وحفظها
        const decoded = parseJwt(newToken);
        
        // استخراج البيانات بحسب مفاتيح .NET Identity
        const rawRole = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded["role"] || "user";
        const rawName = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded["unique_name"];
        const rawEmail = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || decoded["email"];
        const rawPhone = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone"] || decoded["mobilephone"];

        const updatedUser = {
          fullName: rawName,
          email: rawEmail,
          phoneNumber: rawPhone,
          role: String(rawRole).toLowerCase() === "admin" ? "admin" : "user"
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // تحديث الناف بار فوراً
        window.dispatchEvent(new Event("user-login"));

        Swal.fire({
            icon: 'success',
            title: 'Profile Updated!',
            text: 'Your information has been saved successfully.',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            navigate("/profile");
        });
      }

    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.error || "Something went wrong. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: "85vh", backgroundColor: "#f8f9fa" }}>
      <div className="bg-white p-5 rounded-4 shadow-lg" style={{ width: "600px", maxWidth: "95%" }}>
        
        <div className="d-flex align-items-center mb-4">
            <button onClick={() => navigate(-1)} className="btn btn-light rounded-circle me-3 text-muted">
                <FaArrowLeft />
            </button>
            <h3 className="fw-bold mb-0 text-dark">Edit Profile</h3>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Full Name */}
          <div className="mb-4">
             <label className="form-label fw-bold small text-muted text-uppercase">Full Name</label>
             <div className="input-group input-group-lg">
                <span className="input-group-text bg-light border-0 text-primary"><FaUser /></span>
                <input 
                    name="fullName" 
                    type="text" 
                    className="form-control bg-light border-0 fs-6" 
                    placeholder="Your Name"
                    value={formData.fullName} 
                    onChange={handleChange} 
                    required 
                />
             </div>
          </div>

          {/* Email */}
          <div className="mb-4">
             <label className="form-label fw-bold small text-muted text-uppercase">Email Address</label>
             <div className="input-group input-group-lg">
                <span className="input-group-text bg-light border-0 text-primary"><FaEnvelope /></span>
                <input 
                    name="email" 
                    type="email" 
                    className="form-control bg-light border-0 fs-6" 
                    placeholder="name@example.com"
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                />
             </div>
          </div>

          {/* Phone Number */}
          <div className="mb-5">
             <label className="form-label fw-bold small text-muted text-uppercase">Phone Number</label>
             <div className="input-group input-group-lg">
                <span className="input-group-text bg-light border-0 text-primary"><FaPhone /></span>
                <input 
                    name="phoneNumber" 
                    type="tel" 
                    className="form-control bg-light border-0 fs-6" 
                    placeholder="010xxxxxxxxx"
                    value={formData.phoneNumber} 
                    onChange={handleChange} 
                    required 
                />
             </div>
          </div>

          <div className="d-grid gap-2">
            <button 
                type="submit" 
                className="btn btn-primary btn-lg fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
            >
                {loading ? "Saving..." : <><FaSave /> Save Changes</>}
            </button>
            <button 
                type="button" 
                className="btn btn-light text-muted fw-bold rounded-3"
                onClick={() => navigate("/profile")}
                disabled={loading}
            >
                Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}