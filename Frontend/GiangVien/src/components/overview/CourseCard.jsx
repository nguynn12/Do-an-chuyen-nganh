import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Users,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";


function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `${Math.round(Number(value))}%`;
}


function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(1);
}


function CourseCard({ courses }) {
  const navigate = useNavigate();

  // Mỗi lần hiển thị tối đa 3 môn
  const COURSES_PER_PAGE = 3;

  const [currentPage, setCurrentPage] =
    useState(0);

  const totalPages = Math.max(
    1,
    Math.ceil(
      courses.length / COURSES_PER_PAGE
    )
  );

  // Nếu dữ liệu thay đổi làm currentPage vượt quá
  // số trang thì giới hạn lại.
  const safePage = Math.min(
    currentPage,
    totalPages - 1
  );

  const startIndex =
    safePage * COURSES_PER_PAGE;

  const visibleCourses =
    courses.slice(
      startIndex,
      startIndex + COURSES_PER_PAGE
    );


  function handlePrevious() {
    setCurrentPage((page) => {
      if (page <= 0) {
        return totalPages - 1;
      }

      return page - 1;
    });
  }


  function handleNext() {
    setCurrentPage((page) => {
      if (page >= totalPages - 1) {
        return 0;
      }

      return page + 1;
    });
  }


  return (
    <section className="section">

      {/* =========================
          TITLE
      ========================= */}

      <div className="section-title">

        <div>
          <BookOpen size={19} />

          <strong>
            Khóa học đang giảng dạy
          </strong>
        </div>


        <div className="arrow-buttons">

          <button
            type="button"
            aria-label="Khóa học trước"
            onClick={handlePrevious}
            disabled={courses.length <= 3}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            aria-label="Khóa học tiếp theo"
            onClick={handleNext}
            disabled={courses.length <= 3}
          >
            <ChevronRight size={16} />
          </button>

        </div>

      </div>


      {/* =========================
          EMPTY
      ========================= */}

      {courses.length === 0 ? (
        <div className="empty-card">
          Chưa có khóa học trong học kỳ này.
        </div>
      ) : (

        /* =========================
            COURSE GRID
        ========================= */

        <div className="courses-grid">

          {visibleCourses.map(
            (course) => {

              const courseId =
                course.courseId ||
                course.id;

              const courseName =
                course.name ||
                course.title ||
                "Chưa có tên môn";

              const courseCode =
                course.code || "";

              return (
                <div
                  className="course-card"
                  key={courseId}
                >

                  {/* =================
                      COVER
                  ================= */}

                  <div
                    className="course-cover"
                    style={{
                      background:
                        course.color ||
                        "#3d7f3d",
                    }}
                  >

                    <div>
                      {courseCode && (
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {courseCode}
                        </span>
                      )}
                    </div>

                    <span>
                      •••
                    </span>

                  </div>


                  {/* =================
                      BODY
                  ================= */}

                  <div className="course-body">

                    <h3>
                      {courseName}
                    </h3>


                    {/* STUDENTS */}

                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Users size={14} />

                      Sinh viên:{" "}

                      <strong>
                        {course.studentCount ?? 0}
                      </strong>
                    </p>


                    {/* ATTENDANCE */}

                    <p>
                      Tỷ lệ chuyên cần:{" "}

                      <strong>
                        {formatPercent(
                          course.attendance
                        )}
                      </strong>
                    </p>


                    {/* SUBMISSION */}

                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <ClipboardCheck
                        size={14}
                      />

                      Tỷ lệ nộp bài:{" "}

                      <strong>
                        {formatPercent(
                          course.submissionRate
                        )}
                      </strong>
                    </p>


                    {/* SCORE */}

                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <GraduationCap
                        size={14}
                      />

                      Điểm TB:{" "}

                      <strong>
                        {formatScore(
                          course.averageScore
                        )}
                      </strong>
                    </p>


                    {/* =================
                        ACTIONS
                    ================= */}

                    <div className="course-actions">

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/cham-diem/${courseId}`
                          )
                        }
                      >
                        Bài chờ chấm
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/quan-ly-lop/${courseId}`
                          )
                        }
                      >
                        Quản lý lớp
                      </button>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </section>
  );
}


export default CourseCard;