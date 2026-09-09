import { useState } from "react";

function ScheduleModal({
  date,
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("class");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    onSave({
      id: Date.now(),
      date,
      title,
      type,
      time,
      note,
    });
  };

  return (
    <div className="schedule-modal-overlay">
      <div className="schedule-modal">
        <h3>Tạo lịch mới</h3>

        <p>
          Ngày: <strong>{date}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Tiêu đề

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Ví dụ: Chấm Lab 3"
            />
          </label>

          <label>
            Loại lịch

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
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
                Họp
              </option>

              <option value="personal">
                Cá nhân
              </option>
            </select>
          </label>

          <label>
            Thời gian

            <input
              type="time"
              value={time}
              onChange={(e) =>
                setTime(e.target.value)
              }
            />
          </label>

          <label>
            Ghi chú

            <textarea
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              placeholder="Nhập ghi chú..."
            />
          </label>

          <div className="schedule-modal-actions">
            <button
              type="button"
              onClick={onClose}
            >
              Hủy
            </button>

            <button type="submit">
              Lưu lịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleModal;