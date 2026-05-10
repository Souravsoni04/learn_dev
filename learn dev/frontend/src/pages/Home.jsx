import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import CourseCard from "../components/CourseCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const Home = () => {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const coursesRes = await api.get("/courses");
        setFeatured((coursesRes.data || []).slice(0, 4));
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load dashboard data"));
      }
    };

    load();
  }, []);

  const categories = useMemo(() => {
    const items = (featured || []).map((course) => course.category).filter(Boolean);
    return Array.from(new Set(items)).slice(0, 4);
  }, [featured]);

  return (
    <section className="home-page">
      <div className="hero-band">
        <div className="shell hero-grid">
          <article className="hero-copy animate-fade-in delay-100">
            <p className="kicker hero-kicker">Learn Dev</p>
            <h1>Practice real skills with compact, clarity-first learning.</h1>
            <p className="hero-lede">
              Streamlined courses, smart note capture, and progress checkpoints help learners move from study to
              confident delivery.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-large" to="/courses">
                Explore Courses
              </Link>
              {!user ? (
                <Link className="btn btn-outline btn-large" to="/register">
                  Join Free
                </Link>
              ) : (
                <Link className="btn btn-outline btn-large" to={user.role === "admin" ? "/admin" : "/dashboard"}>
                  Open Dashboard
                </Link>
              )}
            </div>
            {error && <p className="error-text">{error}</p>}
          </article>
        </div>
      </div>

      <div className="shell page-stack">
        <section className="feature-grid">
          {[
            ["Learn in order", "Follow lessons, files, resources, and checkpoints without losing context."],
            ["Keep notes close", "Save personal notes beside every lesson and return to them during revision."],
            ["Track every step", "Continue enrolled courses from your dashboard with completion status visible."],
            ["Choose smarter", "Ratings, categories, levels, and related paths help students pick the next course."]
          ].map(([title, copy]) => (
            <article className="feature-card" key={title}>
              <span className="feature-dot" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <div className="section-title-row between">
          <div>
            <p className="kicker">Featured paths</p>
            <h2>Start with a course that matches your goal</h2>
          </div>
          <div className="row wrap-row">
            {categories.map((category) => (
              <Link key={category} className="pill interactive-pill" to={`/courses?category=${encodeURIComponent(category)}`}>
                {category}
              </Link>
            ))}
          </div>
        </div>
        <div className="cards-grid cols-4">
          {featured.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>

        <section className="cta-band">
          <div>
            <p className="kicker">For focused learners</p>
            <h2>Build a routine that keeps courses, notes, and progress connected.</h2>
          </div>
          <Link className="btn btn-large" to="/courses">
            Find Your Path
          </Link>
        </section>
      </div>
    </section>
  );
};

export default Home;
