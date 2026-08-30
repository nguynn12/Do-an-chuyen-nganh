import { Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function UrgentTasks({ tasks }) {
  const navigate = useNavigate();

  return (
    <section className="section">
      <div className="section-title left">
        <Clock3 size={19} />
        <strong>Việc cần xử lý gấp</strong>
      </div>

      <div className="tasks-card">
        {tasks.length === 0 ? (
          <div className="empty-row">Hiện không có công việc gấp.</div>
        ) : (
          tasks.map((task) => (
            <div className="task" key={task.id}>
              <div className={`task-icon ${task.type}`}>!</div>

              <div className="task-info">
                <strong>{task.title}</strong>
                <span>
                  Hạn: {formatDate(task.dueDate)}
                  {task.description ? `, ${task.description}` : ""}
                </span>
              </div>

              <button onClick={() => navigate(task.path)}>{task.action}</button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default UrgentTasks;
