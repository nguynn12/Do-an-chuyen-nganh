export function getSchedules() {
  return JSON.parse(
    localStorage.getItem("teacherSchedules") || "[]"
  );
}

export function saveSchedule(schedule) {
  const current = getSchedules();

  const updated = [
    ...current,
    schedule,
  ];

  localStorage.setItem(
    "teacherSchedules",
    JSON.stringify(updated)
  );

  return updated;
}