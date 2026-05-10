import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import CourseCard from "../components/CourseCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const Courses = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("recommended");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, enrollmentsRes] = await Promise.all([
          api.get("/courses"),
          user ? api.get("/courses/enrollments/my").catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        const rawCourses = coursesRes.data || [];
        const reviewLists = await Promise.all(
          rawCourses.map((course) =>
            api
              .get(`/reviews/course/${course._id}`)
              .then((res) => res.data || [])
              .catch(() => [])
          )
        );

        const enrichedCourses = rawCourses.map((course, index) => {
          const reviews = reviewLists[index] || [];
          const reviewCount = reviews.length;
          const averageRating = reviewCount
            ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviewCount
            : 0;
          return {
            ...course,
            reviewCount,
            averageRating
          };
        });

        setCourses(enrichedCourses);
        setEnrollments(enrollmentsRes.data || []);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load courses"));
      }
    };
    load();
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set((courses || []).map((c) => c.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [courses]);

  const filtered = useMemo(() => {
    const list = (courses || []).filter((course) => {
      const text = `${course.title} ${course.subtitle || ""} ${course.description || ""}`.toLowerCase();
      const searchMatch = text.includes(search.toLowerCase());
      const categoryMatch = category === "all" || category === course.category;
      return searchMatch && categoryMatch;
    });

    return [...list].sort((a, b) => {
      if (sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
      if (sort === "rating") return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
    });
  }, [courses, search, category, sort]);

  const enrolledIds = useMemo(() => {
    return new Set(
      (enrollments || [])
        .filter((item) => item.paymentStatus === "paid")
        .map((item) => (typeof item.course === "string" ? item.course : item.course?._id))
        .filter(Boolean)
    );
  }, [enrollments]);

  return (
    <section className="shell page-stack">
      <div className="catalog-hero section-title-row between">
        <div>
          <p className="kicker">Catalog</p>
          <h1>Find a course that fits your next step</h1>
          <p>Search by topic, filter by category, compare level and ratings, then jump straight into learning.</p>
        </div>
        <div className="filters-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or topic" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="rating">Top rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>

      <div className="category-strip">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={`pill interactive-pill ${category === item ? "active" : ""}`}
            onClick={() => setCategory(item)}
          >
            {item === "all" ? "All topics" : item}
          </button>
        ))}
      </div>

      <div className="catalog-summary">
        <span>{filtered.length} courses found</span>
        <span>{enrolledIds.size} enrolled</span>
        <span>{Math.max(categories.length - 1, 0)} categories</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="cards-grid cols-3">
        {filtered.map((course) => (
          <CourseCard key={course._id} course={course} isEnrolled={enrolledIds.has(course._id)} />
        ))}
      </div>

      {!error && filtered.length === 0 && <p>No courses match your filters.</p>}
    </section>
  );
};

export default Courses;
