import { useState } from "react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import LoadingScreen from "../components/common/LoadingScreen";
import ErrorScreen from "../components/common/ErrorScreen";

import WelcomeCard from "../components/overview/WelcomeCard";
import CourseCard from "../components/overview/CourseCard";
import UrgentTasks from "../components/overview/UrgentTasks";
import AnalyticsOverview from "../components/overview/AnalyticsOverview";
import Calendar from "../components/overview/Calendar";
import SchedulePanel from "../components/overview/SchedulePanel";
import Notifications from "../components/overview/Notifications";
import QuickLinks from "../components/overview/QuickLinks";

import useTeacherDashboard from "../hooks/useTeacherDashboard";

import "../styles/TeacherOverview.css";


function TeacherOverview() {
  const [
    schedulePanelOpen,
    setSchedulePanelOpen,
  ] = useState(false);


  const {
    teacher,
    stats,
    courses,
    tasks,
    notifications,

    schedule,
    setSchedule,

    analytics,

    calendarDate,

    loading,
    calendarLoading,
    error,

    previousMonth,
    nextMonth,
  } = useTeacherDashboard();


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return <LoadingScreen />;
  }


  // ==========================================
  // ERROR
  // ==========================================

  if (
    error ||
    !teacher ||
    !stats
  ) {
    return (
      <ErrorScreen
        message={
          error ||
          "Thiếu dữ liệu giảng viên."
        }
      />
    );
  }


  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="app">

      {/* =========================
          HEADER
      ========================= */}

      <Header
        teacher={teacher}
      />


      {/* =========================
          SIDEBAR
      ========================= */}

      <Sidebar />


      {/* =========================
          PAGE CONTENT
      ========================= */}

      <main className="page">

        {/* =========================
            MAIN CONTENT
        ========================= */}

        <div className="main-content">

          <WelcomeCard
            teacher={teacher}
            stats={stats}
          />


          <CourseCard
            courses={courses}
          />


          <UrgentTasks
            tasks={tasks}
          />


          <AnalyticsOverview
            analytics={analytics}
          />

        </div>


        {/* =========================
            RIGHT SIDEBAR
        ========================= */}

        <aside className="right-panel">

          {/* CALENDAR NHỎ */}

          <Calendar
            date={calendarDate}

            schedule={
              schedule
            }

            loading={
              calendarLoading
            }

            onPreviousMonth={
              previousMonth
            }

            onNextMonth={
              nextMonth
            }

            onOpenManager={() =>
              setSchedulePanelOpen(
                true
              )
            }
          />


          {/* NOTIFICATIONS */}

          <Notifications
            notifications={
              notifications
            }
          />


          {/* QUICK LINKS */}

          <QuickLinks />

        </aside>

      </main>


      {/* =========================
          SCHEDULE MANAGER
      ========================= */}

      <SchedulePanel
        open={
          schedulePanelOpen
        }

        onClose={() =>
          setSchedulePanelOpen(
            false
          )
        }

        schedule={
          schedule
        }

        onScheduleChange={
          setSchedule
        }
      />

    </div>
  );
}


export default TeacherOverview;