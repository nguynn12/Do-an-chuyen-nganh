import { useState } from "react";
import {
  CalendarDays,
  Clock,
  X,
} from "lucide-react";


function buildCalendarDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const previousLastDay = new Date(
    year,
    month,
    0
  ).getDate();

  const cells = [];


  // ======================================================
  // NGÀY THÁNG TRƯỚC
  // ======================================================

  for (
    let i = firstDay.getDay() - 1;
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


  // ======================================================
  // NGÀY THÁNG HIỆN TẠI
  // ======================================================

  for (
    let day = 1;
    day <= lastDay.getDate();
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


  // ======================================================
  // NGÀY THÁNG SAU
  // ======================================================

  while (cells.length < 35) {
    const day =
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
        day
      ),
      outside: true,
    });
  }

  return cells.slice(0, 35);
}


// ======================================================
// DATE -> YYYY-MM-DD
// ======================================================

function toDateKey(date) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// ======================================================
// CHUẨN HÓA DATE TỪ API
//
// Hỗ trợ cả:
// 2026-08-11
// 2026-08-11T16:59:59.000Z
// ======================================================

function getEventDateKey(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return toDateKey(date);
}


// ======================================================
// CHUẨN HÓA EVENT TYPE
// ======================================================

function normalizeEventType(type) {
  const value = String(
    type || ""
  )
    .trim()
    .toLowerCase();

  if (
    value === "class" ||
    value === "lesson" ||
    value === "teaching"
  ) {
    return "class";
  }

  if (
    value === "exam" ||
    value === "test"
  ) {
    return "exam";
  }

  if (
    value === "deadline" ||
    value === "due" ||
    value === "assignment"
  ) {
    return "deadline";
  }

  if (
    value === "meeting" ||
    value === "meet"
  ) {
    return "meeting";
  }

  if (
    value === "personal"
  ) {
    return "personal";
  }

  return "class";
}


// ======================================================
// EVENT CHÍNH CỦA NGÀY
// ======================================================

function getPrimaryEventType(events) {
  if (!events.length) {
    return null;
  }

  const types =
    events.map(
      (event) =>
        normalizeEventType(
          event.type
        )
    );

  if (types.includes("exam")) {
    return "exam";
  }

  if (
    types.includes("deadline")
  ) {
    return "deadline";
  }

  if (
    types.includes("meeting")
  ) {
    return "meeting";
  }

  if (
    types.includes("personal")
  ) {
    return "personal";
  }

  return "class";
}


// ======================================================
// TÊN LOẠI EVENT
// ======================================================

function getEventTypeLabel(type) {
  switch (
    normalizeEventType(type)
  ) {
    case "exam":
      return "Lịch thi";

    case "deadline":
      return "Deadline";

    case "meeting":
      return "Cuộc họp";

    case "personal":
      return "Cá nhân";

    default:
      return "Lịch dạy";
  }
}


// ======================================================
// FORMAT TIME
// ======================================================

function formatEventTime(value) {
  if (!value) {
    return "";
  }

  const text =
    String(value);

  // 08:30:00 -> 08:30
  if (
    /^\d{2}:\d{2}/.test(text)
  ) {
    return text.slice(0, 5);
  }

  return text;
}


// ======================================================
// FORMAT NGÀY ĐƯỢC CHỌN
// ======================================================

function formatSelectedDate(value) {
  if (!value) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  return `${day}/${month}/${year}`;
}


// ======================================================
// COMPONENT
// ======================================================

function Calendar({
  date,
  schedule = [],
  loading,
  onPreviousMonth,
  onNextMonth,
  onOpenManager,
}) {

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(null);


  const cells =
    buildCalendarDays(date);


  // ====================================================
  // EVENT CỦA NGÀY ĐANG CHỌN
  // ====================================================

  const selectedEvents =
    selectedDate
      ? schedule
          .filter(
            (item) =>
              getEventDateKey(
                item.date
              ) === selectedDate
          )
          .sort((a, b) => {
            const timeA =
              a.time || "";

            const timeB =
              b.time || "";

            return timeA.localeCompare(
              timeB
            );
          })
      : [];


  // ====================================================
  // CHUYỂN THÁNG
  // ĐÓNG NGÀY ĐANG CHỌN
  // ====================================================

  const handlePreviousMonth = () => {
    setSelectedDate(null);

    if (onPreviousMonth) {
      onPreviousMonth();
    }
  };


  const handleNextMonth = () => {
    setSelectedDate(null);

    if (onNextMonth) {
      onNextMonth();
    }
  };


  // ====================================================
  // CLICK NGÀY
  // ====================================================

  const handleDayClick = (
    key,
    hasEvent,
    outside
  ) => {

    // Không mở ngày ngoài tháng
    if (outside) {
      return;
    }

    // Ngày không có event
    if (!hasEvent) {
      setSelectedDate(null);
      return;
    }

    // Click lại ngày đang mở -> đóng
    if (
      selectedDate === key
    ) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate(key);
  };


  return (
    <div className="right-card calendar">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="calendar-title">

        <strong>
          Tháng{" "}
          {date.getMonth() + 1},{" "}
          {date.getFullYear()}
        </strong>


        <div className="calendar-nav">

          <button
            type="button"
            onClick={
              handlePreviousMonth
            }
            aria-label="Tháng trước"
          >
            ‹
          </button>


          <button
            type="button"
            onClick={
              handleNextMonth
            }
            aria-label="Tháng sau"
          >
            ›
          </button>

        </div>

      </div>


      {/* =================================================
          WEEK
      ================================================= */}

      <div className="calendar-week">
        <span>CN</span>
        <span>T2</span>
        <span>T3</span>
        <span>T4</span>
        <span>T5</span>
        <span>T6</span>
        <span>T7</span>
      </div>


      {/* =================================================
          DAYS
      ================================================= */}

      <div
        className={[
          "calendar-days",

          loading
            ? "calendar-loading"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

        {cells.map((cell) => {

          const key =
            toDateKey(
              cell.date
            );


          const dayEvents =
            schedule.filter(
              (item) =>
                getEventDateKey(
                  item.date
                ) === key
            );


          const hasEvent =
            dayEvents.length > 0;


          const eventType =
            getPrimaryEventType(
              dayEvents
            );


          const isSelected =
            selectedDate === key;


          return (
            <button
              type="button"

              key={key}

              className={[
                "calendar-day",

                cell.outside
                  ? "outside-day"
                  : "",

                hasEvent
                  ? "marked"
                  : "",

                eventType
                  ? `event-${eventType}`
                  : "",

                isSelected
                  ? "calendar-day-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}

              onClick={() =>
                handleDayClick(
                  key,
                  hasEvent,
                  cell.outside
                )
              }

              aria-label={
                hasEvent
                  ? `${key}, ${dayEvents.length} sự kiện`
                  : key
              }
            >

              <span>
                {cell.date.getDate()}
              </span>


              {hasEvent && (
                <span className="calendar-dot" />
              )}

            </button>
          );
        })}

      </div>


      {/* =================================================
          CHI TIẾT NGÀY
      ================================================= */}

      {selectedDate &&
        selectedEvents.length > 0 && (

        <div className="calendar-event-detail">

          {/* HEADER */}

          <div className="calendar-event-detail-header">

            <div>
              <CalendarDays
                size={14}
              />

              <strong>
                {formatSelectedDate(
                  selectedDate
                )}
              </strong>
            </div>


            <button
              type="button"
              className="calendar-event-close"
              onClick={() =>
                setSelectedDate(null)
              }
              aria-label="Đóng"
            >
              <X size={14} />
            </button>

          </div>


          {/* EVENTS */}

          <div className="calendar-event-list">

            {selectedEvents.map(
              (
                event,
                index
              ) => (

              <div
                className="calendar-event-item"
                key={
                  event.id ||
                  `${selectedDate}-${index}`
                }
              >

                <span
                  className={[
                    "calendar-event-type-dot",
                    `event-${normalizeEventType(
                      event.type
                    )}`,
                  ].join(" ")}
                />


                <div className="calendar-event-info">

                  <strong>
                    {event.title ||
                      "Sự kiện"}
                  </strong>


                  <div className="calendar-event-meta">

                    <span>
                      {getEventTypeLabel(
                        event.type
                      )}
                    </span>


                    {event.time && (
                      <span>
                        <Clock
                          size={11}
                        />

                        {formatEventTime(
                          event.time
                        )}
                      </span>
                    )}

                  </div>


                  {event.courseCode && (
                    <span className="calendar-event-course">
                      {event.courseCode}
                      {event.courseName
                        ? ` - ${event.courseName}`
                        : ""}
                    </span>
                  )}


                  {event.description && (
                    <p>
                      {event.description}
                    </p>
                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

      )}


      {/* =================================================
          MANAGE
      ================================================= */}

      <div className="calendar-manage-wrapper">

        <button
          type="button"
          className="calendar-manage-link"
          onClick={
            onOpenManager
          }
        >
          Quản lý lịch
        </button>

      </div>

    </div>
  );
}


export default Calendar;