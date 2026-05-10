/**
 * Normalizes admin course create/update bodies.
 * Supports nested JSON (preferred) or stringified arrays/objects (legacy clients).
 */

function parseMaybeJson(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function asNonEmptyArray(value, fallback = []) {
  const v = parseMaybeJson(value);
  if (Array.isArray(v)) return v;
  return fallback;
}

export function asInstructor(value, fallbackName = "Expert Instructor") {
  const v = parseMaybeJson(value);
  if (!v || typeof v !== "object") {
    return { name: fallbackName, bio: "", avatar: "", socials: { github: "", linkedin: "", youtube: "" } };
  }
  const socials = v.socials && typeof v.socials === "object" ? v.socials : {};
  return {
    name: v.name ?? fallbackName,
    bio: v.bio ?? "",
    avatar: v.avatar ?? "",
    socials: {
      github: socials.github ?? "",
      linkedin: socials.linkedin ?? "",
      youtube: socials.youtube ?? ""
    }
  };
}

function asRelatedIds(value) {
  const raw = asNonEmptyArray(value, []);
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && item._id) return String(item._id);
      return "";
    })
    .filter(Boolean);
}

function parseLessonCount(lessons) {
  if (lessons === undefined || lessons === null || lessons === "") return 0;
  const n = parseInt(String(lessons), 10);
  return Number.isFinite(n) ? n : 0;
}

function parsePrice(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function parseArrayField(value, fallback = []) {
  if (value === undefined) return fallback;
  const parsed = parseMaybeJson(value);
  return Array.isArray(parsed) ? parsed : fallback;
}

/**
 * Builds the document fields for Course.create from POST body.
 */
export function normalizeCoursePayload(body) {
  const {
    title,
    subtitle,
    description,
    level,
    category,
    duration,
    lessons,
    thumbnail,
    trailerUrl,
    price,
    materials,
    instructor,
    resources,
    notes,
    relatedCourses
  } = body;

  return {
    title,
    subtitle,
    description,
    level,
    category,
    duration,
    lessons: parseLessonCount(lessons),
    thumbnail,
    trailerUrl,
    price: parsePrice(price, 0),
    instructor: asInstructor(instructor),
    resources: asNonEmptyArray(resources),
    notes: asNonEmptyArray(notes),
    materials: asNonEmptyArray(materials),
    relatedCourses: asRelatedIds(relatedCourses)
  };
}

/**
 * Applies PUT body onto an existing course (same semantics as previous admin route).
 */
export function applyCourseUpdates(course, body) {
  const {
    title,
    subtitle,
    description,
    level,
    category,
    duration,
    lessons,
    thumbnail,
    trailerUrl,
    price,
    materials,
    instructor,
    resources,
    notes,
    relatedCourses
  } = body;

  if (title !== undefined) course.title = title || course.title;
  if (subtitle !== undefined) course.subtitle = subtitle || course.subtitle;
  if (description !== undefined) course.description = description || course.description;
  if (level !== undefined) course.level = level || course.level;
  if (category !== undefined) course.category = category || course.category;
  if (duration !== undefined) course.duration = duration || course.duration;

  if (lessons !== undefined && lessons !== null && lessons !== "") {
    const parsed = parseInt(String(lessons), 10);
    if (Number.isFinite(parsed)) course.lessons = parsed;
  }

  if (thumbnail !== undefined) course.thumbnail = thumbnail || course.thumbnail;
  if (trailerUrl !== undefined) course.trailerUrl = trailerUrl;

  if (price !== undefined) {
    course.price = parsePrice(price, course.price);
  }

  if (instructor) {
    course.instructor = asInstructor(instructor, course.instructor?.name || "Expert Instructor");
  }

  if (resources !== undefined) {
    course.resources = parseArrayField(resources, course.resources || []);
  }

  if (notes !== undefined) {
    course.notes = parseArrayField(notes, course.notes || []);
  }

  if (materials !== undefined) {
    course.materials = parseArrayField(materials, course.materials || []);
  }

  if (relatedCourses !== undefined) {
    course.relatedCourses = asRelatedIds(parseArrayField(relatedCourses, course.relatedCourses || []));
  }
}
