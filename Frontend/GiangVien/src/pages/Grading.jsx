import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ClipboardCheck,
  AlertTriangle,
  BookOpen,
  Search,
  CheckCircle2,
  ExternalLink,
  Filter,
  Layers3,
  Clock3,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getTeacherGrading,
  getTeacherCourses,
} from "../services/teacherApi";

import "../styles/Grading.css";


function Grading() {
  const navigate = useNavigate();

  const { courseId } =
    useParams();

  const [rows, setRows] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [courseFilter, setCourseFilter] =
    useState(
      courseId
        ? String(courseId)
        : "all"
    );


  // ======================================================
  // LOAD DATA
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const teacherId =
          Number(
            localStorage.getItem(
              "currentTeacherId"
            )
          );

        if (!teacherId) {
          throw new Error(
            "Không tìm thấy giảng viên đang đăng nhập."
          );
        }

        const [
          gradingRows,
          teacherCourses,
        ] = await Promise.all([
          getTeacherGrading(
            teacherId,
            courseId || null
          ),

          getTeacherCourses(
            teacherId
          ),
        ]);

        if (cancelled) {
          return;
        }

        setRows(
          gradingRows || []
        );

        setCourses(
          teacherCourses || []
        );
      } catch (err) {
        console.error(
          "Lỗi tải grading:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Không thể tải danh sách bài chờ chấm."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courseId]);


  // ======================================================
  // COUNTERS
  // ======================================================

  const submittedCount =
    rows.filter(
      (row) =>
        row.Submission_Status ===
        "submitted"
    ).length;


  const lateCount =
    rows.filter(
      (row) =>
        row.Submission_Status ===
          "submitted" &&
        Number(
          row.Is_Submitted_On_Time
        ) === 0
    ).length;


  const courseCount =
    new Set(
      rows.map(
        (row) =>
          row.Moodle_Course_ID
      )
    ).size;


  // ======================================================
  // FILTER
  // ======================================================

  const filteredRows =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();

      return rows.filter(
        (row) => {
          const matchesSearch =
            !keyword ||
            String(
              row.Student_Name || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            String(
              row.Student_Username || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            String(
              row.Activity_Name || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            String(
              row.Course_Name || ""
            )
              .toLowerCase()
              .includes(keyword);

          const matchesCourse =
            courseFilter === "all" ||
            String(
              row.Moodle_Course_ID
            ) ===
              courseFilter;

          let matchesStatus = true;

          if (
            statusFilter ===
            "ontime"
          ) {
            matchesStatus =
              Number(
                row.Is_Submitted_On_Time
              ) === 1;
          }

          if (
            statusFilter ===
            "late"
          ) {
            matchesStatus =
              Number(
                row.Is_Submitted_On_Time
              ) === 0;
          }

          return (
            matchesSearch &&
            matchesCourse &&
            matchesStatus
          );
        }
      );
    }, [
      rows,
      searchTerm,
      courseFilter,
      statusFilter,
    ]);


  // ======================================================
  // STATUS
  // ======================================================

  function getStatus(row) {
    if (
      Number(
        row.Is_Submitted_On_Time
      ) === 1
    ) {
      return {
        key: "ontime",
        label: "Đúng hạn",
        icon: (
          <CheckCircle2
            size={14}
          />
        ),
      };
    }

    return {
      key: "late",
      label: "Nộp trễ",
      icon: (
        <AlertTriangle
          size={14}
        />
      ),
    };
  }


  // ======================================================
  // AVATAR
  // ======================================================

  function getAvatarLetter(name) {
    if (!name) {
      return "?";
    }

    const parts =
      String(name)
        .trim()
        .split(/\s+/);

    return (
      parts[
        parts.length - 1
      ]
        ?.charAt(0)
        ?.toUpperCase() ||
      "?"
    );
  }


  // ======================================================
  // OPEN LMS
  // ======================================================

  function handleOpenLms(row) {
    console.log(
      "Mở trên LMS:",
      row
    );

    // Sau này khi có URL Moodle thật:
    //
    // window.open(
    //   `https://lms.dlu.edu.vn/mod/assign/view.php?id=${row.Moodle_Module_ID}`,
    //   "_blank"
    // );
  }


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="grading-loading">
        <div className="grading-spinner" />

        <strong>
          Đang tải dữ liệu
        </strong>

        <p>
          Đang đồng bộ bài chờ chấm từ LMS...
        </p>
      </div>
    );
  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <div className="grading-loading">
        <h2>
          Không thể tải bài chờ chấm
        </h2>

        <p>{error}</p>

        <button
          type="button"
          onClick={() =>
            navigate("/")
          }
        >
          Quay lại Tổng quan
        </button>
      </div>
    );
  }


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div className="grading-page">

      {/* BACKGROUND DECORATION */}

      <div className="grading-bg-orb grading-bg-orb-one" />
      <div className="grading-bg-orb grading-bg-orb-two" />
      <div className="grading-bg-grid" />


      {/* ============================
          TOP BAR
      ============================ */}

      <div className="grading-topbar">

        <button
          type="button"
          className="grading-back"
          onClick={() =>
            navigate("/")
          }
        >
          <ArrowLeft size={17} />

          Quay lại Tổng quan
        </button>


        <div className="grading-brand-mini">

          <span className="grading-brand-dot" />

          <div>
            <strong>
              DLU Analytics
            </strong>

            <span>
              Dalat University
            </span>
          </div>

        </div>

      </div>


      <main className="grading-content">

        {/* ============================
            HERO
        ============================ */}

        <section className="grading-hero">

          <div className="grading-hero-content">

            <div className="grading-hero-icon">
              <ClipboardCheck
                size={28}
              />
            </div>


            <div className="grading-hero-text">

              <span className="grading-eyebrow">
                LMS ANALYTICS
              </span>

              <h1>
                Bài chờ chấm
              </h1>

              <p>
                Tổng hợp những bài sinh viên
                đã nộp nhưng chưa được xử lý
                trên hệ thống LMS.
              </p>

            </div>

          </div>


          <div className="grading-hero-summary">

            <div>
              <span>
                Cần xử lý
              </span>

              <strong>
                {rows.length}
              </strong>
            </div>

            <span className="grading-hero-divider" />

            <div>
              <span>
                Môn học
              </span>

              <strong>
                {courseCount}
              </strong>
            </div>

            <span className="grading-hero-divider" />

            <div>
              <span>
                Nộp trễ
              </span>

              <strong className="grading-orange">
                {lateCount}
              </strong>
            </div>

          </div>


          <div className="grading-hero-decoration">
            <span />
            <span />
            <span />
          </div>

        </section>


        {/* ============================
            QUICK OVERVIEW
        ============================ */}

        <section className="grading-overview-strip">

          <div className="grading-overview-item">

            <div className="grading-overview-icon green">
              <ClipboardCheck
                size={18}
              />
            </div>

            <div>
              <span>
                Tổng bài chờ
              </span>

              <strong>
                {rows.length}
              </strong>
            </div>

          </div>


          <div className="grading-overview-item">

            <div className="grading-overview-icon olive">
              <CheckCircle2
                size={18}
              />
            </div>

            <div>
              <span>
                Đã nộp
              </span>

              <strong>
                {submittedCount}
              </strong>
            </div>

          </div>


          <div className="grading-overview-item">

            <div className="grading-overview-icon blue">
              <Layers3
                size={18}
              />
            </div>

            <div>
              <span>
                Môn có bài chờ
              </span>

              <strong>
                {courseCount}
              </strong>
            </div>

          </div>


          <div className="grading-overview-item">

            <div className="grading-overview-icon orange">
              <Clock3
                size={18}
              />
            </div>

            <div>
              <span>
                Bài nộp trễ
              </span>

              <strong>
                {lateCount}
              </strong>
            </div>

          </div>

        </section>


        {/* ============================
            MAIN PANEL
        ============================ */}

        <section className="grading-panel">

          {/* HEADER */}

          <div className="grading-panel-heading">

            <div>
              <span className="grading-panel-kicker">
                DANH SÁCH XỬ LÝ
              </span>

              <h2>
                Bài nộp cần theo dõi
              </h2>

              <p>
                Hiển thị{" "}
                <strong>
                  {filteredRows.length}
                </strong>{" "}
                trong tổng số{" "}
                <strong>
                  {rows.length}
                </strong>{" "}
                bài.
              </p>
            </div>


            <div className="grading-panel-count">
              {filteredRows.length}
            </div>

          </div>


          {/* ============================
              TOOLBAR
          ============================ */}

          <div className="grading-toolbar">

            <div className="grading-search">

              <Search size={17} />

              <input
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target
                      .value
                  )
                }
                placeholder="Tìm sinh viên hoặc bài tập..."
              />

            </div>


            <div className="grading-tools">

              <div className="grading-select-wrap">

                <BookOpen
                  size={16}
                />

                <select
                  value={
                    courseFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setCourseFilter(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    Boolean(courseId)
                  }
                >
                  <option value="all">
                    Tất cả môn
                  </option>

                  {courses.map(
                    (course) => (
                      <option
                        key={
                          course.Moodle_Course_ID
                        }
                        value={
                          course.Moodle_Course_ID
                        }
                      >
                        {
                          course.Course_Code
                        }{" "}
                        -{" "}
                        {
                          course.Course_Name
                        }
                      </option>
                    )
                  )}
                </select>

              </div>


              <div className="grading-select-wrap">

                <Filter
                  size={16}
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="all">
                    Tất cả trạng thái
                  </option>

                  <option value="ontime">
                    Đúng hạn
                  </option>

                  <option value="late">
                    Nộp trễ
                  </option>
                </select>

              </div>

            </div>

          </div>


          {/* ============================
              TABLE HEADER
          ============================ */}

          <div className="grading-table-head">

            <span>
              Sinh viên
            </span>

            <span>
              Bài tập
            </span>

            <span>
              Điểm tối đa
            </span>

            <span>
              Trạng thái
            </span>

            <span />

          </div>


          {/* ============================
              LIST
          ============================ */}

          <div className="grading-list">

            {filteredRows.length >
            0 ? (
              filteredRows.map(
                (row) => {
                  const status =
                    getStatus(
                      row
                    );

                  return (
                    <article
                      className="grading-item"
                      key={
                        row.Submission_Key
                      }
                    >

                      {/* STUDENT */}

                      <div className="grading-student">

                        <div className="grading-avatar">
                          {getAvatarLetter(
                            row.Student_Name
                          )}
                        </div>


                        <div className="grading-student-info">

                          <strong>
                            {
                              row.Student_Name
                            }
                          </strong>

                          <span>
                            {
                              row.Student_Username
                            }
                          </span>

                          <small>
                            {
                              row.Student_Email
                            }
                          </small>

                        </div>

                      </div>


                      {/* ASSIGNMENT */}

                      <div className="grading-assignment">

                        <strong>
                          {
                            row.Activity_Name
                          }
                        </strong>

                        <span>
                          {
                            row.Course_Code
                          }

                          <i />

                          {
                            row.Course_Name
                          }
                        </span>

                      </div>


                      {/* GRADE */}

                      <div className="grading-grade">

                        <strong>
                          {
                            row.Max_Grade ??
                            "—"
                          }
                        </strong>

                        <span>
                          điểm
                        </span>

                      </div>


                      {/* STATUS */}

                      <div className="grading-status-cell">

                        <span
                          className={
                            `grading-status ${status.key}`
                          }
                        >
                          {status.icon}

                          {
                            status.label
                          }
                        </span>

                      </div>


                      {/* ACTION */}

                      <div className="grading-action">

                        <button
                          type="button"
                          className="grading-lms-button"
                          onClick={() =>
                            handleOpenLms(
                              row
                            )
                          }
                        >
                          Mở LMS

                          <ExternalLink
                            size={15}
                          />
                        </button>

                      </div>

                    </article>
                  );
                }
              )
            ) : (
              <div className="grading-empty">

                <div className="grading-empty-icon">
                  <ClipboardCheck
                    size={30}
                  />
                </div>

                <strong>
                  Không tìm thấy bài phù hợp
                </strong>

                <p>
                  Hãy thử thay đổi từ khóa
                  hoặc bộ lọc hiện tại.
                </p>

              </div>
            )}

          </div>

        </section>


        {/* ============================
            FOOTNOTE
        ============================ */}

        <div className="grading-note">

          <div className="grading-note-dot" />

          <p>
            Dữ liệu được tổng hợp từ LMS.
            Thao tác chấm điểm vẫn thực hiện
            trực tiếp trên hệ thống LMS của
            Trường Đại học Đà Lạt.
          </p>

        </div>

      </main>

    </div>
  );
}


export default Grading;