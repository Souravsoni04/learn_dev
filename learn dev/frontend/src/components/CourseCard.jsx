import { Link } from "react-router-dom";

const CourseCard = ({ course, isEnrolled = false }) => {
  const price = Number(course.price || 0);
  const reviewCount = Number(course.reviewCount || 0);
  const averageRating = Number(course.averageRating || 0);
  const actionTo = isEnrolled ? `/learn/${course._id}` : `/courses/${course._id}`;
  const actionLabel = isEnrolled ? "Continue" : "Open";
  const lessonCount = course.lessons || course.materials?.length || 0;

  return (
    <article className="course-card">
      <div className="course-thumb">
        <img src={course.thumbnail || "https://picsum.photos/seed/course/800/450"} alt={course.title} />
        <span className="course-badge">{isEnrolled ? "Enrolled" : price > 0 ? "Premium" : "Free"}</span>
      </div>
      <div className="course-card-body">
        <div className="course-card-meta">
          <span className="pill">{course.level || "Beginner"}</span>
          <span className="pill">{course.category || "General"}</span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.subtitle || course.description || "No description available yet."}</p>
        <div className="course-insights">
          <span>{lessonCount || "Self paced"} lessons</span>
          <span>{course.duration || "Flexible"}</span>
          <span>{reviewCount > 0 ? `${averageRating.toFixed(1)} rating` : "New path"}</span>
        </div>
        <div className="course-card-row">
          <strong>{price > 0 ? `INR ${price}` : "Free"}</strong>
          <Link className="btn" to={actionTo}>
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
};

export default CourseCard;
