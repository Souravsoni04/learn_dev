import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const STAR_VALUES = [1, 2, 3, 4, 5];

const materialKey = (material, index) => {
  return String(material.fileId || material.videoId || material.url || `${material.title}_${index}`);
};

const materialTitle = (material, index = 0) => {
  if (material?.title?.trim()) return material.title.trim();
  if (material?.name?.trim()) return material.name.trim();
  return `Lesson ${index + 1}`;
};

const normalizeType = (type = "") => type.toLowerCase();

const isDirectVideo = (url = "") => {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url) || url.includes("imagekit");
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

const typeLabel = (type) => {
  switch (normalizeType(type)) {
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "note":
      return "Instructor note";
    default:
      return "Resource";
  }
};

const LearningPage = () => {
  const { id } = useParams();
  const { addToast } = useToast();

  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [progress, setProgress] = useState(0);
  const [allNotes, setAllNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [error, setError] = useState("");
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [videoDurations, setVideoDurations] = useState({});
  const [videoDurationSeconds, setVideoDurationSeconds] = useState({});
  const [videoWatchedSeconds, setVideoWatchedSeconds] = useState({});
  const lastSavedWatchRef = useRef({});

  const videos = useMemo(() => materials.filter((m) => normalizeType(m.type) === "video"), [materials]);
  const pdfMaterials = useMemo(() => materials.filter((m) => normalizeType(m.type) === "pdf"), [materials]);
  const noteMaterials = useMemo(() => materials.filter((m) => normalizeType(m.type) === "note"), [materials]);
  const classMaterials = useMemo(
    () => [
      ...pdfMaterials.map((item, index) => ({ kind: "file", item, index })),
      ...noteMaterials.map((item, index) => ({ kind: "material-note", item, index })),
      ...(course?.notes || []).map((item, index) => ({ kind: "course-note", item, index }))
    ],
    [course?.notes, noteMaterials, pdfMaterials]
  );
  const activeMaterial = videos[activeVideoIndex] || null;
  const activeMaterialIndex = activeMaterial ? materials.indexOf(activeMaterial) : -1;
  const activeKey = useMemo(
    () => (activeMaterial ? materialKey(activeMaterial, activeMaterialIndex) : ""),
    [activeMaterial, activeMaterialIndex]
  );
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const query = searchQuery.toLowerCase();
    return videos.filter((m) => {
      return materialTitle(m).toLowerCase().includes(query) || (m.description || "").toLowerCase().includes(query);
    });
  }, [videos, searchQuery]);

  const completedVideoCount = useMemo(() => {
    return videos.filter((video) => completed.includes(materialKey(video, materials.indexOf(video)))).length;
  }, [completed, materials, videos]);

  const watchTimeMastery = useMemo(() => {
    const totals = videos.reduce(
      (sum, video) => {
        const key = materialKey(video, materials.indexOf(video));
        const duration = Number(videoDurationSeconds[key] || 0);
        const watched = Math.min(Number(videoWatchedSeconds[key] || 0), duration);
        if (duration <= 0) return sum;
        return {
          duration: sum.duration + duration,
          watched: sum.watched + watched
        };
      },
      { watched: 0, duration: 0 }
    );

    if (totals.duration <= 0) return progress;
    return Math.round((totals.watched / totals.duration) * 100);
  }, [materials, progress, videoDurationSeconds, videoWatchedSeconds, videos]);

  const detectedDuration = activeKey ? videoDurations[activeKey] : "";
  const activeDurationLabel = detectedDuration
    ? detectedDuration
    : activeMaterial?.url && isDirectVideo(activeMaterial.url)
      ? "Detecting length"
      : "External player";

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRes, contentRes, enrollmentRes, notesRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/courses/${id}/content`),
          api.get("/courses/enrollments/my"),
          api.get(`/courses/${id}/notes`)
        ]);

        const materialList = contentRes.data || [];
        setCourse(courseRes.data);
        setMaterials(materialList);

        const relatedIds = (courseRes.data.relatedCourses || []).map((item) =>
          typeof item === "string" ? item : item._id
        );
        if (relatedIds.length > 0) {
          const relatedRes = await Promise.all(relatedIds.map((rid) => api.get(`/courses/${rid}`).catch(() => null)));
          setRelatedCourses(relatedRes.filter((r) => r && r.data).map((r) => r.data));
        }

        const enrollment = (enrollmentRes.data || []).find((item) => {
          const courseId = typeof item.course === "string" ? item.course : item.course?._id;
          return courseId === id;
        });

        if (enrollment) {
          setCompleted(enrollment.completedMaterials || []);
          setProgress(enrollment.progress || 0);
          const watchedMap = {};
          const durationMap = {};
          const labelMap = {};
          for (const item of enrollment.videoProgress || []) {
            watchedMap[item.materialId] = Number(item.watchedSeconds || 0);
            durationMap[item.materialId] = Number(item.durationSeconds || 0);
            const label = formatSeconds(Number(item.durationSeconds || 0));
            if (label) labelMap[item.materialId] = label;
          }
          setVideoWatchedSeconds(watchedMap);
          setVideoDurationSeconds(durationMap);
          setVideoDurations(labelMap);
        }

        const notes = notesRes.data || [];
        setAllNotes(notes);

        const firstVideo = materialList.find((m) => normalizeType(m.type) === "video");
        if (firstVideo) {
          const firstVideoIndex = materialList.indexOf(firstVideo);
          const firstKey = materialKey(firstVideo, firstVideoIndex);
          const existing = notes.find((n) => n.materialId === firstKey);
          setNoteText(existing?.content || "");
        }
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load learning page"));
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!activeMaterial) return;
    const existing = allNotes.find((note) => note.materialId === activeKey);
    setNoteText(existing?.content || "");
  }, [activeMaterial, activeKey, allNotes]);

  const handleMetadataLoaded = (event, material = activeMaterial, index = activeMaterialIndex) => {
    if (!material) return;
    const key = materialKey(material, index);
    const label = formatSeconds(event.currentTarget.duration);
    if (!label) return;
    const duration = Number(event.currentTarget.duration || 0);
    setVideoDurations((current) => ({ ...current, [key]: label }));
    setVideoDurationSeconds((current) => ({ ...current, [key]: duration }));
    if (!videoDurationSeconds[key]) {
      saveVideoProgress(material, index, Number(videoWatchedSeconds[key] || 0), duration);
    }
  };

  const saveVideoProgress = async (material, index, watchedSeconds, durationSeconds, { silent = true } = {}) => {
    if (!material) return;
    const key = materialKey(material, index);
    const duration = Math.max(0, Number(durationSeconds) || 0);
    const watched = Math.max(0, Math.min(Number(watchedSeconds) || 0, duration || Number(watchedSeconds) || 0));

    setVideoWatchedSeconds((current) => ({
      ...current,
      [key]: Math.max(Number(current[key] || 0), watched)
    }));
    if (duration > 0) {
      setVideoDurationSeconds((current) => ({ ...current, [key]: Math.max(Number(current[key] || 0), duration) }));
      setVideoDurations((current) => ({ ...current, [key]: formatSeconds(duration) }));
    }

    try {
      const { data } = await api.post(`/courses/${id}/progress`, {
        materialId: key,
        watchedSeconds: watched,
        durationSeconds: duration
      });
      setCompleted(data.completedMaterials || []);
      setProgress(data.progress || 0);
      if (data.videoProgress) {
        const watchedMap = {};
        const durationMap = {};
        const labelMap = {};
        for (const item of data.videoProgress) {
          watchedMap[item.materialId] = Number(item.watchedSeconds || 0);
          durationMap[item.materialId] = Number(item.durationSeconds || 0);
          const label = formatSeconds(Number(item.durationSeconds || 0));
          if (label) labelMap[item.materialId] = label;
        }
        setVideoWatchedSeconds(watchedMap);
        setVideoDurationSeconds(durationMap);
        setVideoDurations((current) => ({ ...current, ...labelMap }));
      }
      if (!silent) addToast("Watch progress synced", "success");
    } catch (err) {
      if (!silent) addToast(getErrorMessage(err, "Could not save progress"), "error");
    }
  };

  const markComplete = async ({ silent = false } = {}) => {
    if (!activeMaterial) return;
    const duration = Number(videoDurationSeconds[activeKey] || 0);
    await saveVideoProgress(activeMaterial, activeMaterialIndex, duration, duration, { silent });
  };

  const handleTimeUpdate = (event) => {
    if (!activeMaterial) return;
    const currentTime = Number(event.currentTarget.currentTime || 0);
    const duration = Number(event.currentTarget.duration || videoDurationSeconds[activeKey] || 0);
    const previous = Number(videoWatchedSeconds[activeKey] || 0);
    const watched = Math.max(previous, currentTime);

    setVideoWatchedSeconds((current) => ({ ...current, [activeKey]: Math.max(Number(current[activeKey] || 0), watched) }));

    const lastSaved = Number(lastSavedWatchRef.current[activeKey] || 0);
    if (duration > 0 && watched - lastSaved >= 5) {
      lastSavedWatchRef.current[activeKey] = watched;
      saveVideoProgress(activeMaterial, activeMaterialIndex, watched, duration);
    }
  };

  const syncActiveVideoProgress = (event) => {
    if (!activeMaterial) return;
    const currentTime = Number(event.currentTarget.currentTime || 0);
    const duration = Number(event.currentTarget.duration || videoDurationSeconds[activeKey] || 0);
    saveVideoProgress(activeMaterial, activeMaterialIndex, Math.max(Number(videoWatchedSeconds[activeKey] || 0), currentTime), duration);
  };

  const handleVideoEnded = () => {
    if (!activeMaterial) return;
    const duration = Number(videoDurationSeconds[activeKey] || 0);
    saveVideoProgress(activeMaterial, activeMaterialIndex, duration, duration);
  };

  const saveNote = async () => {
    if (!activeMaterial) return;
    try {
      const { data } = await api.post(`/courses/${id}/notes`, { materialId: activeKey, content: noteText });
      setAllNotes(data.notes || []);
      addToast("Notes saved", "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Could not save note"), "error");
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/reviews/course/${id}`, reviewForm);
      addToast("Review submitted", "success");
      setReviewForm({ rating: 5, comment: "" });
    } catch (err) {
      addToast(getErrorMessage(err, "Review failed"), "error");
    }
  };

  const goToVideo = (video) => {
    const nextIndex = videos.indexOf(video);
    if (nextIndex >= 0) setActiveVideoIndex(nextIndex);
  };

  const renderPlayer = () => {
    if (!activeMaterial) {
      return (
        <div className="cinema-empty">
          <strong>No video lessons yet</strong>
          <span>Add video material from the admin course editor.</span>
        </div>
      );
    }

    if (activeMaterial.url && isDirectVideo(activeMaterial.url)) {
      return (
        <video
          key={activeKey}
          controls
          className="content-frame"
          src={activeMaterial.url}
          onLoadedMetadata={handleMetadataLoaded}
          onTimeUpdate={handleTimeUpdate}
          onPause={syncActiveVideoProgress}
          onEnded={handleVideoEnded}
        >
          <track kind="captions" />
        </video>
      );
    }

    return <iframe className="content-frame" src={activeMaterial.url} title={materialTitle(activeMaterial)} allowFullScreen />;
  };

  if (error) {
    return (
      <section className="shell page-stack">
        <p className="error-text">{error}</p>
        <Link to="/courses" className="btn">
          Back to courses
        </Link>
      </section>
    );
  }

  return (
    <section className="learning-room shell page-stack animate-fade-in">
      <div className="learning-hero">
        <div>
          <p className="kicker">Cinema Learning Mode</p>
          <h1>{course?.title || "Classroom"}</h1>
          <p>{course?.subtitle || "Focused video lessons, lesson materials, locked course notes, and your own study pad separated clearly."}</p>
        </div>
        <div className="learning-hero-actions">
          <span className="learning-stat">
            <strong>{watchTimeMastery}%</strong>
            <small>Watched</small>
          </span>
          <Link to="/dashboard" className="btn btn-outline">
            Dashboard
          </Link>
          <button type="button" className="btn" onClick={markComplete} disabled={!activeMaterial}>
            Sync Progress
          </button>
        </div>
      </div>

      <div className="learning-layout">
        <main className="learning-main">
          <section className="cinema-panel animate-scale-up">
            <div className="cinema-toolbar">
              <div>
                <span>Now Playing</span>
                <strong>{activeMaterial ? materialTitle(activeMaterial, activeVideoIndex) : "No video selected"}</strong>
              </div>
              <div className="cinema-badges">
                <span>{activeDurationLabel}</span>
              <span>{completed.includes(activeKey) ? "Completed" : `${Math.round(((videoWatchedSeconds[activeKey] || 0) / (videoDurationSeconds[activeKey] || 1)) * 100)}% watched`}</span>
              </div>
            </div>
            <div className="cinema-container">{renderPlayer()}</div>
            <div className="player-nav-controls">
              <button
                className="player-nav-btn"
                onClick={() => setActiveVideoIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeVideoIndex === 0}
              >
                Previous
              </button>
              <button
                className="player-nav-btn"
                onClick={() => setActiveVideoIndex((prev) => Math.min(videos.length - 1, prev + 1))}
                disabled={activeVideoIndex >= videos.length - 1}
              >
                Next
              </button>
            </div>
          </section>

          <section className="lesson-brief modern-card animate-fade-in delay-100">
            <div>
              <p className="kicker">Lesson Brief</p>
              <h2>{activeMaterial ? materialTitle(activeMaterial, activeVideoIndex) : "Waiting for a lesson"}</h2>
            </div>
            <p>
              {activeMaterial?.description ||
                "Watch the lesson, then use the materials below. Lesson PDFs stay with the class content, while full-course notes are shown as separate course-wide resources."}
            </p>
            <div className="lesson-facts">
              <span>{typeLabel(activeMaterial?.type)}</span>
              <span>Original length: {activeDurationLabel}</span>
              <span>{watchTimeMastery}% total watch progress</span>
            </div>
          </section>

          <section className="resource-split">
            <article className="resource-panel class-materials-panel animate-fade-in delay-100">
              <div className="resource-head">
                <div>
                  <p className="kicker">Lesson Materials</p>
                  <h2>Lesson Materials</h2>
                  <p>Files and notes connected to lessons, plus course-wide downloads unlocked for enrolled students.</p>
                </div>
                <span>{classMaterials.length} items</span>
              </div>
              {classMaterials.length > 0 ? (
                <div className="class-files-grid">
                  {classMaterials.map(({ kind, item, index }) => {
                    const isCourseNote = kind === "course-note";
                    const title = isCourseNote ? item.title || `Course note ${index + 1}` : materialTitle(item, index);
                    const description = isCourseNote
                      ? item.content || "Instructor note"
                      : item.description || "Class material provided by the instructor.";
                    const url = isCourseNote ? item.fileUrl : item.url;
                    const label = kind === "file" ? "File" : "Note";
                    const key = isCourseNote ? `${item.title}_${index}` : materialKey(item, materials.indexOf(item));

                    return (
                      <article className={`class-file-card ${kind === "file" ? "" : "note-card"}`} key={key}>
                        <span>{label}</span>
                        <strong>{title}</strong>
                        <p>{description}</p>
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer">
                            Open {kind === "file" ? "file" : "attachment"}
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-resource">No lesson materials or course-wide downloads have been added for this course.</div>
              )}
            </article>
          </section>

          <section className="knowledge-pad animate-fade-in delay-200">
            <div className="row between">
              <div>
                <p className="kicker">Personal Notes</p>
                <h2>Study Pad</h2>
              </div>
              <button type="button" className="btn" onClick={saveNote} disabled={!activeMaterial}>
                Save Notes
              </button>
            </div>
            <textarea
              rows={9}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your own notes for the current video lesson..."
            />
          </section>

          {relatedCourses.length > 0 && (
            <section className="resource-split">
              <article className="resource-panel related-courses-panel">
                <div className="resource-head">
                  <div>
                    <p className="kicker">Next Paths</p>
                    <h2>Related Courses</h2>
                  </div>
                  <span>{relatedCourses.length}</span>
                </div>
                <div className="related-learning-grid">
                  {relatedCourses.map((rc) => (
                    <Link key={rc._id} to={`/courses/${rc._id}`}>
                      <img src={rc.thumbnail || "https://picsum.photos/seed/related/300/180"} alt={rc.title} />
                      <strong>{rc.title}</strong>
                    </Link>
                  ))}
                </div>
              </article>
            </section>
          )}

          <form className="modern-card review-panel" onSubmit={submitReview}>
            <div>
              <p className="kicker">Course Review</p>
              <h2>Rate Your Experience</h2>
            </div>
            <div className="star-row" role="radiogroup" aria-label="Course rating">
              {STAR_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={reviewForm.rating === value}
                  className={`star-btn ${value <= reviewForm.rating ? "active" : ""}`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: value })}
                >
                  *
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder="Share your learning experience..."
              required
            />
            <button type="submit" className="btn">
              Post Review
            </button>
          </form>
        </main>

        <aside className="learning-sidebar animate-slide-in-right">
          <div className="sidebar-header">
            <p className="kicker">Curriculum</p>
            <strong>{videos.length} video lessons</strong>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${watchTimeMastery}%` }} />
            </div>
            <span>{watchTimeMastery}% of course watched</span>
          </div>

          <div className="nav-search-container">
            <input
              type="text"
              placeholder="Search videos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sidebar-scroll custom-scrollbar">
            {filteredVideos.map((material, index) => {
              const videoIndex = videos.indexOf(material);
              const originalIndex = materials.indexOf(material);
              const key = materialKey(material, originalIndex);
              const isDone = completed.includes(key);
              const isActive = videoIndex === activeVideoIndex;
              const durationLabel = videoDurations[key] || (isDirectVideo(material.url || "") ? "Load to detect" : "External");

              return (
                <button
                  key={key}
                  className={`lesson-card ${isActive ? "active" : ""}`}
                  style={{ animationDelay: `${index * 35}ms` }}
                  onClick={() => goToVideo(material)}
                >
                  <div className={`lesson-status ${isDone ? "status-done" : isActive ? "status-active" : "status-pending"}`}>
                    {isDone ? "OK" : String(videoIndex + 1).padStart(2, "0")}
                  </div>
                  <div className="lesson-card-copy">
                    <strong>{materialTitle(material, videoIndex)}</strong>
                    <span>{durationLabel}</span>
                  </div>
                </button>
              );
            })}
            {filteredVideos.length === 0 && <div className="empty-resource">No matching videos.</div>}
          </div>

          <div className="sidebar-footer">
            <div className="instructor-mini">
              <img src={course?.instructor?.avatar || "https://ui-avatars.com/api/?background=eef7f4&color=16806f"} alt={course?.instructor?.name || "Instructor"} />
              <div>
                <strong>{course?.instructor?.name || "Instructor"}</strong>
                <span>Course mentor</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div className="metadata-preload" aria-hidden="true">
        {videos.map((video, index) => {
          const originalIndex = materials.indexOf(video);
          const key = materialKey(video, originalIndex);
          if (!video.url || !isDirectVideo(video.url) || key === activeKey || videoDurationSeconds[key]) return null;
          return (
            <video
              key={key}
              preload="metadata"
              src={video.url}
              onLoadedMetadata={(event) => handleMetadataLoaded(event, video, originalIndex)}
            />
          );
        })}
      </div>
    </section>
  );
};

export default LearningPage;
