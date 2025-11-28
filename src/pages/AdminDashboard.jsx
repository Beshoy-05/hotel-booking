// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";

// Import Icons (Added FaConciergeBell for Services)
import {
  FaUser, FaUserShield, FaBed, FaCalendarCheck, FaPlus,
  FaTrash, FaCheckCircle, FaTimesCircle, FaSignOutAlt, FaSync, FaImage, FaEdit,
  FaConciergeBell, FaTag
} from "react-icons/fa";

// ... (Toast Configuration remains the same) ...
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

export default function AdminDashboard() {
  const navigate = useNavigate();

  // --- States ---
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // [NEW] Services State
  const [services, setServices] = useState([]); 
  
  const [loading, setLoading] = useState(true);

  // Add Room States
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // [NEW] Selected Services for New Room
  const [selectedServiceIds, setSelectedServiceIds] = useState([]); 

  const [submitting, setSubmitting] = useState(false);

  // [NEW] Service Creation States (For the Service Manager Panel)
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(""); // Optional if services have separate costs
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // Edit Room States
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [editType, setEditType] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  
  // [NEW] Selected Services for Edit Room
  const [editServiceIds, setEditServiceIds] = useState([]);

  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Action Loading State
  const [actionLoading, setActionLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      localStorage.clear();
    }

    const role = user?.role ? String(user.role).toLowerCase() : "";

    if (!user || role !== "admin") {
      navigate("/signin");
      return;
    }

    loadData();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (editPreview) URL.revokeObjectURL(editPreview);
    };
  }, [preview, editPreview]);

  // --- Helpers & API Calls ---
  async function loadData() {
    try {
      setLoading(true);
      // [UPDATED] Added Services API Call
      const [uRes, bRes, rRes, sRes] = await Promise.all([
        api.get("/Admin/users"),
        api.get("/Admin/bookings"),
        api.get("/Rooms"),
        api.get("/Services"), // Assuming you have this endpoint
      ]);
      setUsers(uRes.data || []);
      setBookings(bRes.data || []);
      setRooms(rRes.data || []);
      setServices(sRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      Swal.fire("Error", "Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }

  const getAuthHeader = () => {
    const token = localStorage.getItem("jwt_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogout = () => {
    // ... (Existing logout logic) ...
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of the admin panel.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("user");
        localStorage.removeItem("jwt_token");
        navigate("/signin");
        Toast.fire({ icon: 'success', title: 'Logged out successfully' });
      }
    });
  };

  // --- Actions ---

  // ... (assignRole and removeRole remain the same) ...
  const assignRole = async (userId) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await api.post(`/Admin/users/${userId}/assign-role`, { role: "Admin" });
      Toast.fire({ icon: 'success', title: 'User promoted to Admin successfully' });
      await reloadUsers();
    } catch (err) {
      Swal.fire("Failed", err?.response?.data?.message || err.message, "error");
    } finally { setActionLoading(false); }
  };

  const removeRole = async (userId) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await api.post(`/Admin/users/${userId}/remove-role`, {});
      Toast.fire({ icon: 'success', title: 'Admin privileges removed' });
      await reloadUsers();
    } catch (err) {
      Swal.fire("Failed", err?.response?.data?.message || err.message, "error");
    } finally { setActionLoading(false); }
  };

  // [NEW] Handle Create Service (Master List)
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceName) return;

    setServiceSubmitting(true);
    try {
      // Assuming your backend accepts { name: "Wifi", price: 0 }
      await api.post("/Services", { name: newServiceName, price: Number(newServicePrice) || 0 });
      Toast.fire({ icon: 'success', title: 'Service added successfully' });
      setNewServiceName("");
      setNewServicePrice("");
      await reloadServices();
    } catch (err) {
      Swal.fire("Error", "Failed to create service", "error");
    } finally {
      setServiceSubmitting(false);
    }
  };

  // [NEW] Handle Delete Service
  const handleDeleteService = async (id) => {
    Swal.fire({
      title: 'Delete Service?',
      text: "This will remove it from future selections.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/Services/${id}`);
          Toast.fire({ icon: 'success', title: 'Service deleted' });
          await reloadServices();
        } catch (err) {
          Swal.fire("Error", "Failed to delete service", "error");
        }
      }
    });
  };

  // [UPDATED] Create Room with Services
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!number || !type || !price || !selectedFile) {
      Swal.fire("Missing Info", "Please fill all fields and select an image.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("Number", number);
      formData.append("Type", type);
      formData.append("PricePerNight", Number(price));
      formData.append("Image", selectedFile);
      
      // [NEW] Append Selected Services
      // Note: How you append array depends on backend (ASP.NET often prefers same key multiple times)
      selectedServiceIds.forEach(id => {
        formData.append("ServiceIds", id); 
      });

      await api.post("/Rooms", formData, { headers: { ...getAuthHeader() } });
      
      Swal.fire("Success", "Room created successfully!", "success");
      
      // Reset Form
      setNumber(""); setType(""); setPrice(""); setSelectedFile(null); 
      setSelectedServiceIds([]); // Reset services
      if(preview) { URL.revokeObjectURL(preview); setPreview(null); }
      await reloadRooms();
    } catch (error) {
      Swal.fire("Error", error?.response?.data?.message || error.message, "error");
    } finally { setSubmitting(false); }
  };

  // [UPDATED] Edit handlers
  const startEdit = (room) => {
    setIsEditing(true);
    setEditId(room.id);
    setEditNumber(room.number || "");
    setEditType(room.type || "");
    setEditPrice(room.pricePerNight || "");
    setEditFile(null);
    setEditPreview(room.imageUrl ?? room.image ?? null);
    
    // [NEW] Pre-select existing services
    // Assuming room.services is an array of objects like [{id: 1, name: "Wifi"}]
    const existingIds = room.services ? room.services.map(s => s.id) : [];
    setEditServiceIds(existingIds);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    if (editPreview && editPreview.startsWith('blob:')) URL.revokeObjectURL(editPreview);
    setEditPreview(null);
    setEditFile(null);
    setEditServiceIds([]);
  };

  const handleEditFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (editPreview && editPreview.startsWith('blob:')) URL.revokeObjectURL(editPreview);
    setEditFile(f);
    setEditPreview(f ? URL.createObjectURL(f) : null);
  };

  // [UPDATED] Submit Edit with Services
  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editId) return;
    setEditingSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("Number", editNumber);
      formData.append("Type", editType);
      formData.append("PricePerNight", Number(editPrice));
      if (editFile) formData.append("Image", editFile);

      // [NEW] Append Selected Services
      editServiceIds.forEach(id => {
        formData.append("ServiceIds", id); 
      });

      await api.put(`/Rooms/${editId}`, formData, { headers: { ...getAuthHeader() } });
      
      Toast.fire({ icon: 'success', title: 'Room updated successfully' });
      
      await reloadRooms();
      cancelEdit();
    } catch (err) {
      Swal.fire("Error", err?.response?.data?.message || err.message, "error");
    } finally { setEditingSubmitting(false); }
  };

  // ... (deleteRoom and handleBookingAction remain the same) ...
  const deleteRoom = async (id) => {
    if (!id) return;
    Swal.fire({
      title: 'Delete Room?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setActionLoading(true);
        try {
          await api.delete(`/Rooms/${id}`, { headers: { ...getAuthHeader() } });
          Swal.fire('Deleted!', 'The room has been deleted.', 'success');
          await reloadRooms();
        } catch (err) {
          Swal.fire("Error", err?.response?.data?.message || err.message, "error");
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleBookingAction = async (id, action) => {
    setActionLoading(true);
    try {
      await api.put(`/Admin/bookings/${id}/${action}`);
      Toast.fire({ icon: 'success', title: `Booking ${action}d successfully` });
      await reloadBookings();
    } catch (err) {
      Toast.fire({ icon: 'error', title: `Failed to ${action}` });
    } finally { setActionLoading(false); }
  };

  // Reload Helpers
  const reloadRooms = async () => { try { const r = await api.get("/Rooms"); setRooms(r.data || []); } catch(e){} };
  const reloadUsers = async () => { try { const r = await api.get("/Admin/users"); setUsers(r.data || []); } catch(e){} };
  const reloadBookings = async () => { try { const r = await api.get("/Admin/bookings"); setBookings(r.data || []); } catch(e){} };
  // [NEW]
  const reloadServices = async () => { try { const r = await api.get("/Services"); setServices(r.data || []); } catch(e){} };

  // ... (safeImageSrc and formatDate remain the same) ...
  const safeImageSrc = (r) => {
    const raw = r?.imageUrl ?? r?.image ?? null;
    if (!raw) return "https://via.placeholder.com/400x300?text=No+Image";
    if (raw.startsWith("http")) return raw;
    return `https://hotel-booking.runasp.net${raw}`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Helper for Checkbox Logic
  const toggleService = (id, currentList, setList) => {
    if (currentList.includes(id)) {
      setList(currentList.filter(sId => sId !== id));
    } else {
      setList([...currentList, id]);
    }
  };

  const styles = {
    fadeIn: { animation: "fadeIn 0.6s ease-out forwards" },
    gradientHeader: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .hover-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
          .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-approved { background: #d4edda; color: #155724; }
          .status-rejected { background: #f8d7da; color: #721c24; }
          .status-completed { background: #cce5ff; color: #004085; }
          .custom-file-upload { display: inline-block; padding: 10px 20px; cursor: pointer; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; width: 100%; text-align: center; }
          .modal-backdrop-custom { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100; backdrop-filter: blur(2px); }
          .service-pill { cursor: pointer; transition: 0.2s; user-select: none; }
          .service-pill:hover { transform: scale(1.05); }
          .service-pill.active { background-color: #667eea; color: white; border-color: #667eea; }
        `}
      </style>

      <div className="min-vh-100" style={{ backgroundColor: "#f4f6f9", paddingBottom: "50px" }}>
        
        {/* Navbar */}
        <div className="shadow-sm py-4 px-5 mb-5 d-flex justify-content-between align-items-center" style={styles.gradientHeader}>
          <div>
            <h2 className="fw-bold mb-0 d-flex align-items-center gap-2"><FaUserShield /> Admin Dashboard</h2>
            <small className="opacity-75">Manage your hotel operations efficiently</small>
          </div>
          <div className="d-flex gap-3">
            <button onClick={() => { reloadUsers(); reloadBookings(); reloadRooms(); reloadServices(); Toast.fire({icon: 'info', title: 'Data Refreshed'}); }} className="btn btn-light text-primary fw-bold shadow-sm d-flex align-items-center gap-2">
              <FaSync className={loading ? "fa-spin" : ""} /> Refresh
            </button>
            <button onClick={handleLogout} className="btn btn-danger fw-bold shadow-sm d-flex align-items-center gap-2">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        <div className="container" style={styles.fadeIn}>
          
          {/* KPI Stats */}
          <div className="row g-4 mb-5">
            <StatsCard title="Total Users" count={users.length} icon={<FaUser />} color="primary" delay="0s" />
            <StatsCard title="Total Bookings" count={bookings.length} icon={<FaCalendarCheck />} color="success" delay="0.1s" />
            <StatsCard title="Total Rooms" count={rooms.length} icon={<FaBed />} color="warning" delay="0.2s" />
          </div>

          <div className="row g-4">
            
            {/* LEFT COLUMN */}
            <div className="col-lg-8">
             {/* BOOKINGS SECTION */}
               <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ animation: "fadeIn 0.5s ease-out 0.3s forwards", opacity: 0 }}>
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0 text-secondary"><FaCalendarCheck className="me-2" /> Recent Bookings</h5>
                  <span className="badge bg-light text-dark">{bookings.length} Records</span>
                </div>
                <div className="card-body p-4">
                  {bookings.length === 0 ? <p className="text-muted text-center py-4">No bookings found.</p> : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Room / Guest</th> {/* Changed Header */}
                            <th>Date</th>
                            <th>Status</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map(b => (
                            <tr key={b.id}>
                              <td>
                                {/* ✅ Room Number is now Primary */}
                                <div className="d-flex align-items-center">
                                    <div className="bg-light rounded p-2 me-2 text-center" style={{minWidth: '40px'}}>
                                        <FaBed className="text-secondary"/>
                                    </div>
                                    <div>
                                        <span className="fw-bold text-dark d-block">Room {b.Number || b.room?.number || "?"}</span>
                                        {/* Guest Name if available, otherwise ID */}
                                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                            {b.user?.fullName ? b.user.fullName : `#${String(b.id).substring(0,8)}`}
                                        </small>
                                    </div>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column">
                                    <span className="fw-medium text-dark" style={{fontSize: '0.85rem'}}>{formatDate(b.startDate)}</span>
                                    <span className="text-muted small">to {formatDate(b.endDate)}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge status-${(b.status || (b.isApproved ? "approved" : "pending")).toLowerCase()}`}>
                                  {b.status || (b.isApproved ? "Approved" : "Pending")}
                                </span>
                              </td>
                              <td className="text-end">
                                <div className="btn-group">
                                  <button onClick={() => handleBookingAction(b.id, 'approve')} disabled={actionLoading} className="btn btn-sm btn-outline-success" title="Approve"><FaCheckCircle /></button>
                                  <button onClick={() => handleBookingAction(b.id, 'reject')} disabled={actionLoading} className="btn btn-sm btn-outline-danger" title="Reject"><FaTimesCircle /></button>
                                  <button onClick={() => handleBookingAction(b.id, 'complete')} disabled={actionLoading} className="btn btn-sm btn-outline-primary" title="Complete"><FaCheckCircle /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              {/* USERS SECTION */}
              <div className="card border-0 shadow-sm rounded-4" style={{ animation: "fadeIn 0.5s ease-out 0.4s forwards", opacity: 0 }}>
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0 text-secondary"><FaUser className="me-2" /> Users Management</h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    {users.map(u => {
                        const isAdmin = String(u.role || "").toLowerCase() === "admin";
                        return (
                         <div key={u.id || u.email} className="col-md-6">
                           <div className="p-3 border rounded-3 d-flex justify-content-between align-items-center hover-card bg-white h-100">
                             <div className="d-flex align-items-center gap-3">
                               <div className={`rounded-circle p-2 d-flex ${isAdmin ? 'bg-warning text-white' : 'bg-light text-secondary'}`}>
                                 {isAdmin ? <FaUserShield /> : <FaUser />}
                               </div>
                               <div style={{ overflow: "hidden" }}>
                                 <h6 className="mb-0 text-truncate" style={{ maxWidth: "150px" }}>{u.fullName || "No Name"}</h6>
                                 <small className="text-muted d-block text-truncate" style={{ maxWidth: "150px" }}>{u.email}</small>
                               </div>
                             </div>
                             <button 
                               onClick={() => isAdmin ? removeRole(u.id) : assignRole(u.id)} 
                               disabled={actionLoading}
                               className={`btn btn-sm ${isAdmin ? 'btn-outline-danger' : 'btn-outline-primary'} rounded-pill px-3`}
                             >
                               {isAdmin ? "Demote" : "Promote"}
                             </button>
                           </div>
                         </div>
                        );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-lg-4">
              
              {/* ADD ROOM FORM */}
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white" style={{ animation: "fadeIn 0.5s ease-out 0.5s forwards", opacity: 0 }}>
                <div className="card-header bg-white border-0 pt-4 px-4">
                   <h5 className="fw-bold mb-0 text-primary"><FaPlus className="me-2" /> Add New Room</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleCreateRoom}>
                    <div className="mb-3">
                      <label className="small text-muted fw-bold mb-1">Room Number</label>
                      <input className="form-control bg-light border-0 py-2" value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 101" />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-7">
                        <label className="small text-muted fw-bold mb-1">Type</label>
                        <select className="form-select bg-light border-0 py-2" value={type} onChange={e => setType(e.target.value)}>
                          <option value="">Select...</option>
                          <option value="Single">Single</option>
                          <option value="Double">Double</option>
                          <option value="Suite">Suite</option>
                        </select>
                      </div>
                      <div className="col-5">
                        <label className="small text-muted fw-bold mb-1">Price</label>
                        <input type="number" className="form-control bg-light border-0 py-2" value={price} onChange={e => setPrice(e.target.value)} placeholder="Egp" />
                      </div>
                    </div>

                    {/* [NEW] Services Selection for New Room */}
                    <div className="mb-3">
                      <label className="small text-muted fw-bold mb-1">Included Services</label>
                      <div className="d-flex flex-wrap gap-2">
                        {services.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => toggleService(s.id, selectedServiceIds, setSelectedServiceIds)}
                            className={`badge border p-2 service-pill ${selectedServiceIds.includes(s.id) ? 'active' : 'bg-light text-dark'}`}
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="custom-file-upload">
                        <input type="file" style={{display: "none"}} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) { setSelectedFile(file); setPreview(URL.createObjectURL(file)); }
                        }} />
                        <FaImage className="mb-1 text-primary" size={20} />
                        <div className="small text-muted">Click to upload image</div>
                      </label>
                      {preview && (
                        <div className="mt-2 position-relative">
                          <img src={preview} alt="Preview" className="w-100 rounded-3 shadow-sm" style={{ height: "150px", objectFit: "cover" }} />
                          <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle" onClick={() => { setSelectedFile(null); setPreview(null); }}>
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </div>

                    <button className="btn btn-primary w-100 py-2 fw-bold shadow-sm" disabled={submitting}>
                      {submitting ? "Creating..." : "Create Room"}
                    </button>
                  </form>
                </div>
              </div>

              {/* [NEW] SERVICES MANAGEMENT CARD */}
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white" style={{ animation: "fadeIn 0.5s ease-out 0.55s forwards", opacity: 0 }}>
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0 text-dark"><FaConciergeBell className="me-2" /> Manage Services</h5>
                </div>
                <div className="card-body p-4">
                  {/* Create Service Form */}
                  <form onSubmit={handleCreateService} className="d-flex gap-2 mb-3">
                    <input 
                      className="form-control bg-light border-0" 
                      placeholder="New Service (e.g. WiFi)" 
                      value={newServiceName} 
                      onChange={e => setNewServiceName(e.target.value)} 
                    />
                     {/* Optional Price Input if needed */}
                     {/* <input type="number" className="form-control bg-light border-0" placeholder="Price" style={{width: '80px'}} value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} /> */}
                    <button className="btn btn-outline-primary" disabled={serviceSubmitting}>
                      <FaPlus />
                    </button>
                  </form>
                  
                  {/* List Services */}
                  <div className="d-flex flex-wrap gap-2">
                    {services.map(s => (
                      <span key={s.id} className="badge bg-white border text-dark p-2 d-flex align-items-center gap-2">
                        {s.name}
                        <FaTrash className="text-danger" style={{cursor: "pointer"}} onClick={() => handleDeleteService(s.id)} />
                      </span>
                    ))}
                    {services.length === 0 && <small className="text-muted">No services added yet.</small>}
                  </div>
                </div>
              </div>

              {/* ROOMS LIST */}
              <div className="card border-0 shadow-sm rounded-4" style={{ animation: "fadeIn 0.5s ease-out 0.6s forwards", opacity: 0 }}>
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between">
                   <h5 className="fw-bold mb-0 text-secondary"><FaBed className="me-2" /> Rooms</h5>
                   <span className="badge bg-secondary">{rooms.length}</span>
                </div>
                <div className="card-body p-4" style={{ maxHeight: "500px", overflowY: "auto" }}>
                  <div className="d-flex flex-column gap-3">
                    {rooms.map(r => (
                      <div key={r.id} className="d-flex gap-3 align-items-center p-2 rounded-3 hover-card bg-white border">
                        <img 
                          src={safeImageSrc(r)} 
                          alt="" 
                          className="rounded-3" 
                          style={{ width: "70px", height: "70px", objectFit: "cover" }}
                          onError={(e) => e.target.src="https://via.placeholder.com/70"}
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-0 fw-bold">Room {r.number}</h6>
                          <small className="text-muted">{r.type}</small>
                          {/* Show services count or tags */}
                          <div className="d-flex gap-1 mt-1">
                            {r.services && r.services.map(s => (
                              <span key={s.id} className="badge bg-light text-secondary border" style={{fontSize: "0.6rem"}}>{s.name}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-end d-flex flex-column align-items-end gap-2">
                          <span className="fw-bold text-primary d-block">{r.pricePerNight} EGP</span>
                          <div>
                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(r)} title="Edit"><FaEdit /></button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteRoom(r.id)} title="Delete"><FaTrash /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-backdrop-custom">
          <div className="card p-4 shadow-lg border-0" style={{ width: 560, borderRadius: 16 }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold text-primary">Edit Room Details</h5>
              <button className="btn-close" onClick={cancelEdit}></button>
            </div>

            <form onSubmit={submitEdit}>
              <div className="mb-3">
                <label className="small text-muted fw-bold">Room Number</label>
                <input className="form-control bg-light border-0 py-2" value={editNumber} onChange={e => setEditNumber(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="small text-muted fw-bold">Type</label>
                <select className="form-select bg-light border-0 py-2" value={editType} onChange={e => setEditType(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="small text-muted fw-bold">Price</label>
                <input type="number" className="form-control bg-light border-0 py-2" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
              </div>

              {/* [NEW] Services Selection for Edit Room */}
              <div className="mb-3">
                <label className="small text-muted fw-bold mb-1">Included Services</label>
                <div className="d-flex flex-wrap gap-2">
                  {services.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => toggleService(s.id, editServiceIds, setEditServiceIds)}
                      className={`badge border p-2 service-pill ${editServiceIds.includes(s.id) ? 'active' : 'bg-light text-dark'}`}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="custom-file-upload">
                  <input type="file" style={{display: "none"}} onChange={handleEditFileChange} />
                  <FaImage className="mb-1 text-primary" size={18} /> <span className="small text-muted">Change image</span>
                </label>
                {editPreview && (
                  <div className="mt-2 position-relative">
                    <img src={editPreview} alt="edit preview" className="w-100 rounded-3 shadow-sm" style={{ height: "150px", objectFit: "cover" }} />
                    {editFile && <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle" onClick={() => { setEditFile(null); setEditPreview(null); }}> <FaTrash /> </button>}
                  </div>
                )}
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary flex-grow-1 fw-bold" disabled={editingSubmitting}>
                   {editingSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-light fw-bold text-secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Simple Stat Card Component
const StatsCard = ({ title, count, icon, color, delay }) => (
  <div className="col-md-4" style={{ animation: `fadeIn 0.6s ease-out ${delay} forwards`, opacity: 0 }}>
    <div className="card border-0 shadow-sm h-100 rounded-4 hover-card">
      <div className="card-body p-4 d-flex align-items-center justify-content-between">
        <div>
          <h6 className="text-muted text-uppercase fw-bold mb-2" style={{ fontSize: "0.8rem" }}>{title}</h6>
          <h2 className="mb-0 fw-bold text-dark">{count}</h2>
        </div>
        <div className={`rounded-circle bg-${color} bg-opacity-10 p-3 text-${color}`} style={{ fontSize: "1.5rem" }}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);