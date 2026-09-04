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

  // Ngày của tháng trước
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

  // Ngày trong tháng hiện tại
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

  // Ngày đầu tháng sau
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


/* ======================================================
   CHUẨN HÓA LOẠI SỰ KIỆN

   class      -> lịch dạy
   exam       -> lịch thi
   deadline   -> deadline
   meeting    -> cuộc họp
====================================================== */

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
    value === "due"
  ) {
    return "deadline";
  }

  if (
    value === "meeting" ||
    value === "meet"
  ) {
    return "meeting";
  }

  // Event không có type thì mặc định là lịch dạy
  return "class";
}


/* ======================================================
   NẾU MỘT NGÀY CÓ NHIỀU EVENT

   Ưu tiên hiển thị:
   exam > deadline > meeting > class
====================================================== */

function getPrimaryEventType(events) {
  if (!events.length) {
    return null;
  }

  const types = events.map(
    (event) =>
      normalizeEventType(
        event.type
      )
  );

  if (types.includes("exam")) {
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


function Calendar({
  date,
  schedule = [],
  loading,
  onPreviousMonth,
  onNextMonth,
  onOpenManager,
}) {
  const cells =
    buildCalendarDays(date);

  return (
    <div className="right-card calendar">

      {/* =========================
          HEADER
      ========================= */}

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
              onPreviousMonth
            }
            aria-label="Tháng trước"
          >
            ‹
          </button>


          <button
            type="button"
            onClick={
              onNextMonth
            }
            aria-label="Tháng sau"
          >
            ›
          </button>

        </div>

      </div>


      {/* =========================
          WEEK
      ========================= */}

      <div className="calendar-week">
        <span>CN</span>
        <span>T2</span>
        <span>T3</span>
        <span>T4</span>
        <span>T5</span>
        <span>T6</span>
        <span>T7</span>
      </div>


      {/* =========================
          DAYS
      ========================= */}

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
                item.date === key
            );

          const hasEvent =
            dayEvents.length > 0;

          const eventType =
            getPrimaryEventType(
              dayEvents
            );


          return (
            <div
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
              ]
                .filter(Boolean)
                .join(" ")}
              title={
                hasEvent
                  ? dayEvents
                      .map(
                        (
                          item
                        ) =>
                          item.title
                      )
                      .join(
                        ", "
                      )
                  : ""
              }
            >

              {cell.date.getDate()}


              {hasEvent && (
                <span className="calendar-dot" />
              )}

            </div>
          );
        })}

      </div>


      {/* =========================
          MANAGE
      ========================= */}

      <div className="calendar-manage-wrapper">

        <span
          className="calendar-manage-link"
          onClick={
            onOpenManager
          }
          role="button"
          tabIndex={0}
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
                "Enter" ||
              event.key === " "
            ) {
              onOpenManager();
            }
          }}
        >
          Quản lý lịch
        </span>

      </div>

    </div>
  );
}


export default Calendar;