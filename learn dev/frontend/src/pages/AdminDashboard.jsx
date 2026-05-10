import { useEffect, useMemo, useState } from "react";
import ImageKit from "imagekit-javascript";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { getErrorMessage } from "../utils/errors.js";
import { SUPPORT_ENABLED } from "../config/features.js";

const emptyCourseForm = {
  title: "",
  subtitle: "",
  description: "",
  level: "Beginner",
  category: "",
  duration: "",
  lessons: 0,
  thumbnail: "",
  trailerUrl: "",
  price: 0,
  instructor: {
    name: "Expert Instructor",
    bio: "",
    avatar: "",
    socials: { github: "", linkedin: "", youtube: "" }
  }
};

const emptyMaterial = { type: "video", title: "", description: "", duration: "", url: "" };
const emptyResource = { title: "", url: "" };
const emptyNote = { title: "", content: "", fileUrl: "" };
const materialLabels = {
  video: "Video lesson",
  pdf: "PDF / notes file",
  note: "Text note"
};

const normalizeType = (type = "") => type.toLowerCase();

const isDirectVideo = (url = "") => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url) || url.includes("imagekit");

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

const formatCourseDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const parseDurationSeconds = (duration = "") => {
  const text = String(duration || "").trim().toLowerCase();
  if (!text) return 0;
  if (/^\d+:\d{2}(:\d{2})?$/.test(text)) {
    const parts = text.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1];
  }
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  return Math.round(hours * 3600 + minutes * 60);
};

const fallbackMaterialTitle = (item, index) => {
  if (item?.title?.trim()) return item.title.trim();
  return `Lesson ${index + 1}`;
};

const normalizeInstructor = (instructor = {}) => ({
  ...emptyCourseForm.instructor,
  ...instructor,
  socials: {
    ...emptyCourseForm.instructor.socials,
    ...(instructor.socials || {})
  }
});

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [courses, setCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseLevelFilter, setCourseLevelFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [supportFilter, setSupportFilter] = useState("Pending"); // "Pending", "Solved", "All"
  const [replyingTicket, setReplyingTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [materials, setMaterials] = useState([]);
  const [resources, setResources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [relatedCourseIds, setRelatedCourseIds] = useState([]);

  const [newMaterial, setNewMaterial] = useState(emptyMaterial);
  const [newResource, setNewResource] = useState(emptyResource);
  const [newNote, setNewNote] = useState(emptyNote);

  const [selectedUploads, setSelectedUploads] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userEdit, setUserEdit] = useState({ name: "", email: "", role: "student", isBlocked: false });

  const [inspectedUser, setInspectedUser] = useState(null);
  const [inspectedEnrollments, setInspectedEnrollments] = useState([]);

  const [adminPassword, setAdminPassword] = useState({ oldPassword: "", newPassword: "" });

  const paidEnrollmentsForSelectedUser = (selectedUser?.enrollments || []).filter(
    (enrollment) => enrollment.paymentStatus === "paid"
  );

  const filteredCourses = useMemo(() => {
    const search = courseSearch.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesLevel = courseLevelFilter === "all" || course.level === courseLevelFilter;
      const searchableText = [
        course.title,
        course.subtitle,
        course.category,
        course.instructor?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesLevel && (!search || searchableText.includes(search));
    });
  }, [courseLevelFilter, courseSearch, courses]);

  const videoLessonCount = useMemo(
    () => materials.filter((item) => normalizeType(item.type) === "video").length,
    [materials]
  );

  const totalVideoSeconds = useMemo(
    () =>
      materials.reduce((sum, item) => {
        if (normalizeType(item.type) !== "video") return sum;
        return sum + parseDurationSeconds(item.duration);
      }, 0),
    [materials]
  );

  const autoCourseDuration = useMemo(() => formatCourseDuration(totalVideoSeconds), [totalVideoSeconds]);

  useEffect(() => {
    setCourseForm((current) => {
      const nextDuration = autoCourseDuration || current.duration;
      const nextLessons = materials.length;
      if (current.duration === nextDuration && current.lessons === nextLessons) return current;
      return {
        ...current,
        duration: nextDuration,
        lessons: nextLessons
      };
    });
  }, [autoCourseDuration, materials.length]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, uRes, pRes, sRes, tRes] = await Promise.all([
        api.get("/admin/courses"),
        api.get("/admin/users"),
        api.get("/admin/payments"),
        api.get("/admin/stats"),
        SUPPORT_ENABLED ? api.get("/support/all") : Promise.resolve({ data: [] })
      ]);

      setCourses(cRes.data || []);
      setUsers(uRes.data || []);
      setPayments(pRes.data || []);
      setStats(sRes.data || null);
      setTickets(SUPPORT_ENABLED ? tRes.data || [] : []);
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to load admin data"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const clearCourseForm = () => {
    setEditingCourse(null);
    setCourseForm(emptyCourseForm);
    setMaterials([]);
    setResources([]);
    setNotes([]);
    setRelatedCourseIds([]);
    setNewMaterial(emptyMaterial);
    setNewResource(emptyResource);
    setNewNote(emptyNote);
    setSelectedUploads([]);
    // Clear inspection
    setInspectedUser(null);
    setInspectedEnrollments([]);
  };

  const updateTicket = async (ticketId, patch) => {
    try {
      const { data } = await api.put(`/support/${ticketId}`, patch);
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? data : t)));
      addToast("Ticket updated", "success");
      setReplyingTicket(null);
      setReplyMessage("");
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to update ticket"), "error");
    }
  };

  const submitReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    updateTicket(replyingTicket._id, { replyMessage });
  };

  const startEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || "",
      subtitle: course.subtitle || "",
      description: course.description || "",
      level: course.level || "Beginner",
      category: course.category || "",
      duration: course.duration || "",
      lessons: course.lessons || 0,
      thumbnail: course.thumbnail || "",
      trailerUrl: course.trailerUrl || "",
      price: course.price || 0,
      instructor: normalizeInstructor(course.instructor)
    });
    setMaterials(course.materials || []);
    setResources(course.resources || []);
    setNotes(course.notes || []);
    setRelatedCourseIds((course.relatedCourses || []).map((item) => (typeof item === "string" ? item : item._id)));
    setTab("courses");
  };

  const deleteCourse = async (courseId) => {
    const approved = await confirm("Delete Course", "This will remove course enrollments and payments too.", {
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger"
    });

    if (!approved) return;

    try {
      await api.delete(`/admin/courses/${courseId}`);
      addToast("Course deleted", "success");
      if (editingCourse?._id === courseId) {
        clearCourseForm();
      }
      fetchAll();
    } catch (err) {
      addToast(getErrorMessage(err, "Could not delete course"), "error");
    }
  };

  const addMaterial = () => {
    if (!newMaterial.title || !newMaterial.type) return;
    setMaterials((prev) => [...prev, { ...newMaterial, resources: [] }]);
    setNewMaterial(emptyMaterial);
  };

  const updateMaterial = (index, patch) => {
    setMaterials((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const updateMaterialDuration = (index, seconds) => {
    const label = formatSeconds(seconds);
    if (!label) return;
    setMaterials((prev) =>
      prev.map((item, i) => {
        if (i !== index || item.duration === label) return item;
        return { ...item, duration: label };
      })
    );
  };

  const addMaterialResource = (index) => {
    setMaterials((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              resources: [...(item.resources || []), { title: "", url: "" }]
            }
          : item
      )
    );
  };

  const updateMaterialResource = (materialIndex, resourceIndex, patch) => {
    setMaterials((prev) =>
      prev.map((item, i) =>
        i === materialIndex
          ? {
              ...item,
              resources: (item.resources || []).map((resource, rIndex) =>
                rIndex === resourceIndex ? { ...resource, ...patch } : resource
              )
            }
          : item
      )
    );
  };

  const removeMaterialResource = (materialIndex, resourceIndex) => {
    setMaterials((prev) =>
      prev.map((item, i) =>
        i === materialIndex
          ? {
              ...item,
              resources: (item.resources || []).filter((_, rIndex) => rIndex !== resourceIndex)
            }
          : item
      )
    );
  };

  const addResource = () => {
    if (!newResource.title || !newResource.url) return;
    setResources((prev) => [...prev, { ...newResource }]);
    setNewResource(emptyResource);
  };

  const addNote = () => {
    if (!newNote.title || !newNote.content) return;
    setNotes((prev) => [...prev, { ...newNote }]);
    setNewNote(emptyNote);
  };

  const uploadAssets = async () => {
    if (!selectedUploads.length) {
      addToast("Select files first", "info");
      return;
    }

    const hasMissingTitle = selectedUploads.some((item) => !item.title.trim());
    if (hasMissingTitle) {
      addToast("Enter title for each selected file", "error");
      return;
    }

    setUploading(true);
    try {
      const { data: authParams } = await api.get("/courses/imagekit-auth");
      const ik = new ImageKit({
        publicKey: authParams.publicKey,
        urlEndpoint: authParams.urlEndpoint
      });

      const uploaded = [];

      const typedDescription = newMaterial.description.trim();
      const typedType = newMaterial.type || "video";

      for (const item of selectedUploads) {
        const file = item.file;
        const result = await new Promise((resolve, reject) => {
          ik.upload(
            {
              file,
              fileName: `${Date.now()}-${file.name}`,
              token: authParams.token,
              expire: authParams.expire,
              signature: authParams.signature,
              folder: "/learn-dev/materials"
            },
            (error, value) => {
              if (error) reject(error);
              else resolve(value);
            }
          );
        });

        uploaded.push({
          type: typedType,
          title: item.title.trim(),
          description: typedDescription,
          duration: "",
          url: result.url,
          fileId: result.fileId,
          resources: []
        });
      }

      setMaterials((prev) => [...prev, ...uploaded]);
      setSelectedUploads([]);
      setNewMaterial((prev) => ({ ...prev, title: "", description: "" }));
      addToast(`${uploaded.length} assets uploaded`, "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Upload failed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const saveCourse = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const finalDuration = autoCourseDuration || courseForm.duration;
      const payload = {
        ...courseForm,
        duration: finalDuration,
        lessons: materials.length,
        instructor: JSON.stringify(courseForm.instructor),
        materials: JSON.stringify(materials),
        resources: JSON.stringify(resources),
        notes: JSON.stringify(notes),
        relatedCourses: JSON.stringify(relatedCourseIds)
      };

      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse._id}`, payload);
        addToast("Course updated", "success");
      } else {
        await api.post("/admin/courses", payload);
        addToast("Course created", "success");
      }

      await fetchAll();
      clearCourseForm();
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to save course"), "error");
    } finally {
      setSaving(false);
    }
  };

  const openUser = async (id) => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setSelectedUser(data);
      setUserEdit({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isBlocked: data.user.isBlocked
      });
      // Also set for inspection view
      setInspectedUser(data.user);
      setInspectedEnrollments(data.enrollments || []);
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to load student"), "error");
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser?.user?._id) return;

    try {
      await api.put(`/admin/users/${selectedUser.user._id}`, userEdit);
      addToast("User updated", "success");
      await fetchAll();
      await openUser(selectedUser.user._id);
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to update user"), "error");
    }
  };

  const toggleBlock = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/block`);
      addToast("User status updated", "success");
      await fetchAll();
      if (selectedUser?.user?._id === id) {
        await openUser(id);
      }
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to change block status"), "error");
    }
  };

  const updateAdminPassword = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/change-password", adminPassword);
      addToast(data.message || "Password changed", "success");
      setAdminPassword({ oldPassword: "", newPassword: "" });
    } catch (err) {
      addToast(getErrorMessage(err, "Could not update password"), "error");
    }
  };

  const monthlyMax = useMemo(() => Math.max(...(stats?.monthlyStats || []).map((item) => item.revenue), 1), [stats]);
  const totalUsers = users.length;
  const blockedUsers = users.filter((u) => u.isBlocked).length;
  const activeUsers = totalUsers - blockedUsers;
  const latestPayments = payments.slice(0, 4);
  const totalPaymentAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <section className="shell page-stack admin-page">
      <div className="admin-hero">
        <div className="admin-hero-copy">
          <p className="kicker">Admin Control</p>
          <h1>Operations Dashboard</h1>
          <p>Run Learn Dev from one command center: revenue health, course quality, student activity, payment history, and account security.</p>
          <div className="admin-hero-actions">
            <button type="button" className="btn btn-large" onClick={() => setTab("courses")}>
              Create Course
            </button>
            <button type="button" className="btn btn-outline btn-large" onClick={fetchAll}>
              Refresh Data
            </button>
          </div>
        </div>
        <div className="admin-hero-card">
          <span className="label">Platform Snapshot</span>
          <strong>{stats?.totalEnrollments || 0}</strong>
          <p>total enrollments across {stats?.totalCourses || courses.length || 0} courses</p>
          <div className="admin-health-grid">
            <span>{activeUsers} active users</span>
            <span>{blockedUsers} blocked</span>
          </div>
        </div>
      </div>

      <div className="tab-row admin-tabs">
        {[
          ["overview", "Overview", "Live metrics"],
          ["courses", "Courses", `${courses.length} total`],
          ["users", "Users", `${activeUsers} active`],
          SUPPORT_ENABLED ? ["tickets", "Support", `${tickets.filter(t => t.status === "Open" || t.status === "In Progress").length} pending`] : null,
          ["payments", "Payments", `${payments.length} records`],
          ["security", "Security", "Admin access"]
        ].filter(Boolean).map(([key, label, meta]) => (
          <button
            type="button"
            key={key}
            onClick={() => setTab(key)}
            className={`tab-btn ${tab === key ? "active" : ""}`}
          >
            <span className="tab-title">{label}</span>
            <span className="tab-meta">{meta}</span>
          </button>
        ))}
      </div>

      {loading && <p className="panel admin-loading">Loading admin data...</p>}

      {!loading && tab === "overview" && stats && (
        <div className="stack-list">
          <div className="stats-row">
            <div className="stat-card panel revenue">
              <span className="label">Total Revenue</span>
              <span className="value">INR {stats.totalRevenue?.toLocaleString() || 0}</span>
              <p>Paid course revenue collected through enrollments.</p>
            </div>
            <div className="stat-card panel students">
              <span className="label">Active Students</span>
              <span className="value">{stats.totalUsers || 0}</span>
              <p>{blockedUsers} account{blockedUsers === 1 ? "" : "s"} currently blocked.</p>
            </div>
            <div className="stat-card panel courses">
              <span className="label">Total Courses</span>
              <span className="value">{stats.totalCourses || 0}</span>
              <p>Catalog items available for enrollment.</p>
            </div>
            <div className="stat-card panel enrollments">
              <span className="label">Total Enrollments</span>
              <span className="value">{stats.totalEnrollments || 0}</span>
              <p>Students who joined free or paid learning paths.</p>
            </div>
          </div>

          <div className="admin-overview-grid">
            <article className="panel">
              <div className="row between">
                <div>
                  <p className="kicker">Revenue</p>
                  <h2>Monthly Performance</h2>
                </div>
                <span className="pill">{stats.monthlyStats?.length || 0} months</span>
              </div>
              <div className="bar-chart">
                {(stats.monthlyStats || []).map((item, index) => (
                  <div key={`${item._id.year}_${item._id.month}_${index}`} className="bar-column">
                    <div className="bar-value" style={{ height: `${Math.max(8, (item.revenue / monthlyMax) * 180)}px` }} />
                    <span>{new Date(0, item._id.month - 1).toLocaleString("default", { month: "short" })}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel insight-panel">
              <p className="kicker">Course demand</p>
              <h2>Popular Courses</h2>
              <div className="stack-list">
                {(stats.popularCourses || []).map((course, index) => (
                  <div key={`${course.title}_${index}`} className="list-card admin-rank-card">
                    <span className="rank-number">{index + 1}</span>
                    <div>
                      <strong>{course.title}</strong>
                      <p>{course.students} students enrolled</p>
                    </div>
                  </div>
                ))}
                {(stats.popularCourses || []).length === 0 && <p>No data yet.</p>}
              </div>
            </article>

            <article className="panel insight-panel">
              <p className="kicker">Recent payments</p>
              <h2>Payment Activity</h2>
              <div className="stack-list">
                {latestPayments.map((payment) => (
                  <div key={payment._id} className="list-card vertical">
                    <strong>{payment.student?.name || "Student"} paid INR {payment.amount || 0}</strong>
                    <p>{payment.course?.title || "Course"} | {payment.paymentStatus || "status pending"}</p>
                  </div>
                ))}
                {latestPayments.length === 0 && <p>No payments yet.</p>}
              </div>
            </article>
          </div>
        </div>
      )}

      {!loading && tab === "courses" && (
        <div className="stack-list admin-catalog-manager">
          <div className="admin-section-head">
            <div>
              <p className="kicker">Catalog manager</p>
              <h2>Course Catalog</h2>
              <p>Search and manage a large course library while the create and edit form stays close.</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                clearCourseForm();
              }}
            >
              New Course
            </button>
          </div>

          <div className="admin-catalog-layout">
          <form className="panel form-panel admin-course-editor course-builder" onSubmit={saveCourse}>
            <div className="admin-form-title course-builder-head">
              <div>
                <p className="kicker">{editingCourse ? "Editing course" : "New course"}</p>
                <h2>{editingCourse ? "Update Course" : "Course Builder"}</h2>
                <p>Build the course once: basics, lesson materials, locked course notes, links, and related courses.</p>
              </div>
              <div className="builder-summary">
                <span>{materials.length} lessons</span>
                <span>{notes.length} notes</span>
                <span>{resources.length} links</span>
              </div>
            </div>

            <section className="builder-section">
              <div className="builder-section-head">
                <span className="builder-step">1</span>
                <div>
                  <h3>Course Basics</h3>
                  <p>Only title is required. Add the rest to make the course card look complete.</p>
                </div>
              </div>
              <div className="builder-grid two">
                <label>
                  <span>Course title</span>
                  <input
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="Full Stack Web Development Bootcamp"
                    required
                  />
                </label>
                <label>
                  <span>Short subtitle</span>
                  <input
                    value={courseForm.subtitle}
                    onChange={(e) => setCourseForm({ ...courseForm, subtitle: e.target.value })}
                    placeholder="Build real projects from beginner to job-ready"
                  />
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea
                  rows={4}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="What students will learn, who this is for, and what they will build."
                />
              </label>
              <div className="builder-grid three">
                <label>
                  <span>Level</span>
                  <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
                <label>
                  <span>Category</span>
                  <input
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    placeholder="Web Development"
                  />
                </label>
                <label>
                  <span>Price (INR)</span>
                  <input
                    type="number"
                    min="0"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span>Duration from videos</span>
                  <input
                    value={autoCourseDuration || "Add videos to calculate"}
                    readOnly
                    className="readonly-input"
                  />
                </label>
                <label>
                  <span>Total lessons</span>
                  <input
                    type="number"
                    min="0"
                    value={materials.length}
                    readOnly
                    className="readonly-input"
                  />
                </label>
                <label>
                  <span>Thumbnail URL</span>
                  <input
                    value={courseForm.thumbnail}
                    onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <label>
                <span>Free trailer video URL</span>
                <input
                  value={courseForm.trailerUrl}
                  onChange={(e) => setCourseForm({ ...courseForm, trailerUrl: e.target.value })}
                  placeholder="Public teaser video URL, direct MP4, YouTube embed, or hosted preview"
                />
              </label>
              <p className="builder-help-text">
                This trailer is visible before purchase. Keep full paid lessons in the Lessons section, not here.
              </p>
            </section>

            <section className="builder-section">
              <div className="builder-section-head">
                <span className="builder-step">2</span>
                <div>
                  <h3>Instructor</h3>
                  <p>Show who teaches the course. Social links are optional.</p>
                </div>
              </div>
              <div className="builder-grid two">
                <label>
                  <span>Name</span>
                  <input
                    value={courseForm.instructor.name || ""}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor: { ...courseForm.instructor, name: e.target.value }
                      })
                    }
                  />
                </label>
                <label>
                  <span>Avatar URL</span>
                  <input
                    value={courseForm.instructor.avatar || ""}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor: { ...courseForm.instructor, avatar: e.target.value }
                      })
                    }
                    placeholder="https://..."
                  />
                </label>
              </div>
              <label>
                <span>Bio</span>
                <input
                  value={courseForm.instructor.bio || ""}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      instructor: { ...courseForm.instructor, bio: e.target.value }
                    })
                  }
                  placeholder="Short instructor introduction"
                />
              </label>
              <div className="builder-grid three">
                <label>
                  <span>GitHub</span>
                  <input
                    value={courseForm.instructor.socials?.github || ""}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor: {
                          ...courseForm.instructor,
                          socials: { ...(courseForm.instructor.socials || {}), github: e.target.value }
                        }
                      })
                    }
                    placeholder="https://github.com/name"
                  />
                </label>
                <label>
                  <span>LinkedIn</span>
                  <input
                    value={courseForm.instructor.socials?.linkedin || ""}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor: {
                          ...courseForm.instructor,
                          socials: { ...(courseForm.instructor.socials || {}), linkedin: e.target.value }
                        }
                      })
                    }
                    placeholder="https://linkedin.com/in/name"
                  />
                </label>
                <label>
                  <span>YouTube</span>
                  <input
                    value={courseForm.instructor.socials?.youtube || ""}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor: {
                          ...courseForm.instructor,
                          socials: { ...(courseForm.instructor.socials || {}), youtube: e.target.value }
                        }
                      })
                    }
                    placeholder="https://youtube.com/@name"
                  />
                </label>
              </div>
            </section>

            <section className="builder-section lesson-builder-section">
              <div className="builder-section-head">
                <span className="builder-step">3</span>
                <div>
                  <h3>Lesson Materials</h3>
                  <p>Use this for items tied to a specific lesson: videos, lesson PDFs, slides, code links, or homework.</p>
                </div>
              </div>

              <div className="auto-duration-panel">
                <div>
                  <strong>{autoCourseDuration || "Duration pending"}</strong>
                  <span>total video time</span>
                </div>
                <div>
                  <strong>{videoLessonCount}</strong>
                  <span>video lessons</span>
                </div>
                <p>Direct video files and uploaded videos can be measured. External players may need a direct video file URL.</p>
              </div>

              <div className="lesson-composer">
                <div className="lesson-composer-head">
                  <div>
                    <strong>Add lesson material</strong>
                    <p>Paste a hosted link or upload a file. This becomes part of the paid classroom curriculum.</p>
                  </div>
                  <span>{newMaterial.type === "video" ? "Video" : newMaterial.type === "pdf" ? "PDF" : "Note"}</span>
                </div>
                <div className="builder-grid two">
                  <label>
                    <span>Material type</span>
                    <select value={newMaterial.type} onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}>
                      <option value="video">Video lesson</option>
                      <option value="pdf">PDF / notes file</option>
                      <option value="note">Text note</option>
                    </select>
                  </label>
                  <label>
                    <span>Lesson title</span>
                    <input
                      value={newMaterial.title}
                      onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                      placeholder="Lesson 1: Introduction"
                    />
                  </label>
                </div>

                <div className="composer-options">
                  <div className="composer-option">
                    <span className="option-label">Paste link</span>
                    <label>
                      <span>Video, PDF, Drive, or resource URL</span>
                      <input
                        value={newMaterial.url}
                        onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                        placeholder="https://..."
                      />
                    </label>
                    <label>
                      <span>Short description</span>
                      <input
                        value={newMaterial.description}
                        onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                        placeholder="What this lesson covers"
                      />
                    </label>
                    <button type="button" className="btn btn-outline" onClick={addMaterial}>
                      Add Link Lesson
                    </button>
                  </div>

                  <div className="composer-option upload-option">
                    <span className="option-label">Upload files</span>
                    <label className="file-drop">
                      <span>Choose videos, PDFs, or notes</span>
                      <input
                        type="file"
                        multiple
                        accept="video/*,.pdf,.doc,.docx,application/pdf"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const defaultTitle = newMaterial.title.trim();
                          setSelectedUploads(
                            files.map((file) => ({
                              file,
                              title: files.length === 1 && defaultTitle ? defaultTitle : ""
                            }))
                          );
                        }}
                      />
                    </label>
                    <p>Selected files are uploaded and added as lessons automatically.</p>
                    <button type="button" className="btn" disabled={uploading || selectedUploads.length === 0} onClick={uploadAssets}>
                      {uploading ? "Uploading..." : `Upload ${selectedUploads.length} file${selectedUploads.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>

                {selectedUploads.length > 0 && (
                  <div className="stack-list upload-title-list">
                    {selectedUploads.map((item, index) => (
                      <div key={`${item.file.name}_${index}`} className="upload-title-row">
                        <span>{item.file.name}</span>
                        <input
                          value={item.title}
                          onChange={(e) =>
                            setSelectedUploads((prev) =>
                              prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                            )
                          }
                          placeholder={`Lesson ${materials.length + index + 1} title`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lesson-list">
                {materials.map((item, index) => (
                  <article key={`${fallbackMaterialTitle(item, index)}_${index}`} className="lesson-card">
                    <div className="lesson-card-head">
                      <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{fallbackMaterialTitle(item, index)}</strong>
                        <p>
                          {materialLabels[item.type] || "Material"}
                          {normalizeType(item.type) === "video" && ` | ${item.duration || "detecting duration"}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="builder-grid two">
                      <label>
                        <span>Title</span>
                        <input
                          value={item.title || ""}
                          onChange={(e) => updateMaterial(index, { title: e.target.value })}
                          placeholder={`Lesson ${index + 1}`}
                        />
                      </label>
                      <label>
                        <span>Type</span>
                        <select value={item.type || "video"} onChange={(e) => updateMaterial(index, { type: e.target.value, duration: "" })}>
                          <option value="video">Video lesson</option>
                          <option value="pdf">PDF / notes file</option>
                          <option value="note">Text note</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>Lesson URL</span>
                      <input
                        value={item.url || ""}
                        onChange={(e) => updateMaterial(index, { url: e.target.value, duration: "" })}
                        placeholder="https://..."
                      />
                    </label>
                    <label>
                      <span>Description</span>
                      <input
                        value={item.description || ""}
                        onChange={(e) => updateMaterial(index, { description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </label>

                    <div className="lesson-resource-panel">
                      <div className="row between wrap-row">
                        <div>
                          <strong>Links for this lesson</strong>
                          <p>Attach code, slides, homework, GitHub repos, or docs related to this video.</p>
                        </div>
                        <button type="button" className="btn btn-outline" onClick={() => addMaterialResource(index)}>
                          Add Link
                        </button>
                      </div>
                      {(item.resources || []).map((resource, resourceIndex) => (
                        <div key={`${resource.title}_${resourceIndex}`} className="resource-edit-row">
                          <input
                            value={resource.title || ""}
                            onChange={(e) => updateMaterialResource(index, resourceIndex, { title: e.target.value })}
                            placeholder="Link title"
                          />
                          <input
                            value={resource.url || ""}
                            onChange={(e) => updateMaterialResource(index, resourceIndex, { url: e.target.value })}
                            placeholder="https://..."
                          />
                          <button type="button" className="btn danger" onClick={() => removeMaterialResource(index, resourceIndex)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
                {materials.length === 0 && (
                  <div className="builder-empty">
                    Add your first video, PDF, or note. Lessons will appear here in order.
                  </div>
                )}
              </div>
            </section>

            <section className="builder-section">
              <div className="builder-section-head">
                <span className="builder-step">4</span>
                <div>
                  <h3>Course-wide Notes and Links</h3>
                  <p>Use these for full-course files like syllabus, revision PDF, checklist, or final project brief. Students can download them only after enrollment.</p>
                </div>
              </div>
              <div className="builder-grid two">
                <label>
                  <span>Course link title</span>
                  <input
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Starter files"
                  />
                </label>
                <label>
                  <span>Course link URL</span>
                  <input
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <button type="button" className="btn btn-outline" onClick={addResource}>
                Add Course Link
              </button>
              <div className="compact-list">
                {resources.map((item, index) => (
                  <div key={`${item.title}_${index}`} className="compact-row">
                    <span>{item.title}</span>
                    <button type="button" className="btn danger" onClick={() => setResources((prev) => prev.filter((_, i) => i !== index))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="builder-grid two">
                <label>
                  <span>Course note title</span>
                  <input value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} placeholder="Course checklist" />
                </label>
                <label>
                  <span>Locked attachment URL</span>
                  <input
                    value={newNote.fileUrl}
                    onChange={(e) => setNewNote({ ...newNote, fileUrl: e.target.value })}
                    placeholder="PDF, DOCX, or Drive link"
                  />
                </label>
              </div>
              <label>
                <span>Course note description</span>
                <textarea rows={3} value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
              </label>
              <button type="button" className="btn btn-outline" onClick={addNote}>
                Add Course Note
              </button>
              <div className="compact-list">
                {notes.map((item, index) => (
                  <div key={`${item.title}_${index}`} className="compact-row">
                    <span>{item.title}</span>
                    <button type="button" className="btn danger" onClick={() => setNotes((prev) => prev.filter((_, i) => i !== index))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="builder-section">
              <div className="builder-section-head">
                <span className="builder-step">5</span>
                <div>
                  <h3>Related Courses</h3>
                  <p>Select courses students should see after or beside this course.</p>
                </div>
              </div>
              <select
                className="related-course-select"
                multiple
                value={relatedCourseIds}
                onChange={(e) => setRelatedCourseIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
              >
                {courses
                  .filter((c) => c._id !== editingCourse?._id)
                  .map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </section>

            <div className="builder-actions">
              <button type="submit" className="btn btn-large" disabled={saving}>
                {saving ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
              </button>
              <button type="button" className="btn btn-outline btn-large" onClick={clearCourseForm}>
                Reset
              </button>
            </div>
            <div className="metadata-preload" aria-hidden="true">
              {materials.map((item, index) => {
                if (normalizeType(item.type) !== "video" || !item.url || !isDirectVideo(item.url) || item.duration) return null;
                return (
                  <video
                    key={`${item.url}_${index}`}
                    preload="metadata"
                    src={item.url}
                    onLoadedMetadata={(event) => updateMaterialDuration(index, event.currentTarget.duration)}
                  />
                );
              })}
            </div>
          </form>

          <section className="panel admin-course-library">
            <div className="admin-section-head compact">
              <div>
                <p className="kicker">Course library</p>
                <h2>Manage Existing Courses</h2>
                <p>
                  Showing {filteredCourses.length} of {courses.length} courses.
                </p>
              </div>
            </div>

            <div className="admin-catalog-tools">
              <label>
                <span>Search courses</span>
                <input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Find by title, category, or instructor"
                />
              </label>
              <label>
                <span>Level</span>
                <select value={courseLevelFilter} onChange={(e) => setCourseLevelFilter(e.target.value)}>
                  <option value="all">All levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>
            </div>

            <div className="admin-courses-list">
            {filteredCourses.map((course) => (
              <article className="admin-course-row" key={course._id}>
                <div className="row between wrap-row">
                  <div>
                    <strong>{course.title}</strong>
                    <p>
                      {course.category || "General"} | INR {course.price || 0} | Enrolled: {course.enrolledCount || 0}
                      {" | "}
                      {Number(course.reviewCount || 0) > 0
                        ? `Rating: ${Number(course.averageRating || 0).toFixed(1)} (${course.reviewCount})`
                        : "No reviews yet"}
                    </p>
                  </div>
                  <div className="row">
                    <button type="button" className="btn btn-outline" onClick={() => startEditCourse(course)}>
                      Edit
                    </button>
                    <button type="button" className="btn danger" onClick={() => deleteCourse(course._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {courses.length === 0 && <p>No courses yet.</p>}
            {courses.length > 0 && filteredCourses.length === 0 && <p>No courses match your filters.</p>}
            </div>
          </section>
          </div>
        </div>
      )}

      {!loading && tab === "users" && (
        <div className="stack-list">
          <div className="admin-tab-summary">
            <article>
              <span>Total users</span>
              <strong>{totalUsers}</strong>
            </article>
            <article>
              <span>Active users</span>
              <strong>{activeUsers}</strong>
            </article>
            <article>
              <span>Blocked users</span>
              <strong>{blockedUsers}</strong>
            </article>
          </div>

          <div className="split-grid">
            <article className="panel">
              <div className="row between wrap-row admin-section-head compact">
                <div>
                  <p className="kicker">Student health</p>
                  <h2>Students</h2>
                </div>
                <div className="row">
                  <span className="pill">Total: {totalUsers}</span>
                  <span className="pill">Active: {activeUsers}</span>
                  <span className="pill">Blocked: {blockedUsers}</span>
                </div>
              </div>
              <div className="stack-list">
                {users.map((user) => (
                  <div key={user._id} className="list-card">
                    <div>
                      <strong>{user.name}</strong>
                      <p>
                        {user.email} | Enrollments: {user.enrollmentCount || 0}
                      </p>
                    </div>
                    <div className="row">
                      <button type="button" className="btn btn-outline" onClick={() => openUser(user._id)}>
                        Details
                      </button>
                      <button type="button" className="btn danger" onClick={() => toggleBlock(user._id)}>
                        {user.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel form-panel admin-user-panel">
              <h2>Student Profile</h2>
              {!selectedUser && <p>Select a student to inspect details.</p>}

              {selectedUser && (
                <>
                  <form onSubmit={saveUser} className="form-panel admin-user-form">
                    <label>Name</label>
                    <input value={userEdit.name} onChange={(e) => setUserEdit({ ...userEdit, name: e.target.value })} required />
                    <label>Email</label>
                    <input value={userEdit.email} onChange={(e) => setUserEdit({ ...userEdit, email: e.target.value })} required />
                    <label>Role</label>
                    <select value={userEdit.role} onChange={(e) => setUserEdit({ ...userEdit, role: e.target.value })}>
                      <option value="student">student</option>
                      <option value="admin">admin</option>
                    </select>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={userEdit.isBlocked}
                        onChange={(e) => setUserEdit({ ...userEdit, isBlocked: e.target.checked })}
                      />
                      Mark as blocked
                    </label>
                    <button type="submit" className="btn">
                      Save User
                    </button>
                  </form>

                  <h3>Enrollment History</h3>
                  <div className="stack-list admin-enroll-list">
                    {paidEnrollmentsForSelectedUser.map((enrollment) => (
                      <div key={enrollment._id} className="list-card vertical">
                        <strong>{enrollment.course?.title || "Course"}</strong>
                        <p>
                          Progress: {enrollment.progress || 0}% | Payment: {enrollment.paymentStatus} | Amount: INR {enrollment.amount || 0}
                        </p>
                      </div>
                    ))}
                    {paidEnrollmentsForSelectedUser.length === 0 && <p>No paid enrollment records.</p>}
                  </div>
                </>
              )}
            </article>
          </div>

          {inspectedUser && (
            <article className="panel mt-8">
              <div className="row between">
                <h3>Inspection: {inspectedUser.name}</h3>
                <button className="btn btn-outline" onClick={() => setInspectedUser(null)}>
                  Close
                </button>
              </div>
              <p>Email: {inspectedUser.email} | Joined: {new Date(inspectedUser.createdAt).toLocaleDateString()}</p>
              <div className="cards-grid cols-3">
                {inspectedEnrollments.map((en) => (
                  <div key={en._id} className="list-card vertical">
                    <strong>{en.course?.title}</strong>
                    <p>Status: {en.paymentStatus}</p>
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${en.progress}%` }} />
                    </div>
                    <span>{en.progress}% Complete</span>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      )}

      {!loading && SUPPORT_ENABLED && tab === "tickets" && (
        <div className="stack-list">
          <div className="admin-section-head">
            <div>
              <p className="kicker">Support center</p>
              <h2>User Support Tickets</h2>
              <p>Respond to technical issues, billing questions, and general inquiries from your students.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-outline" onClick={fetchAll}>
                Refresh
              </button>
            </div>
          </div>

          {/* Support Filters */}
          <div className="flex gap-4 mb-8">
            {["Pending", "Solved", "All"].map((f) => (
              <button
                key={f}
                onClick={() => setSupportFilter(f)}
                className={`px-6 py-2 rounded-xl font-bold text-xs transition-all border ${
                  supportFilter === f 
                    ? "bg-aqua text-white border-aqua shadow-lg shadow-aqua/20" 
                    : "bg-white text-ink-soft border-line hover:border-aqua"
                }`}
              >
                {f} ({
                  f === "All" ? tickets.length :
                  f === "Pending" ? tickets.filter(t => t.status === "Open" || t.status === "In Progress").length :
                  tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length
                })
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {tickets
              .filter(t => {
                if (supportFilter === "All") return true;
                const isSolved = t.status === "Resolved" || t.status === "Closed";
                return supportFilter === "Solved" ? isSolved : !isSolved;
              })
              .map((ticket) => {
                const isResolved = ticket.status === "Resolved" || ticket.status === "Closed";
                
                return (
                  <article key={ticket._id} className={`panel relative overflow-hidden ${isResolved ? "opacity-80" : "border-l-4 border-l-aqua"}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`pill ${ticket.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-paper"}`}>
                            {ticket.priority} Priority
                          </span>
                          <span className={`pill font-bold ${isResolved ? "bg-emerald-50 text-emerald-600" : "bg-sun/10 text-amber-600"}`}>
                            {isResolved ? "✓ Solved" : "⏳ Pending"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold">{ticket.subject}</h3>
                        <p className="text-xs font-bold text-ink-soft">
                          From: <span className="text-ink">{ticket.user?.name || "Deleted User"}</span> ({ticket.user?.email || "N/A"})
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-ink-soft">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="p-4 bg-paper rounded-xl border border-line/50 mb-4">
                      <p className="text-sm text-ink leading-relaxed">{ticket.message}</p>
                      <span className="text-[10px] uppercase font-bold text-ink-soft mt-2 block">Category: {ticket.category}</span>
                    </div>

                    {ticket.replies?.length > 0 && (
                      <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-[10px] uppercase font-bold text-ink-soft">Conversation</p>
                        {ticket.replies.map((reply, i) => (
                          <div key={i} className={`p-3 rounded-xl text-xs ${reply.user?._id === user?._id || reply.user?.role === "admin" ? "bg-mint/40 text-aqua ml-8 border border-aqua/10" : "bg-paper border border-line/30 mr-8"}`}>
                            <p className="font-medium mb-1">{reply.message}</p>
                            <span className="opacity-60 block text-[9px] uppercase font-bold">
                              {reply.user?.name || "Staff"} • {new Date(reply.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto pt-4 border-t border-line/30">
                      <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-ink-soft block mb-1">Set Status</label>
                        <select 
                          className="w-full p-2 text-xs bg-white border border-line rounded-lg outline-none focus:border-aqua"
                          value={ticket.status}
                          onChange={(e) => updateTicket(ticket._id, { status: e.target.value })}
                        >
                          <option value="Open">Open (New)</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved (Fixed)</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <div className="flex-1 flex items-end">
                        <button 
                          className="btn btn-outline w-full text-xs py-2 h-[34px]"
                          onClick={() => setReplyingTicket(ticket)}
                        >
                          💬 Reply
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            {tickets.filter(t => {
              if (supportFilter === "All") return true;
              const isSolved = t.status === "Resolved" || t.status === "Closed";
              return supportFilter === "Solved" ? isSolved : !isSolved;
            }).length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-line rounded-3xl bg-paper/50">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-bold text-ink mb-1">No {supportFilter.toLowerCase()} tickets</h3>
                <p className="text-sm text-ink-soft">Student support requests will appear here based on your filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "payments" && (
        <div className="stack-list">
          <div className="admin-tab-summary">
            <article>
              <span>Total collected</span>
              <strong>INR {totalPaymentAmount.toLocaleString()}</strong>
            </article>
            <article>
              <span>Payment records</span>
              <strong>{payments.length}</strong>
            </article>
            <article>
              <span>Gateway</span>
              <strong>Razorpay</strong>
            </article>
          </div>

          <article className="panel">
            <div className="admin-section-head compact">
              <div>
                <p className="kicker">Finance</p>
                <h2>Payment Ledger</h2>
                <p>Track every order, student, course, amount, payment status, and gateway source.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Gateway</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>{payment.orderId || "-"}</td>
                      <td>{payment.student?.name || "-"}</td>
                      <td>{payment.course?.title || "-"}</td>
                      <td>INR {payment.amount || 0}</td>
                      <td>{payment.paymentStatus}</td>
                      <td>{payment.gateway || "razorpay"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p>No payments yet.</p>}
            </div>
          </article>
        </div>
      )}

      {!loading && tab === "security" && (
        <div className="security-layout">
          <article className="panel security-card">
            <p className="kicker">Security checklist</p>
            <h2>Admin Access Health</h2>
            <div className="stack-list">
              <div className="list-card vertical">
                <strong>Password rotation</strong>
                <p>Use a strong password and change it when team access changes.</p>
              </div>
              <div className="list-card vertical">
                <strong>Blocked accounts</strong>
                <p>{blockedUsers} blocked user{blockedUsers === 1 ? "" : "s"} currently visible in the Users tab.</p>
              </div>
              <div className="list-card vertical">
                <strong>Payment review</strong>
                <p>Review failed or pending payments regularly from the ledger.</p>
              </div>
            </div>
          </article>

          <article className="panel form-panel narrow-stack">
            <p className="kicker">Security</p>
            <h2>Change Admin Password</h2>
            <p>Keep admin access private and update credentials regularly.</p>
            <form onSubmit={updateAdminPassword} className="form-panel">
              <label>Current Password</label>
              <input
                type="password"
                value={adminPassword.oldPassword}
                onChange={(e) => setAdminPassword({ ...adminPassword, oldPassword: e.target.value })}
                required
              />
              <label>New Password</label>
              <input
                type="password"
                value={adminPassword.newPassword}
                onChange={(e) => setAdminPassword({ ...adminPassword, newPassword: e.target.value })}
                required
              />
              <button type="submit" className="btn">
                Update Password
              </button>
            </form>
          </article>
        </div>
      )}

      {/* Reply Modal */}
      {replyingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setReplyingTicket(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-8 border-b border-line/30 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-ink">Send Official Reply</h3>
                <p className="text-sm text-ink-soft mt-1">Replying to: {replyingTicket.subject}</p>
              </div>
              <button 
                onClick={() => setReplyingTicket(null)}
                className="w-10 h-10 rounded-full bg-paper flex items-center justify-center hover:bg-line transition-all"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={submitReply} className="p-8 space-y-6">
              <div className="p-4 bg-paper rounded-2xl border border-line/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-soft mb-2">Student's Message</p>
                <p className="text-sm text-ink italic">"{replyingTicket.message}"</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink-soft">Your Response</label>
                <textarea
                  required
                  autoFocus
                  rows="5"
                  className="w-full bg-paper border border-line rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-aqua transition-all resize-none"
                  placeholder="Type your reply here..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setReplyingTicket(null)}
                  className="flex-1 py-4 rounded-xl border border-line font-bold text-xs uppercase tracking-widest hover:bg-paper transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-xl bg-ink text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-ink/20 hover:bg-aqua hover:-translate-y-1 transition-all"
                >
                  Send Reply ⚡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
