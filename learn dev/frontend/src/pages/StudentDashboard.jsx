import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const getCourse = (enrollment) => enrollment.course || {};
const getCourseId = (enrollment) => getCourse(enrollment)._id || enrollment.course;
const getProgress = (enrollment) => Math.max(0, Math.min(100, Number(enrollment.progress || 0)));

const StudentDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/courses/enrollments/my");
      const paidEnrollments = (data || []).filter((item) => item.paymentStatus === "paid");
      setEnrollments(paidEnrollments);
    } catch (err) {
      addToast(getErrorMessage(err, "Failed to load dashboard data"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = enrollments.length;
    const complete = enrollments.filter((item) => getProgress(item) >= 95).length;
    const inProgress = enrollments.filter((item) => getProgress(item) > 0 && getProgress(item) < 95).length;
    const average = total
      ? Math.round(enrollments.reduce((sum, item) => sum + getProgress(item), 0) / total)
      : 0;

    return { total, complete, inProgress, average };
  }, [enrollments]);

  const nextEnrollment = useMemo(() => {
    if (!enrollments.length) return null;
    return [...enrollments].sort((a, b) => {
      const aProgress = getProgress(a);
      const bProgress = getProgress(b);
      if (aProgress === 0 && bProgress > 0) return 1;
      if (bProgress === 0 && aProgress > 0) return -1;
      return aProgress - bProgress;
    })[0];
  }, [enrollments]);

  return (
    <section className="student-dashboard shell page-stack animate-fade-in">
      <div className="student-hero">
        <div>
          <p className="kicker">Student Dashboard</p>
          <h1>Welcome back, {user?.name || "Learner"}</h1>
          <p>Pick up where you stopped, track your watch-time mastery, and keep your active courses within reach.</p>
        </div>
        <div className="student-hero-score">
          <span>Average mastery</span>
          <strong>{stats.average}%</strong>
        </div>
      </div>

      <div className="student-stats-grid">
        <article>
          <span>Enrolled</span>
          <strong>{stats.total}</strong>
          <p>Courses in your library</p>
        </article>
        <article>
          <span>In Progress</span>
          <strong>{stats.inProgress}</strong>
          <p>Courses already started</p>
        </article>
        <article>
          <span>Completed</span>
          <strong>{stats.complete}</strong>
          <p>Courses near full watch time</p>
        </article>
      </div>

      {loading && (
        <article className="dashboard-empty">
          <strong>Loading your classroom...</strong>
          <p>Your courses are getting ready.</p>
        </article>
      )}

      {!loading && enrollments.length === 0 && (
        <article className="dashboard-empty">
          <strong>No courses yet</strong>
          <p>Explore the catalog and enroll in a course to start learning.</p>
          <Link className="btn" to="/courses">
            Browse Courses
          </Link>
        </article>
      )}

      {!loading && nextEnrollment && (
        <article className="continue-card">
          <img
            src={getCourse(nextEnrollment).thumbnail || "https://picsum.photos/seed/continue-learning/900/520"}
            alt={getCourse(nextEnrollment).title || "Course"}
          />
          <div>
            <p className="kicker">Continue Learning</p>
            <h2>{getCourse(nextEnrollment).title || "Course"}</h2>
            <p>{getCourse(nextEnrollment).subtitle || "Resume your next lesson and keep your progress moving."}</p>
            <div className="dashboard-progress">
              <div className="progress-bar">
                <div className="fill" style={{ width: `${getProgress(nextEnrollment)}%` }} />
              </div>
              <span>{getProgress(nextEnrollment)}% watched</span>
            </div>
            <Link className="btn btn-large" to={`/learn/${getCourseId(nextEnrollment)}`}>
              Resume Course
            </Link>
          </div>
        </article>
      )}

      {!loading && enrollments.length > 0 && (
        <div className="dashboard-section-head">
          <div>
            <p className="kicker">My Courses</p>
            <h2>Your learning library</h2>
          </div>
          <Link className="btn btn-outline" to="/courses">
            Find More
          </Link>
        </div>
      )}

      {!loading && enrollments.length > 0 && (
        <div className="student-course-grid">
          {enrollments.map((enrollment) => {
            const course = getCourse(enrollment);
            const courseId = getCourseId(enrollment);
            const progress = getProgress(enrollment);
            const lessonCount = course.lessons || course.materials?.length || 0;

            return (
              <article key={enrollment._id} className="student-course-card">
                <div className="student-course-thumb">
                  <img src={course.thumbnail || "https://picsum.photos/seed/student-course/800/450"} alt={course.title || "Course"} />
                  <span>{progress >= 95 ? "Mastered" : progress > 0 ? "In Progress" : "Ready"}</span>
                </div>
                <div className="student-course-body">
                  <div className="course-card-meta">
                    <span className="pill">{course.level || "Beginner"}</span>
                    <span className="pill">{course.category || "General"}</span>
                  </div>
                  <h3>{course.title || "Course"}</h3>
                  <p>{course.subtitle || "Continue this course whenever you are ready."}</p>
                  <div className="dashboard-progress">
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span>{progress}% watched</span>
                  </div>
                  <div className="student-course-foot">
                    <small>{lessonCount || "Self paced"} lessons</small>
                    <Link className="btn" to={`/learn/${courseId}`}>
                      Continue
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default StudentDashboard;
