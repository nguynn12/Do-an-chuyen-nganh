import {
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Plus,
  X,
  Clock3,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";

import {
  createTeacherScheduleApi,
  updateTeacherScheduleApi,
  deleteTeacherScheduleApi,
} from "../../services/teacherApi";


// ======================================================
// BUILD CALENDAR
// ======================================================

function buildCalendarDays(date) {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    );

  const lastDay =
    new Date(
      year,
      month + 1,
      0
    );

  const previousLastDay =
    new Date(
      year,
      month,
      0
    ).getDate();

  const cells = [];


  // ======================================
  // THÁNG TRƯỚC
  // ======================================

  for (
    let i =
      firstDay.getDay() - 1;
    i >= 0;
    i -= 1
  ) {
    cells.push({
      date: new Date(
        year,
        month - 1,
        previousLastDay - i
      ),

      outside: true,
    });
  }


  // ======================================
  // THÁNG HIỆN TẠI
  // ======================================

  for (
    let day = 1;
    day <=
    lastDay.getDate();
    day += 1
  ) {
    cells.push({
      date: new Date(
        year,
        month,
        day
      ),

      outside: false,
    });
  }


  // ======================================
  // THÁNG SAU
  // ======================================

  while (
    cells.length < 42
  ) {
    const nextDay =
      cells.length -
      (
        firstDay.getDay() +
        lastDay.getDate()
      ) +
      1;

    cells.push({
      date: new Date(
        year,
        month + 1,
        nextDay
      ),

      outside: true,
    });
  }


  return cells.slice(
    0,
    42
  );
}


// ======================================================
// DATE KEY
// ======================================================

function toDateKey(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(dateKey) {
  if (!dateKey) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] =
    dateKey.split("-");

  return `${day}/${month}/${year}`;
}


// ======================================================
// EVENT LABEL
// ======================================================

function getEventLabel(type) {
  switch (type) {
    case "class":
      return "Lịch dạy";

    case "exam":
      return "Lịch thi";

    case "meeting":
      return "Cuộc họp";

    case "deadline":
      return "Deadline";

    default:
      return "Lịch";
  }
}


// ======================================================
// EVENT ƯU TIÊN
//
// exam > deadline > meeting > class
// ======================================================

function getPrimaryEventType(
  events
) {
  if (
    !events ||
    events.length === 0
  ) {
    return null;
  }


  const types =
    events.map(
      (item) =>
        item.type
    );


  if (
    types.includes(
      "exam"
    )
  ) {
    return "exam";
  }


  if (
    types.includes(
      "deadline"
    )
  ) {
    return "deadline";
  }


  if (
    types.includes(
      "meeting"
    )
  ) {
    return "meeting";
  }


  return "class";
}


// ======================================================
// SCHEDULE PANEL
// ======================================================

function SchedulePanel({
  open,
  onClose,
  schedule = [],
  onScheduleChange,
}) {

  // ======================================
  // GIẢNG VIÊN ĐANG LOGIN
  // ======================================

  const teacherId =
    Number(
      localStorage.getItem(
        "currentTeacherId"
      )
    );


  // ======================================
  // CALENDAR STATE
  // ======================================

  const [
    currentMonth,
    setCurrentMonth,
  ] =
    useState(
      new Date(
        2026,
        7,
        1
      )
    );


  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(null);


  const [
    showForm,
    setShowForm,
  ] =
    useState(false);


  // ======================================
  // FORM STATE
  // ======================================

  const [
    title,
    setTitle,
  ] =
    useState("");


  const [
    time,
    setTime,
  ] =
    useState("");


  const [
    type,
    setType,
  ] =
    useState(
      "class"
    );


  // ======================================
  // EDIT STATE
  // ======================================

  const [
    editingId,
    setEditingId,
  ] =
    useState(null);


  // ======================================
  // REQUEST STATE
  // ======================================

  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    deletingId,
    setDeletingId,
  ] =
    useState(null);


  const [
    formError,
    setFormError,
  ] =
    useState("");


  // ======================================
  // CALENDAR CELLS
  // ======================================

  const cells =
    buildCalendarDays(
      currentMonth
    );


  // ======================================
  // EVENT TRONG NGÀY
  // ======================================

  const selectedEvents =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }


      return schedule.filter(
        (item) =>
          item.date ===
          selectedDate
      );

    }, [
      schedule,
      selectedDate,
    ]);


  // ======================================
  // RESET FORM
  // ======================================

  const resetForm =
    () => {
      setTitle("");
      setTime("");
      setType("class");

      setEditingId(
        null
      );

      setShowForm(
        false
      );

      setFormError("");
    };


  // ======================================
  // CREATE / UPDATE
  // ======================================

  const handleSubmitEvent =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !selectedDate
      ) {
        setFormError(
          "Vui lòng chọn ngày."
        );

        return;
      }


      if (
        !title.trim()
      ) {
        setFormError(
          "Vui lòng nhập tiêu đề lịch."
        );

        return;
      }


      if (
        !teacherId
      ) {
        setFormError(
          "Không tìm thấy giảng viên đang đăng nhập."
        );

        return;
      }


      try {
        setSaving(
          true
        );

        setFormError("");


        const payload = {
          date:
            selectedDate,

          time:
            time || "",

          title:
            title.trim(),

          type,

          description:
            "",
        };


        // ====================================
        // UPDATE
        // ====================================

        if (
          editingId
        ) {
          const updatedEvent =
            await updateTeacherScheduleApi(
              teacherId,
              editingId,
              payload
            );


          const updatedSchedule =
            schedule.map(
              (item) =>
                Number(
                  item.id
                ) ===
                Number(
                  editingId
                )
                  ? updatedEvent
                  : item
            );


          onScheduleChange?.(
            updatedSchedule
          );


          resetForm();

          return;
        }


        // ====================================
        // CREATE
        // ====================================

        const createdEvent =
          await createTeacherScheduleApi(
            teacherId,
            payload
          );


        onScheduleChange?.([
          ...schedule,
          createdEvent,
        ]);


        resetForm();

      } catch (error) {
        console.error(
          "Lỗi lưu lịch:",
          error
        );


        setFormError(
          error.message ||
            "Không thể lưu lịch."
        );

      } finally {
        setSaving(
          false
        );
      }
    };


  // ======================================
  // DELETE
  // ======================================

  const handleDelete =
    async (
      id
    ) => {
      if (!teacherId) {
        return;
      }


      const confirmed =
        window.confirm(
          "Bạn có chắc muốn xóa lịch này không?"
        );


      if (!confirmed) {
        return;
      }


      try {
        setDeletingId(
          id
        );


        await deleteTeacherScheduleApi(
          teacherId,
          id
        );


        const updatedSchedule =
          schedule.filter(
            (item) =>
              Number(
                item.id
              ) !==
              Number(id)
          );


        onScheduleChange?.(
          updatedSchedule
        );


        if (
          Number(
            editingId
          ) ===
          Number(id)
        ) {
          resetForm();
        }

      } catch (error) {
        console.error(
          "Lỗi xóa lịch:",
          error
        );


        window.alert(
          error.message ||
            "Không thể xóa lịch."
        );

      } finally {
        setDeletingId(
          null
        );
      }
    };


  // ======================================
  // EDIT
  // ======================================

  const handleEdit =
    (item) => {
      setEditingId(
        item.id
      );


      setTitle(
        item.title ||
          ""
      );


      setTime(
        item.time ||
          ""
      );


      setType(
        item.type ||
          "class"
      );


      setFormError("");


      setShowForm(
        true
      );
    };


  // ======================================
  // PREVIOUS MONTH
  // ======================================

  const handlePreviousMonth =
    () => {
      setCurrentMonth(
        (current) =>
          new Date(
            current.getFullYear(),
            current.getMonth() -
              1,
            1
          )
      );


      setSelectedDate(
        null
      );


      resetForm();
    };


  // ======================================
  // NEXT MONTH
  // ======================================

  const handleNextMonth =
    () => {
      setCurrentMonth(
        (current) =>
          new Date(
            current.getFullYear(),
            current.getMonth() +
              1,
            1
          )
      );


      setSelectedDate(
        null
      );


      resetForm();
    };


  // ======================================
  // SELECT DATE
  // ======================================

  const handleSelectDate =
    (key) => {
      setSelectedDate(
        key
      );


      resetForm();
    };


  // ======================================
  // OPEN CREATE FORM
  // ======================================

  const handleOpenCreateForm =
    () => {
      setEditingId(
        null
      );

      setTitle("");

      setTime("");

      setType(
        "class"
      );

      setFormError("");

      setShowForm(
        true
      );
    };


  // ======================================
  // CLOSED
  // ======================================

  if (!open) {
    return null;
  }


  // ======================================
  // PAGE
  // ======================================

  return (
    <div
      className="schedule-panel-overlay"
      onMouseDown={
        onClose
      }
    >

      <aside
        className="schedule-panel"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        {/* =================================
            HEADER
        ================================= */}

        <div className="schedule-panel-header">

          <div>

            <span>
              QUẢN LÝ LỊCH
            </span>

            <h2>
              Lịch giảng viên
            </h2>

          </div>


          <button
            type="button"
            className="schedule-panel-close"
            onClick={
              onClose
            }
            title="Đóng"
          >
            <X
              size={19}
            />
          </button>

        </div>


        {/* =================================
            CALENDAR
        ================================= */}

        <div className="schedule-panel-calendar">

          <div className="schedule-calendar-nav">

            <strong>
              Tháng{" "}
              {currentMonth.getMonth() +
                1}
              ,{" "}
              {currentMonth.getFullYear()}
            </strong>


            <div>

              <button
                type="button"
                onClick={
                  handlePreviousMonth
                }
                title="Tháng trước"
              >
                ‹
              </button>


              <button
                type="button"
                onClick={
                  handleNextMonth
                }
                title="Tháng sau"
              >
                ›
              </button>

            </div>

          </div>


          {/* WEEK */}

          <div className="schedule-week">

            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>

          </div>


          {/* DAYS */}

          <div className="schedule-days">

            {cells.map(
              (cell) => {

                const key =
                  toDateKey(
                    cell.date
                  );


                const dayEvents =
                  schedule.filter(
                    (item) =>
                      item.date ===
                      key
                  );


                const hasEvent =
                  dayEvents.length >
                  0;


                const eventType =
                  getPrimaryEventType(
                    dayEvents
                  );


                const selected =
                  key ===
                  selectedDate;


                return (
                  <button
                    key={key}

                    type="button"

                    disabled={
                      cell.outside
                    }

                    className={[
                      "schedule-day",

                      cell.outside
                        ? "outside"
                        : "",

                      hasEvent
                        ? "has-event"
                        : "",

                      eventType
                        ? `event-${eventType}`
                        : "",

                      selected
                        ? "selected"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" ")}

                    onClick={() =>
                      handleSelectDate(
                        key
                      )
                    }

                    title={
                      hasEvent
                        ? dayEvents
                            .map(
                              (
                                item
                              ) =>
                                `${item.title} - ${getEventLabel(
                                  item.type
                                )}`
                            )
                            .join(
                              ", "
                            )
                        : ""
                    }
                  >

                    <span>
                      {cell.date.getDate()}
                    </span>


                    {hasEvent && (
                      <i />
                    )}

                  </button>
                );
              }
            )}

          </div>


          {/* =================================
              LEGEND
          ================================= */}

          <div className="schedule-legend">

            <span>
              <i className="legend-dot class" />
              Lịch dạy
            </span>


            <span>
              <i className="legend-dot exam" />
              Lịch thi
            </span>


            <span>
              <i className="legend-dot deadline" />
              Deadline
            </span>


            <span>
              <i className="legend-dot meeting" />
              Cuộc họp
            </span>

          </div>

        </div>


        {/* =================================
            DETAIL
        ================================= */}

        <div className="schedule-detail">

          {!selectedDate ? (

            <div className="schedule-empty">

              <CalendarDays
                size={32}
              />

              <strong>
                Chọn một ngày
              </strong>

              <p>
                Chọn ngày trên lịch để
                xem hoặc tạo lịch mới.
              </p>

            </div>

          ) : (

            <>

              {/* HEADER DETAIL */}

              <div className="schedule-detail-header">

                <div>

                  <span>
                    LỊCH TRONG NGÀY
                  </span>

                  <h3>
                    {formatDate(
                      selectedDate
                    )}
                  </h3>

                </div>


                <button
                  type="button"

                  onClick={
                    handleOpenCreateForm
                  }

                  disabled={
                    saving
                  }
                >
                  <Plus
                    size={15}
                  />

                  Tạo lịch
                </button>

              </div>


              {/* =================================
                  EVENT LIST
              ================================= */}

              {selectedEvents.length ===
              0 ? (

                <div className="schedule-no-event">
                  Chưa có lịch trong ngày này.
                </div>

              ) : (

                <div className="schedule-event-list">

                  {selectedEvents.map(
                    (item) => (

                      <div
                        className={[
                          "schedule-event",

                          `event-${
                            item.type ||
                            "class"
                          }`,
                        ].join(
                          " "
                        )}

                        key={
                          item.id
                        }
                      >

                        {/* TIME */}

                        <div className="schedule-event-time">

                          <Clock3
                            size={14}
                          />

                          <span>
                            {item.time ||
                              "--:--"}
                          </span>

                        </div>


                        {/* INFO */}

                        <div className="schedule-event-info">

                          <strong>
                            {item.title}
                          </strong>

                          <span>
                            {getEventLabel(
                              item.type
                            )}
                          </span>

                        </div>


                        {/* ACTION */}

                        <div className="schedule-event-actions">

                          <button
                            type="button"

                            title="Chỉnh sửa"

                            disabled={
                              saving ||
                              deletingId ===
                                item.id
                            }

                            onClick={() =>
                              handleEdit(
                                item
                              )
                            }
                          >
                            <Pencil
                              size={14}
                            />
                          </button>


                          <button
                            type="button"

                            title="Xóa"

                            disabled={
                              saving ||
                              deletingId ===
                                item.id
                            }

                            onClick={() =>
                              handleDelete(
                                item.id
                              )
                            }
                          >
                            {deletingId ===
                            item.id ? (
                              <Loader2
                                size={14}
                                className="schedule-spin"
                              />
                            ) : (
                              <Trash2
                                size={14}
                              />
                            )}
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}


              {/* =================================
                  CREATE / EDIT FORM
              ================================= */}

              {showForm && (

                <form
                  className="schedule-create-form"

                  onSubmit={
                    handleSubmitEvent
                  }
                >

                  <div className="schedule-create-title">

                    <strong>
                      {editingId
                        ? "Chỉnh sửa lịch"
                        : "Tạo lịch mới"}
                    </strong>


                    <button
                      type="button"

                      onClick={
                        resetForm
                      }

                      disabled={
                        saving
                      }

                      title="Đóng"
                    >
                      <X
                        size={15}
                      />
                    </button>

                  </div>


                  {/* TITLE */}

                  <label>

                    <span>
                      Tiêu đề
                    </span>

                    <input
                      value={
                        title
                      }

                      disabled={
                        saving
                      }

                      onChange={(
                        event
                      ) =>
                        setTitle(
                          event
                            .target
                            .value
                        )
                      }

                      placeholder="Ví dụ: Chấm Lab 3"

                      autoFocus
                    />

                  </label>


                  {/* TIME + TYPE */}

                  <div className="schedule-form-row">

                    <label>

                      <span>
                        Thời gian
                      </span>

                      <input
                        type="time"

                        value={
                          time
                        }

                        disabled={
                          saving
                        }

                        onChange={(
                          event
                        ) =>
                          setTime(
                            event
                              .target
                              .value
                          )
                        }
                      />

                    </label>


                    <label>

                      <span>
                        Loại
                      </span>

                      <select
                        value={
                          type
                        }

                        disabled={
                          saving
                        }

                        onChange={(
                          event
                        ) =>
                          setType(
                            event
                              .target
                              .value
                          )
                        }
                      >

                        <option value="class">
                          Lịch dạy
                        </option>

                        <option value="exam">
                          Lịch thi
                        </option>

                        <option value="deadline">
                          Deadline
                        </option>

                        <option value="meeting">
                          Cuộc họp
                        </option>

                      </select>

                    </label>

                  </div>


                  {/* ERROR */}

                  {formError && (
                    <div
                      className="schedule-form-error"
                    >
                      {formError}
                    </div>
                  )}


                  {/* ACTION */}

                  <div className="schedule-create-actions">

                    <button
                      type="button"

                      disabled={
                        saving
                      }

                      onClick={
                        resetForm
                      }
                    >
                      Hủy
                    </button>


                    <button
                      type="submit"

                      disabled={
                        saving
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2
                            size={14}
                            className="schedule-spin"
                          />

                          Đang lưu...
                        </>
                      ) : editingId ? (
                        "Lưu thay đổi"
                      ) : (
                        "Lưu lịch"
                      )}
                    </button>

                  </div>

                </form>
              )}

            </>
          )}

        </div>

      </aside>

    </div>
  );
}


export default SchedulePanel;