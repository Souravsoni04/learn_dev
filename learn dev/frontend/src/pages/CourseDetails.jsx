import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const renderStars = (rating = 0) => {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span className="review-stars" aria-label={`${safe} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= safe ? "active" : ""}>
          *
        </span>
      ))}
    </span>
  );
};

const getMaterialLabel = (type = "") => {
  switch (type.toLowerCase()) {
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "note":
      return "Note";
    default:
      return "Material";
  }
};

const getMaterialMeta = (material) => {
  const type = material?.type?.toLowerCase();
  if (type === "video") return material.duration || "Video lesson";
  if (type === "pdf") return "Downloadable reference";
  if (type === "note") return "Instructor note";
  return material?.duration || "Learning material";
};

const isDirectVideo = (url = "") => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url) || url.includes("imagekit");

const getYouTubeEmbedUrl = (url = "") => {
  const match = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
};

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [relatedCourses, setRelatedCourses] = useState([]);

  const enrolled = useMemo(() => {
    return myEnrollments.some((item) => {
      const courseId = typeof item.course === "string" ? item.course : item.course?._id;
      return courseId === id && item.paymentStatus === "paid";
    });
  }, [myEnrollments, id]);

  const liveReviewStats = useMemo(() => {
    const count = (reviews || []).length;
    const average = count
      ? (reviews || []).reduce((sum, item) => sum + Number(item.rating || 0), 0) / count
      : 0;
    return { count, average };
  }, [reviews]);

  const lessonCount = course?.materials?.length || 0;
  const price = Number(course?.price || 0);

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRes, reviewsRes, enrollmentsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/reviews/course/${id}`),
          user ? api.get("/courses/enrollments/my").catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        setCourse(courseRes.data);
        setReviews(reviewsRes.data || []);

        const relatedIds = (courseRes.data.relatedCourses || []).map((item) =>
          typeof item === "string" ? item : item._id
        );
        if (relatedIds.length > 0) {
          const relatedRes = await Promise.all(relatedIds.map((rid) => api.get(`/courses/${rid}`).catch(() => null)));
          setRelatedCourses(relatedRes.filter((item) => item && item.data).map((item) => item.data));
        } else {
          setRelatedCourses([]);
        }

        setMyEnrollments(enrollmentsRes.data || []);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load course details"));
      }
    };

    load();
  }, [id, user]);

  const verifyPayment = async (payload) => {
    await api.post("/payments/verify", payload);
    addToast("Payment verified", "success");
    navigate(`/learn/${id}`);
  };

  const handleEnroll = async () => {
    if (!user) {
      addToast("Please log in first", "info");
      navigate("/login");
      return;
    }

    setBusy(true);
    try {
      if (Number(course.price || 0) <= 0) {
        await api.post(`/courses/enroll/free/${id}`);
        addToast("Free enrollment successful", "success");
        navigate(`/learn/${id}`);
        return;
      }

      const { data } = await api.post("/payments/create-order", { courseId: id });

      if (data.free) {
        addToast("Enrollment completed", "success");
        navigate(`/learn/${id}`);
        return;
      }

      if (!window.Razorpay || !data.orderId || !data.key) {
        addToast("Razorpay is unavailable", "error");
        return;
      }

      const rz = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Learn Dev",
        description: course.title,
        prefill: { name: user.name, email: user.email },
        handler: async (response) => {
          try {
            await verifyPayment(response);
          } catch (err) {
            addToast(getErrorMessage(err, "Verification failed"), "error");
          }
        }
      });

      rz.open();
    } catch (err) {
      addToast(getErrorMessage(err, "Enrollment failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <section className="shell page-stack">
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="shell page-stack">
        <p>Loading course...</p>
      </section>
    );
  }

  const trailerEmbedUrl = getYouTubeEmbedUrl(course.trailerUrl);

  return (
    <section className="course-detail-page">
      <div className="course-detail-hero">
        <div className="shell course-detail-hero-grid">
          <div className="course-detail-copy">
            <div className="course-chip-row">
              <span>{course.level || "Beginner"}</span>
              <span>{course.category || "General"}</span>
              {course.trailerUrl && <span>Free preview</span>}
            </div>
            <h1>{course.title}</h1>
            <p>{course.description || course.subtitle || "A focused course designed to help learners make steady progress."}</p>
            <div className="course-hero-stats">
              <div>
                <strong>{course.duration || "Self paced"}</strong>
                <span>Duration</span>
              </div>
              <div>
                <strong>{lessonCount}</strong>
                <span>Lessons</span>
              </div>
              <div>
                <strong>{liveReviewStats.average.toFixed(1)}</strong>
                <span>{liveReviewStats.count} reviews</span>
              </div>
            </div>
          </div>

          <div className="course-preview-frame hero-preview">
            {course.trailerUrl && isDirectVideo(course.trailerUrl) ? (
              <video className="course-preview-media" src={course.trailerUrl} controls poster={course.thumbnail || ""} />
            ) : course.trailerUrl && trailerEmbedUrl ? (
              <iframe
                className="course-preview-media"
                src={trailerEmbedUrl}
                title={`${course.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : course.trailerUrl ? (
              <a className="course-preview-link" href={course.trailerUrl} target="_blank" rel="noreferrer">
                <img src={course.thumbnail || "https://picsum.photos/seed/detail/1200/600"} alt={course.title} />
                <span>Watch free preview</span>
              </a>
            ) : (
              <img
                className="course-preview-media"
                src={course.thumbnail || "https://picsum.photos/seed/detail/1200/600"}
                alt={course.title}
              />
            )}
            {course.trailerUrl && <span className="preview-badge">Preview</span>}
          </div>
        </div>
      </div>

      <div className="shell course-detail-content">
        <main className="course-main-stack">
          <section className="course-section">
            <div className="course-section-head">
              <p className="kicker">Locked classroom content</p>
              <h2>Lesson Materials</h2>
              <p>
                These are lesson-specific items like videos, PDFs, slides, code links, and homework. Students can
                preview the list, but opening the materials requires enrollment.
              </p>
            </div>
            <div className="course-curriculum-list">
              {(course.materials || []).map((material, index) => (
                <article key={`${material.title}_${index}`} className="course-curriculum-row">
                  <span className="course-lesson-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{material.title || `Lesson ${index + 1}`}</strong>
                    <p>{material.description || "Structured learning material for this course."}</p>
                  </div>
                  <div className="course-material-meta">
                    <span>{getMaterialMeta(material)}</span>
                    <strong>{getMaterialLabel(material.type)}</strong>
                    {!enrolled && <small>Enroll to open</small>}
                  </div>
                </article>
              ))}
              {lessonCount === 0 && <div className="builder-empty">No lessons have been published yet.</div>}
            </div>
          </section>

          {course.notes?.length > 0 && (
            <section className="course-section">
              <div className="course-section-head">
                <p className="kicker">Locked bonus resources</p>
                <h2>Course-wide notes</h2>
                <p>
                  These are full-course downloads like syllabus, revision notes, and checklists. They unlock after
                  enrollment, separate from lesson-by-lesson class materials.
                </p>
              </div>
              <div className="course-note-grid">
                {course.notes.map((note, index) => (
                  <article key={`${note.title}_${index}`} className={`course-note-card ${!enrolled ? "locked" : ""}`}>
                    <strong>{note.title}</strong>
                    <p>{note.content}</p>
                    {enrolled && note.fileUrl && (
                      <a href={note.fileUrl} target="_blank" rel="noreferrer">
                        Open attachment
                      </a>
                    )}
                    {!enrolled && <span className="locked-note-pill">Enroll to download</span>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {relatedCourses.length > 0 && (
            <section className="course-section">
              <div className="course-section-head">
                <p className="kicker">Next steps</p>
                <h2>Related courses</h2>
              </div>
              <div className="course-related-grid">
                {relatedCourses.map((item) => (
                  <Link key={item._id} to={`/courses/${item._id}`} className="course-related-card">
                    <img src={item.thumbnail || "https://picsum.photos/seed/related-course/360/220"} alt={item.title} />
                    <strong>{item.title}</strong>
                    <span>{item.level || "Beginner"} course</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="course-side-stack">
          <article className="course-enroll-card">
            <span className="course-enroll-label">Lifetime access</span>
            <strong className="course-price">{price > 0 ? `INR ${price}` : "Free"}</strong>
            <p>{enrolled ? "You already have access to this course." : "Enroll to unlock all lessons, notes, and classroom progress."}</p>
            {enrolled ? (
              <Link className="btn btn-large" to={`/learn/${id}`}>
                Go to Classroom
              </Link>
            ) : (
              <button type="button" className="btn btn-large" onClick={handleEnroll} disabled={busy}>
                {busy ? "Securing access..." : price > 0 ? "Enroll Now" : "Claim for Free"}
              </button>
            )}
            <div className="course-includes-list">
              <span>{lessonCount} lessons</span>
              <span>{course.duration || "Flexible"} access</span>
              <span>Lesson materials after enrollment</span>
              <span>Course-wide notes after enrollment</span>
              <span>Progress tracking</span>
            </div>
          </article>

          <article className="course-instructor-card">
            <div className="instructor-mini">
              <img
                src={course.instructor?.avatar || "https://ui-avatars.com/api/?name=Expert+Instructor&background=eef7f4&color=16806f"}
                alt={course.instructor?.name || "Instructor"}
              />
              <div>
                <strong>{course.instructor?.name || "Expert Instructor"}</strong>
                <span>Instructor</span>
              </div>
            </div>
            <p>{course.instructor?.bio || "Passionate about teaching and building practical skills."}</p>
          </article>

          <article className="course-reviews-card">
            <div className="row between">
              <h2>Reviews</h2>
              <span>{liveReviewStats.average.toFixed(1)} / 5</span>
            </div>
            {reviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              <div className="course-review-list">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review._id} className="course-review-row">
                    <div className="row between">
                      <strong>{review.student?.name || "Student"}</strong>
                      {renderStars(review.rating)}
                    </div>
                    <p>{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
};

export default CourseDetails;
