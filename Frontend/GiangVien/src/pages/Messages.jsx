import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  getTeacherNotifications,
} from "../services/dashboardService";
import "../styles/TeacherOverview.css";

function Messages() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const teacher = await getCurrentUser();
      setItems(await getTeacherNotifications(teacher.id));
    }

    load();
  }, []);

  return (
    <div className="simple-page">
      <button className="back-button" onClick={() => navigate("/")}>
        <ArrowLeft size={17} />
        Quay lại Tổng quan
      </button>

      <div className="simple-page-card">
        <h1>Thông báo hệ thống</h1>

        <div className="message-list">
          {items.map((item) => (
            <div className="message-row" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Messages;
